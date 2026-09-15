/**
 * The one thing on these pages you can move.
 *
 * WHAT IT IS: three passages drawn as arrows, a question you can drag, and the
 * cosine similarity between them recomputed as you drag. The ranking underneath
 * reorders live, which is the entire mechanism of a dense search arm at a scale
 * a person can see.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT IT IS NOT, AND THIS IS SAID ON THE PAGE AS WELL AS HERE: a measurement.
 * The three passages are placed BY HAND at angles chosen to make the idea
 * visible. Nothing here was embedded, no model was called, and a real embedding
 * of these three sentences would land somewhere else entirely.
 *
 * Every other figure in this section is a number this repo measured. This one
 * is a drawing of an idea, and the figure it sits in says so where the source
 * line usually goes — because a diagram with invented numbers standing in a row
 * of measured ones is how a reader learns to distrust the measured ones.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * THE ARITHMETIC IS REAL EVEN THOUGH THE POSITIONS ARE NOT. `cos` below is the
 * definition — dot product over the product of the magnitudes — and it is the
 * same formula Postgres runs as `<=>` over 1,536 numbers instead of 2. The only
 * thing dropped is the number of dimensions, which is the one part nobody can
 * draw.
 */
import { useRef, useState } from 'react';

interface Arrow {
  label: string;
  /** Hand-placed. See the header. */
  v: [number, number];
}

const cos = (a: [number, number], b: [number, number]) => {
  const dot = a[0] * b[0] + a[1] * b[1];
  const mag = Math.hypot(...a) * Math.hypot(...b);
  return mag === 0 ? 0 : dot / mag;
};

export function VectorLab({ passages }: { passages: Arrow[] }) {
  // Starting angle is near the first passage but not on it, so the opening
  // state already shows a ranking rather than a tie.
  const [q, setQ] = useState<[number, number]>([0.72, 0.62]);
  const svg = useRef<SVGSVGElement>(null);

  const SIZE = 340;
  const O = 30; // the origin sits bottom-left: every vector here is positive in
  //              both axes, and an origin in the middle would waste three
  //              quadrants to draw a symmetry that does not exist.
  const SPAN = SIZE - O * 2;
  const px = (v: [number, number]): [number, number] => [O + v[0] * SPAN, SIZE - O - v[1] * SPAN];

  /** Pointer position → a unit-ish vector in the first quadrant. */
  function move(e: React.PointerEvent) {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * SIZE;
    const y = ((e.clientY - box.top) / box.height) * SIZE;
    const vx = (x - O) / SPAN;
    const vy = (SIZE - O - y) / SPAN;
    const m = Math.hypot(vx, vy);
    // LENGTH IS DISCARDED, which is the lesson: cosine measures angle, so a
    // long passage and a short one about the same thing are the same arrow.
    if (m < 0.05) return;
    setQ([vx / m, vy / m]);
  }

  const ranked = passages
    .map((p) => ({ ...p, sim: cos(q, p.v) }))
    .sort((a, b) => b.sim - a.sim);

  const [qx, qy] = px(q);

  return (
    <div className="veclab grid items-start gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
      <svg
        ref={svg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[340px] touch-none"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && move(e)}
        role="img"
        aria-label={`A two-dimensional drawing of ${passages.length} passages as arrows and one question arrow. Nearest: ${ranked[0].label}, cosine ${ranked[0].sim.toFixed(3)}.`}
      >
        <line className="axis" x1={O} y1={SIZE - O} x2={SIZE - O} y2={SIZE - O} />
        <line className="axis" x1={O} y1={SIZE - O} x2={O} y2={O} />

        {/* The two axis captions are the honest part of the drawing: neither
            axis is anything. In a real embedding no single number means
            anything on its own — only the direction of all 1,536 together. */}
        <text x={SIZE - O} y={SIZE - O + 16} fontSize={9.5} textAnchor="end">
          a dimension — means nothing on its own
        </text>
        <text x={O - 6} y={O - 10} fontSize={9.5}>
          likewise
        </text>

        {passages.map((p, i) => {
          const [x, y] = px(p.v);
          return (
            <g key={p.label}>
              <line x1={O} y1={SIZE - O} x2={x} y2={y} stroke="var(--color-ui-line-lit)" strokeWidth={2} />
              <circle cx={x} cy={y} r={4.5} fill="var(--color-ui-dim)" stroke="var(--color-ui-surface)" strokeWidth={2} />
              <text x={x + 8} y={y + 3} fontSize={10.5} fill="var(--color-ui-dim)">
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* The wedge between the question and whatever is currently nearest —
            the quantity the number underneath actually is. */}
        <path
          d={`M ${O} ${SIZE - O} L ${px(ranked[0].v)[0]} ${px(ranked[0].v)[1]} L ${qx} ${qy} Z`}
          fill="var(--lesson)"
          opacity={0.1}
        />

        <line x1={O} y1={SIZE - O} x2={qx} y2={qy} stroke="var(--lesson)" strokeWidth={2.5} />
        <circle className="veclab-handle" cx={qx} cy={qy} r={9} fill="var(--lesson)" stroke="var(--color-ui-surface)" strokeWidth={2} />
        {/* BELOW the handle, not beside it. Level with the dot, this label ran
            straight through whichever passage marker the question happened to
            be nearest — which is, by construction, the one the reader is
            looking at. */}
        <text x={qx + 12} y={qy + 24} fontSize={10.5} fill="var(--color-ui-fg)">
          your question
        </text>
      </svg>

      <div>
        <p className="font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
          drag the filled dot — the ranking reorders
        </p>

        <ol className="mt-4 space-y-2">
          {ranked.map((r, i) => (
            <li
              key={r.label}
              className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-3 rounded-lg px-2.5 py-2"
              style={{
                background: i === 0 ? 'color-mix(in oklab, var(--lesson) 9%, transparent)' : 'transparent',
              }}
            >
              <span className="font-mono text-[0.6875rem] text-ui-faint">
                {passages.findIndex((p) => p.label === r.label) + 1}
              </span>
              <span className="text-[0.875rem] leading-snug text-ui-dim">“{r.label}”</span>
              <span
                className="font-mono text-[0.8125rem] tabular-nums"
                style={{ color: i === 0 ? 'var(--lesson)' : 'var(--color-ui-faint)' }}
              >
                {r.sim.toFixed(3)}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
          The number is cosine similarity: 1.000 is the same direction, 0.000 is at right angles. Postgres
          computes the same thing with <span className="font-mono text-ui-fg">&lt;=&gt;</span>, over 1,536
          numbers instead of 2.
        </p>
      </div>
    </div>
  );
}
