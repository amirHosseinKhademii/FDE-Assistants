/**
 * `pnpm steering:estate-check` — every assertion, against the estate IN MEMORY.
 *
 * OFFLINE, FREE, AND NO DATABASE. That is the whole point of it: the generators
 * are pure, so the data can be proved correct before a single row is written
 * anywhere, and the check can run beside a typecheck rather than behind a
 * connection string somebody has to be given.
 *
 * `db:check` runs the SAME assertions against what Postgres hands back. The two
 * answer different questions and both are worth asking:
 *
 *   estate-check  is the DATA right?
 *   db:check      did the WRITE round-trip, and does it still read right after
 *                 pg has turned every numeric into a string and every date into
 *                 a Date?
 *
 * The second catches things the first cannot — a numeric column compared as a
 * string is the classic one, and it is why `rows.ts` has a `Numeric` type with
 * a paragraph attached.
 */
import { buildEstate, tablesOf } from '../seed/estate';
import { buildPrograms } from '../seed/programs';
import { buildRequirements } from '../seed/requirements';
import { buildCorpus } from '../seed/corpus';
import { runAssertions, runCorpusAssertions, report, type Tables, type Result } from './assertions';

function main(): void {
  const estate = buildEstate();

  const index = new Map<string, Record<string, any>[]>();
  for (const [system, table, rows] of tablesOf(estate)) {
    index.set(`${system}.${table}`, rows as Record<string, any>[]);
  }
  const T: Tables = (system, table) => index.get(`${system}.${table}`) ?? [];

  const crm = buildPrograms();
  const files = buildCorpus(crm, buildRequirements(crm));

  const db = runAssertions(T);
  const corpus = runCorpusAssertions(files);

  // Determinism, proved rather than asserted. Two independent builds must be
  // byte-identical — if they are not, every number measured against this estate
  // describes something that no longer exists, and no other check here means
  // anything.
  const determinism: Result = { ok: [], fail: [] };
  {
    const hash = (e: unknown) => JSON.stringify(e).length + ':' + JSON.stringify(e).slice(0, 2000);
    const a = JSON.stringify(buildEstate());
    const b = JSON.stringify(buildEstate());
    const ca = JSON.stringify(buildCorpus(buildPrograms(), buildRequirements(buildPrograms())));
    const cb = JSON.stringify(buildCorpus(buildPrograms(), buildRequirements(buildPrograms())));
    const note = { label: 'determinism — two builds, one estate', detail: `${a.length} bytes of tables and ${ca.length} bytes of corpus, identical both times` };
    if (a === b && ca === cb) determinism.ok.push(note);
    else determinism.fail.push({ ...note, detail: `builds differ — ${hash(a) === hash(b) ? 'corpus' : 'tables'} moved between two calls` });
  }

  const merged: Result = {
    ok: [...db.ok, ...corpus.ok, ...determinism.ok],
    fail: [...db.fail, ...corpus.fail, ...determinism.fail],
  };
  process.exit(report('estate-check', merged));
}

main();
