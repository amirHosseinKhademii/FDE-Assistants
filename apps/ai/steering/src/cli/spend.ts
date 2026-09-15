/**
 * `pnpm steering:spend` — what the model cost, by surface and by outcome.
 *
 * FREE, OFFLINE, NO MODEL, NO DATABASE. It reads `logs/requests.jsonl` and does
 * arithmetic. Run it before and after any change that claims to make something
 * cheaper; a cost reduction reported without a quality measurement beside it is
 * not a result, and `steering:eval-diff` is the other half.
 *
 * ── WHY THIS EXISTS AT ALL ───────────────────────────────────────────────
 *
 * The per-request cost has been on every line since the first run. What was
 * missing is the two questions a person actually asks, neither of which is a
 * property of one line:
 *
 *   WHERE DOES IT GO?      Printed by surface. The first run of this said 74%
 *                          of steering's spend was the EVAL SUITE, not serving
 *                          anybody — which reorders what is worth optimising and
 *                          is invisible until you group.
 *
 *   PER WHAT?              Cost per request is the easiest number to compute and
 *                          the least useful. See the denominator section below.
 *
 * ── THE DENOMINATOR, WHICH IS THE WHOLE POINT ───────────────────────────
 *
 * An assessment that refuses to price still costs what it cost. Dividing spend
 * by REQUESTS prices a failed run and a useful one identically. So this prints
 * three figures and names the assumption under each:
 *
 *   per request      the median. What one assessment costs to run.
 *   per priced       spend ÷ the assessments that came back with a number.
 *   per actionable   spend ÷ every assessment that produced a grounded answer,
 *                    counting a well-evidenced refusal as an answer.
 *
 * Which denominator is right is a JUDGEMENT, and that is exactly why all three
 * are printed together. A single figure lets a spreadsheet quietly pick the
 * flattering one. On the 2026-09-14 bid the spread is a factor of twenty-four.
 *
 * ── AND WHY `--priced` IS AN ARGUMENT RATHER THAN A LOOKUP ──────────────
 *
 * `logs/requests.jsonl` records what a request COST and deliberately nothing of
 * what it SAID — see `@fde/telemetry`'s header on why the answer body does not
 * belong in the cost log. So this file cannot know how many assessments carried
 * a price, and it does not guess: without `--priced` the second denominator
 * prints as unavailable, with the command that answers it.
 *
 * That is the same rule as an unpriced model logging `costUsd: null` plus a
 * reason. A precise-looking wrong number is worse than an admitted gap.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../config/connections';

interface Line {
  ts: string;
  subject: string | null;
  surface: string;
  model: string;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  ms: number;
  costUsd: number | null;
}

/**
 * Surfaces that ANSWER somebody, as opposed to measuring ourselves.
 *
 * `steering:eval` is excluded from the denominators on purpose: an eval run is
 * not an assessment somebody wanted, and folding it in would make the bid look
 * an order of magnitude more expensive than it was. It still appears in the
 * by-surface table, because "the suite is most of the spend" is the finding.
 *
 * `http` is the web desk. It belongs here and is easy to forget — the first
 * version of this counted only the two CLI surfaces and reported 15 of the
 * bid's requirements instead of 23.
 */
const ANSWER_SURFACES = new Set(['steering:assess', 'steering:assess-all', 'http']);

const usd = (n: number) => `$${n.toFixed(4)}`;
const pct = (n: number, d: number) => (d === 0 ? '   -  ' : `${((n / d) * 100).toFixed(1)}%`);

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function main(): void {
  const path = resolve(REPO_ROOT, 'logs/requests.jsonl');
  const raw = readFileSync(path, 'utf8').trim();
  if (!raw) {
    console.log('\n  logs/requests.jsonl is empty — nothing has been logged yet.\n');
    return;
  }
  const all: Line[] = raw.split('\n').map((l) => JSON.parse(l));

  // Everything below is steering's own traffic. The file is shared with two
  // other engagements and `surface` is the only thing telling them apart.
  const mine = all.filter((r) => (r.surface ?? '').startsWith('steering:') || isBidRow(r));

  console.log(`\n  ${path}`);
  console.log(`  ${all.length} lines total, ${mine.length} of them steering's\n`);

  // ── by surface ───────────────────────────────────────────────────────────
  const bySurface = new Map<string, Line[]>();
  for (const r of mine) {
    const k = r.surface ?? '(none)';
    bySurface.set(k, [...(bySurface.get(k) ?? []), r]);
  }

  console.log('  WHERE IT GOES');
  console.log(`  ${'surface'.padEnd(24)}${'n'.padStart(5)}${'usd'.padStart(11)}${'cached'.padStart(9)}${'avg s'.padStart(8)}`);
  let total = 0;
  const rows = [...bySurface.entries()].sort((a, b) => sum(b[1]) - sum(a[1]));
  for (const [surface, rs] of rows) {
    const s = sum(rs);
    total += s;
    const inTok = rs.reduce((a, r) => a + r.inputTokens, 0);
    const cached = rs.reduce((a, r) => a + (r.cachedInputTokens ?? 0), 0);
    const ms = rs.reduce((a, r) => a + r.ms, 0) / rs.length;
    console.log(
      `  ${surface.padEnd(24)}${String(rs.length).padStart(5)}${usd(s).padStart(11)}${pct(cached, inTok).padStart(9)}${(ms / 1000).toFixed(1).padStart(8)}`,
    );
  }
  console.log(`  ${'TOTAL'.padEnd(24)}${String(mine.length).padStart(5)}${usd(total).padStart(11)}\n`);

  // The finding that reorders the work, printed rather than left to be noticed.
  const evalSpend = sum(mine.filter((r) => r.surface === 'steering:eval'));
  if (total > 0 && evalSpend / total > 0.5) {
    console.log(
      `  ${pct(evalSpend, total).trim()} of this is the EVAL SUITE — measuring ourselves, not serving anybody.\n` +
        `  That is a property of a pre-production repo and it inverts once real traffic exists.\n`,
    );
  }

  // ── the denominators ─────────────────────────────────────────────────────
  //
  // NEWEST RUN PER REQUIREMENT, which is the same rule `filed-assessments.ts`
  // applies to its history: re-running a requirement replaces its answer rather
  // than adding one. Summing every row instead would charge the bid three times
  // for a requirement somebody re-ran three times.
  const bid = mine.filter(isBidRow).sort((a, b) => a.ts.localeCompare(b.ts));
  const newest = new Map<string, Line>();
  for (const r of bid) newest.set(r.subject as string, r);
  const runs = [...newest.values()];

  if (runs.length === 0) {
    console.log('  No assessment rows found — nothing to divide.\n');
    return;
  }

  const spend = sum(runs);
  const costs = runs.map((r) => r.costUsd).filter((c): c is number => c != null);
  const med = median(costs);
  const priced = flag('priced') ? Number(flag('priced')) : undefined;

  console.log('  PER WHAT');
  console.log(`  ${runs.length} requirements, newest run each, eval excluded — ${usd(spend)} in total\n`);
  console.log(`  ${'cost per request'.padEnd(26)}${usd(med).padStart(10)}   median of ${costs.length} runs`);
  if (priced !== undefined && priced > 0) {
    console.log(
      `  ${'cost per priced answer'.padEnd(26)}${usd(spend / priced).padStart(10)}   ${priced} priced of ${runs.length}` +
        `   ${(spend / priced / med).toFixed(1)}x the median`,
    );
  } else {
    console.log(
      `  ${'cost per priced answer'.padEnd(26)}${'unavailable'.padStart(10)}   the cost log does not record whether an\n` +
        `  ${''.padEnd(26)}${''.padStart(10)}   answer carried a price. Pass --priced N, from\n` +
        `  ${''.padEnd(26)}${''.padStart(10)}   \`pnpm steering:summarise --dry-run\`.`,
    );
  }
  console.log(
    `  ${'cost per actionable'.padEnd(26)}${usd(spend / runs.length).padStart(10)}   all ${runs.length}, counting a grounded refusal\n` +
      `  ${''.padEnd(26)}${''.padStart(10)}   as an answer`,
  );

  console.log(
    `\n  Which denominator is right is a judgement, which is why all three print.\n` +
      `  A refusal costs what it cost.\n`,
  );
}

function isBidRow(r: Line): boolean {
  return /^CR-K2-/.test(r.subject ?? '') && ANSWER_SURFACES.has(r.surface ?? '');
}

function sum(rs: Line[]): number {
  return rs.reduce((a, r) => a + (r.costUsd ?? 0), 0);
}

if (require.main === module) {
  try {
    main();
  } catch (e: unknown) {
    console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
}
