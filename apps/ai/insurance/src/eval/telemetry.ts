/**
 * Langfuse, wired for this suite.
 *
 * The tracing, the per-check scores and the dataset linking are generic and
 * live in `@fde/evals`. This file supplies the three things only this project
 * knows: which dataset, what a case looks like as a trace input, and what
 * counts as a dangerous failure.
 *
 * A WORD ON WHAT GOES OVER THE WIRE. An eval trace here carries policy ids,
 * coverage amounts and the model's reasoning. Self-hosted Langfuse keeps that
 * inside your infrastructure; Langfuse Cloud does not. On an insurer engagement
 * that is a data-residency conversation, not a config flag.
 */
import { startEvalTelemetry, type EvalTelemetry } from '@fde/evals';
import { severityOf } from './severity';
import type { CoverageAnswer } from '../schema/coverage-schema';

export interface Case {
  id: string;
  policy?: string;
  input: string;
  checks: string[];
  tags?: string[];
  note?: string;
}

export type CoverageTelemetry = EvalTelemetry<Case, CoverageAnswer>;

/** Undefined when Langfuse is not configured — the suite runs exactly as before. */
export function startTelemetry(): Promise<CoverageTelemetry | undefined> {
  return startEvalTelemetry<Case, CoverageAnswer>({
    dataset: 'coverage-cases',
    datasetDescription:
      'Coverage Q&A eval cases. Source of truth is evals/cases.jsonl in the ' +
      'repo, pushed on every run. Edit the file, not this.',
    // Without this every trace lands as "unknown_service:node", and two
    // projects pointed at one Langfuse become indistinguishable.
    serviceName: 'claims-eval',
    toInput: (c) => ({ question: c.input, policy: c.policy ?? null }),
    toDatasetItem: (c) => ({
      // The checks ARE the expected output. There is no golden answer in this
      // suite on purpose: a check asks "is this box empty when it should not
      // be", never "was this a good answer".
      expectedOutput: { checks: c.checks },
      metadata: { note: c.note ?? '', tags: c.tags ?? [] },
    }),
    severityOf,
  });
}
