/**
 * POST /api/assess — the same assessment `pnpm steering:assess` runs, streamed.
 *
 * THE RECORDER — `recordAssessment` — is the third import and it is not
 * assembly: it chooses no tool, no prompt and no contract. It runs HERE rather
 * than from the browser so that somebody who closes the tab mid-answer still
 * leaves a row behind, and it runs AFTER the answer is sent so nobody waits on
 * a database round trip to read their own result.
 *
 * TWO DOMAIN IMPORTS AND NO ASSEMBLY. `fetchRequirement` gets the question,
 * `assessRequirement` answers it. Both are the entry points the CLI already
 * calls; building the loop here instead would mean building it in two places,
 * and two places drift — add a tool or change the prompt and the browser and
 * the terminal answer differently while both look healthy.
 *
 * WHAT STAYS HERE is what a surface is actually for: read the request, frame
 * the events as SSE, decide what a failure looks like on the wire.
 *
 * ── TWO WAYS IN, AND THEY ARE NOT THE SAME CLAIM ─────────────────────────
 *
 * Post a `ref` and the text is read from `vst_alm` — that assessment is OF a
 * specific requirement at the revision in force, and the server can say so.
 * Post `text` and it is assessed exactly as typed, which is the real job: an
 * OEM sends a requirement that is not in anybody's database yet and wants a
 * price in two weeks. That is the whole engagement.
 *
 * THE DIFFERENCE IS CARRIED BACK TO THE PAGE rather than smoothed over. A
 * looked-up requirement echoes its revision; a typed one says `as typed` and
 * has no section, no safety level and no priority, because nobody has written
 * them down yet. Letting the second borrow the first's framing would put a
 * revision number under a sentence somebody pasted from an email.
 *
 * A ref AND text is the ref, ignored: the page drops the ref the moment the
 * text is edited, so the two arriving together means something is out of step
 * and the authoritative one wins.
 *
 * ── WHY SERVER-SENT EVENTS ───────────────────────────────────────────────
 *
 * An assessment is a multi-turn loop that searches the corpus and prices
 * against past jobs; it takes tens of seconds. Sending nothing until it
 * finishes makes a working system look broken.
 *
 * WHY POST RATHER THAN THE BROWSER'S `EventSource`. `EventSource` is GET-only
 * and cannot set headers — the requirement reference would travel in the URL,
 * where proxies and access logs keep it, and there would be nowhere to carry
 * the key the fail-closed guard needs.
 *
 * ── WHY THE ANSWER IS NOT STREAMED WORD BY WORD ──────────────────────────
 *
 * An assessment is a validated object. Half-arrived JSON has not passed
 * `coherenceErrors()` yet, and in THIS domain the contract's whole job is that
 * no field may state a commitment — so streaming unvalidated prose would put
 * "carries over at no cost" on screen for two seconds before the check that
 * exists to forbid it ever runs. The live feeling comes from the tool events,
 * which are real.
 */
import { createFileRoute } from '@tanstack/react-router';
import { assessRequirement } from '@vantis/steering/assess';
import { fetchRequirement } from '@vantis/steering/requirements';
import { authorize } from '@fde/guard';
import { recordAssessment } from '../server/assess-history';

const encoder = new TextEncoder();

/**
 * The reference a typed requirement is assessed under.
 *
 * The answer contract requires one and the page must not be able to pass it off
 * as a customer id — so it is a word, not something shaped like `CR-K2-0101`.
 */
const NEW_REF = 'NEW-REQUIREMENT';

/** Proxies drop idle connections, and a minute inside one tool call is idle to them. */
const HEARTBEAT_MS = 15_000;

export const Route = createFileRoute('/api/assess')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Before anything else happens — no body parsing, no database
        // connection, no model call for a request that is not allowed. The
        // guard is fail-CLOSED: no key configured means refuse, not allow.
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
        const ref = String(body?.ref ?? '').trim().toUpperCase();
        const typed = String(body?.text ?? '').trim();
        const loop = String(body?.loop ?? 'sdk');

        // RAW EVENTS, not rendered lines. What happened is a fact and belongs
        // in the row; the sentences explaining it are presentation and get
        // reworded.
        const events: unknown[] = [];

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                // The client navigated away mid-assessment. Not worth raising.
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
              if (!ref && !typed) {
                send('error', {
                  message: 'type a requirement, or pick one from the specification',
                  stoppedBecause: 'bad_request',
                });
                return;
              }

              let requirement: any;
              if (ref) {
                requirement = await fetchRequirement(ref);
                if (!requirement) {
                  send('error', {
                    message: `${ref} is not an in-force customer requirement`,
                    stoppedBecause: 'not_found',
                  });
                  return;
                }
              } else {
                // Everything the estate would have supplied is absent, and it is
                // sent as absent rather than as a blank. A typed requirement has
                // no section and no agreed safety level, and inventing either
                // would be the page asserting something nobody has decided.
                requirement = {
                  ref: NEW_REF,
                  section: null,
                  title: 'A requirement as it arrived',
                  text: typed,
                  attribute: null,
                  unit: null,
                  asil: null,
                  priority: null,
                  verificationMethod: null,
                  revision: 'as typed',
                  specTitle: 'not in the specification yet',
                };
              }

              // Echoed back before the loop starts, so the page can show WHAT
              // is being assessed — with its revision — while it waits. A
              // spinner over a reference number tells a reader nothing about
              // whether the right question is being answered.
              send('requirement', requirement);

              const result = await assessRequirement({
                requirementRef: requirement.ref,
                text: requirement.text,
                loop,
                surface: 'http',
                onEvent: (e: any) => {
                  if (e.type === 'turn_start') send('turn_start', { turn: e.turn });
                  else if (e.type === 'tool_call') {
                    send('tool_call', {
                      turn: e.turn,
                      name: e.name,
                      // The Agents SDK passes args as a JSON string, Mastra as
                      // an object. Normalised once here so the page never has
                      // to care which engine ran.
                      args: typeof e.args === 'string' ? safeParse(e.args) : e.args,
                    });
                  } else if (e.type === 'tool_result') {
                    const r = { turn: e.turn, name: e.name, ok: e.ok, ms: e.ms, summary: e.summary };
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
                toolCalls: result.turns.reduce((a: number, t: any) => a + (t.toolCalls?.length ?? 0), 0),
                ms: result.ms,
                engine: result.engine,
                stoppedBecause: result.stoppedBecause,
                schemaRetries: result.schemaErrors.length,
              };

              const filed = {
                // Null when it was typed. The reference and the text are both
                // stored: keeping only the reference would lose what was
                // actually assessed the next time the specification is revised.
                ref: ref || null,
                text: requirement.text,
                loop,
                surface: 'http',
                trace: events,
              };

              if (result.assessment) {
                send('answer', {
                  assessment: result.assessment,
                  // What happened when each quote was looked for in the file it
                  // names. Sent because it is the check the whole contract rests
                  // on, and a page that hid it would be asking for trust it has
                  // already earned the evidence for.
                  citations: result.citations,
                  run,
                });
                // AFTER the send, never before.
                await recordAssessment({
                  ...filed,
                  answer: { assessment: result.assessment, citations: result.citations },
                  failure: null,
                  run,
                });
              } else {
                // No valid structured answer is a FAILURE, not an answer. An
                // empty object would render as a clean assessment — which in
                // this domain reads as "nothing stands in the way of quoting".
                const failure = {
                  message: result.schemaErrors.join(' | ') || 'no valid answer',
                  stoppedBecause: result.stoppedBecause,
                  run,
                };
                send('error', failure);
                // A failure is filed too. It spent tokens and took a minute,
                // and a history that keeps only the successes makes the system
                // look cheaper and more reliable than it is.
                await recordAssessment({ ...filed, answer: null, failure, run });
              }
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
