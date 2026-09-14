/**
 *   pnpm severity:check
 *
 * Does every check map to a severity bucket? OFFLINE — no model, no database.
 *
 * THE ASSERTIONS ARE GENERIC AND LIVE IN `@fde/evals` (`verifyClassifier`).
 * This file used to re-implement them, which was a mistake worth recording:
 * the package's version carries a scar this one did not, from an infrastructure
 * branch that shipped INVERTED and reported 25 broken-plumbing runs as
 * dangerous false answers. Re-implementing a check throws away the bugs it
 * already survived.
 *
 * What is left here is the only part that cannot transfer: WHICH checks this
 * suite uses, and which of them are merely annoying rather than dangerous.
 *
 * `uncategorised` is a bug, not a category. It means somebody added a check and
 * never said whether failing it reaches a patient or wastes an hour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyClassifier, type CaseOutcome } from '@fde/evals';
import { REPO_ROOT } from '../../config/connections';
import { severityOf } from './severity';
import type { ReleaseAnswer } from '../../schema/release-schema';

const CASES = resolve(REPO_ROOT, 'docs', 'pharma', 'evals', 'cases.jsonl');

/** Every check the suite actually names. Read from the cases, never re-listed. */
const CHECK_NAMES = [
  ...new Set(
    readFileSync(CASES, 'utf8')
      .split('\n')
      .filter(Boolean)
      .flatMap((l) => JSON.parse(l).checks as string[]),
  ),
].sort();

/** A FAILED outcome whose only failing check is `name`. */
const makeOutcome = (name: string): CaseOutcome<ReleaseAnswer> => ({
  id: 'x',
  run: 1,
  passed: false,
  ms: 0,
  inputTokens: 0,
  outputTokens: 0,
  toolCalls: 1,
  turns: 1,
  stoppedBecause: 'model_finished',
  toolFailed: false,
  missingFixture: false,
  checks: [{ name, pass: false, detail: '' }],
  answer: {} as ReleaseAnswer,
});

console.log('\nSeverity self-test — does every check map to a bucket?\n');

const result = verifyClassifier<ReleaseAnswer>({
  checkNames: CHECK_NAMES,
  severityOf,
  makeOutcome,

  /**
   * The three whose failure is merely ANNOYING rather than dangerous: holding a
   * clean lot, escalating one that did not need it, reporting a concern as
   * something worse.
   *
   * Annoying is not safe. An assistant that blocks everything is ignored within
   * a week, after which it protects nothing — which is why these are reported
   * as their own bucket and never averaged into a pass rate.
   */
  expectedOverCaution: CHECK_NAMES.filter((n) =>
    /^(no_blockers|does_not_escalate|concern)/.test(n),
  ),

  // The branches that do not key off a check name at all.
  outcomeCases: [
    {
      what: 'a thrown tool is infrastructure, not a false answer',
      outcome: { ...makeOutcome('escalates'), toolFailed: true },
      expect: 'no_answer',
      why: 'a broken tool makes the model refuse; the fix is the plumbing, not the prompt',
    },
    {
      what: 'control: the SAME outcome without toolFailed IS dangerous',
      outcome: makeOutcome('escalates'),
      expect: 'false_answer',
      why: 'if this were also no_answer the rule would swallow every real failure',
    },
    {
      what: 'a missing fixture is infrastructure too',
      outcome: { ...makeOutcome('escalates'), missingFixture: true },
      expect: 'missing_fixture',
      why: 'a replay run took a path never recorded — not evidence about the model',
    },
    {
      what: 'an invented check is uncategorised, loudly',
      outcome: makeOutcome('some_check_nobody_wrote'),
      expect: 'uncategorised',
      why: 'if this were classified, the gate would pass anything and prove nothing',
    },
  ],
});

for (const l of result.lines) console.log(l);
console.log('');
process.exit(result.passed ? 0 : 1);
