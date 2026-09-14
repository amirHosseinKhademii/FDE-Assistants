/**
 * VERIFY A SEVERITY CLASSIFIER — offline, instant, free.
 *
 * A classifier decides which failures are dangerous, and it is the one piece of
 * the harness no package can supply. That makes it the piece most likely to
 * drift: somebody adds a check, forgets to classify it, and the printed card
 * quietly under-reports the category that matters.
 *
 * THAT IS NOT HYPOTHETICAL. A wrong dollar figure once landed in
 * `uncategorised` while the card said "false answers: 1", because a new check
 * had no severity. The count was wrong in the safe-looking direction.
 *
 * So this asserts two things:
 *
 *   1. EVERY registered check maps to a bucket. A check with no severity is a
 *      silent hole in the metric you steer by.
 *   2. THE FALL-THROUGH STILL FIRES. An unknown check must land in
 *      `uncategorised`. If it does not, the classifier is matching everything —
 *      which passes test 1 for the worst possible reason, and would mean a
 *      classifier that called every failure dangerous scores perfectly.
 *
 * The second is the negative control, and without it the first proves nothing.
 */
import type { CaseOutcome, Severity, SeverityClassifier } from './scorecard';

export interface ClassifierVerification {
  passed: boolean;
  lines: string[];
}

/**
 * Check a classifier against every check name it is expected to handle.
 *
 * `makeOutcome` builds a failing outcome for a given check name. It is yours
 * because only you know what a minimal valid answer looks like — and the
 * classifier usually cares whether one is present at all.
 */
export function verifyClassifier<A>(opts: {
  checkNames: string[];
  severityOf: SeverityClassifier<A>;
  /** A FAILED outcome whose only failing check is `name`. */
  makeOutcome(name: string): CaseOutcome<A>;
  /** Names expected to be merely annoying rather than dangerous. */
  expectedOverCaution?: string[];
  /**
   * Extra assertions of the form "this outcome must land in this bucket".
   *
   * For the rules that do not key off a CHECK NAME at all — an infrastructure
   * fault, a turn-cap timeout. Those branches are invisible to the sweep above,
   * so without this they sit in the classifier untested, which is how one of
   * them shipped inverted and reported 25 broken-plumbing runs as dangerous
   * false answers.
   */
  outcomeCases?: Array<{ what: string; outcome: CaseOutcome<A>; expect: Severity; why: string }>;
}): ClassifierVerification {
  const lines: string[] = [];
  let passed = true;

  const record = (ok: boolean, what: string, got: Severity, why: string) => {
    if (!ok) passed = false;
    lines.push(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}`);
    lines.push(`        → ${got}`);
    lines.push(`        why: ${why}`);
  };

  for (const name of opts.checkNames) {
    const sev = opts.severityOf(opts.makeOutcome(name));
    const expected = opts.expectedOverCaution?.includes(name) ? 'over_caution' : 'false_answer';
    record(
      sev === expected,
      `${name} is classified`,
      sev,
      sev === 'uncategorised'
        ? 'UNCLASSIFIED — it would be counted as harmless, which is the wrong direction to be wrong in'
        : `expected ${expected}`,
    );
  }

  for (const c of opts.outcomeCases ?? []) {
    const sev = opts.severityOf(c.outcome);
    record(sev === c.expect, c.what, sev, `expected ${c.expect} — ${c.why}`);
  }

  // THE NEGATIVE CONTROL. Without it, a classifier that returned
  // 'false_answer' for everything would pass every assertion above.
  const unknown = opts.severityOf(opts.makeOutcome('a_check_that_does_not_exist'));
  record(
    unknown === 'uncategorised',
    'an unknown check falls through to uncategorised',
    unknown,
    'if this were classified, the rule would be matching everything and proving nothing',
  );

  return { passed, lines };
}
