/**
 * `get_delivery` — the shipment, the walk, and the promise, in one answer.
 *
 * IT TAKES NO ARGUMENTS, for the reason `get_order` takes none: the order is the
 * session's. See `session.ts`.
 *
 * IT RETURNS THE SHAPE OF THE QUESTION, NOT OF THE SCHEMA (PLAN.md §4.3). Two
 * calls behind one tool, both joins done on this side of the model:
 *
 *   1. `/deliveries/by-order` — the API already walks shipment → stop → route →
 *      the driver reports and depot incidents for that route that day. T1 is
 *      unreachable from the shipment row alone; the walk is the tool's job.
 *   2. `/policy/sla` — the working-day due date for THIS carrier and service,
 *      from the shipment's own dispatch and delivery instants. T6.
 *
 * The second was not in PLAN.md §5's tool list at all: the answer-key session
 * found that no planned tool reached `/policy/sla`, so the model could only
 * judge lateness by subtracting dates — T6's wrong answer. It is folded in here
 * because "was it late?" is a question about the delivery.
 *
 * A MISSING SLA DOES NOT FAIL THE DELIVERY. The facts of the shipment stand
 * whether or not a promise can be computed for it (82 Nexdrop next-day
 * shipments have no `carrier_sla` row). So `sla` is itself an outcome — the same
 * `{ ok, cause | data }` envelope — carrying its own cause.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { getJson, type ApiConfig } from '../api/client';
import { DeliveryResponseSchema, SlaSchema, type DeliveryResponse, type Sla } from '../api/schemas';
import { ok, outcomeSchema, type Outcome } from '../api/outcome';
import type { Session } from '../session';

export const DeliverySchema = DeliveryResponseSchema.extend({ sla: outcomeSchema(SlaSchema) });
export type Delivery = DeliveryResponse & { sla: Outcome<Sla> };

export const DESCRIPTION =
  "The delivery of this case's order: the shipment and its carrier, every tracking " +
  'scan and delivery event, the proof of delivery, and — when Thornbury\'s own fleet ' +
  'delivered it — the route, the stop, and every driver report and depot incident ' +
  'filed for that route on that day. Also the carrier SLA for this service: the due ' +
  'date counted in working days and how many working days late the delivery was. ' +
  'Takes no arguments: the order is fixed by the case.';

/** End a line with a full stop unless its last quoted text already did. */
const sentence = (s: string): string => (/[.!?]["”]?$/.test(s) ? s : `${s}.`);

/** The instant the parcel was delivered, if it was — the LAST delivered event. */
function deliveredAt(d: DeliveryResponse): string | undefined {
  return d.deliveryEvents.filter((e) => e.status.toUpperCase() === 'DELIVERED').at(-1)?.occurredAt;
}

function slaLine(sla: Outcome<Sla>): string {
  if (!sla.ok) return `SLA: could not be determined — ${sla.detail}`;
  const s = sla.data;
  const holidays = s.bankHolidaysInWindow.length ? ` Bank holidays in the window: ${s.bankHolidaysInWindow.join(', ')}.` : '';
  const outcome =
    s.deliveredOn === null
      ? 'not yet delivered'
      : `delivered ${s.deliveredOn}, ${s.workingDaysLate ?? 0} working day(s) late`;
  return (
    `SLA (${s.citation}): ${s.workingDays} working day(s) from dispatch on ${s.dispatchedOn} → due ${s.dueOn}; ` +
    `${outcome}.${holidays}`
  );
}

function summarise(d: Delivery): string {
  const s = d.shipment;
  const lines = [
    `Shipment ${s.id} by ${d.carrier.name} (${d.carrier.code}, ${d.carrier.kind}), ${s.serviceLevel} service; ` +
      `dispatched ${s.dispatchedAt}, promised by ${s.promisedBy}, status ${s.status}.`,
    `Scans: ${d.scans.map((x) => `${x.scanType} at ${x.location} ${x.scannedAt}`).join('; ') || 'none'}.`,
    sentence(`Delivery events: ${
      d.deliveryEvents
        .map((e) => `${e.status} ${e.occurredAt}${e.exceptionCode ? ` exception ${e.exceptionCode}` : ''}${e.notes ? ` — "${e.notes}"` : ''}`)
        .join('; ') || 'none'
    }`),
    d.proofOfDelivery
      ? `Proof of delivery: ${d.proofOfDelivery.kind}, captured ${d.proofOfDelivery.capturedAt}.`
      : 'Proof of delivery: none recorded.',
  ];
  if (d.route) {
    const r = d.route;
    lines.push(
      `Route ${r.id} on ${r.routeDate} from ${r.depot.name} (${r.depot.id}), driver ${r.driver.id}; ` +
        `this parcel was stop ${r.stopSeq ?? '?'} of ${r.plannedStops}${r.stopArrivedAt ? `, arrived ${r.stopArrivedAt}` : ''}.`,
    );
  } else {
    lines.push('Route: none — not delivered by Thornbury\'s own fleet.');
  }
  lines.push(
    d.driverReports.length
      ? `Driver reports for that route and day (${d.driverReports.length}):\n` +
          d.driverReports
            .map(
              (x) =>
                `  ${x.id} · ${x.severity} · ${x.reportedAt} · driver ${x.driverId} · mentions stop(s) ` +
                `${x.mentionsStops.join(', ') || 'none'}${x.namesThisStop ? ' — INCLUDING THIS STOP' : ''}\n  "${x.body}"`,
            )
            .join('\n')
      : 'Driver reports for that route and day: none filed.',
    d.depotIncidents.length
      ? sentence(`Depot incidents: ${d.depotIncidents.map((x) => `${x.id} ${x.occurredOn} ${x.kind} — "${x.body}"`).join('; ')}`)
      : 'Depot incidents: none.',
    slaLine(d.sla),
  );
  return lines.join('\n');
}

export function buildGetDelivery(cfg: ApiConfig, session: Session): Tool<Delivery> {
  return {
    name: 'get_delivery',
    config: {
      title: 'The delivery for this case',
      description: DESCRIPTION,
      inputSchema: z.object({}),
      // Documentation only — see get-order.ts. The write-path gate is an allowlist.
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    data: DeliverySchema as unknown as z.ZodType<Delivery>,
    run: async () => {
      const delivery = await getJson(
        cfg,
        session,
        `/deliveries/by-order/${encodeURIComponent(session.orderId)}`,
        DeliveryResponseSchema,
      );
      if (!delivery.ok) return delivery;

      const d = delivery.data;
      const at = deliveredAt(d);
      const query = new URLSearchParams({
        carrierRef: d.carrier.code,
        serviceLevel: d.shipment.serviceLevel,
        dispatchedAt: d.shipment.dispatchedAt,
        ...(at ? { deliveredAt: at } : {}),
      });
      const sla = await getJson(cfg, session, `/policy/sla?${query}`, SlaSchema);
      return ok({ ...d, sla });
    },
    render: (outcome: Outcome<Delivery>) =>
      outcome.ok ? summarise(outcome.data) : `Could not read the delivery: ${outcome.detail}`,
  };
}
