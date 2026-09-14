/**
 * `pnpm db:drop` — tear down the six, and nothing else.
 *
 * `assertOurs()` is the only thing standing between a typo and someone else's
 * data. It is checked per database rather than once, because the dangerous
 * version of this script is the one that takes a name from somewhere.
 */
import { Client } from 'pg';
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

  const client = new Client({ connectionString: admin });
  await client.connect();

  for (const { db } of SYSTEMS) {
    assertOurs(db);
    await client.query(`drop database if exists "${db}" with (force)`);
    console.log(`  drop    ${db}`);
  }

  await client.end();
  console.log('\ndrop: done\n');
}

// A CommonJS build has no top-level await, so the body above is a function
// and this is its only caller. The catch is not decoration: an unhandled
// rejection exits 0 in some Node versions, and a seed script that fails
// silently with a success code is the worst possible outcome.
main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
