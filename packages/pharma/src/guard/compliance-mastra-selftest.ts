/**
 * `pnpm compliance:mastra` — what does the agent loop actually put on the wire?
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
 * TWO ENGINES MEANS TWO PLACES A DEFAULT CAN CHANGE. `@fde/agent` can run the
 * loop on the OpenAI Agents SDK or on Mastra, and a compliance property proved
 * on one says nothing about the other — they build different requests through
 * different libraries. If the engine is switchable, the assertion has to be too.
 *
 * Otherwise identical to `compliance-selftest.ts`, deliberately: the sample, the
 * contract and the validator are the same, so any difference in the result is a
 * difference in the ENGINE and not in what was asked of it.
 */
import { runMastraComplianceCheck } from '@fde/agent';
import { RELEASE_FORMAT, validateReleaseAnswer } from '../schema/release-schema';
import { ASSESS_RELEASE } from '../agent/tool/assess-release.tool';

const SAMPLE = JSON.stringify({
  summary: 'Compliance self-test answer. Not a certification.',
  lot_id: 'LOT-SELFTEST-0000-A',
  market: 'EU',
  governing_spec_version: null,
  blockers: [],
  concerns: [],
  missing: [],
  unverified_claims: [],
  escalate: null,
});

runMastraComplianceCheck({
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
