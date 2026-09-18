/**
 * thb_fleet — the vans and what happened on them. Own stream (`STREAM.fleet`).
 *
 * TRAP T1 IS BUILT HERE, AND THE BUILD IS THE EXPLANATION OF THE TRAP.
 *
 * The shipment for ORD-101414 is spotless and every field of it is true:
 * `delivery_events.status = 'DELIVERED'`, `exception_code` NULL, a
 * proof-of-delivery photograph timestamped at the door. An assistant that reads
 * the shipment row denies the customer's claim on that evidence, and it is
 * wrong.
 *
 * The truth is one table further out. At the end of the shift the driver filed
 * a report AGAINST THE ROUND — "trolley tipped at stop 14, two parcels
 * re-stacked" — because that is what the depot incident-reporting standard asks
 * for, and because a driver does not know which order is in which box. The only
 * path from the order to that sentence is:
 *
 *     orders.shipment_ref → shipments → stops (shipment_id)
 *                        → routes (route_id) → driver_reports (route_id)
 *
 * and then noticing that the stop's `seq` is 14 and the sentence says 14.
 * Nothing on the shipment points at the report. That is not an oversight in the
 * schema — it is what the schema is for, because it is how the real ones are
 * shaped.
 *
 * Three functions carry the trap and each says so: `reserveT1Round` makes the
 * round a real one, `plantT1DriverReport` writes the sentence, and
 * `plantT1CleanDeliveryRow` guarantees the shipment stays innocent.
 */
import { ANCHORS } from './anchors';
import { SEED, STREAM, addHours, iso, makeHelpers, pad, ts, type Helpers } from './rng';
import type { OrderPlan } from './shop';
import type { Fleet, Wms } from '../schema/rows';

const CARRIERS = [
  { carrier_id: 'CAR-THB', name: 'Thornbury Own Fleet', kind: 'own' },
  { carrier_id: 'CAR-NDX', name: 'Nexdrop Logistics', kind: 'contracted' },
  { carrier_id: 'CAR-PCL', name: 'Parcelane UK', kind: 'contracted' },
];

/** Own-fleet depots, one per metro, plus a hub for each contracted carrier. */
const DEPOTS = [
  { depot_id: 'DEP-BRM', carrier_id: 'CAR-THB', name: 'Birmingham Central', metro: 'Birmingham', postcode: 'B7 4AA', code: 'BRM' },
  { depot_id: 'DEP-MAN', carrier_id: 'CAR-THB', name: 'Manchester Trafford', metro: 'Manchester', postcode: 'M17 1WA', code: 'MAN' },
  { depot_id: 'DEP-LDS', carrier_id: 'CAR-THB', name: 'Leeds Stourton', metro: 'Leeds', postcode: 'LS10 1AB', code: 'LDS' },
  { depot_id: 'DEP-BRS', carrier_id: 'CAR-THB', name: 'Bristol Avonmouth', metro: 'Bristol', postcode: 'BS11 9BT', code: 'BRS' },
  { depot_id: 'DEP-NOT', carrier_id: 'CAR-THB', name: 'Nottingham Colwick', metro: 'Nottingham', postcode: 'NG4 2JT', code: 'NOT' },
  { depot_id: 'DEP-SHF', carrier_id: 'CAR-THB', name: 'Sheffield Tinsley', metro: 'Sheffield', postcode: 'S9 1TL', code: 'SHF' },
  { depot_id: 'DEP-NDX', carrier_id: 'CAR-NDX', name: 'Nexdrop national hub', metro: 'Rugby', postcode: 'CV23 0WA', code: 'NDX' },
  { depot_id: 'DEP-PCL', carrier_id: 'CAR-PCL', name: 'Parcelane national hub', metro: 'Warrington', postcode: 'WA2 8TX', code: 'PCL' },
];

const DRIVER_NAMES = ['Owen Pritchard', 'Sadia Rahman', 'Craig Bewley', 'Nadia Oyelaran', 'Tom Hartnell', 'Lena Kowalczyk', 'Femi Adeyemi', 'Ruth Calloway', 'Marek Zielinski', 'Jo Tranter', 'Hassan Barzani', 'Ellie Garrod'];

/** Uneventful reports. A trap that is the ONLY driver report is found by counting. */
const ROUTINE_REPORTS = [
  'Round completed, no issues.',
  'Heavy traffic on the ring road, back 40 minutes late. All parcels delivered.',
  'Two customers not in, carded and returned to depot.',
  'Tail lift slow to lower, maintenance job raised.',
  'Rain all afternoon, used the van canopy for handovers.',
  'Access barrier down on the estate, delivered on foot for four stops.',
  'One parcel refused at the door, returned to depot.',
];

const INCIDENT_BODIES = [
  'Roller cage collapsed on the loading dock, contents re-sorted.',
  'Shutter door fault, bay 3 out of use for the morning.',
  'Agency driver arrived without a licence check, stood down.',
  'Chilled unit alarm, no affected consignments.',
  'Pallet of returns left overnight in the yard, brought inside.',
];

const ROUTE_CAPACITY = 20;

const depotForMetro = new Map(DEPOTS.filter((d) => d.carrier_id === 'CAR-THB').map((d) => [d.metro, d]));

/** depot id → the day's shipments, in the order the van will call at them. */
type Rounds = Map<string, OrderPlan[]>;

interface Network {
  vehicles: Fleet['vehicles'];
  drivers: Fleet['drivers'];
  driversAt: Map<string, string[]>;
  vehiclesAt: Map<string, string[]>;
}

// ── the network ────────────────────────────────────────────────────

function buildVehicles(h: Helpers, depot: (typeof DEPOTS)[number], from: number): Fleet['vehicles'] {
  const out: Fleet['vehicles'] = [];
  const n = depot.carrier_id === 'CAR-THB' ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + h.int(0, 25))).join('');
    out.push({
      vehicle_id: pad('VEH-', from + i + 1, 3),
      depot_id: depot.depot_id,
      reg_plate: `${depot.code.slice(0, 2)}${String(70 + h.int(0, 5))} ${letters}`,
      kind: h.chance(0.8) ? 'van' : 'luton',
      capacity_parcels: h.int(90, 180),
    });
  }
  return out;
}

function buildDrivers(depot: (typeof DEPOTS)[number], from: number): Fleet['drivers'] {
  const out: Fleet['drivers'] = [];
  const n = depot.carrier_id === 'CAR-THB' ? 6 : 3;
  for (let i = 0; i < n; i++) {
    const seq = from + i + 1;
    const round = Math.ceil(seq / DRIVER_NAMES.length);
    out.push({
      driver_id: pad('DRV-', seq, 3),
      depot_id: depot.depot_id,
      full_name: DRIVER_NAMES[(seq - 1) % DRIVER_NAMES.length] + (round > 1 ? ` (${round})` : ''),
      licence_no: `L${pad('', 100000 + seq * 137, 6)}`,
    });
  }
  return out;
}

function buildNetwork(h: Helpers): Network {
  const vehicles: Fleet['vehicles'] = [];
  const drivers: Fleet['drivers'] = [];
  const driversAt = new Map<string, string[]>();
  const vehiclesAt = new Map<string, string[]>();

  for (const d of DEPOTS) {
    const vs = buildVehicles(h, d, vehicles.length);
    vehicles.push(...vs);
    vehiclesAt.set(d.depot_id, vs.map((v) => v.vehicle_id));

    const ds = buildDrivers(d, drivers.length);
    drivers.push(...ds);
    driversAt.set(d.depot_id, ds.map((x) => x.driver_id));
  }

  return { vehicles, drivers, driversAt, vehiclesAt };
}

// ── shipments ──────────────────────────────────────────────────────

function buildShipments(plans: OrderPlan[], wms: Wms): Fleet['shipments'] {
  const packageFor = new Map(wms.packages.map((p) => [p.order_ref, p.package_id]));
  return plans.map((p) => ({
    shipment_id: `SHP-${p.order_id.slice(4)}`,
    carrier_id: p.carrier,
    order_ref: p.order_id,
    package_ref: packageFor.get(p.order_id)!,
    tracking_no: `${p.carrier.slice(4)}${pad('', 70000000 + Number(p.order_id.slice(4)) * 13, 9)}`,
    service_level: p.service_level,
    dispatched_at: ts(p.dispatched_at),
    // THE PROMISE, NOT THE OUTCOME. This was `p.delivered_at`, which made every
    // delivered shipment on time by construction — `where delivered > promised_by`
    // returned zero rows and always would.
    promised_by: iso(p.due),
    status: p.status === 'returned' ? 'returned' : p.status === 'delivered' ? 'delivered' : 'in_transit',
  }));
}

// ── rounds ─────────────────────────────────────────────────────────

/**
 * Own fleet only.
 *
 * A contracted carrier runs its own rounds and files nothing with us, which is
 * itself worth seeing in the data: for those shipments the scans are all the
 * evidence there is, and a question that needs a driver's account of one has no
 * answer. Only the own fleet leaves a trail this deep.
 */
function groupOwnFleetRounds(plans: OrderPlan[]): Rounds {
  const rounds: Rounds = new Map();
  for (const p of plans) {
    if (p.carrier !== 'CAR-THB' || !p.delivered_at) continue;
    const depot = depotForMetro.get(p.city);
    if (!depot) continue;
    const key = `${depot.depot_id}|${iso(p.delivered_at)}`;
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key)!.push(p);
  }
  return rounds;
}

/**
 * MAKE T1'S ROUND A REAL ROUND, OR THE TRAP IS FREE.
 *
 * If Birmingham's van delivered three parcels that day then "stop 14" does not
 * exist. If it delivered exactly fourteen then the trap order is the LAST stop
 * and is findable by sorting, which makes every eval case that steps on it
 * accidentally easy. The round needs ordinary stops either side of the trap.
 *
 * Volume is weighted to make a full round the expected case (`METRO_CUM` in
 * shop.ts), but expected is not guaranteed, and a trap that survives only when
 * the dice cooperate is a trap that will silently stop existing. So: if the day
 * is short, borrow from the nearest Birmingham day with stops to spare.
 * Borrowing moves a delivery by a day, which is an ordinary thing for a parcel
 * to do and changes nothing another trap depends on.
 */
function reserveT1Round(rounds: Rounds): void {
  const depot = depotForMetro.get('Birmingham')!;
  const key = `${depot.depot_id}|${ANCHORS.t1DeliveredOn}`;
  if (!rounds.has(key)) rounds.set(key, []);
  const day = rounds.get(key)!;

  const target = new Date(`${ANCHORS.t1DeliveredOn}T14:00:00Z`);

  // ONLY FROM DAYS WHOSE PARCELS HAD ALREADY BEEN DISPATCHED. Borrowing an
  // order that leaves the warehouse next week and re-dating its delivery to
  // this round would deliver it before it was sent — the same backwards
  // chronology that pinning T1's dispatch date fixes, reintroduced one function
  // away. A parcel can sit at the depot for a day; it cannot arrive early.
  const donors = [...rounds.entries()]
    .filter(([k]) => k.startsWith(`${depot.depot_id}|`) && k !== key)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));

  while (day.length < ROUTE_CAPACITY) {
    const donor = donors.find(([, v]) => v.some((p) => p.dispatched_at < target) && v.length > 1);
    if (!donor) break;
    const at = donor[1].findIndex((p) => p.dispatched_at < target);
    const [moved] = donor[1].splice(at, 1);
    moved.delivered_at = target;
    day.push(moved);
  }

  // Splice to index 13 — `seq` 14 — rather than swapping, so the stops around
  // it keep their order and nothing about position 14 looks different from 13.
  const at = day.findIndex((p) => p.order_id === ANCHORS.t1Order);
  if (at < 0) return;
  const [trap] = day.splice(at, 1);
  day.splice(Math.min(ANCHORS.t1StopSeq - 1, day.length), 0, trap);
}

// ── routes, stops and reports ──────────────────────────────────────

function stopsForRoute(route_id: string, day: string, slice: OrderPlan[]): Fleet['stops'] {
  // Times are built by ADDING MINUTES TO A DATE, never by formatting an hour
  // and a minute into a string. The string version produced `08:62:00Z` at the
  // twenty-first minute offset and `new Date()` returned Invalid Date, which
  // then threw four frames away inside `toISOString`. Arithmetic carries; text
  // does not.
  const depart = new Date(`${day}T08:00:00Z`);
  return slice.map((p, i) => {
    const seq = i + 1;
    const arrived = new Date(depart.getTime() + seq * 21 * 60_000);
    return {
      stop_id: `STP-${route_id.slice(4)}-${pad('', seq, 2)}`,
      route_id,
      seq,
      shipment_id: `SHP-${p.order_id.slice(4)}`,
      address_line: p.address_line,
      postcode: p.postcode,
      arrived_at: ts(arrived),
      departed_at: ts(new Date(arrived.getTime() + 3 * 60_000)),
    };
  });
}

interface Rota { routes: Fleet['routes']; stops: Fleet['stops'] }

function buildRoutes(rounds: Rounds, net: Network): Rota {
  const routes: Fleet['routes'] = [];
  const stops: Fleet['stops'] = [];

  for (const key of [...rounds.keys()].sort()) {
    const [depot_id, day] = key.split('|');
    const group = rounds.get(key)!;
    if (!group.length) continue;
    const ds = net.driversAt.get(depot_id)!;
    const vs = net.vehiclesAt.get(depot_id)!;
    const code = DEPOTS.find((d) => d.depot_id === depot_id)!.code;
    const dayOfMonth = Number(day.slice(8));

    for (let c = 0; c * ROUTE_CAPACITY < group.length; c++) {
      const slice = group.slice(c * ROUTE_CAPACITY, (c + 1) * ROUTE_CAPACITY);
      const route_id = `RTE-${day.replace(/-/g, '')}-${code}-${c + 1}`;
      routes.push({
        route_id,
        depot_id,
        vehicle_id: vs[(c + dayOfMonth) % vs.length],
        driver_id: ds[(c + dayOfMonth) % ds.length],
        route_date: day,
        planned_stops: slice.length,
        started_at: ts(new Date(`${day}T07:30:00Z`)),
        finished_at: ts(new Date(new Date(`${day}T17:00:00Z`).getTime() + ((10 + c * 7) % 45) * 60_000)),
      });
      stops.push(...stopsForRoute(route_id, day, slice));
    }
  }

  return { routes, stops };
}

/**
 * WHEN A REPORT WAS FILED — and every eleventh round is filed AFTER MIDNIGHT,
 * deliberately.
 *
 * THE ESTATE HAD NO DAY-BOUNDARY CASE AT ALL. Every report was written at
 * 17:35 UTC, which is mid-evening in BST and nowhere near a date change, so a
 * `route → reports for that day` lookup could compare dates in the wrong
 * timezone and never be caught. The backend session found and fixed exactly
 * that bug by reasoning about it; nothing in the data would have failed if they
 * had not, and nothing would fail if it came back.
 *
 * 23:30 UTC is 00:30 the NEXT DAY in Europe/London while BST is in force, which
 * every date in this estate is. So the report's London date is one day after
 * its `route_date`, and a lookup that converts to local time before comparing
 * dates drops it. That is a real thing that happens: a driver finishing a long
 * round writes the round up when they get back, and "when they get back" is
 * sometimes tomorrow.
 *
 * NOT ON THE TRAP ROUTE, and that is the point of putting it elsewhere. If T1's
 * report were the boundary case, a timezone bug and a broken walk would produce
 * the same symptom — "no report for this route" — and the two need opposite
 * fixes. Keep the trap unambiguous and exercise the boundary next door.
 */
function filedAt(route_date: string, nth: number): Date {
  if (nth % 11 === 0) return new Date(`${route_date}T23:30:00Z`);
  return new Date(`${route_date}T17:35:00Z`);
}

/** Uneventful end-of-shift notes. The trap route is skipped; see below. */
function buildDriverReports(h: Helpers, routes: Fleet['routes']): Fleet['driver_reports'] {
  const out: Fleet['driver_reports'] = [];
  routes.forEach((r) => {
    if (r.route_id === ANCHORS.t1Route) return;
    if (!h.chance(0.35)) return;
    // NUMBERED BY OUTPUT LENGTH, NOT BY ROUTE INDEX. The route index skips the
    // trap route and skips every route that drew no report, so it is not dense
    // — and `plantT1DriverReport` appends at `length + 1`, which collided with
    // a route-index id and would have failed on the primary key at insert time.
    const at = filedAt(r.route_date as string, out.length + 1);
    const afterMidnight = at.getUTCHours() >= 23;
    out.push({
      report_id: pad('DRP-', out.length + 1, 5),
      route_id: r.route_id,
      driver_id: r.driver_id,
      reported_at: ts(at),
      severity: h.chance(0.85) ? 'info' : 'minor',
      body: afterMidnight
        ? `Long round, back at the depot after midnight. ${h.pick(ROUTINE_REPORTS)}`
        : h.pick(ROUTINE_REPORTS),
    });
  });
  return out;
}

/**
 * T1, THE SENTENCE.
 *
 * It names a STOP NUMBER and nothing else — no order, no tracking number, no
 * customer name. That is how a driver writes at the end of a shift, and it is
 * precisely why the walk is the only way in. The severity is `minor`, because
 * the driver thought the contents were fine; had it been `major` the fleet
 * would have raised an exception and the trap would not exist.
 */
function plantT1DriverReport(routes: Fleet['routes'], reports: Fleet['driver_reports']): void {
  const route = routes.find((r) => r.route_id === ANCHORS.t1Route);
  // THROW, DO NOT RETURN. This returned quietly for one run while `t1Route`
  // named a round that routing never produced: the report was never written,
  // the trap did not exist, and every count in the seed still looked right. A
  // planted flaw that can fail to be planted without saying so is worse than no
  // flaw at all, because the eval that depends on it goes green for the wrong
  // reason.
  if (!route) {
    throw new Error(
      `T1 cannot be planted: no route "${ANCHORS.t1Route}". Routing produced ` +
      routes.filter((r) => r.route_id.includes('BRM')).slice(0, 6).map((r) => r.route_id).join(', ') +
      '. Fix ANCHORS.t1Route or reserveT1Round — do not let this pass.',
    );
  }
  reports.push({
    report_id: pad('DRP-', reports.length + 1, 5),
    route_id: route.route_id,
    driver_id: route.driver_id,
    reported_at: ts(new Date(`${route.route_date as string}T17:40:00Z`)),
    severity: 'minor',
    body: 'Trolley tipped at stop 14, two parcels re-stacked. Outer boxes scuffed, '
      + 'contents looked OK so completed the round. Flagging in case anything comes back.',
  });
}

// ── scans, events and proofs ───────────────────────────────────────

function hubFor(plan: OrderPlan): string {
  const contracted = DEPOTS.find((d) => d.carrier_id === plan.carrier && d.carrier_id !== 'CAR-THB');
  return contracted?.depot_id ?? depotForMetro.get(plan.city)?.depot_id ?? 'DEP-BRM';
}

function scansFor(shipment_id: string, plan: OrderPlan, deliveredAt: Date | null, from: number): Fleet['scans'] {
  const hub = hubFor(plan);
  const trail: [string, Date, string][] = [
    ['accepted', plan.dispatched_at, 'Daventry NDC'],
    ['at_depot', addHours(plan.dispatched_at, 9), hub],
  ];
  if (deliveredAt) {
    trail.push(['out_for_delivery', addHours(deliveredAt, -3), hub]);
    trail.push(['delivered', deliveredAt, plan.postcode]);
  }
  return trail.map(([scan_type, at, location], i) => ({
    scan_id: pad('SCN-', from + i + 1, 7),
    shipment_id,
    scanned_at: ts(at),
    scan_type,
    location,
    depot_id: hub,
  }));
}

interface Evidence {
  scans: Fleet['scans'];
  delivery_events: Fleet['delivery_events'];
  proofs_of_delivery: Fleet['proofs_of_delivery'];
}

function buildEvidence(h: Helpers, shipments: Fleet['shipments'], stops: Fleet['stops'], plans: OrderPlan[]): Evidence {
  const planOf = new Map(plans.map((p) => [`SHP-${p.order_id.slice(4)}`, p]));
  const stopOf = new Map(stops.filter((s) => s.shipment_id).map((s) => [s.shipment_id!, s]));
  const ev: Evidence = { scans: [], delivery_events: [], proofs_of_delivery: [] };

  for (const s of shipments) {
    const plan = planOf.get(s.shipment_id)!;
    // An own-fleet parcel is delivered when the VAN says it was — the stop's
    // arrival time, which is the route's date. Not a guess from the dispatch.
    const stop = stopOf.get(s.shipment_id);
    const deliveredAt = stop?.arrived_at ? new Date(stop.arrived_at as string) : plan.delivered_at;

    ev.scans.push(...scansFor(s.shipment_id, plan, deliveredAt, ev.scans.length));
    if (!deliveredAt) continue;

    if (s.status === 'returned') {
      ev.delivery_events.push({
        event_id: pad('EVT-', ev.delivery_events.length + 1, 7),
        shipment_id: s.shipment_id, occurred_at: ts(deliveredAt), status: 'REFUSED',
        exception_code: 'REFUSED_AT_DOOR', notes: 'Customer declined the parcel.',
      });
      continue;
    }
    if (s.status !== 'delivered') continue;

    const exception = h.chance(0.04)
      ? h.pick(['DAMAGED_PACKAGING', 'LEFT_WITH_NEIGHBOUR', 'ACCESS_ISSUE'])
      : null;
    ev.delivery_events.push({
      event_id: pad('EVT-', ev.delivery_events.length + 1, 7),
      shipment_id: s.shipment_id, occurred_at: ts(deliveredAt), status: 'DELIVERED',
      exception_code: exception, notes: exception ? 'See exception code.' : null,
    });
    ev.proofs_of_delivery.push({
      pod_id: `POD-${s.shipment_id.slice(4)}`, shipment_id: s.shipment_id,
      captured_at: ts(deliveredAt), kind: h.chance(0.8) ? 'photo' : 'signature',
      uri: `s3://thb-pod/${iso(deliveredAt)}/${s.shipment_id}.jpg`,
      recipient_name: h.chance(0.6) ? 'Resident' : null,
    });
  }

  return ev;
}

/**
 * T1, THE INNOCENT HALF — and it is innocent, not falsified.
 *
 * `exception_code` is NULL here because the van genuinely reported nothing: the
 * trolley went over at the depot end of the round and the driver wrote it up
 * against the ROUND, at the end of the shift, in prose. A NULL in this column is
 * the ABSENCE OF A REPORT, not the presence of a clean delivery. Reading it as
 * the second is the whole mistake, and the row has to be spotless for the trap
 * to mean anything — so it is pinned rather than left to a 4 % dice roll that
 * could hand the answer over for free.
 */
function plantT1CleanDeliveryRow(ev: Evidence, shipments: Fleet['shipments']): void {
  const trap = shipments.find((s) => s.order_ref === ANCHORS.t1Order);
  if (!trap) return;
  const row = ev.delivery_events.find((e) => e.shipment_id === trap.shipment_id);
  if (!row) return;
  row.exception_code = null;
  row.notes = 'Handed to resident.';
}

// ── depot incidents ────────────────────────────────────────────────

function buildDepotIncidents(h: Helpers, routes: Fleet['routes']): Fleet['depot_incidents'] {
  const days = [...new Set(routes.map((r) => r.route_date as string))].sort();
  return Array.from({ length: 24 }, (_, i) => ({
    incident_id: pad('INC-', i + 1, 4),
    depot_id: DEPOTS[(i * 3) % DEPOTS.length].depot_id,
    occurred_on: days[(i * 5) % Math.max(days.length, 1)] ?? ANCHORS.t1DeliveredOn,
    kind: h.pick(['load', 'vehicle', 'facility', 'security']),
    body: h.pick(INCIDENT_BODIES),
    reported_by: h.pick(['depot.manager', 'shift.lead', 'h.and.s']),
  }));
}

// ── the entry point, which lists its steps ─────────────────────────

export function buildFleet(plans: OrderPlan[], wms: Wms): Fleet {
  const h = makeHelpers(SEED + STREAM.fleet);

  const net = buildNetwork(h);
  const rounds = groupOwnFleetRounds(plans);
  reserveT1Round(rounds);

  const { routes, stops } = buildRoutes(rounds, net);
  const driver_reports = buildDriverReports(h, routes);
  plantT1DriverReport(routes, driver_reports);

  const shipments = buildShipments(plans, wms);
  const evidence = buildEvidence(h, shipments, stops, plans);
  plantT1CleanDeliveryRow(evidence, shipments);

  return {
    carriers: CARRIERS,
    depots: DEPOTS.map(({ code, ...d }) => d),
    vehicles: net.vehicles,
    drivers: net.drivers,
    routes,
    shipments,
    stops,
    scans: evidence.scans,
    delivery_events: evidence.delivery_events,
    proofs_of_delivery: evidence.proofs_of_delivery,
    driver_reports,
    depot_incidents: buildDepotIncidents(h, routes),
  };
}
