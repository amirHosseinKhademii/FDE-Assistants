/**
 * POST /api/explain — the dossier on screen, in plain words.
 *
 * ONE MODEL CALL, NO TOOLS, AND IT IS GIVEN THE ANSWER RATHER THAN THE
 * DOCUMENTS. Everything it may speak about arrives in the request, which is
 * what makes "add nothing" an instruction it can follow rather than a hope.
 *
 * ── WHY THE ASSESSMENT COMES FROM THE BROWSER HERE, WHEN THE REQUIREMENT
 *    DOES NOT ON `/api/assess` ──────────────────────────────────────────
 *
 * There the text is the QUESTION and accepting it from a text box would mean
 * the "in force, not latest" guarantee was a claim the server could not make.
 * Here the input is an answer this server produced minutes ago and already
 * filed; the brief adds no fact to it and is never stored. A tampered body buys
 * somebody a paraphrase of their own fiction, which is what they had anyway.
 *
 * IT IS NOT FILED. The dossier is the record; a plain-language restatement of
 * it is a reading aid. Storing it would put two versions of one conclusion in
 * the history, and the day they disagree the stored pair is worse than either.
 */
import { createFileRoute } from '@tanstack/react-router';
import { authorize, publicError } from '@fde/guard';
import { explainAssessment } from '@vantis/steering/explain';

export const Route = createFileRoute('/api/explain')({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        const body: any = await request.json().catch(() => ({}));
        const assessment = body?.assessment;
        if (!assessment?.requirement_ref) {
          return new Response(JSON.stringify({ error: 'an assessment is required' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }

        try {
          const result = await explainAssessment({ assessment, surface: 'http' });
          if (!result.explanation) {
            // A failed brief is a failure, not an empty one. An empty object
            // would render as a blank panel over a dossier that is fine.
            return new Response(
              JSON.stringify({
                error: result.schemaErrors.join(' | ') || 'no valid summary',
                stoppedBecause: result.stoppedBecause,
              }),
              { status: 502, headers: { 'content-type': 'application/json' } },
            );
          }
          return new Response(
            JSON.stringify({
              explanation: result.explanation,
              run: { engine: result.engine, turns: result.turns.length, ms: result.ms },
            }),
            { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
          );
        } catch (e: any) {
          return new Response(JSON.stringify(publicError(e, { context: 'POST /api/explain' })), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
      },
    },
  },
});
