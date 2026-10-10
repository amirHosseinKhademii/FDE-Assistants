/**
 * Turns the raw profile sections into what the UI shows: a check that either
 * succeeded (with data) or failed for one plain-words reason.
 */
import type { Profile, Section } from "@bostad/property";

export type Gate = "exact" | "inexact" | "none";
export type Reason = "notExact" | "noAddress" | "noMatch" | "sourceDown";
export type Check<T> =
  | { kind: "ok"; data: T; checkedAt: string; source: string }
  | { kind: "failed"; reason: Reason };

type Location = NonNullable<Profile["location"]["data"]>;

/**
 * "exact" when the geocoder matched a house. "inexact" when it matched only a
 * street or area: risk and transport must then be hidden. "none" when there is
 * no match at all.
 */
export function gateOf(profile: Profile): Gate {
  const location = profile.location.data;
  if (!location) return "none";
  return location.precision === "address" ? "exact" : "inexact";
}

export function locationCheck(profile: Profile): Check<Location> {
  const s = profile.location;
  if (s.status === "ok" && s.data) {
    return { kind: "ok", data: s.data, checkedAt: s.fetchedAt, source: s.source };
  }
  return { kind: "failed", reason: s.status === "error" ? "noMatch" : "sourceDown" };
}

export function gatedCheck<T>(section: Section<T>, gate: Gate): Check<T> {
  if (gate === "inexact") return { kind: "failed", reason: "notExact" };
  if (gate === "none") return { kind: "failed", reason: "noAddress" };
  if (section.status === "ok" && section.data !== undefined) {
    return { kind: "ok", data: section.data, checkedAt: section.fetchedAt, source: section.source };
  }
  if (section.status === "unavailable") return { kind: "failed", reason: "noAddress" };
  return { kind: "failed", reason: "sourceDown" };
}
