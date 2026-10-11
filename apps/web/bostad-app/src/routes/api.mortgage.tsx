/**
 * GET /api/mortgage: the mortgage calculator's rates and rules, kept apart from the profile so the profile
 * stays fast. {policyRate, averages, banks, rules, sources}. Each of policyRate, averages and banks is a
 * section with status "ok" or "error" and a reason. Cached on the server (12 h to 24 h per source).
 * Same-origin only, like /api/profile. Read-only, no model call.
 */
import { createFileRoute } from '@tanstack/react-router';
import { mortgageRates } from '@bostad/property';
import { isSameOrigin } from '../server/origin';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/mortgage')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (!isSameOrigin(request, url)) return json({ error: 'cross-origin requests are not allowed' }, 403);
        try {
          return json(await mortgageRates());
        } catch {
          return json({ error: 'mortgage rates lookup failed' }, 500);
        }
      },
    },
  },
});
