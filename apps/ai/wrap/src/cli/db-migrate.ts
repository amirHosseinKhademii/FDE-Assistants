/**
 * db-migrate.ts — apply src/db/schema.sql to WRAP_DB_URL. Idempotent (IF NOT EXISTS everywhere).
 * Usage: pnpm --filter @wrap/ai db:migrate   (or: pnpm wrap:db:migrate)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { redact, requireDbUrl } from '../db/env';

async function main(): Promise<void> {
  const sql = readFileSync(resolve(__dirname, '../db/schema.sql'), 'utf8');
  const pool = new Pool({ connectionString: requireDbUrl(), max: 1 });
  try {
    await pool.query(sql); // no params -> simple protocol, multi-statement OK
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('chunks', 'embeddings') ORDER BY table_name`,
    );
    const hnsw = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'embeddings' AND indexdef ILIKE '%USING hnsw%'`,
    );
    const ext = await pool.query(`SELECT extversion FROM pg_extension WHERE extname = 'vector'`);
    console.log('db:migrate ok');
    console.log(`  tables: ${tables.rows.map((r) => r.table_name).join(', ')}`);
    console.log(`  pgvector: ${ext.rows[0]?.extversion ?? 'MISSING'}`);
    console.log(`  hnsw index: ${hnsw.rows.map((r) => r.indexname).join(', ') || 'MISSING'}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('db:migrate failed:', redact(String(err?.message ?? err)));
  process.exit(1);
});
