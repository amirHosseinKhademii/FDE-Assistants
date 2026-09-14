/**
 *   pnpm schema:check
 *
 * Runs hand-written responses through the validator and asserts each is
 * accepted or rejected as intended. OFFLINE — no model, no Azure, no cost.
 *
 * The runner and the description walk are generic and live in `@fde/schema`
 * (`verify.ts`), including the negative control that makes the description
 * check mean anything. What is here is the part that cannot transfer: the
 * CASES — every response a model could plausibly return against THIS contract,
 * including the three that would be dangerous if they slipped through.
 *
 * This is not the eval suite (that is Pillar 4, and it tests what a real model
 * actually produces). This tests the contract itself.
 *
 * Written before the loop exists on purpose. The contract is what the loop, the
 * prompt, and every future eval check are built against — getting it wrong now
 * means rewriting all three later.
 */
import {
  validateCoverageAnswer,
  CoverageAnswerSchema,
  type CoverageAnswer,
} from './coverage-schema';
import { z } from 'zod';
import { verifyValidator, verifyDescriptions, type ValidatorCase } from '@fde/schema';

const fullAnswer: CoverageAnswer = {
  answer: '$50 per day, up to 21 days.',
  policy_id: 'AUT-4471',
  policy_form: 'PA-2023-01',
  citations: [
    {
      source: 'record:AUT-4471',
      claim: 'endorsement PA-END-2024-03 is attached to this policy',
      detail: 'Endorsements Attached: PA-END-2024-03',
    },
    {
      source: 'policy:PA-END-2024-03#daily-limit',
      claim: 'the endorsement pays $50/day for 21 days',
      detail: 'We pay $50 per day, up to 21 days for each occurrence.',
    },
  ],
  unverified_claims: [],
  conflicts: [
    {
      topic: 'rental reimbursement daily limit and duration',
      positions: [
        { source: 'policy:PA-2023-01#4.4', says: '$40 per day, maximum 30 days' },
        { source: 'policy:PA-END-2024-03#daily-limit', says: '$50 per day, up to 21 days' },
      ],
      resolved_by: 'record:AUT-4471',
    },
  ],
  escalate: null,
};

const CASES: ValidatorCase[] = [
  {
    name: 'AUT-4471 — conflict resolved by the record',
    expect: 'accept',
    body: fullAnswer,
    why: 'the record names the endorsement, so the contradiction is settled and answering is correct',
  },

  {
    name: 'AUT-4473 — rideshare, nothing in the corpus addresses it',
    expect: 'accept',
    body: {
      answer: null,
      policy_id: 'AUT-4473',
      policy_form: 'PA-2023-01',
      citations: [],
      unverified_claims: [],
      conflicts: [],
      escalate: {
        reason:
          'No document in the corpus addresses carrying passengers for a fee. ' +
          'Exclusion B covers goods and property only; Exclusion I covers ' +
          'renting the vehicle to others. Neither applies to rideshare driving.',
        suggested_owner: 'underwriting referral desk',
      },
    } satisfies CoverageAnswer,
    why: 'a clean escalation with no answer is the correct response to a genuine gap',
  },

  {
    name: 'AUT-4482 — partial answer plus a flag',
    expect: 'accept',
    body: {
      answer: 'Likely $50/day for 21 days, but this depends on an unconfirmed endorsement.',
      policy_id: 'AUT-4482',
      policy_form: 'PA-2023-01-FL',
      citations: [
        {
          source: 'record:AUT-4482',
          claim: 'PA-END-2024-03 appears on the record but is not countersigned',
          detail: 'the countersigned copy has not been returned by the agent',
        },
      ],
      unverified_claims: ['whether PA-END-2024-03 is actually in force on this policy'],
      conflicts: [
        {
          topic: 'rental reimbursement daily limit and duration',
          positions: [
            { source: 'policy:PA-2023-01#4.4', says: '$40 per day, maximum 30 days' },
            { source: 'policy:PA-END-2024-03#daily-limit', says: '$50 per day, up to 21 days' },
          ],
          resolved_by: null,
        },
      ],
      escalate: {
        reason: 'endorsement is on the record but not countersigned, so it may not be in force',
        suggested_owner: 'underwriting referral desk',
      },
    } satisfies CoverageAnswer,
    why: 'this is the shape we chose it for — Priya gets the research AND the flag',
  },

  // ---- the dangerous ones -------------------------------------------------

  {
    name: 'DANGEROUS: unresolved conflict, silently picked a side',
    expect: 'must be escalated, never decided',
    body: { ...fullAnswer, conflicts: [{ ...fullAnswer.conflicts[0], resolved_by: null }] },
    why:
      'the single worst failure this schema exists to prevent — two documents ' +
      'disagree, nothing settles it, and the model answered anyway',
  },

  {
    name: 'DANGEROUS: answered with no evidence of any kind',
    expect: 'must be in one list or the other',
    body: { ...fullAnswer, citations: [], unverified_claims: [], conflicts: [] },
    why: 'a confident answer backed by nothing, admitting nothing',
  },

  {
    name: 'USELESS: no answer and no escalation',
    expect: 'if you cannot answer, say why',
    body: { ...fullAnswer, answer: null, escalate: null, conflicts: [] },
    why: 'passes the shape check and tells the adjuster nothing — coherence catches it',
  },

  // ---- malformed ----------------------------------------------------------

  {
    name: 'missing a required field',
    expect: 'does not match schema',
    body: (() => {
      const { escalate, ...rest } = fullAnswer;
      return rest;
    })(),
    why: 'the model omitted escalate rather than setting it null',
  },

  {
    name: 'invented an extra field',
    expect: 'does not match schema',
    body: { ...fullAnswer, confidence: 0.92 },
    why:
      'additionalProperties:false — a confidence score is exactly the kind of ' +
      'authoritative-looking number that has nothing behind it',
  },

  {
    name: 'conflict with only one position',
    expect: 'fewer than two positions',
    body: {
      ...fullAnswer,
      conflicts: [{ ...fullAnswer.conflicts[0], positions: [fullAnswer.conflicts[0].positions[0]] }],
    },
    why: 'a "conflict" with one side is not a conflict',
  },

  {
    name: 'prose instead of JSON',
    expect: 'not valid JSON',
    body: "I'm sorry, I can't determine that from the available documents.",
    why: 'a model refusing in prose — must be caught and retried, not crash',
  },
];

// ---------------------------------------------------------------------------

const contract = verifyValidator({ cases: CASES, validate: validateCoverageAnswer });
for (const l of contract.lines) console.log(l);

// Runs after the case table so a description regression is reported alongside
// it rather than hidden behind an early exit.
const described = verifyDescriptions(z.toJSONSchema(CoverageAnswerSchema, { io: 'output' }));
for (const l of described.lines) console.log(l);

console.log('');
process.exit(contract.passed && described.passed ? 0 : 1);
