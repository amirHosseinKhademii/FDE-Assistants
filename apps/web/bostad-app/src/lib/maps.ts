/**
 * The Google Maps browser key. It is public by design: it reaches the page, so
 * it must be restricted in Google Cloud to HTTP referrers and to the Maps
 * JavaScript and Places APIs. Only VITE_-prefixed variables from the repo-root
 * .env are exposed (vite.config.ts sets envDir); nothing else is.
 */
export const MAPS_KEY: string = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

export const HAS_MAPS_KEY = MAPS_KEY.length > 0;

/** Bias for address suggestions: a box around Gothenburg. */
export const GOTHENBURG_BOUNDS = { south: 57.55, west: 11.8, north: 57.85, east: 12.15 };
