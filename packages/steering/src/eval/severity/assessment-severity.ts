/**
 * WHICH FAILURES ARE DANGEROUS — for a requirement assessment.
 *
 * ── THE ASYMMETRY, WHICH IS THE WHOLE REASON BUCKETS EXIST ───────────────
 *
 * A pass rate treats every failure as one failure. They are not one thing:
 *
 *   false answer   reported work as ALREADY DONE when the evidence is a claim
 *                  rather than a demonstration; cited a file that does not
 *                  exist; cited a line the sentence is not on; committed the
 *                  company to a price or a delivery; invented a figure; or
 *                  answered before reading anything. **The expensive
 *                  direction** — every one of these produces a confident bid
 *                  line that somebody quotes.
 *
 *   over-caution   refused where history was actually sufficient, or escalated
 *                  a question the documents settle. Annoying, cheap to correct,
 *                  and NOT safe: an assessment that refuses everything is
 *                  ignored inside a week, and then the tool is gone.
 *
 *   no answer      hit the turn cap, failed the schema, or a tool threw.
 *                  Infrastructure. Scoring it against the model's judgement
 *                  points every debugging hour at the prompt — and this suite
 *                  has already seen three runs end this way for three
 *                  different infrastructure reasons.
 *
 * ── WHY `citation_lines_land` IS A FALSE ANSWER AND NOT A NUISANCE ───────
 *
 * A citation with the wrong line looks exactly like a citation with the right
 * one. Somebody opens the file, does not find the sentence, and either wastes
 * an hour or concludes the whole dossier is unreliable. Provenance that is
 * approximately right is the kind of wrong that survives review, which is
 * precisely what makes it dangerous rather than untidy.
 */
import type { Baseline, CaseOutcome, CaseReport, Severity, Summary } from '@fde/evals';
import type { RequirementAssessment } from '../../schema/assessment-schema';

/**
 * Failing any of these means the assessment cannot be trusted in front of a
 * customer.
 *
 * `not_finding` is here and `finding` is too, but they fail for different
 * reasons: `not_finding:have_it` failing means the expensive wrong answer was
 * given, while `finding:` failing means it disagreed with a pinned expectation.
 * Both belong in this bucket; only the first is a safety claim.
 */
const FALSE_ANSWER =
  /^(not_finding|finding|citations_resolve|citation_lines_land|cites_something|no_commitment|no_invented_values|conflict_about|calls_search_first|calls_first|calls_tool)/;

/**
 * The other direction. Currently one check, and that is worth admitting: this
 * suite is better at catching over-confidence than over-caution, because the
 * estate was built to punish the first. A case that refuses where history is
 * ample would need a requirement with a healthy comparable set, and the three
 * cases here do not include one.
 */
const OVER_CAUTION = /^(priced_or_refused|escalates)/;

export function severityOf(o: CaseOutcome<RequirementAssessment>): Severity {
  if (o.passed) return 'pass';
  if (o.missingFixture) return 'missing_fixture';
  if (o.toolFailed) return 'no_answer';
  // No structured answer at all — the schema failed or the turn cap was hit.
  if (!o.answer) return 'no_answer';
  if (o.checks.some((r) => !r.pass && FALSE_ANSWER.test(r.name))) return 'false_answer';
  if (o.checks.some((r) => !r.pass && OVER_CAUTION.test(r.name))) return 'over_caution';
  return 'uncategorised';
}

/** The generic harness types bound to this domain, so no consumer repeats it. */
export type Outcome = CaseOutcome<RequirementAssessment>;
export type Report = CaseReport<RequirementAssessment>;
export type AssessmentSummary = Summary<RequirementAssessment>;
export type AssessmentBaseline = Baseline<RequirementAssessment>;
