/**
 * Our tool registry, in the shape LangGraph wants.
 *
 * LangGraph only decides WHEN to call them; the dispatch, the timing, the error
 * shaping and the `source: 'live' | 'fixture'` record all stay in
 * `core/registry.ts`, identically to the other two engines. That is what makes a
 * diff between engines mean something.
 */
import type { ToolRegistry } from '../core/registry';
import type { ToolCallRecord } from '../core/tool.types';
import { summariseResult } from '../core/summarise';
import type { LoopOptions } from '../core/loop.types';

const { tool } = require('@langchain/core/tools');

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
