/**
 * The Göteborg BRF index (data/brf-index.json, from SCB's free bulk file): every housing association
 * in Göteborg with org number, name, postcode and an active flag, for the "pick your BRF" search.
 * Built by data/scripts/build_brf_index.py (outside the repo). No network calls.
 *
 * PRIVACY: the street is in the file only for associations with no c/o line and no PO box, and it
 * is used for address matching only. searchBrf never returns it, and brfByOrg and matchBrfByAddress
 * return the entry as stored.
 */
import * as fs from "fs";
import * as path from "path";
import { DATA_DIR } from "../data-dir";

export interface BrfIndexEntry {
  org: string;
  name: string;
  postcode: string | null;
  /** Lower-case "street number" for associations without a c/o line or PO box; otherwise null. */
  match: string | null;
  active: boolean;
}

export interface BrfSearchHit {
  org: string;
  name: string;
  active: boolean;
}

interface Indexed {
  entry: BrfIndexEntry;
  nameKey: string;
  matchKey: string | null;
}

const FILE = path.join(DATA_DIR, "brf-index.json");
const IGNORED_WORDS = new Set(["bostadsrattsforeningen", "bostadsrattsforening", "brf", "hsb", "riksbyggen"]);

let cache: Indexed[] | null = null;
let byOrg: Map<string, BrfIndexEntry> | null = null;

/** Lower case, accents folded (å ä to a, ö to o, é to e), every other character a word break. */
function foldKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The folded name or query without the words the search ignores, and without the phrase "i göteborg". */
function searchKey(s: string): string {
  const words = foldKey(s)
    .split(" ")
    .filter((w) => w !== "" && !IGNORED_WORDS.has(w));
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === "i" && words[i + 1] === "goteborg") {
      i++;
      continue;
    }
    out.push(words[i]);
  }
  return out.join(" ");
}

function load(): Indexed[] {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8")) as { brfs: BrfIndexEntry[] };
  const rows: Indexed[] = [];
  const orgs = new Map<string, BrfIndexEntry>();
  for (const entry of raw.brfs) {
    rows.push({
      entry,
      nameKey: searchKey(entry.name),
      matchKey: entry.match ? foldKey(entry.match) : null,
    });
    orgs.set(entry.org, entry);
  }
  cache = rows;
  byOrg = orgs;
  return rows;
}

/**
 * Associations whose name matches the query, case and accent blind. The words "bostadsrättsföreningen",
 * "brf", "hsb", "riksbyggen" and "i göteborg" are ignored on both sides. Names that start with the
 * query come first, then names that contain it. A query with nothing left after that returns [].
 */
export function searchBrf(q: string, limit = 10): BrfSearchHit[] {
  const needle = searchKey(q);
  if (!needle) return [];
  const starts: Indexed[] = [];
  const contains: Indexed[] = [];
  for (const ix of load()) {
    if (ix.nameKey.startsWith(needle)) starts.push(ix);
    else if (ix.nameKey.includes(needle)) contains.push(ix);
  }
  // Within a tier the shortest cleaned name first, so "HSB Brf Linné" (key "linne") ranks above
  // "Bostadsrättsföreningen Linné 54-56" (key "linne 54 56"); ties by name.
  const byKey = (a: Indexed, b: Indexed) =>
    a.nameKey.length - b.nameKey.length || a.entry.name.localeCompare(b.entry.name, "sv");
  starts.sort(byKey);
  contains.sort(byKey);
  return [...starts, ...contains]
    .slice(0, limit)
    .map(({ entry }) => ({ org: entry.org, name: entry.name, active: entry.active }));
}

/** The index entry for an org number ("716408-1973"), or null when it is not in the index. */
export function brfByOrg(org: string): BrfIndexEntry | null {
  load();
  return byOrg?.get(org) ?? null;
}

/**
 * The one association whose "street number" matches the typed address (accents and punctuation
 * folded on both sides, so "Drottningvägen" and "drottningvagen" match). Returns the entry only when
 * exactly one association matches. Zero or several give null.
 */
export function matchBrfByAddress(street: string, number: string): BrfIndexEntry | null {
  if (!street.trim() || !number.trim()) return null;
  const want = foldKey(`${street} ${number}`);
  const hits = load().filter((ix) => ix.matchKey === want);
  return hits.length === 1 ? hits[0].entry : null;
}
