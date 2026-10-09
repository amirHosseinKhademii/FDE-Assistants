/**
 * The shell every lesson renders inside: the rail, the header, the body, and
 * the two links out.
 *
 * WHY A COMPONENT AND NOT A LAYOUT ROUTE. The rail IS a layout route
 * (`routes/learn.tsx`) because it is identical on all six pages. This is the
 * part that differs per lesson — the hue, the number, the lede, the document it
 * teaches from, where "next" goes — so it takes them as props. Putting them in
 * route context would have hidden them one indirection away from the page that
 * sets them.
 */
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
/** Everything the header says about one lesson, already resolved by the app. */
export interface LessonFacts {
  /** The CSS colour this lesson's hue resolves to, set once as `--lesson`. */
  hue: string;
  /** Position within its track, and how many the track holds. */
  n: number;
  total: number;
  trackTitle: string;
  title: string;
  lede: string;
  minutes: number;
  /** The document the page is a reading of. */
  source: string;
  /** What a reader needs first, or null when it reads cold. */
  needs: string | null;
}

/** One of the two links out. `crossesTo` is set only when it enters another track. */
export interface NeighbourLink {
  href: string;
  n: number;
  short: string;
  title: string;
  crossesTo?: string;
}

export function LessonPage({
  lesson,
  prev,
  next,
  children,
}: {
  lesson: LessonFacts;
  prev?: NeighbourLink;
  next?: NeighbourLink;
  children: ReactNode;
}) {

  return (
    /* `--lesson` is set ONCE, here, and every rule in `app.css` reads it. That
       is what lets one stylesheet dress five pages without five near-identical
       blocks that drift the first time one gets a fix. */
    <article className="lesson" style={{ ['--lesson' as string]: lesson.hue }}>
      <header className="border-b border-ui-line pb-8">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.08em] uppercase">
          <span className="text-ui-faint">{lesson.trackTitle}</span>
          <span style={{ color: 'var(--lesson)' }}>
            lesson {lesson.n} of {lesson.total}
          </span>
          <span className="text-ui-faint">≈ {lesson.minutes} min, roughly</span>
        </p>

        <h1 className="mt-4 max-w-[26ch] font-mono text-3xl leading-[1.15] font-semibold tracking-tighter text-ui-fg md:text-4xl">
          {lesson.title}
        </h1>

        {/* The lede is the whole lesson in one sentence. If a reader stops
            here, this is what they should have. */}
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ui-dim">{lesson.lede}</p>

        {/* NAMED ON EVERY PAGE, and it is not decoration. These pages are a
            READING of `docs/`, not a second source of truth: where a number
            here disagrees with the document below, the document is right and
            this page is stale. */}
        <p className="mt-6 font-mono text-xs leading-relaxed text-ui-faint">
          a reading of <span className="text-ui-dim">{lesson.source}</span> — where the two disagree, the
          document is right and this page is stale
        </p>

        {/* WHAT IT ASSUMES, STATED RATHER THAN LEFT TO BE DISCOVERED HALFWAY
            DOWN. "Reads cold" is the more useful half: the strongest page in
            the second track needs none of the first, and a reader who starts
            there should know they have not skipped anything. */}
        <p className="mt-2 font-mono text-xs leading-relaxed text-ui-faint">
          {lesson.needs ? (
            <>
              assumes <span className="text-ui-dim">{lesson.needs}</span>
            </>
          ) : (
            <span className="text-ui-dim">reads cold — nothing before it is assumed</span>
          )}
        </p>
      </header>

      <div className="py-10">{children}</div>

      <nav className="grid gap-3 border-t border-ui-line py-10 sm:grid-cols-2">
        {prev ? (
          <Step
            href={prev.href}
            dir="back"
            label={`${prev.n}. ${prev.short}`}
            title={prev.title}
            /* Only when it changes, so the common case stays quiet and the
               handover between tracks is the thing that stands out. */
            track={prev.crossesTo}
          />
        ) : (
          <span />
        )}
        {next && (
          <Step
            href={next.href}
            dir="on"
            label={`${next.n}. ${next.short}`}
            title={next.title}
            track={next.crossesTo}
          />
        )}
      </nav>
    </article>
  );
}

/**
 * One of the two links out.
 *
 * A `<Link>` to a lesson in this app, so it stays inside the router and does
 * not reload the page. The app passes the finished `href`: the package knows no
 * route tree, which is the point of it being a package.
 */
function Step({
  href,
  dir,
  label,
  title,
  track,
}: {
  href: string;
  dir: 'back' | 'on';
  label: string;
  title: string;
  /** Set only when this link crosses into the other track. */
  track?: string;
}) {
  return (
    <Link
      to={href}
      className={`learn-next group ${dir === 'on' ? 'sm:col-start-2' : ''}`}
      style={{ textAlign: dir === 'on' ? 'right' : 'left' }}
    >
      <p className="font-mono text-xs text-ui-faint">
        {dir === 'back' ? '← previous' : 'next →'} · {label}
      </p>
      <p className="mt-2 leading-snug text-ui-dim group-hover:text-ui-fg">{title}</p>
      {track && <p className="mt-2 font-mono text-[0.6875rem] text-ui-faint">starts “{track}”</p>}
    </Link>
  );
}
