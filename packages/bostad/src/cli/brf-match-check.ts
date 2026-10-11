/**
 * Offline self-test for the BRF address matcher. Asserts that the demo addresses match their
 * association, both from the typed address alone and from the geocoder's display names seen in
 * practice, and that addresses outside the demo file do not match. No network. Run: pnpm brf:match:check
 */
import { brfAt, streetKey, parseHouseNumbers, type BrfResult } from "../sources/brf";

function assert(cond: unknown, message: string): void {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

type Geo = { displayName: string; precision: "address" | "street" | "area" };

const SVEAGATAN_GEO: Geo = { displayName: "Šnyt pilsnercafé, 29, Sveagatan, Kommendantsängen, Olivedal, Göteborg", precision: "address" };
const HAGA_GEO: Geo = { displayName: "20,22, Haga Östergata, Haga, Göteborg, Sverige", precision: "address" };
const STILLESTORP_GEO: Geo = { displayName: "Västra Stillestorpsgatan, Rambergsstaden, Göteborg, Sverige", precision: "street" };
const BARYTONGATAN_GEO: Geo = { displayName: "28, Barytongatan, Göteborg, Sverige", precision: "address" };
const BRATTERAS_GEO: Geo = { displayName: "Bratteråsgatan 40, Göteborg", precision: "address" };
const SEGLARE_GEO: Geo = { displayName: "4, Seglaregatan, Göteborg, Sverige", precision: "address" };
const GOSTA_GEO: Geo = { displayName: "32, Gösta Berlings gata, Göteborg, Sverige", precision: "address" };

const cases: Array<{ typed: string; geo: Geo | null; brf: string }> = [
  { typed: "Sveagatan 29, Göteborg", geo: null, brf: "HSB Brf Linné i Göteborg" },
  { typed: "Sveagatan 29, Göteborg", geo: SVEAGATAN_GEO, brf: "HSB Brf Linné i Göteborg" },
  { typed: "Haga Östergata 22, Göteborg", geo: null, brf: "HSB Brf Ada i Göteborg" },
  { typed: "Haga Östergata 22, Göteborg", geo: HAGA_GEO, brf: "HSB Brf Ada i Göteborg" },
  { typed: "Västra Stillestorpsgatan 21, Göteborg", geo: null, brf: "HSB Brf Linjalen i Göteborg" },
  { typed: "Västra Stillestorpsgatan 21, Göteborg", geo: STILLESTORP_GEO, brf: "HSB Brf Linjalen i Göteborg" },
  { typed: "Barytongatan 28, Göteborg", geo: BARYTONGATAN_GEO, brf: "HSB Brf Sörgården i Göteborg" },
  { typed: "Bratteråsgatan 40, Göteborg", geo: BRATTERAS_GEO, brf: "Brf Kronjuvelen i Göteborg" },
  { typed: "Seglaregatan 4, Göteborg", geo: SEGLARE_GEO, brf: "HSB Brf Seglaren i Göteborg" },
  { typed: "Gösta Berlings gata 32, Göteborg", geo: GOSTA_GEO, brf: "HSB Brf Bäckebol i Göteborg" },
  { typed: "Gösta Berlings g. 32, Göteborg", geo: null, brf: "HSB Brf Bäckebol i Göteborg" },
  { typed: "Gösta Berlingsgatan 32", geo: null, brf: "HSB Brf Bäckebol i Göteborg" },
  { typed: "HAGA ÖSTERGATA 22", geo: null, brf: "HSB Brf Ada i Göteborg" },
  { typed: "Barytongatan 5a, Göteborg", geo: null, brf: "HSB Brf Sörgården i Göteborg" },
  { typed: "Haga Östergata 20, Göteborg", geo: HAGA_GEO, brf: "HSB Brf Ada i Göteborg" },
];

const negatives: Array<{ typed: string; geo: Geo | null }> = [
  { typed: "Sveagatan 31, Göteborg", geo: null },
  { typed: "Sveagatan 31, Göteborg", geo: SVEAGATAN_GEO },
  { typed: "Kungsgatan 1, Göteborg", geo: null },
  { typed: "Sveagatan, Göteborg", geo: null },
  { typed: "Barytongatan 7, Göteborg", geo: null },
  { typed: "Haga Östergata 24, Göteborg", geo: null },
  { typed: "Västra Stillestorpsgatan, Göteborg", geo: STILLESTORP_GEO },
];

let checked = 0;
for (const c of cases) {
  const hit: BrfResult | null = brfAt(c.typed, c.geo);
  assert(hit, `${c.typed} (${c.geo ? "with geocoder" : "typed only"}) should match ${c.brf}`);
  assert(hit!.name === c.brf, `${c.typed} matched ${hit!.name}, expected ${c.brf}`);
  checked++;
}
for (const n of negatives) {
  const hit = brfAt(n.typed, n.geo);
  assert(hit === null, `${n.typed} (${n.geo ? "with geocoder" : "typed only"}) should not match, got ${hit?.name}`);
  checked++;
}

assert(streetKey("Gösta Berlings g.") === streetKey("Gösta Berlings gata"), "g. and gata give one key");
assert(streetKey("Västra Stillestorpsgatan") === streetKey("Västra Stillestorpsgata"), "gatan and gata give one key");
assert(streetKey("Haga Östergata") === streetKey("haga ostergata"), "diacritics fold");
assert(JSON.stringify(parseHouseNumbers("20,22")) === JSON.stringify([{ n: 20, letter: "" }, { n: 22, letter: "" }]), "number list");
assert(parseHouseNumbers("20-22")?.length === 3, "number range");
assert(parseHouseNumbers("5A")?.[0].letter === "a", "letter suffix");
assert(parseHouseNumbers("Sveagatan") === null, "a street name is no number");
checked += 4;

console.log(`brf:match:check ok (${checked} assertions)`);
