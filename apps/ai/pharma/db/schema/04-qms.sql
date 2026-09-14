-- mrd_qms — QUALITY. The hub: this is the system that points at every other.
--
-- Almost every column ending in `_ref` here crosses a database boundary, which
-- is the whole reason the estate is six databases rather than six schemas. A
-- disposition record names a lot (mrd_erp), the person who decided (mrd_hcm),
-- and the procedure revision they decided under (mrd_reg). Postgres cannot
-- check any of those. `pnpm db:check` does, and carries a negative control
-- proving it can still fail.
--
-- ON RETESTS, which is the one piece of domain judgment encoded in this schema.
-- `qc_tests.retest_of_test_id` points a repeat test at the original. Under
-- 21 CFR 211.192 an out-of-specification result may not simply be retested
-- until it passes: the original result must be investigated first, and the
-- investigation must reach a documented conclusion about whether the OOS was
-- laboratory error. A retest with no `oos_investigations` row against the
-- original is therefore a finding, and the schema makes it a *visible* one
-- rather than something you would have to already suspect.

create table specifications (
  spec_id     text primary key,             -- 'SPEC-IBU200'
  product_ref text not null,                -- SOFT KEY → mrd_erp.products
  market      text not null,                -- US | EU
  title       text not null
);

create table specification_versions (
  spec_version_id text primary key,         -- 'SPEC-IBU200-v4'
  spec_id         text not null references specifications(spec_id),
  version         integer not null,
  effective_from  date not null,
  effective_to    date,
  -- SOFT KEY → mrd_reg.standards. The compendial monograph behind the limits.
  standard_ref    text,
  unique (spec_id, version)
);

create table test_methods (
  method_id      text primary key,          -- 'MTH-DISS'
  code           text not null,
  title          text not null,
  technique      text not null,             -- HPLC | UV | dissolution | titration | microbiology
  compendial_ref text                       -- SOFT KEY → mrd_reg.standard_clauses
);

create table spec_limits (
  limit_id        serial primary key,
  spec_version_id text not null references specification_versions(spec_version_id),
  method_id       text not null references test_methods(method_id),
  attribute       text not null,            -- assay | dissolution | uniformity | water | micro
  lower_limit     numeric(12,4),
  upper_limit     numeric(12,4),
  unit            text not null,
  unique (spec_version_id, attribute)
);

create table qc_tests (
  test_id          text primary key,        -- 'QC-26-004412'
  lot_ref          text not null,           -- SOFT KEY → mrd_erp.product_lots
  method_id        text not null references test_methods(method_id),
  attribute        text not null,
  stage            text not null,           -- in_process | release | stability
  sampled_on       date not null,
  tested_on        date not null,
  analyst_ref      text not null,           -- SOFT KEY → mrd_hcm.employees
  spec_version_ref text not null,           -- SOFT KEY → specification_versions
  result_num       numeric(12,4) not null,
  unit             text not null,
  in_spec          boolean not null,
  -- A retest points at the test it repeats. See the note at the top of this file.
  retest_of_test_id text references qc_tests(test_id)
);

create table oos_investigations (
  oos_id          text primary key,         -- 'OOS-26-0007'
  test_id         text not null references qc_tests(test_id),
  opened_on       date not null,
  closed_on       date,
  phase           text not null,            -- IA | IB | II
  root_cause      text,
  outcome         text,                     -- lab_error | confirmed_oos | inconclusive
  approved_by_ref text                      -- SOFT KEY → mrd_hcm.employees
);

create table batch_dispositions (
  disposition_id    text primary key,       -- 'DISP-26-0311'
  lot_ref           text not null,          -- SOFT KEY → mrd_erp.product_lots
  market            text not null,          -- US | EU
  decision          text not null,          -- released | rejected | quarantine
  decided_on        date not null,
  decided_by_ref    text not null,          -- SOFT KEY → mrd_hcm.employees
  -- SOFT KEY → mrd_reg.sop_revisions. The EXACT revision id in force at
  -- decided_on, captured at decision time.
  governing_sop_ref text not null,
  -- EU only: certification by a Qualified Person under Annex 16. A US release
  -- and an EU certification are different acts by different rules, and one
  -- boolean is cheaper than pretending they are the same.
  qp_certified      boolean not null default false,
  unique (lot_ref, market)
);

create table capas (
  capa_id     text primary key,             -- 'CAPA-26-0019'
  opened_on   date not null,
  due_on      date not null,
  closed_on   date,
  source      text not null,                -- deviation | oos | audit | complaint
  source_ref  text not null,                -- the id in whichever system raised it
  owner_ref   text not null,                -- SOFT KEY → mrd_hcm.employees
  description text not null,
  status      text not null                 -- open | overdue | closed
);

-- How a SOP revision comes into force. mrd_reg.sop_revisions points back here
-- by change_control_ref; the two together are a closed loop across a database
-- boundary, which is exactly the kind of thing db:check has to walk.
create table change_controls (
  change_id        text primary key,        -- 'CC-26-0008'
  opened_on        date not null,
  implemented_on   date,
  description      text not null,
  affected_sop_ref text,                    -- SOFT KEY → mrd_reg.sops
  approved_by_ref  text not null,           -- SOFT KEY → mrd_hcm.employees
  status           text not null            -- open | implemented | cancelled
);

create table audits (
  audit_id         text primary key,        -- 'AUD-26-0003'
  kind             text not null,           -- internal | supplier | regulatory
  subject_ref      text not null,           -- a supplier id, a site id
  performed_on     date not null,
  lead_auditor_ref text not null,           -- SOFT KEY → mrd_hcm.employees
  findings_count   integer not null,
  outcome          text not null            -- satisfactory | minor | major | critical
);

create index on qc_tests (lot_ref, attribute);
create index on qc_tests (retest_of_test_id);
create index on spec_limits (spec_version_id);
create index on batch_dispositions (lot_ref);
create index on capas (source_ref);

-- ---------------------------------------------------------------------------
-- Complaints — added 2026-09-12, INFRASTRUCTURE ONLY.
--
-- Nothing reads this yet. It exists so two capabilities have somewhere to land
-- without inventing a table at the same time as the feature: complaint-to-recall
-- (BOTTLENECK-2 §6) and prompt-injection guardrails, which need an untrusted
-- FREE-TEXT field that reaches the model. `narrative` is that field.
--
-- THE HARD PART OF A COMPLAINT IS THAT IT ARRIVES INCOMPLETE. A pharmacist
-- telephones about "the round white ones, the box said something like 2609".
-- So `lot_ref` is NULLABLE and `lot_stated` holds what the caller actually
-- said — which may be a real lot, a malformed one, or nothing. A schema that
-- required a resolved lot id would have quietly designed the triage problem
-- out of existence, and triage is the whole job.
create table complaints (
  complaint_id     text primary key,       -- 'CMP-26-0014'
  received_on      date not null,
  channel          text not null,          -- phone | email | portal | field_alert
  reporter_kind    text not null,          -- patient | pharmacist | hospital | wholesaler | prescriber
  reporter_ref     text,                   -- SOFT KEY → mrd_tms.consignees, null for a patient
  market           text not null,          -- EU | US
  product_ref      text,                   -- SOFT KEY → mrd_erp.products, null when undetermined
  lot_ref          text,                   -- SOFT KEY → mrd_erp.product_lots, NULL when unresolved
  lot_stated       text,                   -- what the caller said, verbatim and possibly wrong
  category         text not null,          -- quality_defect | adverse_event | packaging | efficacy | counterfeit_suspect
  -- Separate from `category` on purpose: a quality defect can ALSO be an
  -- adverse event, and it is the adverse-event flag that starts a reporting
  -- clock. Folding it into one column would make a 15-day obligation depend on
  -- which label somebody picked first.
  is_adverse_event boolean not null,
  severity         text not null,          -- minor | major | critical
  narrative        text not null,          -- UNTRUSTED free text, as received
  status           text not null,          -- open | investigating | closed
  opened_by_ref    text not null,          -- SOFT KEY → mrd_hcm.employees
  closed_on        date,
  linked_deviation_ref text,               -- SOFT KEY → mrd_mes.deviations
  linked_capa_ref  text                    -- SOFT KEY → mrd_qms.capas
);

create index on complaints (lot_ref);
create index on complaints (product_ref, received_on);
create index on complaints (is_adverse_event, status);

-- ---------------------------------------------------------------------------
-- Laboratory audit trail — added 2026-09-12, INFRASTRUCTURE ONLY.
--
-- Nothing reads this yet. It exists so the audit-trail / data-integrity
-- bottleneck (BOTTLENECK-2 §5) and the LoRA finetuning candidate have somewhere
-- to land: both need a record of WHAT WAS DONE TO A RESULT, not just the result.
--
-- THE POINT OF THE TABLE. `qc_tests` records the number that was reported.
-- This records the sequence that produced it — every injection, every
-- reprocessing, every aborted run, every parameter change. A test that passed
-- on the fourth injection after two were deleted looks identical to a clean
-- pass in `qc_tests`, and completely different here.
--
-- That is the question a regulator asks and the one the finished record cannot
-- answer: "did anyone re-run a test until it passed?"
--
-- `event_seq` IS PER TEST AND CONTIGUOUS. A gap in it is itself a finding —
-- audit trails are not supposed to have holes — so the column is deliberately
-- not a global sequence where a gap would mean nothing.
create table lab_events (
  event_id       text primary key,        -- 'LEV-26-000417'
  test_ref       text not null,           -- SOFT KEY → mrd_qms.qc_tests
  event_seq      integer not null,        -- 1,2,3… within the test. Gaps are findings.
  occurred_at    timestamptz not null,
  performed_by_ref text not null,         -- SOFT KEY → mrd_hcm.employees
  -- acquisition | reprocess | reintegrate | abort | delete | parameter_change |
  -- calibration | system_suitability | approve
  action         text not null,
  -- What the action produced, when it produced a number at all. NULL for an
  -- abort or a parameter change — and null is not zero.
  result_num     numeric(12,4),
  unit           text,
  -- Free text as the analyst typed it. Often absent, which is itself the
  -- finding: a reintegration with no reason is the classic audit observation.
  reason         text,
  -- True when this event replaced an earlier one's reported value.
  supersedes_event_ref text,
  instrument_ref text                     -- SOFT KEY → mrd_mes.equipment
);

create index on lab_events (test_ref, event_seq);
create index on lab_events (action);
create index on lab_events (performed_by_ref);
