/**
 * A STUB THE SHAPE OF THE REAL API — Step 4a's whole point.
 *
 * WHY STUB BEFORE LIVE. The boundary is what Step 4 teaches: no database
 * credential here, a service token in a header, scope taken from the session.
 * Every one of those is fully learnable against ten lines of hand-written JSON,
 * and waiting for another session to finish before writing the tool that PROVES
 * the boundary has it backwards.
 *
 * It answers in the backend's envelope, honours the same two headers, and
 * refuses the same way — so Step 4b is a base-URL change and nothing else. If
 * anything else has to change, the stub was lying, and finding that out here is
 * the cheap version.
 *
 * THE ORDER IS T3's. A £22 refund already sits against line ORD-100931-L1 of a
 * two-line order whose total still reads unrefunded — the trap that makes
 * "check for a prior refund FIRST" (POL-DOA-002 §4.1) mean something.
 */
import { createServer, type Server, type ServerResponse } from 'node:http';

const TOKEN = 'stub-service-token';
const CASE = 'CASE-STUB-0001';
const ORDER = 'ORD-100931';

/**
 * THE SHAPE IS COPIED FROM THE RUNNING API, NOT INVENTED.
 *
 * The first version of this file was a flat order with `orderId`, `qty` and
 * `totals.grandTotalPence`. Every Step 4a check passed against it. Step 4b
 * pointed the same tool at the real API and got `ok: true` with every scalar
 * `undefined`, because the real payload NESTS under `order` and names things
 * differently. The stub was lying and six green checks were green about a
 * fiction.
 *
 * A stub is a claim about someone else's contract. This one is now read off
 * `curl :3610/orders/ORD-101414` and `commerce:mcp-round-trip` re-checks that
 * claim against the live API rather than trusting this comment.
 */
const ORDER_BODY = {
  order: {
    id: ORDER,
    placedAt: '2026-08-14T09:12:00.000Z',
    status: 'delivered',
    channel: 'web',
    serviceLevel: 'standard',
    shipmentRef: 'SHP-100931',
    promisedBy: '2026-08-19T17:00:00.000Z',
    subtotalPence: 19899,
    shippingPence: 997,
    totalPence: 20896,
  },
  customer: { userId: 'USR-0412', email: 'held.by.the.api@example.co.uk', fullName: 'Stub Customer' },
  items: [
    {
      id: 'ORD-100931-L1', sku: 'ALD-DIN-12', name: 'Aldworth stoneware dinner set',
      variantName: 'slate', quantity: 1, unitPricePence: 8900, lineTotalPence: 8900,
      productCategory: 'homeware', marketplaceSeller: null,
    },
    {
      id: 'ORD-100931-L2', sku: 'CAL-THR-01', name: 'Caldbeck wool throw',
      variantName: null, quantity: 1, unitPricePence: 10999, lineTotalPence: 10999,
      productCategory: 'homeware', marketplaceSeller: null,
    },
  ],
  payments: [
    { id: 'PAY-500221', method: 'card', amountPence: 20896, pspReference: 'psp_9f21', capturedAt: '2026-08-14T09:12:04.000Z' },
  ],
  // T3: a prior partial the ORDER total still reads as unrefunded.
  priorRefunds: [{ id: 'REF-700118', amountPence: 2200, reason: 'chipped side plate, partial' }],
  totals: { capturedPence: 20896, refundedPence: 2200, netPence: 18696 },
};

const send = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

/** Fail closed: no token configured on the caller's side is a refusal, not a pass. */
function rejectsAuth(token: string | undefined): boolean {
  return token !== TOKEN;
}

export function startOrderStub(port = 0): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const token = req.headers['x-service-token'] as string | undefined;
    const caseId = req.headers['x-case-id'] as string | undefined;

    if (rejectsAuth(token)) return send(res, 401, { ok: false, cause: 'invalid_request', detail: 'bad or missing service token' });
    if (!caseId) return send(res, 200, { ok: false, cause: 'invalid_request', detail: 'x-case-id is required' });

    const match = /^\/orders\/(.+)$/.exec(req.url ?? '');
    if (!match) return send(res, 200, { ok: false, cause: 'not_found', detail: 'no such endpoint' });

    // SCOPE, AND IT IS THE SAME COLLAPSE THE REAL API MAKES. A record outside
    // the case and a record that does not exist answer IDENTICALLY — because
    // the PAIR of answers would otherwise let a caller enumerate the order book
    // by varying one path parameter. PLAN.md §7.1.
    const outOfScope = { ok: false, cause: 'out_of_scope', detail: 'that record is not in scope for this case' };
    if (caseId !== CASE) return send(res, 200, outOfScope);
    if (decodeURIComponent(match[1]) !== ORDER) return send(res, 200, outOfScope);

    send(res, 200, { ok: true, data: ORDER_BODY });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      const p = typeof addr === 'object' && addr ? addr.port : port;
      resolve({ server, url: `http://127.0.0.1:${p}` });
    });
  });
}

export const STUB = { token: TOKEN, caseId: CASE, orderId: ORDER } as const;
