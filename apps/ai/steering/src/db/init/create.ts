/**
 * `pnpm steering:db-create` — the four databases, on the NON-POOLED endpoint.
 *
 * CREATE DATABASE cannot run through pgbouncer: it is not transactional and the
 * pooler refuses it, with an error about transaction blocks that says nothing
 * about poolers. `adminUrl()` strips `-pooler` for this script and this script
 * only; everything else uses the pooled endpoint an app would use.
 *
 * Idempotent: an existing database is reported and left alone. Re-running this
 * must never be the destructive step — that is `db:drop`, which asks.
 */
import { createDatabases } from '@fde/estate';
import { SYSTEMS, adminUrl, redact } from '../../config/connections';

async function main(): Promise<void> {
  const admin = adminUrl();
  console.log(`\nCreating the Vantis estate on ${redact(admin)}\n`);

  // `standsFor` is ours and `@fde/estate` has never heard of it — the
  // descriptor comes back whole, which is why this line still exists.
  for (const { db, label, standsFor, created } of await createDatabases(admin, SYSTEMS)) {
    console.log(
      created
        ? `  create  ${db}  ${label.padEnd(28)} (stands for ${standsFor})`
        : `  skip    ${db}  already exists — ${label}`,
    );
  }

  console.log('\ncreate: done — four databases, no joins between them.');
  console.log('        The code base is NOT here: it is files, under docs/steering/corpus/.\n');
}

// A CommonJS build has no top-level await, so the body above is a function and
// this is its only caller. The catch is not decoration: an unhandled rejection
// exits 0 in some Node versions, and a seed script that fails silently with a
// success code is the worst possible outcome.
main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
