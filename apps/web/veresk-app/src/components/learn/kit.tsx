/**
 * The pieces every lesson page is built from.
 *
 * ONE FILE BECAUSE THEY ARE ONE VOCABULARY. A step, a figure, a code sample, a
 * data sample, a command and a caveat are the six things a lesson is made of,
 * and they only make sense next to each other — splitting them into six files
 * would spread one page's grammar across a directory.
 *
 * APP-LOCAL, AND NOT IN `@veresk/surface`. The repo's rule is extraction on a
 * MEASURED SECOND CALLER: `Tile` gained `className` because two pages were
 * hand-rolling it, not because a third might. There is one learning section and
 * one app that serves it. If Meridian Pharma's page ever wants a `Figure` with
 * a source line, that is the day this moves — and its CSS moves with it, which
 * is the trap `Journey` fell into.
 */
import type { ReactNode } from 'react';
import { Snippet, type Lang } from './Snippet';

/* ── A NUMBERED STEP ───────────────────────────────────────────────────────
   The unit a lesson is read in. The numeral is a SEQUENCE, not a bullet — see
   `app.css`, where the thread joining them deliberately stops at the last one.
   ────────────────────────────────────────────────────────────────────────── */
export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="learn-step mt-12 first:mt-0">
      <span className="learn-step-n" aria-hidden>
        {n}
      </span>
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Body prose, capped at the measure `DESIGN.md` §4 sets for something meant to be read straight through. */
export function P({ children }: { children: ReactNode }) {
  return <p className="max-w-[64ch] leading-relaxed text-ui-dim">{children}</p>;
}

/** The sentence a reader should leave the step with. One per step at most, or it is not a takeaway. */
export function Key({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[64ch] border-l-2 pl-4 leading-relaxed font-medium text-ui-fg" style={{ borderColor: 'var(--lesson)' }}>
      {children}
    </p>
  );
}

/**
 * A term the reader may not have.
 *
 * The definition is in `title` as well as in the glossary at the foot of the
 * page, because a word somebody does not know is the one thing on a teaching
 * page that must not require scrolling to resolve. `<dfn>` is the correct
 * element and it is also what a screen reader announces as a definition.
 */
export function Term({ def, children }: { def: string; children: ReactNode }) {
  return (
    <dfn className="learn-term" title={def}>
      {children}
    </dfn>
  );
}

/* ── A FIGURE ──────────────────────────────────────────────────────────────
   Every chart on these pages goes in one of these, and the SOURCE prop is
   required rather than optional. That is the whole reason the wrapper exists:
   a figure that could ship without saying where its numbers came from
   eventually does.
   ────────────────────────────────────────────────────────────────────────── */
/**
 * What each non-default `kind` says of itself.
 *
 * A LOOKUP RATHER THAN A NESTED TERNARY, because the third kind is what turned
 * the old two-way ternary into something you had to read twice to find out what
 * the else-branch covered.
 */
const KIND_BADGE: Record<'cited' | 'illustration' | 'proposed', string> = {
  cited: 'measured elsewhere — not by this repo',
  illustration: 'a drawing, not a measurement',
  proposed: 'proposed — these numbers are not a result',
};

export function Figure({
  title,
  sub,
  source,
  kind = 'measured',
  children,
}: {
  title: string;
  sub?: ReactNode;
  /** Where the numbers came from, and — where one exists — the command that reprints them. */
  source: ReactNode;
  /**
   * WHAT KIND OF FIGURE THIS IS, AND IT IS A PROP RATHER THAN A SENTENCE IN
   * `source` ON PURPOSE.
   *
   *   measured      every number in it came off a run IN THIS REPO, and
   *                 `source` says which command reprints it.
   *   cited         a real measurement, made by somebody else. `source` carries
   *                 the author, the paper, the URL and the date fetched.
   *   illustration  a drawing of an idea. Nothing in it was measured.
   *   proposed      the shape of a decision not yet taken. The numbers are
   *                 made up to show what the trade looks like, and are not a
   *                 result.
   *
   * A page that distinguishes these in prose distinguishes them until somebody
   * is in a hurry. As a prop, the marker renders itself and the default is the
   * strict one — so a figure whose author forgot claims to be measured, is
   * read as measured, and is wrong in the direction somebody will notice.
   *
   * ── WHY `cited` HAD TO EXIST, AND WHY IT IS NOT ONE OF THE OTHER THREE ────
   *
   * The retrieval-patterns track teaches four patterns this repo has NOT built.
   * Their numbers are real — ViDoRe nDCG, Self-CRAG on PopQA, GraphRAG win
   * rates — they were simply measured by other people, on other corpora.
   *
   * `illustration` says "nothing in it was measured" and `proposed` says "these
   * numbers are not a result". Both are false about a published benchmark, and
   * a page that used either would be underselling a real finding. Leaving them
   * as `measured` is worse than both, and it is the reason this exists: that is
   * the DEFAULT, it renders no badge at all, and on this site an unbadged
   * figure reads as a number somebody here printed. Two pages of this track
   * have no repo run behind them whatsoever, and that is the honest thing for
   * them to say out loud.
   *
   * ALL THREE NON-DEFAULT KINDS TAKE THE SAME AMBER MARKER. `--ui-warn` is the
   * site's "a human decision is owed", and in every one of these cases the
   * decision is the same one: how far you may carry this number. Giving `cited`
   * its own colour would have implied the three differ in severity. They differ
   * in PROVENANCE, which is what the words say.
   */
  kind?: 'measured' | 'cited' | 'illustration' | 'proposed';
  children: ReactNode;
}) {
  return (
    <figure className="learn-fig my-8">
      <figcaption className="learn-fig-head">
        <p className="font-mono text-sm font-medium text-ui-fg">{title}</p>
        {sub && <p className="mt-1.5 max-w-[68ch] text-[0.8125rem] leading-relaxed text-ui-dim">{sub}</p>}
      </figcaption>
      <div className="learn-fig-body learn-chart">{children}</div>
      <div className="learn-fig-source">
        {kind !== 'measured' && (
          /* `--ui-warn` is the site's "a human decision is owed", and reading a
             drawing — or somebody else's benchmark — as a measurement made here
             is exactly the decision being warned about. Measured figures get no
             badge at all: a badge on the ordinary case is a badge nobody reads. */
          <p className="mb-2 font-mono text-[0.6875rem] tracking-[0.08em] uppercase" style={{ color: 'var(--color-ui-warn)' }}>
            {KIND_BADGE[kind]}
          </p>
        )}
        {source}
      </div>
    </figure>
  );
}

/* CODE AND DATA MOVED TO `@veresk/surface` when Calder Safety's steps page
   wanted the same two blocks. They are re-exported here so every lesson's
   import list is unchanged — the components are the site's, not this app's. */
export { Code, Data } from '@veresk/surface';

/* ── THE COMMANDS ──────────────────────────────────────────────────────────
   WHAT IT COSTS IS PART OF THE COMMAND. Half of what this repo can run is free
   and offline and half of it spends money on a model or an embedding call, and
   a list that did not say which is which is a list somebody runs all of.
   ────────────────────────────────────────────────────────────────────────── */
export type Cost = 'free' | 'index' | 'money';

const COST_LABEL: Record<Cost, string> = {
  free: 'offline, free',
  index: 'needs the index',
  money: 'spends money',
};

export function RunIt({ items }: { items: Array<{ cmd: string; does: string; cost: Cost }> }) {
  return (
    <div className="my-8 rounded-xl border border-ui-line bg-ui-surface">
      <p className="border-b border-ui-line px-4 py-2.5 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
        run it yourself
      </p>
      <ul className="divide-y divide-ui-line">
        {items.map((it) => (
          <li key={it.cmd} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,22rem)_1fr]">
            <code className="font-mono text-[0.8125rem] break-words text-ui-fg">{it.cmd}</code>
            <span className="text-[0.8125rem] leading-relaxed text-ui-dim">
              {it.does}{' '}
              {/* The one place a hue is allowed to carry meaning on these pages, and
                  it is not the lesson hue: `--ui-warn` is what the rest of the site
                  uses for "a human decision is owed", and deciding to spend money is
                  one. Free commands get no colour at all — see the colour rule. */}
              <span
                className="font-mono text-[0.6875rem] whitespace-nowrap"
                style={{ color: it.cost === 'money' ? 'var(--color-ui-warn)' : 'var(--color-ui-faint)' }}
              >
                ({COST_LABEL[it.cost]})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── THE SHORT VERSION, SAID OUT LOUD ──────────────────────────────────────
   A paragraph you could actually say to somebody, and the question they ask
   next.

   WHY IT IS A COMPONENT AND NOT JUST A QUOTE. A lesson that has been read
   properly still leaves you unable to explain it in thirty seconds — the page
   is organised for understanding, and understanding is not the same shape as an
   explanation. This is the explanation, written to be read aloud: concrete
   numbers, no jargon that has not been earned, and the ONE thing that makes it
   sound like somebody who did the work rather than somebody who read about it.

   `then` IS REQUIRED, and it is the part most of these were written for. Every
   one of these paragraphs has an obvious follow-up question, and knowing the
   follow-up is the difference between a rehearsed answer and an argument you
   can stand in. A version of this component where `then` was optional would
   have half of them missing it.
   ────────────────────────────────────────────────────────────────────────── */
export function SaidOutLoud({ children, then }: { children: ReactNode; then: ReactNode }) {
  return (
    <section className="said mt-12">
      <p className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase" style={{ color: 'var(--lesson)' }}>
        the short version, said out loud
      </p>
      <blockquote className="said-quote">{children}</blockquote>
      <p className="mt-4 max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-dim">
        <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
          and then they ask —{' '}
        </span>
        {then}
      </p>
    </section>
  );
}

/* ── WHAT THIS DOES NOT PROVE ──────────────────────────────────────────────
   Every substantive document in `docs/` ends with one of these, and the pages
   that teach from them do not get to drop it. It is UNCOLOURED and dashed: a
   caveat is not a finding, and amber here would read as a warning about the
   system rather than a limit on the claim.
   ────────────────────────────────────────────────────────────────────────── */
export function Caveat({ items }: { items: Array<{ claim: string; body: ReactNode }> }) {
  return (
    <aside className="learn-caveat my-10">
      <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
        what this does not prove
      </p>
      <dl className="mt-4 space-y-4">
        {items.map((it) => (
          <div key={it.claim}>
            <dt className="text-[0.9375rem] font-medium text-ui-fg">{it.claim}</dt>
            <dd className="mt-1 max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-dim">{it.body}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

/**
 * The glossary at the foot of a lesson.
 *
 * It repeats every `Term` on the page on purpose. A reader who met "RRF" in §3
 * and wants it again in §5 should not have to find the sentence it was defined
 * in — and a term that turns out to be hard to write a one-line definition for
 * is usually a term the page should not have used.
 */
export function Glossary({ terms }: { terms: Array<{ word: string; def: string }> }) {
  return (
    <section className="mt-12 border-t border-ui-line pt-8">
      <h2 className="font-mono text-sm tracking-[0.08em] text-ui-faint uppercase">the words on this page</h2>
      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {terms.map((t) => (
          <div key={t.word}>
            <dt className="font-mono text-[0.875rem] text-ui-fg">{t.word}</dt>
            <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ui-dim">{t.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
