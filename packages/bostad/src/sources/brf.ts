/**
 * BRF (bostadsrättsförening) figures from annual reports. DEMO: a hand-checked file of a
 * few associations (data/brf-demo.json), matched by the geocoded street and house number.
 * Each figure carries the PDF page it came from. No network calls. Addresses outside the
 * file return null, and the profile keeps the "awaiting Bolagsverket" stub for them.
 */
import * as fs from "fs";
import * as path from "path";
import { DATA_DIR } from "../data-dir";
import type { Precision } from "./geocode";

export interface BrfFigure<T> {
  value: T;
  /** PDF page of the source report, 1-based. */
  page: number;
  quote?: string;
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
let cache: { key: string; entries: Array<{ keys: Set<string>; result: BrfResult }> } | null = null;

/** Lower case, accents folded (å ä to a, ö to o, é to e), dots and extra spaces removed. */
export function normaliseStreet(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Barytongatan 7 A" and "Barytongatan 7A" give the same key. */
export function addressKey(street: string, number: string): string {
  return `${normaliseStreet(street)} ${number.toLowerCase().replace(/\s+/g, "")}`;
}

/** Splits an address into street and number, for a single demo address such as "Barytongatan 5A". */
export function splitAddress(address: string): { street: string; number: string } | null {
  const m = /^(.+?)\s+(\d+\s?[A-Za-zÅÄÖåäö]?)$/.exec(address.trim());
  return m ? { street: m[1], number: m[2] } : null;
}

/**
 * The street and number of a geocoder display name. Nominatim writes "28, Barytongatan, Göteborg, ..."
 * and Photon writes "Barytongatan 28, Göteborg". Both are handled. Returns null when neither fits.
 */
export function streetFromDisplayName(displayName: string): { street: string; number: string } | null {
  const parts = displayName.split(",").map((p) => p.trim());
  if (parts.length >= 2 && /^\d+\s?[A-Za-zÅÄÖåäö]?$/.test(parts[0])) {
    return { street: parts[1], number: parts[0] };
  }
  return splitAddress(parts[0] ?? "");
}

function load(): Array<{ keys: Set<string>; result: BrfResult }> {
  const raw = fs.readFileSync(DEMO_FILE, "utf8");
  if (cache && cache.key === raw) return cache.entries;
  const rows = JSON.parse(raw) as RawBrf[];
  const entries = rows.map((r) => {
    const keys = new Set<string>();
    for (const a of r.addresses) {
      const sp = splitAddress(a);
      if (sp) keys.add(addressKey(sp.street, sp.number));
    }
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
    return { keys, result };
  });
  cache = { key: raw, entries };
  return entries;
}

/** The demo association whose report covers this geocoded house, or null. Needs a house-level match. */
export function brfAt(displayName: string, precision: Precision): BrfResult | null {
  if (precision !== "address") return null;
  const sn = streetFromDisplayName(displayName);
  if (!sn) return null;
  const key = addressKey(sn.street, sn.number);
  const hit = load().find((e) => e.keys.has(key));
  return hit ? hit.result : null;
}
