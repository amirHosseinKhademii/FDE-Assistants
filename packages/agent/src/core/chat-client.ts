/**
 * WHICH RAW OpenAI CLIENT A CALLER SHOULD USE, and which model id to ask it for.
 *
 * `mastra/provider.ts`'s `selectModel` already answers this for callers that
 * want a Mastra `languageModel`. Several do not: `@vantis/steering` and
 * `@meridian/pharma` hand a raw `OpenAI` client to `runLoop`, because the
 * `sdk` engine needs one. This is the same decision for them, and it is
 * EXTRACTED rather than copied — a third statement of "which cloud serves this"
 * is how `settle.ts` ended up with three copies of one retry sentence.
 *
 * ── THE BUG THIS EXISTS TO FIX ────────────────────────────────────────────
 *
 * MEASURED 2026-09-16 on the deployed `steering-app`: every request failed with
 *
 *   FOUNDRY_OPENAI_ENDPOINT is unset or still a placeholder in .env
 *
 * on a container configured entirely for Gemini — `LLM_PROVIDER=hosted`,
 * `LOOP=mastra`, a key and a model. Nothing was going to call Azure. The client
 * was constructed EAGERLY at the top of `assessmentContext`, threw before any
 * model call, and `runLoopMastra` would have discarded it anyway
 * (`_client: OpenAI, // accepted for signature parity`).
 *
 * It did not reproduce locally, and the reason is worth keeping: `.env` still
 * carries `FOUNDRY_OPENAI_ENDPOINT` pointing at the deleted deployment, so the
 * client BUILDS fine — nothing validates reachability — and is then ignored.
 * `env -u FOUNDRY_OPENAI_ENDPOINT` did not reproduce it either, because dotenv
 * reads the file back. The failing configuration was one nobody could get to by
 * unsetting a variable in a shell.
 *
 * ── SO THE AZURE BRANCH IS A THUNK ────────────────────────────────────────
 *
 * `azure` is passed as a FUNCTION, not a client. On any non-Azure provider it is
 * never called, so an absent `FOUNDRY_OPENAI_ENDPOINT` costs nothing. That is
 * the whole fix: build what you are going to use.
 *
 * ── AZURE IS UNCHANGED, WHICH IS THE POINT ────────────────────────────────
 *
 * Unset `LLM_PROVIDER` calls the thunk and returns exactly the client the caller
 * would have built itself, with the deployment name it would have used. This is
 * additive: the Foundry path can be re-attached later by setting the variable
 * back, with no code change. `pnpm provider:check` pins that.
 */
import type OpenAI from 'openai';
import {
  DEFAULT_HOSTED_BASE_URL,
  DEFAULT_LOCAL_BASE_URL,
  DEFAULT_LOCAL_MODEL,
  hostedApiKey,
  hostedModel,
} from './loop.types';

/** `require`, not `import`: keeps this module cheap for callers that never reach it. */
function OpenAICtor(): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('openai').OpenAI ?? require('openai').default;
}

/**
 * The client for whichever provider is selected.
 *
 * @param azure a FUNCTION returning the caller's own Azure client. Called only
 *              when Azure is actually the provider — see the header.
 */
export function chatClient(azure: () => OpenAI): OpenAI {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === 'azure') return azure();

  const OpenAIClass = OpenAICtor();
  if (raw === 'hosted') {
    return new OpenAIClass({
      baseURL: process.env.HOSTED_BASE_URL ?? DEFAULT_HOSTED_BASE_URL,
      apiKey: hostedApiKey(),
      // The free tiers this reaches are queues. `retryingFetch` covers the
      // Mastra path; this is the same budget for callers holding a raw client.
      maxRetries: 5,
    }) as OpenAI;
  }
  if (raw === 'local') {
    return new OpenAIClass({
      baseURL: process.env.LOCAL_OPENAI_BASE_URL ?? DEFAULT_LOCAL_BASE_URL,
      // Nothing authenticates a loopback server; the SDK requires a string.
      apiKey: 'local',
    }) as OpenAI;
  }
  // BEDROCK IS NOT SERVED HERE, and says so rather than falling back to Azure.
  // `@fde/bedrock` translates a REQUEST, not a client — the same asymmetry
  // `sdk/provider.ts` refuses over. A caller wanting Bedrock must go through
  // that package's `chatCompletion`, as `steering`'s `llm/provider.ts` does.
  throw new Error(
    `LLM_PROVIDER="${process.env.LLM_PROVIDER}" cannot be served as a raw OpenAI client. ` +
      'Use "azure", "hosted" or "local" here; "bedrock" translates a request rather than ' +
      'a client and must go through @fde/bedrock. Refusing to run on a cloud you did not ask for.',
  );
}

/**
 * The model id to ask that client for.
 *
 * THE ID CHANGES WITH THE PROVIDER and passing the wrong one fails in a way that
 * reads like missing access: an Azure DEPLOYMENT name means nothing to Gemini,
 * and an Ollama tag means nothing to Azure. Same rule as `selectModel`'s, which
 * is why they must not drift — `provider:check` asserts they agree.
 */
export function chatModelName(configured: string): string {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (raw === 'hosted') return hostedModel();
  if (raw === 'local') return process.env.LOCAL_MODEL ?? DEFAULT_LOCAL_MODEL;
  return configured;
}
