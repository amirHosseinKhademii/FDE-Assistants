/**
 * EMBEDDING PLUMBING — batching and ordering, without knowing whose API it is.
 *
 * Choosing a provider and authenticating to it is the application's job: that
 * is where the cloud, the credential story and the data-residency argument
 * live, and a retrieval package that had an opinion about any of them would be
 * unusable at the next customer.
 *
 * What IS generic is what surrounds the call, and one piece of it is a bug
 * waiting to happen in every implementation:
 *
 *   BATCHING      every hosted embeddings API caps a single request. A corpus
 *                 longer than the cap must be split, and the splitting must not
 *                 change the result.
 *
 *   ORDERING      **the API may return items out of order.** Hosted embeddings
 *                 responses carry an `index`, and it is authoritative. Trusting
 *                 arrival order gives you an index that is subtly, silently
 *                 wrong — every vector attached to the wrong passage, no error,
 *                 no crash, and retrieval that merely seems poor. This is the
 *                 single most expensive mistake available in this layer.
 *
 *   USAGE         tokens are reported per request, so they accumulate across
 *                 batches. A caller that reads the last response undercounts.
 *
 * So: the app supplies `embed`, which does the authenticated call and returns
 * whatever the provider gave back. Everything above is handled here, once.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Embeddings, type EmbeddingsParams } from '@langchain/core/embeddings';

/** What a provider must return: a vector, and the position it belongs at. */
export interface EmbeddingItem {
  index: number;
  embedding: number[];
}

export interface EmbeddingResponse {
  data: EmbeddingItem[];
  /** Prompt tokens for THIS request. Accumulated across batches by the caller. */
  promptTokens?: number;
}

export interface BatchedEmbeddingsArgs extends EmbeddingsParams {
  /** One authenticated call. Batching and ordering are handled for you. */
  embed(texts: string[]): Promise<EmbeddingResponse>;
  /**
   * Maximum inputs per request. Provider-specific — Azure's cap is what drove
   * the default of 96 here.
   */
  batchSize?: number;
  /** Called once per batch with that request's prompt tokens. */
  onUsage?(promptTokens: number): void;
  /** Applied to a QUERY only. Asymmetric models need it; symmetric ones do not. */
  queryPrefix?: string;
}

/**
 * Wrap a provider call in the batching and ordering every provider needs.
 *
 * `queryPrefix` exists because asymmetric models — bge and friends — are
 * trained with passages embedded bare and questions embedded behind an
 * instruction. Omitting it costs real retrieval accuracy and NOTHING looks
 * broken, which is the classic shape of an embedding bug.
 */
export class BatchedEmbeddings extends Embeddings {
  private readonly call: BatchedEmbeddingsArgs['embed'];
  private readonly batchSize: number;
  private readonly onUsage?: (n: number) => void;
  private readonly queryPrefix: string;

  constructor(args: BatchedEmbeddingsArgs) {
    super(args);
    this.call = args.embed;
    this.batchSize = args.batchSize ?? 96;
    this.onUsage = args.onUsage;
    this.queryPrefix = args.queryPrefix ?? '';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const res = await this.call(texts.slice(i, i + this.batchSize));
      if (res.promptTokens) this.onUsage?.(res.promptTokens);
      // `index` is authoritative — see the header. Never arrival order.
      const sorted = [...res.data].sort((a, b) => a.index - b.index);
      out.push(...sorted.map((d) => d.embedding));
    }
    return out;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embedDocuments([this.queryPrefix + text]);
    return vector;
  }
}

/**
 * A local, offline embedding model. No credentials, no network after the first
 * download.
 *
 * In the package because it needs nothing from any deployment: every customer
 * can use it for development and CI, and it is the cheapest possible way to
 * prove the retrieval path works before anyone approves a cloud spend.
 *
 * bge-small gives 384 numbers per passage against text-embedding-3-small's
 * 1536. The pgvector column has no fixed dimension, so nothing in the schema
 * cares — but the two are NOT comparable, so switching means re-ingesting.
 */
export class LocalEmbeddings extends Embeddings {
  private extractor?: Promise<(t: string | string[], o: Record<string, unknown>) => Promise<any>>;
  private readonly model: string;
  private readonly queryPrefix: string;

  constructor(args: EmbeddingsParams & { model?: string; queryPrefix?: string } = {}) {
    super(args);
    this.model = args.model ?? process.env.LOCAL_EMBEDDING_MODEL ?? 'Xenova/bge-small-en-v1.5';
    // bge is asymmetric: passages bare, questions behind this instruction.
    this.queryPrefix =
      args.queryPrefix ??
      process.env.LOCAL_EMBEDDING_QUERY_PREFIX ??
      'Represent this sentence for searching relevant passages: ';
  }

  /** Loaded lazily and once: the first call pays the model download. */
  private pipeline() {
    if (!this.extractor) {
      // `require`, not `import`: @huggingface/transformers ships a CommonJS
      // build and this package does not emit ESM interop.
      //
      // OPTIONAL DEPENDENCY — ~650MB of ONNX runtime for a fallback path, so a
      // slim image may legitimately not have it. Fail with a sentence that says
      // what to do, not a module-not-found stack trace.
      let pipeline: any;
      let hfEnv: any;
      try {
        ({ pipeline, env: hfEnv } = require('@huggingface/transformers'));
      } catch {
        throw new Error(
          'LocalEmbeddings needs @huggingface/transformers, which is an optional ' +
            'dependency and is not installed. Either install it, or use a hosted ' +
            'provider via BatchedEmbeddings.',
        );
      }
      // WHERE THE MODEL IS CACHED, AND WHY IT IS NOT LEFT AS THE DEFAULT.
      //
      // `@huggingface/transformers` caches into `node_modules/.../.cache` — a
      // path inside the dependency tree. That is fine on a laptop and fails on
      // every container that ships a read-only or non-root `node_modules`:
      //
      //   EACCES: permission denied, mkdir '/app/node_modules/@huggingface/transformers/.cache'
      //
      // MEASURED 2026-09-16 on the deployed `steering-app`, where it broke every
      // request as soon as `EMBEDDINGS=local` was switched on. It is NOT fixable
      // from the environment: `HF_HOME` and `TRANSFORMERS_CACHE` are Python
      // conventions and this library reads neither — setting them changed
      // nothing, which is the kind of fix that looks applied and is not.
      //
      // `LOCAL_EMBEDDING_CACHE` overrides; the default is the OS temp directory,
      // which is writable in every container this repo deploys to. The cost of
      // a temp path is re-downloading ~130MB after the filesystem is wiped,
      // which is a cold-start cost and not a failure.
      if (hfEnv) {
        const dir = process.env.LOCAL_EMBEDDING_CACHE ?? join(tmpdir(), 'fde-embeddings');
        hfEnv.cacheDir = dir;
        if (hfEnv.backends?.onnx?.wasm) hfEnv.backends.onnx.wasm.wasmPaths = undefined;
      }
      this.extractor = pipeline('feature-extraction', this.model);
    }
    return this.extractor!;
  }

  private async run(texts: string[]): Promise<number[][]> {
    const extract = await this.pipeline();
    // CLS pooling is what bge was trained with; normalised so cosine distance
    // in pgvector means what the store's `distanceStrategy` says it means.
    const out = await extract(texts, { pooling: 'cls', normalize: true });
    return out.tolist() as number[][];
  }

  /**
   * BATCHED, BECAUSE ONNX BUILDS ONE TENSOR FOR WHATEVER YOU HAND IT.
   *
   * `run()` passes the array straight to the extractor, which pads every text to
   * the model's 512-token window and allocates a single `[n, 512]` tensor plus
   * the attention matrices over it. That is linear in `n` at best and the
   * attention term is worse, so the failure is not gradual — it is fine, fine,
   * fine, then a hard allocation error.
   *
   * MEASURED 2026-09-16: insurance's 555 passages embedded without complaint;
   * steering's 2,827 asked for a single buffer of **35,571,892,224 bytes** —
   * 35.5 GB — and ONNX aborted inside `FusedMatMul`. The corpus that worked was
   * simply under the cliff.
   *
   * WORSE THAN A CRASH: `ingestDocuments` DELETES the table before it embeds
   * (`ingest.ts:135`), so the failure landed after the old index was already
   * gone. An ingest that cannot finish must not be able to take the index with
   * it, and batching is what stops the common case from doing so.
   *
   * 64 is deliberately conservative — about 1/44th of the tensor that failed,
   * and small enough to survive a laptop. `LOCAL_EMBEDDING_BATCH` raises it when
   * the machine can take it; the ceiling is memory, not correctness.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const size = Math.max(1, Number(process.env.LOCAL_EMBEDDING_BATCH ?? 64));
    if (texts.length <= size) return this.run(texts);

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += size) {
      out.push(...(await this.run(texts.slice(i, i + size))));
      this.onBatch?.(Math.min(i + size, texts.length), texts.length);
    }
    return out;
  }

  /** Optional progress hook — a 3,000-passage corpus is otherwise silent for minutes. */
  onBatch?: (done: number, total: number) => void;

  async embedQuery(text: string): Promise<number[]> {
    return (await this.run([this.queryPrefix + text]))[0];
  }
}
