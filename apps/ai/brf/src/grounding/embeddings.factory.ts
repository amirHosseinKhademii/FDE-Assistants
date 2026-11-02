/**
 * Which embedding model the index is built with, and where it comes from.
 *
 * EMBEDDINGS=local (the default) is the MiniLM model on this machine: no
 * credential, no network after the first download, 384 dimensions. Foundry is
 * reached only through the azure branch, which runs only when EMBEDDINGS=azure.
 */
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { LocalEmbeddings } from '@fde/grounding';
import { DOMAIN, EMBEDDING_MODEL, EMBEDDING_POOLING } from '../config/domain';

/** Tokens the Azure embeddings reported in the last run. Local runs never add to it. */
export const embeddingUsage = { promptTokens: 0 };

/** The provider name for logs and the ingest banner. */
export function embeddingsLabel(): string {
  return DOMAIN.embeddingChoice;
}

export function openEmbeddings(): EmbeddingsInterface {
  if (DOMAIN.embeddingChoice === 'local') {
    // The query prefix is set to empty on purpose. The grounding default is the
    // bge instruction, which belongs to an asymmetric model. This model is
    // symmetric, so the prefix would change every question's vector and no error
    // would say so.
    return new LocalEmbeddings({
      model: EMBEDDING_MODEL,
      pooling: EMBEDDING_POOLING,
      queryPrefix: '',
    });
  }
  const { azureEmbeddings } = require('../foundry/client') as typeof import('../foundry/client');
  return azureEmbeddings(embeddingUsage);
}
