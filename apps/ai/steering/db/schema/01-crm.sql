-- vst_crm — CUSTOMERS & PROGRAMMES. Who we sell to and what we sell into.
--
-- Stands for Salesforce. It is the smallest of the five and it is first in the
-- seeding order because everything else points AT a programme: a requirement
-- belongs to one, a part ships on one, an effort record was booked to one.
--
-- A PROGRAMME IS THE UNIT OF REUSE, which is why `eps_architecture` and
-- `force_class_n` sit here rather than in vst_plm. "What do we already have"
-- is nearly always answered by finding a programme with the same architecture
-- and a force class at or above the new one, and then asking what it shipped.

create table customers (
  customer_id   text primary key,           -- 'CUS-KST'
  name          text not null,
  country       text not null,
  kind          text not null,              -- OEM | tier1 | fleet
  relationship_since date not null
);

create table programs (
  program_id       text primary key,        -- 'PRG-KST-K2'
  customer_id      text not null references customers(customer_id),
  model            text not null,
  segment          text not null,           -- B | C | D | SUV | LCV
  -- The architecture decides which past programmes are comparable at all.
  -- A C-EPS carryover cannot answer an R-EPS question, however close the
  -- numbers look.
  eps_architecture text not null,           -- C-EPS | P-EPS | DP-EPS | R-EPS | SbW
  force_class_n    integer not null,        -- nominal rack force class
  region           text not null,           -- EU | NA | CN
  sop_on           date,                    -- null while still a bid
  volume_per_year  integer,
  status           text not null            -- bid | awarded | in-development | production | ended
);

create table rfqs (
  rfq_id      text primary key,             -- 'RFQ-2026-0044'
  customer_id text not null references customers(customer_id),
  program_id  text not null references programs(program_id),
  issued_on   date not null,
  due_on      date not null,
  status      text not null,                -- open | submitted | won | lost | withdrawn
  decided_on  date,
  lost_reason text
);

-- SOFT KEY → vst_alm.spec_documents. The specification the RFQ arrived with.
-- A string and not a foreign key because the requirements tool is a different
-- vendor's database, which is exactly the join an integration has to make in
-- code. `spec_revision` is stored EXACTLY: 'Rev A' and 'Rev B' of one spec are
-- two documents that say different things, and a prefix match merges them.
create table rfq_specs (
  rfq_id        text not null references rfqs(rfq_id),
  spec_ref      text not null,              -- 'CRS-KST-K2-001'
  spec_revision text not null,              -- 'Rev B'
  attached_on   date not null,
  primary key (rfq_id, spec_ref, spec_revision)
);

create table milestones (
  milestone_id text primary key,
  program_id   text not null references programs(program_id),
  name         text not null,               -- RFQ due | nomination | A-sample | B-sample | C-sample | PPAP | SOP
  planned_on   date not null,
  actual_on    date,
  status       text not null                -- planned | met | late | missed
);

create table contacts (
  contact_id  text primary key,
  customer_id text not null references customers(customer_id),
  full_name   text not null,
  role        text not null,
  email       text not null
);

create index on programs (customer_id);
create index on programs (eps_architecture, force_class_n);
create index on rfqs (program_id);
create index on milestones (program_id);
