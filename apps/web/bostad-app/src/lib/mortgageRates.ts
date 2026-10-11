import type { MortgageRates } from "@bostad/property";

/** One request per page load, shared by every card and dialog. A failed request is not kept, so the next open retries. */
let cache: Promise<MortgageRates | null> | null = null;

export function fetchMortgageRates(): Promise<MortgageRates | null> {
  if (!cache) {
    cache = fetch("/api/mortgage", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? (r.json() as Promise<MortgageRates>) : null))
      .catch(() => null)
      .then((value) => {
        if (value === null) cache = null;
        return value;
      });
  }
  return cache;
}
