/**
 * compare.ts — Diff two retrieval eval runs (Step 1.2).
 *
 * Usage:
 *   tsx src/evals/compare.ts                 # newest two runs in evals/results
 *   tsx src/evals/compare.ts <before> <after> # two result files
 *
 * Refuses (exit 2) when model, fixture_mode or repeat_count differ, because
 * that would measure the setup change, not the code change.
 * Exit 1 when fewer than two runs are available.
 */

import { resolve } from 'node:path';
import { RunResult, loadAllRuns, loadRun } from './results';

export const METRIC_ROWS: Array<{ key: keyof RunResult['metrics']; label: string }> = [
  { key: 'recall_at_3', label: 'Recall@3' },
  { key: 'recall_at_6', label: 'Recall@6' },
  { key: 'recall_at_10', label: 'Recall@10' },
  { key: 'mrr', label: 'MRR' },
  { key: 'hit_rate', label: 'Hit-rate' },
];

export interface MetricRow {
  label: string;
  before: number;
  after: number;
  delta: number;
}

export interface CaseChange {
  id: string;
  before: number | null;
  after: number | null;
}

export type CompareResult =
  | { ok: true; metrics: MetricRow[]; changedCases: CaseChange[] }
  | { ok: false; reasons: string[] };

/** Pure: no I/O. `before` is the baseline, `after` the candidate. */
export function compare(before: RunResult, after: RunResult): CompareResult {
  const reasons: string[] = [];
  const setup: Array<'model' | 'fixture_mode' | 'repeat_count'> = ['model', 'fixture_mode', 'repeat_count'];
  for (const field of setup) {
    if (before[field] !== after[field]) {
      reasons.push(`${field} differs: before=${String(before[field])} after=${String(after[field])}`);
    }
  }
  if (reasons.length > 0) return { ok: false, reasons };

  const metrics: MetricRow[] = METRIC_ROWS.map(({ key, label }) => ({
    label,
    before: before.metrics[key],
    after: after.metrics[key],
    delta: after.metrics[key] - before.metrics[key],
  }));

  const beforeById = new Map(before.per_case.map(c => [c.id, c]));
  const changedCases: CaseChange[] = [];
  for (const c of after.per_case) {
    const b = beforeById.get(c.id);
    if (!b) continue;
    if (b.recall_at_6 !== c.recall_at_6) {
      changedCases.push({ id: c.id, before: b.recall_at_6, after: c.recall_at_6 });
    }
  }
  return { ok: true, metrics, changedCases };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fmt = (x: number) => x.toFixed(3);
const fmtDelta = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(3);
const fmtCase = (x: number | null) => (x === null ? 'n/a' : String(x));

function printTable(before: RunResult, after: RunResult, res: Extract<CompareResult, { ok: true }>): void {
  console.log(`Before: ${before.run_id}`);
  console.log(`After:  ${after.run_id}`);
  console.log(`Setup:  model=${after.model}  fixture_mode=${after.fixture_mode}  repeat_count=${after.repeat_count}`);
  console.log('');
  const w = Math.max(...res.metrics.map(m => m.label.length), 'Metric'.length);
  const line = `${'Metric'.padEnd(w)}  ${'Before'.padStart(7)}  ${'After'.padStart(7)}  ${'Δ'.padStart(8)}`;
  console.log(line);
  console.log('─'.repeat(line.length));
  for (const m of res.metrics) {
    console.log(`${m.label.padEnd(w)}  ${fmt(m.before).padStart(7)}  ${fmt(m.after).padStart(7)}  ${fmtDelta(m.delta).padStart(8)}`);
  }
  console.log('');
  if (res.changedCases.length === 0) {
    console.log('Per-case recall@6: no changes.');
  } else {
    console.log(`Per-case recall@6 changes (${res.changedCases.length}):`);
    for (const c of res.changedCases) {
      console.log(`  ${c.id}  ${fmtCase(c.before)} -> ${fmtCase(c.after)}`);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  let before: RunResult;
  let after: RunResult;

  if (args.length === 0) {
    const runs = loadAllRuns();
    if (runs.length < 2) {
      console.error(`✗ need at least two runs in evals/results to diff (found ${runs.length}). Run pnpm wrap:eval again.`);
      process.exit(1);
    }
    before = runs[runs.length - 2];
    after = runs[runs.length - 1];
  } else if (args.length === 2) {
    // pnpm runs the script from the package dir; resolve against where the user ran it.
    const base = process.env.INIT_CWD ?? process.cwd();
    before = loadRun(resolve(base, args[0]));
    after = loadRun(resolve(base, args[1]));
  } else {
    console.error('usage: eval:diff [<before.json> <after.json>]');
    process.exit(1);
  }

  const res = compare(before, after);
  if (!res.ok) {
    console.error('✗ refusing to compare runs with different setups:');
    for (const r of res.reasons) console.error(`  - ${r}`);
    console.error('  Compare runs made with the same model, fixture_mode and repeat_count.');
    process.exit(2);
  }
  printTable(before, after, res);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }
}
