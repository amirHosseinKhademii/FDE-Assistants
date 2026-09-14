/**
 * `pnpm eval` — run the release suite.
 *
 * Everything generic is `@fde/evals`: argument parsing, case loading, the
 * repeat loop, the scorecard, the baseline rules. What is here is the only part
 * that cannot transfer — **how to run one case of THIS system**, and which
 * tools it gets.
 *
 * ONE RUN IS A DEMONSTRATION, NOT A NUMBER. The runner repeats each case and
 * runs them serially on purpose. Five samples is the difference between "it
 * worked" and "it works four times in five", and those are different products.
 *
 * WHY `assess_release` IS FIXTURED AND `search_procedures` IS NOT. A fixture is
 * filed under a hash of its arguments. `assess_release` takes a lot id and a
 * market — two values, drawn from the case, identical on every repeat: a real
 * cache. `search_procedures` takes a natural-language query the model rewrites
 * every single time, so fixturing it produces one file per call and a hit rate
 * near zero. That is not a cache, it is a log that grows without bound. The
 * insurance side learned this at ~59 searches and 58 files.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../config/connections';

config({ path: resolve(REPO_ROOT, '.env'), quiet: true });

import {
  runEvalCli,
  setResultsDir,
  type CaseOutcome,
  type EvalCase,
} from '@fde/evals';
import {
  ToolRegistry,
  configureFixtures,
  fixtured,
  fixtureMode,
  loopChoice,
  engineLabel,
} from '@fde/agent';
import { env } from '@fde/foundry';
import { assessReleaseTool } from '../agent/tool/assess-release.tool';
import { searchProceduresTool } from '../agent/tool/search-procedures.tool';
import { askRelease, releaseContext, closeReleaseContext } from '../agent/loop/release-agent';
import type { ReleaseAnswer } from '../schema/release-schema';
import { resolveCheck } from './checks/checks';
import { severityOf } from './severity/severity';

/** A release case. `lot` and `market` are recorded for reading, not for dispatch. */
export interface Case extends EvalCase {
  lot: string;
  market: string;
  input: string;
  note?: string;
}

const EVALS = resolve(REPO_ROOT, 'docs', 'pharma', 'evals');
const RESULTS = resolve(EVALS, 'results');

setResultsDir(RESULTS);
// `@fde/agent` picks no path — a package that did would write files into
// somebody else's repo layout.
configureFixtures(resolve(EVALS, 'fixtures', 'tools'));

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const engine = loopChoice(argv.includes('--loop') ? argv[argv.indexOf('--loop') + 1] : undefined);

  // Built BEFORE the first case, for two reasons. It is the same context
  // `askRelease` uses, so every model call shares one set of connections. And
  // it is warmed outside the timed region: building it lazily inside the first
  // call would add six connection handshakes to run #1's `ms` and quietly move
  // every latency number.
  const { handle, store } = await releaseContext();

  const registry = new ToolRegistry([
    fixtured(assessReleaseTool(handle)),
    searchProceduresTool(store),
  ]);

  const code = await runEvalCli<Case, ReleaseAnswer>({
    argv,
    casesPath: resolve(EVALS, 'cases.jsonl'),
    resultsDir: RESULTS,
    severityOf,
    setup: {
      model: env.chatDeployment(),
      engine: engineLabel(engine),
      fixtures: fixtureMode(),
    },

    async onFinish() {
      await closeReleaseContext();
    },

    /** The whole application, entered the way a real question enters it. */
    async runCase(c, run): Promise<CaseOutcome<ReleaseAnswer>> {
      // `surface` carries the case and run index so eval traffic is never
      // mistaken for a real request. maxTurns is deliberately not set: the same
      // cap a real question gets, or the suite measures a path nobody takes.
      const result = await askRelease({
        question: c.input,
        loop: engine,
        surface: `eval:${c.id}#${run}`,
        registry,
      });

      const base = {
        id: c.id,
        run,
        // A tool that BROKE, not one the model invented. `dispatch` reports both
        // as `ok: false`; treating them alike would excuse the model for
        // hallucinating a capability.
        toolFailed: result.turns.some((t) => t.toolCalls.some((tc) => !tc.ok && tc.cause === 'threw')),
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
      // clear error rather than five confusing ones: the cause is upstream of
      // the checks, and five red lines send you debugging the wrong layer.
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
      // `calls_assess_first` is a claim about sequence, not about presence.
      const ctx = {
        answer: result.structured,
        toolCalls: result.turns.flatMap((t) => t.toolCalls.map((tc) => ({ name: tc.name, ok: tc.ok }))),
      };
      const checks = c.checks.map((spec) => ({ name: spec, ...resolveCheck(spec)(ctx) }));

      return { ...base, passed: checks.every((r) => r.pass), checks, answer: result.structured };
    },
  });

  process.exit(code);
}

main().catch(async (e) => {
  console.error('FAILED:', e?.message ?? e);
  await closeReleaseContext();
  process.exit(1);
});
