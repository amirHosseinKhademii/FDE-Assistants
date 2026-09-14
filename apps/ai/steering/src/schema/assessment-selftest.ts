/**
 * `pnpm steering:schema-check` — does the answer contract hold?
 *
 * Offline, free, no model. Every rule is tested in BOTH directions: a valid
 * answer must pass, and the specific bad answer each rule exists to catch must
 * fail. A rule only ever seen to pass is a rule nobody has shown to work.
 *
 * Insurance's `schema:check` is the ancestor, and one of its assertions is
 * copied deliberately: **every field must carry a `.describe()`**, because that
 * string is the only thing telling the model what to put there. A field that
 * loses its description does not fail a type check; it fails quietly, in
 * output, weeks later.
 */
import { z } from 'zod';
import {
  RequirementAssessmentSchema, validateAssessment, coherenceErrors, COMMITMENT,
  PRICE_AS_DECISION, offendingPhrase, type RequirementAssessment,
} from './assessment-schema';
import { report, type Result } from '../db/init/assertions';

const CITE = {
  file: 'requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md',
  line: 19,
  quote: 'The EPS assembly shall deliver at least 8000 N at the rack.',
};

/** A valid answer, used as the base every bad case is a single edit away from. */
const GOOD: RequirementAssessment = {
  requirement_ref: 'CR-K2-0101',
  finding: 'change_needed',
  reasoning: 'The datasheet claims 8000 N by analysis; the rig demonstrated 7600 N.',
  citations: [CITE],
  unverified_claims: [],
  conflicts: [],
  cost: { comparable_jobs: 6, median_hours: 722, eur: 81455, refused_because: null },
  decisions_for_human: [
    {
      question: 'Is the 400 N shortfall a re-test or a redesign?',
      why_it_matters: 'A rig week is cheap; a redesign is not.',
      suggested_owner: 'systems engineering',
    },
  ],
};

const edit = (f: (a: RequirementAssessment) => void): RequirementAssessment => {
  const copy = JSON.parse(JSON.stringify(GOOD)) as RequirementAssessment;
  f(copy);
  return copy;
};

interface Case { name: string; value: RequirementAssessment; expect: 'pass' | 'fail'; why: string }

const CASES: Case[] = [
  { name: 'a complete, evidenced assessment', value: GOOD, expect: 'pass',
    why: 'the base case — if this fails, every other result below is meaningless' },

  { name: '"we already have it" with no citation', expect: 'fail',
    value: edit((a) => { a.finding = 'have_it'; a.citations = []; }),
    why: 'the cheapest sentence to write, and the exact trap walk-cost step 1 exists to show' },

  { name: 'a conflict with nobody asked to resolve it', expect: 'fail',
    value: edit((a) => {
      a.conflicts = [{ about: 'the ASIL the damping module ships at',
        positions: [{ says: 'ASIL B', citation: CITE }, { says: 'ASIL D', citation: CITE }] }];
      a.decisions_for_human = [];
    }),
    why: 'the system choosing a side in silence, on a difference worth about EUR 190,000' },

  { name: 'a refusal that still carries a euro figure', expect: 'fail',
    value: edit((a) => { a.cost = { comparable_jobs: 1, median_hours: null, eur: 4000, refused_because: 'only 1 job' }; }),
    why: 'somebody reads past the sentence to the number, every time there is a number' },

  { name: 'a refusal with no reason', expect: 'fail',
    value: edit((a) => { a.cost = { comparable_jobs: 0, median_hours: null, eur: null, refused_because: null }; }),
    why: '"no price" without "because" is indistinguishable from a bug' },

  { name: 'a price below the comparables floor', expect: 'fail',
    value: edit((a) => { a.cost = { comparable_jobs: 2, median_hours: 700, eur: 80000, refused_because: null }; }),
    why: 'a figure with a false decimal point, printed identically to one resting on eleven jobs' },

  { name: 'new work priced from no history at all', expect: 'fail',
    value: edit((a) => {
      a.finding = 'new_work';
      a.cost = { comparable_jobs: 0, median_hours: 900, eur: 100000, refused_because: null };
    }),
    why: 'an invention with a citation attached' },

  { name: 'a commitment in the reasoning', expect: 'fail',
    value: edit((a) => { a.reasoning = 'The gearbox carries over at no cost to the programme.'; }),
    why: 'a quotation is a contract; a named person with signing authority takes that position' },

  // The other direction, and the one pharma got wrong first time.
  { name: 'a QUESTION that names a cost — must PASS', expect: 'pass',
    value: edit((a) => {
      a.decisions_for_human = [{
        question: 'Can we absorb the cost of a second rig week, or should it be quoted?',
        why_it_matters: 'It is the difference between a week and a redesign.',
        suggested_owner: 'the programme manager',
      }];
    }),
    why: 'guarding this would forbid the one sentence the whole design exists to produce' },
];

function main(): void {
  const r: Result = { ok: [], fail: [] };

  for (const c of CASES) {
    const errs = coherenceErrors(c.value);
    const shape = RequirementAssessmentSchema.safeParse(c.value);
    const passed = shape.success && errs.length === 0;
    const correct = (c.expect === 'pass') === passed;
    r[correct ? 'ok' : 'fail'].push({
      label: `${c.expect === 'pass' ? 'accepts' : 'rejects'} — ${c.name}`,
      detail: (errs[0] ?? (shape.success ? 'no objection' : 'shape rejected')) + `\n          ${c.why}`,
    });
  }

  // The commitment pattern must be wide enough to catch the assertions that do
  // a modal verb's work without one. Pharma's equivalent caught "must be
  // recalled" and missed "is warranted", and the miss reached an output.
  const phrases = ['we will deliver this', 'it carries over at no cost', 'at no additional cost',
    'we commit to Q3', 'no cost to the customer', 'we guarantee the figure',
    // A SCHEDULE promise is a commitment, and the date is what makes it one.
    // These are here because the pattern was narrowed around them — see the
    // regex header — and a narrowing that quietly dropped them would be a
    // guard deleted rather than sharpened.
    'delivery in Q3', 'delivered by March', 'the rig will be ready by week 12', 'delivered by 2027'];
  const missed = phrases.filter((p) => !COMMITMENT.test(p));
  r[missed.length ? 'fail' : 'ok'].push({
    label: 'the commitment pattern catches the quiet forms, not just the modal verbs',
    detail: missed.length ? `missed: ${missed.join(', ')}` : `${phrases.length} phrasings, all caught`,
  });

  // ── AND THE OTHER DIRECTION, WHICH THE FIRST EVAL RUN FOUND ─────────────
  //
  // A bare `no cost` was banned, and two answers in one run died on sentences
  // like "there is no cost history for this class of change". That is not a
  // commitment — it is a statement about the absence of EVIDENCE, and it is the
  // most common honest thing this system says.
  //
  // `leak-check.mjs`'s rule, broken and now asserted: a banned phrase must be
  // one that CANNOT appear innocently. A guard that fires on the truthful
  // sentence gets routed around, and then it protects nothing.
  const innocent = [
    'there is no cost history for this class of change',
    'no cost data exists for a change of this kind',
    'the documents contain no cost basis',
    'no cost record was found in the closure reports',
    'the documents contain no demonstration that it is met',
    // ── AND THE SECOND FALSE POSITIVE, FOUND THE SAME WAY ──────────────
    //
    // `deliver(y|ed) (in|by)` caught "delivered by the customer" and ended a
    // paid summary run. Naming WHO owes the evidence is the opposite of
    // promising it — it is what a refusal waiting on somebody else says, and
    // every theme on a blocked bid says some version of it.
    'the evidence must be delivered by the customer',
    'artefacts to be delivered by the supplier',
    'a certificate delivered by an external assessor',
    'the TARA must be delivered by the customer technical authority',
  ];
  const wrongly = innocent.filter((p) => COMMITMENT.test(p) || PRICE_AS_DECISION.test(p));
  r[wrongly.length ? 'fail' : 'ok'].push({
    label: 'an honest statement about MISSING evidence is not read as a commitment',
    detail: wrongly.length
      ? `wrongly caught: ${wrongly.join(' | ')}`
      : `${innocent.length} truthful "no cost …" sentences, none caught`,
  });

  // ── AN OBJECTION MUST POINT AT WHAT IT OBJECTED TO ─────────────────────
  //
  // The message used to quote the first 80 characters of the field, which for
  // a long sentence does not contain the match at all. A summary run was
  // rejected quoting eighty characters that committed to nothing, and the real
  // cause took a regex harness to find rather than a reading.
  const long =
    'All six assessed requirements remain unpriced until the evidence exists, and ' +
    'the programme states it will be delivered in Q3 of next year at the earliest.';
  const pointed = offendingPhrase(long, COMMITMENT);
  r[pointed.includes('will be delivered in Q3') && !pointed.startsWith('All six') ? 'ok' : 'fail'].push({
    label: 'a guard names the phrase it caught, not the first 80 characters',
    detail: `"${pointed}"`,
  });

  // ── EVERY FIELD CARRIES ITS DESCRIPTION ─────────────────────────────────
  //
  // Insurance's rule and the same reason: that string is the only thing telling
  // the model what to put in the field. Losing one does not fail a type check.
  //
  // THE FIRST VERSION OF THIS READ `_def.description` and reported all twelve
  // fields as undescribed when every one of them had a description. That is
  // where Zod 3 kept it; Zod 4 exposes `.description` as a public property.
  // A checker reading a library's internals breaks on a minor upgrade and
  // reports the code as broken instead of itself — so this uses the public API,
  // and plants a field below to prove it can still fail.
  const undescribed = (shape: z.ZodRawShape, path = ''): string[] =>
    Object.entries(shape).flatMap(([k, field]) => {
      const f = field as any;
      const here = f.description ? [] : [`${path}${k}`];
      // Descend into nested objects and into array elements — a described array
      // whose element fields are bare is the case this would otherwise miss.
      const inner = f.shape ?? f.element?.shape ?? f.def?.element?.shape;
      return [...here, ...(inner ? undescribed(inner, `${path}${k}.`) : [])];
    });

  const missing = undescribed(RequirementAssessmentSchema.shape);
  r[missing.length ? 'fail' : 'ok'].push({
    label: 'every field carries a description the model can act on',
    detail: missing.length
      ? `missing on: ${missing.join(', ')}`
      : 'checked through nested objects and array elements, via the public API',
  });

  // The plant. A checker never seen to fire is one you cannot read a green tick
  // from — and this one has already been wrong once in the quiet direction.
  const planted = undescribed(z.strictObject({ described: z.string().describe('x'), bare: z.string() }).shape);
  r[planted.join() === 'bare' ? 'ok' : 'fail'].push({
    label: 'the description check catches its own plant',
    detail: planted.join() === 'bare'
      ? 'an undescribed field in a synthetic schema is found, and a described one is not'
      : `IT DOES NOT — reported ${JSON.stringify(planted)}`,
  });

  // And the validator refuses malformed input rather than repairing it.
  const bad = validateAssessment('{ not json');
  r[bad.ok ? 'fail' : 'ok'].push({
    label: 'malformed output is refused, not repaired',
    detail: bad.ok ? 'IT REPAIRED IT — the failure rate is now invisible' : String((bad as any).errors).slice(0, 90),
  });

  process.exit(report('schema:check', r));
}

main();
