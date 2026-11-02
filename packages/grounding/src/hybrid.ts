/**
 * Hybrid retrieval — dense vectors AND Postgres full-text, fused.
 *
 * WHY, with the evidence. On 2026-09-11 a traced run of the rideshare question
 * made **ten searches in one question**, hunting for the literal strings
 * "livery", "for hire", "transportation network". Embeddings are worst at
 * exactly that: a rare legal term has few neighbours in embedding space, so
 * "livery" retrieves nothing closer than general prose about vehicle use. A
 * keyword index finds it in one hop.
 *
 * The same trace showed the cost of missing: 6 tool calls and 43k tokens when
 * the model routed well, 11 calls and 122k when it did not.
 *
 * POSTGRES FULL-TEXT, NOT A BM25 PACKAGE. Both arms live in one store and are
 * maintained by the same ingest, so they cannot drift out of sync. An in-memory
 * BM25 index is a second copy of the corpus with its own staleness bug, and
 * nothing about a stale second copy looks wrong from the outside.
 *
 * A GENERATED COLUMN, not a trigger. `content_ts` is
 * `generated always as (to_tsvector(...)) stored`, so Postgres recomputes it on
 * every write and it is impossible for it to disagree with `content`. A trigger
 * can be dropped; a generated column cannot be out of date.
 *
 * FUSED WITH RECIPROCAL RANK FUSION, not by adding scores. A cosine distance
 * and a ts_rank are different units on different scales — adding or averaging
 * them is meaningless, and whichever happens to have the larger range wins.
 * RRF throws the magnitudes away and uses only POSITION:
 *
 *     score(d) = Σ  1 / (K + rank_in_list)
 *
 * A document ranked 2nd by vectors and 30th by keywords beats one ranked 1st by
 * keywords and nowhere by vectors. K=60 is the value from the original paper and
 * flattens the difference between rank 1 and rank 2 so a single list cannot
 * dominate.
 */
import { Document as LCDocument } from '@langchain/core/documents';
import type { PGVectorStore } from '@langchain/pgvector';

/** Whatever `PGVectorStore` accepts as a filter — taken from the store itself so
 *  the two arms can never diverge on what a filter means. */
type StoreFilter = Parameters<PGVectorStore['similaritySearchWithScore']>[2];
import { Client } from 'pg';
import { connectionString, DEFAULT_CHUNK_TABLE } from './store';
import { survivesDisconnect, PG_OPTIONS } from './pg-resilience';

/** Standard RRF constant. Dampens the top of each list so neither arm dominates. */
const RRF_K = 60;

export interface Scored {
  doc: LCDocument;
  /** Fused rank score, normalised so the best result is 1. NOT a similarity. */
  score: number;
  /** Rank in the dense list, 1-based. Absent when only keywords found it. */
  denseRank?: number;
  /** Rank in the keyword list, 1-based. Absent when only vectors found it. */
  sparseRank?: number;
}

export interface HybridResult {
  hits: Scored[];
  /** False when the keyword arm could not run — never silently dense-only. */
  fullText: boolean;
}

/**
 * The names one text search configuration lives under.
 *
 * English keeps `content_ts` and `<table>_fts_idx`, so an index built before this
 * option existed is still the one every existing caller reads. Any other
 * configuration gets a column of its own. Reusing `content_ts` would fail
 * silently: `add column if not exists` does nothing once the column is there, so
 * a table indexed as English and then ingested as Swedish would keep the English
 * tsvector, and nothing would report it.
 *
 * The name is written into SQL, and DDL cannot take bind parameters, so it is
 * held to a plain lowercase identifier. A dotted name such as `pg_catalog.english`
 * is refused.
 */
function ftsNames(textSearchConfig: string = 'english') {
  if (!/^[a-z][a-z_]*$/.test(textSearchConfig)) {
    throw new Error(
      `textSearchConfig must be a lowercase Postgres text search configuration, got '${textSearchConfig}'`,
    );
  }
  const suffix = textSearchConfig === 'english' ? '' : `_${textSearchConfig}`;
  return {
    config: textSearchConfig,
    column: `content_ts${suffix}`,
    indexSuffix: `_fts${suffix}_idx`,
  };
}

/**
 * Create the full-text column and its index. Idempotent; safe to call on every
 * ingest.
 *
 * Called from `ingestDocuments` rather than `openStore` so that opening the store
 * to READ never issues DDL — a query path that quietly alters schema is a
 * surprise waiting for a read-only database role.
 *
 * `textSearchConfig` names the Postgres text search configuration the column is
 * built with. It defaults to 'english', which every existing caller gets, and it
 * must be the same value passed to `hybridSearch` for the same table.
 */
export async function ensureFullTextIndex(
  opts: { connectionString?: string; tableName?: string; textSearchConfig?: string } = {},
): Promise<void> {
  const table = opts.tableName ?? DEFAULT_CHUNK_TABLE;
  const fts = ftsNames(opts.textSearchConfig);
  const client = survivesDisconnect(
    new Client({ connectionString: opts.connectionString ?? connectionString(), ...PG_OPTIONS }),
    { label: 'hybrid-search' },
  );
  await client.connect();
  try {
    await client.query(
      `alter table ${table} add column if not exists ${fts.column} tsvector
         generated always as (to_tsvector('${fts.config}', content)) stored`,
    );
    await client.query(
      `create index if not exists ${table}${fts.indexSuffix} on ${table} using gin (${fts.column})`,
    );
  } finally {
    await client.end();
  }
}

/**
 * Turn a model-written query into an OR tsquery.
 *
 * EVERY BUILT-IN CONVERTER ANDs ITS TERMS. `plainto_tsquery`,
 * `websearch_to_tsquery` and `phraseto_tsquery` all require a document to
 * contain every word, and the first version of this file used
 * `plainto_tsquery` and therefore returned NOTHING, ever. It looked like it
 * worked: the fusion still produced results, because the dense arm carried them,
 * and `fullText` was reported as true because no error was thrown. A retrieval
 * arm that silently matches nothing is worse than one that is absent.
 *
 * So the query is built by hand: strip everything that is not a letter or a
 * digit, drop one-character fragments, join with `|`. `ts_rank` then favours
 * documents matching MORE of the terms, which is the behaviour wanted — a
 * passage containing both "livery" and "hire" should outrank one containing
 * only "hire".
 *
 * LETTERS MEANS LETTERS IN EVERY SCRIPT. Splitting on `[^a-z0-9]` was harmless for
 * English and wrong for Swedish: "bostadsrätt" became "bostadsr" and "tt", and "är"
 * vanished, because the split treated å and ä as separators. The Unicode property
 * classes keep them. Input made only of ASCII is unchanged, since every ASCII letter
 * and digit still matches.
 *
 * Keeping only letters and digits also makes injection impossible by construction.
 * `to_tsquery` has real syntax (`&`, `|`, `!`, `:`, `*`, parentheses and quotes), and
 * the model writes queries full of quotes, apostrophes and ampersands. None of those
 * is a letter or a digit, so none of them can reach the tsquery.
 *
 * EXPORTED SO THE TOKENIZER CAN BE CHECKED ON ITS OWN. What it returns decides what
 * a query can match, and nothing else in this file exposes it.
 */
export function orQuery(raw: string): string {
  const terms = raw
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
  return [...new Set(terms)].join(' | ');
}

/**
 * The keyword arm.
 *
 * The metadata filter uses `@>` containment, matching the equality semantics
 * `PGVectorStore` applies to the same filter object, so both arms are restricted
 * identically. Filtering one arm and not the other would silently reintroduce
 * the wrong-document leak this corpus already suffered once.
 */
async function keywordSearch(
  query: string,
  k: number,
  filter: StoreFilter | undefined,
  table: string,
  connString?: string,
  textSearchConfig?: string,
): Promise<LCDocument[]> {
  // The dense arm already honoured an explicit connection string and this arm
  // did not, so a hybrid search against a non-default database would have run
  // its two halves against TWO DIFFERENT DATABASES and fused the results
  // without complaint. Nothing would have looked wrong.
  const client = survivesDisconnect(
    new Client({ connectionString: connString ?? connectionString(), ...PG_OPTIONS }),
    { label: 'hybrid-search' },
  );
  await client.connect();
  try {
    const tsq = orQuery(query);
    if (!tsq) return [];

    const fts = ftsNames(textSearchConfig);
    const params: unknown[] = [tsq, k];
    let where = `${fts.column} @@ to_tsquery('${fts.config}', $1)`;
    if (filter && Object.keys(filter).length) {
      params.push(JSON.stringify(filter));
      where += ` and metadata @> $3::jsonb`;
    }
    const { rows } = await client.query(
      `select content, metadata
         from ${table}
        where ${where}
        order by ts_rank(${fts.column}, to_tsquery('${fts.config}', $1)) desc
        limit $2`,
      params,
    );
    return rows.map(
      (r: any) => new LCDocument({ pageContent: r.content, metadata: r.metadata }),
    );
  } finally {
    await client.end();
  }
}

/** Identity for fusion. chunkId is unique per chunk and stable across runs. */
const keyOf = (d: LCDocument): string =>
  String(d.metadata?.chunkId ?? d.pageContent.slice(0, 120));

/**
 * Run both arms and fuse.
 *
 * Each arm fetches `k * overFetch` so that a document ranked poorly by one and
 * well by the other still has a rank in both lists — fusing two top-5s would
 * mostly fuse two copies of the same five.
 */
export async function hybridSearch(
  store: PGVectorStore,
  query: string,
  k: number,
  filter?: StoreFilter,
  // `connectionString` must match the one the STORE was opened with. It is not
  // defaulted independently for a reason: the two arms fusing results from two
  // different databases is a failure with no symptom.
  // `textSearchConfig` must match the one the index was built with. It is checked
  // here, before either arm starts, so a bad name is a thrown error and not a quiet
  // `fullText: false`. 'english' is the default, and what every existing caller gets.
  opts: {
    overFetch?: number;
    tableName?: string;
    connectionString?: string;
    textSearchConfig?: string;
  } = {},
): Promise<HybridResult> {
  const depth = k * (opts.overFetch ?? 4);
  ftsNames(opts.textSearchConfig);

  const densePromise = store.similaritySearchWithScore(query, depth, filter);
  // A keyword failure must never be silent: if the column is missing because
  // ingest has not run since this was added, the caller is TOLD it got
  // dense-only results rather than quietly receiving worse retrieval.
  const sparsePromise = keywordSearch(
    query,
    depth,
    filter,
    opts.tableName ?? DEFAULT_CHUNK_TABLE,
    opts.connectionString,
    opts.textSearchConfig,
  ).then(
    (r) => ({ ok: true as const, docs: r }),
    () => ({ ok: false as const, docs: [] as LCDocument[] }),
  );

  const [dense, sparse] = await Promise.all([densePromise, sparsePromise]);

  return { hits: fuseByRank(dense.map(([doc]) => doc), sparse.docs, k), fullText: sparse.ok };
}

/**
 * Reciprocal rank fusion over two ranked lists.
 *
 * EXPORTED SO THERE IS EXACTLY ONE IMPLEMENTATION OF THIS ARITHMETIC. A caller
 * that has to run the two arms itself — because it needs a filter neither arm's
 * own filter language can express — would otherwise write its own copy, and two
 * copies of a scoring rule drift without anything failing. `hybridSearch` above
 * calls this; nothing here knows what a document is about.
 *
 * Both lists are assumed ALREADY RANKED, best first. Position is the only thing
 * read from them: the scores that got them there are on incomparable scales,
 * which is the reason this function exists at all.
 */
export function fuseByRank(dense: LCDocument[], sparse: LCDocument[], k: number): Scored[] {
  const fused = new Map<string, Scored>();
  const add = (doc: LCDocument, rank: number, arm: 'dense' | 'sparse') => {
    const key = keyOf(doc);
    const prev = fused.get(key) ?? { doc, score: 0 };
    prev.score += 1 / (RRF_K + rank);
    if (arm === 'dense') prev.denseRank = rank;
    else prev.sparseRank = rank;
    fused.set(key, prev);
  };

  dense.forEach((doc, i) => add(doc, i + 1, 'dense'));
  sparse.forEach((doc, i) => add(doc, i + 1, 'sparse'));

  const ranked = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, k);
  const best = ranked[0]?.score ?? 1;
  for (const r of ranked) r.score = Number((r.score / best).toFixed(3));
  return ranked;
}
