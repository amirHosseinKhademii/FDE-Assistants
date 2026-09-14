/**
 * WHICH FAILURES ARE DANGEROUS — for supplier impact. Sibling of
 * `severity.ts`, same asymmetry: a lot wrongly reported IN our control when it
 * actually reached a patient is the dangerous direction; escalating a lot that
 * was never affected is annoying and cheap to fix, and it is still NOT "safe"
 * — a work list that flags everything is ignored within a week.
 *
 * false answer    reported the wrong exposure band, dropped or invented a row,
 *                 missed the preventable finding, settled a §7.3 outcome
 *                 itself, cited something that does not exist, or answered
 *                 before calling the tool. The dangerous one.
 * over-caution    escalated a row that was safely in our control, escalated
 *                 the whole answer when nothing was preventable, or invented
 *                 rows/preventable findings for a clean supplier.
 * no answer       hit the turn cap, blew the schema, or a tool threw.
 *                 Infrastructure, not a model judgment failure.
 * missing fixture a replay run took a tool path never recorded.
 */
import type { Baseline, CaseOutcome, CaseReport, Severity, Summary } from '@fde/evals';
import type { SupplierImpactAnswer } from '../../schema/supplier-impact-schema';

/**
 * Failing any of these means the work list cannot be trusted:
 *
 *   row_exposure        reported the wrong band for a specific lot
 *   row_finding          dropped a finding the walk attached to a lot
 *   row_escalates         a lot outside our control with no named human
 *   rows_count            a row was dropped or invented
 *   preventable_present   the one preventable finding this bottleneck exists
 *                         to catch is missing
 *   escalates              the top-level (preventable-driven) hand-off is missing
 *   does_not_recall        decided a §7.3 outcome itself — nothing is worse
 *   cites_clause            described SOP-SCM-004 without reading it
 *   citations_resolve       cited something that does not exist
 *   has_answer              claimed an answer and gave none
 *   calls_assess_first      answered before walking the records
 *   answer_contains/lacks   a required fact missing, or a forbidden one present
 */
const FALSE_ANSWER_CHECKS =
  /^(row_exposure|row_finding|row_escalates|rows_count|preventable_present|escalates|does_not_recall|cites_clause|citations_resolve|has_answer|calls_assess_first|calls_first|calls_tool|answer_contains|answer_lacks)/;

/**
 * `no_rows` and `preventable_absent` are the negative-control pair — failing
 * THEM means the model invented exposure that is not there, which is
 * over-caution's own failure direction, not a false answer about a real risk.
 */
const OVER_CAUTION_CHECKS = /^(no_rows|preventable_absent|row_does_not_escalate|does_not_escalate)/;

export function severityOf(o: CaseOutcome<SupplierImpactAnswer>): Severity {
  if (o.passed) return 'pass';
  if (o.missingFixture) return 'missing_fixture';
  if (o.toolFailed) return 'no_answer';
  if (!o.answer) return 'no_answer';
  if (o.checks.some((r) => !r.pass && FALSE_ANSWER_CHECKS.test(r.name))) return 'false_answer';
  if (o.checks.some((r) => !r.pass && OVER_CAUTION_CHECKS.test(r.name))) return 'over_caution';
  return 'uncategorised';
}

/** The generic harness types bound to this domain, so no consumer repeats it. */
export type Outcome = CaseOutcome<SupplierImpactAnswer>;
export type Report = CaseReport<SupplierImpactAnswer>;
export type SupplierImpactSummary = Summary<SupplierImpactAnswer>;
export type SupplierImpactBaseline = Baseline<SupplierImpactAnswer>;
