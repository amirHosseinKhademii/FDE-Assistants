/**
 * One small line icon per engagement, drawn in `currentColor` so it takes the
 * same colour as the text beside it, including on hover.
 *
 * Sized for the nav at 16px. Stroke matches the house figures in
 * `flow/veresk-glyphs.tsx` (round caps and joins) so the two read as one set.
 */

import type { ReactElement } from 'react';

export type AppIconName = 'pharma' | 'safety' | 'steering' | 'commerce' | 'learn';

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
};

export function AppIcon({ name }: { name: AppIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      aria-hidden
      className="inline-block shrink-0"
      style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      {paths[name]}
    </svg>
  );
}
