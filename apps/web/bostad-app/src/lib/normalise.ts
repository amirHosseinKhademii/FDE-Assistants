/**
 * Turns whatever /api/profile sent into a fully-shaped Profile. The server and
 * this client can be a build apart (a stale dev server, a cached response), so
 * every array defaults to [] and every field the UI reads is checked here, once,
 * rather than at each use. Anything that cannot be trusted becomes a failed
 * section with a reason, never a crash.
 */
import type {
  AreaRef,
  AreaResult,
  Level,
  NoiseResult,
  Share,
  PlaceCategory,
  PlaceItem,
  PlacesResult,
  SafetyFigure,
  SafetyResult,
  SafetyYear,
  Profile,
  Section,
  TransitLine,
  TransitStop,
  TransportMode,
} from "@bostad/property";
import type { Mode } from "./transport";

type Loose = Record<string, unknown>;

const PRIMARY: Mode[] = ["tram", "train", "ferry", "bus"];
const ALL_MODES: TransportMode[] = [...PRIMARY, "other"];
const STATUSES = ["ok", "error", "unavailable"] as const;
const PRECISIONS = ["address", "street", "area"] as const;

function isObject(v: unknown): v is Loose {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** A timestamp the clock helpers can format. Anything else is replaced by the receive time. */
function isoOr(v: unknown, fallback: string): string {
  return typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : fallback;
}

function asMode(v: unknown): TransportMode {
  return ALL_MODES.includes(v as TransportMode) ? (v as TransportMode) : "other";
}

function normaliseLine(raw: unknown): TransitLine | null {
  if (!isObject(raw)) return null;
  const shortName = str(raw.shortName).trim();
  if (!shortName) return null;
  const colour = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
  return {
    shortName,
    mode: asMode(raw.mode),
    backgroundColor: colour(raw.backgroundColor),
    foregroundColor: colour(raw.foregroundColor),
    borderColor: colour(raw.borderColor),
    directions: arr(raw.directions).filter((d): d is string => typeof d === "string").slice(0, 3),
  };
}

function normaliseStop(raw: unknown): TransitStop | null {
  if (!isObject(raw)) return null;
  const lat = finite(raw.lat);
  const lon = finite(raw.lon);
  if (lat === null || lon === null) return null;
  const modes = arr(raw.modes).filter((m): m is Mode => PRIMARY.includes(m as Mode));
  const lines = arr(raw.lines)
    .map(normaliseLine)
    .filter((l): l is TransitLine => l !== null);
  return {
    name: str(raw.name, "unknown"),
    id: str(raw.id),
    lat,
    lon,
    distanceMeters: finite(raw.distanceMeters) ?? 0,
    // Sorted in display order, duplicates dropped.
    modes: PRIMARY.filter((m) => modes.includes(m)),
    lines,
  };
}

/** Wraps a raw section: keeps its status and metadata, runs `fix` on its data. */
function normaliseSection<T>(raw: unknown, receivedAt: string, fix: (data: unknown) => T | undefined): Section<T> {
  const r = isObject(raw) ? raw : {};
  const status = STATUSES.includes(r.status as (typeof STATUSES)[number])
    ? (r.status as Section<T>["status"])
    : "error";
  const base = {
    source: str(r.source),
    fetchedAt: isoOr(r.fetchedAt, receivedAt),
  };
  if (status !== "ok") {
    return { ...base, status, reason: typeof r.reason === "string" ? r.reason : undefined };
  }
  const data = fix(r.data);
  if (data === undefined) {
    return { ...base, status: "error", reason: "response had no usable data" };
  }
  return { ...base, status: "ok", data };
}

function normaliseLocation(data: unknown) {
  if (!isObject(data)) return undefined;
  const lat = finite(data.lat);
  const lon = finite(data.lon);
  if (lat === null || lon === null) return undefined;
  const precision = PRECISIONS.includes(data.precision as (typeof PRECISIONS)[number])
    ? (data.precision as (typeof PRECISIONS)[number])
    : "area"; // unknown precision: treat as the least exact, so risk and transport stay hidden
  return {
    lat,
    lon,
    displayName: str(data.displayName),
    source: str(data.source) as "nominatim.openstreetmap.org" | "photon.komoot.io",
    precision,
  };
}

function normaliseLandslide(data: unknown) {
  if (!isObject(data) || typeof data.inRiskArea !== "boolean") return undefined;
  return {
    inRiskArea: data.inRiskArea,
    features: arr(data.features)
      .filter(isObject)
      .map((f) => ({ attributes: isObject(f.attributes) ? f.attributes : {} })),
    source: str(data.source),
  };
}

function normaliseNoise(data: unknown) {
  if (!isObject(data)) return undefined;
  let building: NoiseResult["building"] = null;
  if (data.building !== null && data.building !== undefined) {
    const b = data.building;
    const loudest = isObject(b) ? finite(b.loudestDb) : null;
    if (!isObject(b) || loudest === null) return undefined;
    building = {
      distanceMeters: finite(b.distanceMeters) ?? 0,
      floors: finite(b.floors),
      streetDb: finite(b.streetDb),
      topDb: finite(b.topDb),
      loudestDb: loudest,
      matched: b.matched === "footprint" ? "footprint" : "cluster",
      points: finite(b.points) ?? 0,
    };
  }
  const bandMin = isObject(data.band) ? finite(data.band.minDb) : null;
  const band =
    isObject(data.band) && bandMin !== null
      ? { minDb: bandMin, maxDb: finite(data.band.maxDb) }
      : null;
  return {
    building,
    band,
    guidelineDb: finite(data.guidelineDb) ?? 55,
    radiusMeters: finite(data.radiusMeters) ?? 25,
    source: str(data.source),
  };
}

function normaliseArea(raw: unknown): AreaRef | null {
  if (!isObject(raw)) return null;
  const nr = str(raw.nr);
  return nr ? { nr, name: str(raw.name) } : null;
}

function normaliseDistrict(data: unknown) {
  if (!isObject(data)) return undefined;
  return {
    stadsomrade: normaliseArea(data.stadsomrade),
    primaryArea: normaliseArea(data.primaryArea),
    source: str(data.source),
  };
}

function normaliseIncome(data: unknown) {
  if (!isObject(data)) return undefined;
  const desoCode = str(data.desoCode);
  if (!desoCode) return undefined;
  return {
    desoCode,
    medianDesoTkr: finite(data.medianDesoTkr),
    medianGothenburgTkr: finite(data.medianGothenburgTkr),
    percentile: finite(data.percentile),
    level: LEVELS.find((l) => l === data.level) ?? null,
    areaCount: finite(data.areaCount) ?? 0,
    year: str(data.year),
    source: str(data.source),
  };
}

const LEVELS: Level[] = ["low", "belowAverage", "average", "aboveAverage", "high"];

function normaliseShare(data: unknown): Share {
  const d = isObject(data) ? data : {};
  return {
    value: finite(d.value),
    gothenburg: finite(d.gothenburg),
    percentile: finite(d.percentile),
    level: LEVELS.find((l) => l === d.level) ?? null,
  };
}

function normaliseAreaStats(data: unknown): AreaResult | undefined {
  if (!isObject(data)) return undefined;
  const desoCode = str(data.desoCode);
  if (!desoCode) return undefined;
  const flats = isObject(data.flats) ? data.flats : {};
  const city = isObject(flats.gothenburg) ? flats.gothenburg : {};
  return {
    desoCode,
    year: str(data.year),
    flats: {
      count: finite(flats.count) ?? 0,
      rental: finite(flats.rental),
      condo: finite(flats.condo),
      owned: finite(flats.owned),
      gothenburg: { rental: finite(city.rental), condo: finite(city.condo), owned: finite(city.owned) },
    },
    higherEducation: normaliseShare(data.higherEducation),
    over65: normaliseShare(data.over65),
    under20: finite(data.under20),
    withChildren: normaliseShare(data.withChildren),
    population: finite(data.population),
    source: str(data.source),
  };
}

const CATEGORIES: PlaceCategory[] = [
  "grocery",
  "pharmacy",
  "health",
  "school",
  "preschool",
  "park",
  "gym",
  "eatery",
];

function normalisePlaceItem(raw: unknown): PlaceItem | null {
  if (!isObject(raw)) return null;
  const lat = finite(raw.lat);
  const lon = finite(raw.lon);
  const category = CATEGORIES.find((c) => c === raw.category);
  if (lat === null || lon === null || !category) return null;
  return {
    id: str(raw.id),
    name: str(raw.name),
    category,
    lat,
    lon,
    distanceMeters: finite(raw.distanceMeters) ?? 0,
  };
}

function normalisePlaces(data: unknown) {
  if (!isObject(data)) return undefined;
  const items = arr(data.items)
    .map(normalisePlaceItem)
    .filter((i): i is PlaceItem => i !== null);
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, finite(isObject(data.counts) ? data.counts[c] : null) ?? 0]),
  ) as PlacesResult["counts"];
  const nearest: PlacesResult["nearest"] = {};
  for (const c of CATEGORIES) {
    const item = isObject(data.nearest) ? normalisePlaceItem(data.nearest[c]) : null;
    if (item) nearest[c] = item;
  }
  return {
    radiusMeters: finite(data.radiusMeters) ?? 1500,
    countRadiusMeters: finite(data.countRadiusMeters) ?? 500,
    counts,
    nearest,
    items,
    source: str(data.source),
  };
}

function normaliseTransit(data: unknown) {
  if (!isObject(data)) return undefined;
  const stops = arr(data.stops)
    .map(normaliseStop)
    .filter((s): s is TransitStop => s !== null);
  return { stops, source: str(data.source) };
}

const SAFETY_CATS = ["all", "violence", "burglary", "carTheft", "theftFromCar", "bikeTheft", "vandalism", "fraud", "drugs"] as const;

function safetyFigure(v: unknown): SafetyFigure {
  const o = isObject(v) ? v : {};
  return { count: finite(o.count), per1000: finite(o.per1000) };
}

function normaliseSafety(data: unknown): SafetyResult | undefined {
  if (!isObject(data)) return undefined;
  const years = arr(data.years)
    .filter(isObject)
    .map((y): SafetyYear => {
      const raw = isObject(y.cats) ? y.cats : {};
      const cats = {} as SafetyYear["cats"];
      for (const k of SAFETY_CATS) {
        const c = isObject(raw[k]) ? raw[k] : {};
        cats[k] = { district: safetyFigure(c.district), city: safetyFigure(c.city) };
      }
      return {
        year: finite(y.year) ?? 0,
        area: typeof y.area === "string" ? y.area : null,
        verified: y.verified === true,
        basis: y.basis === "polygon" || y.basis === "mapping" ? y.basis : null,
        cats,
      };
    });
  const outline = isObject(data.outline) ? data.outline : null;
  const point = (v: unknown) => {
    const p = isObject(v) ? v : {};
    return { lat: finite(p.lat) ?? 0, lng: finite(p.lng) ?? 0 };
  };
  return {
    years,
    latestYear: finite(data.latestYear),
    outline: outline
      ? { name: str(outline.name), parts: arr(outline.parts).map((part) => arr(part).map((ring) => arr(ring).map(point))) }
      : null,
    outlineName: typeof data.outlineName === "string" ? data.outlineName : null,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : null,
  };
}

/**
 * The whole profile, or null when the body is not an object at all. Missing
 * sections come back as failed sections, so the UI always has all of them.
 */
export function normaliseProfile(raw: unknown, now: string = new Date().toISOString()): Profile | null {
  if (!isObject(raw)) return null;
  return {
    address: str(raw.address),
    location: normaliseSection(raw.location, now, normaliseLocation),
    landslide: normaliseSection(raw.landslide, now, normaliseLandslide),
    transit: normaliseSection(raw.transit, now, normaliseTransit),
    noise: normaliseSection(raw.noise, now, normaliseNoise),
    district: normaliseSection(raw.district, now, normaliseDistrict),
    income: normaliseSection(raw.income, now, normaliseIncome),
    area: normaliseSection(raw.area, now, normaliseAreaStats),
    safety: normaliseSection(raw.safety, now, normaliseSafety),
    places: normaliseSection(raw.places, now, normalisePlaces),
    brf: normaliseSection<never>(raw.brf, now, () => undefined),
    energy: normaliseSection<never>(raw.energy, now, () => undefined),
  };
}
