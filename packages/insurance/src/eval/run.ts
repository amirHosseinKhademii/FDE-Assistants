/**
 * `pnpm eval` — run the suite.
 *
 * Everything generic lives in `@fde/evals`: argument parsing, case loading,
 * filtering, the repeat loop, the scorecard, the baseline rules, the telemetry
 * lifecycle. What is here is the only part that cannot transfer — **how to run
 * one case of THIS system**, and which tools it gets.
 *
 * Why that is the right seam: an eval harness that knew how to call this
 * application would be unusable for the next one, and an application that
 * re-implemented repeat-and-bucket would get the baseline rules subtly wrong.
 * The two failures that produced those rules are recorded in the package.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DOCS_ROOT, REPO_ROOT } from '../config/paths';

config({ path: resolve(REPO_ROOT, '.env') });

import { runEvalCli, setResultsDir, type CaseOutcome } from '@fde/evals';
import { configureFixtures } from '@fde/agent';
import { env } from '../foundry/client';
import { ToolRegistry } from '@fde/agent';
import { getPolicyholderTool } from '../tools/get-policyholder.tool';
import { searchPolicyTool } from '../tools/search-policy.tool';
import { searchGuidanceTool } from '../tools/search-guidance.tool';
import { fixtured, fixtureMode } from '@fde/agent';
import { askCoverage, coverageContext, closeCoverageContext } from '../coverage';
import { loopChoice, engineLabel } from '@fde/agent';
import type { CoverageAnswer } from '../schema/coverage-schema';
import { resolveCheck } from './checks';
import { severityOf } from './severity';
import { startTelemetry, type Case } from './telemetry';

const RESULTS = resolve(DOCS_ROOT, 'evals/results');
setResultsDir(RESULTS);
// Where recorded tool responses live. `@fde/agent` picks no path — a package
// that did would write files into somebody else's repo layout.
configureFixtures(resolve(DOCS_ROOT, 'evals/fixtures/tools'));

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const engine = loopChoice(argv.includes('--loop') ? argv[argv.indexOf('--loop') + 1] : undefined);

  // Built BEFORE the first case, for two reasons. It is the same context
  // `askCoverage` uses, so every model call shares one Postgres pool. And it is
  // warmed outside the timed region: building it lazily inside the first call
  // would add the connection handshake to run #1's `ms` and quietly move p95.
  const { store } = await coverageContext();

  // ONLY get_policyholder is fixtured. Search deliberately is not: a fixture is
  // filed under a hash of its arguments, and the model rewrites its search
  // query every single time — ~59 searches produced 58 new files, a hit rate of
  // roughly zero. That is not a cache, it is a log that grows without bound,
  // and it cannot hold retrieval still when the query never repeats.
  const registry = new ToolRegistry([
    fixtured(getPolicyholderTool()),
    searchPolicyTool(store),
    searchGuidanceTool(store),
  ]);

  const lf = await startTelemetry();
  let datasetRun: string | undefined;

  const code = await runEvalCli<Case, CoverageAnswer>({
    argv,
    casesPath: resolve(DOCS_ROOT, 'evals/cases.jsonl'),
    resultsDir: RESULTS,
    severityOf,
    setup: {
      model: env.chatDeployment(),
      engine: engineLabel(engine),
      fixtures: fixtureMode(),
    },

    async onStartSuite(cases, repeat) {
      // A dataset run follows the baseline rule exactly: a run that writes no
      // baseline names no dataset run either, or the dashboard grows runs with
      // no counterpart in git.
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

    // The trace WRAPS the run rather than replacing it: Langfuse observes, the
    // runner still decides what happens.
    wrapRun: (c, run, fn) => (lf ? lf.traceRun(c, run, datasetRun, fn) : fn()),

    async onFinish() {
      await lf?.flush();
      await closeCoverageContext();
    },

    /** The whole application, entered the way a customer's question enters it. */
    async runCase(c, run): Promise<CaseOutcome<CoverageAnswer>> {
      // `surface` carries the case and run index so a suite's cost can be summed
      // straight out of the request log — and so eval traffic is never mistaken
      // for customer traffic. Logging stays ON here for that reason.
      //
      // maxTurns is deliberately not set: the default cap, the same one a real
      // request gets. Two caps would make that claim false.
      const result = await askCoverage({
        question: c.input,
        policyId: c.policy,
        loop: engine,
        surface: `eval:${c.id}#${run}`,
        registry,
      });

      const base = {
        id: c.id,
        run,
        // A tool that BROKE — not a tool the model invented. `dispatch` reports
        // both as `ok: false`, and treating them alike would excuse the model
        // for hallucinating a capability: one bad call in an eleven-call run
        // would move the whole run out of the dangerous bucket. `cause` is the
        // discriminator, and it is set where the distinction is actually known.
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

      // No valid structured answer means every check fails. Reported as ONE
      // clear error rather than five confusing ones — the cause is upstream of
      // the checks, and listing five red lines sends you debugging the wrong
      // layer.
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

      // The tool trace, flattened across turns and kept IN ORDER —
      // `calls_record_first` is a claim about sequence, not about presence.
      const ctx = {
        answer: result.structured,
        toolCalls: result.turns.flatMap((t) =>
          t.toolCalls.map((tc) => ({ name: tc.name, ok: tc.ok })),
        ),
      };
      const checks = c.checks.map((spec) => ({ name: spec, ...resolveCheck(spec)(ctx) }));

      return { ...base, passed: checks.every((r) => r.pass), checks, answer: result.structured };
    },
  });

  process.exit(code);
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
