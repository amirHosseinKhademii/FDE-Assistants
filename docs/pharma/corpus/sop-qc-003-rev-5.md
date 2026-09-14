# SOP-QC-003 Rev 5 — Out-of-Specification Result Investigation

> Revision Id: SOP-QC-003 Rev 5 · SOP Id: SOP-QC-003 · Revision: 5 · Status: current · Effective: 2025-04-01 · Owner: DEPT-QC · Category: quality · Implements: CFR-211.192, CFR-211.194 · Supersedes: SOP-QC-003 Rev 4 · Change Control: CC-25-0014

*FABRICATED. Meridian Pharma does not exist and this procedure was never
followed. See [CORPUS.md](../CORPUS.md).*

## 1. Purpose

This procedure defines how a laboratory result falling outside its specification
is investigated, what may and may not be done before that investigation is
complete, and how the investigation is concluded and recorded.

It exists because the dangerous response to an unexpected result is the
intuitive one: repeat the test and believe the second answer. A result is not
made correct by a later result that is more convenient.

## 2. Scope

Applies to every out-of-specification result on a released or in-process
material, intermediate, or finished product at SITE-01 (Leiden) and SITE-02
(Greenville), for all markets and all stages of testing.

Out-of-trend results that remain within specification are handled under
SOP-QC-021 and are out of scope here.

## 3. Responsibilities

**The analyst** halts work on discovery, retains the sample, solution and
apparatus in their current state, and notifies the supervisor the same working
day. The analyst does not repeat the test on their own initiative.

**The QC supervisor** conducts the Phase IA laboratory investigation, decides
whether a laboratory cause is established, and approves the investigation
record. Approval is a named act.

**Quality Assurance** reviews every investigation, owns the Phase II
investigation where one is required, and decides the impact on the batch.

**Manufacturing** supports the Phase II review of the process, and provides the
batch record and any in-process data requested.

## 4. Definitions

**Out-of-specification (OOS)** — a result outside the limits of the applicable
specification version, whether or not the analyst believes it to be valid.

**Phase IA** — the initial laboratory assessment: a documented review of the
analyst's work, the method, the instrument, the standards and the calculation,
performed before any repeat testing of any kind.

**Phase IB** — extended laboratory investigation, including testing designed to
confirm or rule out a hypothesised laboratory cause.

**Phase II** — full-scale investigation extending beyond the laboratory into
manufacturing, materials and other batches.

**Retest** — testing a fresh aliquot of the ORIGINAL sample. Not the same as a
resample, which takes new material from the batch and requires its own
justification under §8.

**Reportable result** — the result that stands on the record after the
investigation. In the absence of an assigned laboratory cause, the original
out-of-specification result is the reportable result, whatever a repeat test
showed.

## 5. Immediate actions

On discovery of an out-of-specification result, and before anything else:

- the result is recorded as obtained — it is never deleted, overwritten or
  reissued, and the audit trail of the original acquisition is preserved
- the sample, the prepared solution, the standards and the instrument
  configuration are retained in their current state
- the batch is placed on hold and may not proceed to disposition
- the supervisor is notified the same working day

A result that is discarded before it is recorded is a data-integrity event and
is raised under SOP-QA-007 in addition to this procedure.

## 6. Phase I — laboratory investigation

### 6.1 Phase IA — the initial assessment, and the prohibition on retesting

**New at this revision.** A Phase IA assessment is documented and approved
**before any repeat test, retest or reinjection is performed**. Testing into
compliance — repeating an analysis until an acceptable figure appears — is not
an investigation and is not permitted at any point in this procedure.

The assessment reviews, and records the reviewer's conclusion on, each of:

- the analyst's technique and adherence to the method
- the calculation, the integration and any manual reprocessing
- the standards, reagents and reference materials, including their expiry
- the instrument, its calibration status and its system suitability at the time
- the sample's identity, preparation and storage

**A retest performed before this assessment has been documented and approved
does not satisfy this procedure, irrespective of its result, and the original
out-of-specification result stands as the reportable result.** A batch whose
only investigation is a passing repeat test has not been investigated.

### 6.2 Phase IB — extended laboratory investigation

Where Phase IA identifies a plausible laboratory cause but does not confirm it,
a Phase IB investigation may be conducted under a written testing plan approved
in advance by the QC supervisor. The plan states what will be tested, how many
determinations will be made, and what result would confirm or exclude the
hypothesised cause.

The number of determinations is fixed before testing begins. Deciding how many
to run after seeing the results is testing into compliance by another name.

## 7. Phase II — full-scale investigation

Where Phase I does not establish a laboratory cause, a Phase II investigation is
opened and owned by Quality Assurance. It extends to:

- the batch record, in-process controls and any deviations raised during the run
- the equipment used and its qualification status on the dates of use
- the starting materials, including the supplier and the material lots consumed
- **other batches that may be associated with the same cause**, in accordance
  with 21 CFR 211.192, whether or not those batches have already been
  distributed

## 8. Retesting and resampling

A retest is permitted only after an assigned laboratory cause has been
documented and approved, and only under an approved plan as described in §6.2.

A resample is permitted only where the investigation establishes that the
original sample was not representative — for example a documented sampling
error. Dissatisfaction with a result is not a sampling error.

Where an assigned laboratory cause is established and a valid retest meets the
specification, the original result is invalidated on the record with the cause
stated. **Invalidating a result is a conclusion of an investigation, never its
starting assumption.**

## 9. Conclusion, outcome and records

Each investigation is closed with one of the following outcomes, recorded
against the OOS identifier:

- **lab_error** — an assigned and documented laboratory cause; the original
  result is invalidated and the valid retest is the reportable result
- **manufacturing_cause** — the result reflects the batch; the batch is
  dispositioned accordingly and the deviation is raised under SOP-QA-007
- **no_cause_found** — no cause established. The original result stands as the
  reportable result and the batch is judged on it. "No cause found" is not a
  pass, and a batch may not be released on the strength of a repeat test after
  this outcome.

The record names the investigator, the approver and the date of approval, states
the outcome above, and is retained for one year beyond the expiry of the batch
and in no case less than five years. A corrective and preventive action is
raised under SOP-QA-011 where the cause is likely to recur.

## 10. References

- 21 CFR 211.192 — Production record review; investigation extends to other batches
- 21 CFR 211.194 — Laboratory records
- SOP-QA-007 — Deviation Management
- SOP-QA-011 — Corrective and Preventive Action (CAPA)
- SOP-QC-014 — Batch Release and QP Certification
- SOP-QC-021 — Dissolution Testing of Solid Oral Dosage Forms

## 11. Revision history

| revision | effective | change |
|---|---|---|
| 4 | 2022-06-01 | Aligned with FDA out-of-specification guidance 2022. Phase IA/IB/II structure introduced. |
| 5 | 2025-04-01 | Added the explicit prohibition in §6.1 on retesting before a documented and approved Phase IA laboratory investigation, and the rule that a retest performed before it does not satisfy this procedure whatever its result. |
