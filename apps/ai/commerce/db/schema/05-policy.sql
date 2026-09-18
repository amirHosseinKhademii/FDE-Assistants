-- thb_policy — THE POLICY & CONFIG STORE. Policy as ROWS.
--
-- WHY THIS IS A DATABASE OF ITS OWN, answering PLAN.md §14 q1 honestly rather
-- than leaving the gate open. `thb_policy` is not a source system in the way
-- the other four are — nobody transacts against it, and a real retailer would
-- very often keep these tables inside the storefront's own schema. The reason
-- it is split out is a TEACHING reason and it should be named as one: the
-- engagement's central structural point is that policy lives in two places and
-- they disagree, and a reader who has to be told that `return_windows` is
-- configuration rather than prose has already missed it. Its own database makes
-- the claim structural instead of asserted. A customer's estate might well
-- merge it back, and merging it would cost nothing but the lesson.
--
-- THE OTHER HALF OF EVERY ROW HERE IS A DOCUMENT. `return_windows` says
-- electronics is 14 days, effective 2025-03-01. The published returns policy —
-- rev 2024-11, still on the website, still what the customer was shown — says
-- "any item within 30 days". Both are true statements about Thornbury. One
-- governs the returns tool; the other is what the company can be held to.
-- NEITHER IS THE ANSWER: the answer is that they disagree, here is each with
-- its source, and a human decides. That is trap T2, and it is why
-- `search_policy` and `get_policy_rules` are two tools — a single "policy" tool
-- would have to pick, and picking is the failure.
--
-- NO SOFT KEYS OUT, except `carrier_sla.carrier_ref`. Configuration points at
-- nothing; things point at it.

create table policy_documents (
  document_id text primary key,              -- 'DOC-RETURNS'
  slug        text not null unique,
  title       text not null,
  kind        text not null,                 -- published | internal | bulletin
  owner       text not null
);

-- The ROW that says a document exists and which revision was live when. The
-- prose itself is in docs/commerce/corpus/ and is the other session's to write;
-- this is the half that lets a date be checked rather than believed.
create table policy_versions (
  version_id     text primary key,
  document_id    text not null references policy_documents(document_id) on delete cascade,
  revision       text not null,              -- '2024-11'
  effective_from date not null,
  effective_to   date,
  published      boolean not null,
  summary        text not null
);

-- TRAP T2, THE ROW HALF. electronics = 14 days. The published document says 30.
create table return_windows (
  window_id      text primary key,
  category       text not null,              -- matches thb_shop.categories.name
  channel        text not null,              -- any | web | phone
  window_days    integer not null,
  effective_from date not null,
  effective_to   date
);

create table refund_rules (
  rule_id           text primary key,
  code              text not null unique,    -- 'RR-DAMAGED-ARRIVAL'
  applies_to        text not null,
  condition         text not null,
  outcome           text not null,
  requires_approval boolean not null,
  effective_from    date not null
);

create table category_overrides (
  override_id    text primary key,
  category       text not null,
  override_kind  text not null,              -- window | approval | goodwill
  value_text     text not null,
  note           text not null,
  effective_from date not null
);

-- THE ONE PLACE A DECIMAL SURVIVES IN THE WHOLE ESTATE.
--
-- `penalty_rate` is a RATE, not money: 1.5 % of the order value per working day
-- late. It cannot be pence. So it is `numeric`, `pg` will hand it back as the
-- STRING '0.0150', and the row-shape interface types it `Numeric` and routes it
-- through a normaliser rather than pretending pg returns a number. The cap it
-- is applied against, `penalty_cap_pence`, is money and is an integer.
--
-- `working_days` is the other half of trap T6: the SLA counts WORKING days,
-- `thb_shop.orders.promised_by` is a calendar date, and `bank_holidays` below
-- is what makes the two reconcilable. Count calendar days over the August bank
-- holiday weekend and you invent a penalty that is not owed.
create table carrier_sla (
  sla_id            text primary key,
  -- SOFT KEY → thb_fleet.carriers.carrier_id
  carrier_ref       text not null,
  service_level     text not null,
  working_days      integer not null,
  penalty_rate      numeric(6,4) not null,
  penalty_cap_pence integer not null,
  effective_from    date not null
);

create table goodwill_limits (
  limit_id                    text primary key,
  tier                        text not null,   -- standard | priority
  max_pence                   integer not null,
  requires_approval_above_pence integer not null,
  effective_from              date not null
);

create table approval_thresholds (
  threshold_id   text primary key,
  action         text not null,              -- refund | goodwill | replacement
  max_pence      integer not null,
  approver_role  text not null,
  effective_from date not null
);

-- TRAP T6'S FIXTURE. England & Wales, and the jurisdiction column is not
-- padding: Scotland's August holiday is the FIRST Monday and England's is the
-- LAST, so "the August bank holiday" is two different dates and a fleet that
-- runs six metros crosses both. A date-arithmetic check needs to say which.
create table bank_holidays (
  holiday_date date not null,
  jurisdiction text not null,                -- england-and-wales | scotland
  name         text not null,
  primary key (holiday_date, jurisdiction)
);

create index return_windows_cat_ix on return_windows(category);
create index carrier_sla_ref_ix    on carrier_sla(carrier_ref);
