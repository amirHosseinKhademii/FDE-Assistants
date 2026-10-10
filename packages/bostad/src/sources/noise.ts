/**
 * Road and tram noise, Göteborg 2023 (Miljöförvaltningen). Two free WFS layers
 * on the city's geoserver, asked with bbox in lat,lon order and EPSG:4326:
 *
 *  - facade points: modelled dB(A) on building walls, per floor. The building
 *    is the cluster of facade points nearest the address (single-link, 5 m),
 *    searched within 25 m.
 *  - LAeq contours: the dB(A) band (min..max) that contains the address point.
 *
 * Licence not verified: the layers are named "interna_berakningar". Ask the
 * city before any commercial use.
 */
import { haversineMeters } from "./transit";

export const NOISE_WFS_URL =
  "https://geoserverextern.miljoforvaltningen.goteborg.se/geoserver/miljoovervakning_buller_v1/ows";
export const NOISE_FACADE_LAYER = "miljoovervakning_buller_v1:interna_berakningar_trafikbuller_2023_fasadpunkter";
export const NOISE_CONTOUR_LAYER = "miljoovervakning_buller_v1:interna_berakningar_trafikbuller_2023_LAeq_v1";

export const NOISE_RADIUS_M = 25;
const LINK_M = 5;
export const NOISE_GUIDELINE_DB = 55;

export interface NoiseBuilding {
  /** Distance from the address to the nearest facade point, metres. */
  distanceMeters: number;
  /** Floors in the building (antal_vån), when the layer gives them. */
  floors: number | null;
  /** Loudest modelled level at the lowest floor, dB(A). */
  streetDb: number | null;
  /** Loudest modelled level at the top floor, dB(A). */
  topDb: number | null;
  /** Loudest modelled level on any facade point of the building, dB(A). */
  loudestDb: number;
  /** Facade points in the building cluster. */
  points: number;
}

export interface NoiseResult {
  building: NoiseBuilding | null;
  /** The LAeq band containing the address point. max is null for the open top band (65+). */
  band: { minDb: number; maxDb: number | null } | null;
  guidelineDb: number;
  radiusMeters: number;
  source: string;
}

type Props = Record<string, unknown>;
interface Feature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Props;
}

/** WFS bbox in lat,lon order: a square of `radiusM` around the point, plus a little margin. */
export function wfsBbox(lat: number, lon: number, radiusM: number): string {
  const dLat = (radiusM * 1.2) / 111320;
  const dLon = (radiusM * 1.2) / (111320 * Math.cos((lat * Math.PI) / 180));
  return `${lat - dLat},${lon - dLon},${lat + dLat},${lon + dLon},urn:ogc:def:crs:EPSG::4326`;
}

async function wfsFeatures(typeName: string, bbox: string): Promise<Feature[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox,
    count: "5000",
  });
  const res = await fetch(`${NOISE_WFS_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`noise WFS HTTP ${res.status}`);
  const body = (await res.json()) as { features?: unknown };
  if (!Array.isArray(body.features)) throw new Error("noise WFS response has no features array");
  return body.features as Feature[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const maxOf = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.max(...present) : null;
};

/** Ray-cast test for one ring of [lon, lat] pairs. */
function inRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the point is inside a (Multi)Polygon's outer ring and outside its holes. */
export function polygonContains(geometry: { type?: string; coordinates?: unknown }, lon: number, lat: number): boolean {
  const polygons =
    geometry.type === "MultiPolygon"
      ? (geometry.coordinates as number[][][][])
      : geometry.type === "Polygon"
        ? [geometry.coordinates as number[][][]]
        : [];
  return polygons.some(
    (rings) => rings.length > 0 && inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole)),
  );
}

interface Facade {
  lat: number;
  lon: number;
  distance: number;
  props: Props;
}

/** The building nearest the address: facade points linked within LINK_M of the nearest one. */
export function nearestBuilding(points: Facade[]): NoiseBuilding | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.distance - b.distance);
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const i = queue.pop() as number;
    for (let j = 0; j < sorted.length; j++) {
      if (seen.has(j)) continue;
      if (haversineMeters(sorted[i].lat, sorted[i].lon, sorted[j].lat, sorted[j].lon) <= LINK_M) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  const cluster = [...seen].map((i) => sorted[i]);
  return {
    distanceMeters: Math.round(sorted[0].distance),
    floors: maxOf(cluster.map((c) => num(c.props["antal_vån"]))),
    streetDb: maxOf(cluster.map((c) => num(c.props["nivå_bott"]))),
    topDb: maxOf(cluster.map((c) => num(c.props["nivå_takv"]))),
    loudestDb: maxOf(cluster.map((c) => num(c.props["högst_niv"]))) ?? 0,
    points: cluster.length,
  };
}

export async function noiseAt(lat: number, lon: number): Promise<NoiseResult> {
  const [facadeFeatures, contourFeatures] = await Promise.all([
    wfsFeatures(NOISE_FACADE_LAYER, wfsBbox(lat, lon, NOISE_RADIUS_M)),
    wfsFeatures(NOISE_CONTOUR_LAYER, wfsBbox(lat, lon, 2)),
  ]);

  const facades: Facade[] = [];
  for (const f of facadeFeatures) {
    const c = f.geometry?.coordinates;
    if (!Array.isArray(c) || typeof c[0] !== "number" || typeof c[1] !== "number" || !f.properties) continue;
    const distance = haversineMeters(lat, lon, c[1], c[0]);
    if (distance <= NOISE_RADIUS_M) facades.push({ lat: c[1], lon: c[0], distance, props: f.properties });
  }

  // Most specific band wins if two contain the point (boundary cases).
  let band: NoiseResult["band"] = null;
  for (const f of contourFeatures) {
    if (!f.geometry || !f.properties || !polygonContains(f.geometry, lon, lat)) continue;
    const minDb = num(f.properties.min);
    if (minDb === null) continue;
    const maxDb = num(f.properties.max);
    if (!band || minDb > band.minDb) band = { minDb, maxDb: maxDb !== null && maxDb < 100 ? maxDb : null };
  }

  return {
    building: nearestBuilding(facades),
    band,
    guidelineDb: NOISE_GUIDELINE_DB,
    radiusMeters: NOISE_RADIUS_M,
    source: "goteborg.se",
  };
}
