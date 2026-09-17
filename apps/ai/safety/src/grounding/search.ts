/**
 * STAGES 3.5 AND 3.6 — the two arms, and the fusion that settles them.
 *
 * Read `docs/safety/INGESTION.md` §3.5 and §3.6 first.
 *
 * ── THERE IS ALMOST NOTHING HERE, AND THAT IS THE POINT ───────────────────
 *
 * `@fde/grounding`'s `hybridSearch` already runs both arms in parallel and
 * fuses them by reciprocal rank. This file supplies the two things it cannot
 * know: which database, and what "6 results" means for this engagement.
 *
 * Writing our own fusion here would be the `docs/safety/PLAN.md` §9.6 finding
 * that this engagement needed something new. It does not.
 *
 * ── WHY THE KEYWORD ARM IS NOT OPTIONAL ON THIS CORPUS ────────────────────
 *
 * The things a fleet analyst asks about are tokens, not concepts:
 *
 *   20V197000   a recall campaign      11353867   an ODI complaint number
 *   P0219A      a fault code           PRNDL      the gear indicator
 *
 * A campaign number does not MEAN anything — it IS something. Embed it and the
 * dense arm returns passages that look like they contain campaign numbers. The
 * keyword arm returns that campaign.
 */
import {
  hybridSearch,
  openStore,
  rerankHits,
  rerankerChoice,
  DEFAULT_POOL,
  LocalEmbeddings,
  type Scored,
} from '@fde/grounding';
import type { PGVectorStore } from '@langchain/pgvector';

export const TABLE = 'document_chunks';

/** How many passages an answer is allowed to rest on. */
export const DEFAULT_K = 6;

export interface SearchHit {
  id: string;
  kind: string;
  /** Rank in the meaning arm, 1-based. Absent when only keywords found it. */
  denseRank?: number;
  /** Rank in the keyword arm, 1-based. Absent when only vectors found it. */
  sparseRank?: number;
  /** Fused score, normalised so the best is 1. NOT a similarity. */
  score: number;
  /** The cross-encoder's raw logit, when 3.6b ran. Uncalibrated; higher is better. */
  rerankScore?: number;
  /** Where the fused ranking had put this, before the reranker moved it. */
  fromRank?: number;
  text: string;
  meta: Record<string, unknown>;
}

export interface SearchResult {
  hits: SearchHit[];
  /** False when the keyword arm could not run. Never silently dense-only. */
  fullText: boolean;
  /** Whether 3.6b ran. Reported, never assumed — the two are different numbers. */
  reranked: boolean;
  /** How many candidates the cross-encoder re-scored. 0 when it did not run. */
  pool: number;
  ms: number;
}

/**
 * Open the store for READING.
 *
 * The embedder must be the one stage 3.3 used. `PGVectorStore` calls it to
 * embed the QUESTION, and a different model would place questions in a space
 * the passages do not occupy — returning plausible nonsense with no error
 * anywhere. Same rule as `docs/safety/INDEX.md`'s note on the write side.
 */
export async function openForSearch(connectionString: string): Promise<PGVectorStore> {
  return openStore(new LocalEmbeddings(), { connectionString, tableName: TABLE });
}

/**
 * One question, both arms, fused.
 *
 * NOTE THE OVER-FETCH. `hybridSearch` asks each arm for `k * 4`, so `k = 6`
 * fetches 24 per arm and fuses 48. A passage ranked 20th by meaning and 2nd by
 * keywords has to be IN the lists before fusion can promote it — fetching only
 * 6 from each would throw it away before the step that would have found it.
 */
export async function search(
  store: PGVectorStore,
  connectionString: string,
  query: string,
  k: number = DEFAULT_K,
): Promise<SearchResult> {
  const started = Date.now();

  // 3.6b IS A DECISION MADE BY THE ENVIRONMENT, NOT BY THIS CALL SITE.
  // `RERANK=local` turns it on; anything else leaves it off. Reading it here
  // rather than taking a parameter is what lets 3.7 run the SAME code twice
  // with one variable changed — a harness that passed a flag would be measuring
  // a different call path, not a different pipeline.
  const wantRerank = rerankerChoice() === 'local';

  // FETCH THE POOL, NOT k. A reranker can only reorder what it was handed, so
  // asking for 6 and re-scoring 6 measures nothing: the same six are shown
  // either way. 50 is the pool because the whole value is promoting something
  // fusion put BELOW the cut.
  const depth = wantRerank ? DEFAULT_POOL : k;

  const { hits, fullText } = await hybridSearch(store, query, depth, undefined, {
    tableName: TABLE,
    connectionString,
  });

  if (!wantRerank) {
    return { hits: hits.map(toHit), fullText, reranked: false, pool: 0, ms: Date.now() - started };
  }

  const rescored = await rerankHits(query, hits, { pool: DEFAULT_POOL });
  return {
    hits: rescored.slice(0, k).map(toHit),
    fullText,
    reranked: true,
    pool: Math.min(hits.length, DEFAULT_POOL),
    ms: Date.now() - started,
  };
}

function toHit(s: Scored & { rerankScore?: number; fromRank?: number }): SearchHit {
  const meta = (s.doc.metadata ?? {}) as Record<string, unknown>;
  return {
    id: String(meta.id ?? ''),
    kind: String(meta.kind ?? ''),
    denseRank: s.denseRank,
    sparseRank: s.sparseRank,
    score: s.score,
    rerankScore: s.rerankScore,
    fromRank: s.fromRank,
    text: s.doc.pageContent,
    meta,
  };
}

/**
 * Which arm found this, in one word.
 *
 * EXISTS BECAUSE THE ANSWER IS THE INTERESTING PART. A hit only the keyword arm
 * returned is the case reciprocal-rank fusion handles worst: RRF rewards
 * agreement, so one arm's certainty loses to two arms' indifference. On
 * steering that buried the right passage at rank 35 until a reranker moved it
 * to 1st — see `docs/safety/INGESTION.md` §3.6b.
 */
export function foundBy(hit: SearchHit): 'both' | 'meaning' | 'keywords' {
  if (hit.denseRank && hit.sparseRank) return 'both';
  return hit.denseRank ? 'meaning' : 'keywords';
}
