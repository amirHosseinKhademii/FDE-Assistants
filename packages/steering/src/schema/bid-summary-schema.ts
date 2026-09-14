/**
 * The answer contract for "where does this bid stand", across assessments.
 *
 * ── A SIBLING, NOT A STRETCH, AND THAT WAS WRITTEN DOWN IN ADVANCE ───────
 *
 * `assessment-schema.ts` ends by saying a work list may need per-row findings
 * and per-row refusals, that this file would then be the wrong shape for it,
 * and that it "should be joined by a sibling rather than stretched". This is
 * the sibling. Nothing in the assessment contract changed to make room for it.
 *
 * ── THE FIELDS THAT ARE NOT HERE ARE THE DESIGN ──────────────────────────
 *
 * There is no `finding`, no `total`, no `count` and no `eur` anywhere below,
 * and their absence is the enforcement of `docs/steering/NEXT.md` §4's two
 * rules. The mix, the money and the evidence counts are computed in
 * `agent/summary/roll-up.ts` from stored answers and printed from there. A
 * model that cannot represent a total cannot total a refusal into one, and a
 * model that cannot represent a finding cannot revise one.
 *
 * What is left is the two things a tally genuinely cannot do:
 *
 *   refusal_themes      six requirements refusing for want of a test report is
 *                       ONE finding, not six — and deciding that they are the
 *                       same want is reading, not counting
 *   repeated_questions  the same question asked across five requirements is a
 *                       meeting, not five tickets
 *
 * ── EVERY REFERENCE IS CHECKED AGAINST WHAT WAS FILED ────────────────────
 *
 * A theme that cites `CR-K2-0199` when no such assessment exists is a
 * fabrication that reads perfectly, and it is the failure mode of any
 * summariser. `summaryCoherenceErrors` takes the roll-up and rejects a
 * reference that was not assessed, a refusal theme naming a requirement that
 * was in fact priced, and — the one that matters most — a refusal that no theme
 * accounts for. A summary is allowed to group refusals; it is not allowed to
 * lose one.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';
import { COMMITMENT, PRICE_AS_DECISION, offendingPhrase } from './assessment-schema';
import type { RollUp } from '../agent/summary/roll-up';

const REF = z.string().min(1).describe('A requirement reference, exactly as it was filed, e.g. "CR-K2-0113".');

const RefusalTheme = z.strictObject({
  theme: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'What these requirements are all missing, in one clause — e.g. "no test ' +
        'report exists for the rack force requirement". The shared cause, not a ' +
        'list of the requirements.',
    ),
  requirement_refs: z
    .array(REF)
    .min(1)
    .describe('Every requirement this theme accounts for. One is allowed; it means that refusal stands alone.'),
  /**
   * 500, AFTER 300 CUT A SENTENCE IN HALF ON THE FIRST REAL RUN.
   *
   * It ended "...supplier production field-return statistics from an agreed" —
   * mid-phrase, at the limit. The field asks for the specific thing that would
   * settle a refusal, and on a cybersecurity or verification requirement that
   * is a named document, a named route and who signs it. The honest version of
   * that sentence does not fit in 300 characters.
   *
   * A limit exists to stop an essay, and this one was stopping the answer. The
   * new one is still a limit: this is one clause, not a section.
   */
  what_would_settle_it: z
    .string()
    .min(1)
    .max(500)
    .describe(
      'The single thing that would move these off the list — a document to ' +
        'find, a test to run, a decision to take. Name it: which document, ' +
        'which decision, who signs it. Not "further investigation", and not a ' +
        'sentence that stops before it has said the name.',
    ),
});

const RepeatedQuestion = z.strictObject({
  question: z
    .string()
    .min(1)
    .max(300)
    .describe('The question, asked once, in the form it should be put in the meeting.'),
  requirement_refs: z
    .array(REF)
    .min(2)
    .describe('The requirements that asked it. TWO OR MORE — a question asked once is not a repeat, and belongs in its own assessment.'),
  suggested_owner: z
    .string()
    .min(1)
    .describe('Who should answer it. A role, e.g. "systems engineering".'),
});

export const BidSummarySchema = z.strictObject({
  headline: z
    .string()
    .min(1)
    .max(600)
    .describe(
      'Two or three sentences on where the bid stands. NO FIGURES: the counts ' +
        'and the money are computed and printed alongside this, and a number ' +
        'retyped here is a number that can disagree with them. Describe the ' +
        'STATE — what is settled, what is blocked, and on what.',
    ),
  refusal_themes: z
    .array(RefusalTheme)
    .describe(
      'The unpriced requirements, grouped by what they are waiting on. Every ' +
        'unpriced requirement must appear in exactly one theme. Empty only when ' +
        'nothing was refused.',
    ),
  repeated_questions: z
    .array(RepeatedQuestion)
    .describe('Questions that came up on more than one requirement. Empty is a legitimate answer.'),
});

export type BidSummary = z.infer<typeof BidSummarySchema>;

// ── what Zod cannot say ────────────────────────────────────────────────────

/**
 * A currency figure in prose.
 *
 * The total is printed from `roll-up.ts` with its evidence count and its "this
 * is not a quote" sentence attached. A figure written in the headline arrives
 * without any of those, and it is the sentence that ends up in a slide.
 */
const MONEY = /(€|\bEUR\b|\beuros?\b)\s*[\d.,]+|\d[\d.,]*\s*(€|\bEUR\b|\beuros?\b)/i;

/**
 * A digit used AS A COUNT, checked against the counts that were actually made.
 *
 * ── WHY THIS IS NOT "NO DIGITS IN THE HEADLINE" ──────────────────────────
 *
 * "Nine of the twenty-four are assessed" is a useful sentence and a model will
 * write it. The danger is not that it contains a number, it is that the number
 * can be WRONG while the roll-up printed two lines above says otherwise — one
 * page contradicting itself is worse than either half alone.
 *
 * ── AND WHY IT IS NOT EVERY DIGIT EITHER, WHICH IT WAS ───────────────────
 *
 * The first version stripped requirement references and checked every integer
 * left. This programme's requirements are about **ISO/SAE 21434**, ISO 26262
 * and an 8000 N rack force. Every one of those is a number in an honest
 * sentence, none is a count, and each would have failed the summary outright —
 * with a turn cap of two, one such sentence is the difference between a page
 * and no output at all.
 *
 * That is the `COMMITMENT`/`no cost` mistake exactly: a guard that fires on the
 * truthful sentence gets routed around, and then it protects nothing. So a
 * digit is only examined when it is doing a count's job — "5 of 6", "3
 * requirements", "2 of them", "4 remain" — and a standard number sitting in
 * prose is left alone.
 *
 * ── THE LIMIT, STATED RATHER THAN PRETENDED AWAY ─────────────────────────
 *
 * "Nine of twenty-four" in words walks straight past this. Closing that means
 * banning number-words, which bans "one finding, not six" — the exact sentence
 * §4 asks the summary to be able to make. A partial check that never fires on
 * an honest sentence is worth more here than a total one that does.
 */
const COUNT_OF = /\b(\d+)\s+of\s+(?:the\s+)?(\d+)\b/gi;
const COUNTED_THING =
  /\b(\d+)\s+(?:of them|requirements?|items?|assessments?|findings?|questions?|themes?|are\b|were\b|remain\w*|carry\b|carries\b|have\b)/gi;

function wrongNumbers(text: string, allowed: Set<number>): string[] {
  const found: number[] = [];
  for (const m of text.matchAll(COUNT_OF)) found.push(Number(m[1]), Number(m[2]));
  for (const m of text.matchAll(COUNTED_THING)) found.push(Number(m[1]));
  return [...new Set(found)]
    .filter((n) => !allowed.has(n))
    .map((n) => `headline states ${n}, which is not a count the roll-up made`);
}

/** Every number the summary is entitled to repeat. */
function countsIn(r: RollUp): Set<number> {
  return new Set<number>([
    r.requirementCount,
    r.assessedRefs.length,
    r.notAssessedRefs.length,
    r.priced.length,
    r.unpriced.length,
    r.neverAsked,
    r.conflicts.length,
    r.questions.length,
    r.history.superseded,
    r.history.failedSince.length,
    ...Object.values(r.mix),
  ]);
}

export function summaryCoherenceErrors(s: BidSummary, r: RollUp): string[] {
  const errors: string[] = [];
  const assessed = new Set(r.assessedRefs);
  const unpriced = new Set(r.unpriced.map((u) => u.ref));

  const cited = [
    ...s.refusal_themes.flatMap((t) => t.requirement_refs.map((ref) => ['theme', t.theme, ref] as const)),
    ...s.repeated_questions.flatMap((q) => q.requirement_refs.map((ref) => ['question', q.question, ref] as const)),
  ];

  // 1 · Nothing may be named that was not assessed. This is the fabrication.
  for (const [kind, label, ref] of cited) {
    if (!assessed.has(ref)) {
      errors.push(`${kind} "${label.slice(0, 60)}" names ${ref}, which is not among the filed assessments`);
    }
  }

  // 2 · A refusal theme may only contain requirements that were actually
  //     refused. Sweeping a priced item into "waiting on a test report" makes
  //     the bid look more blocked than it is.
  for (const t of s.refusal_themes) {
    for (const ref of t.requirement_refs) {
      if (assessed.has(ref) && !unpriced.has(ref)) {
        errors.push(`theme "${t.theme.slice(0, 60)}" names ${ref}, which was priced`);
      }
    }
  }

  // 3 · And no refusal may be lost. Grouping is the job; dropping is not.
  const accounted = new Set(s.refusal_themes.flatMap((t) => t.requirement_refs));
  for (const u of r.unpriced) {
    if (!accounted.has(u.ref)) {
      errors.push(`${u.ref} is unpriced and appears in no theme — a refusal may be grouped, never dropped`);
    }
  }

  // 4 · A requirement may not be filed under two different causes. If it is
  //     waiting on two things, that is two themes and it belongs to the one
  //     that is actually blocking it.
  const twice = [...accounted].filter(
    (ref) => s.refusal_themes.filter((t) => t.requirement_refs.includes(ref)).length > 1,
  );
  for (const ref of twice) errors.push(`${ref} appears in more than one refusal theme`);

  // 5 · No commitments and no prices, the same rule the single assessment has.
  const prose = [
    s.headline,
    ...s.refusal_themes.flatMap((t) => [t.theme, t.what_would_settle_it]),
    ...s.repeated_questions.map((q) => q.question),
  ];
  for (const text of prose) {
    if (COMMITMENT.test(text)) {
      errors.push(`commits on behalf of the company: "${offendingPhrase(text, COMMITMENT)}"`);
    }
    if (PRICE_AS_DECISION.test(text)) {
      errors.push(`states a price as a decision: "${offendingPhrase(text, PRICE_AS_DECISION)}"`);
    }
    if (MONEY.test(text)) {
      errors.push(
        `states a money figure in prose: "${offendingPhrase(text, MONEY)}" — the total is printed with its evidence count`,
      );
    }
  }

  // 6 · Numbers in the headline must be numbers the roll-up made.
  errors.push(...wrongNumbers(s.headline, countsIn(r)));

  return errors;
}

/**
 * The validator, built PER SUMMARY because coherence needs the roll-up.
 *
 * `createAnswerValidator` takes coherence rules that see only the answer, which
 * is right for an assessment — it is checked against itself. A summary is
 * checked against the assessments it summarises, so the roll-up is closed over
 * here rather than passed through the loop.
 */
export function bidSummaryValidator(r: RollUp): (raw: string) => ValidationResult<BidSummary> {
  return createAnswerValidator({
    schema: BidSummarySchema,
    coherence: [(s: BidSummary) => summaryCoherenceErrors(s, r)],
  });
}
