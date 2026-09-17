/**
 * Engine down the side, cloud across the top — `docs/ENGINES.md` §4, which
 * calls itself "the chart to read".
 *
 * THE THREE STATES USE SEMANTIC TOKENS, NOT THE LESSON HUE, and each is the
 * token that already means this elsewhere on the site:
 *
 *   live     `--ui-accent`  — `DESIGN.md` reserves it for ACTION and LIVE
 *                             MACHINERY. A path real paid calls have gone over
 *                             is exactly that.
 *   wired    dashed, uncoloured — `DESIGN.md` §6: *a dashed span is a join that
 *                             does not exist.* The code is written and
 *                             typechecked and no request has ever been made.
 *                             Drawing it solid would be the page claiming a
 *                             capability nobody has exercised.
 *   refuses  `--ui-danger`  — it throws, on purpose.
 *
 * NO STATE IS GREEN. `--ui-ok` means "a tool returned something"; a whole
 * column of green would read as *this cloud is fine*, and the entire right-hand
 * column is blocked on an AWS quota defect.
 *
 * EVERY CELL CARRIES A GLYPH AND A WORD, so the state never rests on colour.
 */
import { useState } from 'react';
import { OriginDialog, originOf, type Origin } from '@fde/uikit';
import { Snippet, type Lang } from '@veresk/surface';

export type State = 'live' | 'wired' | 'refuses';

/**
 * The long version of a row, opened by pressing it.
 *
 * ── WHY A ROW NEEDED ONE ───────────────────────────────────────────────────
 *
 * A cell says `— not built` and a detail string says `no external memory
 * anywhere`, and between them a reader who already knows what structured
 * note-taking IS has everything they need. A reader who does not has a verdict
 * on a term they cannot picture, which is the one thing a teaching page must
 * not leave lying around. The grid is a summary, and a summary is only readable
 * by somebody who could have written it.
 *
 * So the row keeps its one line and the press carries the rest: what the thing
 * is in plain words, a concrete instance of it, and why this row got the
 * verdict it did.
 *
 * ── `shape` HAS NO DEFAULT, DELIBERATELY ───────────────────────────────────
 *
 * `HowItWorks` defaults to `verbatim` and an audit later found seven
 * walkthroughs carrying a paraphrase under a real path. Most examples here are
 * illustrative by nature — you cannot quote the file that implements a
 * technique you did not build — so a default in either direction would be wrong
 * about most callers. There is no default: the caller says which it is, every
 * time, or it does not compile.
 */
export interface RowExplain {
  /** Plain English, no jargon that has not been earned. Two to four sentences. */
  what: string[];
  /**
   * A concrete instance — the thing itself rather than a description of it.
   *
   * `caption` says what is being shown and where it is from. `shape` is
   * required; see the note above.
   */
  example: {
    caption: string;
    lines: string[];
    lang?: Lang;
    shape: 'verbatim' | 'assembled';
  };
  /** Why this row got the verdict the grid gives it. */
  why?: string;
}

export interface Mark {
  glyph: string;
  word: string;
  colour: string;
}

/**
 * The default marks, which are the ones this component was built for.
 *
 * ── AND THE REASON `marks` IS A PROP AT ALL ────────────────────────────────
 *
 * It was not, and two later callers reused the grid for something that is not a
 * capability matrix: which search arm answers a question, and which half of a
 * summary is a model. Both rendered "✕ refuses" in `--ui-danger` for cells that
 * mean "not this one" — four rose cells on a page where nothing is wrong.
 *
 * That is the colour rule this whole section is written under, broken by
 * reuse: bad news gets a colour, and the absence of bad news does not get the
 * opposite colour. Both pages had grown a FOOTNOTE telling the reader to read
 * the glyphs as something other than what the cells said — which is the signal
 * to change the labels, not to keep explaining them.
 */
export const CAPABILITY: Record<State, Mark> = {
  live: { glyph: '●', word: 'live', colour: 'var(--color-ui-accent)' },
  wired: { glyph: '○', word: 'wired', colour: 'var(--color-ui-faint)' },
  refuses: { glyph: '✕', word: 'refuses', colour: 'var(--color-ui-danger)' },
};

/**
 * For a grid that is a division of labour rather than a capability claim.
 *
 * NOTHING HERE IS A SEVERITY, so nothing here takes a severity colour. "This
 * arm cannot separate two identifiers" is a property of embeddings, not a
 * fault, and drawing it in the same rose as an engine that throws would say it
 * was one.
 */
export const EITHER_OR: Record<State, Mark> = {
  live: { glyph: '●', word: 'yes', colour: 'var(--lesson)' },
  wired: { glyph: '○', word: 'partly', colour: 'var(--color-ui-faint)' },
  refuses: { glyph: '—', word: 'no', colour: 'var(--color-ui-faint)' },
};

export function Matrix({
  columns,
  rows,
  footnote,
  marks = CAPABILITY,
  rowHeader = 'engine',
}: {
  columns: string[];
  rows: Array<{ name: string; sub?: string; cells: Array<{ state: State; detail: string }>; explain?: RowExplain }>;
  footnote?: string;
  /** What the three states are called and coloured. See `CAPABILITY` and `EITHER_OR`. */
  marks?: Record<State, Mark>;
  /** What the first column holds. It said `engine` on every caller, including the two that had no engines in it. */
  rowHeader?: string;
}) {
  const [open, setOpen] = useState<{ from: Origin; row: string } | null>(null);
  /*
   * THE HUE IS READ OFF THE PRESSED ROW, for the reason `HowItWorks` documents
   * at length: `OriginDialog` portals to `<body>`, so the panel is not a
   * descendant of the `article.lesson` that sets `--lesson` and inheritance
   * cannot reach it. Every dialog on every lesson would come out track-position
   * one's blue.
   */
  const [hue, setHue] = useState('var(--color-learn-1)');
  const current = rows.find((r) => r.name === open?.row);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr>
              <th className="pb-3 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
                {rowHeader}
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  className="pb-3 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-ui-line align-top">
                <th scope="row" className="py-3 pr-6 font-normal">
                  {r.explain ? (
                    <button
                      type="button"
                      className="matrix-open"
                      aria-haspopup="dialog"
                      onClick={(e) => {
                        setHue(getComputedStyle(e.currentTarget).getPropertyValue('--lesson').trim() || hue);
                        setOpen({ from: originOf(e.currentTarget), row: r.name });
                      }}
                    >
                      <span className="font-mono text-[0.875rem]">{r.name}</span>
                      {/* The affordance has to be visible without colour or hover,
                          because a row that is pressable and does not look it is a
                          row nobody presses. */}
                      <span className="matrix-open-mark" aria-hidden>
                        ?
                      </span>
                    </button>
                  ) : (
                    <span className="font-mono text-[0.875rem] text-ui-fg">{r.name}</span>
                  )}
                  {r.sub && <span className="mt-0.5 block text-[0.75rem] text-ui-faint">{r.sub}</span>}
                </th>
                {r.cells.map((cell, i) => {
                  const m = marks[cell.state];
                  return (
                    <td key={i} className="py-3 pr-6">
                      <span
                        className="inline-flex items-baseline gap-2 rounded-md px-2 py-1 font-mono text-[0.75rem]"
                        style={{
                          color: m.colour,
                          border: `1px ${cell.state === 'wired' ? 'dashed' : 'solid'} color-mix(in oklab, ${m.colour} 40%, transparent)`,
                          background:
                            cell.state === 'wired'
                              ? 'transparent'
                              : `color-mix(in oklab, ${m.colour} 8%, transparent)`,
                        }}
                      >
                        <span aria-hidden>{m.glyph}</span>
                        {m.word}
                      </span>
                      <span className="mt-1.5 block max-w-[24ch] text-[0.75rem] leading-relaxed text-ui-dim">
                        {cell.detail}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footnote && <p className="mt-4 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-dim">{footnote}</p>}

      {open && current?.explain && (
        <OriginDialog
          from={open.from}
          label={current.name}
          header={
            <div style={{ ['--lesson' as string]: hue }}>
              <p
                className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
                style={{ color: 'var(--lesson)' }}
              >
                {rowHeader}
              </p>
              <p className="mt-1.5 font-mono text-base leading-snug font-medium text-ui-fg">{current.name}</p>
            </div>
          }
          onClose={() => setOpen(null)}
        >
          <div className="learn-walk" style={{ ['--lesson' as string]: hue }}>
            <section>
              <h4 className="learn-walk-h">In plain words</h4>
              <ol className="mt-3 space-y-2.5">
                {current.explain.what.map((line, i) => (
                  <li key={i} className="grid grid-cols-[1.25rem_1fr] gap-3">
                    <span className="font-mono text-[0.6875rem] leading-6" style={{ color: 'var(--lesson)' }}>
                      {i + 1}
                    </span>
                    <span className="max-w-[58ch] text-[0.9375rem] leading-relaxed text-ui-dim">{line}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-7">
              <h4 className="learn-walk-h">For example</h4>
              <div className="snip-frame mt-3">
                <div className="snip-head">
                  <span className="snip-kind">
                    {current.explain.example.shape === 'assembled' ? 'assembled' : 'code'}
                  </span>
                  <span className="snip-path">{current.explain.example.caption}</span>
                  {current.explain.example.shape === 'assembled' && (
                    <span className="ml-auto">written for this page, not quoted from a file</span>
                  )}
                </div>
                <Snippet lines={current.explain.example.lines} lang={current.explain.example.lang} />
              </div>
            </section>

            {current.explain.why && (
              <section className="mt-7">
                <h4 className="learn-walk-h">Why this row says what it says</h4>
                <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ui-dim">
                  {current.explain.why}
                </p>
              </section>
            )}
          </div>
        </OriginDialog>
      )}
    </div>
  );
}
