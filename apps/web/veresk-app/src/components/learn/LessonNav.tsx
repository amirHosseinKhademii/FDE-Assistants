/**
 * The rail — where you are.
 *
 * IT IS A LIST OF LINKS AND NOT A PROGRESS BAR. This app stores nothing and
 * knows nothing about who is reading it, so a bar filling up as lessons are
 * "completed" would be state the page invented.
 *
 * THE TWO GROUPS ARE THE ARGUMENT AND THE HEADINGS SAY SO. The first five are
 * the machine every engagement is built from; the next seven are one customer's
 * files. Running them together as 1–12 would claim a single dependency chain
 * that does not exist — the second track's first lesson needs none of the first
 * track, and says so on its own page.
 *
 * ON TRACK ONE THE HUE NEVER APPEARS WITHOUT ITS NUMBER. Five hues confined to
 * the arc left over once severity has claimed teal, green, amber, rose and blue
 * cannot be told apart as a series — the palette validator says so and the run
 * is recorded in `app.css`. Track two has no hue at all, because it has no
 * sequence for one to encode.
 */
import { Link } from '@tanstack/react-router';
import { hueOf, lessonsIn, MAP, TOTALS, TRACKS } from '../../lib/learn/lessons';

export function LessonNav() {
  return (
    <nav aria-label="Lessons" className="lg:sticky lg:top-8">
      <Link
        to="/learn"
        className="block px-2.5 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase transition-colors hover:text-ui-dim"
        activeOptions={{ exact: true }}
      >
        {TOTALS.lessons} lessons · {TOTALS.tracks} tracks
      </Link>

      {/* PINNED ABOVE THE TRACKS, AND SEPARATED FROM THEM. The repo map belongs
          to no track and is not numbered, so it cannot join a numbered list
          without claiming a position it does not have. It is here rather than
          only on the index because it is a reference you want to jump to
          MID-LESSON, and at that moment the rail is the only thing on screen.

          It shipped reachable only by typing the URL. See `lessons.ts`. */}
      <Link
        to={`/learn/${MAP.slug}`}
        className="learn-rail-item mt-3 border-b border-ui-line pb-3"
        style={{ ['--rail-hue' as string]: 'var(--color-ui-accent)' }}
      >
        <span className="learn-rail-n" aria-hidden>
          ▣
        </span>
        <span className="text-[0.875rem] leading-snug text-ui-dim">{MAP.short}</span>
      </Link>

      {TRACKS.map((track, ti) => (
        <section key={track.id} className={ti === 0 ? 'mt-4' : 'mt-7'}>
          <h2 className="px-2.5 font-mono text-[0.625rem] tracking-[0.1em] text-ui-faint uppercase">
            {track.title}
          </h2>
          <ol className="mt-2 space-y-0.5">
            {lessonsIn(track.id).map((l) => (
              <li key={l.slug}>
                <Link
                  to={`/learn/${l.slug}`}
                  className="learn-rail-item"
                  /* `--rail-hue` rather than `--lesson`: this rail is rendered
                     by the LAYOUT route, outside the page that sets `--lesson`,
                     so it has to carry each row's own accent rather than
                     inherit one. */
                  style={{ ['--rail-hue' as string]: hueOf(l) }}
                >
                  <span className="learn-rail-n">{l.n}.</span>
                  <span className="text-[0.875rem] leading-snug text-ui-dim">{l.short}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <p className="mt-6 max-w-[16rem] px-2.5 text-[0.6875rem] leading-relaxed text-ui-faint">
        Every figure is a number this repo measured, with the command that reprints it underneath.
      </p>
    </nav>
  );
}
