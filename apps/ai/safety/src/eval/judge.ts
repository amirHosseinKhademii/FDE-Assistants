/**
 * The editorial checks — judged by a model, reported apart from the rest.
 *
 * ── WHY THIS IS NEW CODE AND NOT A PACKAGE IMPORT ─────────────────────────
 *
 * `STAGE7.md` §3 said `@fde/evals` "has a classifier verifier for this". IT DOES
 * NOT. `verifyClassifier` verifies a SEVERITY classifier — that every check name
 * maps to a bucket — and `agreement.ts` is word overlap. Neither reads prose for
 * meaning. There is no LLM judge anywhere in this repo, and saying there was is
 * a claim that survived two handoffs before anyone opened the file.
 *
 * ── WHAT IT IS FOR ────────────────────────────────────────────────────────
 *
 * Three checks in the answer key cannot be decided mechanically:
 *
 *   REC-001  surfaces the uncovered complaints as a finding
 *   REC-004  declines to draw a conclusion about the cause
 *   REC-007  says WHY the distinction between the two numbers matters
 *
 * A regex for "did it explain the distinction" measures the regex. So these are
 * judged, and a judged score is NEVER added to a decided one — they are
 * different kinds of evidence and a combined percentage would hide which kind
 * moved.
 *
 * ── AND THE JUDGE IS ITSELF UNTRUSTWORTHY UNTIL CONTROLLED ────────────────
 *
 * A judge that answers "yes" to everything scores 3 of 3 and is worthless. Every
 * rubric therefore ships with a FAILING EXEMPLAR — a short answer that
 * definitely does not satisfy it — and the judge must reject that before its
 * verdict on the real answer is reported at all.
 *
 * This is the same discipline as `leak:check` planting a synthetic leak, and as
 * the round-trip self-test having a control on each repair. It is more important
 * here than in either, because a language model is the thing being trusted.
 */
import { chatClient, chatModelName } from '@fde/agent';
import { openaiClient } from '@fde/foundry';

import { JUDGEABLE, type EditorialProperty } from './editorial';

/** A property with its exemplars — the subset of EDITORIAL a judge can grade. */
export type Rubric = EditorialProperty & {
  question: string;
  failingExemplar: string;
  passingExemplar: string;
};

/**
 * The gradeable properties, from the single definition in `editorial.ts`.
 *
 * NOT DECLARED HERE. This file used to hold its own copy of every rubric
 * question while `cases.ts` held a second wording of the same five properties.
 */
export const RUBRICS = JUDGEABLE as Rubric[];

export interface Verdict {
  caseId: string;
  /** Null when the judge failed its own control and its opinion was discarded. */
  passes: boolean | null;
  why: string;
  /** Whether the judge rejected the failing exemplar and accepted the passing one. */
  controlled: boolean;
}

/**
 * STRICT BY DEFAULT, because the failure that matters is leniency.
 *
 * A judge that says yes to everything scores every editorial check as passing,
 * and that is indistinguishable from the system being excellent. It is also the
 * answer everyone prefers. So the instruction says which way to err, rather
 * than leaving it to the model's disposition.
 */
const SYSTEM =
  'You are grading ONE property of an answer, strictly. Reply with exactly one line: YES or NO, ' +
  'then a dash and at most fifteen words of reason. Say YES only if the answer clearly and ' +
  'explicitly satisfies the property — if it is partial, implied, or you are unsure, say NO. ' +
  'Judge only the property asked about, and ignore everything else about the answer, including ' +
  'whether it is well written or correct.';

async function ask(question: string, answer: string): Promise<boolean> {
  const client = chatClient(() => openaiClient());
  const res = await client.chat.completions.create({
    model: chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? ''),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `PROPERTY: ${question}\n\nANSWER:\n${answer}` },
    ],
  });
  return /^\s*yes/i.test(res.choices[0]?.message?.content ?? '');
}

/**
 * Judge one answer, with the control run first.
 *
 * THE CONTROL COSTS TWO EXTRA CALLS PER RUBRIC AND IS NOT OPTIONAL. Without it
 * a judge stuck on "yes" reports every editorial check as passing, which is
 * indistinguishable from the system being excellent — and it is the direction
 * everyone wants to believe.
 */
export async function judge(
  rubric: Rubric,
  answer: string,
  paceMs = Number(process.env.JUDGE_PACE_MS ?? 4500),
): Promise<Verdict> {
  const pause = () => new Promise((r) => setTimeout(r, paceMs));

  const rejectsBad = !(await ask(rubric.question, rubric.failingExemplar));
  await pause();
  const acceptsGood = await ask(rubric.question, rubric.passingExemplar);
  await pause();
  const controlled = rejectsBad && acceptsGood;

  if (!controlled) {
    // SPELLED OUT RATHER THAN COMPOSED. The first version built this sentence
    // from two conditionals and INVERTED BOTH BRANCHES: it reported "rejected
    // the bad exemplar" — which is correct behaviour — when the judge had in
    // fact ACCEPTED it. The control fired correctly and then described itself
    // backwards, so the one line a reader had to act on was the wrong way round.
    //
    // A control that reports its own result incorrectly is worse than no
    // control, because it is trusted.
    const faults: string[] = [];
    if (!rejectsBad) faults.push('ACCEPTED an answer that does not satisfy the property');
    if (!acceptsGood) faults.push('REJECTED an answer that plainly does');

    return {
      caseId: rubric.caseId,
      passes: null,
      controlled: false,
      why:
        `judge failed its own control: it ${faults.join(' and it ')}. ` +
        'Its verdict on the real answer is discarded.',
    };
  }

  const passes = await ask(rubric.question, answer);
  return { caseId: rubric.caseId, passes, controlled: true, why: passes ? 'satisfied' : 'not satisfied' };
}
