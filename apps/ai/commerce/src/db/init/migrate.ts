/**
 * `pnpm commerce:db-migrate` — apply each system's DDL to its own database.
 *
 * NOT A MIGRATION FRAMEWORK, and deliberately not one yet: there is one version
 * of this schema and no deployed copy to preserve, so a framework here would be
 * ceremony around a single `CREATE TABLE`. The moment a second version has to
 * reach a database somebody else is using, this file is the wrong shape and
 * should be replaced rather than extended.
 *
 * The skip, the transaction and the table counting are `@fde/estate`'s. Reading
 * the file is ours, for the reason below.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { migrateSchemas } from '@fde/estate';
import { SYSTEMS, urlFor, PACKAGE_ROOT } from '../../config/connections';

/**
 * The DDL lives in `db/schema/`, OUTSIDE `src/`, because `tsc` compiles
 * TypeScript and copies nothing. A `.sql` under `src/` is present under ts-node
 * and absent from `dist/` — a failure that only appears after a build. That is
 * also why `@fde/estate` takes a READER rather than a directory: the package
 * never touches the filesystem, so it cannot have an opinion about a layout
 * that is this package's problem.
 */
const SCHEMA_DIR = join(PACKAGE_ROOT, 'db', 'schema');
const force = process.argv.includes('--force');

async function main(): Promise<void> {
  console.log('\nApplying schemas\n');

  const results = await migrateSchemas(
    urlFor,
    SYSTEMS,
    (schema) => readFile(join(SCHEMA_DIR, schema), 'utf8'),
    { force },
  );

  for (const { db, schema, label, skipped, tables } of results) {
    console.log(
      skipped
        ? `  skip    ${db.padEnd(11)} ${tables} table(s) already — ${label}`
        : `  apply   ${db.padEnd(11)} ${String(schema).padEnd(14)} ${tables} tables — ${label}`,
    );
  }

  // The host, not a fake database name: running an ellipsis through `new URL()`
  // percent-encodes it, which is cute and useless.
  console.log(`\nmigrate: done — ${SYSTEMS.length} databases on ${new URL(urlFor('thb_shop')).host}\n`);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
