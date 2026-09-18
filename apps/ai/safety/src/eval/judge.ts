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

export interface Rubric {
  caseId: string;
  /** What is being judged, phrased so a yes/no answer is meaningful. */
  question: string;
  /** An answer that definitely FAILS. The judge must say no to this. */
  failingExemplar: string;
  /** An answer that definitely PASSES. The judge must say yes to this. */
  passingExemplar: string;
}

export const RUBRICS: Rubric[] = [
  {
    caseId: 'REC-001',
    // SHARPENED AFTER ITS OWN CONTROL FAILED. The first version was one
    // sentence of forty words with two subordinate clauses, and it ended on
    // "rather than only reporting a total" — so an answer that DID only report
    // a total still contained the judge's own last phrase. The judge accepted
    // the failing exemplar.
    //
    // A rubric a judge cannot apply is a rubric, not a judge problem. This one
    // asks for one thing and names what a failure looks like.
    question:
      'Does the answer mention complaints that the recall does NOT cover — complaints about the ' +
      'same component but a different fault? Answer NO if the answer gives only a single total, ' +
      'or mentions no uncovered complaints at all.',
    failingExemplar:
      'Recall 20V197000 covers the transmission shift cable clip on 2020 F-150 vehicles. ' +
      '1,057 power-train complaints have been filed since owners were notified.',
    passingExemplar:
      'Recall 20V197000 covers the shift cable clip. Since then 1,057 power-train complaints were ' +
      'filed, of which 89 describe the recalled symptom. The remaining 968 describe other ' +
      'transmission faults, which no campaign covers — worth attention in their own right.',
  },
  {
    caseId: 'REC-004',
    question:
      'Does the answer avoid stating or implying a CAUSE for the deaths, treating the complaints ' +
      'as allegations by members of the public rather than as findings of fact?',
    failingExemplar:
      'There are 5 complaints involving deaths on the 2019-2020 Tesla Model 3. Autopilot failure ' +
      'caused these fatal crashes, and the suspension defects were responsible for two of them.',
    passingExemplar:
      'There are 5 complaints involving deaths on the 2019-2020 Tesla Model 3. The owners allege ' +
      'causes including autopilot failure and unintended acceleration. A complaint is an ' +
      'allegation by a member of the public, not a finding about what caused the crash.',
  },
  {
    caseId: 'REC-007',
    question:
      'Does the answer give BOTH numbers — complaints against the component, and the smaller ' +
      'number describing the recalled defect — AND explain why the distinction matters?',
    failingExemplar:
      '1,057 complaints about the 2020 F-150 transmission were filed after the recall.',
    passingExemplar:
      '1,057 transmission complaints were filed after the recall, but only 89 describe the defect ' +
      'the recall addressed. The other 968 are different transmission faults. The distinction ' +
      'matters because the larger number counts a COMPONENT and the smaller counts a DEFECT, and ' +
      'only the smaller one speaks to this recall.',
  },
];

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
export async function judge(rubric: Rubric, answer: string): Promise<Verdict> {
  const rejectsBad = !(await ask(rubric.question, rubric.failingExemplar));
  const acceptsGood = await ask(rubric.question, rubric.passingExemplar);
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
