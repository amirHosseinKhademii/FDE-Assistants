/**
 * stub-retrieve.ts — Deterministic stand-in for real retrieval (Step 1.2 harness test).
 *
 * Returns a different ranking per query: the corpus doc ids are shuffled with a
 * PRNG seeded from sha256(query). For about one query in three, the question's
 * first gold doc is spliced into the top 10, so the metrics show hits and misses.
 * Same query + same corpus always gives the same ranking.
 *
 * This is NOT retrieval. It peeks at the golden gold sets to decide when to
 * include a hit. Phase 2 replaces it with real hybrid search.
 *
 * Doc ids are repo-relative paths, the same format as golden `expected_sources`.
 */

import { createHash } from 'node:crypto';

export type Retrieve = (query: string, k: number) => Promise<string[]>;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStubRetrieve(
  corpusIds: string[],
  goldByQuery: Map<string, string[]>,
): Retrieve {
  const sortedCorpus = [...corpusIds].sort();

  return async (query: string, k: number): Promise<string[]> => {
    const digest = createHash('sha256').update(query).digest();
    const rand = mulberry32(digest.readUInt32BE(0));

    // Fisher-Yates shuffle of the corpus, seeded by the query.
    const ranking = [...sortedCorpus];
    for (let i = ranking.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [ranking[i], ranking[j]] = [ranking[j], ranking[i]];
    }

    // Sometimes place the gold doc inside the top 10.
    const gold = goldByQuery.get(query) ?? [];
    const includeGold = gold.length > 0 && digest[4] % 3 === 0;
    if (includeGold) {
      const target = gold[0];
      const without = ranking.filter(id => id !== target);
      const position = digest[5] % 10;
      without.splice(position, 0, target);
      return without.slice(0, k);
    }
    return ranking.slice(0, k);
  };
}
