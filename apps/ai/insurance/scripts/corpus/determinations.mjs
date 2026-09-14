/**
 * Prior claim determinations — FOUR document shapes, not one.
 *
 * `CORPUS-PLAN.md` Step 1 called this a single type. The research found four,
 * with different authors, different legally-required contents and different
 * precedence:
 *
 *   note    the adjuster's working record — internal, informal
 *   cpl     coverage position letter — what we told the insured responds
 *   ror     reservation of rights — grounds NAMED here survive; omitted ones do not
 *   den     denial letter — elements the STATE mandates, and they differ by state
 *
 * THE PLANTED TRAP, and its control. A prior determination is authority for a
 * later claim only where the policy in force then used the SAME WORDING as the
 * policy in force now. The settled-construction doctrine is keyed to unchanged
 * language, so an edition change alone settles nothing:
 *
 *   DET-2023-004487  construes the 24-hour withdrawal trigger in 4.4.
 *                    That sentence is word-identical in PA-2022-04 and
 *                    PA-2023-01 → STILL AUTHORITY.
 *
 *   DET-2023-004488  construes the per-day rental FIGURE under PA-2021-07.
 *                    The schedule changed between editions → HISTORY, not
 *                    authority. Applying its number today is the wrong answer.
 *
 * A model that learns "old determination, ignore it" turns the second green and
 * the first red. That is how an over-broad fix gets caught — the same shape as
 * cov-007 catching over-correction on cov-001.
 *
 * These are cited BY DATE in practice — "our letter of 2 May 2023" — which is a
 * harder retrieval key than a form id, and is reproduced deliberately.
 */
import { doc } from './common.mjs';

const determination = (d) =>
  doc(`${d.id} — ${d.heading}`, {
    'Determination ID': d.id,
    Type: 'determination',
    Shape: d.shape,
    'Policy ID': d.policy,
    'Claim ID': d.claim,
    Jurisdiction: d.jurisdiction,
    'Form in force at loss': d.form,
    'Date of loss': d.dol,
    Effective: d.issued,
    Status: d.status ?? 'current',
    'Applies to': [d.form],
  }, d.body);

const D = [
  // ---------------- THE TRAP PAIR ----------------
  {
    id: 'DET-2023-004487', shape: 'cpl', policy: 'AUT-4487', claim: 'CLM-2023-004487',
    jurisdiction: 'Illinois', form: 'PA-2022-04', dol: '2023-04-18', issued: '2023-05-02',
    heading: 'Coverage Position: Rental Reimbursement Trigger',
    body: `## Summary of Determination

Rental reimbursement began on the day after the covered auto was withdrawn from
use, not on the day of the loss. The 24-hour withdrawal threshold in section 4.4
was applied as written.

## Loss Facts

The covered auto was damaged on 2023-04-18 and remained driveable until
2023-04-19, when it was delivered for repair and withdrawn from use.

## Documents Relied On

| Document | Section | What it established |
|---|---|---|
| PA-2022-04 | 4.4 Rental Reimbursement | The 24-hour withdrawal trigger |
| AUT-4487 declarations | Coverages In Force | Rental reimbursement selected |

## Reasoning

Section 4.4 provides that the benefit applies where the covered auto is
"withdrawn from use for more than 24 consecutive hours because of a loss covered
under Part IV". The vehicle remained in use for a day after the loss, so the
trigger ran from withdrawal rather than from the date of loss.

## Notes on Later Use

This determination construes the WITHDRAWAL TRIGGER in section 4.4. That
sentence is unchanged between PA-2022-04 and the current PA-2023-01. Where a
later claim turns on the same trigger under either edition, this determination
remains good authority.`,
  },
  {
    id: 'DET-2023-004488', shape: 'cpl', policy: 'AUT-4488', claim: 'CLM-2023-004488',
    jurisdiction: 'Michigan', form: 'PA-2021-07', dol: '2022-02-09', issued: '2022-03-01',
    heading: 'Coverage Position: Rental Reimbursement Daily Amount',
    body: `## Summary of Determination

Rental reimbursement was paid at the per-day amount stated in the PA-2021-07
schedule for the period the covered auto was withdrawn from use.

## Loss Facts

The covered auto sustained collision damage and was withdrawn from use for
eleven days.

## Documents Relied On

| Document | Section | What it established |
|---|---|---|
| PA-2021-07 | 4.3 Schedule of Limits | The per-day amount and maximum days |
| PA-2021-07 | 4.4 Rental Reimbursement | Trigger and duration rule |
| AUT-4488 declarations | Coverages In Force | Rental reimbursement selected |

## Reasoning

The declarations named PA-2021-07 and listed no endorsements, so the schedule in
that edition governed the amount without amendment.

## Notes on Later Use

This determination construes the SCHEDULED AMOUNT in PA-2021-07. **The schedule
changed in later editions.** This determination is a record of what was paid on
this claim under that edition. It is not authority for the amount payable on a
policy written on a later edition, and the figure in it must not be carried
across.`,
  },

  {
    id: 'DET-2024-004471', shape: 'cpl', policy: 'AUT-4471', claim: 'CLM-2024-004471',
    jurisdiction: 'Illinois', form: 'PA-2023-01', dol: '2024-08-14', issued: '2024-08-30',
    heading: 'Coverage Position: Rental Reimbursement Under an Attached Endorsement',
    body: `## Loss Summary

Collision damage reported 2024-08-14. The covered auto was withdrawn from use
for twelve days.

## Coverages Reviewed

| Coverage | Shown on declarations | Responds |
|---|---|---|
| Collision | Yes | Yes |
| Rental Reimbursement | Yes | Yes |

## Documents Relied On

| Document | Section | What it established |
|---|---|---|
| AUT-4471 declarations | Endorsements Attached | PA-END-2024-03 is on the schedule of forms |
| PA-END-2024-03 | Rental benefit | The per-day amount and maximum that govern |
| PA-2023-01 | 4.4 | The base wording the endorsement amends |

## Reasoning

The declarations list the endorsement on the schedule of forms, so the
endorsement governs the provision it names and the base form schedule is
superseded for this policy. The base figures are recorded here only as the
position the endorsement displaced.

## Notes on Later Use

This determination turns on WHICH DOCUMENT GOVERNED, settled by the schedule of
forms on the declarations. It is authority for that reasoning, not for any
particular figure on another policy.`,
  },
  {
    id: 'DET-2024-004475', shape: 'cpl', policy: 'AUT-4475', claim: 'CLM-2024-004475',
    jurisdiction: 'Texas', form: 'PA-2023-01-TX', dol: '2024-07-19', issued: '2024-08-01',
    heading: 'Coverage Position: Hail Damage and the Texas Amendatory',
    body: `## Loss Summary

Hail damage reported 2024-07-19 following a storm.

## Coverages Reviewed

| Coverage | Shown on declarations | Responds |
|---|---|---|
| Comprehensive | Yes | Yes |
| Collision | Yes | Not applicable to these facts |

## Documents Relied On

| Document | Section | What it established |
|---|---|---|
| PA-2023-01-TX | 4.1 | Hail is an other-than-collision loss |
| PA-2023-01-TX | Texas Amendments | Prompt-payment notification timeframe |
| AUT-4475 declarations | Coverages In Force | Comprehensive deductible |

## Reasoning

Hail is named in the comprehensive grant. The Texas amendatory applies because
the vehicle is rated in Texas; where it is silent, the national form controls.

## Notes on Later Use

The Texas amendatory reasoning applies only to policies rated in Texas.
Jurisdiction is a gate, not a preference.`,
  },

  // ---------------- Denial letters: the state-variant trap ----------------
  {
    id: 'DET-2024-004485', shape: 'den', policy: 'AUT-4485', claim: 'CLM-2024-004485',
    jurisdiction: 'Ohio', form: 'PE-2023-01', dol: '2024-09-18', issued: '2024-09-30',
    heading: 'Denial: Rental Expense Not Purchased',
    body: `## What You Claimed

Rental expense incurred between 2024-09-19 and 2024-09-27 while the covered auto
was being repaired.

## What Our Investigation Found

The collision loss is covered and has been paid. Rental Reimbursement is not
shown with a premium charge on the declarations in force on the date of loss.

## The Policy Provisions We Relied On

| Provision | Document | Substance |
|---|---|---|
| Essential Line Restrictions | PE-2023-01 5.1 | Rental Reimbursement is optional and applies only where shown on the Declarations with a premium charge |

## How Those Provisions Apply

Section 5.1 conditions the benefit on a premium charge appearing on the
Declarations. No such charge appears. The form states that the absence of a
charge means the benefit was not purchased.

## Amounts

| Item | Claimed | Paid | Denied |
|---|---|---|---|
| Collision repair | Per estimate | In full, less deductible | None |
| Rental expense | Nine days | None | In full |

## If You Disagree

You may ask us to reconsider by providing a declarations page for the term in
question showing the coverage was purchased.

## Department Of Insurance Review

You may contact your state Department of Insurance regarding this decision.`,
  },
  {
    id: 'DET-2024-004478', shape: 'den', policy: 'AUT-4478', claim: 'CLM-2024-004478',
    jurisdiction: 'California', form: 'PA-2023-01-CA', dol: '2024-05-02', issued: '2024-05-20',
    heading: 'Denial: Wear and Tear Excluded',
    body: `## What You Claimed

Replacement of tyres and brake components said to have failed during a covered
collision.

## What Our Investigation Found

The collision damage has been paid. The components claimed show uniform wear
consistent with age and mileage, and no impact damage.

## The Policy Provisions We Relied On

| Provision | Document | Substance |
|---|---|---|
| Schedule of Exclusions | Attaches to PA-2023-01 | Wear, tear and mechanical breakdown |

## How Those Provisions Apply

The exclusion removes loss arising from wear and tear rather than from a covered
peril. The inspection found no impact damage to the components claimed, so the
loss to them did not arise from the collision.

**Factual basis:** the inspection report dated 2024-05-11 records uniform tread
and pad wear across all four positions and no impact witness marks.
**Legal basis:** the wear and tear exclusion in the Schedule of Exclusions
attaching to PA-2023-01.

## Amounts

| Item | Claimed | Paid | Denied |
|---|---|---|---|
| Collision repair | Per estimate | In full, less deductible | None |
| Tyres and brakes | Four positions | None | In full |

## If You Disagree

You may ask us to reconsider by providing an independent inspection.

## Department Of Insurance Review

You may contact the California Department of Insurance regarding this decision.`,
  },
  // The same denial shape, in California, MISSING the state-required elements.
  {
    id: 'DET-2024-004477', shape: 'den', policy: 'AUT-4477', claim: 'CLM-2024-004477',
    jurisdiction: 'California', form: 'PA-2023-01-CA', dol: '2024-02-14', issued: '2024-03-01',
    heading: 'Denial: Betterment Applied to Replaced Parts',
    body: `## What You Claimed

Full replacement cost of parts replaced following a covered comprehensive loss.

## What Our Investigation Found

The loss is covered. A betterment deduction was applied to the replaced parts.

## The Policy Provisions We Relied On

| Provision | Document | Substance |
|---|---|---|
| Collision Coverage | PA-2023-01-CA 4.2 | Adjustment for depreciation and physical condition |

## Amounts

| Item | Claimed | Paid | Denied |
|---|---|---|---|
| Parts | Full replacement | Less betterment | Betterment portion |

## If You Disagree

You may ask us to reconsider.`,
  },
  {
    id: 'DET-2024-004480', shape: 'den', policy: 'AUT-4480', claim: 'CLM-2024-004480',
    jurisdiction: 'New York', form: 'PA-2023-01-NY', dol: '2024-06-30', issued: '2024-07-12',
    heading: 'Denial: Loss Occurred Outside the Policy Territory',
    body: `## What You Claimed

Physical damage sustained while the covered auto was outside the policy
territory.

## What Our Investigation Found

The loss occurred outside the United States, its territories or possessions, and
Canada.

## The Policy Provisions We Relied On

| Provision | Document | Substance |
|---|---|---|
| Policy Period and Territory | PA-2023-01-NY 6.1 | Territory limitation |

## How Those Provisions Apply

Section 6.1 limits coverage to losses occurring within the stated territory. The
loss did not.

## Amounts

| Item | Claimed | Paid | Denied |
|---|---|---|---|
| Physical damage | Per estimate | None | In full |

## If You Disagree

You may ask us to reconsider by providing evidence of the location of the loss.

## Department Of Insurance Review

You may contact the New York Department of Financial Services regarding this
decision.`,
  },
  {
    id: 'DET-2023-004476', shape: 'den', policy: 'AUT-4476', claim: 'CLM-2023-004476',
    jurisdiction: 'Texas', form: 'PA-2023-01-TX', dol: '2023-08-03', issued: '2023-08-22',
    heading: 'Denial: Vehicle Used to Carry Property for a Fee',
    body: `## What You Claimed

Physical damage sustained while the covered auto was carrying building materials
for a third party for payment.

## What Our Investigation Found

The vehicle was carrying property for a fee at the time of the loss.

## The Policy Provisions We Relied On

| Provision | Document | Substance |
|---|---|---|
| Schedule of Exclusions, Exclusion B | Attaches to PA-2023-01 | Carrying property for a fee |

## How Those Provisions Apply

Exclusion B removes physical damage coverage while the covered auto is being
used to carry property for a fee. The delivery was for payment.

## Amounts

| Item | Claimed | Paid | Denied |
|---|---|---|---|
| Physical damage | Per estimate | None | In full |

## If You Disagree

You may ask us to reconsider.

## Department Of Insurance Review

You may contact the Texas Department of Insurance regarding this decision.`,
  },

  // ---------------- Reservations of rights ----------------
  {
    id: 'DET-2024-004482', shape: 'ror', policy: 'AUT-4482', claim: 'CLM-2024-004482',
    jurisdiction: 'Florida', form: 'PA-2023-01-FL', dol: '2024-10-05', issued: '2024-10-14',
    heading: 'Reservation of Rights: Governing Document Unconfirmed',
    body: `## Background Of The Claim

Damage to the covered auto reported 2024-10-05, with a claim for rental
reimbursement. We are proceeding while reserving our rights.

## Policies And Periods Addressed

| Policy | Form | Endorsements on the schedule of forms |
|---|---|---|
| AUT-4482 | PA-2023-01-FL | PA-END-2024-03, status unconfirmed |

## Provisions We Are Relying On

| Provision | Document | Why it may apply |
|---|---|---|
| Rental reimbursement schedule | PA-2023-01-FL | States a per-day amount and maximum |
| Rental reimbursement schedule | PA-END-2024-03 | States a different per-day amount and maximum |
| Changes | PA-2023-01-FL 6.2 | Terms change only by endorsement issued by us |

## Issue-By-Issue Reservation

**The amount payable for rental reimbursement.** The base form and the
endorsement appearing on this record state different figures for the same
provision, and whether the endorsement is in force is not confirmed on the
record as it stands. We reserve our rights as to which document governs, and we
do not by this letter adopt either figure.

We do **not** reserve as to whether the loss is covered. Collision coverage
responds and is being handled.

## This Letter Is Not A Waiver

Nothing here waives any right or defence under the policy. If we identify a
further ground we will tell you in writing.`,
  },
  {
    id: 'DET-2024-004473', shape: 'ror', policy: 'AUT-4473', claim: 'CLM-2024-004473',
    jurisdiction: 'Ohio', form: 'PA-2023-01', dol: '2024-11-02', issued: '2024-11-15',
    heading: 'Reservation of Rights: Use of the Vehicle at the Time of Loss',
    body: `## Background Of The Claim

Damage to the covered auto reported 2024-11-02. The application disclosed
part-time use of the vehicle on a rideshare platform. We are investigating the
use of the vehicle at the time of the loss.

## Provisions We Are Relying On

| Provision | Document | Why it may apply |
|---|---|---|
| Schedule of Exclusions, Exclusion B | Attaches to PA-2023-01 | Carrying property for a fee |
| Schedule of Exclusions, Exclusion I | Attaches to PA-2023-01 | Renting the vehicle to others |

## Issue-By-Issue Reservation

**Whether an exclusion applies to the use of the vehicle at the time of loss.**
We reserve our rights under Exclusions B and I. We note that neither exclusion
is written in terms of carrying persons for a fee, and no provision of the form
addresses that use either to grant or to exclude it. The question is referred.

Grounds not named in this letter are not reserved.

## This Letter Is Not A Waiver

Nothing here waives any right or defence under the policy.`,
  },
  {
    id: 'DET-2023-004474', shape: 'ror', policy: 'AUT-4474', claim: 'CLM-2023-004474',
    jurisdiction: 'Ohio', form: 'PA-2023-01', dol: '2024-03-08', issued: '2024-03-19',
    heading: 'Reservation of Rights: Glass Endorsement Scope',
    body: `## Background Of The Claim

A glass claim reported 2024-03-08 on a policy carrying endorsement
PA-END-2023-11.

## Provisions We Are Relying On

| Provision | Document | Why it may apply |
|---|---|---|
| Glass Damage | PA-END-2023-11 | Repair rather than replace; deductible treatment |
| Comprehensive Coverage | PA-2023-01 4.1 | The base grant and deductible |

## Issue-By-Issue Reservation

**Whether the damage is repairable within the meaning of the endorsement.** We
reserve our rights as to the deductible treatment pending inspection. We do not
reserve as to whether glass damage is a comprehensive loss; the endorsement
settles that it is.

## This Letter Is Not A Waiver

Nothing here waives any right or defence under the policy.`,
  },
];

/** Claim file notes — the working record, and the least formal shape. */
const NOTES = [
  ['DET-2024-004471', 'AUT-4471', 'CLM-2024-004471', 'Illinois', 'PA-2023-01', '2024-08-14', '2024-08-30', 'Collision and Rental, Endorsement Attached'],
  ['DET-2024-004472', 'AUT-4472', 'CLM-2024-004472', 'Illinois', 'PA-2023-01', '2024-09-02', '2024-09-12', 'Collision, Rental Not Purchased'],
  ['DET-2024-004475', 'AUT-4475', 'CLM-2024-004475', 'Texas', 'PA-2023-01-TX', '2024-07-19', '2024-08-01', 'Comprehensive, Hail'],
  ['DET-2024-004479', 'AUT-4479', 'CLM-2024-004479', 'New York', 'PA-2023-01-NY', '2024-06-11', '2024-06-25', 'Glass Repair, No Deductible'],
  ['DET-2024-004481', 'AUT-4481', 'CLM-2024-004481', 'Florida', 'PA-2023-01-FL', '2024-09-27', '2024-10-14', 'Named Storm, Comprehensive Deductible'],
  ['DET-2024-004483', 'AUT-4483', 'CLM-2024-004483', 'Illinois', 'PP-2023-01', '2024-08-05', '2024-08-19', 'Total Loss, New Car Replacement'],
  ['DET-2024-004484', 'AUT-4484', 'CLM-2024-004484', 'Washington', 'PP-2023-01', '2024-04-22', '2024-05-06', 'Collision, Deductible Waiver'],
  ['DET-2024-004486', 'AUT-4486', 'CLM-2024-004486', 'Louisiana', 'PE-2023-01', '2024-12-03', '2024-12-18', 'Comprehensive, Aftermarket Parts'],
];

const noteBody = (claim, form, dol, topic) => `## Reserve History

| Date | Coverage | Basis | Set by |
|---|---|---|---|
| ${dol} | Physical Damage | Opening, per first notice | Adjuster |

## Payment Ledger

| Date | Payee | Coverage | Basis |
|---|---|---|---|
| — | Repair facility or insured | Per coverage below | Estimate, less deductible |

## Notes

### N001 · Contact · Adjuster
First contact with insured. Loss facts taken. Diary set for appraisal.

### N002 · Coverage · Adjuster
Declarations in force on ${dol} retrieved. Form ${form} recorded as governing.
Schedule of forms checked for attached endorsements. Rated state recorded.

### N003 · Appraisal · Appraiser
Inspection completed and estimate uploaded.

### N004 · Determination · Adjuster
${topic}. Position taken from the governing form and the declarations. Both
recorded above.

### N005 · Closure · Adjuster
File closed.

## Notes on Later Use

A file note is the working record of what was done on this claim. It is not a
statement of the insurer's position to the insured; where a note and a letter
sent to the insured differ, the letter is what the insured received.`;

/**
 * The id carries the SHAPE, because one claim legitimately produces several
 * documents. CLM-2024-004471 has both a file note and a coverage position
 * letter; keying on the claim alone collided them and one silently overwrote
 * the other on disk. Real practice numbers these the same way — the research
 * found `CLM-2024-004471-CPL-20240903`.
 */
const withShape = (d) => ({ ...d, id: `${d.id}-${d.shape.toUpperCase()}` });

export function determinations() {
  const all = D.map(withShape);

  for (const [id, policy, claim, jurisdiction, form, dol, issued, topic] of NOTES) {
    all.push(withShape({
      id, shape: 'note', policy, claim, jurisdiction, form, dol, issued,
      heading: `Claim File Notes: ${topic}`,
      body: noteBody(claim, form, dol, topic),
    }));
  }

  return all.map((d) => ({
    file: `determination-${d.id.toLowerCase().replace(/^det-/, '')}.md`,
    body: determination(d),
  }));
}
