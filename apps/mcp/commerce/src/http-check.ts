/**
 * STEPS 7 AND 8 — the HTTP transport, and the lock on it. Ports, no database.
 *
 * Offline in the sense that matters: the stub stands in for the API (it grew a
 * `GET /case` for this), so nothing here needs :3610 or Neon. The live version
 * of the same path — all 13 trap cases over HTTP — is in `round-trip.ts`.
 *
 * WHAT WAS MEASURED BEFORE A LINE OF THIS WAS WRITTEN (2026-09-27), and the
 * reason `legacy: 'reject'` is a decision rather than a default:
 *
 *   server legacy   client versionNegotiation     result
 *   ─────────────   ───────────────────────────   ───────────────────────────────
 *   reject          'legacy' (the SDK DEFAULT)    REFUSED, -32022 "Unsupported
 *                                                 protocol version: 2025-11-25"
 *   reject          'auto' or { pin }             2026-07-28, era modern
 *   stateless       'legacy'                      2025-11-25, era legacy
 *   stateless       'auto' or { pin }             2026-07-28, era modern
 *
 *   inspector 2.7.0 --cli over HTTP: speaks 2025-11-25 → refused under `reject`,
 *   works under `stateless`. It still works over STDIO, which is how Step 2
 *   used it, so `reject` costs nothing Step 2 established.
 *
 * So NEXT.md §5.4's open question — does the HTTP handler negotiate the modern
 * era? — has a measured answer: yes, WHEN THE CLIENT OPTS IN. The SDK client's
 * default is the 2025 handshake, and a modern-only endpoint refuses it. Step
 * 10's client must set `versionNegotiation`, or it cannot connect here at all.
 *
 *   pnpm commerce:mcp-http-check
 */
import { request as httpRequest } from 'node:http';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Server, createMcpHandler, InMemoryTransport } from '@modelcontextprotocol/server';
import { createServer } from './server';
import { createServer as createNodeServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { startHttpServer, CASE_HEADER } from './http';
import { startOrderStub, STUB } from './stub/order-stub';

// ── the harness ─────────────────────────────────────────────────────────────

let failed = 0;
function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

const TOKEN = 'mcp_check_' + 'q'.repeat(32);
const MODERN = '2026-07-28';

/** A client as Step 10's must be: pinned to the modern era, headers from the desk. */
async function deskClient(url: string, headers: Record<string, string>): Promise<Client> {
  const client = new Client({ name: 'http-check', version: '0.1.0' }, { versionNegotiation: { mode: { pin: MODERN } } });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));
  return client;
}

const desk = (caseId: string = STUB.caseId) => ({ authorization: `Bearer ${TOKEN}`, [CASE_HEADER]: caseId });

/** A raw POST with full control of every header — Host included, which fetch() will not let you set. */
function rawPost(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }));
  });
}

// ── the cases ───────────────────────────────────────────────────────────────

async function probeControls(url: string): Promise<void> {
  const client = await deskClient(url, desk());
  const { tools } = await client.listTools();
  // The SAME set createServer() publishes in-process — derived, not a count.
  // The first version asserted `tools.length === 5` and went red the day a
  // sixth tool landed, which is the lesson wire-selftest's EXPECTED_TOOLS
  // comment had already written down.
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const local = new Client({ name: 'http-check-local', version: '0' });
  await Promise.all([createServer({ api: { baseUrl: 'http://127.0.0.1:9', serviceToken: 'x' }, session: { caseId: 'x', orderId: 'x' } }).connect(st), local.connect(ct)]);
  const expected = (await local.listTools()).tools.map((t) => t.name).sort().join(',');
  await local.close();
  const got = tools.map((t) => t.name).sort().join(',');
  check(
    'CONTROL — an authenticated desk connects over HTTP on the MODERN era and lists the tools',
    client.getNegotiatedProtocolVersion?.() === MODERN && got === expected,
    `negotiated ${client.getNegotiatedProtocolVersion?.()}; over HTTP [${got}], in-process [${expected}]. ` +
      'Without this every refusal below could be a server that refuses everyone',
  );
  const r = await client.callTool({ name: 'get_order', arguments: {} });
  const sc = r.structuredContent as { ok?: boolean; data?: { order?: { id?: string } } };
  check(
    'the ORDER is resolved from the case by the API — the desk never names it',
    sc?.ok === true && sc.data?.order?.id === STUB.orderId,
    `the request carried only ${CASE_HEADER}: ${STUB.caseId}; GET /case answered ${sc?.data?.order?.id}. ` +
      "session.ts's \"resolved from the case, not chosen\" is literally true over HTTP",
  );
  await client.close();
}

async function probeTheDoor(url: string): Promise<void> {
  const none = await rawPost(url, { [CASE_HEADER]: STUB.caseId });
  check('no Authorization header is 401', none.status === 401, `got ${none.status}`);

  const wrong = await rawPost(url, { ...desk(), authorization: 'Bearer not-the-token' });
  check('a wrong bearer is 401', wrong.status === 401, `got ${wrong.status}`);

  const apiToken = await rawPost(url, { ...desk(), authorization: `Bearer ${STUB.token}` });
  check(
    "the API's OWN service token, presented here, is 401 — the wrong audience",
    apiToken.status === 401,
    `got ${apiToken.status}. Two secrets, two boundaries: the one this server presents to the API ` +
      'must not open this server. A token minted for another service accepted here is the confused deputy',
  );

  // ▲ THIS CHECK PASSED OVER ITS OWN PLANT, FIRST VERSION. It asserted only
  // `status === 400`, from a raw 2025-shaped request — and `legacy: 'reject'`
  // answers THAT with a 400 too, before the case gate is ever reached. With the
  // gate sabotaged to default the case, it stayed green. Two refusals, one
  // status: so it now asserts the REASON, and it asks as a real modern client,
  // which the handler WOULD serve if the gate let it through.
  const noCase = await rawPost(url, { authorization: `Bearer ${TOKEN}` });
  let served = false;
  try {
    const c = await deskClient(url, { authorization: `Bearer ${TOKEN}` });
    served = (await c.listTools()).tools.length > 0;
    await c.close();
  } catch {
    served = false;
  }
  check(
    `a valid token with NO ${CASE_HEADER} is refused for THAT reason — never defaulted`,
    noCase.status === 400 && /x-case-id is required/.test(noCase.body) && !served,
    `status ${noCase.status}, reason "${noCase.body.slice(0, 70)}", a modern client ${served ? 'WAS SERVED' : 'was refused'}. ` +
      'THE PLANT: over stdio the session defaults to CAS-90001 so the demos work. Reused here, a request ' +
      "with no case would be served T1's customer's data",
  );

  const unknown = await rawPost(url, desk('CAS-DOES-NOT-EXIST'));
  check(
    'a case the API does not recognise is refused for THAT reason (400)',
    unknown.status === 400 && /case could not be resolved/.test(unknown.body),
    `got ${unknown.status}: ${unknown.body.slice(0, 90)}`,
  );
}

async function probeFailClosed(stubUrl: string): Promise<void> {
  const srv = await startHttpServer({ token: '', api: { baseUrl: stubUrl, serviceToken: STUB.token } });
  try {
    const r = await rawPost(srv.url, desk());
    check(
      'COMMERCE_MCP_TOKEN UNSET refuses EVERY request (503) — even one bearing a token',
      r.status === 503,
      `got ${r.status}. THE PLANT @fde/guard exists to name: the obvious implementation skips the ` +
        'check when the secret is unset, and an unset secret becomes an open door',
    );
  } finally {
    await srv.close();
  }
}

async function probeTransport(url: string, host: string): Promise<void> {
  const client = new Client({ name: 'http-check-legacy', version: '0.1.0' }); // the SDK DEFAULT: 2025 handshake
  let code: unknown;
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: desk() } }));
  } catch (e) {
    code = String((e as Error)?.message).match(/-320\d\d/)?.[0];
  }
  check(
    "legacy: 'reject' — a 2025-era client (the SDK's DEFAULT) is refused with -32022",
    code === '-32022',
    `got ${String(code)}. One era, one behaviour to test. The measured cost: inspector 2.7.0 speaks ` +
      '2025 and is refused over HTTP (stdio still works); Step 10 must pin versionNegotiation',
  );

  const rebinding = await rawPost(url, { ...desk(), host: 'evil.example:3620' });
  check(
    'a request whose Host is not loopback is refused (DNS rebinding)',
    rebinding.status === 403,
    `got ${rebinding.status}. The SDK says a bare handler needs Host/Origin validation in front of it`,
  );

  check('it listens on loopback only', host === '127.0.0.1', `bound to ${host}`);
}

/**
 * COMMERCE_MCP_ALLOWED_HOSTS allowlist: additional hostnames appended to localhost.
 */
async function probeAllowedHosts(stubUrl: string): Promise<void> {
  // Set the env var before starting the server — createHttpHandler reads it
  process.env.COMMERCE_MCP_ALLOWED_HOSTS = 'commerce-mcp,*';
  const srv = await startHttpServer({ token: TOKEN, api: { baseUrl: stubUrl, serviceToken: STUB.token } });
  try {
    // Request with an allowed host but no auth — should pass the host gate, fail auth gate (401)
    const allowed = await rawPost(srv.url, { host: 'commerce-mcp:3620' });
    check(
      'COMMERCE_MCP_ALLOWED_HOSTS: an allowed host passes the host gate',
      allowed.status === 401,
      `got ${allowed.status}. Allowed hosts are appended, localhost still works, and ` +
        '401 (no auth) proves the request passed the Host gate. 403 would mean it failed there',
    );

    // Request with a disallowed host — should fail the host gate (403)
    const denied = await rawPost(srv.url, { host: 'evil.example:3620' });
    check(
      'a host NOT in the allowlist is still refused',
      denied.status === 403,
      `got ${denied.status}. The allowlist does not widen the gate to everything`,
    );

    // Allowlist with * should never actually allow it — * is ignored
    const starAttempt = await rawPost(srv.url, { host: '*:3620' });
    check(
      'COMMERCE_MCP_ALLOWED_HOSTS: entries with * are stripped, never allowed',
      starAttempt.status === 403,
      `got ${starAttempt.status}. Setting the var to * or *:port must not widen access`,
    );
  } finally {
    delete process.env.COMMERCE_MCP_ALLOWED_HOSTS;
    await srv.close();
  }
}

/**
 * STEP 5 AGAIN, ON THE ERA IT WAS NOT MEASURED ON. Every Step 5 check ran over
 * InMemoryTransport, which negotiates 2025-11-25. The object-rooted schema and
 * the no-re-nesting property are era-dependent in the SDK's own code, so they
 * are re-asserted on 2026-07-28 here.
 */
async function probeStep5OnModern(url: string): Promise<void> {
  const client = await deskClient(url, desk());
  const { tools } = await client.listTools();
  const unrooted = tools.filter((t) => t.name !== 'ping' && (t.outputSchema as { type?: string } | undefined)?.type !== 'object');
  const r = await client.callTool({ name: 'get_order', arguments: {} });
  const sc = r.structuredContent as Record<string, unknown> | undefined;
  check(
    'on 2026-07-28 too: every outputSchema object-rooted, structuredContent un-nested',
    unrooted.length === 0 && sc?.ok === true && !('result' in (sc ?? {})),
    `unrooted=[${unrooted.map((t) => t.name).join(', ')}], keys=[${Object.keys(sc ?? {}).join(', ')}]`,
  );
  await client.close();

  // The lying server, on the modern era: advertises a number, returns a string.
  const liar = createMcpHandler(() => {
    const s = new Server({ name: 'liar', version: '0' }, { capabilities: { tools: {} } });
    s.setRequestHandler('tools/list', async () => ({
      tools: [{ name: 'liar', description: 'd', inputSchema: { type: 'object' as const, properties: {} },
        outputSchema: { type: 'object' as const, properties: { n: { type: 'number' } }, required: ['n'] } }],
    }));
    s.setRequestHandler('tools/call', async () => ({ content: [{ type: 'text' as const, text: 'hi' }], structuredContent: { n: 'a string' } }));
    return s;
  }, { legacy: 'reject' });
  const node = createNodeServer((req, res) => {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const request = new Request(`http://127.0.0.1${req.url}`, {
      method: req.method, headers, body: req.method === 'POST' ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined, duplex: 'half',
    } as RequestInit);
    liar.fetch(request).then(async (response) => {
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    });
  });
  await new Promise<void>((r) => node.listen(0, '127.0.0.1', r));
  const liarUrl = `http://127.0.0.1:${(node.address() as AddressInfo).port}/mcp`;
  const lc = new Client({ name: 'http-check', version: '0' }, { versionNegotiation: { mode: { pin: MODERN } } });
  await lc.connect(new StreamableHTTPClientTransport(new URL(liarUrl)));
  await lc.listTools();
  let code: number | undefined;
  try {
    await lc.callTool({ name: 'liar', arguments: {} });
  } catch (e) {
    code = (e as { code?: number })?.code;
  }
  check(
    'on 2026-07-28 too: a known tool whose output breaks its schema is -32602 at a listing client',
    code === -32602,
    `got ${String(code)}. Step 5's correction holds on both eras: the name-in-tools/list cross-check is load-bearing`,
  );
  await lc.close();
  await liar.close();
  node.closeAllConnections();
  node.close();
}

function probeHarnessCanFail(): void {
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');
}

async function main(): Promise<void> {
  const stub = await startOrderStub();
  const srv = await startHttpServer({ token: TOKEN, api: { baseUrl: stub.url, serviceToken: STUB.token } });
  const host = new URL(srv.url).hostname;
  console.log(`\nSteps 7 and 8 — HTTP on ${srv.url}, locked (stub API, no database)\n`);
  try {
    console.log('CONTROLS');
    await probeControls(srv.url);
    console.log('\nSTEP 8 — THE DOOR');
    await probeTheDoor(srv.url);
    await probeFailClosed(stub.url);
    console.log('\nSTEP 7 — THE TRANSPORT');
    await probeTransport(srv.url, host);
    console.log('\nSTEP 8 — ALLOWED HOSTS GATE');
    await probeAllowedHosts(stub.url);
    console.log('\nSTEP 5, RE-MEASURED ON THE MODERN ERA');
    await probeStep5OnModern(srv.url);
    console.log('\nTHE HARNESS ITSELF');
    probeHarnessCanFail();
  } finally {
    await srv.close();
    stub.server.close();
  }
  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nhttp-check could not run\n', e);
  process.exit(1);
});
