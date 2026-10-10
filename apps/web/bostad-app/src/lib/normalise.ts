/**
 * Turns whatever /api/profile sent into a fully-shaped Profile. The server and
 * this client can be a build apart (a stale dev server, a cached response), so
 * every array defaults to [] and every field the UI reads is checked here, once,
 * rather than at each use. Anything that cannot be trusted becomes a failed
 * section with a reason, never a crash.
 */
import type { Profile, Section, TransitLine, TransitStop, TransportMode } from "@bostad/property";
import type { Mode } from "./transport";

type Loose = Record<string, unknown>;

const PRIMARY: Mode[] = ["tram", "train", "ferry", "bus"];
const ALL_MODES: TransportMode[] = [...PRIMARY, "other"];
const STATUSES = ["ok", "error", "unavailable"] as const;
const PRECISIONS = ["address", "street", "area"] as const;

function isObject(v: unknown): v is Loose {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** A timestamp the clock helpers can format. Anything else is replaced by the receive time. */
function isoOr(v: unknown, fallback: string): string {
  return typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : fallback;
}

function asMode(v: unknown): TransportMode {
  return ALL_MODES.includes(v as TransportMode) ? (v as TransportMode) : "other";
}

function normaliseLine(raw: unknown): TransitLine | null {
  if (!isObject(raw)) return null;
  const shortName = str(raw.shortName).trim();
  if (!shortName) return null;
  const colour = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
  return {
    shortName,
    mode: asMode(raw.mode),
    backgroundColor: colour(raw.backgroundColor),
    foregroundColor: colour(raw.foregroundColor),
    borderColor: colour(raw.borderColor),
    directions: arr(raw.directions).filter((d): d is string => typeof d === "string").slice(0, 3),
  };
}

function normaliseStop(raw: unknown): TransitStop | null {
  if (!isObject(raw)) return null;
  const lat = finite(raw.lat);
  const lon = finite(raw.lon);
  if (lat === null || lon === null) return null;
  const modes = arr(raw.modes).filter((m): m is Mode => PRIMARY.includes(m as Mode));
  const lines = arr(raw.lines)
    .map(normaliseLine)
    .filter((l): l is TransitLine => l !== null);
  return {
    name: str(raw.name, "unknown"),
    id: str(raw.id),
    lat,
    lon,
    distanceMeters: finite(raw.distanceMeters) ?? 0,
    // Sorted in display order, duplicates dropped.
    modes: PRIMARY.filter((m) => modes.includes(m)),
    lines,
  };
}

/** Wraps a raw section: keeps its status and metadata, runs `fix` on its data. */
function normaliseSection<T>(raw: unknown, receivedAt: string, fix: (data: unknown) => T | undefined): Section<T> {
  const r = isObject(raw) ? raw : {};
  const status = STATUSES.includes(r.status as (typeof STATUSES)[number])
    ? (r.status as Section<T>["status"])
    : "error";
  const base = {
    source: str(r.source),
    fetchedAt: isoOr(r.fetchedAt, receivedAt),
  };
  if (status !== "ok") {
    return { ...base, status, reason: typeof r.reason === "string" ? r.reason : undefined };
  }
  const data = fix(r.data);
  if (data === undefined) {
    return { ...base, status: "error", reason: "response had no usable data" };
  }
  return { ...base, status: "ok", data };
}

function normaliseLocation(data: unknown) {
  if (!isObject(data)) return undefined;
  const lat = finite(data.lat);
  const lon = finite(data.lon);
  if (lat === null || lon === null) return undefined;
  const precision = PRECISIONS.includes(data.precision as (typeof PRECISIONS)[number])
    ? (data.precision as (typeof PRECISIONS)[number])
    : "area"; // unknown precision: treat as the least exact, so risk and transport stay hidden
  return {
    lat,
    lon,
    displayName: str(data.displayName),
    source: str(data.source) as "nominatim.openstreetmap.org" | "photon.komoot.io",
    precision,
  };
}

function normaliseLandslide(data: unknown) {
  if (!isObject(data) || typeof data.inRiskArea !== "boolean") return undefined;
  return {
    inRiskArea: data.inRiskArea,
    features: arr(data.features)
      .filter(isObject)
      .map((f) => ({ attributes: isObject(f.attributes) ? f.attributes : {} })),
    source: str(data.source),
  };
}

function normaliseTransit(data: unknown) {
  if (!isObject(data)) return undefined;
  const stops = arr(data.stops)
    .map(normaliseStop)
    .filter((s): s is TransitStop => s !== null);
  return { stops, source: str(data.source) };
}

/**
 * The whole profile, or null when the body is not an object at all. Missing
 * sections come back as failed sections, so the UI always has all of them.
 */
export function normaliseProfile(raw: unknown, now: string = new Date().toISOString()): Profile | null {
  if (!isObject(raw)) return null;
  return {
    address: str(raw.address),
    location: normaliseSection(raw.location, now, normaliseLocation),
    landslide: normaliseSection(raw.landslide, now, normaliseLandslide),
    transit: normaliseSection(raw.transit, now, normaliseTransit),
    brf: normaliseSection<never>(raw.brf, now, () => undefined),
    energy: normaliseSection<never>(raw.energy, now, () => undefined),
  };
}
