/**
 * The lessons, in two tracks.
 *
 * ── WHY TWO TRACKS AND NOT TWELVE LESSONS ───────────────────────────────────
 *
 * The first five explain the MACHINE — what an embedding is, how two search arms
 * are fused, what the answer contract forces, what a suite measures. Every word
 * of it is true of all three engagements, and none of it names a customer except
 * as an example.
 *
 * The next seven are ONE ENGAGEMENT: a bid response for a steering-systems
 * supplier, with its real corpus, its real refusals and its live open problem.
 * They teach a different kind of thing — not how the machinery works but what
 * happens when you point it at somebody's actual files and most of the answers
 * turn out not to be in them.
 *
 * Folding them into one numbered run would have broken the claim the first five
 * are built on: that the order is the argument and each lesson assumes the one
 * above it. Track two does not assume track one in that way. Three of its
 * lessons genuinely depend on lessons 2 and 3 and say so; its first depends on
 * nothing at all and is the one to read if only one gets read.
 *
 * ── AND WHY TRACK TWO HAS NO COLOUR ─────────────────────────────────────────
 *
 * Track one gives each lesson a hue because it has a sequence to encode — five
 * stages a question passes through. Track two is one customer, and there is no
 * comparable sequence for a hue to mean. Inventing one would be decoration
 * pretending to be information, which `docs/pharma/DESIGN.md` §3 spends a page
 * arguing against.
 *
 * It is also the only honest option left. The arc that remains once teal, green,
 * amber, rose and blue are reserved for severity is not wide enough for five
 * more distinguishable hues — the palette validator says so about the five that
 * already exist, and the run is recorded in `app.css`. So track two is drawn in
 * the foreground colour and its lessons are told apart by their numbers and
 * their titles, which is what was doing the work on track one anyway.
 */
export type LessonSlug =
  // Track one — the machine.
  | 'vectors'
  | 'retrieval'
  | 'generation'
  | 'loop'
  | 'evals'
  // Track two — one engagement.
  | 'guessing'
  | 'pipelines'
  | 'answer-key'
  | 'tools'
  | 'attention'
  | 'residency'
  | 'ceiling';

export type TrackId = 'machine' | 'engagement';

export interface Track {
  id: TrackId;
  title: string;
  blurb: string;
}

export const TRACKS: Track[] = [
  {
    id: 'machine',
    title: 'The machine',
    blurb:
      'The parts every engagement is built from, in the order a question passes through them. Read straight down.',
  },
  {
    id: 'engagement',
    title: 'One engagement, end to end',
    blurb:
      'The same machinery pointed at a real customer’s files — a bid response for a steering-systems supplier — where most of the answers turned out not to be in them.',
  },
];

export interface Lesson {
  slug: LessonSlug;
  track: TrackId;
  /** Position WITHIN its track. Shown everywhere a hue is, so a hue is never alone. */
  n: number;
  /** The rail label — short enough not to wrap at 14rem. */
  short: string;
  /** The page's own title. A question or a claim, never a noun phrase. */
  title: string;
  /** One sentence, and it must be the whole lesson. If it needs two, the lesson is two. */
  lede: string;
  /** The document in `docs/` this page is a reading of. */
  source: string;
  /** Roughly, at 200 words a minute plus a look at each figure. Labelled as rough. */
  minutes: number;
  /**
   * What a reader needs first, named on the page.
   *
   * `null` means it reads cold, and that is worth stating rather than leaving to
   * be inferred: `guessing` is the strongest page in the second track and needs
   * none of the first, so a reader who starts there has not skipped anything.
   */
  needs: string | null;
}

export const LESSONS: Lesson[] = [
  {
    slug: 'vectors',
    track: 'machine',
    n: 1,
    short: 'Vectors',
    title: 'An embedding is a list of numbers',
    lede: 'A passage becomes 1,536 numbers, searching becomes "which of these arrows points most like mine", and that is genuinely the whole mechanism.',
    source: 'docs/RETRIEVAL.md — Appendix A',
    minutes: 6,
    needs: null,
  },
  {
    slug: 'retrieval',
    track: 'machine',
    n: 2,
    short: 'Retrieval',
    title: 'Finding the passage, and knowing you have not',
    lede: 'Two search arms are run because embeddings are worst at exactly the words that matter, fused by rank rather than by score — and nothing is thrown away for scoring low, because a low score is not evidence of absence.',
    source: 'docs/RETRIEVAL.md §2–§5 · docs/steering/evals/RETRIEVAL.md',
    minutes: 9,
    needs: 'lesson 1',
  },
  {
    slug: 'generation',
    track: 'machine',
    n: 3,
    short: 'The answer',
    title: 'What reaches the model, and what must come back',
    lede: 'The context window has no hidden layer — it is a system prompt, three tool schemas, a contract and a growing history — and the answer is held to a shape that makes the dangerous answer impossible to express.',
    source: 'docs/AUGMENTED-GENERATION.md',
    minutes: 8,
    needs: 'lesson 2',
  },
  {
    slug: 'loop',
    track: 'machine',
    n: 4,
    short: 'The loop',
    title: 'One loop, three engines, two clouds',
    lede: 'The tool-calling loop is a while-loop around one HTTP call; three frameworks implement it behind one contract, and the differences between them cost real money in exactly three places.',
    source: 'docs/ENGINES.md',
    minutes: 7,
    needs: 'lesson 3',
  },
  {
    slug: 'evals',
    track: 'machine',
    n: 5,
    short: 'Evals',
    title: 'Proving it works, and what a green run is not',
    lede: 'Every case runs five times because a suite run once is a sample; failures are bucketed by severity because a wrong answer and a timeout need different fixes; and a red check is a hypothesis, not a verdict.',
    source: 'docs/evals/README.md · docs/GUIDE.md §6',
    minutes: 8,
    needs: 'lesson 4',
  },

  {
    slug: 'guessing',
    track: 'engagement',
    n: 1,
    short: 'Guessing',
    title: 'How to tell a model is guessing, with no answer key',
    lede: 'A field answered a third of the time, on documents that all look alike, is a field being guessed at — and you can read that off the output distribution alone, on day one, at a customer whose answers nobody knows.',
    source: 'docs/steering/SORTING.md §K5 · WHAT-WE-ASK-THE-MODEL.md §3, §5',
    minutes: 9,
    needs: null,
  },
  {
    slug: 'pipelines',
    track: 'engagement',
    n: 2,
    short: 'Three pipelines',
    title: 'A corpus is three different problems',
    lede: 'Files with columns are parsed by plain code, prose is indexed, and only facts buried inside sentences are read by a model — because exactly one of those three can be quietly wrong.',
    source: 'docs/steering/HOW-WE-SORTED-IT.md · SORTING.md',
    minutes: 7,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'answer-key',
    track: 'engagement',
    n: 3,
    short: 'The answer key',
    title: 'Work the answer out by hand, before building anything',
    lede: 'You cannot tell whether a system is right if nobody knows the answer — so the bid was priced by a person with three commands that call no model, and the rules that came out of that became the rules inside the tool.',
    source: 'docs/steering/WALKTHROUGH.md · PLAN.md Phase A',
    minutes: 8,
    needs: null,
  },
  {
    slug: 'tools',
    track: 'engagement',
    n: 4,
    short: 'The tools',
    title: 'Every rule lives inside the tool, not in the prompt',
    lede: 'A rule a model can talk itself out of is not a rule — so the refusal threshold, the median, and the count of what an answer rests on are all properties of a function the model can only call.',
    source: 'docs/steering/THE-TOOLS.md · HOW-WE-SORTED-IT.md',
    minutes: 9,
    needs: 'lesson 3 of this track',
  },
  {
    slug: 'attention',
    track: 'engagement',
    n: 5,
    short: 'Attention',
    title: 'The limit is attention, not the context window',
    lede: 'More context can make the answer worse — and because poor passages come back by design, raising k from 5 to 20 adds fifteen passages that are, by construction, the worst fifteen available.',
    source: 'docs/steering/CONCEPTS.md · THE-SUMMARY.md',
    minutes: 9,
    needs: 'lessons 2 and 3 of the machine',
  },
  {
    slug: 'residency',
    track: 'engagement',
    n: 6,
    short: 'What leaves',
    title: 'What leaves the building, and how each claim is known',
    lede: 'Of 1,069 files exactly 220 leave the machine, to one host in one region — and the column that makes that a deliverable is not the claim, it is whether the claim was verified here, stated by a vendor, or still has to be arranged.',
    source: 'docs/steering/DATA-RESIDENCY.md · CONTROLS.md',
    minutes: 7,
    needs: 'lesson 2 of this track',
  },
  {
    slug: 'ceiling',
    track: 'engagement',
    n: 7,
    short: 'The ceiling',
    title: 'What the customer’s own paperwork cannot tell you',
    lede: 'Only a third of completed work has a closure report, the safety level is never written next to the cost, and 23 of 24 requirements priced to nothing — which are findings about the customer, not bugs in the software.',
    source: 'docs/steering/HOW-WE-SORTED-IT.md · NEXT.md §0 · CONCEPTS.md',
    minutes: 9,
    needs: 'lesson 4 of this track',
  },
];

export const lessonBySlug = (slug: LessonSlug): Lesson => {
  const found = LESSONS.find((l) => l.slug === slug);
  // Unreachable through the router — every slug is a file route — but a thrown
  // error beats a page rendering `undefined` in its heading if this list and
  // the routes ever part company.
  if (!found) throw new Error(`no lesson named ${slug}`);
  return found;
};

export const lessonsIn = (track: TrackId) => LESSONS.filter((l) => l.track === track);

/**
 * The accent a lesson is drawn in.
 *
 * Track one: one hue per lesson, declared in `app.css`, decoration only.
 * Track two: the foreground colour, because there is no sequence to encode.
 * See this file's header for the argument.
 */
export const hueOf = (l: Lesson) =>
  l.track === 'machine' ? `var(--color-learn-${l.n})` : 'var(--color-ui-fg)';

/**
 * Previous and next.
 *
 * ACROSS THE WHOLE LIST, NOT WITHIN A TRACK. The end of track one hands over to
 * the start of track two rather than to nothing, because a reader who has just
 * finished the machine is exactly the reader the engagement pages are for. The
 * footer names the track it is sending them into so the handover is visible.
 */
export function neighbours(slug: LessonSlug): { prev?: Lesson; next?: Lesson } {
  const i = LESSONS.findIndex((l) => l.slug === slug);
  return { prev: LESSONS[i - 1], next: LESSONS[i + 1] };
}
