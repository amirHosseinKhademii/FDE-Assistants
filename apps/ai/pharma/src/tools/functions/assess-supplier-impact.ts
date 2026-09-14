/**
 * "This supplier was disqualified — what did we make with their material, and
 * where is it now?"
 *
 * THE SECOND QUESTION, AND A DIFFERENT SHAPE FROM THE FIRST. `assess-release`
 * takes one lot and returns a decision. This takes one supplier and returns a
 * WORK LIST: many lots, ranked by how far each one got, each with its own next
 * action. The silos are the same, the walk runs the other way.
 *
 * WHAT MAKES IT HARD IS NOT THE FAN-OUT. Finding the affected lots is three
 * joins inside one database. The hard part is the second hop — *which of these
 * already left the building* — because that lives in `mrd_tms`, cannot be
 * joined to `mrd_erp`, and is the only thing that separates "quarantine it this
 * afternoon" from "telephone a hospital".
 *
 * IT DOES NOT DECIDE A RECALL, and that is the same rule the release assessment
 * obeys. A recall is a regulatory decision with a legal clock, made by people
 * with names. This produces the list those people cannot currently assemble in
 * under a day, ranks it by exposure, and stops.
 */
import type { DbHandle } from '../utils/handle';
import { asOfDay } from '../utils/dates';
import {
  fetchSupplier,
  fetchSuppliedMaterials,
  fetchLotsUsingSupplier,
  type Supplier,
  type SuppliedMaterial,
  type AffectedLot,
} from '../departments/erp';
import { fetchDeliveriesForLots, type LotDelivery } from '../departments/tms';

/**
 * How far a lot got, worst first.
 *
 * THE ORDER IS THE PRODUCT. A recall coordinator works down this list, and the
 * difference between the top and the bottom is the difference between notifying
 * a hospital and walking to a warehouse. Ranking by anything else — date,
 * product, quantity — buries the urgent rows among the merely affected.
 */
export const EXPOSURE_ORDER = [
  'patient_facing', // delivered to a hospital or a pharmacy chain
  'distributor', // delivered to a wholesaler — still recoverable, but not by us
  'in_transit', // on a lorry; can be stopped
  'in_our_control', // never shipped, or held — ours to quarantine
  'expired', // past its expiry date; no longer a live exposure
] as const;

export type Exposure = (typeof EXPOSURE_ORDER)[number];

const PATIENT_FACING = new Set(['hospital', 'pharmacy_chain']);

export interface AffectedLotAssessment {
  lotId: string;
  productId: string;
  productName: string;
  market: string;
  status: string;
  manufacturedOn: string;
  expiryOn: string;
  quantityUnits: number;
  /** Which of this supplier's deliveries went into it. */
  materialLotIds: string[];
  exposure: Exposure;
  /** Empty when the lot never left the warehouse — which is itself the answer. */
  deliveries: {
    shipmentId: string;
    status: string;
    dispatchedOn: string;
    deliveredOn: string | null;
    consigneeName: string;
    consigneeKind: string;
    consigneeCountry: string;
    quantityUnits: number;
  }[];
  findings: string[];
  evidence: string[];
}

export interface SupplierImpactDossier {
  assessedOn: string;
  supplier: {
    supplierId: string;
    name: string;
    country: string;
    qualifiedFrom: string;
    disqualifiedOn: string | null;
    disqualifiedReason: string | null;
  };
  materials: {
    total: number;
    /** Delivered but never consumed — still on a shelf somewhere. */
    inStockUnused: number;
    /** Arrived after the supplier stopped being acceptable. */
    receivedAfterDisqualification: string[];
    /** Still flagged usable despite coming from a disqualified supplier. */
    notQuarantined: string[];
  };
  affected: AffectedLotAssessment[];
  /** Estate-level findings — about the supplier and the stock, not one lot. */
  findings: string[];
  totals: {
    lots: number;
    units: number;
    byExposure: Record<Exposure, number>;
  };
  evidence: string[];
}

/** The supplier is not in the estate, or was never disqualified. */
export interface SupplierImpactMiss {
  found: false;
  supplier_id: string;
  reason: string;
}

/** Was the lot made after the supplier stopped being acceptable? */
const madeAfterDisqualification = (lot: AffectedLot, supplier: Supplier): boolean =>
  !!supplier.disqualifiedOn && asOfDay(lot.manufacturedOn) > asOfDay(supplier.disqualifiedOn);

/** Is the lot still within its shelf life as of the day we are asking? */
const inShelfLife = (lot: AffectedLot, asOf: string): boolean => asOfDay(lot.expiryOn) >= asOf;

/**
 * How far this lot got.
 *
 * EXPIRY OUTRANKS EVERYTHING, because a lot past its expiry date is no longer
 * on a shelf anywhere and chasing it wastes the one resource a recall has.
 * Below that, the worst delivery a lot has decides its rank: a lot split across
 * a wholesaler and a hospital is a hospital problem.
 */
function exposureOf(lot: AffectedLot, deliveries: LotDelivery[], asOf: string): Exposure {
  if (!inShelfLife(lot, asOf)) return 'expired';
  if (deliveries.length === 0) return 'in_our_control';

  const delivered = deliveries.filter((d) => d.status === 'delivered');
  if (delivered.some((d) => PATIENT_FACING.has(d.consigneeKind))) return 'patient_facing';
  if (delivered.length > 0) return 'distributor';
  if (deliveries.some((d) => d.status === 'in_transit')) return 'in_transit';

  // Everything left is `held` — stopped in the network and back under control.
  return 'in_our_control';
}

/** What is true of this lot that somebody has to act on. */
function lotFindings(
  lot: AffectedLot,
  supplier: Supplier,
  deliveries: LotDelivery[],
  exposure: Exposure,
): string[] {
  const out: string[] = [];

  // The worst case in the whole assessment: material from a supplier already
  // known to be unacceptable was put into product anyway.
  if (madeAfterDisqualification(lot, supplier)) out.push('MADE_AFTER_DISQUALIFICATION');

  if (exposure === 'patient_facing') out.push('DELIVERED_TO_PATIENT_FACING');
  if (exposure === 'distributor') out.push('DELIVERED_TO_DISTRIBUTOR');
  if (exposure === 'in_transit') out.push('IN_TRANSIT_RECOVERABLE');
  if (exposure === 'in_our_control') out.push('IN_OUR_CONTROL');
  if (exposure === 'expired') out.push('PAST_EXPIRY');

  // A released lot is one nobody is holding. Said plainly because the status
  // and the exposure can disagree: a lot can be `released` and still sitting in
  // our own warehouse, which is the cheapest case to fix and easy to miss.
  if (lot.status === 'released' && exposure === 'in_our_control') {
    out.push('RELEASED_BUT_STILL_HELD_BY_US');
  }

  if (deliveries.some((d) => d.market !== lot.market)) out.push('SHIPPED_OUTSIDE_ITS_MARKET');

  return out;
}

/** Findings about the supplier and the stock, rather than about one lot. */
function materialFindings(supplier: Supplier, materials: SuppliedMaterial[]) {
  const disqualifiedOn = supplier.disqualifiedOn ? asOfDay(supplier.disqualifiedOn) : null;

  // Material that turned up AFTER the disqualification. This is the one finding
  // here that is preventive rather than forensic — nothing has gone wrong with
  // it yet, and it is the only one that can still be stopped for free.
  const receivedAfter = disqualifiedOn
    ? materials.filter((m) => asOfDay(m.receivedOn) > disqualifiedOn).map((m) => m.materialLotId)
    : [];

  // Anything from a disqualified supplier still flagged usable. `released` here
  // means "a production order may draw on it", which is exactly what must not
  // happen next.
  const notQuarantined = disqualifiedOn
    ? materials.filter((m) => m.status === 'released' && m.consumedByLots === 0).map((m) => m.materialLotId)
    : [];

  return { receivedAfter, notQuarantined };
}

/** `mrd_erp.material_lots#MLOT-…` — the same citation grammar the release dossier uses. */
const ref = (table: string, key: string): string => `${table}#${key}`;

export async function assessSupplierImpact(
  h: DbHandle,
  supplierId: string,
): Promise<SupplierImpactDossier | SupplierImpactMiss> {
  const supplier = await fetchSupplier(h, supplierId);
  if (!supplier) {
    return {
      found: false,
      supplier_id: supplierId,
      reason: `No supplier "${supplierId}" in mrd_erp.suppliers. Supplier ids look like "SUP-04".`,
    };
  }

  const assessedOn = asOfDay(new Date());
  const [materials, lots] = await Promise.all([
    fetchSuppliedMaterials(h, supplierId),
    fetchLotsUsingSupplier(h, supplierId),
  ]);
  const deliveries = await fetchDeliveriesForLots(h, lots.map((l) => l.lotId));

  const byLot = new Map<string, LotDelivery[]>();
  for (const d of deliveries) byLot.set(d.lotId, [...(byLot.get(d.lotId) ?? []), d]);

  const assessed: AffectedLotAssessment[] = lots.map((lot) => {
    const mine = byLot.get(lot.lotId) ?? [];
    const exposure = exposureOf(lot, mine, assessedOn);
    return {
      lotId: lot.lotId,
      productId: lot.productId,
      productName: lot.productName,
      market: lot.market,
      status: lot.status,
      manufacturedOn: asOfDay(lot.manufacturedOn),
      expiryOn: asOfDay(lot.expiryOn),
      quantityUnits: lot.quantityUnits,
      materialLotIds: lot.materialLotIds,
      exposure,
      deliveries: mine.map((d) => ({
        shipmentId: d.shipmentId,
        status: d.status,
        dispatchedOn: asOfDay(d.dispatchedOn),
        deliveredOn: d.deliveredOn ? asOfDay(d.deliveredOn) : null,
        consigneeName: d.consigneeName,
        consigneeKind: d.consigneeKind,
        consigneeCountry: d.consigneeCountry,
        quantityUnits: d.quantityUnits,
      })),
      findings: lotFindings(lot, supplier, mine, exposure),
      evidence: [
        ref('mrd_erp.product_lots', lot.lotId),
        ...lot.materialLotIds.map((m) => ref('mrd_erp.material_lots', m)),
        ...mine.map((d) => ref('mrd_tms.shipments', d.shipmentId)),
      ],
    };
  });

  // Rank by exposure, then by the most product at stake inside each band.
  assessed.sort(
    (a, b) =>
      EXPOSURE_ORDER.indexOf(a.exposure) - EXPOSURE_ORDER.indexOf(b.exposure) ||
      b.quantityUnits - a.quantityUnits,
  );

  const { receivedAfter, notQuarantined } = materialFindings(supplier, materials);

  const findings: string[] = [];
  if (!supplier.disqualifiedOn) findings.push('SUPPLIER_STILL_QUALIFIED');
  if (receivedAfter.length) findings.push('MATERIAL_RECEIVED_AFTER_DISQUALIFICATION');
  if (notQuarantined.length) findings.push('MATERIAL_IN_STOCK_NOT_QUARANTINED');
  if (assessed.some((a) => a.findings.includes('MADE_AFTER_DISQUALIFICATION'))) {
    findings.push('PRODUCT_MADE_AFTER_DISQUALIFICATION');
  }

  const byExposure = Object.fromEntries(EXPOSURE_ORDER.map((e) => [e, 0])) as Record<Exposure, number>;
  for (const a of assessed) byExposure[a.exposure]++;

  return {
    assessedOn,
    supplier: {
      supplierId: supplier.supplierId,
      name: supplier.name,
      country: supplier.country,
      qualifiedFrom: asOfDay(supplier.qualifiedFrom),
      disqualifiedOn: supplier.disqualifiedOn ? asOfDay(supplier.disqualifiedOn) : null,
      disqualifiedReason: supplier.disqualifiedReason,
    },
    materials: {
      total: materials.length,
      inStockUnused: materials.filter((m) => m.consumedByLots === 0).length,
      receivedAfterDisqualification: receivedAfter,
      notQuarantined,
    },
    affected: assessed,
    findings,
    totals: {
      lots: assessed.length,
      units: assessed.reduce((n, a) => n + a.quantityUnits, 0),
      byExposure,
    },
    evidence: [
      ref('mrd_erp.suppliers', supplier.supplierId),
      ...receivedAfter.map((m) => ref('mrd_erp.material_lots', m)),
    ],
  };
}
