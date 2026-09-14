import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * A map of how something gets done: nodes, the calls between them, and a body
 * in the middle doing the thinking.
 *
 * WHAT IT KNOWS AND WHAT IT DOES NOT. It knows how to lay out a graph on a
 * fixed grid, draw curved fibres between nodes, run a pulse along each one in a
 * given order, turn a node over to show what is behind it, and fall back to a
 * readable stack when there is no room. It knows nothing about what any of that
 * MEANS: every node, edge, figure, word and colour arrives as a prop.
 *
 * THE TONE IS PROVENANCE, AND ONLY THE RETURN LEG CARRIES IT. A pulse travelling
 * OUT is neutral, because a request has no source; the pulse coming BACK takes
 * the tone of the node it came from. That is one of the few opinions baked in
 * here, and it is baked in because it is the reason the colour is on the map at
 * all — a consumer that wants colour to mean something else should not be using
 * `tone` for it.
 *
 * ORDER IS ENCODED TWICE. The pulses carry the sequence and a reduced-motion
 * setting stills them, so `stages` captions the columns in words as well. A
 * diagram that goes ambiguous for one reader is broken rather than plainer.
 *
 * THE REVEAL IS A BUTTON. Every node is focusable and clicking pins it open,
 * because a hover-only explanation is unreachable by keyboard and untappable on
 * a phone.
 */

export interface FlowNode {
  id: string;
  /** Drives sizing and the figure slot. Free-form; the consumer styles by it. */
  kind: string;
  /** The call sign. */
  name: string;
  /** What it is, in a few words. */
  sub: string;
  /** What it does, on the back face. */
  back: string;
  /** Position in the `viewBox`. */
  x: number;
  y: number;
  /** Horizontal clearance, so a fibre starts at the node's edge not its middle. */
  r: number;
  /** A CSS colour. Only nodes that are a SOURCE of facts should carry one. */
  tone?: string;
  /** A place in a sequence, shown as a numeral. */
  step?: number;
  /** Offsets the CARD from the point fibres attach to. For a node whose figure
   *  is drawn separately and is larger than its label — see `web`. */
  cardDy?: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  /** Seconds into the cycle at which this call fires. */
  at: number;
  /** An explicit path, for an edge the generic geometry cannot draw well. */
  d?: string;
  /** What travels this edge, written on it. */
  note?: string;
  /** Where that note sits, in `viewBox` units. */
  noteAt?: [number, number];
}

export interface FlowStage {
  title: string;
  ids: string[];
}

/** A tangle drawn behind one node, for the part of a system that is not a box. */
export interface FlowWeb {
  nodeId: string;
  rx: number;
  ry: number;
  /** How many points. Density, not a count of anything real. */
  points: number;
  /** Anything that makes this web differ from another on the same page. */
  seed?: number;
}

/* ── The tangle ────────────────────────────────────────────────────────────
   Deterministic: a seeded generator, so "organic" never means "different on
   every render" and a screenshot taken today matches one taken next year.
   ────────────────────────────────────────────────────────────────────────── */

function lcg(seed: number) {
  let v = seed;
  return () => {
    v = (v * 1103515245 + 12345) % 2147483648;
    return v / 2147483648;
  };
}

interface Point {
  i: number;
  x: number;
  y: number;
  depth: number;
  idle: number;
  phase: number;
}

/**
 * THREE DEPTHS, WHICH IS WHAT MAKES IT LOOK LIKE A BODY RATHER THAN A NET.
 * Points near the middle are larger, brighter and more connected; points at the
 * rim are small and faint. An even density reads as a mesh no matter how many
 * points there are — what the eye reads as depth is the gradient, not the count.
 */
function buildWeb(web: FlowWeb, cx: number, cy: number): Point[] {
  const rnd = lcg(web.seed ?? 20260913);
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: web.points }, (_, i) => {
    /* `** 0.62` rather than a square root: it pulls points inward, so the middle
       crowds and the rim thins instead of being uniformly dense. */
    const t = ((i + 0.5) / web.points) ** 0.62;
    const a = i * GOLDEN + rnd() * 0.8;
    const wobble = 0.86 + rnd() * 0.26;
    return {
      i,
      depth: t,
      x: cx + web.rx * t * wobble * Math.cos(a),
      y: cy + web.ry * t * wobble * Math.sin(a),
      idle: 2.6 + rnd() * 3.4,
      phase: rnd() * 4,
    };
  });
}

/**
 * Near neighbours, plus a handful of long reaches across the body.
 *
 * NEAREST-NEIGHBOUR ALONE LOOKS LIKE A NET. Every filament the same length
 * reads as a mesh; what makes a tangle look like a tangle is that a few
 * connections jump right across it. A complete graph, meanwhile, is a grey
 * smear — the point of drawing a web is that the filaments are individually
 * visible, so the degree stays low.
 */
function webEdges(points: Point[]) {
  const seen = new Set<string>();
  const out: Array<{ a: number; b: number; far: boolean }> = [];
  const add = (a: number, b: number, far: boolean) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ a, b, far });
  };
  points.forEach((p) => {
    const byDistance = points
      .filter((q) => q.i !== p.i)
      .sort((m, n) => Math.hypot(m.x - p.x, m.y - p.y) - Math.hypot(n.x - p.x, n.y - p.y));
    byDistance.slice(0, p.depth < 0.55 ? 3 : 2).forEach((q) => add(p.i, q.i, false));
    if (p.i % 4 === 0) add(p.i, byDistance[byDistance.length - 1 - (p.i % 5)].i, true);
  });
  return out;
}

/**
 * A filament bows slightly. Straight lines between scattered points read as a
 * diagram of a network; a bow reads as something grown. The bend comes from the
 * pair's own coordinates, so it is stable across renders.
 */
function bow(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  const amount = Math.min(10, len * 0.16) * (Math.round(a.x + b.y) % 2 === 0 ? 1 : -1);
  return `M${a.x} ${a.y} Q${mx + (nx / len) * amount} ${my + (ny / len) * amount} ${b.x} ${b.y}`;
}

export function FlowMap({
  nodes,
  edges,
  stages,
  web,
  nonEdges = [],
  width,
  height,
  cycle = 9,
  minWidth = '58rem',
  maxWidth = '68rem',
  figure,
  stackNote,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  stages: FlowStage[];
  web?: FlowWeb;
  /**
   * Pairs that are NOT connected, drawn as a short dash that never closes.
   * The absence of a link is often the thing a map exists to say, and an
   * absence drawn as nothing at all is indistinguishable from an oversight.
   */
  nonEdges?: Array<[string, string]>;
  width: number;
  height: number;
  /** Seconds for one pass of the sequence. */
  cycle?: number;
  minWidth?: string;
  maxWidth?: string;
  /** The drawing for a node. `inList` is the narrow surface, where a node that
   *  relies on something drawn behind it has nothing behind it. */
  figure: (node: FlowNode, inList: boolean) => ReactNode;
  /** A closing line for the narrow surface only. */
  stackNote?: ReactNode;
}) {
  const [grazed, setGrazed] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? grazed;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const centre = web ? byId.get(web.nodeId) : undefined;
  const points = web && centre ? buildWeb(web, centre.x, centre.y) : [];
  const fibres = points.length ? webEdges(points) : [];
  /* A subset sparks, not all of them: everything firing at once is a light show,
     and it would also claim that all of this is active all of the time. */
  const sparks = fibres.filter((_, i) => i % 3 === 0);
  const across = (x: number) =>
    web && centre ? (x - (centre.x - web.rx)) / (2 * web.rx) : 0;

  /**
   * A cubic with horizontal handles: a fibre leaves and arrives level.
   *
   * A near-vertical run gets a straight drop instead, because horizontal
   * handles on one produce a long lazy S across the picture. The TEST is
   * geometric so moving a node cannot leave an exception pointing at the wrong
   * edge; the BODY uses the source's own clearance, which is the part a caller
   * should know about if it ever stacks two nodes that are not the web.
   */
  const path = (e: FlowEdge): string => {
    if (e.d) return e.d;
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    if (Math.abs(b.x - a.x) < 60) {
      const sy = a.y + (b.y > a.y ? a.r : -a.r);
      const ty = b.y + (b.y > a.y ? -38 : 38);
      return `M ${a.x} ${sy} L ${b.x} ${ty}`;
    }
    const sx = a.x + a.r;
    const tx = b.x - b.r;
    const bend = (tx - sx) * 0.5;
    return `M ${sx} ${a.y} C ${sx + bend} ${a.y}, ${tx - bend} ${b.y}, ${tx} ${b.y}`;
  };

  const lit = (e: FlowEdge) => !active || e.from === active || e.to === active;

  return (
    <>
      {/* THE WIDE SURFACE. Scrolled rather than squeezed: a graph shrunk to a
          phone's width is a smudge that still costs a pinch-zoom. Below the
          breakpoint the stack replaces it entirely. */}
      <div className="ui-flow-scroll">
        <div
          className="ui-flow-stage"
          style={{ aspectRatio: `${width} / ${height}`, minWidth, maxWidth }}
          onMouseLeave={() => setGrazed(null)}
        >
          <svg viewBox={`0 0 ${width} ${height}`} className="ui-flow-svg" aria-hidden>
            {web && centre && (
              <g
                className="ui-flow-web"
                style={{ opacity: !active ? 1 : active === web.nodeId ? 1 : 0.14 }}
              >
                <ellipse
                  cx={centre.x}
                  cy={centre.y}
                  rx={web.rx * 1.05}
                  ry={web.ry * 1.05}
                  className="ui-flow-glow"
                />
                {fibres.map(({ a, b, far }) => (
                  <path
                    key={`f${a}-${b}`}
                    d={bow(points[a], points[b])}
                    className={far ? 'ui-flow-fibre ui-flow-fibre--far' : 'ui-flow-fibre'}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      animationDelay: `${0.45 + across((points[a].x + points[b].x) / 2) * 0.75}s`,
                      animationDuration: `${cycle}s`,
                    }}
                  />
                ))}
                {sparks.map(({ a, b }, i) => (
                  <path
                    key={`s${a}-${b}`}
                    d={bow(points[a], points[b])}
                    pathLength={100}
                    className="ui-flow-spark"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      animationDuration: `${2.4 + ((i * 7) % 11) * 0.32}s`,
                      animationDelay: `${((i * 13) % 17) * 0.29}s`,
                    }}
                  />
                ))}
                {points.map((p) => (
                  <circle
                    key={p.i}
                    cx={p.x}
                    cy={p.y}
                    r={p.depth < 0.4 ? 2.6 : p.depth < 0.75 ? 2 : 1.4}
                    className="ui-flow-synapse"
                    style={{
                      animationDuration: `${p.idle}s`,
                      animationDelay: `-${p.phase}s`,
                      opacity: 0.3 + (1 - p.depth) * 0.45,
                    }}
                  />
                ))}
              </g>
            )}

            {/* THE FIBRES. Each is drawn twice: a dim resting one, and a short
                bright dash travelling it. `pathLength` is normalised so the dash
                is the same fraction of every edge — without it a short hop's
                pulse is fast and a long one's slow, for no reason a reader could
                name. */}
            {edges.map((e) => {
              const d = path(e);
              const tone = byId.get(e.to)?.tone ?? 'var(--color-ui-dim)';
              return (
                <g
                  key={`${e.from}-${e.to}`}
                  className="ui-flow-edge"
                  style={{ opacity: lit(e) ? 1 : 0.1 }}
                >
                  <path
                    d={d}
                    pathLength={100}
                    fill="none"
                    stroke="var(--color-ui-line)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Out: neutral, because a request carries no provenance. */}
                  <path
                    className="ui-flow-pulse ui-flow-pulse--out"
                    d={d}
                    pathLength={100}
                    fill="none"
                    stroke="var(--color-ui-dim)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ animationDelay: `${e.at}s`, animationDuration: `${cycle}s` }}
                  />
                  {/* Back: the tone of wherever it was read from. */}
                  <path
                    className="ui-flow-pulse ui-flow-pulse--back"
                    d={d}
                    pathLength={100}
                    fill="none"
                    stroke={tone}
                    strokeWidth={2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ animationDelay: `${e.at + 1.6}s`, animationDuration: `${cycle}s` }}
                  />
                </g>
              );
            })}

            {edges
              .filter((e) => e.note)
              .map((e) => (
                <text
                  key={`n${e.from}-${e.to}`}
                  x={e.noteAt![0]}
                  y={e.noteAt![1]}
                  className="ui-flow-note"
                  style={{ opacity: lit(e) ? 1 : 0.12 }}
                >
                  {e.note}
                </text>
              ))}

            {/* THE GAPS THAT NEVER CLOSE. A short dash between two nodes that
                are NOT connected — the absence is the information. */}
            {nonEdges.map(([from, to]) => {
              const a = byId.get(from)!;
              const b = byId.get(to)!;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              return (
                <line
                  key={`${from}~${to}`}
                  x1={mx - (dx / len) * 9}
                  y1={my - (dy / len) * 9}
                  x2={mx + (dx / len) * 9}
                  y2={my + (dy / len) * 9}
                  stroke="var(--color-ui-line-lit)"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                  style={{ opacity: active ? 0.25 : 0.7 }}
                />
              );
            })}
          </svg>

          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              width={width}
              height={height}
              figure={figure}
              open={active === node.id}
              dimmed={!!active && active !== node.id}
              onGraze={setGrazed}
              onPin={() => setPinned((p) => (p === node.id ? null : node.id))}
            />
          ))}
        </div>

        <div className="ui-flow-stages" style={{ minWidth, maxWidth }}>
          {stages.map((stage, i) => (
            <span key={stage.title} className={i === stages.length - 1 ? 'ui-flow-stage-last' : undefined}>
              {stage.title}
            </span>
          ))}
        </div>
      </div>

      {/* NOT THE MAP MADE SMALLER. The wide version's content is its SHAPE, and
          none of that survives a narrow screen. So the narrow one gets the same
          walk AS a walk: every node in order, under the stage it belongs to,
          with its explanation already open. Both read the order from `stages`.

          NOTHING FLIPS HERE. A card that turns over answers "there is no room
          for both faces", and in a single column there is room for both. */}
      <ol className="ui-flow-list">
        {stages.map((stage) => (
          <li key={stage.title}>
            <h3 className="ui-flow-list-stage">{stage.title}</h3>
            <ul className="ui-flow-list-items">
              {stage.ids.map((id) => {
                const node = byId.get(id)!;
                return (
                  <li
                    key={id}
                    className="ui-flow-row"
                    style={node.tone ? ({ '--ui-tone': node.tone } as CSSProperties) : undefined}
                  >
                    <div className="ui-flow-row-head">
                      {figure(node, true)}
                      <div className="min-w-0">
                        <p className="ui-flow-row-name">{node.name}</p>
                        <p className="ui-flow-row-sub">{node.sub}</p>
                      </div>
                    </div>
                    <p className="ui-flow-row-back">{node.back}</p>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
        {stackNote && <p className="ui-flow-list-note">{stackNote}</p>}
      </ol>
    </>
  );
}

/**
 * One node: a button with two faces. Both faces are the same box, so the map
 * does not reflow when one opens — a diagram that shifts under the cursor is
 * unusable with a pointer and worse with a keyboard.
 */
function NodeCard({
  node,
  width,
  height,
  figure,
  open,
  dimmed,
  onGraze,
  onPin,
}: {
  node: FlowNode;
  width: number;
  height: number;
  figure: (node: FlowNode, inList: boolean) => ReactNode;
  open: boolean;
  dimmed: boolean;
  onGraze: (id: string | null) => void;
  onPin: () => void;
}) {
  return (
    <div
      className="ui-flow-node"
      style={{
        left: `${(node.x / width) * 100}%`,
        top: `${((node.y + (node.cardDy ?? 0)) / height) * 100}%`,
        zIndex: open ? 30 : 10,
      }}
    >
      <button
        type="button"
        onMouseEnter={() => onGraze(node.id)}
        onFocus={() => onGraze(node.id)}
        onBlur={() => onGraze(null)}
        onClick={onPin}
        aria-expanded={open}
        data-open={open}
        data-kind={node.kind}
        className={`ui-flow-card ${dimmed ? 'ui-flow-card--dim' : ''}`}
        style={node.tone ? ({ '--ui-tone': node.tone } as CSSProperties) : undefined}
      >
        <span className="ui-flow-face ui-flow-face--front">
          {node.step !== undefined && <span className="ui-flow-step">{node.step}</span>}
          {figure(node, false)}
          <span className="ui-flow-words">
            <span className="ui-flow-name">{node.name}</span>
            <span className="ui-flow-sub">{node.sub}</span>
          </span>
        </span>
        <span className="ui-flow-face ui-flow-face--back">
          <span className="ui-flow-back-text">{node.back}</span>
          {node.tone && <span className="ui-flow-back-tag">{node.sub}</span>}
        </span>
      </button>
    </div>
  );
}
