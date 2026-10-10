/**
 * Road and tram noise, Göteborg 2023 (Miljöförvaltningen). Two free WFS layers
 * on the city's geoserver, asked with bbox in lat,lon order and EPSG:4326:
 *
 *  - facade points: modelled dB(A) on building walls, per floor. The building
 *    is this address's own footprint from OpenStreetMap (the polygon containing
 *    the address, or the nearest within 15 m): its facade points are the ones
 *    within 3 m of the outline. Without a footprint, the building is the cluster
 *    of facade points nearest the address (single-link, 5 m), searched within 25 m.
 *  - LAeq contours: the dB(A) band (min..max) that contains the address point.
 *
 * Licence not verified: the layers are named "interna_berakningar". Ask the
 * city before any commercial use.
 */
import { haversineMeters } from "./transit";
import { featureAt, wfsBbox, wfsFeatures } from "./wfs";
import { footprintAt, onFootprint } from "./footprint";

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
  /** "footprint": the OSM outline of this address's building. "cluster": nearest facade cluster (fallback). */
  matched: "footprint" | "cluster";
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

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const maxOf = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.max(...present) : null;
};

interface Facade {
  lat: number;
  lon: number;
  distance: number;
  props: Props;
}

/** Building figures from a set of facade points: the loudest level on each floor and the wall overall. */
function summarise(cluster: Facade[], matched: NoiseBuilding["matched"]): NoiseBuilding {
  return {
    distanceMeters: Math.round(Math.min(...cluster.map((c) => c.distance))),
    floors: maxOf(cluster.map((c) => num(c.props["antal_vån"]))),
    streetDb: maxOf(cluster.map((c) => num(c.props["nivå_bott"]))),
    topDb: maxOf(cluster.map((c) => num(c.props["nivå_takv"]))),
    loudestDb: maxOf(cluster.map((c) => num(c.props["högst_niv"]))) ?? 0,
    points: cluster.length,
    matched,
  };
}

/** Fallback: the building nearest the address, as the facade points linked within LINK_M of the nearest one. */
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
  return summarise([...seen].map((i) => sorted[i]), "cluster");
}

export async function noiseAt(lat: number, lon: number): Promise<NoiseResult> {
  const [facadeFeatures, contourFeatures, footprint] = await Promise.all([
    wfsFeatures(NOISE_WFS_URL, NOISE_FACADE_LAYER, wfsBbox(lat, lon, NOISE_RADIUS_M)),
    wfsFeatures(NOISE_WFS_URL, NOISE_CONTOUR_LAYER, wfsBbox(lat, lon, 2)),
    footprintAt(lat, lon),
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
    if (!f.properties || !featureAt([f], lat, lon)) continue;
    const minDb = num(f.properties.min);
    if (minDb === null) continue;
    const maxDb = num(f.properties.max);
    if (!band || minDb > band.minDb) band = { minDb, maxDb: maxDb !== null && maxDb < 100 ? maxDb : null };
  }

  // This address's own building first; the nearest facade cluster only when there is no outline or no walls on it.
  const own = footprint ? onFootprint(facades, footprint) : [];
  const building = own.length > 0 ? summarise(own, "footprint") : nearestBuilding(facades);

  return {
    building,
    band,
    guidelineDb: NOISE_GUIDELINE_DB,
    radiusMeters: NOISE_RADIUS_M,
    source: "goteborg.se",
  };
}
