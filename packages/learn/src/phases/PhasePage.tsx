/**
 * `/learn/phase/pN` — one phase of the path, every stop in build order.
 *
 * A BUILD STOP IS THE FULL HOW-IT-WORKS STEP, drawn with the canonical kit. A
 * GAP IS A PLANNED CARD and carries no invented code. A LESSON IS A CARD that
 * opens its page. Every stop has an anchor (`step-X.Y` or `lesson-<slug>`), so
 * a link from the rail or the overview lands on the stop itself.
 */
import { Link, type LinkProps } from '@tanstack/react-router';
import { PATH, phaseCounts, type PathPhase, type Stop, type PhaseId } from '../data/path';
import { lessonBySlug, type LessonSlug } from '../data/lessons';
import { PHASES as WRAP_PHASES, type StepDef } from '../data/wrap-steps';
import { GLOSSARY, termId, type TermKey } from '../data/wrap-glossary';
import { GlossaryProvider } from '../steps';
import { useLearnBase } from '../context';
import { LessonLink } from '../components/LessonLink';
import { hueOf } from '../data/lessons';
import { BuildStep } from './BuildStep';

export function wrapStep(n: string): StepDef | undefined {
  for (const p of WRAP_PHASES) {
    const found = p.steps.find((s) => s.n === n);
    if (found) return found;
  }
  return undefined;
}

const anchorOf = (s: Stop) => (s.kind === 'lesson' ? `lesson-${s.slug}` : `step-${s.step}`);

export function PhasePage({ id }: { id: string }) {
  const base = useLearnBase();
  const idx = PATH.findIndex((p) => p.id === id);
  if (idx < 0) {
    return (
      <div className="py-16">
        <p className="font-mono text-sm text-ui-faint uppercase tracking-[0.08em]">Not a phase</p>
        <h1 className="mt-4 font-mono text-3xl text-ui-fg">There is no phase “{id}”.</h1>
        <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
          The path has nine phases, p0 to p8.{' '}
          <Link to={base as LinkProps['to']} className="text-ui-accent">
            Back to the path
          </Link>
          .
        </p>
      </div>
    );
  }
  const phase: PathPhase = PATH[idx];
  const counts = phaseCounts(phase);
  const prev = PATH[idx - 1];
  const next = PATH[idx + 1];

  // Words used by this phase's builds, defined once at the foot of the page so
  // the kit's "Words to know" links land on something.
  const terms = Array.from(
    new Set(
      phase.stops.flatMap((s) => {
        if (s.kind !== 'build') return [];
        return wrapStep(s.step)?.terms ?? [];
      }),
    ),
  ) as TermKey[];

  return (
    <GlossaryProvider value={{ entries: GLOSSARY, idOf: (key: string) => termId(key as TermKey) }}>
      <article className="min-w-0">
        <header className="border-b border-ui-line pb-8">
          <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">Phase {phase.n}</p>
          <h1 className="mt-3 font-mono text-3xl leading-[1.1] font-semibold tracking-tighter text-ui-fg md:text-4xl">
            {phase.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-ui-dim">{phase.blurb}</p>

          <p className="mt-5 font-mono text-[0.75rem] text-ui-faint">
            {counts.lessons} lessons · {counts.builds} builds · {counts.planned} planned
          </p>

          <ol className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[0.75rem]">
            {phase.stops.map((s) => (
              <li key={anchorOf(s)}>
                <a href={`#${anchorOf(s)}`} className="text-ui-dim underline-offset-4 hover:text-ui-fg hover:underline">
                  {s.kind === 'lesson' ? lessonBySlug(s.slug).short : s.step}
                </a>
              </li>
            ))}
          </ol>
        </header>

        <div className="mt-8 grid gap-6">
          {phase.stops.map((s) => (
            <div key={anchorOf(s)} id={anchorOf(s)} className="phase-stop">
              {s.kind === 'lesson' && <LessonCard slug={s.slug} />}
              {s.kind === 'build' && <BuildCard step={s.step} />}
              {s.kind === 'gap' && (
                <section className="rounded-2xl border border-dashed border-ui-line px-5 py-5 text-ui-dim">
                  <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
                    Step {s.step} · Planned
                  </p>
                  <h2 className="mt-2 font-mono text-base text-ui-fg">{s.title}</h2>
                  <p className="mt-2 leading-relaxed">
                    Not built yet — this is where the wrap plan builds it; the lesson above explains the idea.
                  </p>
                </section>
              )}
            </div>
          ))}
        </div>

        {terms.length > 0 && (
          <section className="mt-12 border-t border-ui-line pt-8">
            <h2 className="font-mono text-sm tracking-[0.08em] text-ui-faint uppercase">Words used in this phase</h2>
            <dl className="mt-5 grid gap-4">
              {terms.map((k) => (
                <div key={k} id={termId(k)} className="scroll-mt-24">
                  <dt className="font-mono text-sm text-ui-fg">{GLOSSARY[k].word}</dt>
                  <dd className="mt-1 max-w-[62ch] leading-relaxed text-ui-dim">
                    {GLOSSARY[k].is}
                    {'here' in GLOSSARY[k] && GLOSSARY[k].here ? ` Here: ${GLOSSARY[k].here}` : ''}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <nav className="mt-12 grid gap-4 border-t border-ui-line pt-8 sm:grid-cols-2" aria-label="Phases">
          {prev ? <PhaseStep id={prev.id} n={prev.n} title={prev.title} base={base} dir="prev" /> : <span />}
          {next ? <PhaseStep id={next.id} n={next.n} title={next.title} base={base} dir="next" /> : <span />}
        </nav>
      </article>
    </GlossaryProvider>
  );
}

function LessonCard({ slug }: { slug: LessonSlug }) {
  const l = lessonBySlug(slug);
  const hue = hueOf(l);
  return (
    <LessonLink
      slug={l.slug}
      className="lesson-card relative block pl-6 group"
      style={{ ['--lesson' as string]: hue }}
    >
      <span aria-hidden className="absolute top-4 bottom-4 left-2 w-1 rounded-full" style={{ background: hue }} />
      <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
        Lesson · ≈ {l.minutes} min
      </span>
      <span className="mt-2 block font-mono text-base font-medium text-ui-fg">{l.title}</span>
      <span className="mt-2 block max-w-[62ch] text-[0.9375rem] leading-relaxed text-ui-dim">{l.lede}</span>
      <span className="mt-3 block font-mono text-[0.8125rem] text-ui-accent">Open lesson →</span>
    </LessonLink>
  );
}

function BuildCard({ step }: { step: string }) {
  const s = wrapStep(step);
  if (!s) return null;
  return <BuildStep step={s} />;
}

function PhaseStep({
  id,
  n,
  title,
  base,
  dir,
}: {
  id: PhaseId;
  n: number;
  title: string;
  base: string;
  dir: 'prev' | 'next';
}) {
  return (
    <Link
      to={`${base}/phase/${id}` as LinkProps['to']}
      className={`lesson-card block ${dir === 'next' ? 'sm:text-right' : ''}`}
    >
      <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
        {dir === 'prev' ? '← Previous phase' : 'Next phase →'}
      </span>
      <span className="mt-2 block font-mono text-base text-ui-fg">
        Phase {n} · {title}
      </span>
    </Link>
  );
}
