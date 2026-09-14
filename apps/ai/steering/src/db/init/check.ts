/**
 * `pnpm steering:db-check` — the same assertions as `estate-check`, against
 * what Postgres actually hands back.
 *
 * WHY BOTH EXIST, since they share every assertion. They answer different
 * questions:
 *
 *   estate-check  is the DATA right?           offline, free, no database
 *   db:check      did the WRITE round-trip?    and does it still read right
 *                 after pg has turned every `numeric` into a string and every
 *                 `date` into a `Date`
 *
 * The second catches what the first structurally cannot. `numeric` comes back
 * as `'0.900'`, and a budget delta compared as a string against a number is the
 * exact shape of bug that passes in memory and fails in production — which is
 * why `rows.ts` has a `Numeric` type with a paragraph attached, and why every
 * comparison in `assertions.ts` goes through `Number()`.
 *
 * The corpus checks run here too, from DISK rather than from the generator, so
 * this also answers a third question: is what was written to
 * `docs/steering/corpus/` the same thing the generator produced?
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { Client } from 'pg';
import { SYSTEMS, urlFor, REPO_ROOT } from '../../config/connections';
import { runAssertions, runCorpusAssertions, report, EXPECTED_TABLES, type Tables, type Result } from './assertions';

const CORPUS_DIR = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

/** Short system key (`crm`) from a database name (`vst_crm`). */
const shortOf = (db: string): string => db.slice(4);

function readCorpus(dir: string): { path: string; content: string }[] {
  if (!existsSync(dir)) return [];
  const out: { path: string; content: string }[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push({ path: relative(dir, full).split('\\').join('/'), content: readFileSync(full, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

async function main(): Promise<void> {
  const index = new Map<string, Record<string, any>[]>();

  for (const { db } of SYSTEMS) {
    const short = shortOf(db);
    const client = new Client({ connectionString: urlFor(db) });
    await client.connect();
    for (const table of EXPECTED_TABLES[short] ?? []) {
      const { rows } = await client.query(`select * from ${table}`);
      index.set(`${short}.${table}`, rows);
    }
    await client.end();
  }

  const T: Tables = (system, table) => index.get(`${system}.${table}`) ?? [];

  const db = runAssertions(T);
  const files = readCorpus(CORPUS_DIR);
  const corpus = files.length
    ? runCorpusAssertions(files)
    : {
        ok: [],
        fail: [{
          label: 'the corpus is on disk',
          detail: `nothing at ${CORPUS_DIR} — run \`pnpm steering:corpus\`. Half the estate is missing, ` +
            `including the only statement of what ASIL the damping component ships at.`,
        }],
      };

  const merged: Result = { ok: [...db.ok, ...corpus.ok], fail: [...db.fail, ...corpus.fail] };
  process.exit(report('db:check', merged));
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
