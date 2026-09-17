/**
 * Which model object LangGraph is handed, on which cloud.
 *
 * Split out of `loop-langgraph.ts` so the loop reads as a loop. Everything about
 * WHICH provider answers lives here; nothing here knows there is a loop.
 *
 * PROVIDER CHOICE ON AZURE: `@langchain/openai`'s `ChatOpenAI`, pointed at the
 * Foundry `/openai/v1` surface via `configuration.baseURL` + a custom `fetch` —
 * the same shape `foundry/client.ts` and `mastra/provider.ts` both use. The
 * client's own `apiKey` is a static string, so something has to set the bearer
 * header per request, and that is this file's `fetch` override.
 */
import { getBearerTokenProvider, DefaultAzureCredential } from '@azure/identity';
import { FOUNDRY_SCOPE, env } from '@fde/foundry';
import {
  DEFAULT_BEDROCK_MODEL,
  DEFAULT_HOSTED_BASE_URL,
  DEFAULT_LOCAL_BASE_URL,
  DEFAULT_LOCAL_MODEL,
  hostedApiKey,
  hostedModel,
} from '../core/loop.types';
import { hostedRoundTripFetch } from './hosted-round-trip';

// require(), not import: `@langchain/openai`'s root export has no CJS
// condition, so it reaches us through Node 22's require(esm). Used uniformly
// for every LangChain import to avoid a mixed import/require split that would
// work by accident.
const { ChatOpenAI } = require('@langchain/openai');

/**
 * The bearer goes on per request through a custom fetch, exactly as in
 * `foundry/client.ts` and `mastra/loop.ts`. No API key exists anywhere in this
 * path — `apiKey` below is a required-but-unused string the client insists on.
 */
const token = getBearerTokenProvider(new DefaultAzureCredential(), FOUNDRY_SCOPE);

/**
 * Built here rather than inline so a compliance self-test can drive this exact
 * code path with a fake transport and a fake token — offline, no credential, no
 * spend. Same reasoning `mastra/provider.ts`'s `buildFoundryProvider` records: a
 * compliance check that tests a DIFFERENT construction than production uses is
 * a check that proves nothing.
 */
export function buildFoundryChatModel(
  model: string,
  overrides: { baseURL?: string; token?: () => Promise<string>; fetch?: typeof fetch } = {},
): any {
  const getToken = overrides.token ?? token;
  return new ChatOpenAI({
    model,
    apiKey: 'entra',
    configuration: {
      baseURL: overrides.baseURL ?? env.openaiEndpoint(),
      fetch: async (url: any, init: any = {}) => {
        const headers = new Headers(init.headers);
        headers.set('authorization', `Bearer ${await getToken()}`);
        return (overrides.fetch ?? fetch)(url, { ...init, headers });
      },
    },
  });
}

/**
 * The same job as `buildFoundryChatModel`, for AWS — and the THIRD way this
 * repo reaches Bedrock, which is the point of writing it.
 *
 * `@fde/bedrock` hand-translates OpenAI's protocol to Anthropic's, ~130 lines
 * and 30 assertions. `mastra/loop.ts` does it in five, because the AI SDK keeps
 * one native provider per service. This is five too — but it is NOT the same
 * five, and the difference is not cosmetic:
 *
 *   @fde/bedrock            AnthropicBedrock.messages.create  → Anthropic Messages API
 *   @ai-sdk/amazon-bedrock  /converse, /invoke                → Converse, invoke fallback
 *   @langchain/aws          ConverseCommand                   → Converse only
 *
 * (Read out of each package's own dist, not out of its README.)
 *
 * SO THE TWO FRAMEWORK PROVIDERS DO NOT SPEAK ANTHROPIC AT ALL. They speak
 * Converse — AWS's own cross-model normalisation layer, which does the
 * translating server-side. That reframes what the hand-written adapter buys:
 * not "the same thing for more lines", but ACCESS TO FIELDS CONVERSE NORMALISES
 * AWAY. `pause_turn` is the concrete one — `@fde/bedrock` passes it through
 * unmapped precisely because a paused turn is resumable and a stopped one is
 * not, and a layer whose job is to make every model look alike has nowhere to
 * put it.
 *
 * NO CREDENTIAL IS PASSED, here or in the Mastra sibling. `ChatBedrockConverse`
 * carries AWS's own chain (env vars, named profile, SSO, instance roles) and
 * resolves it at call time — verified by constructing this with every AWS_*
 * variable deleted, which is what lets `provider-switch-selftest.ts` assert the routing
 * offline.
 */
export function buildBedrockChatModel(
  overrides: { model?: string; region?: string } = {},
): any {
  const { ChatBedrockConverse } = require('@langchain/aws');
  return new ChatBedrockConverse({
    model: overrides.model ?? process.env.BEDROCK_MODEL ?? DEFAULT_BEDROCK_MODEL,
    region: overrides.region ?? process.env.AWS_REGION ?? 'eu-north-1',
  });
}

/**
 * Which provider serves this loop — the same contract as `mastra/loop.ts`'s
 * `selectModel`, deliberately: one variable, `LLM_PROVIDER`, means the same
 * thing on every engine, or it is not a switch, it is two switches.
 *
 * AZURE IS THE DEFAULT AND SILENCE MEANS AZURE. An unknown value THROWS rather
 * than falling back, for the reason the Mastra sibling records at length:
 * `LLM_PROVIDER=bedrok` running happily on Azure is the failure where
 * everything works, nothing is wrong, and the run you wanted never happened.
 *
 * THE MODEL ID CHANGES WITH THE PROVIDER. `model` is an Azure DEPLOYMENT name;
 * Bedrock wants an `eu.` inference profile. Passing one to the other fails with
 * a validation error that reads like missing model access and is not.
 *
 * `overrides` exists only so `provider-switch-selftest.ts` can drive this exact function
 * offline — `env.openaiEndpoint()` goes through `required()` and throws when
 * unset. Both branches call the same builder either way.
 */
/**
 * A model served from this machine — the LangChain spelling of
 * `mastra/provider.ts`'s `buildLocalProvider`.
 *
 * WRITTEN OUT RATHER THAN SHARED, for the reason the two Bedrock builders are:
 * `sdk/`, `mastra/` and `langgraph/` may not import each other, and a shared
 * helper living inside one of them would make a LangGraph user load Mastra's
 * Azure credential. Six lines duplicated is the cost of that rule, and
 * `provider-switch-selftest.ts` is what stops the two drifting — it asserts
 * both engines answer `local` the same way.
 *
 * NO CUSTOM `fetch`, WHICH IS THE ONLY REAL DIFFERENCE FROM THE AZURE BUILDER
 * ABOVE. There is no bearer to attach: nothing authenticates, because nothing
 * is remote.
 */
export function buildLocalChatModel(
  overrides: { baseURL?: string; fetch?: typeof fetch } = {},
): any {
  return new ChatOpenAI({
    model: process.env.LOCAL_MODEL ?? DEFAULT_LOCAL_MODEL,
    apiKey: 'local',
    configuration: {
      baseURL:
        overrides.baseURL ?? process.env.LOCAL_OPENAI_BASE_URL ?? DEFAULT_LOCAL_BASE_URL,
      ...(overrides.fetch ? { fetch: overrides.fetch } : {}),
    },
  });
}

/**
 * The LangChain spelling of `mastra/provider.ts`'s `buildHostedProvider`.
 *
 * Written out rather than shared for the reason the local and bedrock builders
 * are: the three engine folders may not import each other. `provider-switch-
 * selftest.ts` is what stops them drifting.
 */
export function buildHostedChatModel(
  overrides: { baseURL?: string; apiKey?: string; fetch?: typeof fetch } = {},
): any {
  return new ChatOpenAI({
    model: hostedModel(),
    apiKey: overrides.apiKey ?? hostedApiKey(),
    // A REAL option on this client, unlike Mastra's — see the long note on
    // `retryingFetch` in `mastra/provider.ts` for why that distinction cost a
    // green self-test before it was noticed.
    maxRetries: 4,
    configuration: {
      baseURL: overrides.baseURL ?? process.env.HOSTED_BASE_URL ?? DEFAULT_HOSTED_BASE_URL,
      // WITHOUT THIS WRAPPER THIS ENGINE CANNOT USE TOOLS ON GEMINI AT ALL.
      // LangChain parses a tool call down to `{ id, name, args }` and drops the
      // `extra_content` Gemini requires echoed back, so the SECOND request of
      // every tool-using conversation is rejected with a 400. Measured, and the
      // reason this engine was recorded as hosted-incompatible until now. There is
      // a SECOND repair in the same wrapper — see `hosted-round-trip.ts`.
      //
      // It wraps whatever fetch the caller supplied rather than replacing it,
      // so a test that injects its own still sees its own calls.
      fetch: hostedRoundTripFetch(overrides.fetch),
    },
  });
}

export function selectChatModel(
  model: string,
  overrides: { baseURL?: string; token?: () => Promise<string>; fetch?: typeof fetch } = {},
): any {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === 'azure') return buildFoundryChatModel(model, overrides);
  if (raw === 'bedrock') return buildBedrockChatModel();
  if (raw === 'hosted') return buildHostedChatModel(overrides);
  // The model id changes with the provider here too: `model` is an Azure
  // deployment name and is deliberately NOT passed through.
  if (raw === 'local') return buildLocalChatModel({ baseURL: overrides.baseURL, fetch: overrides.fetch });
  throw new Error(
    `LLM_PROVIDER="${process.env.LLM_PROVIDER}" is not a provider. Use "azure", "bedrock" ` +
      'or "local", or unset it for azure. Refusing to guess.',
  );
}
