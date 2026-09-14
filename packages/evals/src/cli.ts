/**
 * THE EVAL CLI, minus everything domain-specific.
 *
 * Argument parsing, case loading, filtering, the repeat loop, the scorecard,
 * the baseline rules and the telemetry lifecycle are the same in every project.
 * What differs is one function: how to run a single case.
 *
 * TWO RULES ENFORCED HERE, both learned the hard way:
 *
 *   A SMOKE TEST IS NOT A MEASUREMENT. `--repeat 1` prints a warning and writes
 *   no baseline. The same question does not produce the same answer twice, so
 *   one sample is a sample.
 *
 *   A BASELINE MUST BE THE WHOLE SUITE. A filtered run (`--only`, `--tag`) is a
 *   debugging aid, and a one-case baseline in the history is actively harmful:
 *   `history` lists it beside full runs and `diff` picks it as "the previous
 *   baseline" and then refuses to compare, because a partial run is not
 *   comparable to anything.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  printScorecard,
  summarise,
  type Baseline,
  type CaseOutcome,
  type SeverityClassifier,
} from './scorecard';
import { runSuite, selectCases, writeBaseline, type EvalCase } from './suite';

/** Read a flag's value: `--repeat 5`. */
export function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

/** Load cases from a JSONL file — one object per line, blank lines ignored. */
export async function loadCases<C extends EvalCase>(path: string): Promise<C[]> {
  const raw = await readFile(path, 'utf8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as C);
}

export interface EvalCliOptions<C extends EvalCase, A> {
  argv: string[];
  casesPath: string;
  resultsDir: string;
  /** Run ONE case once. Everything model-shaped lives in here. */
  runCase(c: C, run: number): Promise<CaseOutcome<A>>;
  severityOf: SeverityClassifier<A>;
  /** Recorded in the baseline so a number always says what produced it. */
  setup: { model: string; engine: string; fixtures: string };
  /** Optional: called once with the selected cases, before the first run. */
  onStartSuite?(cases: C[], repeat: number): Promise<void> | void;
  /** Optional: wrap a single run, e.g. in a trace. */
  wrapRun?(c: C, run: number, fn: () => Promise<CaseOutcome<A>>): Promise<CaseOutcome<A>>;
  /** Optional: flush telemetry before exit. */
  onFinish?(baselineWritten: boolean, at: string): Promise<void> | void;
}

/**
 * Run the suite and report. Returns a process exit code.
 *
 * Non-zero when any run failed — so CI fails on a regression without anyone
 * parsing the output.
 */
export async function runEvalCli<C extends EvalCase, A>(
  opts: EvalCliOptions<C, A>,
): Promise<number> {
  const { argv } = opts;
  const repeat = Math.max(1, Number(flag(argv, '--repeat') ?? 5));
  const only = flag(argv, '--only');
  const tag = flag(argv, '--tag');

  const all = await loadCases<C>(opts.casesPath);
  const cases = selectCases(all, { only, tag });

  // Stamped at the START. It names the baseline file AND any dataset run, and
  // the two must be the same string or a dashboard trace cannot be tied back to
  // the JSON on disk.
  const at = new Date().toISOString();
  const filtered = Boolean(only || tag);
  const isBaseline = repeat > 1 && !filtered;

  await opts.onStartSuite?.(cases, repeat);

  console.log(
    `cases: ${cases.length} x ${repeat} run${repeat > 1 ? 's' : ''} = ${cases.length * repeat}   ` +
      `fixtures: ${opts.setup.fixtures}   model: ${opts.setup.model}   ` +
      `engine: ${opts.setup.engine}\n`,
  );
  if (repeat === 1) {
    console.log('  ! --repeat 1: this is a smoke test, not a measurement. Do not');
    console.log('    quote the resulting number as a pass rate.\n');
  }

  const reports = await runSuite<C, A>({
    cases,
    repeat,
    runCase: (c, n) =>
      opts.wrapRun ? opts.wrapRun(c, n, () => opts.runCase(c, n)) : opts.runCase(c, n),
    onStart: (c, n, of) => process.stdout.write(`  ${c.id} run ${n}/${of} … `),
    onResult: (_c, o) => {
      console.log(
        `${o.passed ? 'PASS' : 'FAIL'}  ${(o.ms / 1000).toFixed(1)}s  ` +
          `${o.turns} turns, ${o.toolCalls} tool calls`,
      );
      for (const r of o.checks) if (!r.pass) console.log(`      ✗ ${r.name}: ${r.detail}`);
      if (o.error) console.log(`      ! ${o.error}`);
    },
  });

  const record: Baseline<A> = { at, repeat, reports, ...opts.setup };

  await mkdir(opts.resultsDir, { recursive: true });
  await writeFile(resolve(opts.resultsDir, 'last-run.json'), JSON.stringify(record, null, 2));

  const summary = summarise(reports, opts.severityOf);
  printScorecard(reports, summary, repeat);

  if (isBaseline) {
    const path = await writeBaseline(opts.resultsDir, record);
    console.log(`  baseline   : ${path}`);
  } else if (repeat > 1 && filtered) {
    console.log('\n  ! --only/--tag: no baseline written. A baseline is the whole suite;');
    console.log('    a filtered run cannot be compared against one.');
  }

  console.log(`\n  full output: ${resolve(opts.resultsDir, 'last-run.json')}\n`);
  await opts.onFinish?.(isBaseline, at);

  return summary.passedRuns === summary.runs ? 0 : 1;
}
