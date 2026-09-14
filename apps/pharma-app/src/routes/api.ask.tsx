/**
 * POST /api/ask — the same question `pnpm ask` asks, streamed.
 *
 * ONE DOMAIN IMPORT, PLUS ONE RECORDER. `askRelease` is the single assembly the
 * CLI, the eval runner and this route all call. Its own header says so: "the one entry
 * point every surface uses." Assembling the application here instead would mean
 * doing it in two places, and two places drift — add a tool or change the prompt
 * and the browser and the terminal answer differently while both look healthy.
 *
 * What stays here is what a surface is actually for: read the request, frame the
 * events as SSE, decide what a failure looks like on the wire.
 *
 * The recorder — `recordAsk` — is the second thing imported here, and it is not
 * assembly: it chooses no tool, no prompt and no contract, so rule 15 still
 * holds. It lives in the app rather than in `packages/pharma` because it WRITES,
 * and `pnpm sql:check` prints the scope it scans; see `server/ask-history.ts`.
 * It runs HERE rather than from the browser so that a reviewer who closes the
 * tab mid-answer still leaves a row behind.
 *
 * WHY SERVER-SENT EVENTS. A release assessment takes 30-90 seconds, because it
 * is genuinely walking six databases and reading procedures. Sending nothing
 * until it finishes makes a working system look broken.
 *
 * WHY POST RATHER THAN THE BROWSER'S EventSource. `EventSource` is GET-only and
 * cannot set headers — the question would travel in the URL, where proxies and
 * access logs keep it, and there would be nowhere to carry the API key the
 * fail-closed guard needs.
 *
 * WHY THE ANSWER IS NOT STREAMED TOKEN BY TOKEN. An answer is a validated
 * object. Half-arrived JSON has not passed `coherenceErrors()` yet, and in THIS
 * domain the contract's whole job is that no field can say "release it" — so
 * streaming unvalidated prose would put exactly the forbidden sentence on screen
 * for two seconds. The live feeling comes from the tool events, which are real.
 */
import { createFileRoute } from '@tanstack/react-router';
import { askRelease } from '@meridian/pharma';
import { authorize } from '@fde/guard';
import { recordAsk } from '../server/ask-history';

const encoder = new TextEncoder();

/** Proxies drop idle connections, and a 90-second six-database walk is idle to them. */
const HEARTBEAT_MS = 15_000;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Before anything else happens — no body parsing, no model call, no
        // database connection for a request that is not allowed. The guard is
        // fail-CLOSED: no key configured means refuse, not allow.
        // `import.meta.env.DEV` is the only thing that distinguishes "the dev
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
        const loop = String(body?.loop ?? 'sdk');

        // RAW EVENTS, not rendered lines. What happened is a fact and belongs in
        // the row; the sentences explaining it are presentation and get reworded
        // — see `lib/trace-lines.ts`.
        const events: unknown[] = [];

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

              const result = await askRelease({
                question,
                loop,
                surface: 'http',
                onEvent: (e: any) => {
                  if (e.type === 'turn_start') send('turn_start', { turn: e.turn });
                  else if (e.type === 'tool_call') {
                    events.push({
                      type: 'tool_call',
                      turn: e.turn,
                      name: e.name,
                      args: typeof e.args === 'string' ? safeParse(e.args) : e.args,
                    });
                    send('tool_call', {
                      turn: e.turn,
                      name: e.name,
                      // The Agents SDK passes args as a JSON string, Mastra as an
                      // object. Normalise once here so the page never cares which
                      // engine ran.
                      args: typeof e.args === 'string' ? safeParse(e.args) : e.args,
                    });
                  } else if (e.type === 'tool_result') {
                    const r = {
                      turn: e.turn, name: e.name, ok: e.ok, ms: e.ms, summary: e.summary,
                    };
                    events.push({ type: 'tool_result', ...r });
                    send('tool_result', r);
                  } else if (e.type === 'schema_retry') {
                    events.push({ type: 'schema_retry', turn: e.turn, error: e.error });
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
                // A CEILING, not an exact figure — cached input bills at one
                // tenth and is not modelled. The page must label it as one;
                // `@fde/telemetry` puts it plainly: a cost figure that is
                // quietly wrong is worse than no cost figure at all.
                costUsd: result.costUsd,
              };

              if (result.structured) {
                const answer = { ...result.structured, run };
                send('answer', answer);
                // AFTER the send, never before. The reviewer's answer does not
                // wait on a database round trip, and `recordAsk` cannot throw
                // into this stream.
                await recordAsk({
                  kind: 'release',
                  question, loop, surface: 'http',
                  answer, failure: null, run, trace: events,
                });
              } else {
                const failure = {
                  // No valid structured answer is a failure, not an answer. An
                  // empty object would render as a clean dossier — which in this
                  // domain reads as "nothing is wrong with this batch".
                  message: result.schemaErrors.join(' | ') || 'no valid answer',
                  stoppedBecause: result.stoppedBecause,
                  run,
                };
                send('error', failure);
                // A failure is filed too. It spent tokens and took a minute, and
                // a history that keeps only the successes makes the system look
                // cheaper and more reliable than it is.
                await recordAsk({
                  kind: 'release',
                  question, loop, surface: 'http',
                  answer: null, failure, run, trace: events,
                });
              }
            } catch (e: any) {
              const failure = { message: e?.message ?? String(e), stoppedBecause: 'exception' };
              send('error', failure);
              await recordAsk({
                kind: 'release',
                question, loop, surface: 'http',
                answer: null, failure, run: null, trace: events,
              });
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
