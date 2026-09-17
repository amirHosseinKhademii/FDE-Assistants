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
 * Create the full-text column and its index. Idempotent; safe to call on every
 * ingest.
 *
 * Called from `ingestDocuments` rather than `openStore` so that opening the store
 * to READ never issues DDL — a query path that quietly alters schema is a
 * surprise waiting for a read-only database role.
 */
export async function ensureFullTextIndex(
  opts: { connectionString?: string; tableName?: string } = {},
): Promise<void> {
  const table = opts.tableName ?? DEFAULT_CHUNK_TABLE;
  const client = survivesDisconnect(
    new Client({ connectionString: opts.connectionString ?? connectionString(), ...PG_OPTIONS }),
    { label: 'hybrid-search' },
  );
  await client.connect();
  try {
    await client.query(
      `alter table ${table} add column if not exists content_ts tsvector
         generated always as (to_tsvector('english', content)) stored`,
    );
    await client.query(
      `create index if not exists ${table}_fts_idx on ${table} using gin (content_ts)`,
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
 * Sanitising to `[a-z0-9]` also makes injection impossible by construction:
 * `to_tsquery` has real syntax, and the model writes queries full of quotes,
 * apostrophes and ampersands that would otherwise be a syntax error at best.
 */
function orQuery(raw: string): string {
  const terms = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
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

    const params: unknown[] = [tsq, k];
    let where = `content_ts @@ to_tsquery('english', $1)`;
    if (filter && Object.keys(filter).length) {
      params.push(JSON.stringify(filter));
      where += ` and metadata @> $3::jsonb`;
    }
    const { rows } = await client.query(
      `select content, metadata
         from ${table}
        where ${where}
        order by ts_rank(content_ts, to_tsquery('english', $1)) desc
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
  opts: { overFetch?: number; tableName?: string; connectionString?: string } = {},
): Promise<HybridResult> {
  const depth = k * (opts.overFetch ?? 4);

  const densePromise = store.similaritySearchWithScore(query, depth, filter);
  // A keyword failure must never be silent: if the column is missing because
  // ingest has not run since this was added, the caller is TOLD it got
  // dense-only results rather than quietly receiving worse retrieval.
  const sparsePromise = keywordSearch(
    query, depth, filter, opts.tableName ?? DEFAULT_CHUNK_TABLE, opts.connectionString,
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
