/**
 * @fde/evals — a domain-neutral eval harness.
 *
 * Repeat runs, severity buckets, baselines and diffs. You supply the cases, the
 * checks, and what counts as dangerous.
 *
 * THE SPLIT THIS PACKAGE ENFORCES:
 *
 *   here          repeat N times · group into per-case reports · bucket
 *                 failures by severity · write and compare baselines · the
 *                 check registry · the two checks that read the TOOL TRACE
 *
 *   your app      your answer type · every check that reads a field of it ·
 *                 WHICH failures are dangerous · the cases themselves
 *
 * THE ONE THING DELIBERATELY NOT DEFAULTED: `SeverityClassifier`. Which
 * failures are dangerous is a domain judgment and no harness can guess it. In
 * an insurance claims corpus a citation resolving to nothing is dangerous and
 * an unnecessary escalation is merely annoying; in a triage tool those invert.
 * A default here would impose one domain's ethics on every other.
 *
 * What IS enforced: exactly one bucket per failed run, and `uncategorised`
 * catching anything a classifier forgot — so a check added without a severity
 * is LOUD rather than silently counted as harmless.
 */
export {
  // types
  type CaseOutcome,
  type CaseReport,
  type Baseline,
  type Summary,
  type Severity,
  type SeverityClassifier,
  // aggregation and reporting
  summarise,
  printScorecard,
  // baseline files
  setResultsDir,
  RESULTS_DIR,
  listBaselines,
  loadBaseline,
} from './scorecard';

export {
  type CheckResult,
  type CheckContext,
  type Check,
  type CheckRegistry,
  createCheckRegistry,
  callsFirst,
  callsTool,
} from './checks';

export {
  type EvalCase,
  type RunSuiteOptions,
  runSuite,
  toReports,
  selectCases,
  writeBaseline,
} from './suite';

export { runDiff } from './diff';
export { runHistory } from './history';

export {
  startEvalTelemetry,
  type EvalTelemetry,
  type TelemetryOptions,
} from './telemetry';

export {
  createAnswerChecks,
  type AnswerAccessors,
  type DocumentResolver,
} from './answer-checks';

export { runEvalCli, loadCases, flag, type EvalCliOptions } from './cli';

export { verifyClassifier, type ClassifierVerification } from './verify-classifier';

export {
  scoreCase,
  scoreHits,
  retrievalSummary,
  type RetrievalCase,
  type CaseScore,
  type RetrievalSummary,
} from './retrieval';

export {
  measureAgreement,
  overlap,
  contentWords,
  type AgreementInput,
  type AgreementResult,
  type AgreementThresholds,
} from './agreement';
