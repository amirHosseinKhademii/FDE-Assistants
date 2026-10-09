/**
 * `/learn` — the path from an empty folder to a working, measured assistant.
 * Nine phase cards in build order; each one says how much of it is built.
 */
import { Link, type LinkProps } from '@tanstack/react-router';
import { PATH, phaseCounts } from '../data/path';
import { useLearnBase } from '../context';
import { LessonLink } from '../components/LessonLink';
import { MAP, TOTALS } from '../data/lessons';

export function PathOverview() {
  const base = useLearnBase();
  return (
    <div>
      <header className="border-b border-ui-line pb-10">
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
          {PATH.length} phases · {TOTALS.lessons} lessons · in build order
        </p>
        <h1 className="mt-4 max-w-[22ch] font-mono text-3xl leading-[1.1] font-semibold tracking-tighter text-ui-fg md:text-5xl">
          From an empty folder to a working, measured assistant.
        </h1>
        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ui-dim">
          Nine phases, in the order they are built. Each one has its lessons, the build steps that
          went with them, and the steps still planned. Read them in order, or jump to a phase.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.8125rem]">
          <Link to={`${base}/topics` as LinkProps['to']} className="text-ui-dim hover:text-ui-fg">
            Browse by topic →
          </Link>
          <LessonLink slug={MAP.slug} className="text-ui-dim hover:text-ui-fg">
            The repo map →
          </LessonLink>
        </p>
      </header>

      <ol className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {PATH.map((p) => {
          const c = phaseCounts(p);
          const pct = c.lessons + c.builds + c.planned === 0 ? 0 : Math.round((c.builds / p.stops.length) * 100);
          return (
            <li key={p.id} className="min-w-0">
              <div className="lesson-card flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <span className="learn-rail-badge" aria-hidden>{`P${p.n}`}</span>
                  <h2 className="font-mono text-base leading-snug font-medium text-ui-fg">{p.title}</h2>
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ui-dim">{p.blurb}</p>
                <p className="mt-4 font-mono text-[0.6875rem] text-ui-faint">
                  {c.lessons} lessons · {c.builds} builds · {c.planned} planned
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ui-line" aria-hidden>
                  <span className="block h-full bg-ui-accent" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 font-mono text-[0.6875rem] text-ui-faint">
                  {c.builds} of {p.stops.length} stops built
                </p>
                <Link
                  to={`${base}/phase/${p.id}` as LinkProps['to']}
                  className="mt-auto pt-4 font-mono text-[0.8125rem] text-ui-accent"
                >
                  Start phase →
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
