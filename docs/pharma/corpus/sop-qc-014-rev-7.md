# SOP-QC-014 Rev 7 — Batch Release and QP Certification

> Revision Id: SOP-QC-014 Rev 7 · SOP Id: SOP-QC-014 · Revision: 7 · Status: current · Effective: 2026-03-01 · Owner: DEPT-QA · Category: quality · Implements: ANNEX16-1.5, ANNEX16-1.7, CFR-211.165, CFR-211.25 · Supersedes: SOP-QC-014 Rev 6 · Change Control: CC-26-0008

*FABRICATED. Meridian Pharma does not exist and this procedure was never
followed. See [CORPUS.md](README.md).*

## 1. Purpose

This procedure defines how a batch of finished medicinal product manufactured at
a Meridian Pharma site is reviewed, dispositioned and — for batches destined for
the European Union — certified by a Qualified Person prior to release for sale
or supply.

## 2. Scope

Applies to all commercial finished product batches at SITE-01 (Leiden) and
SITE-02 (Greenville), for all markets. Clinical trial material is out of scope
and is covered by SOP-QC-019.

## 3. Responsibilities

**Quality Control** performs the analytical testing defined by the applicable
specification version and records the results in the laboratory system.

**Quality Assurance** performs the batch record review described in section 6
and prepares the disposition record.

**The Qualified Person** certifies batches destined for the European Union.
Certification is a personal act and is not delegable.

**Human Resources** maintains the training record on which §7.3 depends and
notifies Quality Assurance when a GMP-critical training record is within thirty
days of expiry.

**Manufacturing** provides the completed batch record and any deviation reports
raised during the run.

## 4. Definitions

**Disposition** — the decision to release, reject or hold a batch, recorded
against the lot in the quality system.

**Certification** — the additional act, required for the European Union under
EU GMP Annex 16, by which a named Qualified Person confirms the batch was
manufactured and checked in accordance with the marketing authorisation and with
Good Manufacturing Practice.

**Applicable specification version** — the specification version in force on the
date of manufacture, not the current one. Where a specification has been revised
since the batch was made, the version named on the lot record governs.

**Current training record** — a completed training record whose expiry date is
later than the date of the act it is relied upon for. A record that has expired
is not made current by later completion; the act performed while it was expired
remains invalid.

## 5. Prerequisites

Before review begins, all of the following must be present:

- the completed batch record for the work order that produced the lot
- all analytical results required by the applicable specification version
- any deviation reports raised during manufacture, with their current status
- the environmental monitoring summary for the relevant production area

A batch record that is incomplete is returned to Manufacturing. Review does not
begin on a partial record.

## 6. Batch record review

### 6.1 Reconciliation against the specification

QA confirms that every attribute listed in the applicable specification version
has a corresponding result, that each result is within its limits, and that the
specification version named on the lot record is the one that was in force on
the date of manufacture.

Where any result is outside its limits, the batch may not proceed to disposition
until the out-of-specification investigation required by SOP-QC-003 has been
completed and approved. A repeat test performed without that investigation does
not satisfy this section, irrespective of its result.

### 6.2 Reconciliation against the deviation log

QA confirms that every deviation raised against the work order has been closed,
or, where a deviation remains open, that its assessment concludes the batch is
not affected. The reconciliation is recorded on the disposition record naming
each deviation by identifier.

A deviation classified as critical blocks disposition unconditionally until
closed.

### 6.3 Equipment and facility status

QA confirms that the site held a valid manufacturing authorisation for the
period of the run, and that no equipment used in the run was outside its
qualified state on the dates it was used.

Equipment qualification is assessed **as of the date of use**. Equipment that has
since been requalified was not thereby qualified during a preceding gap, and a
run that fell inside such a gap is a deviation whether or not it was detected at
the time.

## 7. Disposition and certification

### 7.1 Disposition

On satisfactory completion of section 6, QA records the disposition against the
lot: released, rejected or quarantine. The record names the deciding person, the
date, and this procedure at the revision in force on that date.

### 7.2 Certification for the European Union

For batches destined for the European Union, a Qualified Person certifies the
batch after the disposition is recorded. The Qualified Person must:

- hold a current registration with a competent authority of a Member State
- be named in the site's authorisation as a Qualified Person for the product
  category concerned
- hold an unrevoked internal authority to certify

The Qualified Person may rely on the pharmaceutical quality system for the
detail of the review, but the responsibility for certification is personal and
remains with the individual who signs.

### 7.3 Personnel precondition to certification

**New at this revision.** In addition to §7.2, the certifying Qualified Person
must hold a **valid, unexpired GMP refresher training record on the date of
certification**.

A certification made by a Qualified Person whose GMP refresher training had
expired on that date **is invalid**. The batch does not become released by that
act and remains in quarantine until certified by a Qualified Person who meets
this section. The invalid certification is itself a deviation and is raised
under SOP-QA-007.

This section implements EU GMP Annex 16 §1.7, under which the Qualified Person
must have ongoing knowledge and experience appropriate to the products
certified, and 21 CFR 211.25, which requires training with sufficient frequency
to assure continuing familiarity.

Validity of the GMP refresher is twenty-four months from completion, as defined
by SOP-HR-002.

### 7.4 Records

The certification is recorded against the lot with the identity of the
certifying Qualified Person, the date of certification, and the identifier of
the training record relied upon under §7.3. The record is retained for one year
beyond the expiry of the batch, and in no case less than five years.

## 8. Rejected batches

A rejected batch is quarantined physically and in the inventory system, and a
deviation is raised for the rejection itself. Disposal follows SOP-WH-014.

## 9. References

- 21 CFR 211.165 — Testing and release for distribution
- 21 CFR 211.25 — Personnel qualifications
- EU GMP Annex 16 §1.5 — Responsibilities of the Qualified Person
- EU GMP Annex 16 §1.7 — Reliance on quality systems; ongoing knowledge
- SOP-QC-003 — Out-of-Specification Result Investigation
- SOP-HR-002 — GMP Training and Qualification of Personnel
- SOP-QA-007 — Deviation Management

## 10. Revision history

| revision | effective | change |
|---|---|---|
| 5 | 2021-02-01 | Initial consolidated revision replacing the site-specific release procedures. |
| 6 | 2023-07-01 | Added §6.2, reconciliation of the batch record against the deviation log. No personnel-training precondition. |
| 7 | 2026-03-01 | Added §7.3: the certifying Qualified Person must hold a valid, unexpired GMP refresher training record on the date of certification. Certification without one is invalid and the batch remains in quarantine. |
