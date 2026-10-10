/**
 * GET /api/profile?address=... — the property profile as JSON.
 *
 * Each section is independent: `getProfile` reports a failing source as
 * status "error" inside a 200 response, so this route only answers 400 for a
 * bad parameter and 500 if the lookup itself throws.
 *
 * Protection (no auth — this is a prototype, loopback-only):
 *  - same-origin: a browser request carrying an Origin header from another site
 *    gets 403. Requests without Origin (curl, server-side) are allowed.
 *  - rate limit: at most 60 requests per client per 10 minutes, then 429 with
 *    Retry-After. Checked before parsing, so every request counts. The client
 *    key is the first hop of X-Forwarded-For, or one shared bucket when no
 *    proxy sets it (the normal loopback case). The header is client-controlled,
 *    so this limit only holds if a trusted proxy sets or strips it.
 */
import { createFileRoute } from '@tanstack/react-router';
import { parseAddress } from '../lib/address';
import { profileFor } from '../server/profile.server';
import { isSameOrigin } from '../server/origin';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;
const hits = new Map<string, number[]>();

/** Returns 0 if the request is allowed, else seconds until the client may retry. */
function take(key: string, now: number): number {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return 0;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });
}

export const Route = createFileRoute('/api/profile')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);

        if (!isSameOrigin(request, url)) {
          return json({ error: 'cross-origin requests are not allowed' }, 403);
        }

        const client =
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'direct';
        const retryAfter = take(client, Date.now());
        if (retryAfter > 0) {
          return json({ error: 'too many requests, try again later' }, 429, {
            'retry-after': String(retryAfter),
          });
        }

        const parsed = parseAddress(url.searchParams.get('address'));
        if (!parsed.ok) return json({ error: parsed.error }, 400);
        try {
          return json(await profileFor(parsed.address));
        } catch {
          return json({ error: 'profile lookup failed' }, 500);
        }
      },
    },
  },
});
