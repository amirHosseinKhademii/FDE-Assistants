/**
 * `pnpm steering:sql-check` — can anything on the ANSWER PATH write?
 * OFFLINE: reads source, touches no database.
 *
 * ── WHY THIS AND NOT `@fde/guard` ────────────────────────────────────────
 *
 * `@fde/guard` protects an HTTP surface with an API key. Steering has no HTTP
 * surface, so borrowing it would produce a check that passes by having nothing
 * to check — the worst kind, because a green tick earned that way is
 * indistinguishable from a real one. Pharma reached the same conclusion and
 * wrote the same shape; the reasoning is repeated rather than linked because
 * the next person deciding this should see it, not chase it.
 *
 * ── THE PROPERTY, WHICH IS DIFFERENT HERE ────────────────────────────────
 *
 * `vst_derived` is OURS, so a stray write to it is a bug rather than a regulatory
 * event. What makes the rule worth asserting anyway is the other four: the
 * answer path must never write to the CUSTOMER'S systems, and it must never
 * read them either — those rows are the answer key, and a product that consults
 * them is scoring its own exam.
 *
 * So two properties, both source-level:
 *
 *   1. every SQL string under `tools/` is a read
 *   2. nothing under `tools/` names a customer database or `urlFor`
 *
 * `db/` and `derived/ingest/` are exempt from (1): building the estate and loading
 * the knowledge base are exactly what they are for.
 *
 * ── AND WHAT IT DOES NOT PROVE, SAID OUT LOUD ────────────────────────────
 *
 * That no write is WRITTEN — not that the database would refuse one. The real
 * control is a read-only Postgres role on the answer path's connection string,
 * which this estate does not have. Stated here rather than implied by a tick.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PACKAGE_ROOT } from '../config/connections';
import { report, type Result } from '../db/init/assertions';

/**
 * EVERY DIRECTORY ON THE ANSWER PATH.
 *
 * `src/agent/` was added when the tools were, and adding it was the point: a
 * tool is the closest thing to the customer's estate that exists, since its
 * arguments come from a model rather than from a person who read the schema.
 * A scan that covered the layer underneath and not the layer above would have
 * been reassuring and wrong.
 */
const SCANNED = [
  join(PACKAGE_ROOT, 'src', 'tools'),
  join(PACKAGE_ROOT, 'src', 'agent'),
];

/**
 * Statements that change something. Word-bounded, so `updated_at` is not a write.
 *
 * ── EVERY VERB NAMES WHAT IT ACTS ON, AND THAT WAS A FIX ─────────────────
 *
 * `drop\s+`, `truncate\s+` and `alter\s+` used to stand alone. They are also
 * ordinary English, and this scan reads comments on purpose — so a comment
 * saying "Drop this one, keep the rest" failed the whole check, in a file
 * containing nothing but selects.
 *
 * That is not a harmless false positive. This tick is what a security reviewer
 * is shown (see `docs/steering/CONTROLS.md`), and a check that fires on prose
 * gets routed around: the next person reaches for a reword, or for `--force`,
 * and the guard stops meaning anything. `scripts/leak-check.mjs` states the
 * rule in its own header — a banned pattern must be one that CANNOT appear
 * innocently.
 *
 * So each verb now requires the object a real statement gives it. `drop table`
 * is not English; `drop` is. The negative control at the bottom of this file
 * asserts BOTH directions: the statements are still caught, and the sentence is
 * not.
 */
const WRITES =
  /\b(insert\s+into|update\s+\w+\s+set|delete\s+from|(drop|truncate|alter)\s+(table|database|view|index|schema|column|type|sequence)|create\s+(table|database|view))\b/i;

/** The customer's estate. The answer path may not name it at all. */
const ESTATE = ['vst_crm', 'vst_plm', 'vst_alm', 'vst_pmo', 'urlFor', 'SYSTEMS', 'DB_NAMES'];

function sources(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((n) => {
    const full = join(dir, n);
    return statSync(full).isDirectory() ? sources(full) : full.endsWith('.ts') ? [full] : [];
  });
}

function main(): void {
  const r: Result = { ok: [], fail: [] };
  const files = SCANNED.flatMap(sources);

  const writers = files.filter((f) => WRITES.test(readFileSync(f, 'utf8')));
  (writers.length ? r.fail : r.ok).push({
    label: 'every SQL statement on the answer path is a read',
    detail: writers.length
      ? `${writers.map((f) => relative(PACKAGE_ROOT, f)).join(', ')} contains a write`
      : `${files.length} file(s) under src/tools/ — selects only`,
  });

  const reachers = files
    .map((f) => ({ f, hits: ESTATE.filter((w) => readFileSync(f, 'utf8').includes(w)) }))
    .filter((x) => x.hits.length);
  (reachers.length ? r.fail : r.ok).push({
    label: 'the answer path cannot reach the customer databases',
    detail: reachers.length
      ? `${relative(PACKAGE_ROOT, reachers[0].f)} names ${reachers[0].hits.join(', ')} — those rows are the answer key`
      : `none of ${files.length} file(s) names ${ESTATE.join(', ')}`,
  });

  // ── 3 · NOTHING ON THE ANSWER PATH MAY IMPORT AN ENTRY POINT ───────────
  //
  // `documents.ts` imported one string, `CHUNK_TABLE`, from `index-cli.ts`.
  // That module calls `main()` at module scope, so reading the constant RAN THE
  // INDEXER: 702 documents re-embedded on every search, 410,000 tokens a time,
  // and — because the ingest empties the table before refilling it — the query
  // that followed ran against nothing.
  //
  // Three of five retrieval cases reported "nothing found" and were read as
  // retrieval failing. They were not. Nothing in the output said an indexer had
  // run; it was visible only because the banner it prints appeared twice.
  //
  // A constant is the most innocent-looking reason to import a module, which is
  // exactly why this is asserted rather than remembered.
  const importers = files
    .map((f) => ({ f, src: readFileSync(f, 'utf8') }))
    .filter((x) => /from '[^']*(cli\/|-cli|selftest)[^']*'/.test(x.src));
  (importers.length ? r.fail : r.ok).push({
    label: 'the answer path imports no entry point',
    detail: importers.length
      ? `${relative(PACKAGE_ROOT, importers[0].f)} imports a CLI — importing one runs it`
      : `${files.length} file(s) import only inert modules`,
  });

  // ── 4 · EVERY ENTRY POINT GUARDS ITSELF ────────────────────────────────
  //
  // The other half of the same rule, and the one that makes it safe to be wrong
  // about the first. A module that only runs when it is the process entry point
  // is harmless to import by accident.
  const clis = [
    ...sources(join(PACKAGE_ROOT, 'src', 'cli')),
    ...sources(join(PACKAGE_ROOT, 'src', 'grounding')),
    // The self-tests are entry points too, and they sit INSIDE the directories
    // scanned above — so an unguarded one is importable by the very code it
    // checks, which is the loop that started all this.
    ...files.filter((f) => /selftest\.ts$/.test(f)),
  ];
  const unguarded = clis.filter((f) => {
    const src = readFileSync(f, 'utf8');
    return /^main\(\)/m.test(src) && !src.includes('require.main === module');
  });
  (unguarded.length ? r.fail : r.ok).push({
    label: 'every entry point runs only when it IS the entry point',
    detail: unguarded.length
      ? `${unguarded.map((f) => relative(PACKAGE_ROOT, f)).join(', ')} calls main() unguarded`
      : `${clis.length} file(s) checked; each guarded with require.main === module or exporting only`,
  });

  // ── 5 · `src/answer/` — THE ONE PLACE ALLOWED TO WRITE, AND THE SPLIT ──
  //
  // Two exemptions meet in this directory and each is safe only because the
  // other is absent:
  //
  //   requirements.ts          NAMES THE ESTATE (`urlFor('vst_alm')`) — it is
  //                            how the customer's requirement text is fetched
  //                            — and writes nothing
  //   filed-assessments.ts     WRITES (`insert into assess_history`) and never
  //                            names the estate: it resolves `derivedUrl()`,
  //                            which is our own database
  //
  // A file doing both would be a write path holding a handle to the customer's
  // system of record. Nothing in the code says that cannot happen; this does.
  //
  // The write used to live in the app, where it was covered by no check at all.
  // It moved so that `pnpm steering:assess` could file an assessment — see that
  // file's header — and this assertion is the price of the move.
  //
  // ── AND THIS ONE READS CODE, NOT COMMENTS, WHICH IS A DEPARTURE ────────
  //
  // Check 2 above scans whole files, comments included, and should: a mention
  // of `vst_alm` anywhere on the answer path is a smell, and it passes clean
  // today. This directory is different — it IS the boundary, so it is the one
  // place that has to describe the boundary, and `filed-assessments.ts` failed
  // this check the moment it was written for a header sentence saying it can
  // never reach `vst_alm`. Failing a guard for explaining the guard is how the
  // guard gets deleted.
  //
  // So comment lines are dropped, conservatively — only lines that BEGIN with
  // `//`, `*` or `/*`, never a trailing comment, because `leak-check.mjs` once
  // mistook a live `postgresql://` credential for one and reported PASS. The
  // plant below proves the stripping did not take the teeth out: a real
  // `urlFor(` in code is still caught.
  const WRITER = 'filed-assessments.ts';
  const codeOnly = (src: string): string =>
    src
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
  const answerFiles = sources(join(PACKAGE_ROOT, 'src', 'answer'))
    .map((f) => ({ f, name: relative(PACKAGE_ROOT, f), src: codeOnly(readFileSync(f, 'utf8')) }));

  const offenders = answerFiles.filter((x) => {
    const writes = WRITES.test(x.src);
    const reaches = ESTATE.some((w) => x.src.includes(w));
    // Allowed: write and no estate, or estate and no write, or neither.
    // Forbidden: both, or a writer that is not the one named file.
    if (writes && reaches) return true;
    return writes && !x.f.endsWith(WRITER);
  });
  (offenders.length ? r.fail : r.ok).push({
    label: 'in src/answer/, the file that writes is not the file that can reach the estate',
    detail: offenders.length
      ? `${offenders[0].name} both writes and names the customer's estate, or writes without being ${WRITER}`
      : `${answerFiles.length} file(s); only ${WRITER} writes, and it names none of ${ESTATE.join(', ')}`,
  });

  // Both checks plant their own failure, for the reason `leak-check.mjs`
  // records: a scanner that has never caught anything is indistinguishable
  // from a scanner that cannot.
  const plantedWrites = [
    "await h.query('update derived_effort set asil = $1', [a]);",
    "await h.query('insert into extracted_facts values ($1)', [f]);",
    "await h.query('delete from document_chunks');",
    "await h.query('drop table document_chunks');",
    "await h.query('truncate table effort_totals');",
    "await h.query('alter table source_files add column x int');",
  ];
  const plantedReach = "const u = urlFor('vst_pmo');";
  const missed = plantedWrites.filter((w) => !WRITES.test(w));
  r[!missed.length && ESTATE.some((w) => plantedReach.includes(w)) ? 'ok' : 'fail'].push({
    label: 'both scans catch their own plant',
    detail: missed.length
      ? `a planted write went unnoticed: ${missed[0]}`
      : `${plantedWrites.length} write statements and a reach into the estate are each recognised in a synthetic line`,
  });

  /**
   * And the other direction, which is the one that broke.
   *
   * A guard is two claims — it fires on the thing, and it does NOT fire on
   * everything else. The second is never tested and is how a check ends up
   * being disabled by whoever it inconveniences.
   */
  const plantedInAnswer = "  await pool.query('insert into assess_history ...'); const u = urlFor('vst_alm');";
  r[
    WRITES.test(codeOnly(plantedInAnswer)) && ESTATE.some((w) => codeOnly(plantedInAnswer).includes(w))
      ? 'ok'
      : 'fail'
  ].push({
    label: 'stripping comments did not strip the teeth',
    detail: 'a line that both writes and resolves an estate connection is still recognised as code',
  });

  const innocent = [
    '// Drop this one, keep the rest.',
    '`Drop one only if it is clearly a different kind of work.`',
    '// the estate is dropped and recreated by db:reset, which is not on this path',
    '// alter the wording of the prompt, not the query',
    'const updated = rows.map(toRow); // update the view model, not a table',
  ];
  const falsePositives = innocent.filter((s) => WRITES.test(s));
  (falsePositives.length ? r.fail : r.ok).push({
    label: 'and does not fire on ordinary English',
    detail: falsePositives.length
      ? `flagged a comment as a write: ${falsePositives[0]}`
      : `${innocent.length} sentence(s) using drop, alter and update as verbs read clean`,
  });

  process.exit(report('sql:check', r));
}

main();
