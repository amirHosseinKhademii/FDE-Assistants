/**
 * Fair-rent check against the Stor-Göteborg average. Pure math, no network: the
 * user types a monthly rent and a size, and we compare kr/m² with the benchmark.
 */
import { RENT_BENCHMARK } from "@bostad/property/rent-benchmark";

export type RentVerdict = "above" | "close" | "below" | "farBelow";

export interface RentComparison {
  kronorPerM2: number;
  /** Positive when above the benchmark, negative when below. */
  percent: number;
  verdict: RentVerdict;
}

/** Reads a typed number: spaces (6 718) and a decimal comma (56,5) are allowed. Null when not a positive number. */
export function parsePositive(text: string): number | null {
  const n = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function verdictOf(percent: number): RentVerdict {
  if (percent > 5) return "above";
  if (percent >= -5) return "close";
  if (percent >= -30) return "below";
  return "farBelow";
}

export function compareRent(rentText: string, sizeText: string): RentComparison | null {
  const rent = parsePositive(rentText);
  const size = parsePositive(sizeText);
  if (rent === null || size === null) return null;
  const kronorPerM2 = rent / size;
  const percent = ((kronorPerM2 - RENT_BENCHMARK.kronorPerM2PerMonth) / RENT_BENCHMARK.kronorPerM2PerMonth) * 100;
  return { kronorPerM2, percent, verdict: verdictOf(percent) };
}
