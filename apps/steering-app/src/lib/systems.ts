/**
 * Vantis Steering's four databases, in the order a bid answer walks them.
 *
 * A SEPARATE PALETTE FROM PHARMA'S, AND THAT IS THE POINT OF THE FILE. The six
 * hop hues on the pharma pages mean "which system of record did this fact come
 * from" for THAT estate. Reusing any of them here would mean a reader who
 * clicks between the two engagements sees Materials-teal on one page and
 * CRM-teal on the next, and quietly learns that the colour means nothing. So
 * these four are their own scale, checked against the six to make sure no hex
 * and no near-hex is shared: pharma runs teal → cyan → blue → violet → pink →
 * amber, so this runs through the greens, oranges and reds that set leaves
 * alone.
 *
 * THE ORDER IS THE BID WALK, not the alphabet and not the seed order. An RFQ
 * arrives at the customer (CRM), is compared against what we promise and design
 * (ALM), against what we actually build (PLM), and is priced from what changes
 * like it really cost (PMO). Numbering it is honest because it genuinely is a
 * sequence.
 *
 * THE VENDOR NAME IS NOT DECORATION. `vst_alm` means nothing to a bid engineer;
 * "Codebeamer / Polarion / DOORS" is the thing on their desk, and naming it is
 * what makes the estate recognisable as theirs rather than as a diagram.
 */

export interface SteeringFace {
  db: string;
  step: number;
  name: string;
  asks: string;
  hue: string;
}

export const STEERING_FACES: SteeringFace[] = [
  {
    db: 'vst_crm',
    step: 1,
    name: 'Customers',
    asks: 'who asked, for which car, by when',
    hue: 'var(--color-vst-1)',
  },
  {
    db: 'vst_alm',
    step: 2,
    name: 'Requirements',
    asks: 'what we promised, and what satisfies it',
    hue: 'var(--color-vst-2)',
  },
  {
    db: 'vst_plm',
    step: 3,
    name: 'Hardware',
    asks: 'what we build, and what it can do',
    hue: 'var(--color-vst-3)',
  },
  {
    db: 'vst_pmo',
    step: 4,
    name: 'Effort',
    asks: 'what a change like this really cost',
    hue: 'var(--color-vst-4)',
  },
];

/**
 * `vst_derived` — OURS, AND THE ONLY ONE ON THIS PAGE WE BUILT.
 *
 * It sits behind the rule with the code base, not in the row of four, and the
 * rule is the statement: left of it is what Vantis runs and we only ever read;
 * right of it is what this engagement produced. Drawing it as a fifth cylinder
 * in the same set would say the customer has five systems, which is false, and
 * would quietly take credit for four databases we did not build.
 *
 * IT CARRIES NO HUE for the same reason `mrd_kb` does not on the pharma page.
 * The four hues mean "which of the customer's systems did this fact come
 * from". This is not one of them, and giving it a fifth colour from the same
 * scale would put it in a set it does not belong to.
 *
 * IT IS OPENABLE, though, and the corpus card beside it is not — because there
 * genuinely are tables behind this one. Its rows carry the file and line they
 * were read from, which is the most interesting thing on the page: it is the
 * only place where a value can be followed back to the sentence it came from.
 */
export const KB_FACE = {
  db: 'vst_derived',
  name: 'What we derived',
  asks: 'what the files actually say, with the line it came from',
};

/**
 * The sixth thing, which is not a database — and, since 2026-09-13, the thing
 * the other four are measured against rather than an appendix to them.
 *
 * WHAT CHANGED. This card used to read "ten repositories of files · 54 files,
 * 192 KB". Both halves were wrong, and the second by a factor of twenty: the
 * corpus is 1,069 files across twelve top-level directories — eight source
 * repositories plus `requirements/`, `pmo/`, `releases/` and `tickets/`. The
 * number was written when the corpus was a sketch and never revisited when it
 * tripled. It is now taken from `pnpm steering:corpus-check`, which prints
 * exactly this line, so the next person to change the corpus moves the page by
 * re-running a command rather than by remembering.
 *
 * WHY IT IS NOW THE IMPORTANT ONE. `docs/steering/PLAN.md` carries a correction
 * dated the same day: the four databases were never derived from these files —
 * they were generated alongside them, from the same constants, in the same run.
 * So this is what the customer actually has, and the four are the answer key it
 * will be graded against. The card still does not open, for the same reason it
 * never did: there is nothing tabular behind it.
 *
 * THE SIZE IS THE CHECK'S FIGURE, NOT `du`'s. `du --apparent-size` reports
 * 2.3 MiB for the same directory; the check sums byte lengths and reports
 * 1.9 MB. Neither is wrong and quoting both would be noise, so this quotes the
 * one whose command is printed on the page.
 */
export const CORPUS_FACE = {
  name: 'The code base and the paperwork',
  asks: 'what the customer actually has — read, not queried',
  detail: '1,069 files, 1.9 MB, twelve directories under docs/steering/corpus/',
};
