import { useState } from 'react';
import type { StepVisual as Visual } from '../types';
import { highlightLine } from './highlight';
import { OutputPanel } from './CodeBlock';

/*
 * One renderer per visual kind. Pure React, inline SVG and CSS, no chart library.
 * Colors come from the course CSS variables, so light and dark mode both work.
 * The SVG viewBox is 340 units wide and the text is 11 units, so labels stay near 14px
 * on a desktop lesson column and shrink only a little on a 390px phone.
 */

const VB_W = 340;

function Caption({ text }: { text: string }) {
  return <figcaption className="viz-caption">{text}</figcaption>;
}

function BarsVisual({ v }: { v: Extract<Visual, { kind: 'bars' }> }) {
  const max = Math.max(...v.rows.map((r) => r.value), 1);
  return (
    <figure className="viz">
      <div className="viz-bars" role="img" aria-label={v.caption}>
        {v.rows.map((r) => (
          <div key={r.label} className={'viz-bar' + (r.highlight ? ' is-hi' : '')}>
            <span className="viz-bar-label">{r.label}</span>
            <span className="viz-bar-line">
              {/* The fill takes at most 78% of the row so the value label always fits at the bar end. */}
              <span className="viz-bar-fill" style={{ width: `${(r.value / max) * 78}%` }} />
              <span className="viz-bar-value">
                {r.value}
                {v.unit ? ` ${v.unit}` : ''}
              </span>
            </span>
          </div>
        ))}
      </div>
      <Caption text={v.caption} />
    </figure>
  );
}

// Label box width estimate for Inter at 11 units: about 6 units per character.
const CHAR_W = 6;

function PointsVisual({ v }: { v: Extract<Visual, { kind: 'points' }> }) {
  const W = VB_W;
  const H = 240;
  const P = { l: 16, r: 16, t: 14, b: 22 };
  const pts = v.points;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const xLo = Math.min(...xs);
  const xHi = Math.max(...xs);
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const xSpan = xHi - xLo || 1;
  const ySpan = yHi - yLo || 1;
  // Pad the domain by 8% so no dot sits on the axis.
  const sx = (x: number) => P.l + ((x - xLo + 0.08 * xSpan) / (1.16 * xSpan)) * (W - P.l - P.r);
  const sy = (y: number) => H - P.b - ((y - yLo + 0.08 * ySpan) / (1.16 * ySpan)) * (H - P.t - P.b);

  const groups = [...new Set(pts.map((p) => p.group).filter((g): g is string => Boolean(g)))];
  const groupClass = (p: (typeof pts)[number]) => {
    if (p.highlight) return 'is-hi';
    if (!p.group) return 'is-plain';
    return `is-g${(groups.indexOf(p.group) % 3) + 1}`;
  };

  // Greedy label placement: right of the dot, flipped left near the edge, nudged vertically to avoid overlaps.
  const placed: { x1: number; x2: number; y1: number; y2: number }[] = [];
  const labels = pts.map((p) => {
    const cx = sx(p.x);
    const cy = sy(p.y);
    const w = p.label.length * CHAR_W;
    const flip = cx + 7 + w > W - 4;
    const x1 = flip ? cx - 7 - w : cx + 7;
    const x2 = x1 + w;
    let baseline = cy + 4;
    for (const dy of [0, -12, 12, -24, 24]) {
      const b = cy + 4 + dy;
      const box = { x1, x2, y1: b - 9, y2: b + 3 };
      const clash = placed.some((o) => !(box.x2 < o.x1 || box.x1 > o.x2 || box.y2 < o.y1 || box.y1 > o.y2));
      if (!clash && b > 10 && b < H - 4) {
        baseline = b;
        break;
      }
    }
    placed.push({ x1, x2, y1: baseline - 9, y2: baseline + 3 });
    return { key: p.label, x: flip ? cx - 7 : cx + 7, y: baseline, anchor: (flip ? 'end' : 'start') as 'end' | 'start', text: p.label };
  });

  // Dashed link from each highlighted point to its nearest other point (distance in drawn pixels).
  const links: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  if (v.link) {
    pts.forEach((p, i) => {
      if (!p.highlight) return;
      let best = -1;
      let bestD = Infinity;
      pts.forEach((q, j) => {
        if (j === i) return;
        const d = Math.hypot(sx(q.x) - sx(p.x), sy(q.y) - sy(p.y));
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      });
      if (best >= 0) {
        links.push({ key: `${i}-${best}`, x1: sx(p.x), y1: sy(p.y), x2: sx(pts[best].x), y2: sy(pts[best].y) });
      }
    });
  }

  return (
    <figure className="viz">
      <svg className="viz-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={v.caption}>
        <line className="viz-axis" x1={P.l} y1={H - P.b} x2={W - P.r} y2={H - P.b} />
        <line className="viz-axis" x1={P.l} y1={P.t} x2={P.l} y2={H - P.b} />
        {links.map((k) => (
          <line key={k.key} className="viz-link" x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} />
        ))}
        {pts.map((p, i) => (
          <circle key={`${p.label}-${i}`} className={`viz-dot ${groupClass(p)}`} cx={sx(p.x)} cy={sy(p.y)} r={p.highlight ? 5 : 4} />
        ))}
        {labels.map((l) => (
          <text key={l.key} className={'viz-label' + (pts.find((p) => p.label === l.key)?.highlight ? ' is-hi' : '')} x={l.x} y={l.y} textAnchor={l.anchor}>
            {l.text}
          </text>
        ))}
      </svg>
      {groups.length ? (
        <ul className="viz-legend">
          {groups.map((g, i) => (
            <li key={g}>
              <span className={`viz-swatch is-g${(i % 3) + 1}`} aria-hidden="true" />
              {g}
            </li>
          ))}
        </ul>
      ) : null}
      <Caption text={v.caption} />
    </figure>
  );
}

function TableVisual({ v }: { v: Extract<Visual, { kind: 'table' }> }) {
  return (
    <figure className="viz">
      <div className="viz-table-wrap">
        <table className="viz-table">
          <thead>
            <tr>
              {v.columns.map((c, j) => (
                <th key={j} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.rows.map((row, i) => (
              <tr key={i} className={i === v.highlightRow ? 'is-hi' : undefined}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption text={v.caption} />
    </figure>
  );
}

function FlowVisual({ v }: { v: Extract<Visual, { kind: 'flow' }> }) {
  return (
    <figure className="viz">
      <ol className="viz-flow">
        {v.nodes.map((n, i) => (
          <li key={i} className="viz-flow-item">
            <span className="viz-flow-box">{n}</span>
            {i < v.nodes.length - 1 ? (
              <span className="viz-flow-arrow" aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <Caption text={v.caption} />
    </figure>
  );
}

function ChipsVisual({ v }: { v: Extract<Visual, { kind: 'chips' }> }) {
  return (
    <figure className="viz">
      <ul className="viz-chips">
        {v.items.map((c, i) => (
          <li key={i} className={'viz-chip' + (c.highlight ? ' is-hi' : '')}>
            <span className="viz-chip-text">{c.text}</span>
            {c.note ? <span className="viz-chip-note">{c.note}</span> : null}
          </li>
        ))}
      </ul>
      <Caption text={v.caption} />
    </figure>
  );
}

function CompareVisual({ v }: { v: Extract<Visual, { kind: 'compare' }> }) {
  const col = (c: { title: string; items: string[] }) => (
    <div className="viz-col">
      <p className="viz-col-title">{c.title}</p>
      <ul className="viz-col-list">
        {c.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <figure className="viz">
      <div className="viz-compare">
        {col(v.left)}
        {col(v.right)}
      </div>
      <Caption text={v.caption} />
    </figure>
  );
}

const LINE_COLORS = ['var(--accent)', 'var(--viz-2)', 'var(--viz-3)'];

/** A round axis step (1, 2 or 5 times a power of ten) that gives about four ticks. */
function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo || 1;
  const raw = span / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}

function LineVisual({ v }: { v: Extract<Visual, { kind: 'line' }> }) {
  const W = VB_W;
  const H = 250;
  const P = { l: 38, r: 14, t: 26, b: 34 };
  const series = v.series.slice(0, 3);
  const all = series.flatMap((s) => s.points);
  const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);
  const xLo = Math.min(...xs);
  const xHi = Math.max(...xs);
  const yTicks = niceTicks(Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)));
  const yLo = yTicks[0];
  const yHi = yTicks[yTicks.length - 1];
  const sx = (x: number) => P.l + ((x - xLo) / (xHi - xLo || 1)) * (W - P.l - P.r);
  const sy = (y: number) => H - P.b - ((y - yLo) / (yHi - yLo || 1)) * (H - P.t - P.b);
  // Keep at most seven x ticks so labels do not collide on a phone.
  const xTicks = xs.length > 7 ? xs.filter((_, i) => i % 2 === 0) : xs;

  return (
    <figure className="viz">
      <ul className="viz-legend">
        {series.map((s, i) => (
          <li key={s.name}>
            <span className="viz-swatch" style={{ background: LINE_COLORS[i] }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
      <svg className="viz-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={v.caption}>
        <text className="viz-tick" x={0} y={10}>
          {v.yLabel}
        </text>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="viz-grid" x1={P.l} y1={sy(t)} x2={W - P.r} y2={sy(t)} />
            <text className="viz-tick" x={P.l - 5} y={sy(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={x} className="viz-tick" x={sx(x)} y={H - P.b + 15} textAnchor="middle">
            {x}
          </text>
        ))}
        <text className="viz-tick" x={(P.l + W - P.r) / 2} y={H - 4} textAnchor="middle">
          {v.xLabel}
        </text>
        {series.map((s, i) => (
          <g key={s.name} style={{ color: LINE_COLORS[i] }}>
            <polyline className="viz-line" points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} stroke={LINE_COLORS[i]} />
            {s.points.map((p) => (
              <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={2.6} fill={LINE_COLORS[i]} />
            ))}
          </g>
        ))}
      </svg>
      <Caption text={v.caption} />
    </figure>
  );
}

export function StepVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'bars':
      return <BarsVisual v={visual} />;
    case 'points':
      return <PointsVisual v={visual} />;
    case 'table':
      return <TableVisual v={visual} />;
    case 'flow':
      return <FlowVisual v={visual} />;
    case 'chips':
      return <ChipsVisual v={visual} />;
    case 'compare':
      return <CompareVisual v={visual} />;
    case 'line':
      return <LineVisual v={visual} />;
  }
}

/** A short code example inside a "How it works" block: no window chrome, no line numbers, Copy in the corner, output below. */
export function StepSnippet({ snippet }: { snippet: { source: string; output?: string } }) {
  const [copied, setCopied] = useState(false);
  const lines = snippet.source.replace(/\n$/, '').split('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet.source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="course-code viz-snip">
      <button type="button" className="course-copy viz-snip-copy" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre className="viz-snip-pre">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="viz-snip-line">
              {line ? highlightLine(line) : ' '}
            </span>
          ))}
        </code>
      </pre>
      {snippet.output ? <OutputPanel output={snippet.output} /> : null}
    </div>
  );
}
