/**
 * `pnpm safety:recalls-for [make] [model] [component]` — stage 4.2.
 *
 * With arguments, runs one query. With none, runs the checks that decide
 * whether 4.2 is done.
 *
 *   pnpm safety:recalls-for HONDA ODYSSEY "FORWARD COLLISION AVOIDANCE"
 *   pnpm safety:recalls-for FORD F-150 "POWER TRAIN:AUTOMATIC TRANSMISSION"
 */
import { findRecalls, type FindRecallsResult } from '../tools/find-recalls.tool';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YEL = '\x1b[33m';
const DIM = '\x1b[2m';
const OFF = '\x1b[0m';

const n = (x: number) => x.toLocaleString('en-GB');

function show(r: FindRecallsResult): void {
  const f = r.filter;
  console.log(
    `\n  ${f.make} ${f.model}${f.year ? ` ${f.year}` : ''}${f.component ? ` · ${f.component}` : ''}\n`,
  );

  if (!r.matches.length) {
    console.log(`  ${YEL}no campaign covers this${OFF}`);
    console.log(`  ${r.note}\n`);
    if (r.other_components_on_this_vehicle.length) {
      console.log(`  ${DIM}what IS recalled on this vehicle:${OFF}`);
      for (const c of r.other_components_on_this_vehicle) console.log(`    · ${c}`);
      console.log();
    }
    return;
  }

  for (const m of r.matches) {
    console.log(`  ${GREEN}${m.campaign_number}${OFF}  ${DIM}${m.manufacturer}${OFF}`);
    console.log(`     ${m.component}`);
    console.log(
      `     ${m.units_affected === null ? 'units not stated' : `${n(m.units_affected)} units`}` +
        ` · notified ${m.owners_notified ?? '—'} · ${m.initiated_by}`,
    );
  }
  console.log();
}

async function checks(): Promise<number> {
  let failed = 0;
  const check = (ok: boolean, name: string, detail: string) => {
    if (!ok) failed++;
    console.log(`  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`}  ${name}`);
    console.log(`        ${detail}`);
  };

  console.log('\nstage 4.2 · find_recalls\n');

  // 1 — REC-005. THE WHOLE POINT OF THE TOOL: the right answer is nothing.
  const odyssey = await findRecalls({
    make: 'HONDA',
    model: 'ODYSSEY',
    component: 'FORWARD COLLISION AVOIDANCE',
  });
  check(
    odyssey.matches.length === 0,
    'REC-005 · no campaign covers the Odyssey forward-collision braking',
    `${odyssey.matches.length} match(es) — the key says none exist`,
  );

  // 2 — and the empty answer is not empty-handed. "No recalls" and "no recalls
  //     for THAT component" are different claims and only one is true.
  check(
    odyssey.other_components_on_this_vehicle.length > 0,
    'REC-005 · the empty result carries evidence that it was looked for',
    `${odyssey.other_components_on_this_vehicle.length} other recalled components on this vehicle, ` +
      `e.g. ${odyssey.other_components_on_this_vehicle[0] ?? '—'}`,
  );

  // 3 — the prefix rule takes BOTH children, which is what REC-005 needs. If it
  //     only matched one spacing, the "no match" above could be a false
  //     negative produced by punctuation rather than by the data.
  const spaced = await findRecalls({
    make: 'HONDA',
    model: 'ODYSSEY',
    component: 'BACK OVER PREVENTION',
  });
  check(
    spaced.matches.length > 0,
    'the component prefix matches across NHTSA’s inconsistent spacing',
    `"BACK OVER PREVENTION" found ${spaced.matches.length} — the stored value is ` +
      '"BACK OVER PREVENTION: SENSING SYSTEM: CAMERA", with spaces after the colons',
  );

  // 4 — the positive case, and it must be the PRNDL branch alone.
  const f150 = await findRecalls({
    make: 'FORD',
    model: 'F-150',
    component: 'POWER TRAIN:AUTOMATIC TRANSMISSION',
  });
  check(
    f150.matches.some((m) => m.campaign_number === '20V197000'),
    'REC-001 · the F-150 transmission recall is found by vehicle + component',
    f150.matches.map((m) => m.campaign_number).join(', ') || 'none',
  );
  check(
    f150.matches.every((m) => m.component.startsWith('POWER TRAIN:AUTOMATIC TRANSMISSION')),
    'the prefix does not drag in the rest of POWER TRAIN',
    f150.matches.map((m) => m.component).join(' | ') || 'none',
  );

  // 5 — the unnest trap, which this engagement has now met four times. A
  //     campaign covering three vehicles must appear ONCE.
  const expedition = await findRecalls({ make: 'FORD', model: 'EXPEDITION' });
  const ids = expedition.matches.map((m) => m.campaign_number);
  check(
    new Set(ids).size === ids.length,
    'a campaign covering several vehicles is returned ONCE, not once per vehicle',
    `${ids.length} rows, ${new Set(ids).size} distinct campaigns`,
  );

  // 6 — a vehicle that is not in the slice at all reads differently from a
  //     vehicle that is present but uncovered for one component.
  const nonsense = await findRecalls({ make: 'DELOREAN', model: 'DMC-12' });
  check(
    nonsense.matches.length === 0 && nonsense.other_components_on_this_vehicle.length === 0,
    'an unknown vehicle is distinguished from a vehicle with no matching recall',
    nonsense.note.slice(0, 96),
  );

  console.log(
    failed === 0
      ? `\n  find_recalls: ${GREEN}PASS${OFF} — stage 4.3 may begin\n`
      : `\n  find_recalls: ${RED}FAIL${OFF} — ${failed} check(s).\n`,
  );
  return failed;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args.length < 2) return checks();
  const [make, model, component] = args;
  show(await findRecalls({ make, model, component }));
  return 0;
}

main().then((f) => process.exit(f === 0 ? 0 : 1));
