/**
 * Reported crimes (anmälda brott) for Göteborg, 1996-2025, from BRÅ's statistics
 * database (statistik.bra.se/solwebb). Data files, all read from disk, no network:
 *   data/bra-goteborg-history.csv   year, area_scheme, area, category, subcategory, count, ...
 *   data/goteborg-area-population.csv  kommun population per year; stadsområde population 2021-2025
 *   data/areas/<scheme>.geojson     area polygons (only stadsomrade_2021 exists so far)
 * See data/README.md for sources, caveats and how to refresh.
 *
 * Reported crimes, not "crime": reporting rates differ between areas, and the
 * district figures are coarse. Always show the year and the city figure alongside.
 */
import * as fs from "fs";
import * as path from "path";

// Works from both src/sources and dist/sources (both are two levels below package root).
const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const HISTORY_FILE = path.join(DATA_DIR, "bra-goteborg-history.csv");
const POP_FILE = path.join(DATA_DIR, "goteborg-area-population.csv");
const AREA_DIR = path.join(DATA_DIR, "areas");

export const CITY = "Göteborg kommun";

export type AreaScheme = "kommun" | "stadsdel_pre2011" | "sdn_2011_2020" | "stadsomrade_2021";

/** Subcategory slugs written by the export (subcategory column). */
export type SubKey =
  | "misshandel"
  | "ran"
  | "sexualbrott"
  | "bostadsinbrott_lagenhet"
  | "bostadsinbrott_villa"
  | "biltillgrepp"
  | "stold_ur_fordon"
  | "cykelstold"
  | "skadegorelse"
  | "narkotikabrott"
  | "bedrageri";

export const SUB_LABELS_SV: Record<SubKey, string> = {
  misshandel: "Misshandel inkl. grov",
  ran: "Rån, inkl. grovt",
  sexualbrott: "Sexualbrott (6 kap.)",
  bostadsinbrott_lagenhet: "Bostadsinbrott, lägenhet",
  bostadsinbrott_villa: "Bostadsinbrott, villa/radhus",
  biltillgrepp: "Fullbordat biltillgrepp",
  stold_ur_fordon: "Stöld ur/från motordrivet fordon",
  cykelstold: "Cykelstöld",
  skadegorelse: "Skadegörelse (12 kap.)",
  narkotikabrott: "Brott mot narkotikastrafflagen",
  bedrageri: "Bedrägeri (9 kap.)",
};

/** BRÅ's own category name for the total of all reported crimes. */
export const TOTAL_CATEGORY = "Totalt antal brott";

export interface HistoryRow {
  year: number;
  scheme: AreaScheme;
  area: string; // BRÅ name, e.g. "Stadsområde Centrum (Gbg)" or "Göteborg kommun"
  category: string;
  subcategory: SubKey | "";
  count: number | null; // null = suppressed/unavailable in BRÅ ("..")
  sourceUrl: string;
  exportedAt: string;
}

/** The scheme that applies to a point in a given year, for the polygon lookup. */
export function schemeForYear(year: number): AreaScheme | null {
  if (year >= 2021) return "stadsomrade_2021";
  if (year >= 2002) return "sdn_2011_2020"; // 2002-2010 values are BRÅ's series on the 2011 division
  return null;
}

/**
 * Schemes to try for a year, in order. 2002-2010 prefer the pre-2011 stadsdelar when
 * their polygons and BRÅ totals exist for the point's area; otherwise the 2011 division.
 */
export function schemesForYear(year: number): AreaScheme[] {
  if (year >= 2002 && year <= 2010) return ["stadsdel_pre2011", "sdn_2011_2020"];
  const s = schemeForYear(year);
  return s ? [s] : [];
}

export interface CategoryCount {
  category: string;
  count: number | null;
  per1000: number | null;
  cityCount: number | null;
  cityPer1000: number | null;
}

export interface YearCrime {
  year: number;
  scheme: AreaScheme | null;
  /** Area containing the point in this year's scheme, or null when no polygon/no data. */
  area: string | null;
  /** Why area is null, when it is. */
  areaNote: string | null;
  population: number | null;
  cityPopulation: number | null;
  /** Total reported crimes ("Totalt antal brott") for the area, and the city. */
  total: CategoryCount;
  /** Named subcategories (misshandel, bostadsinbrott, ...) with per-1000 where possible. */
  subcategories: Record<SubKey, CategoryCount>;
  /** All other BRÅ categories for this area and year, keyed by BRÅ category name. */
  categories: Record<string, CategoryCount>;
  sourceUrl: string | null;
  exportedAt: string | null;
}

export interface CrimeHistory {
  lat: number;
  lon: number;
  city: string;
  years: YearCrime[]; // newest first
  caveats: string[];
}

type Ring = [number, number][];
interface AreaPoly {
  name: string;
  polygons: Ring[][]; // each polygon = [outer, ...holes]
}

interface Cache {
  history: HistoryRow[];
  byKey: Map<string, HistoryRow>; // `${year}|${scheme}|${area}|${category}`
  pop: Map<string, number>; // kommun population, `${year}`
  areaPop: Map<string, number>; // `${year}|${scheme}|${area}`
  polys: Map<AreaScheme, AreaPoly[]>;
}

let cache: Cache | null = null;

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

function loadPolys(scheme: AreaScheme): AreaPoly[] {
  const file = path.join(AREA_DIR, `${scheme}.geojson`);
  if (!fs.existsSync(file)) return [];
  const gj = JSON.parse(fs.readFileSync(file, "utf8")) as {
    features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } }[];
  };
  return gj.features.map((f) => {
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as Ring[]]
        : (f.geometry.coordinates as Ring[][]);
    return { name: f.properties.name, polygons: polys };
  });
}

function load(): Cache {
  if (cache) return cache;
  const history: HistoryRow[] = readCsv(HISTORY_FILE).map((r) => ({
    year: Number(r[0]),
    scheme: r[1] as AreaScheme,
    area: r[2],
    category: r[3],
    subcategory: (r[4] || "") as SubKey | "",
    count: r[5] === "" ? null : Number(r[5]),
    sourceUrl: r[6],
    exportedAt: r[7],
  }));
  const byKey = new Map<string, HistoryRow>();
  for (const h of history) byKey.set(`${h.year}|${h.scheme}|${h.area}|${h.category}`, h);

  const pop = new Map<string, number>();
  const areaPop = new Map<string, number>();
  if (fs.existsSync(POP_FILE)) {
    for (const r of readCsv(POP_FILE)) {
      if (r[3] === "") continue;
      if (r[1] === "kommun") pop.set(r[0], Number(r[3]));
      else areaPop.set(`${r[0]}|${r[1]}|${r[2]}`, Number(r[3]));
    }
  }
  const polys = new Map<AreaScheme, AreaPoly[]>();
  for (const s of ["stadsomrade_2021", "sdn_2011_2020", "stadsdel_pre2011"] as AreaScheme[]) {
    polys.set(s, loadPolys(s));
  }
  cache = { history, byKey, pop, areaPop, polys };
  return cache;
}

/** Ray-casting point-in-ring (lon = x, lat = y). */
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Name of the area of `scheme` containing the point, or null when the scheme has
 * no polygon file yet or the point is outside every polygon.
 */
export function areaForPoint(lat: number, lon: number, scheme: AreaScheme): string | null {
  const polys = load().polys.get(scheme) ?? [];
  for (const p of polys) {
    for (const rings of p.polygons) {
      // Even-odd over one polygon's rings: inside the outer ring and inside a hole means outside.
      let hits = 0;
      for (const ring of rings) if (inRing(lon, lat, ring)) hits++;
      if (hits % 2 === 1) return p.name;
    }
  }
  return null;
}

/** Whether polygons exist for a scheme (so areaForPoint can answer). */
export function hasPolygons(scheme: AreaScheme): boolean {
  return (load().polys.get(scheme) ?? []).length > 0;
}

function countFor(c: Cache, year: number, scheme: AreaScheme, area: string, category: string): HistoryRow | undefined {
  return c.byKey.get(`${year}|${scheme}|${area}|${category}`);
}

const per1000 = (count: number | null, pop: number | null): number | null =>
  count === null || pop === null || pop <= 0 ? null : Math.round((count / pop) * 1000 * 100) / 100;

function figure(
  c: Cache,
  year: number,
  scheme: AreaScheme,
  area: string,
  category: string,
  popArea: number | null,
  popCity: number | null,
  cityScheme: AreaScheme,
): CategoryCount {
  const row = countFor(c, year, scheme, area, category);
  const cityRow = countFor(c, year, cityScheme, CITY, category);
  const count = row ? row.count : null;
  const cityCount = cityRow ? cityRow.count : null;
  return {
    category,
    count,
    per1000: per1000(count, popArea),
    cityCount,
    cityPer1000: per1000(cityCount, popCity),
  };
}

/**
 * Crime history for the stadsområde that contains (lat, lon), year by year.
 * For each year the scheme in force that year is used (2021+ stadsområden,
 * 2002-2020 the 2011-2020 stadsdelsnämndsområden) and its polygon decides the area.
 * No network calls.
 */
export function crimeHistory(lat: number, lon: number): CrimeHistory {
  const c = load();
  const caveats = [
    "Anmälda brott = reported crimes, not all crime. Reporting varies by area and crime type.",
    "Boundaries changed in 2011 and 2021; figures before a boundary change are not comparable across it.",
    "Polygons exist only for stadsområden (2021-). 2002-2020 need stadsdelsnämndsområde polygons, not yet available.",
    "Area population exists for stadsområden 2021-2025 only; per-1000 is null for other areas and years.",
    "Suppressed or unavailable BRÅ cells are null, not zero.",
    "District totals sum to roughly 90-98 % of the city total; the rest is not assigned to a district.",
  ];
  const years: YearCrime[] = [];
  const cityScheme: AreaScheme = "kommun";
  const allYears = [...new Set(c.history.map((h) => h.year))].sort((a, b) => b - a);
  for (const year of allYears) {
    const candidates = schemesForYear(year);
    const popCity = c.pop.get(String(year)) ?? null;
    const empty = (category: string): CategoryCount => ({
      category,
      count: null,
      per1000: null,
      cityCount: countFor(c, year, cityScheme, CITY, category)?.count ?? null,
      cityPer1000: per1000(countFor(c, year, cityScheme, CITY, category)?.count ?? null, popCity),
    });
    let scheme: AreaScheme | null = candidates[candidates.length - 1] ?? null;
    let area: string | null = null;
    let areaNote: string | null = null;
    if (candidates.length === 0) areaNote = "no district scheme for this year";
    for (const cand of candidates) {
      if (!hasPolygons(cand)) {
        areaNote = `no polygons for ${cand}`;
        continue;
      }
      const hit = areaForPoint(lat, lon, cand);
      if (hit === null) {
        areaNote = "point outside all polygons";
        continue;
      }
      // Pre-2011 stadsdelar only win when BRÅ has a total for that area and year.
      if (cand === "stadsdel_pre2011" && countFor(c, year, cand, hit, TOTAL_CATEGORY)?.count == null) {
        areaNote = "no BRÅ total for the pre-2011 stadsdel";
        continue;
      }
      scheme = cand;
      area = hit;
      areaNote = null;
      break;
    }

    const sample = scheme ? c.history.find((h) => h.year === year && h.scheme === scheme) : undefined;
    const subcategories = {} as Record<SubKey, CategoryCount>;
    const categories: Record<string, CategoryCount> = {};
    let total: CategoryCount = empty(TOTAL_CATEGORY);
    let areaPopulation: number | null = null;
    if (area && scheme) {
      const popArea = c.areaPop.get(`${year}|${scheme}|${area}`) ?? null;
      areaPopulation = popArea;
      total = figure(c, year, scheme, area, TOTAL_CATEGORY, popArea, popCity, cityScheme);
      const seenCats = new Set(
        c.history.filter((h) => h.year === year && h.scheme === scheme && h.area === area).map((h) => h.category),
      );
      for (const cat of seenCats) {
        if (cat === TOTAL_CATEGORY) continue;
        categories[cat] = figure(c, year, scheme, area, cat, popArea, popCity, cityScheme);
      }
      for (const h of c.history) {
        if (h.year !== year || h.scheme !== scheme || h.area !== area || !h.subcategory) continue;
        subcategories[h.subcategory] = figure(c, year, scheme, area, h.category, popArea, popCity, cityScheme);
      }
    }
    years.push({
      year,
      scheme,
      area,
      areaNote,
      population: areaPopulation,
      cityPopulation: popCity,
      total,
      subcategories,
      categories,
      sourceUrl: sample?.sourceUrl ?? null,
      exportedAt: sample?.exportedAt ?? null,
    });
  }
  return { lat, lon, city: CITY, years, caveats };
}
