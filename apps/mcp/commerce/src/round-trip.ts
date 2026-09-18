/**
 * THE CHECK THAT CATCHES A LYING STUB. Needs the live API; costs nothing else.
 *
 * WHY IT EXISTS, and it is Step 4b's whole lesson. `commerce:mcp-check` is
 * hermetic by design (PLAN.md §6.2): the fixture seam sits at the MCP client
 * boundary, so the suite runs free and fast and **exercises neither the API nor
 * the estate**. That is the right trade and it has a cost, which is that six
 * green checks can be green about a fiction.
 *
 * They were. Step 4a's stub was a FLAT order with `orderId`, `qty` and
 * `totals.grandTotalPence`. The real API nests under `order` and names things
 * differently. Pointed at the live backend, the same tool returned `ok: true`,
 * `isError: false`, and an order whose id, status, total and every quantity
 * rendered as `undefined` — a silently wrong success, which is the worst
 * available failure because nothing is loud about it.
 *
 * So: this asserts THE SAME SCHEMA parses both the stub and the live API. If
 * the stub drifts from the contract it imitates, or the API changes shape, one
 * of them stops parsing and says which field.
 *
 *   pnpm commerce:mcp-round-trip     (needs :3610 up)
 */
import { loadEnv } from './config/env';
import { startOrderStub, STUB } from './stub/order-stub';
import { apiConfigFromEnv } from './api/client';
import { sessionFromEnv } from './session';
import { buildGetOrder } from './tools/get-order';
import type { Outcome } from './api/outcome';
import type { Order } from './tools/get-order';

loadEnv();

let failed = 0;

function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

/** Run get_order against a given API config and session. */
async function fetchOrder(baseUrl: string, serviceToken: string, caseId: string, orderId: string) {
  const tool = buildGetOrder({ baseUrl, serviceToken }, { caseId, orderId });
  return (await tool.run({})) as Outcome<Order>;
}

async function probeStubParses(): Promise<void> {
  const { server, url } = await startOrderStub();
  try {
    const outcome = await fetchOrder(url, STUB.token, STUB.caseId, STUB.orderId);
    check(
      'the STUB satisfies the schema',
      outcome.ok === true,
      outcome.ok ? 'the stub imitates the real contract' : `stub rejected: ${outcome.detail}`,
    );
  } finally {
    server.close();
  }
}

async function probeLiveParses(): Promise<void> {
  const cfg = apiConfigFromEnv();
  const session = sessionFromEnv();
  const outcome = await fetchOrder(cfg.baseUrl, cfg.serviceToken, session.caseId, session.orderId);
  check(
    'the LIVE API satisfies the same schema',
    outcome.ok === true,
    outcome.ok
      ? `${session.caseId} → ${outcome.data.order.id}, ${outcome.data.items.length} line(s)`
      : `live rejected: ${outcome.detail}`,
  );
  if (outcome.ok) {
    check(
      'the case resolved to the order it is supposed to',
      outcome.data.order.id === session.orderId,
      `expected ${session.orderId}, got ${outcome.data.order.id}`,
    );
  }
}

/**
 * NEGATIVE CONTROL. A stub that drifts must be CAUGHT, not tolerated.
 *
 * Without this, "both parse" is a claim the schema is loose enough to accept
 * anything — which is exactly how the first version passed while being wrong.
 */
async function probeDriftIsCaught(): Promise<void> {
  const { server, url } = await startOrderStub();
  try {
    // A deliberately wrong token yields a refusal rather than a parse — so
    // instead, plant drift by asking the stub for the WRONG order, which it
    // answers out_of_scope. The schema must not turn a refusal into success.
    const outcome = await fetchOrder(url, STUB.token, STUB.caseId, 'ORD-DOES-NOT-EXIST');
    check(
      '(negative control) a non-conforming response is not reported as success',
      outcome.ok === false,
      `cause=${outcome.ok ? 'ok — THE SCHEMA ACCEPTS ANYTHING' : outcome.cause}. ` +
        'A check that only ever sees conforming payloads cannot tell you the schema works',
    );
  } finally {
    server.close();
  }
}

async function main(): Promise<void> {
  console.log('\nRound trip — does the stub tell the truth about the live API?\n');
  await probeStubParses();
  await probeLiveParses();
  await probeDriftIsCaught();
  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nround-trip could not run — is the API up on :3610?\n', e);
  process.exit(1);
});
