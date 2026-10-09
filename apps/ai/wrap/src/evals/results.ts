/**
 * results.ts — Shared loader for evals/results/*.json (Step 1.2).
 *
 * Used by compare.ts (diff) and history.ts (history / latest). Read-only.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const RESULTS_DIR = resolve(__dirname, '../../evals/results');

export interface CaseResult {
  id: string;
  type: string;
  hit: boolean | null;
  recall_at_3: number | null;
  recall_at_6: number | null;
  recall_at_10: number | null;
  reciprocal_rank: number | null;
}

export interface RunResult {
  run_id: string;
  variant: string;
  timestamp: string;
  model: string;
  fixture_mode: string;
  repeat_count: number;
  metrics: {
    recall_at_3: number;
    recall_at_6: number;
    recall_at_10: number;
    mrr: number;
    hit_rate: number;
  };
  per_case: CaseResult[];
  /** Absolute path the run was loaded from (not part of the JSON). */
  file: string;
}

export function loadRun(file: string): RunResult {
  if (!existsSync(file)) throw new Error(`result file not found: ${file}`);
  const raw = JSON.parse(readFileSync(file, 'utf-8')) as Omit<RunResult, 'file'>;
  if (!raw.metrics || !raw.run_id || !raw.timestamp) {
    throw new Error(`not a result file (missing run_id/timestamp/metrics): ${file}`);
  }
  return { ...raw, file };
}

/** All result files in RESULTS_DIR, oldest first (by the timestamp field). */
export function loadAllRuns(dir: string = RESULTS_DIR): RunResult[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .map(name => loadRun(join(dir, name)))
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
}
