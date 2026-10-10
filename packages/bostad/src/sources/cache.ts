/**
 * A 24 h in-memory cache keyed by grid cell (see gridCell in overpass.ts). Only
 * successful answers are kept; a thrown error is never cached. Server-side only:
 * it lives in the server process and is never a store.
 */
import type { GridCell } from "./overpass";

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const entries = new Map<string, { at: number; value: unknown }>();

export async function cachedByCell<T>(namespace: string, cell: GridCell, load: () => Promise<T>): Promise<T> {
  const key = `${namespace}:${cell.key}`;
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await load();
  if (entries.size >= CACHE_MAX) entries.delete(entries.keys().next().value as string);
  entries.set(key, { at: Date.now(), value });
  return value;
}
