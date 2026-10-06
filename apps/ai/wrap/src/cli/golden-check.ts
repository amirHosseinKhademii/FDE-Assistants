/**
 * golden-check.ts — Validate golden eval questions (ids, sources, facts, types).
 *
 * Reads evals/golden.jsonl (resolved relative to repo root) and validates:
 * - Required fields: id, query, expected_sources, expected_facts, type, notes
 * - Unique ids (q-001..q-030)
 * - Type in {lookup, aggregate, multi_hop, unanswerable, structured}
 * - Every source file exists relative to repo root
 * - Every expected_fact appears (substring match) in at least one source
 * - Each source contains at least one fact (warn only)
 * - Unanswerable: sources and facts must be empty, notes must be non-empty
 *
 * Usage: npx tsx src/cli/golden-check.ts [--coverage]
 *        GOLDEN_FILE=/path/to/custom.jsonl npx tsx src/cli/golden-check.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Find repo root and load .env
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(from, '..', '..', '..');
    dir = up;
  }
}

const REPO_ROOT = findRepoRoot(__dirname);
config({ path: resolve(REPO_ROOT, '.env') });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI & Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const COVERAGE = process.argv.includes('--coverage');
const GOLDEN_FILE = process.env.GOLDEN_FILE || resolve(REPO_ROOT, 'apps/ai/wrap/evals/golden.jsonl');
const VALID_TYPES = new Set(['lookup', 'aggregate', 'multi_hop', 'unanswerable', 'structured']);

interface Question {
  id: string;
  query: string;
  expected_sources: string[];
  expected_facts: string[];
  type: string;
  notes: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Load & Parse
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let questions: Question[] = [];
try {
  const content = readFileSync(GOLDEN_FILE, 'utf-8');
  questions = content
    .split('\n')
    .filter(line => line.trim())
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error(`✗ Line ${idx + 1}: invalid JSON`);
        process.exit(1);
      }
    });
} catch (e) {
  console.error(`✗ Failed to read ${GOLDEN_FILE}: ${(e as Error).message}`);
  process.exit(1);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const seenIds = new Set<string>();
const typeCount: Record<string, number> = {};
let allValid = true;
const results: string[] = [];
const sourceUsageCount: Record<string, number> = {};

for (const q of questions) {
  let valid = true;
  const errors: string[] = [];

  // Required fields
  if (!q.id) errors.push('missing id');
  if (!q.query) errors.push('missing query');
  if (!Array.isArray(q.expected_sources)) errors.push('expected_sources not array');
  if (!Array.isArray(q.expected_facts)) errors.push('expected_facts not array');
  if (!q.type) errors.push('missing type');
  if (q.notes === undefined) errors.push('missing notes');

  if (errors.length > 0) {
    results.push(`✗ ${q.id || '?'}: ${errors.join(', ')}`);
    allValid = false;
    continue;
  }

  // Unique id
  if (seenIds.has(q.id)) {
    results.push(`✗ ${q.id}: duplicate id`);
    allValid = false;
    valid = false;
  }
  seenIds.add(q.id);

  // Valid type
  if (!VALID_TYPES.has(q.type)) {
    results.push(`✗ ${q.id}: invalid type '${q.type}'`);
    allValid = false;
    valid = false;
  }
  typeCount[q.type] = (typeCount[q.type] || 0) + 1;

  // Unanswerable checks
  if (q.type === 'unanswerable') {
    if (q.expected_sources.length > 0) {
      results.push(`✗ ${q.id} (unanswerable): expected_sources must be empty`);
      allValid = false;
      valid = false;
    }
    if (q.expected_facts.length > 0) {
      results.push(`✗ ${q.id} (unanswerable): expected_facts must be empty`);
      allValid = false;
      valid = false;
    }
    if (!q.notes || q.notes.trim().length === 0) {
      results.push(`✗ ${q.id} (unanswerable): notes must be non-empty`);
      allValid = false;
      valid = false;
    }
  } else {
    // Non-unanswerable must have sources & facts
    if (q.expected_sources.length === 0) {
      results.push(`✗ ${q.id}: non-unanswerable must have expected_sources`);
      allValid = false;
      valid = false;
    }
    if (q.expected_facts.length === 0) {
      results.push(`✗ ${q.id}: non-unanswerable must have expected_facts`);
      allValid = false;
      valid = false;
    }
  }

  // Check source files exist & track usage
  for (const source of q.expected_sources) {
    const fullPath = resolve(REPO_ROOT, source);
    if (!existsSync(fullPath)) {
      results.push(`✗ ${q.id}: source not found: ${source}`);
      allValid = false;
      valid = false;
    } else {
      sourceUsageCount[source] = (sourceUsageCount[source] || 0) + 1;
    }
  }

  // Check facts appear in sources
  for (const fact of q.expected_facts) {
    let found = false;
    for (const source of q.expected_sources) {
      const fullPath = resolve(REPO_ROOT, source);
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        if (content.includes(fact)) {
          found = true;
          break;
        }
      }
    }
    if (!found) {
      results.push(`✗ ${q.id}: fact not in any source: "${fact}"`);
      allValid = false;
      valid = false;
    }
  }

  // Warn if source has no facts
  for (const source of q.expected_sources) {
    const fullPath = resolve(REPO_ROOT, source);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const hasAnyFact = q.expected_facts.some(f => content.includes(f));
      if (!hasAnyFact) {
        results.push(`⚠ ${q.id}: source has no facts from this question: ${source}`);
      }
    }
  }

  // Result line
  if (valid) {
    results.push(
      `✓ ${q.id} (${q.type}): ${q.expected_sources.length} sources, ${q.expected_facts.length} facts`
    );
  }
}

// Print results
for (const line of results) {
  console.log(line);
}

// Totals
const totals = Object.entries(typeCount)
  .map(([t, c]) => `${c} ${t}`)
  .join(', ');
console.log(`Total: ${questions.length} questions (${totals})`);

// Source check
const allSourcesExist = !results.some(r => r.includes('source not found'));
console.log(`All sources exist: ${allSourcesExist ? '✓' : '✗'}`);

// Coverage analysis
if (COVERAGE) {
  console.log('');
  const corpusDir = resolve(REPO_ROOT, 'docs/steering/corpus');

  const folderCoverage: Record<string, number> = {};
  for (const source of Object.keys(sourceUsageCount)) {
    // Parse "docs/steering/corpus/<folder>/..."
    const match = source.match(/^docs\/steering\/corpus\/([^/]+)\//);
    if (match) {
      const folder = match[1];
      folderCoverage[folder] = (folderCoverage[folder] || 0) + sourceUsageCount[source];
    }
  }

  // Find all folders and report coverage
  console.log('Corpus folder coverage:');
  const allFolders = new Set<string>();
  if (existsSync(corpusDir)) {
    const files = readdirSync(corpusDir);
    for (const file of files) {
      const fullPath = resolve(corpusDir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        allFolders.add(file);
      }
    }
  }

  const sortedFolders = Array.from(allFolders).sort();
  const covered: string[] = [];
  const uncovered: string[] = [];

  for (const folder of sortedFolders) {
    const count = folderCoverage[folder] || 0;
    if (count > 0) {
      covered.push(folder);
      console.log(`  ${folder}: ${count} question${count === 1 ? '' : 's'}`);
    } else {
      uncovered.push(folder);
    }
  }

  if (uncovered.length > 0) {
    console.log('Folders with zero questions:');
    for (const folder of uncovered) {
      console.log(`  ${folder}`);
    }
  }
}

// Exit
process.exit(allValid ? 0 : 1);
