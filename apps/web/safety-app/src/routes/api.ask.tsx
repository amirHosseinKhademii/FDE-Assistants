/**
 * POST /api/ask — the same loop `pnpm safety:ask` runs, streamed.
 *
 * ── TWO DOMAIN CALLS AND NO ASSEMBLY ──────────────────────────────────────
 *
 * `resolveLoop` and `askSafety` are the whole of it. This route used to build
 * the loop itself — registry, prompt, schema, validator — which was six lines
 * of a thing that already existed in the CLI, and six lines is enough to drift.
 *
 * IT MATTERS MORE THAN TIDINESS HERE. `askSafety` wires `recordingTools`, and
 * that is not an optimisation: it deduplicates repeated calls AND is what lets
 * coherence rules 6 to 9 see what the tools returned. A copy that dropped it
 * would silently switch off two rules of the contract and nothing would look
 * wrong — the answers would still validate, against less.
 *
 * What stays here is what a surface is for — read the request, frame the events
 * as SSE, and decide what a failure looks like on the wire.
 *
 * ── THE STREAM IS NOT POLISH ──────────────────────────────────────────────
 *
 * Measured latencies for the same questions on the same model, in one
 * afternoon: 3.9s, 4.8s, 8.7s, 13.7s, 20.8s, 63.5s, 85.8s. A spinner for
 * eighty-five seconds is unusable, and the tool calls are the most interesting
 * thing on the page — they arrive one at a time and each one is the machine
 * choosing. Streaming turns the wait into the story.
 *
 * ── A REJECTED ANSWER IS A STATE, NOT A CRASH ─────────────────────────────
 *
 * The contract rejects rather than repairs, so `structured` can be undefined
 * with `schemaErrors` explaining why. That is sent as its own event and drawn as
 * its own thing. A generic failure would hide the most honest output this system
 * produces.
 *
 * ── AN ENGINE THAT CANNOT SERVE FALLS BACK, IT DOES NOT FAIL ─────────────
 *
 * `resolveLoop` from `@fde/agent` picks the requested engine if it can run on
 * the configured provider, else the configured LOOP, else the first that can.
 * A saved picker value from an earlier visit must not fail the question. The
 * CLIs still refuse through `resolveEngine`, so a hand-typed `LOOP=sdk` on
 * hosted fails loudly there. The `started` event names the engine that ran.
 *
 * The picker already disables what cannot work, so the only way to reach this is
 * a hand-made request. That deserves a plain no.
 */
import { createFileRoute } from '@tanstack/react-router';
import { resolveLoop } from '@fde/agent';
import { askSafety } from '@calder/safety/agent/run';
import { clientIdFrom, publicDemoEnabled, sharedDemoLimiter } from '@fde/guard';
import { recordAsk } from '../server/ask-history';

/** Long enough to keep a proxy from closing a slow answer, short enough to matter. */
const HEARTBEAT_MS = 15_000;

/** Longer than any real question, and a guard against an empty POST. */
const MAX_QUESTION = 500;

/**
 * Waited after each model turn.
 *
 * The free tier limits by the minute and a question is NOT one request — one
 * question has made ten tool calls, over half a minute's budget at once. A run
 * whose average was under the limit still died, because a limit applies to any
 * window rather than to the mean.
 */
const TURN_PACE_MS = 2_000;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => null)) as {
          question?: string;
          engine?: string;
        } | null;
        const question = String(body?.question ?? '').trim();
        // The public demo's spend gate, rate limit only: this route has no key.
        // Off unless PUBLIC_DEMO=true, so nothing changes before the variable is
        // set. Only a question that will reach the model is counted.
        if (publicDemoEnabled() && question && question.length <= MAX_QUESTION) {
          const limit = sharedDemoLimiter().admit(clientIdFrom(request.headers));
          if (!limit.ok) {
            return new Response(JSON.stringify({ error: limit.error }), {
              status: limit.status,
              headers: {
                'content-type': 'application/json',
                'retry-after': String(limit.retryAfterSeconds),
              },
            });
          }
        }
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                // The reader navigated away mid-answer. Not worth raising.
              }
            };

            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
              } catch {
                /* closed */
              }
            }, HEARTBEAT_MS);

            const started = Date.now();

            try {
              if (!question) {
                send('error', { message: 'Type a question, or pick one of the four below.' });
                return;
              }
              if (question.length > MAX_QUESTION) {
                send('error', { message: `That is longer than ${MAX_QUESTION} characters.` });
                return;
              }

              // Falls back to the configured LOOP rather than refusing: a saved
              // or stale picker value must not fail the question. `fellBackFrom`
              // is logged, and the `started` event names the engine that ran.
              const resolved = resolveLoop(body?.engine);
              if (resolved.reason) console.warn(`[safety/ask] ${resolved.reason}`);
              const picked = { engine: resolved.choice };

              // BEFORE the loop runs, not after. The whole reason this route
              // streams is that an answer can take eighty-five seconds, and a
              // page that learns which engine is answering only once the answer
              // arrives has been staring at nothing the entire time.
              send('started', { engine: picked.engine, model: null, question });

              // The names, in order. What it ASKED FOR is the thing worth
              // keeping — two runs of one question can reach the same words by
              // different routes, and only this tells them apart.
              const asked: string[] = [];

              const result = await askSafety(question, {
                engine: picked.engine,
                // The free tier limits by the minute and a question is not one
                // request. Pacing after each turn is what stopped a run dying
                // while its average looked fine.
                turnPaceMs: TURN_PACE_MS,
                onToolCall: (name, args) => {
                  // THE PRODUCT ON THIS PAGE, not debug output — "it looked the
                  // recall up rather than searching for it" is invisible in the
                  // prose.
                  asked.push(name);
                  send('tool', { name, args });
                },
              });

              const { engine, model, ms } = result;
              // The model name is only known once the run has resolved it, so
              // it arrives as its own event rather than being held back.
              send('engine', { engine, model });

              if (result.answer) {
                send('answer', { answer: result.answer, ms, calls: result.calls.length });
              } else {
                // Not a crash. The contract refused it, and the reasons are the
                // most honest thing this system produces.
                send('rejected', { errors: result.schemaErrors, ms });
              }

              // AFTER the answer is on the wire. Nobody waits on a database
              // round trip to read their own result, and a failed row must not
              // take down the thing it is recording.
              void recordAsk({
                question,
                engine,
                model,
                ms,
                tools: asked,
                answer: result.answer?.answer ?? null,
                rejected: result.answer ? null : result.schemaErrors,
                escalated: Boolean(result.answer?.escalate),
              });
            } catch (err) {
              send('error', {
                message: err instanceof Error ? err.message : 'The question could not be answered.',
                ms: Date.now() - started,
              });
            } finally {
              clearInterval(heartbeat);
              send('done', {});
              try {
                controller.close();
              } catch {
                /* already closed */
              }
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
