/**
 * The tool-calling loop. Pillar 2.
 *
 * This is the ONLY agent loop now. A hand-rolled version came first — about 330
 * lines driving the raw Responses API protocol — and it is kept, unmaintained,
 * at `archive/pillar-2-handrolled/loop.ts`. Read it when the SDK does something
 * surprising; it is the reference for what the protocol looks like underneath.
 *
 * WHY IT WAS REPLACED. Writing it by hand was the right way to LEARN the
 * protocol and the wrong way to keep it. The argument FDE.md pillar 2 makes for
 * hand-rolling — that a framework destroys your audit trail — turned out to be
 * weaker than it sounds: this SDK hands back `rawResponses` and a full
 * `history`, which is the same record, obtained with less code. The reasons
 * that actually survived are about DEFAULTS, not auditability, and they are
 * below.
 *
 * THE TWO DATA-EGRESS DEFAULTS THAT MATTER. Both were found by reading the
 * SDK's own types and source, not its docs, and both are opt-OUT:
 *
 *   1. `store` defaults to TRUE.  model.d.ts:286 — "Defaults to true if not
 *      provided." The provider retains the response payload whether or not you
 *      ever chain off it. The hand-rolled loop passed `store: false`
 *      explicitly; adopting the SDK without setting it would silently START
 *      persisting claim data on the provider's side, in what looked like a
 *      pure refactor.
 *
 *   2. Tracing defaults to ON, and exports to `https://api.openai.com/v1/
 *      traces/ingest` (openaiTracingExporter.js:527) with model inputs, tool
 *      arguments and tool results included unless you also opt out of those.
 *      This is the dangerous one, because it is a SECOND destination: our model
 *      calls go to an Azure Foundry endpoint in a region we chose, but traces
 *      would go to OpenAI regardless. For an EU insurer that is a cross-border
 *      transfer introduced by a library default.
 *
 *      Today it happens to no-op — the exporter logs "No API key provided ...
 *      Exports will be skipped" when no OpenAI key is set, and we authenticate
 *      with DefaultAzureCredential, so there is no key. That is safety by
 *      accident, not by design: the moment anyone puts OPENAI_API_KEY in a .env
 *      for an unrelated reason, claim text starts flowing. So we disable it
 *      explicitly, and `compliance-selftest.ts` asserts it stays disabled.
 *
 * The transferable lesson, and the reason this file is commented this heavily:
 * ADOPT THE FRAMEWORK, THEN PIN THE COMPLIANCE-CRITICAL BEHAVIOUR WITH A TEST.
 * You do not trust a default and you do not trust the docs. You assert it on
 * the wire.
 */
import type OpenAI from 'openai';
import {
  Agent,
  run,
  tool,
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
  MaxTurnsExceededError,
} from '@openai/agents';
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { summariseResult } from '../core/summarise';
import {
  DEFAULT_MAX_TURNS,
  type LoopOptions,
  type LoopResult,
  type TurnRecord,
  type ValidationResult,
} from '../core/loop.types';

/**
 * Point the SDK at OUR client and shut off its telemetry.
 *
 * `setDefaultOpenAIClient` is the whole Azure story: the SDK does not need to
 * know about Foundry, it just uses the already-configured `OpenAI` instance
 * from `foundry/client.ts` — same endpoint, same DefaultAzureCredential, same
 * region. There is no Azure-specific code path.
 *
 * Idempotent because these are process-wide globals and both `ask` and `eval`
 * may configure before running.
 *
 * NOTE, and it cost an hour to learn: `setDefaultOpenAIClient` is FIRST-WRITE-
 * WINS. The SDK caches the client when it first resolves a model and ignores
 * later calls. There is deliberately no `reset()` here, because a function that
 * appears to swap the client and cannot would be worse than none — the
 * compliance self-test had exactly that bug and silently recorded zero requests
 * while looking like it passed. To drive a genuinely different client, build an
 * `OpenAIResponsesModel` explicitly and hand it to the Agent as `model`.
 */
let configured = false;
export function configureSdk(client: OpenAI): void {
  if (configured) return;
  // Traces would otherwise go to api.openai.com. See the header.
  setTracingDisabled(true);
  setDefaultOpenAIClient(client as never);
  // Be explicit: the Responses API, the same surface loop.ts drives by hand.
  setOpenAIAPI('responses');
  configured = true;
}

export async function runLoopSdk<T = unknown>(
  client: OpenAI,
  model: string,
  registry: ToolRegistry,
  prompt: string,
  opts: LoopOptions = {},
): Promise<LoopResult<T>> {
  configureSdk(client);

  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  const schemaErrors: string[] = [];
  let retriesLeft = opts.structuredRetries ?? 1;

  // Tool calls in dispatch order, sliced back into per-turn buckets at the end.
  const dispatched: ToolCallRecord[] = [];

  // Every tool keeps going through OUR registry, so fixtures, timing, error
  // shaping and the `source: 'live' | 'fixture'` record are unchanged. The SDK
  // only decides WHEN to call them.
  const tools = registry.schemas().map((s) =>
    tool({
      name: s.name,
      description: s.description,
      // A Zod object, taken natively — this is the payoff for standardising on
      // Zod across output AND tool parameters rather than only the former.
      parameters: s.parameters,
      strict: true,
      execute: async (args: unknown) => {
        opts.onEvent?.({ type: 'tool_call', turn: 0, name: s.name, args });
        const rec = await registry.dispatch(s.name, args);
        dispatched.push(rec);
        opts.onEvent?.({
          type: 'tool_result',
          turn: 0,
          name: rec.name,
          ok: rec.ok,
          ms: rec.ms,
          summary: rec.ok ? summariseResult(rec.result, opts.summariseResult) : (rec.error ?? 'failed'),
        });
        // Same contract the hand-rolled loop had — a failed tool comes back as
        // readable JSON the model can recover from, never a thrown exception.
        return JSON.stringify(rec.ok ? rec.result : { error: rec.error });
      },
      // Belt and braces: registry.dispatch already catches, but if it ever
      // throws the model should still get text rather than the run dying.
      errorFunction: (_ctx, error) =>
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
    }),
  );

  const agent = new Agent({
    name: opts.agentName ?? 'agent',
    instructions: opts.system ?? '',
    model,
    tools,
    modelSettings: {
      // Both of these are non-default and both are load-bearing. See header.
      store: false,
      // model.d.ts:274 — "Defaults to false if not provided." The hand-rolled
      // loop ran same-turn calls concurrently and called serialising them "a
      // silent latency bug", so leaving this off would make this path slower
      // than its predecessor for reasons unrelated to the SDK.
      parallelToolCalls: true,
      ...(opts.reasoningEffort ? { reasoning: { effort: opts.reasoningEffort } } : {}),
    },
    // The Zod schema goes straight in — no cast, no conversion step of ours.
    // The SDK emits strict JSON Schema with reused sub-objects inlined rather
    // than $ref'd, which is what OpenAI strict mode requires. Verified by
    // capturing the outgoing request; see coverage-schema.ts's header.
    ...(opts.responseFormat ? { outputType: opts.responseFormat } : {}),
  });

  const validate =
    opts.validate ??
    // NO DOMAIN DEFAULT, and asking for a schema without a validator is a
    // mistake rather than a shortcut: it would let raw text through as if it
    // had passed, and it would typecheck. So it throws instead.
    (() => {
      if (opts.responseFormat) {
        throw new Error(
          'responseFormat was set without a validate function. @fde/agent ships no ' +
            'default validator — the answer contract is yours. Pass one (see @fde/schema).',
        );
      }
      return (raw: string): ValidationResult => ({ ok: true, value: raw as unknown });
    })();

  let input: any = prompt;
  let turns: TurnRecord[] = [];
  /** How many of `dispatched` earlier attempts already claimed. */
  let toolsAccountedFor = 0;

  for (;;) {
    let result: any;
    try {
      result = await run(agent, input, { maxTurns });
    } catch (e) {
      if (e instanceof MaxTurnsExceededError) {
        /**
         * ── THE AUDIT TRAIL SURVIVES THE CAP ────────────────────────────
         *
         * `turns` here holds only what EARLIER `run()` calls returned, and on
         * the common case — hitting the cap on the first pass — that is an
         * empty array. The SDK throws instead of returning partial results, so
         * every tool call it made is thrown away with it.
         *
         * A steering assessment hit this and reported **"0 turn(s), 98,367ms"**
         * for a run that had made six tool calls and spent real money. The
         * cost log recorded zero. The comment on the accumulation below
         * describes the identical failure in the schema-retry path — "the
         * pass/fail was right and the audit trail was a lie" — and this is the
         * one path that fix did not reach.
         *
         * So the dispatched calls are folded into a final record. TOKEN COUNTS
         * ARE NOT RECOVERABLE: the exception carries no usage, and inventing a
         * zero would understate a bill rather than admit a gap. `inputTokens: 0`
         * with `stoppedBecause: 'max_turns'` is the signal that the count is
         * missing, not that it was free — `RequestRecord`'s own rule about
         * `undefined` versus `0` applies, and the field being required is why
         * this note exists instead.
         */
        const unaccounted = dispatched.slice(toolsAccountedFor);
        const withTail: TurnRecord[] = unaccounted.length
          ? [
              ...turns,
              {
                turn: turns.length + 1,
                ms: 0,
                inputTokens: 0,
                outputTokens: 0,
                toolCalls: unaccounted,
                stopReason: 'max_turns',
              } as TurnRecord,
            ]
          : turns;
        return { text: '', turns: withTail, stoppedBecause: 'max_turns', schemaErrors };
      }
      throw e;
    }

    // ACCUMULATE, never overwrite. A schema retry calls run() again with the
    // history, and that second call's `rawResponses` contains only the retry —
    // so assigning here would erase the first attempt's turns and tool calls
    // from the record. That is how `cov-004` reported "1 turn, 0 tool calls"
    // for a run that had really made two tool calls before failing validation:
    // the pass/fail was right and the audit trail was a lie. In a claims
    // context the audit trail IS the deliverable, so this is not cosmetic.
    //
    // Mirrors loop.ts's `turns.push(record)` per round-trip. See
    // archive/pillar-2-handrolled/loop.ts.
    turns = [...turns, ...turnsFrom(result, dispatched, turns.length, toolsAccountedFor)];
    toolsAccountedFor = dispatched.length;

    const text =
      typeof result.finalOutput === 'string'
        ? result.finalOutput
        : JSON.stringify(result.finalOutput ?? '');

    for (const t of turns) opts.onTurn?.(t);

    if (!opts.responseFormat) {
      return { text, turns, stoppedBecause: 'model_finished', schemaErrors };
    }

    // WHY WE RE-VALIDATE WHAT THE SDK ALREADY VALIDATED. `outputType` enforces
    // SHAPE — fields present, right types — and hands back a parsed object. It
    // knows nothing about coverage-schema.ts's `coherenceErrors()`, which is
    // where the rule PROGRESS.md calls "the single most important rule in this
    // file" lives: an unresolved conflict with no escalation is the model
    // silently picking a side while looking fully compliant. That object is
    // shape-valid. Without this block cov-004 could start passing for the wrong
    // reason and the baseline would stop being comparable.
    const validated = validate(text);
    if (validated.ok) {
      return {
        text,
        turns,
        structured: validated.value as T,
        stoppedBecause: 'model_finished',
        schemaErrors,
      };
    }

    schemaErrors.push(validated.errors!);
    opts.onEvent?.({ type: 'schema_retry', turn: turns.length, error: validated.errors! });

    if (retriesLeft <= 0) {
      // Fail loudly, exactly as loop.ts:210 does. Silent repair hides the
      // failure rate, and the failure rate is a number you need.
      return { text, turns, stoppedBecause: 'schema_invalid', schemaErrors };
    }
    retriesLeft--;

    // Continue the SAME conversation: history + the error, mirroring
    // loop.ts:214-222 so a retry costs the same and looks the same.
    input = [
      ...result.history,
      {
        role: 'user',
        content:
          `Your previous response did not satisfy the required schema: ` +
          `${validated.errors}. Reply again with valid JSON only.`,
      },
    ];
  }
}

/**
 * Rebuild `TurnRecord[]` from the SDK's raw model responses.
 *
 * One `rawResponse` is one model round-trip, which is exactly what `loop.ts`
 * calls a turn — so token counts and turn counts stay comparable across the two
 * engines. Tool calls are re-attached by walking the responses in order and
 * taking as many dispatched records as each response asked for; tools run in
 * request order, so the slices line up.
 *
 * `ms` per turn is not available from the SDK (it does not time individual
 * round-trips), so it is reported as 0 rather than guessed. Total wall-clock is
 * still measured by the caller, which is what the scorecard actually reports.
 */
/**
 * Cached input tokens out of an Agents SDK usage object, or `undefined`.
 *
 * The count lives under `inputTokensDetails.cached_tokens`, which is the
 * Responses API's own key passed through. The SDK exposes that as an ARRAY on
 * the aggregate `Usage` (one entry per request) and as a plain object on a
 * single `RequestUsage`, so both shapes are handled.
 *
 * RETURNS `undefined`, NOT `0`, WHEN THE KEY IS ABSENT. The detail object is
 * documented as not needing to carry every key, so "no `cached_tokens` here"
 * means the provider did not say — which is a different fact from "nothing was
 * cached", and `TurnRecord` keeps them apart deliberately.
 */
function cachedFrom(usage: any): number | undefined {
  const details = usage?.inputTokensDetails ?? usage?.input_tokens_details;
  if (!details) return undefined;

  const entries: any[] = Array.isArray(details) ? details : [details];
  const present = entries.filter((d) => typeof d?.cached_tokens === 'number');
  if (present.length === 0) return undefined;

  return present.reduce((n, d) => n + d.cached_tokens, 0);
}

function turnsFrom(
  result: any,
  dispatched: ToolCallRecord[],
  turnOffset: number,
  toolOffset: number,
): TurnRecord[] {
  const responses: any[] = result.rawResponses ?? [];
  const turns: TurnRecord[] = [];
  let taken = toolOffset;

  responses.forEach((res, i) => {
    const wanted = (res.output ?? []).filter((o: any) => o.type === 'function_call').length;
    const calls = dispatched.slice(taken, taken + wanted);
    taken += wanted;
    turns.push({
      turn: turnOffset + i + 1,
      ms: 0,
      inputTokens: res.usage?.inputTokens ?? res.usage?.input_tokens ?? 0,
      // `inputTokensDetails` is an ARRAY on the SDK's aggregate `Usage` — one
      // entry per request — and a plain object on a single `RequestUsage`. Both
      // shapes appear depending on what produced `res`, so both are summed.
      // Reading only the object form would silently return nothing on the
      // aggregate, which looks identical to a cache that never hit.
      cachedInputTokens: cachedFrom(res.usage),
      outputTokens: res.usage?.outputTokens ?? res.usage?.output_tokens ?? 0,
      toolCalls: calls,
    });
  });

  return turns;
}

