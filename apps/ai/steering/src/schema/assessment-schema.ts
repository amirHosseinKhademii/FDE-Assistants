/**
 * The answer contract for "what do we do about this customer requirement, and
 * what does it cost" — in Zod.
 *
 * ── THE SHAPE IS THE SAFETY ARGUMENT, NOT THE PROMPT ─────────────────────
 *
 * Insurance and pharma both record this and it is the reason the file exists
 * before any agent does: a prompt asks nicely, a schema makes a sentence
 * unrepresentable. Retrofitting a contract onto something already producing
 * convincing output means arguing with a thing that already sounds right.
 *
 * ── THE FORBIDDEN SENTENCE HERE IS NOT PHARMA'S ──────────────────────────
 *
 * Pharma forbids "a recall is warranted" — a regulatory decision with a legal
 * clock, made by named people. Insurance forbids "this is covered".
 *
 * **A Tier-1 supplier's dangerous sentence is a COMMITMENT.** A quotation is a
 * contract. "We can do this for €81,455", "this carries over at no cost",
 * "delivery in Q3" — every one of those is a commercial position that a named
 * person with signing authority takes, after the engineering is understood.
 * This produces the evidence for that conversation. It does not have it.
 *
 * And one commitment is more dangerous than the rest, because it is the
 * cheapest thing to say and the estate is built around it: **"carryover, no
 * cost."** `walk-cost` step 1 exists to show why — the datasheet claims 8000 N,
 * nothing tested demonstrates it, and reading the capability row alone gives
 * exactly that answer and is wrong by a redesign.
 *
 * ── A QUESTION IS NOT A VERDICT, AND THAT IS THE CRUX ────────────────────
 *
 * Pharma learned this the hard way and it transfers unchanged: "should this lot
 * be recalled?" put TO a Qualified Person is the CORRECT output of the whole
 * exercise; "a recall is warranted" is the forbidden one. Its first test
 * asserted that the question should be caught. It should not — guarding it
 * would forbid the one sentence the design exists to produce.
 *
 * So `decision_for_human` is EXEMPT from the commitment check by construction,
 * and every other prose field is guarded. The two sentences this system is
 * built to emit are both questions:
 *
 *   "Is 400 N of missing evidence a re-test or a redesign?"
 *   "Must the damping safety case be rebuilt, or can K2 inherit the 2021
 *    decomposition?"
 *
 * ── ONE REQUIREMENT, NOT A WORK LIST, AND THAT IS PROVISIONAL ────────────
 *
 * Pharma asked whether a work list could share the single-decision schema and
 * answered "two shapes" — after trying, not before. Steering has not tried yet:
 * the plan assesses ONE requirement first and fans out to twenty-four later.
 * If a work list turns out to need per-row findings and per-row refusals, this
 * file is the wrong shape for it and should be joined by a sibling rather than
 * stretched. Recorded so the question is asked rather than assumed.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';
import { MIN_COMPARABLES } from '../answer/derive';

// ── the pieces ─────────────────────────────────────────────────────────────

/**
 * Where a claim came from. THE WHOLE POINT, and the reason `line` is required.
 *
 * The extraction pipeline verifies every stored sentence against its file, and
 * an answer that cites less than that throws away a guarantee already paid for.
 * A citation naming only a file is "somewhere in this document" — which is what
 * the customer already has and cannot use.
 */
const Citation = z.strictObject({
  file: z
    .string()
    .min(1)
    .describe('Corpus-relative path, e.g. "eps-steering-feel/docs/safety-assessment-2021.md".'),
  line: z
    .number()
    .int()
    .positive()
    .describe('Line the quoted sentence starts on. Required — "somewhere in this file" is not a citation.'),
  quote: z
    .string()
    .min(1)
    .describe('The sentence, verbatim from the document. Never paraphrased — a paraphrase cannot be checked.'),
});

/**
 * Two documents that disagree.
 *
 * MUST BE EXPRESSIBLE, because this corpus contains a real one and a system
 * that cannot say "these disagree" will pick a side silently. The damping
 * module is stated at ASIL D by the requirement, ASIL D by a design note marked
 * out of date, and ASIL B by the static-analysis report — and which is true
 * changes the price by roughly €190,000.
 */
const Conflict = z.strictObject({
  about: z.string().min(1).describe('What the documents disagree about, in one clause.'),
  positions: z
    .array(
      z.strictObject({
        says: z
          .string()
          .min(1)
          .describe('What this document states, in its own terms, e.g. "developed to ASIL B".'),
        citation: Citation.describe('Where it says it. Each position carries its own — a shared citation is one position.'),
      }),
    )
    .min(2)
    .describe('At least two, each with its own citation. One position is not a conflict.'),
});

/**
 * The question that must go to a person, and who should answer it.
 *
 * EXEMPT from the commitment check — see the header. This field is a question
 * by construction and guarding it would forbid the output the design exists to
 * produce.
 */
const DecisionForHuman = z.strictObject({
  question: z
    .string()
    .min(1)
    .describe('The specific question, as a question. Not "this needs review."'),
  why_it_matters: z
    .string()
    .min(1)
    .describe('What changes depending on the answer — ideally the money or the risk.'),
  suggested_owner: z
    .string()
    .min(1)
    .describe('Who should answer it, e.g. "systems engineering", "the safety manager". A role, not a guess at a name.'),
});

/**
 * What history says work like this cost — or why it will not say.
 *
 * `null` FIGURES WHEN REFUSING, NEVER ZERO. Zero is a price. Somebody reads
 * past a sentence to a number if there is a number, and this is the same rule
 * `find_comparable_work` already enforces one layer down; stating it in the
 * contract too means a second route to an answer cannot arrive without it.
 */
const CostBasis = z.strictObject({
  comparable_jobs: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      'How many past jobs the figure rests on — a MEASUREMENT, and only valid ' +
        'if you actually called find_comparable_work. Use 0 when you searched ' +
        'and history held nothing. Use null when you did not search at all, for ' +
        'instance because the work could not be classified well enough to ask. ' +
        'Never write 0 for a query you did not run: "I looked and found none" ' +
        'and "I never looked" are different facts, and the first is the one a ' +
        'reader will act on.',
    ),
  median_hours: z
    .number()
    .nullable()
    .describe(`Median hours, or null when below ${MIN_COMPARABLES} comparables. Never 0 — 0 is a price.`),
  eur: z
    .number()
    .nullable()
    .describe('Cost at approved rates, or null for the same reason.'),
  refused_because: z
    .string()
    .nullable()
    .describe('Why there is no figure. Required exactly when median_hours is null.'),
});

// ── the answer ─────────────────────────────────────────────────────────────

export const FINDINGS = ['have_it', 'change_needed', 'new_work', 'cannot_tell'] as const;

export const RequirementAssessmentSchema = z.strictObject({
  requirement_ref: z
    .string()
    .min(1)
    .describe('The customer requirement being assessed, e.g. "CR-K2-0101".'),

  finding: z
    .enum(FINDINGS)
    .describe(
      'What state the requirement is in. Decide it from what the documents DO ' +
        'establish, not from what is still open.\n' +
        'have_it — it exists and a document DEMONSTRATES it. A claim or a ' +
        'datasheet figure is not a demonstration.\n' +
        'change_needed — it exists and work is required before it can be ' +
        'claimed: the design must change, OR the evidence is missing and must be ' +
        'produced. A missing test report IS this. Not knowing how much work is ' +
        'needed does not make it something else — that uncertainty belongs in ' +
        'cost.refused_because.\n' +
        'new_work — nothing in the documents corresponds to it.\n' +
        'cannot_tell — the documents do not establish WHICH of the above is ' +
        'true. Use it when you cannot tell whether the thing exists at all, or ' +
        'when the documents are silent. Do NOT use it merely because a question ' +
        'remains open: "a test report is missing and the measurement point is ' +
        'disputed" is a determined state, and it is change_needed.',
    ),

  reasoning: z
    .string()
    .min(1)
    .max(700)
    .describe(
      'Two or three sentences on why the finding follows. DO NOT quote here — the ' +
        'citations field carries every quote with its file and line, and a reader ' +
        'sees them directly below this. Repeating them buries the argument inside ' +
        'its own evidence. No commitments and no prices in prose.',
    ),

  citations: z
    .array(Citation)
    .describe('Every document this rests on. May be empty ONLY when the finding is cannot_tell.'),

  unverified_claims: z
    .array(z.string())
    .describe('Anything stated that no citation supports. Empty is a claim; use it honestly.'),

  conflicts: z.array(Conflict).describe('Documents that disagree. Empty when none were found.'),

  cost: CostBasis.describe(
    'What history says work like this cost, or why it will not say. Always present — ' +
      'a missing cost block and a refusal are different answers.',
  ),

  decisions_for_human: z
    .array(DecisionForHuman)
    .describe('Questions a person must answer. The one field allowed to ask for a decision.'),
});

export type RequirementAssessment = z.infer<typeof RequirementAssessmentSchema>;

// ── what Zod cannot say ────────────────────────────────────────────────────

/**
 * A commitment: a promise to do, deliver, charge or absorb.
 *
 * WIDER THAN IT FIRST LOOKS, on pharma's evidence. Its `RECALL_VERDICT` caught
 * "must be recalled" and missed "is warranted", and the miss reached an output.
 * So this covers the modal verbs AND the assertions that do the same work
 * without one — "carries over at no cost" asserts a commercial position as
 * flatly as "we will absorb it".
 */
/**
 * A commitment: a promise to do, deliver, charge or absorb.
 *
 * ── WIDER THAN IT FIRST LOOKS, AND NARROWER THAN IT FIRST WAS ────────────
 *
 * Wider, on pharma's evidence: its `RECALL_VERDICT` caught "must be recalled"
 * and missed "is warranted", and the miss reached an output. So this covers the
 * assertions that do a modal verb's work without using one.
 *
 * Narrower, on ours. The first version banned a bare `no cost`, and the first
 * real eval run died on it — twice in one answer — for sentences like
 * **"there is no cost history for this class of change"**. That is not a
 * commitment. It is the single most common HONEST thing this system says: a
 * statement about the absence of EVIDENCE, not about the price of the work.
 *
 * `scripts/leak-check.mjs` states the rule this broke, in its own header: a
 * banned phrase must be one that CANNOT appear innocently. A guard that fires
 * on the truthful sentence trains everyone to route around it, and then it
 * protects nothing.
 *
 * So the commitment sense is required explicitly — `at no cost`, `no additional
 * cost`, `no cost to the customer` — and `no cost history`, `no cost data`,
 * `no cost basis` pass, as they must.
 */
/**
 * ── NARROWED A SECOND TIME, 2026-09-13: A DATE IS REQUIRED ──────────────
 *
 * `deliver(y|ed) (in|by)` was meant for a SCHEDULE promise — "delivery in Q3",
 * "delivered by March". It also caught **"delivered by the customer"**, and
 * that killed a paid summary run mid-answer.
 *
 * That sentence is not a commitment. It is the opposite of one: it says whose
 * job the missing evidence is, and it is close to the most common honest
 * sentence this system produces — every refusal waiting on the customer says
 * some version of it. "The TARA must be delivered by the customer technical
 * authority" is a finding, not a promise.
 *
 * So the deliver family now requires a WHEN. A date is what makes a delivery
 * statement a commitment; a named party is what makes it an assignment. The
 * first-person forms (`we will`, `we commit`, `we quote`) are untouched,
 * because that is how a commitment is actually written, and they still catch
 * "we will deliver this" with or without a date.
 *
 * WHAT IS GIVEN UP, said plainly: a dateless "the rig will be ready" no longer
 * fires. That is a real reduction, accepted for the same reason the first
 * narrowing was — `scripts/leak-check.mjs`'s rule, that a banned phrase must be
 * one that CANNOT appear innocently. This is the second paid run this pattern
 * has ended on a truthful sentence, and a guard that keeps doing that is one
 * everybody learns to write around.
 */
const WHEN =
  '(q[1-4]\\b|h[12]\\b|sop\\b|\\d|(the )?(end|start|middle|mid)\\b|early\\b|late\\b|next\\b|' +
  'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|week|month|quarter|year)';

export const COMMITMENT = new RegExp(
  '\\b(we (will|can|shall)' +
    '|(will|shall) be (delivered|ready|done) (in|by) ' + WHEN +
    '|at no (additional )?(cost|charge)' +
    '|no (additional|extra) cost\\b(?! (history|data|basis|record|information))' +
    '|no cost to (the|our)' +
    '|carries over at no' +
    '|we quote|we commit' +
    '|guarantee[ds]?\\b' +
    '|deliver(y|ed) (in|by) ' + WHEN +
    '|absorb(ed)? (it|this|the cost))',
  'i',
);

/**
 * The phrase that actually matched, with enough either side to read it.
 *
 * ── WHY THIS EXISTS, AND IT IS NOT COSMETIC ─────────────────────────────
 *
 * The message used to be `text.slice(0, 80)` — the START of the field, which
 * for a long sentence does not contain the match at all. A summary run was
 * rejected for "commits on behalf of the company" quoting eighty characters
 * that committed to nothing, and finding the real cause took a regex harness
 * rather than a reading.
 *
 * An error that does not point at what it objected to trains the reader to
 * assume the guard is wrong. Sometimes it is — but that has to be a finding,
 * not a default.
 */
export function offendingPhrase(text: string, re: RegExp): string {
  const m = re.exec(text);
  if (!m) return text.slice(0, 80);
  const from = Math.max(0, m.index - 25);
  const to = Math.min(text.length, m.index + m[0].length + 25);
  return `${from > 0 ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`;
}

/** A price stated as a decision rather than as evidence. */
export const PRICE_AS_DECISION =
  /\b(the (price|quote|cost) (is|will be)|we (are )?charg\w+|quoted at)\b/i;

/**
 * Prose fields that are guarded. `decisions_for_human` is deliberately absent —
 * see the header. A question is not a verdict.
 */
function guardedProse(a: RequirementAssessment): string[] {
  return [a.reasoning, ...a.unverified_claims, ...a.conflicts.map((c) => c.about)];
}

export function coherenceErrors(a: RequirementAssessment): string[] {
  const errors: string[] = [];

  // 1 · "carryover, no cost" is the planted trap, and it is the cheapest
  //     sentence to write. A finding of have_it with nothing behind it is the
  //     exact failure walk-cost step 1 was built to demonstrate.
  if (a.finding === 'have_it' && a.citations.length === 0) {
    errors.push('finding is have_it with no citation — "we already have it" needs evidence, not an absence of doubt');
  }

  // 2 · Only cannot_tell may cite nothing.
  if (a.finding !== 'cannot_tell' && a.citations.length === 0) {
    errors.push(`finding is ${a.finding} with no citations — use cannot_tell when the documents do not settle it`);
  }

  // 3 · A conflict nobody has to resolve is the model picking a side quietly.
  //     Insurance's contract rejects exactly this and the rule transfers whole.
  if (a.conflicts.length > 0 && a.decisions_for_human.length === 0) {
    errors.push('documents conflict and no decision is put to a human — that is the system choosing a side in silence');
  }

  // 4 · A refusal must say why, and must carry no figure.
  const refusing = a.cost.median_hours === null;
  if (refusing && !a.cost.refused_because) {
    errors.push('no cost figure and no reason given');
  }
  if (!refusing && a.cost.refused_because) {
    errors.push('a cost figure AND a refusal reason — one of them is wrong');
  }
  if (refusing && a.cost.eur !== null) {
    errors.push('median_hours is null but eur is not — a refusal carries no figure anywhere');
  }

  // 5a · A price with no count behind it. `null` means "never looked", and a
  //      figure derived from a query nobody ran is the worst of both.
  if (!refusing && a.cost.comparable_jobs === null) {
    errors.push('priced without a comparable count — a figure from a query that was never run');
  }

  // 5 · A price below the threshold is a figure with a false decimal point.
  if (!refusing && a.cost.comparable_jobs !== null && a.cost.comparable_jobs < MIN_COMPARABLES) {
    errors.push(
      `priced from ${a.cost.comparable_jobs} comparable job(s); the floor is ${MIN_COMPARABLES}`,
    );
  }

  // 6 · New work cannot be priced from history that does not exist.
  if (a.finding === 'new_work' && !refusing && a.cost.comparable_jobs === 0) {
    errors.push('finding is new_work priced from zero comparables — that is an invention with a citation attached');
  }

  // 7 · No commitments, anywhere a human might read one as an answer.
  for (const text of guardedProse(a)) {
    if (COMMITMENT.test(text)) {
      errors.push(
        `commits on behalf of the company: "${offendingPhrase(text, COMMITMENT)}" — put it to a person instead`,
      );
    }
    if (PRICE_AS_DECISION.test(text)) {
      errors.push(
        `states a price as a decision: "${offendingPhrase(text, PRICE_AS_DECISION)}" — this is what history cost, not what to charge`,
      );
    }
  }

  return errors;
}

export const validateAssessment: (raw: string) => ValidationResult<RequirementAssessment> =
  createAnswerValidator({
    schema: RequirementAssessmentSchema,
    coherence: [coherenceErrors],
  });
