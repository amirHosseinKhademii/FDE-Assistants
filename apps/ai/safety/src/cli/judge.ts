/**
 * `pnpm safety:judge` — the three editorial checks, judged and reported apart.
 *
 * Costs roughly 3 model calls per rubric — one for the real answer and TWO for
 * the control — plus one answer per case. On a 500/day free tier that is small,
 * and the control is what makes the rest worth anything.
 */
import { askSafety } from '../agent/run';
import { resolveEngine } from '../agent/engines';
import { RUBRICS, judge } from '../eval/judge';
import { CASES } from '../eval/cases';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? 4500);

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
    const run = await askSafety(c.question, { engine: resolved.engine, turnPaceMs: TURN_PACE_MS });
    const prose = run.answer?.answer;

    if (!prose) {
      console.log(`  ${YEL}n/a ${OFF}  ${r.caseId}  the system produced no prose answer to judge`);
      console.log(`        ${DIM}${run.schemaErrors.at(-1) ?? 'answer was null'}${OFF}\n`);
      continue;
    }

    const v = await judge(r, prose);
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
