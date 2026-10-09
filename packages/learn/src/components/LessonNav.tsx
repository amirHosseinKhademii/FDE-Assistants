/**
 * The rail — where you are.
 *
 * IT IS A LIST OF LINKS AND NOT A PROGRESS BAR. This app stores nothing and
 * knows nothing about who is reading it, so a bar filling up as lessons are
 * "completed" would be state the page invented.
 *
 * TWO VIEWS OF THE SAME 27 LESSONS. "Path" is the order you would build the
 * thing in (`data/path.ts`); "By topic" is the old grouping, unchanged, and it
 * is the one that says the second track's first lesson needs none of the first.
 * The toggle is a view, not a different rail: the totals line, the repo map and
 * the footer are the same in both.
 *
 * ON TRACK ONE THE HUE NEVER APPEARS WITHOUT ITS NUMBER. Five hues confined to
 * the arc left over once severity has claimed teal, green, amber, rose and blue
 * cannot be told apart as a series — the palette validator says so and the run
 * is recorded in `app.css`. Track two has no hue at all, because it has no
 * sequence for one to encode. In the path view a lesson's hue is its position
 * in its topic track, the same as in the topic view, so the colour means the
 * same thing in both.
 */
import { Link } from '@tanstack/react-router';
import type { PhaseId } from '../data/path';

/** One row on the topic rail. `hue` is the row's own accent, applied as `--rail-hue`. */
export interface RailLesson {
  href: string;
  n: number;
  short: string;
  hue: string;
}

export interface RailTrack {
  id: string;
  title: string;
  lessons: RailLesson[];
}

/** One row on the path rail: a lesson, a built step, or a planned step. */
export interface RailStop {
  key: string;
  href: string;
  kind: 'lesson' | 'build' | 'gap';
  /** What the row says: the lesson's short name, or "2.2 Dedup" / "3.3 BM25". */
  name: string;
  /** The full label, read by screen readers ("Build · 2.2 Dedup"). */
  srLabel: string;
  /** The lesson's own hue. Only lessons carry one. */
  hue?: string;
  current: boolean;
}

export interface RailPhase {
  id: PhaseId;
  n: number;
  title: string;
  /** Stops in the phase, the number on the right of its header. */
  count: number;
  open: boolean;
  /** The phase the current page sits in. */
  current: boolean;
  stops: RailStop[];
}

/** The slim line above the phases: where the reader is in the path. */
export interface RailProgress {
  /** "Phase 2 of 9", or "Path overview" on a page outside the path. */
  phase: string;
  lessonsDone: number;
  lessonsTotal: number;
  builds: number;
  /** Stops through the current one, over all stops, 0 to 1. */
  fraction: number;
}

export type RailView = 'path' | 'topic';

export interface LessonNavProps {
  /** Where the totals line points. */
  indexHref: string;
  totals: { lessons: number; tracks: number };
  /** The repo map, pinned above the tracks and not numbered. */
  map: { href: string; short: string };
  view: RailView;
  onView: (view: RailView) => void;
  tracks: RailTrack[];
  phases: RailPhase[];
  progress: RailProgress;
  onTogglePhase: (id: PhaseId) => void;
}

export function LessonNav({
  indexHref,
  totals,
  map,
  view,
  onView,
  tracks,
  phases,
  progress,
  onTogglePhase,
}: LessonNavProps) {
  return (
    <nav
      aria-label="Lessons"
      className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1"
    >
      {/* THE VIEW TOGGLE: one segmented control, two equal pills. The choice is
          about which order to read the same pages in, so the rest of the rail
          (totals, map, footer) does not change with it. Kept in the layout's
          state, so it survives moving between lessons. */}
      <div role="group" aria-label="Rail order" className="learn-rail-seg">
        {(
          [
            ['path', 'Path'],
            ['topic', 'By topic'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => onView(id)}
            className="learn-rail-seg-btn"
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'path' ? (
        <div className="learn-rail-progress" aria-live="polite">
          <p className="font-mono text-[0.6875rem] leading-snug text-ui-faint">
            {`${progress.phase} · ${progress.lessonsDone} of ${progress.lessonsTotal} lessons · ${progress.builds} builds`}
          </p>
          <div className="learn-rail-bar" aria-hidden>
            <span style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
        </div>
      ) : (
        <Link
          to={indexHref}
          className="block px-2.5 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase transition-colors hover:text-ui-dim"
          activeOptions={{ exact: true }}
        >
          {`${totals.lessons} lessons · ${totals.tracks} tracks`}
        </Link>
      )}

      {/* PINNED ABOVE THE TRACKS, AND SEPARATED FROM THEM. The repo map belongs
          to no track and is not numbered, so it cannot join a numbered list
          without claiming a position it does not have. It is here rather than
          only on the index because it is a reference you want to jump to
          MID-LESSON, and at that moment the rail is the only thing on screen.

          It shipped reachable only by typing the URL. See `lessons.ts`. */}
      <Link
        to={map.href}
        className="learn-rail-item mt-3 border-b border-ui-line pb-3"
        style={{ ['--rail-hue' as string]: 'var(--color-ui-accent)' }}
      >
        <span className="learn-rail-n" aria-hidden>
          ▣
        </span>
        <span className="text-[0.875rem] leading-snug text-ui-dim">{map.short}</span>
      </Link>

      {view === 'path' ? (
        <div className="mt-2">
          {phases.map((phase, pi) => (
            <section
              key={phase.id}
              aria-labelledby={`rail-${phase.id}`}
              className={pi === 0 ? '' : 'mt-1 border-t border-ui-line pt-1'}
            >
              <button
                type="button"
                id={`rail-${phase.id}`}
                aria-expanded={phase.open}
                aria-controls={`rail-list-${phase.id}`}
                onClick={() => onTogglePhase(phase.id)}
                className="learn-rail-phase"
                data-current={phase.current ? 'true' : undefined}
              >
                <span className="learn-rail-badge" aria-hidden>
                  {`P${phase.n}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.875rem] leading-snug text-ui-dim">
                  {phase.title}
                </span>
                <span className="font-mono text-[0.6875rem] text-ui-faint">{phase.count}</span>
                <span aria-hidden className={`learn-rail-chevron ${phase.open ? 'is-open' : ''}`}>
                  ▸
                </span>
              </button>
              <ol id={`rail-list-${phase.id}`} className="mb-2" hidden={!phase.open}>
                {phase.stops.map((s) => (
                  <li key={s.key}>
                    <Link
                      to={s.href}
                      className="learn-rail-stop"
                      data-kind={s.kind}
                      aria-current={s.current ? 'page' : undefined}
                      style={{ ['--rail-hue' as string]: s.hue ?? 'var(--color-ui-accent)' }}
                    >
                      <span className="learn-rail-icon" aria-hidden>
                        {s.kind === 'lesson' ? '●' : s.kind === 'build' ? '▸' : '○'}
                      </span>
                      <span className="sr-only">{`${s.srLabel}: `}</span>
                      <span className="min-w-0 truncate text-[0.875rem] leading-snug">{s.name}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        tracks.map((track, ti) => (
          <section key={track.id} className={ti === 0 ? 'mt-4' : 'mt-7'}>
            <h2 className="px-2.5 font-mono text-[0.625rem] tracking-[0.1em] text-ui-faint uppercase">
              {track.title}
            </h2>
            <ol className="mt-2 space-y-0.5">
              {track.lessons.map((l) => (
                <li key={l.href}>
                  <Link
                    to={l.href}
                    className="learn-rail-item"
                    /* `--rail-hue` rather than `--lesson`: this rail is rendered
                       by the LAYOUT route, outside the page that sets `--lesson`,
                       so it has to carry each row's own accent rather than
                       inherit one. */
                    style={{ ['--rail-hue' as string]: l.hue }}
                  >
                    <span className="learn-rail-n">{l.n}.</span>
                    <span className="text-[0.875rem] leading-snug text-ui-dim">{l.short}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      <p className="mt-6 max-w-[16rem] px-2.5 text-[0.6875rem] leading-relaxed text-ui-faint">
        Every figure either is a number this repo measured, with the command that reprints it
        underneath, or says on its face that it is not one.
      </p>
    </nav>
  );
}
