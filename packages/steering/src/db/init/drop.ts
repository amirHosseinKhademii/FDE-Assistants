/**
 * `pnpm steering:db-drop` — the destructive one, and the only one that asks.
 *
 * `assertOurs` is what stands between a mistyped base URL and somebody else's
 * estate. The insurance database and the six pharma ones live on the same host;
 * a `STEERING_DATABASE_URL` copied from the wrong line of `.env` would point
 * this at them, and DROP DATABASE has no undo.
 *
 * It is handed to `@fde/estate`, which checks EVERY name before dropping ANY —
 * this script used to assert and drop in the same loop, so a foreign name in
 * fourth place was found after three databases were already gone.
 */
import { dropDatabases } from '@fde/estate';
import { SYSTEMS, adminUrl, assertOurs, redact } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();

  if (!process.argv.includes('--yes')) {
    console.log(`\nThis would DROP ${SYSTEMS.length} databases on ${redact(admin)}:\n`);
    for (const { db, label } of SYSTEMS) console.log(`    ${db}  ${label}`);
    console.log('\n  Nothing has been dropped. Re-run with --yes if that is what you want.\n');
    return;
  }

  for (const db of await dropDatabases(admin, SYSTEMS, assertOurs)) {
    console.log(`  drop    ${db}`);
  }

  console.log('\ndrop: done. The corpus under docs/steering/corpus/ is untouched — it is not a database.\n');
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
