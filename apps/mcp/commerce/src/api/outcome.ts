/**
 * THE OUTCOME ENVELOPE — and why the MCP server has to re-state it.
 *
 * The NestJS API returns `{ ok: true, data }` or `{ ok: false, cause, detail }`.
 * That shape is not decoration: it is the only thing that survives the wire.
 *
 * MEASURED 2026-09-18 (`pnpm commerce:mcp-check`): over MCP, a domain refusal,
 * a thrown implementation and a schema violation ALL arrive as `isError: true`
 * with a text block. Three owners, one shape. The protocol erases the
 * distinction `ToolCallRecord.cause` exists to preserve, and nothing announces
 * the loss.
 *
 * So the cause cannot be recovered downstream and must be CARRIED. Every tool
 * here returns `structuredContent` with an explicit outcome, and the loop reads
 * that rather than guessing from prose.
 */

/** Why a call did not produce data. Matches the API's vocabulary exactly. */
export type Cause =
  | 'out_of_scope'
  | 'not_found'
  | 'invalid_request'
  | 'upstream_unavailable'
  /** The tool itself raised. Ours, not the API's — see `guarded()`. */
  | 'threw';

export type Outcome<T> = { ok: true; data: T } | { ok: false; cause: Cause; detail: string };

export const ok = <T>(data: T): Outcome<T> => ({ ok: true, data });
export const fail = <T>(cause: Cause, detail: string): Outcome<T> => ({ ok: false, cause, detail });

/**
 * Run a tool body and turn any escaping exception into a labelled outcome.
 *
 * WHY EVERY TOOL NEEDS THIS AND registry.ts DID NOT. In-process, the registry
 * caught for everyone — one `try` around `dispatch` and a throw was structurally
 * distinguishable from a return. Over MCP the SDK catches first and flattens
 * the result to `isError: true`, so by the time anything of ours runs again the
 * distinction is gone.
 *
 * **A throw cannot label itself.** If a handler raises, the SDK converts it and
 * our code never reaches a line where `structuredContent` could be set. So the
 * catching moves into each handler, and an exception that still escapes after
 * this means the plumbing genuinely broke — which restores `threw` as a signal
 * that means something.
 */
export async function guarded<T>(body: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await body();
  } catch (e) {
    return fail('threw', e instanceof Error ? e.message : String(e));
  }
}
