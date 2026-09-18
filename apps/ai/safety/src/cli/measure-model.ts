/**
 * `pnpm safety:measure-model` — the number three stages have been building to.
 *
 * ── THE COMPARISON THIS COMPLETES ─────────────────────────────────────────
 *
 *   3.7   recall@6, plain retrieval                      0.40
 *   4.5   recall@6, tools called BY HAND                 1.00   a CEILING
 *   here  recall@6, tools called BY THE MODEL            ?
 *
 * 4.5 answered "are the right documents reachable at all". It could not answer
 * "will a model reach them", and said so on every printing. This is that
 * second number, and the gap between it and 1.00 is the only thing it means.
 *
 * ── WHY IT IS NOT STAGE 7's NUMBER ────────────────────────────────────────
 *
 * Stage 7 scores ANSWERS: did it escalate, did it cite, does every number carry
 * its tool. This scores RETRIEVAL: did the right documents come back. Both are
 * large and both are good and they measure different things — putting stage 7's
 * 26-of-28 beside 1.00 would be exactly the comparison the ceiling framing was
 * built to prevent.
 *
 * ── IT REPEATS, AND THAT WAS LEARNED THE EMBARRASSING WAY ────────────────
 *
 * The first version ran each case ONCE and printed a single number. It said
 * 0.50. The next run of the same code said 0.17 — REC-004 went from five of
 * five to nothing, because the model answered from counts alone and retrieved
 * no complaints at all.
 *
 * 0.50 had already been written into `INGESTION.md` as a measurement by then.
 *
 * This engagement has spent a whole stage saying that one run is a smoke test
 * and not a number, and then published one. So this repeats like `safety:eval`
 * does, reports the SPREAD rather than a point, and refuses to print a single
 * headline figure when the runs disagree.
 *
 * ── AND THE DOCUMENTS ARE TAKEN FROM WHAT THE TOOLS RETURNED ──────────────
 *
 * Not from the answer's citations. A model that cites a document it never
 * retrieved is a different failure, and one the citation list would hide: the
 * point here is whether the machinery PUT the right documents in front of it.
 */
import { CASES, overallRecall, scoreCase, type CaseResult } from '../grounding/measure';
import { DEFAULT_K } from '../grounding/search';
import { askSafety } from '../agent/run';
import { resolveEngine } from '../agent/engines';
import type { CallRecord } from '../agent/answer';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const TURN_PACE_MS = Number(process.env.TURN_PACE_MS ?? 4500);

function repeatCount(): number {
  const i = process.argv.indexOf('--repeat');
  const fromFlag = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  if (Number.isFinite(fromFlag) && fromFlag > 0) return fromFlag;
  const fromEnv = Number(process.env.EVAL_REPEAT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return 3;
}
const REPEAT = repeatCount();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Retrieved {
  id: string;
  kind: string;
  meta: Record<string, unknown>;
}

/**
 * Every document a tool actually handed back, in the order it arrived.
 *
 * ORDER IS THE SCORE. recall@6 asks what survived the first six slots, so a
 * document returned by the fourth call is not equivalent to the same document
 * returned by the first. Tools that return no documents — `count_complaints`
 * returns a number — contribute nothing, correctly.
 */
function documentsFrom(calls: CallRecord[]): Retrieved[] {
  const out: Retrieved[] = [];
  const recall = (id: string) =>
    out.push({ id, kind: 'recall', meta: { id, documentId: id, kind: 'recall' } });

  for (const c of calls) {
    const r = c.result as any;
    if (!r) continue;

    if (c.name === 'get_recall' && r.found) recall(r.campaign_number);
    if (c.name === 'find_recalls') for (const m of r.matches ?? []) recall(m.campaign_number);

    if (c.name === 'search_complaints' || c.name === 'complaints_citing') {
      for (const h of r.hits ?? r.complaints ?? []) {
        out.push({
          id: h.odi_number,
          kind: 'complaint',
          meta: {
            id: h.odi_number,
            documentId: h.odi_number,
            kind: 'complaint',
            make: h.make,
            model: h.model,
            year: h.year,
            components: h.components ?? [],
          },
        });
      }
    }
  }
  return out;
}

/** 3.7a's per-case numbers, and 4.5's, for the three-way comparison. */
const PLAIN: Record<string, number> = { 'REC-001': 0, 'REC-004': 0.2, 'REC-005': 1 };
const CEILING: Record<string, number> = { 'REC-001': 1, 'REC-004': 1, 'REC-005': 1 };

async function main(): Promise<number> {
  const resolved = resolveEngine(process.env.LOOP);
  if ('error' in resolved) {
    console.log(`\n  ${RED}${resolved.error}${OFF}\n`);
    return 1;
  }

  console.log('\nrecall@6, with the MODEL doing the routing');
  console.log(`  ${DIM}three retrieval cases × ${REPEAT} runs. 4.5 called these tools by hand.${OFF}\n`);

  const perCase: Array<{ id: string; recalls: number[]; traces: string[] }> = [];

  for (const c of CASES) {
    const recalls: number[] = [];
    const traces: string[] = [];
    let last: CaseResult | null = null;

    for (let i = 0; i < REPEAT; i++) {
      const r = await askSafety(c.question, { engine: resolved.engine, turnPaceMs: TURN_PACE_MS });
      const scored = scoreCase(c, documentsFrom(r.calls), r.ms, false);
      recalls.push(scored.recall);
      traces.push(r.calls.map((x) => x.name).join(' → ') || 'no tools called');
      last = scored;
      await sleep(2000);
    }

    perCase.push({ id: c.id, recalls, traces });
    const lo = Math.min(...recalls);
    const hi = Math.max(...recalls);
    const spread = lo === hi ? `${lo.toFixed(2)}` : `${lo.toFixed(2)}–${hi.toFixed(2)}`;
    const colour = lo === hi ? (lo === 1 ? GREEN : lo === 0 ? RED : YEL) : YEL;

    console.log(
      `  ${colour}${spread.padEnd(11)}${OFF}${c.id}  ${DIM}plain ${(PLAIN[c.id] ?? 0).toFixed(2)} · ` +
        `ceiling ${(CEILING[c.id] ?? 1).toFixed(2)} · runs ${recalls.map((x) => x.toFixed(2)).join(' ')}${OFF}`,
    );
    for (const t of [...new Set(traces)]) console.log(`        ${DIM}${t}${OFF}`);
    if (last) for (const m of last.missing) console.log(`        ${RED}last run missed${OFF} ${m}`);
    console.log();
  }

  // PER RUN, then averaged — so the spread is over whole runs rather than over
  // cases. An average of averages would hide that one run scored 0.50 and
  // another 0.17.
  const runTotals = Array.from({ length: REPEAT }, (_, i) =>
    perCase.reduce((a, c) => a + (c.recalls[i] ?? 0), 0) / perCase.length,
  );
  const lo = Math.min(...runTotals);
  const hi = Math.max(...runTotals);

  console.log(`  ${'─'.repeat(64)}`);
  console.log(`  recall@${DEFAULT_K}`);
  console.log(`    plain retrieval        ${DIM}0.40${OFF}  ${DIM}deterministic${OFF}`);
  console.log(`    tools, called by hand  ${DIM}1.00${OFF}  ${DIM}a ceiling, deterministic${OFF}`);
  console.log(
    `    tools, called by the model   ${YEL}${lo.toFixed(2)} to ${hi.toFixed(2)}${OFF}` +
      `  ${DIM}across ${REPEAT} runs: ${runTotals.map((x) => x.toFixed(2)).join(', ')}${OFF}`,
  );

  // NO SINGLE HEADLINE WHEN THE RUNS DISAGREE. A mean of 0.50 and 0.17 is 0.33,
  // which is a number no run produced and which hides that the thing being
  // measured moves by a factor of three.
  console.log(
    lo === hi
      ? `\n  ${DIM}Every run agreed. ${REPEAT} runs, 3 cases.${OFF}\n`
      : `\n  ${YEL}The runs disagree by ${(hi - lo).toFixed(2)}${OFF}, so there is no single number here.\n` +
          `  ${DIM}Quote the range. A mean would be a figure no run produced.${OFF}\n`,
  );
  return 0;
}

main().then((c) => process.exit(c));
