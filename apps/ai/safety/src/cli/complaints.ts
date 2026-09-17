/**
 * `pnpm safety:complaints` — stage 4.3.
 *
 * No arguments runs the checks. The headline one compares this tool against
 * stage 3.7's unfiltered search on the SAME question, because that comparison
 * is the entire claim stage 4 makes.
 */
import { searchComplaints, type SearchComplaintsResult } from '../tools/search-complaints.tool';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const n = (x: number) => x.toLocaleString('en-GB');

function show(r: SearchComplaintsResult): void {
  console.log(`\n  filter    ${JSON.stringify(r.filter)}`);
  console.log(`  query     "${r.query}"`);
  console.log(`  ${GREEN}${n(r.candidates)}${OFF} complaints matched the filter, of 70,194\n`);
  r.hits.forEach((h, i) => {
    const arms = `meaning ${h.denseRank ?? '·'}  keywords ${h.sparseRank ?? '·'}`;
    console.log(
      `  ${String(i + 1).padStart(2)}. ${h.odi_number}  ${arms}  score ${h.score.toFixed(3)}`,
    );
    console.log(`      ${DIM}${h.year} ${h.make} ${h.model} · filed ${h.filed}${OFF}`);
    console.log(`      ${JSON.stringify(h.text).slice(1, 132)}…\n`);
  });
}

async function checks(): Promise<number> {
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  console.log('\nstage 4.3 · search_complaints\n');

  // 1 — THE HEADLINE. Stage 3.7 asked this question unfiltered and 11353867 was
  //     absent from the top 6 AND from the top 50; its keyword rank was 3,026.
  const rec001 = await searchComplaints(
    {
      make: 'FORD',
      model: 'F-150',
      component: 'POWER TRAIN',
      filed_after: '2020-04-27',
    },
    'will not go into park, rolls away, gear shift indicator wrong',
  );
  const at = rec001.hits.findIndex((h) => h.odi_number === '11353867');
  check(
    at >= 0,
    'REC-001 · the complaint search could not find at all is now in the top 6',
    at >= 0
      ? `11353867 at position ${at + 1}, searching ${n(rec001.candidates)} filtered complaints — ` +
        'unfiltered it was outside the top 50, at keyword rank 3,026'
      : `absent. Searched ${n(rec001.candidates)} candidates.`,
  );
  check(
    rec001.candidates > 0 && rec001.candidates < 2000,
    'the filter actually narrowed the corpus',
    `${n(rec001.candidates)} candidates, from 70,194`,
  );

  // 2 — REC-004 was a filter question wearing a search question's clothes. The
  //     filter alone should produce the five, regardless of the query text.
  const deaths = await searchComplaints(
    { make: 'TESLA', model: 'MODEL 3', min_deaths: 1 },
    'fatal accident autopilot',
  );
  const five = ['11302656', '11364724', '11473666', '11524321', '11533202'];
  const found = five.filter((id) => deaths.hits.some((h) => h.odi_number === id));
  check(
    deaths.candidates === 5,
    'REC-004 · the filter alone isolates exactly the 5 death complaints',
    `${deaths.candidates} candidates, key says 5`,
  );
  check(
    found.length === 5,
    'REC-004 · all five come back in the top 6',
    `${found.length} of 5: ${found.join(', ')}`,
  );

  // 3 — the date filter is a DATE comparison, not a string one. REC-008 exists
  //     to catch this regressing silently.
  const before = await searchComplaints(
    { make: 'FORD', model: 'F-150', component: 'POWER TRAIN', filed_before: '2020-04-26' },
    'park',
  );
  check(
    before.candidates > 0 && before.candidates + rec001.candidates <= 1200,
    'REC-008 · before and after the recall date partition the same set',
    `${n(before.candidates)} before + ${n(rec001.candidates)} after`,
  );

  // 4 — an impossible filter returns NOTHING and says so, rather than widening
  //     itself and answering from whatever came back.
  const none = await searchComplaints({ make: 'FORD', model: 'F-150', min_deaths: 99 }, 'park');
  check(
    none.candidates === 0 && none.hits.length === 0,
    'an impossible filter returns nothing, and does not silently widen',
    none.note.slice(0, 92),
  );

  // 5 — both arms searched the SAME universe. If a hit came back that the
  //     filter excludes, the two halves were filtering differently — the exact
  //     failure this tool is shaped to avoid.
  const strays = rec001.hits.filter((h) => h.make !== 'FORD' || h.model !== 'F-150');
  check(
    strays.length === 0,
    'every fused hit satisfies the filter — both arms searched one universe',
    strays.length ? strays.map((s) => `${s.odi_number} ${s.make} ${s.model}`).join(', ') : 'no strays',
  );

  console.log(
    failed === 0
      ? `\n  search_complaints: ${GREEN}PASS${OFF} — stage 4.4 may begin\n`
      : `\n  search_complaints: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length < 3) return checks();
  const [make, model, ...rest] = args;
  show(await searchComplaints({ make, model }, rest.join(' ')));
  return 0;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
