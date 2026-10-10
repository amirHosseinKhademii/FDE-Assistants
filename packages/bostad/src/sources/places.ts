/**
 * Everyday places within PLACES_RADIUS_M, from OpenStreetMap via Overpass (ODbL).
 * The lookup goes through the shared Overpass client (mirror fallback, 10 s per
 * try) and its 24 h cache, keyed by grid cell (about 50 m): see overpass.ts.
 */
import { haversineMeters } from "./transit";
import { gridCell, overpassCached } from "./overpass";

export const PLACES_RADIUS_M = 500;
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

/** Overpass asks a little wider than the radius, around the grid cell centre (see gridCell). */
const PLACES_QUERY_RADIUS_M = PLACES_RADIUS_M + 50;

/** One Overpass filter over shop / amenity / leisure, then sorted by tag below. */
function query(lat: number, lon: number): string {
  return [
    "[out:json][timeout:10];",
    `nwr(around:${PLACES_QUERY_RADIUS_M},${lat},${lon})[~"^(shop|amenity|leisure)$"~"^(supermarket|pharmacy|school|kindergarten|park|doctors|clinic|hospital)$"];`,
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

export async function placesAt(lat: number, lon: number): Promise<PlacesResult> {
  const cell = gridCell(lat, lon);
  const body = await overpassCached<{ elements?: unknown }>("places", cell, query(cell.lat, cell.lon));
  if (!Array.isArray(body.elements)) throw new Error("Overpass response has no elements array");

  // Measured from the exact point; the query was wider so no item inside the radius is missed.
  const items = itemsFrom(body.elements as OverpassElement[], lat, lon).filter(
    (item) => item.distanceMeters <= PLACES_RADIUS_M,
  );
  return {
    radiusMeters: PLACES_RADIUS_M,
    ...summarise(items),
    items,
    source: "overpass-api.de",
  };
}
