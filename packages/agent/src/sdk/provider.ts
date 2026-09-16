/**
 * Which client the Agents SDK talks through, and which clouds it will refuse.
 *
 * Split out of `loop-sdk.ts` so the loop reads as a loop. Unlike the other two
 * engines this one does not BUILD a model — the SDK takes an OpenAI client
 * object, which the caller supplies — so "provider" here means pointing the SDK
 * at that client, shutting off its telemetry, and refusing a cloud it cannot
 * reach. See `../../docs/ENGINES.md` §4 for why that refusal exists.
 */
import type OpenAI from 'openai';
import { setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents';

/**
 * Point the SDK at OUR client and shut off its telemetry.
 *
 * `setDefaultOpenAIClient` is the whole Azure story: the SDK does not need to
 * know about Foundry, it just uses the already-configured `OpenAI` instance
 * from `foundry/client.ts` — same endpoint, same DefaultAzureCredential, same
 * region. There is no Azure-specific code path.
 *
 * Idempotent because these are process-wide globals and both `ask` and `eval`
 * may configure before running.
 *
 * NOTE, and it cost an hour to learn: `setDefaultOpenAIClient` is FIRST-WRITE-
 * WINS. The SDK caches the client when it first resolves a model and ignores
 * later calls. There is deliberately no `reset()` here, because a function that
 * appears to swap the client and cannot would be worse than none — the
 * compliance self-test had exactly that bug and silently recorded zero requests
 * while looking like it passed. To drive a genuinely different client, build an
 * `OpenAIResponsesModel` explicitly and hand it to the Agent as `model`.
 */
/**
 * THIS ENGINE REACHES AZURE ONLY, AND SAYS SO RATHER THAN PRETENDING.
 *
 * `mastra/loop.ts` and `langgraph/loop.ts` both honour `LLM_PROVIDER` because
 * they build their own model object and ignore the `client` argument. This one
 * cannot: the Agents SDK takes an OpenAI CLIENT OBJECT through
 * `setDefaultOpenAIClient`, so reaching Bedrock means handing it a client that
 * speaks OpenAI's protocol to Anthropic's API. That is exactly what
 * `@fde/bedrock` was written to be — and it is not wired to this loop yet.
 *
 * Until it is, `LLM_PROVIDER=bedrock` on the DEFAULT engine (`LOOP` defaults to
 * `sdk`) used to run happily on Azure: no error, no warning, every number in
 * the run about a cloud nobody chose. That is the precise failure
 * `selectModel`'s throw exists to prevent, and it was sitting in the path that
 * runs when you type nothing.
 *
 * So it throws. A refusal costs a run; a silent wrong cloud costs an afternoon
 * and a wrong conclusion. Note what does NOT change: the raw
 * `chat.completions.create` path (`@vantis/steering`'s `llm/provider.ts`) still
 * reaches Bedrock through `@fde/bedrock`, because that caller hands over a
 * request rather than a client.
 *
 * `LLM_PROVIDER=local` AND `=hosted` ARE REFUSED FOR A SECOND, SHARPER REASON,
 * and it is not the one above. `setOpenAIAPI('responses')` below puts this engine on the
 * RESPONSES API. Ollama and llama.cpp serve `/v1/chat/completions` and do not
 * implement `/v1/responses` — so pointing this engine at a local server fails
 * at the transport, not at the model, with an error that reads like a broken
 * install. `LOOP=mastra` and `LOOP=langgraph` build their own model objects
 * against chat-completions and serve both today. Gemini's OpenAI-compatible
 * surface is `/chat/completions` as well, so `hosted` lands on exactly the same
 * wall — it is not an Ollama quirk, it is what "OpenAI-compatible" means in
 * practice: everyone implements the older, wider endpoint.
 */
function refuseUnreachableProvider(): void {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === 'azure') return;
  throw new Error(
    `LLM_PROVIDER="${process.env.LLM_PROVIDER}" cannot be served by the agents-sdk engine, ` +
      'which reaches Azure only — it takes an OpenAI client object, and @fde/bedrock is not ' +
      'wired to it yet. Use LOOP=mastra or LOOP=langgraph for bedrock, local or hosted, or unset ' +
      'LLM_PROVIDER for azure. Refusing to run on a cloud you did not ask for.',
  );
}

let configured = false;
export function configureSdk(client: OpenAI): void {
  refuseUnreachableProvider();
  if (configured) return;
  // Traces would otherwise go to api.openai.com. See the header.
  setTracingDisabled(true);
  setDefaultOpenAIClient(client as never);
  // Be explicit: the Responses API, the same surface loop.ts drives by hand.
  setOpenAIAPI('responses');
  configured = true;
}
