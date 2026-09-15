/**
 * Horizontal bars — the workhorse of these pages.
 *
 * WHY HORIZONTAL AND NOT VERTICAL. Every category here has a real name —
 * `HNSW ef_search=64`, `Agents SDK + LangChain`, `text-embedding-3-small` — and
 * a vertical bar chart either rotates those labels or truncates them. A
 * horizontal bar gives the name a whole line at the reading size.
 *
 * ONE SERIES, PLUS AN OPTIONAL "BEFORE".
 *
 *   · the measurement being made    → the lesson hue
 *   · what it is being compared to  → neutral grey (`bar-muted`)
 *
 * That pairing is deliberate and it is the reason this chart needs no
 * categorical palette. `docs/` is full of before/after numbers — a baseline
 * against a reranked arm, a hand-rolled loop against a framework — and drawing
 * them as two *named* hues would imply the two are peers. They are not: one is
 * the reference and one is the result. Grey and coloured says that; two hues do
 * not.
 *
 * EVERY VALUE IS DIRECTLY LABELLED, so identity never rests on colour alone —
 * and the legend appears whenever there are two series, per the same rule.
 *
 * NO GRIDLINES. These charts are read as "which is biggest and by how much",
 * the values are printed on the bars, and a ruler behind them would be drawing
 * attention to the ruler. Where the absolute scale matters, `axis` prints the
 * maximum under the bars instead.
 */
export interface BarRow {
  label: string;
  /**
   * `null` means THERE IS NO NUMBER — a refusal, not a zero.
   *
   * It drew a bar. `Math.max(2, x(v))` gives every row a visible stub so a tiny
   * value is never invisible, and at `value: 0` that stub is a 2px bar labelled
   * "refused" — a chart saying the opposite of the caption above it, on the one
   * page whose whole subject is that a refusal carries no number anywhere.
   *
   * So a null row draws NOTHING and prints its `display` where the bar would
   * start. `0` still draws the stub, because a measured zero is a measurement.
   */
  value: number | null;
  /** The reference this row is being compared to, if there is one. Drawn grey, behind. Same `null` rule. */
  before?: number | null;
  /** Printed instead of the raw number — units, percentages, "30/35". */
  display?: string;
  /** Printed instead of the raw `before`. */
  beforeDisplay?: string;
  /** Worst–best across repeated builds or runs, drawn as a whisker over the bar. */
  range?: [number, number];
  /** One line under the label. Where the "why" of a row goes, so the prose need not carry it. */
  note?: string;
}

export function BarRows({
  rows,
  max,
  unit,
  labelWidth = 200,
  legend,
  axis,
  reference,
}: {
  rows: BarRow[];
  /** Fixed rather than derived where two charts must be read against each other. */
  max?: number;
  unit?: string;
  labelWidth?: number;
  /** `[beforeName, afterName]`. Required by the accessibility rule the moment any row has a `before`. */
  legend?: [string, string];
  /** What the right-hand edge of the plot means, printed under it. */
  axis?: string;
  /**
   * A line across the plot at a value that means something independent of the
   * data — the rate a coin would score, a threshold a build must clear.
   *
   * IT IS NOT DECORATION AND IT IS NOT A GRIDLINE. On the field-accuracy chart
   * the line sits at 33%, the rate three-way guessing scores, and one bar
   * landing on it IS the finding. A chart that plotted those bars without it
   * would show a low number; with it, it shows chance.
   */
  reference?: { at: number; label: string };
}) {
  const hasBefore = rows.some((r) => r.before !== undefined);
  const top =
    max ??
    Math.max(...rows.flatMap((r) => [r.value ?? 0, r.before ?? 0, r.range?.[1] ?? 0]));

  /*
   * ROW HEIGHT IS COMPUTED FROM WHAT THE ROWS ACTUALLY CARRY, and the note
   * gets its OWN LINE under the bar rather than sitting beneath the label.
   *
   * It did not, and it was wrong on screen from a build that succeeded. A note
   * drawn under the label is only safe while every note is shorter than
   * `labelWidth`; "Part IV > 4.4 Rental Reimbursement" is not, so it ran out
   * under the plot and the next row's bar was drawn straight through it. SVG
   * has no text metrics at render time, so there is no width to measure and no
   * wrapping to fall back on — the only robust fix is to stop putting two
   * things on one line.
   *
   * Found by screenshotting the page, which is the only check that can see it:
   * the typecheck passed, the build passed, and the collision is geometry.
   */
  const hasNote = rows.some((r) => r.note);
  const barH = hasBefore ? 9 : 11;
  const noteGap = hasNote ? 15 : 0;
  const rowH = (hasBefore ? 46 : 32) + noteGap;
  const plotW = 1000 - labelWidth - 90;
  const x = (v: number) => (v / top) * plotW;

  return (
    <div>
      {legend && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.6875rem] text-ui-faint">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-4 rounded-sm bg-ui-line-lit" />
            {legend[0]}
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-4 rounded-sm" style={{ background: 'var(--lesson)' }} />
            {legend[1]}
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 1000 ${rows.length * rowH + (reference ? 22 : 12)}`}
        className="w-full"
        role="img"
        aria-label={rows
          .map(
            (r) =>
              `${r.label}: ${r.display ?? r.value}${r.value !== null && unit ? ' ' + unit : ''}${
                r.note ? ` — ${r.note}` : ''
              }`,
          )
          .join('. ')}
      >
        {/* Drawn FIRST, so every bar sits on top of it. A reference line over
            the data would read as a correction to it. */}
        {reference && (
          <g>
            <line
              x1={labelWidth + x(reference.at)}
              x2={labelWidth + x(reference.at)}
              y1={0}
              y2={rows.length * rowH}
              stroke="var(--color-ui-fg)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.45}
            />
            <text
              x={labelWidth + x(reference.at) + 6}
              y={rows.length * rowH + 9}
              fontSize={10.5}
              fill="var(--color-ui-dim)"
            >
              {reference.label}
            </text>
          </g>
        )}

        {rows.map((r, i) => {
          const y = i * rowH + 4;
          /* The single bar sits level with its label; a pair straddles it. */
          const afterY = hasBefore ? y + 15 : y + 6;
          const labelBase = hasBefore ? y + 12 : y + barH + 4;
          return (
            <g key={r.label}>
              <text x={0} y={labelBase} fontSize={12} fill="var(--color-ui-dim)">
                {r.label}
              </text>

              {/* The reference, drawn first and behind, so the eye reads the
                  coloured bar as the thing that happened TO it. */}
              {r.before !== undefined && (
                <>
                  {r.before !== null && (
                    <rect
                      className="bar-muted"
                      x={labelWidth}
                      y={y + 2}
                      width={Math.max(2, x(r.before))}
                      height={barH}
                      rx={4}
                    >
                      <title>{`${r.label} — ${legend?.[0] ?? 'before'}: ${r.beforeDisplay ?? r.before}`}</title>
                    </rect>
                  )}
                  <text
                    x={labelWidth + (r.before === null ? 0 : Math.max(2, x(r.before))) + 8}
                    y={y + 2 + barH - 1}
                    fontSize={10.5}
                    fill="var(--color-ui-faint)"
                  >
                    {r.beforeDisplay ?? r.before}
                  </text>
                </>
              )}

              {r.value !== null && (
                <rect className="bar" x={labelWidth} y={afterY} width={Math.max(2, x(r.value))} height={barH} rx={4}>
                  <title>{`${r.label}: ${r.display ?? r.value}${unit ? ' ' + unit : ''}`}</title>
                </rect>
              )}

              {/* The whisker is worst–best across repeated runs of the SAME
                  thing. It is drawn over the bar rather than beside it because
                  it is that bar's uncertainty, not a second measurement — and
                  `docs/RETRIEVAL.md` A.4.2 is emphatic that the spread is the
                  finding, so hiding it in a footnote would be reporting the
                  good day. */}
              {r.range && (
                <g stroke="var(--color-ui-fg)" strokeWidth={1} opacity={0.55}>
                  <line
                    x1={labelWidth + x(r.range[0])}
                    x2={labelWidth + x(r.range[1])}
                    y1={afterY + barH / 2}
                    y2={afterY + barH / 2}
                  />
                  <line
                    x1={labelWidth + x(r.range[0])}
                    x2={labelWidth + x(r.range[0])}
                    y1={afterY - 1}
                    y2={afterY + barH + 1}
                  />
                  <line
                    x1={labelWidth + x(r.range[1])}
                    x2={labelWidth + x(r.range[1])}
                    y1={afterY - 1}
                    y2={afterY + barH + 1}
                  />
                </g>
              )}

              <text
                x={labelWidth + (r.value === null ? 0 : Math.max(2, x(r.value))) + 8}
                y={afterY + barH - 1}
                fontSize={11.5}
                /* A refusal is not a value, so it is not set in the value
                   colour either. It reads as a sentence where a number would
                   have been, which is exactly what it is. */
                fill={r.value === null ? 'var(--color-ui-dim)' : 'var(--color-ui-fg)'}
              >
                {r.display ?? r.value}
                {r.value === null || !unit ? '' : ` ${unit}`}
              </text>

              {/* Its own line, full width, below everything else in the row. */}
              {r.note && (
                <text x={0} y={y + (hasBefore ? 41 : 30) + 10} fontSize={10.5}>
                  {r.note}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {axis && <p className="mt-2 text-right font-mono text-[0.6875rem] text-ui-faint">{axis}</p>}
    </div>
  );
}
