/**
 * vst_plm — parts, what they claim, and what a rig actually demonstrated.
 *
 * OWN RANDOM STREAM (`SEEDS.hardware`).
 *
 * TWO TRAPS ARE PLANTED HERE BY HAND, and both are planted by writing rows that
 * DISAGREE with each other rather than rows that are wrong:
 *
 *   T2  `VS-GEAR-3301-C` claims 8000 N by analysis and has demonstrated 7600 N
 *       on a rig. Neither row is false. A reuse answer that reads
 *       `part_capabilities` without joining `qualification_tests` reports a
 *       clean carryover for the K2's 8000 N requirement and is wrong by 400 N.
 *
 *   T6  `VS-ECU-4412-B` is the cheapest ECU that fits and its last-time-buy
 *       window has closed. Structurally perfect, impossible to order.
 *
 * The generated bulk exists to make those two hard to find. It is deliberately
 * boring: parts that do what their datasheets say, tests that demonstrate what
 * was claimed. A haystack whose every straw is interesting is not a haystack.
 */
import { makeHelpers, SEEDS, on } from './rng';
import { ANCHORS } from './anchors';
import {
  GEARBOX_CLAIMED_N,
  GEARBOX_DEMONSTRATED_N,
  RACK_DEMONSTRATED_ANGLE_DEG,
  BUD_LATENCY,
} from '../../config/assumptions';
import type { Plm, Programs } from '../schema/rows';

const KINDS = ['ecu', 'motor', 'torque_sensor', 'gearbox', 'rack', 'housing', 'harness', 'pinion'] as const;

const SUPPLIER_NAMES: readonly { id: string; name: string; country: string }[] = [
  { id: 'CSUP-01', name: 'Norlind Elektronik', country: 'SE' },
  { id: 'CSUP-02', name: 'Ferrantis Magnetics', country: 'IT' },
  { id: 'CSUP-03', name: 'Okabe Sensing', country: 'JP' },
  { id: 'CSUP-04', name: 'Brandt Präzision', country: 'DE' },
  { id: 'CSUP-05', name: 'Valmier Composites', country: 'FR' },
  { id: 'CSUP-06', name: 'Hanwu Drive Systems', country: 'CN' },
  { id: 'CSUP-07', name: 'Ostergaard Bearings', country: 'DK' },
  { id: 'CSUP-08', name: 'Trelan Microcontrollers', country: 'US' },
  { id: 'CSUP-09', name: 'Kessner Stanztechnik', country: 'AT' },
  { id: 'CSUP-10', name: 'Aveline Cable', country: 'PL' },
  { id: 'CSUP-11', name: 'Rothbury Gears', country: 'GB' },
  { id: 'CSUP-12', name: 'Sinto Power Modules', country: 'KR' },
];

const LINES: readonly { id: string; architecture: string; name: string; force: number; year: number; status: string }[] = [
  { id: 'PL-CEPS', architecture: 'C-EPS', name: 'Vantis Column Assist', force: 5500, year: 2011, status: 'current' },
  { id: 'PL-PEPS', architecture: 'P-EPS', name: 'Vantis Pinion Assist', force: 7000, year: 2014, status: 'current' },
  { id: 'PL-DPEPS', architecture: 'DP-EPS', name: 'Vantis Dual Pinion', force: 9000, year: 2018, status: 'current' },
  { id: 'PL-REPS', architecture: 'R-EPS', name: 'Vantis Rack Assist', force: 11_000, year: 2016, status: 'current' },
  { id: 'PL-CEPS-L', architecture: 'C-EPS', name: 'Vantis Column Assist (legacy)', force: 4800, year: 2006, status: 'legacy' },
  { id: 'PL-SBW', architecture: 'SbW', name: 'Vantis Steer-by-Wire', force: 12_000, year: 2025, status: 'development' },
];

export function buildHardware(crm: { programs: Programs[] }): Plm {
  const h = makeHelpers(SEEDS.hardware);
  const plm: Plm = {
    component_suppliers: [],
    product_lines: [],
    parts: [],
    part_capabilities: [],
    assemblies: [],
    bom_lines: [],
    qualification_tests: [],
    part_program_usage: [],
  };

  for (const s of SUPPLIER_NAMES) {
    plm.component_suppliers.push({
      supplier_id: s.id,
      name: s.name,
      country: s.country,
      status: h.chance(0.08) ? 'conditional' : h.chance(0.04) ? 'exited' : 'approved',
      approved_on: h.dayBetween(-6_500, -900),
    });
  }

  for (const l of LINES) {
    plm.product_lines.push({
      line_id: l.id,
      architecture: l.architecture,
      name: l.name,
      force_class_n: l.force,
      introduced_on: on(l.year, 3, 1),
      status: l.status,
    });
  }

  // ── the anchored parts ───────────────────────────────────────────────────

  const cap = (part_no: string, attribute: string, value: number, unit: string, source: string, qualified: boolean) =>
    plm.part_capabilities.push({ part_no, attribute, value, unit, source, qualified });

  // T2 — the gearbox. The claimed row and the tested row are written here, four
  // lines apart, so the gap is visible in the generator as well as in the data.
  plm.parts.push({
    part_no: ANCHORS.gearbox,
    kind: 'gearbox',
    name: 'Ball-nut gearbox, 3301 series rev C',
    line_id: 'PL-REPS',
    lifecycle: 'production',
    make_buy: 'make',
    supplier_id: null,
    unit_cost_eur: 61.4,
    lead_time_days: 42,
    released_on: on(2022, 6, 9),
  });
  cap(ANCHORS.gearbox, 'max_rack_force_n', GEARBOX_CLAIMED_N, 'N', 'analysis', false);
  cap(ANCHORS.gearbox, 'peak_motor_torque_nm', 4.8, 'Nm', 'datasheet', true);
  plm.qualification_tests.push({
    test_id: 'QT-2023-0188',
    part_no: ANCHORS.gearbox,
    standard: 'internal',
    attribute: 'max_rack_force_n',
    condition: 'rack force ramp to failure, 20 °C, 13.5 V, 3 samples',
    max_value_demonstrated: GEARBOX_DEMONSTRATED_N,
    unit: 'N',
    // 'pass' against the condition it was RUN at, which is a weaker statement
    // than "meets 8000 N" and is the easier of the two to misread.
    result: 'pass',
    tested_on: on(2023, 2, 14),
    report_ref: 'TR-2023-0188',
  });

  // The rack. CR-K2-0102 (±50°) is satisfied as-is because this already
  // demonstrated ±52°, on test, qualified — and because it SHIPS, which the two
  // usage rows below are what prove.
  plm.parts.push({
    part_no: ANCHORS.rack,
    kind: 'rack',
    name: 'Rack and housing, 2210 series rev A',
    line_id: 'PL-REPS',
    lifecycle: 'production',
    make_buy: 'make',
    supplier_id: null,
    unit_cost_eur: 88.2,
    lead_time_days: 55,
    released_on: on(2021, 11, 2),
  });
  cap(ANCHORS.rack, 'road_wheel_angle_deg', RACK_DEMONSTRATED_ANGLE_DEG, 'deg', 'test', true);
  cap(ANCHORS.rack, 'max_rack_force_n', 11_000, 'N', 'test', true);
  plm.qualification_tests.push({
    test_id: 'QT-2022-0041',
    part_no: ANCHORS.rack,
    standard: 'internal',
    attribute: 'road_wheel_angle_deg',
    condition: 'end-stop to end-stop, both directions, 5 samples',
    max_value_demonstrated: RACK_DEMONSTRATED_ANGLE_DEG,
    unit: 'deg',
    result: 'pass',
    tested_on: on(2022, 1, 20),
    report_ref: 'TR-2022-0041',
  });

  // T6 — two ECUs. The cheap one cannot be bought.
  plm.parts.push({
    part_no: ANCHORS.ecuObsolete,
    kind: 'ecu',
    name: 'EPS ECU 4412 rev B',
    line_id: 'PL-REPS',
    lifecycle: 'ltb-passed',
    make_buy: 'buy',
    supplier_id: 'CSUP-08',
    unit_cost_eur: 47.9,
    lead_time_days: 90,
    released_on: on(2019, 5, 16),
  });
  cap(ANCHORS.ecuObsolete, 'latency_ms', 1.7, 'ms', 'test', true);
  cap(ANCHORS.ecuObsolete, 'cont_current_a', 75, 'A', 'datasheet', true);

  plm.parts.push({
    part_no: ANCHORS.ecuCurrent,
    kind: 'ecu',
    name: 'EPS ECU 4680 rev A',
    line_id: 'PL-REPS',
    lifecycle: 'production',
    make_buy: 'buy',
    supplier_id: 'CSUP-08',
    unit_cost_eur: 63.5,
    lead_time_days: 70,
    released_on: on(2024, 2, 5),
  });
  // A7 — the 1.7 ms the brief gave, as a measured ECU capability.
  cap(ANCHORS.ecuCurrent, 'latency_ms', BUD_LATENCY.allocations[1].value, 'ms', 'test', true);
  cap(ANCHORS.ecuCurrent, 'cont_current_a', 95, 'A', 'datasheet', true);

  // The torque sensor. A7 — the 3.5 ms acquisition time, from its datasheet,
  // which is why the latency budget's first allocation says `datasheet` and not
  // `measured`: nobody has put this one on a bench.
  plm.parts.push({
    part_no: ANCHORS.sensor,
    kind: 'torque_sensor',
    name: 'Column torque sensor 1180 rev B',
    line_id: 'PL-REPS',
    lifecycle: 'production',
    make_buy: 'buy',
    supplier_id: 'CSUP-03',
    unit_cost_eur: 22.6,
    lead_time_days: 60,
    released_on: on(2023, 8, 30),
  });
  cap(ANCHORS.sensor, 'latency_ms', BUD_LATENCY.allocations[0].value, 'ms', 'datasheet', false);
  cap(ANCHORS.sensor, 'peak_motor_torque_nm', 10, 'Nm', 'datasheet', true);

  plm.parts.push({
    part_no: ANCHORS.motor,
    kind: 'motor',
    name: 'PMSM assist motor 5520 rev A',
    line_id: 'PL-REPS',
    lifecycle: 'production',
    make_buy: 'buy',
    supplier_id: 'CSUP-02',
    unit_cost_eur: 104.0,
    lead_time_days: 84,
    released_on: on(2022, 9, 12),
  });
  cap(ANCHORS.motor, 'peak_motor_torque_nm', 5.2, 'Nm', 'test', true);
  cap(ANCHORS.motor, 'cont_current_a', 88, 'A', 'test', true);
  cap(ANCHORS.motor, 'latency_ms', 2.0, 'ms', 'test', true);

  // Both anchored parts ship on real programmes. The rack needs at least two
  // for CR-K2-0102's "as-is" to rest on something — a capability with no
  // programme behind it is a claim, not a track record.
  const shipping = crm.programs.filter((p) => p.status === 'production' || p.status === 'ended');
  const reps = shipping.filter((p) => p.eps_architecture === 'R-EPS');
  const ANCHOR_USAGE: [string, string][] = [
    [ANCHORS.rack, ANCHORS.carryoverProgram],
    [ANCHORS.gearbox, ANCHORS.carryoverProgram],
    [ANCHORS.ecuObsolete, ANCHORS.carryoverProgram],
    [ANCHORS.sensor, ANCHORS.carryoverProgram],
    [ANCHORS.motor, ANCHORS.carryoverProgram],
  ];
  // A second R-EPS programme for the rack, picked from the generated ones so it
  // is a real row and not a name.
  const second = reps.find((p) => p.program_id !== ANCHORS.carryoverProgram);
  if (second) {
    ANCHOR_USAGE.push([ANCHORS.rack, second.program_id]);
    ANCHOR_USAGE.push([ANCHORS.motor, second.program_id]);
  }
  for (const [part_no, program_ref] of ANCHOR_USAGE) {
    const p = crm.programs.find((x) => x.program_id === program_ref);
    plm.part_program_usage.push({
      part_no,
      program_ref,
      from_sop: (p?.sop_on as string) ?? on(2023, 4, 17),
      volume_per_year: p?.volume_per_year ?? 90_000,
    });
  }

  // ── the bulk ─────────────────────────────────────────────────────────────

  const CAP_BY_KIND: Record<string, [string, number, number, string][]> = {
    ecu: [['latency_ms', 1.2, 3.0, 'ms'], ['cont_current_a', 60, 110, 'A'], ['temp_max_c', 85, 105, 'C']],
    motor: [['peak_motor_torque_nm', 3.2, 6.4, 'Nm'], ['cont_current_a', 55, 100, 'A']],
    torque_sensor: [['latency_ms', 2.0, 4.5, 'ms']],
    gearbox: [['max_rack_force_n', 5000, 12_000, 'N'], ['peak_motor_torque_nm', 3.0, 6.0, 'Nm']],
    rack: [['max_rack_force_n', 5000, 12_500, 'N'], ['road_wheel_angle_deg', 44, 56, 'deg']],
    housing: [['temp_max_c', 90, 120, 'C']],
    harness: [['temp_max_c', 85, 110, 'C']],
    pinion: [['max_rack_force_n', 4800, 10_000, 'N']],
  };

  let qt = 0;
  for (let i = 0; i < 174; i++) {
    const kind = h.pick(KINDS);
    const line = h.pick(LINES);
    const buy = kind === 'ecu' || kind === 'motor' || kind === 'torque_sensor' || h.chance(0.3);
    // Lifecycle skews to production, with a realistic tail of things that
    // cannot be bought. T6 is the only one that MATTERS, but it has to have
    // company or it is findable by looking for the only odd row.
    const lifecycle = h.chance(0.62) ? 'production'
      : h.chance(0.4) ? 'prototype'
        : h.chance(0.55) ? 'obsolete' : 'ltb-passed';
    const part_no = `VS-${kind.slice(0, 4).toUpperCase()}-${1000 + i * 7}-${String.fromCharCode(65 + (i % 4))}`;

    plm.parts.push({
      part_no,
      kind,
      name: `${kind.replace('_', ' ')} ${1000 + i * 7}`,
      line_id: line.id,
      lifecycle,
      make_buy: buy ? 'buy' : 'make',
      supplier_id: buy ? h.pick(SUPPLIER_NAMES).id : null,
      unit_cost_eur: h.num(8, 190, 2),
      lead_time_days: h.int(21, 120),
      released_on: h.dayBetween(-3_600, -120),
    });

    for (const [attribute, lo, hi, unit] of CAP_BY_KIND[kind] ?? []) {
      const value = h.num(lo, hi, attribute === 'max_rack_force_n' ? 0 : 2);
      // Most claims are backed by a rig. The interesting minority is not — and
      // in the bulk that minority is harmless, which is what makes T2's version
      // of it unremarkable until somebody joins the two tables.
      const tested = h.chance(0.72);
      cap(part_no, attribute, value, unit, tested ? 'test' : h.chance(0.5) ? 'datasheet' : 'analysis', tested);
      if (tested) {
        plm.qualification_tests.push({
          test_id: `QT-BULK-${String(++qt).padStart(4, '0')}`,
          part_no,
          standard: h.pick(['ISO 16750-3', 'LV124', 'ISO 26262-5', 'internal']),
          attribute,
          condition: 'per standard, 3 samples',
          max_value_demonstrated: value,
          unit,
          result: 'pass',
          tested_on: h.dayBetween(-3_400, -90),
          report_ref: `TR-BULK-${String(qt).padStart(4, '0')}`,
        });
      }
    }
  }

  // Assemblies and BOMs. One assembly per line per revision, filled from parts
  // that belong to that line.
  const byLine = new Map<string, string[]>();
  for (const p of plm.parts) {
    if (!p.line_id) continue;
    const list = byLine.get(p.line_id) ?? [];
    list.push(p.part_no);
    byLine.set(p.line_id, list);
  }

  let asm = 0;
  for (const l of LINES) {
    const pool = byLine.get(l.id) ?? [];
    if (pool.length < 4) continue;
    for (let rev = 0; rev < 15; rev++) {
      const assembly_no = `VS-ASM-${l.id.slice(3)}-${String(++asm).padStart(4, '0')}`;
      plm.assemblies.push({
        assembly_no,
        name: `${l.name} assembly rev ${String.fromCharCode(65 + rev)}`,
        line_id: l.id,
        revision: String.fromCharCode(65 + rev),
      });
      for (const part_no of h.sample(pool, h.int(4, 9))) {
        plm.bom_lines.push({ assembly_no, part_no, qty: h.int(1, 4), position: `P${h.int(10, 99)}` });
      }
    }
  }

  // Bulk usage. Skipped for programmes still at bid: nothing ships on a bid.
  const usable = crm.programs.filter((p) => p.status !== 'bid');
  const seen = new Set(plm.part_program_usage.map((u) => `${u.part_no}|${u.program_ref}`));
  for (const p of plm.parts) {
    if (p.lifecycle === 'prototype') continue;
    for (const prog of h.sample(usable, h.int(0, 3))) {
      const key = `${p.part_no}|${prog.program_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      plm.part_program_usage.push({
        part_no: p.part_no,
        program_ref: prog.program_id,
        from_sop: (prog.sop_on as string) ?? on(2024, 1, 1),
        volume_per_year: prog.volume_per_year ?? 50_000,
      });
    }
  }

  return plm;
}
