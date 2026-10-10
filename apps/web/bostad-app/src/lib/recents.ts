/**
 * The last searches, newest first, kept per browser in localStorage (try/catch
 * everywhere). A convenience only: nothing depends on it. Versioned key: a shape
 * change bumps it and the old keys are dropped, so stale entries are never read.
 * Deduped by the normalised address; at most RECENT_MAX entries.
 */
export interface RecentSearch {
  address: string;
  /** When it was last searched, ms since epoch. */
  at: number;
  /** "Stadsområde · stadsdel" from the profile, when it was loaded. */
  district?: string;
  /** One-line quick result from the profile, e.g. "Quiet · 4 min to stop". */
  quick?: string;
}

export const RECENT_MAX = 8;
const RECENT_KEY = "bostad.recent.v3";
const LEGACY_KEYS = ["bostad.recent", "bostad.recent.v2"];

/** The key for "same address": case, spacing and surrounding space ignored. */
export function sameAddressKey(address: string): string {
  return address.trim().replace(/\s+/g, " ").toLocaleLowerCase("sv");
}

function dropLegacy(): void {
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function isEntry(v: unknown): v is RecentSearch {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.address === "string" && e.address.trim() !== "" && typeof e.at === "number" && Number.isFinite(e.at);
}

export function readRecents(): RecentSearch[] {
  dropLegacy();
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isEntry)
      .map((e) => ({
        address: e.address.trim(),
        at: e.at,
        district: typeof e.district === "string" ? e.district : undefined,
        quick: typeof e.quick === "string" ? e.quick : undefined,
      }))
      .sort((a, b) => b.at - a.at)
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function write(list: RecentSearch[]): void {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* storage unavailable: skip silently */
  }
}

/**
 * Records a search as the newest. `extra` (district, quick result) replaces what
 * was stored for that address; without it, the stored details are kept.
 */
export function addRecent(address: string, extra?: { district?: string; quick?: string }): void {
  const clean = address.trim();
  if (!clean) return;
  const key = sameAddressKey(clean);
  const previous = readRecents().find((r) => sameAddressKey(r.address) === key);
  const entry: RecentSearch = {
    address: clean,
    at: Date.now(),
    district: extra?.district ?? previous?.district,
    quick: extra?.quick ?? previous?.quick,
  };
  write([entry, ...readRecents().filter((r) => sameAddressKey(r.address) !== key)]);
}

export function removeRecent(address: string): void {
  const key = sameAddressKey(address);
  write(readRecents().filter((r) => sameAddressKey(r.address) !== key));
}

export function clearRecents(): void {
  try {
    window.localStorage.removeItem(RECENT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Adds the district and quick result to a search already in the list, without
 * moving it. Used once a profile has loaded. Does nothing for an unknown address.
 */
export function setRecentDetails(address: string, extra: { district?: string; quick?: string }): void {
  const key = sameAddressKey(address);
  const list = readRecents();
  const found = list.find((r) => sameAddressKey(r.address) === key);
  if (!found) return;
  if (found.district === extra.district && found.quick === extra.quick) return;
  write(list.map((r) => (r === found ? { ...r, district: extra.district, quick: extra.quick } : r)));
}
