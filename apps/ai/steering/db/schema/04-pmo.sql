-- vst_pmo — EFFORT & COST ACTUALS. What past changes actually took.
--
-- THIS IS THE DATABASE THE COST ANSWER STANDS ON, and the failure mode it is
-- shaped against is invisible: a number that looks grounded and is actually the
-- average of everything the company has ever done.
--
-- ── THE COMPARABLES KEY ───────────────────────────────────────────────────
--
-- The columns between `change_class` and `tooling_required` are not description,
-- they are the JOIN. They are chosen so that a NEW, UNBUILT requirement can be
-- described in exactly the same terms as a finished one — so "what will this
-- cost" becomes "what did the things like it cost" instead of "what is our
-- average". Design the key before the rows, or history collapses to one mean
-- and the estimate is invented with a citation attached.
--
--     change_class        what kind of work it is
--     element_kind        what it is being done to
--     asil                how much evidence it needs
--     reuse_class         how much of it already exists
--     interfaces_touched  how far it reaches
--     safety_case_impact  whether the argument has to be rebuilt  ← the expensive one
--     tooling_required    whether metal has to be cut
--
-- ── TWO STATISTICS, AND THE DIFFERENCE IS A TRAP ──────────────────────────
--
-- EFF-2021-0443 booked 3,180 hours on a `modify_hardware` change because it
-- absorbed a production line relocation — see its `outcome_note`. A MEAN over
-- comparables roughly doubles the estimate. A MEDIAN over a filtered set is
-- right. An estimate that does not say which statistic it used cannot be
-- checked, which is trap T5.
--
-- ── THE SYSTEM KNOWING ITS OWN BIAS ───────────────────────────────────────
--
-- `quotes` carries `quoted_hours` beside `actual_hours_final`. Historically
-- Vantis under-quoted `new_function` work by about 18% and was accurate on
-- `recalibrate`. An estimate that ignores its own track record is worse than
-- one that states it, and no other table in the estate can supply that fact.

create table effort_records (
  effort_id   text primary key,             -- 'EFF-2021-0443'
  chr_ref     text,                         -- SOFT KEY → vst_alm.change_requests
  program_ref text not null,                -- SOFT KEY → vst_crm.programs
  title       text not null,
  completed_on date not null,

  -- ── the comparables key ──
  -- reuse_as_is | recalibrate | modify_function | new_function
  -- | modify_hardware | new_hardware | integration_only | validation_only
  -- | safety_case_only
  change_class       text not null,
  element_kind       text not null,
  asil               text not null,
  reuse_class        text not null,
  interfaces_touched integer not null,
  safety_case_impact boolean not null,
  tooling_required   boolean not null,

  actual_hours   numeric(10,1) not null,
  calendar_weeks integer not null,
  region         text not null,             -- EU | NA | CN
  year           integer not null,
  -- Free text, and the only place the estate records WHY a number is strange.
  -- T5 lives in this column.
  outcome_note   text
);

create table effort_by_discipline (
  effort_id  text not null references effort_records(effort_id),
  discipline text not null,                 -- systems | software | hardware | calibration | validation | safety | pm
  hours      numeric(10,1) not null,
  primary key (effort_id, discipline)
);

-- Hours become euros HERE and nowhere else. A rate hardcoded in an estimator is
-- a rate nobody can audit, and it is wrong the moment a year rolls over.
create table rate_cards (
  year       integer not null,
  region     text not null,
  discipline text not null,
  rate_eur_per_hour numeric(8,2) not null,
  primary key (year, region, discipline)
);

create table quotes (
  quote_id   text primary key,
  rfq_ref    text not null,                 -- SOFT KEY → vst_crm.rfqs
  program_ref text not null,
  issued_on  date not null,
  quoted_hours numeric(10,1) not null,
  quoted_eur   numeric(12,2) not null,
  tooling_eur  numeric(12,2),
  outcome    text not null,                 -- won | lost | withdrawn | open
  -- Null until the programme closes. The comparison between this and
  -- `quoted_hours` is the only evidence the estate holds about how wrong our
  -- estimates tend to be, and in which direction.
  actual_hours_final numeric(10,1)
);

create table quote_lines (
  quote_id     text not null references quotes(quote_id),
  seq          integer not null,
  description  text not null,
  change_class text not null,
  hours        numeric(10,1) not null,
  -- SOFT KEY → vst_alm.customer_requirements. Which requirement this line was
  -- priced for. Null on lines that price integration or programme management
  -- rather than a requirement.
  cr_ref       text,
  primary key (quote_id, seq)
);

create index on effort_records (change_class, element_kind, asil);
create index on effort_records (safety_case_impact);
create index on effort_records (program_ref);
create index on quote_lines (cr_ref);
