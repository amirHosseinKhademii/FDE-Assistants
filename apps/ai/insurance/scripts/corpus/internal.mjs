/**
 * Claims procedures, underwriting manuals and coverage opinions — the
 * insurer's own internal documents.
 *
 * WHY THEY ARE IN THE CORPUS AT ALL, given none of them decides coverage:
 *
 *   procedures  the CONDUCT ladder needs a floor for bulletins to supersede.
 *               A bulletin that amends "Section 6.2 of PRC-006" is meaningless
 *               if PRC-006 is not there.
 *   manuals     a deliberate DISTRACTOR. They retrieve extremely well on
 *               coverage questions — full of coverage names, limits and
 *               deductibles — and are almost never the right answer, because
 *               they govern whether a policy may be WRITTEN, not what an issued
 *               policy PAYS.
 *   opinions    a trap by shape. They look the most authoritative document in
 *               the corpus — legal reasoning, confident conclusions — and they
 *               bind nobody. Treating one as a determination is the failure.
 *
 * All three say so in their own text, because the corpus has to teach the
 * conduct/coverage split rather than assume it.
 */
import { doc, ALL_AUTO_FORMS } from './common.mjs';

const COVERAGE_DISCLAIMER = `## What This Document Does Not Decide

This document sets internal standards. It does not determine coverage. Coverage
is determined by the policy form, the endorsements attached to it, and the
declarations page for the individual policyholder. Where this document and a
policy form appear to disagree about what is payable, the form governs and the
disagreement is a defect in this document.`;

// ---------------------------------------------------------------------------
// Claims procedures — six, one per phase of a claim
// ---------------------------------------------------------------------------

const PROCEDURES = [
  ['PRC-001', 'Intake and Acknowledgement', '2023-02-01', 'Recording a first notice of loss, acknowledging the claimant, and assigning the file.'],
  ['PRC-002', 'Establishing the Governing Documents', '2023-02-01', 'Recording which form edition and which endorsements govern, before any coverage position is taken.'],
  ['PRC-003', 'Reserves', '2023-02-01', 'Setting and reviewing indemnity and expense reserves.'],
  ['PRC-004', 'Investigation and Inspection', '2023-02-01', 'Contact standards, inspection, and the documents retained in the file.'],
  ['PRC-006', 'Physical Damage and Loss of Use', '2023-02-01', 'Rental authorisation, comparable class, and settlement of repairable and total losses.'],
  ['PRC-008', 'Denial, Partial Denial and Escalation', '2023-02-01', 'Communicating an adverse decision and referring what an adjuster may not decide.'],
];

const procedureBody = (id, title, purpose) => `## 0. About This Document

${purpose} It tells an adjuster how to act.

Bulletins issued after the revision date of this document prevail over the
section they name. Current bulletins are published in the claims reference
library. An adjuster who applies a section that a later bulletin has replaced
has not followed procedure.

## 1. Standards

| Event | Standard | Measured from | Exception |
|---|---|---|---|
| Initial action | 2 business days | Trigger event | Catastrophe bulletin in force |
| Documentation complete | 5 business days | Initial action | Claimant unreachable, documented |
| Referral where required | Same business day | Threshold met | None |

## 2. Authority

| Action | Adjuster | Senior adjuster | Supervisor |
|---|---|---|---|
| Act within standard | Yes | Yes | Yes |
| Depart from standard | No | Yes | Yes |
| Waive a documented requirement | No | No | Yes |

## 3. Establishing What Governs

Before any position is taken, the file records the declarations in force on the
date of loss, the form and edition named on it, every endorsement on its
schedule of forms, and the rated state. This is a documentation step, not a
judgment step.

An endorsement a claimant asserts but which does not appear on the schedule of
forms in force on the date of loss is not recorded as governing. The assertion
is recorded and the file is referred.

## 4. Documentation Retained

| Document | Retained | Retention period |
|---|---|---|
| Estimates and supplements | Always | Current year plus two |
| Written communications to the claimant | Always | Current year plus two |
| Photographs | Where an inspection occurred | Current year plus two |

## 5. Escalation

Refer to the claims desk supervisor where the governing form or endorsement
status is unconfirmed; where two governing documents state different figures for
the same provision and nothing on the declarations settles which applies; where
a prior determination on the same policy reached a different result; or where
the answer requires a judgment the documents do not contain.

${COVERAGE_DISCLAIMER}

## Appendix A — Revision History

| Revision | Effective | Sections changed |
|---|---|---|
| 4 | 2023-02-01 | 1, 3, 5 |
| 3 | 2021-09-01 | 1, 4 |`;

// ---------------------------------------------------------------------------
// Underwriting manuals — three, the distractor
// ---------------------------------------------------------------------------

const MANUALS = [
  ['UWM-001', 'Eligibility and Acceptable Risks', '2023-01-01'],
  ['UWM-002', 'Classification and Tier Placement', '2023-01-01'],
  ['UWM-003', 'Coverages Offered, Discounts and Surcharges', '2023-01-01'],
];

const manualBody = (id, title) => `## 1. How to Use This Manual

This manual covers ${title.toLowerCase()} for the personal auto program.
Anything it does not address is referred before binding.

It governs whether a policy may be **written**, and on what terms at issue. It
does **not** govern what an issued policy pays. Once a policy is issued, the
form, the endorsements and the declarations determine coverage, and the remedies
available under this manual run through cancellation, non-renewal or rescission
rather than through a claim decision.

Where a state manual exists for a jurisdiction, that manual governs for risks in
that jurisdiction and this one applies only where it is silent.

## 2. Eligibility

| Category | Test | Disposition |
|---|---|---|
| Salvage or rebuilt title | Title brand | Decline |
| Vehicle held for hire | Disclosed use | Refer |
| Vehicle used to carry passengers for a fee | Disclosed use | Refer |
| Major violation in 60 months | Motor vehicle record | Decline |
| Two at-fault losses in 36 months | Loss history | Refer |

A disclosed use in a refer row is referred at application and the disposition
recorded. A refer disposition is not a decline.

## 3. Tier Placement

| Tier | Qualifying characteristics | Movement at renewal |
|---|---|---|
| Preferred | Five years claim-free, qualifying credit tier | Held unless a surcharge triggers |
| Standard | No major violation, fewer than two at-fault losses | To Preferred after five clean years |
| Essential | Does not qualify for Standard | To Standard after three clean years |

Tier placement is made from the filed matrix. A placement that does not come
from the filed matrix is a deviation, and a deviation is itself a violation
whether or not the resulting premium is lower.

## 4. Coverages and Limits Offered

| Coverage | Available limits | Deductible options | Notes |
|---|---|---|---|
| Bodily Injury Liability | Program schedule by tier | None | State minimum is a floor |
| Property Damage Liability | Program schedule by tier | None | State minimum is a floor |
| Collision | Actual cash value | Program schedule | — |
| Comprehensive | Actual cash value | Program schedule | — |
| Rental Reimbursement | Program schedule by tier | None | Optional on the Essential form |

Where a state's mandated minimum exceeds the limit in the program schedule, the
mandated minimum applies and the schedule is read up to it.

## 5. Discounts and Surcharges

| Code | Trigger | Lookback | Level |
|---|---|---|---|
| MULTI | Two or more vehicles on one policy | — | Policy |
| SAFE | No at-fault loss | 60 months | Driver |
| ATF | At-fault loss | 36 months | Driver |
| LAPSE | Coverage lapse over 30 days | 12 months | Policy |

${COVERAGE_DISCLAIMER}

## Appendix A — Revision History

| Revision | Effective (new) | Effective (renewal) | Sections changed |
|---|---|---|---|
| 3 | 2023-01-01 | 2023-03-01 | 2, 3, 4 |`;

// ---------------------------------------------------------------------------
// Coverage opinions — four, authoritative-looking and binding nobody
// ---------------------------------------------------------------------------

const OPINIONS = [
  {
    id: 'OPN-2024-011', issued: '2024-06-20', forms: ['PA-2023-01'],
    title: 'Passenger-Carrying Use of a Private Passenger Auto',
    question: `Whether Physical Damage Coverage under Part IV of PA-2023-01 responds to a loss
occurring while the covered auto was carrying passengers for a fee arranged
through a platform, where no endorsement addressing that use was issued.`,
    short: `The forms considered do not address the question. Exclusion B addresses
carrying property for a fee; Exclusion I addresses renting the vehicle to
another. **Neither addresses carrying persons for a fee.** There is no provision
granting the use and none excluding it. A position either way requires a
judgment the documents do not contain, and should be taken by underwriting and
claims jointly rather than by an adjuster on the file.`,
    analysis: `Exclusion B is written in terms of property. Reading it to reach passengers
requires treating persons as property, which the wording does not support and
which no other provision invites. Exclusion I is written in terms of a rental of
the vehicle itself, in which possession passes to another; a driver carrying a
passenger retains possession throughout. Neither exclusion reaches the facts by
its terms.

The absence of an exclusion is not a grant. Part IV grants coverage for direct
and accidental loss subject to the schedule of exclusions, and nothing in the
grant conditions it on the purpose of the trip.`,
  },
  {
    id: 'OPN-2024-014', issued: '2024-08-05', forms: ['PA-2023-01', 'PA-END-2024-03'],
    title: 'Effect of an Endorsement Absent from the Schedule of Forms',
    question: `Whether an endorsement the insured produces, but which does not appear on the
schedule of forms on the declarations in force on the date of loss, amends the
policy.`,
    short: `It does not. The policy consists of the declarations, the form edition shown on
it, and the endorsements shown on it. An endorsement that is not on that
schedule is not part of the contract, whatever its own text says about
attaching.`,
    analysis: `Section 6.2 provides that the policy's terms may not be changed or waived except
by endorsement issued by the insurer. The schedule of forms on the declarations
is the record of which endorsements were so issued for this policy.

A document that says "this endorsement forms part of your policy" is stating a
conclusion, not establishing one. The declarations is the manifest, and a
document absent from the manifest is not in the contract. Where the insured
produces such a document, the correct handling is to record the assertion,
refer the file, and take no position on the amount until the schedule is
confirmed.`,
  },
  {
    id: 'OPN-2023-007', issued: '2023-09-12', forms: ['PA-2023-01'],
    title: 'Wear and Tear Where a Covered Peril Accelerates Existing Deterioration',
    question: `Whether the wear and tear exclusion removes a loss where a covered collision
accelerated deterioration that was already present.`,
    short: `Partly. The exclusion removes the deterioration, not the collision damage. Where
the two cannot be separated on the evidence, the file should be referred rather
than apportioned by the adjuster.`,
    analysis: `The exclusion is written against loss arising from wear and tear, not against
loss to a worn component. A worn part damaged by a covered impact is damaged by
the impact. What the exclusion removes is the portion of the condition that the
impact did not cause.

Apportionment is a factual question requiring evidence of the pre-loss
condition. Where the inspection cannot establish it, an adjuster should not
estimate the split.`,
  },
  {
    id: 'OPN-2025-003', issued: '2025-02-28', forms: ALL_AUTO_FORMS,
    title: 'Whether a Claims Bulletin Can Narrow a Coverage Grant',
    question: `Whether an adjuster bulletin that imposes a shorter continuation period than a
policy form's stated maximum reduces what the policy pays.`,
    short: `No. A bulletin binds the adjuster, not the contract. It can direct how an
adjuster handles a file, what documentation is obtained, and what requires
referral. It cannot reduce a benefit the form grants.`,
    analysis: `The forms state a maximum. A bulletin stating a shorter period is setting an
internal handling standard within that maximum, and it should be read that way
wherever it can be. Where a bulletin cannot be read consistently with the form,
the form governs and the bulletin is defective.

The converse also holds and is worth stating: a bulletin cannot **extend** a
benefit beyond what the form grants. The per-occurrence maximum is a ceiling in
both directions.`,
  },
];

const opinionBody = (o) => `## Question Presented

${o.question}

## Short Answer

${o.short}

## Documents Considered

| Document | Relevance |
|---|---|
${o.forms.map((f) => `| ${f} | Considered in full |`).join('\n')}

## Analysis

${o.analysis}

## Status of This Opinion

**This is advice, not a determination. It binds nobody** and does not commit the
company to a position. Where an adjuster relies on it, the file note must record
that the position taken was the adjuster's and identify the supervisor who
approved it. An opinion is not a prior claim determination and must not be cited
as one.`;

export function internalDocuments() {
  const out = [];

  for (const [id, title, effective, purpose] of PROCEDURES) {
    out.push({
      file: `procedure-${id.toLowerCase().replace(/^prc-/, '')}.md`,
      body: doc(`${id} — Claims Handling Procedures: ${title}`, {
        Document: id, Type: 'procedure', Jurisdiction: 'National',
        Effective: effective, Status: 'current', Revision: '4',
        Owner: 'Claims Practices', 'Applies to': ALL_AUTO_FORMS,
      }, procedureBody(id, title, purpose)),
    });
  }

  for (const [id, title, effective] of MANUALS) {
    out.push({
      file: `manual-${id.toLowerCase().replace(/^uwm-/, '')}.md`,
      body: doc(`${id} — Personal Auto Underwriting Manual: ${title}`, {
        Document: id, Type: 'manual', Jurisdiction: 'National',
        Effective: effective, Status: 'current', Revision: '3',
        Owner: 'Underwriting', 'Applies to': ALL_AUTO_FORMS,
      }, manualBody(id, title)),
    });
  }

  for (const o of OPINIONS) {
    out.push({
      file: `opinion-${o.id.toLowerCase().replace(/^opn-/, '')}.md`,
      body: doc(`${o.id} — Coverage Opinion: ${o.title}`, {
        'Opinion ID': o.id, Type: 'opinion', Jurisdiction: 'National',
        Effective: o.issued, Status: 'current',
        Author: 'Coverage Counsel', 'Applies to': o.forms,
      }, opinionBody(o)),
    });
  }

  return out;
}
