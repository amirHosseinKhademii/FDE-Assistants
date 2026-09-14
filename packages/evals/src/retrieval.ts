/**
 * Scoring retrieval, separately from scoring an answer.
 *
 * WHY THIS IS ITS OWN THING. An answer eval scores the FINAL output, which is
 * also what hides a retrieval failure: on a small index a model reaches the
 * right answer while the retriever was mediocre, because a mediocre top-k out
 * of thirty still contains the right passage often enough. Grow the corpus and
 * that luck evaporates with no warning, because the only signal was an answer
 * score that had been green all along.
 *
 * ══ WHAT IS YOURS, AND IT IS EXACTLY ONE THING ════════════════════════════
 *
 * `labelOf` — how a retrieved chunk names itself.
 *
 * That function is the entire domain. In a pharmaceutical corpus a label is a
 * revision and a clause (`SOP-QC-014 Rev 7 §7.3`), because the same clause
 * number means different things in two revisions. In an insurance corpus it is
 * a form edition and a section. In yours it is something else, and this package
 * must never guess.
 *
 * Everything below — recall@k, MRR, the pass rule, the summary — is arithmetic
 * over labels and knows nothing about what a label is.
 *
 * ══ WHY A LABEL IS NOT A CHUNK ID ═════════════════════════════════════════
 *
 * A clause can span two chunks. Both carry the same label, either satisfies the
 * expectation, and that is correct: "did the model get §7.2 in front of it" is
 * the question, and it did. Scoring on chunk identity makes a long clause
 * unscoreable and breaks again at every future document long enough to split.
 */

/** One labelled retrieval case. The `expect` labels are the whole judgement. */
export interface RetrievalCase {
  id: string;
  /** The question, as the caller's system would phrase it. */
  query: string;
  /** How deep to look — what the model actually sees. */
  k: number;
  /** Labels that MUST appear in the top k. */
  expect: string[];
  /**
   * Labels that must NOT appear. Use sparingly, and never for a document that
   * is legitimately reachable: if your retriever deliberately returns
   * superseded editions so a later filter can choose between them, rejecting
   * the sibling here fails a system behaving exactly as designed.
   */
  reject?: string[];
  tags?: string[];
  note?: string;
}

export interface CaseScore {
  id: string;
  /** Fraction of expected labels found in the top k. 1 is a pass. */
  recall: number;
  found: string[];
  missing: string[];
  /** Rejected labels that turned up anyway. Non-empty is a failure. */
  intruders: string[];
  /** 1 / (rank of the first expected label), 0 if none. REPORTED, NOT GATED. */
  rr: number;
  /** What came back, in order, for reading a failure. `null` = unlabelled. */
  ranked: (string | null)[];
  pass: boolean;
}

/**
 * Score one case against the ranked labels a retriever returned.
 *
 * TAKES LABELS, NOT CHUNKS, so it can be exercised against a hand-written
 * ranking with no database and no embedding model. A scorer that can only run
 * against live infrastructure is a scorer nobody proves can fail.
 */
export function scoreCase(c: RetrievalCase, ranked: (string | null)[]): CaseScore {
  const topK = ranked.slice(0, c.k);
  const found = c.expect.filter((e) => topK.includes(e));
  const missing = c.expect.filter((e) => !topK.includes(e));
  const intruders = (c.reject ?? []).filter((r) => topK.includes(r));

  const firstRank = topK.findIndex((l) => l !== null && c.expect.includes(l));

  return {
    id: c.id,
    recall: c.expect.length === 0 ? 1 : found.length / c.expect.length,
    found,
    missing,
    intruders,
    rr: firstRank === -1 ? 0 : 1 / (firstRank + 1),
    ranked: topK,
    pass: missing.length === 0 && intruders.length === 0,
  };
}

export interface RetrievalSummary {
  cases: number;
  passed: number;
  /** Mean recall@k. The number the suite is judged on. */
  recall: number;
  /** Mean reciprocal rank. An OBSERVATION, deliberately not a gate. */
  mrr: number;
}

/**
 * WHY MRR IS REPORTED AND NEVER GATED.
 *
 * Rank is the first thing anyone wants to assert and the first thing that goes
 * red for no reason. Which of two CORRECT passages edges ahead is embedding
 * tie-breaking, not quality — and the caller that this was extracted from had
 * already been forced to relax exactly that assertion once, from "at rank 1" to
 * "in the top k", because the right clause came back first for one phrasing and
 * second for another.
 *
 * So MRR is recorded and watched over time. A suite that cries wolf gets muted,
 * which costs more than never having built it.
 */
export function retrievalSummary(scores: CaseScore[]): RetrievalSummary {
  const n = scores.length;
  const mean = (xs: number[]): number => (n === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / n);
  return {
    cases: n,
    passed: scores.filter((s) => s.pass).length,
    recall: mean(scores.map((s) => s.recall)),
    mrr: mean(scores.map((s) => s.rr)),
  };
}

/**
 * Turn a retriever's hits into labels, then score them.
 *
 * `labelOf` returns `null` for a hit that cannot carry a label — a document
 * preamble, a cover page. THAT IS A REAL STATE AND NOT AN ERROR, and it has a
 * consequence worth stating: an unlabelled hit still OCCUPIES a top-k slot but
 * can be neither a hit nor an intruder. So a case whose k fills with unlabelled
 * chunks reports a clean miss rather than "the retriever returned junk", and
 * the two look identical in the recall number. `ranked` is on `CaseScore` for
 * exactly this — the nulls in it are what tell them apart.
 */
export function scoreHits<H>(
  c: RetrievalCase,
  hits: H[],
  labelOf: (hit: H) => string | null,
): CaseScore {
  return scoreCase(c, hits.map(labelOf));
}
