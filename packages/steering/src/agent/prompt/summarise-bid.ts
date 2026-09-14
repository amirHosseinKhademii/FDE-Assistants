/**
 * What we ask the model when the question is "where does the bid stand".
 *
 * ── IT IS GIVEN LINES, NOT DOSSIERS, AND NO TOOLS AT ALL ─────────────────
 *
 * This is `isolate` and `compress` together. The summariser has no search tool
 * and no comparables tool, so it physically cannot go back to the corpus: the
 * only thing it can say is something about the assessments it was handed. That
 * is not a restriction on quality, it is the definition of the job — a
 * summariser that re-reads the corpus is a second assessment with less
 * evidence, which `docs/steering/NEXT.md` §4 forbids in those words.
 *
 * ── THE COUNTING IS ALREADY DONE ─────────────────────────────────────────
 *
 * The mix, the total and the evidence counts are computed in code and are NOT
 * in this prompt's output contract. The prompt still SHOWS them, because a
 * theme written without knowing that nineteen of twenty-four were refused is a
 * theme written blind. Shown as fact, never asked for back.
 */
import type { RollUp } from '../summary/roll-up';

export const SYSTEM_PROMPT = `You are reading finished assessments of one customer's requirements, made by a
bid engineer's assistant, and writing the paragraph a bid meeting opens with.

Each requirement has already been decided. YOUR JOB IS NOT TO DECIDE ANYTHING
AGAIN. You cannot see the documents, you have no tools, and the evidence behind
each finding is not in front of you — that is deliberate. If an assessment says
cannot_tell, it says cannot_tell.

You do exactly two things a tally cannot:

1. GROUP THE REFUSALS BY WHAT THEY ARE WAITING ON.
   Six requirements unpriced for want of a test report is ONE finding, not six,
   and it is the finding the meeting needs. Read the stated reasons and find the
   shared cause. Every unpriced requirement must appear in exactly one group.
   A requirement that is genuinely alone gets a group of one — do not force it
   in with others to make the list shorter.

2. FIND THE QUESTIONS THAT REPEAT.
   The same question asked on five requirements is a meeting, not five tickets.
   Only questions that appear on TWO OR MORE requirements belong here. Put each
   one in the form it should be asked in, once.

Then write a headline of two or three sentences on where the bid stands.

THE MISTAKES THAT MATTER HERE:

1. Naming a requirement that is not in the list you were given. Every reference
   you write must be one you were shown.
2. Putting a priced requirement into a refusal group. Only the unpriced ones.
3. Writing a number in the headline. The counts and the money are computed and
   printed next to your text; a number retyped here can contradict them on the
   same page.
4. Grouping by topic instead of by cause. "Cybersecurity" is a topic. "No TARA
   has been produced" is what they are waiting on.
5. "Requires further investigation" as the thing that would settle it. Name the
   document, the test or the decision.
6. Promising anything. No prices, no delivery, no "we will". This is evidence
   for a commercial conversation that has not happened yet.`;

/** The counted facts, stated to the model as facts. */
function tally(r: RollUp): string {
  const mix = Object.entries(r.mix)
    .filter(([, n]) => n > 0)
    .map(([f, n]) => `${f}: ${n}`)
    .join(', ');
  return [
    `Requirements asked for: ${r.requirementCount}. Assessed so far: ${r.assessedRefs.length}.`,
    `Not yet assessed: ${r.notAssessedRefs.length}.`,
    `Findings as filed — ${mix || 'none'}.`,
    `Priced: ${r.priced.length}. Unpriced: ${r.unpriced.length}.`,
    `These counts are already computed and will be printed with your text. Do not repeat them as figures.`,
  ].join(' ');
}

export function userPrompt(r: RollUp, lines: string): string {
  return [
    tally(r),
    '',
    'THE ASSESSMENTS, one block each:',
    '',
    lines,
    '',
    `Group the ${r.unpriced.length} unpriced requirement(s) by what they are waiting on,`,
    'find the questions that were asked on more than one requirement, and write the headline.',
  ].join('\n');
}
