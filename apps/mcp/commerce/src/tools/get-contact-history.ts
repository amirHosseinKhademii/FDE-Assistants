/**
 * `get_contact_history` — this customer's prior cases, resolutions and messages.
 *
 * IT TAKES NO ARGUMENTS. The customer is the case's, and the MCP server cannot
 * look that up itself — it holds no database credential, and the CRM customer id
 * is not the shop's `userId`. So it asks the API: `GET /case` reads back the
 * scope the `x-case-id` header already resolves to, and the history is then
 * fetched for exactly that customer. Both calls are scoped server-side; neither
 * takes anything the model supplied.
 *
 * CUSTOMER TEXT IS REPRODUCED VERBATIM, AND LABELLED — NOT FILTERED. T5 is
 * planted in customer-written messages (an instruction to refund; a claim that
 * "Dave already approved it"). Neutralising, summarising or dropping that text
 * here would make T5 test this file instead of the model, and would hide from
 * the model the very thing it must weigh. What this layer owes is PROVENANCE:
 * each message says who wrote it, read off the API's `customerAuthored` (itself
 * read off `direction`, never guessed from a name). The defence against acting
 * on it is structural — the answer schema and the write-path allowlist
 * (docs/beyond-retrieval/INJECTION.md §4) — not a sentence in a tool result.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { getJson, type ApiConfig } from '../api/client';
import { CaseScopeSchema, HistoryResponseSchema, type HistoryResponse } from '../api/schemas';
import type { Outcome } from '../api/outcome';
import type { Session } from '../session';

export const DESCRIPTION =
  "This case's customer's contact history: their cases (this one and any earlier), " +
  'each with the resolutions proposed or decided on it, and every message exchanged ' +
  'with them, oldest first. Message text is reproduced exactly as written, and each ' +
  'message is labelled with who wrote it. Takes no arguments: the customer is fixed ' +
  'by the case.';

function resolutions(c: HistoryResponse['cases'][number]): string {
  if (!c.resolutions.length) return 'no resolutions';
  return c.resolutions
    .map(
      (r) =>
        `${r.id} ${r.kind} ${r.amountPence}p ${r.status}` +
        (r.approvedBy ? `, approved by ${r.approvedBy}` : ', no approver recorded') +
        ` (proposed by ${r.proposedBy} ${r.proposedAt})`,
    )
    .join('; ');
}

/** Quote a body line by line, so where customer text starts and stops is visible. */
function quoted(body: string): string {
  return body
    .split('\n')
    .map((line) => `    | ${line}`)
    .join('\n');
}

function summarise(h: HistoryResponse): string {
  const messages = [...h.messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  return [
    // Customer id and segment, NOT the name or email — see schemas.ts.
    `Customer ${h.customer.id}, segment ${h.customer.segment}, a customer since ${h.customer.since}. ` +
      `${h.priorResolutionCount} prior resolution(s) on record.`,
    `Cases (${h.cases.length}):`,
    ...h.cases.map(
      (c) =>
        `  ${c.id} · ${c.category} · ${c.status} · order ${c.orderRef ?? 'none'} · opened ${c.openedAt}` +
        `${c.closedAt ? `, closed ${c.closedAt}` : ''} — ${resolutions(c)}`,
    ),
    `Messages (${messages.length}), oldest first, each reproduced exactly as written:`,
    ...messages.map(
      (m) =>
        `  [${m.id} · ${m.sentAt} · ${m.channel} · ${m.direction} · ` +
        `${m.customerAuthored ? 'WRITTEN BY THE CUSTOMER' : `written by ${m.author} (Thornbury)`}] ` +
        `subject "${m.subject}"\n${quoted(m.body)}`,
    ),
  ].join('\n');
}

export function buildGetContactHistory(cfg: ApiConfig, session: Session): Tool<HistoryResponse> {
  return {
    name: 'get_contact_history',
    config: {
      title: "The customer's contact history",
      description: DESCRIPTION,
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    data: HistoryResponseSchema,
    run: async () => {
      const scope = await getJson(cfg, session, '/case', CaseScopeSchema);
      if (!scope.ok) return scope;
      return getJson(
        cfg,
        session,
        `/customers/${encodeURIComponent(scope.data.customerId)}/history`,
        HistoryResponseSchema,
      );
    },
    render: (outcome: Outcome<HistoryResponse>) =>
      outcome.ok ? summarise(outcome.data) : `Could not read the contact history: ${outcome.detail}`,
  };
}
