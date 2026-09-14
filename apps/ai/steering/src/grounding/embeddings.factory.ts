/**
 * WHERE STEERING'S EMBEDDING CLIENT COMES FROM. That is the whole file.
 *
 * Three lines of substance, because steering arrived AFTER the shared part was
 * extracted. Insurance and pharma each carried forty lines of identical code —
 * batching, index-ordering, usage accounting, the local fallback, the
 * `EMBEDDINGS` switch — and pharma's copy carried the trigger in a comment:
 * *"If a third domain arrives, this file is the candidate to lift into a shared
 * package. Two copies is not yet evidence; it is a note to self."*
 *
 * Steering is the third domain. The two copies turned out to be byte-identical
 * apart from an import path, which is the evidence that note was waiting for.
 * All of it now lives in `@fde/grounding` as `chooseEmbeddings`.
 *
 * THE LABEL SAYS `foundry`, matching the other two, for the reason their files
 * record: it reaches the telemetry log's model field, and renaming it would not
 * break a build — it would quietly make earlier runs incomparable with later
 * ones under the same name.
 *
 *   EMBEDDINGS=hosted (default)  Azure text-embedding-3-small, 1536 dimensions
 *   EMBEDDINGS=local             bge-small on this machine, 384 dimensions
 *
 * NOT comparable. Switching means re-indexing the whole corpus, and any
 * retrieval measurement taken under one is meaningless against the other.
 */
import type OpenAI from 'openai';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { chooseEmbeddings, embeddingsChoice as hostedOrLocal } from '@fde/grounding';
import { env, openaiClient } from '@fde/foundry';

export type EmbeddingsChoice = 'foundry' | 'local';

export function embeddingsChoice(): EmbeddingsChoice {
  return hostedOrLocal() === 'local' ? 'local' : 'foundry';
}

/** Tokens consumed by the most recent index run. Reset before a measured run. */
export const embeddingUsage = { promptTokens: 0 };

/** The provider named by `EMBEDDINGS`. Defaults to Foundry. */
export function openEmbeddings(client?: OpenAI): EmbeddingsInterface {
  return chooseEmbeddings({
    client: client ?? openaiClient(),
    deployment: env.embeddingDeployment(),
    onUsage: (tokens: number) => {
      embeddingUsage.promptTokens += tokens;
    },
  });
}
