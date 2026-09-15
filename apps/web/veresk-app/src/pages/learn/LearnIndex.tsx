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

      {/* ── WHERE EACH LESSON SITS IN ONE QUESTION ──────────────────────────
          A question enters and an answer leaves; the first track is the stages
          it passes through. Lesson 1 is drawn UNDER lesson 2 because it is what
          retrieval is made of rather than a stage of its own, and lesson 5 spans
          the row because an eval measures the finished thing, not a part of it.

          THE ENTRY AND EXIT ARE CAPTIONS, NOT CELLS IN THE ROW. They were flex
          items alongside the three cards, and at 1440px the row came to about
          55rem inside a column that is 52.5 — the last cell was cut mid-word,
          from a build that succeeded, which is the horizontal cousin of the
          clipped card backs `docs/SITE.md` documents. Taking the two labels out
          removes 13rem and two gaps, so it cannot clip at any width a person
          reads at. */}
      <section className="border-b border-ui-line py-10">
        <h2 className="font-mono text-sm tracking-[0.08em] text-ui-faint uppercase">where each one sits</h2>

        <p className="mt-6 font-mono text-[0.6875rem] text-ui-faint">a question arrives ↓</p>

        <div className="mt-2 overflow-x-auto pb-2">
          <div className="flex min-w-[37rem] items-stretch gap-2">
            <Card n={2} />
            <Arrow />
            <Card n={3} />
            <Arrow />
            <Card n={4} />
          </div>

          <div className="mt-2 flex min-w-[37rem] gap-2">
            <div className="w-[12rem] shrink-0">
              <Under n={1} note="what retrieval is made of" />
            </div>
            <span className="grow" />
          </div>

          <div className="mt-3 min-w-[37rem]">
            <Under n={5} note="measures the whole row, end to end" wide />
          </div>
        </div>

        <p className="mt-3 font-mono text-[0.6875rem] text-ui-faint">
          ↓ an answer, with citations, and an escalation where the corpus does not settle it
        </p>
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
    <span aria-hidden className="flex items-center text-ui-line-lit">
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
      className="w-[12rem] shrink-0 rounded-lg border px-3 py-2.5 transition-colors"
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

function Under({ n, note, wide }: { n: number; note: string; wide?: boolean }) {
  const l = lessonsIn('machine')[n - 1];
  return (
    <Link
      to={`/learn/${l.slug}`}
      className={`block rounded-lg border border-dashed px-3 py-2 ${wide ? 'w-full' : ''}`}
      style={{ borderColor: `color-mix(in oklab, ${hueOf(l)} 30%, var(--color-ui-line))` }}
    >
      <span className="font-mono text-[0.6875rem]" style={{ color: hueOf(l) }}>
        {n}. {l.short}
      </span>
      <span className="ml-2 text-[0.6875rem] text-ui-faint">{note}</span>
    </Link>
  );
}
