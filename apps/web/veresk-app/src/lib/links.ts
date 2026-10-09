/**
 * Where the engagements live. All of them are elsewhere now.
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

/**
 * Calder Safety — the public vehicle-safety record.
 *
 * The fourth, and the first whose corpus nobody here wrote. It is deployed on
 * the same terms as the other two and resolved the same way: the pipeline looks
 * its URL up from Azure AFTER watching it return 200, so this value is never a
 * guess about something that might exist.
 */
export const SAFETY = url(import.meta.env.VITE_SAFETY_URL as string | undefined, 3500);

/**
 * Thornbury Goods — the MCP build, told step by step on its `/steps` page.
 *
 * THE FIRST LINK THE FIRM HAS AHEAD OF THE PIPELINE. The deploy job sets no
 * `VITE_COMMERCE_URL` on purpose (`deploy.yml`, "THE LINK IS ONE-WAY"), so a
 * production build contains `null` here and the nav renders nothing for it —
 * the `url()` rule above, working as designed — while a dev build points at
 * :3600. Making it live when deployed is a pipeline change, not an edit here:
 * put `commerce-deploy` in the host's `needs:` and pass its resolved URL as
 * `VITE_COMMERCE_URL`, the way `VITE_SAFETY_URL` is passed.
 */
export const COMMERCE = url(import.meta.env.VITE_COMMERCE_URL as string | undefined, 3600);

/**
 * Wrap — the document ingestion and retrieval pipeline, built from scratch over
 * the Vantis steering corpus. Its own deployment, resolved and deployed the same
 * way as the others: the pipeline looks its URL up AFTER watching it return 200.
 */
export const WRAP = url(import.meta.env.VITE_WRAP_URL as string | undefined, 3700);
