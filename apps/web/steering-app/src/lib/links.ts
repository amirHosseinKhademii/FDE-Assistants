/**
 * Where the rest of the firm's site is.
 *
 * WHY A URL AND NOT A `<Link>`. Each engagement is its own deployment on its
 * own origin. A router link can only reach routes this app serves, so crossing
 * to another engagement is a plain anchor; pretending otherwise gives a typed
 * link that 404s in production.
 *
 * THE FALLBACK IS SCOPED TO THE BUILD IT IS TRUE FOR, and the sibling of this
 * file in `apps/veresk-app` records why: `import.meta.env.*` is inlined at BUILD
 * time, so a dev default survives into the production bundle as a literal and
 * sends real visitors to a port on their own machine. It shipped that way once.
 *
 * So the dev port is the answer only in a dev build. A production build with
 * nothing configured gets `null`, and the header renders the firm's name as
 * text rather than as a link to nowhere.
 *
 * TO WIRE IT UP, set `VITE_VERESK_URL` when the image is BUILT — it has to be
 * present for `vite build`, not for the server process, which is the part that
 * catches people out.
 */
const CONFIGURED = import.meta.env.VITE_VERESK_URL as string | undefined;

const BASE: string | null = CONFIGURED ?? (import.meta.env.DEV ? 'http://localhost:3300' : null);

/** The firm's own page, or `null` where there is no honest URL to give. */
export const VERESK = BASE;

/** The other engagement, which the Veresk deployment serves. */
export const PHARMA = BASE ? `${BASE}/pharma` : null;
