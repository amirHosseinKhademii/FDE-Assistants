/**
 * EVERY NUMBER THAT CAME OUT OF THE BRIEF, AND EVERY NUMBER I INVENTED TO MAKE
 * IT WORK, IN ONE PLACE.
 *
 * `docs/steering/PLAN.md` §3 is a table of eight readings of the brief's
 * shorthand. Two of them (A6, A7) were low-confidence; both were confirmed on
 * 2026-09-13 and both were right as built. This file exists so that answer was
 * ONE EDIT rather than a grep across five generators — which is what it would
 * have become the moment `1.2` appeared inline in `requirements.ts`.
 *
 * Every constant carries its assumption id. If a reading changes, the ids tell
 * you exactly which traps and which acceptance rows move with it:
 *
 *   A6  →  BUD_HYST_CTRL, trap T4, acceptance row CR-K2-0104
 *   A7  →  BUD_LATENCY,   SR-EPS-0415, acceptance row "latency"
 *
 * ── A6 AND A7 ARE SETTLED. CONFIRMED 2026-09-13. ─────────────────────────
 *
 * Both were built on the readings below and both readings were the right ones,
 * so nothing here changed as a result. That is worth recording rather than
 * leaving implicit: the next person to read "low confidence" in the plan should
 * not go re-deriving a question that has been answered.
 *
 *   A6  the 1.2 and 0.2 are control-side torques AT THE MOTOR and have their
 *       own budget. The 0.5 Nm ceiling is measured AT THE WHEEL. The budget is
 *       open because the conversion between the two was never recorded — a
 *       measurement-point mismatch, NOT a design that misses its requirement.
 *       That distinction is the whole meaning of trap T4 and it is now fixed.
 *
 *   A7  milliseconds. The signal chain is a latency budget.
 *       Still true, and still worth knowing: the 8.0 ms TARGET and the 2.0 /
 *       0.6 allocations are invented. Only 3.5 and 1.7 came from the brief.
 *
 * WHICH NUMBERS ARE THE BRIEF'S AND WHICH ARE MINE is marked per line, because
 * the distinction matters when somebody later asks "where did 8.0 come from".
 * The brief gave 3.5 and 1.7. It did not give a total to fit them into.
 */

// ── A1–A4 · the customer requirement, as given ─────────────────────────────

/** A1 — "capacity 8000 nm" read as rack force in NEWTONS. 8000 N·m is not a
 *  quantity a rack has; published EPS specs quote rack force in kN. BRIEF. */
export const CR_RACK_FORCE_N = 8000;

/** A1 — what Rev A of the same spec said, before the customer raised it.
 *  MINE — the brief gave one number; a superseded one is needed for trap T1. */
export const CR_RACK_FORCE_N_REV_A = 7500;

/** A2 — "range steering -50 +50" read as ROAD-WHEEL angle, degrees. BRIEF. */
export const CR_ROAD_WHEEL_ANGLE_DEG = 50;

/** A3 — "max torq 30 degree 2.7": 2.7 N·m of steering-wheel torque at 30° of
 *  steering-wheel angle, on-centre, ISO 13674-1 weave. BRIEF. */
export const CR_ON_CENTER_TORQUE_NM = 2.7;
export const CR_ON_CENTER_ANGLE_DEG = 30;

/** A4 — "histeres 0.5 nm": on-centre torque hysteresis ceiling. BRIEF. */
export const CR_HYSTERESIS_NM = 0.5;

// ── A5 · the on-centre torque budget — CLOSES ──────────────────────────────
//
// "eps should support capacity, minus friction to the wheel for range steering
// should be 2.4 and friction 0.3". Both numbers BRIEF; 2.4 + 0.3 = 2.7 exactly,
// which is the target above. This is the budget that works, and it is the
// template the other two are shaped against.

export const BUD_ONCTR_TRQ = {
  target: CR_ON_CENTER_TORQUE_NM,
  tolerance: 0.05, // MINE
  unit: 'Nm',
  allocations: [
    { label: 'rack + wheel path friction', value: 2.4, basis: 'measured' }, // BRIEF
    { label: 'column + gearbox friction', value: 0.3, basis: 'estimated' }, // BRIEF
  ],
  knownOpen: false,
} as const;

// ── A6 · the control-side budget — DOES NOT CLOSE, ON PURPOSE ──────────────
//
// READING CONFIRMED 2026-09-13. What follows is no longer an assumption.
//
// "friction on histiric feedback ebs be 1.2 nm and dump feedback 0.2 nm".
// Both numbers BRIEF. Read as their OWN budget rather than as children of the
// 0.5 N·m hysteresis ceiling, because 1.2 + 0.2 = 1.4 cannot sit under 0.5.
//
// THIS WAS THE LOW-CONFIDENCE READING AND IT IS NOW THE CONFIRMED ONE. The
// alternative — that these are children of the hysteresis requirement, so the
// design misses its own ceiling by 0.9 N·m — was explicitly rejected. T4 is a
// measurement-point mismatch, not a defect, and the `closureNote` below is
// therefore the accurate account of it rather than a guess.
//
// `db:check` REPORTS the delta and does not assert closure. A check that fails
// on correct data gets muted in week one and then protects nothing.

export const BUD_HYST_CTRL = {
  target: CR_HYSTERESIS_NM, // 0.5, BRIEF
  tolerance: 0.05, // MINE
  unit: 'Nm',
  allocations: [
    { label: 'EPS hysteresis-compensation term', value: 1.2, basis: 'supplier-declared' }, // BRIEF
    { label: 'damping term', value: 0.2, basis: 'estimated' }, // BRIEF
  ],
  knownOpen: true,
  closureNote:
    'allocations are control-side torque contributions at the motor; the target is ' +
    'measured at the wheel. The conversion is not recorded anywhere. Raised as ' +
    'CHR-2026-0191 and undecided — do not read 1.4 as a hysteresis figure.',
} as const;

// ── A7 · the latency budget — CLOSES, WITH 0.2 ms MARGIN ───────────────────
//
// READING CONFIRMED 2026-09-13: milliseconds.
//
// "adding sensor 3.5 ecu ... and adding ecu 1.7" read as milliseconds down the
// signal chain. 3.5 and 1.7 are BRIEF. THE TARGET AND THE OTHER TWO
// ALLOCATIONS ARE MINE — the brief gave two contributions and no total, and a
// budget needs a target to be a budget.
//
// The unit is settled. What is NOT settled, and should stay visible, is that
// only 3.5 and 1.7 came from the brief — the 8.0 ms target and the 2.0 / 0.6
// allocations are invented to give the budget something to close against.

export const BUD_LATENCY = {
  target: 8.0, // MINE
  tolerance: 0.0,
  unit: 'ms',
  allocations: [
    { label: 'torque sensor acquisition', value: 3.5, basis: 'datasheet', element: 'EL-K2-TSENS-01' }, // BRIEF
    { label: 'ECU input + compute', value: 1.7, basis: 'measured', element: 'EL-K2-ECU-01' }, // BRIEF
    { label: 'motor control loop + PWM', value: 2.0, basis: 'measured', element: 'EL-K2-MOT-01' }, // MINE
    { label: 'CAN-FD vehicle-speed staleness', value: 0.6, basis: 'analysis', element: 'EL-K2-ECU-01' }, // MINE
  ],
  knownOpen: false,
} as const;

// ── the numbers the traps are made of ──────────────────────────────────────

/**
 * T2 — the gearbox that looks like free reuse.
 *
 * Its datasheet claims the full 8000 N by ANALYSIS; the qualification test
 * demonstrated 7600 N and nothing has closed that gap. An answer that reads
 * `part_capabilities` without joining `qualification_tests` reports a clean
 * carryover and is wrong by 400 N.
 */
export const GEARBOX_CLAIMED_N = 8000;
export const GEARBOX_DEMONSTRATED_N = 7600;

/** CR-K2-0102 is satisfied as-is because the shipping rack already does ±52°. */
export const RACK_DEMONSTRATED_ANGLE_DEG = 52;

/**
 * T3 — the ASIL step-up, and the single largest cost item in the example.
 *
 * `SWC-DAMP` ships at ASIL B. K2 allocates damping under the ASIL D
 * unintended-assist safety goal, which is the standard EPS safety-goal pair
 * (ASIL D for unintended assist torque, ASIL C for loss of assist). The code may
 * well be reusable; the safety case is not.
 *
 * `SAFETY_CASE_MULTIPLIER` is what the effort generator builds into history, so
 * the 4.2× is DERIVABLE FROM LOADED ROWS rather than asserted from this
 * constant. `db:check` measures it back out and requires it in the band below —
 * a trap that survives only in the generator's intentions is not in the data.
 */
export const SWC_DAMP_ASIL_TODAY = 'B';
export const K2_DAMPING_ASIL_REQUIRED = 'D';
export const SAFETY_CASE_MULTIPLIER = 4.2;
export const SAFETY_CASE_BAND: readonly [number, number] = [3.8, 4.6];

/**
 * T5 — the outlier that breaks a mean.
 *
 * 3,180 hours on a `modify_hardware` change, because it absorbed a production
 * line relocation. A mean over comparables roughly doubles the estimate; a
 * median over a filtered set is right.
 *
 * IT CARRIES `safety_case_impact = false` AND IS EXCLUDED FROM THE SAFETY RATIO
 * DELIBERATELY. If the outlier sat in either side of that ratio it would drag
 * the measured multiplier out of `SAFETY_CASE_BAND` and turn T3's assertion red
 * for a reason that looks like a generator bug — two traps interfering is how a
 * check stops meaning anything.
 */
export const OUTLIER_EFFORT_ID = 'EFF-2021-0443';
export const OUTLIER_HOURS = 3180;

/** T6 — the cheapest matching ECU cannot be bought; last-time-buy has passed. */
export const ECU_OBSOLETE = 'VS-ECU-4412-B';
export const ECU_CURRENT = 'VS-ECU-4680-A';

/**
 * T7 — coverage computed over the links that exist rather than the requirements
 * that exist. Both counts are asserted EXACTLY, because both are planted.
 */
export const UNTRACED_CRS = ['CR-K2-0119', 'CR-K2-0123'] as const;
export const ORPHAN_SRS = ['SR-EPS-0415'] as const;

/**
 * T7 — historical quoting bias, which the estimate has to know about itself.
 * `new_function` work was under-quoted; `recalibrate` was accurate.
 */
export const QUOTE_BIAS_NEW_FUNCTION = 0.18;
export const QUOTE_BIAS_RECALIBRATE = 0.0;
