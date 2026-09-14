/**
 * What is actually in the estate — read off the databases, written into the app.
 *
 * `pnpm pharma:estate` regenerates `apps/web/pharma-app/src/lib/estate.generated.ts`:
 * every table in all seven databases, its columns, and an EXACT row count.
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
 * SAMPLE VALUES COME FROM THE SIX AND NEVER FROM `mrd_kb`. An example beside a
 * column name is the fastest way to say what is in it — `LOT-IBU200-2609-B`
 * explains `lot_ref` better than any sentence would. The six systems hold
 * generated data, so publishing one row of each is publishing nothing. `mrd_kb`
 * does not: `ask_history` holds questions real people typed into this site, and
 * `documents` holds procedure text. Row counts for those are a fact about the
 * shape of the estate; their contents are not ours to put on a front page.
 *
 * HOW THE PROSE STAYS HONEST WITHOUT A CHECKER. The file exports an
 * `EstateTableKey` union of every `db.table` in the estate, and
 * `apps/veresk-app/src/lib/estate-notes.ts` types its map as
 * `Record<EstateTableKey, string>`. A table added without a note is a TYPE
 * ERROR, and so is a note for a table that no longer exists. `pnpm typecheck`
 * is the check; there is no second script to remember to run.
 */
import { Client } from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DB_NAMES, KB_DB, REPO_ROOT, SYSTEMS, urlFor } from '../../config/connections';

/** Where the generated file goes. Printed, never assumed — see below. */
const TARGET = resolve(REPO_ROOT, 'apps/web/pharma-app/src/lib/estate.generated.ts');

interface Column {
  name: string;
  /** One real value, truncated. Absent for `mrd_kb` and for empty tables. */
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

async function readDatabase(db: string): Promise<Table[]> {
  const client = new Client({ connectionString: urlFor(db) });
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
      if (count > 0 && db !== KB_DB) {
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
  console.log(`reading:  ${DB_NAMES.join(', ')}`);
  console.log(`writing:  ${TARGET}`);

  const systems = [];
  let total = 0;

  for (const db of DB_NAMES) {
    const tables = await readDatabase(db);
    const rows = tables.reduce((n, t) => n + t.rows, 0);
    total += rows;
    const label = SYSTEMS.find((s) => s.db === db)?.label ?? 'knowledge base';
    systems.push({ db, label, isSystemOfRecord: db !== KB_DB, tables });
    console.log(`  ${db.padEnd(9)} ${String(tables.length).padStart(3)} tables  ${String(rows).padStart(6)} rows`);
  }

  const keys = systems.flatMap((s) => s.tables.map((t) => `${s.db}.${t.name}`));
  const measuredAt = new Date().toISOString().slice(0, 10);

  const body = `/**
 * GENERATED by \`pnpm pharma:estate\` — do not edit.
 *
 * Every table in the seven databases, its columns, and an exact row count as of
 * the date below. The prose about what each table HOLDS is not here: it is
 * hand-written in \`estate-notes.ts\`, typed against \`EstateTableKey\`, so a
 * table added without a note fails \`pnpm typecheck\`.
 */

export interface EstateColumn {
  name: string;
  /** One real value from the table, truncated. Never present for \`mrd_kb\`. */
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
  /** \`mrd_kb\` is the one that is not. It is a library, not a system of record. */
  isSystemOfRecord: boolean;
  tables: EstateTable[];
}

/** The day the counts were measured. Printed on the page beside them. */
export const MEASURED_AT = '${measuredAt}';

/** The command that reproduces every number in this file. */
export const MEASURED_BY = 'pnpm pharma:estate';

export const TOTAL_ROWS = ${total};

export const ESTATE: EstateSystem[] = ${JSON.stringify(systems, null, 2)};

/** Every \`<db>.<table>\` in the estate. \`estate-notes.ts\` must cover all of them. */
export type EstateTableKey =
${keys.map((k) => `  | '${k}'`).join('\n')};
`;

  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, body);
  console.log(`\nestate: ${systems.length} databases, ${keys.length} tables, ${total} rows → written`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
