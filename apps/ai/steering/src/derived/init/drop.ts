/**
 * `pnpm steering:derived-drop --yes` — destroy our knowledge base.
 *
 * SEPARATE FROM `db:drop` ON PURPOSE, and the separation is the point of the
 * whole design: `db:drop` iterates `SYSTEMS`, `vst_derived` is not in it, and so a
 * routine estate reset cannot reach this. Pharma lost its index exactly that
 * way. Dropping `vst_derived` has to be something somebody typed.
 *
 * Cheap to lose, which is the other half of the argument — everything in here
 * is derived, and `derived:create && derived:migrate && derived:parse` rebuilds it in seconds
 * from files that were never touched.
 */
import { Client } from 'pg';
import { DERIVED_DB, adminUrl, redact } from '../../config/connections';

async function main(): Promise<void> {
  if (!process.argv.includes('--yes')) {
    console.log(`\n  Refusing. This drops ${DERIVED_DB}. Re-run with --yes if that is what you mean.\n`);
    process.exit(1);
  }
  const admin = adminUrl();
  console.log(`\nDropping ${DERIVED_DB} on ${redact(admin)}\n`);
  const client = new Client({ connectionString: admin });
  await client.connect();
  await client.query(`drop database if exists "${DERIVED_DB}" with (force)`);
  await client.end();
  console.log(`  drop    ${DERIVED_DB}\n\nRebuild: derived:create && derived:migrate && derived:parse\n`);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
