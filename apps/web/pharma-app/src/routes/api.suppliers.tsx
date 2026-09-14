/**
 * GET /api/suppliers — the list behind the supplier picker.
 *
 * Same guard as `/api/lots`, for the same reason: this returns the customer's
 * supplier register including who was disqualified and why, which is commercially
 * sensitive in a way "it is only a list" tends to obscure.
 */
import { createFileRoute } from '@tanstack/react-router';
import { listSuppliers } from '@meridian/pharma/directory';
import { authorize } from '@fde/guard';

export const Route = createFileRoute('/api/suppliers')({
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

        return new Response(JSON.stringify(await listSuppliers()), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      },
    },
  },
});
