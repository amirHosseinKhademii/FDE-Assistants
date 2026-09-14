/**
 * Which model object Mastra is handed, on which cloud.
 *
 * Split out of `loop-mastra.ts` so the loop reads as a loop. Everything about
 * WHICH provider answers lives here; nothing here knows there is a loop.
 *
 * PROVIDER CHOICE: `@ai-sdk/openai-compatible`, not `@ai-sdk/azure`. The Azure
 * provider builds the classic `/openai/deployments/{name}?api-version=` path and
 * our endpoint is the Foundry `/openai/v1` surface — the same mismatch that ruled
 * out the `AzureOpenAI` class in `foundry/client.ts`.
 *
 * `supportsStructuredOutputs: true` MUST be set below. Without it the AI SDK
 * sends `response_format: { type: 'json_object' }` — some JSON, not this shape —
 * and Foundry rejects it with "'messages' must contain the word 'json'". The
 * obvious fix is to put "json" in the prompt, which makes the error disappear
 * having quietly downgraded Pillar 3 from a strict schema to best-effort JSON.
 * Same class as the Agents SDK's `store: true`: a default that weakens a
 * guarantee invisibly.
 */
import { getBearerTokenProvider, DefaultAzureCredential } from '@azure/identity';
import { FOUNDRY_SCOPE, env } from '@fde/foundry';
import { DEFAULT_BEDROCK_MODEL } from '../core/loop.types';

// require(), not import: `@ai-sdk/openai-compatible` is ESM-only and reaches us
// through Node 22's require(esm). See chunker.ts for the same problem solved
// the same way.
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
 * uses is a check that proves nothing, which is the trap `sdk/compliance-sdk.ts` records
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
