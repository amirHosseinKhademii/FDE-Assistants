/**
 * Average purchase price of a small house (permanent, not tomträtt) for
 * Göteborg kommun as a whole, not the address. SCB PxWeb, table
 * BO0501B/FastprisSHRegionAr ("Försålda småhus efter region (kommun, län,
 * riket) och fastighetstyp"), content BO0501C2 ("Köpeskilling, medelvärde i
 * tkr"). Values are thousands of SEK. One POST for 2020 to 2025, cached 24 h.
 * The change is against the year five years before the latest year with data.
 */
import { GOTHENBURG, PX_BASE, memo, pxPost } from "./scb";

export const PRICE_TABLE_ID = "BO0501B/FastprisSHRegionAr";
export const PRICE_TABLE = `${PX_BASE}/BO/BO0501/${PRICE_TABLE_ID}`;
export const PRICE_SOURCE = "SCB, Fastighetspriser och lagfarter (BO0501)";
const PRICE_CONTENTS = "BO0501C2";
const PERMANENT_HOUSE = "220";
const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];

export interface PriceYear {
  year: string;
  /** Average price in tkr, null when SCB has no value that year. */
  value: number | null;
}

export interface PriceResult {
  /** Latest year SCB has a value for. */
  year: string;
  /** Average purchase price of a small house in Göteborg kommun, thousand SEK. */
  value: number;
  unit: "tkr";
  /** Percent change from `baseYear` (five years before `year`). Null when that year has no value. */
  changePct: number | null;
  baseYear: string | null;
  /** 2020 to 2025, in order. */
  series: PriceYear[];
  source: string;
  tableId: string;
}

export async function gothenburgHousePrice(): Promise<PriceResult> {
  return memo(`price:${PRICE_TABLE_ID}`, async () => {
    const rows = await pxPost(PRICE_TABLE, [
      { code: "Region", selection: { filter: "item", values: [GOTHENBURG] } },
      { code: "Fastighetstyp", selection: { filter: "item", values: [PERMANENT_HOUSE] } },
      { code: "ContentsCode", selection: { filter: "item", values: [PRICE_CONTENTS] } },
      { code: "Tid", selection: { filter: "item", values: YEARS } },
    ]);
    const byYear = new Map<string, number>();
    for (const r of rows) if (r.value !== null) byYear.set(r.dims.Tid, r.value);
    const series = YEARS.map((year) => ({ year, value: byYear.get(year) ?? null }));
    const latest = [...series].reverse().find((s) => s.value !== null);
    if (!latest || latest.value === null) throw new Error("SCB has no small-house price for Göteborg");

    const baseYear = String(Number(latest.year) - 5);
    const base = byYear.get(baseYear) ?? null;
    return {
      year: latest.year,
      value: latest.value,
      unit: "tkr",
      changePct: base !== null && base > 0 ? ((latest.value - base) / base) * 100 : null,
      baseYear: base !== null ? baseYear : null,
      series,
      source: PRICE_SOURCE,
      tableId: PRICE_TABLE_ID,
    };
  });
}
