/**
 * embed-and-index.ts — Step 2.6. Upserts chunks from data/chunks.jsonl and embeds them
 * into pgvector. Idempotent: a chunk is skipped when an embedding exists for
 * (content_hash, model). The HNSW index is created by db:migrate (schema.sql).
 *
 * Usage:
 *   pnpm wrap:embed --dry-run              counts + token estimate, no API calls, no writes
 *   pnpm wrap:embed --limit N              N <= 20 (Stage A cap)
 *   pnpm wrap:embed --all                  full run (needs the learner's OK)
 *
 * --limit N is a WINDOW: the first N chunks in (source_file, chunk_index) order. Chunks
 * in that window that are already embedded are skipped, so re-running --limit N embeds 0.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool, PoolClient } from 'pg';
import { loadEnv, redact, requireDbUrl } from '../db/env';
import { ChunkToEmbed, EmbeddingResult, embedChunks, readEmbeddingConfig } from '../ingest/embedder';

const STAGE_A_CAP = 20;
const BATCH_SIZE = 50;
const RETRY_COUNT = 5;

interface ChunkRecord extends ChunkToEmbed {
  source_file: string;
  chunk_index: number;
  start_line: number | null;
  end_line: number | null;
  heading_path: string | null;
  type: string;
  tokens: number;
  metadata: Record<string, unknown>;
}

function fail(msg: string): never {
  console.error(`embed-and-index: ${msg}`);
  process.exit(2);
}

function readChunks(): ChunkRecord[] {
  const path = resolve(__dirname, '../../data/chunks.jsonl');
  const rows = readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((line) => JSON.parse(line));
  const chunks: ChunkRecord[] = rows.map((r) => ({
    id: String(r.id),
    content: String(r.content),
    content_hash: '', // filled below
    source_file: String(r.source_file),
    chunk_index: Number(r.chunk_index),
    start_line: r.start_line ?? null,
    end_line: r.end_line ?? null,
    heading_path: r.heading_path ?? null,
    type: String(r.type),
    tokens: Number(r.tokens) || 0,
    metadata: r.metadata ?? {},
  }));
  for (const c of chunks) {
    c.content_hash = createHash('sha256').update(c.content).digest('hex');
  }
  return chunks;
}

function byOrder(a: ChunkRecord, b: ChunkRecord): number {
  if (a.source_file !== b.source_file) return a.source_file < b.source_file ? -1 : 1;
  return a.chunk_index - b.chunk_index;
}

async function persistBatch(pool: Pool, results: EmbeddingResult[], byId: Map<string, ChunkRecord>, model: string) {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of results) {
      const c = byId.get(r.chunk_id);
      if (!c) throw new Error(`no chunk record for ${r.chunk_id}`);
      await client.query(
        `INSERT INTO chunks (id, content_hash, source_file, chunk_index, start_line, end_line,
                             heading_path, type, tokens, content, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.content_hash, c.source_file, c.chunk_index, c.start_line, c.end_line,
         c.heading_path, c.type, c.tokens, c.content, JSON.stringify(c.metadata)],
      );
      await client.query(
        `INSERT INTO embeddings (chunk_id, content_hash, embedding, model)
         VALUES ($1, $2, $3::vector, $4)
         ON CONFLICT (content_hash, model) DO NOTHING`,
        [c.id, c.content_hash, `[${r.embedding.join(',')}]`, model],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

  if (limitIdx >= 0 && (!Number.isInteger(limit) || (limit as number) < 1)) fail('--limit needs a positive integer');
  if (!dryRun && !all && limit === undefined) fail('pass --limit N (N <= 20) or --all');
  if (!all && limit !== undefined && limit > STAGE_A_CAP) fail(`--limit ${limit} is above the Stage A cap (${STAGE_A_CAP}); pass --all to go beyond`);

  loadEnv();
  const { model } = readEmbeddingConfig(); // validates HOSTED_API_KEY presence before any work
  const url = requireDbUrl();
  const started = Date.now();

  const sorted = readChunks().sort(byOrder);
  const byId = new Map(sorted.map((c) => [c.id, c]));
  const pool = new Pool({ connectionString: url, max: 4 });

  try {
    const embeddedNow = async () =>
      new Set(
        (await pool.query('SELECT content_hash FROM embeddings WHERE model = $1', [model])).rows.map(
          (r) => r.content_hash as string,
        ),
      );

    const existing = await embeddedNow();
    const pendingFull = sorted.filter((c) => !existing.has(c.content_hash));
    const window = all || limit === undefined ? sorted : sorted.slice(0, limit);
    const toEmbed = window.filter((c) => !existing.has(c.content_hash));
    const sum = (xs: ChunkRecord[]) => xs.reduce((s, c) => s + c.tokens, 0);

    console.log(`model: ${model}  batch size: ${BATCH_SIZE}  retries: ${RETRY_COUNT}`);
    console.log(`chunks in file:            ${sorted.length}`);
    console.log(`already embedded:          ${sorted.length - pendingFull.length}`);
    console.log(`window:                    ${all || limit === undefined ? 'full file' : `first ${window.length} (source_file, chunk_index)`}`);
    console.log(`to embed (this run):       ${toEmbed.length}  in ${Math.ceil(toEmbed.length / BATCH_SIZE)} batch(es)`);
    console.log(`est. tokens, this run:     ${sum(toEmbed)}`);
    console.log(`full remaining set:        ${pendingFull.length} chunks, est. ${sum(pendingFull)} tokens`);

    if (dryRun) {
      console.log('dry run: no API calls, no writes');
      return;
    }

    let embedded = 0;
    let failures = 0;
    let batchNo = 0;
    if (toEmbed.length === 0) console.log('nothing to embed');
    try {
      await embedChunks(toEmbed, BATCH_SIZE, RETRY_COUNT, async (results) => {
        await persistBatch(pool, results, byId, model);
        embedded += results.length;
        batchNo += 1;
        console.log(`  batch ${batchNo}: stored ${results.length} (total ${embedded})`);
      });
    } catch (err: any) {
      failures += 1;
      console.error(`embed-and-index: batch ${batchNo + 1} aborted: ${redact(String(err?.message ?? err))}`);
      console.error('  earlier batches are committed; re-run to resume (already-embedded chunks are skipped)');
      process.exitCode = 1;
    }

    const after = await embeddedNow();
    const remaining = sorted.filter((c) => !after.has(c.content_hash));
    const elapsedS = ((Date.now() - started) / 1000).toFixed(1);
    console.log('--- summary ---');
    console.log(`embedded now:              ${embedded}`);
    console.log(`failures:                  ${failures}`);
    console.log(`est. tokens embedded now:  ${sum(toEmbed.filter((c) => after.has(c.content_hash)))}`);
    console.log(`still to embed (full set): ${remaining.length} chunks, est. ${sum(remaining)} tokens`);
    console.log(`elapsed:                   ${elapsedS}s`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('embed-and-index failed:', redact(String(err?.message ?? err)));
  process.exit(1);
});
