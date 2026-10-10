/**
 * Address geocoding, Sweden only. Nominatim (OpenStreetMap) first; if it has no
 * match, one retry with a normalised query, then Photon (komoot). Each provider
 * is asked at most once per lookup, and Nominatim calls are spaced >= 1 s apart.
 * Usage policy: identify the app in User-Agent.
 */
export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  /** Host of the provider that answered, e.g. "photon.komoot.io". */
  source: "nominatim.openstreetmap.org" | "photon.komoot.io";
}

export const NOMINATIM_USER_AGENT =
  "bostad-property-mvp/0.1 (Gothenburg property profile prototype; CLI, low volume)";

const NOMINATIM_SOURCE = "nominatim.openstreetmap.org" as const;
const PHOTON_SOURCE = "photon.komoot.io" as const;

/** Sweden's bounding box, minLon,minLat,maxLon,maxLat (Photon bbox order). */
const SWEDEN_BBOX = "10.5,55.2,24.3,69.2";

const NOMINATIM_MIN_GAP_MS = 1100;
let lastNominatimAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface NominatimHit { lat: string; lon: string; display_name: string }

async function nominatim(query: string): Promise<GeocodeResult | null> {
  const wait = lastNominatimAt + NOMINATIM_MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  const params = new URLSearchParams({ format: "json", countrycodes: "se", limit: "1", q: query });
  lastNominatimAt = Date.now();
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const hits = (await res.json()) as NominatimHit[];
  if (!Array.isArray(hits) || hits.length === 0) return null;
  const lat = Number(hits[0].lat);
  const lon = Number(hits[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("geocoding result has no usable coordinates");
  }
  return { lat, lon, displayName: hits[0].display_name, source: NOMINATIM_SOURCE };
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; street?: string; housenumber?: string; city?: string; countrycode?: string };
}

async function photon(query: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ q: query, limit: "1", lang: "default", bbox: SWEDEN_BBOX });
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  const body = (await res.json()) as { features?: PhotonFeature[] };
  const feature = body.features?.[0];
  if (!feature) return null;
  const [lon, lat] = feature.geometry?.coordinates ?? [NaN, NaN];
  const p = feature.properties ?? {};
  // Belt and braces: the bbox already restricts results, but the country code
  // is the authority on what counts as Sweden.
  if (p.countrycode?.toUpperCase() !== "SE") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("geocoding result has no usable coordinates");
  }
  const displayName = [[p.street, p.housenumber].filter(Boolean).join(" "), p.city]
    .filter(Boolean)
    .join(", ") || p.name || query;
  return { lat, lon, displayName, source: PHOTON_SOURCE };
}

/** Appends ", Sverige" when missing and strips apartment letters ("23 A" -> "23"). */
export function normaliseAddress(address: string): string {
  let q = address.trim().replace(/(\d+)\s*[A-Za-zÅÄÖåäö]\b/, "$1");
  if (!/sverige|sweden/i.test(q)) q = `${q}, Sverige`;
  return q;
}

export async function geocode(address: string): Promise<GeocodeResult> {
  const first = await nominatim(address);
  if (first) return first;

  const normalised = normaliseAddress(address);
  if (normalised !== address) {
    const retry = await nominatim(normalised);
    if (retry) return retry;
  }

  const fallback = await photon(normalised);
  if (fallback) return fallback;

  throw new Error("no geocoding match (nominatim, photon)");
}
