/**
 * Three overlapping conditions, and the failure that needs all three.
 *
 * ── WHY A DEDICATED DRAWING AND NOT `Path` ─────────────────────────────────
 *
 * `Path` draws a chain: A leads to B leads to C, and the claim is the route.
 * This is the opposite shape. Nothing leads anywhere — three conditions either
 * hold at once or they do not, and the failure lives where all three overlap.
 * A chain would have implied an ordering that does not exist and would have
 * hidden the only thing the figure is for: that removing ANY ONE of the three
 * removes the failure.
 *
 * ── `present: false` IS THE WHOLE REASON IT TAKES A FLAG ────────────────────
 *
 * The caption this was built for reads *"this repo is missing the third leg in
 * every engagement, deliberately"*, and a drawing that rendered all three the
 * same would make that sentence do work the picture contradicts. An absent set
 * is drawn DASHED, which is this site's existing convention for a join that
 * does not exist (`DESIGN.md` §6) — so the reader who already knows the site
 * reads it correctly without a legend.
 *
 * NOT A VENN GENERATED FROM DATA. Three fixed labels in fixed positions; the
 * areas mean nothing and are not proportional to anything. It is
 * `kind="illustration"` at every call site for that reason.
 *
 * NOTHING ENCODES A SERIES WITH A HUE. All three circles are `--lesson`; the
 * one that differs differs by being dashed and by saying so in its own label.
 */
export interface TrifectaSet {
  id: string;
  /** Two or three words. Drawn inside its circle. */
  label: string;
  /** What it is, concretely, in this repo. Drawn outside, in the list below. */
  example: string;
  /**
   * Whether this condition actually holds here.
   *
   * `false` draws the circle dashed and dims it. Defaults to `true`, so a
   * caller who forgets claims the condition IS present — which is the
   * pessimistic direction, and the right default for a threat model.
   */
  present?: boolean;
}

export function Trifecta({
  sets,
  centre,
  caption,
}: {
  /** Exactly three. More than three is not this diagram. */
  sets: [TrifectaSet, TrifectaSet, TrifectaSet];
  /** What happens where all three overlap. One word if possible. */
  centre: string;
  caption?: string;
}) {
  const W = 620;
  const H = 400;
  const r = 132;
  // A fixed equilateral arrangement. Hand-placed rather than computed: there
  // are exactly three and they never move.
  const at = [
    { cx: W / 2, cy: 148 },
    { cx: W / 2 - 112, cy: 258 },
    { cx: W / 2 + 112, cy: 258 },
  ];
  const labelAt = [
    { x: W / 2, y: 92 },
    { x: W / 2 - 150, y: 300 },
    { x: W / 2 + 150, y: 300 },
  ];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto w-full max-w-[34rem]"
        role="img"
        aria-label={`${sets.map((s) => `${s.label}${s.present === false ? ' (absent here)' : ''}`).join(', ')}. Where all three overlap: ${centre}.`}
      >
        {sets.map((s, i) => (
          <circle
            key={s.id}
            cx={at[i].cx}
            cy={at[i].cy}
            r={r}
            fill="var(--lesson)"
            fillOpacity={s.present === false ? 0.03 : 0.09}
            stroke="var(--lesson)"
            strokeWidth={1.25}
            strokeOpacity={s.present === false ? 0.45 : 0.85}
            strokeDasharray={s.present === false ? '5 4' : undefined}
          />
        ))}

        {/* The centre, which is the only text that is not a set name. */}
        <text
          x={W / 2}
          y={225}
          fontSize={13}
          textAnchor="middle"
          fill="var(--color-ui-fg)"
          style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          {centre}
        </text>

        {sets.map((s, i) => (
          <text
            key={s.id}
            x={labelAt[i].x}
            y={labelAt[i].y}
            fontSize={12.5}
            textAnchor="middle"
            fill={s.present === false ? 'var(--color-ui-faint)' : 'var(--color-ui-fg)'}
          >
            {s.label}
          </text>
        ))}
      </svg>

      {/* What each one is, concretely. In HTML because these are sentences and
          SVG has no wrapping — the same rule `Path` was rebuilt under. */}
      <ul className="mt-5 space-y-2 border-t border-ui-line pt-4">
        {sets.map((s) => (
          <li key={s.id} className="grid grid-cols-[0.75rem_1fr] gap-3">
            <span
              aria-hidden
              className="mt-[0.45rem] h-[0.4375rem] w-[0.4375rem] rounded-full"
              style={{
                background: s.present === false ? 'transparent' : 'var(--lesson)',
                boxShadow: s.present === false ? 'inset 0 0 0 1px var(--color-ui-faint)' : undefined,
              }}
            />
            <span className="text-[0.8125rem] leading-5 text-ui-dim">
              <span className={s.present === false ? 'text-ui-faint' : 'text-ui-fg'}>{s.label}</span>
              {s.present === false && <span className="text-ui-faint"> — not present here</span>}
              <span className="mt-0.5 block text-ui-faint">{s.example}</span>
            </span>
          </li>
        ))}
      </ul>

      {caption && <p className="mt-4 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-dim">{caption}</p>}
    </div>
  );
}
