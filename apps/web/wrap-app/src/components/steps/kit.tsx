/**
 * The parts a step on `/steps` is built from. Ported from commerce-app's kit.
 *
 * ── ONE SHAPE FOR EVERY STEP ───────────────────────────────────────────────
 *
 * Every step is the same five parts in the same order:
 *
 *   in plain words     what the step does, with no jargon left unexplained
 *   why it matters     what would go wrong without it
 *   the code           real code, and what it printed when it ran
 *   what we learned    for a finished step. For a planned one, what it WILL
 *                      check, drawn dashed so it does not look finished
 *   words to know      each one a link down to the glossary
 *
 * The step is data (lib/steps.ts), so `Step` takes that object, not children.
 */
import type { ReactNode } from 'react';
import { Code } from '@veresk/surface';
import { GLOSSARY, termId } from '../../lib/glossary';
import type { Provenance, StepCode, StepDef } from '../../lib/steps';
import { Hood, HoodSection } from './Hood';

const BADGE: Record<Provenance, { text: string; tone: 'done' | 'next' | 'planned' | 'quiet' }> = {
  measured: { text: 'Real output', tone: 'done' },
  corrected: { text: 'Real output, and it changed our plan', tone: 'next' },
  cited: { text: 'From the docs', tone: 'quiet' },
  proposed: { text: 'Planned, not built yet', tone: 'planned' },
  // No line numbers on purpose: the files are still being edited.
  excerpt: { text: 'Shortened from the real code', tone: 'quiet' },
};

const STATE_TEXT = { done: 'Done', next: 'Up next', planned: 'Planned' } as const;

export function Step({ step }: { step: StepDef }) {
  const { n, title, status, done, plain, why, code, learned, terms = [], hood } = step;
  const finished = status === 'done';

  return (
    <article className="wrap-step" id={`step-${n}`} data-state={status} aria-labelledby={`step-${n}-title`}>
      <header className="wrap-step-head">
        <span className="wrap-step-n" aria-hidden>
          {finished ? '✓' : n}
        </span>
        <h3 className="wrap-step-title" id={`step-${n}-title`}>
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        <p className="wrap-step-meta">
          <span className="wrap-pill" data-tone={status}>
            Step {n} · {STATE_TEXT[status]}
            {finished && done ? `, ${formatDate(done)}` : ''}
          </span>
        </p>
      </header>

      <div className="wrap-step-body">
        <Part label="In plain words">
          <p>{plain}</p>
        </Part>
        {why && (
          <Part label="Why it matters">
            <p>{why}</p>
          </Part>
        )}
        {code && (
          <Part label={finished ? 'The code, and what it printed' : 'What it will look like'}>
            <CodeFigure code={code} />
          </Part>
        )}
        {learned && (
          <Lesson planned={!finished}>
            <p>{learned}</p>
          </Lesson>
        )}
        {terms.length > 0 && <Terms keys={terms} />}
        {hood && (
          <Hood blurb="The code, and what it printed" title={hood.title} sub={`Step ${n}`}>
            <HoodSection title="The code">
              <Code path={hood.title} lang="typescript" lines={hood.code.split('\n')} />
            </HoodSection>
            <HoodSection title="What it printed">
              <Raw>{hood.printed}</Raw>
            </HoodSection>
          </Hood>
        )}
      </div>
    </article>
  );
}

function CodeFigure({ code }: { code: StepCode }) {
  return (
    <Figure caption={code.caption} from={code.from} source={code.source}>
      <Code path={code.path} lang={code.lang} lines={code.code.split('\n')} />
      {code.printed && <Raw>{code.printed}</Raw>}
    </Figure>
  );
}

export function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="wrap-part">
      <h4 className="wrap-label" data-tone="quiet">
        {label}
      </h4>
      {children}
    </section>
  );
}

/** "2026-09-18" → "18 Sep 2026". Fixed format so the server and the browser agree. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${d} ${month} ${y}`;
}

export function Lesson({ planned = false, children }: { planned?: boolean; children: ReactNode }) {
  return (
    <aside className="wrap-lesson" data-planned={planned}>
      <h4 className="wrap-label" data-tone={planned ? 'quiet' : 'wire'}>
        {planned ? 'What this step will check' : 'What we learned'}
      </h4>
      {children}
    </aside>
  );
}

export function Terms({ keys }: { keys: (keyof typeof GLOSSARY)[] }) {
  return (
    <p className="wrap-terms">
      <span>Words to know:</span>
      {keys.map((k) => (
        <a key={k} href={`#${termId(k)}`} className="wrap-term">
          {GLOSSARY[k].word}
        </a>
      ))}
    </p>
  );
}

export function Figure({
  caption,
  from = 'proposed',
  source,
  children,
}: {
  caption: string;
  from?: Provenance;
  source?: string;
  children: ReactNode;
}) {
  const badge = BADGE[from];
  return (
    <figure className="wrap-fig min-w-0">
      <figcaption className="wrap-fig-cap">
        <span>{sentence(caption)}</span>
        <span className="wrap-pill" data-tone={badge.tone}>
          {badge.text}
        </span>
        {source && <span className="wrap-fig-src">{source}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

/** Captions are written lower-case; print them as sentences. */
function sentence(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function Raw({ children }: { children: ReactNode }) {
  return <pre className="wrap-raw">{children}</pre>;
}
