/**
 *   pnpm eval:history        every baseline on disk, oldest first, one row each
 *
 * The progression IS the deliverable. PROGRESS.md §8.5 argues the table of
 * "what the score was before and after each change" is worth more than the app,
 * and until now that table was maintained by hand in markdown — which means it
 * was a claim, not a record. This reads the baselines themselves, so it cannot
 * disagree with the evidence.
 *
 * Rows are NOT all comparable with each other: the model, engine, fixture mode
 * or repeat count differ across the history, and the setup columns are printed
 * precisely so a reader can see when two rows are measuring different things.
 * `pnpm eval:diff` refuses a mismatched pair outright; this view shows
 * everything and marks the boundaries.
 */
import { listBaselines, summarise, type SeverityClassifier } from './scorecard';

export async function runHistory<A>(severityOf: SeverityClassifier<A>): Promise<void> {
  const all = await listBaselines<A>();
  if (!all.length) {
    console.error('no baselines in evals/results/. run `pnpm eval` (repeat > 1).');
    process.exit(1);
  }

  console.log(
    `\n  ${'when'.padEnd(17)} ${'engine'.padEnd(11)} ${'fixt'.padEnd(6)} ${'×'.padEnd(3)} ` +
      `${'runs'.padStart(7)} ${'green'.padStart(6)} ${'flaky'.padStart(5)} ${'false'.padStart(5)} ${'p95'.padStart(7)}`,
  );
  console.log(`  ${'─'.repeat(80)}`);

  let prevSetup = '';
  for (const { baseline } of all) {
    const s = summarise(baseline.reports, severityOf);
    const setup = `${baseline.model}|${baseline.engine ?? '?'}|${baseline.fixtures}|${baseline.repeat}`;
    if (prevSetup && setup !== prevSetup) {
      console.log(`  ${'·'.repeat(28)} setup changed — rows above and below are not directly comparable`);
    }
    prevSetup = setup;

    console.log(
      `  ${baseline.at.slice(0, 16).replace('T', ' ').padEnd(17)} ` +
        `${(baseline.engine ?? 'unrecorded').padEnd(11)} ${baseline.fixtures.padEnd(6)} ${String(baseline.repeat).padEnd(3)} ` +
        `${`${s.passedRuns}/${s.runs}`.padStart(7)} ${`${s.green}/${s.cases}`.padStart(6)} ` +
        `${String(s.flaky.length).padStart(5)} ${String(s.falseAnswers.length).padStart(5)} ` +
        `${`${(s.p95 / 1000).toFixed(1)}s`.padStart(7)}`,
    );
  }

  console.log(
    `\n  ${all.length} baselines.  false = runs in the dangerous bucket, which outranks\n` +
      '  the pass rate. A row that gains passed runs and gains a false answer got worse.\n' +
      '  `pnpm eval:diff <before> <after>` for the per-case story between any two.\n',
  );
}

