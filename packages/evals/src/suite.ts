/**
 * THE RUNNER — repeat, collect, bucket, write a baseline.
 *
 * Domain-neutral by construction: it never calls a model, never knows what a
 * case means, and never decides what a failure is worth. You give it cases and
 * a function that runs one; it gives you back an aggregate you can compare to
 * yesterday's.
 *
 * WHY REPEATS ARE NOT OPTIONAL. The same question does not produce the same
 * answer twice. Run each case once and you have a sample, not a measurement —
 * you could run the identical suite twice and get different scores with nothing
 * having changed. Two conclusions were drawn from n=2 on 2026-09-11 and both
 * were wrong; `repeat` exists so that cannot be the default experience.
 *
 * WHY A CASE THAT FAILS 1/5 IS DIFFERENT FROM ONE THAT FAILS 5/5. The first is
 * flakiness and the second is a bug, and they need different fixes. Reporting
 * only a pass rate loses that, so `flakyChecks` records WHICH check failed and
 * in how many runs.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CaseOutcome, CaseReport, Baseline } from './scorecard';

/** The minimum a case must have. Everything else is yours. */
export interface EvalCase {
  id: string;
  checks: string[];
  tags?: string[];
}

export interface RunSuiteOptions<C extends EvalCase, A> {
  cases: C[];
  /** How many times to run each case. One is a smoke test, not a measurement. */
  repeat: number;
  /**
   * Run ONE case once. Everything model-shaped lives in here — the loop, the
   * tools, the prompt. The harness only sees what comes back.
   */
  runCase(c: C, run: number): Promise<CaseOutcome<A>>;
  /** Called BEFORE each run, so a caller can print a progress line. */
  onStart?(c: C, run: number, repeat: number): void;
  /** Called after each run, with whatever came back. */
  onResult?(c: C, outcome: CaseOutcome<A>): void;
}

/** Group a flat list of outcomes into per-case aggregates. */
export function toReports<A>(outcomes: Array<CaseOutcome<A>>): Array<CaseReport<A>> {
  const byId = new Map<string, Array<CaseOutcome<A>>>();
  for (const o of outcomes) {
    const list = byId.get(o.id) ?? [];
    list.push(o);
    byId.set(o.id, list);
  }

  return [...byId.entries()].map(([id, runs]) => {
    const failed = new Map<string, number>();
    for (const r of runs) {
      for (const c of r.checks) {
        if (!c.pass) failed.set(c.name, (failed.get(c.name) ?? 0) + 1);
      }
    }
    return {
      id,
      runs,
      passed: runs.filter((r) => r.passed).length,
      total: runs.length,
      flakyChecks: [...failed.entries()]
        .map(([name, n]) => ({ name, failed: n }))
        .sort((a, b) => b.failed - a.failed),
    };
  });
}

/**
 * Run every case `repeat` times, in order.
 *
 * SEQUENTIAL ON PURPOSE. Parallel runs would be faster and would also make
 * latency numbers meaningless — p95 across concurrent calls measures your
 * concurrency limit, not the system.
 */
export async function runSuite<C extends EvalCase, A>(
  opts: RunSuiteOptions<C, A>,
): Promise<Array<CaseReport<A>>> {
  const outcomes: Array<CaseOutcome<A>> = [];

  for (const c of opts.cases) {
    for (let run = 1; run <= opts.repeat; run++) {
      opts.onStart?.(c, run, opts.repeat);

      // A THROW IS AN OUTCOME, not a crash. If one case blows up — a network
      // blip, a bad credential — the suite must still finish and report the
      // other thirty-nine. Aborting the run loses every result already paid
      // for, and the failure is recorded as `stoppedBecause: 'threw'` so it
      // lands in the infrastructure bucket rather than looking like a model
      // judgment failure.
      let outcome: CaseOutcome<A>;
      try {
        outcome = await opts.runCase(c, run);
      } catch (e) {
        outcome = {
          id: c.id,
          run,
          passed: false,
          missingFixture: false,
          ms: 0,
          turns: 0,
          inputTokens: 0,
          outputTokens: 0,
          toolCalls: 0,
          stoppedBecause: 'threw',
          checks: [],
          error: e instanceof Error ? e.message : String(e),
        };
      }

      outcomes.push(outcome);
      opts.onResult?.(c, outcome);
    }
  }

  return toReports(outcomes);
}

/**
 * Filter cases by id or tag.
 *
 * Exported because every runner needs it and every runner gets the empty case
 * wrong: a filter matching NOTHING must fail loudly, or you get a green suite
 * that ran zero cases.
 */
export function selectCases<C extends EvalCase>(
  cases: C[],
  filter: { only?: string; tag?: string },
): C[] {
  let out = cases;
  if (filter.only) {
    const ids = filter.only.split(',').map((s) => s.trim());
    out = out.filter((c) => ids.includes(c.id));
  }
  if (filter.tag) out = out.filter((c) => (c.tags ?? []).includes(filter.tag!));

  if (out.length === 0) {
    throw new Error(
      `No cases matched ${JSON.stringify(filter)}. A suite that runs zero cases ` +
        `reports success, which is the most misleading result available.`,
    );
  }
  return out;
}

/**
 * Write a baseline.
 *
 * **A FILTERED RUN MUST NOT WRITE ONE.** A baseline is the whole suite; one
 * taken over three cases would compare green against a full run and look like
 * an improvement. The caller decides — this just refuses to guess.
 */
export async function writeBaseline<A>(
  dir: string,
  baseline: Baseline<A>,
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const name = `baseline-${baseline.at.replace(/[:.]/g, '-')}.json`;
  const path = join(dir, name);
  await writeFile(path, JSON.stringify(baseline, null, 2));
  return path;
}
