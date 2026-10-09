/**
 * embedder.ts — batch embedding clients for Step 2.6.
 *
 * Two providers behind createEmbedder():
 *   gemini  Gemini OpenAI-compatible endpoint. Config from the repo-root .env: HOSTED_API_KEY
 *           (required), HOSTED_BASE_URL, EMBEDDING_MODEL (default gemini-embedding-001),
 *           EMBEDDING_DIMENSIONS (default 1536). Retries 429 and 5xx with backoff + jitter.
 *           Rate-limited (free tier: every text counts as a request) — stays unchanged.
 *   local   Xenova/bge-base-en-v1.5 via transformers.js (ONNX, CPU, no API). 768 dims.
 *           Model files go to the default HF cache on first use.
 *
 * QUERY PREFIX (local): bge is trained with an instruction prefix on QUERIES only.
 * Passages are embedded as-is; kind 'query' prepends
 *   "Represent this sentence for searching relevant passages: "
 * Phase 3 retrieval MUST call embed(..., 'query') for the user question, or recall drops.
 * Pooling is CLS, vectors are L2-normalised (per the bge model card).
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

export type EmbedKind = 'passage' | 'query';

export interface Embedder {
  provider: 'gemini' | 'local';
  model: string;
  dims: number;
  embed(texts: string[], kind: EmbedKind): Promise<number[][]>;
}

export const LOCAL_MODEL = 'Xenova/bge-base-en-v1.5';
export const LOCAL_DIMS = 768;
export const BGE_QUERY_PREFIX = 'Represent this sentence for searching relevant passages: ';
const LOCAL_THREADS = 4; // shared machine: cap intra-op threads

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
 * Provider factory. The gemini embedder keeps the retry/backoff behaviour above; its
 * `kind` is ignored (gemini-embedding-001 is called without a task type, as before).
 */
export async function createEmbedder(opts: { provider: 'gemini' | 'local' }): Promise<Embedder> {
  if (opts.provider === 'gemini') {
    const cfg = readEmbeddingConfig();
    const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, maxRetries: 0 });
    return {
      provider: 'gemini',
      model: cfg.model,
      dims: cfg.dimensions,
      embed: (texts) => embedBatch(client, cfg, texts, 5),
    };
  }
  const { pipeline } = await import('@huggingface/transformers');
  const extractor: any = await pipeline('feature-extraction', LOCAL_MODEL, {
    dtype: 'fp32',
    session_options: { intraOpNumThreads: LOCAL_THREADS },
  } as any);
  return {
    provider: 'local',
    model: LOCAL_MODEL,
    dims: LOCAL_DIMS,
    async embed(texts, kind) {
      const input = kind === 'query' ? texts.map((t) => BGE_QUERY_PREFIX + t) : texts;
      const out = await extractor(input, { pooling: 'cls', normalize: true });
      const vectors: number[][] = out.tolist();
      if (vectors.length !== texts.length) throw new Error(`expected ${texts.length} vectors, got ${vectors.length}`);
      for (const v of vectors) {
        if (v.length !== LOCAL_DIMS) throw new Error(`expected ${LOCAL_DIMS} dims, got ${v.length}`);
      }
      return vectors;
    },
  };
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
