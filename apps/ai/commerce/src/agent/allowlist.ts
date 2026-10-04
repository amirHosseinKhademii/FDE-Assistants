/**
 * THE WRITE-PATH GATE (Step 11) — held HERE, by the client, next to where the
 * prompt will live. Never read from the server.
 *
 * WHAT THE LIST IS. Every tool the model may be SHOWN — reads and the one
 * permitted write alike. Not a deny list, and not a list of "safe" tools the
 * server vouched for: a server's `readOnlyHint` is a claim by the thing being
 * guarded (PLAN.md §7), and `@fde/agent`'s `mcpTools` ignores annotations
 * entirely. A tool the server publishes and this list does not name is never
 * shown to the model. An EMPTY list shows nothing.
 *
 * `propose_resolution` IS A WRITE, AND IS ON THE LIST — PLAN.md §14 q4, answered
 * 2026-09-27: it writes a draft other people read, and moves no money. Spending
 * money is a strictly smaller set, `issue_refund`, and nothing in it is here.
 *
 * `search_policy` is listed before the server publishes it (Step 9). The adapter
 * never invents a tool the server does not publish, so naming it early is inert
 * until it exists — and means Step 9 needs no edit to the gate.
 *
 * Changing this list is changing what the model can do. `commerce:guard-check`
 * pins it; an addition should arrive with a reason in the same diff.
 */
export const ALLOWED_TOOLS = [
  'get_order',
  'get_delivery',
  'get_contact_history',
  'get_policy_rules',
  'search_policy',
  'propose_resolution',
] as const;

/** The tools on the list that change state. Exactly one, on purpose. */
export const ALLOWED_WRITES = ['propose_resolution'] as const;

/**
 * The server's outcome labels (apps/mcp/commerce/src/api/outcome.ts `CAUSES`),
 * split by owner — the split `@fde/agent` needs and cannot know, because the
 * words are the server's.
 *
 *   INFRASTRUCTURE  thrown by the adapter → the registry records `threw`
 *   DOMAIN          returned for the model to read and act on
 *
 * `commerce:guard-check` reads the causes the server PUBLISHES in its output
 * schema and fails on any that is in neither list: a new label the client has
 * not classified would otherwise be returned to the model as if it were an
 * answer — the fail-open direction.
 */
export const INFRASTRUCTURE_CAUSES = [
  'upstream_unavailable',
  'malformed_response',
  'threw',
  'unauthorized',
  'invalid_output',
] as const;

export const DOMAIN_CAUSES = ['out_of_scope', 'not_found', 'invalid_request'] as const;
