/**
 * `pnpm steering:inventory` — what is actually in the databases right now.
 *
 * Reads the live databases and counts. Deliberately NOT derived from the
 * generator: the question "did the seed land" cannot be answered by asking the
 * thing that produced the seed.
 */
import { Client } from 'pg';
import { SYSTEMS, urlFor } from '../config/connections';
import { EXPECTED_TABLES } from '../db/init/assertions';

async function main(): Promise<void> {
  console.log('\nLive row counts, read from Postgres\n');
  let grand = 0;
  for (const { db, label } of SYSTEMS) {
    const client = new Client({ connectionString: urlFor(db) });
    await client.connect();
    let sub = 0;
    const lines: string[] = [];
    for (const table of EXPECTED_TABLES[db.slice(4)] ?? []) {
      const { rows } = await client.query(`select count(*)::int n from ${table}`);
      sub += rows[0].n;
      lines.push(`      ${table.padEnd(32)} ${String(rows[0].n).padStart(6)}`);
    }
    await client.end();
    grand += sub;
    console.log(`  ${db}  ${String(sub).padStart(6)} rows — ${label}`);
    if (process.argv.includes('--tables')) lines.forEach((l) => console.log(l));
  }
  console.log(`\n  TOTAL     ${String(grand).padStart(6)} rows in four databases\n`);
}

/**
 * Guarded so that importing this file — for a constant, a type, anything — does
 * not run it. `index-cli.ts` was imported for one string and re-embedded the
 * whole corpus; `sql:check` now asserts every entry point here does this.
 */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
