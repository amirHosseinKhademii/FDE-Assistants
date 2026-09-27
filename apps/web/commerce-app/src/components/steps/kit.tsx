/**
 * The parts a step on `/steps` is built from.
 *
 * ── ONE SHAPE, FOURTEEN TIMES ──────────────────────────────────────────────
 *
 * Every step is the same five parts in the same order:
 *
 *   in plain words     what the step does, with no jargon left unexplained
 *   why it matters     what would go wrong without it
 *   the code           real, highlighted, and labelled with where it came from
 *   what we learned    for a finished step — every one so far corrected the
 *                      plan. For a planned step, what it WILL check, drawn
 *                      dashed, because a lesson that has not happened yet must
 *                      not look like one that has.
 *   words to know      each one a link down to the glossary
 *
 * A reader who has read one step knows where to look in the other thirteen.
 * That is the whole design argument for a fixed shape over fourteen bespoke
 * layouts, and it is why `Step` takes the parts as props rather than children.
 *
 * ── WHERE EVERY FIGURE CAME FROM ───────────────────────────────────────────
 *
 * The page is half built and half planned, and the difference between "we ran
 * this and kept the output" and "this is what we intend to write" is the one
 * thing a reader cannot recover for themselves. So every figure carries a
 * badge. The words changed in the redesign — the old ones were the plan's own
 * shorthand — but the four categories are the same:
 *
 *   measured    Real output         read off this machine, or produced by
 *                                   running the thing
 *   corrected   Real output — it    measured, AND it contradicted what the
 *               changed our plan    plan had written down
 *   cited       From the docs       it comes from a named document or spec
 *   proposed    Planned, not        this plan's design. The DEFAULT, so a
 *               built yet           figure nobody labelled reads as unbuilt
 *                                   rather than as done.
 */
import type { ReactNode } from 'react';
import { GLOSSARY, termId, type TermKey } from '../../lib/glossary';
import { NEEDS, NEXT, isDone } from '../../lib/progress';

export type Provenance = 'measured' | 'cited' | 'proposed' | 'corrected' | 'excerpt';

const BADGE: Record<Provenance, { text: string; tone: 'done' | 'next' | 'planned' | 'quiet' }> = {
  measured: { text: 'Real output', tone: 'done' },
  corrected: { text: 'Real output — it changed our plan', tone: 'next' },
  cited: { text: 'From the docs', tone: 'quiet' },
  proposed: { text: 'Planned, not built yet', tone: 'planned' },
  // Real code, shortened for the page. No line numbers on purpose: the files
  // it comes from are still being edited, and a gutter would promise that
  // "line 146" says this when next week it may not. See SURFACE.md §2.
  excerpt: { text: 'Shortened from the real code', tone: 'quiet' },
};

export type StepState = 'done' | 'next' | 'planned' | 'idea';

export function stateOf(n: string): StepState {
  if (n === '0') return 'idea';
  if (isDone(n)) return 'done';
  if (n === NEXT) return 'next';
  return 'planned';
}

const STATE_TEXT: Record<StepState, string> = {
  done: 'Done',
  next: 'Up next',
  planned: 'Planned',
  idea: 'Background',
};

export function Step({
  n,
  title,
  done,
  plain,
  why,
  code,
  learned,
  terms = [],
  hood,
}: {
  n: string;
  title: string;
  /** The date the step's ☑ landed in MCP-STEPS.md. Shown only if `DONE` agrees. */
  done?: string;
  plain: ReactNode;
  why: ReactNode;
  code?: ReactNode;
  /** What we found (a finished step) or what it will check (a planned one). */
  learned?: ReactNode;
  terms?: TermKey[];
  hood?: ReactNode;
}) {
  const state = stateOf(n);
  const needs = NEEDS[n];
  const finished = state === 'done';

  return (
    <article className="thb-step" id={`step-${n}`} data-state={state} aria-labelledby={`step-${n}-title`}>
      <header className="thb-step-head">
        <span className="thb-step-n" aria-hidden>
          {finished ? '✓' : n}
        </span>
        <h3 className="thb-step-title" id={`step-${n}-title`}>
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        <p className="thb-step-meta">
          <span className="thb-pill" data-tone={state === 'idea' ? 'quiet' : state}>
            Step {n} · {STATE_TEXT[state]}
            {finished && done ? `, ${formatDate(done)}` : ''}
          </span>
          {state !== 'idea' && (
            <span className="thb-pill" data-tone="quiet">
              {needs === 'nobody'
                ? finished
                  ? 'Built on a laptop'
                  : 'Can be built on a laptop'
                : finished
                  ? `Needed ${needs}`
                  : `Waits for ${needs}`}
            </span>
          )}
        </p>
      </header>

      <div className="thb-step-body">
        <Part label="In plain words">{typeof plain === 'string' ? <p>{plain}</p> : plain}</Part>
        <Part label="Why it matters">{typeof why === 'string' ? <p>{why}</p> : why}</Part>
        {code && (
          <Part label={finished ? 'The code, and what it printed' : state === 'idea' ? 'The picture' : 'What it will look like'}>
            <div className="grid gap-5">{code}</div>
          </Part>
        )}
        {learned && (
          <Lesson planned={!finished} title={state === 'idea' ? 'Check yourself' : undefined}>
            {learned}
          </Lesson>
        )}
        {terms.length > 0 && <Terms keys={terms} />}
        {hood}
      </div>
    </article>
  );
}

export function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="thb-part">
      <h4 className="thb-label" data-tone="quiet">
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

export function Lesson({
  planned = false,
  title,
  children,
}: {
  planned?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="thb-lesson" data-planned={planned}>
      <h4 className="thb-label" data-tone={planned ? 'quiet' : 'wire'}>
        <LightIcon />
        {title ?? (planned ? 'What this step will check' : 'What we learned')}
      </h4>
      {children}
    </aside>
  );
}

function LightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </svg>
  );
}

export function Terms({ keys }: { keys: TermKey[] }) {
  return (
    <p className="thb-terms">
      <span>Words to know:</span>
      {keys.map((k) => (
        <a key={k} href={`#${termId(k)}`} className="thb-term">
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
    <figure className="thb-fig min-w-0">
      <figcaption className="thb-fig-cap">
        <span>{sentence(caption)}</span>
        <span className="thb-pill" data-tone={badge.tone}>
          {badge.text}
        </span>
        {source && <span className="thb-fig-src">{source}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

/** Captions were written lower-case for an uppercase label; print them as sentences. */
function sentence(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function Raw({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <pre className="thb-raw" style={tone ? { borderColor: tone } : undefined}>
      {children}
    </pre>
  );
}

/** A small table: a header row, then rows of cells. Cells may hold inline code. */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="thb-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A sentence under a figure: what to notice in it. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="thb-note">{children}</p>;
}

/** Kept for the "under the hood" dialogs, which still use it for an aside. */
export function Because({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[66ch] border-l-2 border-thb-2/50 py-1 pl-4 text-[1rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}

export interface WireLine {
  dir: 'out' | 'in';
  body: string;
  mark?: string;
}

/**
 * JSON-RPC messages, drawn as themselves. Each row says in words which way it
 * went — "we sent" / "it replied" — rather than relying on an arrow, which a
 * newcomer has to decode and a screen reader reads as "right arrow".
 */
export function Wire({ lines }: { lines: WireLine[] }) {
  return (
    <div className="thb-wire-box">
      {lines.map((line, i) => (
        <div key={i} className="thb-wire" data-dir={line.dir}>
          <span className="thb-wire-dir">{line.dir === 'out' ? 'We sent' : 'It replied'}</span>
          <span className="thb-wire-body">{highlight(line.body, line.mark)}</span>
        </div>
      ))}
    </div>
  );
}

function highlight(body: string, mark?: string): ReactNode {
  if (!mark) return body;
  const at = body.indexOf(mark);
  if (at < 0) return body;
  return (
    <>
      {body.slice(0, at)}
      <mark>{mark}</mark>
      {body.slice(at + mark.length)}
    </>
  );
}
