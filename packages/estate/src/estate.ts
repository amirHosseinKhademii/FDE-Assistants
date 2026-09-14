/**
 * Bring up, tear down and migrate a set of databases — one per source system.
 *
 * WHY THIS IS SHARED AND THE FORMATTING IS NOT. Two engagements model a
 * customer's estate as several separate databases with no joins between them,
 * and each wrote its own create / drop / migrate. The scripts were 53–67 %
 * identical; every difference was a log line. So the SQL and the safety live
 * here, each function RETURNS what it did, and each caller prints it however it
 * likes. A package that took a formatter per caller would be the other failure —
 * one shared thing that no longer reads as one thing.
 *
 * THE ONE BEHAVIOUR CHANGE, and it is the reason the drop path was worth
 * sharing at all: `dropDatabases` checks EVERY name before it drops ANY. Both
 * copies asserted and dropped in the same loop, so a foreign name in fourth
 * place was discovered after three databases were already gone. `assertOurs` is
 * the only thing standing between a mistyped base URL and somebody else's data;
 * it should fail before the first irreversible statement, not during.
 *
 * `client` is injectable on every function so the selftest drives these exact
 * paths with no Postgres — including the drop path, which is not something you
 * want to test any other way.
 */
import { Client } from 'pg';

/** One source system: its database, what to call it, and its DDL file. */
export interface System {
  db: string;
  label: string;
  /** The DDL filename under the schema directory. Only `migrateSchemas` reads it. */
  schema?: string;
}

/** Just enough of `pg.Client` to run these scripts, so a fake is three lines. */
export interface SqlClient {
  connect(): Promise<void>;
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
  end(): Promise<void>;
}

async function withClient<T>(
  connectionString: string,
  injected: SqlClient | undefined,
  body: (c: SqlClient) => Promise<T>,
): Promise<T> {
  const client = injected ?? (new Client({ connectionString }) as unknown as SqlClient);
  await client.connect();
  try {
    return await body(client);
  } finally {
    await client.end();
  }
}

/**
 * The caller's own system object, plus what happened to it. Generic so a
 * descriptor with extra fields — steering carries a `standsFor` it prints —
 * comes back whole instead of being flattened to what this package happens to
 * name.
 */
export type Created<S extends System = System> = S & {
  /** false means it was already there and was left alone. */
  created: boolean;
};

/**
 * Idempotent: an existing database is reported and left alone. Re-running this
 * must never be the destructive step — that is `dropDatabases`, which asks.
 *
 * CREATE DATABASE CANNOT RUN THROUGH PGBOUNCER: it is not transactional and the
 * pooler refuses it, with an error about transaction blocks that says nothing
 * about poolers. Pass the DIRECT (non-pooled) admin URL here; everything else
 * should use the pooled endpoint an app would use.
 */
export async function createDatabases<S extends System>(
  adminUrl: string,
  // READONLY, because both callers declare SYSTEMS `as const` — and a
  // function that only reads an array should say so rather than make its
  // callers cast.
  systems: readonly S[],
  client?: SqlClient,
): Promise<Created<S>[]> {
  return withClient(adminUrl, client, async (c) => {
    const out: Created<S>[] = [];
    for (const sys of systems) {
      const { db } = sys;
      const { rows } = await c.query('select 1 from pg_database where datname = $1', [db]);
      if (rows.length) {
        out.push({ ...sys, created: false });
        continue;
      }
      // Identifiers cannot be parameterised. `db` comes from the caller's
      // SYSTEMS constant, never from input, and the quoting is belt-and-braces
      // on top of that.
      await c.query(`create database "${db}"`);
      out.push({ ...sys, created: true });
    }
    return out;
  });
}

/**
 * EVERY NAME IS CHECKED BEFORE ANY DATABASE IS DROPPED. See the header: the
 * per-iteration version discovers a foreign name only after destroying the ones
 * before it, and DROP DATABASE has no undo.
 *
 * Asking the user is the CALLER's job — one prints a preview, the other exits
 * with a message, and neither is this package's business.
 */
export async function dropDatabases(
  adminUrl: string,
  systems: readonly System[],
  assertOurs: (db: string) => void,
  client?: SqlClient,
): Promise<string[]> {
  for (const { db } of systems) assertOurs(db);

  return withClient(adminUrl, client, async (c) => {
    const dropped: string[] = [];
    for (const { db } of systems) {
      await c.query(`drop database if exists "${db}" with (force)`);
      dropped.push(db);
    }
    return dropped;
  });
}

export type Migrated<S extends System = System> = S & {
  /** true when the database already had tables and `force` was not set. */
  skipped: boolean;
  /** Table count after the run — or the count that caused the skip. */
  tables: number;
};

/**
 * NOT A MIGRATION FRAMEWORK, and deliberately not one yet: there is one version
 * of each schema and no deployed copy to preserve, so a framework here would be
 * ceremony around a single CREATE TABLE. The moment a second version has to
 * reach a database somebody else is using, this is the wrong shape and should be
 * replaced rather than extended.
 *
 * THE DDL MUST LIVE OUTSIDE `src/`. `tsc` compiles TypeScript and copies
 * nothing, so a `.sql` under `src/` is present under ts-node and absent from
 * `dist/` — a failure that only appears after a build. `schemaDir` is a path the
 * caller resolves from its own package root for exactly that reason.
 */
export async function migrateSchemas<S extends System>(
  urlFor: (db: string) => string,
  systems: readonly S[],
  readSchema: (schema: string) => Promise<string>,
  opts: { force?: boolean; client?: SqlClient } = {},
): Promise<Migrated<S>[]> {
  const COUNT = "select count(*)::int n from information_schema.tables where table_schema = 'public'";
  const out: Migrated<S>[] = [];

  for (const sys of systems) {
    const { db, schema } = sys;
    if (!schema) continue;
    await withClient(urlFor(db), opts.client, async (c) => {
      const before = await c.query(COUNT);
      if (before.rows[0].n > 0 && !opts.force) {
        out.push({ ...sys, skipped: true, tables: before.rows[0].n });
        return;
      }

      // IN A TRANSACTION, because a DDL file is many statements and half a
      // schema is worse than none — the next run would find tables present and
      // SKIP, leaving the gap in place and reporting success. Both callers
      // already did this; it moved here so neither can lose it.
      await c.query('begin');
      try {
        await c.query(await readSchema(schema));
        await c.query('commit');
      } catch (e) {
        await c.query('rollback');
        throw e;
      }

      const after = await c.query(COUNT);
      out.push({ ...sys, skipped: false, tables: after.rows[0].n });
    });
  }
  return out;
}
