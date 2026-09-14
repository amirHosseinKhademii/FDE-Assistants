/**
 * The adapter: an OpenAI-shaped request in, an OpenAI-shaped response out, a
 * Bedrock call in the middle.
 *
 * WHY THIS EXISTS AT ALL. Every model call in this repo speaks the OpenAI wire
 * protocol — the Agents SDK via `setDefaultOpenAIClient`, Mastra and LangGraph
 * via `@ai-sdk/openai-compatible` pointed at a `baseURL`, and three call sites
 * that use `chat.completions.create` directly. Azure serves that protocol.
 * Bedrock does not: it speaks Anthropic's Messages API. So either every caller
 * changes, or one function translates. This is that function.
 *
 * WHAT THE TRANSLATION COSTS, because the interesting part of a port is what
 * does not survive it:
 *
 *   1. SYSTEM PROMPTS MOVE. OpenAI carries them as a message with
 *      `role: 'system'`; Anthropic has a separate top-level `system` field and
 *      no such role. Several system messages concatenate — which is a choice,
 *      not a law, and a caller relying on ordering between system and user
 *      turns would notice.
 *
 *   2. `max_tokens` IS REQUIRED HERE AND OPTIONAL THERE. OpenAI lets you omit
 *      it and serves a model default; Anthropic rejects the request. So a
 *      default is invented below, and an invented default is a behaviour
 *      change hiding in a type signature.
 *
 *   3. `json_schema` LOSES TWO FIELDS. OpenAI's `response_format.json_schema`
 *      carries `name` and `strict`; Anthropic's `JSONOutputFormat` is
 *      `{ type, schema }` and has neither. `strict: true` is the default
 *      behaviour rather than a flag, so nothing is lost in practice — but the
 *      `name` is simply dropped, and a caller reading it back would not find it.
 *
 *   4. `pause_turn` HAS NO OPENAI EQUIVALENT. Mapped through unchanged rather
 *      than flattened to `stop`, because a paused turn is resumable and a
 *      stopped one is not. Calling it `stop` would be a lie that reads fine.
 *
 * WHAT WE GET FOR FREE, and it is worth naming: `store: false` is a compliance
 * property `pnpm compliance:check` asserts on the Azure path, because the
 * OpenAI surface will keep conversation state server-side if you let it.
 * Bedrock's Messages API has no server-side conversation state to begin with,
 * so the property holds by construction instead of by assertion. The check
 * should still run — a property you stopped testing is a property you stopped
 * having — but it cannot fail here for the reason it could there.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { bedrockClient, env } from './client';

/** OpenAI omits it; Anthropic requires it. See note 2 above. */
const DEFAULT_MAX_TOKENS = 16_000;

type Role = 'system' | 'user' | 'assistant';
export interface ChatRequest {
  model?: string;
  messages: Array<{ role: Role; content: string }>;
  max_tokens?: number;
  response_format?: {
    type: 'json_schema';
    json_schema: { name?: string; strict?: boolean; schema: Record<string, unknown> };
  };
  /** Accepted and ignored — see the `store: false` note above. */
  store?: boolean;
}

export interface ChatResponse {
  choices: Array<{ message: { role: 'assistant'; content: string }; finish_reason: string }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    /** Absent when the provider reported nothing — never defaulted to 0. */
    prompt_tokens_details?: { cached_tokens: number };
  };
}

/**
 * Anthropic stop reasons → OpenAI finish reasons.
 *
 * `pause_turn` deliberately passes through unmapped; see note 4.
 * `model_context_window_exceeded` becomes `length` because that is what it is:
 * the output was cut short by a size limit.
 */
function finishReason(stop: Anthropic.StopReason | null): string {
  switch (stop) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
    case 'model_context_window_exceeded':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    case 'refusal':
      return 'content_filter';
    case 'pause_turn':
      return 'pause_turn';
    default:
      return 'unknown';
  }
}

/**
 * One OpenAI-shaped chat completion, served by Bedrock.
 *
 * Deliberately NOT a drop-in `OpenAI` client object. Presenting a fake client
 * would invite callers to use parts of the surface this does not implement —
 * streaming, tools, logprobs — and discover the gap at runtime. A named
 * function with a narrow type makes the supported surface the thing you can
 * see.
 */
export async function chatCompletion(
  req: ChatRequest,
  /**
   * Injection point, following `loop-mastra.ts`'s `overrides` pattern.
   *
   * NOT a convenience. 31 of this repo's 43 checks run with no network and no
   * credentials, which is why they get run. A translator that can only be
   * exercised by spending money at a live endpoint is a translator nobody
   * checks — so the seam that lets a self-test drive it offline is part of the
   * design rather than a testing afterthought.
   */
  overrides: { client?: Pick<ReturnType<typeof bedrockClient>, 'messages'> } = {},
): Promise<ChatResponse> {
  const system = req.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const messages = req.messages
    .filter((m): m is { role: 'user' | 'assistant'; content: string } => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await (overrides.client ?? bedrockClient()).messages.create({
    model: req.model ?? env.model(),
    max_tokens: req.max_tokens ?? DEFAULT_MAX_TOKENS,
    ...(system ? { system } : {}),
    messages,
    ...(req.response_format?.type === 'json_schema'
      ? { output_config: { format: { type: 'json_schema' as const, schema: req.response_format.json_schema.schema } } }
      : {}),
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // `cache_read_input_tokens` is `number | null`. A null becomes an ABSENT
  // field, not a zero — the same rule `logRequest` follows in steering, and for
  // the same reason: 0 claims a measurement, absence admits there was not one.
  const cached = res.usage.cache_read_input_tokens;

  return {
    choices: [{ message: { role: 'assistant', content: text }, finish_reason: finishReason(res.stop_reason) }],
    usage: {
      prompt_tokens: res.usage.input_tokens,
      completion_tokens: res.usage.output_tokens,
      ...(typeof cached === 'number' ? { prompt_tokens_details: { cached_tokens: cached } } : {}),
    },
  };
}
