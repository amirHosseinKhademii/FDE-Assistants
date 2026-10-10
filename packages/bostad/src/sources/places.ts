/**
 * Everyday places within PLACES_RADIUS_M (1.5 km), from OpenStreetMap via
 * Overpass (ODbL). The lookup goes through the shared Overpass client (mirror
 * fallback, 10 s per try) and its 24 h cache, keyed by grid cell (about 50 m).
 *
 * Per category the result keeps the nearest few items (for the map pins) and a
 * count within COUNT_RADIUS_M (500 m). Nearest is never cut by a global limit,
 * so a grocery store 900 m away still shows as the nearest one.
 */
import { haversineMeters } from "./transit";
import { gridCell, overpassCached } from "./overpass";
import { cachedByCell } from "./cache";

export const PLACES_RADIUS_M = 1500;
export const COUNT_RADIUS_M = 500;
/** Items kept per category: the nearest few, enough for the map pins. */
const KEEP_PER_CATEGORY = 3;

export type PlaceCategory =
  | "grocery"
  | "pharmacy"
  | "health"
  | "school"
  | "preschool"
  | "park"
  | "gym"
  | "eatery";
/** Categories a user can browse as rows and chips. Gym and eatery are counts only. */
export const PLACE_CATEGORIES: PlaceCategory[] = [
  "grocery",
  "pharmacy",
  "health",
  "school",
  "preschool",
  "park",
  "gym",
  "eatery",
];
export const BROWSABLE_CATEGORIES: PlaceCategory[] = ["grocery", "pharmacy", "health", "school", "preschool", "park"];

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
  countRadiusMeters: number;
  /** Items within COUNT_RADIUS_M, per category. */
  counts: Record<PlaceCategory, number>;
  /** Who answered: GOOGLE_SOURCE (Google Places, the primary) or OVERPASS_SOURCE (fallback). */
  source: string;
  /** Closest item per category within PLACES_RADIUS_M, when there is one. */
  nearest: Partial<Record<PlaceCategory, PlaceItem>>;
  /** The nearest few per category (map pins). Sorted by distance within each category. */
  items: PlaceItem[];
}

/** Each category as its own tag filters; one Overpass union, so every tag is an exact match. */
const TAG_FILTERS: { category: PlaceCategory; filters: string[] }[] = [
  {
    category: "grocery",
    filters: [`["shop"="supermarket"]`, `["shop"="convenience"]`, `["shop"="greengrocer"]`],
  },
  { category: "pharmacy", filters: [`["amenity"="pharmacy"]`] },
  {
    category: "health",
    filters: [`["amenity"="doctors"]`, `["amenity"="clinic"]`, `["amenity"="hospital"]`, `["healthcare"]`],
  },
  { category: "school", filters: [`["amenity"="school"]`] },
  { category: "preschool", filters: [`["amenity"="kindergarten"]`] },
  { category: "park", filters: [`["leisure"="park"]`] },
  { category: "gym", filters: [`["leisure"="fitness_centre"]`] },
  { category: "eatery", filters: [`["amenity"="restaurant"]`, `["amenity"="cafe"]`] },
];

/** Overpass asks a little wider than the radius, around the grid cell centre (see gridCell). */
const PLACES_QUERY_RADIUS_M = PLACES_RADIUS_M + 50;

export function query(lat: number, lon: number): string {
  const around = `(around:${PLACES_QUERY_RADIUS_M},${lat},${lon})`;
  const lines = TAG_FILTERS.flatMap(({ filters }) => filters.map((f) => `nwr${f}${around};`));
  return ["[out:json][timeout:10];", "(", ...lines, ");", "out center tags;"].join("\n");
}

/** The category of an element, by its tags. Order matters only when an element matches two. */
export function categoryOf(tags: Record<string, string> | undefined): PlaceCategory | null {
  if (!tags) return null;
  if (tags.shop === "supermarket" || tags.shop === "convenience" || tags.shop === "greengrocer") return "grocery";
  if (tags.amenity === "pharmacy") return "pharmacy";
  if (tags.amenity === "school") return "school";
  if (tags.amenity === "kindergarten") return "preschool";
  if (tags.leisure === "park") return "park";
  if (tags.leisure === "fitness_centre") return "gym";
  if (tags.amenity === "restaurant" || tags.amenity === "cafe") return "eatery";
  if (tags.amenity === "doctors" || tags.amenity === "clinic" || tags.amenity === "hospital" || tags.healthcare) {
    return "health";
  }
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

/** Turns Overpass elements into items around a point. Elements without a position are dropped. Duplicates (same OSM element) are merged. */
export function itemsFrom(elements: OverpassElement[], lat: number, lon: number): PlaceItem[] {
  const seen = new Set<string>();
  const items: PlaceItem[] = [];
  for (const e of elements) {
    const category = categoryOf(e.tags);
    const pLat = e.lat ?? e.center?.lat;
    const pLon = e.lon ?? e.center?.lon;
    if (!category || typeof pLat !== "number" || typeof pLon !== "number") continue;
    const id = `${e.type ?? "node"}/${e.id ?? items.length}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      name: String(e.tags?.name ?? "").trim(),
      category,
      lat: pLat,
      lon: pLon,
      distanceMeters: Math.round(haversineMeters(lat, lon, pLat, pLon)),
    });
  }
  return items;
}

/**
 * Counts within COUNT_RADIUS_M and the nearest few per category, computed over
 * every item before anything is cut. Items must already be within PLACES_RADIUS_M.
 */
export function summarise(all: PlaceItem[]): Pick<PlacesResult, "counts" | "nearest" | "items"> {
  const counts = Object.fromEntries(PLACE_CATEGORIES.map((c) => [c, 0])) as Record<PlaceCategory, number>;
  const byCategory = new Map<PlaceCategory, PlaceItem[]>();
  for (const item of [...all].sort((a, b) => a.distanceMeters - b.distanceMeters)) {
    if (item.distanceMeters <= COUNT_RADIUS_M) counts[item.category] += 1;
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const nearest: Partial<Record<PlaceCategory, PlaceItem>> = {};
  const items: PlaceItem[] = [];
  for (const category of PLACE_CATEGORIES) {
    const list = byCategory.get(category) ?? [];
    if (list[0]) nearest[category] = list[0];
    items.push(...list.slice(0, KEEP_PER_CATEGORY));
  }
  return { counts, nearest, items };
}

/** Google Places (New) Nearby Search types per category. Each category is one request, nearest first. */
export const GOOGLE_URL = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_TYPES: Record<PlaceCategory, string[]> = {
  grocery: ["supermarket", "grocery_store", "convenience_store"],
  pharmacy: ["pharmacy"],
  health: ["doctor", "hospital", "dentist"],
  school: ["primary_school", "secondary_school"],
  preschool: ["preschool"],
  park: ["park"],
  gym: ["gym"],
  eatery: ["restaurant", "cafe"],
};
const GOOGLE_PER_CATEGORY = 5;
export const GOOGLE_SOURCE = "places.googleapis.com";
export const OVERPASS_SOURCE = "overpass-api.de";

/** One place as Google returns it, kept with its category so the cache holds only what we need. */
interface GooglePlace {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
}

/**
 * One Nearby Search for one category, around the grid cell centre. The key is
 * sent only in the header and the server environment; a failure reports the
 * HTTP status, never the request.
 */
async function googleCategory(category: PlaceCategory, lat: number, lon: number, key: string): Promise<GooglePlace[]> {
  const res = await fetch(GOOGLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location",
    },
    body: JSON.stringify({
      includedTypes: GOOGLE_TYPES[category],
      maxResultCount: GOOGLE_PER_CATEGORY,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lon }, radius: PLACES_QUERY_RADIUS_M } },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status} (${category})`);
  const body = (await res.json()) as {
    places?: { id?: string; displayName?: { text?: string }; location?: { latitude?: number; longitude?: number } }[];
  };
  const out: GooglePlace[] = [];
  for (const p of body.places ?? []) {
    const pLat = p.location?.latitude;
    const pLon = p.location?.longitude;
    if (typeof pLat !== "number" || typeof pLon !== "number") continue;
    out.push({ id: String(p.id ?? `${pLat},${pLon}`), name: String(p.displayName?.text ?? "").trim(), category, lat: pLat, lon: pLon });
  }
  return out;
}

/** Google first, for all categories at once, cached per grid cell. Throws if any category fails. */
async function googlePlaces(lat: number, lon: number, key: string): Promise<GooglePlace[]> {
  const cell = gridCell(lat, lon);
  return cachedByCell("places-google", cell, async () => {
    const lists = await Promise.all(PLACE_CATEGORIES.map((c) => googleCategory(c, cell.lat, cell.lon, key)));
    return lists.flat();
  });
}

function resultFrom(all: PlaceItem[], source: string): PlacesResult {
  return {
    radiusMeters: PLACES_RADIUS_M,
    countRadiusMeters: COUNT_RADIUS_M,
    ...summarise(all),
    source,
  };
}

export async function placesAt(lat: number, lon: number): Promise<PlacesResult> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (key) {
    try {
      const found = await googlePlaces(lat, lon, key);
      const all: PlaceItem[] = found
        .map((g) => ({
          id: `g/${g.id}`,
          name: g.name,
          category: g.category,
          lat: g.lat,
          lon: g.lon,
          distanceMeters: Math.round(haversineMeters(lat, lon, g.lat, g.lon)),
        }))
        .filter((item) => item.distanceMeters <= PLACES_RADIUS_M);
      return resultFrom(all, GOOGLE_SOURCE);
    } catch {
      // Google unavailable or refused: the Overpass path below answers instead.
    }
  }

  const cell = gridCell(lat, lon);
  const body = await overpassCached<{ elements?: unknown }>("places", cell, query(cell.lat, cell.lon));
  if (!Array.isArray(body.elements)) throw new Error("Overpass response has no elements array");

  // Measured from the exact point; the query was wider, so nothing inside the radius is missed.
  const all = itemsFrom(body.elements as OverpassElement[], lat, lon).filter(
    (item) => item.distanceMeters <= PLACES_RADIUS_M,
  );
  return resultFrom(all, OVERPASS_SOURCE);
}
