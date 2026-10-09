/**
 * runner.ts — Retrieval eval runner (Step 1.2).
 *
 * Loads evals/golden.jsonl, runs each question through a retrieve function,
 * scores recall@3/6/10, MRR and hit-rate, prints a summary table, and writes
 * evals/results/<variant>-<YYYY-MM-DDTHHmmss>.json.
 *
 * Unanswerable cases (no gold docs) are listed in per_case with null metrics
 * and are left out of the aggregates.
 *
 * Usage: tsx src/evals/runner.ts [--variant stub] [--repeat 1] [--only <type>]
 */

import { config } from 'dotenv';
import { resolve, dirname, relative, join } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { aggregate, scoreCase, CaseMetrics, HIT_DEPTH } from './metrics';
import { createStubRetrieve, Retrieve } from './stub-retrieve';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Repo root & env
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from, '..', '..', '..', '..');
    dir = up;
  }
}

const REPO_ROOT = findRepoRoot(__dirname);
config({ path: resolve(REPO_ROOT, '.env') });

const PKG_DIR = resolve(REPO_ROOT, 'apps/ai/wrap');
const GOLDEN_FILE = process.env.GOLDEN_FILE || resolve(PKG_DIR, 'evals/golden.jsonl');
const RESULTS_DIR = resolve(PKG_DIR, 'evals/results');
const CORPUS_DIR = resolve(REPO_ROOT, 'docs/steering/corpus');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  if (v === undefined || v.startsWith('--')) {
    console.error(`✗ ${name} needs a value`);
    process.exit(2);
  }
  return v;
}

const VARIANT = argValue('--variant') ?? 'stub';
const REPEAT = Number(argValue('--repeat') ?? '1');
const ONLY = argValue('--only');

if (!/^[A-Za-z0-9_-]+$/.test(VARIANT)) {
  console.error(`✗ --variant must match [A-Za-z0-9_-]+ (got '${VARIANT}')`);
  process.exit(2);
}
if (!Number.isInteger(REPEAT) || REPEAT < 1) {
  console.error(`✗ --repeat must be a positive integer`);
  process.exit(2);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Load golden set & corpus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Question {
  id: string;
  query: string;
  expected_sources: string[];
  expected_facts: string[];
  type: string;
  notes: string;
}

function loadGolden(file: string): Question[] {
  return readFileSync(file, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map((line, idx) => {
      try {
        return JSON.parse(line) as Question;
      } catch {
        throw new Error(`golden.jsonl line ${idx + 1}: invalid JSON`);
      }
    });
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(relative(REPO_ROOT, full).split('\\').join('/'));
  }
  return out;
}

const questions = loadGolden(GOLDEN_FILE);
const selected = ONLY ? questions.filter(q => q.type === ONLY) : questions;
if (selected.length === 0) {
  console.error(ONLY ? `✗ no golden cases with type '${ONLY}'` : '✗ golden.jsonl has no cases');
  process.exit(1);
}
if (!existsSync(CORPUS_DIR)) {
  console.error(`✗ corpus not found: ${relative(REPO_ROOT, CORPUS_DIR)}`);
  process.exit(1);
}

const corpusIds = walkFiles(CORPUS_DIR);
const goldByQuery = new Map<string, string[]>();
for (const q of questions) goldByQuery.set(q.query, q.expected_sources);

const retrieve: Retrieve = createStubRetrieve(corpusIds, goldByQuery);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface PerCase {
  id: string;
  query: string;
  type: string;
  expected_sources: string[];
  retrieved_sources: string[];
  rank_of_first_match: number | null;
  hit: boolean | null;
  reciprocal_rank: number | null;
  recall_at_3: number | null;
  recall_at_6: number | null;
  recall_at_10: number | null;
}

async function main(): Promise<void> {
  const perCase: PerCase[] = [];
  const scored: CaseMetrics[] = [];

  for (const q of selected) {
    const answerable = q.expected_sources.length > 0;
    if (!answerable) {
      perCase.push({
        id: q.id,
        query: q.query,
        type: q.type,
        expected_sources: q.expected_sources,
        retrieved_sources: [],
        rank_of_first_match: null,
        hit: null,
        reciprocal_rank: null,
        recall_at_3: null,
        recall_at_6: null,
        recall_at_10: null,
      });
      continue;
    }

    // Average metrics over repeats; keep the first repeat's ranking for the record.
    const repeats: CaseMetrics[] = [];
    let firstRanking: string[] = [];
    for (let r = 0; r < REPEAT; r++) {
      const ranking = await retrieve(q.query, HIT_DEPTH);
      if (r === 0) firstRanking = ranking;
      repeats.push(scoreCase(ranking, q.expected_sources));
    }
    const avg = aggregate(repeats);
    const m: CaseMetrics = {
      recall_at_3: avg.recall_at_3,
      recall_at_6: avg.recall_at_6,
      recall_at_10: avg.recall_at_10,
      reciprocal_rank: avg.mrr,
      hit: avg.hit_rate === 1,
      rank_of_first_match: scoreCase(firstRanking, q.expected_sources).rank_of_first_match,
    };
    scored.push(m);
    perCase.push({
      id: q.id,
      query: q.query,
      type: q.type,
      expected_sources: q.expected_sources,
      retrieved_sources: firstRanking,
      rank_of_first_match: m.rank_of_first_match,
      hit: m.hit,
      reciprocal_rank: m.reciprocal_rank,
      recall_at_3: m.recall_at_3,
      recall_at_6: m.recall_at_6,
      recall_at_10: m.recall_at_10,
    });
  }

  const metrics = aggregate(scored);
  const timestamp = new Date().toISOString();
  const stamp = timestamp.slice(0, 19).replace(/:/g, '');
  const runId = `${VARIANT}-${stamp}`;

  const result = {
    run_id: runId,
    variant: VARIANT,
    timestamp,
    model: 'none',
    fixture_mode: 'none',
    repeat_count: REPEAT,
    metrics,
    per_case: perCase,
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  const outFile = resolve(RESULTS_DIR, `${VARIANT}-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');

  // Summary table
  const pct = (x: number) => x.toFixed(2);
  const unanswered = perCase.length - scored.length;
  console.log(`Variant: ${VARIANT}   cases scored: ${scored.length}   unanswerable skipped: ${unanswered}   repeats: ${REPEAT}`);
  console.log('Metric          Value');
  console.log('──────────────────────');
  console.log(`Recall@3        ${pct(metrics.recall_at_3)}`);
  console.log(`Recall@6        ${pct(metrics.recall_at_6)}`);
  console.log(`Recall@10       ${pct(metrics.recall_at_10)}`);
  console.log(`MRR             ${pct(metrics.mrr)}`);
  console.log(`Hit-rate@10     ${pct(metrics.hit_rate)}`);
  console.log('');
  console.log(`✓ Eval complete. Results: ${relative(REPO_ROOT, outFile)}`);
}

main().catch(err => {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
});
