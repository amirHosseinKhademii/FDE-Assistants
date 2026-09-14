/**
 * WHICH FAILURES ARE DANGEROUS — in THIS domain.
 *
 * `@fde/evals` deliberately ships no default for this. Which failures matter is
 * a judgment about what your users do with a wrong answer, and no harness can
 * guess it: here a citation that resolves to nothing is dangerous and an
 * unnecessary escalation is merely annoying, because an adjuster repeats the
 * first to a customer and ignores the second. In a triage tool those invert.
 *
 * Failure types are reported SEPARATELY and never averaged, because each needs
 * a different response:
 *
 *   false answer    asserted something unverified as if checked, or cited a
 *                   source that does not exist. The dangerous one.
 *   over-caution    escalated something it could have handled. Annoying,
 *                   visible immediately, cheap to fix.
 *   no answer       hit the turn cap, blew the schema, or threw. NOT a model
 *                   judgment failure — infrastructure or budget, and the fix is
 *                   a config change, not a prompt change.
 *   missing fixture a replay run took a tool path that was never recorded.
 *                   Also infrastructure, and specifically NOT evidence about
 *                   the model.
 *
 * The third category exists because the first run misfiled a max_turns timeout
 * as a "false answer" — a misdiagnosis that sends you rewriting a prompt when
 * the real fix was raising maxTurns.
 */
import type { Baseline, CaseOutcome, CaseReport, Severity, Summary } from '@fde/evals';
import type { CoverageAnswer } from '../schema/coverage-schema';

/**
 * Failing any of these means the answer cannot be trusted:
 *
 *   escalates          did not hand over a question the corpus cannot settle
 *   citations_resolve  cited a document that does not exist
 *   cites_form         cited the wrong policy form — right clause, wrong policy
 *   cites_record       cited the wrong customer record
 *   answer_contains    the correct figure is missing from the answer
 *   answer_lacks       a forbidden figure is present
 *   policy_form_is     reported the customer as being on the wrong form
 *   has_answer         claimed an answer and gave none
 *   cites_something    asserted something with no source at all
 *   flags_conflict     did not report a contradiction that is really there —
 *                      i.e. quietly picked a side, the worst of them
 *   calls_record_first searched before establishing whose policy it is
 *   calls_tool         never consulted a corpus the question required
 *
 * That is every check except `does_not_escalate`, whose failure is merely
 * annoying. `uncategorised` therefore means one thing: somebody added a check
 * and did not classify it.
 */
const FALSE_ANSWER_CHECKS =
  /^(escalates|citations_resolve|cites_form|cites_record|cites_something|flags_conflict|answer_contains|answer_lacks|policy_form_is|has_answer|calls_record_first|calls_tool|calls_first)/;

export function severityOf(o: CaseOutcome<CoverageAnswer>): Severity {
  if (o.passed) return 'pass';
  if (o.missingFixture) return 'missing_fixture';
  // BEFORE the check inspection, deliberately. A broken tool makes the model
  // refuse, that refusal fails `has_answer` and `cites_record`, and both are in
  // FALSE_ANSWER_CHECKS — so without this line an infrastructure fault is
  // reported as the most dangerous bucket there is.
  if (o.toolFailed) return 'no_answer';
  if (!o.answer) return 'no_answer';
  if (o.checks.some((r) => !r.pass && FALSE_ANSWER_CHECKS.test(r.name))) return 'false_answer';
  if (o.checks.some((r) => !r.pass && r.name === 'does_not_escalate')) return 'over_caution';
  return 'uncategorised';
}

/**
 * The generic harness types, bound to THIS domain's answer shape. Imported from
 * here rather than from `@fde/evals` so no consumer has to repeat the binding —
 * and so `CaseOutcome` can never accidentally be left as `unknown`.
 */
export type Outcome = CaseOutcome<CoverageAnswer>;
export type Report = CaseReport<CoverageAnswer>;
export type CoverageSummary = Summary<CoverageAnswer>;
export type CoverageBaseline = Baseline<CoverageAnswer>;
