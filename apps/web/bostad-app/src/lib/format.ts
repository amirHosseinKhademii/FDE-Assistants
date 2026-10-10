import type { Lang, MessageKey } from "./i18n";

export function localeOf(lang: Lang): string {
  return lang === "sv" ? "sv-SE" : "en-GB";
}

/** Clock time such as "14:02", for "checked 14:02". */
export function clockTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** "3 minutes ago" / "för 3 minuter sedan"; null when the check was under a minute ago. */
export function minutesAgo(iso: string, lang: Lang, now: number = Date.now()): string | null {
  const minutes = Math.floor((now - Date.parse(iso)) / 60000);
  if (!(minutes >= 1)) return null;
  return new Intl.RelativeTimeFormat(localeOf(lang), { numeric: "auto" }).format(-minutes, "minute");
}

/** Walking time from a distance, at 80 m per minute, rounded up, never below 1. */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / 80));
}

/** The translation key for a provider host the profile reports. */
export function sourceKey(source: string): MessageKey {
  if (source.includes("sgi.se")) return "source.sgi";
  if (source.includes("vasttrafik")) return "source.vasttrafik";
  if (source.includes("nominatim")) return "source.osm";
  if (source.includes("goteborg.se")) return "source.goteborg";
  if (source.includes("photon")) return "source.photon";
  return "source.generic";
}

/** https link to the provider's site, from the host the profile reports. */
export function sourceHref(source: string): string | null {
  try {
    const url = new URL(source.includes("://") ? source : `https://${source}`);
    return url.protocol === "https:" ? `${url.origin}/` : null;
  } catch {
    return null;
  }
}

export function googleMapsHref(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

/** Google Maps walking directions from home to a stop. */
export function walkingDirectionsHref(from: { lat: number; lon: number }, to: { lat: number; lon: number }): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat.toFixed(6)},${from.lon.toFixed(6)}&destination=${to.lat.toFixed(6)},${to.lon.toFixed(6)}&travelmode=walking`;
}
