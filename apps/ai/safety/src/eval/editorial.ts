/**
 * The editorial properties — defined ONCE, used by both runners.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * These properties were written twice: as `unscored` strings in `cases.ts`, for
 * `safety:eval` to print, and as rubric questions in `judge.ts`, for
 * `safety:judge` to grade. Five properties, two wordings, nothing keeping them
 * in step.
 *
 * That is the same hazard this engagement flagged when the COMPONENT rule was
 * found in two tools — "two definitions of what this means that can drift is
 * the same hazard as two copies of a scoring rule" — and then committed itself
 * a day later. Neither copy would fail if they diverged; the eval would print
 * one property and the judge would grade another, and both would look right.
 *
 * ── NOT EVERY PROPERTY IS JUDGEABLE YET ───────────────────────────────────
 *
 * Three carry exemplars and are graded. Two do not, and are printed as stated
 * but ungraded rather than quietly dropped — a property nobody is checking
 * should be visible, not absent.
 */

export interface EditorialProperty {
  caseId: string;
  /** One line, for the eval printout. What the key asks for. */
  summary: string;
  /**
   * The rubric, phrased so a yes/no answer is meaningful.
   *
   * Present only when this property is graded. Absent means stated-but-unjudged,
   * which is a real state and is printed as such.
   */
  question?: string;
  /** An answer that definitely FAILS. The judge must say no to it. */
  failingExemplar?: string;
  /** An answer that definitely PASSES. The judge must say yes to it. */
  passingExemplar?: string;
}

export const EDITORIAL: EditorialProperty[] = [
  {
    caseId: 'REC-001',
    summary:
      'surfaces the complaints the recall does NOT cover as a finding, not just a total',
    // SHARPENED AFTER ITS OWN CONTROL FAILED. The first version was forty words
    // with two subordinate clauses and ended on "rather than only reporting a
    // total" — so an answer that DID only report a total contained the judge's
    // own last phrase, and the judge accepted it.
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
    summary: 'declines to draw a conclusion about the cause — a complaint is an allegation',
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
    summary: 'states WHY the distinction matters — same component is not the same defect',
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

  // ── STATED, NOT YET JUDGED ──────────────────────────────────────────────
  //
  // No exemplars, so no rubric, so no verdict. They are here rather than in a
  // comment because a property nobody checks should be VISIBLE — the eval
  // prints them every run, marked ungraded.
  {
    caseId: 'REC-005',
    summary: 'surfaces the volume of complaints as the reason it is worth a person looking',
  },
  {
    caseId: 'REC-008',
    summary: 'before + after is internally consistent with REC-001’s after-count',
  },
];

/** The ones a judge can grade — those carrying both exemplars. */
export const JUDGEABLE = EDITORIAL.filter(
  (e) => e.question && e.failingExemplar && e.passingExemplar,
);

/** Every editorial property for one case, graded or not. */
export const editorialFor = (caseId: string) => EDITORIAL.filter((e) => e.caseId === caseId);
