/**
 * `/learn` — the way in.
 *
 * WHO ARRIVES HERE. Somebody who has read the front page, understood that the
 * firm builds retrieval-and-agent systems for customers, and wants to know what
 * any of those words mean.
 *
 * THE PAGE'S ONE PROMISE, AND IT IS THE ONLY REASON THIS IS WORTH BUILDING:
 * every figure in the lessons is a number this repo measured, printed with the
 * command that reprints it. Exactly one drawing is an illustration — the
 * draggable vectors in the first lesson — and it is labelled as one where the
 * others carry their source. A teaching page that mixed the two would teach the
 * wrong lesson first.
 *
 * TWO TRACKS, AND THE SPLIT IS THE ARGUMENT. The first is the machine; the
 * second is one customer's files. See `lib/learn/lessons.ts` for why they are
 * not one numbered run of twelve.
 */
import { Link } from '@tanstack/react-router';
import { hueOf, lessonsIn, TRACKS, type Lesson } from '../../lib/learn/lessons';

export function LearnIndex() {
  return (
    <div>
      <header className="border-b border-ui-line pb-10">
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
          twelve lessons, two tracks · about an hour and a half
        </p>

        <h1 className="lift-in mt-4 max-w-[20ch] font-mono text-3xl leading-[1.1] font-semibold tracking-tighter text-ui-fg md:text-5xl">
          How the machine actually works.
        </h1>

        <p className="lift-in mt-6 max-w-[58ch] text-lg leading-relaxed text-ui-dim" style={{ animationDelay: '120ms' }}>
          Five pages take the machinery apart — something that finds the right passage, a contract the
          answer has to satisfy, a loop that calls tools, a suite that says whether any of it works. Seven
          more point the same machinery at a real customer's files and report what happened.
        </p>

        <p className="lift-in mt-5 max-w-[58ch] leading-relaxed text-ui-faint" style={{ animationDelay: '200ms' }}>
          Every figure is a number this repo measured, with the command that reprints it underneath.
          Exactly one drawing is an illustration rather than a measurement, and it says so in the place the
          others put their source.
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
