/**
 * The how-it-works kit: the parts a step is built from, and the figures a step
 * shows its numbers in. One shape for every step, so a reader who has done one
 * knows where to look in the next.
 *
 * THE FIVE PARTS, in the same order every time:
 *
 *   in plain words     what the step does, with no jargon left unexplained
 *   why it matters     what would go wrong without it
 *   the code           real, highlighted, labelled with where it came from
 *   what we learned    what running it taught us
 *   words to know      each one a link down to the glossary
 *
 * `Step` takes the parts as props rather than children, which is what makes the
 * shape fixed. A host that keeps a glossary mounts `GlossaryProvider` once, above
 * its steps; without one, a word links to an anchor named after its key.
 *
 * ── WHERE EVERY FIGURE CAME FROM ───────────────────────────────────────────
 *
 * The badge is not decoration. The difference between "we ran this and kept the
 * output" and "this is somebody else's number, quoted as the bar" is the one
 * thing a reader cannot recover for themselves. The default is `measured`, so a
 * figure nobody labelled is a claim that it was run: label anything that was not.
 *
 *   measured    Real output          read out of a data file, or produced
 *                                    by running the thing. THE DEFAULT, so a
 *                                    figure nobody labelled is a claim that it
 *                                    was run — label anything that was not.
 *   worked      Worked by hand       carried through by a person in the source
 *                                    document; arithmetic anybody can check.
 *   target      Not ours — the bar   somebody else's measurement, quoted as the
 *                                    thing to clear. THE DANGEROUS ONE: a bar quoted from
 *                                    another project reads as this one's
 *                                    result unless it says otherwise.
 *   pending     No number yet        a definition or a shape with no result in it.
 *   excerpt     Shortened from the   real code, cut down for the page. No line
 *               real code            numbers: a gutter promises the file says
 *                                    this at that line, and the files move.
 *   cited       From the docs        stated in a named document or spec.
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/** The three states a step can be in when it is read: all of them are "built". */
export type When = 'once, offline' | 'every question' | 'on demand';

/** A glossary entry, as far as the kit needs it: the word to show. */
export interface GlossaryEntry {
  word: string;
}

export interface GlossaryValue {
  /** Entries by key, as a `Step`'s `terms` names them. */
  entries: Record<string, GlossaryEntry>;
  /** The anchor a term links to. */
  idOf: (key: string) => string;
}

const GlossaryContext = createContext<GlossaryValue>({
  entries: {},
  idOf: (key) => `term-${key}`,
});

/** Mount once, above the steps: `<GlossaryProvider value={{ entries, idOf }}>`. */
export const GlossaryProvider = GlossaryContext.Provider;

export function useGlossary(): GlossaryValue {
  return useContext(GlossaryContext);
}

export type Provenance = 'measured' | 'worked' | 'target' | 'pending' | 'excerpt' | 'cited';

const BADGE: Record<Provenance, { text: string; tone: 'done' | 'learn' | 'pending' | 'quiet' }> = {
  measured: { text: 'Real output', tone: 'done' },
  worked: { text: 'Worked by hand', tone: 'learn' },
  target: { text: 'Not ours — the bar to clear', tone: 'quiet' },
  pending: { text: 'No number yet', tone: 'pending' },
  excerpt: { text: 'Shortened from the real code', tone: 'quiet' },
  cited: { text: 'From the docs', tone: 'quiet' },
};

const WHEN_TEXT: Record<When, string> = {
  'once, offline': 'Runs once, offline',
  'every question': 'Runs on every question',
  'on demand': 'Run on demand',
};

export function Step({
  n,
  title,
  when,
  plain,
  why,
  code,
  codeLabel = 'The code, and what it printed',
  learned,
  learnedTitle = 'What we learned',
  terms = [],
  hood,
}: {
  n: string;
  title: string;
  /** Offline and once, on every question, or when somebody runs it. */
  when?: When;
  plain: ReactNode;
  why: ReactNode;
  code?: ReactNode;
  /** What the figures are, when they are not code — "What we counted". */
  codeLabel?: string;
  learned?: ReactNode;
  learnedTitle?: string;
  terms?: string[];
  /** An "under the hood" press — see `Hood.tsx`. */
  hood?: ReactNode;
}) {
  return (
    <article className="cal-step" id={`step-${n}`} aria-labelledby={`step-${n}-title`}>
      <header className="cal-step-head">
        <span className="cal-step-n" aria-hidden>
          {n}
        </span>
        <h3 className="cal-step-title" id={`step-${n}-title`}>
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        <p className="cal-step-meta">
          <span className="cal-pill" data-tone="done">
            Step {n} · Built
          </span>
          {when && <span className="cal-pill">{WHEN_TEXT[when]}</span>}
        </p>
      </header>

      <div className="cal-step-body">
        <Part label="In plain words">{typeof plain === 'string' ? <p>{plain}</p> : plain}</Part>
        <Part label="Why it matters">{typeof why === 'string' ? <p>{why}</p> : why}</Part>
        {code && (
          <Part label={codeLabel}>
            <div className="grid gap-6">{code}</div>
          </Part>
        )}
        {learned && <Lesson title={learnedTitle}>{learned}</Lesson>}
        {terms.length > 0 && <Terms keys={terms} />}
        {hood}
      </div>
    </article>
  );
}

export function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="cal-part">
      <h4 className="cal-label" data-tone="quiet">
        {label}
      </h4>
      {children}
    </section>
  );
}

export function Lesson({ title = 'What we learned', children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="cal-lesson">
      <h4 className="cal-label" data-tone="learn">
        <LightIcon />
        {title}
      </h4>
      {typeof children === 'string' ? <p>{children}</p> : children}
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

export function Terms({ keys }: { keys: string[] }) {
  const { entries, idOf } = useGlossary();
  return (
    <p className="cal-terms">
      <span>Words to know:</span>
      {keys.map((k) => (
        <a key={k} href={`#${idOf(k)}`} className="cal-term">
          {entries[k]?.word ?? k}
        </a>
      ))}
    </p>
  );
}

/**
 * A figure, and where its numbers came from.
 *
 * The default is `measured`, so a figure with no `from` says it was run.
 */
export function Figure({
  caption,
  from = 'measured',
  source,
  children,
}: {
  caption: string;
  from?: Provenance;
  /** The command or the document that produced it. */
  source?: string;
  children: ReactNode;
}) {
  const badge = BADGE[from];
  return (
    <figure className="cal-fig min-w-0">
      <figcaption className="cal-fig-cap">
        <span>{sentence(caption)}</span>
        <span className="cal-pill" data-tone={badge.tone === 'quiet' ? undefined : badge.tone}>
          {badge.text}
        </span>
        {source && <span className="cal-fig-src">{source}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

/** Captions were written lower-case for an uppercase label; print them as sentences. */
function sentence(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * A block of literal text with no file behind it — an arrow diagram, a
 * hand-worked sum, a shape drawn in characters.
 *
 * Anything quoting a real file gets `Code` / `Data` from `@veresk/surface`
 * instead: VS Code's own grammars, and a header naming the file. Giving a
 * diagram a path would be inventing provenance.
 *
 * IT SCROLLS SIDEWAYS RATHER THAN WRAPPING: these mean something by their
 * layout, and re-flowing them to fit a column destroys the thing being shown.
 */
export function Raw({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <pre className="cal-raw" style={tone ? { borderColor: tone } : undefined}>
      {children}
    </pre>
  );
}

/** A small table: a header row, then rows of cells. Cells may hold inline code. */
export function Table({
  head,
  rows,
  numeric = [],
  lit,
}: {
  head: string[];
  rows: ReactNode[][];
  /** Column indexes to set right-aligned in the mono face. */
  numeric?: number[];
  /** Row indexes to pick out — the one the figure is about. */
  lit?: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="cal-table">
        <thead>
          <tr>
            {head.map((h, j) => (
              <th key={`${h}-${j}`} scope="col" style={numeric.includes(j) ? { textAlign: 'right' } : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} data-lit={lit?.includes(i) || undefined}>
              {row.map((cell, j) => (
                <td key={j} data-num={numeric.includes(j) || undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A few big numbers side by side, each saying what it counts. */
export function Numbers({ items }: { items: { value: string; label: ReactNode }[] }) {
  return (
    <div className="cal-numbers">
      {items.map((item, i) => (
        <div key={i}>
          <p className="cal-number-v">{item.value}</p>
          <p className="cal-number-l">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

/** A sentence under a figure: what to notice in it. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="cal-fignote">{children}</p>;
}

/**
 * Two states of the same thing, side by side.
 *
 * ONE COLUMN ON A PHONE, and in that order — before above after — because a
 * reader who scrolls past the "after" first has learnt nothing.
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel = 'before',
  afterLabel = 'after',
}: {
  before: ReactNode;
  after: ReactNode;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="cal-label pb-2" data-tone="quiet">
          {sentence(beforeLabel)}
        </p>
        {before}
      </div>
      <div className="min-w-0">
        <p className="cal-label pb-2">{sentence(afterLabel)}</p>
        {after}
      </div>
    </div>
  );
}

/**
 * The reason behind a decision, set apart from the description of it.
 *
 * Everything else says what happens; this says why it was chosen over the
 * obvious alternative. Kept with the same props through the redesign because
 * the step files and several "under the hood" panels use it.
 */
export function Because({ children }: { children: ReactNode }) {
  return <p className="cal-because">{children}</p>;
}
