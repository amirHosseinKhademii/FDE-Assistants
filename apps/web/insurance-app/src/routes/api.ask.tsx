/**
 * POST /api/ask — the same question `pnpm ask` asks, streamed.
 *
 * ONE IMPORT FROM THE DOMAIN. An earlier version of this file imported ten
 * things — a client, a store, a registry, a prompt, a schema, a logger — and
 * assembled the application itself. That is the domain's job, and doing it in
 * two places (here and in the CLI) means they can silently drift: add a tool or
 * change the prompt, and the browser and the terminal answer differently while
 * both look healthy. `askCoverage` is the single assembly both call.
 *
 * What stays here is what a surface is actually for: read the request, frame the
 * events as SSE, decide what a failure looks like on the wire.
 *
 * WHY SERVER-SENT EVENTS. The answer takes 20-60 seconds because the model is
 * genuinely reading policy documents. Sending nothing until it finishes makes a
 * working system look broken; SSE lets the page say "looking up AUT-4471" a
 * second in.
 *
 * WHY POST RATHER THAN THE BROWSER'S EventSource. `EventSource` is GET-only and
 * cannot set headers — the question would travel in the URL, where proxies and
 * access logs keep it, and there would be nowhere to carry the API key the
 * fail-closed guard needs.
 *
 * WHY THE ANSWER IS NOT STREAMED TOKEN BY TOKEN. Pillar 3 says an answer is a
 * validated object. Half-arrived JSON has not passed `coherenceErrors()` yet, so
 * streaming it would put an unchecked dollar figure on screen for two seconds.
 * The live feeling comes from the tool events, which are real events rather than
 * a typing animation.
 */
import { createFileRoute } from '@tanstack/react-router';
import { askCoverage } from '@claims/insurance';
import { authorize } from '@fde/guard';

const encoder = new TextEncoder();

/** Proxies drop idle connections, and a 60-second search is idle to them. */
const HEARTBEAT_MS = 15_000;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Pillar 6, before anything else happens — no body parsing, no model
        // call, no database connection for a request that is not allowed.
        // import.meta.env.DEV is the only thing that distinguishes "the dev
        // server, which binds loopback" from "somewhere we cannot vouch for".
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
        const question = String(body?.question ?? '').trim();

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                // The client navigated away mid-answer. Not worth raising.
              }
            };
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
              } catch {
                /* closed */
              }
            }, HEARTBEAT_MS);

            try {
              if (!question) {
                send('error', { message: 'question is required', stoppedBecause: 'bad_request' });
                return;
              }

              const result = await askCoverage({
                question,
                policyId: body?.policy || undefined,
                loop: body?.loop,
                surface: 'http',
                onEvent: (e: any) => {
                  if (e.type === 'turn_start') send('turn_start', { turn: e.turn });
                  else if (e.type === 'tool_call') {
                    send('tool_call', {
                      turn: e.turn,
                      name: e.name,
                      // The Agents SDK passes args as a JSON string, Mastra as an
                      // object. Normalise once here so the page never cares which
                      // engine ran.
                      args: typeof e.args === 'string' ? safeParse(e.args) : e.args,
                    });
                  } else if (e.type === 'tool_result') {
                    send('tool_result', {
                      turn: e.turn, name: e.name, ok: e.ok, ms: e.ms, summary: e.summary,
                    });
                  } else if (e.type === 'schema_retry') {
                    send('schema_retry', { turn: e.turn, error: e.error });
                  }
                },
              });

              const run = {
                turns: result.turns.length,
                toolCalls: result.toolCalls,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                ms: result.ms,
                engine: result.engine,
                stoppedBecause: result.stoppedBecause,
              };

              if (result.structured) send('answer', { ...result.structured, run });
              else
                send('error', {
                  // No valid structured answer is a failure, not an answer.
                  // An empty object would render as "no coverage".
                  message: result.schemaErrors.join(' | ') || 'no valid answer',
                  stoppedBecause: result.stoppedBecause,
                  run,
                });
            } catch (e: any) {
              send('error', { message: e?.message ?? String(e), stoppedBecause: 'exception' });
            } finally {
              clearInterval(heartbeat);
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            // Nginx buffers by default, which would hold every event to the end
            // and silently defeat the point of this endpoint.
            'x-accel-buffering': 'no',
          },
        });
      },
    },
  },
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
