/**
 * `pnpm safety:schema` — stage 5.1, 5.2 and 5.3.
 *
 * ── EVERY RULE IS TESTED IN BOTH DIRECTIONS ───────────────────────────────
 *
 * Each rule gets a case it must REJECT and the whole table shares a case it
 * must ACCEPT. A rule that rejects everything passes a suite fed only bad
 * input, and that is not a hypothetical: insurance's control case exists
 * because a fix that made the system escalate on everything turned one eval
 * green and another red.
 *
 * ── AND THE FIXTURES ARE HAND-WRITTEN ─────────────────────────────────────
 *
 * No model produced these. They are what a right answer and five specific wrong
 * answers look like, written from `docs/safety/WALKTHROUGH.md`. The contract is
 * being tested, not the model — that comes at stage 7.
 */
import { z } from 'zod';
import { verifyValidator, verifyDescriptions, type ValidatorCase } from '@fde/schema';
import {
  SafetyAnswerSchema,
  coherenceErrors,
  evidenceErrors,
  validateSafetyAnswer,
  type SafetyAnswer,
} from './safety-answer';

/**
 * A correct REC-001 answer.
 *
 * Note what it does NOT say. It reports 1,057 and 89 and draws no conclusion
 * from them, because complaints filed after a recall are allegations. It
 * escalates, because "is the fix holding" is not settled by this corpus.
 */
const GOOD: SafetyAnswer = {
  answer:
    'Yes — the transmission park problem on the 2020 F-150 is a known defect, covered by recall ' +
    '20V197000, which Ford issued voluntarily and for which owners were notified on 2020-04-27. ' +
    'The defect is a shift cable locking clip that may not be fully seated, so the transmission ' +
    'can be in a different gear than the selector indicates. Since that date, 1,057 power-train ' +
    'complaints have been filed on the F-150, of which 89 describe park, PRNDL, roll-away or ' +
    'shift-cable symptoms. Whether those vehicles had the remedy applied is not recorded in this ' +
    'corpus, so the complaint counts do not establish whether the repair is effective.',
  campaigns: ['20V197000'],
  citations: [
    { source: 'NHTSA recall campaign 20V197000', claim: 'the shift cable locking clip defect and its remedy' },
    { source: 'NHTSA ODI complaint 11353867', claim: 'a park-position failure reported after the recall date' },
  ],
  counts: [
    {
      label: 'F-150 power-train complaints filed after 2020-04-27',
      value: 1057,
      filter: { make: 'FORD', model: 'F-150', component: 'POWER TRAIN', filed_after: '2020-04-27' },
    },
    {
      label: 'of those, describing the recalled symptom',
      value: 89,
      filter: {
        make: 'FORD',
        model: 'F-150',
        component: 'POWER TRAIN',
        filed_after: '2020-04-27',
        matching: 'park or prndl or rollaway or "shift cable"',
      },
    },
  ],
  unverified_claims: [],
  conflicts: [],
  escalate: {
    reason: 'Whether the remedy was applied to any given vehicle is not in this corpus.',
    suggested_owner: 'the fleet safety lead',
  },
};

const clone = (patch: Partial<SafetyAnswer>): SafetyAnswer => ({ ...structuredClone(GOOD), ...patch });

const CASES: ValidatorCase[] = [
  {
    name: 'a correct REC-001 answer',
    expect: 'accept',
    body: GOOD,
    why: 'THE CONTROL. Without it, every rule below could be satisfied by rejecting everything.',
  },
  {
    name: 'not JSON at all',
    expect: 'not valid JSON',
    body: 'I am unable to answer that question.',
    why: 'a model refusing in prose must be caught and retried, not crash the caller',
  },
  {
    name: 'rule 1 · no answer and no escalation',
    expect: 'escalate is null',
    body: clone({ answer: null, escalate: null }),
    why: 'silence with no owner is the one outcome that helps nobody',
  },
  {
    name: 'rule 2 · an answer with nothing behind it',
    expect: 'no citations and no unverified_claims',
    body: clone({ citations: [], unverified_claims: [] }),
    why: 'every factual claim is either cited or declared unverified — there is no third place',
  },
  {
    name: 'rule 3 · an unresolved conflict, silently decided',
    expect: 'must be escalated, never decided',
    body: clone({
      conflicts: [
        {
          topic: 'whether the F-250 SD is covered',
          positions: [
            { source: 'NHTSA recall campaign 20V197000', says: 'covers Expedition, F-150 and Ranger' },
            { source: 'NHTSA ODI complaint 11618838', says: 'filed as F-250 SD, narrative says F-150' },
          ],
          resolved_by: null,
        },
      ],
      escalate: null,
    }),
    why: 'the most dangerous shape there is — the model picked a side between two documents',
  },
  {
    name: 'rule 4 · a number that came from nowhere',
    expect: 'appear in the answer but not in counts',
    body: clone({
      answer:
        'Recall 20V197000 covers the defect. Since 2020-04-27 there have been 1,057 power-train ' +
        'complaints, of which 103 describe the recalled symptom.',
    }),
    why:
      "REC-001's trap: 1,057 and 103 are both true of this corpus and only one answers the " +
      'question. 103 is not in counts, so it was invented — which is exactly how it reads.',
  },
  {
    name: 'rule 5 · concluding that the remedy failed',
    expect: 'allegations, not findings',
    body: clone({
      answer:
        'Recall 20V197000 covers the defect, but with 1,057 complaints filed since 2020-04-27 ' +
        'and 89 describing the same symptom, the fix is not holding.',
    }),
    why:
      'a complaint is an allegation by a member of the public. The vehicle may never have had ' +
      'the repair. Guardrail 5, and REC-001 checks for it explicitly.',
  },
  {
    name: 'a year is not a count',
    expect: 'accept',
    body: clone({
      answer:
        'Recall 20V197000 covers 2020 Ford F-150 and Ranger vehicles with 10-speed automatic ' +
        'transmissions, notified 2020-04-27. 1,057 power-train complaints have been filed since, ' +
        'of which 89 match the recalled symptom.',
    }),
    why:
      'rule 4 must not fire on model years, dates, campaign ids, ODI numbers, or NAMES THAT ' +
      'CONTAIN DIGITS — F-150 and 10-speed both did, because a hyphen is a word boundary. ' +
      'Left unfixed the rule fires on correct answers and gets switched off within a week.',
  },
];

// ---------------------------------------------------------------------------

const contract = verifyValidator({ cases: CASES, validate: validateSafetyAnswer });
for (const l of contract.lines) console.log(l);

// Rule 6 separately, because it is not a property of the answer — it depends on
// what `find_recalls` returned. REC-005 exactly.
const citesAnyway = { ...structuredClone(GOOD), campaigns: ['20V438000'] };
const rule6Rejects = evidenceErrors(citesAnyway, { recallSearchWasEmpty: true }).length === 1;
const rule6Accepts =
  evidenceErrors(citesAnyway, { recallSearchWasEmpty: false }).length === 0 &&
  evidenceErrors({ ...structuredClone(GOOD), campaigns: [] }, { recallSearchWasEmpty: true }).length === 0;

console.log(
  `\n  ${rule6Rejects ? 'ok  ' : 'FAIL'}  rule 6 · a campaign cited after find_recalls returned nothing\n` +
    '        REC-005: no recall covers the Odyssey forward-collision braking, and reaching for a ' +
    'loosely related campaign is the failure',
);
console.log(
  `  ${rule6Accepts ? 'ok  ' : 'FAIL'}  control: rule 6 stays quiet when the search found something, and when nothing is cited\n` +
    '        a rule that fires on a real recall would make every answer citing one unusable',
);

// The description walk, last, so a regression is reported beside the table
// rather than hidden behind an early exit.
const described = verifyDescriptions(z.toJSONSchema(SafetyAnswerSchema, { io: 'output' }));
for (const l of described.lines) console.log(l);

// One more control the shared verifier cannot do for us: prove `coherenceErrors`
// is actually reachable, by checking the good fixture produces no complaints.
const goodIsClean = coherenceErrors(GOOD).length === 0;
console.log(
  `  ${goodIsClean ? 'ok  ' : 'FAIL'}  the correct answer trips no coherence rule\n` +
    `        ${goodIsClean ? 'six rules, and a right answer passes all of them' : coherenceErrors(GOOD).join(' | ')}`,
);

console.log('');
process.exit(contract.passed && described.passed && rule6Rejects && rule6Accepts && goodIsClean ? 0 : 1);
