/**
 *   pnpm schema:check   (pharma)
 *
 * Hand-written responses through the validator, each asserted to be accepted or
 * rejected as intended. OFFLINE — no model, no Azure, no cost, no database.
 *
 * The runner is generic (`@fde/schema/verify`). What is here is the part that
 * cannot transfer: the CASES — every answer a model could plausibly return
 * against THIS contract, including the four that would be dangerous if they
 * slipped through.
 *
 * NOT the eval suite. Evals test what a real model produces; this tests the
 * contract itself, and it is written before the loop exists on purpose — the
 * prompt and every future eval check are built against this shape, so getting it
 * wrong now means rewriting all three later.
 */
import { z } from 'zod';
import { verifyValidator, verifyDescriptions, type ValidatorCase } from '@fde/schema';
import { validateReleaseAnswer, ReleaseAnswerSchema, type ReleaseAnswer } from './release-schema';

/** The real answer to `release-001`, written as a model should return it. */
const goodAnswer: ReleaseAnswer = {
  summary:
    'The EU certification of LOT-IBU200-2609-B is invalid. The certifying QP\'s GMP ' +
    'refresher training had expired eleven days before she signed, and the procedure ' +
    'in force that day makes such a certification invalid.',
  lot_id: 'LOT-IBU200-2609-B',
  market: 'EU',
  governing_spec_version: 'SPEC-IBU200-v4',
  blockers: [
    {
      code: 'CERTIFIER_TRAINING_LAPSED',
      in_short: "The certifying QP's GMP refresher had expired",
      why_it_blocks:
        'SOP-QC-014 Rev 7 §7.3, in force on 2026-09-04, requires the certifying QP to ' +
        'hold a valid GMP refresher record on the date of certification and makes a ' +
        'certification without one invalid.',
      citations: [
        {
          ref: 'mrd_hcm.training_records#(EMP-0103, TRN-GMP-REF)',
          as_of: '2026-09-04',
          claim: 'the certifying QP had no valid GMP refresher on the day she signed',
          detail: 'expires_on 2026-08-24',
        },
        {
          ref: 'sop:SOP-QC-014 Rev 7#7.3',
          as_of: '2026-09-04',
          claim: 'a certification made without valid refresher training is invalid',
          detail:
            'the certifying QP must hold a valid, unexpired GMP refresher training ' +
            'record on the date of certification',
        },
      ],
    },
  ],
  concerns: [],
  what_would_clear_it: [
    'Re-certify the lot under SOP-QC-014 Rev 7 §7.2 with a Qualified Person who holds ' +
      'a valid GMP refresher record on the date of signature.',
    'Record the re-certification against the lot, naming the person, the date and the ' +
      'procedure revision in force that day.',
  ],
  missing: [],
  unverified_claims: [],
  escalate: {
    reason:
      'An invalid certification on a lot already partly despatched. Re-certification ' +
      'and a recall decision are both a QP\'s to make.',
    suggested_owner: 'Qualified Person, DEPT-QA',
  },
};

const CASES: ValidatorCase[] = [
  {
    name: 'the release-001 answer',
    expect: 'accept',
    body: goodAnswer,
    why: 'the shape the contract exists to carry — if this fails, nothing else matters',
  },

  {
    name: 'clean lot, nothing blocking',
    expect: 'accept',
    body: {
      ...goodAnswer,
      summary:
        'No blocker was found for LOT-IBU200-2608-A to the EU. This is not a ' +
        'certification; the QP reviews and decides.',
      lot_id: 'LOT-IBU200-2608-A',
      blockers: [],
      what_would_clear_it: [],
      escalate: null,
    },
    why: 'the negative control — a contract that only accepts failures proves nothing',
  },

  {
    name: 'blocker without escalation',
    expect: 'must go to a human',
    body: { ...goodAnswer, escalate: null },
    why:
      'THE dangerous case: the system quietly settling a batch-release question ' +
      'that is legally a named human\'s to decide',
  },

  {
    name: 'citation to a dated source with no as_of',
    expect: 'not checkable',
    body: {
      ...goodAnswer,
      blockers: [
        {
          ...goodAnswer.blockers[0],
          citations: [{ ...goodAnswer.blockers[0].citations[0], as_of: null }],
        },
      ],
    },
    why:
      'SOP-QC-014 Rev 6 and Rev 7 give opposite answers; a citation without the ' +
      'date it was read as of is consistent with both',
  },

  {
    name: 'finding with no evidence',
    expect: 'no citations',
    body: {
      ...goodAnswer,
      blockers: [{ ...goodAnswer.blockers[0], citations: [] }],
    },
    why: 'an unevidenced blocker cannot be actioned or disputed',
  },

  {
    name: 'summary says it may ship while blockers stand',
    expect: 'never states that a batch may ship',
    body: {
      ...goodAnswer,
      summary: 'The training lapse is administrative, so the batch may be released to the EU.',
      escalate: goodAnswer.escalate,
    },
    why:
      'the only place a verdict can hide is the prose, because no field can carry one',
  },

  {
    name: 'the remediation list says it may ship',
    expect: 'never states that a batch may ship',
    body: {
      ...goodAnswer,
      what_would_clear_it: [
        'Re-train the QP, after which the batch may be released to the EU.',
      ],
    },
    why:
      'the newest prose field is the likeliest verdict smuggler — "do this and it ' +
      'ships" is the natural way to write a remediation list, and the guard that ' +
      'covers summary is worthless if it stops at summary',
  },

  {
    name: 'a blocker with no stated remedy',
    expect: 'what_would_clear_it is empty',
    body: { ...goodAnswer, what_would_clear_it: [] },
    why:
      'it just quoted the clause, so it knows the steps — leaving the reader to ' +
      'infer them from rule text is the failure the field exists to fix',
  },

  {
    name: 'the explanation pasted into the one-line label',
    expect: 'is a paragraph',
    body: {
      ...goodAnswer,
      blockers: [
        {
          ...goodAnswer.blockers[0],
          in_short: goodAnswer.blockers[0].why_it_blocks + ' ' + goodAnswer.summary,
        },
      ],
    },
    why:
      'the ceiling is deliberately far above the dozen words asked for — it catches ' +
      'a model that ignored the field, not one that wrote thirteen words, because ' +
      'rejecting the second would turn a formatting taste into eval flakiness',
  },

  {
    name: 'nothing said, nobody asked',
    expect: 'escalate',
    body: { ...goodAnswer, summary: null, blockers: [], what_would_clear_it: [], escalate: null },
    why: 'a valid object that helps nobody — silence is not an answer',
  },

  {
    name: 'invented verdict field',
    expect: 'Unrecognized key',
    body: { ...goodAnswer, disposition: 'released' },
    why:
      'the schema is strict so that a verdict cannot be smuggled in as an extra ' +
      'key — the one hole that would undo the no-"ship it" design',
  },

  {
    name: 'prose instead of JSON',
    expect: 'not valid JSON',
    body: 'I cannot determine whether this lot may be released.',
    why: 'a model refusing in prose — must be caught and retried, not crash',
  },
];

const contract = verifyValidator({ cases: CASES, validate: validateReleaseAnswer });
for (const l of contract.lines) console.log(l);

const described = verifyDescriptions(z.toJSONSchema(ReleaseAnswerSchema, { io: 'output' }));
for (const l of described.lines) console.log(l);

console.log('');
process.exit(contract.passed && described.passed ? 0 : 1);
