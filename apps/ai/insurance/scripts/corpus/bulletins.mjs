/**
 * Adjuster bulletins — dated internal guidance, and the corpus's main
 * supersession trap.
 *
 * WHY 24. Three supersession chains need enough unrelated siblings around them
 * that the stale document is not findable by adjacency: if the only two
 * bulletins in the corpus are BUL-2022-03 and BUL-2024-07, "the newer one"
 * is trivially the right answer for the wrong reason. Sixteen siblings on
 * neighbouring topics make the model actually read the supersession notice.
 *
 * THE FOUR VERBS ARE THE POINT. Research found four distinct effects and they
 * are not interchangeable:
 *
 *   supersedes              predecessor is dead                    (chain A, B)
 *   amends_and_supplements  BOTH stay operative, read together     (chain C)
 *   withdraws               batch kill, adds no guidance           (BUL-2024-12)
 *
 * Chain C is the CONTROL for chain A. A model that learns "later bulletin wins"
 * passes A and fails C — which is how an over-broad fix gets caught, the same
 * way cov-007 catches over-correction on cov-001.
 *
 * NOTHING HERE CHANGES COVERAGE. A bulletin binds the adjuster, not the
 * contract — every one of these says so, because that distinction is the
 * conduct/coverage ladder split and the corpus has to teach it.
 */
import { doc, ALL_AUTO_FORMS, STATES } from './common.mjs';

const OWNER = 'Claims Practices';

const bulletin = (b) =>
  doc(`${b.id} — ${b.title}`, {
    'Bulletin ID': b.id,
    Type: 'bulletin',
    Jurisdiction: b.jurisdiction ?? 'National',
    Effective: b.effective,
    Status: b.status,
    Owner: OWNER,
    ...(b.supersedes ? { Supersedes: b.supersedes } : {}),
    ...(b.amends ? { 'Amends and supplements': b.amends } : {}),
    ...(b.withdraws ? { Withdraws: b.withdraws } : {}),
    'Applies to': b.appliesTo ?? ALL_AUTO_FORMS,
  }, b.body);

/**
 * `note` is the supersession sentence, stated IN THE BODY as well as in the
 * banner. Real archives annotate the stale document itself, because that is the
 * only mechanism that works for a reader who arrives by search rather than by
 * browsing an index.
 */
const effectSection = (b) => {
  if (b.supersedes) {
    return `## Effect on Prior Guidance

This bulletin supersedes ${b.supersedes} in full. ${b.supersedes} remains in the
archive for claims with a date of loss before ${b.effective} and must not be
applied to later losses.`;
  }
  if (b.amends) {
    return `## Effect on Prior Guidance

This bulletin **amends and supplements** ${b.amends}. ${b.amends} is **not**
superseded and remains operative. Both bulletins apply, and where this one is
silent the earlier one continues to govern. Read them together.`;
  }
  if (b.withdraws) {
    return `## Effect on Prior Guidance

The bulletins listed above are withdrawn as of ${b.effective}. This bulletin
adds no substantive guidance of its own; it exists only to retire guidance that
is no longer current.`;
  }
  return `## Effect on Prior Guidance

This bulletin does not supersede any earlier bulletin.`;
};

const scope = `## What This Bulletin Does Not Change

This bulletin sets conduct standards for adjusters. It does not change what any
policy form pays. Coverage is determined by the policy form, the endorsements
attached to it, and the declarations page for the individual policyholder.
Where this bulletin and a policy form appear to disagree about what is payable,
the form governs.`;

// ---------------------------------------------------------------------------
// The three chains, then the siblings.
// ---------------------------------------------------------------------------

const CHAINS = [
  // Chain A — the primary trap. Both documents sit in the index.
  {
    id: 'BUL-2022-03', title: 'Rental Reimbursement: Documentation Required Before Authorisation',
    effective: '2022-03-10', status: 'superseded',
    body: `## 1. Purpose

This bulletin sets out what an adjuster must obtain before authorising rental
reimbursement, and how long reimbursement continues after a total loss is
declared.

## 2. Documentation Required

| Item | Required | Obtained from |
|------|----------|---------------|
| Rental agreement | Always | Claimant |
| Daily rate and class | Always | Rental agreement |
| Repair facility estimate | Where repairable | Assigned appraiser |

## 3. Continuation After a Total Loss Declaration

Reimbursement continues for **7 calendar days** after the written offer is
communicated, in every case, regardless of whether the offer is accepted or
disputed.

## 4. Authority

An adjuster may authorise within the form maximum. Extensions require a senior
adjuster.`,
  },
  {
    id: 'BUL-2024-07', title: 'Rental Reimbursement: Documentation and Continuation After Total Loss',
    effective: '2024-07-15', status: 'current', supersedes: 'BUL-2022-03',
    body: `## 1. Purpose

This bulletin replaces the documentation and continuation standards for rental
reimbursement. It does not change what any form pays.

## 2. Documentation Required

| Item | Required | Obtained from | Retain in file |
|------|----------|---------------|----------------|
| Rental agreement | Always | Claimant or rental vendor | Yes |
| Daily rate and class | Always | Rental agreement | Yes |
| Repair facility estimate | Where repairable | Assigned appraiser | Yes |
| Total loss determination | Where declared | Appraisal unit | Yes |

## 3. Continuation After a Total Loss Declaration

The flat 7-day period in the superseded bulletin is replaced. Continuation now
depends on what happens to the offer:

| Circumstance | Continuation after written offer |
|---|---|
| Offer accepted | 3 calendar days |
| Offer disputed, appraisal not demanded | 5 calendar days |
| Appraisal demanded under the policy | Until the appraisal award |

The per-occurrence maximum on the governing form is a ceiling this bulletin
cannot raise. Where the table would exceed it, the form controls.

## 4. Authority

| Action | Adjuster | Senior adjuster | Supervisor |
|---|---|---|---|
| Authorise within form maximum | Yes | Yes | Yes |
| Extend beyond the table | No | Yes | Yes |
| Authorise above comparable class | No | No | Yes |`,
  },

  // Chain B — three deep, so "the second one" is also wrong.
  {
    id: 'BUL-2021-05', title: 'Total Loss Valuation: Comparable Vehicle Selection',
    effective: '2021-05-20', status: 'superseded',
    body: `## 1. Purpose

How to select comparable vehicles when valuing a total loss.

## 2. Standard

A minimum of **one** comparable vehicle within 100 miles is sufficient to
support a valuation.

## 3. Documentation

Record the source and date of each comparable in the file.`,
  },
  {
    id: 'BUL-2023-02', title: 'Total Loss Valuation: Comparable Vehicle Selection and Condition Adjustment',
    effective: '2023-02-14', status: 'superseded', supersedes: 'BUL-2021-05',
    body: `## 1. Purpose

Replaces the comparable-selection standard and adds condition adjustment.

## 2. Standard

A minimum of **two** comparable vehicles within 50 miles is required.

## 3. Condition Adjustment

| Factor | Adjustment basis | Documented in |
|---|---|---|
| Mileage | Per-mile table | Valuation report |
| Prior damage | Itemised | Valuation report |
| Options | Per-option table | Valuation report |`,
  },
  {
    id: 'BUL-2025-01', title: 'Total Loss Valuation: Comparable Selection, Condition, and Documentation',
    effective: '2025-01-08', status: 'current', supersedes: 'BUL-2023-02',
    body: `## 1. Purpose

The current standard for valuing a total loss. Replaces the 2023 bulletin in
full.

## 2. Standard

A minimum of **three** comparable vehicles within 50 miles, or a documented
explanation where fewer are available.

## 3. Condition Adjustment

| Factor | Adjustment basis | Documented in |
|---|---|---|
| Mileage | Per-mile table | Valuation report |
| Prior damage | Itemised, with photographs | Valuation report |
| Options | Per-option table | Valuation report |
| Reconditioning | Itemised | Valuation report |

## 4. What the Valuation Does Not Decide

The valuation establishes the vehicle's value. Which transactional amounts are
added to it — tax, title, registration — is governed by the rated state's
requirements, not by this bulletin.`,
  },

  // Chain C — the CONTROL. Both remain operative.
  {
    id: 'BUL-2021-04', title: 'First Contact and Acknowledgement Standards',
    effective: '2021-04-02', status: 'current',
    body: `## 1. Purpose

Timeliness standards for first contact on a new claim.

## 2. Standard

| Event | Standard | Measured from |
|---|---|---|
| Acknowledge claimant | 2 business days | Receipt of notice |
| Assign adjuster | 2 business days | Receipt of notice |
| First substantive contact | 5 business days | Assignment |

## 3. Documentation

Each contact attempt is noted with date, time and channel.`,
  },
  {
    id: 'BUL-2025-02', title: 'First Contact: Additional Standards for Electronic Channels',
    effective: '2025-02-11', status: 'current', amends: 'BUL-2021-04',
    body: `## 1. Purpose

This bulletin adds standards for claims notified through electronic channels.
It does **not** replace the timeliness standards already in force.

## 2. What Is Added

| Channel | Acknowledgement | Measured from |
|---|---|---|
| Mobile app | Same business day | Submission |
| Web portal | Same business day | Submission |
| Email | 1 business day | Receipt |

## 3. What Is Unchanged

The assignment and first-contact standards continue to apply exactly as
written in the bulletin this one supplements. Telephone and postal notices are
not affected by this bulletin at all.`,
  },

  // The batch withdrawal.
  {
    id: 'BUL-2024-12', title: 'Withdrawal of Superseded Claims Bulletins',
    effective: '2024-12-01', status: 'current',
    withdraws: 'BUL-2019-01, BUL-2019-06, BUL-2020-02',
    body: `## 1. Purpose

Housekeeping. The bulletins named above are withdrawn because the procedures
they referenced no longer exist.

## 2. What This Means

A withdrawn bulletin is not guidance. It remains in the archive so that claims
with an earlier date of loss can be reconstructed, and for no other reason.`,
  },
];

/** Siblings: adjacent topics, no supersession, so adjacency proves nothing. */
const SIBLING_TOPICS = [
  ['BUL-2023-05', 'Appraisal Demands: Handling and Timelines', '2023-05-09'],
  ['BUL-2023-07', 'Storage and Towing Charges on a Non-Driveable Vehicle', '2023-07-18'],
  ['BUL-2023-09', 'Aftermarket and Recycled Parts: When They May Be Specified', '2023-09-06'],
  ['BUL-2023-11', 'Diminished Value Claims: Referral Path', '2023-11-14'],
  ['BUL-2024-01', 'Glass-Only Claims: Recalibration of Driver Assistance Systems', '2024-01-16'],
  ['BUL-2024-03', 'Theft Claims: Documentation and Waiting Period', '2024-03-05'],
  ['BUL-2024-05', 'Deductible Waiver on Not-At-Fault Losses', '2024-05-21'],
  ['BUL-2024-09', 'Subrogation Referral Thresholds', '2024-09-10'],
  ['BUL-2024-11', 'Salvage Retention by the Insured', '2024-11-12'],
  ['BUL-2025-03', 'Catastrophe Response: Hail Events', '2025-03-04'],
  ['BUL-2025-04', 'Rental Vehicle Class Matching', '2025-04-15'],
  ['BUL-2025-05', 'Supplement Requests from Repair Facilities', '2025-05-13'],
  ['BUL-2025-06', 'Photographs Required at Inspection', '2025-06-03'],
  ['BUL-2025-07', 'Claimant Contact After Two Failed Attempts', '2025-07-08'],
  ['BUL-2025-08', 'Reserve Adequacy Reviews', '2025-08-12'],
  ['BUL-2025-09', 'File Closure and Reopening', '2025-09-02'],
];

const siblingBody = (title) => `## 1. Purpose

Standards for handling ${title.toLowerCase()}. This bulletin sets conduct
expectations and does not alter coverage.

## 2. Standard

| Step | Standard | Measured from |
|---|---|---|
| Initial review | 2 business days | Trigger event |
| Documentation complete | 5 business days | Initial review |
| Referral where required | Same business day | Threshold met |

## 3. Documentation

The file records what was done, when, and by whom. A decision that cannot be
reconstructed from the file has not been documented.

## 4. Escalation

Refer to the claims desk supervisor where the governing form is unconfirmed, or
where two documents state different requirements and nothing settles which
applies.`;

export function bulletins() {
  const all = CHAINS.map((b) => ({ ...b, body: `${b.body}\n\n${effectSection(b)}\n\n${scope}` }));

  for (const [id, title, effective] of SIBLING_TOPICS) {
    all.push({
      id, title, effective, status: 'current',
      body: `${siblingBody(title)}\n\n${effectSection({})}\n\n${scope}`,
    });
  }

  return all.map((b) => ({
    file: `bulletin-${b.id.toLowerCase().replace(/^bul-/, '')}.md`,
    body: bulletin(b),
  }));
}
