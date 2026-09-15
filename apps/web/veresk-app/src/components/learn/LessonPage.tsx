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
import { hueOf, lessonBySlug, lessonsIn, neighbours, TRACKS, type LessonSlug } from '../../lib/learn/lessons';

export function LessonPage({ slug, children }: { slug: LessonSlug; children: ReactNode }) {
  const lesson = lessonBySlug(slug);
  const { prev, next } = neighbours(slug);
  const track = TRACKS.find((t) => t.id === lesson.track)!;
  const total = lessonsIn(lesson.track).length;

  return (
    /* `--lesson` is set ONCE, here, and every rule in `app.css` reads it. That
       is what lets one stylesheet dress five pages without five near-identical
       blocks that drift the first time one gets a fix. */
    <article className="lesson" style={{ ['--lesson' as string]: hueOf(lesson) }}>
      <header className="border-b border-ui-line pb-8">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[0.6875rem] tracking-[0.08em] uppercase">
          <span className="text-ui-faint">{track.title}</span>
          <span style={{ color: 'var(--lesson)' }}>
            lesson {lesson.n} of {total}
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
            to={prev.slug}
            dir="back"
            label={`${prev.n}. ${prev.short}`}
            title={prev.title}
            /* Only when it changes, so the common case stays quiet and the
               handover between tracks is the thing that stands out. */
            track={prev.track === lesson.track ? undefined : TRACKS.find((t) => t.id === prev.track)?.title}
          />
        ) : (
          <span />
        )}
        {next && (
          <Step
            to={next.slug}
            dir="on"
            label={`${next.n}. ${next.short}`}
            title={next.title}
            track={next.track === lesson.track ? undefined : TRACKS.find((t) => t.id === next.track)?.title}
          />
        )}
      </nav>
    </article>
  );
}

/**
 * One of the two links out.
 *
 * A TYPED `<Link>`, and that is worth a sentence because `lib/links.ts` three
 * directories away spends thirty lines arguing for plain anchors. That argument
 * is about CROSSING AN ORIGIN — each engagement is its own deployment, so a
 * typed link to one would compile, look right and 404. Every lesson is served
 * by this app, so a typed link is not only fine here, it is the entire reason
 * the route tree is generated.
 */
function Step({
  to,
  dir,
  label,
  title,
  track,
}: {
  to: LessonSlug;
  dir: 'back' | 'on';
  label: string;
  title: string;
  /** Set only when this link crosses into the other track. */
  track?: string;
}) {
  return (
    <Link
      to={`/learn/${to}`}
      className={`case-card group ${dir === 'on' ? 'sm:col-start-2' : ''}`}
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
