/**
 * `/api/summary` — where the bid stands, across every requirement assessed.
 *
 * ── TWO METHODS, AND THE SPLIT IS THE COST ───────────────────────────────
 *
 * GET is free. Every number on the page — how many of the 24 are assessed, the
 * finding mix, what is priced, what is refused and why — is computed from
 * stored answers in `@vantis/steering/roll-up`, with no model involved. So it
 * loads with the page and needs no button.
 *
 * POST costs a model call. It buys exactly two sentences' worth of judgement:
 * what the refusals have in common, and which questions repeat. Nothing else.
 *
 * That split is not an optimisation, it is the design of the thing. A summary
 * agent that also produced the counts could produce counts that disagree with
 * the ones printed beside them, and one page contradicting itself is worse than
 * either half alone.
 *
 * ── IT READS FILED ASSESSMENTS, NEVER THE CORPUS ─────────────────────────
 *
 * No search tool, no comparables tool, no index. The one estate query is the
 * LIST OF REQUIREMENTS — the denominator — made here rather than by the agent,
 * the same way `/api/assess` hands the loop its requirement text instead of
 * letting it go looking.
 *
 * ── GUARDED LIKE THE OTHER THREE ─────────────────────────────────────────
 *
 * And with the same sharpening as `/api/history`: this returns conclusions
 * about a car maker's unannounced programme in aggregate, which makes it the
 * widest endpoint in the app rather than the most innocent one.
 */
import { createFileRoute } from '@tanstack/react-router';
import { authorize } from '@fde/guard';
import { listRequirements, DEFAULT_PROGRAMME } from '@vantis/steering/requirements';
import { fetchFiledAssessments } from '@vantis/steering/history';
import { rollUp, NOT_THE_QUOTE } from '@vantis/steering/roll-up';
import { summariseBid } from '@vantis/steering/summarise';

function refused(reason: string, status: number): Response {
  return new Response(JSON.stringify({ error: reason }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function guard(request: Request) {
  return authorize({
    configuredKey: process.env.API_KEY,
    presentedKey: request.headers.get('x-api-key'),
    isDev: Boolean(import.meta.env.DEV),
  });
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** The roll-up, and the history it was built from. Used by both handlers. */
async function state() {
  const [requirements, history] = await Promise.all([
    listRequirements(DEFAULT_PROGRAMME),
    fetchFiledAssessments(),
  ]);
  return { history, rollUp: rollUp(history, requirements.map((r) => r.ref)) };
}

export const Route = createFileRoute('/api/summary')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const allowed = guard(request);
        if (!allowed.ok) return refused(allowed.reason, allowed.status);
        try {
          const { history, rollUp: r } = await state();
          return json({ rollUp: r, noHistory: history.noHistory, notTheQuote: NOT_THE_QUOTE });
        } catch (e: any) {
          // Never `{}`. A roll-up that fails to load and one that found nothing
          // render identically unless the failure says so, and the second
          // reading is "the bid is empty".
          return json({ error: e?.message ?? String(e) }, 503);
        }
      },

      POST: async ({ request }) => {
        const allowed = guard(request);
        if (!allowed.ok) return refused(allowed.reason, allowed.status);
        try {
          const { history, rollUp: r } = await state();
          if (!history.answered.length) {
            return json({ error: 'nothing has been assessed yet' }, 409);
          }
          const result = await summariseBid({
            rollUp: r,
            filed: history.answered,
            surface: 'steering:desk-summary',
          });
          return json({
            rollUp: r,
            notTheQuote: NOT_THE_QUOTE,
            summary: result.summary ?? null,
            // A failed summary is reported, not retried into silence — the same
            // rule `/api/assess` follows, and for the same reason: how often
            // the contract is missed is a number worth having.
            failure: result.summary
              ? null
              : { message: result.schemaErrors.join(' | ') || 'no valid summary', stoppedBecause: result.stoppedBecause },
            run: { engine: result.engine, turns: result.turns.length, ms: result.ms, compression: result.compression },
          });
        } catch (e: any) {
          return json({ error: e?.message ?? String(e) }, 503);
        }
      },
    },
  },
});
