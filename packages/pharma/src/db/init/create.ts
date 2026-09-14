/**
 * `pnpm db:create` — the six databases, on the NON-POOLED endpoint.
 *
 * CREATE DATABASE cannot run through pgbouncer: it is not transactional and the
 * pooler refuses it, with an error about transaction blocks that says nothing
 * about poolers. `direct()` strips `-pooler` from the host for this script and
 * this script only; everything else uses the pooled endpoint an app would use.
 *
 * Idempotent: an existing database is reported and left alone. Re-running this
 * must never be the destructive step — that is `db:drop`, which asks.
 */
import { Client } from 'pg';
import { SYSTEMS, adminUrl, redact } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();
  console.log(`\nCreating the Meridian estate on ${redact(admin)}\n`);

  const client = new Client({ connectionString: admin });
  await client.connect();

  for (const { db, label } of SYSTEMS) {
    const { rows } = await client.query('select 1 from pg_database where datname = $1', [db]);
    if (rows.length) {
      console.log(`  skip    ${db.padEnd(9)} already exists — ${label}`);
      continue;
    }
    // Identifiers cannot be parameterised. `db` comes from the SYSTEMS constant,
    // never from input, and the quoting is belt-and-braces on top of that.
    await client.query(`create database "${db}"`);
    console.log(`  create  ${db.padEnd(9)} ${label}`);
  }

  await client.end();
  console.log('\ncreate: done — six databases, one branch, no joins between them\n');
}

// A CommonJS build has no top-level await, so the body above is a function
// and this is its only caller. The catch is not decoration: an unhandled
// rejection exits 0 in some Node versions, and a seed script that fails
// silently with a success code is the worst possible outcome.
main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
