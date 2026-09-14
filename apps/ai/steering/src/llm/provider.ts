/**
 * Which cloud serves the model — Azure by default, Bedrock on request.
 *
 * WHY THE SWITCH LIVES HERE AND NOT IN AN `@fde/*` PACKAGE. `@fde/foundry` is
 * the Azure adapter and `@fde/bedrock` is the AWS one; neither should learn
 * that the other exists, or the "lift this into a customer's repo unchanged"
 * claim stops being true. Choosing between them is a DEPLOYMENT decision of one
 * engagement, so it belongs to the engagement. Insurance and pharma are
 * untouched by this file and still reach Azure the way they always did.
 *
 * AZURE IS THE DEFAULT, AND SILENCE MEANS AZURE. An unset `LLM_PROVIDER`, a
 * typo, a variable Turbo stripped — all of them land on the path that has a
 * measured 15/15 eval baseline behind it. A misconfiguration should fall back
 * to the known-good provider, never silently to the new one.
 *
 * AND AN UNKNOWN VALUE THROWS rather than falling back quietly. `LLM_PROVIDER=bedrok`
 * running happily on Azure is the failure that wastes an afternoon: everything
 * works, nothing is wrong, and the thing you were trying to test never ran.
 */
import { env as azureEnv, openaiClient } from '@fde/foundry';
import { chatCompletion, credentialKind, type ChatRequest, type ChatResponse } from '@fde/bedrock';

export type Provider = 'azure' | 'bedrock';

export function provider(): Provider {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (!raw) return 'azure';
  if (raw === 'azure' || raw === 'bedrock') return raw;
  throw new Error(
    `LLM_PROVIDER="${process.env.LLM_PROVIDER}" is not a provider. Use "azure" or "bedrock", ` +
      `or unset it for azure. Refusing to guess, because guessing here means the run you ` +
      `wanted to test never happened and nothing said so.`,
  );
}

/**
 * One line a human can read before a run that costs money, so that "which
 * cloud did this baseline come from" is answerable afterwards.
 *
 * On Bedrock it also reports the CREDENTIAL KIND, because that is the half of
 * the Azure parity story that does not come for free — see `@fde/bedrock`'s
 * `credentialKind()`.
 */
export function describeProvider(): string {
  return provider() === 'bedrock'
    ? `bedrock (${process.env.AWS_REGION ?? 'eu-north-1'}, credential: ${credentialKind()})`
    : `azure (${azureEnv.chatDeployment()})`;
}

/**
 * A chat completion from whichever provider is selected, in OpenAI's shape.
 *
 * The Azure branch already speaks that shape, so it passes straight through.
 * The Bedrock branch goes via `@fde/bedrock`'s translator. Callers see one
 * type and cannot tell which cloud answered — which is the whole point, and
 * also the thing to be suspicious of: see that package's notes on what the
 * translation drops.
 */
export async function completion(
  req: ChatRequest,
  overrides: { client?: Parameters<typeof chatCompletion>[1] extends { client?: infer C } ? C : never } = {},
): Promise<ChatResponse> {
  if (provider() === 'bedrock') return chatCompletion(req, overrides);

  const res = await openaiClient().chat.completions.create({
    model: req.model ?? azureEnv.chatDeployment(),
    store: false,
    messages: req.messages,
    ...(req.max_tokens ? { max_completion_tokens: req.max_tokens } : {}),
    ...(req.response_format ? { response_format: req.response_format } : {}),
  });

  const cached = res.usage?.prompt_tokens_details?.cached_tokens;
  return {
    choices: [
      {
        message: { role: 'assistant', content: res.choices[0]?.message?.content ?? '' },
        finish_reason: res.choices[0]?.finish_reason ?? 'unknown',
      },
    ],
    ...(res.usage
      ? {
          usage: {
            prompt_tokens: res.usage.prompt_tokens,
            completion_tokens: res.usage.completion_tokens,
            // Passed through, never defaulted — same rule as the Bedrock side.
            ...(typeof cached === 'number' ? { prompt_tokens_details: { cached_tokens: cached } } : {}),
          },
        }
      : {}),
  };
}
