/**
 * The third agent loop, on LangGraph.js. Same contract as `loop-sdk.ts` and
 * `loop-mastra.ts`.
 *
 * WHY A THIRD ENGINE AT ALL, AND WHY NOT FOR RELEASE. `docs/SWAP.md` (insurance
 * tree) already ruled against a third engine there: one lot, one decision, a
 * bounded walk — Agents SDK vs. Mastra already answers whether the loop is
 * replaceable for that shape, and LangGraph would be a redundant third way to
 * do the same solved job. Pharma's supplier-impact bottleneck (N2) is a
 * different shape: many rows, per-row state, a work list rather than a single
 * verdict — closer to what LangGraph is actually built for (checkpointed,
 * auditable per-step state, "a workflow where a lost run is expensive"). This
 * file exists to make that a real comparison rather than an assertion. See
 * `docs/pharma/BOTTLENECK-2.md` §"Reopening two closed decisions, on N2
 * specifically".
 *
 * WHAT IS DELIBERATELY SHARED, so a diff between engines means something:
 * `registry.ts` (the tools and their audit records), the caller's prompt and
 * Zod schema, `DEFAULT_MAX_TURNS`, and the re-validation after structuring.
 *
 * `require()`, not `import`, throughout — same reason as `loop-mastra.ts`:
 * `@langchain/langgraph`'s root export has no CJS condition (only `/prebuilt`
 * does), so it reaches us through Node 22's `require(esm)`. Using `require()`
 * uniformly for every LangChain import in this file avoids a mixed
 * import/require split that would work by accident.
 *
 * ONE HONEST ASYMMETRY WITH THE OTHER TWO ENGINES: `createReactAgent`'s
 * `responseFormat` does not fold structuring into the same call the way the
 * Agents SDK's `outputType` or Mastra's `structuredOutput` do — LangGraph.js's
 * own docs say plainly it "will make a separate call to the LLM to generate
 * the structured response after the agent loop is finished." That is an extra
 * model call on every structured run, and it is the kind of engine difference
 * this comparison exists to surface, not to paper over.
 *
 * PROVIDER CHOICE: `@langchain/openai`'s `ChatOpenAI`, pointed at the Foundry
 * `/openai/v1` surface via `configuration.baseURL` + a custom `fetch`, the same
 * shape `foundry/client.ts` and `loop-mastra.ts`'s `buildFoundryProvider` both
 * use — the client's own `apiKey` is a static string, so something has to set
 * the bearer header per request, and that is this file's `fetch` override.
 */
import type OpenAI from 'openai';
import { getBearerTokenProvider, DefaultAzureCredential } from '@azure/identity';
import { FOUNDRY_SCOPE, env } from '@fde/foundry';
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

const { ChatOpenAI } = require('@langchain/openai');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { GraphRecursionError } = require('@langchain/langgraph');
const { tool } = require('@langchain/core/tools');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');

/**
 * The bearer goes on per request through a custom fetch, exactly as in
 * `foundry/client.ts` and `loop-mastra.ts`. No API key exists anywhere in this
 * path — `apiKey` below is a required-but-unused string the client insists on.
 */
const token = getBearerTokenProvider(new DefaultAzureCredential(), FOUNDRY_SCOPE);

/**
 * Built here rather than inline so a compliance self-test can drive this exact
 * code path with a fake transport and a fake token — offline, no credential, no
 * spend. Same reasoning `loop-mastra.ts`'s `buildFoundryProvider` records: a
 * compliance check that tests a DIFFERENT construction than production uses is
 * a check that proves nothing.
 */
export function buildFoundryChatModel(
  model: string,
  overrides: { baseURL?: string; token?: () => Promise<string>; fetch?: typeof fetch } = {},
): any {
  const getToken = overrides.token ?? token;
  return new ChatOpenAI({
    model,
    apiKey: 'entra',
    configuration: {
      baseURL: overrides.baseURL ?? env.openaiEndpoint(),
      fetch: async (url: any, init: any = {}) => {
        const headers = new Headers(init.headers);
        headers.set('authorization', `Bearer ${await getToken()}`);
        return (overrides.fetch ?? fetch)(url, { ...init, headers });
      },
    },
  });
}

/**
 * Every tool still goes through OUR registry, so fixtures, timing, error
 * shaping and the `source: 'live' | 'fixture'` record are identical across all
 * three engines. LangGraph only decides WHEN to call them.
 */
export function toLangGraphTools(registry: ToolRegistry, dispatched: ToolCallRecord[], opts: LoopOptions): any[] {
  return registry.schemas().map((s) =>
    tool(
      async (args: unknown) => {
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
        // Same contract as the other two engines: a failed tool comes back as
        // readable JSON the model can recover from, never a thrown exception.
        return JSON.stringify(rec.ok ? rec.result : { error: rec.error });
      },
      {
        name: s.name,
        description: s.description,
        schema: s.parameters,
      },
    ),
  );
}

/**
 * Rebuild `TurnRecord[]` from LangGraph's accumulated message list.
 *
 * One `AIMessage` is one model round-trip, matching what `loop-sdk.ts` and
 * `loop-mastra.ts` call a turn — so turn counts and token counts stay
 * comparable across all three engines. `allMessages` is the FULL conversation
 * on every call (LangGraph returns accumulated state, not a delta), so this
 * only processes the AI messages past `turnOffset` — the same slicing trick
 * the other two loops use to avoid re-counting a schema retry's earlier turns.
 */
function turnsFrom(
  allMessages: any[],
  dispatched: ToolCallRecord[],
  turnOffset: number,
  toolOffset: number,
): TurnRecord[] {
  const aiMessages = allMessages.filter((m) => m instanceof AIMessage);
  const newAi = aiMessages.slice(turnOffset);
  const turns: TurnRecord[] = [];
  let taken = toolOffset;
  newAi.forEach((m: any, i: number) => {
    const wanted = (m.tool_calls ?? []).length;
    const calls = dispatched.slice(taken, taken + wanted);
    taken += wanted;
    const usage = m.usage_metadata ?? {};
    turns.push({
      turn: turnOffset + i + 1,
      // LangGraph does not time individual round-trips either — same choice
      // the other two engines make. Wall clock is the caller's.
      ms: 0,
      inputTokens: usage.input_tokens ?? 0,
      // `cache_read`, NOT `cache_creation`. LangChain splits the two: a READ is
      // a hit, billed at the discounted rate; a CREATION is a miss that seeded
      // the cache, and on some providers it is billed at a PREMIUM rather than
      // a discount. Summing them would apply a discount to tokens that may have
      // cost extra — wrong in the flattering direction. Azure OpenAI charges no
      // cache-creation premium today; reading only `cache_read` stays correct
      // if that ever stops being true, or if this engine meets another provider.
      cachedInputTokens: usage.input_token_details?.cache_read ?? undefined,
      outputTokens: usage.output_tokens ?? 0,
      toolCalls: calls,
      text: typeof m.content === 'string' && m.content ? m.content : undefined,
    });
  });
  return turns;
}

export async function runLoopLangGraph<T = unknown>(
  _client: OpenAI, // accepted for signature parity; LangGraph builds its own model
  model: string,
  registry: ToolRegistry,
  prompt: string,
  opts: LoopOptions = {},
): Promise<LoopResult<T>> {
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  const schemaErrors: string[] = [];
  let retriesLeft = opts.structuredRetries ?? 1;

  const dispatched: ToolCallRecord[] = [];
  const validate =
    opts.validate ??
    // NO DOMAIN DEFAULT, and asking for a schema without a validator is a
    // mistake rather than a shortcut — see loop-sdk.ts / loop-mastra.ts.
    (() => {
      if (opts.responseFormat) {
        throw new Error(
          'responseFormat was set without a validate function. @fde/agent ships no ' +
            'default validator — the answer contract is yours. Pass one (see @fde/schema).',
        );
      }
      return (raw: string): ValidationResult => ({ ok: true, value: raw as unknown });
    })();

  const agent = createReactAgent({
    llm: buildFoundryChatModel(model),
    tools: toLangGraphTools(registry, dispatched, opts),
    name: opts.agentName ?? 'agent',
    ...(opts.system ? { prompt: opts.system } : {}),
    ...(opts.responseFormat ? { responseFormat: opts.responseFormat } : {}),
  });

  let currentMessages: any[] = [new HumanMessage(prompt)];
  let turns: TurnRecord[] = [];
  let toolsAccountedFor = 0;

  for (;;) {
    let result: any;
    try {
      // Each turn is (agent node -> tools node), so a recursion limit of
      // maxTurns * 2 gives the graph roughly maxTurns model round-trips before
      // LangGraph's own cap fires — matching what the SDK/Mastra paths call
      // max_turns. The +1 covers the final structuring call when responseFormat
      // is set, which is not itself a "turn" in the TurnRecord sense.
      result = await agent.invoke({ messages: currentMessages }, { recursionLimit: maxTurns * 2 + 1 });
    } catch (e) {
      // A turn-cap stop must look the same on all three engines, because the
      // eval scorecard treats it as infrastructure rather than a wrong answer.
      if (e instanceof GraphRecursionError) {
        return { text: '', turns, stoppedBecause: 'max_turns', schemaErrors };
      }
      throw e;
    }

    const allMessages: any[] = result.messages ?? [];
    // ACCUMULATE across a schema retry, never overwrite — same trap
    // loop-sdk.ts and loop-mastra.ts both record.
    turns = [...turns, ...turnsFrom(allMessages, dispatched, turns.length, toolsAccountedFor)];
    toolsAccountedFor = dispatched.length;
    for (const t of turns) opts.onTurn?.(t);

    const lastAi = [...allMessages].reverse().find((m) => m instanceof AIMessage);
    const text = result.structuredResponse
      ? JSON.stringify(result.structuredResponse)
      : typeof lastAi?.content === 'string' && lastAi.content
        ? lastAi.content
        : JSON.stringify(lastAi?.content ?? '');

    if (!opts.responseFormat) {
      return { text, turns, stoppedBecause: 'model_finished', schemaErrors };
    }

    // WHY RE-VALIDATE WHAT LANGGRAPH ALREADY VALIDATED. `responseFormat`
    // enforces SHAPE via its own separate structuring call — it knows nothing
    // about a schema's coherence rules (e.g. an unresolved conflict/blocker
    // with no escalation), which is where the model can look fully compliant
    // and still be silently wrong. Same reasoning as the other two engines.
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
      // Fail loudly. Silent repair hides the failure rate, and the failure
      // rate is a number you need.
      return { text, turns, stoppedBecause: 'schema_invalid', schemaErrors };
    }
    retriesLeft--;

    // Continue the SAME conversation: the full accumulated history plus the
    // error, mirroring how the other two engines retry.
    currentMessages = [
      ...allMessages,
      new HumanMessage(
        `Your previous response did not satisfy the required schema: ${validated.errors}. Reply again with valid JSON only.`,
      ),
    ];
  }
}
