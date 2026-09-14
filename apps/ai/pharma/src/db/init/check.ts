/**
 * `pnpm db:check` — the script that turns "fake but related data" from an
 * assertion into a measurement.
 *
 * THREE THINGS, AND THE THIRD IS WHY THE FIRST TWO ARE WORTH BELIEVING.
 *
 *   1. REFERENTIAL INTEGRITY ACROSS DATABASES. Thirty-odd soft keys cross a
 *      database boundary and Postgres cannot check one of them. This walks
 *      every one and reports what dangles.
 *   2. THE EIGHT TRAPS ARE STILL SHARP. Each is re-derived from the loaded
 *      rows, not from the constants that planted it. A trap that survives only
 *      in the generator's intentions is not in the data.
 *   3. THE NEGATIVE CONTROL. A reference checker that looks in the wrong place
 *      reports zero dangling references and reads exactly like a clean estate.
 *      So this plants `EMP-9999` in a copy of the loaded data and requires
 *      itself to catch it. If the control stops failing, the walk above it is
 *      decoration.
 *
 * That third point is not a hypothetical in this repo: `pnpm leak:check` once
 * reported PASS while a live credential sat in the code it was scanning,
 * because the scanner had silently truncated its own input.
 *
 * Plus a determinism check, because the whole estate is regenerable only if
 * regenerating it produces the same world.
 */
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import { SYSTEMS, urlFor } from '../../config/connections';
import { asOfDay } from '../../tools/utils/dates';
import { buildWorld, ANCHORS } from '../seed/world';
import { buildOperations } from '../seed/operations';
import type { DateLike, LoadedEstate } from '../schema/rows';

interface Note { label: string; detail: string }

const fail: Note[] = [];
const ok: Note[] = [];
const note = (pass: boolean, label: string, detail: string): void => {
  (pass ? ok : fail).push({ label, detail });
};

/** [source db, table, column, target db, table, column, nullable] */
type SoftKey = [string, string, string, string, string, string, boolean];

// ─────────────────────────────────────────────────────────── load it all ───

/**
 * The lookups every trap shares, built once from the loaded estate.
 *
 * ONE OBJECT rather than five positional parameters: `checkT4(T, lot, wo, disp,
 * rev)` is a signature nobody reads and everybody gets wrong by one position.
 */
interface Ctx {
  T: (db: string, t: string) => Record<string, any>[];
  lot: (id: string) => Record<string, any> | undefined;
  wo: (id: string) => Record<string, any> | undefined;
  disp: (lotId: string) => Record<string, any> | undefined;
  rev: (id: string) => Record<string, any> | undefined;
}

/** `asOfDay` under the short name the traps already used. */
const d = asOfDay;

// ── the traps, one function each ───────────────────────────────────────────
//
// LIFTED OUT OF `main` 2026-09-12, which was 458 lines of sequential
// assertions in one function. Each was already a braced block with a comment
// naming it; the only change is that each now HAS a name — so a trap that goes
// red can be found by grepping for it, and read without scrolling past seven
// others that are fine.
//
// They take the context rather than closing over it because that is what makes
// them individually callable. The point of the split is that a failing trap can
// be reached on its own.

/**
 * T1 — the headline. Certified under Rev 7 by a QP whose GMP refresher had
 * expired. Derived from three databases; none of the constants are consulted
 * beyond naming who and which lot.
 */
function checkT1CertifierTrainingLapsed(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const dp = disp(ANCHORS.caseLot);
  const training = T('mrd_hcm', 'training_records').find(
    (t) => t.employee_id === ANCHORS.caseQp && t.curriculum_id === 'TRN-GMP-REF',
  );
  const r = rev(dp?.governing_sop_ref);
  const lapsed = training && dp && d(training.expires_on) < d(dp.decided_on);
  const gapDays = training && dp
    ? Math.round((new Date(d(dp.decided_on)).getTime() - new Date(d(training.expires_on)).getTime()) / 86400000)
    : null;
  const requiresTraining = /training/i.test(r?.change_summary ?? '');
  note(
    !!!!lapsed && r?.revision_id === ANCHORS.caseSopRevision && requiresTraining && !!dp?.qp_certified,
    'T1 release signatory training lapsed',
    lapsed
      ? `${ANCHORS.caseQp} certified ${ANCHORS.caseLot} on ${d(dp.decided_on)}; GMP refresher expired ${d(training.expires_on)} — ${gapDays} days earlier. Governing: ${r?.revision_id}, which requires current training.`
      : 'the lapse is NOT in the data',
  );
  // And the half that makes it a finding rather than a technicality: the lab
  // says the batch is fine. If a QC result were failing, the release would be
  // wrong for an ordinary reason and the trap would teach nothing.
  const tests = T('mrd_qms', 'qc_tests').filter((t) => t.lot_ref === ANCHORS.caseLot);
  note(
    tests.length > 0 && tests.every((t) => t.in_spec),
    'T1 the lab result is clean, so the naive answer is "release"',
    `${tests.length}/${tests.length} release tests in specification`,
  );
}

/**
 * T2 — a work order citing a revision already superseded when it ran.
 */
function checkT2SupersededRevision(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const o = wo(ANCHORS.supersededWorkOrder);
  const cited = rev(o?.governing_sop_ref);
  const inForce = o && T('mrd_reg', 'sop_revisions').find(
    (r) => r.sop_id === cited?.sop_id
      && d(o!.actual_start) >= d(r.effective_from)
      && d(o!.actual_start) <= (r.effective_to ? d(r.effective_to) : '9999-12-31'),
  );
  note(
    !!cited && !!inForce && cited.revision_id !== inForce.revision_id,
    'T2 work order cites a superseded revision',
    cited && inForce
      ? `${o!.work_order_id} ran ${d(o!.actual_start)} citing ${cited.revision_id} (expired ${d(cited.effective_to)}); ${inForce.revision_id} was in force`
      : 'not present',
  );
}

/**
 * T3 — the run used equipment whose qualification had expired.
 */
function checkT3EquipmentUnqualified(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const step = T('mrd_mes', 'process_steps').find(
    (s) => s.work_order_id === ANCHORS.unqualifiedWorkOrder && s.equipment_ref === ANCHORS.unqualifiedEquipment,
  );
  // AS-OF, not latest. The machine was requalified afterwards, so "is it
  // qualified now" answers yes and misses the finding entirely.
  const coverOn = (equipmentId: string, when: DateLike) => T('mrd_mes', 'equipment_qualification').find(
    (q) => q.equipment_id === equipmentId && q.kind !== 'IQ'
      && d(q.performed_on) <= d(when) && d(q.valid_until) >= d(when),
  );
  const uncovered = !!step && !coverOn(ANCHORS.unqualifiedEquipment, step.started_at);
  const laterCover = coverOn(ANCHORS.unqualifiedEquipment, '2026-08-28');
  note(
    uncovered && !!laterCover,
    'T3 equipment unqualified ON THE DAY, requalified afterwards',
    uncovered
      ? `${ANCHORS.unqualifiedEquipment} had no valid qualification on ${d(step!.started_at)} (${ANCHORS.unqualifiedWorkOrder}); requalified ${d(laterCover?.performed_on)}, so "is it qualified now" answers YES and misses it`
      : 'not present',
  );
  // And the containment check: the lapse must not bleed onto other runs. It did
  // in the first version, and it silently contaminated the acceptance case.
  const bled = T('mrd_mes', 'process_steps')
    .filter((s2) => s2.equipment_ref === ANCHORS.unqualifiedEquipment
      && s2.work_order_id !== ANCHORS.unqualifiedWorkOrder
      && !coverOn(ANCHORS.unqualifiedEquipment, s2.started_at));
  note(bled.length === 0, 'T3 the lapse is contained to its own run',
    bled.length === 0
      ? `${T('mrd_mes', 'process_steps').filter((s2) => s2.equipment_ref === ANCHORS.unqualifiedEquipment).length} steps use ${ANCHORS.unqualifiedEquipment}; only ${ANCHORS.unqualifiedWorkOrder} falls in the gap`
      : `${bled.length} other run(s) contaminated: ${[...new Set(bled.map((b) => b.work_order_id))].slice(0, 4).join(', ')}`);
}

/**
 * T4 — material from a supplier disqualified after it was consumed, traceable
 * forward to finished lots that were already released.
 */
function checkT4DisqualifiedSupplier(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const sup = T('mrd_erp', 'suppliers').find((s) => s.supplier_id === ANCHORS.badSupplier);
  const consumed = T('mrd_erp', 'lot_material_consumption').filter(
    (c) => c.material_lot_id === ANCHORS.badMaterialLot,
  );
  const affected = consumed.map((c) => c.lot_id).filter((l) => lot(l)?.status === 'released');
  note(
    !!!!sup?.disqualified_on && affected.length > 0,
    'T4 disqualified supplier, material already consumed',
    sup?.disqualified_on
      ? `${ANCHORS.badSupplier} disqualified ${d(sup.disqualified_on)}; ${ANCHORS.badMaterialLot} already consumed by ${affected.join(', ')} (released)`
      : 'not present',
  );
  const capa = T('mrd_qms', 'capas').find((c) => c.source_ref === 'AUD-26-0003');
  note(!!capa && capa.status !== 'closed', 'T4 the traceability CAPA is still open', capa ? `${capa.capa_id} ${capa.status}, due ${d(capa.due_on)}` : 'missing');
}

/**
 * COMPLAINTS — infrastructure only, added 2026-09-12. Nothing reads this table
 * yet; these assertions exist so that when something eventually does, it is
 * building on rows somebody checked rather than rows somebody assumed.
 *
 * If this section reports 0 rows, the table has not reached the database:
 * `db:migrate` SKIPS any system that already has tables, so a newly added
 * table needs `pnpm db:reset`. That is safe here — the six systems are
 * deterministic and regenerate identically, and `mrd_kb` (the corpus, the
 * vector index, the ask history) is outside `SYSTEMS` and cannot be dropped.
 */
function checkComplaints(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const comps = T('mrd_qms', 'complaints');
  const lotIds = new Set(T('mrd_erp', 'product_lots').map((l) => l.lot_id));

  note(comps.length > 0, 'complaints table is populated',
    comps.length ? `${comps.length} complaint(s)` : 'EMPTY — run `pnpm db:reset` to apply the new table');

  // THE POINT OF THE TABLE. A complaint that always names a resolvable lot
  // would have designed the triage problem out of existence: a caller who
  // cannot read a batch code is the normal case, not an edge case.
  const unresolved = comps.filter((c) => !c.lot_ref);
  note(unresolved.length > 0, 'some complaints cannot be resolved to a lot',
    `${unresolved.length} of ${comps.length} have no lot_ref; ${unresolved.filter((c) => c.lot_stated).length} quote a lot number that does not match one`);

  // Every resolved reference must be real, or the table is decorative.
  const dangling = comps.filter((c) => c.lot_ref && !lotIds.has(c.lot_ref));
  note(dangling.length === 0, 'every resolved complaint names a real lot',
    dangling.length ? `${dangling.length} dangling: ${dangling.slice(0, 3).map((c) => c.complaint_id).join(', ')}` : `${comps.filter((c) => c.lot_ref).length} resolved, all valid`);

  // An adverse event starts a reporting clock, so it can never be filed as
  // the least serious thing in the file.
  const aeMinor = comps.filter((c) => c.is_adverse_event && c.severity === 'minor');
  note(aeMinor.length === 0, 'no adverse event is filed as minor',
    `${comps.filter((c) => c.is_adverse_event).length} adverse event(s), none minor`);
}

/**
 * T5 — cold chain: an excursion, and a monitoring gap that hides part of it.
 */
/**
 * The laboratory audit trail — infrastructure only, added 2026-09-12.
 *
 * Asserts the SHAPE of the evidence, not a verdict about it. Nothing scores
 * these sequences yet, and what counts as "testing into compliance" is the
 * judgement the capability will have to make — deciding it here would bake
 * today's guess into the data everyone later trains against.
 */
function checkLabEvents(c: Ctx): void {
  const { T } = c;
  const ev = T('mrd_qms', 'lab_events');
  const testIds = new Set(T('mrd_qms', 'qc_tests').map((t) => t.test_id));

  note(ev.length > 0, 'lab_events table is populated',
    ev.length ? `${ev.length} event(s)` : 'EMPTY — run `pnpm db:reset` to apply the new table');

  const dangling = ev.filter((e) => !testIds.has(e.test_ref));
  note(dangling.length === 0, 'every lab event names a real test',
    dangling.length ? `${dangling.length} dangling` : `${new Set(ev.map((e) => e.test_ref)).size} test(s) have a trail`);

  // A GAP IN event_seq WOULD ITSELF BE A FINDING, which is exactly why the
  // generator must not produce one by accident: a detector trained on data
  // with accidental gaps learns that gaps are normal.
  const byTest: Record<string, number[]> = {};
  for (const e of ev) (byTest[e.test_ref] ??= []).push(e.event_seq);
  const broken = Object.entries(byTest).filter(([, seqs]) =>
    [...seqs].sort((a, b) => a - b).some((v, i) => v !== i + 1),
  );
  note(broken.length === 0, 'every trail is contiguous from 1',
    broken.length ? `${broken.length} trail(s) have a gap: ${broken.slice(0, 3).map(([t]) => t).join(', ')}`
      : `${Object.keys(byTest).length} trail(s), no gaps`);

  // THE PLANTED PATTERN. Not "a delete exists" — the SEQUENCE: runs discarded
  // without a reason, then a passing run approved by whoever ran it.
  const deletes = ev.filter((e) => e.action === 'delete');
  const suspectTest = deletes[0]?.test_ref;
  const trail = ev.filter((e) => e.test_ref === suspectTest).sort((a, b) => a.event_seq - b.event_seq);
  const aborted = trail.filter((e) => e.action === 'abort' && !e.reason).length;
  note(
    deletes.length > 0 && aborted >= 2,
    'the discarded-runs pattern is present and findable',
    trail.length
      ? `${suspectTest}: ${trail.map((e) => e.action).join(' → ')}`
      : 'no deleted acquisitions anywhere — nothing for a data-integrity review to find',
  );

  // AND THE CONTROL. A table where every trail is suspicious teaches a detector
  // that suspicion is the baseline, after which it finds nothing.
  const clean = Object.values(byTest).filter((s) => s.length <= 3).length;
  note(clean > Object.keys(byTest).length / 2, 'most trails are unremarkable',
    `${clean} of ${Object.keys(byTest).length} trails are a plain acquire-and-approve`);
}

function checkT5ColdChain(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const ship = T('mrd_tms', 'shipments').find((s) => s.shipment_id === ANCHORS.coldChainShipment);
  const readings = T('mrd_tms', 'telematics_readings')
    .filter((r) => r.shipment_id === ANCHORS.coldChainShipment)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const over = readings.filter((r) => Number(r.temp_c) > Number(ship!.required_temp_max));
  let maxGap = 0;
  for (let i = 1; i < readings.length; i++) {
    maxGap = Math.max(
      maxGap,
      (new Date(readings[i].recorded_at).getTime()
        - new Date(readings[i - 1].recorded_at).getTime()) / 60000,
    );
  }
  note(
    over.length > 0 && maxGap > 60,
    'T5 cold-chain excursion inside a monitoring gap',
    `${ANCHORS.coldChainShipment}: ${over.length} reading(s) above ${ship!.required_temp_max} °C (max ${Math.max(...over.map((r) => Number(r.temp_c)))} °C), largest reporting gap ${maxGap} min`,
  );
  const carried = T('mrd_tms', 'shipment_lines').filter((l) => l.shipment_id === ANCHORS.coldChainShipment);
  note(carried.some((l) => l.lot_ref === ANCHORS.coldChainLot), 'T5 the affected lot is on that shipment', carried.map((l) => l.lot_ref).join(', '));
}

/**
 * T6 — twin sub-batches, different markets, different dissolution limits.
 */
function checkT6TwinSubBatches(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const a = lot(ANCHORS.twinEu), b = lot(ANCHORS.twinUs);
  const limOf = (sv: string | undefined) => T('mrd_qms', 'spec_limits').find((l) => l.spec_version_id === sv && l.attribute === 'dissolution');
  const la = limOf(a?.spec_version_ref), lb = limOf(b?.spec_version_ref);
  const oneChar = a && b && a.lot_id.length === b.lot_id.length
    && [...a.lot_id].filter((c, i) => c !== b.lot_id[i]).length === 1;
  note(
    !!oneChar && a!.market !== b!.market && Number(la?.lower_limit) !== Number(lb?.lower_limit),
    'T6 twin lots, one character apart, different limits',
    a && b ? `${a.lot_id} (${a.market}, Q≥${la?.lower_limit}%) vs ${b.lot_id} (${b.market}, Q≥${lb?.lower_limit}%)` : 'not present',
  );
}

/**
 * T7 — OOS retested to a pass with no investigation (21 CFR 211.192).
 */
function checkT7OosNoInvestigation(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const orig = T('mrd_qms', 'qc_tests').find((t) => t.test_id === ANCHORS.oosTest);
  const retest = T('mrd_qms', 'qc_tests').find((t) => t.test_id === ANCHORS.oosRetest);
  const investigated = T('mrd_qms', 'oos_investigations').some((o) => o.test_id === ANCHORS.oosTest);
  note(
    !!orig && !orig.in_spec && retest?.retest_of_test_id === ANCHORS.oosTest && !!retest.in_spec && !investigated,
    'T7 OOS retested to a pass, no investigation',
    orig ? `${orig.test_id} ${orig.result_num}${orig.unit} FAIL → ${retest?.test_id} ${retest?.result_num}${retest?.unit} PASS, and no OOS record exists for the original` : 'not present',
  );
  // The control WITHIN the trap: other OOS results were handled properly, so
  // "an OOS exists" is not itself the signal.
  const handled = T('mrd_qms', 'oos_investigations').length;
  note(handled > 0, 'T7 other OOS results WERE investigated', `${handled} investigation(s) on other tests — the absence in T7 is a difference, not the only case`);
}

/**
 * T8 — the negative control of the corpus. A lot that is genuinely releasable.
 * Every test the traps above would flag, run against this lot, must come back
 * clean. Without it an assistant that refuses everything scores perfectly.
 */
function checkT8CleanControl(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const l = lot(ANCHORS.cleanLot);
  const dp = disp(ANCHORS.cleanLot);
  const tests = T('mrd_qms', 'qc_tests').filter((t) => t.lot_ref === ANCHORS.cleanLot);
  const training = T('mrd_hcm', 'training_records').filter((t) => t.employee_id === ANCHORS.cleanQp);
  const trainingCurrent = training.every((t) => d(t.expires_on) > d(dp?.decided_on));
  const o = wo(l?.work_order_ref);
  const steps = T('mrd_mes', 'process_steps').filter((s) => s.work_order_id === o?.work_order_id);
  const equipmentOk = steps.every((s) => {
    if (!s.equipment_ref) return true;
    const pq = T('mrd_mes', 'equipment_qualification').filter((q) => q.equipment_id === s.equipment_ref && q.kind === 'PQ')[0];
    return !pq || d(pq.valid_until) >= d(s.started_at);
  });
  const devs = T('mrd_mes', 'deviations').filter((x) => x.work_order_id === o?.work_order_id);
  const badMaterial = T('mrd_erp', 'lot_material_consumption')
    .filter((c) => c.lot_id === ANCHORS.cleanLot)
    .some((c) => {
      const ml = T('mrd_erp', 'material_lots').find((m) => m.material_lot_id === c.material_lot_id);
      const sup = T('mrd_erp', 'suppliers').find((s) => s.supplier_id === ml?.supplier_id);
      return !!sup?.disqualified_on;
    });
  const clean = tests.length > 0 && tests.every((t) => t.in_spec) && trainingCurrent
    && equipmentOk && devs.length === 0 && !badMaterial && !!dp?.qp_certified;
  note(
    clean,
    'T8 CONTROL — a lot that is genuinely releasable',
    clean
      ? `${ANCHORS.cleanLot}: ${tests.length}/${tests.length} tests in spec, ${ANCHORS.cleanQp} training current at ${d(dp?.decided_on)}, equipment qualified, no deviations, no disqualified material`
      : `NOT clean — tests ${tests.filter((t) => !t.in_spec).length} failing, training ${trainingCurrent}, equipment ${equipmentOk}, deviations ${devs.length}, material ${badMaterial}`,
  );
}

/**
 * ───────────────────────────────── 2b. roles, not just references ───────────
 *
 * WHY THIS SECTION EXISTS. Every check above it passed while EMP-0142 — a
 * Production Operator — held a QP registration and personally certified a batch
 * for EU release. Not one soft key dangled: the employee row was real, the
 * qualification row was real, the disposition pointed at both. Referential
 * integrity said the estate was perfect and the estate described a person who
 * cannot exist.
 *
 * So: the acts that only certain people may perform, checked against who
 * performed them. This is the coherence a foreign key could never have given
 * us even if the databases were one database.
 */
function checkRoles(c: Ctx): void {
  const { T, lot, wo, disp, rev } = c;
  const positions = Object.fromEntries(T('mrd_hcm', 'positions').map((p) => [p.position_id, p]));
  const employees = Object.fromEntries(T('mrd_hcm', 'employees').map((e) => [e.employee_id, e]));
  const titleOf = (id: string): string => positions[employees[id]?.position_id]?.title ?? '<unknown>';
  const holds = (id: string, kind: string): boolean => T('mrd_hcm', 'qualifications').some((q) => q.employee_id === id && q.kind === kind);
  const authorised = (id: string, act: string): boolean => T('mrd_hcm', 'signature_authority').some(
    (a) => a.employee_id === id && a.act === act && a.revoked_on === null,
  );

  const certs = T('mrd_qms', 'batch_dispositions').filter((x) => x.qp_certified);
  const badQp = certs.filter((x) => !holds(x.decided_by_ref, 'QP') || !authorised(x.decided_by_ref, 'qp_certify')
    || titleOf(x.decided_by_ref) !== 'Qualified Person');
  note(
    badQp.length === 0,
    `roles — all ${certs.length} QP certifications made by a registered, authorised QP`,
    badQp.length === 0
      ? 'every certifier holds the QP position, a QP registration AND an unrevoked qp_certify authority'
      : badQp.slice(0, 3).map((x) => `${x.lot_ref}: ${x.decided_by_ref} is a ${titleOf(x.decided_by_ref)}`).join('; '),
  );

  const signed = T('mrd_mes', 'work_orders').filter((o) => o.signed_by_ref);
  const badSign = signed.filter((o) => !authorised(o.signed_by_ref, 'batch_record_sign'));
  note(badSign.length === 0, `roles — all ${signed.length} batch records signed by an authorised signatory`,
    badSign.length === 0 ? 'every signer holds an unrevoked batch_record_sign authority'
      : badSign.slice(0, 3).map((o) => `${o.work_order_id}: ${o.signed_by_ref} (${titleOf(o.signed_by_ref)})`).join('; '));

  const oos = T('mrd_qms', 'oos_investigations').filter((o) => o.approved_by_ref);
  const badOos = oos.filter((o) => !authorised(o.approved_by_ref, 'oos_approve'));
  note(badOos.length === 0, `roles — all ${oos.length} OOS investigations approved by an authorised approver`,
    badOos.length === 0 ? 'every approver holds an unrevoked oos_approve authority' : badOos.map((o) => o.oos_id).join(', '));

  const analysts = [...new Set(T('mrd_qms', 'qc_tests').map((t) => t.analyst_ref))];
  const badAnalyst = analysts.filter((a) => !holds(a, 'analyst'));
  note(badAnalyst.length === 0, `roles — all ${analysts.length} testing analysts are qualified analysts`,
    badAnalyst.length === 0 ? 'every analyst_ref holds an analyst qualification' : badAnalyst.join(', '));

  // Four eyes: nobody verifies their own work.
  const selfVerified = T('mrd_mes', 'process_steps').filter((s2) => s2.performed_by_ref === s2.verified_by_ref);
  note(selfVerified.length === 0, 'roles — four-eyes principle holds on every process step',
    selfVerified.length === 0 ? 'no step was performed and verified by the same person' : `${selfVerified.length} self-verified step(s)`);

  // The owner of a policy should not be someone with no standing to own one.
  const badOwner = T('mrd_reg', 'policies').filter((p) => {
    const pos = positions[employees[p.owner_ref]?.position_id];
    return !pos || (!pos.gmp_critical && !['HR Officer', 'Logistics Coordinator', 'Buyer', 'Regulatory Affairs Officer'].includes(pos.title));
  });
  note(badOwner.length === 0, `roles — all ${T('mrd_reg', 'policies').length} policies owned by someone who could own one`,
    badOwner.length === 0 ? 'no policy is owned by a line operator or a warehouse operative'
      : badOwner.map((p) => `${p.policy_id}: ${titleOf(p.owner_ref)}`).join('; '));
}

async function main(): Promise<void> {
  const data: LoadedEstate = {};
  for (const { db } of SYSTEMS) {
    const client = new Client({ connectionString: urlFor(db) });
    await client.connect();
    const { rows: tables } = await client.query(
      "select table_name from information_schema.tables where table_schema='public' order by 1",
    );
    data[db] = {};
    for (const { table_name } of tables) {
      const { rows } = await client.query(`select * from ${table_name}`);
      data[db][table_name] = rows;
    }
    await client.end();
  }

  const T = (db: string, t: string): Record<string, any>[] => data[db][t] ?? [];
  const keysOf = (db: string, t: string, col: string): Set<unknown> =>
    new Set(T(db, t).map((r) => r[col]));

  console.log('\nMeridian estate — consistency check\n');
  console.log('  rows loaded');
  for (const { db } of SYSTEMS) {
    const n = Object.values(data[db]).reduce((a, r) => a + r.length, 0);
    console.log(`    ${db.padEnd(9)} ${String(n).padStart(5)} across ${Object.keys(data[db]).length} tables`);
  }

  // ──────────────────────────────────────── 1. the soft keys, every one ───
  //
  // [source db, table, column, target db, table, column, nullable]

  const SOFT_KEYS: SoftKey[] = [
    ['mrd_reg', 'sops', 'owning_department_ref', 'mrd_hcm', 'departments', 'department_id', false],
    ['mrd_reg', 'policies', 'owner_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_reg', 'sop_revisions', 'change_control_ref', 'mrd_qms', 'change_controls', 'change_id', true],
    ['mrd_hcm', 'departments', 'site_ref', 'mrd_mes', 'sites', 'site_id', false],
    ['mrd_hcm', 'departments', 'head_employee_ref', 'mrd_hcm', 'employees', 'employee_id', true],
    ['mrd_hcm', 'employees', 'site_ref', 'mrd_mes', 'sites', 'site_id', false],
    ['mrd_erp', 'ingredients', 'compendial_ref', 'mrd_reg', 'standards', 'standard_id', true],
    ['mrd_erp', 'market_authorisations', 'spec_version_ref', 'mrd_qms', 'specification_versions', 'spec_version_id', false],
    ['mrd_erp', 'product_lots', 'work_order_ref', 'mrd_mes', 'work_orders', 'work_order_id', false],
    ['mrd_erp', 'product_lots', 'spec_version_ref', 'mrd_qms', 'specification_versions', 'spec_version_id', false],
    ['mrd_mes', 'work_orders', 'product_ref', 'mrd_erp', 'products', 'product_id', false],
    ['mrd_mes', 'work_orders', 'lot_ref', 'mrd_erp', 'product_lots', 'lot_id', false],
    ['mrd_mes', 'work_orders', 'governing_sop_ref', 'mrd_reg', 'sop_revisions', 'revision_id', false],
    ['mrd_mes', 'work_orders', 'signed_by_ref', 'mrd_hcm', 'employees', 'employee_id', true],
    ['mrd_mes', 'process_steps', 'performed_by_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_mes', 'process_steps', 'verified_by_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_mes', 'equipment_qualification', 'performed_by_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_mes', 'deviations', 'raised_by_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_mes', 'deviations', 'capa_ref', 'mrd_qms', 'capas', 'capa_id', true],
    ['mrd_qms', 'specifications', 'product_ref', 'mrd_erp', 'products', 'product_id', false],
    ['mrd_qms', 'specification_versions', 'standard_ref', 'mrd_reg', 'standards', 'standard_id', true],
    ['mrd_qms', 'test_methods', 'compendial_ref', 'mrd_reg', 'standard_clauses', 'clause_id', true],
    ['mrd_qms', 'qc_tests', 'lot_ref', 'mrd_erp', 'product_lots', 'lot_id', false],
    ['mrd_qms', 'qc_tests', 'analyst_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_qms', 'oos_investigations', 'approved_by_ref', 'mrd_hcm', 'employees', 'employee_id', true],
    ['mrd_qms', 'batch_dispositions', 'lot_ref', 'mrd_erp', 'product_lots', 'lot_id', false],
    ['mrd_qms', 'batch_dispositions', 'decided_by_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_qms', 'batch_dispositions', 'governing_sop_ref', 'mrd_reg', 'sop_revisions', 'revision_id', false],
    ['mrd_qms', 'capas', 'owner_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_qms', 'change_controls', 'affected_sop_ref', 'mrd_reg', 'sops', 'sop_id', true],
    ['mrd_qms', 'change_controls', 'approved_by_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_qms', 'audits', 'lead_auditor_ref', 'mrd_hcm', 'employees', 'employee_id', false],
    ['mrd_tms', 'warehouses', 'site_ref', 'mrd_mes', 'sites', 'site_id', false],
    ['mrd_tms', 'drivers', 'employee_ref', 'mrd_hcm', 'employees', 'employee_id', true],
    ['mrd_tms', 'shipment_lines', 'lot_ref', 'mrd_erp', 'product_lots', 'lot_id', false],
  ];

  /**
   * The walk itself, factored out so the NEGATIVE CONTROL can call it on rows it
   * controls. If this were inlined in the loop below, the control would be
   * testing a copy of the logic rather than the logic.
   */
  function danglingIn(
    rows: Record<string, any>[],
    column: string,
    targetKeys: Set<unknown>,
    nullable: boolean,
  ): string[] {
    const bad: string[] = [];
    for (const row of rows) {
      const v = row[column];
      if (v === null || v === undefined) {
        if (!nullable) bad.push('<null>');
        continue;
      }
      if (!targetKeys.has(v)) bad.push(v);
    }
    return bad;
  }

  let refsWalked = 0;
  let danglingTotal = 0;
  for (const [sdb, stab, scol, tdb, ttab, tcol, nullable] of SOFT_KEYS) {
    const rows = T(sdb, stab);
    const bad = danglingIn(rows, scol, keysOf(tdb, ttab, tcol), nullable);
    refsWalked += rows.length;
    danglingTotal += bad.length;
    if (bad.length) {
      fail.push({
        label: `${sdb}.${stab}.${scol} → ${tdb}.${ttab}.${tcol}`,
        detail: `${bad.length} dangling: ${[...new Set(bad)].slice(0, 5).join(', ')}`,
      });
    }
  }
  note(
    danglingTotal === 0,
    `cross-database references: ${SOFT_KEYS.length} soft keys, ${refsWalked} values`,
    danglingTotal === 0
      ? 'every value resolves in the other database — nothing here is enforced by Postgres'
      : `${danglingTotal} dangling`,
  );

  // ───────────────────────────────────────────── 2. the traps, re-derived ───

  const lot = (id: string) => T('mrd_erp', 'product_lots').find((l) => l.lot_id === id);
  const wo = (id: string) => T('mrd_mes', 'work_orders').find((o) => o.work_order_id === id);
  const disp = (lotId: string) => T('mrd_qms', 'batch_dispositions').find((x) => x.lot_ref === lotId);
  const rev = (id: string) => T('mrd_reg', 'sop_revisions').find((r) => r.revision_id === id);
  const ctx: Ctx = { T, lot, wo, disp, rev };
  // The as-of day. One implementation, in `tools/utils/dates.ts` — this file
  // used to carry its own, which returned the STRING "null" for a null date and
  // therefore compared as LATER than any real date. `asOfDay` returns '' there.

  checkT1CertifierTrainingLapsed(ctx);

  checkT2SupersededRevision(ctx);

  checkT3EquipmentUnqualified(ctx);

  checkT4DisqualifiedSupplier(ctx);

  checkComplaints(ctx);

  checkLabEvents(ctx);
  checkT5ColdChain(ctx);

  checkT6TwinSubBatches(ctx);

  checkT7OosNoInvestigation(ctx);

  checkT8CleanControl(ctx);

  checkRoles(ctx);

  // ───────────────────────────── 3. the negative control on the walk itself ───
  //
  // Everything above rests on `danglingIn` actually looking at the data. A
  // version of it that returned [] unconditionally would print a perfect report.

  {
    const employees = keysOf('mrd_hcm', 'employees', 'employee_id');
    const planted = [
      ...T('mrd_qms', 'batch_dispositions').slice(0, 3),
      { decided_by_ref: 'EMP-9999' },     // does not exist in mrd_hcm
    ];
    const caught = danglingIn(planted, 'decided_by_ref', employees, false);
    const nullPlanted = [{ decided_by_ref: null }];
    const caughtNull = danglingIn(nullPlanted, 'decided_by_ref', employees, false);
    const nullAllowed = danglingIn(nullPlanted, 'decided_by_ref', employees, true);

    note(
      caught.length === 1 && caught[0] === 'EMP-9999'
        && caughtNull.length === 1 && nullAllowed.length === 0,
      'CONTROL — the reference walk can fail',
      `planted EMP-9999 among real rows and it was caught; a null was caught where the ` +
        `column is NOT NULL and ignored where it is nullable — so the ${danglingTotal === 0 ? 'zero' : danglingTotal} above means something`,
    );
  }

  // ──────────────────────────────────────────────── 4. determinism, proven ───

  {
    const hash = (w: { reg: unknown; hcm: unknown; erp: unknown; mes: unknown; qms: unknown; tms: unknown }): string => createHash('sha256').update(JSON.stringify([w.reg, w.hcm, w.erp, w.mes, w.qms, w.tms])).digest('hex');
    const a = hash(buildOperations(buildWorld()));
    const b = hash(buildOperations(buildWorld()));
    note(a === b, 'determinism — two builds, one world', `sha256 ${a.slice(0, 16)}… both times`);
  }

  // ───────────────────────────────────────────────────────────────── report ───

  console.log('');
  for (const { label, detail } of ok) console.log(`  ok      ${label}\n          ${detail}`);
  for (const { label, detail } of fail) console.log(`  FAIL    ${label}\n          ${detail}`);

  const passed = fail.length === 0;
  console.log(`\ndb:check: ${passed ? 'PASS' : 'FAIL'} — ${ok.length} ok, ${fail.length} failing\n`);
  process.exit(passed ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});

