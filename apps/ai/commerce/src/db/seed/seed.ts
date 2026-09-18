/**
 * `pnpm commerce:db-seed` — build the estate in memory, then write it to five
 * databases.
 *
 * ONE TRANSACTION PER DATABASE, not one across all five, because there is no
 * such thing as one across all five: separate databases means separate
 * transactions, and pretending otherwise is the first lie an integration tells
 * itself. If thb_crm fails after thb_shop committed, the estate is half-loaded —
 * which is exactly the failure mode a customer's nightly sync has, and the
 * honest fix is `db:reset`, not a distributed transaction nobody has.
 *
 * Inserts go in batches rather than a statement per row. Forty thousand round
 * trips to Frankfurt is several minutes of waiting for no reason.
 */
import { Client } from 'pg';
import { SYSTEMS, urlFor, redact, assertNotAnotherEngagement } from '../../config/connections';
import { BUCKET, COLUMNS, tablesOf } from './columns';
import { buildWorld } from './world';
import { SEED } from './rng';
import type { Estate } from '../schema/rows';

type Bucket = Record<string, Record<string, unknown>[]>;

/**
 * Insert every row of one table in batches.
 *
 * `$1::text[]` style casts are omitted deliberately — pg infers from the target
 * column, and naming the type here would be one more place to get `numeric`
 * versus `integer` wrong.
 */
async function insertAll(
  client: Client,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
  batch = 500,
): Promise<number> {
  if (!rows.length) return 0;
  let written = 0;
  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch);
    const params: unknown[] = [];
    const tuples = slice.map((row) => {
      const ph = columns.map((c) => {
        params.push(row[c] ?? null);
        return `$${params.length}`;
      });
      return `(${ph.join(',')})`;
    });
    await client.query(`insert into ${table} (${columns.join(',')}) values ${tuples.join(',')}`, params);
    written += slice.length;
  }
  return written;
}

/** Wipe and refill one database, inside one transaction. */
async function loadDatabase(db: string, bucket: Bucket): Promise<number> {
  const client = new Client({ connectionString: urlFor(db) });
  await client.connect();
  await client.query('begin');
  try {
    // Truncate rather than drop: the schema is the migration's business, the
    // rows are this script's. CASCADE so foreign keys inside one database do
    // not fight the wipe.
    const tables = tablesOf(db);
    await client.query(`truncate ${tables.join(', ')} restart identity cascade`);
    let n = 0;
    for (const table of tables) {
      n += await insertAll(client, table, COLUMNS[db][table], bucket[table] ?? []);
    }
    await client.query('commit');
    return n;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    await client.end();
  }
}

function bucketOf(world: Estate, db: string): Bucket {
  // One honest cast at the boundary. Above this line the buckets are fully
  // typed and a mistyped column is a compile error; here the table is reached
  // by a name that only exists as a string, and pretending otherwise would mean
  // a cast at every one of the forty-four call sites instead of this one.
  return (world as unknown as Record<string, Bucket>)[BUCKET[db]];
}

async function main(): Promise<void> {
  assertNotAnotherEngagement(urlFor('thb_shop'));
  console.log(`\nBuilding the Thornbury world  (seed ${SEED}, deterministic)\n`);

  const world = buildWorld();
  let total = 0;

  for (const { db, label } of SYSTEMS) {
    try {
      const n = await loadDatabase(db, bucketOf(world, db));
      total += n;
      console.log(`  load    ${db.padEnd(11)} ${String(n).padStart(6)} rows across ${tablesOf(db).length} tables — ${label}`);
    } catch (e: unknown) {
      console.error(`\n  FAIL    ${db} — ${e instanceof Error ? e.message : String(e)}\n`);
      process.exit(1);
    }
  }

  console.log(`\nseed: done — ${total} rows, five databases, ${redact(urlFor('thb_shop'))}\n`);
}

// A CommonJS build has no top-level await. See create.ts for why the catch
// matters: a seed that fails with exit code 0 is worse than one that crashes.
main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
