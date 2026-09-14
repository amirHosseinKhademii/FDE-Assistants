import type { ZodObject } from 'zod';

/**
 * A tool is three things kept together on purpose:
 *   schema   — the JSON the model sees
 *   execute  — what actually runs
 *   hasUpstream — whether it calls something external and must be fixture-backed
 *
 * Keeping the schema next to the implementation is how you avoid the classic
 * bug where a description drifts from behaviour and the model misuses the tool
 * in a way no type checker can catch.
 */
export interface ToolSchema {
  type: 'function';
  name: string;
  description: string;
  /**
   * A Zod object. The Agents SDK consumes this directly, so there is no
   * hand-written JSON Schema and no cast between here and the wire.
   *
   * Use `.describe()` on every field. A tool parameter's description is the
   * only thing telling the model what to put there, and a vague one produces a
   * tool that gets called with the wrong arguments — a failure that looks like
   * a model problem and is a documentation problem.
   */
  parameters: ZodObject<any>;
}

export interface Tool<TArgs = any, TResult = any> {
  schema: ToolSchema;
  /** True when the tool calls something external and must be fixture-backed. */
  hasUpstream: boolean;
  execute(args: TArgs): Promise<TResult>;
}

/**
 * What the loop records for every call. Feeds the request log and the evals.
 *
 * In a claims context this record is the audit trail: months later, an
 * adjuster's supervisor or a state regulator gets shown exactly which tool ran,
 * with which arguments, and what came back — and that is what justifies the
 * determination. See FDE.md Pillar 2.
 */
export interface ToolCallRecord {
  name: string;
  args: unknown;
  ok: boolean;
  result?: unknown;
  error?: string;
  ms: number;
  source: 'live' | 'fixture';

  /**
   * WHY it failed — set only when `ok` is false. Present because "a tool call
   * failed" is two completely different events wearing one boolean:
   *
   *   unknown_tool  the model asked for a tool that does not exist. A MODEL
   *                 failure. It invented a capability, and the run is evidence
   *                 about the model's judgment.
   *   threw         the tool itself raised — a bad path, a dead socket, an
   *                 expired credential. INFRASTRUCTURE. The model is handed an
   *                 error string and refusing is the correct response; scoring
   *                 that refusal against the model points every debugging hour
   *                 at the prompt.
   *
   * The tools in this repo return informative misses rather than throwing on
   * bad input — see `get-policyholder.tool.ts`, which answers an unknown id
   * with a structured "not found" — so a throw really does mean the plumbing.
   * If you write a tool that throws on a model-supplied argument, that line
   * moves and this field has to move with it.
   */
  cause?: 'unknown_tool' | 'threw';
}
