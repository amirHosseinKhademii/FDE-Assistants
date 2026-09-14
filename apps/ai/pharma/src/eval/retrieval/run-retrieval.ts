/**
 *   pnpm retrieval:eval
 *
 * The LIVE retrieval measurement. Needs the ingested index, and COSTS MONEY —
 * one query embedding per case. Named `:eval` and not `:check` for exactly that
 * reason: in this repo `*-check` is free and offline, `*-eval` is neither.
 *
 * `EMBEDDINGS=local` cannot substitute. The index was built with Foundry's
 * 1536-dimension model and a local 384-dimension query vector does not compare
 * against it — see `embeddings.factory.ts`, which says the two are not
 * comparable and that switching means re-ingesting everything.
 *
 * WHAT IS MEASURED: `hybridSearch` directly, NOT `search_procedures`. The tool
 * over-fetches k*6, applies the `as_of` window, then slices to k; measuring
 * through it would blend retriever quality with `inForceOn`, which is already
 * unit-checked by `pnpm tools:check`. One number, one cause. That is also why
 * no case carries an `as_of`.
 *
 * WHY A SIBLING REVISION IS NOT AN INTRUDER, and this is the trap most likely
 * to produce a wrong red result here. `search_procedures` keeps superseded
 * revisions searchable ON PURPOSE — Rev 6 governed every batch certified
 * between 2023-07-01 and 2026-02-28, and `rel-007` asks about one of them.
 * Precedence is applied per question by `as_of`, AFTER retrieval. So a query
 * about the training precondition legitimately returns both revisions, and a
 * case that rejected Rev 6 would fail a system behaving exactly as designed.
 * `reject` is for content that is genuinely wrong, never for the sibling.
 *
 * NO `reject` IS SET ON ANY CASE IN THE FIRST PASS, deliberately. This repo's
 * own history is three occasions where a red check was the check's fault; a
 * rejection written before anybody had seen what the retriever actually returns
 * is that mistake with extra steps. Run it, read `ranked`, then tighten.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openStore, hybridSearch } from '@fde/grounding';
import { Pool } from 'pg';
import { KB_DB, urlFor, REPO_ROOT } from '../../config/connections';
import { openEmbeddings, embeddingsChoice, embeddingUsage } from '../../grounding/embeddings.factory';
import { labelOf, scoreCase, retrievalSummary, type RetrievalCase } from './retrieval';

/** The same table `search_procedures` reads. Hard-coded in both, on purpose. */
const TABLE = 'document_chunks';
const CASES = resolve(REPO_ROOT, 'docs', 'pharma', 'evals', 'retrieval.jsonl');

function loadCases(only?: string, tag?: string): RetrievalCase[] {
  const all = readFileSync(CASES, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as RetrievalCase);

  return all.filter((c) => (!only || c.id === only) && (!tag || c.tags.includes(tag)));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };

  const cases = loadCases(flag('only'), flag('tag'));
  if (cases.length === 0) {
    console.log('\nNo cases matched.\n');
    process.exit(1);
  }

  if (embeddingsChoice() === 'local') {
    console.log(
      '\n\x1b[31mEMBEDDINGS=local against a Foundry-built index measures nothing.\x1b[0m\n' +
        'The two models have different dimensions and are not comparable. Re-ingest ' +
        'or unset EMBEDDINGS.\n',
    );
    process.exit(1);
  }

  const connectionString = urlFor(KB_DB);
  const store = await openStore(openEmbeddings(), { connectionString, tableName: TABLE });
  const pool = new Pool({ connectionString, max: 2 });

  console.log('\nRetrieval eval — hybridSearch, measured directly\n');

  embeddingUsage.promptTokens = 0;
  let keywordArmFailed = false;

  const scores = [];
  for (const c of cases) {
    const filter = c.sop_id ? { sopId: c.sop_id } : undefined;
    const { hits, fullText } = await hybridSearch(store, c.query, c.k, filter, {
      tableName: TABLE,
      connectionString,
    });
    if (!fullText) keywordArmFailed = true;

    const ranked = hits.map((h) => labelOf(String(h.doc.metadata?.section ?? '')));
    const s = scoreCase(c, ranked);
    scores.push(s);

    console.log(`  ${s.pass ? 'ok  ' : 'FAIL'}  ${c.id.padEnd(12)} recall=${s.recall.toFixed(2)}  rr=${s.rr.toFixed(2)}`);
    console.log(`        q: "${c.query}"${c.sop_id ? `  [${c.sop_id}]` : '  [unfiltered]'}`);
    if (!s.pass) {
      if (s.missing.length) console.log(`        \x1b[31mmissing: ${s.missing.join(', ')}\x1b[0m`);
      if (s.intruders.length) console.log(`        \x1b[31mintruders: ${s.intruders.join(', ')}\x1b[0m`);
    }
    // ALWAYS printed, pass or fail. On a pass it is how you notice the right
    // clause arrived for the wrong reason; on a fail it is the only thing that
    // distinguishes "we missed it" from "the retriever returned junk" — an
    // unlabelled chunk shows as `null` and can be neither a hit nor a miss.
    console.log(`        got: ${ranked.map((l) => l ?? '(unlabelled)').join(' | ')}`);
  }

  const summary = retrievalSummary(scores);

  console.log(`\n  cases    ${summary.passed}/${summary.cases} pass`);
  console.log(`  recall@k ${summary.recall.toFixed(3)}   \x1b[2m(gates)\x1b[0m`);
  console.log(`  MRR      ${summary.mrr.toFixed(3)}   \x1b[2m(observation only — see retrieval.ts)\x1b[0m`);

  // THE LIMIT, PRINTED IN THE OUTPUT RATHER THAN ONLY IN A DOC, following N1's
  // precedent. A number read without it is read as stronger than it is.
  // COUNTED, NOT HARD-CODED. This line read "3 documents, 50 chunks" for a run
  // over 5 documents and 75 chunks, because the caveat was a literal somebody
  // had to remember to update. A stated limit that is itself out of date is
  // worse than none — it is the part of the output a reader trusts most.
  const { rows: corpus } = await pool.query<{ docs: number; chunks: number }>(
    `select count(distinct (metadata->>'docRef'))::int as docs, count(*)::int as chunks from ${TABLE}`,
  );
  const { docs, chunks } = corpus[0] ?? { docs: 0, chunks: 0 };
  console.log(
    `\n  \x1b[2mLimit: ${docs} documents, ${chunks} chunks. A top-${cases[0]?.k ?? 5} out of ${chunks} is a weak\n` +
      '  test — it catches a broken retriever, not a mediocre one. The confusable\n' +
      '  pairs are the two revisions of SOP-QC-014 and of SOP-QC-003, and two\n' +
      '  different §7.3s.\x1b[0m',
  );

  if (keywordArmFailed) {
    console.log(
      '\n  \x1b[31mThe keyword arm did not run — these are DENSE-ONLY results.\x1b[0m\n' +
        '  The full-text column is created by ingest; re-run `pnpm pharma:ingest`.\n' +
        '  Do not record this as a measurement of hybrid search.',
    );
  }

  console.log(`\n  ${embeddingUsage.promptTokens} embedding tokens for ${cases.length} queries\n`);

  await pool.end().catch(() => {});
  process.exit(summary.passed === summary.cases && !keywordArmFailed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
