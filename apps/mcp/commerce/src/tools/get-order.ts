/**
 * `get_order` — THE FIRST TOOL THAT CROSSES THE BOUNDARY.
 *
 * IT TAKES NO ARGUMENTS, AND THAT IS THE DESIGN. The order is the session's,
 * resolved from the case before the model ran. A tool with an `orderId`
 * parameter would let anything that can influence the model reach any order the
 * service token can reach — and what can influence the model includes text a
 * customer typed into a contact form (planted flaw T5). See `session.ts`.
 *
 * WHAT IT RETURNS, AND WHY BOTH. `content` is text for the model to read;
 * `structuredContent` carries the outcome — `{ ok, cause }` — because the
 * protocol will not. Measured: a refusal, a throw and a schema violation all
 * arrive as `isError: true` plus free text, so a downstream reader cannot tell
 * "the tool said no" from "the socket died" unless we say which.
 */
import { z } from 'zod';
import type { Tool } from './types';
import { getJson, type ApiConfig } from '../api/client';
import { guarded, type Outcome } from '../api/outcome';
import type { Session } from '../session';

/** What `GET /orders/:id` returns. Narrowed to what the desk actually reads. */
export interface Order {
  orderId: string;
  placedAt: string;
  status: string;
  totals: { itemsPence: number; deliveryPence: number; grandTotalPence: number };
  items: Array<{ lineId: string; productId: string; name: string; qty: number; unitPricePence: number }>;
  payments: Array<{ paymentId: string; method: string; amountPence: number }>;
  /** THE FIELD T3 TURNS ON. A prior refund on a line the order total still hides. */
  priorRefunds: Array<{ refundId: string; lineId: string | null; amountPence: number; reason: string }>;
}

export const DESCRIPTION =
  'The order this case is about: what was bought, what it cost, how it was paid, ' +
  'and — read this before proposing any outcome — whether any refund has ALREADY ' +
  'been issued against it. Takes no arguments: the order is fixed by the case and ' +
  'cannot be chosen.';

/** Prose for the model. The structured half is where a machine reads the outcome. */
function summarise(o: Order): string {
  const refunds = o.priorRefunds.length
    ? o.priorRefunds.map((r) => `${r.refundId} ${r.amountPence}p on ${r.lineId ?? 'the order'} (${r.reason})`).join('; ')
    : 'none';
  return [
    `Order ${o.orderId}, placed ${o.placedAt}, status ${o.status}.`,
    `Total ${o.totals.grandTotalPence}p across ${o.items.length} line(s).`,
    `Lines: ${o.items.map((i) => `${i.lineId} ${i.name} ×${i.qty} @ ${i.unitPricePence}p`).join('; ')}.`,
    `PRIOR REFUNDS: ${refunds}.`,
  ].join('\n');
}

export function buildGetOrder(cfg: ApiConfig, session: Session): Tool {
  return {
    name: 'get_order',
    config: {
      title: 'The order for this case',
      description: DESCRIPTION,
      inputSchema: z.object({}),
      // PUBLISHED FOR HUMANS, AND NOT TRUSTED BY ANYTHING. The SDK's own comment
      // says clients must never make tool-use decisions on annotations from an
      // untrusted server. The write-path gate is a client-side allowlist of
      // names; this is documentation. PLAN.md §7.
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    run: async () =>
      guarded<Order>(async () =>
        getJson<Order>(cfg, session, `/orders/${encodeURIComponent(session.orderId)}`),
      ),
    render: (outcome: Outcome<Order>) =>
      outcome.ok ? summarise(outcome.data) : `Could not read the order: ${outcome.detail}`,
  };
}
