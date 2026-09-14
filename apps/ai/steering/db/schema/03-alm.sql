-- vst_alm — REQUIREMENTS & ARCHITECTURE. ASPICE SYS.1, SYS.2 and SYS.3, plus
-- every trace link between them.
--
-- WHY ALL THREE ARE IN ONE DATABASE WHEN THE BRIEF NAMED THEM AS THREE THINGS.
-- In a real Tier-1 they are one tool — Codebeamer, Polarion, DOORS — and they
-- are one tool precisely BECAUSE the trace links are the product. Splitting
-- them across databases would model a vendor boundary that does not exist, and
-- would put a soft key on the one edge that most needs to be hard: the
-- customer-requirement → system-requirement link that every coverage answer is
-- computed over. Inside one database Postgres guarantees it. Across two it is a
-- string the generator has to get right, and a dangling trace link is silent
-- corruption — a coverage answer that is wrong without looking wrong.
--
-- So: REAL FOREIGN KEYS THROUGHOUT THIS FILE. Soft keys (`*_ref`) only where a
-- genuinely different vendor sits on the other side — a part number in vst_plm,
-- a programme in vst_crm, a software component in vst_scm.
--
-- ── THE VERSIONING SHAPE, AND WHY IT IS TWO TABLES AND NOT ONE ─────────────
--
-- A requirement has an identity that outlives its values. CR-K2-0101 is "rack
-- force capacity" in both Rev A and Rev B of the spec; what changed between
-- them is the number (7500 → 8000). So:
--
--     customer_requirements          the IDENTITY   — id, section, attribute, unit
--     customer_requirement_versions  the VALUES     — per spec revision
--
-- The alternative — one table keyed (cr_id, spec_revision_id) — reads fine
-- until `trace_cr_sr` has to point at it, because a trace link is made to a
-- REQUIREMENT and not to one revision of it, and a foreign key cannot reference
-- half a composite key. `system_requirements` is split the same way for the
-- same reason; two patterns for one problem is how a schema starts lying.
--
-- This is also what DOORS actually does, which is a reassuring place to end up.

-- ── SYS.1 · what the customer asked for ────────────────────────────────────

create table spec_documents (
  spec_id      text primary key,            -- 'CRS-KST-K2-001'
  customer_ref text not null,               -- SOFT KEY → vst_crm.customers
  program_ref  text not null,               -- SOFT KEY → vst_crm.programs
  title        text not null,
  kind         text not null,               -- CRS | interface-spec | safety-concept | test-spec
  issued_by    text not null
);

-- THE AS-OF RULE LIVES HERE. The revision that governs a decision is the one
-- in force WHEN THE DECISION WAS MADE, not the one in force now. A table with
-- only a revision number and a single date cannot answer "what did we promise
-- as of the Rev A freeze", and without that, trap T1 cannot exist.
create table spec_revisions (
  spec_revision_id text primary key,        -- 'CRS-KST-K2-001 Rev B' — exact, never a prefix
  spec_id          text not null references spec_documents(spec_id),
  revision         text not null,           -- 'Rev A'
  received_on      date not null,
  effective_from   date not null,
  effective_to     date,                    -- null = in force
  change_note      text,
  supersedes       text references spec_revisions(spec_revision_id),
  unique (spec_id, revision)
);

create table customer_requirements (
  cr_id     text primary key,               -- 'CR-K2-0101'
  spec_id   text not null references spec_documents(spec_id),
  section   text not null,                  -- '4.2.1'
  title     text not null,
  -- The machine-comparable part. A requirement with an `attribute` and a
  -- `unit` can be matched against a part capability or a past requirement;
  -- one with only prose cannot, and the honest answer for those is escalation.
  attribute text,                           -- 'rack_force_capacity'
  unit      text
);

create table customer_requirement_versions (
  cr_id              text not null references customer_requirements(cr_id),
  spec_revision_id   text not null references spec_revisions(spec_revision_id),
  text_body          text not null,
  operator           text,                  -- >= | <= | = | +/-
  value_num          numeric(12,3),
  condition          text,                  -- 'ISO 13674-1 weave, 100 km/h'
  verification_method text not null,        -- test | analysis | inspection | review
  asil               text not null,         -- QM | A | B | C | D
  priority           text not null,         -- must | should | nice
  status             text not null,         -- agreed | proposed | rejected | withdrawn
  primary key (cr_id, spec_revision_id)
);

create table cr_history (
  history_id text primary key,
  cr_id      text not null references customer_requirements(cr_id),
  changed_on date not null,
  field      text not null,
  from_value text,
  to_value   text,
  chr_ref    text,                          -- change request that carried it, if any
  author     text not null
);

-- ── SYS.2 · what that means for our system ─────────────────────────────────

create table system_requirements (
  sr_id            text primary key,        -- 'SR-EPS-0407'
  program_ref      text not null,           -- SOFT KEY → vst_crm.programs
  title            text not null,
  attribute        text,
  unit             text,
  owner_discipline text not null,           -- systems | software | hardware | calibration | safety
  -- Why this requirement exists. An SR with no parent CR is legitimate
  -- (derived), but it must say so here, or nobody can tell a derivation from
  -- an orphan — which is half of trap T7.
  derivation_note  text
);

create table system_requirement_versions (
  sr_id              text not null references system_requirements(sr_id),
  revision           integer not null,
  effective_from     date not null,
  effective_to       date,
  text_body          text not null,
  operator           text,
  value_num          numeric(12,3),
  condition          text,
  verification_method text not null,
  asil               text not null,
  status             text not null,         -- draft | reviewed | agreed | superseded
  maturity           text not null,         -- concept | specified | verified
  primary key (sr_id, revision)
);

-- The satisfies edge. ASPICE requires traceability in BOTH directions, which is
-- why coverage must be computed over the REQUIREMENTS that exist and not over
-- the links that exist — see T7.
create table trace_cr_sr (
  cr_id     text not null references customer_requirements(cr_id),
  sr_id     text not null references system_requirements(sr_id),
  coverage  text not null,                  -- full | partial
  rationale text,
  primary key (cr_id, sr_id)
);

-- ── the budgets ────────────────────────────────────────────────────────────
--
-- A budget is how "what must change" stops being an opinion and becomes
-- arithmetic: a parent target, a set of child allocations, and a delta.
--
-- CLOSURE IS REPORTED, NEVER ASSERTED. `db:check` computes the delta against
-- `tolerance` and consults `known_open`. An equality constraint here would have
-- failed on day one on the brief's own numbers — the control-side budget does
-- not close under any reading — and a check that fails on correct data gets
-- muted in week one and then protects nothing.
create table budgets (
  budget_id    text primary key,            -- 'BUD-K2-ONCTR-TRQ'
  parent_sr_id text not null references system_requirements(sr_id),
  program_ref  text not null,
  attribute    text not null,
  unit         text not null,
  target_value numeric(12,3) not null,
  operator     text not null,
  tolerance    numeric(12,3) not null,
  -- true = we already know the allocations do not meet the target, and the
  -- reason is in `closure_note`. An open budget is a fact about the design,
  -- not a bug in the data.
  known_open   boolean not null,
  closure_note text
);

create table budget_allocations (
  budget_id  text not null references budgets(budget_id),
  seq        integer not null,
  label      text not null,
  value      numeric(12,3) not null,
  -- measured | estimated | carryover | supplier-declared | datasheet | analysis.
  -- A budget that closes entirely on `estimated` allocations closes on paper.
  basis      text not null,
  element_id text,                          -- which element carries it, if any
  child_sr_id text references system_requirements(sr_id),
  primary key (budget_id, seq)
);

-- ── SYS.3 · the architecture ───────────────────────────────────────────────
--
-- The ASPICE SYS.3 purpose, near enough verbatim: establish an architecture and
-- identify WHICH SYSTEM REQUIREMENTS ARE ALLOCATED TO WHICH ELEMENTS. The
-- brief's "identify activity, identify elements, pass the activity to the
-- elements" is those base practices in plain words, and it is three tables:
-- `elements`, `activities`, `activity_allocations`.

create table architecture_versions (
  arch_id     text primary key,             -- 'ARCH-K2-v3'
  program_ref text not null,
  version     integer not null,
  created_on  date not null,
  status      text not null,                -- draft | reviewed | baselined | superseded
  supersedes  text references architecture_versions(arch_id)
);

create table elements (
  -- Globally unique and programme-segmented: 'EL-K2-ECU-01'. An element id that
  -- was only unique within its architecture would make every reference to it
  -- composite, and `activity_allocations` and `trace_sr_element` would both
  -- carry `arch_id` for no benefit.
  element_id  text primary key,
  arch_id     text not null references architecture_versions(arch_id),
  kind        text not null,                -- sensor | ecu | motor | gearbox | mechanical | software_domain | harness
  name        text not null,
  make_buy    text not null,
  asil        text not null,
  part_ref    text,                         -- SOFT KEY → vst_plm.parts
  -- carryover | modified | new. The answer the whole FDE capability is trying
  -- to produce for a NEW programme — recorded here for the ones already done,
  -- which is what makes past programmes comparable.
  reuse_class text not null
);

-- The activity catalogue is GLOBAL, not per-architecture: "damping" is the same
-- job on every programme, and that is what makes two programmes comparable at
-- all. What differs per programme is which element it lands on.
create table activities (
  activity_id text primary key,             -- 'ACT-DAMPING'
  name        text not null,
  kind        text not null,                -- control | monitoring | diagnostic | actuation | arbitration
  description text not null
);

create table activity_allocations (
  activity_id     text not null references activities(activity_id),
  element_id      text not null references elements(element_id),
  allocation_type text not null,            -- primary | support
  rationale       text,
  primary key (activity_id, element_id)
);

create table interfaces (
  interface_id text primary key,
  arch_id      text not null references architecture_versions(arch_id),
  from_element text not null references elements(element_id),
  to_element   text not null references elements(element_id),
  kind         text not null,               -- CAN-FD | SENT | PSI5 | analog | PWM | mechanical
  signal       text not null,
  rate_ms      numeric(8,2),
  asil         text not null
);

-- SYS.3's allocation base practice, as a table.
create table trace_sr_element (
  sr_id      text not null references system_requirements(sr_id),
  element_id text not null references elements(element_id),
  rationale  text,
  primary key (sr_id, element_id)
);

-- ── change control ─────────────────────────────────────────────────────────

create table change_requests (
  chr_id      text primary key,             -- 'CHR-2026-0191'
  program_ref text not null,
  raised_on   date not null,
  source      text not null,                -- customer | internal | defect | regulatory
  title       text not null,
  status      text not null,                -- open | assessed | approved | rejected | implemented
  decision    text,
  decided_on  date,
  -- SOFT KEY → vst_pmo.effort_records. What it actually took. Null while open,
  -- which is why the cost question can only be answered from CLOSED history.
  effort_ref  text
);

create table change_request_items (
  chr_id      text not null references change_requests(chr_id),
  seq         integer not null,
  target_kind text not null,                -- cr | sr | element | activity | interface | budget
  target_id   text not null,
  action      text not null,                -- add | modify | delete
  primary key (chr_id, seq)
);

-- ── A FORWARD REFERENCE, DECLARED LAST ────────────────────────────────────
--
-- `budget_allocations.element_id` names the element that carries an allocation,
-- and `elements` is declared further down this file than `budget_allocations`
-- is, so the constraint cannot go inline. It is added here instead.
--
-- WHY IT IS A REAL FOREIGN KEY AND NOT A COMMENT. It was a bare `text` column
-- for the first version of this schema, and that was a mistake with a cost:
-- four allocations pointed at `EL-ECU-01`, `EL-MOT-01` and `EL-TSENS-01` —
-- element ids from before the programme-segmented rename — and NOTHING
-- NOTICED. Postgres could not, because there was no constraint; `db:check`
-- could not, because its soft-key walk only covers references that CROSS a
-- database boundary, and this one does not.
--
-- That is the exact gap the partition creates: attention goes to the seams and
-- the references inside a database get assumed. Anything that can be a foreign
-- key should be one, precisely so the soft-key walk is left with only the
-- references that genuinely cannot be checked.
alter table budget_allocations
  add constraint budget_allocations_element_fk
  foreign key (element_id) references elements(element_id);

create index on customer_requirements (spec_id);
create index on customer_requirement_versions (spec_revision_id);
create index on system_requirements (program_ref);
create index on trace_cr_sr (sr_id);
create index on elements (arch_id);
create index on activity_allocations (element_id);
create index on trace_sr_element (element_id);
create index on change_requests (program_ref, status);
