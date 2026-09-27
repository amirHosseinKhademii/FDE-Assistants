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
import { z, type ZodType } from 'zod';

/**
 * Why a call did not produce data.
 *
 * The first four are the API's own vocabulary; every one after them is OURS,
 * and each says why it exists. A RUNTIME LIST, not only a type, since Step 5:
 * the output schema every tool publishes names these values, and a type alone
 * cannot be published.
 */
export const CAUSES = [
  'out_of_scope',
  'not_found',
  'invalid_request',
  'upstream_unavailable',
  /**
   * Our credential was missing or refused. OURS, not the API's vocabulary: the
   * API says this with an HTTP 401 and a bare `{error, reason}`, never with the
   * envelope, and an unset token is refused here before any request leaves.
   *
   * ADDED IN STEP 6, because both cases were being filed under someone else's
   * name. A wrong token read as `upstream_unavailable` ("check the network"),
   * and an unset one as `invalid_request` — the API's word for a request that
   * broke its contract, which becomes the MODEL's kind of mistake as soon as a
   * tool takes arguments. Either is right about "it failed" and wrong about
   * where to look, and the second would blame the model for our `.env`.
   */
  'unauthorized',
  /**
   * The API answered, completely, and not in the contract: `ok: true` with a
   * payload that does not parse, a body that is not JSON, or a status that
   * carries no envelope. OURS, not the API's vocabulary — a contract violation
   * is neither the API refusing nor the plumbing failing, and calling it either
   * would hide it.
   *
   * ADDED AFTER STEP 4b, WHICH IS THE REASON IT EXISTS. Pointing the tool at
   * the live API returned `ok: true`, `isError: false`, and an order whose id,
   * status, total and every line quantity rendered as `undefined`. Nothing
   * failed. The envelope said success and the type said `Order` — because
   * `getJson<Order>` was a CAST, and a cast is a hope the compiler is obliged
   * to believe. See `schemas.ts`. Step 6 widened it from "the payload" to "the
   * response": an HTML error page and Nest's own 404 were landing as `threw`
   * and `upstream_unavailable` respectively.
   */
  'malformed_response',
  /**
   * The tool's OWN code raised. Ours, not the API's — see `guarded()`.
   *
   * Since Step 6 this means exactly that. A refused connection, a timeout and a
   * response cut off mid-body all used to arrive here, because `fetch()` and
   * `res.json()` throw and `guarded()` caught them — so a process that was not
   * running read as a bug in this package. `getJson` now catches the transfer
   * itself and labels it `upstream_unavailable`, which leaves `threw` meaning
   * what it says.
   */
  'threw',
  /**
   * The tool's OWN code returned a success that breaks its own declared output
   * schema. Ours, and specifically this package's: the payload already passed
   * the inbound parse in `getJson`, so the fault is in what the tool did with it.
   *
   * ADDED IN STEP 5, because the SDK's own check erases the cause. MEASURED:
   * an `McpServer` that validates a bad success against `outputSchema` replaces
   * the WHOLE result with `isError: true` and the text "Output validation
   * error: …" — no `structuredContent` at all. So `register()` checks first and
   * returns this, labelled. Not `threw` (nothing raised — Step 6 made that word
   * mean exactly that) and not `malformed_response` (that is the API's contract
   * breaking; this is ours).
   */
  'invalid_output',
] as const;

export type Cause = (typeof CAUSES)[number];

export type Outcome<T> = { ok: true; data: T } | { ok: false; cause: Cause; detail: string };

/**
 * The published shape of `structuredContent` for a tool whose data is `data`:
 * BOTH halves of the envelope, not just the success.
 *
 * WHY BOTH. The SDK validates only non-error results, so a success-only schema
 * would pass every check and still leave half of what the tool actually returns
 * undeclared — and the failure half is the one that carries the cause.
 *
 * WHY THIS IS SAFE, AND WHY IT IS PINNED RATHER THAN ASSUMED. On the 2025
 * protocol era the SDK re-nests `structuredContent` under `{result: …}` whenever
 * the advertised schema's root is not `type: "object"` — which would move `ok`
 * and `cause` out from under every reader. A union LOOKS like a non-object root.
 * MEASURED 2026-09-27: `@modelcontextprotocol/server` 2.0.0 publishes this one
 * as `{type: "object", oneOf: [...]}` and nothing is re-nested.
 * `probeOutputSchemaIsObjectRooted` asserts both, because that is a property of
 * one SDK version and not a promise.
 */
export function outcomeSchema<T>(data: ZodType<T>) {
  return z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), cause: z.enum(CAUSES), detail: z.string() }),
  ]);
}

/**
 * The outcome if it matches the shape the tool declared, or `invalid_output`
 * naming the fields if it does not. `register()` calls this on every result,
 * BEFORE the SDK sees it, so the SDK's own check becomes a backstop our tools
 * can never reach — and cannot erase a cause it never gets to see.
 */
export function conforming<T>(tool: string, outcome: Outcome<T>, schema: ZodType): Outcome<T> {
  const parsed = schema.safeParse(outcome);
  if (parsed.success) return outcome;
  const issues = parsed.error.issues
    .slice(0, 4)
    .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
    .join('; ');
  return fail('invalid_output', `${tool} returned a result that breaks its own declared output schema — ${issues}`);
}

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
