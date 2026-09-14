/**
 * GET /api/history — what has been asked here, and what came back.
 *
 * Guarded by the same rule as /api/ask and /api/lots, and for a sharper reason
 * than either: this returns whole ANSWERS about the customer's batches, so it
 * is the widest of the three. An endpoint that is "only a list" is exactly the
 * one left open.
 *
 * ?kind=release|supplier, AND IT IS REQUIRED TO MEAN SOMETHING. Pharma has two
 * answer shapes and one table. The filter runs in the SQL, not in the page, so
 * a supplier work list can never be handed to the release dossier renderer —
 * which would find no blockers in it and draw a clean page. See `AskKind` in
 * `server/ask-history.ts`. An unrecognised value is refused rather than quietly
 * treated as release: answering a question nobody asked is how the wrong list
 * gets read.
 *
 * READ ONLY. There is no POST here — a finished question is filed server-side
 * in `api.ask.tsx`, where the answer already exists. A write endpoint would add
 * a second thing to guard, and would lose the row whenever a browser was closed
 * mid-answer.
 */
import { createFileRoute } from '@tanstack/react-router';
import { authorize, publicError } from '@fde/guard';
import { listAsks, type AskKind } from '../server/ask-history';

const KINDS: AskKind[] = ['release', 'supplier'];

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

        const kind = new URL(request.url).searchParams.get('kind') ?? 'release';
        if (!KINDS.includes(kind as AskKind)) {
          return new Response(JSON.stringify({ error: `unknown kind "${kind}"` }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        try {
          return new Response(JSON.stringify(await listAsks(kind as AskKind)), {
            headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
          });
        } catch (e: any) {
          // Said out loud rather than returned as `[]`. An empty list reads as
          // "you have never asked anything", which is how somebody re-runs a
          // question they already paid for. THAT the load failed is the useful
          // part; WHY is for the log, because "why" here is the database naming
          // its own host.
          return new Response(JSON.stringify(publicError(e, { context: 'GET /api/history' })), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
});
