/**
 * The one place Foundry clients are constructed.
 *
 * Auth is DefaultAzureCredential, which resolves in order: env vars
 * (AZURE_CLIENT_ID / TENANT_ID / CLIENT_SECRET — a service principal), then
 * managed identity, then the az CLI login. That ordering is the point: the same
 * code runs locally against `az login` and in Azure against a managed identity,
 * with no branch and no key in config.
 *
 * For a regulated customer this is not a style preference. A security review
 * that finds a static API key in a config file can shelve the whole engagement
 * regardless of how good the AI is — see FDE.md Pillar 6.
 *
 * SCOPE MATTERS. Foundry data-plane tokens must be issued for
 * `https://ai.azure.com/.default`. Asking for the cognitiveservices scope
 * yields a token that authenticates fine and is then rejected with
 * "audience is incorrect" — which reads like a credential problem and isn't.
 */
import { resolve } from 'node:path';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import OpenAI from 'openai';


export const FOUNDRY_SCOPE = 'https://ai.azure.com/.default';

function required(name: string): string {
  const v = process.env[name]?.replace(/^["']|["']$/g, '');
  if (!v || v.includes('<')) {
    throw new Error(`${name} is unset or still a placeholder in .env`);
  }
  return v;
}

export const env = {
  openaiEndpoint: () => required('FOUNDRY_OPENAI_ENDPOINT'),
  chatDeployment: () => required('FOUNDRY_CHAT_DEPLOYMENT'),
  embeddingDeployment: () => required('FOUNDRY_EMBEDDING_DEPLOYMENT'),
};

export const credential = new DefaultAzureCredential();

/** Bearer tokens for the Foundry data plane; the provider owns the caching. */
const token = getBearerTokenProvider(credential, FOUNDRY_SCOPE);

/**
 * OpenAI-compatible client against the Foundry resource.
 *
 * We used to hand-roll the token cache here, on the belief that only the Python
 * SDK had a token provider. That is no longer true: `@azure/identity` exports
 * `getBearerTokenProvider`, which stands up a one-policy pipeline around
 * `bearerTokenAuthenticationPolicy` and reads the header back off a dummy
 * request — so it inherits that policy's cache and proactive refresh. The
 * hand-rolled cache is redundant; `token()` above is now the whole of it.
 *
 * The custom fetch stays, though, and for a different reason than the cache did:
 * the OpenAI client's `apiKey` is a static string, not a provider it will call
 * per request. Something has to set the header on each request, so we do.
 *
 * LOST IN THE TRADE: the 60-second refresh margin used to be a literal in this
 * file. It is now whatever refresh window the Azure SDK picks, which is a better
 * number and a less visible one — if a token ever goes stale mid-flight, that
 * window is in `@azure/identity`, not here.
 */
export function openaiClient(): OpenAI {
  return new OpenAI({
    baseURL: env.openaiEndpoint(),
    apiKey: 'entra',
    fetch: async (url: any, init: any = {}) => {
      const headers = new Headers(init.headers);
      headers.set('authorization', `Bearer ${await token()}`);
      return fetch(url, { ...init, headers });
    },
  });
}
