/**
 * The shapes.
 *
 * Deliberately GENERIC names — a box, a globe, a chip, an eye. What a box MEANS
 * is the consumer's business: one product reads it as a manufactured batch, the
 * next as a shipment or a parcel. Naming an icon after a domain concept is how
 * an icon set stops being reusable.
 */
import { iconProps, type IconProps } from './icon';

export function BoxIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18-2.5-2.7-2.5-15.3 0-18Z" />
    </svg>
  );
}

export function ChipIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.8 12.2 8-8M17 5l2 2M15 7l2 2" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

/** The select chevron. The package's own, because the native one cannot be aligned. */
export function ChevronIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function BlockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  );
}

/** A decision that belongs to a person. */
export function GavelIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3v6M9 21h6M12 9v12" />
      <path d="M7.5 5.5h9M6 9h12" />
    </svg>
  );
}

/** Something that could not be established — a broken ring. */
export function GapIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M12 3a9 9 0 0 1 0 18" strokeDasharray="2.5 3" />
      <path d="M12 3a9 9 0 0 0 0 18" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

/** An ordered list of steps — gates to pass, not a promise about the outcome. */
export function StepsIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

/**
 * A window — a person looking at a screen. Generic on purpose: the consumer
 * decides whether that screen is a browser, a kiosk or an operator console.
 */
export function WindowIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M6.5 6.5h.01M9.5 6.5h.01" />
    </svg>
  );
}

/** Stacked machines. A consumer may read it as its own servers, or its estate. */
export function ServerIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01" />
    </svg>
  );
}

/** Somewhere else. Whatever is outside the consumer's own walls. */
export function CloudIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M7 18a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6 1.02A3.5 3.5 0 0 1 17 18H7Z" />
    </svg>
  );
}

/* ── THE RUN FIGURES ────────────────────────────────────────────────────────
   Five marks for the five things a run costs. They are drawn on the same grid
   and stroke as everything above, which is the whole reason this file exists —
   a row of icons from two different sets cannot be optically aligned however
   much padding you give them.

   NONE OF THEM IS A LOGO OR A BRAND MARK. A coin, a clock, a loop, a spanner
   and a stack: each says what its number counts, so the label beside it can
   shrink on a phone without the row becoming unreadable. That is the job — the
   icon buys back the space the label gives up.
   ────────────────────────────────────────────────────────────────────────── */

/** Cost. A coin, not a dollar sign — the figure underneath is already in dollars. */
export function CoinIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M14.5 9.8a2.6 2.6 0 0 0-5 .9c0 2.4 5 1 5 3.4a2.6 2.6 0 0 1-5 .9" />
    </svg>
  );
}

/** Time. */
export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

/** Turns — one lap of the loop per turn. */
export function LoopIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M4.5 10.5a7.5 7.5 0 0 1 12.8-4.3L20 8.7" />
      <path d="M20 4.5v4.2h-4.2" />
      <path d="M19.5 13.5a7.5 7.5 0 0 1-12.8 4.3L4 15.3" />
      <path d="M4 19.5v-4.2h4.2" />
    </svg>
  );
}

/** Tool calls. */
export function WrenchIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <path d="M15.2 4.4a4.8 4.8 0 0 0-6 6L4.6 15a1.9 1.9 0 0 0 2.7 2.7l4.6-4.6a4.8 4.8 0 0 0 6-6l-2.6 2.6-2.3-.4-.4-2.3z" />
    </svg>
  );
}

/** Tokens — a stack of them, in and out. */
export function TokensIcon({ className }: IconProps) {
  return (
    <svg {...iconProps(className)}>
      <ellipse cx="12" cy="6.5" rx="7.5" ry="2.8" />
      <path d="M4.5 6.5v11c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-11" />
      <path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
    </svg>
  );
}
