/**
 * The tool registry. The loop asks it for schemas to send to the model, then
 * asks it to dispatch whatever the model calls back with.
 *
 * Everything the model can trigger passes through `dispatch`, so this is the
 * single place to enforce timing, error shaping and logging. A tool that throws
 * must return a result the MODEL can read and recover from — an exception that
 * escapes here becomes a 500 and the conversation dies mid-claim.
 */
import type { Tool, ToolCallRecord, ToolSchema } from './tool.types';
import { lastSource } from './fixtures';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: Tool[] = []) {
    for (const t of tools) this.tools.set(t.schema.name, t);
  }

  schemas(): ToolSchema[] {
    return [...this.tools.values()].map((t) => t.schema);
  }

  async dispatch(name: string, args: unknown): Promise<ToolCallRecord> {
    const started = Date.now();
    const tool = this.tools.get(name);

    if (!tool) {
      // The model invented a tool. Tell it so, rather than crashing.
      return {
        name,
        args,
        ok: false,
        cause: 'unknown_tool',
        ms: Date.now() - started,
        source: 'live',
        error: `No tool named "${name}". Available: ${[...this.tools.keys()].join(', ')}`,
      };
    }

    try {
      const result = await tool.execute(args);
      return {
        name,
        args,
        ok: true,
        result,
        ms: Date.now() - started,
        // 'fixture' only when the tool was wrapped and actually replayed. A run
        // that thought it was replaying and quietly went live is a number you
        // cannot trust, so this is recorded rather than assumed.
        source: lastSource.get(name) ?? 'live',
      };
    } catch (e) {
      return {
        name,
        args,
        ok: false,
        cause: 'threw',
        ms: Date.now() - started,
        source: 'live',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
