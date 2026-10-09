/**
 * One built step, drawn with the canonical how-it-works kit.
 *
 * THIS IS THE ADAPTER from a wrap `StepDef` to the kit's `Step`. It is written
 * so that wrap's own /steps page can use it later: the kit takes parts as props,
 * and this file is the only place that maps the wrap data onto them.
 */
import type { StepDef } from '../data/wrap-steps';
import { Figure, Hood, HoodSection, HoodText, Raw, Step, StepProgressProvider } from '../steps';
import type { StepState } from '../steps';
import { Code } from '@veresk/surface';

export function BuildStep({ step }: { step: StepDef }) {
  const state = step.status as StepState;
  const code = step.code;
  const hood = step.hood;
  const hoodBlurb = hood ? hood.title.replace(/^Under the hood:\s*/i, '') : '';

  return (
    <StepProgressProvider value={{ stateOf: () => state }}>
      <Step
        n={step.n}
        title={step.title}
        done={step.done}
        plain={step.plain}
        why={step.why ?? ''}
        learned={step.learned}
        terms={step.terms}
        code={
          code ? (
            <Figure caption={code.caption} from={code.from} source={code.source}>
              <Code path={code.path} lang={code.lang} lines={code.code.split('\n')} />
              {code.printed && <Raw>{code.printed}</Raw>}
            </Figure>
          ) : undefined
        }
        hood={
          hood ? (
            <Hood blurb={hoodBlurb} title={hood.title} sub={`Step ${step.n} · ${step.title}`}>
              <HoodSection title="The code">
                <Code path={code?.path ?? 'source'} lang={code?.lang ?? 'typescript'} lines={hood.code.split('\n')} />
              </HoodSection>
              <HoodSection title="What it printed">
                <HoodText>Captured from the run, unedited.</HoodText>
                <Raw>{hood.printed}</Raw>
              </HoodSection>
            </Hood>
          ) : undefined
        }
      />
    </StepProgressProvider>
  );
}
