/**
 * `pnpm safety:count` — stage 4.4.
 *
 * ── EVERY NUMBER IS CHECKED AGAINST `awk` OVER THE RAW FILE ───────────────
 *
 * `docs/safety/ARCHITECTURE.md` guardrail 3: every count about a file gets a
 * no-parser check beside it. This is the tool whose ENTIRE OUTPUT is a number,
 * so it gets the strictest form — the same figure computed by a shell pipeline
 * that shares no code, no parser, no database and no schema with it.
 *
 * The raw columns are 1-indexed, and deliberately written out here rather than
 * imported from `parse.ts`: importing them would make the check agree with the
 * parser by construction, which is the thing it exists to test.
 *
 *   $2 ODINO    $4 MAKE    $5 MODEL    $6 YEAR
 *   $11 DEATHS  $12 COMPDESC          $17 LDATE
 *
 * AND IT COUNTS DISTINCT ODINO, because the file carries one row per COMPONENT.
 * That is the trap that has appeared five times in this engagement, and `sort -u`
 * is how the shell side avoids it.
 */
import { execSync } from 'node:child_process';
import { countComplaints } from '../tools/count-complaints.tool';
import { COMPLAINTS_TSV } from '../config/paths';
import type { ComplaintFilter } from '../tools/search-complaints.tool';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const n = (x: number) => x.toLocaleString('en-GB');

/** Count distinct complaints in the raw TSV with a shell pipeline. */
function awkCount(predicate: string): number {
  const cmd = `awk -F'\\t' '${predicate} {print $2}' ${JSON.stringify(COMPLAINTS_TSV)} | sort -u | wc -l`;
  return Number(execSync(cmd, { shell: '/bin/bash', encoding: 'utf8' }).trim());
}

async function main(): Promise<number> {
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  console.log('\nstage 4.4 · count_complaints');
  console.log(`  ${DIM}every number checked against awk over ${COMPLAINTS_TSV}${OFF}\n`);

  const cases: Array<{ name: string; filter: ComplaintFilter; awk: string; key: number }> = [
    {
      name: 'REC-004 · Tesla Model 3 complaints involving a death',
      filter: { make: 'TESLA', model: 'MODEL 3', min_deaths: 1 },
      awk: '$4=="TESLA" && $5=="MODEL 3" && $11+0>0',
      key: 5,
    },
    {
      name: 'REC-005 · Odyssey forward-collision complaints',
      filter: { make: 'HONDA', model: 'ODYSSEY', component: 'FORWARD COLLISION AVOIDANCE' },
      awk: '$4=="HONDA" && $5=="ODYSSEY" && $12 ~ /^FORWARD COLLISION AVOIDANCE/',
      key: 400,
    },
    {
      name: 'REC-001 · F-150 power-train complaints filed after the recall',
      filter: {
        make: 'FORD',
        model: 'F-150',
        component: 'POWER TRAIN',
        filed_after: '2020-04-27',
      },
      awk: '$4=="FORD" && $5=="F-150" && $12 ~ /^POWER TRAIN/ && $17+0 > 20200427',
      key: 1057,
    },
  ];

  for (const c of cases) {
    const tool = await countComplaints(c.filter);
    const shell = awkCount(c.awk);
    check(
      tool.count === shell && tool.count === c.key,
      c.name,
      `tool ${n(tool.count)} · awk ${n(shell)} · answer key ${n(c.key)}`,
    );
  }

  // 4 — THE PARTITION, which is REC-001's actual lesson. The filter counts a
  //     COMPONENT; narrowing by phrase counts something closer to a DEFECT. The
  //     two must add up to the whole, whatever the phrase happens to match.
  //
  //     Note what is NOT asserted: the key's 103. It is marked unverified in
  //     WALKTHROUGH.md because the symptom predicate was never written down,
  //     and guessing at one produced 93. Asserting a number nobody can
  //     reproduce would make this check a fiction. The ARITHMETIC is checkable
  //     without it.
  const base: ComplaintFilter = {
    make: 'FORD',
    model: 'F-150',
    component: 'POWER TRAIN',
    filed_after: '2020-04-27',
  };
  const all = await countComplaints(base);
  //     NOTE THE `or`s. Spaces mean AND in websearch syntax, and the first
  //     version of this check used them — asking for complaints containing
  //     park AND prndl AND rollaway AND shift AND cable, which is nothing.
  const defect = await countComplaints(base, 'park or prndl or rollaway or "shift cable"');
  check(
    defect.count > 0 && defect.count < all.count,
    'REC-001 · narrowing by defect gives a strictly smaller number than the component',
    `${n(all.count)} name the component · ${n(defect.count)} describe the defect · ` +
      `${n(all.count - defect.count)} share a component but not a defect`,
  );

  // 4b — AND AN OVER-CONSTRAINED PHRASE MUST NOT READ AS A CLEAN ZERO.
  //      This is the failure above, kept as a check. On a safety corpus
  //      "0 complaints describe this defect" is a false all-clear, and it is
  //      the same number a genuinely empty answer produces.
  const overConstrained = await countComplaints(base, 'park prndl rollaway shift cable');
  check(
    overConstrained.count === 0 && /DO NOT report this zero/.test(overConstrained.note),
    'a zero produced by an impossible phrase says so, instead of reading as an all-clear',
    overConstrained.note.slice(0, 104),
  );

  // 5 — the number carries its question. Stage 5's `counts` rule depends on it.
  check(
    JSON.stringify(all.filter) === JSON.stringify(base) && !!all.note,
    'the count is returned WITH the filter that produced it',
    `filter echoed: ${JSON.stringify(all.filter)}`,
  );

  // 6 — an empty result is zero, not an error and not a missing field.
  const zero = await countComplaints({ make: 'DELOREAN', model: 'DMC-12' });
  check(zero.count === 0, 'a filter matching nothing counts zero', `${zero.count}`);

  console.log(
    failed === 0
      ? `\n  count_complaints: ${GREEN}PASS${OFF} — stage 4.4b may begin\n`
      : `\n  count_complaints: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
