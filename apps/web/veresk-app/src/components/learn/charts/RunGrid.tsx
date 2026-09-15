/**
 * Seven cases, five runs each, one cell per run.
 *
 * WHY EVERY RUN IS DRAWN RATHER THAN A PASS RATE. A pass rate of 80% covers two
 * different worlds: a case that fails the same way every time, and a case that
 * is flaky. `docs/evals/README.md` cares more about the second — zero-flaky is
 * what makes a disagreement diagnosable — and 35 cells show which one you have
 * without a second chart.
 *
 * A PASS IS GREY. This is the colour rule the repo argues hardest for, from
 * `docs/pharma/DESIGN.md` §3: *bad news gets a colour; the absence of bad news
 * does not get the opposite colour.* Thirty green cells would be the page
 * congratulating itself, in the one language nobody audits. Grey passes leave
 * the five failures as the only thing the eye lands on — which is also the only
 * thing worth looking at.
 */
export function RunGrid({
  cases,
  runs,
}: {
  cases: Array<{ id: string; passes: number; note?: string }>;
  runs: number;
}) {
  const cell = 26;
  const gap = 6;
  const left = 96;
  const H = cases.length * (cell + gap) + 34;

  return (
    <svg viewBox={`0 0 760 ${H}`} className="w-full max-w-2xl" role="img"
      aria-label={cases.map((c) => `${c.id} passed ${c.passes} of ${runs} runs`).join('. ')}>
      <text x={left} y={14} fontSize={10}>run 1</text>
      <text x={left + (runs - 1) * (cell + gap) + cell} y={14} fontSize={10} textAnchor="end">
        run {runs}
      </text>

      {cases.map((c, i) => {
        const y = i * (cell + gap) + 24;
        return (
          <g key={c.id}>
            <text x={0} y={y + cell / 2 + 4} fontSize={11.5} fill="var(--color-ui-dim)">
              {c.id}
            </text>
            {Array.from({ length: runs }, (_, r) => {
              const pass = r < c.passes;
              return (
                <rect
                  key={r}
                  className="run-cell"
                  data-pass={String(pass)}
                  x={left + r * (cell + gap)}
                  y={y}
                  width={cell}
                  height={cell}
                  rx={5}
                >
                  <title>{`${c.id}, run ${r + 1}: ${pass ? 'passed' : 'failed'}`}</title>
                </rect>
              );
            })}
            <text x={left + runs * (cell + gap) + 8} y={y + cell / 2 + 4} fontSize={11.5} fill="var(--color-ui-fg)">
              {c.passes}/{runs}
            </text>
            {c.note && (
              <text x={left + runs * (cell + gap) + 60} y={y + cell / 2 + 4} fontSize={10.5}>
                {c.note}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
