/**
 * One finished assessment in, a short plain brief out.
 *
 * ── THE SECOND-SMALLEST AGENT IN THE PACKAGE ─────────────────────────────
 *
 * One call, no tools, no retrieval, no database. `summariseBid` does this
 * across every filed assessment; this does it for the ONE on screen, which is
 * the thing a reader actually asks for — they are looking at a dossier that ran
 * to two screens and want to know what it means.
 *
 * ── IT GOES THROUGH `runLoop` FOR THE SAME REASON THE BID SUMMARY DOES ───
 *
 * No tools, so a plain chat completion would do — and then it would have its
 * own retry, its own schema handling and its own telemetry, none of which would
 * match the assessment's. An empty registry costs one line and keeps the
 * compliance properties `derived:compliance-check` asserts on the shared client.
 *
 * ── IT IS LOGGED UNDER ITS OWN SURFACE ───────────────────────────────────
 *
 * `steering:explain`. The claim is that explaining an assessment is a rounding
 * error against producing one, and two things sharing a surface label cannot be
 * compared afterwards.
 */
import { env, openaiClient } from '@fde/foundry';
import {
  ToolRegistry, runLoop, loopChoice, engineLabel, cachedInputTokensOf,
  type LoopChoice, type TurnRecord, chatClient, chatModelName } from '@fde/agent';
import { logRequest } from '@fde/telemetry';
import '../../telemetry/prices';
import type { RequirementAssessment } from '../../schema/assessment-schema';
import { ExplanationSchema, validateExplanation, type Explanation } from '../../schema/explanation-schema';
import { SYSTEM_PROMPT, userPrompt } from '../prompt/explain-assessment';

export interface ExplainOptions {
  assessment: RequirementAssessment;
  loop?: string;
  surface?: string;
}

export interface ExplainResult {
  explanation?: Explanation;
  schemaErrors: string[];
  stoppedBecause: string;
  engine: string;
  ms: number;
  turns: TurnRecord[];
}

/**
 * THREE, AND THE REASON IS THE BID SUMMARY'S, LEARNED THE EXPENSIVE WAY.
 *
 * There are no tools, so the only legitimate second turn is a schema retry. Two
 * would be "write it, fix it once" — and the bid summary's first real run used
 * both, leaving no room for a second repair. A cap has to leave room for the
 * conclusion.
 */
const MAX_TURNS = 3;

export async function explainAssessment(opts: ExplainOptions): Promise<ExplainResult> {
  const started = Date.now();
  const choice: LoopChoice = loopChoice(opts.loop);

  const result = await runLoop<Explanation>(
    choice,
    chatClient(() => openaiClient()),
    chatModelName(env.chatDeployment()),
    new ToolRegistry([]),
    userPrompt(opts.assessment),
    {
      system: SYSTEM_PROMPT,
      responseFormat: ExplanationSchema,
      validate: validateExplanation,
      agentName: 'explain-assessment',
      maxTurns: MAX_TURNS,
    },
  );

  const ms = Date.now() - started;

  const sum = (pick: (t: TurnRecord) => number | undefined): number =>
    result.turns.reduce((a, t) => a + (pick(t) ?? 0), 0);

  // Logged whether it validated or not: a run that failed its contract still
  // cost money, and logging only successes makes the bill look smaller than it
  // is while hiding the runs worth investigating.
  logRequest({
    subject: opts.assessment.requirement_ref,
    question: `explain ${opts.assessment.requirement_ref}`,
    model: chatModelName(env.chatDeployment()),
    engine: engineLabel(choice),
    turns: result.turns.length,
    toolCalls: 0,
    inputTokens: sum((t) => t.inputTokens),
    cachedInputTokens: cachedInputTokensOf(result.turns),
    outputTokens: sum((t) => t.outputTokens),
    ms,
    stoppedBecause: result.stoppedBecause,
    schemaRetries: result.schemaErrors.length,
    surface: opts.surface ?? 'steering:explain',
  });

  return {
    explanation: result.structured,
    schemaErrors: result.schemaErrors,
    stoppedBecause: result.stoppedBecause,
    engine: engineLabel(choice),
    ms,
    turns: result.turns,
  };
}
