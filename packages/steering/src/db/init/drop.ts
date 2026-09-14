/**
 * `pnpm steering:db-drop` — the destructive one, and the only one that asks.
 *
 * `assertOurs` is what stands between a mistyped base URL and somebody else's
 * estate. The insurance database and the six pharma ones live on the same host;
 * a `STEERING_DATABASE_URL` copied from the wrong line of `.env` would point
 * this at them, and DROP DATABASE has no undo.
 */
import { Client } from 'pg';
import { SYSTEMS, adminUrl, assertOurs, redact } from '../../config/connections';

async function main(): Promise<void> {
  const yes = process.argv.includes('--yes');
  const admin = adminUrl();

  if (!yes) {
    console.log(`\nThis would DROP ${SYSTEMS.length} databases on ${redact(admin)}:\n`);
    for (const { db, label } of SYSTEMS) console.log(`    ${db}  ${label}`);
    console.log('\n  Nothing has been dropped. Re-run with --yes if that is what you want.\n');
    return;
  }

  const client = new Client({ connectionString: admin });
  await client.connect();
  for (const { db } of SYSTEMS) {
    assertOurs(db);
    await client.query(`drop database if exists "${db}" with (force)`);
    console.log(`  drop    ${db}`);
  }
  await client.end();
  console.log('\ndrop: done. The corpus under docs/steering/corpus/ is untouched — it is not a database.\n');
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
