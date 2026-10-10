/**
 * Example addresses and the last few searches. Stored per browser in
 * localStorage (try/catch). A convenience only: nothing depends on it.
 */
export const EXAMPLE_ADDRESSES = ["Djurgårdsgatan 23 A", "Linnégatan 1", "Kungsportsavenyen 10"];

/** The search an example chip (or its dropdown row) runs. */
export function exampleQuery(address: string): string {
  return `${address}, Göteborg`;
}

const RECENT_KEY = "bostad.recent";
const RECENT_MAX = 5;

export function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

/** Puts `address` first, drops case-insensitive repeats, keeps the last few. */
export function addRecent(address: string): void {
  const clean = address.trim();
  if (!clean) return;
  try {
    const key = clean.toLocaleLowerCase("sv");
    const next = [clean, ...readRecents().filter((v) => v.toLocaleLowerCase("sv") !== key)].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: skip silently */
  }
}
