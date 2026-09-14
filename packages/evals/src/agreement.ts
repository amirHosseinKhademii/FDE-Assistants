/**
 * Did two agents converge, or hold their positions?
 *
 * WHAT THIS IS FOR. When two agents argue opposite sides of a question and are
 * then shown each other's case, the hoped-for outcome is that each sharpens.
 * The common outcome — when both are the same model reading the same evidence —
 * is that they drift into agreeing: polite, symmetrical and useless. A second
 * round that produces agreement cost you calls and made the output worse.
 *
 * Nobody makes that judgement by eye twice. This is the number.
 *
 * ══ IT IS WORD OVERLAP, AND THAT IS BLUNT ═════════════════════════════════
 *
 * Two texts sharing content words are probably saying similar things. They may
 * not be. This will not detect two positions that agree in substance while
 * using different vocabulary, and it will over-report agreement between two
 * texts about the same subject.
 *
 * It is here because a blunt number that appears on EVERY run beats a sharp
 * judgement nobody makes twice — the same argument as recall@k over a prose
 * spot check. Read it as a flag to go and look, never as a verdict.
 *
 * ══ WHAT IS YOURS ═════════════════════════════════════════════════════════
 *
 * WHICH FIELDS to compare, and the thresholds. Both are supplied by the caller,
 * and the first one matters more than it looks: a measurement that watches one
 * field gets evaded in another. The caller this was extracted from measured
 * `position` and `strongest_point`, reported "held apart", and had missed a
 * collapse that had moved into the concession field. Watch the field where
 * giving up is CHEAPEST, not the one where it is most visible.
 */

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'is', 'was', 'were',
  'be', 'been', 'that', 'this', 'it', 'its', 'with', 'as', 'by', 'from', 'at', 'not', 'no',
  'has', 'have', 'had', 'are', 'so', 'which', 'there', 'their', 'they', 'we', 'our', 'any',
  'all', 'can', 'could', 'would', 'should', 'may', 'might', 'must', 'will', 'than', 'then',
]);

/** Content words, lowercased, stop-words and short tokens dropped. */
export function contentWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
}

/**
 * How much two texts share, 0 to 1.
 *
 * Normalised by the SMALLER vocabulary, not the union. A two-line concession
 * that is entirely contained in a ten-line argument has conceded that
 * argument — dividing by the union would score it low simply for being short,
 * which is precisely backwards for the thing this measures.
 */
export function overlap(a: string, b: string): number {
  const A = contentWords(a);
  const B = contentWords(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / Math.min(A.size, B.size);
}

export interface AgreementInput {
  /** Each side's position BEFORE it read the other. */
  opening: [string, string];
  /** And after. */
  rebuttal: [string, string];
  /**
   * What each side CONCEDED in the second round, if the shape has such a field.
   *
   * Supply it. This is where a collapse hides — an advocate can hold its stated
   * position while handing the opposing thesis over in the concession, and a
   * measurement that only reads positions will call that "held apart".
   */
  conceded?: [string, string];
}

export interface AgreementResult {
  openingOverlap: number;
  rebuttalOverlap: number;
  /** Positive = they drifted TOGETHER. That is the failure, not the goal. */
  converged: number;
  /** How far each side's own position moved. ~0 means the round bought nothing. */
  moved: [number, number];
  /** How close each concession came to the OTHER side's position. */
  concededAway?: [number, number];
  verdict: 'converged' | 'conceded' | 'static' | 'held';
  /** One line, ready to print. */
  explain: string;
}

export interface AgreementThresholds {
  /** Convergence above this is a failed round. Default 0.1. */
  converged?: number;
  /** A concession this close to the opposing position is a capitulation. Default 0.45. */
  conceded?: number;
  /** Movement below this on BOTH sides means the round changed nothing. Default 0.15. */
  static?: number;
}

/**
 * Measure a two-round disagreement.
 *
 * ORDER OF VERDICTS MATTERS. `converged` is checked first because it is the
 * worst outcome — both sides moved toward each other. `conceded` next, because
 * it is the same failure hiding in a different field. `static` last, because a
 * round that changed nothing merely wasted money, which is the cheapest of the
 * three problems.
 */
export function measureAgreement(
  input: AgreementInput,
  thresholds: AgreementThresholds = {},
): AgreementResult {
  const tConv = thresholds.converged ?? 0.1;
  const tConc = thresholds.conceded ?? 0.45;
  const tStat = thresholds.static ?? 0.15;

  const openingOverlap = overlap(input.opening[0], input.opening[1]);
  const rebuttalOverlap = overlap(input.rebuttal[0], input.rebuttal[1]);
  const converged = rebuttalOverlap - openingOverlap;
  const moved: [number, number] = [
    1 - overlap(input.opening[0], input.rebuttal[0]),
    1 - overlap(input.opening[1], input.rebuttal[1]),
  ];

  const concededAway: [number, number] | undefined = input.conceded && [
    overlap(input.conceded[0], input.rebuttal[1]),
    overlap(input.conceded[1], input.rebuttal[0]),
  ];

  const caved = concededAway
    ? ([0, 1] as const).filter((i) => concededAway[i] > tConc)
    : [];

  let verdict: AgreementResult['verdict'];
  let explain: string;

  if (converged > tConv) {
    verdict = 'converged';
    explain = `CONVERGED — the sides drifted together (${openingOverlap.toFixed(2)} → ${rebuttalOverlap.toFixed(2)}); the second round made it worse`;
  } else if (caved.length) {
    verdict = 'conceded';
    explain = `CONCEDED THE THESIS — side ${caved.map((i) => i + 1).join(' and ')} handed over the opposing position in its concession, not a point of it`;
  } else if (moved[0] < tStat && moved[1] < tStat) {
    verdict = 'static';
    explain = 'STATIC — neither side moved; the second round bought nothing';
  } else {
    verdict = 'held';
    explain = `held apart — overlap ${openingOverlap.toFixed(2)} → ${rebuttalOverlap.toFixed(2)}, both sides moved`;
  }

  return { openingOverlap, rebuttalOverlap, converged, moved, concededAway, verdict, explain };
}
