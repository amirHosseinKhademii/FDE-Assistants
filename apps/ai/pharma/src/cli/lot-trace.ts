/**
 * `pnpm db:trace <lot-id>` — the whole story of one lot, across all six systems.
 *
 * WHY THIS EXISTS. Browsing the six databases in a console shows six unrelated
 * piles of rows. There is no ER diagram that spans them, no foreign key to
 * follow, and no join that could ever be written — they are separate databases.
 * The relationships are real but they are only visible when something walks
 * them, and until now the only thing that walked them was `db:check`, which
 * reports pass/fail rather than showing the picture.
 *
 * So this is the picture. It is also, deliberately, a PREVIEW OF THE TOOL
 * LAYER: six sequential fetches, each keyed by a value the previous fetch
 * returned, stitched in application code. When step 3 gives the model one tool
 * per system, this is the shape of what those tools will do — which makes this
 * file the cheapest possible test of whether that design is going to work.
 *
 * READ THE FETCH COUNT IT PRINTS AT THE END. Six round trips to answer one
 * question is the cost of the silo design, stated as a number rather than as a
 * feeling. If that number climbs when the real tools are built, the design is
 * telling you something.
 */
import { asOfDay } from '../tools/utils/dates';
import { openHandle } from '../tools/utils/handle';
import { fetchErpFacts } from '../tools/departments/erp';
import { fetchMesFacts } from '../tools/departments/mes';
import { fetchQmsFacts } from '../tools/departments/qms';
import { fetchHcmFacts } from '../tools/departments/hcm';
import { fetchRegFacts } from '../tools/departments/reg';
import { fetchLotShipments } from '../tools/departments/tms';

async function main(): Promise<void> {
  const lotId = process.argv[2] ?? 'LOT-IBU200-2609-B';

  // ALL SIX HOPS ARE PROMOTED. There is no SQL left in this file — it opens the
  // handle, asks `tools/` six questions, and prints. The fetch count it reports
  // is the handle's, so it still measures what it always measured.
  const h = openHandle();

  // The as-of day comes from `tools/utils/dates.ts`; the em dash is this file's
  // business, because an empty cell in a terminal table reads as a bug.
  const d = (x: Date | string | null | undefined): string => asOfDay(x) || '—';
  const head = (s: string): void => console.log(`\n\x1b[1m${s}\x1b[0m`);
  const kv = (k: string, v: string): void => console.log(`    ${String(k).padEnd(22)} ${v}`);

  // ── 1. mrd_erp — the lot itself. Everything else hangs off what this returns.
  // PROMOTED: the fetching is `tools/erp.ts`; what is left here is printing.
  const erp = await fetchErpFacts(h, lotId);
  if (!erp) {
    console.error(`\nNo such lot: ${lotId}\n`);
    await h.close();
    process.exit(1);
  }
  const { lot, product, authorisation: ma } = erp;

  console.log(`\n\x1b[1mTracing ${lotId} across six databases\x1b[0m`);
  head('mrd_erp — products & materials');
  kv('product', `${product.productCode}  ${product.name}`);
  kv('market', `${lot.market}   authorisation ${ma?.maNumber ?? '—'} (${ma?.status ?? 'none'})`);
  kv('manufactured', `${d(lot.manufacturedOn)}   expiry ${d(lot.expiryOn)}`);
  kv('quantity', `${lot.quantityUnits.toLocaleString()} units`);
  kv('→ work_order_ref', `${lot.workOrderRef}   \x1b[2m(resolves in mrd_mes — no foreign key)\x1b[0m`);
  kv('→ spec_version_ref', `${lot.specVersionRef}   \x1b[2m(resolves in mrd_qms — no foreign key)\x1b[0m`);

  for (const m of erp.materials) {
    // The printer asks for the FINDING, not the raw date — `disqualifiedAfterUse`
    // is false for a supplier we had already stopped using before this run.
    const flag = m.disqualifiedAfterUse ? `  \x1b[31m⚠ supplier disqualified ${d(m.disqualifiedOn)}\x1b[0m` : '';
    kv(m.materialLotId, `${m.ingredientId} from ${m.supplierName}${flag}`);
  }

  // ── 2. mrd_mes — the run. Keyed by the work_order_ref the ERP row carried.
  // PROMOTED: the fetching and the as-of equipment check are `tools/mes.ts`.
  const mes = await fetchMesFacts(h, lot.workOrderRef);
  if (!mes) {
    console.error(`\nNo work order ${lot.workOrderRef} for ${lotId}\n`);
    await h.close();
    process.exit(1);
  }
  const wo = mes.workOrder;

  head('mrd_mes — facilities & manufacturing');
  kv('work order', `${wo.workOrderId}   line ${wo.lineId}`);
  kv('ran', `${d(wo.actualStart)} → ${d(wo.actualEnd)}   (${wo.status})`);
  kv('→ governing_sop_ref', `${wo.governingSopRef}   \x1b[2m(mrd_reg)\x1b[0m`);
  kv('→ signed_by_ref', `${wo.signedByRef} on ${d(wo.signedOn)}   \x1b[2m(mrd_hcm)\x1b[0m`);
  kv('deviations', mes.deviations.length === 0
    ? 'none'
    : mes.deviations.map((x) => `${x.deviationId} (${x.severity})`).join(', '));
  for (const s of mes.steps) {
    // `equipmentQualifiedOnDay === false` is the finding; `null` means the step
    // used no equipment, which is not the same thing and must not print red.
    const flag = s.equipmentQualifiedOnDay === false
      ? '  \x1b[31m⚠ NO valid qualification on this date\x1b[0m'
      : '';
    kv(`  step ${s.seq} ${s.name}`,
      `${s.equipmentRef ?? '—'}  by ${s.performedByRef}, verified ${s.verifiedByRef}${flag}`);
  }

  // ── 3. mrd_qms — the lab, and the decision. Keyed by the lot id and spec.
  // PROMOTED: `tools/qms.ts`. The spec version is passed IN — which market's
  // limits apply is the caller's question, not this silo's guess.
  const qms = await fetchQmsFacts(h, lotId, lot.specVersionRef);
  const disp = qms.dispositions[0];

  head('mrd_qms — quality');
  kv('specification', qms.specVersionRef);
  for (const t of qms.tests) {
    const range = t.limit ? `${t.limit.lowerLimit ?? '—'}–${t.limit.upperLimit ?? '∞'} ${t.limit.unit}` : '?';
    const retest = t.retestOfTestId ? `  \x1b[33m(retest of ${t.retestOfTestId})\x1b[0m` : '';
    kv(`  ${t.attribute}`, `${t.resultNum} ${t.unit}  limit ${range}  ` +
      (t.inSpec ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m') + retest +
      `  analyst ${t.analystRef} \x1b[2m(mrd_hcm)\x1b[0m`);
    if (!t.inSpec) {
      kv('    OOS investigation', t.missingOosInvestigation
        ? '\x1b[31m⚠ NONE — 21 CFR 211.192 requires one\x1b[0m'
        : `${t.oos!.oosId} (${t.oos!.outcome})`);
    }
  }
  if (disp) {
    kv('disposition', `${disp.decision}${disp.qpCertified ? ', QP-certified' : ''} on ${d(disp.decidedOn)}`);
    kv('→ decided_by_ref', `${disp.decidedByRef}   \x1b[2m(mrd_hcm)\x1b[0m`);
    kv('→ governing_sop_ref', `${disp.governingSopRef}   \x1b[2m(mrd_reg)\x1b[0m`);
  }

  // ── 4. mrd_hcm — the person, and their standing ON THE DAY they decided.
  // PROMOTED: `tools/hcm.ts`. The decision date goes IN as the as-of day —
  // the comparison the whole domain turns on is made there, not here.
  if (disp) {
    const hcm = await fetchHcmFacts(h, disp.decidedByRef, disp.decidedOn);
    if (hcm) {
      head('mrd_hcm — personnel & departments');
      kv('who decided', `${hcm.person.employeeId}  ${hcm.person.fullName}`);
      kv('position', `${hcm.person.title}, ${hcm.person.departmentId}`);
      kv('qualifications',
        hcm.qualifications.map((x) => `${x.kind}${x.registerNo ? ` ${x.registerNo}` : ''}`).join(', '));
      // Permissions, not competence. Only the ones NOT held on the day are
      // worth a colour; listing four green acts on every lot is noise.
      kv('signature authority',
        hcm.authority.length === 0
          ? 'none recorded'
          : hcm.authority
              .map((a) => (a.heldAtAct ? a.act : `\x1b[31m${a.act} NOT held on ${d(hcm.asOf)}\x1b[0m`))
              .join(', '));
      for (const t of hcm.training) {
        kv(`  ${t.curriculumId}`, `expires ${d(t.expiresOn)}` +
          (t.lapsedAtAct
            ? `  \x1b[31m⚠ EXPIRED before the decision on ${d(hcm.asOf)}\x1b[0m`
            : '  \x1b[32mcurrent\x1b[0m'));
      }
    }
  }

  // ── 5. mrd_reg — what the rule WAS on the day. Not what it is now.
  // PROMOTED: `tools/reg.ts`. The cited revision and the one actually in force
  // are two separate values there, because trap T2 is exactly their difference.
  if (disp) {
    const reg = await fetchRegFacts(h, disp.governingSopRef, disp.decidedOn);
    if (reg) {
      head('mrd_reg — standards & policies');
      kv('cited revision', reg.cited.revisionId);
      kv('in force', `${d(reg.cited.effectiveFrom)} → ${reg.cited.effectiveTo ? d(reg.cited.effectiveTo) : 'current'}`);
      kv('as-of check', reg.citedWasInForce
        ? `\x1b[32mcorrect — ${reg.inForce!.revisionId} governed on ${d(reg.asOf)}\x1b[0m`
        : `\x1b[31m⚠ SUPERSEDED — ${reg.inForce?.revisionId ?? 'nothing'} was in force on ${d(reg.asOf)}\x1b[0m`);
      kv('what it requires', reg.cited.changeSummary);
      kv('implements', reg.clauses.map((c) => c.clauseId).join(', '));
    }
  }

  // ── 6. mrd_tms — where it physically went, and whether it stayed cold enough.
  // PROMOTED: `tools/tms.ts`. A lot fans out to many shipments, so this is the
  // one hop that returns a list.
  const shipments = await fetchLotShipments(h, lotId);
  head('mrd_tms — distribution & fleet');
  if (!shipments.length) kv('shipments', 'none — this lot has not been despatched');
  for (const s of shipments) {
    kv(s.shipmentId,
      `${s.quantityUnits.toLocaleString()} units → ${s.consignee.name} (${s.consignee.country}), truck ${s.shipment.truckId}`);
    kv('  required', `${s.shipment.requiredTempMin}–${s.shipment.requiredTempMax} °C`);
    kv('  observed', `${s.telematics.minTempC}–${s.telematics.maxTempC} °C over ${s.telematics.readings} readings` +
      (s.excursion ? '  \x1b[31m⚠ EXCURSION\x1b[0m' : '  \x1b[32mwithin limits\x1b[0m'));
    // The gap is only worth a line when there IS one — a healthy logger should
    // not spend a row saying so on every shipment of every lot.
    if (s.monitoringGap) {
      kv('  monitoring', `\x1b[31m⚠ ${s.telematics.maxGapHours}h gap vs ${s.telematics.medianGapHours}h cadence — unrecorded, not verified\x1b[0m`);
    }
  }

  console.log(
    `\n\x1b[2m${h.fetches} queries across 6 databases. Not one of them was a join —\n` +
    `there is no join to write. Every arrow above was followed in application code.\x1b[0m\n`,
  );

  await h.close();
}

main().catch((e: unknown) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
