/**
 * The building footprint at an address, from OpenStreetMap (ODbL) via Overpass:
 * the building polygon that contains the geocoded point, or the nearest one
 * within 15 m. Used by noise to tell this building's facade points from the
 * neighbours'. Returns null when there is no building or the lookup fails: the
 * caller then falls back to nearest-cluster matching.
 */
import { overpassCached } from "./overpass";
import { polygonContains } from "./wfs";

export const FOOTPRINT_RADIUS_M = 15;

export interface Footprint {
  /** Outer ring as [lon, lat] pairs, closed (first point repeated last). */
  ring: [number, number][];
  /** True when the address point is inside the polygon, false when it is only the nearest one. */
  containsAddress: boolean;
  /** Metres from the address to the outline (0 when inside). */
  distanceMeters: number;
}

interface OsmWay {
  type?: string;
  id?: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

const METRES_PER_DEG = 111320;

/** Distance in metres from a point to a segment, on a local flat projection (fine at building scale). */
export function distanceToSegment(lat: number, lon: number, a: [number, number], b: [number, number]): number {
  const k = Math.cos((lat * Math.PI) / 180) * METRES_PER_DEG;
  const px = (lon - a[0]) * k;
  const py = (lat - a[1]) * METRES_PER_DEG;
  const bx = (b[0] - a[0]) * k;
  const by = (b[1] - a[1]) * METRES_PER_DEG;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return Math.hypot(px - bx * t, py - by * t);
}

/** Distance in metres from a point to the outline of a ring. */
export function distanceToRing(lat: number, lon: number, ring: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < ring.length; i++) {
    best = Math.min(best, distanceToSegment(lat, lon, ring[i], ring[i + 1]));
  }
  return best;
}

function ringArea(ring: [number, number][], lat: number): number {
  const k = Math.cos((lat * Math.PI) / 180) * METRES_PER_DEG;
  let area = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    area += ring[i][0] * k * (ring[i + 1][1] * METRES_PER_DEG) - ring[i + 1][0] * k * (ring[i][1] * METRES_PER_DEG);
  }
  return Math.abs(area / 2);
}

/** Picks the footprint for an address from the building ways Overpass returned. */
export function pickFootprint(ways: OsmWay[], lat: number, lon: number): Footprint | null {
  const rings: [number, number][][] = [];
  for (const w of ways) {
    if (!w.geometry || w.geometry.length < 4) continue;
    const ring = w.geometry.map((p) => [p.lon, p.lat] as [number, number]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
    rings.push(ring);
  }
  // A polygon that contains the point wins; the smallest one, if buildings sit inside each other.
  const containing = rings
    .filter((ring) => polygonContains({ type: "Polygon", coordinates: [ring] }, lon, lat))
    .sort((a, b) => ringArea(a, lat) - ringArea(b, lat));
  if (containing.length > 0) {
    return { ring: containing[0], containsAddress: true, distanceMeters: 0 };
  }
  let best: { ring: [number, number][]; d: number } | null = null;
  for (const ring of rings) {
    const d = distanceToRing(lat, lon, ring);
    if (d <= FOOTPRINT_RADIUS_M && (!best || d < best.d)) best = { ring, d };
  }
  return best ? { ring: best.ring, containsAddress: false, distanceMeters: Math.round(best.d * 10) / 10 } : null;
}

/** The building footprint at (lat, lon), or null when none is mapped nearby or Overpass cannot answer. */
export async function footprintAt(lat: number, lon: number): Promise<Footprint | null> {
  const query = [
    "[out:json][timeout:10];",
    `way["building"](around:${FOOTPRINT_RADIUS_M},${lat},${lon});`,
    "out geom;",
  ].join("\n");
  // Keyed on a ~50 m grid, so the same address (or a neighbour's point) reuses the answer.
  const key = `footprint:${Math.round(lat / 0.00045)},${Math.round(lon / 0.00045)}`;
  try {
    const body = await overpassCached<{ elements?: OsmWay[] }>(key, query);
    return pickFootprint(body.elements ?? [], lat, lon);
  } catch {
    return null;
  }
}

/** Facade points within `toleranceM` of the outline: the walls of this building, not its neighbours'. */
export function onFootprint<T extends { lat: number; lon: number }>(points: T[], footprint: Footprint, toleranceM = 3): T[] {
  return points.filter((p) => distanceToRing(p.lat, p.lon, footprint.ring) <= toleranceM);
}

