/**
 * Address to property profile. Each section is independent: one failing source
 * is reported as status "error" with a reason, and never fails the whole profile.
 * "unavailable" means not attempted (no coordinates) or not yet wired (stubs).
 */
import { geocode, type GeocodeResult } from "./sources/geocode";
import { landslideAt, type LandslideResult } from "./sources/landslide";
import { nearestStops, type TransitResult } from "./sources/transit";

export type SectionStatus = "ok" | "error" | "unavailable";

export interface Section<T> {
  status: SectionStatus;
  data?: T;
  reason?: string;
  source: string;
  fetchedAt: string;
}

export interface Profile {
  address: string;
  location: Section<GeocodeResult>;
  landslide: Section<LandslideResult>;
  transit: Section<TransitResult>;
  brf: Section<never>;
  energy: Section<never>;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function attempt<T>(
  source: string,
  run: () => Promise<T>,
): Promise<Section<T>> {
  const fetchedAt = new Date().toISOString();
  try {
    const data = await run();
    return { status: "ok", data, source, fetchedAt };
  } catch (e) {
    return { status: "error", reason: errorMessage(e), source, fetchedAt };
  }
}

function stub(source: string, reason: string): Section<never> {
  return { status: "unavailable", reason, source, fetchedAt: new Date().toISOString() };
}

export async function getProfile(address: string): Promise<Profile> {
  const location = await attempt("nominatim.openstreetmap.org", () => geocode(address));

  let landslide: Section<LandslideResult>;
  let transit: Section<TransitResult>;
  if (location.status !== "ok" || !location.data) {
    const reason = "no coordinates (geocoding failed)";
    landslide = { status: "unavailable", reason, source: "geodata.sgi.se", fetchedAt: new Date().toISOString() };
    transit = { status: "unavailable", reason, source: "ext-api.vasttrafik.se", fetchedAt: new Date().toISOString() };
  } else {
    const { lat, lon } = location.data;
    [landslide, transit] = await Promise.all([
      attempt("geodata.sgi.se", () => landslideAt(lat, lon)),
      attempt("ext-api.vasttrafik.se", () => nearestStops(lat, lon, 5)),
    ]);
  }

  return {
    address,
    location,
    landslide,
    transit,
    brf: stub("bolagsverket (värdefulla datamängder)", "awaiting Bolagsverket API access"),
    energy: stub("boverket energideklaration", "awaiting Boverket agreement"),
  };
}
