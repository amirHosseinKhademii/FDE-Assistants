/**
 * POST /api/ask: one board question, answered from the BRF index, streamed.
 *
 * ONE IMPORT FROM THE DOMAIN. `askBrf` is the single assembly the CLI also calls
 * (`pnpm brf:ask`), so the browser and the terminal cannot drift apart.
 *
 * What stays here is what a surface is for: read the request, frame the events
 * as SSE, and decide what a failure looks like on the wire.
 *
 * WHY SERVER-SENT EVENTS. An answer takes 20 to 60 seconds because the model is
 * reading the documents. SSE lets the page show each search as it happens.
 *
 * WHY POST. EventSource is GET-only and cannot send the x-api-key header.
 */
import { createFileRoute } from '@tanstack/react-router';
import { askBrf } from '@brf/ai';
import { authorize, publicError } from '@fde/guard';

const encoder = new TextEncoder();

/** Proxies drop idle connections, and a slow search is idle to them. */
const HEARTBEAT_MS = 15_000;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Before anything else: no body parsing, no model call, no index
        // connection for a request that is not allowed.
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
                // The client left mid-answer. Not worth raising.
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
                send('error', { message: 'Skriv en fråga först.', stoppedBecause: 'bad_request' });
                return;
              }

              const result = await askBrf({
                question,
                surface: 'http',
                onEvent: (e: any) => {
                  if (e.type === 'turn_start') send('turn_start', { turn: e.turn });
                  else if (e.type === 'tool_call') {
                    send('tool_call', {
                      turn: e.turn,
                      name: e.name,
                      // The Agents SDK passes args as a JSON string, Mastra as an object.
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
                  // No valid structured answer is a failure, not an empty answer.
                  message: result.schemaErrors.join(' | ') || 'Inget giltigt svar.',
                  stoppedBecause: result.stoppedBecause,
                  run,
                });
            } catch (e: any) {
              // The exception text can name the database host, so the page gets
              // the safe message and a reference to the full text in the log.
              const safe = publicError(e, { context: 'POST /api/ask' });
              send('error', { message: safe.error, ref: safe.ref, stoppedBecause: 'exception' });
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
