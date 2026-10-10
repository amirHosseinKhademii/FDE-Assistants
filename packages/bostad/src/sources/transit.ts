/**
 * Västtrafik Planera Resa v4: nearest stop areas to a point, and the lines that
 * leave each one. OAuth2 client_credentials. Credentials come from the environment
 * (VASTTRAFIK_CLIENT_IDENTIFIER / VASTTRAFIK_CLIENT_SECRET) and are never
 * logged, echoed, or put into the returned `source`. Errors carry the HTTP
 * status only, never headers or the token.
 */

export type TransportMode = "tram" | "bus" | "ferry" | "train" | "other";

/** Primary modes, in the order the UI lists them. "other" never appears in a stop's modes. */
export const MODE_ORDER: Exclude<TransportMode, "other">[] = ["tram", "train", "ferry", "bus"];

export interface TransitLine {
  shortName: string;
  mode: TransportMode;
  backgroundColor: string | null;
  foregroundColor: string | null;
  borderColor: string | null;
  /** Up to three destinations seen in the next two hours. */
  directions: string[];
}

export interface TransitStop {
  name: string;
  id: string;
  lat: number;
  lon: number;
  distanceMeters: number;
  /** Primary modes that serve the stop, in MODE_ORDER. Empty when departures were unavailable. */
  modes: Exclude<TransportMode, "other">[];
  /** Every distinct line seen in the departures, naturally sorted. */
  lines: TransitLine[];
}

export interface TransitResult {
  stops: TransitStop[];
  source: string;
}

const TOKEN_URL = "https://ext-api.vasttrafik.se/token";
export const VASTTRAFIK_LOCATIONS_URL =
  "https://ext-api.vasttrafik.se/pr/v4/locations/by-coordinates";
const STOP_AREAS_URL = "https://ext-api.vasttrafik.se/pr/v4/stop-areas";

async function fetchToken(): Promise<string> {
  const id = process.env.VASTTRAFIK_CLIENT_IDENTIFIER;
  const secret = process.env.VASTTRAFIK_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("credentials not set (VASTTRAFIK_CLIENT_IDENTIFIER / VASTTRAFIK_CLIENT_SECRET)");
  }
  const basic = Buffer.from(`${id}:${secret}`, "utf8").toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Västtrafik token HTTP ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Västtrafik token response has no access_token");
  }
  return json.access_token;
}

/** Great-circle distance in metres. */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Västtrafik's transportMode string to our four modes. Anything unknown is "other". */
export function normaliseMode(raw: unknown): TransportMode {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("tram")) return "tram";
  if (s.includes("ferry") || s.includes("boat")) return "ferry";
  if (s.includes("train") || s.includes("rail")) return "train";
  if (s.includes("bus")) return "bus";
  return "other";
}

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
/** Only a plain six-digit hex colour is kept: it is later written into CSS. */
function hexOrNull(value: unknown): string | null {
  return typeof value === "string" && HEX_COLOUR.test(value) ? value : null;
}

const naturalOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** Distinct lines leaving one stop area, from its departures in the next two hours. */
async function departureLines(token: string, stopAreaGid: string): Promise<TransitLine[]> {
  const params = new URLSearchParams({ limit: "40", timeSpanInMinutes: "120" });
  const res = await fetch(`${STOP_AREAS_URL}/${encodeURIComponent(stopAreaGid)}/departures?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Västtrafik departures HTTP ${res.status}`);
  }
  const body = (await res.json()) as { results?: unknown };
  const departures = Array.isArray(body.results) ? (body.results as Array<Record<string, unknown>>) : [];

  const byKey = new Map<string, TransitLine>();
  for (const dep of departures) {
    const journey = (dep.serviceJourney ?? {}) as Record<string, unknown>;
    const line = (journey.line ?? null) as Record<string, unknown> | null;
    if (!line) continue;
    const shortName = String(line.shortName ?? line.designation ?? "").trim();
    if (!shortName) continue;
    const mode = normaliseMode(line.transportMode);
    const key = `${mode}|${shortName}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        shortName,
        mode,
        backgroundColor: hexOrNull(line.backgroundColor),
        foregroundColor: hexOrNull(line.foregroundColor),
        borderColor: hexOrNull(line.borderColor),
        directions: [],
      };
      byKey.set(key, entry);
    }
    const direction = typeof journey.direction === "string" ? journey.direction.trim() : "";
    if (direction && entry.directions.length < 3 && !entry.directions.includes(direction)) {
      entry.directions.push(direction);
    }
  }
  return [...byKey.values()].sort((a, b) => naturalOrder.compare(a.shortName, b.shortName));
}

function primaryModes(lines: TransitLine[]): TransitStop["modes"] {
  const present = new Set(lines.map((l) => l.mode));
  return MODE_ORDER.filter((m) => present.has(m));
}

export async function nearestStops(lat: number, lon: number, limit = 5): Promise<TransitResult> {
  const token = await fetchToken();
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    radiusInMeters: "500",
    types: "stoparea",
    limit: String(limit),
  });
  const url = `${VASTTRAFIK_LOCATIONS_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Västtrafik locations HTTP ${res.status}`);
  }
  const body = (await res.json()) as unknown;
  const items: Array<Record<string, unknown>> = Array.isArray(body)
    ? (body as Array<Record<string, unknown>>)
    : Array.isArray((body as { results?: unknown }).results)
      ? ((body as { results: Array<Record<string, unknown>> }).results)
      : [];

  const found: Omit<TransitStop, "modes" | "lines">[] = [];
  for (const item of items) {
    // Location objects may nest the payload; accept the common v4 shape.
    const loc = (item.location ?? item) as Record<string, unknown>;
    const stopLat = Number(loc.latitude);
    const stopLon = Number(loc.longitude);
    if (!Number.isFinite(stopLat) || !Number.isFinite(stopLon)) continue;
    found.push({
      name: String(loc.name ?? item.name ?? "unknown"),
      id: String(loc.id ?? loc.gid ?? loc.stopAreaGid ?? ""),
      lat: stopLat,
      lon: stopLon,
      distanceMeters: Math.round(haversineMeters(lat, lon, stopLat, stopLon)),
    });
  }
  if (items.length > 0 && found.length === 0) {
    throw new Error("Västtrafik response had no usable coordinates");
  }
  found.sort((a, b) => a.distanceMeters - b.distanceMeters);

  // One departures call per stop, in parallel. A failed call only empties that stop's modes.
  const stops: TransitStop[] = await Promise.all(
    found.slice(0, limit).map(async (stop) => {
      let lines: TransitLine[] = [];
      if (stop.id) {
        lines = await departureLines(token, stop.id).catch(() => []);
      }
      return { ...stop, modes: primaryModes(lines), lines };
    }),
  );
  return { stops, source: VASTTRAFIK_LOCATIONS_URL };
}
