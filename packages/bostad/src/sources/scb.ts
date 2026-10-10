/**
 * SCB PxWeb helpers for the small-area (DeSO 2025) statistics. One POST per
 * table asks for every Göteborg DeSO at once (320 areas), so a level word can be
 * a percentile among all of them. Answers are cached for 24 h in memory; a
 * failure is thrown and never cached.
 */
export const PX_BASE = "https://api.scb.se/OV0104/v1/doris/sv/ssd";
export const GOTHENBURG = "1480";
const DAY_MS = 24 * 60 * 60 * 1000;
const memory = new Map<string, { at: number; value: unknown }>();

/** A memo keyed by a plain string, 24 h. Only successful answers are kept. */
export async function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.value as T;
  const value = await load();
  memory.set(key, { at: Date.now(), value });
  return value;
}

export interface PxColumn {
  code: string;
  type: string;
}

export interface PxRow {
  /** Dimension codes by name, e.g. { Region: "1480A0010_DeSO2025", Tid: "2025" }. */
  dims: Record<string, string>;
  value: number | null;
}

/** The PxWeb json-stat-like answer as rows. ContentsCode (type "c") is one value per row. */
export function parsePx(body: unknown): PxRow[] {
  const b = body as { columns?: PxColumn[]; data?: { key?: string[]; values?: unknown[] }[] };
  if (!Array.isArray(b.columns) || !Array.isArray(b.data)) throw new Error("SCB response has no columns or data");
  const dimCols = b.columns.filter((c) => c.type !== "c");
  return b.data.map((row) => {
    const dims: Record<string, string> = {};
    dimCols.forEach((c, i) => {
      dims[c.code] = String(row.key?.[i] ?? "");
    });
    const raw = Array.isArray(row.values) ? row.values[0] : null;
    const value = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : null;
    return { dims, value: value !== null && Number.isFinite(value) ? value : null };
  });
}

/** One PxWeb POST, parsed. Throws on HTTP errors. */
export async function pxPost(tableUrl: string, query: unknown[], timeoutMs = 20000): Promise<PxRow[]> {
  const res = await fetch(tableUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, response: { format: "json" } }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`SCB PxWeb HTTP ${res.status}`);
  return parsePx(await res.json());
}

/** The Göteborg DeSO 2025 codes, from the table's own metadata (the region list). */
export async function gothenburgDesos(tableUrl: string): Promise<string[]> {
  return memo(`deso-codes:${tableUrl}`, async () => {
    const res = await fetch(tableUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`SCB metadata HTTP ${res.status}`);
    const meta = (await res.json()) as { variables?: { code: string; values: string[] }[] };
    const region = meta.variables?.find((v) => v.code === "Region");
    const codes = (region?.values ?? []).filter((c) => c.startsWith(`${GOTHENBURG}`) && c.endsWith("_DeSO2025"));
    if (codes.length < 100) throw new Error("too few Göteborg DeSO codes in SCB metadata");
    return codes;
  });
}

/** The area's own DeSO code from the DeSO 2025 layer: e.g. "1480C2100". */
export function desoCodeOf(region: string): string {
  return region.replace(/_DeSO2025$/, "");
}

export type Level = "low" | "belowAverage" | "average" | "aboveAverage" | "high";

/** Percentile (0-100) of `value` among `values`: the share below it, ties counting half. */
export function percentileOf(value: number, values: number[]): number {
  let below = 0;
  let equal = 0;
  for (const v of values) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return Math.round(((below + equal / 2) / values.length) * 100);
}

/** The five level words used on every row: bottom fifth low, top fifth high. */
export function levelOf(percentile: number): Level {
  if (percentile < 20) return "low";
  if (percentile < 40) return "belowAverage";
  if (percentile < 60) return "average";
  if (percentile < 80) return "aboveAverage";
  return "high";
}

