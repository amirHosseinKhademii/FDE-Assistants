/**
 * GET /api/requirements — the list behind the requirement picker.
 *
 * Guarded by the same rule as `/api/assess`. This returns the customer's own
 * requirement specification, which is exactly the sort of endpoint that gets
 * left open because "it is only a list" — it is a competitor's view of what a
 * car maker has asked a Tier-1 supplier for, ahead of award.
 *
 * ONE DOMAIN IMPORT. `listRequirements` carries the `effective_to is null`
 * clause, and this route does not get to re-state it: a surface that wrote its
 * own query would be one revision-selection rule away from answering a question
 * the customer withdrew.
 */
import { createFileRoute } from '@tanstack/react-router';
import { listRequirements } from '@vantis/steering/requirements';
import { authorize } from '@fde/guard';

export const Route = createFileRoute('/api/requirements')({
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

        try {
          return new Response(JSON.stringify(await listRequirements()), {
            headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
          });
        } catch (e: any) {
          // The estate is a database that can be asleep, unreachable or not
          // seeded. Saying which is more useful than an empty list, and an
          // empty list would render as "this programme has no requirements".
          return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
});
