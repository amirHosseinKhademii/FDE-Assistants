/**
 *   pnpm --filter @vantis/steering retrieval:eval            the baseline
 *   pnpm --filter @vantis/steering retrieval:eval --both     baseline vs reranked
 *   pnpm --filter @vantis/steering retrieval:eval --show-labels <substring>
 *
 * The LIVE retrieval measurement. Needs the built index, and COSTS MONEY — one
 * query embedding per case per arm. Named `:eval` and not `:check` for that
 * reason: in this repo `*-check` is free and offline, `*-eval` is neither.
 *
 * `EMBEDDINGS=local` cannot substitute. The index was built with Foundry's
 * 1536-dimension model; a local 384-dimension query vector does not compare
 * against it at all. The run refuses rather than producing a number that looks
 * like a measurement and is noise.
 *
 * ── WHAT IS MEASURED: `hybridSearch`, AND NOTHING ABOVE IT ───────────────
 *
 * Not `searchDocuments`, and emphatically not the `search_documents` TOOL,
 * which applies a budget, a programme filter and a cap the agent chose.
 * Measuring through the tool would blend retriever quality with the agent's
 * judgement and report one number with two causes.
 *
 * `k` is 6 on every case because `DEFAULT_PASSAGES` is 6 — k has to be what the
 * model actually sees, and a passage retrieved but not shown was not retrieved.
 *
 * ── WHY `--both` RUNS THE SEARCH TWICE INSTEAD OF SLICING ONCE ───────────
 *
 * The obvious saving is to fetch one deep pool, score the top 6 of it as the
 * baseline, and rerank the rest. That would be WRONG, and quietly so.
 * `hybridSearch` over-fetches `k * 4` before fusing, so the candidate set it
 * reciprocal-rank-fuses at k=6 (depth 24) is not the head of the one it fuses
 * at k=50 (depth 200) — more documents earn a rank in both arms, and the fused
 * top-6 genuinely differs. Slicing would compare the reranker against a
 * baseline nobody runs, and flatter or damn it for the wrong reason.
 *
 * So the baseline arm is `hybridSearch(store, q, 6)` — the retriever exactly as
 * the tool calls it today — and the reranked arm is `hybridSearch(store, q, 50)`
 * re-scored by a cross-encoder and cut to 6. Two embeddings per case. The
 * comparison is then between two things that could each actually ship.
 */
import { readFileSync } from 'node:fs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import {
  openStore,
  hybridSearch,
  rerankHits,
  rerankUsage,
  DEFAULT_RERANK_MODEL,
  type Scored,
} from '@fde/grounding';
import { derivedUrl, REPO_ROOT } from '../../config/connections';
import { CHUNK_TABLE } from '../../grounding/chunks';
import { openEmbeddings, embeddingsChoice, embeddingUsage } from '../../grounding/embeddings.factory';
import {
  labelOf,
  scoreCase,
  retrievalSummary,
  type SteeringRetrievalCase,
  type CaseScore,
} from './retrieval';

const CASES = resolve(REPO_ROOT, 'docs', 'steering', 'evals', 'retrieval.jsonl');
const RESULTS = resolve(REPO_ROOT, 'docs', 'steering', 'evals', 'retrieval-results');

/** The candidate pool the cross-encoder re-scores. See `rerank.ts`. */
const POOL = 50;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

function loadCases(): SteeringRetrievalCase[] {
  const only = flag('only');
  const tag = flag('tag');
  return readFileSync(CASES, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as SteeringRetrievalCase)
    .filter((c) => (!only || c.id === only) && (!tag || c.tags.includes(tag)));
}

/** The filter a case narrows by, with the nulls stripped the way the tool does. */
function filterOf(c: SteeringRetrievalCase): Record<string, string> | undefined {
  const f = Object.fromEntries(
    Object.entries({ docType: c.docType, programme: c.programme, repo: c.repo }).filter(
      ([, v]) => v !== undefined && v !== null,
    ),
  ) as Record<string, string>;
  return Object.keys(f).length ? f : undefined;
}

const rank = (hits: Scored[]): (string | null)[] =>
  hits.map((h) => labelOf({
    documentId: h.doc.metadata?.documentId as string | undefined,
    section: h.doc.metadata?.section as string | undefined,
  }));

/**
 * Every label the index actually carries. Plain SQL, no embedding, no cost.
 *
 * ── THIS IS THE GUARD AGAINST THE MISTAKE THIS REPO HAS MADE THREE TIMES ─
 *
 * A case expecting a label that no passage carries can NEVER pass, and it fails
 * looking exactly like a retrieval regression: recall drops, the miss is named,
 * and the named miss is a string that does not exist. `NEXT.md` records three
 * separate occasions here where a red check was the check's fault; this is the
 * cheapest of them to rule out, so it is ruled out before any money is spent.
 */
async function labelsInIndex(): Promise<Set<string>> {
  const client = new Client({ connectionString: derivedUrl() });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select metadata->>'documentId' d, metadata->>'section' s from ${CHUNK_TABLE}`,
    );
    return new Set(
      rows.map((r: any) => labelOf({ documentId: r.d, section: r.s })).filter(Boolean) as string[],
    );
  } finally {
    await client.end();
  }
}

/** `--show-labels <substring>` — read the label vocabulary before writing a case. */
async function showLabels(needle: string): Promise<void> {
  const all = [...(await labelsInIndex())].filter((l) =>
    l.toLowerCase().includes(needle.toLowerCase()),
  );
  all.sort();
  console.log(`\n  ${all.length} label(s) matching "${needle}"\n`);
  for (const l of all) console.log(`    ${l}`);
  console.log('');
}

interface Arm {
  name: string;
  scores: CaseScore[];
  keywordArmFailed: boolean;
}

function line(s: CaseScore, c: SteeringRetrievalCase, ranked: (string | null)[]): void {
  console.log(
    `  ${s.pass ? 'ok  ' : 'FAIL'}  ${c.id.padEnd(9)} recall=${s.recall.toFixed(2)}  rr=${s.rr.toFixed(2)}`,
  );
  console.log(`        q: "${c.query}"`);
  if (s.missing.length) console.log(`        \x1b[31mmissing: ${s.missing.join(', ')}\x1b[0m`);
  if (s.intruders.length) console.log(`        \x1b[31mintruders: ${s.intruders.join(', ')}\x1b[0m`);
  // ALWAYS printed, pass or fail. On a pass it is how you notice the right
  // passage arrived for the wrong reason; on a fail it is the only thing that
  // separates "we missed it" from "the retriever returned junk".
  console.log(`        got: ${ranked.map((l) => l ?? '(unlabelled)').join(' | ')}`);
}

async function main(): Promise<void> {
  const labelQuery = flag('show-labels');
  if (labelQuery) {
    await showLabels(labelQuery);
    return;
  }

  const cases = loadCases();
  if (cases.length === 0) {
    console.log('\nNo cases matched.\n');
    process.exit(1);
  }

  if (embeddingsChoice() === 'local') {
    console.log(
      '\n\x1b[31mEMBEDDINGS=local against a Foundry-built index measures nothing.\x1b[0m\n' +
        'The two models have different dimensions and are not comparable. Re-index\n' +
        'or unset EMBEDDINGS.\n',
    );
    process.exit(1);
  }

  // ── the free guard, before a cent is spent ──────────────────────────────
  const present = await labelsInIndex();
  const unsatisfiable = cases.flatMap((c) =>
    c.expect.filter((e) => !present.has(e)).map((e) => `${c.id}: ${e}`),
  );
  if (unsatisfiable.length) {
    console.log(
      '\n\x1b[31mThese expectations name a label no passage in the index carries.\x1b[0m\n' +
        'They can never pass, and would read as a retrieval failure. Fix the cases,\n' +
        'or re-run `pnpm --filter @vantis/steering index` if the corpus moved.\n',
    );
    for (const u of unsatisfiable) console.log(`    ${u}`);
    console.log('\n  --show-labels <substring> prints what the index actually carries.\n');
    process.exit(1);
  }

  const both = has('both');
  const rerankOnly = has('rerank');
  const connectionString = derivedUrl();
  const store = await openStore(openEmbeddings(), { connectionString, tableName: CHUNK_TABLE });

  embeddingUsage.promptTokens = 0;
  rerankUsage.scored = 0;
  rerankUsage.ms = 0;
  rerankUsage.loadMs = 0;

  const arms: Arm[] = [];
  const perCase: Record<string, { base?: CaseScore; reranked?: CaseScore; moved?: string[] }> = {};

  const runBaseline = both || !rerankOnly;
  const runReranked = both || rerankOnly;

  try {
    if (runBaseline) {
      console.log('\n\x1b[1mBASELINE — hybridSearch at k, no reranker\x1b[0m\n');
      const scores: CaseScore[] = [];
      let kwFailed = false;
      for (const c of cases) {
        const { hits, fullText } = await hybridSearch(store, c.query, c.k, filterOf(c), {
          tableName: CHUNK_TABLE,
          connectionString,
        });
        if (!fullText) kwFailed = true;
        const ranked = rank(hits);
        const s = scoreCase(c, ranked);
        scores.push(s);
        (perCase[c.id] ??= {}).base = s;
        line(s, c, ranked);
      }
      arms.push({ name: 'baseline', scores, keywordArmFailed: kwFailed });
    }

    if (runReranked) {
      console.log(
        `\n\x1b[1mRERANKED — hybridSearch at ${POOL}, cross-encoder, cut to k\x1b[0m\n` +
          `  \x1b[2m${DEFAULT_RERANK_MODEL}\x1b[0m\n`,
      );
      const scores: CaseScore[] = [];
      let kwFailed = false;
      for (const c of cases) {
        const { hits, fullText } = await hybridSearch(store, c.query, POOL, filterOf(c), {
          tableName: CHUNK_TABLE,
          connectionString,
        });
        if (!fullText) kwFailed = true;

        // The ceiling: recall@k after reranking cannot exceed recall@pool
        // before it. Reported per case, because it is what separates "rank it
        // better" from "find it at all" — and only the first is fixable here.
        const poolRanked = rank(hits);
        const inPool = c.expect.filter((e) => poolRanked.includes(e)).length / c.expect.length;

        // WHICH ARM FOUND THE THING WE WANTED, and where the fuser put it.
        //
        // This exists because the first write-up of `ret-007` credited the
        // reranker with understanding a question no keyword could match. That
        // was wrong: the keyword arm had ranked the target FIRST and the dense
        // arm had not returned it at all, and RRF buried it at 35 because a
        // single-arm hit scores 1/61 while any document BOTH arms rank 50th
        // scores 2/110. The reranker was undoing the fuser's damage.
        //
        // A claim about WHY a retriever failed is worth exactly as much as the
        // diagnostic behind it, so the diagnostic ships rather than the claim.
        const armNotes: string[] = [];
        for (const want of c.expect) {
          const at = poolRanked.indexOf(want);
          if (at === -1) continue;
          const h = hits[at]!;
          const arm = h.denseRank && h.sparseRank ? 'both' : h.denseRank ? 'meaning' : 'keywords';
          if (arm !== 'both' || at >= c.k) {
            armNotes.push(
              `        \x1b[2mwanted: fused ${at + 1}/${POOL}  dense=${h.denseRank ?? '—'} ` +
                `sparse=${h.sparseRank ?? '—'}  found by ${arm}\x1b[0m`,
            );
          }
        }

        const reranked = await rerankHits(c.query, hits, { pool: POOL });
        const ranked = rank(reranked.slice(0, c.k));
        const s = scoreCase(c, ranked);
        scores.push(s);
        (perCase[c.id] ??= {}).reranked = s;
        line(s, c, ranked);
        for (const n of armNotes) console.log(n);

        const moved = reranked
          .slice(0, c.k)
          .map((h, to) => ({ from: h.fromRank, to: to + 1 }))
          .filter((m) => m.from !== m.to)
          .map((m) => `${m.from}→${m.to}`);
        if (moved.length) console.log(`        \x1b[2mmoved: ${moved.join('  ')}\x1b[0m`);
        if (inPool < 1) {
          console.log(
            `        \x1b[2mceiling: only ${(inPool * 100).toFixed(0)}% of the expected labels were in the ` +
              `top-${POOL} pool at all — a reranker cannot fix that\x1b[0m`,
          );
        }
      }
      arms.push({ name: 'reranked', scores, keywordArmFailed: kwFailed });
    }
  } finally {
    await store.end().catch(() => {});
  }

  // ── the table ───────────────────────────────────────────────────────────
  console.log('\n\x1b[1m  arm        cases  recall@k   MRR\x1b[0m');
  const summaries = arms.map((a) => ({ arm: a, s: retrievalSummary(a.scores) }));
  for (const { arm, s } of summaries) {
    console.log(
      `  ${arm.name.padEnd(10)} ${String(s.passed).padStart(2)}/${s.cases}   ` +
        `${s.recall.toFixed(3)}    ${s.mrr.toFixed(3)}`,
    );
  }

  if (both && summaries.length === 2) {
    const [b, r] = summaries;
    const dRecall = r!.s.recall - b!.s.recall;
    const dMrr = r!.s.mrr - b!.s.mrr;
    const pts = (x: number): string => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)} points`;
    console.log(
      `\n  \x1b[1mthe reranker bought ${pts(dRecall)} of recall@${cases[0]!.k} ` +
        `and ${pts(dMrr)} of MRR\x1b[0m`,
    );
    const changed = cases.filter(
      (c) => perCase[c.id]?.base?.pass !== perCase[c.id]?.reranked?.pass,
    );
    if (changed.length) {
      for (const c of changed) {
        const was = perCase[c.id]!.base!.pass;
        console.log(`    ${was ? '\x1b[31mbroke' : '\x1b[32mfixed'}\x1b[0m  ${c.id}  ${c.query}`);
      }
    } else {
      console.log('    \x1b[2mno case changed pass/fail — the movement is all in rank\x1b[0m');
    }
  }

  const kwFailed = arms.some((a) => a.keywordArmFailed);
  if (kwFailed) {
    console.log(
      '\n  \x1b[31mThe keyword arm did not run — these are DENSE-ONLY results.\x1b[0m\n' +
        '  The full-text column is built by the index step; re-run\n' +
        '  `pnpm --filter @vantis/steering index`. Do not record this as a\n' +
        '  measurement of hybrid search.',
    );
  }

  // THE LIMIT, PRINTED IN THE OUTPUT and COUNTED rather than hard-coded —
  // pharma's runner had this caveat as a literal and it went out of date, which
  // is worse than no caveat because it is the line a reader trusts most.
  const client = new Client({ connectionString });
  await client.connect();
  const { rows } = await client.query<{ docs: number; chunks: number }>(
    `select count(distinct (metadata->>'documentId'))::int as docs, count(*)::int as chunks from ${CHUNK_TABLE}`,
  );
  await client.end();
  const { docs, chunks } = rows[0] ?? { docs: 0, chunks: 0 };
  console.log(
    `\n  \x1b[2mLimit: ${cases.length} cases over ${docs} documents and ${chunks} passages. Eight cases\n` +
      `  cannot say a retriever is good — they can say it got worse, which is the job.\x1b[0m`,
  );
  console.log(
    `\n  ${embeddingUsage.promptTokens} embedding tokens` +
      (rerankUsage.scored
        ? `, ${rerankUsage.scored} passages re-scored in ${(rerankUsage.ms / 1000).toFixed(1)}s ` +
          `(+${(rerankUsage.loadMs / 1000).toFixed(1)}s model load)`
        : '') +
      '\n',
  );

  if (has('save')) {
    mkdirSync(RESULTS, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = resolve(RESULTS, `retrieval-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          k: cases[0]?.k,
          pool: POOL,
          rerankModel: DEFAULT_RERANK_MODEL,
          embeddings: embeddingsChoice(),
          corpus: { documents: docs, passages: chunks },
          arms: summaries.map(({ arm, s }) => ({ arm: arm.name, ...s })),
          cases: Object.fromEntries(
            Object.entries(perCase).map(([id, v]) => [
              id,
              { baseline: v.base?.recall, reranked: v.reranked?.recall },
            ]),
          ),
        },
        null,
        2,
      ) + '\n',
    );
    console.log(`  saved ${file.replace(REPO_ROOT + '/', '')}\n`);
  }

  const worst = summaries[summaries.length - 1]!.s;
  process.exit(worst.passed === worst.cases && !kwFailed ? 0 : 1);
}

/** Guarded: `sql:check` asserts nothing on the answer path imports a running CLI. */
if (require.main === module) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
