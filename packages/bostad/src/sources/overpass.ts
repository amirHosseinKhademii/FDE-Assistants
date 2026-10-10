/**
 * Overpass (OpenStreetMap) lookups with mirror fallback. Every lookup goes to
 * the same three endpoints in order, 10 s per try; the next mirror gets its turn
 * after any failure, and only when all have failed does the caller see an error.
 *
 * Checked 2026-10-10: overpass-api.de answers a POST with no Accept header (an
 * Accept: application/json header makes Apache answer 406 there, so it is not
 * sent). overpass.private.coffee and overpass.kumi.systems answered HTTP 500 to
 * every request in that check; they stay in the list so they take over if they
 * recover.
 *
 * Answers are cached for 24 h per grid cell (about 50 m, see gridCell). Only
 * successful answers are kept; a failure is thrown and never cached.
 */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
export const OVERPASS_TIMEOUT_MS = 10000;
const USER_AGENT = "bostad-prototype/0.1 (learner prototype; OSM data)";

export async function overpassJson<T>(query: string, endpoints: string[] = OVERPASS_ENDPOINTS): Promise<T> {
  const failures: string[] = [];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status} from ${new URL(url).host}`);
      return (await res.json()) as T;
    } catch (e) {
      failures.push(`${new URL(url).host}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`all Overpass mirrors failed (${failures.join("; ")})`);
}

/**
 * The grid cell a point falls in (about 50 m on a side). Lookups ask Overpass
 * around the cell centre, not the exact point, so every address in a cell gets
 * the same cached answer; callers then measure from the exact point.
 */
export interface GridCell {
  key: string;
  lat: number;
  lon: number;
}

const CELL_LAT_DEG = 0.00045; // about 50 m north-south

export function gridCell(lat: number, lon: number): GridCell {
  const cellLon = CELL_LAT_DEG / Math.cos((lat * Math.PI) / 180);
  const i = Math.round(lat / CELL_LAT_DEG);
  const j = Math.round(lon / cellLon);
  return { key: `${i},${j}`, lat: i * CELL_LAT_DEG, lon: j * cellLon };
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; value: unknown }>();

/**
 * Overpass with a 24 h in-memory cache per key. `namespace` separates query kinds
 * that share a grid cell (footprint, places).
 */
export async function overpassCached<T>(namespace: string, cell: GridCell, query: string): Promise<T> {
  const key = `${namespace}:${cell.key}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await overpassJson<T>(query);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}
