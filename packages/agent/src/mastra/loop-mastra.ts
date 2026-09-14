/**
 * The second agent loop, on Mastra. Same contract as `loop-sdk.ts`.
 *
 * WHY TWO LOOPS AT ALL. `loop.types.ts` has always claimed the engine is
 * replaceable — `ask.ts`, `eval/run.ts` and every check depend on `LoopOptions`
 * and `LoopResult` and on nothing about how the loop is driven. That claim was
 * true once, when the hand-rolled loop was swapped for the Agents SDK, and then
 * untested for months. A second live implementation keeps it honest, and gives
 * the eval suite something to compare an engine against rather than a prompt.
 *
 * WHAT IS DELIBERATELY SHARED, so a diff between engines means something:
 * `registry.ts` (the tools and their audit records), `coverage-prompt.ts` (the
 * ordered procedure), the Zod schema, DEFAULT_MAX_TURNS, and the coherence
 * re-check below. If any of those had to change, the contract was not one.
 *
 * THREE THINGS THIS FILE HAD TO GET RIGHT, each found by spike rather than docs
 * (see NEXT.md A1):
 *
 *   1. `execute` is (inputData, context) — args FIRST and positional. The
 *      `({ context })` shape from older Mastra silently yields undefined args,
 *      and the model then loops retrying against garbage. It reads like a model
 *      failure and is an API-version failure.
 *
 *   2. `structuredOutput: { schema }` is the current option. `experimental_output`
 *      belongs to the legacy options type, which is where Mastra's own "does not
 *      work with tools" comment lives — misleading if read in isolation.
 *
 *   3. `supportsStructuredOutputs: true` MUST be set on the provider. Without it
 *      the AI SDK sends `response_format: { type: 'json_object' }` — some JSON,
 *      not this shape — and Foundry rejects it with "'messages' must contain the
 *      word 'json'". The obvious fix is to put "json" in the prompt, which makes
 *      the error disappear having quietly downgraded Pillar 3 from a strict
 *      schema to best-effort JSON. Same class as the Agents SDK's `store: true`:
 *      a default that weakens a guarantee invisibly.
 *
 * PROVIDER CHOICE: `@ai-sdk/openai-compatible`, not `@ai-sdk/azure`. The Azure
 * provider builds the classic `/openai/deployments/{name}?api-version=` path and
 * our endpoint is the Foundry `/openai/v1` surface — the same mismatch that ruled
 * out the `AzureOpenAI` class in `foundry/client.ts`.
 */
import type OpenAI from 'openai';
import { getBearerTokenProvider, DefaultAzureCredential } from '@azure/identity';
import { FOUNDRY_SCOPE, env } from '@fde/foundry';
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { summariseResult } from '../core/summarise';
import {
  DEFAULT_MAX_TURNS,
  type LoopOptions,
  type LoopResult,
  type TurnRecord,
  type ValidationResult,
} from '../core/loop.types';

// require(), not import: @mastra/core is dual-published but `ai` and
// @ai-sdk/openai-compatible are ESM-only and reach us through Node 22's
// require(esm). See chunker.ts for the same problem solved the same way.
const { Agent } = require('@mastra/core/agent');
const { createTool } = require('@mastra/core/tools');
const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');

/**
 * The bearer goes on per request through a custom fetch, exactly as in
 * `foundry/client.ts`: the provider takes a static `apiKey` string, not a
 * provider it calls each time. No API key exists anywhere in this path.
 */
const token = getBearerTokenProvider(new DefaultAzureCredential(), FOUNDRY_SCOPE);

/**
 * Built here rather than inline so `compliance-selftest.ts` can drive this exact
 * code path with a fake transport and a fake token — offline, no credential, no
 * spend. A compliance check that tests a DIFFERENT construction than production
 * uses is a check that proves nothing, which is the trap `loop-sdk.ts` records
 * from its own history.
 */
export function buildFoundryProvider(
  overrides: { baseURL?: string; token?: () => Promise<string>; fetch?: typeof fetch } = {},
): any {
  const getToken = overrides.token ?? token;
  return createOpenAICompatible({
    name: 'foundry',
    baseURL: overrides.baseURL ?? env.openaiEndpoint(),
    supportsStructuredOutputs: true, // see item 3 in the header
    fetch: async (url: any, init: any = {}) => {
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${await getToken()}`);
      return (overrides.fetch ?? fetch)(url, { ...init, headers });
    },
  });
}

let provider: any;
function foundryProvider(): any {
  if (!provider) provider = buildFoundryProvider();
  return provider;
}

/**
 * The same job as `buildFoundryProvider`, for AWS — and the point of it is the
 * SIZE DIFFERENCE, not the feature.
 *
 * `@fde/bedrock` translates between OpenAI's protocol and Anthropic's by hand:
 * system prompts move out of the message list, `max_tokens` becomes mandatory,
 * `json_schema.name` is dropped, `pause_turn` has no equivalent. Roughly 130
 * lines and 30 assertions to hold those rules still. It has to exist, because
 * the Agents SDK loop and three raw `chat.completions.create` call sites want an
 * OpenAI-shaped client and there is nothing else to give them.
 *
 * THIS IS THE SAME PORT IN FIVE LINES, because the AI SDK never translates. It
 * keeps one native provider per service behind a shared interface, so nothing is
 * converted — Mastra asks for "a language model" and whichever provider it was
 * handed speaks its own protocol from there.
 *
 * Keep both, and the repo answers a question it could not otherwise: what does
 * writing the translation yourself buy, and what does it cost? Knowing that
 * `pause_turn` has no OpenAI equivalent is the kind of thing you only learn the
 * expensive way, and it is invisible from here.
 *
 * CREDENTIALS RESOLVE THEMSELVES, exactly as in `@fde/bedrock/client.ts` — the
 * provider carries AWS's own chain (env vars, then a named profile, then SSO,
 * then instance roles). No key is passed in, and none exists in this path.
 */
export function buildBedrockProvider(overrides: { region?: string } = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createAmazonBedrock } = require('@ai-sdk/amazon-bedrock');
  return createAmazonBedrock({ region: overrides.region ?? process.env.AWS_REGION ?? 'eu-north-1' });
}

let bedrock: any;
function bedrockProvider(): any {
  if (!bedrock) bedrock = buildBedrockProvider();
  return bedrock;
}

/**
 * The inference profile, NOT the bare model id — `eu.` prefixed. Calling
 * `anthropic.claude-haiku-4-5-…` in an EU region fails with *"Invocation with
 * on-demand throughput isn't supported"*, which reads like missing access and
 * is not. Named rather than inlined so `provider-switch.ts` can assert the
 * default without restating the string, which is how a default and its test
 * drift apart.
 */
export const DEFAULT_BEDROCK_MODEL = 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';

/** What a self-test may inject so the Azure branch needs no env and no credential. */
export type FoundryOverrides = {
  baseURL?: string;
  token?: () => Promise<string>;
  fetch?: typeof fetch;
};

/**
 * Which provider serves this loop, and which model id it wants.
 *
 * AZURE IS THE DEFAULT AND SILENCE MEANS AZURE — an unset variable, a typo, a
 * value Turbo stripped all land on the path with a measured eval baseline behind
 * it. An unknown value THROWS rather than falling back quietly, because
 * `LLM_PROVIDER=bedrok` running happily on Azure is the failure that wastes an
 * afternoon: everything works, nothing is wrong, and the run you wanted never
 * happened.
 *
 * THE MODEL ID CHANGES WITH THE PROVIDER. `model` here is an Azure DEPLOYMENT
 * name (`gpt-5-mini`), which means nothing to Bedrock — it wants an inference
 * profile id (`eu.anthropic.claude-haiku-4-5-…`). Passing one to the other
 * fails with a validation error that reads like missing access and is not.
 *
 * EXPORTED, AND `overrides` EXISTS ONLY SO A TEST CAN REACH THIS FUNCTION.
 * `buildFoundryProvider` reads `FOUNDRY_OPENAI_ENDPOINT` through `required()`,
 * which throws when unset — so without an injection point a self-test would
 * have to build its own provider and assert against a construction production
 * never runs. That is the trap `buildFoundryProvider`'s own docstring names.
 * Both paths call the same builder; the only difference is memoisation.
 */
export function selectModel(model: string, overrides: FoundryOverrides = {}): any {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === 'azure') {
    // `.languageModel`, not `.chatModel`. Both are on the openai-compatible
    // provider, but only `languageModel` is on the shared `ProviderV4`
    // interface that Bedrock also implements — so the provider-specific spelling
    // this line used to carry would have blocked the swap on its own. The
    // abstraction was there; the call site was not using it.
    const p = Object.keys(overrides).length ? buildFoundryProvider(overrides) : foundryProvider();
    return p.languageModel(model);
  }
  if (raw === 'bedrock') {
    // NO OVERRIDES NEEDED HERE. The Bedrock provider constructs with no
    // credentials at all — AWS's chain resolves lazily, at call time — so a
    // self-test drives the real production construction offline. Verified, not
    // assumed: `buildBedrockProvider()` with every AWS_* variable deleted
    // returns a working provider whose model carries the right `modelId`.
    return bedrockProvider().languageModel(process.env.BEDROCK_MODEL ?? DEFAULT_BEDROCK_MODEL);
  }
  throw new Error(
    `LLM_PROVIDER="${process.env.LLM_PROVIDER}" is not a provider. Use "azure" or "bedrock", ` +
      'or unset it for azure. Refusing to guess.',
  );
}

/**
 * Every tool still goes through OUR registry, so fixtures, timing, error
 * shaping and the `source: 'live' | 'fixture'` record are identical on both
 * engines. Mastra only decides WHEN to call them.
 */
export function toMastraTools(registry: ToolRegistry, dispatched: ToolCallRecord[], opts: LoopOptions) {
  const out: Record<string, unknown> = {};
  for (const s of registry.schemas()) {
    out[s.name] = createTool({
      id: s.name,
      description: s.description,
      inputSchema: s.parameters, // the same Zod object the SDK path uses
      execute: async (input: any) => {
        opts.onEvent?.({ type: 'tool_call', turn: 0, name: s.name, args: input });
        const rec = await registry.dispatch(s.name, input);
        dispatched.push(rec);
        opts.onEvent?.({
          type: 'tool_result',
          turn: 0,
          name: rec.name,
          ok: rec.ok,
          ms: rec.ms,
          summary: rec.ok ? summariseResult(rec.result, opts.summariseResult) : (rec.error ?? 'failed'),
        });
        // Same contract as the SDK path: a failed tool returns readable JSON the
        // model can recover from, never a thrown exception.
        return rec.ok ? rec.result : { error: rec.error };
      },
    });
  }
  return out;
}

/**
 * `res.steps[]` is one model round-trip each, which is what `TurnRecord` means
 * on the SDK path too — so turn counts and token counts stay comparable across
 * engines. Tool calls are re-attached by walking steps in order and taking as
 * many dispatched records as each step asked for; tools run in request order,
 * so the slices line up.
 */
function turnsFrom(steps: any[], dispatched: ToolCallRecord[]): TurnRecord[] {
  const turns: TurnRecord[] = [];
  let taken = 0;
  steps.forEach((step, i) => {
    const wanted = (step.toolCalls ?? []).length;
    const slice = dispatched.slice(taken, taken + wanted);
    taken += wanted;
    turns.push({
      turn: i + 1,
      // Mastra does not time individual round-trips, so this is 0 rather than a
      // guess — the same choice loop-sdk.ts makes. Wall clock is the caller's.
      ms: 0,
      inputTokens: step.usage?.inputTokens ?? 0,
      // The AI SDK surfaces this at the TOP LEVEL of usage, already typed
      // `number | undefined`, so `?? undefined` is the whole adaptation — no
      // digging, no key guessing. Left undefined rather than coerced to 0 when
      // the provider does not report it: see `TurnRecord.cachedInputTokens`.
      cachedInputTokens: step.usage?.cachedInputTokens ?? undefined,
      outputTokens: step.usage?.outputTokens ?? 0,
      toolCalls: slice,
      text: typeof step.text === 'string' && step.text ? step.text : undefined,
    });
  });
  return turns;
}

export async function runLoopMastra<T = unknown>(
  _client: OpenAI, // accepted for signature parity; Mastra builds its own provider
  model: string,
  registry: ToolRegistry,
  prompt: string,
  opts: LoopOptions = {},
): Promise<LoopResult<T>> {
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  const schemaErrors: string[] = [];
  let retriesLeft = opts.structuredRetries ?? 1;

  const dispatched: ToolCallRecord[] = [];
  const validate =
    opts.validate ??
    // NO DOMAIN DEFAULT, and asking for a schema without a validator is a
    // mistake rather than a shortcut: it would let raw text through as if it
    // had passed, and it would typecheck. So it throws instead.
    (() => {
      if (opts.responseFormat) {
        throw new Error(
          'responseFormat was set without a validate function. @fde/agent ships no ' +
            'default validator — the answer contract is yours. Pass one (see @fde/schema).',
        );
      }
      return (raw: string): ValidationResult => ({ ok: true, value: raw as unknown });
    })();

  const agent = new Agent({
    name: opts.agentName ?? 'agent',
    instructions: opts.system ?? '',
    model: selectModel(model),
    tools: toMastraTools(registry, dispatched, opts),
  });

  let input: any = prompt;
  let turns: TurnRecord[] = [];

  for (;;) {
    let res: any;
    try {
      res = await agent.generate(input, {
        maxSteps: maxTurns,
        ...(opts.responseFormat ? { structuredOutput: { schema: opts.responseFormat } } : {}),
      });
    } catch (e: any) {
      // A turn-cap stop must look the same on both engines, because the eval
      // scorecard treats it as infrastructure rather than a wrong answer.
      if (/max.?steps/i.test(String(e?.message))) {
        return { text: '', turns, stoppedBecause: 'max_turns', schemaErrors };
      }
      throw e;
    }

    // ACCUMULATE across a schema retry, never overwrite: a retry's steps
    // describe only the retry, so assigning would erase the first attempt's
    // tool calls from the audit trail. loop-sdk.ts records the same trap.
    turns = [...turns, ...turnsFrom(res.steps ?? [], dispatched.slice(sumToolCalls(turns)))];
    for (const t of turns) opts.onTurn?.(t);

    const text =
      typeof res.text === 'string' && res.text
        ? res.text
        : JSON.stringify(res.object ?? '');

    if (!opts.responseFormat) {
      return { text, turns, stoppedBecause: 'model_finished', schemaErrors };
    }

    // WHY RE-VALIDATE WHAT MASTRA ALREADY VALIDATED. `structuredOutput` enforces
    // SHAPE. It knows nothing about coverage-schema.ts's `coherenceErrors()` —
    // above all "an unresolved conflict with no escalation is rejected", which is
    // the model silently picking a side while looking fully compliant.
    const validated = validate(text);
    if (validated.ok) {
      return {
        text,
        turns,
        structured: validated.value as T,
        stoppedBecause: 'model_finished',
        schemaErrors,
      };
    }

    schemaErrors.push(validated.errors!);
    opts.onEvent?.({ type: 'schema_retry', turn: turns.length, error: validated.errors! });

    if (retriesLeft <= 0) {
      // Fail loudly. Silent repair hides the failure rate, and the failure rate
      // is a number you need.
      return { text, turns, stoppedBecause: 'schema_invalid', schemaErrors };
    }
    retriesLeft--;

    input =
      `${prompt}\n\nYour previous response did not satisfy the required schema: ` +
      `${validated.errors}. Reply again with valid JSON only.`;
  }
}

function sumToolCalls(turns: TurnRecord[]): number {
  return turns.reduce((a, t) => a + t.toolCalls.length, 0);
}


