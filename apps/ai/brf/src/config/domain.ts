/**
 * The BRF values that a different deployment would change, in one place.
 *
 * What counts as a cooperative document, how its sections are numbered, how a
 * citation is formed, and the prompt all live in their own files. This file
 * holds the nouns and the settings.
 */
import './env';
import { resolve } from 'node:path';
import { DOCS_ROOT } from './paths';

export const BRF_DATABASE_URL_DEFAULT = 'postgresql://postgres:postgres@127.0.0.1:5435/brf_index';

/**
 * The one embedding model this index is built with. Changing it means
 * re-ingesting the whole corpus, because the vectors are not comparable.
 */
export const EMBEDDING_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

/**
 * Mean pooling is how this sentence-transformers model was trained. A wrong
 * pooling does not fail: the vectors have the right length and are simply
 * worse. So it is written here rather than left to the environment.
 */
export const EMBEDDING_POOLING = 'mean';

/** Postgres full-text configuration for Swedish, which stems words such as "underhållsansvaret". */
export const TEXT_SEARCH_CONFIG = 'swedish';

function embeddingChoice(): 'local' | 'azure' {
  const raw = (process.env.EMBEDDINGS ?? 'local').trim().toLowerCase();
  if (raw === 'local' || raw === 'azure') return raw;
  throw new Error(`EMBEDDINGS must be "local" (the default) or "azure", got "${raw}".`);
}

const CHOICE = embeddingChoice();

export const DOMAIN = {
  /** The Markdown documents that get indexed. Override with BRF_CORPUS_DIR. */
  corpusDir: process.env.BRF_CORPUS_DIR ?? resolve(DOCS_ROOT, 'brf/corpus'),

  /** The index database. Read from BRF_DATABASE_URL, never from DATABASE_URL. */
  databaseUrl: process.env.BRF_DATABASE_URL ?? BRF_DATABASE_URL_DEFAULT,

  textSearchConfig: TEXT_SEARCH_CONFIG,

  embeddingChoice: CHOICE,

  /**
   * One table per embedding provider. The two produce different dimensions, so
   * the suffix stops the providers from mixing their vectors in one table.
   */
  vectorTable: CHOICE === 'local' ? 'brf_chunks_local' : 'brf_chunks_azure',
} as const;
