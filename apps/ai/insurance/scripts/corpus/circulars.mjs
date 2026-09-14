/**
 * State DOI circulars — external, binding-ish, dated, and scoped to ONE state.
 *
 * TWO TRAPS LIVE HERE.
 *
 * 1. TOTAL-LOSS TAX AND FEES. The policy forms say "actual cash value" and are
 *    silent on transactional amounts. Illinois requires sales tax, title and
 *    registration to be included; New York requires sales tax but NOT a title
 *    transfer fee. So the same question — "does this settlement include tax and
 *    fees?" — has three different right answers depending on the rated state,
 *    and NONE of them is in the policy form.
 *
 *    This is the case that discriminates between a model that routes by
 *    QUESTION and one that routes by DOCUMENT TYPE. By document type a circular
 *    is conduct guidance and the form governs coverage; by question this is a
 *    settlement-amount question and the circular decides it. Nothing else in
 *    the corpus forces that distinction.
 *
 * 2. WITHDRAWN BY INDEX. CIR-TX-2022-04's own text says nothing about its
 *    status — it reads as live guidance. It is dead, and the only place that
 *    says so is the metadata. NY DFS genuinely works this way: a circular
 *    letter can be withdrawn on the department's index page while its body is
 *    unchanged. That is precedence which is UNREACHABLE by reading the
 *    document, and therefore unreachable by retrieval over its text — the
 *    strongest argument in the corpus for the documents table.
 *
 * JURISDICTION IS A HARD GATE, not a tiebreak. A circular in one state does not
 * reach a policy issued in another. Every one of these names its state.
 */
import { doc, STATES, ALL_AUTO_FORMS } from './common.mjs';

/**
 * Which forms a circular bears on.
 *
 * NOT every state has an amendatory. Illinois does not, so an Illinois circular
 * applies to the national form alone — and building the id by string
 * concatenation produced "PP 00 01 06 24-IL", a document that does not exist,
 * which sat in `applies_to` looking plausible until the facets landed in one
 * place where it could be read.
 */
const AMENDATORY_BY_STATE = {
  TX: 'PP 01 50 06 24',
  CA: 'PP 01 06 06 24',
  NY: 'PP 01 79 06 24',
  FL: 'PP 01 20 06 24',
};

const formsFor = (st) => {
  if (st === null) return ALL_AUTO_FORMS;
  const amendatory = AMENDATORY_BY_STATE[st];
  return amendatory ? ['PP 00 01 06 24', amendatory] : ['PP 00 01 06 24'];
};

const circular = (c) =>
  doc(`${c.id} — ${c.title}`, {
    'Circular ID': c.id,
    Type: 'circular',
    Jurisdiction: STATES[c.state],
    Effective: c.effective,
    Status: c.status,
    Issuer: `${STATES[c.state]} Department of Insurance`,
    ...(c.supersedes ? { Supersedes: c.supersedes } : {}),
    'Applies to': formsFor(c.state),
  }, c.body);

const STANDING = `## I. Background and Purpose

This bulletin states the Department's interpretation of existing law. A bulletin
states the Department's position; where it and the Insurance Code diverge, the
Code controls.

## II. Applicability and Scope

Applies to private passenger automobile policies issued, delivered, issued for
delivery, or renewed in this State. It does not reach a policy issued in another
state.`;

const CIRCULARS = [
  // ---- TRAP 1: the settlement-amount question the forms are silent on ----
  {
    id: 'CIR-IL-2024-03', state: 'IL', effective: '2024-07-01', status: 'current',
    title: 'Company Bulletin: Total Loss Settlement Components',
    body: `${STANDING}

## III. Department Position

A settlement offer on a declared total loss must reflect the cost of replacing
the vehicle with a comparable one, and must include the transactional amounts a
claimant necessarily incurs to put a replacement vehicle on the road. **A policy
provision stating only that the insurer pays actual cash value does not relieve
the insurer of these components**, which the Department regards as part of the
cost of replacement rather than as an additional benefit.

| Component | First party | Third party |
|---|---|---|
| Vehicle value | Required | Required |
| Sales tax | Required | Not required |
| Title transfer fee | Required | Not required |
| Registration fee | Required | Not required |
| Documentary fee | Not required | Not required |

Where the claimant does not replace the vehicle, the sales tax component remains
payable. Replacement is not a condition precedent.

## IV. Reopening

A first-party total loss claim may be reopened within 33 days of the written
offer where the claimant produces a comparable vehicle at a higher figure. The
written offer must state this right.

## V. Effect on Prior Guidance

Supersedes CIR-IL-2021-08, which remains posted in the Department's archive
marked superseded.`,
    supersedes: 'CIR-IL-2021-08',
  },
  {
    id: 'CIR-IL-2021-08', state: 'IL', effective: '2021-08-16', status: 'superseded',
    title: 'Company Bulletin: Total Loss Settlements',
    body: `${STANDING}

## III. Department Position

A settlement offer on a declared total loss must reflect the cost of a
comparable vehicle. Sales tax is included where the claimant documents the
purchase of a replacement vehicle within 30 days.

## IV. Effect on Prior Guidance

This bulletin does not supersede any earlier bulletin.`,
  },

  // ---- The cross-border control: same question, different right answer ----
  {
    id: 'CIR-NY-2024-02', state: 'NY', effective: '2024-06-01', status: 'current',
    title: 'Insurance Circular Letter: Actual Cash Value and Total Loss Settlements',
    body: `${STANDING}

## III. Department Position

Actual cash value on a declared total loss includes applicable **sales tax**,
whether or not the claimant replaces the vehicle.

It does **not** include a title transfer fee. The Department does not regard the
transfer fee as part of the value of the vehicle, and an insurer is not required
to pay it as a component of a total loss settlement.

| Component | Required in ACV |
|---|---|
| Vehicle value | Yes |
| Sales tax | Yes |
| Title transfer fee | **No** |
| Registration fee | No |

## IV. Effect on Prior Guidance

This circular letter does not supersede any earlier circular letter.`,
  },

  // ---- TRAP 5: dead, and only the metadata says so ----
  {
    id: 'CIR-TX-2022-04', state: 'TX', effective: '2022-04-11', status: 'withdrawn',
    title: "Commissioner's Bulletin: Prompt Payment Timeframes for Automobile Claims",
    body: `${STANDING}

## III. Department Position

An insurer must notify a claimant of acceptance or rejection of a claim not
later than the **10th business day** after receipt of all items requested.

| Event | Timeframe | Measured from |
|---|---|---|
| Acknowledge claim | 10 calendar days | Receipt of notice |
| Accept or reject | 10 business days | Receipt of all requested items |
| Payment after acceptance | 3 business days | Notice of acceptance |

## IV. Effect on Prior Guidance

This bulletin does not supersede any earlier bulletin.`,
  },
  {
    id: 'CIR-TX-2024-06', state: 'TX', effective: '2024-09-01', status: 'current',
    title: "Commissioner's Bulletin: Claims Handling Timeframes",
    body: `${STANDING}

## III. Department Position

An insurer must notify a claimant of acceptance or rejection of a claim not
later than the **15th business day** after receipt of all items requested.

| Event | Timeframe | Measured from |
|---|---|---|
| Acknowledge claim | 15 calendar days | Receipt of notice |
| Accept or reject | 15 business days | Receipt of all requested items |
| Payment after acceptance | 5 business days | Notice of acceptance |

Failure to meet these timeframes accrues statutory interest.

## IV. Effect on Prior Guidance

This bulletin does not supersede any earlier bulletin.`,
  },

  // ---- Siblings, one or two per remaining state ----
  {
    id: 'CIR-CA-2023-04', state: 'CA', effective: '2023-04-03', status: 'current',
    title: 'Bulletin: Betterment and Aftermarket Parts on Automobile Repairs',
    body: `${STANDING}

## III. Department Position

No deduction for betterment may be taken on a part required to restore a vehicle
to its pre-loss condition where that part had no measurable pre-existing damage.

Aftermarket parts may be specified only where they are of like kind and quality
and the estimate identifies them as aftermarket.

## IV. Effect on Prior Guidance

This bulletin does not supersede any earlier bulletin.`,
  },
  {
    id: 'CIR-CA-2025-02', state: 'CA', effective: '2025-03-17', status: 'current',
    title: 'Bulletin: Denial Letter Contents',
    body: `${STANDING}

## III. Department Position

A written denial, in whole or in part, must state **the factual basis and the
legal basis** for each reason relied on, and must explain how the cited
provision applies to the facts found. A denial that names a provision without
that explanation does not satisfy this requirement.

| Required element | First party | Third party |
|---|---|---|
| Each reason stated | Yes | Yes |
| Factual basis per reason | Yes | Yes |
| Legal basis per reason | Yes | Yes |
| How the provision applies | Yes | Yes |
| Department contact details | Yes | Yes |

## IV. Effect on Prior Guidance

This bulletin does not supersede any earlier bulletin.`,
  },
  {
    id: 'CIR-NY-2022-09', state: 'NY', effective: '2022-09-19', status: 'current',
    title: 'Insurance Circular Letter: Glass Repair and Deductible Application',
    body: `${STANDING}

## III. Department Position

Where window glass is repaired rather than replaced, the comprehensive
deductible is not applied. Where the glass is replaced, the deductible applies
in the ordinary way.

## IV. Effect on Prior Guidance

This circular letter does not supersede any earlier circular letter.`,
  },
  {
    id: 'CIR-FL-2023-07', state: 'FL', effective: '2023-07-25', status: 'current',
    title: 'Informational Memorandum: Named-Storm Losses and Deductible Application',
    body: `${STANDING}

## III. Department Position

A loss to a private passenger automobile caused by a named storm is a
comprehensive loss and is subject to the comprehensive deductible shown on the
declarations. A separate percentage deductible may not be applied.

## IV. Effect on Prior Guidance

This memorandum does not supersede any earlier memorandum.`,
  },
  {
    id: 'CIR-FL-2025-01', state: 'FL', effective: '2025-01-21', status: 'current',
    title: 'Informational Memorandum: Assignment of Benefits on Automobile Repairs',
    body: `${STANDING}

## III. Department Position

An assignment of benefits to a repair facility is effective only with the
insurer's written consent. An insurer that withholds consent must state its
reason in writing.

## IV. Effect on Prior Guidance

This memorandum does not supersede any earlier memorandum.`,
  },
];

export function circulars() {
  return CIRCULARS.map((c) => ({
    file: `circular-${c.id.toLowerCase().replace(/^cir-/, '')}.md`,
    body: circular(c),
  }));
}
