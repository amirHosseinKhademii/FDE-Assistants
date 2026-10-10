/**
 * Overpass (OpenStreetMap) lookups with mirror fallback: each public endpoint is
 * tried in turn, with a timeout per try. A failed try is never the last word:
 * the next mirror gets its turn, and only when all have failed does the caller
 * see an error.
 */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
export const OVERPASS_TIMEOUT_MS = 8000;
const USER_AGENT = "bostad-prototype/0.1 (learner prototype; OSM data)";

export async function overpassJson<T>(query: string, endpoints: string[] = OVERPASS_ENDPOINTS): Promise<T> {
  let lastError: unknown = new Error("no Overpass endpoint tried");
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status} from ${new URL(url).host}`);
      return (await res.json()) as T;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; value: unknown }>();

/**
 * Overpass with a 24 h in-memory cache per key (the caller rounds its point to a
 * grid). Only successful answers are kept; a failure is thrown and never cached.
 */
export async function overpassCached<T>(key: string, query: string): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await overpassJson<T>(query);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
  return value;
}
