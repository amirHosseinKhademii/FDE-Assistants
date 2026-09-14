/** `pnpm steering:derived-migrate` — apply `05-derived.sql`. `--force` re-applies over existing tables. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { DERIVED_DB, DERIVED_SCHEMA, derivedUrl, PACKAGE_ROOT } from '../../config/connections';

const force = process.argv.includes('--force');

async function main(): Promise<void> {
  const client = new Client({ connectionString: derivedUrl() });
  await client.connect();
  const { rows } = await client.query(
    "select count(*)::int n from information_schema.tables where table_schema = 'public'",
  );
  if (rows[0].n > 0 && !force) {
    console.log(`\n  skip    ${DERIVED_DB}  ${rows[0].n} table(s) already — pass --force to re-apply\n`);
    await client.end();
    return;
  }
  const ddl = await readFile(join(PACKAGE_ROOT, 'db', 'schema', DERIVED_SCHEMA), 'utf8');
  await client.query('begin');
  try {
    // ── `--force` MEANS EMPTY THE SCHEMA, and that phrasing is deliberate ──
    //
    // The version before this dropped `source_files cascade` and claimed the
    // cascade would reach every derived table. IT DOES NOT: cascade drops
    // dependent CONSTRAINTS, not dependent tables, so the child tables survived
    // and the next migrate failed on `relation already exists`.
    //
    // The obvious repair — list every table in the drop — is the one that rots,
    // because the list is silently incomplete the first time somebody adds a
    // table and forgets. Dropping the schema cannot be incomplete.
    //
    // Only safe because this database is OURS and everything in it is derived:
    // `derived:create && derived:migrate && derived:parse` rebuilds it in seconds from files
    // that were never touched. It would be indefensible against the estate.
    if (force) await client.query('drop schema public cascade; create schema public');
    await client.query(ddl);
    await client.query('commit');
  } catch (e: any) {
    await client.query('rollback');
    console.error(`\n  FAIL    ${DERIVED_DB} — ${e.message}\n`);
    await client.end();
    process.exit(1);
  }
  const after = await client.query(
    "select count(*)::int n from information_schema.tables where table_schema = 'public'",
  );
  console.log(`\n  apply   ${DERIVED_DB}  ${DERIVED_SCHEMA}  ${after.rows[0].n} tables\n`);
  await client.end();
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
