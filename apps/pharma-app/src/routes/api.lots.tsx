/**
 * GET /api/lots — the list behind the batch dropdown.
 *
 * Guarded by the same rule as /api/ask: this returns the customer's production
 * record, which is exactly the sort of endpoint that gets left open because "it
 * is only a list".
 */
import { createFileRoute } from '@tanstack/react-router';
import { listLots } from '@meridian/pharma/directory';
import { authorize } from '@fde/guard';

export const Route = createFileRoute('/api/lots')({
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

        return new Response(JSON.stringify(await listLots()), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      },
    },
  },
});
