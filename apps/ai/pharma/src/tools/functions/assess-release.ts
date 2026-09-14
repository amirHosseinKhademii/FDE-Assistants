/**
 * "May lot L be released to market M?" — the stitch, and the first thing in
 * this package that answers a question rather than reporting a record.
 *
 * THE DIFFERENCE FROM `db:trace` IN ONE SENTENCE: trace tells you what happened,
 * this decides whether what happened was allowed — and "allowed" is a property
 * of the DESTINATION, not of the lot.
 *
 * WHICH LIMITS APPLY IS THE WHOLE TRAP (T6). A lot carries `specVersionRef`,
 * the specification it was MADE to. The destination's marketing authorisation
 * carries its own `specVersionRef`, the specification it was GRANTED against.
 * For `LOT-IBU200-2609-B` those are the same (EU, `SPEC-IBU200-v4`); ask the
 * same lot's question about the US and they are not. Judging release by the
 * lot's own specification answers "was it made correctly", which is a different
 * question that happens to look right.
 *
 * IT NEVER RETURNS "YES, SHIP IT". `releasable` means "no blocker found by this
 * code", which is not the same as cleared — absence of a finding is not a
 * certification. The output is a dossier for the Qualified Person to sign or
 * refuse; the signature stays human because under Annex 16 it legally must.
 */
import type { DbHandle } from '../utils/handle';
import { asOfDay } from '../utils/dates';
import { fetchErpFacts, fetchAuthorisation, type Market } from '../departments/erp';
import { fetchMesFacts } from '../departments/mes';
import { fetchQmsFacts, fetchSpecLimits, type SpecLimit, type Disposition } from '../departments/qms';
import { fetchHcmFacts } from '../departments/hcm';
import { fetchRegFacts } from '../departments/reg';
import { fetchLotShipments } from '../departments/tms';

/** Where a fact came from, and — where it matters — the day it was judged on. */
export interface Evidence {
  /** `mrd_qms.batch_dispositions#DISP-26-0001`. Database, table, key. */
  ref: string;
  /**
   * The as-of day. NOT decoration: `SOP-QC-014 Rev 7` is a different rule from
   * `SOP-QC-014 Rev 6`, and a citation without the date it was evaluated on is
   * not checkable by the human who has to countersign it.
   */
  asOf?: string;
}

export type Severity = 'blocker' | 'concern';

export interface Finding {
  code: string;
  severity: Severity;
  summary: string;
  evidence: Evidence[];
}

/**
 * What was checked, and as of when — INDEPENDENT OF WHETHER ANYTHING WAS WRONG.
 *
 * THE DOSSIER USED TO REPORT ONLY EXCEPTIONS, and the 2026-09-12 eval run showed
 * what that costs. Asked whether a 2024 certification was valid, the model got a
 * dossier with one supplier concern and no blockers — so it never learned that
 * the act happened on 2024-09-18 under SOP-QC-014 Rev 6. It reached for the only
 * date it had been given (the supplier's disqualification, 2026-05-20), searched
 * the procedures as of THAT, and cited Rev 7: a rule that did not exist on the
 * day. Three runs in five.
 *
 * For "was this valid?", the BASIS IS THE ANSWER. A finding list that is empty
 * says nothing about what was examined.
 */
export interface CertificationBasis {
  dispositionId: string;
  /** The date the act happened. Every as-of question about it runs against this. */
  decidedOn: string;
  decidedByRef: string;
  certifier: string | null;
  /** The revision the disposition CLAIMS to have followed. */
  citedSopRevision: string;
  /** The revision actually in force on `decidedOn`. Equal to the above when correct. */
  governingSopRevision: string | null;
  qpCertified: boolean;
}

export interface AssessmentBasis {
  /** Today. What "no disposition exists" and "the authorisation is valid" are true as of. */
  assessedOn: string;
  manufacturedOn: string;
  /** The specification the lot was MADE to — not necessarily the one it is judged by. */
  builtToSpecVersion: string;
  /** Null when no release decision has been recorded for this market. */
  certification: CertificationBasis | null;
}

export interface ReleaseDossier {
  lotId: string;
  market: Market;
  product: string;
  /** The specification the DESTINATION's authorisation was granted against. */
  governingSpecVersion: string | null;
  /** Always present. See `AssessmentBasis`. */
  basis: AssessmentBasis;
  findings: Finding[];
  /** What could not be checked because a record was absent. */
  missing: string[];
  /** No blocker found. NOT a clearance — see the header. */
  releasable: boolean;
}

const num = (x: string | null): number | null => (x === null ? null : Number(x));

/** Is a result inside a limit? `null` bound means unbounded on that side. */
function withinLimit(result: number, limit: SpecLimit): boolean {
  const lo = num(limit.lowerLimit);
  const hi = num(limit.upperLimit);
  return (lo === null || result >= lo) && (hi === null || result <= hi);
}

export async function assessRelease(
  h: DbHandle,
  lotId: string,
  market: Market,
): Promise<ReleaseDossier | undefined> {
  const erp = await fetchErpFacts(h, lotId);
  if (!erp) return undefined;

  // THE DESTINATION'S authorisation, not the lot's own. `erp.authorisation` is
  // the licence for the market the lot was MADE for, which is the wrong one to
  // ask about whenever those two differ — which is the entire question.
  const ma = await fetchAuthorisation(h, erp.lot.productId, market);

  const findings: Finding[] = [];
  const missing: string[] = [];

  // ── The two dates every citation is judged against.
  //
  // `actOn` is the date of the act being examined — the release decision. When
  // there is none, the only honest as-of is TODAY: "no disposition exists" is a
  // statement about now, not about a day in the past.
  //
  // EVERY DATED EVIDENCE REF CARRIES ONE OF THESE. Ten of them did not, and the
  // 2026-09-12 run failed three times on it: the tool emitted
  // `mrd_erp.market_authorisations#…` with no date, the prompt told the model to
  // copy refs verbatim, and the schema then rejected the answer for a date only
  // the tool ever had. The model could not win. The thing that knows the date
  // supplies it.
  const qmsEarly = await fetchQmsFacts(h, lotId, erp.lot.specVersionRef);
  const disp = qmsEarly.dispositions.find((x) => x.market === market);
  const assessedOn = asOfDay(new Date());
  const actOn = disp ? asOfDay(disp.decidedOn) : assessedOn;

  // ── 1. May it go there at all.
  if (!ma) {
    findings.push({
      code: 'NO_AUTHORISATION',
      severity: 'blocker',
      summary: `No marketing authorisation for ${erp.product.name} in ${market}.`,
      evidence: [{ ref: `mrd_erp.market_authorisations#(${erp.lot.productId}, ${market})`, asOf: actOn }],
    });
  } else if (ma.status !== 'valid') {
    findings.push({
      code: 'AUTHORISATION_NOT_VALID',
      severity: 'blocker',
      summary: `The ${market} authorisation ${ma.maNumber} is ${ma.status}.`,
      evidence: [{ ref: `mrd_erp.market_authorisations#${ma.maId}`, asOf: actOn }],
    });
  }

  // ── 2. The lab, judged against the DESTINATION's limits.
  const governingSpec = ma?.specVersionRef ?? null;
  const qms = qmsEarly;

  if (governingSpec && governingSpec !== erp.lot.specVersionRef) {
    findings.push({
      code: 'SPEC_VERSION_MISMATCH',
      severity: 'concern',
      summary:
        `Made to ${erp.lot.specVersionRef}; the ${market} authorisation was granted ` +
        `against ${governingSpec}. Results below are judged against ${governingSpec}.`,
      evidence: [
        { ref: `mrd_erp.product_lots#${lotId}`, asOf: asOfDay(erp.lot.manufacturedOn) },
        { ref: `mrd_erp.market_authorisations#${ma!.maId}`, asOf: actOn },
      ],
    });
  }

  if (governingSpec) {
    const limits = await fetchSpecLimits(h, governingSpec);
    for (const t of qms.tests) {
      const limit = limits.find((l) => l.attribute === t.attribute);
      if (!limit) {
        missing.push(`No ${market} limit for '${t.attribute}' in ${governingSpec}.`);
        continue;
      }
      if (!withinLimit(Number(t.resultNum), limit)) {
        // A result that was investigated as laboratory error and repeated to a
        // pass is history, not a blocker. Only an unresolved one stops the lot.
        const resolved = t.supersededByRetest && t.oos?.outcome === 'lab_error';
        findings.push({
          code: resolved ? 'OOS_RESOLVED_BY_RETEST' : 'OUT_OF_SPEC_FOR_MARKET',
          severity: resolved ? 'concern' : 'blocker',
          summary:
            `${t.attribute} ${t.resultNum} ${t.unit} is outside the ${market} limit ` +
            `${limit.lowerLimit ?? '—'}–${limit.upperLimit ?? '∞'} ${limit.unit}` +
            (resolved ? `; investigated as ${t.oos!.outcome} (${t.oos!.oosId}) and retested to a pass.` : '.'),
          evidence: [
            { ref: `mrd_qms.qc_tests#${t.testId}`, asOf: asOfDay(t.testedOn) },
            { ref: `mrd_qms.spec_limits#(${governingSpec}, ${t.attribute})`, asOf: actOn },
          ],
        });
      }
      if (t.missingOosInvestigation) {
        findings.push({
          code: 'OOS_WITHOUT_INVESTIGATION',
          severity: 'blocker',
          summary: `${t.attribute} failed with no OOS investigation (21 CFR 211.192 requires one).`,
          evidence: [{ ref: `mrd_qms.qc_tests#${t.testId}`, asOf: asOfDay(t.testedOn) }],
        });
      }
    }
  } else {
    missing.push(`No governing specification for ${market} — lab results could not be judged.`);
  }

  // ── 3. The run that made it.
  const mes = await fetchMesFacts(h, erp.lot.workOrderRef);
  if (!mes) {
    missing.push(`No work order ${erp.lot.workOrderRef} — manufacture unverified.`);
  } else {
    for (const s of mes.steps.filter((x) => x.equipmentQualifiedOnDay === false)) {
      findings.push({
        code: 'EQUIPMENT_NOT_QUALIFIED',
        severity: 'blocker',
        summary: `Step ${s.seq} (${s.name}) used ${s.equipmentRef}, which held no valid qualification that day.`,
        evidence: [{ ref: `mrd_mes.process_steps#${s.stepId}`, asOf: asOfDay(s.startedAt) }],
      });
    }
    for (const dv of mes.deviations.filter((x) => x.status !== 'closed')) {
      findings.push({
        code: 'OPEN_DEVIATION',
        severity: 'blocker',
        summary: `Deviation ${dv.deviationId} (${dv.severity}) is still ${dv.status}.`,
        evidence: [{ ref: `mrd_mes.deviations#${dv.deviationId}`, asOf: asOfDay(dv.raisedOn) }],
      });
    }
  }

  for (const m of erp.materials.filter((x) => x.disqualifiedAfterUse)) {
    findings.push({
      code: 'SUPPLIER_DISQUALIFIED_AFTER_USE',
      severity: 'concern',
      summary: `${m.supplierName} was disqualified on ${asOfDay(m.disqualifiedOn!)}, after supplying ${m.materialLotId} to this lot.`,
      evidence: [{ ref: `mrd_erp.suppliers#${m.supplierId}`, asOf: asOfDay(erp.lot.manufacturedOn) }],
    });
  }

  // ── 4. The decision for THIS market, and whoever made it.
  let certification: CertificationBasis | null = null;
  if (!disp) {
    findings.push({
      code: 'NO_DISPOSITION',
      severity: 'blocker',
      summary: `No release decision has been recorded for ${market}.`,
      // Today, because the absence of a row is a fact about NOW.
      evidence: [{ ref: `mrd_qms.batch_dispositions#(${lotId}, ${market})`, asOf: assessedOn }],
    });
  } else {
    const reviewed = await reviewCertification(h, disp);
    findings.push(...reviewed.findings);
    certification = reviewed.basis;
  }

  // ── 5. Where it went, if it already went.
  for (const s of await fetchLotShipments(h, lotId)) {
    if (s.excursion) {
      findings.push({
        code: 'COLD_CHAIN_EXCURSION',
        severity: 'blocker',
        summary:
          `Shipment ${s.shipmentId} saw ${s.telematics.minTempC}–${s.telematics.maxTempC} °C ` +
          `against a required ${s.shipment.requiredTempMin}–${s.shipment.requiredTempMax} °C.`,
        evidence: [{ ref: `mrd_tms.shipments#${s.shipmentId}`, asOf: asOfDay(s.shipment.dispatchedOn) }],
      });
    }
    if (s.monitoringGap) {
      /**
       * A CONCERN AND NOT A BLOCKER, by decision.
       *
       * A gap is an UNKNOWN, not a breach: "no readings for 2.5 hours" is not
       * "it was fine for 2.5 hours", and under GDP the second cannot be inferred
       * from the first. But it is also not evidence of harm, and the suite
       * punishes over-blocking for a reason an assistant that holds every lot is
       * ignored within a week. So it is surfaced with its numbers and left to
       * the Qualified Person, which is what a concern is for. The excursion
       * check above already carries the observed breaches.
       */
      findings.push({
        code: 'TELEMETRY_GAP',
        severity: 'concern',
        summary:
          `Shipment ${s.shipmentId} has a ${s.telematics.maxGapHours}h gap between temperature ` +
          `readings against its own ${s.telematics.medianGapHours}h cadence — the product's ` +
          `condition over that interval is unrecorded, not verified.`,
        evidence: [{ ref: `mrd_tms.shipments#${s.shipmentId}`, asOf: asOfDay(s.shipment.dispatchedOn) }],
      });
    }
  }

  return {
    lotId,
    market,
    product: erp.product.name,
    governingSpecVersion: governingSpec,
    basis: {
      assessedOn,
      manufacturedOn: asOfDay(erp.lot.manufacturedOn),
      builtToSpecVersion: erp.lot.specVersionRef,
      certification,
    },
    findings,
    missing,
    releasable: !findings.some((f) => f.severity === 'blocker'),
  };
}

/**
 * The certifier, judged on the day they signed — hops 4 and 5 together.
 *
 * Separate function because it is the only check in this file that needs two
 * silos at once: the person's training comes from `mrd_hcm` and the rule that
 * makes a lapse matter comes from `mrd_reg`, as of the same date.
 */
async function reviewCertification(
  h: DbHandle,
  disp: Disposition,
): Promise<{ findings: Finding[]; basis: CertificationBasis }> {
  const out: Finding[] = [];
  const on = asOfDay(disp.decidedOn);

  const reg = await fetchRegFacts(h, disp.governingSopRef, disp.decidedOn);
  if (reg && !reg.citedWasInForce) {
    out.push({
      code: 'SUPERSEDED_PROCEDURE',
      severity: 'blocker',
      summary: `The decision cites ${reg.cited.revisionId}, but ${reg.inForce?.revisionId ?? 'nothing'} was in force.`,
      evidence: [{ ref: `mrd_reg.sop_revisions#${reg.cited.revisionId}`, asOf: on }],
    });
  }

  const hcm = await fetchHcmFacts(h, disp.decidedByRef, disp.decidedOn);

  // BUILT BEFORE THE EARLY RETURN, AND RETURNED WHETHER OR NOT ANYTHING IS
  // WRONG. This is the fact the model could not otherwise have: which revision
  // governed, on which day, and who signed.
  const basis: CertificationBasis = {
    dispositionId: disp.dispositionId,
    decidedOn: on,
    decidedByRef: disp.decidedByRef,
    certifier: hcm?.person.fullName ?? null,
    citedSopRevision: disp.governingSopRef,
    governingSopRevision: reg?.inForce?.revisionId ?? null,
    qpCertified: disp.qpCertified,
  };

  if (!hcm) return { findings: out, basis };

  /**
   * WAS THIS PERSON ALLOWED TO SIGN, as distinct from competent to.
   *
   * Training expires; authority is conferred and revoked. They fail
   * independently and they are not interchangeable — a QP can hold current
   * training and no authority, or authority and lapsed training, and only the
   * first of those was previously checked.
   *
   * ONLY FOR `qpCertified` DISPOSITIONS. `qp_certify` is the Annex 16 act; a US
   * release is a different act under different rules, and asserting an EU
   * permission against it would invent a requirement the estate does not have.
   */
  if (disp.qpCertified) {
    const grant = hcm.authority.find((a) => a.act === 'qp_certify');
    if (!grant || !grant.heldAtAct) {
      out.push({
        code: 'CERTIFIER_NOT_AUTHORISED',
        severity: 'blocker',
        summary: grant
          ? `${hcm.person.fullName} certified on ${on}, but their qp_certify authority ` +
            `runs from ${asOfDay(grant.grantedOn)}` +
            (grant.revokedOn ? ` to ${asOfDay(grant.revokedOn)}` : '') +
            ` — the signature falls outside it.`
          : `${hcm.person.fullName} holds no qp_certify authority at all, yet certified on ${on}.`,
        evidence: [
          { ref: `mrd_hcm.signature_authority#(${hcm.person.employeeId}, qp_certify)`, asOf: on },
          { ref: `mrd_qms.batch_dispositions#${disp.dispositionId}`, asOf: on },
        ],
      });
    }
  }

  for (const t of hcm.training.filter((x) => x.lapsedAtAct)) {
    out.push({
      code: 'CERTIFIER_TRAINING_LAPSED',
      severity: hcm.person.gmpCritical ? 'blocker' : 'concern',
      summary:
        `${hcm.person.fullName} (${hcm.person.title}) signed on ${on} with ${t.curriculumId} ` +
        `expired since ${asOfDay(t.expiresOn)}.`,
      evidence: [
        { ref: `mrd_hcm.training_records#(${hcm.person.employeeId}, ${t.curriculumId})`, asOf: on },
        { ref: `mrd_qms.batch_dispositions#${disp.dispositionId}`, asOf: on },
        ...(reg ? [{ ref: `mrd_reg.sop_revisions#${reg.inForce?.revisionId ?? reg.cited.revisionId}`, asOf: on }] : []),
      ],
    });
  }
  return { findings: out, basis };
}
