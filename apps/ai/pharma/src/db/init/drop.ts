/**
 * `pnpm db:drop` — tear down the six, and nothing else.
 *
 * `assertOurs()` is the only thing standing between a typo and someone else's
 * data. It is handed to `@fde/estate`, which now checks EVERY name before it
 * drops ANY — this script used to assert and drop in the same loop, so a
 * foreign name in fourth place was found after three databases were already
 * gone, and DROP DATABASE has no undo.
 *
 * Asking is still ours, because the two engagements ask differently: this one
 * refuses outright, steering prints what it would destroy.
 */
import { dropDatabases } from '@fde/estate';
import { SYSTEMS, adminUrl, assertOurs, redact } from '../../config/connections';

if (!process.argv.includes('--yes')) {
  console.error(
    '\nThis drops all six Meridian databases and everything in them.\n' +
      'Re-run with --yes if that is what you want.\n',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const admin = adminUrl();
  console.log(`\nDropping the Meridian estate on ${redact(admin)}\n`);

  for (const db of await dropDatabases(admin, SYSTEMS, assertOurs)) {
    console.log(`  drop    ${db}`);
  }

  console.log('\ndrop: done\n');
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
