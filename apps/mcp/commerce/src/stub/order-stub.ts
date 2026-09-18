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

const ORDER_BODY = {
  orderId: ORDER,
  placedAt: '2026-08-14',
  status: 'delivered',
  totals: { itemsPence: 19899, deliveryPence: 997, grandTotalPence: 20896 },
  items: [
    { lineId: 'ORD-100931-L1', productId: 'PRD-0112', name: 'Aldworth stoneware dinner set', qty: 1, unitPricePence: 8900 },
    { lineId: 'ORD-100931-L2', productId: 'PRD-0341', name: 'Caldbeck wool throw', qty: 1, unitPricePence: 10999 },
  ],
  payments: [{ paymentId: 'PAY-500221', method: 'card', amountPence: 20896 }],
  priorRefunds: [
    { refundId: 'REF-700118', lineId: 'ORD-100931-L1', amountPence: 2200, reason: 'chipped side plate, partial' },
  ],
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
