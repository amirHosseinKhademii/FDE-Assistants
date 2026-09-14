/**
 * Every number in the bid summary, computed in code. No model is called here.
 *
 * ── WHY THE ARITHMETIC IS NOT THE MODEL'S JOB ────────────────────────────
 *
 * `docs/steering/NEXT.md` §4 sets two rules for the summary: it must not
 * re-derive a finding, and it must not total a refusal into a number. Both can
 * be written into a prompt, and a prompt is a request. Written here they are
 * properties: the mix is a tally of stored strings, and the total is a sum over
 * a list that a refusal is never added to, because `price()` below filters it
 * out before the addition happens.
 *
 * That leaves the model two jobs, and both are genuinely linguistic — what the
 * refusals have in common, and which questions for humans are the same
 * question. Neither is arithmetic and neither can be done by counting.
 *
 * ── THE DENOMINATOR IS HANDED IN ─────────────────────────────────────────
 *
 * `requirementRefs` comes from the caller, the same way the requirement text is
 * handed to the assessment loop rather than searched for. It is what makes the
 * output read "9 of 24, 15 not yet assessed" rather than "9 assessments" — and
 * those are different claims, one of which is a summary of a third of a bid
 * that reads like a summary of a bid.
 */
import type { RequirementAssessment } from '../../schema/assessment-schema';
import { FINDINGS } from '../../schema/assessment-schema';
import type { FiledAssessment, FiledHistory } from '../../answer/filed-assessments';

export type Finding = (typeof FINDINGS)[number];

/** A requirement history could price. */
export interface PricedItem {
  ref: string;
  hours: number;
  eur: number;
  /** How many past jobs the figure rests on. The evidence behind the money. */
  jobs: number;
}

/** A requirement history refused to price, and why it said so. */
export interface UnpricedItem {
  ref: string;
  finding: Finding;
  /** `cost.refused_because`, verbatim. Never summarised into "no data". */
  why: string;
  /**
   * `null` means the loop never ran a comparables query; `0` means it ran one
   * and history held nothing. Carried through undamaged because the difference
   * is the whole point of the field — see the answer schema.
   */
  jobs: number | null;
}

export interface OpenQuestion {
  ref: string;
  question: string;
  owner: string;
  whyItMatters: string;
}

export interface RollUp {
  /** What was asked for, in total. */
  requirementCount: number;
  assessedRefs: string[];
  /** Named, not counted: "which 15 are missing" is the actionable half. */
  notAssessedRefs: string[];
  /** Assessed references that are not in the requirement list at all. */
  unexpectedRefs: string[];
  mix: Record<Finding, number>;
  priced: PricedItem[];
  unpriced: UnpricedItem[];
  /** Sum over `priced` only. There is no code path that adds an unpriced item. */
  eurTotal: number;
  hoursTotal: number;
  /** Past jobs behind the total. The evidence count that travels with the money. */
  jobsBehindTotal: number;
  /** How many unpriced items were never asked — `comparable_jobs === null`. */
  neverAsked: number;
  citations: number;
  conflicts: { ref: string; about: string }[];
  questions: OpenQuestion[];
  /** Everything the history reader had to set aside, carried so it can be printed. */
  history: Omit<FiledHistory, 'answered'>;
}

const emptyMix = (): Record<Finding, number> =>
  Object.fromEntries(FINDINGS.map((f) => [f, 0])) as Record<Finding, number>;

/**
 * Priced or not, decided by ONE field.
 *
 * `median_hours === null` is the refusal marker the answer contract already
 * uses, and `eur` is checked too rather than trusted: a row with hours and no
 * euro figure is not a priced item, and reading `eur ?? 0` into the total would
 * be the exact failure §4 forbids, written as a defaulting operator.
 */
function isPriced(a: RequirementAssessment): boolean {
  return a.cost.median_hours !== null && a.cost.eur !== null && a.cost.comparable_jobs !== null;
}

function priced(filed: FiledAssessment[]): PricedItem[] {
  return filed
    .filter((f) => isPriced(f.assessment))
    .map((f) => ({
      ref: f.ref,
      hours: f.assessment.cost.median_hours as number,
      eur: f.assessment.cost.eur as number,
      jobs: f.assessment.cost.comparable_jobs as number,
    }));
}

function unpriced(filed: FiledAssessment[]): UnpricedItem[] {
  return filed
    .filter((f) => !isPriced(f.assessment))
    .map((f) => ({
      ref: f.ref,
      finding: f.assessment.finding,
      why: f.assessment.cost.refused_because ?? 'no reason was recorded',
      jobs: f.assessment.cost.comparable_jobs,
    }));
}

function questions(filed: FiledAssessment[]): OpenQuestion[] {
  return filed.flatMap((f) =>
    f.assessment.decisions_for_human.map((d) => ({
      ref: f.ref,
      question: d.question,
      owner: d.suggested_owner,
      whyItMatters: d.why_it_matters,
    })),
  );
}

/**
 * The whole tally, from filed assessments and the list of requirements asked
 * for. Pure: same input, same output, no clock and no connection.
 */
export function rollUp(history: FiledHistory, requirementRefs: string[]): RollUp {
  const filed = history.answered;
  const asked = new Set(requirementRefs);
  const assessedRefs = filed.map((f) => f.ref);
  const assessed = new Set(assessedRefs);

  const mix = emptyMix();
  for (const f of filed) mix[f.assessment.finding]++;

  const p = priced(filed);
  const u = unpriced(filed);
  const { answered: _drop, ...rest } = history;

  return {
    requirementCount: requirementRefs.length,
    assessedRefs,
    notAssessedRefs: requirementRefs.filter((r) => !assessed.has(r)),
    unexpectedRefs: assessedRefs.filter((r) => !asked.has(r)),
    mix,
    priced: p,
    unpriced: u,
    eurTotal: p.reduce((a, x) => a + x.eur, 0),
    hoursTotal: p.reduce((a, x) => a + x.hours, 0),
    jobsBehindTotal: p.reduce((a, x) => a + x.jobs, 0),
    neverAsked: u.filter((x) => x.jobs === null).length,
    citations: filed.reduce((a, f) => a + f.assessment.citations.length, 0),
    conflicts: filed.flatMap((f) =>
      f.assessment.conflicts.map((c) => ({ ref: f.ref, about: c.about })),
    ),
    questions: questions(filed),
    history: rest,
  };
}

/**
 * The sentence that must appear wherever the total does.
 *
 * Written once, in code, and NOT asked of the model — this is the same refusal
 * a single assessment already makes, and a summary is exactly where somebody
 * lifts a figure into a slide.
 */
export const NOT_THE_QUOTE =
  'This is what comparable past work cost. It is not a quote: it carries no ' +
  'margin, no risk allowance, no programme management and no commercial terms, ' +
  'and it covers only the requirements that were priced.';
