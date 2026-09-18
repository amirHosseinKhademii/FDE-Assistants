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
import { OrderResponseSchema, type OrderResponse } from '../api/schemas';
import { guarded, type Outcome } from '../api/outcome';
import type { Session } from '../session';

/** The shape is in `schemas.ts` and is PARSED, not asserted. See Step 4b. */
export type Order = OrderResponse;

export const DESCRIPTION =
  'The order this case is about: what was bought, what it cost, how it was paid, ' +
  'and — read this before proposing any outcome — whether any refund has ALREADY ' +
  'been issued against it. Takes no arguments: the order is fixed by the case and ' +
  'cannot be chosen.';

/** Prose for the model. The structured half is where a machine reads the outcome. */
function summariseLine(i: Order['items'][number]): string {
  const seller = i.marketplaceSeller ? ` [sold by ${i.marketplaceSeller}]` : '';
  const category = i.productCategory ? ` (${i.productCategory})` : '';
  return `${i.id} ${i.name}${category}${seller} \u00d7${i.quantity} @ ${i.unitPricePence}p`;
}

function summariseRefunds(o: Order): string {
  if (!o.priorRefunds.length) return 'none';
  return o.priorRefunds.map((r) => `${r.id} ${r.amountPence}p`).join('; ');
}

function summarise(o: Order): string {
  return [
    `Order ${o.order.id}, placed ${o.order.placedAt}, status ${o.order.status}, channel ${o.order.channel}.`,
    `Total ${o.order.totalPence}p across ${o.items.length} line(s); captured ${o.totals.capturedPence}p, refunded ${o.totals.refundedPence}p.`,
    `Lines: ${o.items.map(summariseLine).join('; ')}.`,
    `PRIOR REFUNDS: ${summariseRefunds(o)}.`,
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
        getJson(cfg, session, `/orders/${encodeURIComponent(session.orderId)}`, OrderResponseSchema),
      ),
    render: (outcome: Outcome<Order>) =>
      outcome.ok ? summarise(outcome.data) : `Could not read the order: ${outcome.detail}`,
  };
}
