/**
 *   pnpm eval:diff                     compare the two newest baselines
 *   pnpm eval:diff <before> <after>    compare two named ones
 *
 * A path, a filename, or any unambiguous fragment of one:
 *   pnpm eval:diff baseline-2026-09-06T10-33-27-794Z.json baseline-2026-09-06T12-42-58-417Z.json
 *   pnpm eval:diff 10-33 12-42
 *
 * WHY THIS EXISTS. `pnpm eval` prints a scorecard and writes a baseline, and
 * every baseline since 2026-09-05 is committed. That is a history nobody could
 * read: comparing two runs meant opening two 100KB JSON files side by side, or
 * trusting a number someone typed into a markdown file weeks ago. This turns
 * the history that already exists on disk into the thing it was collected for —
 * an answer to "did that change help".
 *
 * It costs nothing and calls nothing. Both baselines are already on disk, so
 * this is arithmetic. That is the entire argument for having built it here
 * rather than adopting an eval platform: the platform's value was the diff view,
 * and the diff view is 200 lines over data we were already keeping.
 *
 * THE RULE THAT MATTERS MOST. A single run is not a measurement, and neither is
 * a single-run DIFFERENCE. PROGRESS.md §10.7 records a middle run that read as a
 * regression (28/35, two flaky cases) and turned out to be sampling noise — a
 * day spent investigating a coin flip. So a case that moves by one run out of
 * five is reported as MOVED, never as a regression, and the summary line says
 * which movements are large enough to act on. A tool that renders every wobble
 * in red re-creates exactly the mistake the `--repeat` discipline exists to
 * prevent.
 */
import {
  listBaselines,
  loadBaseline,
  summarise,
  type Baseline,
  type CaseOutcome,
  type CaseReport,
  type SeverityClassifier,
  type Summary,
} from './scorecard';

/**
 * A move of this many runs or fewer is inside the sampling band and is never
 * called a regression or an improvement. One run in five is a coin flip; the
 * repo has the scar to prove it (PROGRESS.md §10.7).
 *
 * Derived from the repeat count rather than hard-coded at 1, which is what it
 * was first written as. At `--repeat 5` the two are the same. At `--repeat 20`
 * a fixed 1 would call a 2-run move a REGRESSION while it is still comfortably
 * inside binomial noise — the band has to widen with the sample or raising
 * `--repeat` makes the tool more trigger-happy, which is backwards.
 */
function noiseBand(repeat: number): number {
  return Math.max(1, Math.round(repeat * 0.2));
}

function pct(n: number, d: number): string {
  return d === 0 ? '  -  ' : `${((n / d) * 100).toFixed(0).padStart(3)}%`;
}

function delta(n: number): string {
  return n === 0 ? '  ·  ' : n > 0 ? `  +${n}  ` : `  ${n}  `;
}

/** Buckets, printed as a movement rather than as two separate numbers. Counted
 *  in runs, so it is only comparable when both baselines used the same
 *  `--repeat`; `comparable()` refuses the diff otherwise. */
function bucketLine(label: string, a: number, b: number, total: number, worseIsUp: boolean): string {
  const d = b - a;
  const arrow = d === 0 ? '=' : d > 0 ? '▲' : '▼';
  const flag = d === 0 ? '' : (d > 0) === worseIsUp ? '  worse' : '  better';
  return `  ${label.padEnd(28)} ${String(a).padStart(3)} → ${String(b).padStart(3)} of ${total}  ${arrow}${flag}`;
}

/**
 * Two baselines are only comparable if they were produced the same way. A diff
 * across different models, engines, fixture modes or repeat counts is not a
 * measurement of a change — it is a measurement of the setup. This refuses
 * rather than warns, because a printed warning above a pretty table gets
 * scrolled past, and the resulting number gets quoted.
 */
function comparable<A>(a: Baseline<A>, b: Baseline<A>): string[] {
  const problems: string[] = [];
  const cmp = (field: string, x: unknown, y: unknown) => {
    if (x !== y) problems.push(`${field}: ${String(x)} → ${String(y)}`);
  };
  cmp('model', a.model, b.model);
  cmp('fixtures', a.fixtures, b.fixtures);
  cmp('repeat', a.repeat, b.repeat);
  // engine is absent in the two 2026-09-05 baselines, written before there was
  // more than one loop to name. Absent is not a mismatch; a DIFFERENT name is.
  if (a.engine && b.engine) cmp('engine', a.engine, b.engine);
  return problems;
}

function caseTable<A>(a: Baseline<A>, b: Baseline<A>, noise: number): { regressions: string[]; improvements: string[] } {
  const byId = (r: Array<CaseReport<A>>) => new Map(r.map((x) => [x.id, x]));
  const A = byId(a.reports);
  const B = byId(b.reports);
  const ids = [...new Set([...A.keys(), ...B.keys()])].sort();

  const regressions: string[] = [];
  const improvements: string[] = [];

  console.log('\n  PASS RATE BY CASE');
  console.log(`  ${'case'.padEnd(10)} ${'before'.padStart(7)} ${'after'.padStart(7)}  Δ      note`);
  for (const id of ids) {
    const x = A.get(id);
    const y = B.get(id);

    // A case added or removed between runs is a change to the SUITE, not to the
    // model. Silently showing it as 0/5 → 5/5 would read as a fix.
    if (!x) {
      console.log(`  ${id.padEnd(10)} ${'—'.padStart(7)} ${`${y!.passed}/${y!.total}`.padStart(7)}         NEW case — not a change in behaviour`);
      continue;
    }
    if (!y) {
      console.log(`  ${id.padEnd(10)} ${`${x.passed}/${x.total}`.padStart(7)} ${'—'.padStart(7)}         REMOVED from the suite`);
      continue;
    }

    const runsMoved = y.passed - x.passed;
    let note = '';
    if (runsMoved === 0) {
      note = x.passed === x.total ? 'green, held' : x.passed === 0 ? 'red, held' : 'flaky, held';
    } else if (Math.abs(runsMoved) <= noise) {
      note = `MOVED ${runsMoved > 0 ? 'up' : 'down'} ${Math.abs(runsMoved)} run — inside the noise band, not a result`;
    } else if (runsMoved < 0) {
      note = 'REGRESSION';
      regressions.push(`${id} ${x.passed}/${x.total} → ${y.passed}/${y.total}`);
    } else {
      note = 'IMPROVED';
      improvements.push(`${id} ${x.passed}/${x.total} → ${y.passed}/${y.total}`);
    }

    console.log(
      `  ${id.padEnd(10)} ${`${x.passed}/${x.total}`.padStart(7)} ${`${y.passed}/${y.total}`.padStart(7)} ` +
        `${delta(runsMoved)} ${note}`,
    );

    // Which CHECK moved is the diagnosis; the pass rate is only the symptom.
    const fa = new Map(x.flakyChecks.map((f: { name: string; failed: number }) => [f.name, f.failed]));
    const fb = new Map(y.flakyChecks.map((f: { name: string; failed: number }) => [f.name, f.failed]));
    for (const name of new Set([...fa.keys(), ...fb.keys()])) {
      const ca = fa.get(name) ?? 0;
      const cb = fb.get(name) ?? 0;
      if (ca !== cb) console.log(`  ${''.padEnd(10)} ${' '.repeat(16)}   ${name}: failed ${ca} → ${cb}`);
    }
  }
  return { regressions, improvements };
}

function severity(sa: Summary, sb: Summary): void {
  console.log('\n  SEVERITY (in runs, never averaged together)');
  console.log(bucketLine('false answers (dangerous)', sa.falseAnswers.length, sb.falseAnswers.length, sb.runs, true));
  console.log(bucketLine('over-caution (annoying)', sa.overCaution.length, sb.overCaution.length, sb.runs, true));
  console.log(bucketLine('no answer (infra/budget)', sa.noAnswer.length, sb.noAnswer.length, sb.runs, true));
  console.log(bucketLine('missing fixture (infra)', sa.missingFixture.length, sb.missingFixture.length, sb.runs, true));
  if (sa.uncategorised.length || sb.uncategorised.length) {
    console.log(bucketLine('UNCATEGORISED', sa.uncategorised.length, sb.uncategorised.length, sb.runs, true));
    console.log('      one of these baselines has failures matching no severity rule.');
    console.log('      Classify them before reading anything above.');
  }
}

/**
  * Compare two baselines and print the table. Exported rather than run on
  * import so the APP owns argument parsing and the results directory — a
  * package that reads `process.argv` cannot be embedded.
  */
export async function runDiff<A>(
  argv: string[],
  severityOf: SeverityClassifier<A>,
): Promise<number> {
  const args = argv.filter((a) => !a.startsWith('-'));
  let before: { path: string; baseline: Baseline<A> };
  let after: { path: string; baseline: Baseline<A> };

  if (args.length >= 2) {
    [before, after] = [await loadBaseline<A>(args[0]), await loadBaseline<A>(args[1])];
  } else {
    const all = await listBaselines<A>();
    if (all.length < 2) {
      console.error(`need two baselines to diff; found ${all.length} in evals/results/.`);
      console.error('run `pnpm eval` (repeat > 1) to write one.');
      return 1;
    }
    // One argument means "compare the newest against this one".
    after = all[all.length - 1];
    before = args.length === 1 ? await loadBaseline<A>(args[0]) : all[all.length - 2];
  }

  const a = before.baseline;
  const b = after.baseline;

  console.log(`\n  before : ${before.path.split('/').pop()}  ${a.at}`);
  console.log(`  after  : ${after.path.split('/').pop()}  ${b.at}`);
  console.log(
    `  setup  : model ${b.model}   engine ${b.engine ?? 'unrecorded'}   ` +
      `fixtures ${b.fixtures}   repeat ${b.repeat}`,
  );

  const problems = comparable(a, b);
  if (problems.length) {
    console.error('\n  NOT COMPARABLE — the setup changed between these two runs:');
    for (const p of problems) console.error(`    ${p}`);
    console.error('\n  A difference here measures the setup, not the change you made.');
    console.error('  Re-run the older configuration, or diff against a baseline that matches.');
    return 2;
  }

  const sa = summarise<A>(a.reports, severityOf);
  const sb = summarise<A>(b.reports, severityOf);

  const noise = noiseBand(b.repeat);
  const { regressions, improvements } = caseTable(a, b, noise);
  severity(sa, sb);

  console.log('\n  TOTALS');
  console.log(`  runs passed                  ${sa.passedRuns}/${sa.runs} (${pct(sa.passedRuns, sa.runs)}) → ${sb.passedRuns}/${sb.runs} (${pct(sb.passedRuns, sb.runs)})`);
  console.log(`  cases green (N/N)            ${sa.green}/${sa.cases} → ${sb.green}/${sb.cases}`);
  console.log(`  cases flaky                  ${sa.flaky.length} → ${sb.flaky.length}`);
  console.log(`  p95 latency                  ${(sa.p95 / 1000).toFixed(1)}s → ${(sb.p95 / 1000).toFixed(1)}s`);
  console.log(`  tokens in/out                ${sa.inputTokens}/${sa.outputTokens} → ${sb.inputTokens}/${sb.outputTokens}`);

  console.log('\n  VERDICT');
  if (!regressions.length && !improvements.length) {
    console.log('  No case moved by more than the noise band. On this evidence the change');
    console.log('  is NEUTRAL — which for a refactor is the result you want, and for a fix');
    console.log('  means it did not work.');
  } else {
    for (const r of regressions) console.log(`  REGRESSION  ${r}`);
    for (const i of improvements) console.log(`  IMPROVED    ${i}`);
  }
  if (sb.falseAnswers.length > sa.falseAnswers.length) {
    console.log('  ! False answers went UP. That bucket outranks the pass rate: a suite that');
    console.log('    gains a run and gains a false answer has got worse, not better.');
  }
  console.log(
    `\n  Read with care: ${b.repeat} runs per case, so a move of ${noise} run` +
      `${noise === 1 ? '' : 's'} or fewer is\n  treated as sampling noise — raise --repeat before acting on a small\n  difference.\n`,
  );

  // Non-zero on a real regression so this can gate a CI job. Noise-band moves
  // deliberately do NOT fail: a check that goes red on sampling variance gets
  // muted within a week, and then it is not a check at all.
  //
  // The false-answer bucket is held to the SAME band, which took a negative
  // control to get right. The first version failed the build on any increase at
  // all, on the reasoning that the dangerous bucket outranks the pass rate. It
  // does — but one run in thirty-five is the same coin flip whichever bucket it
  // lands in, and a gate that fires on a coin flip is a gate that gets muted.
  // So: the warning above prints on any increase, because a human should look;
  // the exit code turns over only once the move is bigger than sampling.
  const falseAnswerJump = sb.falseAnswers.length - sa.falseAnswers.length;
  if (regressions.length || falseAnswerJump > noise) process.exitCode = 1;

  return 0;
}
