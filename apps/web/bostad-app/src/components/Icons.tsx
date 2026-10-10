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
  // A house with a price tag: neighbourhood and price, one glyph.
  houseTag: ["M3 10.5L8.5 5.5 14 10.5", "M4.5 9.5V19h7.5", "M14.5 14.5l5-5h2.5v2.5l-5 5z", circle(19.2, 11.2, 0.8)],
  // Level badges (Area & prices): stroked arrows and a bar pair, centred on 12, 12.
  arrowUp: ["M12 19V5", "M6 11l6-6 6 6"],
  arrowDown: ["M12 5v14", "M6 13l6 6 6-6"],
  arrowUpDouble: ["M6 11l6-6 6 6", "M6 18l6-6 6 6"],
  arrowDownDouble: ["M6 6l6 6 6-6", "M6 13l6 6 6-6"],
  equals: ["M5 9.5h14", "M5 14.5h14"],
  // Safety categories, 24-unit grid, centred on 12, 12.
  alertTri: ["M12 4l9 16H3z", "M12 10v4", "M12 17v.5"],
  houseDoor: ["M4 11l8-7 8 7v9H4z", "M10 20v-5h4v5"],
  car: ["M3 12l2-6h14l2 6v4H3z", "M3 12h18", "M5.5 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", "M15.5 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0"],
  carWindow: ["M3 12l2-6h14l2 6v4H3z", "M3 12h18", "M10 6l-1 6", "M14 6l1 6", "M5.5 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", "M15.5 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0"],
  bike: ["M2.5 13.75a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0", "M14.5 13.75a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0", "M6 13.75l4-7h5l3 7", "M10 6.75h2"],
  burst: ["M12 3v4", "M12 17v4", "M3 12h4", "M17 12h4", "M5.6 5.6l2.8 2.8", "M15.6 15.6l2.8 2.8", "M5.6 18.4l2.8-2.8", "M15.6 8.4l2.8-2.8"],
  card: ["M3 6h18v12H3z", "M3 10h18", "M6 15h4"],
  pill: ["M4.2 13.8a4.9 4.9 0 0 0 6.9 6.9l8.7-8.7a4.9 4.9 0 0 0-6.9-6.9z", "M8.8 9.2l6 6"],
  shield: ["M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z"],
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
  // Neighbourhood (Safety card): school, trend, document, info, check in a circle.
  school: ["M3 10l9-5 9 5-9 5z", "M7 12.5V17c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-4.5", "M21 10v5"],
  trendUp: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  doc: ["M6 3h8l4 4v14H6z", "M14 3v4h4", "M9 12h6M9 16h6"],
  info: [circle(12, 12, 9), "M12 11v5.5", "M12 7.5v.5"],
  checkCircle: [circle(12, 12, 9), "M8 12.5l2.7 2.7L16 9.5"],
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
