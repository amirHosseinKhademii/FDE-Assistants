/**
 * `pnpm severity:check` — does every check map to a severity bucket?
 *
 * The assertions are generic and live in `@fde/evals` (`verifyClassifier`),
 * including the negative control that makes them mean anything: an unknown
 * check must fall through to `uncategorised`, or the classifier is matching
 * everything and a rule that called every failure dangerous would score
 * perfectly.
 *
 * What is here is ours: the classifier, the check list, and what a minimal
 * failing outcome looks like for this answer shape.
 *
 * WHY IT MATTERS. A wrong dollar figure once landed in `uncategorised` while
 * the printed card said "false answers: 1", because a newly added check had no
 * severity. The count was wrong in the safe-looking direction — which is the
 * dangerous direction to be wrong in.
 */
import { verifyClassifier, type CaseOutcome } from '@fde/evals';
import { ToolRegistry } from '@fde/agent';
import type { CoverageAnswer } from '../schema/coverage-schema';
import { severityOf } from './severity';
import { CHECK_NAMES } from './checks';

/** Only its PRESENCE matters to the classifier: a run with no answer is `no_answer`. */
const ANSWER: CoverageAnswer = {
  answer: 'x',
  policy_id: null,
  policy_form: null,
  citations: [],
  unverified_claims: [],
  conflicts: [],
  escalate: null,
};

const makeOutcome = (name: string): CaseOutcome<CoverageAnswer> => ({
  id: 'selftest',
  run: 1,
  passed: false,
  missingFixture: false,
  ms: 0,
  turns: 1,
  inputTokens: 0,
  outputTokens: 0,
  toolCalls: 0,
  stoppedBecause: 'model_finished',
  answer: ANSWER,
  checks: [{ name, pass: false, detail: '' }],
});

/**
 * THE POPULATION SIDE, through the REAL dispatcher.
 *
 * The classifier cases below construct outcomes by hand, so they prove what
 * `severityOf` does with a `toolFailed` flag and nothing about where that flag
 * comes from. `dispatch` reports BOTH a thrown tool and an invented tool name
 * as `ok: false`, and the first version of the flag keyed on `ok` alone — which
 * would have excused a model that hallucinated a capability, in a run that made
 * eleven tool calls, by moving the whole run out of the dangerous bucket.
 *
 * So this drives the actual registry and asserts the two are told apart.
 */
async function verifyDispatchCauses(): Promise<boolean> {
  const registry = new ToolRegistry([
    {
      schema: {
        type: 'function',
        name: 'breaks',
        description: 'Always throws, standing in for a dead socket or a bad path.',
        parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
      },
      hasUpstream: false,
      execute: async () => {
        throw new Error('ENOENT: no such file or directory');
      },
    } as any,
  ]);

  const threw = await registry.dispatch('breaks', {});
  const invented = await registry.dispatch('a_tool_the_model_made_up', {});

  const cases: Array<[string, boolean, string]> = [
    [
      'a tool that throws is cause=threw (infrastructure)',
      !threw.ok && threw.cause === 'threw',
      `ok=${threw.ok} cause=${threw.cause} — this is what excuses a refusal`,
    ],
    [
      'an invented tool name is cause=unknown_tool (the model\'s fault)',
      !invented.ok && invented.cause === 'unknown_tool',
      `ok=${invented.ok} cause=${invented.cause} — must NOT excuse the run`,
    ],
    [
      'control: both are ok=false, so `ok` alone cannot tell them apart',
      threw.ok === false && invented.ok === false && threw.cause !== invented.cause,
      'if these ever share a cause, keying the severity flag on it is meaningless',
    ],
  ];

  let ok = true;
  console.log('\nDispatch causes — is a broken tool told apart from an invented one?\n');
  for (const [what, pass, detail] of cases) {
    if (!pass) ok = false;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${what}`);
    console.log(`        ${detail}`);
  }
  return ok;
}

console.log('\nSeverity self-test — does every check map to a bucket?\n');

const result = verifyClassifier<CoverageAnswer>({
  checkNames: CHECK_NAMES,
  severityOf,
  makeOutcome,
  // The ONLY check whose failure is merely annoying: escalating something it
  // could have answered wastes an adjuster's time. Everything else means the
  // answer cannot be trusted.
  expectedOverCaution: ['does_not_escalate'],

  // The branches that do not key off a check name. `toolFailed` was added after
  // a moved directory made `get_policyholder` return ENOENT for 25 of 40 runs:
  // the model refused correctly, the refusal failed `has_answer` and
  // `cites_record`, and the card called all 25 dangerous false answers.
  outcomeCases: [
    {
      what: 'a failed tool call is infrastructure, not a false answer',
      outcome: { ...makeOutcome('has_answer'), toolFailed: true },
      expect: 'no_answer',
      why: 'the model refused because a tool broke; the fix is the plumbing, not the prompt',
    },
    {
      what: 'control: the SAME outcome without toolFailed IS dangerous',
      outcome: makeOutcome('has_answer'),
      expect: 'false_answer',
      why: 'if this were also no_answer, the rule would swallow every real failure',
    },
  ],
});

for (const l of result.lines) console.log(l);

console.log(
  result.passed
    ? `\nseverity: PASS — all ${CHECK_NAMES.length} checks map to a bucket, and the fall-through still fires\n`
    : '\nseverity: FAIL — see above\n',
);
// Last, and asynchronous: CommonJS has no top-level await, so the exit code is
// decided in the callback rather than by a bare `process.exit` above.
verifyDispatchCauses().then((dispatchOk) => {
  console.log(
    dispatchOk
      ? '\ndispatch: PASS — a broken tool and an invented one are told apart\n'
      : '\ndispatch: FAIL — see above; the severity flag cannot be trusted\n',
  );
  process.exit(result.passed && dispatchOk ? 0 : 1);
});
