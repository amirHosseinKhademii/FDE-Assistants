/**
 * Median net income for the DeSO 2025 area (about 700 residents) that contains
 * the address, for Göteborg as a whole, and the area's rank among all 320
 * Göteborg DeSO areas. SCB: the area from the stat:DeSO_2025 WFS, the medians
 * from the PxWeb table HE0110/HE0110I/Tab1InkDesoRegso (content 0000089U,
 * "Medianvärde, tkr", net income, both sexes, 2024). Values are in thousands of
 * SEK per year. One PxWeb request covers every Göteborg DeSO, cached 24 h.
 */
import { featureAt, wfsBbox, wfsFeatures } from "./wfs";
import { GOTHENBURG, PX_BASE, gothenburgDesos, levelOf, percentileOf, pxPost, type Level } from "./scb";

export const DESO_WFS_URL = "https://geodata.scb.se/geoserver/stat/wfs";
export const DESO_LAYER = "stat:DeSO_2025";
export const INCOME_TABLE = `${PX_BASE}/HE/HE0110/HE0110I/Tab1InkDesoRegso`;
export const INCOME_PX_URL = INCOME_TABLE;
export const INCOME_YEAR = "2024";
const MEDIAN_NET_INCOME = "0000089U";

export interface IncomeResult {
  desoCode: string;
  /** Median net income in the DeSO, thousand SEK per year. Null when SCB has no value. */
  medianDesoTkr: number | null;
  /** Median net income for Göteborg, thousand SEK per year. */
  medianGothenburgTkr: number | null;
  /** The area's percentile among the Göteborg DeSO medians (0 = lowest), null when unknown. */
  percentile: number | null;
  level: Level | null;
  /** How many Göteborg DeSO areas the percentile is counted among. */
  areaCount: number;
  year: string;
  source: string;
}

/** The PxWeb JSON answer: one row per requested region, values as strings. */
export function medianFromPx(body: unknown, region: string): number | null {
  const rows = (body as { data?: unknown }).data;
  if (!Array.isArray(rows)) return null;
  const row = rows.find((r) => Array.isArray((r as { key?: unknown }).key) && (r as { key: unknown[] }).key[0] === region) as
    | { values?: unknown }
    | undefined;
  const raw = Array.isArray(row?.values) ? row.values[0] : null;
  const value = typeof raw === "string" ? Number(raw) : null;
  return value !== null && Number.isFinite(value) ? value : null;
}

export async function incomeAt(lat: number, lon: number): Promise<IncomeResult> {
  const features = await wfsFeatures(DESO_WFS_URL, DESO_LAYER, wfsBbox(lat, lon, 2));
  const hit = featureAt(features, lat, lon);
  const desoCode = String(hit?.properties?.desokod ?? "");
  if (!desoCode) throw new Error("no DeSO area contains this point");

  const deso = `${desoCode}_DeSO2025`;
  const all = await gothenburgDesos(INCOME_TABLE);
  const rows = await pxPost(INCOME_TABLE, [
    { code: "Region", selection: { filter: "item", values: [...all, GOTHENBURG] } },
    { code: "InkomstTyp", selection: { filter: "item", values: ["NeInk"] } },
    { code: "Kon", selection: { filter: "item", values: ["1+2"] } },
    { code: "ContentsCode", selection: { filter: "item", values: [MEDIAN_NET_INCOME] } },
    { code: "Tid", selection: { filter: "item", values: [INCOME_YEAR] } },
  ]);
  const byRegion = new Map<string, number>();
  for (const r of rows) if (r.value !== null) byRegion.set(r.dims.Region, r.value);
  const medianDesoTkr = byRegion.get(deso) ?? null;
  const values = all.map((code) => byRegion.get(code)).filter((v): v is number => v !== undefined);
  const percentile = medianDesoTkr !== null && values.length >= 100 ? percentileOf(medianDesoTkr, values) : null;

  return {
    desoCode,
    medianDesoTkr,
    medianGothenburgTkr: byRegion.get(GOTHENBURG) ?? null,
    percentile,
    level: percentile !== null ? levelOf(percentile) : null,
    areaCount: values.length,
    year: INCOME_YEAR,
    source: "api.scb.se",
  };
}
