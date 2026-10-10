/**
 * Shared helpers for GeoServer / WFS 2.0 point lookups. Every lookup asks for
 * JSON in EPSG:4326 with a bbox in lat,lon order (urn:ogc:def:crs:EPSG::4326),
 * then keeps the feature whose polygon really contains the point: a bbox
 * returns neighbours too.
 */

export interface WfsFeature {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
}

/** A square bbox around a point, in lat,lon order, with a 20 % margin. */
export function wfsBbox(lat: number, lon: number, radiusM: number): string {
  const dLat = (radiusM * 1.2) / 111320;
  const dLon = (radiusM * 1.2) / (111320 * Math.cos((lat * Math.PI) / 180));
  return `${lat - dLat},${lon - dLon},${lat + dLat},${lon + dLon},urn:ogc:def:crs:EPSG::4326`;
}

export async function wfsFeatures(url: string, typeName: string, bbox: string, count = 5000): Promise<WfsFeature[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox,
    count: String(count),
  });
  const res = await fetch(`${url}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`WFS HTTP ${res.status}`);
  const body = (await res.json()) as { features?: unknown };
  if (!Array.isArray(body.features)) throw new Error("WFS response has no features array");
  return body.features as WfsFeature[];
}

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

/** The first feature whose polygon contains the point, or undefined. */
export function featureAt(features: WfsFeature[], lat: number, lon: number): WfsFeature | undefined {
  return features.find((f) => f.geometry && polygonContains(f.geometry, lon, lat));
}
