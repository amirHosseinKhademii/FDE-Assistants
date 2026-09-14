/**
 * `pnpm steering:eval` — run the assessment cases and report.
 *
 * ── WHAT IT COSTS, SAID FIRST ────────────────────────────────────────────
 *
 * Three cases at five repeats is fifteen multi-turn loops. Each one searches,
 * prices and writes a structured answer. `--repeat 1` is a smoke test and is
 * NOT a scorecard number: a single sample cannot tell a flaky run from a
 * regression, and reporting one as the other is how a suite loses its meaning.
 *
 * ── REPEATS BECAUSE THE THING BEING MEASURED IS NOT DETERMINISTIC ────────
 *
 * `gpt-5-mini` takes no temperature parameter, so runs vary. Four consecutive
 * runs of `steering:assess` on one requirement made 4, 6, 7 and 8 searches and
 * two of them ended at the turn cap. A single sample of that is noise wearing a
 * verdict.
 */
import { resolve } from 'node:path';
import { runEvalCli, type EvalCase } from '@fde/evals';
import { env } from '@fde/foundry';
import { loopChoice, engineLabel } from '@fde/agent';
import { REPO_ROOT } from '../config/connections';
import { assessRequirement, closeAssessmentContext } from '../agent/loop/assess-requirement';
import { CHECKS } from './checks/assessment-checks';
import { severityOf, type Outcome } from './severity/assessment-severity';
// The same module the CLI and the worked example use. A second copy of this
// query existed for an hour and had already drifted — it learned to fetch the
// programme while this one did not, and only a type error caught it.
import { fetchRequirement } from '../answer/requirements';

interface AssessmentCase extends EvalCase {
  requirement: string;
  checks: string[];
}

const CASES = resolve(REPO_ROOT, 'docs', 'steering', 'evals', 'cases.jsonl');
const RESULTS = resolve(REPO_ROOT, 'docs', 'steering', 'evals', 'results');

/** One case, once. Everything model-shaped lives here. */
async function runCase(c: AssessmentCase, run: number): Promise<Outcome> {
  const started = Date.now();
  const req = await fetchRequirement(c.requirement);

  if (!req) {
    // An unknown requirement is a BROKEN CASE, not a model failure — and
    // labelling it `no_answer` keeps it out of the judgement buckets, where it
    // would otherwise look like the model declining to answer.
    return {
      id: c.id, run, passed: false, ms: Date.now() - started,
      inputTokens: 0, outputTokens: 0, toolCalls: 0, turns: 0,
      stoppedBecause: 'case_error', checks: [],
      // Nothing in this suite is fixtured yet, so this is always false rather
      // than optional — stated explicitly so that when fixtures arrive, the
      // compiler names every place that has to decide what it means.
      missingFixture: false,
      error: `${c.requirement} is not an in-force requirement`,
    };
  }

  const result = await assessRequirement({
    requirementRef: c.requirement,
    text: req.text,
    programme: req.programme,
    surface: 'steering:eval',
  });

  const toolNames = result.turns.flatMap((t) => (t.toolCalls ?? []).map((x) => x.name));
  const context = {
    answer: result.assessment,
    toolCalls: result.turns.flatMap((t) => t.toolCalls ?? []),
  };

  // No answer means no judgement to check. Reporting every check as failed
  // would put an infrastructure failure into the false-answer bucket.
  const checks = result.assessment
    ? c.checks.map((spec) => {
        const r = CHECKS.resolve(spec)(context as any);
        return { name: spec, pass: r.pass, detail: r.detail };
      })
    : [];

  return {
    id: c.id,
    run,
    passed: Boolean(result.assessment) && checks.every((r) => r.pass),
    ms: result.ms,
    inputTokens: result.turns.reduce((a, t) => a + (t.inputTokens ?? 0), 0),
    outputTokens: result.turns.reduce((a, t) => a + (t.outputTokens ?? 0), 0),
    toolCalls: toolNames.length,
    toolNames,
    turns: result.turns.length,
    stoppedBecause: result.stoppedBecause,
    checks,
    missingFixture: false,
    answer: result.assessment,
  };
}

/**
 * How long to wait between runs, so the deployment's tokens-per-minute budget
 * recovers.
 *
 * ── MEASURED, NOT GUESSED ───────────────────────────────────────────────
 *
 * The first full suite spent **918,288 input tokens across 9 successful runs** —
 * about 100,000 each, because a multi-turn loop re-sends its whole context every
 * turn. Fired back to back, that is roughly 300,000 tokens a minute, and six of
 * fifteen runs died on `429`.
 *
 * None of those six was a judgement failure. Every run that produced an answer
 * PASSED — 9 of 9. The suite was measuring the deployment, not the model, and a
 * suite that cannot tell you which is worthless in both directions.
 *
 * ── AND THEN THE REAL CAUSE TURNED OUT TO BE A SETTING ──────────────────
 *
 * Twenty seconds was the first guess and it was wrong by a factor of fifteen.
 * The deployment was provisioned at **capacity 20** — twenty THOUSAND tokens a
 * minute — against a subscription limit of 1,000. One run needs ~100k, so a
 * single assessment consumed FIVE MINUTES of budget and no pacing short of
 * that would have helped.
 *
 * The embedding deployment sat at 350 the whole time, which is why indexing
 * 529,000 tokens never hit a limit while one chat loop did. The asymmetry was
 * visible in `az cognitiveservices account deployment list` from the start and
 * nobody looked, including me — I wrote a pacing mechanism before reading the
 * number it was pacing against.
 *
 * Raised to 200 on 2026-09-13. Three seconds now, which is politeness rather
 * than a workaround. `EVAL_PACE_MS=0` disables it.
 *
 * THE LESSON IS NOT ABOUT QUOTAS. Two hours went into making the loop cheaper —
 * capping `k`, stopping the flailing, seeding the first search — and every one
 * of those was a real improvement. None of them was the reason it was failing.
 * Measure the limit before optimising against it.
 */
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 3_000);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const choice = loopChoice();
  const code = await runEvalCli<AssessmentCase, any>({
    argv: process.argv,
    casesPath: CASES,
    resultsDir: RESULTS,
    runCase,
    severityOf,
    /**
     * Paced AFTER each run, never before — so the first run starts immediately
     * and the wait is only ever paid between two calls that would otherwise
     * collide. The delay is outside the measured time: `ms` comes from the
     * loop's own clock, not from wall time here.
     */
    wrapRun: async (_c, _run, fn) => {
      const outcome = await fn();
      if (PACE_MS > 0) await sleep(PACE_MS);
      return outcome;
    },
    setup: {
      model: env.chatDeployment(),
      engine: engineLabel(choice),
      // Nothing is fixtured here yet. Recorded rather than omitted: a baseline
      // that does not say how it was produced cannot be compared to another.
      fixtures: 'live',
    },
    onFinish: closeAssessmentContext,
  });
  process.exit(code);
}

if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
