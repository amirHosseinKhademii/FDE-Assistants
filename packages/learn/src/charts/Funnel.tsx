/**
 * The fetch arithmetic, drawn to linear scale.
 *
 * THE SCALE IS THE POINT AND IT IS DELIBERATELY NOT LOG. `docs/RETRIEVAL.md`
 * §4 titles this "the fetch arithmetic, which is larger than it looks" — 240
 * candidates are fetched and fused so that 5 can be shown. A log axis would
 * make the last stage comfortably visible and delete the sentence. Drawn
 * linearly, the final bar is 2% of the first, which is the fact.
 *
 * Each stage carries the multiplier that produced it, so the chart is the
 * arithmetic rather than a picture of it.
 */
export function Funnel({
  stages,
  note,
}: {
  /**
   * `op` HAS A HARD WIDTH BUDGET AND IT IS THE LAST ONE IN THESE COMPONENTS.
   *
   * It is drawn right-anchored at `left - 10`, so it grows LEFTWARD from x=86
   * with nothing to wrap against and no room to grow into. Past that it crosses
   * x=0 and the viewBox crops it — off the LEFT edge, which is the direction
   * nobody thinks to check.
   *
   * MEASURED, not estimated: at `fontSize={11}` this stack renders about 6.6
   * units per character, so the ceiling is ~13 characters and the safe budget
   * is 12.
   *
   *   "gate + top-k"              12 chars   79.1 wide   6.9 clearance
   *   "the work list"             13 chars   85.7 wide   0.3 clearance  ← the cliff
   *   "days, GPUs, labelled data" 25 chars              79 units CROPPED
   *
   * `BarRows` computes its gutter from its content; this one cannot, because
   * the gutter is also what positions every bar. So the constraint stays a
   * constraint — put the detail in `why`, which has the full width.
   */
  stages: Array<{ n: number; label: string; op?: string; why?: string }>;
  note?: string;
}) {
  const top = Math.max(...stages.map((s) => s.n));
  const W = 1000;
  const left = 96;
  const plot = 520;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${stages.length * 56 + 8}`} className="w-full" role="img"
        aria-label={stages.map((s) => `${s.label}: ${s.n}`).join('. ')}>
        {stages.map((s, i) => {
          const y = i * 56 + 6;
          const w = Math.max(3, (s.n / top) * plot);
          return (
            <g key={s.label}>
              {/* The operation that got here from the row above, in the gutter
                  between the two bars — the same place it sits in the document's
                  ASCII version, because that is where the eye looks for it. */}
              {s.op && (
                <text x={left - 10} y={y + 8} fontSize={11} textAnchor="end" fill="var(--color-ui-dim)">
                  {s.op}
                </text>
              )}
              <rect className="bar" x={left} y={y + 16} width={w} height={12} rx={4}>
                <title>{`${s.label}: ${s.n}`}</title>
              </rect>
              <text x={left + w + 10} y={y + 26} fontSize={12.5} fill="var(--color-ui-fg)">
                {s.n.toLocaleString('en-GB')}
              </text>
              <text x={left + w + 10 + String(s.n).length * 8 + 26} y={y + 26} fontSize={11.5}>
                {s.label}
              </text>
              {s.why && (
                <text x={left} y={y + 44} fontSize={10.5}>
                  {s.why}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {note && <p className="mt-2 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-dim">{note}</p>}
    </div>
  );
}
