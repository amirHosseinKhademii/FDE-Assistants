/**
 * A short chain of nodes, with the document each hop came out of listed under
 * the drawing.
 *
 * ── WHY THIS IS NOT A GRAPH DRAWING ────────────────────────────────────────
 *
 * `docs/rag/GRAPH.md` §8 asks for a node-link figure and then says the thing
 * that decides its whole design: *not force-directed — the point is the PATH,
 * not the topology.* A force layout draws a hairball and invites the reader to
 * admire how connected everything is. The claim on that page is narrower and
 * much more useful: three hops exist, each is written down in a different file,
 * and no single file contains both ends — so the contradiction the page is
 * about is not in any passage and retrieval cannot return it.
 *
 * So the layout is FIXED, given as `x`/`y` in [0, 1] by the caller, and the
 * component refuses to be clever about it. A figure whose positions are decided
 * by a simulation is a figure that draws differently on every reload, which is
 * not what you want from something a page makes an argument about.
 *
 * ── THE PROVENANCE LIST IS HTML, UNDER THE DRAWING, AND THAT IS A BUG FIX ──
 *
 * `doc` used to be an SVG `<text>` centred under its own arrow. It collided:
 * `requirements/PRG-KST-K2/…` is far wider than the ~90px gap between two
 * boxes, so it ran underneath the node rectangles on both sides and the first
 * characters disappeared behind them. Found by screenshotting the page — the
 * typecheck passed and the geometry is invisible to it.
 *
 * SVG has no text metrics at render time, so there is no width to measure and
 * no wrapping to fall back on. This repo has already learned the only robust
 * fix once, on `BarRows`, and it is the same one here: **stop putting two
 * things on one line.** The hops are drawn; their sources are listed below in
 * ordinary HTML, where the browser can wrap them.
 *
 * `doc` IS REQUIRED. An edge without a provenance line is exactly the claim
 * this repo keeps catching itself making — a relationship asserted by a drawing
 * rather than by a file — and on a page arguing that the answer is a path
 * across documents, an unsourced hop would be the figure undermining its own
 * sentence.
 *
 * NOTHING HERE ENCODES A SERIES WITH A HUE. Every node and every edge is drawn
 * in `--lesson`; the node's KIND is carried by the word above it.
 */
export interface PathNode {
  id: string;
  /** What the box says. Kept to about 20 characters or it overruns its box. */
  label: string;
  /** Printed above the box, uppercase — requirement, claim, component, document. */
  type: string;
  /** Fractions of the plot, 0–1. Fixed by the caller; see the header. */
  x: number;
  y: number;
}

export interface PathEdge {
  source: string;
  target: string;
  /** The verb. "requires", "applies to", "was classified by". */
  label: string;
  /** The file this hop is written down in. REQUIRED — see the header. */
  doc: string;
}

export function Path({
  nodes,
  edges,
  caption,
}: {
  nodes: PathNode[];
  edges: PathEdge[];
  caption?: string;
}) {
  const W = 1000;
  const H = 120;
  const padX = 78;
  const boxW = 156;
  const boxH = 42;

  const at = (id: string) => {
    const n = nodes.find((p) => p.id === id);
    // A caller can only reach this by naming an edge endpoint that is not a
    // node, which is a typo in the figure data rather than a runtime condition.
    // Throwing beats drawing a line to (NaN, NaN), which renders as nothing at
    // all and looks like a hop the page decided to omit.
    if (!n) throw new Error(`Path: edge names unknown node ${id}`);
    return { cx: padX + n.x * (W - padX * 2), cy: 62 + n.y * 0 };
  };

  const nameOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={edges.map((e) => `${nameOf(e.source)} ${e.label} ${nameOf(e.target)}, from ${e.doc}`).join('. ')}
      >
        {edges.map((e) => {
          const a = at(e.source);
          const b = at(e.target);
          const x1 = a.cx + boxW / 2;
          const x2 = b.cx - boxW / 2;
          const mid = (x1 + x2) / 2;
          return (
            <g key={`${e.source}-${e.target}`}>
              <line x1={x1} y1={a.cy} x2={x2 - 7} y2={b.cy} stroke="var(--lesson)" strokeWidth={1.5} opacity={0.7} />
              {/* A plain triangle rather than a <marker>, because a marker
                  inherits none of the parent's colour in Safari and this whole
                  section is drawn from one custom property. */}
              <polygon
                points={`${x2},${b.cy} ${x2 - 8},${b.cy - 4} ${x2 - 8},${b.cy + 4}`}
                fill="var(--lesson)"
                opacity={0.7}
              />
              {/* The verb, and ONLY the verb. It is short by construction — the
                  file path that used to sit under here is in the list below. */}
              <text x={mid} y={a.cy - 10} fontSize={11.5} textAnchor="middle" fill="var(--color-ui-fg)">
                {e.label}
              </text>
            </g>
          );
        })}

        {nodes.map((n) => {
          const { cx, cy } = at(n.id);
          return (
            <g key={n.id}>
              <text
                x={cx}
                y={cy - boxH / 2 - 10}
                fontSize={10}
                textAnchor="middle"
                fill="var(--lesson)"
                style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {n.type}
              </text>
              <rect
                x={cx - boxW / 2}
                y={cy - boxH / 2}
                width={boxW}
                height={boxH}
                rx={8}
                fill="var(--color-ui-raised)"
                stroke="var(--lesson)"
                strokeWidth={1}
              />
              <text x={cx} y={cy + 4.5} fontSize={12.5} textAnchor="middle" fill="var(--color-ui-fg)">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* WHERE EACH HOP IS WRITTEN DOWN. In HTML rather than in the drawing, so
          a long path wraps instead of running under a node box. */}
      <ol className="mt-4 space-y-2 border-t border-ui-line pt-4">
        {edges.map((e, i) => (
          <li key={`${e.source}-${e.target}`} className="grid grid-cols-[1.25rem_1fr] gap-3">
            <span className="font-mono text-[0.6875rem] leading-5" style={{ color: 'var(--lesson)' }}>
              {i + 1}
            </span>
            <span className="text-[0.8125rem] leading-5 text-ui-dim">
              <span className="text-ui-fg">{nameOf(e.source)}</span> {e.label}{' '}
              <span className="text-ui-fg">{nameOf(e.target)}</span>
              <span className="mt-0.5 block font-mono text-[0.75rem] break-words text-ui-faint">{e.doc}</span>
            </span>
          </li>
        ))}
      </ol>

      {caption && <p className="mt-4 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-dim">{caption}</p>}
    </div>
  );
}
