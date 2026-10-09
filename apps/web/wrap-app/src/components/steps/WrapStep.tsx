/**
 * The adapter between wrap's step data (`lib/steps.ts`) and the canonical
 * how-it-works kit (`@veresk/learn/steps`).
 *
 * The data is not changed here. This file only maps a `StepDef` onto the kit's
 * props, so the five parts, the figures, the "under the hood" press and the
 * stage tabs are the same ones commerce and safety render, and a content change
 * still never touches the page.
 *
 * Wrap's own look (paper, ink, marker, cobalt) comes from `styles/app.css`,
 * which sets the kit's variables. Nothing about the look lives in this file.
 */
import { Code } from '@veresk/surface';
import { Figure, Hood, HoodSection, PhaseHead, Raw, Step } from '@veresk/learn/steps';
import type { PhaseTab, StepProgressValue, StepState } from '@veresk/learn/steps';
import { GLOSSARY, termId } from '../../lib/glossary';
import type { TermKey } from '../../lib/glossary';
import type { PhaseDef, StepDef } from '../../lib/steps';

/** The glossary the kit's "words to know" link into. Anchors match the page's own glossary. */
export const GLOSSARY_VALUE = {
  entries: GLOSSARY,
  idOf: (key: string) => termId(key as TermKey),
};

/**
 * Each step's state, read from its `status` in the data. `planned` is the
 * default for anything not in the list, so an unknown step never reads as done.
 */
export function progressValue(steps: StepDef[]): StepProgressValue {
  const states = new Map(steps.map((s) => [s.n, s.status as StepState] as const));
  return { stateOf: (n: string) => states.get(n) ?? 'planned' };
}

/** One step, in the kit's five parts. */
export function WrapStep({ step }: { step: StepDef }) {
  const { n, title, plain, why, code, learned, terms, done, hood } = step;
  return (
    <Step
      n={n}
      title={title}
      plain={plain}
      why={why ?? ''}
      done={done}
      learned={learned}
      terms={terms}
      code={
        code && (
          <Figure caption={code.caption} from={code.from} source={code.source}>
            <Code path={code.path} lang={code.lang} lines={code.code.split('\n')} />
            {code.printed && <Raw>{code.printed}</Raw>}
          </Figure>
        )
      }
      hood={
        hood && (
          <Hood blurb="The code, and what it printed" title={hood.title} sub={`Step ${n}`}>
            <HoodSection title="The code">
              <Code path={hood.title} lang="typescript" lines={hood.code.split('\n')} />
            </HoodSection>
            <HoodSection title="What it printed">
              <Raw>{hood.printed}</Raw>
            </HoodSection>
          </Hood>
        )
      }
    />
  );
}

/** A phase's body: its heading and what it waits for, then its steps. */
function PhaseBody({ phase }: { phase: PhaseDef }) {
  return (
    <div className="grid gap-6">
      <PhaseHead title={phase.label} status={phase.status} waits={phase.waits} what={<p>{phase.what}</p>} />
      {phase.steps.map((s) => (
        <WrapStep key={s.n} step={s} />
      ))}
    </div>
  );
}

/** The phases as the kit's tabs: a meter of built steps over the whole phase. */
export function phaseTabs(phases: PhaseDef[]): PhaseTab[] {
  return phases.map((p) => {
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
