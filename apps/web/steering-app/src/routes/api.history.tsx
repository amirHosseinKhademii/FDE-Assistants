/**
 * GET /api/history — what has been assessed here, and what came back.
 *
 * Guarded by the same rule as `/api/assess`, and for a sharper reason: this
 * returns whole ANSWERS about a car maker's unannounced requirements, so it is
 * the widest of the three endpoints. An endpoint that is "only a list" is
 * exactly the one left open.
 *
 * READ ONLY. There is no POST here — a finished assessment is filed server-side
 * in `api.assess.tsx`, where the answer already exists. A write endpoint would
 * add a second thing to guard and would lose the row whenever a browser was
 * closed mid-answer.
 */
import { createFileRoute } from '@tanstack/react-router';
import { authorize } from '@fde/guard';
import { listAssessments } from '../server/assess-history';

export const Route = createFileRoute('/api/history')({
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
          return new Response(JSON.stringify(await listAssessments()), {
            headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
          });
        } catch (e: any) {
          // Said out loud rather than returned as `[]`. An empty list reads as
          // "you have never assessed anything", which is how somebody re-runs
          // an assessment they already paid for.
          return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
});
