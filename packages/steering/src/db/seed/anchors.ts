/**
 * THE IDS THE ACCEPTANCE TEST IS WRITTEN IN.
 *
 * `docs/steering/PLAN.md` §8 states an expected answer — seven requirements,
 * four buckets, a set of touched elements and functions, and a cost. That table
 * is only an acceptance test if the rows behind it are pinned, and pinned
 * SOMEWHERE BOTH THE GENERATOR AND THE CHECKER CAN SEE. If the generator held
 * them privately, `db:check` could only assert that *some* orphan exists rather
 * than that `CR-K2-0119` does, and "some" is not a check — it passes on an
 * estate that planted the trap in the wrong place.
 *
 * Everything here is a deliberate, hand-placed fact. Everything NOT here is
 * generated bulk, whose job is to make the anchors hard to find rather than to
 * be interesting on its own.
 *
 * Numbers live in `config/assumptions.ts`, not here — that file is the one
 * edited when A6 and A7 are answered. This file is only names.
 */

export const ANCHORS = {
  // ── the live bid ──
  customer: 'CUS-KST',
  customerName: 'Kestrel Motors',
  program: 'PRG-KST-K2',
  rfq: 'RFQ-2026-0044',
  spec: 'CRS-KST-K2-001',
  revA: 'CRS-KST-K2-001 Rev A',
  revB: 'CRS-KST-K2-001 Rev B',

  /**
   * The programme the carryover comes from: an R-EPS already in production.
   * `BUD-ONCTR-TRQ`'s 2.4 N·m allocation is `basis = 'measured'` BECAUSE it was
   * measured here. A carryover figure with no programme behind it is an
   * estimate wearing a better word.
   */
  carryoverProgram: 'PRG-HLX-H1',

  // ── SYS.1, the four requirements the brief gave us ──
  crRackForce: 'CR-K2-0101',
  crAngleRange: 'CR-K2-0102',
  crOnCenterTorque: 'CR-K2-0103',
  crHysteresis: 'CR-K2-0104',
  /** The ASIL D unintended-assist safety goal. Drives trap T3. */
  crSafetyGoal: 'CR-K2-0110',

  // ── SYS.2 ──
  srRackForce: 'SR-EPS-0407',
  srOnCenterTorque: 'SR-EPS-0408',
  srHysteresis: 'SR-EPS-0411',
  /** Derived, no customer parent. Half of T7. */
  srLatency: 'SR-EPS-0415',
  srDampingAsil: 'SR-EPS-0421',

  // ── the budgets ──
  budOnCenter: 'BUD-K2-ONCTR-TRQ',
  budHysteresis: 'BUD-K2-HYST-CTRL',
  budLatency: 'BUD-K2-LATENCY',

  // ── SYS.3 ──
  arch: 'ARCH-K2-v3',
  elEcu: 'EL-K2-ECU-01',
  elSensor: 'EL-K2-TSENS-01',
  elMotor: 'EL-K2-MOT-01',
  elGear: 'EL-K2-GEAR-01',
  elRack: 'EL-K2-RACK-01',

  // ── hardware ──
  /** Claims 8000 N by analysis, demonstrated 7600 N on a rig. Trap T2. */
  gearbox: 'VS-GEAR-3301-C',
  /** Cheapest match, last-time-buy already passed. Trap T6. */
  ecuObsolete: 'VS-ECU-4412-B',
  ecuCurrent: 'VS-ECU-4680-A',
  rack: 'VS-RACK-2210-A',
  sensor: 'VS-TSENS-1180-B',
  motor: 'VS-MOT-5520-A',

  // ── software ──
  /** ASIL B today, ASIL D required. Trap T3. */
  swcDamping: 'SWC-DAMP',
  fnDamping: 'FN-DAMP-0031',
  swcAssist: 'SWC-ASSIST',
  swcHysteresis: 'SWC-HYSTCOMP',
  swcFriction: 'SWC-FRICCOMP',

  // ── change control ──
  /** The undecided change request that leaves the hysteresis budget open. T4. */
  chrHysteresis: 'CHR-2026-0191',
} as const;

/**
 * The activity catalogue, global across programmes.
 *
 * Global is the point: "damping" is the same job on every programme, and that
 * shared vocabulary is what makes two programmes comparable at all. What varies
 * per programme is which element it lands on.
 *
 * Drawn from the EPS control literature's own list — assist, return, hysteresis,
 * damping, friction compensation — plus the motor-control and diagnostic jobs
 * any production ECU carries.
 */
export const ACTIVITIES: readonly { id: string; name: string; kind: string; description: string }[] = [
  { id: 'ACT-TORQUE-SENSE', name: 'Driver torque sensing', kind: 'monitoring', description: 'Acquire and plausibilise driver torque from the column sensor.' },
  { id: 'ACT-ANGLE-SENSE', name: 'Steering angle sensing', kind: 'monitoring', description: 'Acquire absolute steering wheel angle.' },
  { id: 'ACT-ASSIST', name: 'Assist torque', kind: 'control', description: 'Map driver torque and vehicle speed to a base assist command.' },
  { id: 'ACT-DAMPING', name: 'Damping', kind: 'control', description: 'Damp rack velocity to suppress oscillation and improve on-centre feel.' },
  { id: 'ACT-RETURN-TO-CENTER', name: 'Return to centre', kind: 'control', description: 'Actively return the wheel to centre when the driver releases.' },
  { id: 'ACT-HYSTERESIS-COMP', name: 'Hysteresis compensation', kind: 'control', description: 'Shape the torque/angle loop width to the tuned steering feel.' },
  { id: 'ACT-FRICTION-COMP', name: 'Friction compensation', kind: 'control', description: 'Compensate mechanical friction in the column and gearbox.' },
  { id: 'ACT-MOTOR-CONTROL', name: 'Motor current control', kind: 'actuation', description: 'Field-oriented control of the assist motor.' },
  { id: 'ACT-ARBITRATION', name: 'Command arbitration', kind: 'arbitration', description: 'Arbitrate driver, ADAS and safety-limited torque requests.' },
  { id: 'ACT-DIAGNOSTICS', name: 'Diagnostics', kind: 'diagnostic', description: 'Monitor, record and report faults over the diagnostic interface.' },
  { id: 'ACT-SAFETY-MONITOR', name: 'Safety monitoring', kind: 'monitoring', description: 'Independently bound commanded torque against the unintended-assist safety goal.' },
  { id: 'ACT-EOL-CALIB', name: 'End-of-line calibration', kind: 'diagnostic', description: 'Learn centre position and sensor offsets at end of line.' },
];
