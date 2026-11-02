/**
 * BRF retrieval spike. Measurement only: no product code, no LLM or cloud calls.
 *
 * The only network use is the one-time Hugging Face model download into
 * LOCAL_EMBEDDING_CACHE_DIR, which defaults to .cache/brf-embeddings in the parent of
 * the worktree and never ~/.cache.
 *
 * Run from the worktree root:
 *   node_modules/.bin/tsx scripts/brf-spike/retrieval.ts
 * Needs the brf-pgvector container on 127.0.0.1:5435. Override with BRF_DATABASE_URL.
 * Writes docs/brf/spike/results.json with the top 5 chunks per question and method.
 *
 * Methods, scored as hit@5 over the 15 answerable questions:
 *   1    dense, Xenova/bge-small-en-v1.5, through the platform LocalEmbeddings class
 *   2    dense, Xenova/paraphrase-multilingual-MiniLM-L12-v2, mean pooling, no query prefix,
 *        hand-written, the reference for 2m
 *   2m   the same MiniLM through the platform LocalEmbeddings with pooling 'mean'
 *   2c   the same MiniLM through the platform LocalEmbeddings with its default pooling, cls
 *   3    full-text 'english', the ASCII-only orQuery hybrid.ts used before the Unicode change
 *   4    full-text 'swedish', the same pre-change orQuery
 *   3u   full-text 'english', Unicode-aware query builder (the platform orQuery since the change)
 *   4u   full-text 'swedish', Unicode-aware query builder
 *   5    RRF of 1 and 3, today's behavior
 *   6    RRF of 2 and 4, the candidate
 *   6u   RRF of 2 and 4u
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { Client } from 'pg';
import { chunkAll, type Chunk } from '../../packages/grounding/src/chunker';
import { LocalEmbeddings } from '../../packages/grounding/src/embeddings';
import { fuseByRank } from '../../packages/grounding/src/hybrid';
import { loadDirectory } from '../../packages/grounding/src/loader';

interface Question {
  id: string;
  q: string;
  expected_file: string | null;
  expected_section: string | null;
}

interface Embedder {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

interface DenseRun {
  dim: number;
  prefix: string;
  docs: number[][];
  queries: number[][];
}

const ROOT = resolve(__dirname, '..', '..');
const CORPUS_DIR = join(ROOT, 'docs', 'brf', 'corpus');
const QUESTIONS_FILE = join(ROOT, 'docs', 'brf', 'spike', 'questions.jsonl');
const RESULTS_FILE = join(ROOT, 'docs', 'brf', 'spike', 'results.json');
const DATABASE_URL =
  process.env.BRF_DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5435/brf_index';
const BGE_MODEL = 'Xenova/bge-small-en-v1.5';
const MINILM_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const K = 5;
const DEPTH = K * 4; // hybrid.ts fetches k * overFetch (4) from each arm before fusing

// One cache folder for every path in this run. It sits in the folder above the worktree
// and never in ~/.cache. transformers.js keeps a single cacheDir for the whole process,
// so every caller must be handed the same value. LocalEmbeddings reads LOCAL_EMBEDDING_CACHE_DIR.
const CACHE_DIR =
  process.env.LOCAL_EMBEDDING_CACHE_DIR ??
  process.env.LOCAL_EMBEDDING_CACHE ??
  join(ROOT, '..', '.cache', 'brf-embeddings');
process.env.LOCAL_EMBEDDING_CACHE_DIR = CACHE_DIR;

const requireFromGrounding = createRequire(join(ROOT, 'packages', 'grounding', 'package.json'));

/** Loads transformers.js the way LocalEmbeddings.pipeline() does: same cache dir and wasm reset. */
function transformers(): any {
  const hf = requireFromGrounding('@huggingface/transformers');
  hf.env.cacheDir = CACHE_DIR;
  if (hf.env.backends?.onnx?.wasm) hf.env.backends.onnx.wasm.wasmPaths = undefined;
  return hf;
}

/**
 * Method 2 predates the pooling option. It is the call LocalEmbeddings makes with
 * pooling 'mean' (method 2m), written out by hand, so the two can be compared directly.
 * paraphrase-multilingual-MiniLM-L12-v2 was trained with mean pooling (1_Pooling/config.json).
 */
class MeanPooledEmbeddings implements Embedder {
  private extractor?: Promise<any>;

  constructor(private readonly model: string) {}

  private pipeline(): Promise<any> {
    if (!this.extractor) this.extractor = transformers().pipeline('feature-extraction', this.model);
    return this.extractor;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const extract = await this.pipeline();
    const out = await extract(texts, { pooling: 'mean', normalize: true });
    return out.tolist() as number[][];
  }

  async embedQuery(text: string): Promise<number[]> {
    return (await this.embedDocuments([text]))[0];
  }
}

/**
 * The ASCII-only builder hybrid.ts used before the Unicode change, copied verbatim so
 * methods 3 and 4 keep showing the before state. Do not point them at the platform function.
 */
function orQueryPlatform(raw: string): string {
  const terms = raw.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  return [...new Set(terms)].join(' | ');
}

/** Same shape, but letters outside a-z (for example å, ä, ö, é) stay inside the term. */
function orQueryUnicode(raw: string): string {
  const terms = raw.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1);
  return [...new Set(terms)].join(' | ');
}

/** Mirrors keywordSearch in hybrid.ts: to_tsquery(cfg, OR query), ranked by ts_rank, limited. */
async function ftsRank(client: Client, cfg: 'english' | 'swedish', tsq: string): Promise<number[]> {
  if (!tsq) return [];
  const col = cfg === 'english' ? 'ts_en' : 'ts_sv';
  const { rows } = await client.query(
    `select id from brf_chunks
      where ${col} @@ to_tsquery('${cfg}', $1)
      order by ts_rank(${col}, to_tsquery('${cfg}', $1)) desc
      limit $2`,
    [tsq, DEPTH],
  );
  return rows.map((r: { id: number }) => Number(r.id));
}

type Doc = Parameters<typeof fuseByRank>[0][number];
const asDoc = (i: number): Doc => ({ pageContent: String(i), metadata: { chunkId: String(i) } }) as unknown as Doc;

/** Uses the platform's fuseByRank, so the RRF arithmetic is not re-implemented here. */
function rrf(dense: number[], sparse: number[]): number[] {
  return fuseByRank(dense.map(asDoc), sparse.map(asDoc), K).map((s) => Number(s.doc.metadata.chunkId));
}

const dot = (a: number[], b: number[]): number => a.reduce((s, x, j) => s + x * b[j], 0);
const cosine = (a: number[], b: number[]): number => dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)));

function rankDense(qv: number[], docs: number[][], depth: number): number[] {
  return docs
    .map((d, i) => ({ i, s: cosine(qv, d) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, depth)
    .map((x) => x.i);
}

/** Matches a heading label such as "§ 9" as a whole token, so "§ 1" does not match "§ 10". */
function sectionMatch(headings: string[], section: string): boolean {
  const label = section.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${label}(?!\\d)`);
  return headings.some((h) => re.test(h.trim()));
}

/** Hit for one chunk: right file, and a heading trail carrying the expected section. */
function chunkHit(q: Question, c: Chunk): boolean {
  return q.expected_file !== null && c.documentId === q.expected_file && sectionMatch(c.headings, q.expected_section ?? '');
}

async function embedAll(emb: Embedder, texts: string[], queries: string[], prefix: string): Promise<DenseRun> {
  const docs = await emb.embedDocuments(texts);
  const queryVecs: number[][] = [];
  for (const q of queries) queryVecs.push(await emb.embedQuery(q));
  return { dim: docs[0].length, prefix, docs, queries: queryVecs };
}

async function maxTokens(model: string, texts: string[]): Promise<string> {
  try {
    const tok = await transformers().AutoTokenizer.from_pretrained(model);
    return String(Math.max(...texts.map((t) => tok.encode(t).length)));
  } catch (err) {
    return `n/a (${(err as Error).message.slice(0, 60)})`;
  }
}

const METHODS = ['1', '2', '2m', '2c', '3', '3u', '4', '4u', '5', '6', '6u'] as const;
type Method = (typeof METHODS)[number];

async function main(): Promise<void> {
  const docs = await loadDirectory(CORPUS_DIR);
  const chunks = chunkAll(docs); // platform defaults, as in ingest.ts
  const questions: Question[] = readFileSync(QUESTIONS_FILE, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Question);

  for (const q of questions) {
    if (q.expected_file && !chunks.some((c) => chunkHit(q, c))) {
      throw new Error(`${q.id}: ${q.expected_file} ${q.expected_section} is not a heading in the corpus`);
    }
  }

  const texts = chunks.map((c) => c.text);
  const queries = questions.map((q) => q.q);

  // Method 1: the platform class with its defaults. queryPrefix is deliberately not passed.
  const bgeEmbedder = new LocalEmbeddings({ model: BGE_MODEL });
  const bge = await embedAll(
    bgeEmbedder,
    texts,
    queries,
    (bgeEmbedder as unknown as { queryPrefix: string }).queryPrefix,
  );
  // Method 2: MiniLM with mean pooling and an empty query prefix.
  const mini = await embedAll(new MeanPooledEmbeddings(MINILM_MODEL), texts, queries, '');
  // Method 2m: MiniLM through the platform class with pooling 'mean'. The empty query
  // prefix is explicit, because LocalEmbeddings would otherwise prepend the bge instruction.
  const miniMean = await embedAll(
    new LocalEmbeddings({ model: MINILM_MODEL, queryPrefix: '', pooling: 'mean' }),
    texts,
    queries,
    '',
  );
  // Method 2c: MiniLM through LocalEmbeddings with its default pooling, which is cls.
  const miniCls = await embedAll(new LocalEmbeddings({ model: MINILM_MODEL, queryPrefix: '' }), texts, queries, '');

  const tokensBge = await maxTokens(BGE_MODEL, texts);
  const tokensMini = await maxTokens(MINILM_MODEL, texts);

  const tsq = questions.map((q) => ({ platform: orQueryPlatform(q.q), unicode: orQueryUnicode(q.q) }));
  const ftsLists: Array<Record<'en' | 'sv' | 'enU' | 'svU', number[]>> = [];

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(`create temp table brf_chunks (
        id int primary key,
        content text not null,
        ts_en tsvector generated always as (to_tsvector('english', content)) stored,
        ts_sv tsvector generated always as (to_tsvector('swedish', content)) stored
      )`);
    for (const [id, text] of texts.entries()) {
      await client.query('insert into brf_chunks (id, content) values ($1, $2)', [id, text]);
    }
    for (let i = 0; i < questions.length; i++) {
      ftsLists.push({
        en: await ftsRank(client, 'english', tsq[i].platform),
        sv: await ftsRank(client, 'swedish', tsq[i].platform),
        enU: await ftsRank(client, 'english', tsq[i].unicode),
        svU: await ftsRank(client, 'swedish', tsq[i].unicode),
      });
    }
  } finally {
    await client.end();
  }

  const rows = questions.map((q, i) => {
    const bgeTop = rankDense(bge.queries[i], bge.docs, DEPTH);
    const miniTop = rankDense(mini.queries[i], mini.docs, DEPTH);
    const miniMeanTop = rankDense(miniMean.queries[i], miniMean.docs, DEPTH);
    const miniClsTop = rankDense(miniCls.queries[i], miniCls.docs, DEPTH);
    const f = ftsLists[i];
    const lists: Record<Method, number[]> = {
      '1': bgeTop,
      '2': miniTop,
      '2m': miniMeanTop,
      '2c': miniClsTop,
      '3': f.en,
      '3u': f.enU,
      '4': f.sv,
      '4u': f.svU,
      '5': rrf(bgeTop, f.en),
      '6': rrf(miniTop, f.sv),
      '6u': rrf(miniTop, f.svU),
    };
    const top1 = {
      bge: Math.max(...bge.docs.map((d) => cosine(bge.queries[i], d))),
      minilm: Math.max(...mini.docs.map((d) => cosine(mini.queries[i], d))),
      minilmMean: Math.max(...miniMean.docs.map((d) => cosine(miniMean.queries[i], d))),
      minilmCls: Math.max(...miniCls.docs.map((d) => cosine(miniCls.queries[i], d))),
    };
    return { q, i, lists, top1 };
  });

  const hitOf = (r: (typeof rows)[number], m: Method): boolean =>
    r.lists[m].slice(0, K).some((idx) => chunkHit(r.q, chunks[idx]));

  const answerable = rows.filter((r) => r.q.expected_file !== null);
  const unanswerable = rows.filter((r) => r.q.expected_file === null);

  const longest = Math.max(...chunks.map((c) => c.text.length));
  console.log(`corpus: ${docs.length} documents, ${chunks.length} chunks, longest chunk ${longest} chars`);
  console.log(`dense dims: bge ${bge.dim}, minilm ${mini.dim}`);
  console.log(`query prefix: bge ${JSON.stringify(bge.prefix)}, minilm ""`);
  console.log(`max tokens per chunk: bge ${tokensBge} (limit 512), minilm ${tokensMini} (limit 128)`);
  console.log('');
  console.log(`method  hit@5   missed answerable ids`);
  const hitsByMethod: Record<string, number> = {};
  for (const m of METHODS) {
    const missed = answerable.filter((r) => !hitOf(r, m)).map((r) => r.q.id);
    hitsByMethod[m] = answerable.length - missed.length;
    console.log(`${m.padEnd(6)}  ${String(hitsByMethod[m]).padStart(2)}/${answerable.length}    ${missed.join(' ') || '-'}`);
  }

  const stats = (xs: number[]): string => {
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    return `${mean.toFixed(3)} [${Math.min(...xs).toFixed(3)}, ${Math.max(...xs).toFixed(3)}]`;
  };
  console.log('');
  console.log('top-1 dense cosine, mean [min, max]');
  console.log(`model        answerable              unanswerable`);
  for (const [label, key] of [['bge', 'bge'], ['minilm', 'minilm'], ['minilm-mean', 'minilmMean'], ['minilm-cls', 'minilmCls']] as const) {
    console.log(
      `${label.padEnd(12)} ${stats(answerable.map((r) => r.top1[key])).padEnd(22)} ${stats(unanswerable.map((r) => r.top1[key]))}`,
    );
  }

  console.log('');
  console.log('per-question hits (1 = hit), answerable only');
  console.log(`id    ${METHODS.map((m) => m.padStart(3)).join('')}`);
  for (const r of answerable) {
    console.log(`${r.q.id}    ${METHODS.map((m) => (hitOf(r, m) ? '  1' : '  .')).join('')}`);
  }

  const payload = {
    corpus: { documents: docs.length, chunks: chunks.length, chunker: 'chunkAll defaults (maxChars 1200, overlapChars 150)' },
    models: {
      bge: { model: BGE_MODEL, dim: bge.dim, pooling: 'cls (LocalEmbeddings)', queryPrefix: bge.prefix },
      minilm: { model: MINILM_MODEL, dim: mini.dim, pooling: 'mean (MeanPooledEmbeddings)', queryPrefix: '' },
      minilmMean: { model: MINILM_MODEL, dim: miniMean.dim, pooling: 'mean (LocalEmbeddings)', queryPrefix: '' },
      minilmCls: { model: MINILM_MODEL, dim: miniCls.dim, pooling: 'cls (LocalEmbeddings, default)', queryPrefix: '' },
    },
    chunks: chunks.map((c, i) => ({ i, id: c.id, file: c.documentId, heading: c.headings.join(' > '), chars: c.text.length })),
    hitsOutOf: { answerable: answerable.length, byMethod: hitsByMethod },
    questions: rows.map((r) => ({
      id: r.q.id,
      q: r.q.q,
      expected_file: r.q.expected_file,
      expected_section: r.q.expected_section,
      ftsQuery: tsq[r.i],
      top1: r.top1,
      methods: Object.fromEntries(
        METHODS.map((m) => [
          m,
          {
            hit: hitOf(r, m),
            top5: r.lists[m].slice(0, K).map((idx) => ({
              chunk: chunks[idx].id,
              heading: chunks[idx].headings.join(' > '),
              match: chunkHit(r.q, chunks[idx]),
            })),
          },
        ]),
      ),
    })),
  };
  mkdirSync(dirname(RESULTS_FILE), { recursive: true });
  writeFileSync(RESULTS_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log('');
  console.log(`wrote ${RESULTS_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
