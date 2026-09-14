/**
 * THE OPERATIONS HALF OF THE WORLD — lots, runs, tests, decisions, shipments.
 *
 * `world.mjs` built the master data: who works here, what we make, what governs
 * it. This file builds what HAPPENED, which is where every cross-silo reference
 * is created and therefore where every trap is planted.
 *
 * READ `sopRevisionAsOf` FIRST. It is four lines and it is the single most
 * important function in the seed, because it encodes the rule that makes this
 * domain worth building: the revision that governs an act is the one in force
 * WHEN THE ACT HAPPENED. Every disposition below captures its governing
 * revision through this function at its own decision date, which is why the
 * 2024 dispositions correctly carry Rev 6 and the 2026 ones carry Rev 7 — and
 * why the headline case is a real finding rather than an artefact of pretending
 * today's rules always applied.
 */
import { addDays, addMonths, iso, ts, campaignOf, pad } from './rng';
import type { Helpers } from './rng';
import { ANCHORS } from './world';
import type { MasterWorld, LotFacts } from './world';
import type { DateLike, Shipments } from '../schema/rows';

const D = (s: string): Date => new Date(`${s}T00:00:00Z`);

/** `YYYY-MM-DD`, whether the value is already a string or came back as a Date. */
const day = (x: DateLike): string =>
  typeof x === 'string' ? x.slice(0, 10) : x.toISOString().slice(0, 10);

/**
 * Assert that an anchored row was found.
 *
 * EVERY ANCHOR IS LOAD-BEARING. When a `.find()` for one of them comes back
 * undefined the trap it belongs to has silently ceased to exist, and every
 * check downstream then reports a clean estate — the single worst failure this
 * seed can have, because it looks exactly like success. Optional chaining here
 * would be a way of writing "and if the headline case is missing, carry on".
 */
function must<T>(v: T | undefined, what: string): T {
  if (v === undefined) {
    throw new Error(`${what} — the seed cannot plant its traps without it.`);
  }
  return v;
}

const STEPS_BY_CAP: Record<string, string[]> = {
  tablet: ['Dispensing', 'Granulation', 'Blending', 'Compression', 'Film coating', 'Packaging'],
  capsule: ['Dispensing', 'Blending', 'Encapsulation', 'Polishing', 'Inspection', 'Packaging'],
  liquid: ['Dispensing', 'Compounding', 'Sterile filtration', 'Aseptic filling', 'Visual inspection', 'Packaging'],
  semisolid: ['Dispensing', 'Emulsification', 'Homogenisation', 'Tube filling', 'Checkweighing', 'Packaging'],
};

const PARAMS_BY_CAP: Record<string, [string, string, number, number][]> = {
  tablet: [['Compression force', 'kN', 8, 16], ['Tablet hardness', 'N', 60, 120], ['Loss on drying', '%', 1.5, 3.5]],
  capsule: [['Fill weight', 'mg', 240, 260], ['Blend uniformity RSD', '%', 0, 5], ['Loss on drying', '%', 1.5, 4.0]],
  liquid: [['Filling volume', 'ml', 2.4, 2.6], ['Filter integrity', 'bar', 3.2, 4.0], ['Room differential pressure', 'Pa', 10, 25]],
  semisolid: [['Emulsification temperature', '°C', 65, 80], ['Tube fill weight', 'g', 29, 31], ['Viscosity in-process', 'mPa·s', 8000, 20000]],
};

/** Campaigns the filler lots are made in. Anchored campaigns stay clear of these. */
const FILLER_CAMPAIGNS: string[] = ['2402', '2406', '2410', '2502', '2506', '2510', '2602'];

/** One planned lot, before any of its rows exist. */
interface LotPlan {
  lot: string; code: string; campaign: string; sub: string; market: string;
  wo: string; line: string; start: string; end: string;
}

/**
 * What all three operations sections share.
 *
 * ONE OBJECT rather than nine positional parameters, for the reason `check.ts`
 * already records: a signature nobody reads is a signature everybody gets wrong
 * by one position.
 *
 * `h` IS THE SHARED RANDOM STREAM and is passed through deliberately. These
 * three run in sequence and draw from it in order; splitting them changed the
 * SHAPE and had to leave the ORDER alone, which `pnpm pharma:world-check`
 * proves by fingerprint rather than by argument.
 */
interface OpsCtx {
  w: MasterWorld;
  h: Helpers;
  int: Helpers['int'];
  pick: Helpers['pick'];
  chance: Helpers['chance'];
  num: Helpers['num'];
  shuffle: Helpers['shuffle'];
  capOf: Record<string, string>;
  linesByCap: Record<string, string[]>;
  sopRevisionAsOf: (sopId: string, date: string) => string;
}

/**
 * Warehouses, consignees, trucks, shipments and telematics.
 *
 * LAST, because a shipment needs a released lot to carry. T5 — the cold-chain
 * excursion and the monitoring gap that hides part of it — is planted here.
 */
function buildDistribution(c: OpsCtx, lotIndex: Record<string, LotFacts>): void {
  const { w, h, int, pick, chance, num, shuffle, capOf, linesByCap, sopRevisionAsOf } = c;
  const { reg, hcm, erp, mes, qms, tms } = w;
  tms.warehouses.push(
    { warehouse_id: 'WH-EU-01', name: 'Leiden finished goods', site_ref: 'SITE-01', country: 'NL', gdp_licence_no: 'NL/GDP/2024/1142', licence_valid_to: '2028-01-31' },
    { warehouse_id: 'WH-EU-02', name: 'Duisburg distribution hub', site_ref: 'SITE-01', country: 'DE', gdp_licence_no: 'DE/GDP/2023/0887', licence_valid_to: '2027-06-30' },
    { warehouse_id: 'WH-US-01', name: 'Greenville distribution centre', site_ref: 'SITE-02', country: 'US', gdp_licence_no: 'US-DC-SC-44120', licence_valid_to: '2027-09-30' },
  );

  const CONSIGNEES: [string, string, string, string, string][] = [
    ['CNS-0011', 'Brocacef Groothandel', 'NL', 'EU', 'wholesaler'], ['CNS-0012', 'Mosadex Groep', 'NL', 'EU', 'wholesaler'],
    ['CNS-0013', 'Phoenix Pharmahandel', 'DE', 'EU', 'wholesaler'], ['CNS-0014', 'Leiden University Medical Center', 'NL', 'EU', 'hospital'],
    ['CNS-0015', 'Cooperativa Farmaceutica', 'IT', 'EU', 'wholesaler'], ['CNS-0016', 'Apoteket Distribution', 'SE', 'EU', 'pharmacy_chain'],
    ['CNS-0031', 'Ophthalmic Care Partners', 'DE', 'EU', 'hospital'], ['CNS-0021', 'Carolina Drug Wholesale', 'US', 'US', 'wholesaler'],
    ['CNS-0022', 'Atlantic Health Supply', 'US', 'US', 'wholesaler'], ['CNS-0023', 'Piedmont Regional Hospital', 'US', 'US', 'hospital'],
  ];
  for (const [consignee_id, name, country, market, kind] of CONSIGNEES) {
    tms.consignees.push({ consignee_id, name, country, market, licence_no: `WDA-${int(10000, 99999)}`, kind });
  }

  for (let i = 1; i <= 8; i++) {
    const truck_id = pad('TRK-', i, 2);
    tms.trucks.push({
      truck_id, plate: `${pick(['NL', 'DE', 'BE'])}-${int(100, 999)}-${pick(['AB', 'XK', 'PZ', 'RD'])}`,
      make: pick(['Mercedes-Benz', 'Volvo', 'DAF', 'Scania']), model: pick(['Actros 1845', 'FH 460', 'XF 480', 'R 450']),
      // TRK-07 is the refrigerated one the cold chain trap rides on.
      refrigerated: truck_id === ANCHORS.coldChainTruck || i % 3 === 0,
      telematics_unit_id: `TU-${int(10000, 99999)}`,
      in_service_from: iso(addDays(new Date(Date.UTC(2026, 8, 11)), -int(400, 2000))), in_service_to: null,
    });
  }
  const whOperatives = w.byPos('POS-WHO');
  for (let i = 1; i <= 10; i++) {
    tms.drivers.push({
      driver_id: pad('DRV-', i, 3),
      full_name: `${pick(['Jan', 'Piet', 'Klaas', 'Ahmed', 'Sofia', 'Tomas', 'Ingo', 'Marek', 'Lena', 'Ruud'])} ${pick(['Bakker', 'Visser', 'Kowalski', 'Haddad', 'Novak', 'Berg'])}`,
      licence_no: `C+E-${int(1000000, 9999999)}`,
      // Half are contractors with no HRIS record. A legitimately absent soft
      // key is not a dangling one, and db:check has to tell them apart.
      employee_ref: i <= whOperatives.length && i % 2 === 1 ? whOperatives[i - 1] : null,
    });
  }

  const releasedLots = Object.values(lotIndex);
  let shpSeq = 1000;
  const mkShipment = (spec: Shipments): Shipments => {
    tms.shipments.push(spec);
    return spec;
  };

  // T5 — the anchored cold-chain shipment.
  const coldShip = mkShipment({
    shipment_id: ANCHORS.coldChainShipment, warehouse_id: 'WH-EU-01', consignee_id: 'CNS-0031',
    truck_id: ANCHORS.coldChainTruck, driver_id: 'DRV-003',
    dispatched_on: '2026-08-24', delivered_on: '2026-08-25', status: 'delivered',
    required_temp_min: 2.0, required_temp_max: 8.0,
  });
  tms.shipment_lines.push({ shipment_id: coldShip.shipment_id, lot_ref: ANCHORS.coldChainLot, quantity_units: 14200, sscc: `003456789${int(10000000, 99999999)}` });
  const legs: [string, string, string, string, number][] = [
    ['Leiden, NL', 'Venlo, NL', '2026-08-24T05:10:00Z', '2026-08-24T07:40:00Z', 182.4],
    ['Venlo, NL', 'Dortmund, DE', '2026-08-24T08:25:00Z', '2026-08-24T12:55:00Z', 214.7],
    ['Dortmund, DE', 'Berlin, DE', '2026-08-24T13:40:00Z', '2026-08-24T19:05:00Z', 487.1],
  ];
  legs.forEach(([from_location, to_location, departed_at, arrived_at, distance_km], i: number) => {
    tms.routes.push({ shipment_id: coldShip.shipment_id, seq: i + 1, from_location, to_location, departed_at, arrived_at, distance_km });
  });
  // Readings every 15 minutes, as SOP-WH-009 Rev 3 requires — EXCEPT for a
  // 2h05m hole in the middle of leg 2, after which the temperature comes back
  // at 11.4 °C and settles down again. Nothing in this table says "excursion";
  // what it says is that the truck stopped reporting and the product was warm
  // when it resumed. Reading the gap as "no data, therefore no problem" is the
  // failure this trap is built to catch.
  {
    const start = new Date('2026-08-24T05:10:00Z');
    const end = new Date('2026-08-24T19:05:00Z');
    const gapFrom = new Date('2026-08-24T09:40:00Z');
    const gapTo = new Date('2026-08-24T11:45:00Z');
    for (let t = start.getTime(); t <= end.getTime(); t += 15 * 60000) {
      const at = new Date(t);
      if (at >= gapFrom && at < gapTo) continue;
      const afterGap = at >= gapTo;
      const minsAfter = afterGap ? (at.getTime() - gapTo.getTime()) / 60000 : 0;
      const temp = !afterGap
        ? num(3.4, 5.8, 2)
        : minsAfter < 15 ? 11.4
        : minsAfter < 45 ? num(8.2, 9.6, 2)
        : num(3.6, 6.2, 2);
      tms.telematics_readings.push({
        truck_id: ANCHORS.coldChainTruck, shipment_id: coldShip.shipment_id,
        recorded_at: ts(at), temp_c: temp,
        gps_lat: num(51.2, 52.4, 6), gps_lon: num(4.6, 13.4, 6),
      });
    }
  }

  // Ordinary shipments. Ambient product, well-behaved readings.
  for (let i = 0; i < 38; i++) {
    const L = releasedLots[(i * 7) % releasedLots.length];
    const eu = L.market === 'EU';
    const truck = pick(tms.trucks);
    const dispatched = addDays(D(L.end), int(10, 60));
    const shipment_id = `SHP-${iso(dispatched).slice(2, 4)}-${++shpSeq}`;
    mkShipment({
      shipment_id,
      warehouse_id: eu ? pick(['WH-EU-01', 'WH-EU-02']) : 'WH-US-01',
      consignee_id: pick(tms.consignees.filter((c) => c.market === L.market)).consignee_id,
      truck_id: truck.truck_id, driver_id: pick(tms.drivers).driver_id,
      dispatched_on: iso(dispatched), delivered_on: iso(addDays(dispatched, 1)), status: 'delivered',
      required_temp_min: 15.0, required_temp_max: 25.0,
    });
    tms.shipment_lines.push({ shipment_id, lot_ref: L.lot, quantity_units: int(2000, 40000), sscc: `003456789${int(10000000, 99999999)}` });
    const depart = new Date(`${iso(dispatched)}T06:00:00Z`);
    const nLegs = int(1, 3);
    for (let s = 1; s <= nLegs; s++) {
      tms.routes.push({
        shipment_id, seq: s,
        from_location: s === 1 ? (eu ? 'Leiden, NL' : 'Greenville, SC') : `Stop ${s - 1}`,
        to_location: s === nLegs ? 'Consignee' : `Stop ${s}`,
        departed_at: ts(new Date(depart.getTime() + (s - 1) * 5 * 3600000)),
        arrived_at: ts(new Date(depart.getTime() + s * 4.5 * 3600000)),
        distance_km: num(60, 520, 1),
      });
    }
    for (let k = 0; k < 24; k++) {
      tms.telematics_readings.push({
        truck_id: truck.truck_id, shipment_id,
        recorded_at: ts(new Date(depart.getTime() + k * 30 * 60000)),
        temp_c: num(17.5, 23.5, 2), gps_lat: num(33.0, 53.0, 6), gps_lon: num(-82.5, 13.0, 6),
      });
    }
  }

}

/**
 * Tests, out-of-specification investigations and batch dispositions.
 *
 * T7 lives here: a dissolution result retested to a pass with NO investigation,
 * which is the finding 21 CFR 211.192 exists to prevent.
 */
function buildQualityControl(c: OpsCtx, lotIndex: Record<string, LotFacts>): void {
  const { w, h, int, pick, chance, num, shuffle, capOf, linesByCap, sopRevisionAsOf } = c;
  const { reg, hcm, erp, mes, qms, tms } = w;
  let qcSeq = 0;
  const qcId = (dateStr: string): string => `QC-${dateStr.slice(2, 4)}-${pad('', ++qcSeq, 6)}`;
  const testsByLot: Record<string, string[]> = {};

  for (const L of Object.values(lotIndex)) {
    const limits = w.specLimitIndex[L.specVersion];
    const sampled = addDays(D(L.end), 1);
    const tested = addDays(D(L.end), 2);
    testsByLot[L.lot] = [];

    for (const [attribute, lim] of Object.entries(limits)) {
      const lo = lim.lo, hi = lim.hi;
      // Comfortably inside the limits: the traps are not "a number near an
      // edge", and a world of borderline results would hide them in noise.
      // An open-ended limit (`dissolution` is "Q ≥ 80%", no upper bound) has a
      // null on one side. Treating null as 0 would put a passing dissolution
      // result somewhere around 4%.
      let value: number;
      if (lo === null && hi === null) value = 0;
      else if (hi === null) value = num(lo! + 4, lo! + 14, 4);
      else if (lo === null) value = num(hi * 0.2, hi * 0.7, 4);
      else if (lo === hi) value = lo;
      else value = num(lo + (hi - lo) * 0.25, hi - (hi - lo) * 0.25, 4);

      const test_id = qcId(iso(tested));
      qms.qc_tests.push({
        test_id, lot_ref: L.lot, method_id: lim.method_id, attribute, stage: 'release',
        sampled_on: iso(sampled), tested_on: iso(tested),
        analyst_ref: pick(w.byPos('POS-QCA')), spec_version_ref: L.specVersion,
        result_num: value, unit: lim.unit, in_spec: true, retest_of_test_id: null,
      });
      testsByLot[L.lot].push(test_id);
    }
  }

  // T7 — an out-of-specification dissolution result, retested to a pass, with
  // NO OOS investigation behind it. 21 CFR 211.192 requires the original to be
  // investigated first; SOP-QC-003 Rev 5 spells out the prohibition. The two
  // test ids are anchored so the case can name them.
  {
    const L = lotIndex[ANCHORS.oosLot];
    const lim = w.specLimitIndex[L.specVersion].dissolution;
    const original = must(
      qms.qc_tests.find((t) => t.lot_ref === ANCHORS.oosLot && t.attribute === 'dissolution'),
      `No dissolution test on ${ANCHORS.oosLot} to turn into the T7 out-of-specification result`,
    );
    original.test_id = ANCHORS.oosTest;
    original.result_num = 71.4;            // below the EU limit of 80
    original.in_spec = false;
    original.tested_on = '2026-05-26';
    qms.qc_tests.push({
      test_id: ANCHORS.oosRetest, lot_ref: ANCHORS.oosLot, method_id: lim.method_id,
      attribute: 'dissolution', stage: 'release', sampled_on: '2026-05-22', tested_on: '2026-05-28',
      analyst_ref: original.analyst_ref, spec_version_ref: L.specVersion,
      result_num: 88.6, unit: lim.unit, in_spec: true,
      retest_of_test_id: ANCHORS.oosTest,
    });
  }

  // Two OOS results that WERE handled properly, so that the absence of an
  // investigation in T7 is a difference rather than the only example.
  const goodOosLots = Object.keys(lotIndex).filter((l) => ![ANCHORS.oosLot, ANCHORS.caseLot, ANCHORS.cleanLot].includes(l)).slice(0, 2);
  goodOosLots.forEach((lot: string, i: number) => {
    const t = must(
      qms.qc_tests.find((x) => x.lot_ref === lot && x.attribute === 'assay'),
      `No assay test on ${lot} to turn into a properly-investigated OOS`,
    );
    t.in_spec = false;
    t.result_num = 93.2;
    const testedOn = day(t.tested_on);
    const oos_id = `OOS-${testedOn.slice(2, 4)}-${pad('', i + 1, 4)}`;
    qms.oos_investigations.push({
      oos_id, test_id: t.test_id, opened_on: testedOn,
      closed_on: iso(addDays(D(testedOn), 9)), phase: 'IA',
      root_cause: 'Sample preparation error confirmed: incomplete dilution at step 4 of the method.',
      outcome: 'lab_error', approved_by_ref: pick(w.byPos('POS-QCS')),
    });
    const retest_id = qcId(testedOn);
    qms.qc_tests.push({
      test_id: retest_id, lot_ref: lot, method_id: t.method_id, attribute: 'assay', stage: 'release',
      sampled_on: t.sampled_on, tested_on: iso(addDays(D(testedOn), 10)),
      analyst_ref: pick(w.byPos('POS-QCA')), spec_version_ref: t.spec_version_ref,
      result_num: 99.1, unit: t.unit, in_spec: true, retest_of_test_id: t.test_id,
    });
  });

  // Change controls FIRST: the SOP revisions in mrd_reg already point at these
  // ids, and a dangling change_control_ref is precisely what db:check hunts.
  qms.change_controls.push(
    { change_id: 'CC-24-0005', opened_on: '2023-11-06', implemented_on: '2024-02-01', description: 'Set tablet press requalification interval to 24 months and make expiry a hard block on production use.', affected_sop_ref: 'SOP-ENG-005', approved_by_ref: w.byPos('POS-QAM')[0], status: 'implemented' },
    { change_id: 'CC-24-0021', opened_on: '2024-03-18', implemented_on: ANCHORS.mfgSopRev4From, description: 'Shorten in-process weight check interval to 30 minutes and tighten the hardness limit.', affected_sop_ref: 'SOP-MFG-022', approved_by_ref: w.byPos('POS-QAM')[0], status: 'implemented' },
    { change_id: 'CC-24-0033', opened_on: '2024-08-27', implemented_on: '2024-11-01', description: 'Mandate continuous 15-minute temperature monitoring on cold chain shipments and treat monitoring gaps over 60 minutes as excursions.', affected_sop_ref: 'SOP-WH-009', approved_by_ref: w.byPos('POS-QAM')[0], status: 'implemented' },
    { change_id: 'CC-25-0014', opened_on: '2025-01-22', implemented_on: '2025-04-01', description: 'Prohibit retesting before a documented and approved Phase IA laboratory investigation.', affected_sop_ref: 'SOP-QC-003', approved_by_ref: w.byPos('POS-QAM')[0], status: 'implemented' },
    { change_id: 'CC-26-0008', opened_on: '2026-01-14', implemented_on: ANCHORS.releaseSopRev7From, description: 'Add a personnel precondition to QP certification: the certifying QP must hold a valid GMP refresher training record on the date of certification.', affected_sop_ref: 'SOP-QC-014', approved_by_ref: w.byPos('POS-QAM')[0], status: 'implemented' },
  );

  // The supplier audit that caused the disqualification, and its CAPA. T4 is a
  // chain, not a flag: audit → disqualification → traceability to finished lots.
  qms.audits.push(
    { audit_id: 'AUD-26-0003', kind: 'supplier', subject_ref: ANCHORS.badSupplier, performed_on: '2026-05-12', lead_auditor_ref: w.byPos('POS-QAM')[0], findings_count: 4, outcome: 'critical' },
    { audit_id: 'AUD-26-0001', kind: 'internal', subject_ref: 'DEPT-QC', performed_on: '2026-02-09', lead_auditor_ref: w.byPos('POS-QAO')[0], findings_count: 2, outcome: 'minor' },
    { audit_id: 'AUD-25-0004', kind: 'regulatory', subject_ref: 'SITE-01', performed_on: '2025-06-17', lead_auditor_ref: w.byPos('POS-QAM')[0], findings_count: 1, outcome: 'satisfactory' },
    { audit_id: 'AUD-25-0002', kind: 'supplier', subject_ref: 'SUP-03', performed_on: '2025-03-25', lead_auditor_ref: w.byPos('POS-QAO')[1], findings_count: 3, outcome: 'minor' },
  );
  qms.capas.push({
    capa_id: 'CAPA-26-0019', opened_on: '2026-05-20', due_on: '2026-08-18', closed_on: null,
    source: 'audit', source_ref: 'AUD-26-0003', owner_ref: w.byPos('POS-QAM')[0],
    description: 'Silverbrook Synthesis Co. disqualified following a critical audit finding. Perform a traceability assessment of all material already consumed and assess the impact on distributed batches.',
    status: 'overdue',
  });
  for (let i = 0; i < 12; i++) {
    const opened = addDays(new Date(Date.UTC(2026, 8, 11)), -int(60, 700));
    const dev = pick(mes.deviations);
    qms.capas.push({
      capa_id: `CAPA-${iso(opened).slice(2, 4)}-${pad('', 100 + i, 4)}`,
      opened_on: iso(opened), due_on: iso(addDays(opened, 90)),
      closed_on: iso(addDays(opened, int(20, 85))),
      source: 'deviation', source_ref: dev.deviation_id, owner_ref: pick(w.byPos('POS-QAO')),
      description: 'Corrective action following a recorded deviation; effectiveness check completed.',
      status: 'closed',
    });
  }

  // Dispositions. EVERY one asks the as-of function for its governing revision.
  for (const L of Object.values(lotIndex)) {
    const isCase = L.lot === ANCHORS.caseLot;
    const isClean = L.lot === ANCHORS.cleanLot;
    const decided = isCase ? ANCHORS.caseCertifiedOn
      : isClean ? ANCHORS.cleanCertifiedOn
      : iso(addDays(D(L.end), 6));
    const qp = isCase ? ANCHORS.caseQp : isClean ? ANCHORS.cleanQp : pick(w.byPos('POS-QP'));
    qms.batch_dispositions.push({
      disposition_id: `DISP-${decided.slice(2, 4)}-${pad('', qms.batch_dispositions.length + 1, 4)}`,
      lot_ref: L.lot, market: L.market, decision: 'released', decided_on: decided,
      decided_by_ref: qp,
      governing_sop_ref: sopRevisionAsOf('SOP-QC-014', decided),
      qp_certified: L.market === 'EU',
    });
  }

}

/**
 * Product lots, work orders, process steps and deviations.
 *
 * FIRST, and it returns `lotIndex` because everything after it asks "what do we
 * know about this lot" — the QC section needs the spec version, distribution
 * needs the release status.
 */
function buildLotsAndRuns(c: OpsCtx): Record<string, LotFacts> {
  const { w, h, int, pick, chance, num, shuffle, capOf, linesByCap, sopRevisionAsOf } = c;
  const { reg, hcm, erp, mes, qms, tms } = w;
  /** Every lot the world contains, anchors first so their ids are exact. */
  const lotPlan: LotPlan[] = [
    { lot: ANCHORS.caseLot, code: 'IBU200', campaign: '2609', sub: 'B', market: 'EU', wo: ANCHORS.caseWorkOrder, line: 'LINE-01-T1', start: '2026-08-28', end: '2026-08-31' },
    { lot: 'LOT-IBU200-2609-C', code: 'IBU200', campaign: '2609', sub: 'C', market: 'EU', wo: 'WO-26-0419', line: 'LINE-01-T1', start: '2026-09-01', end: '2026-09-03' },
    { lot: ANCHORS.twinUs, code: 'IBU200', campaign: '2609', sub: 'D', market: 'US', wo: 'WO-26-0420', line: 'LINE-01-T1', start: '2026-09-03', end: '2026-09-05' },
    { lot: ANCHORS.cleanLot, code: 'IBU200', campaign: '2608', sub: 'A', market: 'EU', wo: ANCHORS.cleanWorkOrder, line: 'LINE-01-T2', start: '2026-08-05', end: '2026-08-08' },
    { lot: ANCHORS.unqualifiedLot, code: 'PAR500', campaign: '2607', sub: 'A', market: 'EU', wo: ANCHORS.unqualifiedWorkOrder, line: 'LINE-01-T1', start: '2026-07-13', end: '2026-07-16' },
    { lot: ANCHORS.oosLot, code: 'PAR500', campaign: '2605', sub: 'C', market: 'EU', wo: 'WO-26-0361', line: 'LINE-01-T2', start: '2026-05-18', end: '2026-05-21' },
    { lot: ANCHORS.supersededLot, code: 'CET010', campaign: '2408', sub: 'A', market: 'EU', wo: ANCHORS.supersededWorkOrder, line: 'LINE-01-T1', start: '2024-08-12', end: '2024-08-15' },
    { lot: 'LOT-IBU200-2409-B', code: 'IBU200', campaign: '2409', sub: 'B', market: 'EU', wo: 'WO-24-0322', line: 'LINE-01-T1', start: '2024-09-09', end: '2024-09-12' },
    { lot: 'LOT-AMX250-2411-A', code: 'AMX250', campaign: '2411', sub: 'A', market: 'EU', wo: 'WO-24-0398', line: 'LINE-01-C1', start: '2024-11-04', end: '2024-11-07' },
    { lot: ANCHORS.coldChainLot, code: 'LAT005', campaign: '2608', sub: 'A', market: 'EU', wo: 'WO-26-0395', line: 'LINE-01-L1', start: '2026-08-10', end: '2026-08-13' },
  ];

  const woSeq: Record<string, number> = { 24: 100, 25: 100, 26: 100 };
  for (const p of w.PRODUCTS) {
    for (const [i, campaign] of FILLER_CAMPAIGNS.entries()) {
      const yy = campaign.slice(0, 2);
      const mm = campaign.slice(2);
      const start = D(`20${yy}-${mm}-${String(int(3, 20)).padStart(2, '0')}`);
      lotPlan.push({
        lot: `LOT-${p.code}-${campaign}-A`,
        code: p.code, campaign, sub: 'A',
        market: i % 2 === 0 ? 'EU' : 'US',
        wo: `WO-${yy}-${pad('', woSeq[yy]++, 4)}`,
        line: pick(linesByCap[p.cap]),
        start: iso(start), end: iso(addDays(start, 3)),
      });
    }
  }

  const lotIndex: Record<string, LotFacts> = {};
  let devSeq = 0;

  for (const L of lotPlan) {
    const cap = capOf[L.code];
    const specVersion = w.specVersionOf[`${L.code}|${L.market}`];
    const lineEquipment = w.equipmentByLine[L.line];
    const supervisor = pick(w.byPos('POS-LSU'));

    erp.product_lots.push({
      lot_id: L.lot, product_id: w.productOf[L.code], campaign: L.campaign, sub_batch: L.sub,
      market: L.market, quantity_units: int(40000, 320000),
      manufactured_on: L.end, expiry_on: iso(addMonths(D(L.end), 36)),
      work_order_ref: L.wo, spec_version_ref: specVersion, status: 'released',
    });

    // T2 — this one order cites the revision that was ALREADY SUPERSEDED when
    // it ran. Every other order asks the as-of function and therefore cannot be
    // wrong, which is what makes the one exception a finding rather than noise.
    const mfgSop = L.wo === ANCHORS.supersededWorkOrder
      ? ANCHORS.supersededCitation
      : sopRevisionAsOf(cap === 'liquid' ? 'SOP-MFG-031' : 'SOP-MFG-022', L.start);

    mes.work_orders.push({
      work_order_id: L.wo, line_id: L.line, product_ref: w.productOf[L.code], lot_ref: L.lot,
      planned_start: iso(addDays(D(L.start), -2)), actual_start: L.start, actual_end: L.end,
      status: 'completed', governing_sop_ref: mfgSop,
      signed_by_ref: supervisor, signed_on: iso(addDays(D(L.end), 1)),
    });

    const names = STEPS_BY_CAP[cap];
    const operators = shuffle(w.byPos('POS-OPR'));
    names.forEach((name: string, i: number) => {
      const step_id = `${L.wo}-S${String(i + 1).padStart(2, '0')}`;
      const startAt = new Date(D(L.start).getTime() + (i * 7 + 6) * 3600 * 1000);
      // Four eyes: performer and verifier are different people, always.
      const performed = operators[i % operators.length];
      const verified = supervisor;
      mes.process_steps.push({
        step_id, work_order_id: L.wo, seq: i + 1, name,
        started_at: ts(startAt), ended_at: ts(new Date(startAt.getTime() + int(90, 300) * 60000)),
        equipment_ref: lineEquipment[Math.min(i, lineEquipment.length - 1)],
        performed_by_ref: performed, verified_by_ref: verified,
      });
      if (i === 3 || i === 1) {
        for (const [pname, unit, lo, hi] of PARAMS_BY_CAP[cap]) {
          const value = num(lo + (hi - lo) * 0.2, hi - (hi - lo) * 0.2, 4);
          mes.process_parameters.push({ step_id, name: pname, value_num: value, unit, lower_limit: lo, upper_limit: hi, in_spec: true });
        }
      }
    });

    // T3 — the compression step of this run used EQ-0112, whose qualification
    // had expired. The step is otherwise ordinary; nothing on the floor flagged
    // it, which is exactly why it is only findable by crossing to the
    // qualification table.
    if (L.wo === ANCHORS.unqualifiedWorkOrder) {
      const compression = must(
        mes.process_steps.find((s2) => s2.work_order_id === L.wo && s2.seq === 4),
        `No step 4 on ${L.wo} to put ${ANCHORS.unqualifiedEquipment} on`,
      );
      compression.equipment_ref = ANCHORS.unqualifiedEquipment;
    }

    // Material consumption. The two contaminated lots draw the anchored
    // material lot; everything else draws whatever is on hand for its API.
    const api = `ING-API-${L.code.slice(0, 3)}`;
    const pool = [...(w.materialLotsByIngredient?.[api] ?? [])];
    const consumed = new Set<string>();
    if (ANCHORS.contaminatedLots.includes(L.lot)) {
      consumed.add(L.code === 'IBU200' ? ANCHORS.badMaterialLot : 'MLOT-2410-0042');
    }
    for (const ml of erp.material_lots.filter((m) => m.ingredient_id === api).slice(0, 2)) consumed.add(ml.material_lot_id);
    for (const material_lot_id of Array.from(consumed) as string[]) {
      erp.lot_material_consumption.push({ lot_id: L.lot, material_lot_id, quantity_kg: num(5, 120, 3) });
    }

    lotIndex[L.lot] = { ...L, cap, specVersion, supervisor };
  }

  // A handful of ordinary deviations, so that "this run had a deviation" is not
  // itself a signal. Anchored runs are deliberately excluded: the traps must
  // not be findable by looking for the unusual-looking record.
  const ordinaryWos = mes.work_orders.filter(
    (o) => ![ANCHORS.caseWorkOrder, ANCHORS.unqualifiedWorkOrder, ANCHORS.supersededWorkOrder, ANCHORS.cleanWorkOrder].includes(o.work_order_id),
  );
  for (const o of shuffle(ordinaryWos).slice(0, 22)) {
    const yy = day(o.actual_start).slice(2, 4);
    mes.deviations.push({
      deviation_id: `DEV-${yy}-${pad('', ++devSeq, 4)}`,
      work_order_id: o.work_order_id, step_id: null,
      raised_on: o.actual_end, raised_by_ref: pick(w.byPos('POS-LSU')),
      severity: pick(['minor', 'minor', 'minor', 'major']),
      description: pick([
        'In-process weight check recorded 4 minutes outside the scheduled interval.',
        'Room differential pressure alarm, self-cleared within 90 seconds.',
        'Printed batch record page re-issued after a transcription error; original retained.',
        'Granulation end-point reached 12 minutes later than the nominal profile.',
        'Balance calibration label found one day past its due date; balance verified as accurate.',
      ]),
      status: 'closed', capa_ref: null,
    });
  }
  return lotIndex;
}

export function buildOperations(w: MasterWorld): MasterWorld {
  const { h, reg, hcm, erp, mes, qms, tms } = w;
  const { int, pick, chance, num, shuffle } = h;

  const capOf: Record<string, string> = Object.fromEntries(w.PRODUCTS.map((p) => [p.code, p.cap]));
  const linesByCap: Record<string, string[]> = {};
  for (const l of w.LINE_DEFS) (linesByCap[l.cap] ??= []).push(l.line_id);

  /**
   * THE AS-OF LOOKUP. The revision of `sopId` in force on `date`.
   *
   * `effective_to` of null means still in force, so it has to be coalesced
   * rather than compared — a plain `date <= effective_to` silently returns
   * nothing for the current revision, which is the failure that would make
   * every recent record point at a superseded procedure.
   */
  const sopRevisionAsOf = (sopId: string, date: string): string => {
    const hit = reg.sop_revisions.find(
      (r) => r.sop_id === sopId && date >= r.effective_from && date <= (r.effective_to ?? '9999-12-31'),
    );
    if (!hit) throw new Error(`No revision of ${sopId} in force on ${date} — the seed is internally inconsistent.`);
    return hit.revision_id;
  };
  w.sopRevisionAsOf = sopRevisionAsOf;

  const ctx: OpsCtx = { w, h, int, pick, chance, num, shuffle, capOf, linesByCap, sopRevisionAsOf };

  const lotIndex = buildLotsAndRuns(ctx);

  buildQualityControl(ctx, lotIndex);

  buildDistribution(ctx, lotIndex);

  w.lotIndex = lotIndex;
  return w;
}
