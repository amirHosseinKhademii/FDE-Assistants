/**
 * STAGE 3.7 — did we find what we already knew?
 *
 * Read `docs/safety/INGESTION.md` §3.7 first; it is the specification this
 * matches, including the decision about WHAT IS COUNTED.
 *
 * ── THE ANSWER KEY IS HAND-WRITTEN, AND THAT IS THE WHOLE POINT ───────────
 *
 * Every target below was decided in `docs/safety/WALKTHROUGH.md` by a person
 * reading the raw files, BEFORE any of this pipeline existed. That is what
 * makes this a measurement rather than a mirror: a key derived from the same
 * code that retrieves would agree with itself no matter how wrong both were.
 *
 * They are therefore NAMED HERE AS LITERALS rather than looked up by query.
 * The one exception is REC-005, and it is explained where it appears.
 *
 * ── WHAT RECALL@6 COUNTS HERE: DOCUMENTS, NOT PASSAGES ────────────────────
 *
 * The key names documents (`ODI 11353867`, campaign `20V197000`). The index
 * holds passages, and an investigation split in two is `RQ24011#0` and
 * `RQ24011#1`. Left alone, one document could occupy two of the six slots and
 * the same retrieval would score differently depending on how the chunker
 * happened to cut. So hits are DE-DUPLICATED BY `documentId` before counting.
 *
 * ── AND WHY THE NUMBER IS COARSE, SAID UP FRONT ───────────────────────────
 *
 * Three cases. Each is worth a third of the total, so the result can tell
 * "works" from "does not" and cannot rank two chunking strategies. Reporting it
 * to three decimal places would be false precision — `docs/evals/README.md`'s
 * rule that a single flaky run prints as MOVED, never as a regression, is the
 * same instinct.
 */

/** One question with a known answer, and how to tell whether retrieval found it. */
export interface MeasureCase {
  id: string;
  /** The question as a fleet analyst would ask it, from WALKTHROUGH.md. */
  question: string;
  /**
   * Documents that must come back, named in the key.
   *
   * Recall for the case is `found / targets.length`, so a case with five
   * targets is not automatically harder than one with two — it is scored on its
   * own denominator before the cases are averaged.
   */
  targets?: string[];
  /**
   * For a case where NO single document is the answer.
   *
   * Takes a retrieved hit's metadata and says whether it is the KIND of thing
   * that makes the answer possible. Only REC-005 uses this, because its correct
   * answer is that no recall exists — see below.
   */
  satisfies?: (meta: Record<string, unknown>) => boolean;
  /** What the key says, so a failure can be read without opening another file. */
  expects: string;
}

/** Is this hit one of the Odyssey forward-collision complaints? */
function odysseyForwardCollision(meta: Record<string, unknown>): boolean {
  const components = JSON.stringify(meta.components ?? '');
  return (
    meta.kind === 'complaint' &&
    meta.make === 'HONDA' &&
    meta.model === 'ODYSSEY' &&
    components.includes('FORWARD COLLISION')
  );
}

export const CASES: MeasureCase[] = [
  {
    id: 'REC-001',
    question:
      'We run 2020 F-150s. Is the transmission park problem a known defect, and is the fix holding?',
    // The campaign is the answer; the complaint is the evidence that it is
    // still being reported four months after owners were notified. Retrieval
    // has to produce BOTH, because either alone gives a wrong answer: the
    // campaign alone says "fixed", the complaint alone says "unknown defect".
    targets: ['20V197000', '11353867'],
    expects: 'campaign 20V197000 and ODI 11353867, both in the top 6',
  },
  {
    id: 'REC-004',
    question: 'Are there any complaints involving a death on the 2019-2020 Tesla Model 3?',
    // FIVE, not twelve. The key said twelve until 2026-09-17, counting rows in
    // a file that carries one row per COMPONENT; these are the five distinct
    // ODINOs. It mattered more than a tidy-up: at twelve targets and six slots,
    // recall@6 had an arithmetic ceiling of 0.5 and a healthy baseline would
    // have read as a failure.
    targets: ['11302656', '11364724', '11473666', '11524321', '11533202'],
    expects: 'as many of the 5 death complaints as 6 slots allow',
  },
  {
    id: 'REC-005',
    question:
      'Is there a recall for the forward-collision braking on the 2019-2020 Honda Odyssey?',
    // THE NEGATIVE CASE, AND THE ONLY ONE NOT NAMED AS LITERALS.
    //
    // The correct answer is that NO recall covers it — verified, zero covering
    // campaigns in the slice. So there is no document to find, and recall@6 is
    // undefined in the ordinary sense. Scoring it 0 would punish retrieval for
    // being right, and scoring it 1 would reward it for nothing.
    //
    // What retrieval owes the model here is the EVIDENCE FOR THE ABSENCE: the
    // 400 complaints that show owners reporting the problem with no campaign
    // behind it. That is what lets an answer say "no recall covers this, and
    // here is why it is still worth your time" instead of guessing.
    //
    // A predicate rather than 400 literals, because the set is the point and
    // any one of them will do. The predicate is stated in WALKTHROUGH.md.
    satisfies: odysseyForwardCollision,
    expects: 'at least one Odyssey forward-collision complaint, and no recall mis-cited',
  },
];

export interface CaseResult {
  id: string;
  question: string;
  expects: string;
  /** 0..1 for this case, on its own denominator. */
  recall: number;
  found: string[];
  missing: string[];
  /** Documents returned, in order, after de-duplication. */
  returned: string[];
  /** Where each found target landed, 1-based. */
  positions: Record<string, number>;
  /** Only meaningful for the negative case: a recall a model might wrongly cite. */
  recallDocsReturned: string[];
  ms: number;
  reranked: boolean;
  /** For reranked runs: where the fused pass had put each found target. */
  movedFrom: Record<string, number>;
}

/**
 * Score one case against what search returned.
 *
 * Takes hits rather than running the search itself, so this function is pure
 * and the CLI owns every connection. It also means the same scoring runs
 * against a reranked list and a plain one without knowing which it has.
 */
export function scoreCase(
  c: MeasureCase,
  hits: Array<{
    id: string;
    kind: string;
    meta: Record<string, unknown>;
    fromRank?: number;
  }>,
  ms: number,
  reranked: boolean,
): CaseResult {
  // DE-DUPLICATED BY documentId, FIRST OCCURRENCE WINS. Two chunks of one
  // investigation are one document at one position — see the header.
  const seen = new Set<string>();
  const docs: Array<{ id: string; meta: Record<string, unknown>; fromRank?: number }> = [];
  for (const h of hits) {
    const docId = String(h.meta.documentId ?? h.id);
    if (seen.has(docId)) continue;
    seen.add(docId);
    docs.push({ id: docId, meta: h.meta, fromRank: h.fromRank });
  }

  const positions: Record<string, number> = {};
  const movedFrom: Record<string, number> = {};
  let found: string[] = [];
  let missing: string[] = [];
  let recall = 0;

  if (c.targets) {
    for (const t of c.targets) {
      const at = docs.findIndex((d) => d.id === t);
      if (at >= 0) {
        found.push(t);
        positions[t] = at + 1;
        if (docs[at].fromRank !== undefined) movedFrom[t] = docs[at].fromRank!;
      } else {
        missing.push(t);
      }
    }
    recall = c.targets.length ? found.length / c.targets.length : 0;
  } else if (c.satisfies) {
    const hit = docs.findIndex((d) => c.satisfies!(d.meta));
    if (hit >= 0) {
      found.push(docs[hit].id);
      positions[docs[hit].id] = hit + 1;
      if (docs[hit].fromRank !== undefined) movedFrom[docs[hit].id] = docs[hit].fromRank!;
      recall = 1;
    } else {
      missing.push('any Odyssey forward-collision complaint');
      recall = 0;
    }
  }

  return {
    id: c.id,
    question: c.question,
    expects: c.expects,
    recall,
    found,
    missing,
    returned: docs.map((d) => d.id),
    positions,
    // Reported for every case, because a recall in the results is exactly what
    // a model would reach for when asked "is there a recall" — and for REC-005
    // the right answer is that there is none.
    recallDocsReturned: docs.filter((d) => d.meta.kind === 'recall').map((d) => d.id),
    ms,
    reranked,
    movedFrom,
  };
}

/** The headline. A plain mean over cases, each already on its own denominator. */
export function overallRecall(results: CaseResult[]): number {
  if (!results.length) return 0;
  return results.reduce((a, r) => a + r.recall, 0) / results.length;
}
