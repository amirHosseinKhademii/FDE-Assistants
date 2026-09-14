-- vst_plm — HARDWARE. Parts, what they can do, and what we can PROVE they can do.
--
-- THE TWO-TABLE SPLIT THAT THE WHOLE DATABASE EXISTS FOR:
--
--     part_capabilities   what the datasheet CLAIMS
--     qualification_tests what a test RIG DEMONSTRATED
--
-- These disagree, routinely and legitimately, and the gap between them is where
-- a reuse answer goes wrong. `VS-GEAR-3301-C` claims 8000 N by analysis and has
-- demonstrated 7600 N on a rig. Reading only the first table reports a clean
-- carryover for an 8000 N requirement and is wrong by 400 N — which is trap T2,
-- and it is a trap precisely because the claimed number is not a lie. Nobody
-- fabricated it; it is an analysis result that no test has caught up with.
--
-- `qualified` on a capability row is the flag that says which side of that gap
-- the row sits on. A capability with `source = 'analysis'` and
-- `qualified = false` is an engineering opinion, not evidence.
--
-- THE SECOND THING THIS DATABASE KNOWS THAT A BOM DOES NOT: `lifecycle`. A part
-- can be structurally perfect for a new programme and impossible to buy. Trap
-- T6 is the cheapest matching ECU sitting at 'ltb-passed' — last-time-buy
-- already gone — while its replacement costs more. Reuse analysis that reads
-- structure and not status lands there every time.

create table component_suppliers (
  supplier_id text primary key,             -- 'CSUP-07'
  name        text not null,
  country     text not null,
  status      text not null,                -- approved | conditional | exited
  approved_on date not null
);

create table product_lines (
  line_id       text primary key,           -- 'PL-REPS'
  architecture  text not null,              -- C-EPS | P-EPS | DP-EPS | R-EPS | SbW
  name          text not null,
  force_class_n integer not null,
  introduced_on date not null,
  status        text not null               -- current | legacy | development
);

create table parts (
  part_no       text primary key,           -- 'VS-GEAR-3301-C' — revision in the suffix
  kind          text not null,              -- ecu | motor | torque_sensor | gearbox | rack | housing | harness | pinion
  name          text not null,
  line_id       text references product_lines(line_id),
  -- production | prototype | ltb-passed | obsolete.
  -- 'ltb-passed' means the last-time-buy window has CLOSED: the part is still
  -- in drawings, still in BOMs, and cannot be ordered. See T6 above.
  lifecycle     text not null,
  make_buy      text not null,              -- make | buy
  supplier_id   text references component_suppliers(supplier_id),
  unit_cost_eur numeric(10,2) not null,
  lead_time_days integer not null,
  released_on   date not null
);

-- What the part is CLAIMED to do. One row per attribute.
create table part_capabilities (
  part_no   text not null references parts(part_no),
  attribute text not null,                  -- max_rack_force_n | cont_current_a | peak_motor_torque_nm
                                            -- | latency_ms | road_wheel_angle_deg | temp_min_c | temp_max_c
  value     numeric(12,3) not null,
  unit      text not null,
  -- datasheet | test | analysis | supplier-declared.
  -- 'analysis' is the one to be suspicious of: it is a calculation, not a rig.
  source    text not null,
  -- Does test evidence back this number? NOT a duplicate of `source` — a
  -- datasheet figure can be qualified and an analysis figure can be qualified
  -- once a test catches up. This column is the join to `qualification_tests`
  -- that a naive reuse query forgets to make.
  qualified boolean not null,
  primary key (part_no, attribute)
);

create table assemblies (
  assembly_no text primary key,             -- 'VS-ASM-REPS-0042'
  name        text not null,
  line_id     text not null references product_lines(line_id),
  revision    text not null
);

create table bom_lines (
  assembly_no text not null references assemblies(assembly_no),
  part_no     text not null references parts(part_no),
  qty         integer not null,
  position    text not null,
  primary key (assembly_no, part_no, position)
);

-- What a rig actually demonstrated. `max_value_demonstrated` is the number that
-- decides a reuse question; `result` is the pass/fail against the condition the
-- test was run at, which is a WEAKER statement and is easy to mistake for the
-- stronger one.
create table qualification_tests (
  test_id   text primary key,               -- 'QT-2023-0188'
  part_no   text not null references parts(part_no),
  standard  text not null,                  -- ISO 16750-3 | LV124 | ISO 26262-5 | internal
  attribute text not null,                  -- matches part_capabilities.attribute
  condition text not null,
  max_value_demonstrated numeric(12,3),
  unit      text not null,
  result    text not null,                  -- pass | fail | partial
  tested_on date not null,
  report_ref text not null
);

-- SOFT KEY → vst_crm.programs. Which part shipped on which programme, and from
-- when. This is how "have we done this before" is answered for hardware.
create table part_program_usage (
  part_no        text not null references parts(part_no),
  program_ref    text not null,
  from_sop       date not null,
  volume_per_year integer not null,
  primary key (part_no, program_ref)
);

create index on parts (kind, lifecycle);
create index on part_capabilities (attribute);
create index on qualification_tests (part_no, attribute);
create index on part_program_usage (program_ref);
