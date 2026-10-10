/**
 * Reported crimes (anmälda brott) per Göteborg stadsområde, from BRÅ's
 * statistics database (statistik.bra.se/solwebb), exported once to
 * packages/bostad/data/bra-goteborg-stadsomraden.csv. Population from
 * packages/bostad/data/goteborg-stadsomraden-population.csv.
 *
 * No network calls. Not wired into the profile yet.
 *
 * Reported crimes, not "crime": reporting rates differ between areas.
 * District figures are coarse (about 150k residents each); show the city
 * figure next to them and always state the year.
 */
import * as fs from "fs";
import * as path from "path";

// Works from both src/sources and dist/sources (both are two levels below package root).
const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const BRA_FILE = path.join(DATA_DIR, "bra-goteborg-stadsomraden.csv");
const POP_FILE = path.join(DATA_DIR, "goteborg-stadsomraden-population.csv");

export const CITY = "Göteborg kommun";
export const DISTRICTS = ["Centrum", "Hisingen", "Nordost", "Sydväst"] as const;
export type DistrictName = (typeof DISTRICTS)[number];

/** Public crime keys. `bostadsinbrott` is lägenhet + villa (BRÅ rows summed). */
export type CrimeKey = "alla_brott" | "bostadsinbrott" | "misshandel" | "bilstold" | "stold_ur_fordon";

export const CRIME_LABELS_SV: Record<CrimeKey, string> = {
  alla_brott: "Alla anmälda brott",
  bostadsinbrott: "Bostadsinbrott (lägenhet + villa)",
  misshandel: "Misshandel inkl. grov",
  bilstold: "Fullbordat biltillgrepp (bilstöld)",
  stold_ur_fordon: "Stöld ur/från motordrivet fordon",
};

export interface CrimeFigure {
  count: number | null;
  per1000: number | null;
  cityCount: number | null;
  cityPer1000: number | null;
}

export interface DistrictCrime {
  area: string;
  year: number;
  population: number | null;
  cityPopulation: number | null;
  sourceUrl: string;
  exportedAt: string;
  types: Record<CrimeKey, CrimeFigure>;
}

interface RawRow {
  year: number;
  area: string;
  crimeType: string;
  count: number;
  sourceUrl: string;
  exportedAt: string;
}

let cache: { rows: RawRow[]; pop: Map<string, number> } | null = null;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(file: string): string[][] {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(1)
    .map(parseCsvLine);
}

function load(): { rows: RawRow[]; pop: Map<string, number> } {
  if (cache) return cache;
  const rows: RawRow[] = readCsv(BRA_FILE).map((r) => ({
    year: Number(r[0]),
    area: r[1],
    crimeType: r[2],
    count: Number(r[3]),
    sourceUrl: r[4],
    exportedAt: r[5],
  }));
  const pop = new Map<string, number>();
  for (const r of readCsv(POP_FILE)) pop.set(`${r[0]}|${r[1]}`, Number(r[2]));
  cache = { rows, pop };
  return cache;
}

/** Accepts "Centrum", "Stadsområde Centrum (Gbg)", or "Göteborg kommun". */
export function normaliseArea(input: string): string {
  const s = input.trim().replace(/^Stadsområde\s+/i, "").replace(/\s*\(Gbg\)$/i, "");
  if (/^göteborg( kommun)?$/i.test(s)) return CITY;
  const hit = DISTRICTS.find((d) => d.toLowerCase() === s.toLowerCase());
  if (!hit) throw new Error(`Unknown Göteborg stadsområde: "${input}"`);
  return hit;
}

/** Years for which the BRÅ export has rows for the given area. */
export function availableYears(area: string = CITY): number[] {
  const a = normaliseArea(area);
  return [...new Set(load().rows.filter((r) => r.area === a).map((r) => r.year))].sort((x, y) => y - x);
}

function countFor(rows: RawRow[], area: string, year: number, raw: string): number | null {
  const hit = rows.find((r) => r.area === area && r.year === year && r.crimeType === raw);
  return hit ? hit.count : null;
}

function sumOrNull(...vals: (number | null)[]): number | null {
  if (vals.some((v) => v === null)) return null;
  return vals.reduce<number>((s, v) => s + (v as number), 0);
}

function countKey(rows: RawRow[], area: string, year: number, key: CrimeKey): number | null {
  if (key === "bostadsinbrott") {
    return sumOrNull(
      countFor(rows, area, year, "bostadsinbrott_lagenhet"),
      countFor(rows, area, year, "bostadsinbrott_villa"),
    );
  }
  return countFor(rows, area, year, key);
}

const per1000 = (count: number | null, pop: number | null): number | null =>
  count === null || pop === null || pop <= 0 ? null : Math.round((count / pop) * 1000 * 100) / 100;

/**
 * Per-type counts for one stadsområde (or the city) and one year, with
 * per-1000 residents (null where population is not in the data file) and the
 * city figures alongside. Year defaults to the latest year in the export for
 * that area.
 */
export function crimeForDistrict(area: string, year?: number): DistrictCrime {
  const { rows, pop } = load();
  const a = normaliseArea(area);
  const y = year ?? availableYears(a)[0];
  if (y === undefined) throw new Error(`No BRÅ rows for ${a}`);

  const popA = pop.get(`${y}|${a}`) ?? null;
  const popCity = pop.get(`${y}|${CITY}`) ?? null;
  const src = rows.find((r) => r.area === a && r.year === y);

  const keys: CrimeKey[] = ["alla_brott", "bostadsinbrott", "misshandel", "bilstold", "stold_ur_fordon"];
  const types = {} as Record<CrimeKey, CrimeFigure>;
  for (const k of keys) {
    const c = countKey(rows, a, y, k);
    const cc = countKey(rows, CITY, y, k);
    types[k] = {
      count: c,
      per1000: per1000(c, popA),
      cityCount: cc,
      cityPer1000: per1000(cc, popCity),
    };
  }

  return {
    area: a,
    year: y,
    population: popA,
    cityPopulation: popCity,
    sourceUrl: src?.sourceUrl ?? "https://statistik.bra.se/solwebb/action/start?menykatalogid=1",
    exportedAt: src?.exportedAt ?? "",
    types,
  };
}
