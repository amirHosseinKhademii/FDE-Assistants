/**
 * GET /api/policyholders — the list behind the customer dropdown.
 *
 * Guarded by the same rule as /api/ask: this returns customer names, which is
 * exactly the sort of endpoint that gets left open because "it is only a list".
 */
import { createFileRoute } from '@tanstack/react-router';
import { listPolicyholders } from '@claims/insurance/directory';
import { authorize } from '@claims/insurance/security';

export const Route = createFileRoute('/api/policyholders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const allowed = authorize({
          configuredKey: process.env.API_KEY,
          presentedKey: request.headers.get('x-api-key'),
          isDev: Boolean(import.meta.env.DEV),
        });
        if (!allowed.ok) {
          return new Response(JSON.stringify({ error: allowed.reason }), {
            status: allowed.status,
            headers: { 'content-type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(await listPolicyholders()), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      },
    },
  },
});
