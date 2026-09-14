/**
 * `pnpm kb:create` — the knowledge base database, created once and then left
 * alone by everything else.
 *
 * SEPARATE FROM `db:create` ON PURPOSE. `db:create` and `db:drop` walk
 * `SYSTEMS`, which is the six systems of record; `mrd_kb` is deliberately not
 * in that list, so `pnpm db:reset` can rebuild the entire customer estate
 * without touching the index we built on top of it. The reverse is also true
 * and matters more: rebuilding the index must never be able to reach the
 * records.
 *
 * Idempotent, and on the NON-POOLED endpoint for the same reason `db:create` is
 * — pgbouncer refuses `CREATE DATABASE`.
 */
import { Client } from 'pg';
import { KB_DB, adminUrl, redact, urlFor } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();
  console.log(`\nKnowledge base on ${redact(admin)}\n`);

  const client = new Client({ connectionString: admin });
  await client.connect();
  const { rows } = await client.query('select 1 from pg_database where datname = $1', [KB_DB]);
  if (rows.length) {
    console.log(`  skip    ${KB_DB} already exists`);
  } else {
    await client.query(`create database "${KB_DB}"`);
    console.log(`  create  ${KB_DB}   the document store and the chunk index`);
  }
  await client.end();

  console.log(
    `\nkb:create: done — ${KB_DB} is OUTSIDE the six, so \`pnpm db:reset\` cannot reach it\n` +
      `           ${redact(urlFor(KB_DB))}\n`,
  );
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
