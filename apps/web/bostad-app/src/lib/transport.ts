/**
 * Transport modes for the UI: the four primary modes, their pictograms, and the
 * colours. Light and dark fills are kept in step with the --mode-* tokens in
 * tokens.css. Google markers cannot read CSS variables, so the map takes its
 * hex values from MAP_COLOURS, picked per effective theme.
 */
import type { CSSProperties } from "react";
import type { TransitLine, TransitStop, TransportMode } from "@bostad/property";
import type { MessageKey } from "./i18n";

export type Mode = Exclude<TransportMode, "other">;
export type ModeFilter = "all" | Mode;

/** Display order everywhere: the same order the package sorts a stop's modes in. */
export const MODES: Mode[] = ["tram", "train", "ferry", "bus"];

export type MapStop = Pick<TransitStop, "id" | "name" | "lat" | "lon" | "distanceMeters" | "modes" | "lines">;

/**
 * Pictogram paths on a 24 x 24 grid, stroked with currentColor. Each drawing's
 * bounding box is centred on (12, 12): the same margin on every side, so a
 * pictogram sits in the middle of its circle (checked by pixels, see the
 * marker check in scratchpad).
 */
export const MODE_PATHS: Record<Mode, string[]> = {
  tram: [
    "M7 3h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M5 10.5h14",
    "M8 16l-1.5 5",
    "M16 16l1.5 5",
  ],
  train: [
    "M7 3h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M5 10.5h14",
    "M9 18l-2 3",
    "M15 18l2 3",
    "M9 6.5h6",
  ],
  ferry: [
    "M3 14.5h18l-2.5 4.5H5.5z",
    "M7 14.5V10h10v4.5",
    "M12 10V5",
    "M9.5 10h5",
  ],
  bus: [
    "M6 3.5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z",
    "M4 10.5h16",
    "M8 17.5v3",
    "M16 17.5v3",
  ],
};

/** The house pictogram for the home pin, on the same 24 x 24 grid. */
export const HOME_PATHS: string[] = ["M3.5 11.5L12 4l8.5 7.5", "M6 10v10h4v-5.5h4V20h4V10"];

export type Palette = { modes: Record<Mode, string>; ink: string; surface: string; text: string };

/** Mirrors the --mode-* tokens. Dark fills are lighter so they read on a dark map. */
export const MAP_COLOURS: Record<"light" | "dark", Palette> = {
  light: {
    modes: { tram: "#2E7DBE", train: "#7A4FB5", ferry: "#1F8A9E", bus: "#C4631E" },
    ink: "#FFFFFF",
    surface: "#FFFFFF",
    text: "#1E2328",
  },
  dark: {
    modes: { tram: "#6BB0E8", train: "#B69BE8", ferry: "#5CC7DA", bus: "#F09A5C" },
    ink: "#101417",
    surface: "#1B1F22",
    text: "#E8EAEC",
  },
};

export const MODE_KEY: Record<Mode, MessageKey> = {
  tram: "mode.tram",
  train: "mode.train",
  ferry: "mode.ferry",
  bus: "mode.bus",
};

export function isMode(value: string): value is Mode {
  return (MODES as string[]).includes(value);
}

/** Modes present across a set of stops, in display order. */
export function modesPresent(stops: Pick<TransitStop, "modes">[]): Mode[] {
  const seen = new Set<Mode>();
  for (const stop of stops) for (const m of stop.modes) seen.add(m);
  return MODES.filter((m) => seen.has(m));
}

export function stopMatches(stop: Pick<TransitStop, "modes">, filter: ModeFilter): boolean {
  return filter === "all" || stop.modes.includes(filter);
}

/** For each mode, the nearest stop that serves it. Closest first, at most `max`. */
export function nearestByMode(stops: MapStop[], max = 2): { mode: Mode; distanceMeters: number }[] {
  const best = new Map<Mode, number>();
  for (const stop of stops) {
    for (const mode of stop.modes) {
      const current = best.get(mode);
      if (current === undefined || stop.distanceMeters < current) best.set(mode, stop.distanceMeters);
    }
  }
  return [...best.entries()]
    .map(([mode, distanceMeters]) => ({ mode, distanceMeters }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, max);
}

/** Inline style for a line badge: Västtrafik's own colours, else the mode colour. */
export function lineBadgeStyle(line: TransitLine): CSSProperties {
  const fallbackBg = line.mode === "other" ? "var(--surface-2)" : `var(--mode-${line.mode})`;
  const fallbackFg = line.mode === "other" ? "var(--text)" : "var(--mode-ink)";
  return {
    background: line.backgroundColor ?? fallbackBg,
    color: line.foregroundColor ?? fallbackFg,
    boxShadow: line.borderColor ? `inset 0 0 0 1px ${line.borderColor}` : undefined,
  };
}
