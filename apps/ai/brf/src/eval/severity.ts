/**
 * Which failures are dangerous in this application.
 *
 * @fde/evals ships no default for this. Which failures matter depends on what the user
 * does with a wrong answer, and no harness can guess that. Here, a made-up rule that a
 * board member repeats to a resident is dangerous. An unnecessary escalation is only
 * annoying, because the board reads it and decides. A triage tool would invert that.
 *
 * Failure types are reported separately and never averaged, because each one needs a
 * different response:
 *
 *   false answer     asserted something unsupported as if it were checked, cited a
 *                    source that does not exist, or hid a conflict. The dangerous one.
 *   over-caution     escalated something it could have answered. Annoying, cheap to fix.
 *   no answer        hit the turn cap, failed the schema, or a tool threw. Infrastructure
 *                    or budget, so the fix is configuration, not the prompt.
 *   missing fixture  a replay run took a path that was never recorded. Says nothing about
 *                    the model.
 */
import type { Baseline, CaseOutcome, CaseReport, Severity, Summary } from '@fde/evals';
import type { BrfAnswer } from '../schema/answer-schema';

/**
 * Failing any of these means the answer cannot be trusted:
 *
 *   escalates          did not hand over a question the documents cannot settle
 *   citations_resolve  cited a file or section that does not exist
 *   cites_something    asserted something with no source at all
 *   flags_conflict     did not report a contradiction that is really there, which means
 *                      it quietly picked a side, the worst of them
 *   answer_contains    the correct wording is missing from the answer
 *   answer_lacks       a forbidden claim is present
 *   has_answer         claimed an answer and gave none
 *   calls_first        a required tool was not called first
 *   calls_tool         never consulted the corpus the question needed
 *
 * `does_not_escalate` is the only check whose failure is merely annoying.
 * `uncategorised` therefore means one thing: somebody added a check and did not classify it.
 */
const FALSE_ANSWER_CHECKS =
  /^(escalates|citations_resolve|cites_something|flags_conflict|answer_contains|answer_lacks|has_answer|calls_first|calls_tool)/;

export function severityOf(o: CaseOutcome<BrfAnswer>): Severity {
  if (o.passed) return 'pass';
  if (o.missingFixture) return 'missing_fixture';
  // Checked before the check inspection, on purpose. A broken tool makes the model
  // refuse, and that refusal fails has_answer, which is in FALSE_ANSWER_CHECKS. Without
  // this line an infrastructure fault would be reported as the most dangerous bucket.
  if (o.toolFailed) return 'no_answer';
  if (!o.answer) return 'no_answer';
  if (o.checks.some((r) => !r.pass && FALSE_ANSWER_CHECKS.test(r.name))) return 'false_answer';
  if (o.checks.some((r) => !r.pass && r.name === 'does_not_escalate')) return 'over_caution';
  return 'uncategorised';
}

/** The generic harness types, bound to this application's answer shape. */
export type Outcome = CaseOutcome<BrfAnswer>;
export type Report = CaseReport<BrfAnswer>;
export type BrfSummary = Summary<BrfAnswer>;
export type BrfBaseline = Baseline<BrfAnswer>;
