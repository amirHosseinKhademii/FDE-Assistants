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
export type State = 'live' | 'wired' | 'refuses';

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
  rows: Array<{ name: string; sub?: string; cells: Array<{ state: State; detail: string }> }>;
  footnote?: string;
  /** What the three states are called and coloured. See `CAPABILITY` and `EITHER_OR`. */
  marks?: Record<State, Mark>;
  /** What the first column holds. It said `engine` on every caller, including the two that had no engines in it. */
  rowHeader?: string;
}) {
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
                  <span className="font-mono text-[0.875rem] text-ui-fg">{r.name}</span>
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
    </div>
  );
}
