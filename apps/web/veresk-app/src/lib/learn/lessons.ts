/**
 * The lessons, in tracks. `TRACKS` and `LESSONS` below are the only count.
 *
 * ── WHY TRACKS AND NOT ONE NUMBERED RUN ────────────────────────────────────
 *
 * `machine` explains the MACHINE — what an embedding is, how two search arms
 * are fused, what the answer contract forces, what a suite measures. Every word
 * of it is true of all three engagements, and none of it names a customer except
 * as an example. It is a real sequence: each lesson assumes the one above.
 *
 * `engagement` is ONE ENGAGEMENT: a bid response for a steering-systems
 * supplier, with its real corpus, its real refusals and its live open problem.
 * It teaches a different kind of thing — not how the machinery works but what
 * happens when you point it at somebody's actual files and most of the answers
 * turn out not to be in them.
 *
 * Folding those into one numbered run would have broken the claim the machine
 * track is built on: that the order is the argument and each lesson assumes the
 * one above it. The engagement track does not assume the machine track in that
 * way. Three of its lessons genuinely depend on machine lessons 2 and 3 and say
 * so; its first depends on nothing at all and is the one to read if only one
 * gets read.
 *
 * `operations` and `patterns` were added later and each carries its own
 * argument for where it sits, on its own record below. THE HEADING THIS
 * PARAGRAPH REPLACED SAID "WHY TWO TRACKS AND NOT TWELVE LESSONS" and went on
 * saying it through two more tracks — which is the fourth incident on
 * `/learn/drift`, committed in the file that incident is about. A comment
 * carrying a count is a count nothing checks.
 *
 * ── HOW A LESSON GETS ITS COLOUR, AND THE VERSION THAT WAS WRONG ───────────
 *
 * FIRST ATTEMPT: five named hues, and any track longer than five got none at
 * all — drawn in the foreground colour, on the argument that it had no sequence
 * for a hue to encode. The argument was sound and the conclusion was not. Every
 * track is a sequence; that is what a track IS. What ran out was not the
 * meaning, it was the palette.
 *
 * And the result was the thing that got reported: a track that visibly did not
 * belong to the same site as the one above it.
 *
 * SO THE HUE IS A POSITION WITHIN A TRACK, SAMPLED FROM ONE RAMP. Five stops,
 * sky through orange, sampled at `(n - 1) / (total - 1)` — so a five-lesson
 * track lands exactly on the five stops and a seven-lesson track gets seven
 * steps of the same ramp. Every track looks like every other track, and a
 * lesson's colour says how far through its own track it is.
 *
 * THE VALIDATOR'S FINDING STILL STANDS AND IS STILL RESPECTED. Measured against
 * the five stops on a #0d0f15 surface in dark mode, they fail as a CATEGORICAL
 * palette:
 *
 *   FAIL  worst adjacent pair ΔE 6.8 (normal vision), against a floor of 15
 *
 * ── AND THAT IS A RECORDED FINDING, NOT A COMMAND YOU CAN RUN ──────────────
 *
 * This comment used to print `node scripts/validate_palette.js …` as though it
 * were reproducible. IT IS NOT IN THIS REPO — `scripts/` holds `arch-graph.mjs`,
 * `dep-graph.mjs` and `leak-check.mjs`, and nothing else. The ΔE number is real
 * and was measured; the producer left, and the citation stayed, which is a
 * worse position than having no producer at all because everybody reading it
 * believes the claim is checkable. See `/learn/drift`, whose whole argument
 * this is. Restoring the script is the fix; until then the wording is honest.
 *
 * Seven steps are closer together than five, so a seven-lesson track fails it
 * harder. That is fine and it is why the rule around the hue matters more than
 * the hue: NO CHART ENCODES A SERIES WITH IT, and it never appears without its
 * lesson number beside it. It is a ramp, read as "how far along", and a ramp is
 * allowed to have neighbours that resemble each other — that is what makes it
 * read as a ramp rather than as five categories.
 *
 * Tracks never interleave on one page, so two lessons in different tracks
 * sharing a hue cannot be confused: they are never side by side, and each
 * carries its own number under its own heading.
 */
export type LessonSlug =
  // Track one — the machine.
  | 'vectors'
  | 'retrieval'
  | 'generation'
  | 'loop'
  | 'evals'
  // Track two — what you build after it works.
  | 'regressions'
  | 'forensics'
  | 'cost'
  | 'caching'
  | 'drift'
  // Track three — five ways to retrieve. Only two of them are built here.
  | 'hybrid'
  | 'corrective'
  | 'agentic'
  | 'graph'
  | 'multimodal'
  // Track four — one engagement.
  | 'guessing'
  | 'pipelines'
  | 'answer-key'
  | 'tools'
  | 'attention'
  | 'residency'
  | 'ceiling';

export type TrackId = 'machine' | 'operations' | 'patterns' | 'engagement';

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
    /*
     * SECOND, NOT LAST, AND THAT IS A DEPENDENCY ARGUMENT RATHER THAN A
     * PREFERENCE. Four of these five need only the machine track: what a suite
     * measures, what a request costs, what a cache matches on, what a number in
     * a document is derived from. Only `forensics` leans on the engagement, and
     * it says so. Filing them behind seven pages of one customer's findings
     * would have put the general lesson behind the specific one.
     */
    id: 'operations',
    title: 'What you build after it works',
    blurb:
      'Five things a system needs once it answers correctly and has to keep doing so: catching a model that moved under you, finding out why a failure failed, knowing what it costs, deciding whether to cache, and stopping your own documentation from lying. Two of the five are largely PROPOSED here, and every page says which parts are built and which are argued.',
  },
  {
    /*
     * THIRD, AND THE ARGUMENT IS THE ONE `operations` ALREADY MADE.
     *
     * These five are general — four of them are patterns this repo has NOT
     * built, read out of the papers that did. The engagement track is one
     * customer's files. Filing the general behind the specific is the mistake
     * the track above was moved to avoid, and it would be the same mistake
     * twice to append these after seven pages of somebody's bid response.
     *
     * ── A READING ORDER, NOT A DEPENDENCY CHAIN, AND THE `needs` LINES SAY SO ──
     *
     * Every other track is a sequence where each lesson assumes the one above.
     * This one is not, and pretending otherwise would repeat the error this
     * file's header describes. All five assume machine lesson 2 — that is the
     * real prerequisite and it is SHARED rather than sequential. Only
     * `corrective` depends on a sibling, because it reuses hybrid's
     * over-fetch-then-gate shape and leans on its `ret-008` finding.
     *
     * So the order is an argument about what to read first, not about what you
     * are able to read: built-and-measured first, least-built last, which also
     * happens to run from "fix your retrieval" to "your input was never text".
     * Three of the five can be entered directly and their cards say so.
     */
    id: 'patterns',
    title: 'Five ways to retrieve',
    blurb:
      'The state of the art around the pipeline in track one: two searches instead of one, grading what came back before the model may use it, letting the model search again, building a map first, and giving up on text altogether. Two are built here and measured; three are read out of the papers, and every figure taken from one is badged as somebody else’s measurement rather than ours.',
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
    slug: 'regressions',
    track: 'operations',
    n: 1,
    short: 'Regressions',
    title: 'The model moves underneath you',
    lede: 'The model is not yours and does not hold still — so the unit of measurement is a rate over N runs, a one-run move is a coin flip and prints as MOVED, and the diff refuses outright to compare two runs whose setup differed.',
    source: 'docs/steering/OPERATIONS.md §1 · packages/evals/src/diff.ts',
    minutes: 9,
    needs: 'lesson 5 of the machine',
  },
  {
    slug: 'forensics',
    track: 'operations',
    n: 2,
    short: 'Forensics',
    title: 'Why it failed, and how many kinds of failure you have',
    lede: 'Four causes look identical from outside — no answer — and need four different fixes, so forensics is a classification problem before it is a debugging one: one instance is an anecdote, a bucket count is a work plan.',
    source: 'docs/steering/OPERATIONS.md §2 · NEXT.md §0',
    minutes: 9,
    needs: null,
  },
  {
    slug: 'cost',
    track: 'operations',
    n: 3,
    short: 'Cost',
    title: 'What it costs, and the denominator nobody picks',
    /*
     * "TWO THIRDS" AND NOT "68.5%", DELIBERATELY.
     *
     * This lede carried 74% — the figure the page below it was corrected away
     * from — and went on saying it after the body had been fixed, on the index
     * card and at the top of the page. A reader met the wrong number as the
     * finding and the correction four paragraphs later.
     *
     * The fix is not a better number. A lede that carries a precise figure is a
     * SECOND PLACE for that figure to go stale, and the page below has the exact
     * one with the command that reprints it. So the summary rounds and the body
     * is precise, which is the only arrangement where they cannot disagree.
     */
    lede: 'Per-request cost was measured from day one; the two things that changed the picture were printing spend by surface — two thirds of it turned out to be the eval suite, not production — and dividing by accepted answers instead of by calls.',
    source: 'docs/steering/OPERATIONS.md §3 · apps/ai/steering/src/telemetry/prices.ts',
    minutes: 9,
    needs: null,
  },
  {
    slug: 'caching',
    track: 'operations',
    n: 4,
    short: 'Caching',
    title: 'Two caches, and only one of them can be wrong',
    lede: 'The provider\u2019s prompt cache matches an exact prefix and cannot return a wrong answer; a semantic cache matches meaning and can — which is why the adversary set gets built before the cache, and why the honest recommendation here was not to build one.',
    source: 'docs/steering/OPERATIONS.md §4',
    minutes: 8,
    needs: 'lesson 3 of this track',
  },
  {
    slug: 'drift',
    track: 'operations',
    n: 5,
    short: 'Drift',
    title: 'Every number in a document can go stale',
    lede: 'Only a claim with a machine producer can be checked — which is the whole design, because a checker that fires on opinions gets turned off and one that misses the numbers gets quoted.',
    source: 'docs/steering/OPERATIONS.md §5',
    minutes: 7,
    needs: null,
  },

  {
    slug: 'hybrid',
    track: 'patterns',
    n: 1,
    short: 'Hybrid',
    title: 'Two searches, because one is reliably wrong about different things',
    lede: 'Meaning-search is worst at exactly the rare words that matter most and word-search is worst at paraphrase, so you run both — and you cannot add the scores, because one is a bounded distance and the other is an unbounded rank.',
    source: 'docs/rag/HYBRID.md',
    minutes: 11,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'corrective',
    track: 'patterns',
    n: 2,
    short: 'Corrective',
    title: 'Grading what came back, before the model is allowed to use it',
    lede: 'A passage can rank first and still be the wrong answer — the superseded bulletin outscores its own replacement here — so over-fetch, then drop on facts rather than on scores, because a threshold is a number somebody has to tune and a fact is not.',
    source: 'docs/rag/CORRECTIVE.md',
    minutes: 11,
    needs: 'lesson 1 of this track',
  },
  {
    slug: 'agentic',
    track: 'patterns',
    n: 3,
    short: 'Agentic',
    title: 'Retrieval becomes a tool the model may call, and may call again',
    lede: 'Search stops being a step before the model and becomes something it decides to do — which makes the tool description the prompt, makes cost a distribution rather than a number, and makes the turn cap an outcome you report instead of a truncation you hide.',
    source: 'docs/rag/AGENTIC.md',
    minutes: 11,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'graph',
    track: 'patterns',
    n: 4,
    short: 'Graph',
    title: 'Building a map first, because some questions have no passage',
    lede: '“Which components are exposed to the part that failed” is an answer no single passage contains — it is a path across three documents — and paying an LLM call per chunk at index time is how you buy the ability to walk one.',
    source: 'docs/rag/GRAPH.md',
    minutes: 11,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'multimodal',
    track: 'patterns',
    n: 5,
    short: 'Multimodal',
    title: 'The page is not the text on the page',
    lede: 'Everything above assumes the meaning survived being turned into text, and in a table, a chart or a scan it did not — so either a model describes the page before it knows the question, or you stop transcribing and match the picture directly.',
    source: 'docs/rag/MULTIMODAL.md',
    minutes: 11,
    needs: 'lesson 2 of the machine',
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
 * The ramp every track is coloured from. Five stops, sky → orange.
 *
 * DECORATION, AND THE COMMENT IN `app.css` CARRIES THE VALIDATOR RUN THAT SAYS
 * SO. Nothing on these pages encodes a data series with it.
 */
const RAMP = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#fb923c'] as const;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/**
 * Sample the ramp at `t` in [0, 1].
 *
 * A PLAIN sRGB MIX, WHICH IS THE RIGHT AMOUNT OF EFFORT HERE. Interpolating in
 * OKLab would give a more even-looking ramp, and nothing on these pages reads a
 * hue as a magnitude — it is a position marker sitting next to the number it
 * duplicates. A perceptually-uniform ramp for decoration is precision spent
 * where no one can collect it.
 */
function sample(t: number): string {
  const x = Math.min(0.9999, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = hex(RAMP[i]);
  const b = hex(RAMP[i + 1] ?? RAMP[i]);
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The accent a lesson is drawn in: how far through its own track it is.
 *
 * Every track samples the same ramp, so a five-lesson track lands on the five
 * stops and a seven-lesson track gets seven steps of the same thing. See this
 * file's header for why this replaced a version where one track had no colour.
 */
export const hueOf = (l: Lesson): string => {
  const total = lessonsIn(l.track).length;
  return total <= 1 ? RAMP[0] : sample((l.n - 1) / (total - 1));
};

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

/**
 * The architecture page, which belongs to no track.
 *
 * ── IT LIVES HERE BECAUSE IT SHIPPED ORPHANED ──────────────────────────────
 *
 * `/learn/architecture` was built, routed, rendered and reachable only by
 * typing the URL. Nothing linked to it — not the rail, not the index, not the
 * firm's page. The plan said it would get an entry above the tracks and the
 * entry was never written, which is what happens when a link lives in whichever
 * component someone remembers to edit.
 *
 * So it is a record, exported once, and every surface that lists it reads this.
 * A page cannot be added to the section now without a place to put it.
 */
export const MAP = {
  slug: 'architecture',
  short: 'The repo map',
  title: 'Follow one requirement through the repo',
  blurb:
    'Which package and which file does what, from the desk to a filed answer. A reference rather than a sequence — the dependency graph is generated from package.json; the walk is written by hand.',
} as const;

/**
 * The totals every surface prints.
 *
 * ── DERIVED, BECAUSE THE HARDCODED VERSION WENT STALE IN A DAY ─────────────
 *
 * Three surfaces said "twelve lessons" and "two tracks" — the rail, the index
 * and the firm's page — and stayed saying it after a third track of five landed.
 * The reading estimate was low by the same five pages.
 *
 * A hardcoded count that went stale the moment the thing it counts changed,
 * sitting in the navigation of a site whose last lesson is about exactly that.
 * Nothing caught it: it was found by a person reading the page. Deriving it is
 * the fix, and `/learn/drift` carries it as an incident.
 */
export const TOTALS = {
  lessons: LESSONS.length,
  tracks: TRACKS.length,
  /** Rounded down to the half hour, and labelled as rough wherever it is shown. */
  hours: Math.round((LESSONS.reduce((n, l) => n + l.minutes, 0) / 60) * 2) / 2,
};
