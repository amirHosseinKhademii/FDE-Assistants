/**
 * `pnpm steering:derived-create` — one database, ours, on the non-pooled endpoint.
 *
 * ITERATES NOTHING. That is the whole design: `db:create` walks `SYSTEMS` and
 * `db:drop` walks the same array, so anything in that array is reachable by a
 * reset. `vst_derived` is named here, once, by a constant that no loop can find.
 */
import { Client } from 'pg';
import { DERIVED_DB, adminUrl, redact } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();
  console.log(`\nCreating ${DERIVED_DB} on ${redact(admin)}\n`);
  const client = new Client({ connectionString: admin });
  await client.connect();
  const { rows } = await client.query('select 1 from pg_database where datname = $1', [DERIVED_DB]);
  if (rows.length) console.log(`  skip    ${DERIVED_DB}  already exists`);
  else {
    await client.query(`create database "${DERIVED_DB}"`);
    console.log(`  create  ${DERIVED_DB}  our knowledge base — derived, not the customer's`);
  }
  await client.end();
  console.log(`\nderived:create: done. This database is NOT in SYSTEMS, so db:drop cannot reach it.\n`);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
