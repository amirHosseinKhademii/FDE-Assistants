/**
 * `pnpm steering:corpus-check` — the raw estate is as messy as it claims.
 *
 * ── WHY A CHECK ON MESS ───────────────────────────────────────────────────
 *
 * The corpus is 1,069 generated documents and its VALUE IS ITS DEFECTS. Every
 * planted inconsistency is a test case for an extractor that does not exist
 * yet. So they need the same protection as anything else: a tidy-up, a
 * refactor, or a well-meaning fix to a generator could quietly remove one, and
 * the first sign would be an extractor scoring suspiciously well.
 *
 * These assert the mess is still there. They are deliberately the opposite
 * shape from `db:check` — that one asserts the data is CONSISTENT; this one
 * asserts it is not.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { REPO_ROOT } from '../../config/connections';
import { ANCHORS } from '../seed/anchors';
import { report, type Result, type Note } from './assertions';

const DIR = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

function readAll(dir: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push({ path: relative(dir, full).split('\\').join('/'), content: readFileSync(full, 'utf8') });
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

function main(): void {
  const files = readAll(DIR);
  const ok: Note[] = [];
  const fail: Note[] = [];
  const note = (pass: boolean, label: string, detail: string): void => {
    (pass ? ok : fail).push({ label, detail });
  };
  const get = (p: string): string => files.find((f) => f.path === p)?.content ?? '';
  const all = files.map((f) => f.content).join('\n');
  const under = (p: string) => files.filter((f) => f.path.startsWith(p));

  note(files.length >= 1000,
    'the estate is the size the plan says',
    `${files.length} files, ${(files.reduce((a, f) => a + f.content.length, 0) / 1024 / 1024).toFixed(1)} MB, ` +
      `${new Set(files.map((f) => f.path.split('/')[0])).size} top-level directories`);

  // `under('eps-')` matches every repository path, so the first version of this
  // asserted it was ZERO and failed on a corpus containing 477 of them. The
  // check was reading its own helper backwards.
  note(under('requirements/').length > 150 && under('pmo/').length > 250 && under('eps-').length > 400,
    'all three halves of the raw estate are present',
    `requirements ${under('requirements/').length}, pmo ${under('pmo/').length}, ` +
      `code ${files.filter((f) => f.path.startsWith('eps-')).length}`);

  // ── requirement documents ────────────────────────────────────────────────

  const k2RevB = get(`requirements/${ANCHORS.program}/${ANCHORS.spec}_RevB.md`);
  note(/8000 N|8 kN|8\.0kN/.test(k2RevB) && /7500 N/.test(get(`requirements/${ANCHORS.program}/${ANCHORS.spec}_RevA.md`)),
    'the two spec revisions still disagree, in the documents',
    'Rev B carries the raised rack force and Rev A carries the old one — this is trap T1 at its source, ' +
      'before anything extracted it into a table');

  note(/2\.9 Nm/.test(k2RevB) && /restates §4\.3\.1/.test(k2RevB),
    'the K2 spec still contradicts itself',
    'one requirement stated twice with different numbers (2.7 and 2.9 Nm), with a note saying the ' +
      'customer never answered. An extractor taking the first hit gets one of them and reports no conflict.');

  const ragged = k2RevB.split('\n').filter((l) => l.startsWith('| |')).length;
  note(ragged > 0,
    'the revision bar still breaks the table on changed rows',
    `${ragged} row(s) carry a margin bar that adds a column — so the rows a fixed-width parser ` +
      `mis-reads are exactly the ones that CHANGED. Kept on purpose; see corpus-requirements.ts.`);

  const units = ['N', 'kN'].filter((u) => new RegExp(`\\d\\s?${u}\\b`).test(all));
  note(units.length === 2 && /\d\.\dkN/.test(all),
    'forces are still written three different ways',
    `both "N" and "kN" appear, including the no-space "8.0kN" form`);

  const matrices = under('requirements/').filter((f) => f.path.includes('trace-matrix'));
  const blanks = matrices.filter((f) => /\n[A-Z]+-[^,]+,,/.test(f.content));
  note(matrices.length > 20 && blanks.length > 0,
    'trace matrices still export unallocated requirements as blank rows',
    `${blanks.length} of ${matrices.length} matrices carry a requirement with no system requirement against it`);

  note(files.some((f) => f.path.startsWith('requirements/') && /TBD/.test(f.content)),
    'TBDs are still in the specifications',
    'some with an owner, some without — the ones without are the problem');

  // ── pmo documents ────────────────────────────────────────────────────────

  const closure = under('pmo/closure-reports/');
  const outlier = get(`pmo/closure-reports/${'EFF-2021-0443'}.md`);
  note(closure.length > 150 && /relocation/i.test(outlier),
    'the effort outlier is still explained in prose, not in a field',
    `${closure.length} closure reports; ${'EFF-2021-0443'} still says the hours absorbed a line relocation`);

  // Threshold lowered from 100 after it failed at 81. The regex only catches
  // three of the phrasings the generator uses and the generator deliberately
  // varies them — so the number this counts is "reports matching THESE THREE
  // sentences", not "reports carrying a classification". Widened, and the
  // threshold set from what the data actually contains rather than from a
  // guess made before it existed.
  const classified = closure.filter((f) =>
    /no change to the safety argument|safety case had to be|safety argument was produced|existing safety case remained|no safety impact/i.test(f.content));
  note(classified.length > 150,
    'the classification is still only in prose',
    `${classified.length} closure reports state whether a safety case was involved in a SENTENCE. ` +
      `vst_pmo has it as a boolean column — that column is the extraction, not the source.`);

  const timesheets = under('pmo/timesheets/');
  const formats = ['\nVST-1', '\nVST1', ',1'].filter((f) => timesheets.some((t) => t.content.includes(f)));
  note(timesheets.length > 20 && timesheets.length < 32,
    'some quarters were never exported',
    `${timesheets.length} quarterly timesheets out of 32 possible — the gaps are real, and an ` +
      `extractor assuming continuous coverage silently undercounts`);

  note(timesheets.some((t) => /closed code/i.test(t.content)),
    'hours are still booked against closed charge codes',
    'the journalled-late lines are present, flagged by a comment the way finance flags them');

  // ── the code base ────────────────────────────────────────────────────────

  const buildCfg = get('eps-steering-feel/cfg/build.json');
  const header = get('eps-steering-feel/src/damping.h');
  const misra = get('eps-steering-feel/reports/misra-damping.txt');
  const builtAt = (buildCfg.match(/"damping":\s*\{[^}]*"asil":\s*"([A-D])"/) ?? [])[1];
  note(builtAt === 'D' && /ASIL: B/.test(header) && /never put back/i.test(misra),
    'the safety level is still stated in three places that disagree',
    `safety assessment says B (prose), damping.h says B (comment), cfg/build.json builds at ${builtAt} ` +
      `(compile flag). MISRA deviation D-07 records why and says nobody has decided which governs.`);

  const srcs = files.filter((f) => /\/src\/.*\.c$/.test(f.path));
  const tests = files.filter((f) => /\/test\/test_.*\.c$/.test(f.path));
  note(srcs.length > 60 && tests.length > 60,
    'the code base is big enough for the question to be hard',
    `${srcs.length} source files and ${tests.length} test files across ` +
      `${new Set(srcs.map((f) => f.path.split('/')[0])).size} repositories — "do we already have a ` +
      `function that does X" is only a real question at this size`);

  process.exit(report('corpus-check', { ok, fail } as Result));
}

main();
