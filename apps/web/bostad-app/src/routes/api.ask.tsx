/**
 * "Ask about this address".
 *
 *   GET  /api/ask  -> { enabled: boolean }. The profile card asks this once,
 *                     and hides itself when the feature is off.
 *   POST /api/ask  body { address, question, lang? } -> { answer, errors }
 *                     lang: 'en' | 'sv', the UI language the answer is written in. Default 'en'.
 *                     answer: the structured answer, or null when no valid answer came back.
 *                     errors: coherence messages for the answer, or the reason no answer came back.
 *
 * Protection, the same as /api/profile: same-origin only, and a rate limit.
 * Each POST costs a model call, so the limit is tighter: 20 per client per hour.
 * Off returns 503 before anything is read from the body.
 */
import { createFileRoute } from '@tanstack/react-router';
import { parseAddress } from '../lib/address';
import { askEnabled, askFor } from '../server/ask.server';
import { isSameOrigin } from '../server/origin';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 20;
const QUESTION_MIN = 3;
const QUESTION_MAX = 300;
const BODY_MAX = 4 * 1024;
const hits = new Map<string, number[]>();

/** Returns 0 if the request is allowed, else seconds until the client may retry. */
function take(key: string, now: number): number {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 1000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return 0;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });
}

const DISABLED = 'Ask about this address is not enabled on this server.';
const LANGS = ['en', 'sv'] as const;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (!isSameOrigin(request, url)) return json({ error: 'cross-origin requests are not allowed' }, 403);
        return json({ enabled: askEnabled() });
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        if (!isSameOrigin(request, url)) return json({ error: 'cross-origin requests are not allowed' }, 403);
        if (!askEnabled()) return json({ error: DISABLED }, 503);

        const client = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'direct';
        const retryAfter = take(client, Date.now());
        if (retryAfter > 0) {
          return json({ error: 'too many questions, try again later' }, 429, { 'retry-after': String(retryAfter) });
        }

        const raw = await request.text();
        if (raw.length > BODY_MAX) return json({ error: 'request body is too large' }, 413);
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json({ error: 'body must be JSON' }, 400);
        }
        if (typeof body !== 'object' || body === null) return json({ error: 'body must be an object' }, 400);

        const parsed = parseAddress((body as { address?: unknown }).address);
        if (!parsed.ok) return json({ error: parsed.error }, 400);

        const question = (body as { question?: unknown }).question;
        if (typeof question !== 'string') return json({ error: 'question is required' }, 400);
        const trimmed = question.trim();
        if (trimmed.length < QUESTION_MIN || trimmed.length > QUESTION_MAX) {
          return json({ error: `question must be ${QUESTION_MIN} to ${QUESTION_MAX} characters` }, 400);
        }

        const rawLang = (body as { lang?: unknown }).lang;
        if (rawLang !== undefined && !(LANGS as readonly unknown[]).includes(rawLang)) {
          return json({ error: "lang must be 'en' or 'sv'" }, 400);
        }
        const lang = (rawLang ?? 'en') as 'en' | 'sv';

        try {
          const { answer, errors } = await askFor(parsed.address, trimmed, lang);
          return json({ answer, errors });
        } catch {
          return json({ error: 'the question could not be answered' }, 500);
        }
      },
    },
  },
});
