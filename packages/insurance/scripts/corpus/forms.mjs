/**
 * The policy wordings — the only documents in the corpus that state what a
 * policy PAYS.
 *
 * These replace the twelve PoC forms. What changed, and why each matters:
 *
 *   ids        `PP 00 01 06 24` rather than `PA-2023-01`. The state is no
 *              longer in the identifier (see form-ids.mjs), and the EDITION is.
 *   metadata   jurisdiction, effective date, status and supersession now sit in
 *              the banner, so the documents table can answer a precedence
 *              question without reading prose.
 *   editions   three editions of the base form, explicitly superseding each
 *              other, so "which wording was in force on the date of loss" is a
 *              real question with a real answer.
 *
 * THE TRAPS THAT MUST SURVIVE, because the corpus is deliberately booby-trapped:
 *
 *   crossing numbers    base form says $40/day for 30 days; the rental
 *                       endorsement says $50/day for 21 days. Neither says
 *                       which policies it attaches to — only a declarations
 *                       page settles that.
 *   state variants      four amendatories, word-identical apart from the
 *                       liability limits. Filtering to the national form and
 *                       reading its numbers is the near-duplicate failure.
 *   rideshare silence   no form addresses carrying passengers for a fee.
 *                       Exclusion B is goods; Exclusion I is renting to
 *                       another. Reasoning by analogy from either is the
 *                       dangerous answer.
 *   unchanged trigger   the 24-hour withdrawal sentence in the rental section
 *                       is WORD-IDENTICAL across all three editions, while the
 *                       schedule AMOUNT changes. That pair is what makes a
 *                       prior determination authority in one case and history
 *                       in the other.
 */
import { doc } from './common.mjs';
import { FORMS, formFile } from './form-ids.mjs';

const EDITIONS = [
  {
    id: FORMS.BASE_2015, edition: '01 15', effective: '2015-01-01',
    status: 'superseded', supersededBy: FORMS.BASE_2018,
    title: 'Personal Auto Policy', rentalDaily: '$30', rentalDays: '30',
    collision: '$1,000', comp: '$500', bi: '$100,000 / $300,000', pd: '$50,000',
  },
  {
    id: FORMS.BASE_2018, edition: '09 18', effective: '2018-09-01',
    status: 'superseded', supersedes: FORMS.BASE_2015, supersededBy: FORMS.BASE,
    title: 'Personal Auto Policy', rentalDaily: '$35', rentalDays: '30',
    collision: '$1,000', comp: '$500', bi: '$100,000 / $300,000', pd: '$50,000',
  },
  {
    id: FORMS.BASE, edition: '06 24', effective: '2024-06-01',
    status: 'current', supersedes: FORMS.BASE_2018,
    title: 'Personal Auto Policy', rentalDaily: '$40', rentalDays: '30',
    collision: '$1,000', comp: '$500', bi: '$100,000 / $300,000', pd: '$50,000',
  },
  {
    id: FORMS.PREFERRED, edition: '06 24', effective: '2024-06-01',
    status: 'current', title: 'Personal Auto Policy — Preferred Program',
    rentalDaily: '$60', rentalDays: '45',
    collision: '$500', comp: '$250', bi: '$250,000 / $500,000', pd: '$100,000',
    extra: {
      heading: 'Preferred Program Benefits',
      body: `**Deductible waiver.** The Collision deductible is waived where the loss is
determined to be not at fault and the at-fault party is identified and insured.

**New vehicle replacement.** A vehicle less than 24 months old and under 24,000
miles at the time of a total loss is replaced with a new vehicle of the same
make and model rather than settled at actual cash value.

**Diminished value.** We pay documented diminished value on a repaired vehicle
less than 36 months old, up to 10% of the pre-loss actual cash value.`,
    },
  },
  {
    id: FORMS.ESSENTIAL, edition: '06 24', effective: '2024-06-01',
    status: 'current', title: 'Personal Auto Policy — Essential Program',
    rentalDaily: '$25', rentalDays: '15',
    collision: '$1,500', comp: '$1,000', bi: '$50,000 / $100,000', pd: '$25,000',
    extra: {
      heading: 'Essential Program Restrictions',
      body: `**Rental Reimbursement is OPTIONAL on this form** and applies only where it is
shown on the Declarations with a premium charge. Absence of a premium charge
means the benefit was not purchased.

**Towing and Labor** is not offered on this form.

**Parts.** Repairs are settled using aftermarket or recycled parts of like kind
and quality where available, at our option.`,
    },
  },
];

const AMENDATORY = [
  { id: FORMS.TX, state: 'Texas', bi: '$30,000 / $60,000', pd: '$25,000',
    body: `**Uninsured/Underinsured Motorist Coverage** is offered and must be rejected in
writing by the named insured. Where no written rejection is on file, the
coverage applies at the Bodily Injury limits shown above.

**Appraisal.** Either party may demand appraisal of the loss within 90 days of
the filing of proof of loss. Each party selects a competent appraiser and the
two select an umpire.

**Prompt payment.** We will notify the policyholder of acceptance or rejection
of a claim not later than the 15th business day after receipt of all items
requested. Failure to do so accrues statutory interest.` },
  { id: FORMS.CA, state: 'California', bi: '$15,000 / $30,000', pd: '$5,000',
    body: `**Cancellation.** After this policy has been in effect for 60 days, we may
cancel only for non-payment of premium, fraud, or a substantial increase in the
hazard insured against.

**Total loss settlement.** Where a vehicle is declared a total loss, settlement
includes sales tax and applicable transfer and registration fees.

**Betterment.** No deduction for betterment is taken on parts required to
restore the vehicle to its pre-loss condition where the part had no measurable
pre-existing damage.` },
  { id: FORMS.NY, state: 'New York', bi: '$25,000 / $50,000', pd: '$10,000',
    body: `**Personal Injury Protection** is mandatory and applies at $50,000 per person
regardless of the amount shown in the Schedule above.

**Supplementary Uninsured/Underinsured Motorist Coverage** is available at the
Bodily Injury limits and applies unless rejected in writing.

**Glass.** Full glass repair is available without application of the
Comprehensive deductible where the glass is repaired rather than replaced.` },
  { id: FORMS.FL, state: 'Florida', bi: '$10,000 / $20,000', pd: '$10,000',
    body: `**Personal Injury Protection** applies at $10,000 and is primary for medical
expenses arising from a covered accident, subject to the 14-day initial
treatment requirement.

**Named storms.** Hurricane and named-storm losses are Comprehensive losses and
are subject to the Comprehensive deductible shown above, not to a separate
percentage deductible.

**Assignment of benefits** to a repair facility requires our written consent.` },
];

const definitions = `## Part I — Definitions

### 1.1 Terms Used Throughout

**"We", "us", "our"** means Meridian Mutual Insurance Company.

**"You", "your"** means the named insured shown in the Declarations and, if that
person is an individual, the spouse if a resident of the same household.

**"Your covered auto"** means any vehicle shown in the Declarations, a newly
acquired auto, a trailer you own, or a temporary substitute for a vehicle listed
in the Declarations that is out of normal use because of breakdown, repair,
servicing, loss, or destruction.

**"Actual cash value"** means the replacement cost of the property at the time of
loss, less depreciation for age, wear, and condition.

**"Collision"** means the upset of your covered auto, or its impact with another
vehicle or object.`;

/**
 * Part IV. The 24-hour trigger sentence in 4.4 is IDENTICAL in every edition,
 * on purpose — only the schedule amount moves. See the header.
 */
const physicalDamage = (f) => `## Part IV — Physical Damage Coverage

### 4.1 Comprehensive Coverage

We will pay for direct and accidental loss to your covered auto not caused by
collision, less any applicable deductible shown in the Declarations. Loss caused
by fire, theft, larceny, explosion, earthquake, windstorm, hail, water, flood,
vandalism, riot, contact with a bird or animal, or breakage of glass is
considered other than collision.

### 4.2 Collision Coverage

We will pay for direct and accidental loss to your covered auto caused by
collision, less any applicable deductible shown in the Declarations.

Our limit of liability for loss will be the lesser of the actual cash value of
the damaged property, or the amount necessary to repair or replace the property
with other property of like kind and quality.

### 4.3 Schedule of Limits and Deductibles

Amounts below are the standard offering for form ${f.id}. **The Declarations
page for an individual policyholder controls where it differs.**

| Coverage | Limit | Deductible |
|---|---|---|
| Collision | Actual cash value | ${f.collision} |
| Comprehensive | Actual cash value | ${f.comp} |
| Rental Reimbursement | ${f.rentalDaily} per day, ${f.rentalDays} days max | None |
| Bodily Injury Liability | ${f.bi} | None |
| Property Damage Liability | ${f.pd} | None |

Deductibles apply per occurrence, not per claim year.

### 4.4 Rental Reimbursement

If your covered auto is withdrawn from use for more than 24 consecutive hours
because of a loss covered under Part IV, we will pay reasonable expenses you
incur for a rental vehicle of a class comparable to your covered auto.

Under form ${f.id} we will pay **${f.rentalDaily} per day, for a maximum of
${f.rentalDays} days** per occurrence.

Coverage begins 24 hours after the loss is reported to us and ends on the
earliest of the day your covered auto is returned to use, the day we pay the
actual cash value for a total loss, or the day the ${f.rentalDays}-day maximum
is reached.

### 4.5 Duties After a Loss

A person seeking coverage under this Part must notify us promptly of how, when,
and where the loss occurred; take reasonable steps to protect the vehicle from
further loss; permit us to inspect and appraise the damaged property before its
repair or disposal; and provide a police report where the loss involves theft,
vandalism, or a collision with an unidentified vehicle.`;

const general = (f) => `## Part VI — General Provisions

### 6.1 Policy Period and Territory

This policy applies only to accidents and losses which occur during the policy
period shown in the Declarations and within the United States of America, its
territories or possessions, or Canada.

### 6.2 Changes

This policy contains all the agreements between you and us. Its terms may not be
changed or waived except by endorsement issued by us. Where an endorsement is
attached to this policy and shown on the Declarations, the terms of the
endorsement apply to the coverage it names.

### 6.3 Exclusions

Physical Damage Coverage under Part IV is subject to the Schedule of Exclusions
attached to this form. See ${FORMS.EXCLUSIONS} for the full lettered list.`;

const baseForm = (f) =>
  doc(`${f.id} — ${f.title}`, {
    'Form ID': f.id, Type: 'form', Edition: f.edition, Jurisdiction: 'National',
    Effective: f.effective, Status: f.status,
    ...(f.supersedes ? { Supersedes: f.supersedes } : {}),
    'Applies to': [f.id],
  }, [
    definitions,
    physicalDamage(f),
    f.extra ? `## Part V — ${f.extra.heading}\n\n### 5.1 ${f.extra.heading}\n\n${f.extra.body}` : '',
    general(f),
  ].filter(Boolean).join('\n\n'));

const amendatoryForm = (a) =>
  doc(`${a.id} — Personal Auto Policy: ${a.state} Amendatory Endorsement`, {
    'Form ID': a.id, Type: 'amendatory', Edition: '06 24', Jurisdiction: a.state,
    Effective: '2024-06-01', Status: 'current', Amends: FORMS.BASE,
    'Applies to': [FORMS.BASE, a.id],
  }, `## About This Endorsement

This endorsement amends ${FORMS.BASE} for risks located in ${a.state}. **Where
this endorsement is silent, ${FORMS.BASE} controls.** It applies only to
policies issued in ${a.state}; it has no effect on a policy issued elsewhere.

## Part IV — Physical Damage Coverage

### 4.3 Schedule of Limits and Deductibles

The following limits replace those shown in ${FORMS.BASE} for risks in
${a.state}.

| Coverage | Limit | Deductible |
|---|---|---|
| Collision | Actual cash value | $1,000 |
| Comprehensive | Actual cash value | $500 |
| Rental Reimbursement | $40 per day, 30 days max | None |
| Bodily Injury Liability | ${a.bi} | None |
| Property Damage Liability | ${a.pd} | None |

## Part V — ${a.state} Amendments

### 5.1 ${a.state} Amendments

${a.body}

## All Other Provisions

All other provisions of ${FORMS.BASE} apply unchanged.`);

const rentalEndorsement = () =>
  doc(`${FORMS.RENTAL_END} — Extended Transportation Expenses`, {
    'Form ID': FORMS.RENTAL_END, Type: 'endorsement', Edition: '06 24',
    Jurisdiction: 'National', Effective: '2024-06-01', Status: 'current',
    Amends: FORMS.BASE, 'Applies to': [FORMS.BASE],
  }, `## About This Endorsement

This endorsement changes the transportation expenses benefit. Where it is
attached to a policy **and shown on the Declarations**, the wording below is
used in place of the rental reimbursement provisions of the form it amends.

This endorsement does not state which policies it is attached to. That is
recorded on the Declarations page for the individual policyholder.

## Transportation Expenses

### Daily Amount and Maximum

We will pay **$50 per day, for a maximum of 21 days** per occurrence, for
reasonable expenses you incur for a rental vehicle while your covered auto is
withdrawn from use because of a loss covered under Part IV.

### What This Replaces

The daily amount and the maximum number of days stated in the Schedule of Limits
and Deductibles of the form this endorsement amends do not apply where this
endorsement is attached.

### Comparable Class

The rental vehicle must be of a class comparable to your covered auto. Where a
higher class is rented, we pay at the comparable class rate.

## Questions

Direct questions about this endorsement to Product Operations.`);

const glassEndorsement = () =>
  doc(`${FORMS.GLASS_END} — Full Glass Coverage`, {
    'Form ID': FORMS.GLASS_END, Type: 'endorsement', Edition: '01 20',
    Jurisdiction: 'National', Effective: '2020-01-01', Status: 'current',
    Amends: FORMS.BASE, 'Applies to': [FORMS.BASE],
  }, `## About This Endorsement

This endorsement changes how glass damage is handled. Where it is attached to a
policy and shown on the Declarations, the wording below is used.

## Comprehensive Coverage

### Glass Damage

Damage to window glass, windshields, and sunroofs is a comprehensive loss.

#### Repair Rather Than Replace

If the damage can be safely repaired rather than replaced, we pay the full cost
of the repair and **no deductible applies**. A chip smaller than a US quarter,
away from the driver's primary sightline, is normally repairable.

#### Replacement

If the glass must be replaced, the comprehensive deductible shown on the
Declarations applies in the normal way.

#### Recalibration

Where a windshield carries camera or sensor equipment for driver assistance
systems, we pay the cost of recalibrating that equipment after replacement. A
recalibration is part of the same loss and does not carry a second deductible.

### Choice of Shop

You may use any glass shop. Where you use a shop in our network, the shop bills
us directly and you pay only the deductible, if one applies.`);

/**
 * The exclusions schedule.
 *
 * Note what is NOT here: nothing addresses carrying PASSENGERS for a fee.
 * Exclusion B is property; Exclusion I is renting the vehicle to another.
 * The silence is deliberate and load-bearing.
 */
const exclusionsSchedule = () =>
  doc(`${FORMS.EXCLUSIONS} — Schedule of Exclusions: Physical Damage`, {
    'Form ID': FORMS.EXCLUSIONS, Type: 'schedule', Edition: '06 24',
    Jurisdiction: 'National', Effective: '2024-06-01', Status: 'current',
    Amends: FORMS.BASE, 'Applies to': [FORMS.BASE],
  }, `## Preamble

We do not provide Physical Damage Coverage — Comprehensive or Collision — for
loss arising in the circumstances lettered below. This schedule attaches to
${FORMS.BASE} and forms part of it.

## Lettered Exclusions

**A. Intentional loss.** Loss caused intentionally by or at the direction of any
person seeking coverage.

**B. Carrying property for a fee.** Loss occurring while your covered auto is
being used to carry property for a fee. This does not apply to a share-the-
expense car pool.

**C. Wear and tear.** Loss arising from wear and tear, freezing, mechanical or
electrical breakdown, or road damage to tyres.

**D. Radioactive contamination.** Loss arising from nuclear reaction, radiation
or radioactive contamination.

**E. War.** Loss arising from war, insurrection, rebellion or revolution.

**F. Racing.** Loss occurring while your covered auto is being used in, or
prepared for, any prearranged racing or speed contest.

**G. Equipment not permanently installed.** Loss to electronic equipment not
permanently installed in your covered auto, and to media used with it.

**H. Custom furnishings.** Loss to custom furnishings or equipment in a pickup
or van, unless shown on the Declarations.

**I. Rented to others.** Loss occurring while your covered auto is rented to
another, or held for rental, by any person seeking coverage.

**J. Government seizure.** Loss arising from destruction or confiscation by
governmental or civil authorities.

## Notes

This schedule is a closed list. A circumstance not lettered above is not
excluded by this schedule, and the absence of an exclusion is not itself a grant
of coverage — the grant is in Part IV of the form.`);

export function policyForms() {
  const out = [];
  for (const f of EDITIONS) out.push({ file: formFile(f.id), body: baseForm(f) });
  for (const a of AMENDATORY) out.push({ file: formFile(a.id), body: amendatoryForm(a) });
  out.push({ file: formFile(FORMS.RENTAL_END), body: rentalEndorsement() });
  out.push({ file: formFile(FORMS.GLASS_END), body: glassEndorsement() });
  out.push({ file: formFile(FORMS.EXCLUSIONS), body: exclusionsSchedule() });
  return out;
}
