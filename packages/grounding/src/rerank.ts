/**
 * A SECOND MODEL re-scores the shortlist. The one retrieval stage this package
 * did not have.
 *
 * ── WHAT A CROSS-ENCODER IS, AND WHY IT CAN BEAT THE RETRIEVER ───────────
 *
 * Embedding search is a BI-ENCODER: the question and the passage are turned
 * into vectors SEPARATELY and compared by angle. That separation is what makes
 * it fast — every passage is embedded once, at ingest, and a query is one
 * vector against a pre-built index. It is also what makes it blunt: the passage
 * was encoded without ever having seen the question, so the vector has to be a
 * summary good enough for every question that might ever be asked.
 *
 * A CROSS-ENCODER reads the question and the passage TOGETHER, as one input,
 * and emits a single relevance number. Nothing is precomputed and nothing is
 * cached, so it cannot be an index — scoring the whole corpus for one question
 * is thousands of forward passes. What it can do is re-score a SHORTLIST the
 * cheap retriever already narrowed to a few dozen.
 *
 *     retrieve 50 cheaply  ──►  re-score those 50 properly  ──►  keep 6
 *     (bi-encoder, indexed)     (cross-encoder, no index)        (what the
 *                                                                 model sees)
 *
 * ── THE CEILING, WHICH IS THE THING PEOPLE FORGET ────────────────────────
 *
 * A reranker CANNOT retrieve. It only reorders what it was handed. If the right
 * passage is not in the candidate pool, no amount of re-scoring puts it in the
 * top k — so recall@k after reranking is bounded above by recall@poolSize
 * before it. That bound is worth measuring on its own: it says whether the job
 * is "the retriever cannot find it" (widen the pool, or fix chunking) or "the
 * retriever finds it and ranks it badly" (which is the only thing a reranker
 * fixes). `rerankHits` returns `fromRank` on every hit so the movement is
 * visible rather than inferred.
 *
 * ── LOCAL, NOT HOSTED, AND THAT IS A RESIDENCY DECISION ──────────────────
 *
 * Cohere Rerank and Voyage are better models. They also require sending the
 * customer's passages to a third party, which at most engagements is the
 * conversation that ends the pilot. A local cross-encoder adds no vendor, no
 * egress and no new credential — `@huggingface/transformers` runs it in-process
 * on CPU. When a customer is relaxed about egress, a hosted reranker is a
 * drop-in for `scoreAll` below and nothing else changes.
 *
 * ── AN OPTIONAL DEPENDENCY, LOADED LAZILY, AND BOTH ARE DELIBERATE ───────
 *
 * `@huggingface/transformers` is ~200 MB of runtime and is in
 * `optionalDependencies`. A top-level import would make every consumer of this
 * package pay for it — including the ingest path, which never reranks. So it is
 * imported inside the function, and its absence is reported as a clear refusal
 * rather than a module-resolution stack trace three layers down.
 */
import type { Document as LCDocument } from '@langchain/core/documents';
import type { Scored } from './hybrid';

/** The default cross-encoder. Small, CPU-friendly, and the standard baseline. */
export const DEFAULT_RERANK_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';

/**
 * How many candidates to re-score by default.
 *
 * 50 rather than 10 because the reranker's whole value is promoting something
 * the fused ranking put below the cut — a pool the size of k can only reorder
 * what would have been shown anyway, and would measure nothing.
 */
export const DEFAULT_POOL = 50;

/**
 * Passages per forward pass.
 *
 * 4, because padding is charged per batch — see `scoreAll`, where the
 * measurements are. Overridable for a machine with room to spare.
 */
const RERANK_BATCH = Number(process.env.RERANK_BATCH ?? 4);

/**
 * Characters of a passage handed to the cross-encoder.
 *
 * These models take 512 WORDPIECE tokens including the question, and silently
 * truncate beyond it. 2000 characters is roughly that budget for English prose;
 * the number is a guard against pathological input, not a tuning knob. Anything
 * past it was going to be dropped by the tokenizer regardless — the difference
 * is that this way it is dropped somewhere a reader can see.
 */
export const DEFAULT_MAX_CHARS = 2000;

export type RerankerChoice = 'none' | 'local';

/**
 * Is reranking on? `RERANK=local` turns it on; anything else leaves it off.
 *
 * OFF BY DEFAULT, and that is the honest setting until a measurement says
 * otherwise. Shipping a stage on the grounds that it is usually an improvement
 * is how a retrieval pipeline acquires parts nobody can account for.
 */
export function rerankerChoice(): RerankerChoice {
  return (process.env.RERANK ?? '').toLowerCase() === 'local' ? 'local' : 'none';
}

export interface RerankOptions {
  /** Cross-encoder id. Must be a SEQUENCE CLASSIFICATION model, not an embedder. */
  model?: string;
  /** How many candidates to re-score. The rest keep their fused order, below. */
  pool?: number;
  maxChars?: number;
}

export interface RerankUsage {
  /** Candidates actually put through the model. */
  scored: number;
  /** Milliseconds spent in the model, excluding the one-time load. */
  ms: number;
  /** Milliseconds spent loading the model. Zero on every call after the first. */
  loadMs: number;
}

/** Reset between measured runs, the way `embeddingUsage` is. */
export const rerankUsage: RerankUsage = { scored: 0, ms: 0, loadMs: 0 };

type Pair = { tokenizer: unknown; model: unknown };
let cached: Promise<Pair> | undefined;
let cachedId: string | undefined;

/**
 * Load the cross-encoder once per process.
 *
 * Cached on the MODEL ID as well as on existence: a process that reranked with
 * one model and then asked for another would otherwise silently keep scoring
 * with the first, and every number after the switch would be attributed to the
 * wrong model.
 */
async function load(id: string): Promise<Pair> {
  if (cached && cachedId === id) return cached;
  cachedId = id;
  const t0 = Date.now();
  cached = (async () => {
    let lib: any;
    try {
      // Lazy, and by a computed specifier so a bundler does not try to follow it
      // into an optional dependency that may not be installed.
      lib = await import(/* webpackIgnore: true */ '@huggingface/transformers');
    } catch {
      throw new Error(
        'RERANK is on but @huggingface/transformers is not installed. It is an ' +
          'optional dependency (~200 MB). Install it, or unset RERANK.',
      );
    }
    const [tokenizer, model] = await Promise.all([
      lib.AutoTokenizer.from_pretrained(id),
      lib.AutoModelForSequenceClassification.from_pretrained(id, { dtype: 'fp32' }),
    ]);
    rerankUsage.loadMs += Date.now() - t0;
    return { tokenizer, model } as Pair;
  })();
  return cached;
}

/**
 * Score every (question, passage) pair. One batched forward pass.
 *
 * THE OUTPUT IS A RAW LOGIT AND IS NOT CALIBRATED. It is comparable BETWEEN
 * passages for one question and meaningless across questions — the same way
 * `Scored.score` from the fuser is a within-result-set rank, not a quality
 * score. Anyone tempted to threshold on it should read the note in `hybrid.ts`
 * about why there is no score cutoff.
 */
async function scoreAll(
  question: string,
  passages: string[],
  id: string,
): Promise<number[]> {
  if (passages.length === 0) return [];
  const { tokenizer, model } = await load(id);
  const t0 = Date.now();

  // SCORED IN SMALL, LENGTH-SORTED BATCHES, and both halves are load-bearing.
  //
  // One call with all 50 is the obvious shape and it is the expensive one.
  // MEASURED on 50 passages averaging 924 characters, pinned to one core:
  //
  //   all 50 at once   1,020 ms   peak RSS 1,523 MB
  //   batches of 16      491 ms   peak RSS   284 MB
  //   batches of 8       473 ms   peak RSS   236 MB
  //   batches of 4       336 ms   peak RSS   217 MB
  //
  // Smaller is FASTER AND LIGHTER, which reads as a mistake until you see the
  // cause: `padding: true` pads every passage in a batch to the longest one in
  // it. One 1,400-character narrative among three short ones makes all four
  // cost 1,400. A batch of fifty pads to the longest of fifty, every time.
  //
  // This matters beyond tidiness. The deployment target is an Azure Container
  // App at 0.5 vCPU and 1.0 GiB; 1,523 MB is not a slow path, it is an OOM kill
  // with no stack trace. Sorting by length before batching is the same fix
  // `embeddings.ts` carries for the same reason — see its `embedDocuments`.
  const order = passages.map((_, i) => i).sort((a, b) => passages[a].length - passages[b].length);
  const scores = new Array<number>(passages.length);

  for (let i = 0; i < order.length; i += RERANK_BATCH) {
    const slice = order.slice(i, i + RERANK_BATCH);
    const inputs = (tokenizer as any)(new Array(slice.length).fill(question), {
      text_pair: slice.map((j) => passages[j]),
      padding: true,
      truncation: true,
    });
    const { logits } = await (model as any)(inputs);
    // [n, 1] for a relevance cross-encoder. Take the LAST column rather than
    // index [0], so a model that emits [n, 2] does not silently score on its
    // NEGATIVE class.
    const batch = (logits.tolist() as number[][]).map((row) => row[row.length - 1]!);
    // SCATTERED BACK BY INDEX, NEVER PUSHED. The sort above is for speed only;
    // the caller's order is the contract, and pushing would hand every score to
    // the wrong passage without erring.
    slice.forEach((j, k) => {
      scores[j] = batch[k]!;
    });
  }

  rerankUsage.ms += Date.now() - t0;
  rerankUsage.scored += passages.length;
  return scores;
}

export interface RerankedScored extends Scored {
  /** The cross-encoder's raw logit. Higher is more relevant. Uncalibrated. */
  rerankScore: number;
  /** Position in the FUSED ranking, 1-based — what this hit would have been. */
  fromRank: number;
}

/**
 * Re-score the top `pool` fused hits and return the whole list reordered.
 *
 * Hits beyond the pool are NOT dropped — they keep their fused order and sit
 * below every re-scored hit. Dropping them would make `pool` silently act as a
 * second `k`, and a caller asking for 50 candidates and 6 results would get a
 * different answer depending on a number they thought only affected quality.
 *
 * `fromRank` is on every hit because the interesting output of a reranker is
 * not the new order, it is the MOVEMENT: a passage promoted from 23 to 1 is the
 * case for the stage, and a top-6 that comes back in the same order is the case
 * against it.
 */
export async function rerankHits(
  question: string,
  hits: Scored[],
  opts: RerankOptions = {},
): Promise<RerankedScored[]> {
  const id = opts.model ?? DEFAULT_RERANK_MODEL;
  const pool = Math.max(0, opts.pool ?? DEFAULT_POOL);
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;

  const withRank = hits.map((h, i) => ({ ...h, fromRank: i + 1 }));
  const head = withRank.slice(0, pool);
  const tail = withRank.slice(pool);

  const scores = await scoreAll(question, head.map((h) => textOf(h.doc).slice(0, maxChars)), id);

  const scored: RerankedScored[] = head
    .map((h, i) => ({ ...h, rerankScore: scores[i]! }))
    .sort((a, b) => b.rerankScore - a.rerankScore);

  // Everything the reranker never saw keeps its fused order, below everything
  // it did. `-Infinity` rather than 0: a real logit is frequently negative, and
  // 0 would interleave unscored hits into the middle of the scored ones.
  return [...scored, ...tail.map((h) => ({ ...h, rerankScore: -Infinity }))];
}

/**
 * The text a passage is re-scored on.
 *
 * `pageContent` is what the retriever matched and what the reader will be
 * shown, so it is what the cross-encoder must judge. Deliberately NOT the
 * source-specific body field some callers attach: re-scoring text different
 * from the text that was retrieved measures a pipeline nobody runs.
 */
function textOf(doc: LCDocument): string {
  return doc.pageContent ?? '';
}
