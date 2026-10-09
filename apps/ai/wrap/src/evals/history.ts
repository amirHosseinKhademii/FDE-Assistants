/**
 * history.ts — List retrieval eval runs (Step 1.2).
 *
 * Usage:
 *   tsx src/evals/history.ts           # one row per result file, oldest first
 *   tsx src/evals/history.ts --latest  # full metrics of the newest run only
 */

import { RunResult, loadAllRuns } from './results';

const fmt = (x: number) => x.toFixed(3);

function printHistory(runs: RunResult[]): void {
  if (runs.length === 0) {
    console.log('No result files in evals/results yet. Run pnpm wrap:eval.');
    return;
  }
  const rows = runs.map(r => [
    r.run_id,
    r.variant,
    r.model,
    String(r.repeat_count),
    fmt(r.metrics.recall_at_6),
    fmt(r.metrics.mrr),
    fmt(r.metrics.hit_rate),
  ]);
  const header = ['run_id', 'variant', 'model', 'repeat', 'recall@6', 'mrr', 'hit_rate'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  const render = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log(render(header));
  console.log(widths.map(w => '─'.repeat(w)).join('  '));
  for (const r of rows) console.log(render(r));
}

function printLatest(run: RunResult): void {
  const scored = run.per_case.filter(c => c.hit !== null).length;
  const unanswerable = run.per_case.length - scored;
  console.log(`Run:        ${run.run_id}`);
  console.log(`Variant:    ${run.variant}   model: ${run.model}   fixture_mode: ${run.fixture_mode}   repeat: ${run.repeat_count}`);
  console.log(`Cases:      ${scored} answerable scored, ${unanswerable} unanswerable excluded`);
  console.log(`File:       ${run.file}`);
  console.log('');
  console.log(`Recall@3    ${fmt(run.metrics.recall_at_3)}`);
  console.log(`Recall@6    ${fmt(run.metrics.recall_at_6)}`);
  console.log(`Recall@10   ${fmt(run.metrics.recall_at_10)}`);
  console.log(`MRR         ${fmt(run.metrics.mrr)}`);
  console.log(`Hit-rate    ${fmt(run.metrics.hit_rate)}`);
}

function main(): void {
  const runs = loadAllRuns();
  if (process.argv.includes('--latest')) {
    if (runs.length === 0) {
      console.error('✗ no result files in evals/results. Run pnpm wrap:eval first.');
      process.exit(1);
    }
    printLatest(runs[runs.length - 1]);
    return;
  }
  printHistory(runs);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    process.exit(1);
  }
}
