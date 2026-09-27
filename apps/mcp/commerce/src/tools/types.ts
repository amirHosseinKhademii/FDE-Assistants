/**
 * What a Thornbury tool is, over and above what MCP requires.
 *
 * `run` returns an `Outcome`, never a raw value and never a throw; `render`
 * turns that into the prose the model reads. Keeping them apart is what lets
 * `register()` set `structuredContent` and `isError` from ONE place, so a tool
 * author cannot forget the half that carries the cause.
 *
 * `data` is REQUIRED, since Step 5, for the same reason: it is what the tool
 * promises to return on success. `register()` wraps it in the outcome envelope,
 * publishes that as the tool's `outputSchema`, and checks every result against
 * it before the SDK sees one. Optional would mean the first tool that forgot it
 * shipped untyped, and nothing would say so.
 */
import type { ZodObject, ZodType } from 'zod';
import type { Outcome } from '../api/outcome';

export interface Tool<T = any> {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema: ZodObject<any>;
    annotations?: Record<string, boolean>;
  };
  /** The success payload's shape — the `data` in `{ ok: true, data }`. */
  data: ZodType<T>;
  run(args: Record<string, unknown>): Promise<Outcome<T>>;
  render(outcome: Outcome<T>): string;
}
