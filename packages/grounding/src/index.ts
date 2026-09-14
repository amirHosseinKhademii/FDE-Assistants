/**
 * @fde/grounding — domain-neutral retrieval.
 *
 * Hand it a source of documents and a description of your domain's vocabulary;
 * it chunks, embeds, stores and searches. It never learns what your documents
 * mean.
 *
 * THE SPLIT THIS PACKAGE EXISTS TO ENFORCE:
 *
 *   here          read documents from anywhere · chunk with a heading trail ·
 *                 embed · store whole documents AND chunks · hybrid search
 *   your app      what a document type IS, which statuses retire one, what
 *                 precedence turns on, and the business procedure
 *
 * The boundary is `DocumentDomain` (see domain.types.ts). Before it existed,
 * this code had a `jurisdiction` column and a ten-way insurance type union
 * compiled into it, and a second customer would have had to edit all of it.
 *
 * WHAT IS DELIBERATELY NOT HERE: embeddings providers and credentials. Those
 * are deployment concerns with their own auth story, and `openStore` takes an
 * `EmbeddingsInterface` so any of them works. Keeping them out is why this
 * package has no opinion about which cloud you are on.
 */
export type { DocumentDomain, DocumentFields } from './domain.types';

export {
  createIdentifierScheme,
  type IdentifierScheme,
  type IdentifierSchemeOptions,
} from './identifier';

export { loadDirectory, sha, type Document } from './loader';
export {
  chunkAll,
  inspectChunking,
  orphanedTableRows,
  type Chunk,
  type ChunkOptions,
} from './chunker';

export {
  connectionString,
  redactedConnectionString,
  openStore,
  DEFAULT_CHUNK_TABLE,
} from './store';

export {
  fileDocumentSource,
  dbDocumentSource,
  asLoaderDocument,
  bannerFields,
  UNKNOWN_STATUS,
  type DocumentSource,
  type SourceDocument,
  type DocumentRelation,
} from './document-source';

export {
  ensureSchema,
  loadDocuments,
  DOCUMENTS_TABLE,
  RELATIONS_TABLE,
  type LoadResult,
} from './documents.store';

export {
  hybridSearch,
  ensureFullTextIndex,
  type Scored,
  type HybridResult,
} from './hybrid';

export {
  ingestDocuments,
  toLangChainDocument,
  type IngestResult,
} from './ingest';

export {
  fingerprintDocuments,
  compareDocumentSources,
  type Fingerprint,
  type LabelledSource,
  type SourceComparison,
} from './verify';

export {
  openAiEmbeddings,
  chooseEmbeddings,
  embeddingsChoice,
  type EmbeddingsClient,
  type OpenAiEmbeddingsOptions,
  type EmbeddingsChoice,
} from './openai-embeddings';

export {
  BatchedEmbeddings,
  LocalEmbeddings,
  type BatchedEmbeddingsArgs,
  type EmbeddingItem,
  type EmbeddingResponse,
} from './embeddings';

export {
  createCorpusIndex,
  refFromHeading,
  bareName,
  type CorpusIndex,
  type IndexedDocument,
} from './corpus-index';

export {
  fileRecordSource,
  type RecordSource,
  type EntityRecord,
} from './record-source';

export {
  runGroundingCli,
  type GroundingCliConfig,
  type IngestCost,
} from './cli';

export { survivesDisconnect, type DropOptions } from './pg-resilience';
