/**
 * The firm's own page, or `null` where there is no honest URL to give.
 *
 * Built the same way as the other engagements' `links.ts`: the pipeline passes
 * `VITE_VERESK_URL` at BUILD time (it is inlined by Vite, so setting it on the
 * container does nothing), and the dev fallback only exists in `vite dev`. A
 * production build with nothing configured renders "Veresk" as plain text
 * rather than as a link to a port on the reader's machine.
 */
const CONFIGURED = import.meta.env.VITE_VERESK_URL as string | undefined;

/** The firm's own page, or `null` where there is no honest URL to give. */
export const VERESK: string | null =
  CONFIGURED ?? (import.meta.env.DEV ? 'http://localhost:3300' : null);
