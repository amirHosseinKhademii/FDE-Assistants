-- thb_fleet — TRANSPORT & TELEMATICS. The van, the round it drove, and every
-- record of what happened on it.
--
-- THIS FILE IS WHERE TRAP T1 LIVES, AND THE SHAPE OF THE TABLES IS THE TRAP.
--
--   shipments      → delivery_events   says DELIVERED, exception_code NULL
--                  → proofs_of_delivery a photograph at the door
--   shipments      → stops → routes    → driver_reports
--                                        "trolley tipped at stop 14, two
--                                         parcels re-stacked"
--
-- Both are true. The first is what the shipment row knows about itself, and it
-- is clean. The second is what the DRIVER wrote about the ROUND, and it names a
-- stop, not an order. Nothing on the shipment row points at it: the only path
-- is shipment → its stop → that stop's route → that route's reports for that
-- day, and then noticing that the stop's `seq` is the number in the driver's
-- sentence. An assistant that reads the shipment and stops there denies a
-- claim that the company's own records support, which is failure #2 in §1 of
-- the plan — the expensive one, because it becomes a complaint and sometimes a
-- regulator.
--
-- So `get_delivery` walks it and the model does not have to know to. That is
-- the tool's job. A tool that returns the shipment row and calls itself
-- "delivery" is the bug, not the model that believed it.
--
-- THE SOFT KEYS OUT OF HERE are `shipments.order_ref` and
-- `shipments.package_ref`. Text, no FK, different databases.

create table carriers (
  carrier_id text primary key,               -- 'CAR-THB' | 'CAR-NDX' | 'CAR-PCL'
  name       text not null,
  kind       text not null                   -- own | contracted
);

create table depots (
  depot_id   text primary key,
  carrier_id text not null references carriers(carrier_id),
  name       text not null,
  metro      text not null,                  -- the six metros the own fleet runs
  postcode   text not null
);

create table vehicles (
  vehicle_id       text primary key,
  depot_id         text not null references depots(depot_id),
  reg_plate        text not null unique,
  kind             text not null,            -- van | luton
  capacity_parcels integer not null
);

create table drivers (
  driver_id  text primary key,
  depot_id   text not null references depots(depot_id),
  full_name  text not null,
  licence_no text not null unique
);

create table routes (
  route_id      text primary key,            -- 'RTE-20260831-BRM-03'
  depot_id      text not null references depots(depot_id),
  vehicle_id    text not null references vehicles(vehicle_id),
  driver_id     text not null references drivers(driver_id),
  route_date    date not null,
  planned_stops integer not null,
  started_at    timestamptz not null,
  finished_at   timestamptz
);

create table shipments (
  shipment_id   text primary key,            -- 'SHP-0104471'
  carrier_id    text not null references carriers(carrier_id),
  -- SOFT KEY → thb_shop.orders.order_id
  order_ref     text not null,
  -- SOFT KEY → thb_wms.packages.package_id
  package_ref   text not null,
  tracking_no   text not null unique,
  service_level text not null,
  dispatched_at timestamptz not null,
  promised_by   date not null,
  status        text not null                -- delivered | in_transit | returned
);

-- `stop_id` is the row, `seq` is WHAT THE DRIVER CALLS IT. The driver's report
-- says "stop 14" and means `seq = 14` on that route — not a stop_id, not an
-- order number. The unique constraint is what makes "stop 14 of this route" a
-- single row rather than a guess.
create table stops (
  stop_id     text primary key,
  route_id    text not null references routes(route_id) on delete cascade,
  seq         integer not null,
  shipment_id text references shipments(shipment_id),
  address_line text not null,
  postcode    text not null,
  arrived_at  timestamptz,
  departed_at timestamptz,
  unique (route_id, seq)
);

create table scans (
  scan_id     text primary key,
  shipment_id text not null references shipments(shipment_id) on delete cascade,
  scanned_at  timestamptz not null,
  scan_type   text not null,                 -- accepted | at_depot | out_for_delivery | delivered
  location    text not null,
  depot_id    text references depots(depot_id)
);

-- `exception_code` NULL means the van reported nothing wrong. It does NOT mean
-- nothing went wrong: see the header, and see `driver_reports` below.
create table delivery_events (
  event_id       text primary key,
  shipment_id    text not null references shipments(shipment_id) on delete cascade,
  occurred_at    timestamptz not null,
  status         text not null,              -- DELIVERED | ATTEMPTED | REFUSED
  exception_code text,
  notes          text
);

create table proofs_of_delivery (
  pod_id         text primary key,
  shipment_id    text not null unique references shipments(shipment_id) on delete cascade,
  captured_at    timestamptz not null,
  kind           text not null,              -- photo | signature
  uri            text not null,
  recipient_name text
);

-- FREE TEXT, WRITTEN BY A HUMAN, ABOUT A ROUND — never about an order. This is
-- the other half of T1 and the reason it cannot be reached from the shipment.
create table driver_reports (
  report_id   text primary key,
  route_id    text not null references routes(route_id) on delete cascade,
  driver_id   text not null references drivers(driver_id),
  reported_at timestamptz not null,
  severity    text not null,                 -- info | minor | major
  body        text not null
);

create table depot_incidents (
  incident_id text primary key,
  depot_id    text not null references depots(depot_id),
  occurred_on date not null,
  kind        text not null,
  body        text not null,
  reported_by text not null
);

create index shipments_order_ref_ix on shipments(order_ref);
create index shipments_pkg_ref_ix   on shipments(package_ref);
create index stops_shipment_ix      on stops(shipment_id);
create index stops_route_ix         on stops(route_id);
create index scans_shipment_ix      on scans(shipment_id);
create index devents_shipment_ix    on delivery_events(shipment_id);
create index dreports_route_ix      on driver_reports(route_id);
create index routes_date_ix         on routes(route_date);
