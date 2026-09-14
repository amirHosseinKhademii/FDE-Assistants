/**
 *   pnpm supplier-schema:check   (pharma)
 *
 * Hand-written responses through the validator, each asserted to be accepted
 * or rejected as intended. OFFLINE — no model, no Azure, no cost, no database.
 *
 * Same rule `release-selftest.ts` states: this is NOT the eval suite. It tests
 * the CONTRACT, written before the prompt or the eval cases so both get built
 * against a shape that is already known to reject the dangerous answers.
 */
import { z } from 'zod';
import { verifyValidator, verifyDescriptions, type ValidatorCase } from '@fde/schema';
import {
  validateSupplierImpactAnswer,
  SupplierImpactAnswerSchema,
  type SupplierImpactAnswer,
} from './supplier-impact-schema';

/** A row-by-row shape of the real Silverbrook (SUP-04) finding. */
const goodAnswer: SupplierImpactAnswer = {
  summary:
    'Silverbrook (SUP-04) was disqualified on 2026-05-20 for an undeclared change of ' +
    'synthesis route. 23 lots made with its material are affected; one reached a ' +
    'hospital and has not been recalled.',
  supplier_id: 'SUP-04',
  supplier_name: 'Silverbrook Synthesis Co.',
  disqualified_on: '2026-05-20',
  rows: [
    {
      lot_id: 'LOT-AMX250-2604-C',
      product_name: 'Amoxicillin 250mg capsules',
      market: 'EU',
      quantity_units: 48000,
      exposure: 'patient_facing',
      in_short: 'Delivered to a hospital pharmacy; not yet recalled',
      findings: [
        {
          code: 'DELIVERED_TO_PATIENT_FACING',
          in_short: 'Reached a hospital pharmacy',
          citations: ['mrd_tms.shipments#SHP-26-0442'],
        },
      ],
      next_action: 'Notify the receiving hospital pharmacy and open a field-alert record.',
      escalate: {
        reason: 'Material from a disqualified supplier reached a patient-facing site.',
        suggested_owner: 'Recall coordinator, DEPT-QA',
      },
    },
    {
      lot_id: 'LOT-IBU200-2605-A',
      product_name: 'Ibuprofen 200mg tablets',
      market: 'US',
      quantity_units: 120000,
      exposure: 'in_our_control',
      in_short: 'Released but still held in our own warehouse',
      findings: [
        {
          code: 'RELEASED_BUT_STILL_HELD_BY_US',
          in_short: 'Released status, never shipped',
          citations: ['mrd_erp.product_lots#LOT-IBU200-2605-A'],
        },
      ],
      next_action: 'Quarantine at the originating warehouse; do not release to a production order.',
      escalate: null,
    },
  ],
  preventable: [
    'MLOT-2606-0055 arrived a month after the disqualification and is still flagged released.',
  ],
  missing: [],
  unverified_claims: [],
  escalate: {
    reason: 'Material from a disqualified supplier is still flagged usable and could be drawn on.',
    suggested_owner: 'QA quarantine',
  },
};

const CASES: ValidatorCase[] = [
  {
    name: 'the Silverbrook answer',
    expect: 'accept',
    body: goodAnswer,
    why: 'the shape the contract exists to carry — if this fails, nothing else matters',
  },

  {
    name: 'clean supplier, nothing affected',
    expect: 'accept',
    body: {
      ...goodAnswer,
      summary: 'No lots made with material from SUP-01 are affected; it has not been disqualified.',
      supplier_id: 'SUP-01',
      supplier_name: 'Northgate Pharma Ingredients',
      disqualified_on: null,
      rows: [],
      preventable: [],
      escalate: null,
    },
    why: 'the negative control — a contract that only accepts affected suppliers proves nothing',
  },

  {
    name: 'patient-facing row without escalation',
    expect: 'must go to a named human',
    body: { ...goodAnswer, rows: [{ ...goodAnswer.rows[0], escalate: null }] },
    why:
      'THE dangerous case: material at a hospital with nobody named to act on it, ' +
      'the row-level twin of release\'s central rule',
  },

  {
    name: 'preventable finding without top-level escalation',
    expect: 'decision for a human today',
    body: { ...goodAnswer, escalate: null },
    why:
      'material still usable from a disqualified supplier is the one finding that ' +
      'can still be prevented — silently accepting it is the system deciding ' +
      'nobody needs to act',
  },

  {
    name: 'in-control row with no next_action',
    expect: 'next_action is null',
    body: {
      ...goodAnswer,
      rows: [goodAnswer.rows[0], { ...goodAnswer.rows[1], next_action: null }],
    },
    why: 'only an expired lot has no remaining action — this one is sitting in our own warehouse',
  },

  {
    name: 'finding with no evidence',
    expect: 'no citations',
    body: {
      ...goodAnswer,
      rows: [{ ...goodAnswer.rows[0], findings: [{ ...goodAnswer.rows[0].findings[0], citations: [] }] }],
    },
    why: 'an unevidenced finding cannot be actioned or disputed',
  },

  {
    name: 'summary states a recall is required',
    expect: 'never decides a recall',
    body: { ...goodAnswer, summary: 'LOT-AMX250-2604-C must be recalled immediately.' },
    why: 'the only place a verdict can hide is the prose, because no field can carry one',
  },

  {
    name: 'a row\'s next_action states a recall verdict',
    expect: 'never decides a recall',
    body: {
      ...goodAnswer,
      rows: [
        { ...goodAnswer.rows[0], next_action: 'Initiate a recall of the affected hospital stock.' },
        goodAnswer.rows[1],
      ],
    },
    why:
      'the newest prose field is the likeliest verdict smuggler — the guard that ' +
      'covers summary is worthless if it stops at summary',
  },

  {
    name: 'the explanation pasted into the one-line label',
    expect: 'is a paragraph',
    body: {
      ...goodAnswer,
      rows: [
        { ...goodAnswer.rows[0], in_short: goodAnswer.rows[0].findings[0].in_short + ' ' + goodAnswer.summary },
        goodAnswer.rows[1],
      ],
    },
    why: 'the ceiling is far above the dozen words asked for — it catches a model that ignored the field',
  },

  {
    name: 'nothing said, nobody asked',
    expect: 'if you cannot answer',
    body: { ...goodAnswer, summary: null, rows: [], preventable: [], escalate: null },
    why: 'a valid object that helps nobody — silence is not an answer',
  },

  {
    name: 'invented verdict field',
    expect: 'Unrecognized key',
    body: { ...goodAnswer, recall_recommended: true },
    why: 'the schema is strict so a verdict cannot be smuggled in as an extra key',
  },

  {
    name: 'prose instead of JSON',
    expect: 'not valid JSON',
    body: 'Twenty-three lots are affected; I recommend recalling the ones at the hospital.',
    why: 'a model refusing or narrating in prose — must be caught and retried, not crash',
  },
];

const contract = verifyValidator({ cases: CASES, validate: validateSupplierImpactAnswer });
for (const l of contract.lines) console.log(l);

const described = verifyDescriptions(z.toJSONSchema(SupplierImpactAnswerSchema, { io: 'output' }));
for (const l of described.lines) console.log(l);

console.log('');
process.exit(contract.passed && described.passed ? 0 : 1);
