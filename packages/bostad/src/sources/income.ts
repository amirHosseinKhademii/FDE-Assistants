/**
 * Median net income for the DeSO 2025 area (about 700 residents) that contains
 * the address, and for Göteborg as a whole. SCB: the area from the stat:DeSO_2025
 * WFS, the medians from the PxWeb table HE0110I/Tab1InkDesoRegso (content
 * 0000089U, "Medianvärde, tkr", net income, both sexes, 2024). Values are in
 * thousands of SEK per year.
 */
import { featureAt, wfsBbox, wfsFeatures } from "./wfs";

export const DESO_WFS_URL = "https://geodata.scb.se/geoserver/stat/wfs";
export const DESO_LAYER = "stat:DeSO_2025";
export const INCOME_PX_URL = "https://api.scb.se/OV0104/v1/doris/sv/ssd/HE/HE0110/HE0110I/Tab1InkDesoRegso";
export const INCOME_YEAR = "2024";
const GOTHENBURG_CODE = "1480";
const MEDIAN_NET_INCOME = "0000089U";

export interface IncomeResult {
  desoCode: string;
  /** Median net income in the DeSO, thousand SEK per year. Null when SCB has no value. */
  medianDesoTkr: number | null;
  /** Median net income for Göteborg, thousand SEK per year. */
  medianGothenburgTkr: number | null;
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
  const query = {
    query: [
      { code: "Region", selection: { filter: "item", values: [deso, GOTHENBURG_CODE] } },
      { code: "InkomstTyp", selection: { filter: "item", values: ["NeInk"] } },
      { code: "Kon", selection: { filter: "item", values: ["1+2"] } },
      { code: "ContentsCode", selection: { filter: "item", values: [MEDIAN_NET_INCOME] } },
      { code: "Tid", selection: { filter: "item", values: [INCOME_YEAR] } },
    ],
    response: { format: "json" },
  };
  const res = await fetch(INCOME_PX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SCB PxWeb HTTP ${res.status}`);
  const body: unknown = await res.json();

  return {
    desoCode,
    medianDesoTkr: medianFromPx(body, deso),
    medianGothenburgTkr: medianFromPx(body, GOTHENBURG_CODE),
    year: INCOME_YEAR,
    source: "api.scb.se",
  };
}
