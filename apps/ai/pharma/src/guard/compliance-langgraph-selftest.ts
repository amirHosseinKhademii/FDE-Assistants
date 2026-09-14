/**
 * `pnpm compliance:langgraph` — what does the agent loop actually put on the
 * wire when it runs on LangGraph.js?
 *
 * WHY PHARMA GETS THIS AND INSURANCE DOES NOT. `@fde/agent`'s third engine was
 * added specifically for N2 (supplier impact) — a work list over many rows,
 * not release's single decision. Release already has its two-engine
 * comparison (`compliance:check` / `compliance:mastra`) and adding a third
 * there would test nothing new; see `docs/pharma/BOTTLENECK-2.md`
 * §"Reopening two closed decisions, on N2 specifically". So this file lives in
 * pharma only, and reuses `release-schema.ts` for now simply because N2's own
 * schema does not exist yet — swap it out once it does, the same way
 * `compliance-mastra-selftest.ts` would need to if release's schema changed.
 *
 * Otherwise identical to `compliance-selftest.ts` / `compliance-mastra-
 * selftest.ts`, deliberately: same sample, same contract, same validator, so
 * any difference in the result is a difference in the ENGINE.
 */
import { runLangGraphComplianceCheck } from '@fde/agent';
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

runLangGraphComplianceCheck({
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
