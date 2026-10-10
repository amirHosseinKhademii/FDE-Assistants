/**
 * Everyday places within 500 m, from OpenStreetMap via Overpass (ODbL). One
 * query per point, with a User-Agent and a 10 s timeout. Results are cached in
 * memory per point (about 11 m grid) for an hour: the cache is a convenience,
 * never a store, and only successful answers are kept.
 */
import { haversineMeters } from "./transit";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const PLACES_RADIUS_M = 500;
const TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;
const USER_AGENT = "bostad-prototype/0.1 (learner prototype; OSM data)";
const MAX_ITEMS = 80;

export type PlaceCategory = "grocery" | "pharmacy" | "school" | "preschool" | "park" | "health";
export const PLACE_CATEGORIES: PlaceCategory[] = ["grocery", "pharmacy", "school", "preschool", "park", "health"];

export interface PlaceItem {
  id: string;
  /** OSM name, or "" when the element has none. The UI shows the category instead. */
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  distanceMeters: number;
}

export interface PlacesResult {
  radiusMeters: number;
  counts: Record<PlaceCategory, number>;
  /** Closest item per category, when there is one. */
  nearest: Partial<Record<PlaceCategory, PlaceItem>>;
  items: PlaceItem[];
  source: string;
}

/** One Overpass filter over shop / amenity / leisure, then sorted by tag below. */
function query(lat: number, lon: number): string {
  return [
    "[out:json][timeout:10];",
    `nwr(around:${PLACES_RADIUS_M},${lat},${lon})[~"^(shop|amenity|leisure)$"~"^(supermarket|pharmacy|school|kindergarten|park|doctors|clinic|hospital)$"];`,
    "out center tags;",
  ].join("\n");
}

export function categoryOf(tags: Record<string, string> | undefined): PlaceCategory | null {
  if (!tags) return null;
  if (tags.shop === "supermarket") return "grocery";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (tags.amenity === "school") return "school";
  if (tags.amenity === "kindergarten") return "preschool";
  if (tags.leisure === "park") return "park";
  if (tags.amenity === "doctors" || tags.amenity === "clinic" || tags.amenity === "hospital") return "health";
  return null;
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

/** Turns Overpass elements into items around a point. Elements without a position are dropped. */
export function itemsFrom(elements: OverpassElement[], lat: number, lon: number): PlaceItem[] {
  const items: PlaceItem[] = [];
  for (const e of elements) {
    const category = categoryOf(e.tags);
    const pLat = e.lat ?? e.center?.lat;
    const pLon = e.lon ?? e.center?.lon;
    if (!category || typeof pLat !== "number" || typeof pLon !== "number") continue;
    items.push({
      id: `${e.type ?? "node"}/${e.id ?? items.length}`,
      name: String(e.tags?.name ?? "").trim(),
      category,
      lat: pLat,
      lon: pLon,
      distanceMeters: Math.round(haversineMeters(lat, lon, pLat, pLon)),
    });
  }
  return items.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, MAX_ITEMS);
}

export function summarise(items: PlaceItem[]): Pick<PlacesResult, "counts" | "nearest"> {
  const counts = Object.fromEntries(PLACE_CATEGORIES.map((c) => [c, 0])) as Record<PlaceCategory, number>;
  const nearest: Partial<Record<PlaceCategory, PlaceItem>> = {};
  for (const item of items) {
    counts[item.category] += 1;
    if (!nearest[item.category]) nearest[item.category] = item;
  }
  return { counts, nearest };
}

const cache = new Map<string, { at: number; value: PlacesResult }>();

export async function placesAt(lat: number, lon: number, now: number = Date.now()): Promise<PlacesResult> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.value;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ data: query(lat, lon) }).toString(),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const body = (await res.json()) as { elements?: unknown };
  if (!Array.isArray(body.elements)) throw new Error("Overpass response has no elements array");

  const items = itemsFrom(body.elements as OverpassElement[], lat, lon);
  const value: PlacesResult = {
    radiusMeters: PLACES_RADIUS_M,
    ...summarise(items),
    items,
    source: "overpass-api.de",
  };

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: now, value });
  return value;
}
