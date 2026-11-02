/**
 * Langfuse, wired for this suite. Off unless the LANGFUSE_* variables are set.
 *
 * The tracing, the per-check scores and the dataset linking are generic and live in
 * @fde/evals. This file supplies what only this application knows: the dataset name,
 * what a case looks like as a trace input, and what counts as dangerous.
 *
 * A trace here carries board questions and the answers about one named cooperative.
 * Point LANGFUSE_BASE_URL at a server inside your own infrastructure.
 */
import { startEvalTelemetry, type EvalTelemetry } from '@fde/evals';
import { severityOf } from './severity';
import type { BrfAnswer } from '../schema/answer-schema';

export interface Case {
  id: string;
  input: string;
  checks: string[];
  tags?: string[];
  note?: string;
}

export type BrfTelemetry = EvalTelemetry<Case, BrfAnswer>;

/** Undefined when Langfuse is not configured. The suite then runs exactly as before. */
export function startTelemetry(): Promise<BrfTelemetry | undefined> {
  return startEvalTelemetry<Case, BrfAnswer>({
    dataset: 'brf-cases',
    datasetDescription:
      'Board Q&A eval cases for the BRF assistant. The source of truth is docs/brf/evals/cases.jsonl ' +
      'in the repo, pushed on every run. Edit the file, not this.',
    // Without a service name every trace lands under the same unknown label, and two
    // projects sharing one Langfuse become indistinguishable.
    serviceName: 'brf-eval',
    toInput: (c) => ({ question: c.input }),
    toDatasetItem: (c) => ({
      // The checks are the expected output. There is no golden answer, on purpose. A
      // check asks whether a box is empty when it should not be, not whether the answer
      // was good.
      expectedOutput: { checks: c.checks },
      metadata: { note: c.note ?? '', tags: c.tags ?? [] },
    }),
    severityOf,
  });
}
