/**
 * `pnpm safety:recall [campaign]` — stage 4.1.
 *
 * With a campaign number, prints that record. With no arguments, runs the
 * checks that decide whether 4.1 is done.
 *
 * ── THE CHECKS ARE AGAINST THE HAND-WRITTEN KEY, NOT AGAINST THE TOOL ─────
 *
 * Every expected value below was written into `docs/safety/WALKTHROUGH.md` by a
 * person reading the raw files, before this tool existed. `55,158` and
 * `2020-04-27` are REC-002's answer; `ODI` is REC-003's. A tool checked against
 * its own output would pass no matter what it returned.
 */
import { getRecall, type RecallLookup } from '../tools/get-recall.tool';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const n = (x: number) => x.toLocaleString('en-GB');

function show(r: RecallLookup): void {
  if (!r.found) {
    console.log(`\n  ${RED}not found${OFF}  (${r.reason})`);
    console.log(`  ${r.note}\n`);
    return;
  }
  console.log(`\n  ${r.campaign_number}  ${DIM}${r.manufacturer}${OFF}`);
  console.log(`  component      ${r.component}`);
  console.log(
    `  vehicles       ${r.vehicles.map((v) => [v.year, v.make, v.model].filter(Boolean).join(' ')).join('; ')}`,
  );
  console.log(`  units          ${r.units_affected === null ? 'not stated' : n(r.units_affected)}`);
  console.log(`  notified       ${r.owners_notified ?? 'not stated'}`);
  console.log(`  initiated by   ${r.initiated_by}  ${DIM}(${r.influenced_by})${OFF}`);
  console.log(`\n  DEFECT       ${r.defect ?? '—'}`);
  console.log(`\n  CONSEQUENCE  ${r.consequence ?? '—'}`);
  console.log(`\n  REMEDY       ${r.remedy ?? '—'}\n`);
}

async function checks(): Promise<number> {
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  console.log('\nstage 4.1 · get_recall\n');

  // 1 — REC-002's campaign, with the four facts the key states.
  const r = await getRecall('20V197000');
  if (!r.found) {
    check(false, 'REC-002 · 20V197000 is found at all', r.note);
    return 1;
  }
  check(
    r.units_affected === 55158,
    'REC-002 · units affected matches the hand-written answer',
    `${r.units_affected === null ? 'not stated' : n(r.units_affected)}, key says 55,158`,
  );
  check(
    r.owners_notified === '2020-04-27',
    'REC-002 · owners notified matches',
    `${r.owners_notified}, key says 2020-04-27`,
  );
  check(
    r.vehicles.length === 3 && r.vehicles.every((v) => v.make === 'FORD' && v.year === 2020),
    'REC-002 · covers the three 2020 Ford vehicles',
    r.vehicles.map((v) => `${v.year} ${v.make} ${v.model}`).join('; ') || 'none',
  );
  check(
    (r.remedy ?? '').toLowerCase().includes('shift cable'),
    'REC-002 · the remedy text survived parsing intact',
    r.remedy ? `${r.remedy.slice(0, 68)}…` : 'no remedy section found',
  );

  // 2 — REC-003 turns entirely on this field being read, not inferred.
  const pushed = await getRecall('19V864000');
  check(
    pushed.found && pushed.influenced_by === 'ODI',
    'REC-003 · 19V864000 is recorded as ODI-initiated, not volunteered',
    pushed.found ? `influenced_by=${pushed.influenced_by} — ${pushed.initiated_by}` : 'not found',
  );

  // 3 — THE TWO WAYS OF NOT EXISTING, reported differently. A model that
  //     mistyped can correct itself; a model told only "not found" may conclude
  //     the recall does not exist and say so in an answer.
  const bad = await getRecall('20V19700');
  check(
    !bad.found && bad.reason === 'malformed',
    'a mistyped number is reported as MALFORMED, not as absent',
    !bad.found ? bad.reason : 'it returned a record',
  );

  const gone = await getRecall('99V999999');
  check(
    !gone.found && gone.reason === 'absent',
    'a well-formed but missing number is reported as ABSENT',
    !gone.found ? gone.reason : 'it returned a record',
  );

  // 4 — the rule the tool exists for. Stage 3.5 put this campaign at position 4
  //     when the same question went through search.
  check(
    r.found && r.campaign_number === '20V197000',
    'the lookup returns the campaign itself, not the most similar document',
    'search put this at position 4 behind a Lincoln Corsair complaint',
  );

  console.log(
    failed === 0
      ? `\n  get_recall: ${GREEN}PASS${OFF} — stage 4.2 may begin\n`
      : `\n  get_recall: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

async function main(): Promise<number> {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  if (!arg) return checks();
  show(await getRecall(arg));
  return 0;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
