/**
 * Our tool registry, in the shape Mastra wants.
 *
 * ONE THING THIS FILE HAD TO GET RIGHT, found by spike rather than docs (see
 * NEXT.md A1): `execute` is `(inputData, context)` — args FIRST and positional.
 * The `({ context })` shape from older Mastra silently yields undefined args,
 * and the model then loops retrying against garbage. It reads like a model
 * failure and is an API-version failure.
 */
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { summariseResult } from '../core/summarise';
import type { LoopOptions } from '../core/loop.types';

const { createTool } = require('@mastra/core/tools');

/**
 * Every tool still goes through OUR registry, so fixtures, timing, error
 * shaping and the `source: 'live' | 'fixture'` record are identical on both
 * engines. Mastra only decides WHEN to call them.
 */
export function toMastraTools(registry: ToolRegistry, dispatched: ToolCallRecord[], opts: LoopOptions) {
  const out: Record<string, unknown> = {};
  for (const s of registry.schemas()) {
    out[s.name] = createTool({
      id: s.name,
      description: s.description,
      inputSchema: s.parameters, // the same Zod object the SDK path uses
      execute: async (input: any) => {
        opts.onEvent?.({ type: 'tool_call', turn: 0, name: s.name, args: input });
        const rec = await registry.dispatch(s.name, input);
        dispatched.push(rec);
        opts.onEvent?.({
          type: 'tool_result',
          turn: 0,
          name: rec.name,
          ok: rec.ok,
          ms: rec.ms,
          summary: rec.ok ? summariseResult(rec.result, opts.summariseResult) : (rec.error ?? 'failed'),
        });
        // Same contract as the SDK path: a failed tool returns readable JSON the
        // model can recover from, never a thrown exception.
        return rec.ok ? rec.result : { error: rec.error };
      },
    });
  }
  return out;
}
