/**
 * `pnpm commerce:db-create` — the five databases, on the NON-POOLED endpoint.
 *
 * WHY THE ENDPOINT MATTERS, AND WHY IT IS NOT A DEVIATION HERE. `CREATE
 * DATABASE` cannot run through pgbouncer: it is not transactional and the
 * pooler refuses it with an error about transaction blocks that never mentions
 * poolers. `adminUrl()` strips `-pooler` from the host for this script and the
 * drop, and nothing else; everything else uses the pooled endpoint a deployed
 * app would use. On this Neon project the direct host IS the pooled host minus
 * the suffix — checked by creating and dropping a probe database before any of
 * this was written, rather than assumed — so the plan's five databases are
 * reachable and the one-database-five-schemas fallback was never needed.
 *
 * The SQL and the idempotency are `@fde/estate`'s; the words are ours.
 */
import { createDatabases } from '@fde/estate';
import { SYSTEMS, adminUrl, redact, assertNotAnotherEngagement } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();
  // BEFORE THE FIRST STATEMENT, not after. A create is not destructive, but a
  // base URL wrong enough to create databases somewhere else is the same typo
  // that would later drop them, and finding it here costs nothing.
  assertNotAnotherEngagement(admin);

  console.log(`\nCreating the Thornbury estate on ${redact(admin)}\n`);

  for (const { db, label, created } of await createDatabases(admin, SYSTEMS)) {
    console.log(
      created
        ? `  create  ${db.padEnd(11)} ${label}`
        : `  skip    ${db.padEnd(11)} already exists — ${label}`,
    );
  }

  console.log('\ncreate: done — five databases, no joins between them\n');
}

// A CommonJS build has no top-level await, so the body above is a function and
// this is its only caller. The catch is not decoration: an unhandled rejection
// exits 0 in some Node versions, and a script that fails silently with a
// success code is the worst possible outcome.
main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
