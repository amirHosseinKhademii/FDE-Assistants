/**
 * STAGE 7 — the eight cases, and the checks that are DECIDABLE.
 *
 * Read `docs/safety/STAGE7.md` §3 first; the split it describes is the whole
 * design of this file.
 *
 * ── ONLY MECHANICAL CHECKS LIVE HERE ──────────────────────────────────────
 *
 * The answer key states checks of two kinds. One kind can be decided from the
 * run — which tools were called, whether it escalated, which campaigns are
 * cited. The other requires reading prose: "does it make the 103-versus-957
 * distinction and say why".
 *
 * A regex for the second kind measures the regex. So the second kind is NOT
 * SCORED HERE — `@fde/evals` has a classifier verifier for it and that is the
 * next step, but a judged score and a decided score must never be added
 * together.
 *
 * Each case therefore carries its editorial checks as `unscored`, printed on
 * every run so their absence is visible rather than forgotten.
 */
import type { SafetyAnswer } from '../schema/safety-answer';
import type { CallRecord } from '../agent/answer';

export interface Run {
  answer: SafetyAnswer | null;
  calls: CallRecord[];
  /** Set when the contract rejected every attempt. */
  rejected?: string;
}

export interface Check {
  name: string;
  /** True when the run satisfies it. */
  holds: (r: Run) => boolean;
  /** What the answer key says, for the report. */
  why: string;
}

export interface EvalCase {
  id: string;
  question: string;
  checks: Check[];
  /** Stated, never scored. See the header. */
  unscored: string[];
}

const called = (r: Run, name: string) => r.calls.some((c) => c.name === name);
const answered = (r: Run) => !!r.answer && r.answer.answer !== null;

export const CASES: EvalCase[] = [
  {
    id: 'REC-001',
    question:
      'We run 2020 F-150s. Is the transmission park problem a known defect, and is the fix holding?',
    checks: [
      {
        name: 'cites campaign 20V197000',
        holds: (r) => !!r.answer?.campaigns.includes('20V197000'),
        why: 'the recall that covers the defect; an answer resting on another campaign is wrong',
      },
      {
        name: 'every number carries the tool that produced it',
        holds: (r) => !!r.answer && r.answer.counts.every((c) => !!c.from),
        why: 'REC-001 is the case where a confident wrong number reads exactly like a right one',
      },
      {
        name: 'does not claim the remedy failed',
        holds: (r) => !/fix is not holding|remedy failed|recall failed|did not work/i.test(r.answer?.answer ?? ''),
        why: 'complaints after a recall are allegations; the vehicle may never have had the repair',
      },
      {
        name: 'escalates',
        holds: (r) => !!r.answer?.escalate,
        why: 'whether a repair was actually carried out is recorded nowhere in this corpus',
      },
    ],
    unscored: ['gives 103 for the recalled defect and 957 for other transmission faults, and says why the distinction matters'],
  },
  {
    id: 'REC-002',
    question: 'What does recall 20V197000 cover?',
    checks: [
      { name: 'calls get_recall', holds: (r) => called(r, 'get_recall'), why: 'a question with one exact answer is a lookup' },
      {
        name: 'does NOT call search_complaints',
        holds: (r) => !called(r, 'search_complaints'),
        why: 'searching for a campaign number returns it at position 4 — right text, wrong method',
      },
      { name: 'cites the campaign', holds: (r) => !!r.answer?.campaigns.includes('20V197000'), why: 'the answer rests on it' },
      { name: 'does not escalate', holds: (r) => !r.answer?.escalate, why: 'the documents settle this one completely' },
    ],
    unscored: [],
  },
  {
    id: 'REC-003',
    question: 'Did Ford volunteer the F-250 tailgate recall, or was it pushed?',
    checks: [
      { name: 'cites campaign 19V864000', holds: (r) => !!r.answer?.campaigns.includes('19V864000'), why: 'the campaign in question' },
      {
        name: 'says it was NOT volunteered',
        holds: (r) => /odi|office of defects|not volunt|pushed|investigation/i.test(r.answer?.answer ?? ''),
        why: 'INFLUENCED_BY is ODI — a recorded field, not a judgement',
      },
      {
        name: 'does not escalate',
        holds: (r) => !r.answer?.escalate,
        why: 'hedging on a recorded fact is wrong in the opposite direction',
      },
    ],
    unscored: [],
  },
  {
    id: 'REC-004',
    question: 'Are there any complaints involving a death on the 2019-2020 Tesla Model 3?',
    checks: [
      { name: 'answers', holds: answered, why: 'the corpus settles this' },
      {
        name: 'reports 5',
        holds: (r) => r.answer?.counts.some((c) => c.value === 5) ?? false,
        why: 'the corrected figure; 12 was a row count',
      },
      {
        name: 'the 5 came from a tool',
        holds: (r) => r.answer?.counts.some((c) => c.value === 5 && !!c.from) ?? false,
        why: 'no six passages contain a count',
      },
      {
        name: 'cites at least one complaint by ODI number',
        holds: (r) => (r.answer?.citations ?? []).some((c) => /\b\d{8}\b/.test(c.source)),
        why: 'the key requires at least one quoted verbatim with its number',
      },
    ],
    unscored: ['declines to draw a conclusion about the cause — a complaint is an allegation, not a finding'],
  },
  {
    id: 'REC-005',
    question: 'Is there a recall for the forward-collision braking on the 2019-2020 Honda Odyssey?',
    checks: [
      { name: 'searched for recalls', holds: (r) => called(r, 'find_recalls'), why: 'an absence must be established, not inferred' },
      { name: 'states it plainly', holds: answered, why: 'an absence is an ANSWER, not a refusal' },
      {
        name: 'cites NO campaign',
        holds: (r) => (r.answer?.campaigns.length ?? 1) === 0,
        why: 'reaching for a loosely related campaign is the failure this case exists for',
      },
      {
        name: 'records the empty search as evidence',
        holds: (r) => (r.answer?.searches_that_found_nothing.length ?? 0) > 0,
        why: 'there is no document to cite for something that does not exist',
      },
    ],
    unscored: ['surfaces the volume of complaints as the reason it is worth a person looking'],
  },
  {
    id: 'REC-006',
    question: 'What is the remedy for recall 19V864000, and has it been carried out?',
    checks: [
      { name: 'cites the campaign', holds: (r) => !!r.answer?.campaigns.includes('19V864000'), why: 'the remedy comes from it' },
      { name: 'answers the remedy', holds: answered, why: 'the remedy text is a clean fact in the record' },
      {
        name: 'escalates on completion',
        holds: (r) => !!r.answer?.escalate,
        why: 'NHTSA publishes campaigns and complaints, not completion records per VIN',
      },
    ],
    // THE CONTROL. This case and REC-003 fail together if anything makes the
    // system escalate on everything — the fix that turns one eval green and
    // another red. Insurance records the same pairing.
    unscored: [],
  },
  {
    id: 'REC-007',
    question: 'How many complaints about the 2020 F-150 transmission were filed after the recall?',
    checks: [
      { name: 'answers', holds: answered, why: 'the documents settle it' },
      {
        name: 'reports more than one number',
        holds: (r) => (r.answer?.counts.length ?? 0) >= 2,
        why: 'the question is ambiguous and a good answer refuses the premise with both figures',
      },
      { name: 'does not escalate', holds: (r) => !r.answer?.escalate, why: 'the documents do settle this one' },
    ],
    unscored: ['states WHY the distinction matters — same component is not the same defect'],
  },
  {
    id: 'REC-008',
    question: 'Were there complaints about the 20V197000 defect before the recall was issued?',
    checks: [
      { name: 'answers', holds: answered, why: 'a date comparison the corpus supports' },
      {
        name: 'used a date filter',
        holds: (r) => r.calls.some((c) => !!(c.args as any)?.filed_before || !!(c.args as any)?.filed_after),
        why: 'this case exists to catch a silent date-parsing bug, so the filter must actually run',
      },
      { name: 'every number carries its tool', holds: (r) => !!r.answer && r.answer.counts.every((c) => !!c.from), why: 'counts, not readings' },
    ],
    unscored: ['before + after is internally consistent with REC-001’s after-count'],
  },
];
