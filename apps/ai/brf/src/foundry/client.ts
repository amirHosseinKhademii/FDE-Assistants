/**
 * The Azure clients, built only when Azure is the choice.
 *
 * Nothing imports this module at load time. A run with EMBEDDINGS=local and
 * LLM_PROVIDER=hosted never reaches it, so it reads no FOUNDRY_* variable.
 * Callers require it inside the one branch that needs it.
 */
import type OpenAI from 'openai';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { env, openaiClient } from '@fde/foundry';
import { openAiEmbeddings } from '@fde/grounding';

export function azureClient(): OpenAI {
  return openaiClient();
}

export function azureChatDeployment(): string {
  return env.chatDeployment();
}

export function azureEmbeddings(usage: { promptTokens: number }): EmbeddingsInterface {
  return openAiEmbeddings({
    client: openaiClient(),
    deployment: env.embeddingDeployment(),
    onUsage: (tokens) => {
      usage.promptTokens += tokens;
    },
  });
}
