-- mrd_reg — STANDARDS & POLICIES. What governs everything else.
--
-- THE ONE DESIGN RULE IN THIS FILE. Under GMP the revision of a procedure that
-- governs an act is the one in force WHEN THE ACT HAPPENED, not the one in
-- force now. So `sop_revisions` carries `effective_from` and `effective_to`
-- and every lookup against it is a date-range query:
--
--     select * from sop_revisions
--      where sop_id = 'SOP-QC-014' and $signed_on between effective_from
--        and coalesce(effective_to, date '9999-12-31');
--
-- A table holding only a revision number and a single effective date cannot
-- answer that question at all, and the two traps that depend on it (a lapsed
-- training under a rule that changed this year; a work order citing a revision
-- already superseded at the time) would collapse into the same trap.
--
-- In step 2 this database also gains the `documents` + chunk tables for the
-- searchable text behind these catalogue rows. The rows come first because the
-- quality system points at them, and dangling pointers are the thing the whole
-- step-1 design is trying not to create.

create table standards (
  standard_id   text primary key,           -- 'CFR-211', 'EU-GMP-ANNEX-16'
  body          text not null,              -- FDA | EMA | ICH | USP
  code          text not null,
  title         text not null,
  jurisdiction  text not null,              -- US | EU | ICH
  in_force_from date not null
);

create table standard_clauses (
  clause_id   text primary key,             -- 'CFR-211.192'
  standard_id text not null references standards(standard_id),
  clause_no   text not null,
  title       text not null,
  summary     text not null
);

create table sops (
  sop_id                 text primary key,  -- 'SOP-QC-014'
  title                  text not null,
  category               text not null,     -- quality | manufacturing | warehouse | hr
  -- SOFT KEY → mrd_hcm.departments. No foreign key: different database.
  owning_department_ref  text not null
);

create table sop_revisions (
  revision_id           text primary key,   -- 'SOP-QC-014 Rev 7' — EXACT, never a prefix
  sop_id                text not null references sops(sop_id),
  revision_no           integer not null,
  effective_from        date not null,
  -- NULL means "still in force". Every as-of query must coalesce it.
  effective_to          date,
  summary               text not null,
  -- What changed from the previous revision, in one line. This is the field a
  -- human reads when the answer turns on which revision applied.
  change_summary        text not null,
  supersedes_revision_id text references sop_revisions(revision_id),
  -- SOFT KEY → mrd_qms.change_controls. A revision comes into force through a
  -- change control; that record lives in the quality system, not this one.
  change_control_ref    text,
  unique (sop_id, revision_no)
);

-- A revision implements clauses of external standards. This is the bridge that
-- lets "why does the SOP say that" be answered with a regulator's own words.
create table sop_clause_links (
  link_id     serial primary key,
  revision_id text not null references sop_revisions(revision_id),
  clause_id   text not null references standard_clauses(clause_id),
  relation    text not null,                -- implements | references
  unique (revision_id, clause_id)
);

create table policies (
  policy_id      text primary key,          -- 'POL-QA-03'
  title          text not null,
  scope          text not null,             -- global | site | department
  owner_ref      text not null,             -- SOFT KEY → mrd_hcm.employees
  effective_from date not null,
  effective_to   date
);

create index on standard_clauses (standard_id);
create index on sop_revisions (sop_id, effective_from);
create index on sop_clause_links (clause_id);
