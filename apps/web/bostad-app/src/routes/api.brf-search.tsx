/**
 * GET /api/brf-search?q=... : the Göteborg BRFs whose name matches q, for the "pick your BRF" search.
 * {results: [{org, name, active}]}, at most 10 hits, ranked names-starting-with-q first. A q under
 * 2 characters gives {results: []}. Reads the local index only: no network call, and no street or
 * c/o line in the answer. Same-origin only, like /api/profile. No rate limit: nothing outbound.
 */
import { createFileRoute } from '@tanstack/react-router';
import { searchBrf } from '@bostad/property';
import { isSameOrigin } from '../server/origin';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/brf-search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (!isSameOrigin(request, url)) return json({ error: 'cross-origin requests are not allowed' }, 403);
        const q = (url.searchParams.get('q') ?? '').trim();
        if (q.length < 2) return json({ results: [] });
        try {
          return json({ results: searchBrf(q) });
        } catch {
          return json({ error: 'BRF search failed' }, 500);
        }
      },
    },
  },
});
