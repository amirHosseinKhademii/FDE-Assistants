/**
 * metrics.ts — Pure retrieval metrics (recall@k, MRR, hit-rate).
 *
 * All functions take ranked doc ids (best first) and the set of gold doc ids
 * for one question. No I/O, no randomness.
 *
 * Per-case conventions (see docs/wrap/PLAN.md Step 1.2):
 * - recall@k for one case is 1 if any gold doc is in the top k, else 0.
 *   Aggregate recall@k is the mean over cases.
 * - reciprocal rank is 1 / (1-based rank of the first gold doc), 0 if none.
 * - hit = any gold doc in the top 10.
 */

export const HIT_DEPTH = 10;

export function rankOfFirstMatch(retrieved: string[], gold: string[]): number | null {
  const goldSet = new Set(gold);
  for (let i = 0; i < retrieved.length; i++) {
    if (goldSet.has(retrieved[i])) return i + 1;
  }
  return null;
}

export function recallAtK(retrieved: string[], gold: string[], k: number): number {
  const rank = rankOfFirstMatch(retrieved.slice(0, k), gold);
  return rank === null ? 0 : 1;
}

export function reciprocalRank(retrieved: string[], gold: string[]): number {
  const rank = rankOfFirstMatch(retrieved, gold);
  return rank === null ? 0 : 1 / rank;
}

export function hitAtDepth(retrieved: string[], gold: string[], depth = HIT_DEPTH): boolean {
  return rankOfFirstMatch(retrieved.slice(0, depth), gold) !== null;
}

export interface CaseMetrics {
  recall_at_3: number;
  recall_at_6: number;
  recall_at_10: number;
  reciprocal_rank: number;
  hit: boolean;
  rank_of_first_match: number | null;
}

export function scoreCase(retrieved: string[], gold: string[]): CaseMetrics {
  return {
    recall_at_3: recallAtK(retrieved, gold, 3),
    recall_at_6: recallAtK(retrieved, gold, 6),
    recall_at_10: recallAtK(retrieved, gold, 10),
    reciprocal_rank: reciprocalRank(retrieved, gold),
    hit: hitAtDepth(retrieved, gold),
    rank_of_first_match: rankOfFirstMatch(retrieved, gold),
  };
}

export interface AggregateMetrics {
  recall_at_3: number;
  recall_at_6: number;
  recall_at_10: number;
  mrr: number;
  hit_rate: number;
}

const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function aggregate(cases: CaseMetrics[]): AggregateMetrics {
  return {
    recall_at_3: mean(cases.map(c => c.recall_at_3)),
    recall_at_6: mean(cases.map(c => c.recall_at_6)),
    recall_at_10: mean(cases.map(c => c.recall_at_10)),
    mrr: mean(cases.map(c => c.reciprocal_rank)),
    hit_rate: mean(cases.map(c => (c.hit ? 1 : 0))),
  };
}
