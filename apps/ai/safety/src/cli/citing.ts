/**
 * `pnpm safety:citing [campaign]` — stage 4.4b.
 *
 * With no arguments, runs the checks. The count is verified with `grep` over
 * the raw file — guardrail 3 again, and the cheapest possible independent
 * check for a tool whose query is a substring match.
 */
import { execSync } from 'node:child_process';
import { complaintsCiting } from '../tools/complaints-citing.tool';
import { COMPLAINTS_TSV } from '../config/paths';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

/** Distinct complaints in the raw TSV whose row contains this campaign id. */
function grepCount(id: string): number {
  const cmd = `grep -F ${JSON.stringify(id)} ${JSON.stringify(COMPLAINTS_TSV)} | cut -f2 | sort -u | wc -l`;
  return Number(execSync(cmd, { shell: '/bin/bash', encoding: 'utf8' }).trim());
}

async function main(): Promise<number> {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));

  if (arg) {
    const r = await complaintsCiting(arg);
    console.log(`\n  ${r.campaign_number}  ${r.complaints.length} complaint(s) cite it\n`);
    console.log(`  ${r.note}\n`);
    for (const c of r.complaints) {
      console.log(`  ${c.odi_number}  ${DIM}${c.year} ${c.make} ${c.model} · filed ${c.filed}${OFF}`);
      console.log(`     ${JSON.stringify(c.text).slice(1, 150)}…\n`);
    }
    return 0;
  }

  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  console.log('\nstage 4.4b · complaints_citing\n');

  // 1 — REC-001's campaign, checked against grep over the raw file.
  const r = await complaintsCiting('20V197000');
  const shell = grepCount('20V197000');
  check(
    r.complaints.length === shell && r.complaints.length === 7,
    'REC-001 · complaints naming 20V197000, agreed by grep over the raw file',
    `tool ${r.complaints.length} · grep ${shell} · expected 7`,
  );

  // 2 — these are evidence BY REFERENCE, so they should be the recalled
  //     vehicles. Not asserted as a rule — an owner can cite the wrong
  //     campaign — but reported, because a stray would be worth seeing.
  const fords = r.complaints.filter((c) => c.make === 'FORD').length;
  check(
    r.complaints.length > 0,
    'the citing complaints are returned with their vehicles, for inspection',
    `${fords} of ${r.complaints.length} are FORD — ` +
      r.complaints.map((c) => `${c.odi_number} ${c.model}`).join(', '),
  );

  // 2b — AND ONE OF THE SEVEN IS FILED UNDER THE WRONG VEHICLE.
  //
  //      11618838's structured model is `F-250 SD`. Its narrative opens "The
  //      contact owns a 2020 Ford F-150". NHTSA's own record disagrees with the
  //      owner's own words, and the FILTER BELIEVES THE FIELD — so
  //      `search_complaints(make FORD, model F-150)` cannot return it, measured.
  //
  //      This is the honest limit of stage 4's whole thesis. Filtering on
  //      structured fields beats matching prose, and it inherits the data's
  //      errors: 1 of the 177 complaints saying "owns a 2020 Ford F-150" is
  //      filed under another model.
  //
  //      It is also why this tool earns its place rather than duplicating 4.3.
  //      Reference finds what the filter cannot.
  const misfiled = r.complaints.find((c) => c.odi_number === '11618838');
  check(
    !!misfiled && misfiled.model !== 'F-150' && /F-150/i.test(misfiled.text),
    'a complaint the vehicle filter MISSES is found here, by reference',
    misfiled
      ? `11618838 is filed as "${misfiled.model}" but its narrative says F-150 — ` +
        'search_complaints(model=F-150) cannot return it; citing does'
      : 'not present',
  );

  // 3 — THE TWO EMPTIES, which must not read alike. A campaign nobody cites is
  //     ordinary; a campaign that is not here says nothing at all.
  //
  //     17V510000 and not 19V864000: the first draft assumed the latter was
  //     uncited and two complaints name it. The premise was wrong, not the
  //     tool. This one is verified by grep below rather than assumed.
  const uncited = await complaintsCiting('17V510000');
  check(
    uncited.campaign_exists &&
      uncited.complaints.length === 0 &&
      grepCount('17V510000') === 0 &&
      /NOT evidence the recall worked/.test(uncited.note),
    'a real campaign nobody cites says so, and refuses to read as an all-clear',
    `${uncited.complaints.length} citing · grep ${grepCount('17V510000')} · exists=${uncited.campaign_exists}`,
  );

  const absent = await complaintsCiting('99V999999');
  check(
    !absent.campaign_exists && /not in this corpus/.test(absent.note),
    'a campaign absent from the corpus is distinguished from one nobody cites',
    absent.note.slice(0, 88),
  );

  // 4 — the manufacturer's own number, measured and NOT built on.
  const ford = grepCount('20S18');
  check(
    ford === 0,
    "the manufacturer's own recall number is not how owners refer to it",
    `20V197000's remedy says "Ford's number for this recall is 20S18" — ` +
      `${ford} complaints name 20S18, against 7 naming the campaign`,
  );

  // 5 — a malformed id is refused before any query runs.
  const bad = await complaintsCiting('20V19700');
  check(
    bad.complaints.length === 0 && /not a campaign number/.test(bad.note),
    'a malformed campaign number is refused, not searched for',
    bad.note.slice(0, 72),
  );

  console.log(
    failed === 0
      ? `\n  complaints_citing: ${GREEN}PASS${OFF} — stage 4.5 may begin\n`
      : `\n  complaints_citing: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
