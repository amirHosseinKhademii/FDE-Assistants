/**
 * The third agent loop, on LangGraph.js. Same contract as `sdk/loop.ts` and
 * `mastra/loop.ts`.
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
 * `core/registry.ts` (the tools and their audit records), the caller's prompt
 * and Zod schema, `DEFAULT_MAX_TURNS`, and `core/settle.ts` — which decides when
 * a run is finished and owns the one copy of the retry sentence.
 *
 * THE REST OF THIS ENGINE, one job per file:
 *   `provider.ts`  which model object, on which cloud (LLM_PROVIDER)
 *   `tools.ts`     our registry in LangGraph's shape
 *   `turns.ts`     its accumulated messages rebuilt as TurnRecord[]
 *
 * ONE HONEST ASYMMETRY WITH THE OTHER TWO ENGINES: `createReactAgent`'s
 * `responseFormat` does not fold structuring into the same call the way the
 * Agents SDK's `outputType` or Mastra's `structuredOutput` do — LangGraph.js's
 * own docs say plainly it "will make a separate call to the LLM to generate
 * the structured response after the agent loop is finished." That is an extra
 * model call on every structured run, and it is the kind of engine difference
 * this comparison exists to surface, not to paper over.
 */
import type OpenAI from 'openai';
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { schemaGate } from '../core/settle';
import {
  DEFAULT_MAX_TURNS,
  type LoopOptions,
  type LoopResult,
  type TurnRecord,
} from '../core/loop.types';
import { selectChatModel } from './provider';
import { toLangGraphTools } from './tools';
import { turnsFrom } from './turns';

const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { GraphRecursionError } = require('@langchain/langgraph');
const { HumanMessage, AIMessage } = require('@langchain/core/messages');

export async function runLoopLangGraph<T = unknown>(
  _client: OpenAI, // accepted for signature parity; LangGraph builds its own model
  model: string,
  registry: ToolRegistry,
  prompt: string,
  opts: LoopOptions = {},
): Promise<LoopResult<T>> {
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;
  // Owns the retry budget, the running error list and the one copy of the retry
  // sentence — shared with the other two engines. `schemaErrors` is the same
  // array by reference. See core/settle.ts.
  const gate = schemaGate<T>(opts);
  const schemaErrors = gate.errors;

  const dispatched: ToolCallRecord[] = [];
  const agent = createReactAgent({
    llm: selectChatModel(model),
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
    // sdk/loop.ts and mastra/loop.ts both record.
    turns = [...turns, ...turnsFrom(allMessages, dispatched, turns.length, toolsAccountedFor)];
    toolsAccountedFor = dispatched.length;
    // AWAITED. See LoopOptions.onTurn: a callback whose promise is dropped cannot
    // throttle, and cannot be trusted to have persisted anything either.
    for (const t of turns) await opts.onTurn?.(t);

    const lastAi = [...allMessages].reverse().find((m) => m instanceof AIMessage);
    const text = result.structuredResponse
      ? JSON.stringify(result.structuredResponse)
      : typeof lastAi?.content === 'string' && lastAi.content
        ? lastAi.content
        : JSON.stringify(lastAi?.content ?? '');

    // The gate decides finished-or-retry, including the re-validation
    // `responseFormat` cannot do: its separate structuring call enforces SHAPE
    // and knows nothing about a schema's coherence rules. See core/settle.ts.
    const outcome = gate.settle(text, turns);
    if (outcome.kind === 'done') return outcome.result;

    // THE ONE GENUINELY PER-ENGINE LINE. Continue the SAME conversation: the
    // full accumulated history plus the error as a HumanMessage. The sentence
    // inside it is the one all three engines share.
    currentMessages = [...allMessages, new HumanMessage(outcome.instruction)];
  }
}
