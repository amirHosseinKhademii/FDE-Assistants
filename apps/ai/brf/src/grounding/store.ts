/**
 * The chunk index in the BRF database.
 *
 * The connection string is passed explicitly every time. The grounding package
 * falls back to the global DATABASE_URL when it is not, and this application must
 * never write into another application's database.
 */
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import { openStore } from '@fde/grounding';
import { DOMAIN } from '../config/domain';

export function openBrfStore(embeddings: EmbeddingsInterface) {
  return openStore(embeddings, {
    tableName: DOMAIN.vectorTable,
    connectionString: DOMAIN.databaseUrl,
  });
}
