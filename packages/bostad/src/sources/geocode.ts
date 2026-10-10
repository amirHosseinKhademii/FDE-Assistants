/**
 * Nominatim (OpenStreetMap) address search, one result, Sweden only.
 * Usage policy: max 1 request/second, identify the app in User-Agent.
 */
export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export const NOMINATIM_USER_AGENT =
  "bostad-property-mvp/0.1 (Gothenburg property profile prototype; CLI, low volume)";

export async function geocode(address: string): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    format: "json",
    countrycodes: "se",
    limit: "1",
    q: address,
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }
  const hits = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!Array.isArray(hits) || hits.length === 0) {
    throw new Error("no geocoding match");
  }
  const hit = hits[0];
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("geocoding result has no usable coordinates");
  }
  return { lat, lon, displayName: hit.display_name };
}
