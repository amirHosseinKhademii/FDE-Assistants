/**
 * One question, one answer — the seam the CLI and the desk route both use.
 *
 * ── WHY THIS EXISTS RATHER THAN BEING COPIED INTO THE ROUTE ───────────────
 *
 * The loop takes six arguments and five of them are a stage of this engagement
 * arriving: the engine, the provider switch, the model name, stage 4's tools,
 * stage 5's schema and its rules. A route that assembled them itself would
 * drift from the CLI the first time one changed — and the two would then be
 * answering with different systems while looking identical.
 *
 * `recordingTools` is NOT optional in that assembly. It deduplicates repeated
 * calls and it is what lets coherence rules 6 to 9 see what the tools returned.
 * Omit it and two of the contract's rules silently stop working, which is
 * exactly the kind of thing a copy-paste loses.
 */
import { ToolRegistry, chatClient, chatModelName, runLoop, engineLabel, type LoopChoice } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { SAFETY_TOOLS } from './tools';
import { SAFETY_SYSTEM_PROMPT } from './prompt';
import { recordingTools, validatorFor, type CallRecord } from './answer';
import { SafetyAnswerSchema, type SafetyAnswer } from '../schema/safety-answer';

export interface AskOptions {
  engine: LoopChoice;
  /** Milliseconds to wait after each model turn. A free tier needs this. */
  turnPaceMs?: number;
  /** Fired as each tool call begins, for a live trace. */
  onToolCall?: (name: string, args: unknown) => void;
}

export interface AskResult {
  answer: SafetyAnswer | null;
  /** Every tool call, in order, with `cached` set on repeats. */
  calls: CallRecord[];
  turns: number;
  engine: string;
  model: string;
  ms: number;
  /** Present when the contract rejected every attempt. Never a valid answer. */
  schemaErrors: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function askSafety(question: string, opts: AskOptions): Promise<AskResult> {
  const started = Date.now();
  const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');
  const { tools, calls } = recordingTools(SAFETY_TOOLS);

  const result = await runLoop<SafetyAnswer>(
    opts.engine,
    chatClient(() => openaiClient()),
    model,
    new ToolRegistry(tools),
    question,
    {
      system: SAFETY_SYSTEM_PROMPT,
      responseFormat: SafetyAnswerSchema,
      validate: validatorFor(calls),
      agentName: 'calder-safety',
      onEvent: opts.onToolCall
        ? (e: any) => {
            if (e.type === 'tool_call') opts.onToolCall!(e.name, e.args);
          }
        : undefined,
      ...(opts.turnPaceMs
        ? {
            onTurn: async () => {
              await sleep(opts.turnPaceMs!);
            },
          }
        : {}),
    },
  );

  return {
    answer: result.structured ?? null,
    calls,
    turns: result.turns.length,
    engine: engineLabel(opts.engine),
    model,
    ms: Date.now() - started,
    schemaErrors: result.schemaErrors,
  };
}
