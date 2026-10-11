/**
 * Rates for the mortgage calculator, one section each so one failing source never hides the others:
 *  - the Riksbank policy rate (SWEA API, cached 12 h; the API answers 429 to bursts, so one call per window)
 *  - SCB's average rate on new mortgages by fixation period (PxWeb FM5001C/RantaT04N, Avtal 0100, cached 24 h)
 *  - list rates per bank from the Konsumenternas compare page (one HTML page, cached 24 h). Its tables are
 *    parsed by header text, so a missing cell or a reordered column does not shift the numbers.
 * A failed section is thrown inside its own memo and is never cached. Server side only.
 */
import { PX_BASE, pxPost } from "./scb";
import { BANKS, bankFor, type BankInfo } from "./banks";
import { MORTGAGE_RULES } from "./mortgage-rules";

export const PERIODS = ["3 mån", "1 år", "2 år", "3 år", "5 år"] as const;
export type Period = (typeof PERIODS)[number];

/** SCB's fixation codes. "1 år" is the 3 mån to 1 år bucket and "5 år" the 3 to 5 år bucket. */
const BINDING_CODE: Record<Period, string> = {
  "3 mån": "1.1.1",
  "1 år": "1.1.2.1",
  "2 år": "1.1.2.2.1.1",
  "3 år": "1.1.2.2.1.2",
  "5 år": "1.1.2.2.2",
};

export const RIKSBANK_URL = "https://api.riksbank.se/swea/v1/Observations/Latest/SECBREPOEFF";
export const SCB_RATES_TABLE = `${PX_BASE}/FM/FM5001/FM5001C/RantaT04N`;
export const KONSUMENTERNAS_URL =
  "https://konsumenternasbankochfinansbyra.se/konsumentstod/jamforelser/lan--betalningar/lan/jamfor-borantor";
const USER_AGENT = "bostad-app/0.1 (research prototype)";

const HOUR = 60 * 60 * 1000;
const memory = new Map<string, { at: number; value: unknown }>();

async function ttlMemo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  memory.set(key, { at: Date.now(), value });
  return value;
}

export interface PolicyRate {
  /** Percent, e.g. 1.75. */
  value: number;
  /** The day the rate was set, YYYY-MM-DD. */
  date: string;
  source: string;
}

export async function policyRate(): Promise<PolicyRate> {
  return ttlMemo("riksbank", 12 * HOUR, async () => {
    const res = await fetch(RIKSBANK_URL, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Riksbank HTTP ${res.status}`);
    const body = (await res.json()) as { date?: unknown; value?: unknown };
    if (typeof body.value !== "number" || typeof body.date !== "string") throw new Error("Riksbank answer has no policy rate");
    return { value: body.value, date: body.date, source: "api.riksbank.se, SECBREPOEFF" };
  });
}

export interface AverageRate {
  period: Period;
  /** Percent, e.g. 2.7289. */
  rate: number;
}

export interface AverageResult {
  /** The month of the figures, YYYY-MM. */
  month: string;
  rates: AverageRate[];
  source: string;
}

/** SCB's average on new loans by fixation period, for the latest month. */
export async function averageRates(): Promise<AverageResult> {
  return ttlMemo("scb-averages", 24 * HOUR, async () => {
    const codes = PERIODS.map((p) => BINDING_CODE[p]);
    const rows = await pxPost(SCB_RATES_TABLE, [
      { code: "Referenssektor", selection: { filter: "item", values: ["1"] } },
      { code: "Motpartssektor", selection: { filter: "item", values: ["2c"] } },
      { code: "Avtal", selection: { filter: "item", values: ["0100"] } },
      { code: "Rantebindningstid", selection: { filter: "item", values: codes } },
      { code: "Tid", selection: { filter: "top", values: ["1"] } },
    ]);
    const rates: AverageRate[] = [];
    let month = "";
    for (const period of PERIODS) {
      const row = rows.find((r) => r.dims.Rantebindningstid === BINDING_CODE[period]);
      if (!row || row.value === null) continue;
      rates.push({ period, rate: row.value });
      month = row.dims.Tid ? row.dims.Tid.replace("M", "-") : month;
    }
    if (rates.length === 0) throw new Error("SCB has no average new-loan rate");
    return { month, rates, source: "SCB, FM5001C/RantaT04N" };
  });
}

export interface BankRate {
  /** Name as the bank is listed here, or as the compare page writes it when it is not one of the listed banks. */
  bank: string;
  /** The bank's name in BANKS, or null for companies outside the list. */
  listed: boolean;
  period: Period;
  /** Lowest list rate, percent. */
  rate: number;
  /** True when the page gives a range or "from" rate: `rate` is then the lower end. */
  from: boolean;
  /** The date the compare page gives for the list rates, YYYY-MM-DD. */
  updated: string;
}

export interface BankListResult {
  updated: string;
  rates: BankRate[];
  /** Companies found in the table, listed or not. */
  companies: number;
  source: string;
  sourceUrl: string;
  /** The listed banks with their site, favicon and rates page, so the client can show icons without importing this package. */
  directory: BankInfo[];
}

const ENTITIES: Record<string, string> = { amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">" };

function cellText(inner: string): string {
  return inner
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** "4,60 - 9,80" gives 4.6 and a range; "Från 5,65" gives 5.65 and a range; "Uppgift saknas" or an empty cell gives null. */
export function parseRateCell(text: string): { rate: number; from: boolean } | null {
  if (!text || /saknas/i.test(text)) return null;
  const m = /(\d+(?:[.,]\d+)?)/.exec(text);
  if (!m) return null;
  const rate = Number(m[1].replace(",", "."));
  if (!Number.isFinite(rate)) return null;
  return { rate, from: /-|Från/i.test(text) };
}

/**
 * Reads the list-rate table: the first table after the "Aktuella listräntor" heading. Columns are mapped by
 * header text ("3 mån, sortera" is "3 mån"), so the table can drop or add columns without shifting values.
 * Throws when the heading, the table or the periods are missing, or when fewer than 10 banks have a 3 mån rate.
 */
export function parseListRates(html: string): BankListResult {
  const marker = html.indexOf("Aktuella listräntor");
  if (marker < 0) throw new Error("list-rate heading not found on the compare page");
  const date = /uppdaterade (\d{4}-\d{2}-\d{2})/.exec(html.slice(marker));
  if (!date) throw new Error("list-rate update date not found");
  const start = html.indexOf("<table", marker);
  if (start < 0) throw new Error("list-rate table not found");
  const table = html.slice(start, html.indexOf("</table>", start) + "</table>".length);

  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
    [...r[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((c) => cellText(c[2])),
  );
  const header = rows.find((cells) => cells.length > 0);
  if (!header) throw new Error("list-rate table has no header");
  const names = header.map((h) => h.split(",")[0].trim());
  const columns = PERIODS.map((p) => [p, names.indexOf(p)] as const);
  const missing = columns.filter(([, i]) => i < 0).map(([p]) => p);
  if (missing.length > 0) throw new Error(`list-rate table lacks ${missing.join(", ")}`);

  const updated = date[1];
  const body = rows.slice(rows.indexOf(header) + 1).filter((cells) => cells.length > 1 && cells[0]);
  const out: BankRate[] = [];
  for (const cells of body) {
    const company = cells[0];
    const bank = bankFor(company);
    for (const [period, i] of columns) {
      const parsed = parseRateCell(cells[i] ?? "");
      if (parsed) out.push({ bank: bank ? bank.name : company, listed: bank !== null, period, rate: parsed.rate, from: parsed.from, updated });
    }
  }
  const with3m = new Set(out.filter((r) => r.period === "3 mån").map((r) => r.bank)).size;
  if (with3m < 10) throw new Error(`only ${with3m} companies with a 3 mån rate, the page layout may have changed`);
  return {
    updated,
    rates: out,
    companies: body.length,
    source: "Konsumenternas Bank- och finansbyrå",
    sourceUrl: KONSUMENTERNAS_URL,
    directory: BANKS,
  };
}

/** The list rates from the compare page, cached 24 h. */
export async function listRates(): Promise<BankListResult> {
  return ttlMemo("konsumenternas", 24 * HOUR, async () => {
    const res = await fetch(KONSUMENTERNAS_URL, {
      headers: { Accept: "text/html", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Konsumenternas HTTP ${res.status}`);
    return parseListRates(await res.text());
  });
}

export interface RateSection<T> {
  status: "ok" | "error";
  data?: T;
  reason?: string;
  source: string;
  fetchedAt: string;
}

async function section<T>(source: string, run: () => Promise<T>): Promise<RateSection<T>> {
  const fetchedAt = new Date().toISOString();
  try {
    return { status: "ok", data: await run(), source, fetchedAt };
  } catch (e) {
    return { status: "error", reason: e instanceof Error ? e.message : String(e), source, fetchedAt };
  }
}

export interface MortgageRates {
  policyRate: RateSection<PolicyRate>;
  averages: RateSection<AverageResult>;
  banks: RateSection<BankListResult>;
  rules: typeof MORTGAGE_RULES;
  sources: { name: string; url: string }[];
}

/** Everything the calculator needs, one section per source. The three calls run in parallel. */
export async function mortgageRates(): Promise<MortgageRates> {
  const [policy, averages, banks] = await Promise.all([
    section("api.riksbank.se, SECBREPOEFF", policyRate),
    section("api.scb.se, FM5001C/RantaT04N", averageRates),
    section("konsumenternasbankochfinansbyra.se", listRates),
  ]);
  return {
    policyRate: policy,
    averages,
    banks,
    rules: MORTGAGE_RULES,
    sources: [
      { name: "Riksbanken, styrränta", url: "https://www.riksbank.se/" },
      { name: "SCB, bolåneräntor", url: "https://www.scb.se/" },
      { name: "Konsumenternas Bank- och finansbyrå", url: KONSUMENTERNAS_URL },
      { name: "Riksdagen, lag (2026:226)", url: MORTGAGE_RULES.maxLtv.url },
      { name: "Skatteverket, ränteavdrag", url: MORTGAGE_RULES.interestDeduction.url },
    ],
  };
}
