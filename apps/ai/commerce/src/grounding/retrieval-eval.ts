/**
 * `pnpm commerce:retrieval-eval` — recall@k for the policy index, measured the
 * way `search_policy` will call it: `searchPolicy`, as the read-only role.
 *
 * CORPUS.md §5 makes this THE GATE: the corpus stays at twelve documents until a
 * number says it is too easy. Steering's docs/steering/evals/RETRIEVAL.md is the
 * precedent for what the number is for — "adding a reranker now is guessing it
 * helps; adding it after gives you 'the reranker bought 7 points'."
 *
 * THE SCORER IS CHECKED BEFORE IT SCORES. The matching rule is the answer key's
 * (docs/commerce/evals/README.md): `X#4` matches §4 and every §4.n; `X#4.1`
 * matches only a passage that CONTAINS sub-rule 4.1; bare `X` matches any section.
 * A scorer that matched everything would report perfect recall on any index.
 *
 * T4 IS NOT A MISS AND NOT A HIT. It is `absent: true` — excluded from recall,
 * and asserted instead: k passages still come back, and none claims to address a
 * third-party seller.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { searchPolicy, type PolicyHit } from './query';

const REPO = join(__dirname, '..', '..', '..', '..', '..');
config({ path: join(REPO, '.env'), quiet: true });
const CASES = join(REPO, 'docs', 'commerce', 'evals', 'retrieval.jsonl');

interface Case {
  id: string;
  query: string;
  k: number;
  expect: string[];
  absent?: boolean;
  tags: string[];
}

/** Does this hit satisfy this expected citation? The answer key's rule, exactly. */
export function satisfies(hit: Pick<PolicyHit, 'revisionId' | 'section' | 'subsections'>, expected: string): boolean {
  const [rev, sec] = expected.split('#');
  if (hit.revisionId !== rev) return false;
  if (!sec) return true;
  if (!sec.includes('.')) return hit.section === sec || (hit.section ?? '').startsWith(`${sec}.`);
  return hit.section === sec || hit.subsections.includes(sec);
}

let failed = 0;
function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

function scorerChecks(): void {
  console.log('THE SCORER, before it scores anything');
  const h = (revisionId: string, section: string | null, subsections: string[] = []) => ({ revisionId, section, subsections });
  check('#4 matches a passage in §4', satisfies(h('POL-GDW-003 Rev 2', '4'), 'POL-GDW-003 Rev 2#4'), 'section-level expectation');
  check('#4.1 matches a §4 passage that CONTAINS **4.1**', satisfies(h('POL-GDW-003 Rev 2', '4', ['4.1', '4.2']), 'POL-GDW-003 Rev 2#4.1'), 'sub-rules are paragraphs, not headings');
  check('#4.1 does NOT match a §4 passage without 4.1', !satisfies(h('POL-GDW-003 Rev 2', '4', ['4.3']), 'POL-GDW-003 Rev 2#4.1'), 'otherwise every §4 chunk would count for every §4.n');
  check('the wrong REVISION never matches', !satisfies(h('POL-RET-001 Rev 2', '2'), 'POL-RET-001 Rev 3#2'), 'Rev 2 and Rev 3 disagree about electronics; a prefix match is how that gets hidden');
  check('a bare id matches any section of that revision', satisfies(h('NOTE-ELEC-2022', '3'), 'NOTE-ELEC-2022'), 'cov-dmg-004 scores `cites:policy:BUL-RET-2025-03` with no section');
  console.log('');
}

async function main(): Promise<void> {
  const reader = process.env.COMMERCE_KB_URL;
  if (!reader) {
    console.error('\nretrieval-eval cannot run: COMMERCE_KB_URL is not set — run `pnpm commerce:kb-provision`.\n');
    process.exit(2);
  }
  const cases: Case[] = readFileSync(CASES, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

  console.log(`\ncommerce:retrieval-eval — ${cases.length} cases, searchPolicy as the read-only role\n`);
  scorerChecks();

  console.log('THE CASES');
  const scored: Array<{ id: string; recall: number; rr: number }> = [];
  for (const c of cases) {
    const { hits, fullText } = await searchPolicy({ connectionString: reader, query: c.query, k: c.k });
    const top = hits.map((x) => `${x.citation}${x.subsections.length ? `[${x.subsections.join(',')}]` : ''}`).join(' · ');
    if (c.absent) {
      const claims = hits.filter((x) => /\b(marketplace|third[- ]party (seller|sale|sold)|sold by (another|a third))/i.test(x.text));
      check(
        `${c.id} ABSENT — k passages return, none addresses a third-party seller`,
        hits.length === c.k && claims.length === 0 && fullText,
        `${hits.length} returned${claims.length ? `; CLAIMS TO ADDRESS IT: ${claims.map((x) => x.citation).join(', ')}` : ''}. ` +
          `Top: ${top}. Excluded from recall — there is nothing to recall`,
      );
      continue;
    }
    const found = c.expect.filter((e) => hits.some((x) => satisfies(x, e)));
    const firstRank = hits.findIndex((x) => c.expect.some((e) => satisfies(x, e)));
    const recall = found.length / c.expect.length;
    scored.push({ id: c.id, recall, rr: firstRank === -1 ? 0 : 1 / (firstRank + 1) });
    console.log(
      `  ${recall === 1 ? 'hit ' : recall > 0 ? 'part' : 'MISS'}  ${c.id.padEnd(12)} recall ${found.length}/${c.expect.length}` +
        `${firstRank >= 0 ? `, first at rank ${firstRank + 1}` : ''}${fullText ? '' : '  (DENSE ONLY)'}\n        top ${c.k}: ${top}`,
    );
  }

  const n = scored.length;
  const recallAtK = scored.reduce((a, s) => a + s.recall, 0) / n;
  const mrr = scored.reduce((a, s) => a + s.rr, 0) / n;
  const full = scored.filter((s) => s.recall === 1).length;
  console.log(
    `\n  THE NUMBER   ${full}/${n} cases fully recalled · recall@6 ${recallAtK.toFixed(3)} · MRR ${mrr.toFixed(3)}` +
      `   (+1 absence case, asserted separately)\n`,
  );

  console.log('THE HARNESS ITSELF');
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');

  // Recall is a MEASUREMENT, reported not gated. Only the scorer and the
  // absence assertion can fail the run.
  console.log(`\n${failed === 0 ? 'scorer and absence checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nretrieval-eval crashed:', (e as Error).message);
  process.exit(1);
});
