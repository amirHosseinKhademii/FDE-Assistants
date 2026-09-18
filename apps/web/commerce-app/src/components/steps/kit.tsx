/**
 * The small set of parts the steps page is drawn with.
 *
 * ── IT IS CALDER'S KIT, WITH ONE AXIS CHANGED, AND THAT IS THE POINT ──────
 *
 * `apps/web/safety-app/src/components/steps/kit.tsx` is the same hundred lines
 * and its header carries the argument for why a page like this needs its own
 * kit rather than `/learn`'s 2,352-line one. What is copied is the discipline:
 * every figure says where its numbers came from, because that is the only thing
 * on a page like this a reader cannot recover for themselves.
 *
 * WHAT IS NOT COPIED IS THE VOCABULARY. Calder's four provenances are
 * `measured` / `worked` / `target` / `pending`, which fit a pipeline that counts
 * things. This engagement counts almost nothing yet — it reads a protocol — so
 * it uses the three words `docs/commerce/PLAN.md` already badges every claim in
 * that document with, unchanged:
 *
 *   measured    read off this machine. Either out of the SDK's own `.d.mts`
 *               files, or produced by running the thing being described and
 *               keeping the output. The strongest thing on the page.
 *   cited       it comes from a document and the document is named. True, but
 *               true because somebody else wrote it down.
 *   proposed    this plan's design. NOT RUN. Twelve of the fourteen steps are
 *               here, and a page that let them look like the other two would be
 *               lying in the most expensive direction available.
 *
 * ONE MORE THAN CALDER HAS, AND IT EARNS ITS PLACE:
 *
 *   corrected   measured, AND it contradicts what this repo's own documents
 *               said before the measurement. There are two — the protocol
 *               version that came back lower than the one asked for, and the
 *               error code for a tool that does not exist. Filing those as
 *               plain `measured` would lose the only thing that makes them
 *               worth the page: somebody wrote the other answer down first.
 */
import type { ReactNode } from 'react';

export type Provenance = 'measured' | 'cited' | 'proposed' | 'corrected';

const BADGE: Record<Provenance, { text: string; tone: string }> = {
  measured: { text: 'measured here', tone: 'text-thb-1 border-thb-1/40' },
  cited: { text: 'cited', tone: 'text-ui-dim border-ui-line' },
  proposed: { text: 'proposed — not run', tone: 'text-ui-faint border-ui-line border-dashed' },
  corrected: { text: 'measured — corrects the plan', tone: 'text-thb-2 border-thb-2/50' },
};

/** What a step needs before it can start. MCP-STEPS.md's dependency table. */
export type Needs = 'nobody' | 'the API' | 'the corpus' | 'everything above';

/**
 * One of the fourteen.
 *
 * THE NUMBER AND THE TITLE ARE THE HEADING, because `Step 6 · Break it on
 * purpose` is how the source document refers to it and how the next person will
 * search for it. The one-line `plain` under it is the version for somebody who
 * will not read the rest of the step, and it is written first on purpose.
 *
 * `needs` IS IN THE HEADER RATHER THAN THE BODY. It is the question a reader of
 * a half-built plan actually has — can this start, or is it waiting on someone?
 * — and putting it beside the title means the answer is available without
 * reading the step.
 */
export function Step({
  n,
  title,
  plain,
  needs,
  done,
  children,
}: {
  n: string;
  title: string;
  plain: string;
  needs: Needs;
  /** The date it was finished, where it has been. */
  done?: string;
  children: ReactNode;
}) {
  return (
    <section className="thb-step lift-in" id={`step-${n}`}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
          style={{ color: done ? 'var(--color-thb-1)' : 'var(--color-ui-faint)' }}
        >
          step {n}
        </span>
        <h3 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          {title}
        </h3>
        <span className="ml-auto flex items-center gap-2">
          {done && (
            <span className="rounded-full border border-thb-1/40 px-2 py-px font-mono text-[0.5625rem] tracking-[0.06em] text-thb-1 uppercase">
              done {done}
            </span>
          )}
          <NeedsChip needs={needs} />
        </span>
      </header>

      <p className="mt-3 max-w-[64ch] leading-relaxed text-ui-dim">{plain}</p>

      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}

/**
 * Whether this step is blocked on somebody else.
 *
 * SEVEN OF FOURTEEN ARE FREE, and that is the single most load-bearing fact in
 * `MCP-STEPS.md` — it is why this strand started while two other sessions were
 * still building the databases and the API. The chip is lit for a step that
 * needs nobody and plain for one that waits, so the ratio is visible by
 * scanning rather than by counting.
 */
function NeedsChip({ needs }: { needs: Needs }) {
  const free = needs === 'nobody';
  return (
    <span className="thb-needs" data-free={free}>
      {free ? 'needs nobody' : `needs ${needs}`}
    </span>
  );
}

/**
 * A figure, and where it came from.
 *
 * THE BADGE IS NOT DECORATION. On a page describing a build that is two steps
 * into fourteen, the difference between "we ran this and kept the output" and
 * "this is what we intend to write" is the entire difference between a record
 * and a plan.
 */
export function Figure({
  caption,
  from = 'proposed',
  source,
  children,
}: {
  caption: string;
  from?: Provenance;
  /** The command, the file, or the document that produced it. */
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
 * A block of literal text with no file behind it.
 *
 * WHEN TO USE THIS AND WHEN TO USE `Code` / `Data`. `@veresk/surface`'s `Code`
 * and `Data` are the site's code block: VS Code's own grammars, and a header
 * naming the file so a reader can go and check it. Anything quoting a real file
 * gets one of those. This is for the rest — an arrow diagram, a shape drawn in
 * characters, and above all CODE THAT DOES NOT EXIST YET. Twelve of these
 * fourteen steps are unwritten; giving their snippets a path would be inventing
 * provenance for a file nobody can open.
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
 * The reason behind a decision, set apart from the description of it.
 *
 * WHY IT IS A DIFFERENT SHAPE. Everything else on this page says what happens.
 * This says why it was chosen over the obvious alternative, which is the part a
 * reader is being asked to agree or disagree with — and on this engagement more
 * than the others, because §10 of the plan may yet conclude the whole thing was
 * not worth its cost.
 */
export function Because({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[66ch] border-l-2 border-thb-2/50 py-1 pl-4 text-[0.9375rem] leading-relaxed text-ui-dim">
      {children}
    </p>
  );
}

/** One JSON-RPC message, with the direction it travelled. */
export interface WireLine {
  dir: 'out' | 'in';
  /** The message, already formatted. Line breaks are kept as written. */
  body: string;
  /** A fragment of `body` the prose above is pointing at. */
  mark?: string;
}

/**
 * A conversation between two programs, drawn as itself.
 *
 * ── WHY THIS IS NOT A `Code` BLOCK ────────────────────────────────────────
 *
 * `Data` would render these as pretty JSON and lose the only thing that makes a
 * protocol trace different from a file: a trace has TURNS. Which side spoke, in
 * what order, and which message answers which. Syntax colour cannot say any of
 * that, and an arrow in the gutter says all of it.
 *
 * THE HIGHLIGHT IS A STRING MATCH, NOT A LINE NUMBER, because the interesting
 * fragment here is mid-line — `"protocolVersion":"2025-11-25"` sits inside a
 * result object — and a line index would point at the wrong thing the moment
 * anybody reformats the capture.
 */
export function Wire({ lines }: { lines: WireLine[] }) {
  return (
    <div className="rounded-lg border border-ui-line bg-ui-surface px-3.5 py-2">
      {lines.map((line, i) => (
        <div key={i} className="thb-wire" data-dir={line.dir}>
          <span className="thb-wire-dir" aria-hidden>
            {line.dir === 'out' ? '→' : '←'}
          </span>
          {/* The visually-hidden word is what a screen reader gets instead of an
              arrow glyph, which it would otherwise read as "right arrow" or skip
              entirely — and the direction is the whole information here. */}
          <span className="sr-only">{line.dir === 'out' ? 'sent' : 'received'}</span>
          <span className="thb-wire-body">{highlight(line.body, line.mark)}</span>
        </div>
      ))}
    </div>
  );
}

/** Split a message around the fragment the prose is pointing at. */
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
