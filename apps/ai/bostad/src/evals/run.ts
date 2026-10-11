/**
 *   pnpm --filter @bostad/ai eval:smoke          one run per case (12 cases)
 *   pnpm --filter @bostad/ai eval -- --repeat 5  N runs per case
 *
 * Runs golden.jsonl serially through askAddress and grades each run on four
 * checks: schema (a valid answer came back), coherence (no coherence errors),
 * sections_cited (every expected section is cited) and not_in_data (non-empty
 * exactly when the case expects it to be).
 *
 * Writes a baseline to evals-baselines/<timestamp>.json and prints one row per
 * case. A failed case is a result, not a crash, so the exit code is 0 whenever
 * the run completes. Only a broken run (missing config, unreachable profile
 * service for every case) exits non-zero.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { askAddress, type AddressAskResult } from '../agent/ask';
import { env } from '../foundry/client';
import { loopChoice, engineLabel, loggedModelName } from '@fde/agent';
import type { AddressAnswer, SectionName } from '../schema/address-answer';

interface Golden {
  id: string;
  address: string;
  question: string;
  expect: { sections_cited: SectionName[]; not_in_data: boolean };
}

interface Check {
  name: 'schema' | 'coherence' | 'sections_cited' | 'not_in_data';
  pass: boolean;
  detail: string;
}

interface RunRecord {
  run: number;
  pass: boolean;
  checks: Check[];
  errors: string[];
  answer: AddressAnswer | null;
  usage: AddressAskResult['usage'] | null;
  thrown?: string;
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

function loadCases(): Golden[] {
  return readFileSync(resolve(__dirname, 'golden.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as Golden);
}

function grade(c: Golden, r: AddressAskResult): Check[] {
  const a = r.answer;
  const cited = new Set(a?.facts.map((f) => f.section) ?? []);
  const missing = c.expect.sections_cited.filter((s) => !cited.has(s));
  const hasNotInData = (a?.not_in_data.length ?? 0) > 0;
  return [
    {
      name: 'schema',
      pass: a !== null,
      detail: a ? 'valid' : r.errors.join(' | ').slice(0, 200),
    },
    {
      name: 'coherence',
      pass: a !== null && r.errors.length === 0,
      detail: a === null ? 'no valid answer' : r.errors.length ? r.errors.join(' | ').slice(0, 200) : 'ok',
    },
    {
      name: 'sections_cited',
      pass: a !== null && missing.length === 0,
      detail: missing.length
        ? `missing ${missing.join(', ')} (cited: ${[...cited].join(', ') || 'none'})`
        : `ok (cited: ${[...cited].join(', ') || 'none'})`,
    },
    {
      name: 'not_in_data',
      pass: a !== null && hasNotInData === c.expect.not_in_data,
      detail: `expected ${c.expect.not_in_data ? 'non-empty' : 'empty'}, got ${a?.not_in_data.length ?? 0} item(s)`,
    },
  ];
}

function thrownChecks(message: string): Check[] {
  return ['schema', 'coherence', 'sections_cited', 'not_in_data'].map((name) => ({
    name: name as Check['name'],
    pass: false,
    detail: `run threw: ${message}`.slice(0, 200),
  }));
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function main(): Promise<void> {
  const repeat = Number(argValue('--repeat') ?? 1);
  if (!Number.isInteger(repeat) || repeat < 1) {
    console.error('--repeat must be a whole number >= 1');
    process.exit(1);
  }

  const cases = loadCases();
  const choice = loopChoice();
  const model = loggedModelName(env.chatDeployment());
  const engine = engineLabel(choice);
  const started = Date.now();
  const results: { golden: Golden; runs: RunRecord[] }[] = [];

  console.log(`bostad-ai eval: ${cases.length} cases x ${repeat} run(s), model=${model} engine=${engine}\n`);

  for (const c of cases) {
    const runs: RunRecord[] = [];
    for (let run = 1; run <= repeat; run++) {
      try {
        const r = await askAddress(c.address, c.question, { surface: `eval:${c.id}#${run}` });
        const checks = grade(c, r);
        runs.push({
          run,
          pass: checks.every((k) => k.pass),
          checks,
          errors: r.errors,
          answer: r.answer,
          usage: r.usage,
        });
      } catch (e) {
        const message = (e as Error)?.message ?? String(e);
        runs.push({ run, pass: false, checks: thrownChecks(message), errors: [message], answer: null, usage: null, thrown: message });
      }
    }
    results.push({ golden: c, runs });
  }

  // Table: one row per case. With repeat > 1 the verdict is "k/N runs".
  console.log(pad('case', 10) + pad('result', 10) + 'reason');
  for (const { golden: c, runs } of results) {
    const passed = runs.filter((r) => r.pass).length;
    const firstFail = runs.find((r) => !r.pass);
    const reason = firstFail
      ? `run ${firstFail.run}: ` + (firstFail.checks.find((k) => !k.pass)?.name ?? '?') + ' - ' + (firstFail.checks.find((k) => !k.pass)?.detail ?? '')
      : '-';
    console.log(pad(c.id, 10) + pad(passed === runs.length ? 'PASS' : `${passed}/${runs.length}`, 10) + reason);
  }

  const allRuns = results.flatMap((r) => r.runs);
  const casesPassed = results.filter((r) => r.runs.every((k) => k.pass)).length;
  const runsPassed = allRuns.filter((r) => r.pass).length;
  const usages = allRuns.map((r) => r.usage).filter((u): u is NonNullable<typeof u> => u !== null);
  const inputTokens = usages.reduce((a, u) => a + u.inputTokens, 0);
  const outputTokens = usages.reduce((a, u) => a + u.outputTokens, 0);
  const cachedInputTokens = usages.reduce((a, u) => a + (u.cachedInputTokens ?? 0), 0);
  const costUsd = usages.reduce((a, u) => a + (u.costUsd ?? 0), 0);
  const unpriced = usages.filter((u) => u.costUsd === null).length;
  const ms = Date.now() - started;

  console.log(
    `\ncases passed ${casesPassed}/${results.length}   runs passed ${runsPassed}/${allRuns.length}` +
      `   tokens=${inputTokens}in/${outputTokens}out (cached ${cachedInputTokens})` +
      `   cost=$${costUsd.toFixed(6)}${unpriced ? ` (${unpriced} run(s) unpriced)` : ''}   wall=${(ms / 1000).toFixed(1)}s`,
  );

  const baselinesDir = resolve(__dirname, '..', '..', 'evals-baselines');
  mkdirSync(baselinesDir, { recursive: true });
  const ts = new Date().toISOString();
  const file = resolve(baselinesDir, `${ts.replace(/[:.]/g, '-')}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      {
        ts,
        setup: { model, engine, repeat, cases: cases.length, golden: 'src/evals/golden.jsonl' },
        summary: {
          casesPassed,
          cases: results.length,
          runsPassed,
          runs: allRuns.length,
          inputTokens,
          outputTokens,
          cachedInputTokens,
          costUsd,
          unpricedRuns: unpriced,
          ms,
        },
        cases: results.map(({ golden, runs }) => ({
          id: golden.id,
          address: golden.address,
          question: golden.question,
          expect: golden.expect,
          passed: runs.filter((r) => r.pass).length,
          runs,
        })),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`baseline: ${file}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e?.message ?? e);
  process.exit(1);
});
