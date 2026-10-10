/**
 * The mellanområde (neighbourhood) that contains the address, and its written safety
 * assessment from the city's "Lägesbild brott och otrygghet" reports (2024, the four
 * stadsområden). Local files, no network. The text is the city's and the police's own
 * assessment, not statistics; quotes are verbatim Swedish with the printed page.
 */
import * as fs from "fs";
import * as path from "path";
import { DATA_DIR } from "../data-dir";
import type { LatLng } from "./crime";

const REPORTS_FILE = path.join(DATA_DIR, "lagesbild", "goteborg-mellanomraden.json");
const POLYGONS_FILE = path.join(DATA_DIR, "areas", "mellanomraden.geojson");

/** The card's categories, used to pick an icon for each crime tag. "other" has no icon. */
export type CrimeGroup = "violence" | "burglary" | "carTheft" | "theftFromCar" | "bikeTheft" | "vandalism" | "fraud" | "drugs" | "traffic" | "other";

export interface NeighbourhoodResult {
  name: string;
  stadsomrade: string;
  primaromraden: string[];
  reportYear: number;
  reportUrl: string;
  /** Printed page where the mellanområde's section starts in the report. */
  page: number;
  bullets: { en: string[]; sv: string[] };
  crimes: { tag: string; group: CrimeGroup }[];
  places: { name: string; noteEn: string }[];
  trendEn: string | null;
  quotes: { sv: string; page: number }[];
  /** Polygon(s) of the mellanområde, [part][ring][vertex] in lat/lng. */
  outline: LatLng[][][];
}

interface Report {
  stadsomrade: string;
  report_year: number;
  report_url: string;
  mellanomrade_name: string;
  primaromraden: string[];
  page: number;
  summary_en: string[];
  summary_sv: string[];
  common_crimes: string[];
  places: { name: string; note_en: string }[];
  trend_en: string | null;
  quotes: { sv: string; page: number }[];
}

interface Poly {
  name: string;
  parts: LatLng[][][];
}

let cache: { records: Map<string, Report>; polys: Poly[] } | null = null;

function load() {
  if (cache) return cache;
  const records = new Map<string, Report>();
  if (fs.existsSync(REPORTS_FILE)) {
    for (const r of JSON.parse(fs.readFileSync(REPORTS_FILE, "utf8")) as Report[]) records.set(r.mellanomrade_name, r);
  }
  const polys: Poly[] = [];
  if (fs.existsSync(POLYGONS_FILE)) {
    const gj = JSON.parse(fs.readFileSync(POLYGONS_FILE, "utf8")) as {
      features: { properties: { namn: string }; geometry: { type: string; coordinates: unknown } }[];
    };
    for (const f of gj.features) {
      const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : (f.geometry.coordinates as unknown[]);
      const parts = (polygons as [number, number][][][]).map((rings) => rings.map((ring) => ring.map(([x, y]) => ({ lat: y, lng: x }))));
      polys.push({ name: f.properties.namn, parts });
    }
  }
  cache = { records, polys };
  return cache;
}

/** Ray casting on one ring (lon = x, lat = y). */
function inRing(lat: number, lon: number, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > lat !== b.lat > lat && lon < ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside;
  }
  return inside;
}

function containsPoint(parts: LatLng[][][], lat: number, lon: number): boolean {
  return parts.some((rings) => rings.filter((ring) => inRing(lat, lon, ring)).length % 2 === 1);
}

/** The card's group for a crime tag, from the words in it. */
export function groupOf(tag: string): CrimeGroup {
  const t = tag.toLowerCase();
  if (/narcot|drug/.test(t)) return "drugs";
  if (/vandal|graffiti|arson|explosion/.test(t)) return "vandalism";
  if (/bicycle|bike/.test(t)) return "bikeTheft";
  if (/car break|motor vehicle|tyre/.test(t)) return "theftFromCar";
  if (/burglary|cellar/.test(t)) return "burglary";
  if (/fraud|economic/.test(t)) return "fraud";
  if (/violen|robbery|assault|shoot|fight|knife|threat|harass|extortion|serious/.test(t)) return "violence";
  if (/traffic|speed|racing|vehicle|car-related/.test(t)) return "traffic";
  return "other";
}

/** The mellanområde containing the point, with its report, or null when none matches. */
export function neighbourhoodAt(lat: number, lon: number): NeighbourhoodResult | null {
  const { records, polys } = load();
  const hit = polys.find((p) => containsPoint(p.parts, lat, lon));
  if (!hit) return null;
  const r = records.get(hit.name);
  if (!r) return null;
  const seen = new Set<string>();
  const crimes = r.common_crimes
    .filter((tag) => (seen.has(tag) ? false : (seen.add(tag), true)))
    .map((tag) => ({ tag, group: groupOf(tag) }));
  return {
    name: r.mellanomrade_name,
    stadsomrade: r.stadsomrade,
    primaromraden: r.primaromraden,
    reportYear: r.report_year,
    reportUrl: r.report_url,
    page: r.page,
    bullets: { en: r.summary_en, sv: r.summary_sv },
    crimes,
    places: r.places.map((p) => ({ name: p.name, noteEn: p.note_en })),
    trendEn: r.trend_en,
    quotes: r.quotes,
    outline: hit.parts,
  };
}
