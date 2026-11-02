/**
 * pnpm compliance:mastra
 *
 * What does the Mastra loop put on the wire? The assertions are generic and live in
 * @fde/agent: no provider-side retention, no server-side conversation state, no
 * tracing spans, exactly one host contacted, and the registered tools present. Each
 * one is a property of the transport, which is why it transfers from one application
 * to the next.
 *
 * This file supplies the two things that belong to this application: the answer
 * contract, and a schema-valid sample, so the loop reaches a clean finish instead of
 * retrying.
 *
 * It drives the same validator production uses. A compliance test that drove a
 * different construction than production would prove nothing.
 */
import { runMastraComplianceCheck } from '@fde/agent';
import { ANSWER_FORMAT, validateBrfAnswer } from './answer-schema';

const SAMPLE = JSON.stringify({
  answer: 'Compliance self-test answer.',
  citations: [{ file: 'stadgar.md', section: '§ 9', claim: 'self-test claim', detail: 'self-test detail' }],
  unverified_claims: [],
  conflicts: [],
  escalate: null,
});

runMastraComplianceCheck({
  sampleAnswer: SAMPLE,
  responseFormat: ANSWER_FORMAT,
  validate: validateBrfAnswer,
  toolName: 'search_documents',
  // The client is faked, so this question never reaches a model. It exists so that the
  // compliance package ships no domain vocabulary of its own.
  question: 'Får man ha bastu på balkongen?',
})
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
