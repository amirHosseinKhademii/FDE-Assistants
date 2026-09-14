/**
 * What is actually in the estate — read off the databases, written into the app.
 *
 * `pnpm steering:estate` regenerates
 * `apps/web/steering-app/src/lib/estate.generated.ts`: every table in the
 * four databases, its columns, an EXACT row count and one real value each.
 *
 * IT IS A SIBLING OF `packages/pharma/src/db/init/inventory.ts`, NOT AN IMPORT
 * OF IT, and that is the same call `telemetry/prices.ts` made. The two read
 * different connection modules, have different ideas about which databases may
 * publish sample values, and write different files; what they share is about
 * forty lines of `information_schema` query that would need a package, a
 * dependency and an interface to be shared — and a package shaped by two
 * callers that agree today is how you get a package that constrains them both
 * tomorrow. If a third domain needs this, extract it then.
 *
 * WHY THIS IS GENERATED AND NOT TYPED OUT. The front page states figures and
 * this repo's standing rule is that a figure a reader cannot reproduce is worse
 * than no figure. Forty-nine tables hand-copied into a component is a list that
 * is wrong the first time a table is added and silent about it — and two of
 * these tables (`complaints`, `lab_events`) were added after the plan was
 * written, which is exactly the drift being designed against.
 *
 * IT READS `information_schema`, NOT THE DDL FILES. The six `db/schema/*.sql`
 * files would give tables and columns offline, and they would describe what we
 * MEANT to deploy. `mrd_kb` has no file at all — `@fde/grounding` creates it —
 * so a DDL-based reader would either miss it or need a second code path for it.
 * One query against what is really there covers all seven and cannot disagree
 * with the deployment.
 *
 * `count(*)`, NOT `n_live_tup`. The first version used `pg_stat_user_tables`,
 * which is the stats collector's ESTIMATE and goes stale after a bulk load
 * without `ANALYZE`. Its numbers happened to be right. On a five-thousand-row
 * estate forty-nine exact counts take about a second, and a number that is
 * usually right is not a measurement.
 *
 * EVERY DATABASE HERE MAY PUBLISH A SAMPLE, which is a real difference from the
 * pharma generator rather than a simplification. That one withholds values from
 * `mrd_kb` because it holds questions real people typed into the site. These
 * four hold nothing but generated rows, and the fifth thing in this estate —
 * the code base — is not a database at all: it is files under
 * `docs/steering/corpus/`, chunked and searched, and it does not appear here.
 *
 * HOW THE PROSE STAYS HONEST WITHOUT A CHECKER. The file exports an
 * `EstateTableKey` union of every `db.table` in the estate, and
 * `apps/steering-app/src/lib/estate-notes.ts` types its map as
 * `Record<EstateTableKey, string>`. A table added without a note is a TYPE
 * ERROR, and so is a note for a table that no longer exists. `pnpm typecheck`
 * is the check; there is no second script to remember to run.
 */
import { Client } from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DB_NAMES, DERIVED_DB, REPO_ROOT, SYSTEMS, derivedUrl, urlFor } from '../config/connections';

/** Where the generated file goes. Printed, never assumed — see below. */
const TARGET = resolve(REPO_ROOT, 'apps/web/steering-app/src/lib/estate.generated.ts');

interface Column {
  name: string;
  /** One real value, truncated. Absent for empty tables. */
  sample?: string;
  /** A coarse tag, not the Postgres type. Nobody reading a front page needs
   *  `character varying(64)`; they need to know it is text. */
  kind: 'text' | 'number' | 'date' | 'flag' | 'json' | 'other';
}

interface Table {
  name: string;
  columns: Column[];
  rows: number;
}

function kindOf(dataType: string): Column['kind'] {
  if (/char|text|uuid|name/.test(dataType)) return 'text';
  if (/int|numeric|real|double|decimal/.test(dataType)) return 'number';
  if (/date|time/.test(dataType)) return 'date';
  if (/bool/.test(dataType)) return 'flag';
  if (/json/.test(dataType)) return 'json';
  return 'other';
}

/**
 * One value, short enough to sit at the end of a line.
 *
 * Dates are cut to the day — the time on a seeded timestamp is noise, and the
 * whole point of the example is to show the SHAPE of what is stored. Long text
 * is cut with an ellipsis rather than wrapped, because a field list stops being
 * a list the moment one row is three lines tall.
 */
function sampleOf(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (!text.trim()) return undefined;
  /* An embedding is thousands of characters of float. Nothing about it is worth
     showing, and the first twenty characters of one are actively misleading. */
  if (text.length > 400) return undefined;
  return text.length > 26 ? `${text.slice(0, 25)}…` : text;
}

/**
 * IT TAKES A URL AND NOT A DATABASE NAME, AND THAT IS THE WHOLE `vst_derived` STORY
 * IN ONE SIGNATURE. `urlFor` runs `assertOurs`, which throws by design on
 * anything outside the customer's four — including our own index. Reaching
 * `vst_derived` by loosening that guard would delete the thing that stops a mistyped
 * base URL dropping somebody else's estate. So the guard is left alone and the
 * caller decides which connection it is handing over.
 */
async function readDatabase(url: string): Promise<Table[]> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows: cols } = await client.query<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>(
      `select table_name, column_name, data_type
         from information_schema.columns
        where table_schema = 'public'
        order by table_name, ordinal_position`,
    );

    const byTable = new Map<string, Column[]>();
    for (const c of cols) {
      const list = byTable.get(c.table_name) ?? [];
      list.push({ name: c.column_name, kind: kindOf(c.data_type) });
      byTable.set(c.table_name, list);
    }

    const tables: Table[] = [];
    for (const [name, columns] of byTable) {
      /* The identifier is quoted rather than interpolated raw. It comes from
         `information_schema` on our own database so it is not user input, but a
         query built by concatenating a name is a habit that is wrong the one
         time the name is not ours. */
      const { rows } = await client.query<{ n: string }>(
        `select count(*)::text as n from "${name.replace(/"/g, '""')}"`,
      );
      const count = Number(rows[0].n);

      /* `order by 1` makes the sample DETERMINISTIC. Without it Postgres is
         free to hand back a different row each time, and the generated file
         would show a diff on every regeneration with nothing having changed. */
      if (count > 0) {
        const { rows: sample } = await client.query(
          `select * from "${name.replace(/"/g, '""')}" order by 1 limit 1`,
        );
        for (const column of columns) {
          column.sample = sampleOf(sample[0]?.[column.name]);
        }
      }

      tables.push({ name, columns, rows: count });
    }
    return tables.sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    await client.end();
  }
}

async function main() {
  /* SAY WHERE THE ROWS ARE GOING. A load that prints what it read and not where
     it wrote is the exact shape of the `corpus:load` incident — a pharma corpus
     written into the insurance database by a command whose output never named
     its target. This one writes across a package boundary too. */
  console.log(`reading:  ${[...DB_NAMES, DERIVED_DB].join(', ')}`);
  console.log(`writing:  ${TARGET}`);

  const systems = [];
  let total = 0;

  for (const db of DB_NAMES) {
    const tables = await readDatabase(urlFor(db));
    const rows = tables.reduce((n, t) => n + t.rows, 0);
    total += rows;
    const system = SYSTEMS.find((s) => s.db === db);
    systems.push({
      db,
      label: system?.label ?? db,
      isSystemOfRecord: true,
      /* WHAT THE CUSTOMER ACTUALLY CALLS IT. `vst_alm` means nothing to a bid
         engineer; "Codebeamer / Polarion / DOORS" is the thing on their desk,
         and naming the vendor is what makes the estate recognisable as theirs
         rather than as ours. */
      standsFor: system?.standsFor ?? '',
      tables,
    });
    console.log(`  ${db.padEnd(9)} ${String(tables.length).padStart(3)} tables  ${String(rows).padStart(6)} rows`);
  }

  /* ── THE FIFTH DATABASE, AND IT IS OURS ───────────────────────────────────
     `vst_derived` is not in `SYSTEMS` and must never be, because `db:drop` and
     `db:reset` iterate that array and pharma lost its own index exactly that
     way. It is read here anyway, because the page's job is to show what is in
     the estate and leaving ours off would tell the reader the four databases
     are all there is — which, since the sorting started writing rows, is no
     longer true.

     IT IS MISSING RATHER THAN FATAL IF IT HAS NOT BEEN BUILT. The page has been
     regenerated from a machine where `derived:create` had never run, and a generator
     that dies there would block a page that is perfectly describable without
     it. So a connection failure is reported and skipped, loudly. */
  try {
    const tables = await readDatabase(derivedUrl());
    const rows = tables.reduce((n, t) => n + t.rows, 0);
    total += rows;
    systems.push({
      db: DERIVED_DB,
      label: 'What we derived from the files',
      isSystemOfRecord: false,
      standsFor: 'ours, not theirs — built by pnpm derived:parse',
      tables,
    });
    console.log(`  ${DERIVED_DB.padEnd(9)} ${String(tables.length).padStart(3)} tables  ${String(rows).padStart(6)} rows  (ours)`);
  } catch (err) {
    console.log(`  ${DERIVED_DB.padEnd(9)}   — not reachable, left out: ${(err as Error).message.slice(0, 60)}`);
  }

  const keys = systems.flatMap((s) => s.tables.map((t) => `${s.db}.${t.name}`));
  const measuredAt = new Date().toISOString().slice(0, 10);

  const body = `/**
 * GENERATED by \`pnpm steering:estate\` — do not edit.
 *
 * Every table in the estate — the customer's four systems of record AND
 * \`vst_derived\`, which is ours — its columns, and an exact row count as of
 * the date below. The prose about what each table HOLDS is not here: it is
 * hand-written in \`estate-notes.ts\`, typed against \`EstateTableKey\`, so a
 * table added without a note fails \`pnpm typecheck\`.
 */

export interface EstateColumn {
  name: string;
  /** One real value from the table, truncated. Absent for empty tables. */
  sample?: string;
  kind: 'text' | 'number' | 'date' | 'flag' | 'json' | 'other';
}

export interface EstateTable {
  name: string;
  columns: EstateColumn[];
  rows: number;
}

export interface EstateSystem {
  db: string;
  label: string;
  /** False for \`vst_derived\`. It is a knowledge base we built, not a system they run. */
  isSystemOfRecord: boolean;
  /** The commercial tool this stands in for, as the customer would name it. */
  standsFor: string;
  tables: EstateTable[];
}

/** The day the counts were measured. Printed on the page beside them. */
export const MEASURED_AT = '${measuredAt}';

/** The command that reproduces every number in this file. */
export const MEASURED_BY = 'pnpm steering:estate';

export const TOTAL_ROWS = ${total};

export const ESTATE: EstateSystem[] = ${JSON.stringify(systems, null, 2)};

/** Every \`<db>.<table>\`. \`estate-notes.ts\` must cover all of them. */
export type EstateTableKey =
${keys.map((k) => `  | '${k}'`).join('\n')};
`;

  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, body);
  console.log(`\nestate: ${systems.length} databases, ${keys.length} tables, ${total} rows → written`);
}

/**
 * Guarded so that importing this file — for a constant, a type, anything — does
 * not run it. `index-cli.ts` was imported for one string and re-embedded the
 * whole corpus; `sql:check` now asserts every entry point here does this.
 */
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
