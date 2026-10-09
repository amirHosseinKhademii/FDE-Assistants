/**
 * `/steps` — How it works. Ported from commerce-app's Steps page, with the
 * commerce content removed. Everything on the page is derived from
 * lib/steps.ts, so a content change never touches this file.
 */
import { useCallback, useState } from 'react';
import { Aurora } from '@veresk/surface';
import { Step } from '../components/steps/kit';
import { PhaseHead, PhaseTabs } from '../components/steps/Tabs';
import type { PhaseTab } from '../components/steps/Tabs';
import { AURORA } from '../lib/aurora';
import { GLOSSARY, GLOSSARY_ORDER, termId } from '../lib/glossary';
import { PHASES } from '../lib/steps';
import type { PhaseDef, StepDef } from '../lib/steps';

const ALL_STEPS: StepDef[] = PHASES.flatMap((p) => p.steps);
const TOTAL = ALL_STEPS.length;
const DONE = ALL_STEPS.filter((s) => s.status === 'done').length;
const PHASE_OF = new Map(PHASES.flatMap((p) => p.steps.map((s) => [s.n, p.id] as const)));

export function Steps() {
  const [active, setActive] = useState(PHASES[0].id);
  const goToStep = useGoToStep(setActive);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} muted />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <Hero />
        <Roadmap onGo={goToStep} />
        <section className="mt-20" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The steps
          </h2>
          <p className="mt-2 mb-6 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Grouped into phases. Each step is laid out the same way: what it does in
            plain words, why it matters, the code, and what we learned doing it.
          </p>
          <PhaseTabs tabs={buildTabs()} active={active} onActivate={setActive} />
        </section>
        <Glossary />
      </main>
    </div>
  );
}

/**
 * Open the phase a step lives in, then scroll to the step.
 *
 * Only the active panel is rendered, so the step does not exist at the moment
 * the tab changes. Waiting one frame lets React commit the new panel first.
 */
function useGoToStep(setActive: (id: string) => void) {
  return useCallback(
    (step: string) => {
      const phase = PHASE_OF.get(step);
      if (!phase) return;
      setActive(phase);
      requestAnimationFrame(() => {
        document.getElementById(`step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [setActive],
  );
}

function Hero() {
  return (
    <section className="pt-8 pb-4 md:pt-14">
      <h1 className="text-[2.25rem] leading-[1.1] font-bold tracking-tight text-ui-fg md:text-[3rem]">How it works</h1>
      <p className="mt-4 max-w-[64ch] text-[1.125rem] leading-relaxed text-ui-dim">
        Each step is built and checked before the next one starts. Every step is
        laid out the same way, so you know where to look in each.
      </p>
      <div className="wrap-progress mt-6" role="img" aria-label={`${DONE} of ${TOTAL} steps done`}>
        {ALL_STEPS.map((s) => (
          <span key={s.n} data-done={s.status === 'done'} title={`Step ${s.n}: ${s.title}`} />
        ))}
      </div>
      <p className="mt-2 text-[0.875rem] text-ui-faint">
        {DONE} of {TOTAL} steps done.
      </p>
    </section>
  );
}

function Roadmap({ onGo }: { onGo: (step: string) => void }) {
  return (
    <section className="mt-20" aria-labelledby="road-title">
      <h2 id="road-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
        The roadmap
      </h2>
      <div className="wrap-road mt-8">
        {PHASES.map((p) => (
          <div key={p.id} className="wrap-road-phase">
            <p className="wrap-label" data-tone={p.steps.some((s) => s.status === 'done') ? undefined : 'quiet'}>
              {p.label} <span className="font-normal text-ui-faint">· {p.status.toLowerCase()}</span>
            </p>
            {p.steps.map((s) => (
              <button key={s.n} type="button" className="wrap-road-step" onClick={() => onGo(s.n)}>
                <span className="wrap-dot" data-state={s.status} aria-hidden>
                  {s.status === 'done' ? '✓' : s.n}
                </span>
                <span>
                  <span className="sr-only">
                    Step {s.n}, {s.status === 'done' ? 'done' : s.status === 'next' ? 'up next' : 'planned'}:{' '}
                  </span>
                  {s.title}
                  {s.status === 'next' && <span className="ml-2 text-[0.8125rem] font-semibold text-wrap-2">up next</span>}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function buildTabs(): PhaseTab[] {
  return PHASES.map((p) => {
    const done = p.steps.filter((s) => s.status === 'done').length;
    return {
      id: p.id,
      label: p.label,
      holds: p.steps.map((s) => s.n),
      status: p.status,
      built: done > 0,
      done,
      total: p.steps.length || 1,
      content: <PhaseBody phase={p} />,
    };
  });
}

function PhaseBody({ phase }: { phase: PhaseDef }) {
  return (
    <div className="grid gap-6">
      <PhaseHead
        title={phase.label}
        status={phase.status}
        what={<p>{phase.what}</p>}
        waits={phase.waits}
      />
      {phase.steps.map((s) => (
        <Step key={s.n} step={s} />
      ))}
    </div>
  );
}

function Glossary() {
  return (
    <section className="mt-20" aria-labelledby="gloss-title">
      <h2 id="gloss-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
        Words used on this page
      </h2>
      <p className="mt-2 mb-6 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ui-dim">
        What each term means in general, and what it means in this build.
      </p>
      <dl className="wrap-gloss">
        {GLOSSARY_ORDER.map((key) => {
          const t = GLOSSARY[key];
          return (
            <div key={key} id={termId(key)}>
              <dt>{t.word}</dt>
              <dd>{t.is}</dd>
              {'here' in t && t.here && <dd>Here: {t.here}</dd>}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
