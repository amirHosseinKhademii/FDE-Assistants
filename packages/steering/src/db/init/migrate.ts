/**
 * `pnpm steering:db-migrate` — apply each system's DDL to its own database.
 *
 * NOT A MIGRATION FRAMEWORK, and deliberately not one yet: there is one version
 * of this schema and no deployed copy to preserve, so a framework here would be
 * ceremony around a single CREATE TABLE. The moment a second version has to
 * reach a database somebody else is using, this file is the wrong shape and
 * should be replaced rather than extended.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';
import { SYSTEMS, urlFor, PACKAGE_ROOT } from '../../config/connections';

/**
 * The DDL lives in `db/schema/`, OUTSIDE `src/`, because tsc compiles
 * TypeScript and copies nothing. A `.sql` file under `src/` would be present
 * under ts-node and absent from `dist/` — a failure that only appears after a
 * build.
 */
const SCHEMA_DIR = join(PACKAGE_ROOT, 'db', 'schema');
const force = process.argv.includes('--force');

async function main(): Promise<void> {
  console.log('\nApplying schemas\n');

  for (const { db, schema, label } of SYSTEMS) {
    const client = new Client({ connectionString: urlFor(db) });
    await client.connect();

    const { rows } = await client.query(
      "select count(*)::int n from information_schema.tables where table_schema = 'public'",
    );
    if (rows[0].n > 0 && !force) {
      console.log(`  skip    ${db}  ${rows[0].n} table(s) already — ${label}`);
      await client.end();
      continue;
    }

    const ddl = await readFile(join(SCHEMA_DIR, schema), 'utf8');
    await client.query('begin');
    try {
      await client.query(ddl);
      await client.query('commit');
    } catch (e: any) {
      await client.query('rollback');
      console.error(`  FAIL    ${db} — ${e.message}`);
      await client.end();
      process.exit(1);
    }
    const after = await client.query(
      "select count(*)::int n from information_schema.tables where table_schema = 'public'",
    );
    console.log(`  apply   ${db}  ${schema.padEnd(12)} ${after.rows[0].n} tables — ${label}`);
    await client.end();
  }

  console.log(`\nmigrate: done — ${SYSTEMS.length} databases on ${new URL(urlFor('vst_crm')).host}\n`);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
