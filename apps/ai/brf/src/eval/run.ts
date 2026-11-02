/**
 * pnpm eval: run the suite.
 *
 * The generic parts live in @fde/evals: argument parsing, case loading, filtering, the
 * repeat loop, the scorecard, the baseline rules and the telemetry lifecycle. What is
 * here is how one case runs against this assistant, and which tool it gets.
 *
 * The assistant has one tool and no recorded fixtures, so every run is live.
 */
import '../config/env';
import { resolve } from 'node:path';
import { runEvalCli, setResultsDir, type CaseOutcome } from '@fde/evals';
import { engineLabel, fixtureMode, loopChoice } from '@fde/agent';
import { askBrf, brfContext, closeBrfContext } from '../answer';
import { DOCS_ROOT } from '../config/paths';
import type { BrfAnswer } from '../schema/answer-schema';
import { resolveCheck } from './checks';
import { severityOf } from './severity';
import { startTelemetry, type Case } from './telemetry';

const RESULTS = resolve(DOCS_ROOT, 'brf/evals/results');
setResultsDir(RESULTS);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const engine = loopChoice(
    argv.includes('--loop') ? argv[argv.indexOf('--loop') + 1] : (process.env.LOOP ?? 'mastra'),
  );

  // Built before the first case. The model name for the scorecard comes from it, and
  // the store connection is kept out of the timing of the first case.
  const ctx = await brfContext();

  const lf = await startTelemetry();
  let datasetRun: string | undefined;

  const code = await runEvalCli<Case, BrfAnswer>({
    argv,
    casesPath: resolve(DOCS_ROOT, 'brf/evals/cases.jsonl'),
    resultsDir: RESULTS,
    severityOf,
    setup: {
      model: ctx.model,
      engine: engineLabel(engine),
      fixtures: fixtureMode(),
    },

    async onStartSuite(cases, repeat) {
      // A run that writes no baseline names no dataset run either, so the dashboard
      // never holds a run without a counterpart in git.
      const filtered = argv.includes('--only') || argv.includes('--tag');
      datasetRun = repeat > 1 && !filtered ? new Date().toISOString() : undefined;
      if (lf) {
        await lf.syncDataset(cases);
        console.log(
          `  langfuse: ${lf.baseUrl}  ` +
            (datasetRun ? `dataset run "${datasetRun}"` : 'traces only (no baseline)') +
            '\n',
        );
      }
    },

    // The trace wraps the run rather than replacing it. Langfuse observes, and the
    // runner still decides what happens.
    wrapRun: (c, run, fn) => (lf ? lf.traceRun(c, run, datasetRun, fn) : fn()),

    async onFinish() {
      await lf?.flush();
      await closeBrfContext();
    },

    async runCase(c, run): Promise<CaseOutcome<BrfAnswer>> {
      // The surface carries the case and run index, so a suite's cost can be summed
      // from the request log and eval traffic is never mistaken for a board's questions.
      const result = await askBrf({
        question: c.input,
        loop: engine,
        surface: `eval:${c.id}#${run}`,
      });

      const base = {
        id: c.id,
        run,
        // A tool that broke, as opposed to a tool the model invented. Treating them alike
        // would excuse the model for hallucinating a capability.
        toolFailed: result.turns.some((t) =>
          t.toolCalls.some((tc) => !tc.ok && tc.cause === 'threw'),
        ),
        missingFixture: result.turns.some((t) =>
          t.toolCalls.some((tc) => !tc.ok && /^No fixture for /.test(tc.error ?? '')),
        ),
        ms: result.ms,
        turns: result.turns.length,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        toolCalls: result.toolCalls,
        toolNames: result.turns.flatMap((t) => t.toolCalls.map((tc) => tc.name)),
        stoppedBecause: result.stoppedBecause,
      };

      // No valid answer means every check fails. That is reported once, as the cause,
      // because the failure is upstream of the checks. Five red lines would send the
      // reader to debug the wrong layer.
      if (!result.structured) {
        return {
          ...base,
          passed: false,
          checks: c.checks.map((name) => ({
            name,
            pass: false,
            detail: `no valid answer (${result.stoppedBecause})`,
          })),
          error: result.schemaErrors.join(' | ') || result.stoppedBecause,
        };
      }

      // The tool trace, flattened across turns and kept in order.
      const checkContext = {
        answer: result.structured,
        toolCalls: result.turns.flatMap((t) =>
          t.toolCalls.map((tc) => ({ name: tc.name, ok: tc.ok })),
        ),
      };
      const checks = c.checks.map((spec) => ({ name: spec, ...resolveCheck(spec)(checkContext) }));

      return { ...base, passed: checks.every((r) => r.pass), checks, answer: result.structured };
    },
  });

  process.exit(code);
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
