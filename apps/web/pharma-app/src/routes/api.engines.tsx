/**
 * GET /api/engines — which loops can serve the configured provider, and the one
 * the server runs when a request names none.
 *
 * READ PER REQUEST, not built once: a list computed at import time would keep
 * offering an option after the environment changed. The unusable engine is
 * returned rather than filtered out, so the picker can grey it out and say why.
 */
import { createFileRoute } from '@tanstack/react-router';
import { loopOptions, resolveLoop } from '@fde/agent';

export const Route = createFileRoute('/api/engines')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ engines: loopOptions(), configured: resolveLoop().choice }), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      },
    },
  },
});
