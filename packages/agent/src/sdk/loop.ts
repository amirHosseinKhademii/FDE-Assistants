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
import { Agent, run, MaxTurnsExceededError } from '@openai/agents';
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { schemaGate } from '../core/settle';
import {
  DEFAULT_MAX_TURNS,
  type LoopOptions,
  type LoopResult,
  type TurnRecord,
} from '../core/loop.types';
import { configureSdk } from './provider';
import { toSdkTools } from './tools';
import { turnsFrom } from './turns';

export async function runLoopSdk<T = unknown>(
  client: OpenAI,
  model: string,
  registry: ToolRegistry,
  prompt: string,
  opts: LoopOptions = {},
): Promise<LoopResult<T>> {
  configureSdk(client);

  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  // Owns the retry budget, the running error list and the one copy of the retry
  // sentence. `schemaErrors` below is the same array by reference, read by the
  // max_turns returns. See core/settle.ts for why the sentence is not local.
  const gate = schemaGate<T>(opts);
  const schemaErrors = gate.errors;

  // Tool calls in dispatch order, sliced back into per-turn buckets at the end.
  const dispatched: ToolCallRecord[] = [];

  const tools = toSdkTools(registry, dispatched, opts);

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

    // The gate decides finished-or-retry. What it CANNOT decide is the next
    // line: `outputType` enforces SHAPE, and coherence — an unresolved conflict
    // with no escalation, the rule PROGRESS.md calls "the single most important
    // rule in this file" — is the caller's validator's job. Both live in
    // core/settle.ts now, in one copy rather than three.
    const outcome = gate.settle(text, turns);
    if (outcome.kind === 'done') return outcome.result;

    // THE ONE GENUINELY PER-ENGINE LINE. Continue the SAME conversation —
    // history plus the error — mirroring loop.ts:214-222 so a retry costs the
    // same and looks the same. Mastra re-sends a string and LangGraph pushes a
    // HumanMessage; all three say the identical sentence, from one source.
    input = [...result.history, { role: 'user', content: outcome.instruction }];
  }
}
