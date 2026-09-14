/**
 * One finished assessment in, a short plain-language brief out.
 *
 * ── IT MAY NOT ADD A FACT, AND THE SHAPE IS WHAT ENFORCES THAT ───────────
 *
 * There is no citation field, no cost field and no finding field. That is
 * deliberate: everything this brief could get wrong is already on the page,
 * measured, beside it. A summary that restated the price could restate it
 * differently, and one page contradicting itself is worse than either half —
 * the bid summary settled this and the rule transfers unchanged.
 *
 * So what it is asked for is the thing a tally cannot do: say what the dossier
 * means for somebody who has thirty seconds, and what happens next.
 *
 * ── THE COMMITMENT GUARD APPLIES HERE TOO ────────────────────────────────
 *
 * Plainer language is exactly where "so we can just carry it over" appears. The
 * assessment contract forbids a commitment in every prose field, and a brief
 * that is allowed to be looser than the thing it summarises is a hole cut in
 * the guarantee at the friendliest-sounding point.
 */
import { z } from 'zod';
import { createAnswerValidator, type ValidationResult } from '@fde/schema';
import { COMMITMENT, PRICE_AS_DECISION } from './assessment-schema';

export const ExplanationSchema = z.strictObject({
  in_one_line: z
    .string()
    .min(1)
    .describe(
      'The whole assessment in one sentence a bid engineer could read aloud in a ' +
        'meeting. No numbers that are not already on the page, no commitment.',
    ),

  what_it_means: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe(
      'Two to four short sentences on what the finding actually implies — what ' +
        'exists, what is missing, why the evidence does or does not settle it. ' +
        'Plain words. No jargon that is not explained in the same sentence.',
    ),

  what_happens_next: z
    .array(z.string())
    .max(4)
    .describe(
      'What somebody does on Monday, as short imperative lines. Empty is allowed ' +
        'when the dossier already puts everything to a named person.',
    ),

  /**
   * ── WHERE THE DOCUMENTS DISAGREE, IN ONE LINE EACH ─────────────────────
   *
   * The assessment contract makes a conflict expressible on purpose: this
   * corpus contains a real one, and a system that cannot say "these disagree"
   * picks a side silently. On the K2 damping module that choice is worth about
   * €190,000.
   *
   * The dossier renders each side with its own citation, which is right there
   * and wrong here — a brief that re-quoted the sentences would put a
   * paraphrase beside the verbatim original, in the one place a reader would
   * reasonably conclude the system disagreed with itself. So this says WHAT is
   * disputed and WHY it matters, and the quotes stay where they are checkable.
   */
  disagreements: z
    .array(
      z.strictObject({
        about: z
          .string()
          .min(1)
          .describe('What the documents disagree about, in one clause a person would say.'),
        why_it_matters: z
          .string()
          .min(1)
          .describe('What changes depending on which one is right. No figures — they are printed below.'),
      }),
    )
    .describe('Empty when the assessment found none. Never invented, and never quoted.'),

  /**
   * ── THE BRIEF WAS LEAVING OUT THE POINT ────────────────────────────────
   *
   * The dossier's whole design is that it asks rather than decides —
   * `decisions_for_human` is the one field exempt from the commitment guard,
   * because a question put to a named person is the OUTPUT of this exercise,
   * not a shortfall in it. A summary that covered the finding, the evidence and
   * the price and then dropped the questions summarised everything except the
   * deliverable.
   *
   * So it is a required field. Empty is allowed and means the dossier put
   * nothing to anybody; it is not allowed to be omitted because it was long.
   */
  questions_for_people: z
    .array(
      z.strictObject({
        question: z
          .string()
          .min(1)
          .describe(
            'The question, shortened to one line and still a question. Never answered ' +
              'here — the dossier put it to a person on purpose.',
          ),
        owner: z
          .string()
          .min(1)
          .describe('Who the dossier said should answer it. A role, copied, not guessed at.'),
      }),
    )
    .describe(
      'Every question the assessment put to a person, one line each. Empty only when ' +
        'the assessment put none.',
    ),
});

export type Explanation = z.infer<typeof ExplanationSchema>;

/**
 * WHAT THE COMMITMENT GUARD READS, AND WHAT IT DOES NOT.
 *
 * `questions_for_people` is exempt, exactly as `decisions_for_human` is exempt
 * in the assessment contract, and for the same reason: a question is not a
 * verdict. "Can this carry over at no cost?" is the correct output of this
 * whole exercise; guarding it would forbid the sentence the design exists to
 * produce. Pharma's first test got this backwards and it is worth not
 * repeating.
 */
function prose(e: Explanation): string[] {
  return [
    e.in_one_line,
    ...e.what_it_means,
    ...e.what_happens_next,
    ...e.disagreements.flatMap((d) => [d.about, d.why_it_matters]),
  ];
}

export function coherenceErrors(e: Explanation): string[] {
  const errors: string[] = [];

  // A question that stopped being one has become an answer, which is the single
  // thing this field may not contain.
  for (const q of e.questions_for_people) {
    if (!q.question.trim().endsWith('?')) {
      errors.push(`a question for a person is not phrased as a question: "${q.question.slice(0, 70)}"`);
    }
  }

  for (const line of prose(e)) {
    // The same two guards the assessment carries. A brief is where the softer
    // sentence gets written, which is precisely why it is checked here.
    if (COMMITMENT.test(line)) {
      errors.push(`commitment in the summary: "${line.slice(0, 80)}"`);
    }
    if (PRICE_AS_DECISION.test(line)) {
      errors.push(`price stated as a decision: "${line.slice(0, 80)}"`);
    }
  }

  return errors;
}

export const validateExplanation: (raw: string) => ValidationResult<Explanation> =
  createAnswerValidator({
    schema: ExplanationSchema,
    coherence: [coherenceErrors],
  });
