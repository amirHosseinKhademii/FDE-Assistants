/**
 * The one place Bedrock clients are constructed — the AWS counterpart of
 * `@fde/foundry`'s `client.ts`, and deliberately shaped like it.
 *
 * AUTH IS THE DEFAULT AWS CREDENTIAL CHAIN, which the Bedrock SDK carries in
 * its own dependencies (`@aws-sdk/credential-providers`). It resolves in order:
 * env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY), then the profile named
 * by AWS_PROFILE in ~/.aws/credentials, then SSO, then instance/task roles.
 * That ordering is the point, and it is the same argument Foundry makes for
 * DefaultAzureCredential: the same code runs on a laptop against a profile and
 * in AWS against a role, with no branch and no key in config.
 *
 * WHERE THE PARITY WITH AZURE BREAKS, and this is worth stating rather than
 * glossing. Foundry's property is "no stored API key, ANYWHERE" — an Entra
 * token is minted per request and nothing durable sits on disk. The AWS chain
 * only reaches that standard on its later entries (SSO, instance roles), which
 * hand back short-lived STS credentials. Its FIRST two entries are a static key
 * pair that lives in a file until someone rotates it.
 *
 * So "we use the AWS credential chain" is not by itself the same claim. Which
 * entry actually resolved decides whether it is, and that is invisible unless
 * something looks — hence `credentialKind()` below. A security reviewer asking
 * "is there a long-lived secret on this host" deserves an answer from the
 * system, not from a README.
 *
 * REGION IS REQUIRED, unlike Foundry's endpoint which encodes it. Bedrock model
 * availability differs per region, and the EU regions want an INFERENCE PROFILE
 * id (`eu.anthropic.…`) rather than the bare model id (`anthropic.…`). Calling
 * the bare id fails with a validation error that reads like missing access and
 * is not — measured on this account 2026-09-14, eu-north-1.
 */
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';

/** Stockholm. EU by default because the data-residency story is the point. */
const DEFAULT_REGION = 'eu-north-1';

/**
 * The cheapest current model, and the only one `bedrock-invoke` may call.
 * An inference-profile id, not a model id — see the region note above.
 */
const DEFAULT_MODEL = 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';

function optional(name: string, fallback: string): string {
  const v = process.env[name]?.replace(/^["']|["']$/g, '');
  return !v || v.includes('<') ? fallback : v;
}

export const env = {
  region: () => optional('AWS_REGION', DEFAULT_REGION),
  model: () => optional('BEDROCK_MODEL', DEFAULT_MODEL),
};

/**
 * Which entry of the credential chain answered — the honesty function.
 *
 * Returns what it can prove from the environment, and says `unknown` rather
 * than guessing. `static-key` is the one a reviewer cares about: it means a
 * long-lived secret is readable on this host. `short-lived` means STS issued
 * something with an expiry, which is the property Foundry gets for free.
 *
 * It reports rather than enforces, on purpose. A deployment that can only use
 * a static key should still run — it should just not be able to claim it did
 * not.
 */
export function credentialKind(): 'short-lived' | 'static-key' | 'profile' | 'unknown' {
  if (process.env.AWS_SESSION_TOKEN) return 'short-lived';
  if (process.env.AWS_ACCESS_KEY_ID) return 'static-key';
  if (process.env.AWS_PROFILE) return 'profile';
  return 'unknown';
}

/** A Bedrock client for the configured region. Credentials resolve themselves. */
export function bedrockClient(): AnthropicBedrockMantle {
  return new AnthropicBedrockMantle({ awsRegion: env.region() });
}
