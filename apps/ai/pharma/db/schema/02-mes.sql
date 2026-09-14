-- mrd_mes — FACILITIES & MANUFACTURING. Where it was made and what happened.
--
-- The facilities the picture called for live here rather than in a database of
-- their own, because the system that runs a production line is the same system
-- that knows which room the line is in and which equipment is on it. Splitting
-- them would model an org chart rather than a software estate.
--
-- WHAT MAKES THIS THE EXECUTION RECORD. A work order IS the batch record: the
-- ordered steps, who performed and who verified each one, the in-process
-- parameters and their limits, and the deviations raised while it ran. A
-- release decision that does not read this table is reading only the lab's
-- opinion of the batch.

create table sites (
  site_id            text primary key,      -- 'SITE-01'
  name               text not null,
  city               text not null,
  country            text not null,
  -- A GMP certificate has a validity window, and a run that straddles its
  -- expiry is a real regulatory problem rather than a paperwork one.
  gmp_certificate_no text not null,
  gmp_valid_from     date not null,
  gmp_valid_to       date not null
);

create table lines (
  line_id         text primary key,         -- 'LINE-01-T1'
  site_id         text not null references sites(site_id),
  name            text not null,
  building        text not null,
  room            text not null,
  cleanroom_grade text not null,            -- D | C | B | CNC
  capability      text not null             -- tablet | capsule | liquid | semisolid
);

create table equipment (
  equipment_id text primary key,            -- 'EQ-0112'
  line_id      text not null references lines(line_id),
  name         text not null,
  kind         text not null,               -- granulator | press | coater | filler | blender
  serial_no    text not null
);

-- IQ/OQ/PQ and periodic requalification. Every row has a `valid_until`, which
-- is what lets a run be placed on the wrong side of an expiry.
create table equipment_qualification (
  qualification_id serial primary key,
  equipment_id     text not null references equipment(equipment_id),
  kind             text not null,           -- IQ | OQ | PQ | requalification
  performed_on     date not null,
  valid_until      date not null,
  status           text not null,           -- passed | failed
  performed_by_ref text not null            -- SOFT KEY → mrd_hcm.employees
);

create table work_orders (
  work_order_id       text primary key,     -- 'WO-26-0417'
  line_id             text not null references lines(line_id),
  -- SOFT KEYS → mrd_erp. The product master is a different system.
  product_ref         text not null,
  lot_ref             text not null,
  planned_start       date not null,
  actual_start        date not null,
  actual_end          date not null,
  status              text not null,        -- completed | in_process | aborted
  -- SOFT KEY → mrd_reg.sop_revisions, and it is an EXACT revision id, captured
  -- at the time the order was issued. Storing the sop_id alone would make the
  -- as-of question unanswerable from this side.
  governing_sop_ref   text not null,
  -- Who signed the batch record, and when. The date is what the as-of lookup
  -- in mrd_reg is run against.
  signed_by_ref       text,                 -- SOFT KEY → mrd_hcm.employees
  signed_on           date
);

create table process_steps (
  step_id        text primary key,          -- 'WO-26-0417-S03'
  work_order_id  text not null references work_orders(work_order_id),
  seq            integer not null,
  name           text not null,
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  equipment_ref  text references equipment(equipment_id),
  -- GMP's four-eyes principle: the person who does it and the person who
  -- checks it must be different people. That is checkable from these two
  -- columns, which is the point of storing both.
  performed_by_ref text not null,           -- SOFT KEY → mrd_hcm.employees
  verified_by_ref  text not null,           -- SOFT KEY → mrd_hcm.employees
  unique (work_order_id, seq)
);

create table process_parameters (
  parameter_id serial primary key,
  step_id      text not null references process_steps(step_id),
  name         text not null,               -- compression force, inlet temp, LOD
  value_num    numeric(12,4) not null,
  unit         text not null,
  lower_limit  numeric(12,4) not null,
  upper_limit  numeric(12,4) not null,
  in_spec      boolean not null
);

create table deviations (
  deviation_id  text primary key,           -- 'DEV-26-0044'
  work_order_id text not null references work_orders(work_order_id),
  step_id       text references process_steps(step_id),
  raised_on     date not null,
  raised_by_ref text not null,              -- SOFT KEY → mrd_hcm.employees
  severity      text not null,              -- minor | major | critical
  description   text not null,
  status        text not null,              -- open | closed
  capa_ref      text                        -- SOFT KEY → mrd_qms.capas
);

create index on work_orders (lot_ref);
create index on work_orders (line_id, actual_start);
create index on process_steps (work_order_id);
create index on process_parameters (step_id);
create index on deviations (work_order_id);
create index on equipment_qualification (equipment_id, valid_until);
