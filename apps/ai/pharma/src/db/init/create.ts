/**
 * `pnpm db:create` — the six databases, on the NON-POOLED endpoint.
 *
 * CREATE DATABASE cannot run through pgbouncer: it is not transactional and the
 * pooler refuses it, with an error about transaction blocks that says nothing
 * about poolers. `adminUrl()` strips `-pooler` from the host for this script and
 * this script only; everything else uses the pooled endpoint an app would use.
 *
 * The SQL and the idempotency are `@fde/estate`'s; the words are ours. Steering
 * runs the identical three statements and prints them completely differently,
 * which is why the package returns what it did instead of saying it.
 */
import { createDatabases } from '@fde/estate';
import { SYSTEMS, adminUrl, redact } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();
  console.log(`\nCreating the Meridian estate on ${redact(admin)}\n`);

  for (const { db, label, created } of await createDatabases(admin, SYSTEMS)) {
    console.log(
      created
        ? `  create  ${db.padEnd(9)} ${label}`
        : `  skip    ${db.padEnd(9)} already exists — ${label}`,
    );
  }

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
