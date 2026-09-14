/**
 * The two drawings that appear on every engagement's estate.
 *
 * WHY THESE TWO AND NOT THE REST. `nerve-glyphs.tsx` next door holds a reviewer
 * at a desk, three robot arms, a spanner — drawings of what MERIDIAN PHARMA's
 * product does, and meaningless on a bid team's page. A cylinder and a stack of
 * pages are different: every customer has stores of records and piles of
 * written material, so both estates draw them and neither owns them.
 *
 * TWO NAMES FOR THE SAME IDEA, and both are real. The nerve map sets `--node`
 * on a node it is drawing; `@fde/uikit` sets `--ui-tone` on a tile or a dialog.
 * These appear in both, so they read whichever is present and fall back to the
 * text colour where neither is.
 */

/**
 * A system of record. The cylinder is the oldest drawing in this industry for
 * "a database" and there is nothing to gain by being clever about it — the
 * reader should not have to learn a new symbol for the most familiar object on
 * the map.
 */
export function CylinderGlyph() {
  return (
    <svg viewBox="0 0 26 30" className="nerve-glyph" aria-hidden>
      <g fill="none" stroke="var(--ui-tone, var(--node, currentColor))" strokeWidth="1.4" strokeLinejoin="round">
        <ellipse
          cx="13"
          cy="6.5"
          rx="10"
          ry="3.8"
          fill="color-mix(in oklab, var(--ui-tone, var(--node, currentColor)) 16%, transparent)"
        />
        <path d="M3 6.5v17c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8v-17" />
        <path d="M3 12.7c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8" opacity="0.6" />
        <path d="M3 18.4c0 2.1 4.5 3.8 10 3.8s10-1.7 10-3.8" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * Written material rather than rows. Pages, not a cylinder — a thing searched
 * by meaning is not a thing queried by key, and drawing it as one more cylinder
 * would put it in a set it does not belong to. Pharma's `mrd_kb` and steering's
 * file corpus are both this shape.
 */
export function PagesGlyph() {
  return (
    <svg viewBox="0 0 26 30" className="nerve-glyph" aria-hidden>
      <g fill="none" stroke="var(--ui-tone, var(--node, currentColor))" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M4 7.5c4-2 8-2 9 0v17c-1-2-5-2-9 0z" />
        <path d="M22 7.5c-4-2-8-2-9 0v17c1-2 5-2 9 0z" />
        <path d="M13 7.5v17" opacity="0.5" />
      </g>
    </svg>
  );
}
