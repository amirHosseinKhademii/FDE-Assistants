/**
 * `pnpm safety:measure-tools` — stage 4.5, and the step the whole stage exists
 * to reach.
 *
 * Re-runs stage 3.7's answer key THROUGH THE FIVE TOOLS instead of through
 * plain retrieval, and reports recall@6 the same way, over documents.
 *
 * ── WHAT THIS NUMBER IS, AND WHAT IT IS NOT ───────────────────────────────
 *
 * There is no model yet. The loop that lets one CHOOSE a tool is stage 6. So
 * the routing below — which tool, with which arguments, for which question — is
 * WRITTEN BY HAND.
 *
 * That makes this a CEILING, not a score:
 *
 *   it answers      "if the tools are called correctly, are the right
 *                    documents reachable at all?"
 *   it cannot answer "will a model call them correctly?"
 *
 * The second question is stage 6's, and it can only be worth asking if this one
 * comes back yes. A tool layer whose ceiling is 0.40 cannot be rescued by a
 * better prompt.
 *
 * Saying so matters because the number will look good, and a ceiling quoted as
 * a score is how a demo becomes a promise.
 *
 * ── AND THE ROUTING IS WRITTEN FROM THE QUESTION, NOT FROM THE ANSWER ─────
 *
 * Each plan below uses only what the question itself states — "2020 F-150",
 * "transmission park problem", "Tesla Model 3", "a death". None of them names
 * an ODI number or a campaign the key is looking for. A plan that filtered on
 * the answer would measure nothing at all.
 *
 * ── AND ONLY TWO OF THE FIVE TOOLS APPEAR BELOW ───────────────────────────
 *
 * `find_recalls` and `search_complaints` reach 1.00 on their own. `get_recall`
 * is absent because no question here names a campaign — REC-002 does, and it is
 * not one of the three retrieval cases. `count_complaints` returns a number and
 * not a document, so it cannot move a recall metric by construction.
 *
 * `complaints_citing` IS ABSENT FOR A REASON WORTH WRITING DOWN, because it
 * looks like an oversight and is not.
 *
 * REC-001 asks whether the fix is holding, and the seven complaints naming
 * 20V197000 are the best evidence in the corpus for that question — the people
 * filing them had the campaign in front of them. MEASURED: those seven are
 * 11589358, 11590464, 11592935, 11618838, 11624180, 11625426, 11659797, and
 * **REC-001's target 11353867 is not among them.**
 *
 * So adding the call would contribute no target and consume slots in a
 * six-slot budget, pushing 11353867 down or out. THE METRIC WOULD PUNISH
 * CALLING THE RIGHT TOOL.
 *
 * That is a limit of recall@6, not of the tool: the metric rewards retrieving
 * what the key NAMED, and the key names one supporting complaint rather than
 * every complaint a good answer would cite. Worth knowing before 1.00 is read
 * as "the tool layer is finished" — and worth fixing in stage 7, where an eval
 * scores the ANSWER rather than the retrieval.
 */
import { findRecalls } from '../tools/find-recalls.tool';
import { searchComplaints } from '../tools/search-complaints.tool';
import { CASES, overallRecall, scoreCase, type CaseResult } from '../grounding/measure';
import { DEFAULT_K } from '../grounding/search';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

/** What `scoreCase` reads. Built from tool results rather than from search hits. */
interface Retrieved {
  id: string;
  kind: string;
  meta: Record<string, unknown>;
}

const asRecall = (id: string, component: string): Retrieved => ({
  id,
  kind: 'recall',
  meta: { id, documentId: id, kind: 'recall', component },
});

const asComplaint = (c: {
  odi_number: string;
  make: string;
  model: string;
  year: number | null;
  components: string[];
}): Retrieved => ({
  id: c.odi_number,
  kind: 'complaint',
  meta: {
    id: c.odi_number,
    documentId: c.odi_number,
    kind: 'complaint',
    make: c.make,
    model: c.model,
    year: c.year,
    components: c.components,
  },
});

/** One hand-written routing per case, plus the calls it made, for the report. */
interface Plan {
  calls: string[];
  run: () => Promise<Retrieved[]>;
}

const PLANS: Record<string, Plan> = {
  // "We run 2020 F-150s. Is the transmission park problem a known defect, and
  // is the fix holding?"
  //
  // TWO TOOLS, because the question has two halves and one answer each. The
  // campaign says what the defect IS; the complaints filed afterwards are what
  // "holding" means. Either alone is a wrong answer — the campaign alone reads
  // as "fixed", the complaints alone as "unknown defect".
  'REC-001': {
    calls: [
      'find_recalls({ make: FORD, model: F-150, component: POWER TRAIN:AUTOMATIC TRANSMISSION })',
      'search_complaints({ make: FORD, model: F-150, component: POWER TRAIN, filed_after: <the notification date> }, "will not go into park…")',
    ],
    run: async () => {
      const recalls = await findRecalls({
        make: 'FORD',
        model: 'F-150',
        component: 'POWER TRAIN:AUTOMATIC TRANSMISSION',
      });
      const out: Retrieved[] = recalls.matches.map((m) =>
        asRecall(m.campaign_number, m.component),
      );

      // THE DATE COMES FROM THE FIRST CALL, not from the key. "After the
      // recall" is only meaningful once you know when owners were notified,
      // and that is what makes this two calls rather than two lookups.
      const notified = recalls.matches[0]?.owners_notified ?? undefined;
      const complaints = await searchComplaints(
        {
          make: 'FORD',
          model: 'F-150',
          component: 'POWER TRAIN',
          filed_after: notified,
        },
        'will not go into park, rolls away, gear shift indicator wrong',
        DEFAULT_K - out.length,
      );
      return [...out, ...complaints.hits.map(asComplaint)];
    },
  },

  // "Are there any complaints involving a death on the 2019-2020 Tesla Model 3?"
  //
  // ONE TOOL, and the query text is almost irrelevant — `min_deaths: 1` is the
  // question. This is the case 3.7 identified as a filter wearing a search
  // question's clothes.
  'REC-004': {
    calls: ['search_complaints({ make: TESLA, model: MODEL 3, min_deaths: 1 }, "fatal accident")'],
    run: async () => {
      const r = await searchComplaints(
        { make: 'TESLA', model: 'MODEL 3', min_deaths: 1 },
        'fatal accident, autopilot, crash',
      );
      return r.hits.map(asComplaint);
    },
  },

  // "Is there a recall for the forward-collision braking on the 2019-2020
  // Honda Odyssey?"
  //
  // THE NEGATIVE CASE. `find_recalls` returns nothing, which IS the answer, and
  // the complaints are the evidence that the absence was looked for rather than
  // assumed. Note the recall call still runs and still counts: if it returned
  // something, that would be the answer instead.
  'REC-005': {
    calls: [
      'find_recalls({ make: HONDA, model: ODYSSEY, component: FORWARD COLLISION AVOIDANCE })  → []',
      'search_complaints({ make: HONDA, model: ODYSSEY, component: FORWARD COLLISION AVOIDANCE }, "automatic braking…")',
    ],
    run: async () => {
      const recalls = await findRecalls({
        make: 'HONDA',
        model: 'ODYSSEY',
        component: 'FORWARD COLLISION AVOIDANCE',
      });
      const out: Retrieved[] = recalls.matches.map((m) =>
        asRecall(m.campaign_number, m.component),
      );
      const complaints = await searchComplaints(
        { make: 'HONDA', model: 'ODYSSEY', component: 'FORWARD COLLISION AVOIDANCE' },
        'automatic emergency braking activates for no reason, collision warning',
        DEFAULT_K - out.length,
      );
      return [...out, ...complaints.hits.map(asComplaint)];
    },
  },
};

function bar(recall: number): string {
  const f = Math.round(recall * 10);
  return `${'█'.repeat(f)}${'·'.repeat(10 - f)}`;
}

function report(r: CaseResult, calls: string[], before: number): void {
  const colour = r.recall === 1 ? GREEN : r.recall === 0 ? RED : YEL;
  const delta = r.recall - before;
  const arrow =
    delta > 0 ? `${GREEN}+${delta.toFixed(2)}${OFF}` : delta < 0 ? `${RED}${delta.toFixed(2)}${OFF}` : `${DIM}no change${OFF}`;
  console.log(
    `  ${colour}${bar(r.recall)}${OFF}  ${r.id}  recall ${r.recall.toFixed(2)}   ` +
      `${DIM}was ${before.toFixed(2)}${OFF}  ${arrow}`,
  );
  for (const c of calls) console.log(`        ${DIM}→ ${c}${OFF}`);
  for (const f of r.found) console.log(`        ${GREEN}found${OFF}   ${f} at ${r.positions[f]}`);
  for (const m of r.missing) console.log(`        ${RED}MISSING${OFF} ${m}`);
  console.log();
}

/** 3.7a's per-case numbers, for the comparison. Both runs measured 0.40 overall. */
const BASELINE: Record<string, number> = { 'REC-001': 0, 'REC-004': 0.2, 'REC-005': 1 };

async function main(): Promise<number> {
  console.log('\nstage 4.5 · recall@6 THROUGH THE TOOLS');
  console.log(`  ${DIM}routing is hand-written — this is a CEILING, not a score.`);
  console.log(`  It asks whether the right documents are REACHABLE, not whether a model will ask.${OFF}\n`);

  const results: CaseResult[] = [];
  for (const c of CASES) {
    const plan = PLANS[c.id];
    if (!plan) continue;
    const started = Date.now();
    const retrieved = await plan.run();
    const scored = scoreCase(c, retrieved, Date.now() - started, false);
    results.push(scored);
    report(scored, plan.calls, BASELINE[c.id] ?? 0);
  }

  const overall = overallRecall(results);
  const before = 0.4;
  console.log(`  ${'─'.repeat(66)}`);
  console.log(
    `  recall@${DEFAULT_K}  ${DIM}plain retrieval${OFF} ${before.toFixed(2)}` +
      `   →   ${GREEN}through the tools ${overall.toFixed(2)}${OFF}`,
  );
  console.log(
    `  ${DIM}n=${results.length}. A ceiling: the tools were called by hand, correctly, every time.`,
  );
  console.log(`  Whether a model routes this well is stage 6, and is a different number.${OFF}\n`);

  // THE GATE. STAGE4.md puts this before the contract on purpose: if the tools
  // did not move recall, they are not the answer and stage 5 should not begin.
  const moved = overall > before;
  console.log(
    moved
      ? `  ${GREEN}4.5: PASS${OFF} — the tools reach what retrieval could not. Stage 5 may begin.\n`
      : `  ${RED}4.5: FAIL${OFF} — recall did not move. The diagnosis was wrong; do not build stage 5.\n`,
  );
  return moved ? 0 : 1;
}

main().then((f) => process.exit(f));
