/**
 * STAGE 3.4 — passages and their vectors move into Postgres.
 *
 * Read `docs/safety/INDEX.md` first; it is the specification this matches.
 *
 * ── THE LINE THAT MATTERS ─────────────────────────────────────────────────
 *
 * `store.addVectors(vectors, documents)` and NOT `store.addDocuments(...)`.
 *
 * `@fde/grounding`'s own `ingestDocuments` uses `addDocuments`, which embeds as
 * it inserts — correct when you have documents and no vectors. We have 73,442
 * vectors that cost 36.6 minutes, and `addDocuments` would silently compute
 * them again. It would not error, would not look wrong, and would be invisible
 * in the row count.
 *
 * ── AND IT IS STREAMED, FOR THE REASON STAGE 3.3 LEARNED ──────────────────
 *
 * `JSON.parse(readFileSync(...))` on the 641 MB `vectors.ndjson` builds the
 * same oversized string that killed the write at the end of stage 3.3, this
 * time on the way in. One line at a time, inserted in batches.
 */
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { Document } from '@langchain/core/documents';
import { ensureFullTextIndex, openStore, LocalEmbeddings } from '@fde/grounding';
import type { Passage } from './chunk';

/** One record as stage 3.3 wrote it. */
export interface VectorRecord extends Passage {
  vector: number[];
}

export interface IndexReport {
  inserted: number;
  batches: number;
  ms: number;
}

/**
 * Rows per insert.
 *
 * 500 rather than 5,000: each row carries a 384-float vector and up to 2 KB of
 * text, so a larger batch is a larger single statement over a connection that
 * Neon may suspend between them. Small batches also mean a failure loses less —
 * the same argument as stage 3.3's slabs, one layer down.
 */
const BATCH = Number(process.env.SAFETY_INDEX_BATCH ?? 500);

/** Neon's free plan. Stated here because the guard below is meaningless without it. */
const FREE_TIER_BYTES = 512 * 1024 * 1024;

/** What the last full load actually occupied: 287 MB of table, plus margin. */
const NEEDED_BYTES = 320 * 1024 * 1024;

const mb = (b: number) => `${(b / 1048576).toFixed(0)} MB`;

/**
 * What NEON bills, which is not what Postgres reports.
 *
 * `pg_cluster_size()` comes from the `neon` extension and is the number the
 * storage quota is read from. Returns null anywhere else — a local Postgres, a
 * container, another provider — so the guard simply does not apply there rather
 * than failing the load with a missing function.
 */
async function neonBilledBytes(pool: {
  query: (q: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
}): Promise<number | null> {
  try {
    const { rows } = await pool.query('select pg_cluster_size() b');
    return Number(rows[0].b);
  } catch {
    return null;
  }
}

async function* records(path: string): AsyncGenerator<VectorRecord> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line) as VectorRecord;
  }
}

/**
 * Load `vectors.ndjson` into `document_chunks`.
 *
 * The store is opened with a `LocalEmbeddings` instance it will never call —
 * `PGVectorStore` requires one at construction to know how to embed a QUERY
 * later, and `addVectors` does not touch it. Passing the same embedder stage
 * 3.3 used is what keeps a later search comparable: a store opened with a
 * different model would embed questions in a space the passages do not live in,
 * and would return nonsense without erroring.
 */
export async function loadIntoStore(
  path: string,
  opts: { connectionString: string; tableName: string },
  onProgress?: (inserted: number) => void,
): Promise<IndexReport> {
  const store = await openStore(new LocalEmbeddings(), opts);

  // EMPTIED FIRST, so re-running is idempotent rather than doubling the table.
  //
  // Safe here in a way it is NOT in `ingestDocuments`: there the delete runs
  // before a 37-minute embed, and a crash takes the index with it. Here the
  // vectors already exist on disk, so a failed load is re-run and costs a
  // minute.
  //
  // AND IT IS `truncate`, NOT `store.delete({ filter: {} })`. Both emit valid
  // SQL and both leave the table empty, so the difference is invisible until
  // the storage quota decides it. MEASURED before writing this: the table is
  // 287 MB of the 295 MB database, against Neon's free 512 MB. `DELETE` marks
  // all 73,442 rows dead WITHOUT returning their 287 MB — autovacuum gets to it
  // later — so the reload would ask for a second 287 MB and hit the ceiling
  // partway through, which reads as a network fault rather than a disk one.
  // `truncate` returns the space at once and the reload writes into it.
  //
  // Unguarded because `PGVectorStore.initialize` has already created the table
  // by this line; a failure here is real and should be heard, not swallowed.
  const before = await neonBilledBytes(store.pool);
  await store.pool.query(`truncate table ${opts.tableName}`);
  const after = await neonBilledBytes(store.pool);

  // AND THEN CHECK THAT THE SPACE CAME BACK, because the sentence above is a
  // claim about NEON's accounting and not about Postgres's.
  //
  // The two disagree, measured: `pg_database_size()` said 295 MB while
  // `pg_cluster_size()` — the function Neon's own quota is read from — said
  // 318 MB. Postgres's number is the one that is easy to reach and the wrong
  // one to plan with.
  //
  // If truncated space is still billed, this reload wants a second 287 MB
  // against 194 MB of headroom and dies somewhere past row 40,000, looking
  // exactly like the dropped connection the keepalive settings exist for. A
  // stated refusal now is worth more than an opaque stall in four minutes.
  if (after !== null && FREE_TIER_BYTES - after < NEEDED_BYTES) {
    await store.end();
    throw new Error(
      `not enough room to reload: Neon bills ${mb(after)} of ${mb(FREE_TIER_BYTES)} ` +
        `after truncate (${mb(before ?? 0)} before), leaving ${mb(FREE_TIER_BYTES - after)} ` +
        `for a load that needs about ${mb(NEEDED_BYTES)}. ` +
        'Truncated space has not returned to the quota — wait for it, or reset the branch.',
    );
  }

  const started = Date.now();
  const report: IndexReport = { inserted: 0, batches: 0, ms: 0 };

  let vectors: number[][] = [];
  let docs: Document[] = [];

  const flush = async () => {
    if (!vectors.length) return;
    await store.addVectors(vectors, docs);
    report.inserted += vectors.length;
    report.batches++;
    vectors = [];
    docs = [];
    onProgress?.(report.inserted);
  };

  for await (const rec of records(path)) {
    vectors.push(rec.vector);
    docs.push(
      new Document({
        pageContent: rec.text,
        // EVERYTHING THE FILTER SIDE NEEDS, AND THE CITATION SIDE TOO. `id` is
        // the ODI number for a complaint and the campaign for a recall, so a
        // retrieved row can be quoted as the thing itself rather than as a
        // position in a file.
        metadata: {
          // `chunkId` IS THE KEY RECIPROCAL-RANK FUSION DEDUPLICATES ON, and
          // omitting it is not a cosmetic gap. `@fde/grounding`'s `keyOf` reads
          // `metadata.chunkId` and falls back to the first 120 characters of the
          // text — which, for this corpus, is the header stage 3.1 prepends.
          //
          // MEASURED with it absent: 977 rows shared a prefix and 174 distinct
          // complaints collapsed into ONE fused entry, because they are all
          // `2019 HONDA CR-V | FORWARD COLLISION AVOIDANCE: AUTOMATIC EME…`.
          // Their RRF scores ADD, so a collided group outranks a genuine hit —
          // it put a keyword-rank-22 investigation above a keyword-rank-1 exact
          // match on `20V197000`. Both chunks of that investigation share a
          // heading, so their scores summed.
          //
          // Nothing errors. The results simply come back in the wrong order,
          // and the obvious response is to blame the embedder.
          chunkId: rec.id,
          id: rec.id,
          documentId: rec.documentId,
          kind: rec.kind,
          startLine: rec.startLine,
          ...rec.meta,
        },
      }),
    );
    if (vectors.length >= BATCH) await flush();
  }
  await flush();

  // The keyword arm's column. A GENERATED column rather than a trigger, so it
  // cannot drift out of step with the content it describes — see
  // `@fde/grounding`'s `ensureFullTextIndex`.
  await ensureFullTextIndex(opts);

  report.ms = Date.now() - started;
  await store.end();
  return report;
}
