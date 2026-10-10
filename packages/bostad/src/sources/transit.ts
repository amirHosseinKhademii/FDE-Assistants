/**
 * Västtrafik Planera Resa v4: nearest stop areas to a point.
 * OAuth2 client_credentials. Credentials come from the environment
 * (VASTTRAFIK_CLIENT_IDENTIFIER / VASTTRAFIK_CLIENT_SECRET) and are never
 * logged, echoed, or put into the returned `source`. Errors carry the HTTP
 * status only, never headers or the token.
 */

export interface TransitStop {
  name: string;
  id: string;
  lat: number;
  lon: number;
  distanceMeters: number;
}

export interface TransitResult {
  stops: TransitStop[];
  source: string;
}

const TOKEN_URL = "https://ext-api.vasttrafik.se/token";
export const VASTTRAFIK_LOCATIONS_URL =
  "https://ext-api.vasttrafik.se/pr/v4/locations/by-coordinates";

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

  const stops: TransitStop[] = [];
  for (const item of items) {
    // Location objects may nest the payload; accept the common v4 shape.
    const loc = (item.location ?? item) as Record<string, unknown>;
    const stopLat = Number(loc.latitude);
    const stopLon = Number(loc.longitude);
    if (!Number.isFinite(stopLat) || !Number.isFinite(stopLon)) continue;
    stops.push({
      name: String(loc.name ?? item.name ?? "unknown"),
      id: String(loc.id ?? loc.gid ?? loc.stopAreaGid ?? ""),
      lat: stopLat,
      lon: stopLon,
      distanceMeters: Math.round(haversineMeters(lat, lon, stopLat, stopLon)),
    });
  }
  if (items.length > 0 && stops.length === 0) {
    throw new Error("Västtrafik response had no usable coordinates");
  }
  stops.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { stops: stops.slice(0, limit), source: VASTTRAFIK_LOCATIONS_URL };
}
