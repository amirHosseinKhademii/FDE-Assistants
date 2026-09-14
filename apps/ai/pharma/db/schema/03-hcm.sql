-- mrd_hcm — PERSONNEL & DEPARTMENTS. Who may do what, and until when.
--
-- WHY THIS SYSTEM IS LOAD-BEARING AND NOT AN ORG CHART. Under EU GMP Annex 16
-- a batch is certified for release by a named Qualified Person who is
-- personally responsible for it. That makes "was this specific human in good
-- standing on this specific day" a question with a right answer and a wrong
-- one — and the wrong one is invisible to every test result in the lab system.
--
-- EVERY QUALIFICATION HERE EXPIRES. `training_records.expires_on` and
-- `qualifications.valid_until` are the reason this database exists: a training
-- table without an expiry date is a table that can never say no.

create table departments (
  department_id      text primary key,      -- 'DEPT-QA'
  name               text not null,
  function           text not null,         -- quality | manufacturing | warehouse | regulatory | hr
  site_ref           text not null,         -- SOFT KEY → mrd_mes.sites
  head_employee_ref  text                   -- SOFT, self-referential: set after employees load
);

create table positions (
  position_id   text primary key,
  title         text not null,
  department_id text not null references departments(department_id),
  -- A GMP-critical position is one whose holder signs things. It is the flag
  -- that decides whether a lapsed training is paperwork or a release blocker.
  gmp_critical  boolean not null default false
);

create table employees (
  employee_id text primary key,             -- 'EMP-0142'
  full_name   text not null,
  position_id text not null references positions(position_id),
  department_id text not null references departments(department_id),
  site_ref    text not null,                -- SOFT KEY → mrd_mes.sites
  hired_on    date not null,
  left_on     date,
  status      text not null                 -- active | left
);

create table training_curricula (
  curriculum_id   text primary key,         -- 'TRN-GMP-REF'
  code            text not null,
  title           text not null,
  -- How long a completion stays valid. The whole trap surface lives here.
  validity_months integer not null,
  mandatory_for   text not null             -- all | quality | manufacturing | warehouse
);

create table training_records (
  record_id     serial primary key,
  employee_id   text not null references employees(employee_id),
  curriculum_id text not null references training_curricula(curriculum_id),
  completed_on  date not null,
  -- Derived at generation from completed_on + validity_months, then STORED.
  -- Stored rather than computed on read because that is how a real LMS does it
  -- and because a rule that changes must not silently rewrite history.
  expires_on    date not null,
  score_pct     integer not null
);

create table qualifications (
  qualification_id text primary key,
  employee_id      text not null references employees(employee_id),
  kind             text not null,           -- QP | analyst | operator | auditor
  authority        text not null,           -- the body that registered it
  register_no      text,
  registered_on    date not null,
  valid_until      date
);

-- What a person is permitted to SIGN. Separate from qualifications on purpose:
-- being a registered QP and being authorised to certify at THIS site are two
-- different facts, and conflating them is how an authority matrix goes stale.
create table signature_authority (
  authority_id serial primary key,
  employee_id  text not null references employees(employee_id),
  act          text not null,               -- qp_certify | batch_record_sign | oos_approve | capa_close
  granted_on   date not null,
  revoked_on   date
);

create index on employees (department_id);
create index on training_records (employee_id, curriculum_id);
create index on qualifications (employee_id);
create index on signature_authority (employee_id, act);
