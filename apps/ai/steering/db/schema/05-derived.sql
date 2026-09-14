-- vst_derived — OURS. Derived from docs/steering/corpus/ and from nothing else.
--
-- This is the only database the product reads. The other four are the
-- CUSTOMER's systems; here, they are the answer key and nothing more.
-- See docs/steering/SORTING.md.
--
-- ── THE RULE EVERY TABLE HERE OBEYS ───────────────────────────────────────
--
-- Every derived row names the file and the line it came from. Not "roughly
-- from the timesheets" — file, line, and the raw text as written. Two reasons,
-- and the second is the one that matters:
--
--   1. When a number is challenged, the trail has to end at something a human
--      can open and read.
--   2. When the reconciliation disagrees with the answer key, the disagreement
--      has to point at a LINE. "Q3 2022 is 40 hours light" is a morning gone;
--      "pmo/timesheets/2022-Q3.csv:47" is a minute.
--
-- ── AND THE RULE IT DOES NOT OBEY ─────────────────────────────────────────
--
-- Nothing here is cleaned. `M. Lindqvist` and `Lindqvist, Maja` are stored as
-- two different employees because that is what the documents say. Deciding
-- they are one person is a judgement, and judgements belong downstream where
-- somebody can see them and disagree. A CSV reader that silently merges them
-- has made a decision nobody will ever find.

create table source_files (
  file_id      text primary key,          -- corpus-relative path. The natural key.
  kind         text not null,             -- 'timesheet' | 'closure-report' | ...
  sha256       text not null,             -- so an unchanged file can be skipped
  bytes        int  not null,
  lines        int  not null,
  ingested_at  timestamptz not null default now()
);

-- One row per data line of a delimited export, AS WRITTEN.
--
-- `approved` is nullable and the nullability is load-bearing: the file's own
-- header says an empty value means the line was never signed off, NOT that it
-- was rejected. Storing that as `false` would invent a rejection that never
-- happened, and it would be unrecoverable afterwards.
create table timesheet_lines (
  line_id          bigserial primary key,
  file_id          text not null references source_files(file_id) on delete cascade,
  line_no          int  not null,         -- 1-based, counting every line incl. comments
  week_ending      date not null,
  employee_raw     text not null,         -- NOT normalised. See the header.
  charge_code_raw  text not null,         -- as written: '1158' | 'VST1158' | 'VST-1158'
  charge_code_key  text not null,         -- digits only. A FORMAT change, not a judgement.
  hours            numeric(8,1) not null,
  activity         text not null,
  approved         boolean,               -- null = never signed off
  note             text,                  -- nearest preceding '#' line within the data
  unique (file_id, line_no)
);

create index timesheet_lines_code on timesheet_lines (charge_code_key);

-- Label/value blocks out of otherwise-prose documents.
--
-- A closure report is mostly prose, but its head is a fixed `Label:   value`
-- block, and that block PARSES. So this table takes the half that parses and
-- leaves the other half — where the classification actually lives — to the
-- extraction pipeline, which is allowed to be wrong and says so.
--
-- It is also the only bridge between a week of somebody's time and a piece of
-- engineering work: the `Charge code:` line. Where no closure report was ever
-- written, that bridge does not exist and the hours are unattributable. That is
-- not a bug in the parser.
create table document_fields (
  file_id   text not null references source_files(file_id) on delete cascade,
  line_no   int  not null,
  field     text not null,               -- normalised label, e.g. 'charge_code'
  label_raw text not null,               -- as written, e.g. 'Charge code'
  value     text not null,
  -- `line_no` alone is NOT enough. A closure report puts one field per line; a
  -- quotation puts two, separated by a `·`. Keying on the line would have made
  -- the second field of every quote header vanish silently on insert.
  primary key (file_id, line_no, field)
);

create index document_fields_field on document_fields (field, value);

-- ── THE REST OF PIPELINE 1 ────────────────────────────────────────────────
--
-- Approved rates, bottom-up estimates, and quotations. All three are money
-- documents and all three parse, but they are not the same kind of thing and
-- the difference matters downstream:
--
--   rate cards   fact. Approved by finance, one number per discipline.
--   quotes       a promise made to a customer BEFORE the work.
--   estimates    how the promise was arrived at, including how sure anyone was.

create table rate_card_lines (
  file_id    text not null references source_files(file_id) on delete cascade,
  line_no    int  not null,
  year       int  not null,
  region     text not null,
  discipline text not null,
  rate_eur_per_hour numeric(8,2) not null,
  primary key (file_id, line_no)
);

-- The one document in the estate that records HOW SURE anybody was.
--
-- `basis` is free text with four values in practice — `guess`,
-- `engineering judgement`, `from the last programme`, `supplier quote` — and
-- `confidence` is high/medium/low. NEITHER EXISTS ANYWHERE IN THE FOUR
-- DATABASES. `vst_pmo` has no estimates table at all. So this is the first
-- thing the sorting recovers that the answer key cannot grade, and it is also
-- the most directly useful: an estimate whose lines were mostly `guess` is not
-- the same evidence as one built from supplier quotes, and today nothing can
-- tell them apart.
create table estimate_lines (
  file_id      text not null references source_files(file_id) on delete cascade,
  line_no      int  not null,
  program_ref  text not null,          -- from the filename; nothing else carries it
  author       text not null,
  estimated_on date not null,
  work_package text not null,
  discipline   text not null,
  hours        numeric(10,1) not null,
  basis        text not null,
  confidence   text not null,
  primary key (file_id, line_no)
);

create table quote_line_items (
  file_id      text not null references source_files(file_id) on delete cascade,
  line_no      int  not null,
  quote_id     text not null,
  seq          int  not null,
  description  text not null,
  change_class text not null,
  hours        numeric(10,1) not null,
  primary key (file_id, line_no)
);

create index quote_line_items_quote on quote_line_items (quote_id);

-- ── PIPELINE 3 ────────────────────────────────────────────────────────────
--
-- Facts a model read out of prose. THE ONLY TABLE HERE THAT CAN BE WRONG, and
-- the only one with the columns to admit it.
--
-- ── EVERY ROW CARRIES THE SENTENCE ────────────────────────────────────────
--
-- `evidence` is the exact text the model says it read the value from, copied
-- verbatim. It is not decoration and it is not for humans only: before a row is
-- written, that string is searched for IN THE SOURCE FILE, and if it is not
-- there the fact is thrown away.
--
-- That is a hallucination detector that needs no answer key, no ground truth
-- and no second model — just string search. It cannot catch a value that was
-- misread from a real sentence, but it catches the failure that matters most,
-- which is a confident answer supported by a sentence nobody ever wrote.
--
-- ── A NULL VALUE IS A RESULT, NOT A MISSING ROW ───────────────────────────
--
-- `value` null means THE DOCUMENT DOES NOT SAY. That is the correct answer for
-- `reuse_class` in every closure report in this corpus, and for `asil` in about
-- 200 of 220. A pipeline that cannot express it will invent 220 reuse classes
-- and report full coverage.
create table extracted_facts (
  file_id     text not null references source_files(file_id) on delete cascade,
  subject     text not null,          -- what the fact is about, e.g. 'EFF-2021-0443'
  field       text not null,
  value       text,                   -- null = the document does not say
  evidence    text,                   -- the exact sentence, verified present in the file
  evidence_line int,                  -- where it was found. We locate it, not the model.
  -- False when the quote matched only after punctuation was normalised — the
  -- sentence is real, the model mangled a character in it. Kept as a column
  -- rather than folded into `evidence` because "the model corrupts em dashes"
  -- and "the model invents sentences" are different problems with different
  -- fixes, and one run had both.
  evidence_exact boolean not null default true,
  model       text not null,
  extracted_at timestamptz not null default now(),
  primary key (file_id, field)
);

create index extracted_facts_field on extracted_facts (field, value);

-- Rows the evidence check threw out, kept rather than discarded silently.
--
-- A rejected fact is the most informative thing this pipeline produces: it is a
-- case where the model was confident and the sentence did not exist. Deleting
-- them would make the extraction look better the harder it failed.
create table rejected_facts (
  file_id   text not null references source_files(file_id) on delete cascade,
  field     text not null,
  value     text,
  evidence  text,                     -- the sentence that is NOT in the file
  reason    text not null,
  model     text not null,
  primary key (file_id, field)
);

-- Section 2 of each closure report: hours by discipline, and the reported total.
--
-- The total is stored SEPARATELY from the sum of the split, and they sometimes
-- disagree. The report says why when they do — in prose, in section 3. Storing
-- a single reconciled number here would destroy the evidence that there was
-- ever a discrepancy.
create table effort_split_lines (
  file_id    text not null references source_files(file_id) on delete cascade,
  line_no    int  not null,
  subject    text not null,
  discipline text not null,
  hours      numeric(10,1) not null,
  primary key (file_id, line_no)
);

create table effort_totals (
  file_id  text primary key references source_files(file_id) on delete cascade,
  subject  text not null,
  hours    numeric(10,1) not null,
  weeks    int not null
);

-- ── THE VIEW THE COST ANSWER READS ────────────────────────────────────────
--
-- One row per past job, assembled entirely from documents: the classification
-- from `extracted_facts` (a model read it out of prose), the hours from
-- `timesheet_lines` (deterministic, reconciled to the hour), and the two joined
-- through the `Charge code:` line of the closure report.
--
-- THE COLUMNS THAT ARE NULL HERE ARE THE POINT. `asil` is null for 199 of 203
-- jobs because no closure report states it. A query that filters on ASIL
-- therefore finds almost nothing — not because extraction failed, but because
-- the customer never wrote it down next to the cost. That refusal is the honest
-- output and it is what `walk-cost --from-documents` now produces.
--
-- `outcome_note` is absent entirely: the explanation of why a number is strange
-- is prose in section 3, and nothing has asked a model for it. So the outlier
-- warning that the answer-key version prints cannot be produced from documents
-- at all — a known gap, stated rather than papered over.
create view derived_effort as
select
  f.subject                                          as effort_id,
  max(sf.file_id)                                    as file_id,
  max(case when f.field = 'change_class'       then f.value end) as change_class,
  max(case when f.field = 'element_kind'       then f.value end) as element_kind,
  max(case when f.field = 'asil'               then f.value end) as asil,
  -- CAST TO THE ANSWER KEY'S TYPES, and the reason is not cosmetic.
  --
  -- `extracted_facts.value` is text for every field, because a model returns
  -- strings. `vst_pmo` has real booleans and integers. If this view left them
  -- as text, every filter in the cost walk would need a source-aware variant —
  -- and then the two runs would no longer be the SAME reasoning over different
  -- data, which is the only thing that makes comparing them meaningful.
  --
  -- Nulls survive the cast, which matters more here than the types do: `asil`
  -- is null for 199 of 203 jobs and must stay null rather than becoming 'QM'.
  max(case when f.field = 'safety_case_impact' then f.value end)::boolean as safety_case_impact,
  max(case when f.field = 'tooling_required'   then f.value end)::boolean as tooling_required,
  max(case when f.field = 'interfaces_touched' then f.value end)::int     as interfaces_touched,
  max(t.hours)                                       as reported_hours,
  max(t.weeks)                                       as calendar_weeks,
  (select sum(tl.hours) from timesheet_lines tl
     where tl.note is null
       and tl.charge_code_key = regexp_replace(
             (select df.value from document_fields df
               where df.file_id = f.file_id and df.field = 'charge_code' limit 1), '\D', '', 'g'))
                                                     as booked_hours
from extracted_facts f
join source_files sf on sf.file_id = f.file_id
left join effort_totals t on t.file_id = f.file_id
group by f.subject, f.file_id;
