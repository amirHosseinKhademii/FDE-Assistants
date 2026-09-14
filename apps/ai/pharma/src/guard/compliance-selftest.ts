/**
 * `pnpm compliance:check` — what does the agent loop actually put on the wire?
 *
 * The assertions are generic and live in `@fde/agent`: no provider-side
 * retention, no server-side conversation state, zero tracing spans, exactly one
 * host contacted, and the registered tools present. Every one is a property of
 * the TRANSPORT, which is why it transfers.
 *
 * WHY PHARMA NEEDS ITS OWN COPY OF A CHECK IT INHERITS. All three properties are
 * already true here because `@fde/agent` provides them. **Inheriting is not
 * asserting.** The Agents SDK's tracing exporter defaults ON and ships
 * transcripts to `api.openai.com`; for batch records and named Qualified
 * Persons that is the difference between a demo and a disclosure. A property
 * nobody tests is a property that survives until someone changes a default.
 *
 * This file supplies the two things that are ours: the answer contract, and a
 * schema-valid sample so the loop reaches a clean finish rather than retrying.
 * **The same validator production uses** — a compliance test driving a different
 * construction would prove nothing.
 */
import { runSdkComplianceCheck } from '@fde/agent';
import { RELEASE_FORMAT, validateReleaseAnswer } from '../schema/release-schema';
import { ASSESS_RELEASE } from '../agent/tool/assess-release.tool';

const SAMPLE = JSON.stringify({
  summary: 'Compliance self-test answer. Not a certification.',
  lot_id: 'LOT-SELFTEST-0000-A',
  market: 'EU',
  governing_spec_version: null,
  blockers: [],
  // Empty is correct here and NOT a formality: the contract requires this to be
  // non-empty only when there is a blocker, and this sample has none.
  what_would_clear_it: [],
  concerns: [],
  missing: [],
  unverified_claims: [],
  escalate: null,
});

runSdkComplianceCheck({
  sampleAnswer: SAMPLE,
  responseFormat: RELEASE_FORMAT,
  validate: validateReleaseAnswer,
  toolName: ASSESS_RELEASE,
  // Never reaches a real model — the client is faked. It is here so the
  // compliance package ships no domain vocabulary of its own.
  question: 'may LOT-IBU200-2609-B be released to the EU?',
})
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error('FAILED:', e?.message ?? e);
    process.exit(1);
  });
