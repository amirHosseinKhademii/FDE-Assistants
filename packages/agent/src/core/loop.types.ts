/**
 * The contract every agent loop implements.
 *
 * Extracted from the hand-rolled `loop.ts` when Pillar 2 moved to the OpenAI
 * Agents SDK. It lives in its own file precisely so the loop implementation is
 * replaceable: `ask.ts`, `eval/run.ts` and the checks all depend on these types
 * and on nothing about HOW the loop is driven.
 *
 * The hand-rolled implementation these came from is kept, unmaintained, at
 * `archive/pillar-2-handrolled/loop.ts`. It is the reference for what the
 * protocol looks like without a framework, and the thing to diff against when
 * the SDK does something surprising.
 */
import type { ZodType } from 'zod';
import type { ToolCallRecord } from './tool.types';

export interface ValidationResult<T = unknown> {
  ok: boolean;
  value?: T;
  errors?: string;
}

/**
 * One default, shared by `pnpm ask` and `pnpm eval`.
 *
 * Raised 8 -> 12 on 2026-09-05 (PROGRESS.md issue #2). `cov-002` — the rideshare
 * coverage-gap case — was observed finishing at 7 and 8 turns against a cap of
 * 8, so it was failing on the budget rather than on judgment. A turn cap that
 * bites is an infrastructure failure wearing a model failure's clothes.
 *
 * Unused headroom costs nothing: the loop stops as soon as the model answers.
 * It lives HERE and not at the call sites because `src/eval/run.ts` claims the
 * eval takes "exactly the path a genuine request takes" — two call sites with
 * two caps would make that comment false.
 */
export const DEFAULT_MAX_TURNS = 12;

/**
 * The Bedrock inference profile — `eu.` prefixed, NOT the bare model id.
 * Calling `anthropic.claude-haiku-4-5-…` in an EU region fails with
 * *"Invocation with on-demand throughput isn't supported"*, which reads like
 * missing model access and is not.
 *
 * HERE RATHER THAN IN AN ENGINE FOLDER because two engines reach Bedrock and
 * `sdk/`, `mastra/`, `langgraph/` must not import each other — the Mastra
 * module constructs an Azure credential and loads `@mastra/core` at import
 * time, so a LangGraph user who borrowed the constant from there would pay for
 * an engine they are not running. Same reason `DEFAULT_MAX_TURNS` lives here.
 */
export const DEFAULT_BEDROCK_MODEL = 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';

export interface LoopOptions {
  /** System prompt, sent as the first input item. */
  system?: string;
  /** Hard stop. Without it, a model that keeps re-searching runs forever.
   *  Defaults to DEFAULT_MAX_TURNS — override only to test the cap itself. */
  maxTurns?: number;
  /** Called after each completed model round-trip. Feeds telemetry. */
  onTurn?: (turn: TurnRecord) => void;
  /**
   * Fired as things happen, for a live trace.
   *
   * Distinct from onTurn, which only fires once a turn has COMPLETED. A search
   * takes a second or two; if you only learn about it afterwards you spend that
   * time staring at nothing. `tool_call` fires when dispatch begins.
   */
  onEvent?: (event: LoopEvent) => void;
  /**
   * When set, the final answer must satisfy this Zod schema, which the SDK
   * converts to a strict JSON Schema on the wire. Strict mode makes conformance
   * very likely but NOT guaranteed — refusals, truncation on max tokens, and
   * schemas the model cannot satisfy all still produce invalid output. Hence
   * `structuredRetries`.
   */
  responseFormat?: ZodType;
  /**
   * How to validate the final text.
   *
   * REQUIRED when `responseFormat` is set, and deliberately NOT defaulted: a
   * loop that shipped its own validator would be validating against a shape it
   * invented, and the answer contract is the most domain-specific thing in the
   * stack. See `@fde/schema`.
   */
  validate?: (raw: string) => ValidationResult;
  /**
   * How many times to hand a validation error back to the model. Default 1.
   *
   * We deliberately do NOT repair the JSON ourselves. Silent repair hides the
   * failure rate, and the failure rate is a number you need: it tells you
   * whether the schema is too hard, the prompt is unclear, or the model is
   * wrong for the job. All three have different fixes.
   */
  structuredRetries?: number;
  /** Reasoning effort for the gpt-5 family. The biggest latency lever there is. */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';

  /**
   * What to call the agent, on the wire and in traces. Purely a label.
   *
   * Defaulted rather than required because it changes no behaviour — but it is
   * an OPTION rather than a constant because a package that hard-coded one
   * customer's word for its agent would show up in every other customer's
   * traces.
   */
  agentName?: string;

  /**
   * One line describing a tool result, for `--trace` output.
   *
   * WHY THIS IS YOURS TO SUPPLY. A useful summary reads the tool's own result
   * shape — "record AUT-4471 (812 chars)" is only writable by something that
   * knows that tool returns a `record`. The default below handles the shapes
   * every retrieval system shares and then gives up honestly rather than
   * guessing; return `null` to fall through to it.
   */
  summariseResult?: (result: unknown) => string | null;
}

export type LoopEvent =
  | { type: 'turn_start'; turn: number }
  | { type: 'tool_call'; turn: number; name: string; args: unknown }
  | { type: 'tool_result'; turn: number; name: string; ok: boolean; ms: number; summary: string }
  | { type: 'schema_retry'; turn: number; error: string };

export interface TurnRecord {
  turn: number;
  ms: number;
  inputTokens: number;
  /**
   * How many of `inputTokens` the provider served from its prompt cache.
   *
   * A SUBSET of `inputTokens`. `@fde/telemetry`'s price formula subtracts it
   * rather than adding it — see the note on `RequestRecord.cachedInputTokens`.
   *
   * OPTIONAL, AND `undefined` IS LOAD-BEARING. Every one of the three engines
   * reports this in a different place and all three document the key as one
   * that "does not need to be present", so absence is a real state and not an
   * error. `undefined` means this engine did not say; `0` means it said none.
   * Defaulting the first to the second would make an engine that never reports
   * look like an engine on which caching never helps — a false finding about
   * exactly the thing three engines exist to compare.
   *
   * EXPECT ZERO ON TURN 1. Nothing has been sent yet, so there is nothing to
   * reuse. The cache bites from turn 2, when the system prompt and tool
   * schemas are re-sent unchanged. A single cold turn is not evidence either
   * way about whether this plumbing works.
   */
  cachedInputTokens?: number;
  outputTokens: number;
  toolCalls: ToolCallRecord[];
  text?: string;
}

export interface LoopResult<T = unknown> {
  text: string;
  turns: TurnRecord[];
  stoppedBecause: 'model_finished' | 'max_turns' | 'schema_invalid';
  /** Present only when responseFormat was set and validation passed. */
  structured?: T;
  /** Every validation failure seen, kept even when a later retry succeeded. */
  schemaErrors: string[];
}
