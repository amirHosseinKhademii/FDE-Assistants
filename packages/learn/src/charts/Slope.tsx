/**
 * Where a passage moved, before and after.
 *
 * A SLOPE CHART BECAUSE THE MOVE IS THE MEASUREMENT. Two bar charts side by
 * side would make a reader compute each difference; a line does it for them,
 * and its direction is readable in one glance across every case at once.
 *
 * RANK IS INVERTED — 1 IS AT THE TOP. Every other chart on these pages has
 * bigger meaning more, so this one says which way it runs in its own axis
 * labels rather than relying on the convention.
 *
 * THE LOSS IS DRAWN THE SAME AS THE GAINS, in the same hue, differing only by
 * the direction of its own line. `docs/steering/evals/RETRIEVAL.md` prints
 * `ret-008` rather than burying it because it is the honest cost of the
 * reranker; colouring it red here would make it a fault rather than a trade,
 * and severity hues are not on loan to these pages.
 */
export function Slope({
  rows,
  labels,
  worst,
}: {
  rows: Array<{ id: string; from: number; to: number; note: string }>;
  labels: [string, string];
  /** The bottom of the scale. Fixed rather than derived, so two of these can be compared. */
  worst: number;
}) {
  const H = 300;
  const top = 34;
  const bottom = H - 30;
  const xa = 210;
  const xb = 620;
  const y = (rank: number) => top + ((rank - 1) / (worst - 1)) * (bottom - top);

  return (
    <svg viewBox={`0 0 1000 ${H}`} className="w-full" role="img"
      aria-label={rows.map((r) => `${r.id} moved from rank ${r.from} to rank ${r.to}`).join('. ')}>
      <text x={xa} y={16} fontSize={11} textAnchor="middle">{labels[0]}</text>
      <text x={xb} y={16} fontSize={11} textAnchor="middle">{labels[1]}</text>

      <line className="axis" x1={xa} x2={xa} y1={top - 8} y2={bottom + 8} />
      <line className="axis" x1={xb} x2={xb} y1={top - 8} y2={bottom + 8} />

      <text x={xa - 14} y={top + 4} fontSize={10} textAnchor="end">rank 1 — best</text>
      <text x={xa - 14} y={bottom + 4} fontSize={10} textAnchor="end">rank {worst}</text>

      {rows.map((r) => (
        <g key={r.id}>
          <line
            x1={xa}
            y1={y(r.from)}
            x2={xb}
            y2={y(r.to)}
            stroke="var(--lesson)"
            strokeWidth={2}
            opacity={0.8}
          />
          {/* A 2px surface ring on each end, so two lines crossing at a point
              still read as two. */}
          <circle cx={xa} cy={y(r.from)} r={5} fill="var(--lesson)" stroke="var(--color-ui-surface)" strokeWidth={2} />
          <circle cx={xb} cy={y(r.to)} r={5} fill="var(--lesson)" stroke="var(--color-ui-surface)" strokeWidth={2} />
          <text x={xa - 14} y={y(r.from) + 4} fontSize={11.5} textAnchor="end" fill="var(--color-ui-fg)">
            {r.id} · {r.from}
          </text>
          <text x={xb + 14} y={y(r.to) + 4} fontSize={11.5} fill="var(--color-ui-fg)">
            {r.to}
          </text>
          <text x={xb + 44} y={y(r.to) + 4} fontSize={10.5}>
            {r.note}
          </text>
        </g>
      ))}
    </svg>
  );
}
