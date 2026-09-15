/**
 * `/learn` — the way in.
 *
 * WHO ARRIVES HERE. Somebody who has read the front page, understood that the
 * firm builds retrieval-and-agent systems for customers, and wants to know what
 * any of those words mean.
 *
 * THE PAGE'S ONE PROMISE, AND IT IS THE ONLY REASON THIS IS WORTH BUILDING:
 * a figure either is a number this repo measured, printed with the command that
 * reprints it, or it says on its own face that it is not one. A teaching page
 * that mixed the two would teach the wrong lesson first.
 *
 * THAT SENTENCE USED TO READ "EXACTLY ONE DRAWING IS AN ILLUSTRATION" and named
 * the draggable vectors in lesson 1. It was true for twelve lessons and then a
 * track arrived whose subject is four patterns this repo has not built — pages
 * carrying process drawings and other people's benchmarks by the figure. A
 * promise phrased as a COUNT went stale the moment the thing it counted grew;
 * phrased as a RULE it cannot. `Figure`'s `kind` prop is what enforces it, and
 * the default is the strict one.
 *
 * TWO TRACKS, AND THE SPLIT IS THE ARGUMENT. The first is the machine; the
 * second is one customer's files. See `lib/learn/lessons.ts` for why they are
 * not one numbered run of twelve.
 */
import { Link } from '@tanstack/react-router';
import { hueOf, lessonsIn, MAP, TOTALS, TRACKS, type Lesson } from '../../lib/learn/lessons';

export function LearnIndex() {
  return (
    <div>
      <header className="border-b border-ui-line pb-10">
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
          {TOTALS.lessons} lessons, {TOTALS.tracks} tracks · about {TOTALS.hours} hours
        </p>

        <h1 className="lift-in mt-4 max-w-[20ch] font-mono text-3xl leading-[1.1] font-semibold tracking-tighter text-ui-fg md:text-5xl">
          How the machine actually works.
        </h1>

        {/* NOT AN ENUMERATION ANY MORE. This sentence used to count the tracks
            out — "five … five … seven" — and went on saying it after a fourth
            track landed. The tracks name themselves below, each with its own
            blurb and its own count, so saying it twice only created somewhere
            for the two to disagree. */}
        <p className="lift-in mt-6 max-w-[58ch] text-lg leading-relaxed text-ui-dim" style={{ animationDelay: '120ms' }}>
          It starts with the machinery taken apart — something that finds the right passage, a contract the
          answer has to satisfy, a loop that calls tools, a suite that says whether any of it works — and
          goes on through what you build once it works, the retrieval patterns around it, and one real
          customer's files. Each track below says what it assumes and what it is for.
        </p>

        <p className="lift-in mt-5 max-w-[58ch] leading-relaxed text-ui-faint" style={{ animationDelay: '200ms' }}>
          Every figure either is a number this repo measured, with the command that reprints it
          underneath, or says on its face that it is not one — a drawing, a proposal, or a real measurement
          somebody else made.
        </p>
      </header>

      {/* ── WHERE EACH LESSON SITS ─────────────────────────────────────────
          THE FIRST VERSION OF THIS WAS THREE STACKED ROWS AND IT READ AS A
          BROKEN LIST. Cards 2, 3 and 4 sat in a row, lesson 1 hung underneath
          in a half-width row of its own, and lesson 5 was a wide dashed bar
          below that — so a reader met a numbered diagram that starts at 2, with
          1 and 5 apparently trailing after 4. Nothing on it said why.

          The relationships are now DRAWN rather than implied: a stem from
          Retrieval down to Vectors, and a bracket across all three for Evals.
          And the sentence that explains the numbering comes BEFORE the drawing,
          because "why does this start at 2" is the first thing a reader asks
          and the diagram cannot answer it by itself.

          IT IS A GRID, NOT A FLEX ROW WITH FIXED WIDTHS. The stem has to land
          under the first card at every width, which means one column template
          shared by all three rows. The previous version's fixed 12rem cards are
          also what made it clip at 1440px. */}
      <section className="border-b border-ui-line py-10">
        <h2 className="font-mono text-sm tracking-[0.08em] text-ui-faint uppercase">where each one sits</h2>

        <p className="mt-4 max-w-[62ch] leading-relaxed text-ui-dim">
          Only three of the five are stages a question actually passes through, which is why the row below
          starts at <span className="font-mono text-ui-fg">2</span>. Lesson 1 is what retrieval is{' '}
          <em className="not-italic text-ui-fg">made of</em>, so it sits underneath it. Lesson 5 measures the
          finished thing, so it spans all three rather than following them.
        </p>

        <div className="mt-8 overflow-x-auto pb-2">
          <div className="min-w-[30rem]">
            <p className="learn-map-edge">a question arrives</p>

            <div className="learn-map-grid mt-2">
              <Card n={2} />
              <Arrow />
              <Card n={3} />
              <Arrow />
              <Card n={4} />
            </div>

            {/* The stem lands in column 1, under Retrieval, at every width —
                which is the only thing the shared column template is for. */}
            <div className="learn-map-grid">
              <div className="col-start-1">
                <span className="learn-map-stem" aria-hidden />
                <Aside n={1} rel="what retrieval is made of" />
              </div>
            </div>

            {/* A bracket, opening upward into the row it spans. Dashed, because
                `DESIGN.md` reserves a dashed span for a join that is not a step
                — an eval is not the fourth thing that happens to a question. */}
            <div className="mt-5">
              <span className="learn-map-brace" aria-hidden />
              <Aside n={5} rel="measures all three, end to end" />
            </div>

            <p className="learn-map-edge mt-5">
              an answer, with citations — and an escalation where the corpus does not settle it
            </p>
          </div>
        </div>
      </section>

      {/* THE MAP, ABOVE THE TRACKS. It belongs to none of them and is the thing
          somebody arriving cold most often wants first: not how a retriever
          works, but where any of this lives. */}
      <section className="border-b border-ui-line py-10">
        <Link
          to={`/learn/${MAP.slug}`}
          className="case-card group grid gap-x-5 gap-y-2 sm:grid-cols-[3rem_1fr]"
          style={{ ['--lesson' as string]: 'var(--color-ui-accent)' }}
        >
          <span className="font-mono text-2xl leading-none text-ui-accent" aria-hidden>
            ▣
          </span>
          <span>
            <span className="block font-mono text-base font-medium text-ui-fg">{MAP.title}</span>
            <span className="mt-2 block max-w-[62ch] text-[0.9375rem] leading-relaxed text-ui-dim">
              {MAP.blurb}
            </span>
            <span className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[0.6875rem] text-ui-faint">
              <span className="text-ui-dim">a reference, not a lesson</span>
              <span>reads cold</span>
              <span>generated from package.json by pnpm arch:graph</span>
            </span>
          </span>
        </Link>
      </section>

      {TRACKS.map((track) => (
        <section key={track.id} className="border-b border-ui-line py-10 last:border-b-0">
          <h2 className="font-mono text-xl leading-snug font-medium tracking-tight text-ui-fg">
            {track.title}
          </h2>
          <p className="mt-3 max-w-[62ch] leading-relaxed text-ui-dim">{track.blurb}</p>

          <ol className="mt-8 space-y-3">
            {lessonsIn(track.id).map((l) => (
              <li key={l.slug}>
                <LessonCard lesson={l} />
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="py-10">
        <h2 className="font-mono text-sm tracking-[0.08em] text-ui-faint uppercase">
          what these pages are not
        </h2>
        <ul className="mt-5 max-w-[62ch] space-y-3 leading-relaxed text-ui-dim">
          <li>
            <strong className="font-medium text-ui-fg">Not a tutorial for building one.</strong> They explain
            a system that exists, with its measurements and its open problems. Where something is unfinished
            or blocked, the page says so rather than skipping it — the last lesson is an open problem with no
            answer yet.
          </li>
          <li>
            <strong className="font-medium text-ui-fg">Not the source of truth.</strong> Each lesson names the
            document in <code className="font-mono text-ui-fg">docs/</code> it is a reading of. Where the two
            disagree, the document is right and the page is stale.
          </li>
          <li>
            <strong className="font-medium text-ui-fg">Not a product claim.</strong> Every customer, estate
            and document behind this site is synthetic. The engineering, the measurements and the failures are
            not.
          </li>
        </ul>
      </section>
    </div>
  );
}

function LessonCard({ lesson: l }: { lesson: Lesson }) {
  return (
    <Link
      to={`/learn/${l.slug}`}
      className="case-card group grid gap-x-5 gap-y-2 sm:grid-cols-[3rem_1fr]"
      style={{ ['--lesson' as string]: hueOf(l) }}
    >
      <span className="font-mono text-2xl leading-none font-medium tracking-tight" style={{ color: hueOf(l) }}>
        {l.n}
      </span>
      <span>
        <span className="block font-mono text-base font-medium text-ui-fg">{l.title}</span>
        <span className="mt-2 block max-w-[62ch] text-[0.9375rem] leading-relaxed text-ui-dim">{l.lede}</span>
        <span className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[0.6875rem] text-ui-faint">
          <span>≈ {l.minutes} min</span>
          {/* Said on the card, not just on the page, because "reads cold" is
              what decides whether somebody can start here. */}
          <span className={l.needs ? '' : 'text-ui-dim'}>{l.needs ? `assumes ${l.needs}` : 'reads cold'}</span>
          <span>a reading of {l.source}</span>
        </span>
      </span>
    </Link>
  );
}

function Arrow() {
  return (
    <span aria-hidden className="flex items-center justify-center text-ui-line-lit">
      →
    </span>
  );
}

/** A stage of the question's journey. Track one only — the diagram is its shape. */
function Card({ n }: { n: number }) {
  const l = lessonsIn('machine')[n - 1];
  return (
    <Link
      to={`/learn/${l.slug}`}
      className="min-w-0 rounded-lg border px-3 py-2.5 transition-colors"
      style={{
        borderColor: `color-mix(in oklab, ${hueOf(l)} 35%, var(--color-ui-line))`,
        background: `color-mix(in oklab, ${hueOf(l)} 6%, transparent)`,
      }}
    >
      <span className="font-mono text-[0.6875rem]" style={{ color: hueOf(l) }}>
        {n}. {l.short}
      </span>
      <span className="mt-1 block text-[0.75rem] leading-snug text-ui-dim">{l.title}</span>
    </Link>
  );
}

/**
 * A lesson that is NOT a stage — the thing a stage is made of, or the thing
 * that measures all of them.
 *
 * THE SEPARATOR IS A CHARACTER, NOT A MARGIN. It was `ml-2`, which is invisible
 * to anything that copies the text: pasting the diagram gave
 * "1. Vectorswhat retrieval is made of". A page about being checkable should
 * survive being quoted.
 */
function Aside({ n, rel }: { n: number; rel: string }) {
  const l = lessonsIn('machine')[n - 1];
  return (
    <Link
      to={`/learn/${l.slug}`}
      className="inline-flex flex-wrap items-baseline gap-x-2 rounded-lg border border-dashed px-3 py-2 transition-colors hover:border-ui-line-lit"
      style={{ borderColor: `color-mix(in oklab, ${hueOf(l)} 30%, var(--color-ui-line))` }}
    >
      <span className="font-mono text-[0.6875rem]" style={{ color: hueOf(l) }}>
        {n}. {l.short}
      </span>
      <span className="text-[0.6875rem] text-ui-faint">— {rel}</span>
    </Link>
  );
}
