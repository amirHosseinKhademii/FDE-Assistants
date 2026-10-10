/**
 * Address to property profile. Each section is independent: one failing source
 * is reported as status "error" with a reason, and never fails the whole profile.
 * "unavailable" means not attempted (no coordinates) or not yet wired (stubs).
 */
import { geocode, type GeocodeResult } from "./sources/geocode";
import { landslideAt, type LandslideResult } from "./sources/landslide";
import { nearestStops, type TransitResult } from "./sources/transit";
import { noiseAt, type NoiseResult } from "./sources/noise";
import { districtAt, type DistrictResult } from "./sources/district";
import { incomeAt, type IncomeResult } from "./sources/income";
import { placesAt, type PlacesResult } from "./sources/places";
import { areaAt, type AreaResult } from "./sources/area";
import { safetyAt, type SafetyResult } from "./sources/safety";
export type { TransitLine, TransitStop, TransportMode } from "./sources/transit";
export type { NoiseBuilding, NoiseResult } from "./sources/noise";
export type { AreaRef, DistrictResult } from "./sources/district";
export type { IncomeResult } from "./sources/income";
export type { AreaResult, Share } from "./sources/area";
export type { Level } from "./sources/scb";
export type { PlaceCategory, PlaceItem, PlacesResult } from "./sources/places";
export type { SafetyKey, SafetyResult, SafetyYear, SafetyFigure } from "./sources/safety";
export type { LatLng } from "./sources/crime";
export type { NeighbourhoodResult, CrimeGroup } from "./sources/neighbourhood";

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
  noise: Section<NoiseResult>;
  district: Section<DistrictResult>;
  income: Section<IncomeResult>;
  places: Section<PlacesResult>;
  area: Section<AreaResult>;
  safety: Section<SafetyResult>;
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
  // Report the provider that actually answered, not the first one asked.
  if (location.data) location.source = location.data.source;

  let landslide: Section<LandslideResult>;
  let transit: Section<TransitResult>;
  let noise: Section<NoiseResult>;
  let district: Section<DistrictResult>;
  let income: Section<IncomeResult>;
  let places: Section<PlacesResult>;
  let area: Section<AreaResult>;
  let safety: Section<SafetyResult>;
  if (location.status !== "ok" || !location.data) {
    const reason = "no coordinates (geocoding failed)";
    landslide = { status: "unavailable", reason, source: "geodata.sgi.se", fetchedAt: new Date().toISOString() };
    transit = { status: "unavailable", reason, source: "ext-api.vasttrafik.se", fetchedAt: new Date().toISOString() };
    noise = { status: "unavailable", reason, source: "goteborg.se", fetchedAt: new Date().toISOString() };
    district = { status: "unavailable", reason, source: "goteborg.se", fetchedAt: new Date().toISOString() };
    income = { status: "unavailable", reason, source: "api.scb.se", fetchedAt: new Date().toISOString() };
    places = { status: "unavailable", reason, source: "places.googleapis.com", fetchedAt: new Date().toISOString() };
    area = { status: "unavailable", reason, source: "api.scb.se", fetchedAt: new Date().toISOString() };
    safety = { status: "unavailable", reason, source: "statistik.bra.se", fetchedAt: new Date().toISOString() };
  } else {
    const { lat, lon } = location.data;
    // Every section is independent: one slow or failing source never blocks the others.
    [landslide, transit, noise, district, income, places, area] = await Promise.all([
      attempt("geodata.sgi.se", () => landslideAt(lat, lon)),
      attempt("ext-api.vasttrafik.se", () => nearestStops(lat, lon, 6)),
      attempt("goteborg.se", () => noiseAt(lat, lon)),
      attempt("goteborg.se", () => districtAt(lat, lon)),
      attempt("api.scb.se", () => incomeAt(lat, lon)),
      attempt("places.googleapis.com", () => placesAt(lat, lon)),
      attempt("api.scb.se", () => areaAt(lat, lon)),
    ]);
    // Report the provider that actually answered (Google first, Overpass as fallback).
    if (places.data) places.source = places.data.source;
    // Local BRÅ export (no network). The primärområde comes from the district lookup above.
    const primaryArea = district.data?.primaryArea?.name ?? null;
    safety = await attempt("statistik.bra.se", async () => safetyAt(lat, lon, primaryArea));
  }

  return {
    address,
    location,
    landslide,
    transit,
    noise,
    district,
    income,
    places,
    area,
    safety,
    brf: stub("bolagsverket (värdefulla datamängder)", "awaiting Bolagsverket API access"),
    energy: stub("boverket energideklaration", "awaiting Boverket agreement"),
  };
}
