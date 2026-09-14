/**
 * Where the engagements live. All three are elsewhere now.
 *
 * WHY URLS AND NOT `<Link>`s. Each engagement is its own deployment on its own
 * origin, so crossing to one is a plain anchor. A typed `<Link to="/pharma">`
 * would compile, look right, and 404 — which is exactly what would happen the
 * moment the pharma surface moved out of this app, and it did on 2026-09-13.
 *
 * ── THE BUG THIS FILE SHIPPED, AND THE RULE THAT COMES OUT OF IT ──────────
 *
 * It used to fall back to the dev port unconditionally:
 *
 *     export const STEERING = import.meta.env.VITE_STEERING_URL ?? 'http://localhost:3400';
 *
 * `import.meta.env.*` IS INLINED AT BUILD TIME, and the Docker build set
 * nothing, so `http://localhost:3400` was compiled into the production bundle
 * and the deployed firm page sent real visitors to a port on their own machine.
 *
 * A fallback that is right in development and wrong in production is worse than
 * no fallback, because it cannot fail locally and always fails deployed.
 *
 * SO THE FALLBACK IS SCOPED TO THE BUILD IT IS TRUE FOR. `import.meta.env.DEV`
 * is a compile-time constant, so a production bundle with nothing configured
 * contains `null` and the page renders that engagement the way it has always
 * rendered Meridian Mutual: visibly not a link, saying where it runs.
 *
 * THE URLS ARE RESOLVED BY THE PIPELINE, NOT WRITTEN DOWN ANYWHERE. Hard-coding
 * one put a 404 on the live site, because the URL was baked in before the app
 * it named existed. `.github/workflows/deploy.yml` looks each one up from Azure
 * after deploying it, so the value is always one something has just watched
 * return 200. See that file for the ordering that makes it true.
 */
function url(configured: string | undefined, devPort: number): string | null {
  return configured ?? (import.meta.env.DEV ? `http://localhost:${devPort}` : null);
}

/** Meridian Pharma — the release desk, the supplier walk, the data-flow page. */
export const PHARMA = url(import.meta.env.VITE_PHARMA_URL as string | undefined, 3301);

/** Vantis Steering — the bid page. */
export const STEERING = url(import.meta.env.VITE_STEERING_URL as string | undefined, 3400);
