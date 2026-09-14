# SOP-SCM-004 Rev 5 — Supplier Qualification and Disqualification

> Revision Id: SOP-SCM-004 Rev 5 · SOP Id: SOP-SCM-004 · Revision: 5 · Status: current · Effective: 2023-04-01 · Owner: DEPT-SCM · Category: warehouse · Implements: ICHQ7-6.1, CFR-211.22

*FABRICATED. Meridian Pharma does not exist and this procedure was never
followed. See [CORPUS.md](README.md).*

## 1. Purpose

This procedure defines how a supplier of starting materials, excipients or
primary packaging is qualified for use at a Meridian Pharma site, how that
qualification is maintained, and what must happen when it is withdrawn.

It covers in particular the assessment required when a supplier is disqualified
*after* material from that supplier has already been consumed in manufacture —
the case in which the defect is not in what Meridian holds, but in what Meridian
has already made and, in some cases, already shipped.

## 2. Scope

Applies to all suppliers of materials that enter a medicinal product at SITE-01
(Leiden) and SITE-02 (Greenville), including active substance manufacturers,
excipient suppliers and primary packaging suppliers. Suppliers of services,
laboratory consumables and secondary packaging are out of scope.

## 3. Responsibilities

**Supply Chain Management** maintains the approved supplier list, schedules
periodic audits, and blocks goods receipt against a supplier whose status is not
`qualified` on the date of delivery.

**Quality Assurance** decides qualification and disqualification, approves the
traceability and impact assessment required by section 7, and owns the decision
on notification or recall.

**Quality Control** retains authority to reject any component irrespective of
supplier status, under 21 CFR 211.22.

**The Qualified Person** is informed of every disqualification affecting a
material used in a batch they certified, and decides whether certification of
any affected batch is called into question.

**Warehouse** executes physical quarantine of held material and confirms the
quantity held against the inventory system.

## 4. Definitions

**Qualified supplier** — a supplier appearing on the approved supplier list with
a qualification start date on or before the date of receipt and no
disqualification date on or before that date.

**Disqualification** — withdrawal of a supplier's approved status by Quality
Assurance, recorded with its effective date and its reason. Disqualification is
not a grading and has no partial form: a supplier is qualified on a given day or
is not.

**Consumed material** — material from a supplier that has been issued to a work
order, whether or not the resulting product has been dispositioned. Consumed
material cannot be quarantined; only its products can.

**Unused material** — material from a supplier that remains in inventory and has
not been issued to a work order. Unused material is recoverable by quarantine
and is the only category on which action is still fully preventive.

**Distribution status** — how far a finished lot containing the material has
travelled: held at site, delivered to a wholesaler, or delivered to a dispensing
customer such as a hospital or pharmacy chain. Distribution status determines
the actions available in §7.3, and no other attribute of the lot does.

## 5. Qualification

### 5.1 Initial qualification

A supplier is qualified on the basis of a documented assessment covering the
regulatory status of the site, an on-site or, where justified, a remote audit,
and evaluation of at least three consecutive delivered batches against the
agreed material specification.

The qualification record names the materials for which the supplier is approved.
Approval for one material does not extend to another material from the same
supplier.

### 5.2 Periodic audit

Each qualified supplier is re-audited at an interval set by risk, and in no case
exceeding three years for a supplier of an active substance or five years for
any other supplier in scope.

Where an audit is overdue, the supplier remains qualified but no new material
may be received until the audit is closed. An overdue audit is not a
disqualification and must not be recorded as one.

## 6. Disqualification

### 6.1 Grounds and decision

Quality Assurance disqualifies a supplier where an audit finding, a regulatory
action, a repeated quality defect, or an undeclared change to the manufacturing
process or synthesis route means the supplier can no longer be relied upon to
deliver material of the agreed specification.

The decision records the effective date and the reason. The effective date is
the date of the decision, not the date of the finding that prompted it, and not
the date the underlying defect is believed to have begun. Where the defect is
believed to predate the decision, that belief is recorded in the assessment
under section 7 and does not move the effective date.

### 6.2 Immediate actions

On the effective date, and before the assessment in section 7 begins:

- **All unused material from that supplier is placed in quarantine**, physically
  and in the inventory system, irrespective of its own test results and
  irrespective of any prior release decision recorded against it. A material lot
  that has passed its own incoming testing is not thereby exempt: the basis of
  the disqualification is the supplier, not the consignment.
- **Goods receipt is blocked** against the supplier. Material received from a
  supplier on or after their disqualification date should not have been
  accepted; where such a receipt has occurred it is quarantined on discovery and
  a deviation is raised under SOP-QA-007 against the receipt itself, separately
  from any deviation raised against the material.
- **Open production orders** drawing on that supplier's material are suspended
  pending the assessment.

The quarantine in this section is preventive and is not a finding about the
material. It is applied first because it is the only action in this procedure
that becomes impossible once the material is consumed.

### 6.3 Notification to the Qualified Person

The Qualified Person for each affected product category is informed on the
effective date, before the assessment is complete, and is given the list of
batches under assessment as it stands.

## 7. Traceability and impact assessment

**Required at this revision for every disqualification**, whether or not any
material has been consumed, and whether or not a defect in delivered product is
suspected. An assessment that concludes no product was affected is a completed
assessment and is recorded as one.

### 7.1 Scope of the assessment

The assessment identifies every material lot received from the supplier, every
work order to which each was issued, and every finished product lot produced by
those work orders. It extends to all such lots regardless of their disposition
and regardless of whether they have been distributed, in accordance with
21 CFR 211.192, under which an investigation extends to other batches that may
have been associated with the failure.

The assessment is not limited to material received after the date the defect is
believed to have begun. Where that date cannot be established with evidence, the
whole supply history is in scope.

### 7.2 Classification by distribution status

Each affected finished lot is classified by how far it has travelled, and the
classification determines what may still be done about it:

| distribution status | what remains possible |
|---|---|
| held at site, not shipped | quarantine; the lot is still under Meridian control and no external party need act |
| delivered to a wholesaler | recovery by notification to a known, finite list of consignees |
| delivered to a dispensing customer | the product may have reached a patient; recovery is not assured by notification alone |

Quantity does not determine the classification and does not substitute for it. A
single lot that reached a dispensing customer is assessed ahead of a larger
quantity held at site, because the actions available differ in kind and not in
degree.

A lot whose expiry date has passed is classified as beyond recovery irrespective
of where it travelled, and is not subject to §7.3's notification or recall
outcomes. It remains within the scope of the assessment and is recorded: the
product is no longer on a shelf, so the actions in §7.3 achieve nothing, but the
lot is still evidence of the extent of the supplier's impact and of what was
released while the defect was present.

Where distribution status cannot be established for a lot, it is classified at
the highest status that cannot be excluded. An unknown distribution status is
never recorded as "not shipped".

### 7.3 Outcome

On the basis of the classification in §7.2 and a risk assessment performed under
the principles of ICH Q9, Quality Assurance decides for each affected lot one
of:

- **No action** — where the assessment establishes that the material in question
  could not have affected the quality, safety or efficacy of the finished lot.
  The justification is recorded per lot and is not inherited from another lot.
- **Quarantine** — for lots still under Meridian control.
- **Customer notification** — for lots delivered to a wholesaler or dispensing
  customer where the assessment does not establish a hazard to the patient but
  the consignee must be informed so that onward supply can be halted.
- **Recall** — where the assessment cannot exclude a hazard to the patient. The
  competent authority of each affected market is notified in parallel with the
  recall and not after it.

A lot that reached a dispensing customer may be closed with no action, and a lot
held at site may be recalled in the sense of being rejected; the distribution
status constrains the available actions and does not by itself decide the
outcome.

### 7.4 Timescales and records

The list of affected lots required by §7.1 is completed within five working days
of the effective date. The outcome decision required by §7.3 is completed within
thirty calendar days, or, where any affected lot reached a dispensing customer,
within five working days for that lot.

The assessment is recorded against the disqualification with the supplier, the
effective date, every material lot and finished lot identified, the
classification of each, the outcome decided, and the person deciding. A
corrective and preventive action is raised under SOP-QA-011 for the
disqualification itself.

## 8. Requalification

A disqualified supplier may be requalified only after the deficiency has been
remediated, verified by an on-site audit, and approved by Quality Assurance as
an initial qualification under §5.1. Requalification takes effect from its own
date and does not retrospectively validate material received while the supplier
was disqualified.

## 9. References

- 21 CFR 211.22 — Responsibilities of the quality control unit
- 21 CFR 211.192 — Production record review; investigation extends to other batches
- ICH Q7 §6.1 — Documentation and records
- ICH Q9 §4.1 — Risk assessment
- SOP-QA-007 — Deviation Management
- SOP-QA-011 — Corrective and Preventive Action (CAPA)
- SOP-QC-014 — Batch Release and QP Certification

## 10. Revision history

| revision | effective | change |
|---|---|---|
| 5 | 2023-04-01 | Disqualification now requires a traceability assessment of all material already consumed, completed to the timescales in §7.4. Classification by distribution status (§7.2) introduced. |

Revisions 1 to 4 predate the current document management system and are held in
the archive. They are not retrievable through this system and must not be cited;
where the rule applicable to an act performed before 2023-04-01 is needed,
request the archived revision through Quality Assurance.
