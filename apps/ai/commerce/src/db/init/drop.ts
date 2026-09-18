/**
 * `pnpm commerce:db-drop` — tear down the five, and nothing else.
 *
 * `assertOurs()` is the only thing standing between a typo and someone else's
 * data. It is handed to `@fde/estate`, which checks EVERY name before it drops
 * ANY — the per-iteration version discovers a foreign name only after
 * destroying the ones before it, and DROP DATABASE has no undo.
 *
 * Asking is ours, because the engagements ask differently. This one refuses
 * outright and prints what it would destroy, which is the combination the
 * fifth estate wanted: pharma's refusal plus steering's preview.
 */
import { dropDatabases } from '@fde/estate';
import {
  SYSTEMS, adminUrl, assertOurs, redact, assertNotAnotherEngagement,
} from '../../config/connections';

if (!process.argv.includes('--yes')) {
  console.error(
    '\nThis drops all five Thornbury databases and everything in them:\n' +
      SYSTEMS.map((s) => `  ${s.db.padEnd(11)} ${s.label}`).join('\n') +
      '\n\nRe-run with --yes if that is what you want.\n',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const admin = adminUrl();
  // THE ONE PLACE THIS MATTERS MOST. `assertOurs` refuses a foreign NAME;
  // this refuses a foreign HOST. A base URL pointed at another engagement's
  // project still names `thb_shop`, which `assertOurs` happily allows — and
  // then the drop runs against the wrong cluster. Both checks, or neither is
  // worth having.
  assertNotAnotherEngagement(admin);

  console.log(`\nDropping the Thornbury estate on ${redact(admin)}\n`);

  for (const db of await dropDatabases(admin, SYSTEMS, assertOurs)) {
    console.log(`  drop    ${db}`);
  }

  console.log('\ndrop: done\n');
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
