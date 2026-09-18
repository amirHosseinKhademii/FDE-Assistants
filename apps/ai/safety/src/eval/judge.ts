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
    question:
      'Does the answer present the complaints filed after the recall that are NOT covered by it — ' +
      'complaints sharing the component but not the recalled defect — as a finding in their own ' +
      'right, rather than only reporting a total?',
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

const SYSTEM =
  'You are grading one property of an answer. Reply with exactly one line: YES or NO, then ' +
  'a dash and at most fifteen words of reason. Judge only the property asked about. Do not ' +
  'reward or penalise anything else about the answer.';

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
    return {
      caseId: rubric.caseId,
      passes: null,
      controlled: false,
      why:
        `judge failed its own control — ${rejectsBad ? 'accepted' : 'rejected'} the ` +
        `${rejectsBad ? 'good' : 'bad'} exemplar. Its verdict on the real answer is discarded.`,
    };
  }

  const passes = await ask(rubric.question, answer);
  return { caseId: rubric.caseId, passes, controlled: true, why: passes ? 'satisfied' : 'not satisfied' };
}
