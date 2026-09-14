-- mrd_tms — DISTRIBUTION & FLEET. Where it went, in what, and how cold.
--
-- The trucks the picture called for are here rather than in their own database,
-- because one TMS normally covers both the shipment and the vehicle that moves
-- it. THIS IS THE LEAST COMFORTABLE OF THE THREE FOLDS: telematics is often a
-- genuinely separate vendor with its own database and its own outages, and if
-- the cold-chain story gets interesting that is the first thing to split out.
-- `telematics_readings` is kept as its own table partly so that split is a
-- move rather than a rewrite.
--
-- A GAP IN THE READINGS IS DATA, NOT A BUG. A refrigerated truck reporting
-- every fifteen minutes and then nothing for two hours has told you something,
-- and an assistant that treats missing rows as "no excursion" has the failure
-- mode backwards. The generator plants exactly one such gap.

create table warehouses (
  warehouse_id   text primary key,          -- 'WH-EU-01'
  name           text not null,
  site_ref       text not null,             -- SOFT KEY → mrd_mes.sites
  country        text not null,
  -- Good Distribution Practice licence. A shipment out of a warehouse whose
  -- licence has lapsed is its own category of problem.
  gdp_licence_no text not null,
  licence_valid_to date not null
);

create table consignees (
  consignee_id text primary key,            -- 'CNS-0031'
  name         text not null,
  country      text not null,
  market       text not null,               -- US | EU
  licence_no   text not null,
  kind         text not null                -- wholesaler | hospital | pharmacy_chain
);

create table trucks (
  truck_id           text primary key,      -- 'TRK-07'
  plate              text not null,
  make               text not null,
  model              text not null,
  refrigerated       boolean not null,
  telematics_unit_id text,
  in_service_from    date not null,
  in_service_to      date
);

create table drivers (
  driver_id    text primary key,
  full_name    text not null,
  licence_no   text not null,
  -- Nullable on purpose: some drivers are contractors and have no HRIS record.
  -- A soft key that is legitimately absent is different from one that dangles,
  -- and db:check has to know the difference.
  employee_ref text
);

create table shipments (
  shipment_id      text primary key,        -- 'SHP-26-1180'
  warehouse_id     text not null references warehouses(warehouse_id),
  consignee_id     text not null references consignees(consignee_id),
  truck_id         text not null references trucks(truck_id),
  driver_id        text not null references drivers(driver_id),
  dispatched_on    date not null,
  delivered_on     date,
  status           text not null,           -- in_transit | delivered | held
  -- The storage window the product requires. Ambient product carries a wide
  -- one; the cold-chain products carry 2–8 °C.
  required_temp_min numeric(5,2) not null,
  required_temp_max numeric(5,2) not null
);

create table shipment_lines (
  line_id        serial primary key,
  shipment_id    text not null references shipments(shipment_id),
  lot_ref        text not null,             -- SOFT KEY → mrd_erp.product_lots
  quantity_units integer not null,
  sscc           text not null,
  unique (shipment_id, lot_ref)
);

-- A shipment is made of legs. An excursion happens on ONE of them, which is
-- why this is not two timestamps on the shipment row.
create table routes (
  route_id    serial primary key,
  shipment_id text not null references shipments(shipment_id),
  seq         integer not null,
  from_location text not null,
  to_location   text not null,
  departed_at timestamptz not null,
  arrived_at  timestamptz not null,
  distance_km numeric(8,1) not null,
  unique (shipment_id, seq)
);

create table telematics_readings (
  reading_id  bigserial primary key,
  truck_id    text not null references trucks(truck_id),
  shipment_id text not null references shipments(shipment_id),
  recorded_at timestamptz not null,
  temp_c      numeric(5,2) not null,
  gps_lat     numeric(9,6) not null,
  gps_lon     numeric(9,6) not null
);

create index on shipment_lines (lot_ref);
create index on routes (shipment_id);
create index on telematics_readings (shipment_id, recorded_at);
