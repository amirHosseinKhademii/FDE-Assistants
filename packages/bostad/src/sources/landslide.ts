/**
 * SGI (Statens geotekniska institut) skred hazard areas, ArcGIS REST point query.
 * Endpoint and query shape taken from the FDE proptech-sweden feasibility probe.
 *
 * ArcGIS returns HTTP 200 with an `error` object on failure, so both the
 * `error` key and a missing `features` array are treated as a failed check,
 * never as "not in a risk area".
 */
export interface LandslideFeature {
  attributes: Record<string, unknown>;
}

export interface LandslideResult {
  inRiskArea: boolean;
  features: LandslideFeature[];
  source: string;
}

export const SGI_SKRED_QUERY_URL =
  "https://geodata.sgi.se/server/rest/services/paverkansomraden_skred_v2/MapServer/0/query";

export async function landslideAt(lat: number, lon: number): Promise<LandslideResult> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "false",
    f: "json",
  });
  const url = `${SGI_SKRED_QUERY_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`SGI HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    error?: { code?: number; message?: string };
    features?: Array<{ attributes?: Record<string, unknown> }>;
  };
  if (body.error) {
    throw new Error(`SGI query error ${body.error.code ?? ""}: ${body.error.message ?? "unknown"}`);
  }
  if (!Array.isArray(body.features)) {
    throw new Error("SGI response has no features array");
  }
  const features = body.features.map((f) => ({ attributes: f.attributes ?? {} }));
  return { inRiskArea: features.length > 0, features, source: url };
}
