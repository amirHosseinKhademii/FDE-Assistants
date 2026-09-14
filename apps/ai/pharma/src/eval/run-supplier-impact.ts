/**
 * `pnpm supplier-eval` — run the supplier-impact suite. Sibling of `run.ts`,
 * same generic harness (`@fde/evals`), different case file, different domain
 * checks and severity, different tools fixtured.
 *
 * WHY `assess_supplier_impact` IS FIXTURED AND `search_procedures` IS NOT —
 * same reasoning as `run.ts`: the first takes one value (a supplier id),
 * identical on every repeat, a real cache; the second takes a natural-language
 * query the model rewrites every call, so fixturing it produces one file per
 * call and a hit rate near zero.
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
import { assessSupplierImpactTool } from '../agent/tool/assess-supplier-impact.tool';
import { searchProceduresTool } from '../agent/tool/search-procedures.tool';
import {
  askSupplierImpact,
  supplierImpactContext,
  closeSupplierImpactContext,
  supplierIdInQuestion,
} from '../agent/loop/supplier-impact-agent';
import { askSupplierImpactFanout } from '../agent/loop/supplier-impact-fanout';
import type { SupplierImpactAnswer } from '../schema/supplier-impact-schema';
import { resolveSupplierCheck } from './checks/supplier-impact-checks';
import { severityOf } from './severity/supplier-impact-severity';

/** A supplier-impact case. `supplier` is recorded for reading, not for dispatch. */
export interface Case extends EvalCase {
  supplier: string;
  input: string;
  note?: string;
}

const EVALS = resolve(REPO_ROOT, 'docs', 'pharma', 'evals');
const RESULTS = resolve(EVALS, 'results');

setResultsDir(RESULTS);
// SEPARATE fixture directory from `run.ts`'s: the two tools this suite
// fixtures (`assess_supplier_impact`) take different argument shapes than
// release's, and sharing a directory would only ever coincidentally not
// collide.
configureFixtures(resolve(EVALS, 'fixtures', 'supplier-tools'));

/**
 * The fan-out, shaped like `askSupplierImpact`'s result so one `runCase` serves
 * both routes.
 *
 * TWO THINGS THE FAN-OUT DOES NOT HAVE, and faking either would make the
 * comparison lie:
 *
 *   `turns`      it has CALLS, not turns — 24 independent conversations rather
 *                than one of 3 turns. Reported as one synthetic turn carrying
 *                the tool names, so `calls_assess_first` still reads truthfully:
 *                the walk genuinely does run before any lot is judged.
 *   `structured` null when the assembler failed OR when the answer failed the
 *                contract, so a fan-out that produced rows but broke a safety
 *                rule scores as no answer, exactly as the single agent would.
 *
 * `--limit` is NOT passed. A sample cannot satisfy `rows_count:23`, and a suite
 * that quietly measured two lots would be the same lie of omission the
 * orchestrator already had to have fixed once.
 */
type AskShape = Awaited<ReturnType<typeof askSupplierImpact>>;

async function runFanoutCase(c: Case, run: number): Promise<AskShape> {
  const supplierId = supplierIdInQuestion(c.input);
  if (!supplierId) {
    // No id in the question — `sup-004`'s whole point. The fan-out has no
    // clarifying path, so it reports no answer rather than inventing a supplier.
    return {
      structured: null,
      schemaErrors: ['no supplier id in the question, and the fan-out cannot ask for one'],
      stoppedBecause: 'no_supplier_id',
      turns: [],
      ms: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0,
    } as unknown as AskShape;
  }

  const r = await askSupplierImpactFanout({
    supplierId,
    surface: `eval:${c.id}#${run}:fanout`,
  });

  return {
    structured: r.ok ? r.answer : null,
    schemaErrors: r.problems,
    stoppedBecause: r.ok ? 'model_finished' : 'partial',
    turns: [
      {
        turn: 1,
        ms: r.ms,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        toolCalls: [{ name: 'assess_supplier_impact', ok: true }],
      },
    ],
    ms: r.ms,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    toolCalls: r.calls,
  } as unknown as AskShape;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const engine = loopChoice(argv.includes('--loop') ? argv[argv.indexOf('--loop') + 1] : undefined);

  /**
   * `--fanout` — answer the SAME cases by the multi-agent route.
   *
   * ══ WHY THIS IS A FLAG AND NOT A SECOND SUITE ═════════════════════════════
   *
   * The fan-out produces the SAME `SupplierImpactAnswer` as `askSupplierImpact`,
   * so every check in `supplier-cases.jsonl` already scores it — `rows_count:23`,
   * `row_exposure:…`, `does_not_recall`, `citations_resolve`. Those checks do not
   * care HOW an answer was produced, and that is the whole reason the two routes
   * were made to share a schema.
   *
   * Writing a second set of cases would assert what somebody THINKS the fan-out
   * should do, rather than the criteria already agreed for this question. Same
   * argument that made `compliance:check` and `compliance:mastra` mirrors rather
   * than siblings.
   *
   * What this buys that three CLI runs did not: a REPEAT COUNT. The fan-out's
   * rows visibly differ between runs — one names the hospital holding the stock,
   * the next merely routes to the QP — and nothing has measured that. Five runs
   * turns an impression into a flaky-case number.
   *
   * COSTS MUCH MORE THAN THE SINGLE-AGENT SUITE. `sup-001` fans out over 23
   * lots, so one run is ~24 model calls against 3. Use `--repeat 3` or
   * `--only sup-001` unless the full number is wanted.
   *
   * REMEMBER: an engine change is a SETUP change. `eval:diff` refuses to compare
   * baselines across one, by design — the label below is what makes that refusal
   * fire rather than silently comparing two different systems.
   */
  const fanout = argv.includes('--fanout');

  // PRINTED BEFORE ANYTHING ELSE, because a flag that silently does nothing
  // produces a baseline that looks like the thing you asked for and is not.
  // That happened once: a `--fanout` run recorded `engine: agents-sdk` with
  // three turns and two tool calls — the single-agent shape — and only the
  // turn count gave it away.
  console.log(
    `\n  route: ${fanout ? 'FAN-OUT (one sub-agent per lot + assembler)' : 'single agent'}` +
      `   argv: ${JSON.stringify(argv)}\n`,
  );

  const { handle, store } = await supplierImpactContext();

  const registry = new ToolRegistry([
    fixtured(assessSupplierImpactTool(handle)),
    searchProceduresTool(store),
  ]);

  const code = await runEvalCli<Case, SupplierImpactAnswer>({
    argv,
    casesPath: resolve(EVALS, 'supplier-cases.jsonl'),
    resultsDir: RESULTS,
    severityOf,
    setup: {
      model: env.chatDeployment(),
      engine: fanout ? `${engineLabel(engine)}+fanout` : engineLabel(engine),
      fixtures: fixtureMode(),
    },

    async onFinish() {
      await closeSupplierImpactContext();
    },

    /** The whole application, entered the way a real question enters it. */
    async runCase(c, run): Promise<CaseOutcome<SupplierImpactAnswer>> {
      const result = fanout
        ? await runFanoutCase(c, run)
        : await askSupplierImpact({
            question: c.input,
            loop: engine,
            surface: `eval:${c.id}#${run}`,
            registry,
          });

      const base = {
        id: c.id,
        run,
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

      const ctx = {
        answer: result.structured,
        toolCalls: result.turns.flatMap((t) => t.toolCalls.map((tc) => ({ name: tc.name, ok: tc.ok }))),
      };
      const checks = c.checks.map((spec) => ({ name: spec, ...resolveSupplierCheck(spec)(ctx) }));

      return { ...base, passed: checks.every((r) => r.pass), checks, answer: result.structured };
    },
  });

  process.exit(code);
}

main().catch(async (e) => {
  console.error('FAILED:', e?.message ?? e);
  await closeSupplierImpactContext();
  process.exit(1);
});
