/**
 * GET /api/brf?org=716408-6634 : one Göteborg BRF as {org, name, registry}. The name comes from the
 * local index, and registry is the live Bolagsverket facts (null when the registry is not configured
 * or not reached). 400 for a malformed org number, 404 when the org is not in the index.
 *
 * Protection, as in /api/profile: same-origin (403 for another site's Origin), and a rate limit of
 * 60 requests per client per 10 minutes (429 with Retry-After), because each lookup can reach the
 * registry. The client key is the first hop of X-Forwarded-For, or one shared bucket when no proxy
 * sets it. The header is client-controlled, so the limit holds only behind a trusted proxy.
 */
import { createFileRoute } from '@tanstack/react-router';
import { brfByOrg, lookupOrganisation } from '@bostad/property';
import { isSameOrigin } from '../server/origin';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;
const hits = new Map<string, number[]>();
const ORG_NR = /^\d{6}-\d{4}$/;

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

export const Route = createFileRoute('/api/brf')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (!isSameOrigin(request, url)) return json({ error: 'cross-origin requests are not allowed' }, 403);

        const client = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'direct';
        const retryAfter = take(client, Date.now());
        if (retryAfter > 0) {
          return json({ error: 'too many requests, try again later' }, 429, { 'retry-after': String(retryAfter) });
        }

        const org = url.searchParams.get('org') ?? '';
        if (!ORG_NR.test(org)) return json({ error: 'org must look like 716408-1973' }, 400);
        const entry = brfByOrg(org);
        if (!entry) return json({ error: 'BRF not in the Göteborg index' }, 404);
        try {
          const registry = await lookupOrganisation(org);
          return json({ org, name: entry.name, registry });
        } catch {
          return json({ error: 'BRF lookup failed' }, 500);
        }
      },
    },
  },
});
