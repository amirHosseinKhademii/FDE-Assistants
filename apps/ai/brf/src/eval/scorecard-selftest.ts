/**
 * pnpm severity:check: does every check map to a severity bucket?
 *
 * The assertions are generic and live in @fde/evals (verifyClassifier), including the
 * negative control that gives them meaning. An unknown check must fall through to
 * "uncategorised". Without that, the classifier matches everything, and a rule that
 * called every failure dangerous would score perfectly.
 *
 * What is here belongs to this application: the classifier, the check list, and what a
 * minimal failing outcome looks like for this answer shape.
 */
import { verifyClassifier, type CaseOutcome } from '@fde/evals';
import { ToolRegistry } from '@fde/agent';
import type { BrfAnswer } from '../schema/answer-schema';
import { severityOf } from './severity';
import { CHECK_NAMES } from './checks';

/** Only the presence of an answer matters to the classifier. */
const ANSWER: BrfAnswer = {
  answer: 'x',
  citations: [],
  unverified_claims: [],
  conflicts: [],
  escalate: null,
};

const makeOutcome = (name: string): CaseOutcome<BrfAnswer> => ({
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
 * The population side, through the real dispatcher.
 *
 * The classifier cases below build outcomes by hand, so they prove what severityOf does
 * with a toolFailed flag and nothing about where that flag comes from. The dispatcher
 * reports both a thrown tool and an invented tool name as ok: false. Keying the flag on
 * ok alone would excuse a model that made up a capability, so the two must be told apart.
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
      `ok=${threw.ok} cause=${threw.cause}. This is what excuses a refusal.`,
    ],
    [
      "an invented tool name is cause=unknown_tool (the model's fault)",
      !invented.ok && invented.cause === 'unknown_tool',
      `ok=${invented.ok} cause=${invented.cause}. This must NOT excuse the run.`,
    ],
    [
      'control: both are ok=false, so ok alone cannot tell them apart',
      threw.ok === false && invented.ok === false && threw.cause !== invented.cause,
      'if these ever share a cause, keying the severity flag on it is meaningless',
    ],
  ];

  let ok = true;
  console.log('\nDispatch causes: is a broken tool told apart from an invented one?\n');
  for (const [what, pass, detail] of cases) {
    if (!pass) ok = false;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${what}`);
    console.log(`        ${detail}`);
  }
  return ok;
}

console.log('\nSeverity self-test: does every check map to a bucket?\n');

const result = verifyClassifier<BrfAnswer>({
  checkNames: CHECK_NAMES,
  severityOf,
  makeOutcome,
  // The only check whose failure is merely annoying: escalating something that could
  // have been answered wastes a board member's time. Every other failure means the
  // answer cannot be trusted.
  expectedOverCaution: ['does_not_escalate'],

  // Branches that do not key off a check name.
  outcomeCases: [
    {
      what: 'a failed tool call is infrastructure, not a false answer',
      outcome: { ...makeOutcome('has_answer'), toolFailed: true },
      expect: 'no_answer',
      why: 'the model refused because a tool broke, so the fix is the plumbing, not the prompt',
    },
    {
      what: 'control: the same outcome without toolFailed IS dangerous',
      outcome: makeOutcome('has_answer'),
      expect: 'false_answer',
      why: 'if this were also no_answer, the rule would swallow every real failure',
    },
  ],
});

for (const l of result.lines) console.log(l);

console.log(
  result.passed
    ? `\nseverity: PASS. All ${CHECK_NAMES.length} checks map to a bucket, and the fall-through still fires.\n`
    : '\nseverity: FAIL. See above.\n',
);

// Asynchronous, so the exit code is decided in the callback rather than by a bare exit above.
verifyDispatchCauses().then((dispatchOk) => {
  console.log(
    dispatchOk
      ? '\ndispatch: PASS. A broken tool and an invented one are told apart.\n'
      : '\ndispatch: FAIL. See above. The severity flag cannot be trusted.\n',
  );
  process.exit(result.passed && dispatchOk ? 0 : 1);
});
