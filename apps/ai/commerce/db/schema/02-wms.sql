-- thb_wms — WAREHOUSE MANAGEMENT. What was picked, what went in the box, and a
-- photograph of the box.
--
-- THE SOFT KEYS OUT OF HERE are `packages.order_ref`, `package_items.order_item_ref`,
-- `stock_levels.variant_ref` and `dispatch_manifests.carrier_ref`. Every one is
-- `text` with no foreign key, because each names a row in a different database.
-- The plan's table only lists `packages.order_ref` because that is the one a
-- resolution walks; the other three are the same species and `db:check` walks
-- all of them, since a soft key nobody checks is a soft key that silently rots.
--
-- WHY A PACK PHOTO IS NOT PROOF OF ANYTHING THE CUSTOMER ASKED ABOUT. It shows
-- the carton sealed and intact ON THE BENCH. Everything trap T1 is about
-- happened afterwards, on a trolley, at stop 14. A photo here and a photo at
-- the door are both real and they answer different questions — which is why the
-- two live in different databases and neither is called `proof`.

create table warehouses (
  warehouse_id text primary key,             -- 'WH-DAVENTRY'
  name         text not null,
  city         text not null,
  postcode     text not null
);

create table stock_levels (
  warehouse_id text not null references warehouses(warehouse_id),
  -- SOFT KEY → thb_shop.product_variants.variant_id
  variant_ref  text not null,
  on_hand      integer not null,
  allocated    integer not null,
  primary key (warehouse_id, variant_ref)
);

create table pick_tasks (
  pick_task_id text primary key,
  warehouse_id text not null references warehouses(warehouse_id),
  -- SOFT KEY → thb_shop.orders.order_id
  order_ref    text not null,
  picker       text not null,
  started_at   timestamptz not null,
  completed_at timestamptz,
  status       text not null                 -- picked | short | cancelled
);

create table dispatch_manifests (
  manifest_id  text primary key,
  warehouse_id text not null references warehouses(warehouse_id),
  -- SOFT KEY → thb_fleet.carriers.carrier_id
  carrier_ref  text not null,
  cutoff_at    timestamptz not null,
  dispatched_at timestamptz,
  seal_no      text not null
);

create table packages (
  package_id   text primary key,             -- 'PKG-0104471-1'
  warehouse_id text not null references warehouses(warehouse_id),
  pick_task_id text not null references pick_tasks(pick_task_id),
  manifest_id  text references dispatch_manifests(manifest_id),
  -- SOFT KEY → thb_shop.orders.order_id. The one the plan names, because it is
  -- the hop a resolution actually walks: order → package → shipment.
  order_ref    text not null,
  packed_at    timestamptz not null,
  weight_g     integer not null,
  carton_type  text not null,                -- small | medium | large | fragile
  double_walled boolean not null
);

create table package_items (
  package_id      text not null references packages(package_id) on delete cascade,
  -- SOFT KEY → thb_shop.order_items.order_item_id
  order_item_ref  text not null,
  -- SOFT KEY → thb_shop.product_variants.variant_id
  variant_ref     text not null,
  qty             integer not null,
  primary key (package_id, order_item_ref)
);

create table pack_photos (
  photo_id   text primary key,
  package_id text not null references packages(package_id) on delete cascade,
  taken_at   timestamptz not null,
  uri        text not null,
  checksum   text not null
);

create index packages_order_ref_ix   on packages(order_ref);
create index pick_tasks_order_ref_ix on pick_tasks(order_ref);
create index package_items_item_ix   on package_items(order_item_ref);
