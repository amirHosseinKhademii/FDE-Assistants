/**
 * embedder.ts — batch embedding client for Step 2.6 (Gemini OpenAI-compatible endpoint).
 * Config comes from the repo-root .env: HOSTED_API_KEY (required), HOSTED_BASE_URL,
 * EMBEDDING_MODEL (default gemini-embedding-001), EMBEDDING_DIMENSIONS (default 1536).
 * Retries 429 and 5xx with exponential backoff + jitter; any other error is thrown.
 */
import OpenAI from 'openai';

export interface ChunkToEmbed {
  id: string;
  content_hash: string;
  content: string;
}

export interface EmbeddingResult {
  chunk_id: string;
  content_hash: string;
  embedding: number[];
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}

export interface EmbeddingConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  dimensions: number;
}

export function readEmbeddingConfig(): EmbeddingConfig {
  const apiKey = process.env.HOSTED_API_KEY || '';
  if (!apiKey) throw new Error('HOSTED_API_KEY is not set in the repo-root .env');
  return {
    apiKey,
    baseURL: process.env.HOSTED_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
  };
}

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

function isRetryable(err: any): boolean {
  const status = err?.status;
  return status === 429 || (typeof status === 'number' && status >= 500 && status <= 599);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function embedBatch(
  client: OpenAI,
  cfg: EmbeddingConfig,
  texts: string[],
  retryCount: number,
): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.embeddings.create({
        model: cfg.model,
        input: texts,
        dimensions: cfg.dimensions,
      });
      const vectors = [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
      if (vectors.length !== texts.length) {
        throw new Error(`expected ${texts.length} vectors, got ${vectors.length}`);
      }
      for (const v of vectors) {
        if (v.length !== cfg.dimensions) {
          throw new Error(`expected ${cfg.dimensions} dims, got ${v.length}`);
        }
      }
      return vectors;
    } catch (err: any) {
      if (!isRetryable(err) || attempt >= retryCount) throw err;
      const base = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      const wait = base / 2 + Math.random() * (base / 2); // jitter
      console.warn(`  retry ${attempt + 1}/${retryCount}: HTTP ${err.status}, waiting ${Math.round(wait)} ms`);
      await sleep(wait);
    }
  }
}

/**
 * Embed chunks in batches. Calls onBatch(results) after each successful batch so the
 * caller can persist it (one transaction per batch). A non-retryable error or an
 * exhausted retry budget throws; earlier batches are already persisted by onBatch.
 */
export async function embedChunks(
  chunks: ChunkToEmbed[],
  batchSize: number,
  retryCount: number,
  onBatch?: (results: EmbeddingResult[]) => Promise<void>,
): Promise<EmbeddingResult[]> {
  const cfg = readEmbeddingConfig();
  // maxRetries: 0 — the SDK's own retries would hide attempts from our backoff accounting.
  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 0 });
  const all: EmbeddingResult[] = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const vectors = await embedBatch(client, cfg, batch.map((c) => c.content), retryCount);
    const results: EmbeddingResult[] = batch.map((c, j) => ({
      chunk_id: c.id,
      content_hash: c.content_hash,
      embedding: vectors[j],
      status: 'success',
    }));
    if (onBatch) await onBatch(results);
    all.push(...results);
  }
  return all;
}
