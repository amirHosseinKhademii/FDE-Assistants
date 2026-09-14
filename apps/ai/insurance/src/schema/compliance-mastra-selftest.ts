/**
 * `pnpm compliance:check` — what does the Mastra loop actually put on the wire?
 *
 * The assertions are generic and live in `@fde/agent`: no provider-side
 * retention, no server-side conversation state, zero tracing spans, exactly one
 * host contacted, and the registered tools present. Every one is a property of
 * the TRANSPORT, which is why it transfers — and why it is the first question a
 * regulated customer asks.
 *
 * This file supplies the two things that are ours: the answer contract, and a
 * schema-valid sample so the loop reaches a clean finish rather than retrying.
 *
 * **The same validator production uses.** A compliance test that drove a
 * DIFFERENT construction than production would prove nothing — a trap
 * `loop-mastra.ts` records from its own history.
 */
import { runMastraComplianceCheck } from '@fde/agent';
import { COVERAGE_FORMAT, validateCoverageAnswer } from './coverage-schema';

const SAMPLE = JSON.stringify({
  answer: 'Compliance self-test answer.',
  policy_id: null,
  policy_form: null,
  citations: [],
  unverified_claims: [],
  conflicts: [],
  escalate: null,
});

runMastraComplianceCheck({
  sampleAnswer: SAMPLE,
  responseFormat: COVERAGE_FORMAT,
  validate: validateCoverageAnswer,
  toolName: 'search_policy',
  // Never reaches a real model — the client is faked. It is here so the
  // compliance package ships no domain vocabulary of its own.
  question: 'what is the deductible on AUT-4471?',
})
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
