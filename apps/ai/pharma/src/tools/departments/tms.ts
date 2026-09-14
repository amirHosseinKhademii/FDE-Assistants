/**
 * `mrd_tms` — hop 6. Where the lot physically went, and whether it stayed
 * within the temperature it was supposed to.
 *
 * THE ONLY HOP WITH NO SINGLE ANSWER. A lot fans out to many shipment lines,
 * each with its own truck, consignee and temperature history — so this module
 * returns a list where the others return a row.
 *
 * THE EXCURSION IS COMPUTED HERE, NOT IN SQL AND NOT IN THE PRINTER. It is a
 * comparison between two tables (what the shipment REQUIRED, what the telematics
 * OBSERVED) and it is the finding trap T5 turns on. The gap in the readings is
 * the other half of T5 and is NOT detected yet — see `readings`.
 */
import type { DbHandle } from '../utils/handle';

const DB = 'mrd_tms';

export interface Consignee {
  consigneeId: string;
  name: string;
  country: string;
  market: string;
}

export interface Shipment {
  shipmentId: string;
  consigneeId: string;
  truckId: string;
  driverId: string;
  dispatchedOn: Date;
  status: string;
  requiredTempMin: string;
  requiredTempMax: string;
}

export interface TelematicsSummary {
  readings: number;
  minTempC: string | null;
  maxTempC: string | null;
  /** The longest interval between consecutive readings, in hours. */
  maxGapHours: number | null;
  /** This shipment's OWN typical interval. The yardstick the gap is judged against. */
  medianGapHours: number | null;
}

/** One shipment line for this lot, with everything needed to judge it. */
export interface LotShipment {
  shipmentId: string;
  quantityUnits: number;
  sscc: string;
  shipment: Shipment;
  consignee: Consignee;
  telematics: TelematicsSummary;
  /** THE FINDING. Observed temperature left the window the product required. */
  excursion: boolean;
  /**
   * THE OTHER HALF OF T5, and the harder half: the monitoring STOPPED for a
   * while. An excursion is a bad reading; a gap is the absence of readings, and
   * "we have no data for those hours" is not the same as "it was fine for those
   * hours" — under GDP the second cannot be inferred from the first.
   *
   * JUDGED AGAINST THE SHIPMENT'S OWN MEDIAN, never a fixed number of hours. A
   * logger on a fifteen-minute cadence and one on the hour are both healthy, and
   * a threshold that suited one would be blind or hysterical on the other. The
   * planted gap is 2.5h against a 0.25h median — a 10x outlier on a fleet where
   * every other shipment's worst interval equals its median exactly.
   */
  monitoringGap: boolean;
}

/** How many times its own cadence an interval must be before it is a gap. */
const GAP_MULTIPLE = 4;

export async function fetchShipment(h: DbHandle, shipmentId: string): Promise<Shipment | undefined> {
  const r = await h.one(DB, 'select * from shipments where shipment_id = $1', [shipmentId]);
  if (!r) return undefined;
  return {
    shipmentId: r.shipment_id,
    consigneeId: r.consignee_id,
    truckId: r.truck_id,
    driverId: r.driver_id,
    dispatchedOn: r.dispatched_on,
    status: r.status,
    requiredTempMin: r.required_temp_min,
    requiredTempMax: r.required_temp_max,
  };
}

export async function fetchConsignee(h: DbHandle, consigneeId: string): Promise<Consignee | undefined> {
  const r = await h.one(DB, 'select * from consignees where consignee_id = $1', [consigneeId]);
  if (!r) return undefined;
  return { consigneeId: r.consignee_id, name: r.name, country: r.country, market: r.market };
}

/**
 * ONE QUERY, NOT TWO. The gap statistics are computed alongside the temperature
 * range rather than in a second round trip — `db:trace` reports its fetch count
 * as a design signal, and a new finding should not cost a hop.
 */
export async function fetchTelematicsSummary(h: DbHandle, shipmentId: string): Promise<TelematicsSummary> {
  const r = await h.one(
    DB,
    `with r as (
       select temp_c,
              extract(epoch from (recorded_at - lag(recorded_at) over (order by recorded_at))) / 3600 as gap_h
         from telematics_readings where shipment_id = $1)
     select count(*)::int n, min(temp_c) lo, max(temp_c) hi,
            max(gap_h) max_gap,
            percentile_cont(0.5) within group (order by gap_h) median_gap
       from r`,
    [shipmentId],
  );
  const num = (x: unknown): number | null => (x === null || x === undefined ? null : Number(x));
  return {
    readings: r?.n ?? 0,
    minTempC: r?.lo ?? null,
    maxTempC: r?.hi ?? null,
    maxGapHours: num(r?.max_gap),
    medianGapHours: num(r?.median_gap),
  };
}

/** Every despatch of this lot. Empty means it never left the warehouse. */
export async function fetchLotShipments(h: DbHandle, lotId: string): Promise<LotShipment[]> {
  const lines = await h.query(DB, 'select * from shipment_lines where lot_ref = $1', [lotId]);

  const out: LotShipment[] = [];
  for (const line of lines) {
    const shipment = await fetchShipment(h, line.shipment_id);
    if (!shipment) continue;
    const consignee = await fetchConsignee(h, shipment.consigneeId);
    if (!consignee) continue;
    const telematics = await fetchTelematicsSummary(h, line.shipment_id);
    out.push({
      shipmentId: line.shipment_id,
      quantityUnits: line.quantity_units,
      sscc: line.sscc,
      shipment,
      consignee,
      telematics,
      excursion:
        Number(telematics.maxTempC) > Number(shipment.requiredTempMax) ||
        Number(telematics.minTempC) < Number(shipment.requiredTempMin),
      monitoringGap:
        telematics.maxGapHours !== null &&
        telematics.medianGapHours !== null &&
        telematics.medianGapHours > 0 &&
        telematics.maxGapHours >= telematics.medianGapHours * GAP_MULTIPLE,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANY LOTS AT ONCE.
//
// `fetchLotShipments` above answers "where did THIS lot go", which is the right
// shape when the question starts with one lot. A supplier question starts with
// twenty-three of them, and calling that function in a loop is twenty-three
// round trips across a database boundary to build one list.
// ─────────────────────────────────────────────────────────────────────────────

export interface LotDelivery {
  lotId: string;
  shipmentId: string;
  /** in_transit | delivered | held */
  status: string;
  dispatchedOn: Date;
  deliveredOn: Date | null;
  quantityUnits: number;
  consigneeName: string;
  /** wholesaler | hospital | pharmacy_chain — how close to a patient it got. */
  consigneeKind: string;
  consigneeCountry: string;
  market: string;
}

/**
 * Where a set of lots went, in one query.
 *
 * A lot with NO row here is not an error and must not be treated as one: it
 * means the lot never left the warehouse, which is the single most useful thing
 * this function can tell a recall coordinator. The caller decides what an
 * absence means — this returns only what the transport system actually knows.
 */
export async function fetchDeliveriesForLots(
  h: DbHandle,
  lotIds: string[],
): Promise<LotDelivery[]> {
  if (lotIds.length === 0) return [];
  const rows = await h.query(
    DB,
    `select sl.lot_ref, sl.quantity_units, sh.shipment_id, sh.status,
            sh.dispatched_on, sh.delivered_on,
            c.name as consignee_name, c.kind, c.country, c.market
       from shipment_lines sl
       join shipments sh on sh.shipment_id = sl.shipment_id
       join consignees c on c.consignee_id = sh.consignee_id
      where sl.lot_ref = any($1)
      order by sh.dispatched_on desc`,
    [lotIds],
  );
  return rows.map((r) => ({
    lotId: r.lot_ref,
    shipmentId: r.shipment_id,
    status: r.status,
    dispatchedOn: r.dispatched_on,
    deliveredOn: r.delivered_on ?? null,
    quantityUnits: r.quantity_units,
    consigneeName: r.consignee_name,
    consigneeKind: r.kind,
    consigneeCountry: r.country,
    market: r.market,
  }));
}
