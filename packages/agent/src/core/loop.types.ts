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

/**
 * The local tag both chat engines fall back to, and the ONE place it is written.
 *
 * `qwen2.5:7b` RATHER THAN `qwen3:8b`, and the reason is measured rather than
 * preferred. Both pass `pnpm local:check` — strict `json_schema`, exact keys, a
 * nullable field respected, the `n === 5` negative control held, a tool call
 * with the right argument extracted. Then qwen3 has a THINKING phase, which it
 * runs before every tool call; `DEFAULT_MAX_TURNS` above turns that into
 * minutes per question. A model that passes every check and is too slow to use
 * is not the default.
 *
 * MUST MATCH `.env.example`. A default that disagrees with the file people copy
 * means the check passes against one model while the app runs another — the
 * failure `docs/beyond-retrieval/CONTEXT.md` §4 is about, and the reason this
 * is a shared constant and not two string literals in two engine folders.
 */
export const DEFAULT_LOCAL_MODEL = 'qwen2.5:7b';

/** Loopback, not `0.0.0.0`: "local only" is a property of the LISTENER. */
export const DEFAULT_LOCAL_BASE_URL = 'http://127.0.0.1:11434/v1';

/**
 * A THIRD-PARTY OpenAI-compatible endpoint — and it is a SEPARATE value from
 * `local` on purpose, not a tidier spelling of it.
 *
 * The two share a builder. They do not share a trust boundary, and that is the
 * whole reason the switch has four values rather than three:
 *
 *   local    loopback, no credential, nothing leaves the machine
 *   hosted   someone else's GPU, a real API key, and YOUR PROMPTS LEAVE
 *
 * Collapsing them would make `LLM_PROVIDER=local` able to mean "Google", which
 * is precisely the class of quiet untruth `sdk/provider.ts` throws to prevent
 * and `docs/steering/DATA-RESIDENCY.md` exists to answer. A variable whose
 * value no longer describes where the data went is worse than no variable.
 *
 * FREE TIERS TRAIN ON YOUR DATA unless you have checked otherwise. Harmless
 * here — `docs/examples/` is fabricated, see `docs/pharma/CORPUS.md` for the
 * same warning on the other engagement — and disqualifying at a real
 * engagement. `docs/beyond-retrieval/CREDENTIALS.md` is the longer argument.
 *
 * The default points at Gemini because its free tier serves the trifecta this
 * repo's contract needs on one endpoint: `/chat/completions`, tool calling, and
 * a strict `json_schema`. Any other compatible provider works by setting
 * `HOSTED_BASE_URL` — Groq, OpenRouter, Together, a colleague's vLLM.
 */
export const DEFAULT_HOSTED_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

/**
 * No default model, DELIBERATELY — unlike `local`, which has one.
 *
 * A local tag is a file you pulled: wrong means "not found", instantly. A
 * hosted model id is a product name on somebody's roadmap, and they get
 * retired. Baking one in means this constant silently becomes a 404 on a date
 * nobody chose, in a repo whose whole argument is that measurements must say
 * when they were taken. `HOSTED_MODEL` is required and unset throws by name.
 */
export const HOSTED_MODEL_ENV = 'HOSTED_MODEL';

/**
 * The key, and the refusal when it is missing.
 *
 * THROWS RATHER THAN SENDING A PLACEHOLDER. `buildLocalProvider` passes the
 * literal string `'local'` as its key because nothing authenticates it; doing
 * the same here would produce a 401 from a third party, which reads like a
 * broken account rather than an unset variable. Same reasoning as
 * `selectModel`'s throw: a refusal costs a run, a misleading error costs an
 * afternoon.
 */
export function hostedApiKey(): string {
  const key = process.env.HOSTED_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'LLM_PROVIDER="hosted" needs HOSTED_API_KEY. This provider reaches a THIRD PARTY — ' +
        'unlike "local", it carries a credential and your prompts leave this machine. ' +
        'Set HOSTED_API_KEY and HOSTED_MODEL, or use LLM_PROVIDER=local. Refusing to send ' +
        'a placeholder key that would fail as a 401 and read like a broken account.',
    );
  }
  return key;
}

/** The model id, required for the reason `HOSTED_MODEL_ENV` explains. */
export function hostedModel(): string {
  const m = process.env[HOSTED_MODEL_ENV]?.trim();
  if (!m) {
    throw new Error(
      `LLM_PROVIDER="hosted" needs ${HOSTED_MODEL_ENV} (e.g. "gemini-3.8-flash"). ` +
        'There is deliberately no default: a hosted model id is a product name that gets ' +
        'retired, and a baked-in one becomes a 404 on a date nobody chose.',
    );
  }
  return m;
}

/**
 * What the cost log should call the model that actually answered.
 *
 * WHY THIS EXISTS: the app logs `env.chatDeployment()` — the AZURE deployment
 * name — and the price table is keyed on it. Run the loop against Ollama and
 * three things were logged that are all false: the model was `gpt-5-mini`, the
 * cost was `$0.002448`, and the note cited a meter confirmed against an Azure
 * bill. MEASURED, not hypothesised: `logs/requests.jsonl` carries exactly those
 * lines from 2026-09-16, priced against a subscription that no longer exists.
 *
 * A wrong cost is worse than a missing one here for the same reason `price()`
 * refuses to invent a figure: this number is the one that ends up in a business
 * case, and it was overstating a free run.
 *
 * The `local/` prefix is load-bearing — `@fde/telemetry`'s `price()` keys the
 * zero off it, so a tag nobody has priced still logs a defensible number rather
 * than falling through to "no verified pricing".
 */
export function loggedModelName(configured: string): string {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (raw === 'local') return `local/${process.env.LOCAL_MODEL ?? DEFAULT_LOCAL_MODEL}`;
  // `hosted/`, and NOT the `local/` prefix that prices at zero. A free tier is
  // free *under a quota you are not measuring*, on a metered service that bills
  // the moment you cross it. `price()` has no entry for this prefix, so it logs
  // `costUsd: null` with a stated reason — "nobody checked", which is true.
  if (raw === 'hosted') return `hosted/${process.env[HOSTED_MODEL_ENV] ?? 'unset'}`;
  if (raw === 'bedrock') return process.env.BEDROCK_MODEL ?? DEFAULT_BEDROCK_MODEL;
  return configured;
}

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
