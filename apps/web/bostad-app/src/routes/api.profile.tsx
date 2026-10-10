/**
 * GET /api/profile?address=... — the property profile as JSON.
 *
 * Each section is independent: `getProfile` reports a failing source as
 * status "error" inside a 200 response, so this route only answers 400 for a
 * bad parameter and 500 if the lookup itself throws.
 */
import { createFileRoute } from '@tanstack/react-router';
import { parseAddress } from '../lib/address';
import { profileFor } from '../server/profile.server';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/profile')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = parseAddress(new URL(request.url).searchParams.get('address'));
        if (!parsed.ok) return json({ error: parsed.error }, 400);
        try {
          return json(await profileFor(parsed.address));
        } catch {
          return json({ error: 'profile lookup failed' }, 500);
        }
      },
    },
  },
});
