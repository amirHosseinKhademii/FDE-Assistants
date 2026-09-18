/** What `GET /deliveries/by-order/:orderId` promises. */
import { z } from 'zod';

const Instant = z.string();
const CivilDate = z.string();

export const OrderRefParam = z.strictObject({
  orderId: z.string().min(1).max(64),
});
export type OrderRefParam = z.infer<typeof OrderRefParam>;

export const DeliveryResponse = z.strictObject({
  shipment: z.strictObject({
    id: z.string(),
    orderRef: z.string(),
    packageRef: z.string(),
    trackingNo: z.string(),
    serviceLevel: z.string(),
    status: z.string(),
    dispatchedAt: Instant,
    promisedBy: CivilDate,
  }),
  carrier: z.strictObject({
    code: z.string(),
    name: z.string(),
    kind: z.string(),
  }),
  scans: z.array(
    z.strictObject({
      id: z.string(),
      scannedAt: Instant,
      scanType: z.string(),
      location: z.string(),
    }),
  ),
  /**
   * T1's disguise lives in here. On the damaged shipment every event reads a
   * clean status with `exceptionCode: null`. The row is fine; the route is not.
   * Anything reasoning from these alone denies a claim it should not.
   */
  deliveryEvents: z.array(
    z.strictObject({
      id: z.string(),
      occurredAt: Instant,
      status: z.string(),
      exceptionCode: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
  proofOfDelivery: z
    .strictObject({
      id: z.string(),
      capturedAt: Instant,
      kind: z.string(),
      uri: z.string(),
      recipientName: z.string().nullable(),
    })
    .nullable(),
  /** Null when the shipment has not been put on a route yet. */
  route: z
    .strictObject({
      id: z.string(),
      routeDate: CivilDate,
      plannedStops: z.int(),
      startedAt: Instant,
      finishedAt: Instant.nullable(),
      depot: z.strictObject({ id: z.string(), name: z.string(), metro: z.string() }),
      driver: z.strictObject({ id: z.string(), fullName: z.string(), licenceNo: z.string() }),
      /** Which stop on that route this shipment was. The number T1's report names. */
      stopSeq: z.int().nullable(),
      stopArrivedAt: Instant.nullable(),
    })
    .nullable(),
  /**
   * T1 ITSELF, AND THE REASON THIS ENDPOINT EXISTS IN THIS SHAPE.
   *
   * Free text a driver typed, attached to a ROUTE and a DAY. There is no path
   * from the shipment row to these sentences — the walk is
   * shipment → stops → route → (driver reports for that route that day) — and
   * it is done HERE, inside the API, rather than by the model over three calls.
   *
   * PLAN.md §4.3: "A tool should return the shape of the question, not the shape
   * of the schema." Splitting this into three endpoints would spend model turns
   * on a join AND make finding T1 depend on the model thinking to ask a third
   * question. It would find it sometimes, which is the worst of the options.
   */
  driverReports: z.array(
    z.strictObject({
      id: z.string(),
      reportedAt: Instant,
      driverId: z.string(),
      severity: z.string(),
      body: z.string(),
      /** Stop numbers this report's TEXT mentions. See fleet.service.ts. */
      mentionsStops: z.array(z.int()),
      /** True when one of those is this shipment's stop. Computed, never guessed. */
      namesThisStop: z.boolean(),
    }),
  ),
  /** The depot's own log for that day. Wider than the route, same reason. */
  depotIncidents: z.array(
    z.strictObject({
      id: z.string(),
      occurredOn: CivilDate,
      kind: z.string(),
      body: z.string(),
      reportedBy: z.string(),
    }),
  ),
});
export type DeliveryResponse = z.infer<typeof DeliveryResponse>;
