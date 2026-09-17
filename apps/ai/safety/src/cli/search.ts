/**
 * `pnpm safety:search "<question>"` — stages 3.5 and 3.6, one question.
 *
 * Prints BOTH ARMS SIDE BY SIDE before the fused list, because the disagreement
 * between them is the thing worth looking at. A result both arms liked is
 * unremarkable; one that only the keyword arm found is the case fusion handles
 * worst, and seeing it here is what makes stage 3.6b's reranker a decision
 * rather than a habit.
 */
import { safetyDatabaseUrl } from '../config/connections';
import { DEFAULT_K, foundBy, openForSearch, search, type SearchHit } from '../grounding/search';

const rank = (r?: number) => (r ? String(r).padStart(2) : ' ·');

/**
 * RECIPROCAL RANK FUSION, RESTATED HERE ON PURPOSE.
 *
 * `@fde/grounding` scores a hit `1/(60 + rank)` per arm and adds the two, then
 * divides the whole list by the best. This is that same arithmetic written out
 * a second time, from the two ranks PRINTED above — so the check below compares
 * the score the search returned against the score its own ranks imply.
 *
 * DELIBERATELY NOT AN IMPORT. `RRF_K` is private to `hybrid.ts`, and a check
 * that shares a constant with the thing it checks agrees with it by
 * construction. If that 60 ever changes, this disagrees loudly — which is the
 * correct outcome, not a false alarm.
 *
 * It exists because of a real failure: fusion deduplicates on
 * `metadata.chunkId`, our loader did not write one, and it fell back to the
 * first 120 characters of the text — identical across 174 passages that share a
 * generated header. Their scores ADDED. A hit at keyword rank 22 outscored one
 * at keyword rank 1, which is arithmetically impossible: 1/82 cannot beat 1/61.
 * Nothing errored, and the obvious suspect was the embedder.
 */
const RRF_K = 60;
const rawScore = (h: SearchHit) =>
  (h.denseRank ? 1 / (RRF_K + h.denseRank) : 0) + (h.sparseRank ? 1 / (RRF_K + h.sparseRank) : 0);

function line(h: SearchHit, i: number): void {
  const m = h.meta as Record<string, any>;
  const who = foundBy(h);
  const tag = who === 'both' ? '' : `  \x1b[33m← ${who} only\x1b[0m`;
  console.log(
    `  ${String(i + 1).padStart(2)}.  ${h.id.padEnd(12)} ` +
      `meaning ${rank(h.denseRank)}  keywords ${rank(h.sparseRank)}  ` +
      `score ${h.score.toFixed(4)}${tag}`,
  );
  const where = [m.year, m.make, m.model].filter(Boolean).join(' ');
  console.log(`        ${h.kind}${where ? ` · ${where}` : ''}${m.filed ? ` · filed ${m.filed}` : ''}`);
  console.log(`        ${JSON.stringify(h.text).slice(1, 150)}…\n`);
}

async function main(): Promise<number> {
  const query = process.argv.slice(2).filter((a) => !a.startsWith('-')).join(' ');
  if (!query) {
    console.log('\n  usage: pnpm safety:search "how many complaints about the F-150 park problem"\n');
    return 1;
  }
  const k = Number(process.env.SAFETY_K ?? DEFAULT_K);
  const conn = safetyDatabaseUrl();

  console.log(`\nstage 3.5 + 3.6 · search\n  "${query}"\n`);
  const store = await openForSearch(conn);
  const res = await search(store, conn, query, k);

  if (!res.fullText) {
    // NOT a warning to skim past. Dense-only retrieval on this corpus cannot
    // find a campaign number, and the answer would look fine.
    console.log('  \x1b[31mWARNING: the keyword arm did not run — these results are meaning-only\x1b[0m\n');
  }

  console.log(`  ${res.hits.length} results in ${res.ms}ms   (each arm fetched ${k * 4})\n`);
  res.hits.forEach(line);

  // ── does the fused order obey its own arithmetic? ───────────────────────
  const top = rawScore(res.hits[0] ?? ({} as SearchHit));
  const off = res.hits
    .map((h) => ({ h, expected: Number((rawScore(h) / (top || 1)).toFixed(3)) }))
    .filter(({ h, expected }) => Math.abs(expected - h.score) > 0.002);

  if (off.length) {
    console.log(
      `  \x1b[31mFUSION IS NOT ADDING UP: ${off.length} of ${res.hits.length} hits scored ` +
        'something their own ranks cannot produce.\x1b[0m',
    );
    for (const { h, expected } of off) {
      console.log(`      ${h.id.padEnd(12)} reported ${h.score.toFixed(3)}, ranks imply ${expected.toFixed(3)}`);
    }
    console.log('      Distinct passages are being fused into one entry — check metadata.chunkId.\n');
  } else {
    console.log('  fused scores match 1/(60+rank) summed over both arms — no passages collided.\n');
  }

  const only = res.hits.filter((h) => foundBy(h) !== 'both');
  console.log(
    only.length
      ? `  ${only.length} of ${res.hits.length} were found by ONE arm only — ` +
          'the case fusion handles worst, and what 3.6b exists for.\n'
      : '  Both arms agreed on every result.\n',
  );

  await store.end();
  return 0;
}

main().then((c) => process.exit(c));
