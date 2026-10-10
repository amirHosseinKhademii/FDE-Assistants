/**
 * Client-side rules for the Safety card. Level words compare a district's per-1 000 rate
 * with the city's: under 0.7x well below, under 0.9x below, up to 1.1x around, up to 1.3x
 * above, else well above. Neutral facts: only ok/warn colours, never red.
 */
import type { Tone } from "../components/ProfileCard";

/** The categories the card shows; keys match SafetyKey in packages/bostad. */
export const CHART_KEYS = ["all", "violence", "burglary", "carTheft", "theftFromCar", "bikeTheft", "vandalism", "fraud", "drugs"] as const;
export type CatKey = (typeof CHART_KEYS)[number];

export type SafetyLevel = "wellBelow" | "below" | "around" | "above" | "wellAbove";

export function levelOf(here: number | null | undefined, city: number | null | undefined): SafetyLevel | null {
  if (here === null || here === undefined || city === null || city === undefined || city <= 0) return null;
  const r = here / city;
  if (r < 0.7) return "wellBelow";
  if (r < 0.9) return "below";
  if (r <= 1.1) return "around";
  if (r <= 1.3) return "above";
  return "wellAbove";
}

export const LEVEL_TONE: Record<SafetyLevel, Tone | undefined> = {
  wellBelow: "ok",
  below: "ok",
  around: undefined,
  above: "warn",
  wellAbove: "warn",
};

/** A tidy upper bound for an axis: 1, 2, 2.5, 5 or 10 times a power of ten. */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}
