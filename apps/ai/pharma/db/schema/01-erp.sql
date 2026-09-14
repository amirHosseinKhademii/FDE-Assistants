-- mrd_erp — PRODUCTS & MATERIALS. The product master and what went into it.
--
-- THE LOT CODE IS THE IDENTIFIER THAT MUST NEVER BE MATCHED LOOSELY:
--
--     LOT-IBU200-2609-B
--         │      │    └ sub-batch, one uppercase character
--         │      └───── campaign, YYMM
--         └──────────── product code
--
-- Two sub-batches of one campaign can go to different markets against
-- different specification versions — the EU authorisation for ibuprofen 200 mg
-- carries a tighter dissolution limit than the US one. `-B` and `-D` are one
-- character apart, both genuine, and a fuzzy match returns the wrong one with
-- every number after it wrong too. This is the same lesson as form editions in
-- packages/insurance/src/config/form-id.ts, one notch sharper: there the
-- near-identical documents differed by edition, here they differ by market.

create table suppliers (
  supplier_id        text primary key,      -- 'SUP-04'
  name               text not null,
  country            text not null,
  qualified_from     date not null,
  -- A supplier can be disqualified AFTER material from them has been consumed.
  -- That is not an edge case, it is the normal shape of a supplier audit
  -- finding, and it is why this column is nullable rather than a status enum.
  disqualified_on    date,
  disqualified_reason text
);

create table ingredients (
  ingredient_id  text primary key,          -- 'ING-API-IBU'
  name           text not null,
  kind           text not null,             -- API | excipient
  cas_number     text,
  -- SOFT KEY → mrd_reg.standards, e.g. the USP monograph it must conform to.
  compendial_ref text
);

create table products (
  product_id   text primary key,            -- 'PRD-00142'
  product_code text not null unique,        -- 'IBU200' — the segment inside a lot code
  name         text not null,
  dosage_form  text not null,               -- tablet | capsule | oral suspension | cream
  strength     text not null,
  atc_code     text,
  status       text not null                -- commercial | development | discontinued
);

create table market_authorisations (
  ma_id       text primary key,
  product_id  text not null references products(product_id),
  market      text not null,                -- US | EU
  ma_number   text not null,
  holder      text not null,
  status      text not null,                -- valid | lapsed
  valid_from  date not null,
  valid_to    date,
  -- SOFT KEY → mrd_qms.specification_versions. Which specification the
  -- authorisation was granted against — NOT necessarily the current one.
  spec_version_ref text not null,
  unique (product_id, market)
);

create table bill_of_materials (
  bom_id         serial primary key,
  product_id     text not null references products(product_id),
  ingredient_id  text not null references ingredients(ingredient_id),
  version        integer not null,
  effective_from date not null,
  effective_to   date,
  qty_mg         numeric(10,3) not null,
  tolerance_pct  numeric(5,2) not null
);

create table material_lots (
  material_lot_id text primary key,         -- 'MLOT-2405-0031'
  ingredient_id   text not null references ingredients(ingredient_id),
  supplier_id     text not null references suppliers(supplier_id),
  received_on     date not null,
  quantity_kg     numeric(10,3) not null,
  coa_ref         text not null,            -- supplier certificate of analysis
  status          text not null             -- released | quarantine | rejected
);

create table product_lots (
  lot_id          text primary key,         -- 'LOT-IBU200-2609-B'
  product_id      text not null references products(product_id),
  campaign        text not null,            -- YYMM
  sub_batch       text not null,            -- one character
  market          text not null,            -- US | EU
  quantity_units  integer not null,
  manufactured_on date not null,
  expiry_on       date not null,
  -- SOFT KEYS. The run that made it lives in mrd_mes; the specification it was
  -- made to lives in mrd_qms. Neither can be a foreign key: different database.
  work_order_ref  text not null,
  spec_version_ref text not null,
  status          text not null             -- in_process | quarantine | released | rejected
);

-- Which material lots went into which product lot. This is the table that
-- makes a supplier disqualification traceable forward to finished goods.
create table lot_material_consumption (
  consumption_id  serial primary key,
  lot_id          text not null references product_lots(lot_id),
  material_lot_id text not null references material_lots(material_lot_id),
  quantity_kg     numeric(10,3) not null,
  unique (lot_id, material_lot_id)
);

create index on product_lots (product_id, campaign);
create index on material_lots (supplier_id);
create index on lot_material_consumption (material_lot_id);
