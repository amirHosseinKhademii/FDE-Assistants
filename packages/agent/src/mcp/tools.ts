/**
 * MCP tools → this repo's `Tool` shape (Step 10), and the write-path gate (Step 11).
 *
 * THE SAME JOB AS `sdk/tools.ts` AND `mastra/tools.ts`, IN THE OTHER DIRECTION.
 * Those turn a registry tool into an engine's representation; this turns a tool
 * another PROCESS publishes into a registry tool. So it sits beside them, and it
 * is a module, not a package: this repo extracts a package after a second
 * consumer exists, never before.
 *
 * IT TAKES A CLIENT BY SHAPE, NOT BY CLASS. `McpToolClient` is the two methods
 * this needs. The real `@modelcontextprotocol/client` `Client` satisfies it; so
 * does a thirty-line fake, which is how every gate below is tested offline — and
 * it means this package takes no dependency on an SDK it only needs the shape of.
 *
 * ── THE GATE: AN ALLOWLIST OF NAMES, AND NOTHING THE SERVER SAYS ────────────
 *
 * `allow` is the complete list of tools the model may be shown. It is held by
 * the CLIENT, next to the prompt, never read from the server. Annotations
 * (`readOnlyHint` and friends) are claims made by the thing being guarded, and
 * the SDK's own comment says never to decide on them. So:
 *
 *   a tool not on the list          is never shown to the model, whatever its
 *                                   annotations say or however it was renamed
 *   an EMPTY list                   shows NOTHING — every write refused, not every
 *                                   write allowed. The fail-open shape @fde/guard
 *                                   exists to name, closed by construction
 *   a name on the list the server   is not invented — the tool is simply absent
 *   does not publish
 *
 * ── FAILURES: THE EXISTING TWO CAUSES, DELIBERATELY ─────────────────────────
 *
 * `ToolCallRecord.cause` knows `unknown_tool` and `threw`, and two eval runners
 * read `cause === 'threw'`. Widening the union is PLAN-level work with a blast
 * radius (commerce PLAN §6.1). This adapter maps INTO the two, so nothing that
 * reads them changes:
 *
 *   the server's own label is infrastructure     → THROW   → recorded `threw`,
 *     (the transfer, a contract break, our code)            the label in the message
 *   the server's label is a domain answer        → RETURN  → the model reads it
 *     (not in scope, not found, bad request)                 and can act on it
 *   the call itself rejects (transport closed,   → THROW   → `threw`
 *     or -32602 for a tool that IS listed: a
 *     server whose output broke its own schema)
 *   the model names a tool that is not exposed   → the registry's own
 *                                                  `unknown_tool`
 *
 * The labels are the server's (`structuredContent.cause`); the split between
 * them is passed in by the caller, because which labels mean "infrastructure"
 * is the server's vocabulary and not this package's.
 */
import { z, type ZodObject } from 'zod';
import type { Tool } from '../core/tool.types';

/** The two methods this needs from an MCP client — satisfied by the SDK's `Client`. */
export interface McpToolClient {
  listTools(): Promise<{ tools: Array<{ name: string; description?: string; inputSchema: unknown }> }>;
  callTool(req: { name: string; arguments: Record<string, unknown> }): Promise<{
    content?: unknown;
    structuredContent?: unknown;
    isError?: boolean;
  }>;
}

export interface McpToolsOptions {
  /** Every tool the model may be shown. Held by the client. Empty shows nothing. */
  allow: readonly string[];
  /**
   * The server's outcome labels that mean INFRASTRUCTURE failed — thrown, so the
   * registry records `threw`. Any other label is returned for the model to read.
   */
  infrastructureCauses: readonly string[];
}

export interface McpToolsResult {
  tools: Tool[];
  /** What the server published and the allowlist kept out — for a log line, and for checks. */
  withheld: string[];
}

/** The prose a tool returned — what the model reads. */
function textOf(content: unknown): string {
  return ((content ?? []) as Array<{ type?: string; text?: string }>)
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
}

/** A published JSON Schema, as the Zod object every engine here consumes. */
function parametersOf(inputSchema: unknown): ZodObject<any> {
  const converted = z.fromJSONSchema(inputSchema as Parameters<typeof z.fromJSONSchema>[0]);
  if (!(converted instanceof z.ZodObject)) {
    throw new Error('an MCP tool published a non-object input schema; this adapter only exposes object-shaped arguments');
  }
  return converted as ZodObject<any>;
}

/**
 * List FIRST, then wrap. Listing is also what switches the SDK client's own
 * output-schema check on (measured, commerce MCP-STEPS Step 5), so a caller that
 * skips this function and calls tools directly loses that check silently.
 */
export async function mcpTools(client: McpToolClient, opts: McpToolsOptions): Promise<McpToolsResult> {
  const allow = new Set(opts.allow);
  const infra = new Set(opts.infrastructureCauses);
  const { tools: published } = await client.listTools();

  const kept = published.filter((t) => allow.has(t.name));
  const withheld = published.filter((t) => !allow.has(t.name)).map((t) => t.name);

  const tools: Tool[] = kept.map((t) => ({
    schema: {
      type: 'function',
      name: t.name,
      description: t.description ?? '',
      parameters: parametersOf(t.inputSchema),
    },
    hasUpstream: true,
    async execute(args: unknown) {
      // A rejection here — transport closed, or -32602 for a LISTED name (a
      // server whose output broke its own schema) — propagates, and the
      // registry records it as `threw`. Neither is the model's doing.
      const r = await client.callTool({ name: t.name, arguments: (args ?? {}) as Record<string, unknown> });
      const outcome = r.structuredContent as { ok?: boolean; cause?: string; detail?: string } | undefined;
      const text = textOf(r.content);

      if (outcome?.ok === false && outcome.cause && infra.has(outcome.cause)) {
        throw new Error(`[${outcome.cause}] ${outcome.detail ?? text}`);
      }
      if (r.isError && !outcome) {
        // An error with no label — the SDK's own "Input validation error: …" on
        // bad arguments is the known one. The model can read and correct it.
        return { ok: false, error: text };
      }
      return outcome?.ok === false
        ? { ok: false, cause: outcome.cause, detail: outcome.detail, text }
        : { ok: true, text, data: (outcome as { data?: unknown } | undefined)?.data };
    },
  }));

  return { tools, withheld };
}
