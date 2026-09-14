/**
 * Complaints — INFRASTRUCTURE ONLY, added 2026-09-12. Nothing reads this yet.
 *
 * It exists so two capabilities have somewhere to land later without having to
 * invent a table at the same moment as the feature: complaint-to-recall
 * (`BOTTLENECK-2.md` §6) and prompt-injection guardrails, which need untrusted
 * free text that reaches the model. `narrative` is that surface.
 *
 * ══ THE RULE THIS FILE EXISTS TO OBEY ══════════════════════════════════════
 *
 * IT DRAWS FROM ITS OWN RANDOM STREAM AND NEVER FROM `world.h`.
 *
 * The estate comes off ONE seeded sequence: `buildWorld()` creates it and
 * `buildOperations()` keeps drawing from the same one. A single extra draw from
 * that stream shifts every value generated after it — measured, not guessed:
 * one added `h.r()` moved 17 tables. Every committed eval baseline would then
 * describe a world that no longer exists.
 *
 * So this takes the world READ-ONLY, to reference real lots and real people,
 * and makes `makeHelpers(COMPLAINTS_SEED)` for anything random. `pnpm
 * pharma:world-check` is what enforces it; it is not a convention.
 *
 * `h` is right there on `MasterWorld` and destructuring it is the easy mistake.
 * Do not.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FABRICATED, like the rest of the estate. No real complaint, patient or
 * pharmacy is described here, and none of these narratives was written by a
 * person reporting a real problem.
 */
import { makeHelpers, addDays, iso, pad, EPOCH } from './rng';
import { ANCHORS, type MasterWorld } from './world';

/**
 * A DIFFERENT seed from the world's `20260911`, and that is the entire trick.
 * Two streams that never meet cannot disturb one another.
 */
export const COMPLAINTS_SEED = 20260912;

/** How many to generate. Small on purpose — see the note at the bottom. */
const COUNT = 40;

interface Complaint {
  complaint_id: string;
  received_on: string;
  channel: string;
  reporter_kind: string;
  reporter_ref: string | null;
  market: string;
  product_ref: string | null;
  lot_ref: string | null;
  lot_stated: string | null;
  category: string;
  is_adverse_event: boolean;
  severity: string;
  narrative: string;
  status: string;
  opened_by_ref: string;
  closed_on: string | null;
  linked_deviation_ref: string | null;
  linked_capa_ref: string | null;
}

/** What a caller actually complains about, by category. */
const NARRATIVES: Record<string, string[]> = {
  quality_defect: [
    'Caller reports tablets in the blister are chipped along one edge. Says about a third of the strip is affected. No discolouration mentioned.',
    'Pharmacist reports the tablets crumble when pressed out of the foil. Says the same box was fine last month.',
    'Reports a dark speck embedded in one tablet, described as "like a grain of pepper". Retained the tablet and is willing to return it.',
    'Caller says the tablets smell strongly of vinegar. Opened the bottle two days ago and stored it in a bathroom cabinet.',
    'Hospital pharmacy reports two bottles in the same carton were only part filled. Counted 84 and 91 against a declared 100.',
  ],
  packaging: [
    'Blister foil was already split on three pockets when the box was opened. Outer carton undamaged.',
    'Carton label and blister label state different expiry dates. Caller read both out and they differ by one month.',
    'Child-resistant closure does not engage. Cap turns freely without locking.',
    'Patient information leaflet inside the carton is for a different strength than the one on the box.',
  ],
  efficacy: [
    'Patient reports no relief after taking the product for four days, where the previous pack worked within a day. Same prescription, different pack.',
    'Prescriber reports two patients on the same batch reporting reduced effect. Asks whether anything has changed in the formulation.',
  ],
  adverse_event: [
    'Patient reports a rash on the forearms starting the day after beginning the course. Has stopped taking it. Not seen a doctor yet.',
    'Reports nausea and dizziness within an hour of the first dose. Caller is 71 and takes three other medicines, which they listed.',
    'Hospital reports a patient admitted with a suspected allergic reaction. Product is one of several the patient was taking.',
  ],
  counterfeit_suspect: [
    'Wholesaler reports a carton whose print quality differs from stock received directly. Batch number font looks heavier. Has quarantined the carton.',
  ],
};

const CHANNELS = ['phone', 'email', 'portal', 'field_alert'] as const;
const REPORTERS = ['patient', 'pharmacist', 'hospital', 'wholesaler', 'prescriber'] as const;

export function buildComplaints(world: MasterWorld): MasterWorld {
  // ── the private stream ──────────────────────────────────────────────────
  const h = makeHelpers(COMPLAINTS_SEED);
  const { int, pick, chance } = h;

  const lots = world.erp.product_lots;
  const consignees = world.tms.consignees;
  // Complaint handling sits with QA. Falls back to any employee so a change to
  // the position codes cannot empty this and produce rows with no owner.
  const qa = world.byPos('POS-QAO').length ? world.byPos('POS-QAO') : world.allEmployees;

  const out: Complaint[] = [];

  for (let i = 1; i <= COUNT; i++) {
    const lot = pick(lots);
    const category = pick(
      // Weighted by hand rather than uniformly: real complaint files are mostly
      // quality defects and packaging, with adverse events a minority that
      // carries most of the regulatory weight. A uniform draw would make the
      // rare-but-serious class look routine.
      [
        'quality_defect', 'quality_defect', 'quality_defect', 'quality_defect',
        'packaging', 'packaging', 'packaging',
        'efficacy', 'efficacy',
        'adverse_event', 'adverse_event',
        'counterfeit_suspect',
      ],
    );

    const isAe = category === 'adverse_event' || (category === 'quality_defect' && chance(0.08));

    // ── THE TRIAGE PROBLEM, DELIBERATELY PRESERVED ────────────────────────
    // A third of complaints never resolve to a lot. Callers read a number
    // wrong, or cannot find the box. `lot_ref` is what we KNOW; `lot_stated`
    // is what we were TOLD, and they are different facts. A generator that
    // always resolved the lot would have designed the hard part away.
    const resolves = chance(0.62);
    const garbled = !resolves && chance(0.5);

    const receivedOn = iso(addDays(EPOCH, -int(1, 540)));
    const closed = chance(0.55);
    const reporterKind = pick(REPORTERS);
    const needsConsignee = reporterKind !== 'patient' && reporterKind !== 'prescriber';

    out.push({
      complaint_id: pad('CMP-', i, 4),
      received_on: receivedOn,
      channel: pick(CHANNELS),
      reporter_kind: reporterKind,
      reporter_ref: needsConsignee && consignees.length ? pick(consignees).consignee_id : null,
      market: lot.market,
      // When the lot is unknown the product usually still is — the caller can
      // describe what they are taking even when they cannot read a batch code.
      product_ref: resolves || chance(0.8) ? lot.product_id : null,
      lot_ref: resolves ? lot.lot_id : null,
      lot_stated: resolves
        ? lot.lot_id
        : garbled
          ? `${lot.lot_id.slice(0, -2)}${int(10, 99)}`
          : null,
      category,
      is_adverse_event: isAe,
      // Adverse events are never "minor": the severity of a complaint that
      // reached a person is not a judgement about the defect.
      severity: isAe ? pick(['major', 'critical']) : pick(['minor', 'minor', 'major']),
      narrative: pick(NARRATIVES[category]),
      status: closed ? 'closed' : pick(['open', 'investigating']),
      opened_by_ref: pick(qa),
      closed_on: closed ? iso(addDays(new Date(receivedOn), int(3, 60))) : null,
      linked_deviation_ref: null,
      linked_capa_ref: null,
    });
  }

  // ── one anchored row, so a later capability has something to find ────────
  //
  // `ANCHORS.contaminatedLots[1]` is LOT-AMX250-2411-A — the lot the supplier
  // suite already asserts reached a dispensing customer, and one of the two
  // carrying Silverbrook material. Anchored rather than random because a trap
  // that moves with the seed is a trap nobody can write a test against, which
  // is why `ANCHORS` exists at all.
  const anchorLot =
    lots.find((l) => l.lot_id === ANCHORS.contaminatedLots[1]) ?? lots[0];
  out.push({
    complaint_id: pad('CMP-', COUNT + 1, 4),
    received_on: '2026-06-02',
    channel: 'phone',
    reporter_kind: 'hospital',
    reporter_ref: consignees.length ? consignees[0].consignee_id : null,
    market: anchorLot.market,
    product_ref: anchorLot.product_id,
    lot_ref: anchorLot.lot_id,
    lot_stated: anchorLot.lot_id,
    category: 'quality_defect',
    is_adverse_event: false,
    severity: 'major',
    narrative:
      'Hospital pharmacy reports capsules from this batch appear mottled compared with ' +
      'previous supply of the same product. Has segregated the remaining stock pending advice.',
    status: 'open',
    opened_by_ref: qa[0],
    closed_on: null,
    linked_deviation_ref: null,
    linked_capa_ref: null,
  });

  world.qms.complaints = out;
  return world;
}

/**
 * WHY ONLY ~41 ROWS. Enough to triage, to cluster, and to have a third that
 * cannot be resolved to a lot — which is what makes the later work real. Not
 * enough to be a retrieval corpus, because nothing retrieves over it yet and
 * a table sized for a feature nobody has written is a guess about that feature.
 * Grow it when something reads it.
 *
 * NO PROMPT INJECTION IS PLANTED HERE. That belongs with the guardrail work,
 * not with the table: a planted attack sitting in the corpus for weeks with
 * nothing checking for it teaches nobody anything, and the first person to find
 * it would reasonably assume it was real.
 */
