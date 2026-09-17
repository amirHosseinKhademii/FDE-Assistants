/**
 * POST /api/ask — the same loop `pnpm safety:ask` runs, streamed.
 *
 * ── FOUR DOMAIN IMPORTS AND NO ASSEMBLY ───────────────────────────────────
 *
 * The tools, the prompt, the recorder and the contract all come from
 * `@calder/safety` exactly as the CLI takes them. Building the loop here would
 * mean building it in two places, and two places drift: add a tool or change a
 * rule and the browser and the terminal answer differently while both look
 * healthy.
 *
 * What stays here is what a surface is for — read the request, frame the events
 * as SSE, and decide what a failure looks like on the wire.
 *
 * ── `recordingTools` IS NOT OPTIONAL ──────────────────────────────────────
 *
 * It deduplicates repeated calls and, more importantly, it is what lets rules 6
 * through 9 see what the tools actually returned. Passing `SAFETY_TOOLS`
 * straight to the registry would leave four of the nine rules silently inert —
 * the answers would still validate, against less.
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
 * ── AND THE ENGINE IS RESOLVED HERE, NOT DEFAULTED IN A CALL ──────────────
 *
 * Steering shipped a bug where `?? 'sdk'` fired on every request because the
 * client sent `undefined`, so `LOOP` was ignored on the deployed app and the sdk
 * engine refused every question. Resolved once from the environment, and named
 * in the opening event so the page can say which engine answered.
 */
import { createFileRoute } from '@tanstack/react-router';
import { ToolRegistry, chatClient, chatModelName, runLoop, loopChoice, engineLabel } from '@fde/agent';
import { openaiClient } from '@fde/foundry';
import { SAFETY_TOOLS } from '@calder/safety/agent/tools';
import { SAFETY_SYSTEM_PROMPT } from '@calder/safety/agent/prompt';
import { recordingTools, validatorFor } from '@calder/safety/agent/answer';
import { SafetyAnswerSchema, type SafetyAnswer } from '@calder/safety/schema/safety-answer';
import { recordAsk } from '../server/ask-history';

/** Long enough to keep a proxy from closing a slow answer, short enough to matter. */
const HEARTBEAT_MS = 15_000;

/** Longer than any real question, and a guard against an empty POST. */
const MAX_QUESTION = 500;

export const Route = createFileRoute('/api/ask')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => null)) as { question?: string } | null;
        const question = String(body?.question ?? '').trim();
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

              const choice = loopChoice(process.env.LOOP);
              const model = chatModelName(process.env.FOUNDRY_CHAT_DEPLOYMENT ?? '');

              const engine = engineLabel(choice);
              send('started', { engine, model, question });

              // The names, in order. What it ASKED FOR is the thing worth
              // keeping — two runs of one question can reach the same words by
              // different routes, and only this tells them apart.
              const asked: string[] = [];

              // RECORDED, so the contract's later rules can be checked against
              // what the tools returned rather than against what the answer says.
              const { tools, calls } = recordingTools(SAFETY_TOOLS);
              const registry = new ToolRegistry(tools);

              const result = await runLoop<SafetyAnswer>(
                choice,
                // The azure branch is a THUNK so it is never constructed on
                // another provider. Under LLM_PROVIDER=hosted this never runs.
                chatClient(() => openaiClient()),
                model,
                registry,
                question,
                {
                  system: SAFETY_SYSTEM_PROMPT,
                  responseFormat: SafetyAnswerSchema,
                  validate: validatorFor(calls),
                  agentName: 'calder-safety',
                  onEvent: (e: any) => {
                    // The tool call, as it starts. THE PRODUCT ON THIS PAGE,
                    // not debug output — "it looked the recall up rather than
                    // searching for it" is invisible in the prose.
                    if (e?.type === 'tool_call') {
                      asked.push(String(e.name));
                      send('tool', { name: e.name, args: e.args });
                    }
                  },
                },
              );

              const ms = Date.now() - started;

              if (result.structured) {
                send('answer', { answer: result.structured, ms, calls: calls.length });
              } else {
                // Not a crash. The contract refused it, and the reasons are the
                // most honest thing this system produces.
                send('rejected', { errors: result.schemaErrors ?? [], ms });
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
                answer: result.structured?.answer ?? null,
                rejected: result.structured ? null : (result.schemaErrors ?? []),
                escalated: Boolean(result.structured?.escalate),
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
