/**
 * The Google Maps browser key. It is public by design: it reaches the page, so
 * it must be restricted in Google Cloud to HTTP referrers and to the Maps
 * JavaScript and Places APIs. Only VITE_-prefixed variables from the repo-root
 * .env are exposed (vite.config.ts sets envDir); nothing else is.
 */
export const MAPS_KEY: string = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

export const HAS_MAPS_KEY = MAPS_KEY.length > 0;

/** Bias for address suggestions: 20 km around central Gothenburg. */
export const GOTHENBURG_BIAS = { center: { lat: 57.7089, lng: 11.9746 }, radius: 20000 };
