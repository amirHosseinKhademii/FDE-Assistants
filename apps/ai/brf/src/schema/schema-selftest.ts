/**
 * pnpm schema:check
 *
 * Runs hand-written responses through the validator and asserts that each one is
 * accepted or rejected as intended. Offline: no model, no cost.
 *
 * The runner and the description walk are generic and live in @fde/schema, including
 * the negative control that makes the description check mean something. The cases
 * here belong to this application: every response a model could plausibly return
 * against this contract, including the ones that would be dangerous if they got
 * through.
 */
import { z } from 'zod';
import { verifyValidator, verifyDescriptions, type ValidatorCase } from '@fde/schema';
import { BrfAnswerSchema, REFUSAL_TEXT, validateBrfAnswer, type BrfAnswer } from './answer-schema';

const fullAnswer: BrfAnswer = {
  answer:
    'Elgrill får användas på balkong och uteplats från och med 2025-04-01. ' +
    'Grillning med kol eller gas är fortsatt inte tillåten.',
  citations: [
    {
      file: 'protokoll-2025-03-12.md',
      section: '§ 2',
      claim: 'elgrill får användas på balkong och uteplats från och med 2025-04-01',
      detail:
        'Styrelsen beslutade att elgrill får användas på balkong och uteplats från och med 2025-04-01.',
    },
  ],
  unverified_claims: [],
  conflicts: [
    {
      topic: 'grillning på balkong',
      positions: [
        {
          file: 'ordningsregler.md',
          section: '§ 2',
          says: 'Grillning med kol, gas eller el är inte tillåten på balkonger och uteplatser.',
        },
        {
          file: 'protokoll-2025-03-12.md',
          section: '§ 2',
          says: 'Elgrill får användas på balkong och uteplats från och med 2025-04-01.',
        },
      ],
      resolved_by: 'protokoll-2025-03-12.md § 2',
    },
  ],
  escalate: null,
};

const CASES: ValidatorCase[] = [
  {
    name: 'grill on the balcony: conflict settled by the minutes',
    expect: 'accept',
    body: fullAnswer,
    why: 'the minutes say the decision replaces the house rule, so the contradiction is settled and answering is correct',
  },

  {
    name: 'sauna on the balcony: not addressed, clean escalation',
    expect: 'accept',
    body: {
      answer: null,
      citations: [],
      unverified_claims: [],
      conflicts: [],
      escalate: {
        reason:
          'No document addresses saunas or other heating equipment on balconies. The house rules on ' +
          'grilling are a different matter and do not decide it.',
        suggested_owner: 'styrelsen',
      },
    } satisfies BrfAnswer,
    why: 'a clean escalation with no answer is the correct response to a genuine gap',
  },

  {
    name: 'refusal in the agreed sentence, nothing cited',
    expect: 'accept',
    body: {
      answer: REFUSAL_TEXT,
      citations: [],
      unverified_claims: [],
      conflicts: [],
      escalate: {
        reason: 'No document addresses paid parking for members.',
        suggested_owner: 'styrelsen',
      },
    } satisfies BrfAnswer,
    why: 'a refusal makes no claim, so it needs no citation. This is the answer the board sees when the documents are silent.',
  },

  {
    name: 'house rule conflicts with the statutes, the statutes win',
    expect: 'accept',
    body: {
      answer:
        'Andrahandsuthyrning kräver styrelsens samtycke, och samtycke ska ges när det finns beaktansvärda skäl. ' +
        'Stadgarna gäller före ordningsreglerna.',
      citations: [
        {
          file: 'stadgar.md',
          section: '§ 7',
          claim: 'samtycke ska ges när det finns beaktansvärda skäl',
          detail: 'Styrelsens samtycke krävs, och samtycke ska lämnas om det finns beaktansvärda skäl.',
        },
      ],
      unverified_claims: [],
      conflicts: [
        {
          topic: 'andrahandsuthyrning',
          positions: [
            { file: 'ordningsregler.md', section: '§ 9', says: 'Andrahandsuthyrning är inte tillåten.' },
            { file: 'stadgar.md', section: '§ 7', says: 'Samtycke ska lämnas vid beaktansvärda skäl.' },
          ],
          resolved_by: 'stadgar.md § 17',
        },
      ],
      escalate: null,
    } satisfies BrfAnswer,
    why: 'the statutes state that house rules that conflict with them do not apply, so the conflict is settled and answering is correct',
  },

  {
    name: 'partial answer plus a flag',
    expect: 'accept',
    body: {
      answer:
        'Sannolikt gäller reglerna om grillning även här, men det är inte säkert att de täcker den här utrustningen.',
      citations: [
        {
          file: 'ordningsregler.md',
          section: '§ 2',
          claim: 'grillning på balkong regleras av ordningsreglerna',
          detail:
            'Grillning med kol, gas eller el är inte tillåten på balkonger och uteplatser.',
        },
      ],
      unverified_claims: ['att utrustningen omfattas av samma regel'],
      conflicts: [],
      escalate: {
        reason:
          'The house rules name grills, not other heating equipment, so the rule may not reach this case.',
        suggested_owner: 'styrelsen',
      },
    } satisfies BrfAnswer,
    why: 'a partial answer with a flag gives the board the research and the decision together',
  },

  // ---- the dangerous ones -------------------------------------------------

  {
    name: 'DANGEROUS: unresolved conflict, silently picked a side',
    expect: 'must be escalated, never decided',
    body: { ...fullAnswer, conflicts: [{ ...fullAnswer.conflicts[0], resolved_by: null }] },
    why:
      'two documents disagree, nothing settles it, and the model answered anyway. This is the single ' +
      'worst failure this contract exists to prevent.',
  },

  {
    name: 'DANGEROUS: answered with no evidence of any kind',
    expect: 'must be in one list or the other',
    body: { ...fullAnswer, citations: [], unverified_claims: [], conflicts: [] },
    why: 'a confident answer backed by nothing and admitting nothing',
  },

  {
    name: 'DANGEROUS: a refusal with a claim tacked on',
    expect: 'must be in one list or the other',
    body: {
      ...fullAnswer,
      answer: 'Det framgår inte av föreningens dokument. Grillning med kol är förbjudet.',
      citations: [],
      unverified_claims: [],
      conflicts: [],
      escalate: { reason: 'Nothing settles it.', suggested_owner: 'styrelsen' },
    },
    why: 'the refusal sentence is not a licence to add unsourced claims after it',
  },

  {
    name: 'USELESS: no answer and no escalation',
    expect: 'if you cannot answer, say why',
    body: { ...fullAnswer, answer: null, escalate: null, conflicts: [] },
    why: 'passes the shape check and tells the board nothing. Coherence catches it.',
  },

  // ---- malformed ----------------------------------------------------------

  {
    name: 'missing a required field',
    expect: 'does not match schema',
    body: (() => {
      const { escalate, ...rest } = fullAnswer;
      return rest;
    })(),
    why: 'the model omitted escalate rather than setting it to null',
  },

  {
    name: 'invented an extra field',
    expect: 'does not match schema',
    body: { ...fullAnswer, confidence: 0.92 },
    why: 'additionalProperties is false. A confidence score is the authoritative-looking number with nothing behind it.',
  },

  {
    name: 'conflict with only one position',
    expect: 'fewer than two positions',
    body: {
      ...fullAnswer,
      conflicts: [{ ...fullAnswer.conflicts[0], positions: [fullAnswer.conflicts[0].positions[0]] }],
    },
    why: 'a conflict with one side is not a conflict',
  },

  {
    name: 'prose instead of JSON',
    expect: 'not valid JSON',
    body: 'Jag kan tyvärr inte avgöra det utifrån dokumenten.',
    why: 'a model refusing in prose must be caught and retried, not allowed to crash the loop',
  },
];

// ---------------------------------------------------------------------------

const contract = verifyValidator({ cases: CASES, validate: validateBrfAnswer });
for (const l of contract.lines) console.log(l);

// Runs after the case table, so a description regression is reported alongside it
// rather than hidden behind an early exit.
const described = verifyDescriptions(z.toJSONSchema(BrfAnswerSchema, { io: 'output' }));
for (const l of described.lines) console.log(l);

console.log('');
process.exit(contract.passed && described.passed ? 0 : 1);
