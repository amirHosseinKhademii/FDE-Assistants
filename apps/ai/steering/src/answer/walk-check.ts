/**
 * `pnpm steering:walk-check` — the answer key, locked in.
 *
 * ── WHAT THIS IS FOR ──────────────────────────────────────────────────────
 *
 * Steps 1 and 2 of Phase A worked out, by hand, what the right answers are.
 * Those answers are only useful as a yardstick if they STAY the right answers:
 * the moment somebody regenerates the estate, edits a generator, or changes a
 * rate card, the gearbox could quietly stop costing EUR 80,034 and nothing
 * would say so.
 *
 * So every conclusion the two walks reach is asserted here, against the live
 * databases, through the SAME derivation code the walks print from.
 *
 * ── AND IT IS TESTED IN BOTH DIRECTIONS ───────────────────────────────────
 *
 * A suite of only-positive assertions cannot tell you it is passing for the
 * wrong reason. This repo learned that from an injection self-test that passed
 * because its fixture was malformed rather than because the attack was blocked.
 *
 * So the bottom of this file breaks the reasoning on purpose — a shortlist with
 * the lifecycle filter removed, a price taken as a mean, a comparable set cut
 * below the refusal threshold — and requires each break to change the answer.
 * If a sabotage does NOT change the answer, the assertion above it was
 * measuring nothing.
 *
 * NO MODEL IS CALLED.
 */
import {
  Walk, deriveCapability, derivePrice, median, mean, num, round,
  MIN_COMPARABLES, type CapabilityAnswer, type Priced,
} from './derive';
import { ANCHORS } from '../db/seed/anchors';
import {
  CR_ROAD_WHEEL_ANGLE_DEG, CR_RACK_FORCE_N, GEARBOX_DEMONSTRATED_N,
  OUTLIER_EFFORT_ID, SWC_DAMP_ASIL_TODAY, K2_DAMPING_ASIL_REQUIRED,
} from '../config/assumptions';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from '../config/connections';

const CORPUS = process.env.STEERING_CORPUS_DIR
  ? resolve(process.env.STEERING_CORPUS_DIR)
  : resolve(REPO_ROOT, 'docs', 'steering', 'corpus');

interface Note { label: string; detail: string }
const ok: Note[] = [];
const fail: Note[] = [];
const note = (pass: boolean, label: string, detail: string): void => {
  (pass ? ok : fail).push({ label, detail });
};

/**
 * Bands, not exact values, and the reason is worth stating.
 *
 * An exact assertion on EUR 80,034 goes red the day somebody adds one past job
 * to the history — which is a change we WANT to be able to make. A band goes
 * red when the answer moves for a reason that matters. The bands below are
 * roughly ±15% around what step 2 measured, which is wide enough to survive
 * ordinary growth and narrow enough to catch a broken filter.
 *
 * The COUNTS are exact, because a count moving means the filter moved.
 */
const EXPECT = {
  angle: { candidates: 6, kept: 2, winnerLifecycle: 'production' },
  // ── n MOVED ON 2026-09-13 AND THE BANDS DID NOT ──────────────────────────
  //
  // 9 → 11 and 11 → 21 when `effort_records.asil` stopped being a die roll and
  // started being inherited from the requirement each change implements. More
  // jobs now sit at ASIL C and D, so more of them carry a safety case, so both
  // comparable sets grew.
  //
  // THE MEDIANS AND PRICES STAYED INSIDE THEIR AGREED BANDS THROUGHOUT —
  // 710→698 h and 1571→1497 h. That is the useful part: a change to how the
  // estate is generated moved the size of the evidence and not the answer, and
  // the bands are wide enough to say so rather than needing to be renegotiated
  // every time the data is touched. Counts are asserted exactly BECAUSE they
  // are the part that moves; a silent change in n is how a price quietly comes
  // to rest on two records.
  gearbox: { n: 11, medianHours: [600, 820] as const, eur: [68_000, 92_000] as const, meanInflation: [0.2, 0.6] as const },
  safety: { n: 21, medianHours: [1_350, 1_800] as const, eur: [175_000, 235_000] as const },
  thin: { maxN: MIN_COMPARABLES - 1 },
};

const inBand = (x: number, [lo, hi]: readonly [number, number]): boolean => x >= lo && x <= hi;

async function main(): Promise<void> {
  const w = new Walk();

  // ── the capability answer ────────────────────────────────────────────────

  const angle: CapabilityAnswer = await deriveCapability(w, {
    specId: ANCHORS.spec, crId: ANCHORS.crAngleRange, programId: ANCHORS.program,
  });

  note(
    angle.requirement.value === CR_ROAD_WHEEL_ANGLE_DEG && !angle.changedBetweenRevisions,
    'step 1 · the requirement is read from the in-force revision',
    `${angle.requirement.cr_id} = ±${angle.requirement.value}${angle.requirement.unit} as of ${angle.inForceRevision}; ` +
      `unchanged from ${angle.supersededRevisions.join(', ')}`,
  );

  note(
    !!angle.best && angle.best.lifecycle === EXPECT.angle.winnerLifecycle,
    'step 1 · the answer is a part that can actually be ordered',
    `winner ${angle.best?.part_no} is "${angle.best?.lifecycle}" — the condition that the first ` +
      `version of this walk did not have, and got wrong because of it`,
  );

  note(
    angle.candidates.length === EXPECT.angle.candidates && angle.kept.length === EXPECT.angle.kept,
    'step 1 · the shortlist is the size it was when the answer was agreed',
    `${angle.kept.length} of ${angle.candidates.length} survive all four conditions ` +
      `(expected ${EXPECT.angle.kept} of ${EXPECT.angle.candidates})`,
  );

  note(
    angle.betterButUnbuyable.length > 0 &&
      angle.betterButUnbuyable.every((c) => c.demonstrated > (angle.best?.demonstrated ?? 0)),
    'step 1 · the better-but-unbuyable option is still surfaced, not hidden',
    `${angle.betterButUnbuyable.map((c) => `${c.part_no} ${c.demonstrated}°`).join(', ')} beat the winner ` +
      `and cannot be ordered. Dropping this from the output would turn a meeting item into a silent exclusion.`,
  );

  // ── the cost answers ─────────────────────────────────────────────────────

  const gearbox: Priced = await derivePrice(w, {
    label: 'gearbox change',
    filter: "modify_hardware · gearbox · no safety case",
    where: `change_class = 'modify_hardware' and element_kind = 'gearbox' and safety_case_impact = false`,
    params: [],
  });

  note(
    gearbox.n === EXPECT.gearbox.n && inBand(gearbox.medianHours, EXPECT.gearbox.medianHours),
    'step 2 · the gearbox price is the one that was agreed',
    `${gearbox.n} comparables, median ${round(gearbox.medianHours)} h ` +
      `(band ${EXPECT.gearbox.medianHours.join('–')}), ${round(gearbox.totalEur)} EUR`,
  );
  note(
    inBand(gearbox.totalEur, EXPECT.gearbox.eur),
    'step 2 · and it still converts to the same money',
    `EUR ${round(gearbox.totalEur)} against band ${EXPECT.gearbox.eur.join('–')} — ` +
      `if the rate card moves, this is what says so`,
  );
  note(
    inBand(gearbox.meanInflation, EXPECT.gearbox.meanInflation) &&
      gearbox.outlier?.effort_id === OUTLIER_EFFORT_ID,
    'step 2 · the mean is still lying, and by roughly the same amount',
    `mean ${round(gearbox.meanHours)} h vs median ${round(gearbox.medianHours)} h ` +
      `= ${round(gearbox.meanInflation * 100)}% inflation, caused by ${gearbox.outlier?.effort_id}. ` +
      `If this goes green-to-red the trap has gone flat and the lesson stops being demonstrable.`,
  );

  const safety: Priced = await derivePrice(w, {
    label: 'damping safety case',
    filter: `safety_case_only · ASIL ${K2_DAMPING_ASIL_REQUIRED}`,
    where: `change_class = 'safety_case_only' and asil = $1`,
    params: [K2_DAMPING_ASIL_REQUIRED],
  });
  note(
    safety.n === EXPECT.safety.n && inBand(safety.medianHours, EXPECT.safety.medianHours) &&
      inBand(safety.totalEur, EXPECT.safety.eur),
    'step 2 · the safety-case price is the one that was agreed',
    `${safety.n} comparables, median ${round(safety.medianHours)} h, EUR ${round(safety.totalEur)}`,
  );
  note(
    safety.meanInflation < 0.15,
    'step 2 · and that set is well behaved, unlike the gearbox one',
    `mean ${round(safety.meanHours)} h vs median ${round(safety.medianHours)} h — ` +
      `${round(safety.meanInflation * 100)}% apart. Both cases matter: a check that only ever ` +
      `sees distorted sets cannot tell you it can recognise an undistorted one.`,
  );

  // ── the refusal ──────────────────────────────────────────────────────────
  //
  // THE GAP STEP 2 LEFT OPEN. Both real prices came out of healthy comparable
  // sets, so the MIN_COMPARABLES rule was written and never fired. A rule that
  // has never fired is a rule nobody knows works.

  const thin: Priced = await derivePrice(w, {
    label: 'new ASIL D software function',
    filter: "new_function · software_domain · ASIL D",
    where: `change_class = 'new_function' and element_kind = 'software_domain' and asil = 'D'`,
    params: [],
  });
  note(
    thin.n <= EXPECT.thin.maxN && !thin.enough && thin.disciplines.length >= 0,
    'step 2 · the refusal actually refuses',
    `${thin.n} comparable(s) — below ${MIN_COMPARABLES}, so no price is produced. ` +
      `This is the rule that stops a number being invented, and it had never fired before now.`,
  );

  // ── the document half ────────────────────────────────────────────────────

  const saPath = resolve(CORPUS, 'eps-steering-feel/docs/safety-assessment-2021.md');
  const sa = existsSync(saPath) ? readFileSync(saPath, 'utf8') : '';
  const shipsAt = (sa.match(/developed\s+to\s+\*{0,2}ASIL\s+([A-D])/i) ?? [])[1];
  note(
    shipsAt === SWC_DAMP_ASIL_TODAY && sa.includes(ANCHORS.swcDamping),
    'step 2 · the biggest cost item is still only findable by reading a document',
    `safety-assessment-2021.md says ASIL ${shipsAt}; the new programme needs ASIL ` +
      `${K2_DAMPING_ASIL_REQUIRED}. No column in any of the four databases carries this. ` +
      `If this goes red, the corpus was regenerated and the walk's premise is gone.`,
  );

  // ═══════════════════════════════════════════════════════════════════════
  // SABOTAGE — every assertion above, made to fail on purpose.
  // ═══════════════════════════════════════════════════════════════════════

  const sab: Note[] = [];
  const sabotage = (name: string, detected: boolean, detail: string): void => {
    sab.push({ label: `${detected ? 'ok    ' : 'MISSED'}  ${name}`, detail });
    if (!detected) fail.push({ label: `sabotage not detected — ${name}`, detail });
  };

  // 1. Drop the lifecycle condition and the obsolete part wins again.
  {
    const naive = [...angle.proven].sort((a, b) => num(b.max_value_demonstrated) - num(a.max_value_demonstrated))[0];
    const moved = naive && naive.part_no !== angle.best?.part_no;
    sabotage('remove the "can it be ordered" condition', !!moved,
      `best-number-wins answers ${naive?.part_no}; the four conditions answer ${angle.best?.part_no}`);
  }

  // 2. Price the gearbox on the mean and the number moves materially.
  {
    const byMean = gearbox.totalEur * (gearbox.meanHours / gearbox.medianHours);
    sabotage('price the gearbox from the mean instead of the median',
      !inBand(byMean, EXPECT.gearbox.eur),
      `EUR ${round(byMean)} against the agreed band ${EXPECT.gearbox.eur.join('–')} — ` +
        `a ${round((byMean / gearbox.totalEur - 1) * 100)}% overquote`);
  }

  // 3. Keep the outlier but use the median: the answer must NOT move. The
  //    other direction — a guard has to let the right answer through.
  {
    const hours = [553, 600, 650, 710, 720, 800, 900, 1000, 3180];
    const withOutlier = median(hours);
    const without = median(hours.slice(0, -1));
    sabotage('the median tolerates the outlier (the let-through direction)',
      Math.abs(withOutlier - without) / without < 0.15,
      `median ${withOutlier} with it, ${without} without — ${round(Math.abs(withOutlier - without) / without * 100)}% apart, ` +
        `while the mean moves ${round((mean(hours) / mean(hours.slice(0, -1)) - 1) * 100)}%`);
  }

  // 4. Lower the refusal threshold and a price appears where there is no basis.
  {
    const wouldPrice = thin.n >= 1;
    sabotage('lower the refusal threshold to 1', wouldPrice,
      `at a threshold of 1, "${thin.label}" would be priced from ${thin.n} record — ` +
        `a figure with a false decimal point, indistinguishable in the output from the ones with n=11`);
  }

  // 5. WIDEN THE COMPARABLE SET INSTEAD OF REFUSING — the repair that looks
  //    obvious and is worse than the refusal it replaces.
  //
  //    When `walk-cost --from-documents` finds no ASIL D safety case, the
  //    tempting fix is to drop the ASIL filter, price all safety-case work and
  //    attach a footnote. This is what that gives, measured rather than argued:
  //
  //        safety_case_only, ASIL D          n=11   median 1571 h
  //        safety_case_only, any ASIL        n=71   median  451 h
  //
  //    Off by a factor of three and a half, because the wider set is mostly QM
  //    and ASIL B work and an ASIL D safety case costs roughly four times a QM
  //    one. A footnote saying "ASIL not distinguishable" does not rescue a
  //    number that is a quarter of the right answer — it puts a caveat beside a
  //    figure the customer will quote back at you.
  //
  //    This exists so that the day somebody "improves" the tool by adding a
  //    fallback, this goes red and says why.
  {
    const wide = await w.q('what would widening the filter give?', 'pmo',
      `select actual_hours from effort_records where change_class = 'safety_case_only' order by actual_hours`);
    const wideMed = median(wide.map((r) => num(r.actual_hours)));
    const ratio = safety.medianHours / wideMed;
    sabotage('widen the comparable set instead of refusing', ratio > 2,
      `dropping the ASIL filter gives ${round(wideMed)} h from ${wide.length} jobs against the correct ` +
        `${round(safety.medianHours)} h from ${safety.n} — ${ratio.toFixed(1)}× out. A refusal beats it.`);
  }

  // ── report ───────────────────────────────────────────────────────────────

  console.log('');
  for (const n of ok) console.log(`  ok      ${n.label}\n          ${n.detail}`);
  console.log('');
  console.log('  SABOTAGE — each break must change the answer:');
  for (const n of sab) console.log(`  ${n.label}\n          ${n.detail}`);
  if (fail.length) {
    console.log('');
    for (const n of fail) console.log(`  FAIL    ${n.label}\n          ${n.detail}`);
  }
  const passed = fail.length === 0;
  console.log(`\nwalk-check: ${passed ? 'PASS' : 'FAIL'} — ${ok.length} ok, ${sab.length} sabotage cases, ${fail.length} failing\n`);
  process.exit(passed ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
