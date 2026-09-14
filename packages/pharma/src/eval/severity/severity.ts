/**
 * WHICH FAILURES ARE DANGEROUS — in THIS domain.
 *
 * `@fde/evals` ships no default, deliberately: which failures matter is a
 * judgment about what a user does with a wrong answer, and no harness can guess
 * it. Here the asymmetry is sharp and legal, not merely practical — a lot
 * wrongly cleared can reach patients, and a lot wrongly held costs a day of a
 * QP's time. The two are not comparable and must never be averaged.
 *
 * Failure types are reported SEPARATELY, because each needs a different
 * response:
 *
 *   false answer    missed a blocker, settled a question a human owns, judged
 *                   by the wrong market's limits, or cited something that does
 *                   not exist. The dangerous one.
 *   over-caution    blocked or escalated a lot that was clean. Annoying,
 *                   visible immediately, cheap to fix — and NOT safe: an
 *                   assistant that blocks everything is ignored within a week,
 *                   after which it protects nothing.
 *   no answer       hit the turn cap, blew the schema, or a tool threw. NOT a
 *                   model judgment failure — infrastructure or budget, and the
 *                   fix is config, not prompt.
 *   missing fixture a replay run took a tool path never recorded. Also
 *                   infrastructure, and specifically not evidence about the
 *                   model.
 */
import type { Baseline, CaseOutcome, CaseReport, Severity, Summary } from '@fde/evals';
import type { ReleaseAnswer } from '../../schema/release-schema';

/**
 * Failing any of these means the answer cannot be trusted:
 *
 *   blocker            missed a finding that prevents release — the worst
 *   escalates          settled a release question that is legally a QP's
 *   does_not_clear     stated a batch may ship. Nothing is worse than this
 *   governing_spec     judged by the wrong market's specification
 *   cites_clause       described a rule without reading it
 *   cites_revision     applied a revision that did not govern the act
 *   citations_dated    a citation consistent with the answer and its opposite
 *   citations_resolve  cited something that does not exist
 *   no_invented_market answered about a market the estate has no rows for
 *   has_answer         claimed an answer and gave none
 *   calls_assess_first answered before walking the records
 *   answer_contains/lacks  a required figure missing, or a forbidden one present
 *
 * `concern` is deliberately ABSENT: reporting a concern as a blocker is
 * over-caution, and missing one is a gap in completeness rather than a wrong
 * release decision.
 *
 * `no_blockers` and `does_not_escalate` are the over-caution pair.
 */
const FALSE_ANSWER_CHECKS =
  /^(blocker|escalates|does_not_clear|governing_spec|cites_clause|cites_revision|citations_dated|citations_resolve|no_invented_market|has_answer|calls_assess_first|calls_first|calls_tool|answer_contains|answer_lacks)/;

const OVER_CAUTION_CHECKS = /^(no_blockers|does_not_escalate|concern)/;

export function severityOf(o: CaseOutcome<ReleaseAnswer>): Severity {
  if (o.passed) return 'pass';
  if (o.missingFixture) return 'missing_fixture';
  // BEFORE the checks are read. A broken tool makes the model refuse; that
  // refusal fails `has_answer` and `calls_assess_first`, both of which are
  // false-answer checks — so without this line an infrastructure fault is
  // reported as the most dangerous bucket there is.
  if (o.toolFailed) return 'no_answer';
  if (!o.answer) return 'no_answer';
  if (o.checks.some((r) => !r.pass && FALSE_ANSWER_CHECKS.test(r.name))) return 'false_answer';
  if (o.checks.some((r) => !r.pass && OVER_CAUTION_CHECKS.test(r.name))) return 'over_caution';
  return 'uncategorised';
}

/** The generic harness types bound to this domain, so no consumer repeats it. */
export type Outcome = CaseOutcome<ReleaseAnswer>;
export type Report = CaseReport<ReleaseAnswer>;
export type ReleaseSummary = Summary<ReleaseAnswer>;
export type ReleaseBaseline = Baseline<ReleaseAnswer>;
