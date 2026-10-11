/**
 * BRF (bostadsrättsförening) figures from annual reports. DEMO: a hand-checked file of a
 * few associations (data/brf-demo.json), matched by the typed street and house number, or the geocoder's when it placed the house.
 * Each figure carries the PDF page it came from. No network calls. Addresses outside the
 * file return null, and the profile keeps the "awaiting Bolagsverket" stub for them.
 */
import * as fs from "fs";
import * as path from "path";
import { DATA_DIR } from "../data-dir";
import type { GeocodeResult } from "./geocode";

export interface BrfFigure<T> {
  value: T;
  /** PDF page of the source report, 1-based. */
  page: number;
  quote?: string;
  /** How the figure was got, when the report needs a note (e.g. the year-end date or the flats it covers). */
  basis?: string;
}

export interface BrfResult {
  name: string;
  orgNr: string;
  /** Financial year as the report names it. */
  year: number;
  /** The demo addresses of this association. */
  addresses: string[];
  /** The PDF; link with #page=N to open a figure's page. */
  sourceUrl: string;
  debtPerSqm: BrfFigure<number> | null;
  annualFeePerSqm: BrfFigure<number> | null;
  /** Interest cost per year in kr, negative as the income statement shows it. */
  interestCost: BrfFigure<number> | null;
  plannedMaintenance: BrfFigure<string> | null;
  /** "none" when the auditor's report has no remark, "remark" when it has one. */
  auditorRemarks: BrfFigure<"none" | "remark"> | null;
}

interface RawFigure<T> {
  value: T;
  page: number;
  quote?: string;
  basis?: string;
}

interface RawBrf {
  name: string;
  org_nr: string;
  year: number;
  addresses: string[];
  source_url: string;
  figures: {
    debt_per_sqm: RawFigure<number> | null;
    annual_fee_per_sqm: RawFigure<number> | null;
    interest_cost: RawFigure<number> | null;
    planned_maintenance: RawFigure<string> | null;
    auditor_remarks: RawFigure<"none" | "remark"> | null;
  };
}

const DEMO_FILE = path.join(DATA_DIR, "brf-demo.json");

/** One house on a street: "5A" is { n: 5, letter: "a" }. Lists and ranges expand to several. */
export interface HouseNo {
  n: number;
  letter: string;
}

interface Row {
  streetKey: string;
  house: HouseNo;
  result: BrfResult;
}

let cache: { key: string; rows: Row[] } | null = null;

/**
 * The street as a match key: lower case, accents folded (å ä to a, ö to o, é to e), dots dropped,
 * "g" and "gatan" read as "gata", and spaces and hyphens removed. "Gösta Berlings g.",
 * "Gösta Berlings gata" and "Gösta Berlingsgatan" all give the same key.
 */
export function streetKey(street: string): string {
  const words = street
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\./g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => (w === "g" ? "gata" : w.endsWith("gatan") ? w.slice(0, -1) : w));
  return words.join("").replace(/[^a-z0-9]/g, "");
}

/**
 * A house number as typed or geocoded: "5A", "7 B", a list "20,22" or a range "20-24".
 * Null when the text is not a house number. A range longer than 100 numbers is refused.
 */
export function parseHouseNumbers(spec: string): HouseNo[] | null {
  const s = spec.toLowerCase().replace(/\s+/g, "");
  let m = /^(\d+)([a-z])?$/.exec(s);
  if (m) return [{ n: Number(m[1]), letter: m[2] ?? "" }];
  m = /^(\d+)-(\d+)$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b < a || b - a > 100) return null;
    const out: HouseNo[] = [];
    for (let n = a; n <= b; n++) out.push({ n, letter: "" });
    return out;
  }
  if (/^\d+(,\d+)+$/.test(s)) return s.split(",").map((x) => ({ n: Number(x), letter: "" }));
  return null;
}

/** Splits "Barytongatan 5A" or "Haga Östergata 20,22" into street and number. Null when no number is there. */
export function splitAddress(address: string): { street: string; number: string } | null {
  const m = /^(.+?)\s+(\d+(?:\s?[-,]\s?\d+)*(?:\s?[A-Za-zÅÄÖåäö])?)$/.exec(address.trim());
  return m ? { street: m[1], number: m[2] } : null;
}

const NUMBER_PART = /^\d+(?:\s?[-,]\s?\d+)*(?:\s?[A-Za-zÅÄÖåäö])?$/;

/**
 * The road and house number of a geocoder display name. Seen forms: "29, Sveagatan, ..." (Nominatim),
 * "Barytongatan 28, Göteborg" (Photon), "20,22, Haga Östergata, ..." (a number list),
 * "Šnyt pilsnercafé, 29, Sveagatan, ..." (a place name before the number) and
 * "Västra Stillestorpsgatan, Rambergsstaden, ..." (no number at all, number is null).
 * Parts are split on ", " so a list written "20,22" stays one part.
 */
export function roadFromDisplayName(displayName: string): { street: string; number: string | null } | null {
  const parts = displayName.split(/,\s+/).map((p) => p.trim());
  const direct = splitAddress(parts[0] ?? "");
  if (direct) return direct;
  for (let i = 0; i < Math.min(parts.length - 1, 2); i++) {
    if (NUMBER_PART.test(parts[i]) && parts[i + 1]) {
      return { street: parts[i + 1], number: parts[i].replace(/\s+/g, "") };
    }
  }
  return parts[0] ? { street: parts[0], number: null } : null;
}

/** The street and number of a geocoder display name, or null when the display name has no house number. */
export function streetFromDisplayName(displayName: string): { street: string; number: string } | null {
  const r = roadFromDisplayName(displayName);
  return r && r.number ? { street: r.street, number: r.number } : null;
}

function load(): Row[] {
  const raw = fs.readFileSync(DEMO_FILE, "utf8");
  if (cache && cache.key === raw) return cache.rows;
  const data = JSON.parse(raw) as RawBrf[];
  const rows: Row[] = [];
  for (const r of data) {
    const f = r.figures;
    const result: BrfResult = {
      name: r.name,
      orgNr: r.org_nr,
      year: r.year,
      addresses: r.addresses,
      sourceUrl: r.source_url,
      debtPerSqm: f.debt_per_sqm,
      annualFeePerSqm: f.annual_fee_per_sqm,
      interestCost: f.interest_cost,
      plannedMaintenance: f.planned_maintenance,
      auditorRemarks: f.auditor_remarks,
    };
    for (const a of r.addresses) {
      const sp = splitAddress(a);
      const houses = sp ? parseHouseNumbers(sp.number) : null;
      if (!sp || !houses) continue;
      for (const house of houses) rows.push({ streetKey: streetKey(sp.street), house, result });
    }
  }
  cache = { key: raw, rows };
  return rows;
}

/** The association whose demo report lists this street and house number. A street alone never matches. */
function findBrf(street: string, number: string): BrfResult | null {
  const wanted = parseHouseNumbers(number);
  if (!wanted) return null;
  const key = streetKey(street);
  const row = load().find(
    (r) => r.streetKey === key && wanted.some((w) => w.n === r.house.n && w.letter === r.house.letter),
  );
  return row ? row.result : null;
}

/**
 * The demo association for this address, or null. The typed address goes first, as the user wrote it.
 * Then, only when the geocoder placed a house (precision "address"), its road and house number are tried.
 * The typed number is used when the geocoder gave none, and a geocoder number must contain the typed one.
 * A letter must match ("7" is not "7A").
 */
export function brfAt(
  typedAddress: string,
  geo: Pick<GeocodeResult, "displayName" | "precision"> | null,
): BrfResult | null {
  const typed = splitAddress(typedAddress.split(/,\s*/)[0] ?? "");
  if (typed) {
    const hit = findBrf(typed.street, typed.number);
    if (hit) return hit;
  }
  if (geo && geo.precision === "address") {
    const road = roadFromDisplayName(geo.displayName);
    if (road) {
      // A geocoder number must include the typed number, or the geocoder has snapped to a neighbour.
      const typedHouses = typed ? parseHouseNumbers(typed.number) : null;
      const geoHouses = road.number ? parseHouseNumbers(road.number) : null;
      const agrees = !typedHouses || !geoHouses || typedHouses.some((t) => geoHouses.some((g) => g.n === t.n));
      const number = road.number ?? typed?.number ?? null;
      if (agrees && number) {
        const hit = findBrf(road.street, number);
        if (hit) return hit;
      }
    }
  }
  return null;
}
