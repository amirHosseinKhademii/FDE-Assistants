/**
 * GET /api/history — the newest questions asked here, and what each one did.
 *
 * FREE AND FAST. No model call, no tool run, one indexed read. The desk fetches
 * it when somebody expands the panel rather than on page load, because most
 * readers never open it and a cold Neon connection costs 2.8 seconds.
 *
 * WHAT IT IS FOR is the variability. This engagement's own argument is that the
 * same question can come back differently, and a page that only ever shows the
 * latest answer cannot demonstrate that. The tool names are stored in the order
 * they were called, so two runs reaching the same words by different routes are
 * distinguishable — which is the distinction the whole site exists to insist on.
 */
import { createFileRoute } from '@tanstack/react-router';
import { listAsks } from '../server/ask-history';

export const Route = createFileRoute('/api/history')({
  server: {
    handlers: {
      GET: async () => {
        const rows = await listAsks();
        return new Response(JSON.stringify({ rows }), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      },
    },
  },
});
