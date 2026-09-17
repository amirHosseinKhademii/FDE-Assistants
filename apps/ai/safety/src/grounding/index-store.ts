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
