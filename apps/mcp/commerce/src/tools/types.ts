/**
 * What a Thornbury tool is, over and above what MCP requires.
 *
 * `run` returns an `Outcome`, never a raw value and never a throw; `render`
 * turns that into the prose the model reads. Keeping them apart is what lets
 * `register()` set `structuredContent` and `isError` from ONE place, so a tool
 * author cannot forget the half that carries the cause.
 */
import type { ZodObject } from 'zod';
import type { Outcome } from '../api/outcome';

export interface Tool<T = any> {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema: ZodObject<any>;
    annotations?: Record<string, boolean>;
  };
  run(args: Record<string, unknown>): Promise<Outcome<T>>;
  render(outcome: Outcome<T>): string;
}
