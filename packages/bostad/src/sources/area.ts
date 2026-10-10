/**
 * Who lives in the small area (DeSO 2025) around the address, compared with all
 * 320 Göteborg DeSO areas. SCB PxWeb, one request per table covering every
 * Göteborg area, cached 24 h:
 *  - BO/BO0104/BO0104D/BO0104T01N2: flats by tenure (hyresrätt, bostadsrätt, äganderätt)
 *  - UF/UF0506/UF0506D/UtbSUNBefDesoRegsoN: people 25-65 by education level
 *  - BE/BE0101/BE0101Y/FolkmDesoAldKon: population by age
 *  - BE/BE0101/BE0101Y/HushallDesoTyp: households by type
 * Latest year in each table (2025). The level word for a share is its percentile
 * among the 320 areas (see scb.ts levelOf).
 */
import { featureAt, wfsBbox, wfsFeatures } from "./wfs";
import { DESO_LAYER, DESO_WFS_URL } from "./income";
import { PX_BASE, gothenburgDesos, levelOf, memo, percentileOf, pxPost, type Level, type PxRow } from "./scb";

export const TENURE_TABLE = `${PX_BASE}/BO/BO0104/BO0104D/BO0104T01N2`;
export const EDUCATION_TABLE = `${PX_BASE}/UF/UF0506/UF0506D/UtbSUNBefDesoRegsoN`;
export const POPULATION_TABLE = `${PX_BASE}/BE/BE0101/BE0101Y/FolkmDesoAldKon`;
export const HOUSEHOLDS_TABLE = `${PX_BASE}/BE/BE0101/BE0101Y/HushallDesoTyp`;
export const AREA_YEAR = "2025";

const UNDER_20 = ["-4", "5-9", "10-14", "15-19"];
const OVER_65 = ["65-69", "70-74", "75-79", "80-"];

export interface Share {
  value: number | null;
  gothenburg: number | null;
  percentile: number | null;
  level: Level | null;
}

export interface AreaResult {
  desoCode: string;
  year: string;
  flats: { count: number; rental: number | null; condo: number | null; owned: number | null; gothenburg: { rental: number | null; condo: number | null; owned: number | null } };
  /** Share of 25-65 year olds with post-secondary education. */
  higherEducation: Share;
  /** Share of residents aged 65 and over. */
  over65: Share;
  /** Share of residents under 20. */
  under20: number | null;
  /** Share of households with children (married or cohabiting, or single parent). */
  withChildren: Share;
  population: number | null;
  source: string;
}

/** Every Göteborg DeSO's value for one key, as a map from the DeSO code. */
function byDeso(rows: PxRow[], pick: (r: PxRow) => string | null): Map<string, Record<string, number>> {
  const out = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const region = r.dims.Region;
    const key = pick(r);
    if (!region || key === null || r.value === null) continue;
    const entry = out.get(region) ?? {};
    entry[key] = r.value;
    out.set(region, entry);
  }
  return out;
}

interface Tables {
  tenure: Map<string, Record<string, number>>;
  education: Map<string, Record<string, number>>;
  age: Map<string, Record<string, number>>;
  households: Map<string, Record<string, number>>;
}

/** All four tables for every Göteborg area: one request each, cached. */
async function goteborgTables(): Promise<Tables> {
  return memo("area-tables", async () => {
    const [tenureCodes, educationCodes, popCodes, householdCodes] = await Promise.all([
      gothenburgDesos(TENURE_TABLE),
      gothenburgDesos(EDUCATION_TABLE),
      gothenburgDesos(POPULATION_TABLE),
      gothenburgDesos(HOUSEHOLDS_TABLE),
    ]);
    const [tenure, education, age, households] = await Promise.all([
      pxPost(TENURE_TABLE, [
        { code: "Region", selection: { filter: "item", values: [...tenureCodes] } },
        { code: "Upplatelseform", selection: { filter: "item", values: ["1", "2", "3"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["00000864"] } },
        { code: "Tid", selection: { filter: "item", values: [AREA_YEAR] } },
      ]),
      pxPost(EDUCATION_TABLE, [
        { code: "Region", selection: { filter: "item", values: [...educationCodes] } },
        { code: "UtbildningsNiva", selection: { filter: "item", values: ["21", "3+4", "5", "6"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["000007Z6"] } },
        { code: "Tid", selection: { filter: "item", values: [AREA_YEAR] } },
      ]),
      pxPost(POPULATION_TABLE, [
        { code: "Region", selection: { filter: "item", values: [...popCodes] } },
        { code: "Alder", selection: { filter: "item", values: ["totalt", ...UNDER_20, ...OVER_65] } },
        { code: "Kon", selection: { filter: "item", values: ["1+2"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["000007Y7"] } },
        { code: "Tid", selection: { filter: "item", values: [AREA_YEAR] } },
      ]),
      pxPost(HOUSEHOLDS_TABLE, [
        { code: "Region", selection: { filter: "item", values: [...householdCodes] } },
        { code: "Hushallstyp", selection: { filter: "item", values: ["SBMB", "ESMB", "TOTALT"] } },
        { code: "ContentsCode", selection: { filter: "item", values: ["000007Y1"] } },
        { code: "Tid", selection: { filter: "item", values: [AREA_YEAR] } },
      ]),
    ]);
    return {
      tenure: byDeso(tenure, (r) => r.dims.Upplatelseform ?? null),
      education: byDeso(education, (r) => r.dims.UtbildningsNiva ?? null),
      age: byDeso(age, (r) => r.dims.Alder ?? null),
      households: byDeso(households, (r) => r.dims.Hushallstyp ?? null),
    };
  });
}

/** A share for one area, its Gothenburg value, and its percentile among all Göteborg areas. */
function shareOf(
  all: Map<string, number>,
  desoCode: string,
  gothenburg: number | null,
): Share {
  const value = all.get(desoCode) ?? null;
  const values = [...all.values()];
  const percentile = value !== null && values.length >= 100 ? percentileOf(value, values) : null;
  return { value, gothenburg, percentile, level: percentile !== null ? levelOf(percentile) : null };
}

/** Each area's share: numerator over denominator, skipping areas missing either. */
function sharesOf(
  table: Map<string, Record<string, number>>,
  numerator: (e: Record<string, number>) => number | null,
  denominator: (e: Record<string, number>) => number | null,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [code, entry] of table) {
    const n = numerator(entry);
    const d = denominator(entry);
    if (n !== null && d !== null && d > 0) out.set(code, n / d);
  }
  return out;
}

const sumOf = (e: Record<string, number>, keys: string[]): number | null => {
  const present = keys.filter((k) => e[k] !== undefined);
  return present.length ? present.reduce((acc, k) => acc + e[k], 0) : null;
};

export async function areaAt(lat: number, lon: number): Promise<AreaResult> {
  const features = await wfsFeatures(DESO_WFS_URL, DESO_LAYER, wfsBbox(lat, lon, 2));
  const hit = featureAt(features, lat, lon);
  const desoCode = String(hit?.properties?.desokod ?? "");
  if (!desoCode) throw new Error("no DeSO area contains this point");
  const region = `${desoCode}_DeSO2025`;
  const t = await goteborgTables();

  // Tenure: flats by form. Gothenburg is the sum over all areas.
  const flatsOf = (e: Record<string, number> | undefined) => ({
    rental: e ? (e["1"] ?? null) : null,
    condo: e ? (e["2"] ?? null) : null,
    owned: e ? (e["3"] ?? null) : null,
  });
  const tenureHere = t.tenure.get(region);
  const cityTenure = { rental: 0, condo: 0, owned: 0 };
  for (const e of t.tenure.values()) {
    cityTenure.rental += e["1"] ?? 0;
    cityTenure.condo += e["2"] ?? 0;
    cityTenure.owned += e["3"] ?? 0;
  }
  const flatTotal = (e: Record<string, number> | undefined) => (e ? sumOf(e, ["1", "2", "3"]) ?? 0 : 0);
  const flatsHere = flatsOf(tenureHere);
  const totalHere = flatTotal(tenureHere);
  const share = (n: number | null, total: number) => (n !== null && total > 0 ? n / total : null);
  const cityTotal = cityTenure.rental + cityTenure.condo + cityTenure.owned;

  // Education: post-secondary (5, 6) over all levels (21, 3+4, 5, 6).
  const eduHigher = sharesOf(
    t.education,
    (e) => sumOf(e, ["5", "6"]),
    (e) => sumOf(e, ["21", "3+4", "5", "6"]),
  );
  const cityEdu = (() => {
    let high = 0;
    let all = 0;
    for (const e of t.education.values()) {
      high += sumOf(e, ["5", "6"]) ?? 0;
      all += sumOf(e, ["21", "3+4", "5", "6"]) ?? 0;
    }
    return all > 0 ? high / all : null;
  })();

  // Age: share 65+ and under 20, over the totalt row of each area.
  const over65 = sharesOf(t.age, (e) => sumOf(e, OVER_65), (e) => e.totalt ?? null);
  const under20Map = sharesOf(t.age, (e) => sumOf(e, UNDER_20), (e) => e.totalt ?? null);
  const cityAge = (() => {
    let total = 0;
    let old = 0;
    let young = 0;
    for (const e of t.age.values()) {
      total += e.totalt ?? 0;
      old += sumOf(e, OVER_65) ?? 0;
      young += sumOf(e, UNDER_20) ?? 0;
    }
    return total > 0 ? { over65: old / total, under20: young / total, population: total } : null;
  })();

  // Households with children: married/cohabiting or single parent, over all households.
  const withChildren = sharesOf(
    t.households,
    (e) => sumOf(e, ["SBMB", "ESMB"]),
    (e) => e.TOTALT ?? null,
  );
  const cityChildren = (() => {
    let kids = 0;
    let all = 0;
    for (const e of t.households.values()) {
      kids += sumOf(e, ["SBMB", "ESMB"]) ?? 0;
      all += e.TOTALT ?? 0;
    }
    return all > 0 ? kids / all : null;
  })();

  const population = t.age.get(region)?.totalt ?? null;

  return {
    desoCode,
    year: AREA_YEAR,
    flats: {
      count: totalHere,
      rental: share(flatsHere.rental, totalHere),
      condo: share(flatsHere.condo, totalHere),
      owned: share(flatsHere.owned, totalHere),
      gothenburg: {
        rental: share(cityTenure.rental, cityTotal),
        condo: share(cityTenure.condo, cityTotal),
        owned: share(cityTenure.owned, cityTotal),
      },
    },
    higherEducation: { ...shareOf(eduHigher, region, cityEdu), gothenburg: cityEdu },
    over65: { ...shareOf(over65, region, cityAge?.over65 ?? null), gothenburg: cityAge?.over65 ?? null },
    under20: under20Map.get(region) ?? null,
    withChildren: { ...shareOf(withChildren, region, cityChildren), gothenburg: cityChildren },
    population,
    source: "api.scb.se",
  };
}

