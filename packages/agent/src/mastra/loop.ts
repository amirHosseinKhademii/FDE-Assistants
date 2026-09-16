/**
 * The second agent loop, on Mastra. Same contract as `sdk/loop.ts`.
 *
 * WHY TWO LOOPS AT ALL. `loop.types.ts` has always claimed the engine is
 * replaceable — `ask.ts`, `eval/run.ts` and every check depend on `LoopOptions`
 * and `LoopResult` and on nothing about how the loop is driven. That claim was
 * true once, when the hand-rolled loop was swapped for the Agents SDK, and then
 * untested for months. A second live implementation keeps it honest, and gives
 * the eval suite something to compare an engine against rather than a prompt.
 *
 * WHAT IS DELIBERATELY SHARED, so a diff between engines means something:
 * `core/registry.ts` (the tools and their audit records), the caller's prompt
 * and Zod schema, `DEFAULT_MAX_TURNS`, and `core/settle.ts` — which decides when
 * a run is finished and owns the one copy of the retry sentence. If any of those
 * had to change per engine, the contract was not one.
 *
 * THE REST OF THIS ENGINE, one job per file:
 *   `provider.ts`  which model object, on which cloud (LLM_PROVIDER)
 *   `tools.ts`     our registry in Mastra's shape
 *   `turns.ts`     its reply rebuilt as TurnRecord[]
 *
 * `structuredOutput: { schema }` below is the current option.
 * `experimental_output` belongs to the legacy options type, which is where
 * Mastra's own "does not work with tools" comment lives — misleading if read in
 * isolation.
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
import { selectModel } from './provider';
import { toMastraTools } from './tools';
import { turnsFrom, sumToolCalls } from './turns';

// require(), not import: @mastra/core is dual-published, but `ai` underneath it
// is ESM-only and reaches us through Node 22's require(esm).
const { Agent } = require('@mastra/core/agent');

/**
 * ON A LOCAL SERVER, A STRICT `json_schema` SILENTLY TURNS THE TOOLS OFF.
 *
 * MEASURED 2026-09-16 against Ollama 0.34.1 / qwen2.5:7b, three requests that
 * differ only in what was sent:
 *
 *   tools, no response_format   → finish_reason=tool_calls,
 *                                 search_policy({"query":"rental car …"})
 *   response_format, no tools   → an answer object, invented
 *   BOTH — what this loop sends → tool_calls NONE, and the content reads
 *                                 "To determine the daily rental car
 *                                  reimbursement for AUT-4471, I need to
 *                                  search the policy corpus…"
 *
 * Read that third line again: the model is SAYING it needs to search while the
 * grammar forces it to emit an answer object instead. llama.cpp constrains
 * generation token by token to the schema, and a tool call is not a string the
 * schema can produce — so the call can never be emitted. Nothing errors.
 *
 * WHAT IT COSTS IF LEFT ALONE: `turns=1 toolCalls=0` and a schema-VALID answer
 * citing `policy:CA 00 02 10 15#2.2.1`, a form that was never retrieved and a
 * quote nobody wrote. Every gate green, the answer fabricated. On Azure the
 * same code calls 2–3 tools across 3–4 turns in 146 logged runs, so this is the
 * server, not the loop and not the model.
 *
 * THE FIX IS MASTRA'S OWN SECOND PASS. Give `structuredOutput` a `model` and it
 * runs a separate structuring agent: the main loop generates with tools and NO
 * grammar, then one more call shapes the result. Two calls instead of one,
 * which is why it is not the default.
 *
 * SCOPED TO `local` DELIBERATELY. Azure serves tools and a strict schema in the
 * same request — that is the path with a committed eval baseline behind it, and
 * a second pass there would change every measured number to fix a problem that
 * only exists somewhere else.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- exported for the
// guard assertion in `provider-switch-selftest.ts`, which pins the AZURE branch
// to `{}` so the committed baseline stays comparable.
export function structuringPass(model: string): { model?: any } {
  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();
  return raw === 'local' ? { model: selectModel(model) } : {};
}

/**
 * The same function under a name that says what it is for. `provider-switch-
 * selftest.ts` asserts the AZURE branch returns `{}` — the guard that keeps the
 * committed baseline comparable — and an unexported one could not be reached.
 */
export const structuringPassForTest = structuringPass;

export async function runLoopMastra<T = unknown>(
  _client: OpenAI, // accepted for signature parity; Mastra builds its own provider
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
  const agent = new Agent({
    name: opts.agentName ?? 'agent',
    instructions: opts.system ?? '',
    model: selectModel(model),
    tools: toMastraTools(registry, dispatched, opts),
  });

  let input: any = prompt;
  let turns: TurnRecord[] = [];

  for (;;) {
    let res: any;
    try {
      res = await agent.generate(input, {
        maxSteps: maxTurns,
        ...(opts.responseFormat
          ? { structuredOutput: { schema: opts.responseFormat, ...structuringPass(model) } }
          : {}),
      });
    } catch (e: any) {
      // A turn-cap stop must look the same on both engines, because the eval
      // scorecard treats it as infrastructure rather than a wrong answer.
      if (/max.?steps/i.test(String(e?.message))) {
        return { text: '', turns, stoppedBecause: 'max_turns', schemaErrors };
      }
      throw e;
    }

    // ACCUMULATE across a schema retry, never overwrite: a retry's steps
    // describe only the retry, so assigning would erase the first attempt's
    // tool calls from the audit trail. loop-sdk.ts records the same trap.
    turns = [...turns, ...turnsFrom(res.steps ?? [], dispatched.slice(sumToolCalls(turns)))];
    for (const t of turns) opts.onTurn?.(t);

    const text =
      typeof res.text === 'string' && res.text
        ? res.text
        : JSON.stringify(res.object ?? '');

    // The gate decides finished-or-retry, including the re-validation Mastra's
    // own `structuredOutput` cannot do: it enforces SHAPE and knows nothing
    // about a schema's coherence rules. See core/settle.ts.
    const outcome = gate.settle(text, turns);
    if (outcome.kind === 'done') return outcome.result;

    // THE ONE GENUINELY PER-ENGINE LINE, and Mastra's is the odd one: there is
    // no history object to append to, so `generate()` is handed the whole
    // conversation again as a string — hence the prompt is repeated in front of
    // the instruction. The instruction itself is the same sentence all three
    // engines send.
    input = `${prompt}\n\n${outcome.instruction}`;
  }
}
