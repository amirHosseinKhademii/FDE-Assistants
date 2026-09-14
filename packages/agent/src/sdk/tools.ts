/**
 * Our tool registry, in the shape the Agents SDK wants.
 *
 * Every tool keeps going through OUR registry, so fixtures, timing, error
 * shaping and the `source: 'live' | 'fixture'` record are unchanged. The SDK
 * only decides WHEN to call them — the same division `mastra/tools.ts` and
 * `langgraph/tools.ts` both keep, which is what makes an engine diff mean
 * something.
 *
 * Lifted out of `runLoopSdk`, where it was inline while the other two engines
 * already had a named function. Three engines that each do this differently in
 * a different place is three times the reading for one idea.
 */
import { tool } from '@openai/agents';
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { summariseResult } from '../core/summarise';
import type { LoopOptions } from '../core/loop.types';

export function toSdkTools(registry: ToolRegistry, dispatched: ToolCallRecord[], opts: LoopOptions): any[] {
  return registry.schemas().map((s) =>
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
}
