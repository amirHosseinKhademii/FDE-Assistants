/**
 * Reads from `thb_fleet`, and does the walk that makes T1 findable.
 *
 * THE WALK, AS A LIST OF HOPS — which is also the list of methods below:
 *
 *   findShipmentByOrder      order_ref (a soft key) → the shipment
 *   findStopForShipment      the shipment           → which stop, on which route
 *   findDriverReportsOnDay   the route + that day   → what the driver typed
 *   findDepotIncidentsOnDay  the depot + that day   → what the depot logged
 *
 * NOTE THAT THE SHIPMENT ROW HAS NO `route_id`. The only path from a parcel to
 * the route it travelled on is through `stops`, which is worth saying out loud
 * because it is what makes T1 genuinely hard rather than merely unobvious: two
 * hops separate a clean delivery event from the sentence that contradicts it.
 *
 * ONE METHOD PER HOP, ON PURPOSE. Written as a single forty-line function the
 * walk is unreadable, and this is the most important endpoint in the engagement.
 * Split, each hop is independently testable, which is exactly what is wanted on
 * the day the answer comes back empty and the question is WHICH HOP LOST IT.
 * `getDeliveryByOrder` is a composer: it names the steps in order and assembles
 * the DTO, and it contains no query of its own.
 */
import { Inject, Injectable } from '@nestjs/common';
import { FLEET_CLIENT, type FleetClient } from './fleet.client';
import { DeliveryResponse } from './fleet.dto';
import { shapeResponse } from '../common/zod';
import { succeed, outOfScope, type Outcome } from '../common/outcome';
import { civilDate } from '../common/calendar/working-days';

/**
 * Which stop numbers a driver's sentence mentions.
 *
 * THIS IS A TEXT MATCH AND IT IS LABELLED AS ONE. `driver_reports` has no stop
 * column — the number exists only in prose ("trolley tipped at stop 14, two
 * parcels re-stacked"), which is precisely what makes T1 a reading problem
 * rather than a lookup. The match is done HERE because this is the only place
 * where both the prose and `stops.seq` are in scope, and a model should not be
 * relied on to notice that the 14 in a sentence is the same 14 as a column.
 *
 * IT IS DELIBERATELY NOT THE ONLY THING RETURNED. The raw `body` goes back
 * untouched beside it, so a report phrased "the fourteenth drop" is still in
 * front of the reader even though this regex will miss it. A helper that
 * REPLACED the evidence with its own verdict would turn a missed phrasing into
 * a fact that never reached anybody.
 */
export function mentionedStops(body: string): number[] {
  const found = new Set<number>();
  for (const match of body.matchAll(/\bstop\s*#?\s*(\d{1,3})\b/gi)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

type ShipmentWithEvidence = NonNullable<
  Awaited<ReturnType<FleetService['findShipmentByOrder']>>
>;
type StopWithRoute = NonNullable<Awaited<ReturnType<FleetService['findStopForShipment']>>>;
type DriverReport = Awaited<ReturnType<FleetService['findDriverReportsForRoute']>>[number];
type DepotIncident = Awaited<ReturnType<FleetService['findDepotIncidentsOnDay']>>[number];

@Injectable()
export class FleetService {
  constructor(@Inject(FLEET_CLIENT) private readonly db: FleetClient) {}

  // ── the composer ──────────────────────────────────────────────────────────

  async getDeliveryByOrder(orderRef: string): Promise<Outcome<DeliveryResponse>> {
    const shipment = await this.findShipmentByOrder(orderRef);
    if (!shipment) return outOfScope('delivery');

    const stop = await this.findStopForShipment(shipment.shipmentId);
    const route = stop?.route ?? null;
    const driverReports = route ? await this.findDriverReportsForRoute(route) : [];
    const depotIncidents = route ? await this.findDepotIncidentsOnDay(route) : [];

    return succeed(
      shapeResponse(
        DeliveryResponse,
        {
          shipment: toShipmentDto(shipment),
          carrier: toCarrierDto(shipment),
          scans: shipment.scans.map(toScanDto),
          deliveryEvents: shipment.events.map(toEventDto),
          proofOfDelivery: toProofDto(shipment),
          route: stop ? toRouteDto(stop) : null,
          driverReports: driverReports.map((r) => toDriverReportDto(r, stop)),
          depotIncidents: depotIncidents.map(toDepotIncidentDto),
        },
        'GET /deliveries/by-order/:orderId',
      ),
    );
  }

  // ── hop 1 ─────────────────────────────────────────────────────────────────

  /**
   * Enter by the soft key.
   *
   * `findFirst` and not `findUnique`: a re-delivery creates a SECOND shipment
   * against the same order, so `order_ref` is not unique. The most recently
   * dispatched one is what a contact about "my delivery" means.
   */
  private findShipmentByOrder(orderRef: string) {
    return this.db.shipment.findFirst({
      where: { orderRef },
      orderBy: { dispatchedAt: 'desc' },
      include: {
        carrier: true,
        scans: { orderBy: { scannedAt: 'asc' } },
        events: { orderBy: { occurredAt: 'asc' } },
        proofs: true,
      },
    });
  }

  // ── hop 2 ─────────────────────────────────────────────────────────────────

  /**
   * The stop is the ONLY bridge from a parcel to a route — `shipments` carries
   * no `route_id`. Null when the parcel has not been loaded, which is not an
   * error.
   */
  private findStopForShipment(shipmentId: string) {
    return this.db.stop.findFirst({
      where: { shipmentId },
      // ORDERED, because a failed-then-reattempted delivery puts the SAME
      // shipment on two rounds on two days. Without this, Prisma returns
      // whichever row the planner reached first, and an arbitrary stop means
      // the wrong route, the wrong day, and therefore the wrong driver
      // reports — a confidently empty T1 answer. `findShipmentByOrder` was
      // ordered for exactly this reason; this lookup needs the same.
      orderBy: [{ route: { routeDate: 'desc' } }, { stopId: 'desc' }],
      include: { route: { include: { depot: true, driver: true } } },
    });
  }

  // ── hop 3 ─────────────────────────────────────────────────────────────────

  /**
   * What the driver typed, for that round.
   *
   * Attached to a ROUTE, never to a shipment — which is exactly why this is
   * unreachable from the shipment row and why the endpoint does the walk rather
   * than leaving it to the model to think of a third question.
   *
   * THERE IS NO DAY FILTER HERE, AND REMOVING IT WAS A CORRECTION. `route_id` is
   * a real foreign key inside `thb_fleet`, and a route IS one round on one day —
   * so the route already scopes this completely and any date window is a
   * REDUNDANT filter layered on top of a key that was never ambiguous. A
   * redundant filter cannot add correctness. It can only ever drop evidence.
   *
   * And it did. Two versions of this were wrong before this one:
   *
   *   a UTC day from `route_date`   drops a report filed 00:00-01:00 London on
   *                                 the route date (a case that barely occurs)
   *   a LONDON day from `route_date` drops every report filed AFTER MIDNIGHT for
   *                                 the round that just ended — which is not a
   *                                 rare case, it is what "long round, back at
   *                                 the depot after midnight" means
   *
   * The second was mine, written to fix the first, and measured against
   * fde-assistants-2d's estate it dropped five of sixty-six driver reports —
   * including exactly the kind that says something went wrong on the round.
   * `commerce:api-check` now asserts no report is lost, so neither version can
   * come back quietly.
   */
  private findDriverReportsForRoute(route: { routeId: string }) {
    return this.db.driverReport.findMany({
      where: { routeId: route.routeId },
      orderBy: { reportedAt: 'asc' },
    });
  }

  // ── hop 4 ─────────────────────────────────────────────────────────────────

  /**
   * The depot's own log for that day.
   *
   * A DATE FILTER IS CORRECT *HERE* and wrong one method up, which is the
   * distinction worth holding on to. `depot_incidents` has no route key — the
   * depot and the day ARE its identity — and `occurred_on` is a `date` column
   * compared against another `date`, so no instant and no timezone enters the
   * comparison at all.
   */
  private findDepotIncidentsOnDay(route: { depotId: string; routeDate: Date }) {
    return this.db.depotIncident.findMany({
      where: { depotId: route.depotId, occurredOn: route.routeDate },
      orderBy: { occurredOn: 'asc' },
    });
  }
}

// ── row → DTO, one function per shape ───────────────────────────────────────

function toShipmentDto(s: ShipmentWithEvidence) {
  return {
    id: s.shipmentId,
    orderRef: s.orderRef,
    packageRef: s.packageRef,
    trackingNo: s.trackingNo,
    serviceLevel: s.serviceLevel,
    status: s.status,
    dispatchedAt: s.dispatchedAt.toISOString(),
    promisedBy: civilDate(s.promisedBy),
  };
}

function toCarrierDto(s: ShipmentWithEvidence) {
  return { code: s.carrier.carrierId, name: s.carrier.name, kind: s.carrier.kind };
}

function toScanDto(scan: ShipmentWithEvidence['scans'][number]) {
  return {
    id: scan.scanId,
    scannedAt: scan.scannedAt.toISOString(),
    scanType: scan.scanType,
    location: scan.location,
  };
}

function toEventDto(event: ShipmentWithEvidence['events'][number]) {
  return {
    id: event.eventId,
    occurredAt: event.occurredAt.toISOString(),
    status: event.status,
    exceptionCode: event.exceptionCode,
    notes: event.notes,
  };
}

function toProofDto(s: ShipmentWithEvidence) {
  const pod = s.proofs;
  if (!pod) return null;
  return {
    id: pod.podId,
    capturedAt: pod.capturedAt.toISOString(),
    kind: pod.kind,
    uri: pod.uri,
    recipientName: pod.recipientName,
  };
}

function toRouteDto(stop: StopWithRoute) {
  const route = stop.route;
  return {
    id: route.routeId,
    routeDate: civilDate(route.routeDate),
    plannedStops: route.plannedStops,
    startedAt: route.startedAt.toISOString(),
    finishedAt: route.finishedAt?.toISOString() ?? null,
    depot: { id: route.depot.depotId, name: route.depot.name, metro: route.depot.metro },
    driver: {
      id: route.driver.driverId,
      fullName: route.driver.fullName,
      licenceNo: route.driver.licenceNo,
    },
    stopSeq: stop.seq,
    stopArrivedAt: stop.arrivedAt?.toISOString() ?? null,
  };
}

function toDriverReportDto(report: DriverReport, stop: StopWithRoute | null) {
  const mentionsStops = mentionedStops(report.body);
  return {
    id: report.reportId,
    reportedAt: report.reportedAt.toISOString(),
    driverId: report.driverId,
    severity: report.severity,
    body: report.body,
    mentionsStops,
    namesThisStop: stop !== null && mentionsStops.includes(stop.seq),
  };
}

function toDepotIncidentDto(incident: DepotIncident) {
  return {
    id: incident.incidentId,
    occurredOn: civilDate(incident.occurredOn),
    kind: incident.kind,
    body: incident.body,
    reportedBy: incident.reportedBy,
  };
}
