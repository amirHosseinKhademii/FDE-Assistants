/**
 * Many finished assessments in, one page out.
 *
 * ── THE SMALLEST AGENT IN THE PACKAGE, AND THAT IS THE POINT ─────────────
 *
 * One call, no tools, no retrieval, no database of its own. Everything it is
 * allowed to know arrives in the prompt, and everything countable was counted
 * before it was called. `docs/steering/NEXT.md` §4 asked for the `compress`
 * verb and this is what compress buys: a second agent whose whole context is
 * twenty lines instead of twenty dossiers.
 *
 * ── WHY IT STILL GOES THROUGH `runLoop` ──────────────────────────────────
 *
 * It has no tools, so a plain chat completion would do — and then it would have
 * its own retry, its own schema handling, its own turn record and its own
 * telemetry, none of which would match the assessment's. An empty registry
 * costs one line and keeps the compliance properties (`store: false`, no
 * server-side state, Entra auth) that `derived:compliance-check` asserts on the
 * shared client. Pharma's debate loop made the same call for the same reason.
 *
 * ── COST IS LOGGED SEPARATELY, AND UNDER ITS OWN SURFACE ─────────────────
 *
 * `steering:summarise`, not `steering:assess`. The claim this agent makes is
 * that summarising a requirement is far cheaper than assessing one, and two
 * things sharing a surface label cannot be compared afterwards.
 */
import { env, openaiClient } from '@fde/foundry';
import { ToolRegistry, runLoop, loopChoice, engineLabel, cachedInputTokensOf, type LoopChoice, type TurnRecord } from '@fde/agent';
import { logRequest } from '@fde/telemetry';
import '../../telemetry/prices';
import type { FiledAssessment } from '../../answer/filed-assessments';
import { BidSummarySchema, bidSummaryValidator, type BidSummary } from '../../schema/bid-summary-schema';
import { SYSTEM_PROMPT, userPrompt } from '../prompt/summarise-bid';
import { toLines, lineCost } from '../summary/lines';
import type { RollUp } from '../summary/roll-up';

export interface SummariseOptions {
  rollUp: RollUp;
  filed: FiledAssessment[];
  loop?: string;
  surface?: string;
}

export interface SummariseResult {
  summary?: BidSummary;
  schemaErrors: string[];
  stoppedBecause: string;
  engine: string;
  ms: number;
  turns: TurnRecord[];
  /** Characters of dossier against characters of line — the compression claim. */
  compression: { dossiers: number; lines: number };
}

/**
 * THREE TURNS, not twelve — and not two, which is what it was.
 *
 * There are no tools to call, so the only legitimate reason for another turn is
 * a schema retry. Two said that plainly: write the page, fix it once.
 *
 * ── WHY TWO WAS WRONG, FOUND ON THE FIRST REAL RUN ──────────────────────
 *
 * That run used both. It failed its contract once, repaired it, and returned a
 * good page — with the cap exactly consumed. A second retry, from any cause,
 * would have ended a paid run with no output at all.
 *
 * A cap has to leave room for the conclusion. The assessment loop learned the
 * same lesson three times over and its header is a record of it: eight stopped
 * the flailing and then stopped the ANSWER. One spare turn is not generosity,
 * it is the difference between a repaired answer and a bill for nothing.
 */
const MAX_TURNS = 3;

export async function summariseBid(opts: SummariseOptions): Promise<SummariseResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);
  const client = openaiClient();
  const lines = toLines(opts.filed);

  const result = await runLoop<BidSummary>(
    choice,
    client,
    env.chatDeployment(),
    new ToolRegistry([]),
    userPrompt(opts.rollUp, lines),
    {
      system: SYSTEM_PROMPT,
      responseFormat: BidSummarySchema,
      validate: bidSummaryValidator(opts.rollUp),
      agentName: 'summarise-bid',
      maxTurns: MAX_TURNS,
    },
  );

  const ms = Date.now() - started;
  logSummary(opts, result, choice, ms);

  return {
    summary: result.structured,
    schemaErrors: result.schemaErrors,
    stoppedBecause: result.stoppedBecause,
    engine: engineLabel(choice),
    ms,
    turns: result.turns,
    compression: lineCost(opts.filed),
  };
}

/**
 * Logged whether it validated or not — a failed summary still cost tokens, and
 * the same rule the assessment loop states applies here for the same reason.
 *
 * `subject` is the number of requirements summarised, because the measurement
 * this agent exists to support is cost PER SUMMARISED REQUIREMENT, and a log
 * line that does not say how many it covered cannot produce it.
 */
function logSummary(
  opts: SummariseOptions,
  result: { turns: TurnRecord[]; stoppedBecause: string; schemaErrors: string[] },
  choice: LoopChoice,
  ms: number,
): void {
  const sum = (pick: (t: TurnRecord) => number | undefined): number =>
    result.turns.reduce((a, t) => a + (pick(t) ?? 0), 0);

  logRequest({
    subject: `${opts.filed.length} assessment(s)`,
    question: 'summarise the bid',
    model: env.chatDeployment(),
    engine: engineLabel(choice),
    turns: result.turns.length,
    toolCalls: 0,
    inputTokens: sum((t) => t.inputTokens),
    cachedInputTokens: cachedInputTokensOf(result.turns),
    outputTokens: sum((t) => t.outputTokens),
    ms,
    stoppedBecause: result.stoppedBecause,
    schemaRetries: result.schemaErrors.length,
    surface: opts.surface ?? 'steering:summarise',
  });
}
