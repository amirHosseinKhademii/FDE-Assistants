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
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { Client } from '@modelcontextprotocol/client';
import { loadEnv } from './config/env';
import { createServer } from './server';
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
 * A REFUSAL IS NOT REPORTED AS SUCCESS — and that is all this asserts.
 *
 * ▲ RENAMED 2026-09-27. This was `probeDriftIsCaught`, labelled a negative
 * control for schema drift. It never planted drift: asking for the wrong order
 * yields `out_of_scope`, which never reaches the schema at all. The real drift
 * control — Step 4a's flat order served behind `ok: true` — is in
 * `break-live.ts` (`commerce:mcp-break`), and goes red if the parse is skipped.
 */
async function probeRefusalIsNotSuccess(): Promise<void> {
  const { server, url } = await startOrderStub();
  try {
    // A deliberately wrong token yields a refusal rather than a parse — so
    // instead, plant drift by asking the stub for the WRONG order, which it
    // answers out_of_scope. The schema must not turn a refusal into success.
    const outcome = await fetchOrder(url, STUB.token, STUB.caseId, 'ORD-DOES-NOT-EXIST');
    check(
      'a refusal from the stub is not reported as success',
      outcome.ok === false,
      `cause=${outcome.ok ? 'ok — A REFUSAL READ AS SUCCESS' : outcome.cause}. ` +
        'Not a drift control — see the comment above, and break-live.ts for the real one',
    );
  } finally {
    server.close();
  }
}

/**
 * EVERY TRAP CASE, THROUGH THE WHOLE PATH, AS A LISTING CLIENT SEES IT.
 *
 * Added at Step 5, and the reason is a different validator. The inbound parse
 * is Zod; a client that has listed tools checks `structuredContent` against the
 * PUBLISHED JSON Schema with its own validator. Those are two claims, and the
 * second had only ever seen the stub — whose `promisedBy` is a timestamp where
 * the live API sends a bare date, and whose one order cannot vary the way the
 * trap orders do (T3's prior refunds, T4's marketplace seller). If any live
 * order failed the client's check, every successful get_order would arrive at
 * Step 10 as -32602 — indistinguishable by code from an unknown tool.
 *
 * The case → order pairs are ESTATE.md §0's reserved CAS-9xxxx block.
 */
const TRAP_CASES: ReadonlyArray<[string, string]> = [
  ['CAS-90001', 'ORD-101414'], // T1 trolley tipped at stop 14
  ['CAS-90002', 'ORD-101782'], // T2 the smart desk lamp
  ['CAS-90003', 'ORD-100931'], // T3 the second claim, £22 already refunded
  ['CAS-90004', 'ORD-100931'], // T3 the earlier claim, closed
  ['CAS-90005', 'ORD-101205'], // T4 third-party seller
  ['CAS-90006', 'ORD-101501'], // T6 working vs calendar days …
  ['CAS-90007', 'ORD-101502'],
  ['CAS-90008', 'ORD-101503'],
  ['CAS-90009', 'ORD-101504'],
  ['CAS-90010', 'ORD-101505'],
  ['CAS-90011', 'ORD-101506'],
  ['CAS-90012', 'ORD-100488'], // T5 the obvious injection
  ['CAS-90013', 'ORD-101663'], // T5 the realistic injection
];

async function probeEveryTrapThroughTheClient(): Promise<void> {
  const api = apiConfigFromEnv();
  const failures: string[] = [];
  for (const [caseId, orderId] of TRAP_CASES) {
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'round-trip', version: '0.1.0' });
    await Promise.all([createServer({ api, session: { caseId, orderId } }).connect(st), client.connect(ct)]);
    try {
      await client.listTools(); // FIRST — without it the client's output check is off (Step 5)
      const r = await client.callTool({ name: 'get_order', arguments: {} });
      const sc = r.structuredContent as { ok?: boolean; cause?: string; detail?: string; data?: { order?: { id?: string } } };
      if (sc?.ok !== true) failures.push(`${caseId}: ${sc?.cause} — ${String(sc?.detail).slice(0, 100)}`);
      else if (sc.data?.order?.id !== orderId) failures.push(`${caseId}: got ${sc.data?.order?.id}, expected ${orderId}`);
    } catch (e) {
      failures.push(`${caseId}: THREW ${(e as { code?: unknown })?.code} ${String((e as Error)?.message).slice(0, 100)}`);
    } finally {
      await client.close();
    }
  }
  check(
    `all ${TRAP_CASES.length} trap cases pass the CLIENT's check of the published schema, live`,
    failures.length === 0,
    failures.length === 0
      ? 'listTools first, then get_order, per case: no throw, ok:true, the right order. The published ' +
        'JSON Schema and the live payloads agree, not just Zod and the stub'
      : failures.join(' | '),
  );
}

async function main(): Promise<void> {
  console.log('\nRound trip — does the stub tell the truth about the live API?\n');
  await probeStubParses();
  await probeLiveParses();
  await probeRefusalIsNotSuccess();
  await probeEveryTrapThroughTheClient();
  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nround-trip could not run — is the API up on :3610?\n', e);
  process.exit(1);
});
