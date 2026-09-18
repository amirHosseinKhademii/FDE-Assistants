/**
 * `pnpm safety:judge` — the three editorial checks, judged and reported apart.
 *
 * Costs roughly 3 model calls per rubric — one for the real answer and TWO for
 * the control — plus one answer per case. On a 500/day free tier that is small,
 * and the control is what makes the rest worth anything.
 */
import { askSafety } from '../agent/run';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolveEngine } from '../agent/engines';
import { RUBRICS, judge } from '../eval/judge';
import { CASES } from '../eval/cases';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? 4500);

/**
 * Between judge calls.
 *
 * THE JUDGE HAD NO PACING AND CRASHED ON A PER-MINUTE 429. It makes three rapid
 * calls per rubric — the failing exemplar, the passing one, the real answer —
 * on top of the answer it just generated, and fired them back to back against a
 * limit of fifteen a minute. Every other runner in this engagement paces; this
 * one was written last and inherited nothing.
 */
const JUDGE_PACE_MS = Number(process.env.JUDGE_PACE_MS ?? 4500);

function isRateLimit(e: unknown): boolean {
  const err = e as any;
  const status = err?.status ?? err?.statusCode ?? err?.cause?.status ?? err?.cause?.statusCode;
  if (status === 429) return true;
  const text = [err?.message, err?.cause?.message, err?.cause?.responseBody, String(e)]
    .filter(Boolean)
    .join(' ');
  return /\b429\b|too many requests|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(text);
}

async function main(): Promise<number> {
  const resolved = resolveEngine(process.env.LOOP);
  if ('error' in resolved) {
    console.log(`\n  ${RED}${resolved.error}${OFF}\n`);
    return 1;
  }

  console.log('\neditorial checks · judged, and reported apart from the decided ones');
  console.log(`  ${DIM}three properties no regex can decide. Each rubric is controlled first:`);
  console.log(`  the judge must reject a known-bad answer and accept a known-good one`);
  console.log(`  before its opinion on the real answer counts at all.${OFF}\n`);

  let discarded = 0;
  let passed = 0;

  for (const r of RUBRICS) {
    const c = CASES.find((x) => x.id === r.caseId)!;

    // PACED AND CAUGHT. A quota failure here is infrastructure, not a verdict,
    // and it must not crash the run or be recorded as a judgement — the same
    // rule safety:eval enforces and this file was written without.
    let run;
    try {
      run = await askSafety(c.question, { engine: resolved.engine, turnPaceMs: TURN_PACE_MS });
    } catch (e) {
      console.log(
        `  ${RED}BROKEN${OFF} ${r.caseId}  ${isRateLimit(e) ? 'QUOTA — no verdict' : String((e as any)?.message).slice(0, 70)}\n`,
      );
      discarded++;
      await sleep(JUDGE_PACE_MS);
      continue;
    }
    const prose = run.answer?.answer;

    if (!prose) {
      console.log(`  ${YEL}n/a ${OFF}  ${r.caseId}  the system produced no prose answer to judge`);
      console.log(`        ${DIM}${run.schemaErrors.at(-1) ?? 'answer was null'}${OFF}\n`);
      continue;
    }

    await sleep(JUDGE_PACE_MS);
    let v;
    try {
      v = await judge(r, prose);
    } catch (e) {
      console.log(
        `  ${RED}BROKEN${OFF} ${r.caseId}  ${isRateLimit(e) ? 'QUOTA during judging — no verdict' : String((e as any)?.message).slice(0, 70)}\n`,
      );
      discarded++;
      await sleep(JUDGE_PACE_MS);
      continue;
    }
    if (v.passes === null) {
      discarded++;
      console.log(`  ${RED}VOID${OFF}  ${r.caseId}  ${v.why}`);
    } else {
      if (v.passes) passed++;
      console.log(
        `  ${v.passes ? `${GREEN}yes ${OFF}` : `${RED}no  ${OFF}`}  ${r.caseId}  ${DIM}${r.question.slice(0, 84)}…${OFF}`,
      );
    }
    console.log(`        ${DIM}${prose.slice(0, 150)}…${OFF}\n`);
    await sleep(JUDGE_PACE_MS);
  }

  const judged = RUBRICS.length - discarded;
  console.log(`  ${'─'.repeat(64)}`);
  console.log(`  ${passed} of ${judged} editorial checks satisfied${discarded ? `, ${discarded} VOID` : ''}`);
  console.log(
    `  ${DIM}JUDGED, not decided. One run each, and the judge is the same model being judged —\n` +
      `  which is a known weakness and the reason every rubric carries a control. These\n` +
      `  numbers must not be added to the 26-of-28 from safety:eval.${OFF}\n`,
  );
  return 0;
}

main().then((c) => process.exit(c));
