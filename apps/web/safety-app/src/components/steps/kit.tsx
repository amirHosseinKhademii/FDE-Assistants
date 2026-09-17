/**
 * The small set of parts the seven stages are drawn with.
 *
 * ── WHY THIS IS NOT THE `/learn` KIT ───────────────────────────────────────
 *
 * `veresk-app` has a 2,352-line lesson kit — steps, glossary terms, run-it
 * blocks, nine chart types. Four of its twelve exports would be used here, it
 * lives on a different deployment, and lifting it into `@veresk/surface` to
 * share four of them is a refactor of somebody else's active work for no gain.
 * So this is the hundred lines this page needs and nothing else.
 *
 * ── WHAT IS BORROWED IS THE DISCIPLINE, NOT THE CODE ───────────────────────
 *
 * `/learn` badges every figure with where its numbers came from: measured here,
 * measured elsewhere, a drawing, or a proposal. That distinction is the only
 * thing on a page like this that a reader cannot recover for themselves, and it
 * is the one this page most needs — NOTHING HAS BEEN INGESTED. Stage 3.1 has
 * not run. So every figure is one of four things and each says which:
 *
 *   measured    read out of the NHTSA files, or produced by running the thing
 *               being described. The default, and most of the page.
 *   worked      an example carried through by hand in `docs/safety/INGESTION.md`
 *               — real inputs, arithmetic anybody can check, not a pipeline run.
 *   target      somebody else's measurement, quoted as the bar to clear. The
 *               dangerous one: 0.813 is Vantis Steering's recall@6 and would
 *               read as Calder's unless it is labelled.
 *   pending     a definition or a shape with no number in it yet, because the
 *               thing that would produce one has not been run. A figure with
 *               nothing in it is the easiest kind to mistake for a result.
 */
import type { ReactNode } from 'react';

const BADGE: Record<Provenance, { text: string; tone: string }> = {
  measured: { text: 'measured', tone: 'text-cal-1 border-cal-1/40' },
  worked: { text: 'worked by hand', tone: 'text-cal-2 border-cal-2/40' },
  target: { text: 'not ours — the bar', tone: 'text-ui-faint border-ui-line' },
  pending: { text: 'no number yet', tone: 'text-ui-faint border-ui-line border-dashed' },
};

export type Provenance = 'measured' | 'worked' | 'target' | 'pending';

/**
 * One of the seven.
 *
 * THE NUMBER AND THE VERB ARE THE HEADING, because `3.6 · FUSE` is how the
 * source document refers to it and how the next person will search for it. The
 * one-line `plain` under it is the version for somebody who will not read the
 * rest of the stage, and it is written first on purpose.
 */
export function Stage({
  n,
  verb,
  plain,
  when,
  children,
}: {
  n: string;
  verb: string;
  plain: string;
  /** Offline and once, or every time somebody asks. */
  when: 'once, offline' | 'every question';
  children: ReactNode;
}) {
  const query = when === 'every question';
  return (
    <section className="stage lift-in scroll-mt-8" id={`stage-${n}`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
          style={{ color: query ? 'var(--color-cal-2)' : 'var(--color-cal-1)' }}
        >
          {n}
        </span>
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          {verb}
        </h2>
        <span className="ml-auto font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          {when}
        </span>
      </header>

      <p className="mt-3 max-w-[64ch] leading-relaxed text-ui-dim">{plain}</p>

      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}

/**
 * A figure, and where its numbers came from.
 *
 * THE BADGE IS NOT DECORATION. On a page describing a pipeline that has not
 * been built, the difference between "we counted this" and "this is the number
 * we are aiming at" is the entire difference between a record and a plan.
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
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2.5">
        <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
          {caption}
        </span>
        <span
          className={`rounded-full border px-2 py-px font-mono text-[0.5625rem] tracking-[0.06em] uppercase ${badge.tone}`}
        >
          {badge.text}
        </span>
        {source && <span className="font-mono text-[0.625rem] text-ui-faint">{source}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

/**
 * A block of literal text, as it is on the wire or on disk.
 *
 * IT SCROLLS SIDEWAYS RATHER THAN WRAPPING. A tab-separated line and a
 * `CREATE TABLE` both mean something by their layout; re-flowing them to fit a
 * column destroys the thing the reader is being shown.
 */
export function Raw({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <pre
      className="overflow-x-auto rounded-lg border border-ui-line bg-ui-surface p-3.5 font-mono text-[0.6875rem] leading-relaxed text-ui-dim"
      style={tone ? { borderColor: tone } : undefined}
    >
      {children}
    </pre>
  );
}

/**
 * Two states of the same thing, side by side.
 *
 * ONE COLUMN ON A PHONE, and in that order — before above after — because the
 * arrow between them is horizontal on a wide screen and vertical on a narrow
 * one, and a reader who scrolls past the "after" first has learnt nothing.
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
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="pb-2 font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
          {beforeLabel}
        </p>
        {before}
      </div>
      <div className="min-w-0">
        <p className="pb-2 font-mono text-[0.625rem] tracking-[0.08em] uppercase" style={{ color: 'var(--color-cal-1)' }}>
          {afterLabel}
        </p>
        {after}
      </div>
    </div>
  );
}

/**
 * The reason behind a decision, set apart from the description of it.
 *
 * WHY IT IS A DIFFERENT SHAPE. Everything else on this page says what happens.
 * This says why it was chosen over the obvious alternative, which is the part a
 * reader is being asked to agree or disagree with before the code exists.
 */
export function Because({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[66ch] border-l-2 border-cal-2/50 py-1 pl-4 text-[0.9375rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}
