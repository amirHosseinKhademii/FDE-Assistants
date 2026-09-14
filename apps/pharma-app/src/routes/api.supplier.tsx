/**
 * POST /api/supplier — the second question, streamed the same way as the first.
 *
 * WHY THIS IS A SECOND ROUTE AND NOT A FLAG ON `/api/ask`. The two questions do
 * not return the same thing. `supplier-impact-schema.ts` reached that verdict by
 * trying: a release decision has one `escalate`, a work list has an exposure
 * band and a next action PER ROW, and the rule that a finding without a named
 * human is the system quietly deciding has to fire per row here. One endpoint
 * returning either shape would push the discrimination into every caller, and a
 * caller that guesses wrong draws a supplier work list as a clean release
 * dossier — which in this domain reads as "nothing is wrong".
 *
 * EVERYTHING ELSE IS DELIBERATELY IDENTICAL to `api.ask.tsx`: the fail-closed
 * guard runs before the body is read, the answer is not streamed token by token
 * because half-arrived JSON has not passed `coherenceErrors()` yet, and the row
 * is filed AFTER the answer is sent so the reviewer never waits on Postgres.
 * Read that file's header for the reasoning; it is not repeated here.
 *
 * ONE DOMAIN IMPORT. `askSupplierImpact` is the single assembly the CLI, the
 * eval runner and this route all call. This route opens no database handle of
 * its own — the loop owns that, which is also what keeps `pnpm sql:check` honest
 * about what the web surface can reach.
 *
 * TWO TOPOLOGIES, AND THE DEFAULT IS THE CHEAP ONE. `topology: 'loop'` runs the
 * single agent — three requests, about $0.008. `topology: 'fanout'` runs
 * `supplier-impact-fanout.ts`: one sub-agent per lot at concurrency 4, plus an
 * assembler, measured once at 24 calls and $0.0398.
 *
 * THE RULE THAT REPLACED "NOT WIRED HERE". An earlier version of this file
 * refused the fan-out outright, on the grounds that a page should not fire
 * twenty-four model calls because somebody clicked a button. That reasoning was
 * about a SILENT click, and it still holds: the fan-out is never the default, it
 * has to be asked for by name, and the control that asks for it states the cost
 * where the thumb is. What the refusal should never have meant is that the
 * comparison is unavailable to anyone without a terminal — the whole reason two
 * topologies exist is to be compared, and a comparison nobody can run is a claim.
 *
 * THE TOPOLOGY IS RECORDED ON THE RUN, not just acted on. An answer whose route
 * is not stored cannot be compared with one produced the other way, which would
 * make the history useless for the one question it is best placed to answer.
 *
 * A PARTIAL FAN-OUT IS NOT A SHORTER ANSWER. Twenty-three independent calls will
 * not all succeed forever, and the orchestrator returns `ok: false` with the
 * missing lots named rather than a quietly shorter list — its header calls a
 * 20-row answer to a 23-lot question "a lie of omission about patient exposure".
 * That distinction has to survive the wire, so `problems` travels with the
 * answer and the page renders it above the rows.
 *
 * THREE TOPOLOGIES NOW, AND THE THIRD RETURNS A DIFFERENT THING. `topology:
 * 'debate'` runs `lot-debate.ts` on the single most exposed contested lot: two
 * advocates open independently, answer each other, and an adjudicator writes
 * the disagreement up for a human. It returns an escalation MEMO, not a work
 * list — so it is sent as its own event and the page renders it with its own
 * component rather than being forced into the row shape.
 *
 * WHY ONE LOT AND NOT ALL THE CONTESTED ONES. `isContested` fires on 11 of 23
 * for SUP-04, at roughly five calls each — about fifteen times the single loop
 * for one question. Debating one lot is the demonstration; debating eleven is a
 * decision about a budget, and it belongs to whoever is paying rather than to
 * whoever clicked. The lot chosen is the top of the ranking, which is the one a
 * reviewer would have picked anyway.
 */
import { createFileRoute } from '@tanstack/react-router';
import { askSupplierImpact } from '@meridian/pharma/supplier';
import { askSupplierImpactFanout } from '@meridian/pharma/fanout';
import { debateTopLot } from '@meridian/pharma/debate';
import { authorize } from '@fde/guard';
import { recordAsk } from '../server/ask-history';

const encoder = new TextEncoder();

/** Proxies drop idle connections, and a walk across the estate is idle to them. */
const HEARTBEAT_MS = 15_000;

export const Route = createFileRoute('/api/supplier')({
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
        const question = String(body?.question ?? '').trim();
        const loop = String(body?.loop ?? 'sdk');
        // Anything not spelled 'fanout' is the single loop. An unrecognised
        // value must not be able to select the expensive route by accident.
        const topology =
          body?.topology === 'fanout' || body?.topology === 'debate' ? body.topology : 'loop';

        // Raw events, not rendered sentences — see `lib/trace-lines.ts`.
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

              if (topology === 'fanout') {
                await runFanout({ question, loop, send, events, recordAsk });
                return;
              }
              if (topology === 'debate') {
                await runDebate({ question, loop, send, events });
                return;
              }

              const result = await askSupplierImpact({
                question,
                loop,
                surface: 'http',
                onEvent: (e: any) => {
                  if (e.type === 'turn_start') send('turn_start', { turn: e.turn });
                  else if (e.type === 'tool_call') {
                    const args = typeof e.args === 'string' ? safeParse(e.args) : e.args;
                    events.push({ type: 'tool_call', turn: e.turn, name: e.name, args });
                    send('tool_call', { turn: e.turn, name: e.name, args });
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
                topology,
                turns: result.turns.length,
                toolCalls: result.toolCalls,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                ms: result.ms,
                engine: result.engine,
                stoppedBecause: result.stoppedBecause,
                // A CEILING unless the engine reported a cached count; `costBasis`
                // says which, and the page prints that word rather than implying
                // a precision the figure does not have.
                costUsd: result.costUsd,
                costBasis: result.costBasis,
              };

              if (result.structured) {
                const answer = { ...result.structured, run };
                send('answer', answer);
                await recordAsk({
                  kind: 'supplier',
                  question, loop, surface: 'http',
                  answer, failure: null, run, trace: events,
                });
              } else {
                const failure = {
                  // An empty work list and a work list that could not be produced
                  // are opposite answers to "what did we make with their
                  // material". Never render the second as the first.
                  message: result.schemaErrors.join(' | ') || 'no valid answer',
                  stoppedBecause: result.stoppedBecause,
                  run,
                };
                send('error', failure);
                await recordAsk({
                  kind: 'supplier',
                  question, loop, surface: 'http',
                  answer: null, failure, run, trace: events,
                });
              }
            } catch (e: any) {
              const failure = { message: e?.message ?? String(e), stoppedBecause: 'exception' };
              send('error', failure);
              await recordAsk({
                kind: 'supplier',
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
            'x-accel-buffering': 'no',
          },
        });
      },
    },
  },
});

/**
 * The fan-out half of this route.
 *
 * WHY THE SUPPLIER ID IS PARSED OUT OF THE SENTENCE HERE. The single loop lets
 * the MODEL read the question and choose the tool argument, which is the right
 * division of labour when a model is in the loop at all. The orchestrator is not
 * a conversation — it takes a supplier id and fans out — so somebody has to turn
 * the sentence into an id, and doing it here with an explicit pattern is honest
 * about the fact that no model is reading this question. A sentence with no
 * supplier id in it is refused rather than guessed at: two supplier ids one
 * character apart are different companies.
 *
 * ONE PROGRESS LINE, NOT TWENTY-THREE. `onProgress` fires per lot, and the
 * working notes would be pushed past the sticky column by 23 entries — burying
 * the live step the animation exists to mark. So the event carries `done` and
 * `total` and the page collapses them into one line that updates.
 */
async function runFanout({
  question,
  loop,
  send,
  events,
  recordAsk: record,
}: {
  question: string;
  loop: string;
  send: (event: string, data: unknown) => void;
  events: unknown[];
  recordAsk: typeof recordAsk;
}): Promise<void> {
  const supplierId = question.match(/\bSUP-\d{2,}\b/i)?.[0]?.toUpperCase();
  if (!supplierId) {
    send('error', {
      message:
        'Fan-out needs an exact supplier id in the question, e.g. "SUP-04". ' +
        'It calls no model to interpret the sentence, so it cannot guess one.',
      stoppedBecause: 'bad_request',
    });
    return;
  }

  const started = Date.now();
  const result = await askSupplierImpactFanout({
    supplierId,
    loop,
    surface: 'http',
    // The whole work list, before the first sub-agent is dispatched. Without
    // this the page knows nothing — not even how many lots — until a lot
    // finishes, which is fifteen seconds of a blank panel.
    onStart: (lots: any[]) => {
      const e = { type: 'fanout_start', lots };
      events.push(e);
      send('fanout_start', e);
    },
    onProgress: (done: number, total: number, lotId: string, ok: boolean, error?: string) => {
      const e = { type: 'fanout_progress', done, total, lotId, ok, error };
      events.push(e);
      send('fanout_progress', e);
    },
  });

  const run = {
    topology: 'fanout',
    turns: result.calls,
    toolCalls: result.calls,
    inputTokens: result.inputTokens,
    cachedInputTokens: result.cachedInputTokens,
    outputTokens: result.outputTokens,
    ms: result.ms ?? Date.now() - started,
    engine: `fan-out · ${result.calls} calls`,
    stoppedBecause: result.ok ? 'complete' : 'partial',
    costUsd: result.costUsd,
    costBasis: result.costBasis,
  };

  if (result.answer) {
    // `problems` rides WITH the answer, and `ok` is carried rather than dropped.
    // A 20-row list for a 23-lot question renders identically to a complete one
    // unless the page is told; see this file's header.
    const answer = { ...result.answer, run, fanout: { ok: result.ok, problems: result.problems } };
    send('answer', answer);
    await record({
      kind: 'supplier',
      question, loop, surface: 'http',
      answer, failure: null, run, trace: events,
    });
    return;
  }

  const failure = {
    message: result.problems.join(' | ') || 'the fan-out produced no valid answer',
    stoppedBecause: run.stoppedBecause,
    run,
  };
  send('error', failure);
  await record({
    kind: 'supplier',
    question, loop, surface: 'http',
    answer: null, failure, run, trace: events,
  });
}

/**
 * One contested lot, argued.
 *
 * WHY THE WALK RUNS FIRST AND COSTS NOTHING. `assessSupplierImpact` is
 * deterministic SQL — it is how we learn which lots exist, which are contested,
 * and which is worst. Asking a model to pick the lot to argue about would put a
 * model in front of a decision that is a sort.
 *
 * NOT RECORDED IN `ask_history`, and that is deliberate rather than an omission.
 * That table holds questions and the ANSWERS they got, and every reader of it —
 * the sidebar, `listAsks`, the two renderers — assumes a row's answer is one of
 * the two contract shapes. A debate memo is neither. Filing it there would put
 * a third shape into a table whose whole discipline is that `kind` tells you
 * which renderer can read the row. When the debate earns a place in the
 * history it earns a `kind` of its own and a column in that discussion; until
 * then it is a thing you run and read, not a thing that accumulates.
 */
async function runDebate({
  question,
  loop,
  send,
  events,
}: {
  question: string;
  loop: string;
  send: (event: string, data: unknown) => void;
  events: unknown[];
}): Promise<void> {
  const supplierId = question.match(/\bSUP-\d{2,}\b/i)?.[0]?.toUpperCase();
  if (!supplierId) {
    send('error', {
      message:
        'The debate needs an exact supplier id in the question, e.g. "SUP-04". ' +
        'It picks the lot to argue about by ranking, not by reading the sentence.',
      stoppedBecause: 'bad_request',
    });
    return;
  }

  const out = await debateTopLot({
    supplierId,
    loop,
    onStart: (info) => {
      const e = { type: 'debate_start', ...info };
      events.push(e);
      send('debate_start', e);
    },
    onStage: (stage) => {
      const e = { type: 'debate_stage', ...stage };
      events.push(e);
      send('debate_stage', e);
    },
  });

  if (!out.ok) {
    send('error', { message: out.reason, stoppedBecause: out.because });
    return;
  }

  const { result, costUsd, costBasis } = out;
  send('debate', {
    ...result,
    run: {
      topology: 'debate',
      turns: result.calls,
      toolCalls: result.calls,
      inputTokens: result.inputTokens,
      cachedInputTokens: result.cachedInputTokens,
      outputTokens: result.outputTokens,
      ms: result.ms,
      engine: `debate · ${result.calls} calls`,
      stoppedBecause: result.errors.length ? 'partial' : 'complete',
      costUsd,
      costBasis,
    },
  });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
