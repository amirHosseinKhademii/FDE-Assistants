/**
 * The Safety card's data: reported crimes (BRÅ, local export) for 2002-2025 at the
 * address's district, per 1 000 residents next to the city, for the categories the card
 * shows. 2021-2025 the district is the stadsområde (verified polygon, population from
 * SCB). 2002-2020 the primärområde is mapped by name to its stadsdelsnämndsområde
 * (unverified): counts only, no per-1 000. No network calls.
 */
import { crimeHistory, outlineAt, displayAreaName, type CategoryCount, type LatLng, type SubKey, type YearCrime } from "./crime";
import { neighbourhoodAt, type NeighbourhoodResult } from "./neighbourhood";

export type SafetyKey = "all" | "violence" | "burglary" | "carTheft" | "theftFromCar" | "bikeTheft" | "vandalism" | "fraud" | "drugs";

export const SAFETY_KEYS: SafetyKey[] = ["all", "violence", "burglary", "carTheft", "theftFromCar", "bikeTheft", "vandalism", "fraud", "drugs"];

const PARTS: Record<Exclude<SafetyKey, "all">, SubKey[]> = {
  violence: ["misshandel", "ran"],
  burglary: ["bostadsinbrott_lagenhet", "bostadsinbrott_villa"],
  carTheft: ["biltillgrepp"],
  theftFromCar: ["stold_ur_fordon"],
  bikeTheft: ["cykelstold"],
  vandalism: ["skadegorelse"],
  fraud: ["bedrageri"],
  drugs: ["narkotikabrott"],
};

export interface SafetyFigure {
  count: number | null;
  /** null when there is no population for the area and year (2002-2020 districts). */
  per1000: number | null;
}

export interface SafetyYear {
  year: number;
  /** Display name of the district used this year, e.g. "Centrum" or "Majorna-Linne". */
  area: string | null;
  /** True only for the stadsområde polygon (2021-2025). */
  verified: boolean;
  basis: YearCrime["basis"];
  cats: Record<SafetyKey, { district: SafetyFigure; city: SafetyFigure }>;
}

export interface SafetyResult {
  /** Oldest first, 2002-2025. */
  years: SafetyYear[];
  latestYear: number | null;
  /** The stadsområde containing the address (2021+), outlined on the map. */
  outline: { name: string; parts: LatLng[][][] } | null;
  outlineName: string | null;
  /** The mellanområde containing the address and its city/police assessment (2024 reports). */
  neighbourhood: NeighbourhoodResult | null;
  exportedAt: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Sum of several BRÅ subcategories; null if any part is missing or suppressed. */
function sumParts(parts: (CategoryCount | undefined)[], pick: "count" | "cityCount"): number | null {
  let total = 0;
  for (const p of parts) {
    if (!p) return null;
    const v = pick === "count" ? p.count : p.cityCount;
    if (v === null) return null;
    total += v;
  }
  return total;
}

function figure(count: number | null, pop: number | null): SafetyFigure {
  return { count, per1000: count !== null && pop !== null && pop > 0 ? round2((count / pop) * 1000) : null };
}

function yearOf(y: YearCrime): SafetyYear {
  const cats = {} as SafetyYear["cats"];
  for (const key of SAFETY_KEYS) {
    if (key === "all") {
      cats.all = {
        district: figure(y.total.count, y.population),
        city: figure(y.total.cityCount, y.cityPopulation),
      };
      continue;
    }
    const parts = PARTS[key].map((k) => y.subcategories[k]);
    cats[key] = {
      district: figure(sumParts(parts, "count"), y.population),
      city: figure(sumParts(parts, "cityCount"), y.cityPopulation),
    };
  }
  return {
    year: y.year,
    area: displayAreaName(y.area),
    verified: y.verified,
    basis: y.basis,
    cats,
  };
}

export function safetyAt(lat: number, lon: number, primaryArea: string | null): SafetyResult {
  const history = crimeHistory(lat, lon, primaryArea);
  const years = history.years
    .filter((y) => y.year >= 2002)
    .map(yearOf)
    .sort((a, b) => a.year - b.year);
  const latest = [...years].reverse().find((y) => y.cats.all.district.count !== null) ?? null;
  const outline = outlineAt(lat, lon, "stadsomrade_2021");
  return {
    years,
    latestYear: latest?.year ?? null,
    outline: outline ? { name: outline.name, parts: outline.parts } : null,
    outlineName: displayAreaName(outline?.name ?? null),
    neighbourhood: neighbourhoodAt(lat, lon),
    exportedAt: history.years[0]?.exportedAt ?? null,
  };
}
