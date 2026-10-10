/** Inline SVG icons (no icon library). Each icon is a list of path data. */

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const ICONS = {
  home: ["M4 11l8-7 8 7v9h-5v-6h-6v6H4z"],
  search: [circle(11, 11, 7), "M20 20l-3.5-3.5"],
  pin: ["M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z", circle(12, 9.5, 2.5)],
  mountain: ["M3 19l6-10 4 6 2-3 6 7z"],
  bus: ["M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M4 11h16", "M8 19v2", "M16 19v2"],
  building: ["M5 3h14v18H5z", "M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"],
  leaf: ["M5 19c0-8 5-13 14-14-1 9-6 14-14 14z", "M5 19l7-7"],
  tag: ["M3 12V4h8l10 10-8 8z", circle(7.5, 8, 1)],
  clipboard: ["M6 4h12v17H6z", "M9 4h6v3H9z", "M9 12h6M9 16h4"],
  sound: ["M4 9h3l5-4v14l-5-4H4z", "M16 9a4 4 0 0 1 0 6", "M19 6.5a8 8 0 0 1 0 11"],
  wave: ["M3 9c2 0 2-1.5 4.5-1.5S10 9 12 9s2-1.5 4.5-1.5S19 9 21 9", "M3 14c2 0 2-1.5 4.5-1.5S10 14 12 14s2-1.5 4.5-1.5S19 14 21 14", "M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2-1.5 4.5-1.5S19 19 21 19"],
  alert: [circle(12, 12, 9), "M12 7.5v5.5", "M12 16.5v.5"],
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  chevron: ["M6 9l6 6 6-6"],
  sun: [circle(12, 12, 4), "M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
  display: ["M3 5h18v11H3z", "M9 20h6", "M12 16v4"],
  external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "icon" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
