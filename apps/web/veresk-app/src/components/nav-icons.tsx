/**
 * One small line icon per engagement, drawn in `currentColor` so it takes the
 * same colour as the text beside it, including on hover.
 *
 * Sized for the nav at 16px by default. Stroke matches the house figures in
 * `flow/veresk-glyphs.tsx` (round caps and joins) so the two read as one set.
 */

import type { ReactElement } from 'react';

export type AppIconName =
  | 'pharma'
  | 'safety'
  | 'steering'
  | 'commerce'
  | 'learn'
  | 'connect'
  | 'ask'
  | 'proof'
  | 'measure'
  | 'prepare'
  | 'check'
  | 'act'
  | 'approve';

const paths: Record<AppIconName, ReactElement> = {
  /* Pharma: a flask, for the release desk and the lab-side estate. */
  pharma: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6l-5 9a2 2 0 0 0 1.8 3h6.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  /* Safety: a shield. */
  safety: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  /* Steering: a wheel, rim, hub and three spokes. */
  steering: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M9.5 13.5L4.5 15" />
      <path d="M14.5 13.5L19.5 15" />
      <path d="M12 14.5V21" />
    </>
  ),
  /* Commerce: a shopping bag with a handle. */
  commerce: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  /* Learn: an open book. */
  learn: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  /* How it works: plug, speech bubble, document with lines, checklist. */
  connect: (
    <>
      <path d="M9 3v4M15 3v4" />
      <path d="M7 7h10v4a5 5 0 0 1-10 0z" />
      <path d="M12 16v5" />
    </>
  ),
  ask: <path d="M4 5h16v11H9l-5 4z" />,
  proof: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  measure: (
    <>
      <path d="M5 6l2 2 3-3" />
      <path d="M5 15l2 2 3-3" />
      <path d="M13 7h6M13 16h6" />
    </>
  ),
  /* Agents: clipboard, tick in a circle, bolt, person. */
  prepare: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  act: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  approve: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

export function AppIcon({ name, size = 16 }: { name: AppIconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="inline-block shrink-0"
      style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      {paths[name]}
    </svg>
  );
}
