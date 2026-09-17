/**
 * `pnpm safety:measure` — stage 3.7, and 3.6b when `RERANK=local` is set.
 *
 * Runs every case in the hand-written answer key through the real pipeline and
 * reports recall@6. Writes a baseline to `docs/safety/evals/` so the two runs
 * can be compared as files rather than as screenshots.
 *
 * ── ONE COMMAND, TWO NUMBERS, ONE VARIABLE ────────────────────────────────
 *
 *     pnpm safety:measure                  3.7a — hybrid alone
 *     RERANK=local pnpm safety:measure     3.7b — the same run, reranked
 *
 * Same questions, same corpus, same code path. `search()` reads `RERANK` from
 * the environment rather than taking a flag, precisely so that this harness
 * cannot accidentally measure a different call path and call it a different
 * pipeline.
 *
 * Turn the reranker on from the start and you learn ONE number, which cannot
 * answer "did the reranker help, or was the chunking simply fine?"
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rerankerChoice, rerankUsage } from '@fde/grounding';
import { safetyDatabaseUrl } from '../config/connections';
import { REPO_ROOT } from '../config/paths';
import { CASES, overallRecall, scoreCase, type CaseResult } from '../grounding/measure';
import { DEFAULT_K, openForSearch, search } from '../grounding/search';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const YEL = '\x1b[33m';
const OFF = '\x1b[0m';

function bar(recall: number): string {
  const filled = Math.round(recall * 10);
  return `${'█'.repeat(filled)}${'·'.repeat(10 - filled)}`;
}

function report(r: CaseResult): void {
  const colour = r.recall === 1 ? GREEN : r.recall === 0 ? RED : YEL;
  console.log(`  ${colour}${bar(r.recall)}${OFF}  ${r.id}  recall ${r.recall.toFixed(2)}   ${r.ms}ms`);
  console.log(`        ${DIM}${r.question}${OFF}`);
  console.log(`        expects: ${r.expects}`);

  for (const f of r.found) {
    const moved =
      r.movedFrom[f] !== undefined && r.movedFrom[f] !== r.positions[f]
        ? `  ${YEL}(was ${r.movedFrom[f]}, moved ${r.movedFrom[f] - r.positions[f]} up)${OFF}`
        : '';
    console.log(`        ${GREEN}found${OFF}   ${f}  at position ${r.positions[f]}${moved}`);
  }
  for (const m of r.missing) console.log(`        ${RED}MISSING${OFF} ${m}`);

  // Said for every case, because "is there a recall" is the question a model
  // answers wrongly by citing a loosely-related campaign that search returned.
  if (r.id === 'REC-005') {
    console.log(
      r.recallDocsReturned.length
        ? `        ${YEL}note${OFF}    ${r.recallDocsReturned.length} recall(s) in the results a model could mis-cite: ${r.recallDocsReturned.join(', ')}`
        : `        ${DIM}note    no recall documents returned — nothing to mis-cite${OFF}`,
    );
  }
  console.log(`        ${DIM}returned: ${r.returned.slice(0, 6).join(', ')}${OFF}\n`);
}

async function main(): Promise<number> {
  const only = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const cases = only ? CASES.filter((c) => c.id.toLowerCase() === only.toLowerCase()) : CASES;
  if (!cases.length) {
    console.log(`\n  no case matches "${only}". Known: ${CASES.map((c) => c.id).join(', ')}\n`);
    return 1;
  }

  const reranking = rerankerChoice() === 'local';
  const mode = reranking ? '3.7b · reranked' : '3.7a · hybrid alone';

  console.log(`\nstage ${mode}`);
  console.log(`  ${cases.length} case(s) from docs/safety/WALKTHROUGH.md, recall@${DEFAULT_K} over documents`);
  console.log(
    reranking
      ? `  ${YEL}RERANK=local${OFF} — a cross-encoder re-scores 50 candidates and keeps ${DEFAULT_K}\n`
      : `  ${DIM}RERANK is off. Set RERANK=local for the second number.${OFF}\n`,
  );

  const conn = safetyDatabaseUrl();
  const store = await openForSearch(conn);
  const results: CaseResult[] = [];

  try {
    for (const c of cases) {
      const res = await search(store, conn, c.question, DEFAULT_K);
      const scored = scoreCase(c, res.hits, res.ms, res.reranked);
      results.push(scored);
      report(scored);
    }
  } finally {
    await store.end();
  }

  const overall = overallRecall(results);
  console.log(`  ${'─'.repeat(64)}`);
  console.log(`  recall@${DEFAULT_K} = ${GREEN}${overall.toFixed(2)}${OFF}  across ${results.length} case(s)`);

  if (reranking) {
    console.log(
      `  cross-encoder scored ${rerankUsage.scored} passages in ${rerankUsage.ms}ms` +
        `${rerankUsage.loadMs ? ` (${(rerankUsage.loadMs / 1000).toFixed(1)}s cold start)` : ''}`,
    );
  }

  // THREE CASES. Said here rather than in a footnote, because a number printed
  // without its denominator gets quoted without it too.
  console.log(
    `  ${DIM}n=${results.length}. Coarse on purpose — enough to tell "works" from "does not",` +
      ` not enough to rank two chunkers.${OFF}`,
  );

  const dir = resolve(REPO_ROOT, 'docs/safety/evals');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, reranking ? 'recall-reranked.json' : 'recall-plain.json');
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        mode,
        reranked: reranking,
        k: DEFAULT_K,
        overall: Number(overall.toFixed(4)),
        cases: results,
        // Recorded so a later comparison can REFUSE if the setup differs — the
        // rule `eval:diff` already enforces for the insurance engagement.
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  ${DIM}baseline written to ${file.replace(REPO_ROOT, '.')}${OFF}\n`);

  return 0;
}

main().then((c) => process.exit(c));
