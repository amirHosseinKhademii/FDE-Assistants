/**
 * The hub on the firm's front page: one Veresk node at the centre, five demos
 * around it, and a pulse that runs along each line.
 *
 * The look is copied from the flow map in `@fde/uikit`: a faint tangle behind
 * the centre, a dim line for each connection, and a pulse that travels out to
 * the demo and back. The pulse coming back takes the colour of that demo.
 *
 * Two layouts are drawn and CSS shows one of them. Wide screens get the hub in
 * the middle with four demos in the corners and the fifth centred below. Phones
 * get the hub on top, the demos in a 2 by 2 grid under it, and the fifth centred
 * at the bottom. The lines are drawn in both, so they stay visible on a phone.
 *
 * Hovering or focusing a demo lights its own line and dims the others.
 * Reduced motion stops the pulses and keeps the lines.
 */
import { useState, type CSSProperties } from 'react';
import { AppIcon, type AppIconName } from './nav-icons';

export interface HubSpoke {
  id: string;
  name: string;
  sub: string;
  icon: AppIconName;
  /** Where the demo lives. Empty or null means it is not open from here. */
  href: string | null;
  /** A CSS colour for the return pulse and the highlighted line. */
  tone: string;
  /** Position on the wide layout, as percentages of the box. */
  desk: [number, number];
  /** Position on the phone layout, as percentages of the box. */
  mobile: [number, number];
}

const HUB_DESK: [number, number] = [50, 50];
const HUB_MOBILE: [number, number] = [50, 15];

/* ── The tangle behind the hub ─────────────────────────────────────────────
   Seeded, so it looks the same on every render. Points crowd toward the
   middle and thin out at the rim, which reads as depth rather than a mesh.
   ────────────────────────────────────────────────────────────────────────── */

/* Two decimals. Server and browser must print the same path strings, or React
   reports a hydration mismatch, and the last digits of a float differ. */
const r2 = (n: number) => Math.round(n * 100) / 100;

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
}

function tangle(cx: number, cy: number, rx: number, ry: number, count: number, seed: number): Point[] {
  const rnd = lcg(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const t = ((i + 0.5) / count) ** 0.62;
    const a = i * golden + rnd() * 0.8;
    const wobble = 0.86 + rnd() * 0.26;
    return {
      i,
      depth: t,
      x: r2(cx + rx * t * wobble * Math.cos(a)),
      y: r2(cy + ry * t * wobble * Math.sin(a)),
    };
  });
}

/* Near neighbours, plus a few long reaches across the body. A complete graph
   would be a grey smear. */
function tangleEdges(points: Point[]) {
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

/* A filament bows a little, so it reads as something grown rather than drawn. */
function bow(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  const amount = Math.min(3, len * 0.12) * (Math.round(a.x + b.y) % 2 === 0 ? 1 : -1);
  return `M${a.x} ${a.y} Q${r2(mx + (nx / len) * amount)} ${r2(my + (ny / len) * amount)} ${b.x} ${b.y}`;
}

/* A connection from the hub to a demo. It leaves and arrives level when the
   demo is to the side, and straight down or up when it is above or below. */
function spoke([ax, ay]: [number, number], [bx, by]: [number, number]): string {
  if (Math.abs(by - ay) > Math.abs(bx - ax)) {
    const my = (ay + by) / 2;
    return `M${ax} ${ay} C${ax} ${r2(my)}, ${bx} ${r2(my)}, ${bx} ${by}`;
  }
  const mx = (ax + bx) / 2;
  return `M${ax} ${ay} C${r2(mx)} ${ay}, ${r2(mx)} ${by}, ${bx} ${by}`;
}

/* The pulses stagger so one demo lights up after another, and the cycle is
   long enough that the hub never looks busy. */
const STAGGER_S = 1.1;

interface LayoutProps {
  variant: 'desk' | 'mobile';
  spokes: HubSpoke[];
  active: string | null;
  onActive: (id: string | null) => void;
}

function Layout({ variant, spokes, active, onActive }: LayoutProps) {
  const desk = variant === 'desk';
  const [hx, hy] = desk ? HUB_DESK : HUB_MOBILE;
  const rx = desk ? 15 : 34;
  const ry = desk ? 30 : 10;
  const points = tangle(hx, hy, rx, ry, desk ? 60 : 40, desk ? 20260913 : 7);
  const fibres = tangleEdges(points);

  return (
    <div className={`hub hub--${variant}`} role="group" aria-label="Five demos, connected to Veresk">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hub-svg" aria-hidden>
        <ellipse cx={hx} cy={hy} rx={rx * 1.1} ry={ry * 1.1} className="hub-glow" />
        <g className="hub-web">
          {fibres.map(({ a, b, far }) => (
            <path
              key={`f${a}-${b}`}
              d={bow(points[a], points[b])}
              className={far ? 'hub-fibre hub-fibre--far' : 'hub-fibre'}
              vectorEffect="non-scaling-stroke"
              style={{
                animationDelay: `${r2(0.4 + (((points[a].x + points[b].x) / 2 - (hx - rx)) / (2 * rx)) * 0.8)}s`,
              }}
            />
          ))}
        </g>
        {spokes.map((s, i) => {
          const d = spoke([hx, hy], desk ? s.desk : s.mobile);
          const dim = active !== null && active !== s.id;
          return (
            <g
              key={s.id}
              className="hub-edge"
              style={{ opacity: dim ? 0.12 : 1, ['--tone' as string]: s.tone } as CSSProperties}
            >
              <path d={d} pathLength={100} className="hub-base" vectorEffect="non-scaling-stroke" />
              <path
                d={d}
                pathLength={100}
                className="hub-pulse hub-pulse--out"
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${i * STAGGER_S}s` }}
              />
              <path
                d={d}
                pathLength={100}
                className="hub-pulse hub-pulse--back"
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${i * STAGGER_S + 1.6}s` }}
              />
            </g>
          );
        })}
      </svg>

      <div
        className="hub-card hub-card--core"
        style={{ left: `${hx}%`, top: `${hy}%` }}
      >
        <img src="/veresk-logo.svg" alt="" width={44} height={44} className="hub-logo" />
        <span className="hub-core-name">Veresk</span>
      </div>

      {spokes.map((s) => {
        const [x, y] = desk ? s.desk : s.mobile;
        const isActive = active === s.id;
        const dim = active !== null && !isActive;
        const style = {
          left: `${x}%`,
          top: `${y}%`,
          ['--tone' as string]: s.tone,
          opacity: dim ? 0.55 : 1,
        } as CSSProperties;
        const inner = (
          <>
            <span className="hub-card-top">
              <span className="hub-card-icon" style={{ color: s.tone }}>
                <AppIcon name={s.icon} size={18} />
              </span>
              <span className="hub-card-name">{s.name}</span>
            </span>
            <span className="hub-card-sub">{s.sub}</span>
            {!s.href && <span className="hub-card-note">Not open from here yet</span>}
          </>
        );
        const handlers = {
          onMouseEnter: () => onActive(s.id),
          onMouseLeave: () => onActive(null),
          onFocus: () => onActive(s.id),
          onBlur: () => onActive(null),
        };
        const classes = `hub-card hub-card--spoke${isActive ? ' is-active' : ''}${s.href ? '' : ' is-off'}`;
        if (!s.href) {
          return (
            <div key={s.id} className={classes} style={style} aria-disabled="true" tabIndex={0} {...handlers}>
              {inner}
            </div>
          );
        }
        return (
          <a key={s.id} href={s.href} className={classes} style={style} {...handlers}>
            {inner}
          </a>
        );
      })}
    </div>
  );
}

export function NeuralHub({ spokes }: { spokes: HubSpoke[] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="hub-wrap">
      <Layout variant="desk" spokes={spokes} active={active} onActive={setActive} />
      <Layout variant="mobile" spokes={spokes} active={active} onActive={setActive} />
    </div>
  );
}
