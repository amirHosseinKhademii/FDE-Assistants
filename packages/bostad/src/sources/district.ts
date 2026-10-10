/**
 * Göteborg administrative areas: the stadsområde (4 districts) and the
 * primärområde (about 100 areas) that contain the address. Free WFS on the
 * city's geodata service. Point-in-polygon is tested locally.
 */
import { featureAt, wfsBbox, wfsFeatures } from "./wfs";

export const DISTRICT_WFS_URL = "https://geodata-external.sbk.goteborg.se/services/slk-administrativ-indelning-v2/wfs";
export const STADSOMRADE_LAYER = "slk-administrativ-indelning-v2:stadsomraden";
export const PRIMAROMRADE_LAYER = "slk-administrativ-indelning-v2:primaromraden";

export interface AreaRef {
  nr: string;
  name: string;
}

export interface DistrictResult {
  stadsomrade: AreaRef | null;
  primaryArea: AreaRef | null;
  source: string;
}

async function areaAt(typeName: string, lat: number, lon: number): Promise<AreaRef | null> {
  const features = await wfsFeatures(DISTRICT_WFS_URL, typeName, wfsBbox(lat, lon, 2));
  const hit = featureAt(features, lat, lon);
  if (!hit?.properties) return null;
  return { nr: String(hit.properties.nr ?? ""), name: String(hit.properties.namn ?? "") };
}

export async function districtAt(lat: number, lon: number): Promise<DistrictResult> {
  const [stadsomrade, primaryArea] = await Promise.all([
    areaAt(STADSOMRADE_LAYER, lat, lon),
    areaAt(PRIMAROMRADE_LAYER, lat, lon),
  ]);
  return { stadsomrade, primaryArea, source: "goteborg.se" };
}
