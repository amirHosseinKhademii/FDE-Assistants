/**
 * vst_alm — SYS.1, SYS.2, SYS.3 and every link between them. The heart of the
 * estate, and the only database with real foreign keys throughout.
 *
 * OWN RANDOM STREAM (`SEEDS.requirements`).
 *
 * ── WHAT IS HAND-WRITTEN AND WHAT IS GENERATED ────────────────────────────
 *
 * The K2 programme is hand-written, requirement by requirement, because it IS
 * the acceptance test: `docs/steering/PLAN.md` §8 states an expected answer and
 * every row behind it has to be a deliberate fact. Thirty-seven other
 * programmes are generated around it, and their job is to be unremarkable.
 *
 * ── THE THREE TRAPS THAT LIVE HERE ────────────────────────────────────────
 *
 *   T1  `CRS-KST-K2-001` Rev A says 7500 N and Rev B says 8000 N. Both are in
 *       the database, with `effective_from`/`effective_to` on the revisions.
 *       An answer built on Rev A reports a 7600 N carryover as a clean fit.
 *
 *   T4  `BUD-K2-HYST-CTRL` does not close — 1.4 against a 0.5 target — and says
 *       so in `known_open` and `closure_note`. Two wrong answers are available:
 *       report 1.4 as the hysteresis figure, or report 0.5 as satisfied because
 *       a requirement row says 0.5. The right answer reports the delta and
 *       escalates.
 *
 *   T7  Two K2 customer requirements have NO trace link at all, and one system
 *       requirement has no customer parent. Coverage computed over the links
 *       that exist rather than over the requirements that exist reports 100%
 *       on an incomplete graph — which is exactly what ASPICE's bidirectional
 *       traceability expectation is about.
 */
import { makeHelpers, SEEDS, on } from './rng';
import { ANCHORS, ACTIVITIES } from './anchors';
import {
  CR_RACK_FORCE_N,
  CR_RACK_FORCE_N_REV_A,
  CR_ROAD_WHEEL_ANGLE_DEG,
  CR_ON_CENTER_TORQUE_NM,
  CR_ON_CENTER_ANGLE_DEG,
  CR_HYSTERESIS_NM,
  BUD_ONCTR_TRQ,
  BUD_HYST_CTRL,
  BUD_LATENCY,
  UNTRACED_CRS,
  K2_DAMPING_ASIL_REQUIRED,
} from '../../config/assumptions';
import type { Alm, Programs } from '../schema/rows';

const ISO_WEAVE = 'ISO 13674-1 weave, 100 km/h, 0.2 Hz, 2 m/s² peak lateral';

/**
 * The K2 customer requirement specification, as agreed in Rev B.
 *
 * `revA` is present only on the one requirement that CHANGED between revisions
 * — which is what makes T1 a trap rather than a wall of differences. One
 * changed number in twenty-four is what a real Rev A → Rev B looks like, and it
 * is much easier to miss than a rewritten document.
 */
interface CrSpec {
  id: string;
  section: string;
  title: string;
  attribute: string | null;
  unit: string | null;
  operator: string | null;
  value: number | null;
  condition: string | null;
  verification: string;
  asil: string;
  priority: string;
  text: string;
  revA?: number;
}

const K2_REQUIREMENTS: readonly CrSpec[] = [
  {
    id: ANCHORS.crRackForce, section: '4.1.1', title: 'Rack force capacity',
    attribute: 'rack_force_capacity', unit: 'N', operator: '>=', value: CR_RACK_FORCE_N,
    condition: 'peak, 20 °C, 13.5 V', verification: 'test', asil: 'B', priority: 'must',
    text: `The steering system shall deliver a peak rack force of at least ${CR_RACK_FORCE_N} N at 20 °C and 13.5 V supply.`,
    // T1 — the one number that moved between revisions.
    revA: CR_RACK_FORCE_N_REV_A,
  },
  {
    id: ANCHORS.crAngleRange, section: '4.1.2', title: 'Road wheel angle range',
    attribute: 'road_wheel_angle_deg', unit: 'deg', operator: '+/-', value: CR_ROAD_WHEEL_ANGLE_DEG,
    condition: 'both directions from centre', verification: 'test', asil: 'QM', priority: 'must',
    text: `The steering system shall provide a road wheel angle range of ±${CR_ROAD_WHEEL_ANGLE_DEG}° from centre.`,
  },
  {
    id: ANCHORS.crOnCenterTorque, section: '4.3.1', title: 'On-centre steering wheel torque',
    attribute: 'on_center_torque_nm', unit: 'Nm', operator: '<=', value: CR_ON_CENTER_TORQUE_NM,
    condition: `at ${CR_ON_CENTER_ANGLE_DEG}° steering wheel angle, ${ISO_WEAVE}`,
    verification: 'test', asil: 'QM', priority: 'must',
    text: `Steering wheel torque at ${CR_ON_CENTER_ANGLE_DEG}° of steering wheel angle shall not exceed ${CR_ON_CENTER_TORQUE_NM} N·m when measured per ${ISO_WEAVE}.`,
  },
  {
    id: ANCHORS.crHysteresis, section: '4.3.2', title: 'On-centre torque hysteresis',
    attribute: 'on_center_hysteresis_nm', unit: 'Nm', operator: '<=', value: CR_HYSTERESIS_NM,
    condition: `same test point as §4.3.1`, verification: 'test', asil: 'QM', priority: 'must',
    text: `The width of the steering wheel torque/angle hysteresis loop shall not exceed ${CR_HYSTERESIS_NM} N·m at the §4.3.1 test point.`,
  },
  { id: 'CR-K2-0105', section: '4.1.3', title: 'Overall steering ratio', attribute: 'steering_ratio', unit: 'ratio', operator: '=', value: 15.8, condition: 'nominal, on centre', verification: 'analysis', asil: 'QM', priority: 'must', text: 'The overall steering ratio shall be 15.8:1 nominal on centre.' },
  { id: 'CR-K2-0106', section: '4.1.4', title: 'Rack stroke', attribute: 'rack_stroke_mm', unit: 'mm', operator: '>=', value: 152, condition: 'total, end stop to end stop', verification: 'inspection', asil: 'QM', priority: 'must', text: 'Total rack stroke shall be at least 152 mm.' },
  { id: 'CR-K2-0107', section: '5.2.1', title: 'Maximum supply current', attribute: 'max_current_a', unit: 'A', operator: '<=', value: 110, condition: 'at 12 V, peak assist', verification: 'test', asil: 'QM', priority: 'must', text: 'Peak supply current shall not exceed 110 A at 12 V.' },
  { id: 'CR-K2-0108', section: '6.1.1', title: 'System mass', attribute: 'mass_kg', unit: 'kg', operator: '<=', value: 12.4, condition: 'complete assembly, dry', verification: 'inspection', asil: 'QM', priority: 'should', text: 'The complete steering assembly shall not exceed 12.4 kg dry.' },
  { id: 'CR-K2-0109', section: '7.1.1', title: 'Minimum operating temperature', attribute: 'temp_min_c', unit: 'C', operator: '=', value: -40, condition: 'full function', verification: 'test', asil: 'QM', priority: 'must', text: 'The system shall be fully functional from −40 °C.' },
  {
    id: ANCHORS.crSafetyGoal, section: '8.1.1', title: 'Safety goal — unintended assist torque',
    attribute: null, unit: null, operator: null, value: null, condition: null,
    verification: 'analysis', asil: 'D', priority: 'must',
    text: 'Assist torque shall not be applied in the absence of a corresponding driver request. Safety goal, ASIL D.',
  },
  { id: 'CR-K2-0111', section: '8.1.2', title: 'Safety goal — loss of assist', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'analysis', asil: 'C', priority: 'must', text: 'Sudden loss of steering assist shall be prevented. Safety goal, ASIL C.' },
  { id: 'CR-K2-0112', section: '9.1.1', title: 'Process capability', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'review', asil: 'QM', priority: 'must', text: 'Development shall be assessed at Automotive SPICE capability level 2 or above for all SYS and SWE processes.' },
  { id: 'CR-K2-0113', section: '9.2.1', title: 'Cybersecurity', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'review', asil: 'QM', priority: 'must', text: 'The system shall be developed in accordance with ISO/SAE 21434.' },
  { id: 'CR-K2-0114', section: '5.3.1', title: 'Diagnostic interface', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'test', asil: 'QM', priority: 'must', text: 'The system shall expose diagnostics over CAN-FD per the customer diagnostic specification.' },
  { id: 'CR-K2-0115', section: '5.4.1', title: 'End-of-line calibration', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'test', asil: 'QM', priority: 'must', text: 'Centre position and sensor offsets shall be learned at end of line within 25 s.' },
  { id: 'CR-K2-0116', section: '6.2.1', title: 'Lifetime', attribute: 'lifetime_cycles', unit: 'cycles', operator: '>=', value: 1_500_000, condition: 'full-stroke equivalent', verification: 'test', asil: 'QM', priority: 'must', text: 'The system shall survive 1,500,000 full-stroke-equivalent cycles.' },
  { id: 'CR-K2-0117', section: '4.4.1', title: 'NVH limit', attribute: 'nvh_limit_db', unit: 'dB', operator: '<=', value: 52, condition: 'at driver ear, parking manoeuvre', verification: 'test', asil: 'QM', priority: 'should', text: 'Steering-induced noise shall not exceed 52 dB(A) at the driver ear during a parking manoeuvre.' },
  { id: 'CR-K2-0118', section: '8.2.1', title: 'Manual steering fallback', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'test', asil: 'C', priority: 'must', text: 'On total loss of electrical assist the system shall remain mechanically steerable.' },
  // T7 — no trace link will be written for this one.
  { id: 'CR-K2-0119', section: '4.2.3', title: 'Assist cut-off speed', attribute: 'assist_cutoff_speed_kmh', unit: 'km/h', operator: '<=', value: 180, condition: 'assist tapered to zero above', verification: 'test', asil: 'QM', priority: 'should', text: 'Assist shall be tapered to zero above 180 km/h.' },
  { id: 'CR-K2-0120', section: '4.3.3', title: 'Return-to-centre accuracy', attribute: 'return_to_center_error_deg', unit: 'deg', operator: '<=', value: 3, condition: 'release from 90°, 60 km/h', verification: 'test', asil: 'QM', priority: 'should', text: 'Residual steering wheel angle after release from 90° at 60 km/h shall not exceed 3°.' },
  { id: 'CR-K2-0121', section: '7.1.2', title: 'Maximum operating temperature', attribute: 'temp_max_c', unit: 'C', operator: '=', value: 85, condition: 'full function', verification: 'test', asil: 'QM', priority: 'must', text: 'The system shall be fully functional to +85 °C.' },
  { id: 'CR-K2-0122', section: '10.1.1', title: 'Piece price target', attribute: 'piece_price_eur', unit: 'EUR', operator: '<=', value: 268, condition: 'at 140,000/yr', verification: 'review', asil: 'QM', priority: 'must', text: 'Piece price shall not exceed EUR 268 at 140,000 units per year.' },
  // T7 — the second untraced one.
  { id: 'CR-K2-0123', section: '10.2.1', title: 'Warranty performance', attribute: 'warranty_ppm', unit: 'ppm', operator: '<=', value: 25, condition: '12 months in service', verification: 'review', asil: 'QM', priority: 'should', text: 'Field returns shall not exceed 25 ppm at 12 months in service.' },
  { id: 'CR-K2-0124', section: '11.1.1', title: 'Start of production', attribute: null, unit: null, operator: null, value: null, condition: null, verification: 'review', asil: 'QM', priority: 'must', text: 'Start of production shall be 2028-09-01.' },
];

/** The K2 system requirements. `parents` is the trace into SYS.1. */
interface SrSpec {
  id: string;
  title: string;
  attribute: string | null;
  unit: string | null;
  operator: string | null;
  value: number | null;
  condition: string | null;
  discipline: string;
  asil: string;
  text: string;
  parents: string[];
  derivation: string | null;
  maturity?: string;
}

const K2_SYSTEM_REQUIREMENTS: readonly SrSpec[] = [
  {
    id: ANCHORS.srRackForce, title: 'Rack force at the rack, including internal losses',
    attribute: 'rack_force_capacity', unit: 'N', operator: '>=', value: CR_RACK_FORCE_N,
    condition: 'peak, 20 °C, 13.5 V, measured at the rack', discipline: 'systems', asil: 'B',
    text: `The EPS assembly shall deliver at least ${CR_RACK_FORCE_N} N at the rack. Motor and gearbox output shall exceed this by the internal friction losses between motor and rack.`,
    parents: [ANCHORS.crRackForce],
    derivation: 'CR-K2-0101 plus the motor-to-rack friction budget. The customer figure is AT THE RACK, so the gearbox must be sized above it.',
  },
  {
    id: ANCHORS.srOnCenterTorque, title: 'On-centre steering wheel torque',
    attribute: 'on_center_torque_nm', unit: 'Nm', operator: '<=', value: CR_ON_CENTER_TORQUE_NM,
    condition: `${CR_ON_CENTER_ANGLE_DEG}° SWA, ${ISO_WEAVE}`, discipline: 'systems', asil: 'QM',
    text: `Steering wheel torque at ${CR_ON_CENTER_ANGLE_DEG}° SWA shall not exceed ${CR_ON_CENTER_TORQUE_NM} N·m, apportioned per ${ANCHORS.budOnCenter}.`,
    parents: [ANCHORS.crOnCenterTorque],
    derivation: 'CR-K2-0103, apportioned across the mechanical friction path.',
  },
  {
    id: ANCHORS.srHysteresis, title: 'On-centre torque hysteresis',
    attribute: 'on_center_hysteresis_nm', unit: 'Nm', operator: '<=', value: CR_HYSTERESIS_NM,
    condition: 'same test point as SR-EPS-0408', discipline: 'systems', asil: 'QM',
    text: `Hysteresis loop width shall not exceed ${CR_HYSTERESIS_NM} N·m, apportioned per ${ANCHORS.budHysteresis}.`,
    parents: [ANCHORS.crHysteresis],
    derivation: 'CR-K2-0104.',
    maturity: 'concept',
  },
  {
    // T7 — DERIVED, no customer parent. Legitimate, and it says so in
    // `derivation_note`. What makes it a trap is that a coverage query that
    // walks links rather than requirements never notices either direction.
    id: ANCHORS.srLatency, title: 'Assist command latency',
    attribute: 'assist_latency_ms', unit: 'ms', operator: '<=', value: BUD_LATENCY.target,
    condition: 'sensor edge to motor current command', discipline: 'systems', asil: 'D',
    text: `Total latency from torque sensor edge to motor current command shall not exceed ${BUD_LATENCY.target} ms, apportioned per ${ANCHORS.budLatency}.`,
    parents: [],
    derivation: 'DERIVED — no customer requirement states a latency. Set internally from the steering feel target; the customer specifies the feel, not the timing that produces it.',
  },
  {
    id: ANCHORS.srDampingAsil, title: 'Damping under the unintended-assist safety goal',
    attribute: null, unit: null, operator: null, value: null,
    condition: null, discipline: 'safety', asil: K2_DAMPING_ASIL_REQUIRED,
    text: `The damping function shall be developed to ASIL ${K2_DAMPING_ASIL_REQUIRED}, since a damping fault can inject torque in the absence of a driver request.`,
    parents: [ANCHORS.crSafetyGoal],
    derivation: 'CR-K2-0110. Damping writes to the same torque command path as assist, so it inherits the safety goal ASIL.',
  },
  { id: 'SR-EPS-0401', title: 'Road wheel angle range', attribute: 'road_wheel_angle_deg', unit: 'deg', operator: '+/-', value: CR_ROAD_WHEEL_ANGLE_DEG, condition: 'mechanical end stops', discipline: 'hardware', asil: 'QM', text: `The rack and housing shall permit ±${CR_ROAD_WHEEL_ANGLE_DEG}° of road wheel angle.`, parents: [ANCHORS.crAngleRange], derivation: 'CR-K2-0102, direct.' },
  { id: 'SR-EPS-0402', title: 'Steering ratio', attribute: 'steering_ratio', unit: 'ratio', operator: '=', value: 15.8, condition: 'nominal', discipline: 'hardware', asil: 'QM', text: 'The pinion and rack shall realise a 15.8:1 nominal ratio.', parents: ['CR-K2-0105'], derivation: 'CR-K2-0105, direct.' },
  { id: 'SR-EPS-0403', title: 'Rack stroke', attribute: 'rack_stroke_mm', unit: 'mm', operator: '>=', value: 152, condition: 'end stop to end stop', discipline: 'hardware', asil: 'QM', text: 'Rack stroke shall be at least 152 mm.', parents: ['CR-K2-0106'], derivation: 'CR-K2-0106, direct.' },
  { id: 'SR-EPS-0404', title: 'Peak supply current', attribute: 'max_current_a', unit: 'A', operator: '<=', value: 110, condition: '12 V', discipline: 'hardware', asil: 'QM', text: 'Peak supply current shall not exceed 110 A at 12 V.', parents: ['CR-K2-0107'], derivation: 'CR-K2-0107, direct.' },
  { id: 'SR-EPS-0405', title: 'Assembly mass', attribute: 'mass_kg', unit: 'kg', operator: '<=', value: 12.4, condition: 'dry', discipline: 'hardware', asil: 'QM', text: 'Assembly mass shall not exceed 12.4 kg dry.', parents: ['CR-K2-0108'], derivation: 'CR-K2-0108, direct.' },
  { id: 'SR-EPS-0406', title: 'Operating temperature range', attribute: 'temp_min_c', unit: 'C', operator: '=', value: -40, condition: 'full function', discipline: 'hardware', asil: 'QM', text: 'The system shall be fully functional from −40 °C to +85 °C.', parents: ['CR-K2-0109', 'CR-K2-0121'], derivation: 'CR-K2-0109 and CR-K2-0121, merged — one temperature range, two customer clauses.' },
  { id: 'SR-EPS-0409', title: 'Torque sensor plausibility', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'safety', asil: 'D', text: 'Driver torque shall be acquired redundantly and cross-checked before use in the assist path.', parents: [ANCHORS.crSafetyGoal], derivation: 'CR-K2-0110. The assist command cannot be safer than the signal it is computed from.' },
  { id: 'SR-EPS-0410', title: 'Independent torque limiting', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'safety', asil: 'D', text: 'An independent monitor shall bound commanded motor torque against the driver request.', parents: [ANCHORS.crSafetyGoal], derivation: 'CR-K2-0110.' },
  { id: 'SR-EPS-0412', title: 'Loss of assist degradation', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'safety', asil: 'C', text: 'Assist shall degrade progressively rather than step to zero on a detected fault.', parents: ['CR-K2-0111'], derivation: 'CR-K2-0111.' },
  { id: 'SR-EPS-0413', title: 'Mechanical fallback', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'hardware', asil: 'C', text: 'The mechanical path from wheel to rack shall remain intact on total electrical loss.', parents: ['CR-K2-0118'], derivation: 'CR-K2-0118, direct.' },
  { id: 'SR-EPS-0414', title: 'Diagnostic services over CAN-FD', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'software', asil: 'QM', text: 'The ECU shall implement the customer diagnostic service set over CAN-FD.', parents: ['CR-K2-0114'], derivation: 'CR-K2-0114, direct.' },
  { id: 'SR-EPS-0416', title: 'End-of-line learn time', attribute: 'eol_learn_s', unit: 's', operator: '<=', value: 25, condition: 'centre and offsets', discipline: 'software', asil: 'QM', text: 'End-of-line learning shall complete within 25 s.', parents: ['CR-K2-0115'], derivation: 'CR-K2-0115, direct.' },
  { id: 'SR-EPS-0417', title: 'Durability', attribute: 'lifetime_cycles', unit: 'cycles', operator: '>=', value: 1_500_000, condition: 'full-stroke equivalent', discipline: 'hardware', asil: 'QM', text: 'The assembly shall survive 1,500,000 full-stroke-equivalent cycles.', parents: ['CR-K2-0116'], derivation: 'CR-K2-0116, direct.' },
  { id: 'SR-EPS-0418', title: 'NVH at the driver ear', attribute: 'nvh_limit_db', unit: 'dB', operator: '<=', value: 52, condition: 'parking manoeuvre', discipline: 'systems', asil: 'QM', text: 'Steering-induced noise shall not exceed 52 dB(A) at the driver ear.', parents: ['CR-K2-0117'], derivation: 'CR-K2-0117, direct.' },
  { id: 'SR-EPS-0419', title: 'Return-to-centre residual angle', attribute: 'return_to_center_error_deg', unit: 'deg', operator: '<=', value: 3, condition: 'release from 90°, 60 km/h', discipline: 'calibration', asil: 'QM', text: 'Residual steering wheel angle after release shall not exceed 3°.', parents: ['CR-K2-0120'], derivation: 'CR-K2-0120, direct.' },
  { id: 'SR-EPS-0420', title: 'ASPICE capability', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'systems', asil: 'QM', text: 'SYS.1 to SYS.5 and SWE.1 to SWE.6 shall be assessed at capability level 2 or above.', parents: ['CR-K2-0112'], derivation: 'CR-K2-0112, direct.' },
  { id: 'SR-EPS-0422', title: 'Cybersecurity engineering', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'systems', asil: 'QM', text: 'A TARA shall be performed and the resulting cybersecurity goals implemented per ISO/SAE 21434.', parents: ['CR-K2-0113'], derivation: 'CR-K2-0113, direct.' },
  { id: 'SR-EPS-0423', title: 'Piece cost allocation', attribute: 'piece_price_eur', unit: 'EUR', operator: '<=', value: 268, condition: 'at 140,000/yr', discipline: 'systems', asil: 'QM', text: 'Bill-of-material cost shall be allocated so that piece price does not exceed EUR 268.', parents: ['CR-K2-0122'], derivation: 'CR-K2-0122, direct.' },
  { id: 'SR-EPS-0424', title: 'Programme timing', attribute: null, unit: null, operator: null, value: null, condition: null, discipline: 'systems', asil: 'QM', text: 'The development plan shall support SOP on 2028-09-01.', parents: ['CR-K2-0124'], derivation: 'CR-K2-0124, direct.' },
];

/** The K2 architecture: elements, and which activities land on each. */
const K2_ELEMENTS: readonly { id: string; kind: string; name: string; makeBuy: string; asil: string; part: string | null; reuse: string; activities: string[] }[] = [
  { id: ANCHORS.elSensor, kind: 'sensor', name: 'Column torque and angle sensor', makeBuy: 'buy', asil: 'D', part: ANCHORS.sensor, reuse: 'carryover', activities: ['ACT-TORQUE-SENSE', 'ACT-ANGLE-SENSE'] },
  { id: ANCHORS.elEcu, kind: 'ecu', name: 'EPS electronic control unit', makeBuy: 'buy', asil: 'D', part: ANCHORS.ecuCurrent, reuse: 'modified', activities: ['ACT-ASSIST', 'ACT-DAMPING', 'ACT-RETURN-TO-CENTER', 'ACT-HYSTERESIS-COMP', 'ACT-FRICTION-COMP', 'ACT-ARBITRATION', 'ACT-DIAGNOSTICS', 'ACT-SAFETY-MONITOR', 'ACT-EOL-CALIB'] },
  { id: ANCHORS.elMotor, kind: 'motor', name: 'PMSM assist motor', makeBuy: 'buy', asil: 'D', part: ANCHORS.motor, reuse: 'carryover', activities: ['ACT-MOTOR-CONTROL'] },
  { id: ANCHORS.elGear, kind: 'gearbox', name: 'Ball-nut reduction gearbox', makeBuy: 'make', asil: 'B', part: ANCHORS.gearbox, reuse: 'modified', activities: [] },
  { id: ANCHORS.elRack, kind: 'mechanical', name: 'Rack and housing', makeBuy: 'make', asil: 'B', part: ANCHORS.rack, reuse: 'carryover', activities: [] },
  { id: 'EL-K2-GW-01', kind: 'ecu', name: 'Vehicle bus gateway (customer supplied)', makeBuy: 'buy', asil: 'B', part: null, reuse: 'carryover', activities: [] },
];

export function buildRequirements(crm: { programs: Programs[] }): Alm {
  const h = makeHelpers(SEEDS.requirements);
  const alm: Alm = {
    spec_documents: [], spec_revisions: [], customer_requirements: [], customer_requirement_versions: [],
    cr_history: [], system_requirements: [], system_requirement_versions: [], trace_cr_sr: [],
    budgets: [], budget_allocations: [], architecture_versions: [], elements: [], activities: [],
    activity_allocations: [], interfaces: [], trace_sr_element: [], change_requests: [], change_request_items: [],
  };

  for (const a of ACTIVITIES) {
    alm.activities.push({ activity_id: a.id, name: a.name, kind: a.kind, description: a.description });
  }

  // ── K2 · SYS.1 ───────────────────────────────────────────────────────────

  alm.spec_documents.push({
    spec_id: ANCHORS.spec,
    customer_ref: ANCHORS.customer,
    program_ref: ANCHORS.program,
    title: 'K2 Electric Power Steering — Customer Requirement Specification',
    kind: 'CRS',
    issued_by: 'Kestrel Motors Chassis Engineering',
  });

  // T1 — two revisions. Rev A ran from May to July and is CLOSED; Rev B is in
  // force. The as-of rule is a date-range query over exactly these two rows.
  alm.spec_revisions.push({
    spec_revision_id: ANCHORS.revA,
    spec_id: ANCHORS.spec,
    revision: 'Rev A',
    received_on: on(2026, 5, 12),
    effective_from: on(2026, 5, 12),
    effective_to: on(2026, 7, 30),
    change_note: 'Initial issue for quotation.',
    supersedes: null,
  });
  alm.spec_revisions.push({
    spec_revision_id: ANCHORS.revB,
    spec_id: ANCHORS.spec,
    revision: 'Rev B',
    received_on: on(2026, 7, 30),
    effective_from: on(2026, 7, 30),
    effective_to: null,
    change_note: `Rack force capacity raised from ${CR_RACK_FORCE_N_REV_A} N to ${CR_RACK_FORCE_N} N following a kerb-strike load case review. All other requirements unchanged.`,
    supersedes: ANCHORS.revA,
  });

  for (const cr of K2_REQUIREMENTS) {
    alm.customer_requirements.push({
      cr_id: cr.id, spec_id: ANCHORS.spec, section: cr.section,
      title: cr.title, attribute: cr.attribute, unit: cr.unit,
    });

    // Rev A first. Only the one requirement with `revA` differs; the rest are
    // identical rows under a different revision, which is what a real spec
    // revision looks like and what makes the difference easy to miss.
    const aValue = cr.revA ?? cr.value;
    alm.customer_requirement_versions.push({
      cr_id: cr.id, spec_revision_id: ANCHORS.revA,
      text_body: cr.revA ? cr.text.replace(String(CR_RACK_FORCE_N), String(CR_RACK_FORCE_N_REV_A)) : cr.text,
      operator: cr.operator, value_num: aValue, condition: cr.condition,
      verification_method: cr.verification, asil: cr.asil, priority: cr.priority, status: 'agreed',
    });
    alm.customer_requirement_versions.push({
      cr_id: cr.id, spec_revision_id: ANCHORS.revB,
      text_body: cr.text, operator: cr.operator, value_num: cr.value, condition: cr.condition,
      verification_method: cr.verification, asil: cr.asil, priority: cr.priority, status: 'agreed',
    });

    if (cr.revA !== undefined) {
      alm.cr_history.push({
        history_id: 'CRH-K2-0001',
        cr_id: cr.id,
        changed_on: on(2026, 7, 30),
        field: 'value_num',
        from_value: String(cr.revA),
        to_value: String(cr.value),
        chr_ref: null,
        author: 'Kestrel Motors Chassis Engineering',
      });
    }
  }

  // ── K2 · SYS.2 ───────────────────────────────────────────────────────────

  for (const sr of K2_SYSTEM_REQUIREMENTS) {
    alm.system_requirements.push({
      sr_id: sr.id, program_ref: ANCHORS.program, title: sr.title,
      attribute: sr.attribute, unit: sr.unit, owner_discipline: sr.discipline,
      derivation_note: sr.derivation,
    });
    alm.system_requirement_versions.push({
      sr_id: sr.id, revision: 1, effective_from: on(2026, 8, 20), effective_to: null,
      text_body: sr.text, operator: sr.operator, value_num: sr.value, condition: sr.condition,
      verification_method: 'test', asil: sr.asil, status: 'reviewed',
      maturity: sr.maturity ?? 'specified',
    });
    for (const cr_id of sr.parents) {
      alm.trace_cr_sr.push({
        cr_id, sr_id: sr.id,
        coverage: sr.parents.length > 1 ? 'partial' : 'full',
        rationale: sr.derivation,
      });
    }
  }

  // T7, stated as an assertion about what we just built rather than trusted.
  // If a requirement is later given a trace link and this list is not updated,
  // the seed fails here instead of `db:check` failing for a reason three files
  // away. A trap that can drift silently is not a trap.
  const traced = new Set(alm.trace_cr_sr.map((t) => t.cr_id));
  for (const cr of UNTRACED_CRS) {
    if (traced.has(cr)) throw new Error(`T7 broken in the generator: ${cr} was given a trace link.`);
  }

  // ── K2 · the budgets ─────────────────────────────────────────────────────

  const budget = (
    id: string,
    parent: string,
    attribute: string,
    b: { target: number; tolerance: number; unit: string; knownOpen: boolean; closureNote?: string; allocations: readonly { label: string; value: number; basis: string; element?: string }[] },
  ) => {
    alm.budgets.push({
      budget_id: id, parent_sr_id: parent, program_ref: ANCHORS.program,
      attribute, unit: b.unit, target_value: b.target, operator: '<=',
      tolerance: b.tolerance, known_open: b.knownOpen, closure_note: b.closureNote ?? null,
    });
    b.allocations.forEach((a, i) => {
      alm.budget_allocations.push({
        budget_id: id, seq: i + 1, label: a.label, value: a.value, basis: a.basis,
        element_id: a.element ?? null, child_sr_id: null,
      });
    });
  };

  // A5 — closes at 2.7 exactly.
  budget(ANCHORS.budOnCenter, ANCHORS.srOnCenterTorque, 'on_center_torque_nm', BUD_ONCTR_TRQ);
  // A6 — T4. Does not close, and says so.
  budget(ANCHORS.budHysteresis, ANCHORS.srHysteresis, 'on_center_hysteresis_nm', BUD_HYST_CTRL);
  // A7 — closes with 0.2 ms margin.
  budget(ANCHORS.budLatency, ANCHORS.srLatency, 'assist_latency_ms', BUD_LATENCY);

  // ── K2 · SYS.3 ───────────────────────────────────────────────────────────
  //
  // Three architecture versions, so the as-of rule has something to bite on
  // here too. Only v3 is baselined and only v3 carries elements.

  for (let v = 1; v <= 3; v++) {
    alm.architecture_versions.push({
      arch_id: `ARCH-K2-v${v}`,
      program_ref: ANCHORS.program,
      version: v,
      created_on: on(2026, 5 + v, 4),
      status: v === 3 ? 'baselined' : 'superseded',
      supersedes: v === 1 ? null : `ARCH-K2-v${v - 1}`,
    });
  }

  for (const el of K2_ELEMENTS) {
    alm.elements.push({
      element_id: el.id, arch_id: ANCHORS.arch, kind: el.kind, name: el.name,
      make_buy: el.makeBuy, asil: el.asil, part_ref: el.part, reuse_class: el.reuse,
    });
    for (const activity_id of el.activities) {
      alm.activity_allocations.push({
        activity_id, element_id: el.id, allocation_type: 'primary',
        rationale: null,
      });
    }
  }

  const iface = (n: number, from: string, to: string, kind: string, signal: string, rate: number | null, asil: string) =>
    alm.interfaces.push({
      interface_id: `IF-K2-${String(n).padStart(2, '0')}`, arch_id: ANCHORS.arch,
      from_element: from, to_element: to, kind, signal, rate_ms: rate, asil,
    });

  iface(1, ANCHORS.elSensor, ANCHORS.elEcu, 'SENT', 'driver torque, steering angle', 1, 'D');
  iface(2, ANCHORS.elEcu, ANCHORS.elMotor, 'PWM', 'three-phase motor current command', 0.1, 'D');
  iface(3, 'EL-K2-GW-01', ANCHORS.elEcu, 'CAN-FD', 'vehicle speed, ADAS torque request', 10, 'B');
  iface(4, ANCHORS.elEcu, 'EL-K2-GW-01', 'CAN-FD', 'status, diagnostics', 20, 'QM');
  iface(5, ANCHORS.elMotor, ANCHORS.elGear, 'mechanical', 'assist torque', null, 'B');
  iface(6, ANCHORS.elGear, ANCHORS.elRack, 'mechanical', 'rack force', null, 'B');

  // SYS.3's allocation base practice: which SR lands on which element.
  const SR_TO_ELEMENT: [string, string][] = [
    [ANCHORS.srRackForce, ANCHORS.elGear], [ANCHORS.srRackForce, ANCHORS.elMotor], [ANCHORS.srRackForce, ANCHORS.elRack],
    [ANCHORS.srOnCenterTorque, ANCHORS.elEcu], [ANCHORS.srOnCenterTorque, ANCHORS.elGear],
    [ANCHORS.srHysteresis, ANCHORS.elEcu],
    [ANCHORS.srLatency, ANCHORS.elSensor], [ANCHORS.srLatency, ANCHORS.elEcu], [ANCHORS.srLatency, ANCHORS.elMotor],
    [ANCHORS.srDampingAsil, ANCHORS.elEcu],
    ['SR-EPS-0401', ANCHORS.elRack], ['SR-EPS-0402', ANCHORS.elRack], ['SR-EPS-0403', ANCHORS.elRack],
    ['SR-EPS-0404', ANCHORS.elEcu], ['SR-EPS-0405', ANCHORS.elRack], ['SR-EPS-0406', ANCHORS.elEcu],
    ['SR-EPS-0409', ANCHORS.elSensor], ['SR-EPS-0410', ANCHORS.elEcu], ['SR-EPS-0412', ANCHORS.elEcu],
    ['SR-EPS-0413', ANCHORS.elRack], ['SR-EPS-0414', ANCHORS.elEcu], ['SR-EPS-0416', ANCHORS.elEcu],
    ['SR-EPS-0417', ANCHORS.elRack], ['SR-EPS-0418', ANCHORS.elGear], ['SR-EPS-0419', ANCHORS.elEcu],
  ];
  for (const [sr_id, element_id] of SR_TO_ELEMENT) {
    alm.trace_sr_element.push({ sr_id, element_id, rationale: null });
  }

  // T4's change request — raised, assessed, and NOT decided. An open budget
  // with a decided change request would be a closed story.
  alm.change_requests.push({
    chr_id: ANCHORS.chrHysteresis,
    program_ref: ANCHORS.program,
    raised_on: on(2026, 9, 2),
    source: 'internal',
    title: 'Hysteresis budget allocations are stated at the motor, target is at the wheel',
    status: 'assessed',
    decision: null,
    decided_on: null,
    effort_ref: null,
  });
  alm.change_request_items.push({
    chr_id: ANCHORS.chrHysteresis, seq: 1, target_kind: 'budget',
    target_id: ANCHORS.budHysteresis, action: 'modify',
  });
  alm.change_request_items.push({
    chr_id: ANCHORS.chrHysteresis, seq: 2, target_kind: 'sr',
    target_id: ANCHORS.srHysteresis, action: 'modify',
  });

  // ── the other programmes ─────────────────────────────────────────────────
  //
  // Generated, and deliberately plain: specs that say what they say, trace
  // links that are complete, budgets that close. Their job is volume for the
  // coverage and comparables queries, not more traps. Two estates' worth of
  // traps in one estate means no trap can be attributed.

  const others = crm.programs.filter((p) => p.program_id !== ANCHORS.program);
  const DISCIPLINES = ['systems', 'software', 'hardware', 'calibration', 'safety'] as const;
  const ATTRS: [string, string, number, number][] = [
    ['rack_force_capacity', 'N', 5000, 12_000],
    ['road_wheel_angle_deg', 'deg', 44, 56],
    ['on_center_torque_nm', 'Nm', 2.1, 3.4],
    ['on_center_hysteresis_nm', 'Nm', 0.3, 0.9],
    ['max_current_a', 'A', 60, 120],
    ['mass_kg', 'kg', 9, 15],
    ['assist_latency_ms', 'ms', 6, 11],
    ['nvh_limit_db', 'dB', 46, 58],
  ];

  let crN = 0, srN = 0, chrN = 0, histN = 1, budN = 0, ifN = 0;

  for (const p of others) {
    const tag = p.program_id.slice(4);
    const spec_id = `CRS-${tag}-001`;
    alm.spec_documents.push({
      spec_id, customer_ref: p.customer_id, program_ref: p.program_id,
      title: `${p.model} Electric Power Steering — Customer Requirement Specification`,
      kind: 'CRS', issued_by: `${p.customer_id} engineering`,
    });

    const nRev = h.int(1, 3);
    const revIds: string[] = [];
    for (let r = 0; r < nRev; r++) {
      const rev = `Rev ${String.fromCharCode(65 + r)}`;
      const id = `${spec_id} ${rev}`;
      revIds.push(id);
      const from = h.int(-2_600, -400) + r * 120;
      alm.spec_revisions.push({
        spec_revision_id: id, spec_id, revision: rev,
        received_on: h.day(from), effective_from: h.day(from),
        effective_to: r === nRev - 1 ? null : h.day(from + 120),
        change_note: r === 0 ? 'Initial issue for quotation.' : 'Revision following design review.',
        supersedes: r === 0 ? null : revIds[r - 1],
      });
    }
    const current = revIds[revIds.length - 1];

    const nCr = h.int(12, 22);
    const crIds: string[] = [];
    for (let i = 0; i < nCr; i++) {
      const cr_id = `CR-${tag}-${String(++crN).padStart(4, '0')}`;
      crIds.push(cr_id);
      const [attribute, unit, lo, hi] = h.pick(ATTRS);
      const value = h.num(lo, hi, unit === 'N' || unit === 'A' ? 0 : 2);
      alm.customer_requirements.push({
        cr_id, spec_id, section: `${h.int(4, 11)}.${h.int(1, 4)}.${h.int(1, 3)}`,
        title: attribute.replace(/_/g, ' '), attribute, unit,
      });
      for (const rid of revIds) {
        alm.customer_requirement_versions.push({
          cr_id, spec_revision_id: rid,
          text_body: `The system shall meet ${attribute.replace(/_/g, ' ')} of ${value} ${unit}.`,
          operator: h.pick(['<=', '>=']), value_num: value, condition: null,
          verification_method: h.pick(['test', 'analysis', 'inspection', 'review']),
          asil: h.pick(['QM', 'QM', 'B', 'C', 'D']), priority: h.chance(0.75) ? 'must' : 'should',
          status: 'agreed',
        });
      }
      if (h.chance(0.35)) {
        alm.cr_history.push({
          history_id: `CRH-${String(++histN).padStart(5, '0')}`, cr_id,
          changed_on: h.dayBetween(-2_400, -200), field: h.pick(['value_num', 'status', 'priority']),
          from_value: String(h.num(lo, hi, 2)), to_value: String(value),
          chr_ref: null, author: `${p.customer_id} engineering`,
        });
      }
    }

    // Architecture first — the SRs trace onto its elements.
    const nArch = h.int(1, 3);
    for (let v = 1; v <= nArch; v++) {
      alm.architecture_versions.push({
        arch_id: `ARCH-${tag}-v${v}`, program_ref: p.program_id, version: v,
        created_on: h.dayBetween(-2_300, -300), status: v === nArch ? 'baselined' : 'superseded',
        supersedes: v === 1 ? null : `ARCH-${tag}-v${v - 1}`,
      });
    }
    const arch = `ARCH-${tag}-v${nArch}`;
    const elKinds: [string, string][] = [
      ['sensor', 'Torque and angle sensor'], ['ecu', 'EPS ECU'], ['motor', 'Assist motor'],
      ['gearbox', 'Reduction gearbox'], ['mechanical', 'Rack and housing'],
    ];
    const elIds: string[] = [];
    elKinds.forEach(([kind, name], i) => {
      const element_id = `EL-${tag}-${kind.slice(0, 4).toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
      elIds.push(element_id);
      alm.elements.push({
        element_id, arch_id: arch, kind, name,
        make_buy: kind === 'mechanical' || kind === 'gearbox' ? 'make' : 'buy',
        asil: h.pick(['QM', 'B', 'C', 'D']), part_ref: null,
        reuse_class: h.pick(['carryover', 'carryover', 'modified', 'new']),
      });
    });
    for (const a of h.sample(ACTIVITIES, h.int(6, 11))) {
      alm.activity_allocations.push({
        activity_id: a.id, element_id: h.pick(elIds), allocation_type: h.chance(0.85) ? 'primary' : 'support',
        rationale: null,
      });
    }
    for (let i = 0; i + 1 < elIds.length; i++) {
      alm.interfaces.push({
        interface_id: `IF-${String(++ifN).padStart(4, '0')}`, arch_id: arch,
        from_element: elIds[i], to_element: elIds[i + 1],
        kind: h.pick(['CAN-FD', 'SENT', 'PSI5', 'analog', 'PWM', 'mechanical']),
        signal: 'signal', rate_ms: h.chance(0.6) ? h.num(0.1, 20, 2) : null,
        asil: h.pick(['QM', 'B', 'D']),
      });
    }

    // SRs, each traced to one or two CRs. Complete on purpose — T7 is K2's.
    const nSr = Math.round(nCr * 1.4);
    const srIds: string[] = [];
    for (let i = 0; i < nSr; i++) {
      const sr_id = `SR-${tag}-${String(++srN).padStart(4, '0')}`;
      srIds.push(sr_id);
      const [attribute, unit, lo, hi] = h.pick(ATTRS);
      const value = h.num(lo, hi, 2);
      alm.system_requirements.push({
        sr_id, program_ref: p.program_id, title: attribute.replace(/_/g, ' '),
        attribute, unit, owner_discipline: h.pick(DISCIPLINES),
        derivation_note: 'Derived from the customer specification.',
      });
      const revs = h.int(1, 2);
      for (let r = 1; r <= revs; r++) {
        alm.system_requirement_versions.push({
          sr_id, revision: r, effective_from: h.dayBetween(-2_200, -250),
          effective_to: r === revs ? null : h.dayBetween(-240, -100),
          text_body: `The system shall achieve ${attribute.replace(/_/g, ' ')} of ${value} ${unit}.`,
          operator: h.pick(['<=', '>=']), value_num: value, condition: null,
          verification_method: h.pick(['test', 'analysis']), asil: h.pick(['QM', 'B', 'C', 'D']),
          status: r === revs ? 'agreed' : 'superseded', maturity: h.pick(['specified', 'verified']),
        });
      }
      for (const cr_id of h.sample(crIds, h.int(1, 2))) {
        if (alm.trace_cr_sr.some((t) => t.cr_id === cr_id && t.sr_id === sr_id)) continue;
        alm.trace_cr_sr.push({ cr_id, sr_id, coverage: h.chance(0.85) ? 'full' : 'partial', rationale: null });
      }
      for (const element_id of h.sample(elIds, h.int(1, 2))) {
        if (alm.trace_sr_element.some((t) => t.sr_id === sr_id && t.element_id === element_id)) continue;
        alm.trace_sr_element.push({ sr_id, element_id, rationale: null });
      }
    }

    // One or two budgets per programme, all closing. A budget that closes is
    // the normal case, and T4 only reads as abnormal against a majority that do.
    for (let b = 0; b < h.int(0, 2); b++) {
      const parent = h.pick(srIds);
      const target = h.num(2.2, 9.0, 2);
      const budget_id = `BUD-${tag}-${String(++budN).padStart(3, '0')}`;
      alm.budgets.push({
        budget_id, parent_sr_id: parent, program_ref: p.program_id,
        attribute: 'on_center_torque_nm', unit: 'Nm', target_value: target,
        operator: '<=', tolerance: 0.05, known_open: false, closure_note: null,
      });
      const first = h.num(target * 0.55, target * 0.8, 2);
      alm.budget_allocations.push({ budget_id, seq: 1, label: 'primary path', value: first, basis: h.pick(['measured', 'carryover']), element_id: null, child_sr_id: null });
      alm.budget_allocations.push({ budget_id, seq: 2, label: 'secondary path', value: Number((target - first).toFixed(2)), basis: 'estimated', element_id: null, child_sr_id: null });
    }

    // Change requests. These are what vst_pmo's effort records point back at,
    // so the count here decides how much history the cost query has.
    const nChr = h.int(2, 9);
    for (let i = 0; i < nChr; i++) {
      const raised = h.int(-2_300, -150);
      const implemented = h.chance(0.78);
      const chr_id = `CHR-${2020 + Math.floor((2300 + raised) / 365)}-${String(++chrN).padStart(4, '0')}`;
      alm.change_requests.push({
        chr_id, program_ref: p.program_id, raised_on: h.day(raised),
        source: h.pick(['customer', 'internal', 'defect', 'regulatory']),
        title: 'Change to ' + h.pick(['assist map', 'damping tuning', 'gearbox ratio', 'ECU supplier', 'diagnostic set', 'safety monitor', 'harness routing']),
        status: implemented ? 'implemented' : h.pick(['open', 'assessed', 'rejected']),
        decision: implemented ? 'approved' : null,
        decided_on: implemented ? h.day(raised + h.int(14, 90)) : null,
        effort_ref: null, // filled in by the effort generator's own ids
      });
      alm.change_request_items.push({
        chr_id, seq: 1,
        target_kind: h.pick(['cr', 'sr', 'element', 'activity', 'interface']),
        target_id: h.pick([...crIds, ...srIds, ...elIds]),
        action: h.pick(['add', 'modify', 'delete']),
      });
      if (h.chance(0.5)) {
        alm.change_request_items.push({
          chr_id, seq: 2, target_kind: 'sr', target_id: h.pick(srIds), action: 'modify',
        });
      }
    }
  }

  return alm;
}
