/**
 * GET /api/engines — which loops can serve the configured provider.
 *
 * FREE, AND READ PER REQUEST rather than computed once. A server that built this
 * list at import time would keep serving it after the environment changed, and
 * the cost of being wrong is a picker offering an option that cannot work.
 *
 * THE UNUSABLE ONE IS RETURNED, NOT FILTERED OUT. The whole argument for having
 * built three engines is that it is what revealed the differences between them —
 * a picker showing two options tells that story less well than one showing three
 * with a reason attached to the third.
 */
import { createFileRoute } from '@tanstack/react-router';
import { availableEngines } from '@calder/safety/agent/engines';

export const Route = createFileRoute('/api/engines')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ engines: availableEngines() }), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      },
    },
  },
});
