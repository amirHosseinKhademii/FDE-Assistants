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
  console.log(`  ${DIM}the three retrieval cases, one run each. 4.5 called these tools by hand.`);
  console.log(`  this is the same measurement with nobody helping.${OFF}\n`);

  const results: CaseResult[] = [];

  for (const c of CASES) {
    const r = await askSafety(c.question, { engine: resolved.engine, turnPaceMs: TURN_PACE_MS });
    const docs = documentsFrom(r.calls);
    const scored = scoreCase(c, docs, r.ms, false);
    results.push(scored);

    const plain = PLAIN[c.id] ?? 0;
    const delta = scored.recall - plain;
    console.log(
      `  ${scored.recall === 1 ? GREEN : scored.recall === 0 ? RED : YEL}${scored.recall.toFixed(2)}${OFF}  ${c.id}  ` +
        `${DIM}plain ${plain.toFixed(2)} · ceiling ${(CEILING[c.id] ?? 1).toFixed(2)} · ` +
        `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} on plain${OFF}`,
    );
    console.log(`        ${DIM}${r.calls.map((x) => x.name).join(' → ') || 'no tools called'}${OFF}`);
    for (const f of scored.found) console.log(`        ${GREEN}found${OFF}   ${f} at ${scored.positions[f]}`);
    for (const m of scored.missing) console.log(`        ${RED}MISSING${OFF} ${m}`);
    console.log();
  }

  const model = overallRecall(results);
  console.log(`  ${'─'.repeat(64)}`);
  console.log(`  recall@${DEFAULT_K}`);
  console.log(`    plain retrieval        ${DIM}0.40${OFF}`);
  console.log(`    tools, called by hand  ${DIM}1.00${OFF}  ${DIM}a ceiling${OFF}`);
  console.log(`    tools, called by the model   ${GREEN}${model.toFixed(2)}${OFF}`);
  console.log(
    `\n  ${DIM}${results.length} retrieval cases, ONE run each. The ceiling was also one run per case,\n` +
      `  with the calls written by hand — so this says whether a model reaches what was\n` +
      `  reachable, and nothing about how often.${OFF}\n`,
  );
  return 0;
}

main().then((c) => process.exit(c));
