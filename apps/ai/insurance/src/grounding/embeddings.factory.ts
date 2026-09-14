/**
 * WHERE INSURANCE'S EMBEDDING CLIENT COMES FROM. That is all that is left here.
 *
 * ── WHAT THIS FILE USED TO BE ────────────────────────────────────────────
 *
 * Forty lines, byte-identical to pharma's copy apart from one import path. Its
 * twin carried the note that triggered this: *"If a third domain arrives, this
 * file is the candidate to lift into a shared package."*
 *
 * A third domain arrived. The batching, the index-ordering, the usage
 * accounting, the local fallback and the `EMBEDDINGS` switch are now
 * `@fde/grounding`'s `chooseEmbeddings`, once.
 *
 * WHAT COULD NOT GO WITH THEM is the only thing that was ever ours: we talk to
 * Azure AI Foundry, with a short-lived Entra token and no stored API key.
 * `@fde/grounding` states it has no opinion about which cloud you are on, and
 * an `@fde/foundry` import inside it would have made that false.
 *
 *   EMBEDDINGS=hosted (default)  Azure text-embedding-3-small, 1536 dimensions
 *   EMBEDDINGS=local             bge-small on this machine, 384 dimensions
 *
 * The two are NOT comparable. Switching means re-ingesting the whole corpus.
 */
import type OpenAI from 'openai';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { chooseEmbeddings, openAiEmbeddings, embeddingsChoice as hostedOrLocal } from '@fde/grounding';
import { env, openaiClient } from '../foundry/client';

export type EmbeddingsChoice = 'foundry' | 'local';

/**
 * THE LABEL STAYS `foundry`, AND THAT IS NOT STUBBORNNESS.
 *
 * `@fde/grounding` answers `hosted` or `local`, because it has no idea whose
 * cloud it is on and should not. This string, though, goes into the telemetry
 * log's model/engine fields and into anything that has ever been compared
 * against them. Renaming it would not break a build — it would quietly make
 * every earlier run incomparable with every later one under the same name,
 * which is the failure `eval:diff` refuses to let happen on purpose.
 *
 * So the generic answer is translated back into this domain's vocabulary here.
 * One line, and the boundary stays honest in both directions.
 */
export function embeddingsChoice(): EmbeddingsChoice {
  return hostedOrLocal() === 'local' ? 'local' : 'foundry';
}

/** Tokens consumed by the most recent embed run. Reset before a measured run. */
export const embeddingUsage = { promptTokens: 0 };

const options = (client?: OpenAI) => ({
  client: client ?? openaiClient(),
  deployment: env.embeddingDeployment(),
  onUsage: (tokens: number) => {
    embeddingUsage.promptTokens += tokens;
  },
});

export function foundryEmbeddings(client?: OpenAI): EmbeddingsInterface {
  return openAiEmbeddings(options(client));
}

/** The provider named by `EMBEDDINGS`. Defaults to Foundry. */
export function openEmbeddings(client?: OpenAI): EmbeddingsInterface {
  return chooseEmbeddings(options(client));
}
