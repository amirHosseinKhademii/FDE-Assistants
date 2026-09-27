/**
 * STEP 6 — break it on purpose, at the boundary the offline suite cannot reach.
 *
 * WHAT IS ALREADY MEASURED, AND WHY THIS FILE IS NOT A REPEAT OF IT. The
 * protocol half of Step 6 is `commerce:mcp-check`: an unknown tool, bad
 * arguments, a domain refusal and a throw, each produced over InMemoryTransport
 * and asserted. That suite is hermetic by design — the stub stands in for the
 * backend — so it cannot say what happens when the BACKEND misbehaves, and that
 * is where every failure below lives: a wrong credential, a dead port, a socket
 * that accepts and never answers, a response cut off halfway, a body that is not
 * JSON, and the MCP server itself dying mid-call.
 *
 * EACH CASE ASSERTS THE CAUSE IT SHOULD LAND AS, NOT THE ONE IT DOES. The first
 * run of this file was the measurement: it went red wherever the label was wrong,
 * and the table it printed is in MCP-STEPS.md Step 6. A cause that is right in
 * blame and wrong in diagnosis still fails here, because "infrastructure" is not
 * a diagnosis — `threw` sends the next person to our code, `upstream_unavailable`
 * sends them to the network, and only one of those is where the fault is.
 *
 * THE LIVE API IS USED WHERE ITS OWN ANSWER IS THE POINT (the control, scope,
 * a wrong token). Everything the shared API cannot be made to do without being
 * taken down under the other sessions using it is a local socket that does
 * exactly one wrong thing.
 *
 *   pnpm commerce:mcp-break      (needs :3610 up)
 */
import { createServer as createHttpServer, type Server } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import * as path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';
import { loadEnv } from './config/env';
import { apiConfigFromEnv, DEFAULT_TIMEOUT_MS, type ApiConfig } from './api/client';
import { conforming, guarded, outcomeSchema, type Cause, type Outcome } from './api/outcome';
import { buildGetOrder } from './tools/get-order';

loadEnv();

// ── the harness ─────────────────────────────────────────────────────────────

let failed = 0;

function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}\n        why: ${why}`);
}

/**
 * A WATCHDOG, so a hang is a red line and not a stuck terminal.
 *
 * Without it the check for "a socket that never answers" would itself never
 * answer — the one failure a test runner reports by saying nothing.
 */
const HUNG = Symbol('hung');
async function within<T>(ms: number, p: Promise<T>): Promise<T | typeof HUNG> {
  let timer: NodeJS.Timeout | undefined;
  const watchdog = new Promise<typeof HUNG>((r) => {
    timer = setTimeout(() => r(HUNG), ms);
  });
  try {
    return await Promise.race([p, watchdog]);
  } finally {
    clearTimeout(timer);
  }
}

/** The case every live probe runs as. T1's, so the control reads a real order. */
const CASE = { caseId: 'CAS-90001', orderId: 'ORD-101414' };

/**
 * The timeout the HANG PLANT is given — short, so that case costs a second.
 *
 * ONLY the plant. The first version gave it to every probe, and the CONTROL
 * went red on the first run after the API had sat idle: a warm
 * `/orders/ORD-101414` takes ~0.58s, a cold one took over a second. Which is
 * precisely the argument for `DEFAULT_TIMEOUT_MS` being 15s and not 1, made by
 * this file's own flake. Live probes run with the real default.
 */
const HANG_TIMEOUT_MS = 1000;

/** The watchdog allows the tool its own timeout, plus slack, before calling it hung. */
const SLACK_MS = 2000;

/**
 * Run `get_order` once, EXACTLY as `register()` runs it — inside `guarded()`,
 * then through `conforming()` against its published output schema (Step 5) —
 * and describe what came back. The offline suite already proves `register()`
 * carries that outcome into structuredContent unchanged, so the cause measured
 * here is the cause the model's loop will read.
 *
 * Calling `tool.run` bare would measure something no caller ever sees: the
 * first version of this file did, and a refused connection escaped as an
 * uncaught TypeError instead of arriving labelled.
 */
async function getOrder(cfg: ApiConfig, session = CASE): Promise<Outcome<unknown> | typeof HUNG> {
  const tool = buildGetOrder(cfg, session);
  const schema = outcomeSchema(tool.data);
  return within(
    (cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS) + SLACK_MS,
    guarded(() => tool.run({})).then((o) => conforming(tool.name, o, schema)),
  );
}

function describe(o: Outcome<unknown> | typeof HUNG): string {
  if (o === HUNG) return 'NO ANSWER within the tool\'s own timeout plus slack';
  return o.ok ? 'ok' : `cause=${o.cause} — ${o.detail.slice(0, 140)}`;
}

function expectCause(name: string, o: Outcome<unknown> | typeof HUNG, want: Cause, why: string): void {
  const got = o !== HUNG && !o.ok ? o.cause : undefined;
  check(name, got === want, `want ${want}; got ${describe(o)}. ${why}`);
}

// ── local sockets, each doing exactly one wrong thing ────────────────────────

interface Plant {
  url: string;
  close(): void;
}

/** Listen on an ephemeral port and track sockets so close() cannot hang. */
async function listen(server: Server): Promise<Plant> {
  const sockets = new Set<Socket>();
  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close() {
      for (const s of sockets) s.destroy();
      server.close();
    },
  };
}

/** A port that WAS listening and is not now. Connection refused, reliably. */
async function deadPort(): Promise<string> {
  const plant = await listen(createHttpServer());
  plant.close();
  return plant.url;
}

/**
 * Accepts the connection and never answers. The Neon idle hang, and any proxy
 * that has lost its upstream, look exactly like this from the client.
 */
const hangs = () => listen(createHttpServer(() => undefined));

/**
 * The API with no service token configured on ITS side: 503 and a bare
 * `{error, reason}`, fail-closed (API.md §4). Planted rather than produced,
 * because producing it means restarting the shared API without its token.
 */
const answersApi503 = () =>
  listen(
    createHttpServer((_req, res) => {
      res.writeHead(503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'refused', reason: 'service token not configured' }));
    }),
  );

/** Sends a 200 and half a body, then destroys the socket. A crash mid-write. */
const cutsOff = () =>
  listen(
    createHttpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"ok":true,"data":{"order":{"id":"ORD-');
      setTimeout(() => res.socket?.destroy(), 20);
    }),
  );

/** A complete 200 whose body is not JSON — a captive portal, a proxy's error page. */
const answersHtml = () =>
  listen(
    createHttpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><body>Service temporarily unavailable</body></html>');
    }),
  );

/**
 * The envelope says success and the payload is Step 4a's FLAT order — the shape
 * the first stub invented, before anyone read the real API. `orderId` where the
 * contract nests `order.id`. The drift that actually happened, not a made-up one.
 */
const answersDriftedOrder = () =>
  listen(
    createHttpServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: { orderId: 'ORD-101414', qty: 1, totals: { grandTotalPence: 11086 } } }));
    }),
  );

/** A 4xx that is not the API's envelope. Nest's own 404 for a route that is not there. */
const answersNest404 = () =>
  listen(
    createHttpServer((_req, res) => {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'Cannot GET /orders/x', error: 'Not Found', statusCode: 404 }));
    }),
  );

/**
 * A 400 in the API's REAL contract-violation shape, copied from
 * `curl ':3610/policy/rules?valuePence=abc'`. `get_order` cannot provoke a 400
 * from the live API — its only input is a path segment the API accepts as any
 * string — but the next tool (`get_policy_rules`) takes query parameters and
 * can, so the mapping has to be right before that tool exists.
 */
const answersApi400 = () =>
  listen(
    createHttpServer((_req, res) => {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: "the request did not match this endpoint's contract",
          problems: [{ field: 'valuePence', rule: 'invalid_format', message: 'valuePence must be a whole number of pence' }],
        }),
      );
    }),
  );

// ── the cases ───────────────────────────────────────────────────────────────

/** CONTROL. A probe that could only fail would pass every case below. */
async function probeControl(live: ApiConfig): Promise<void> {
  const o = await getOrder(live);
  check(
    'CONTROL — the live API answers the session\'s own order',
    o !== HUNG && o.ok,
    `${describe(o)}. Without this every red line below could be the API being down`,
  );
}

async function probeLiveRefusals(live: ApiConfig): Promise<void> {
  expectCause(
    'another case\'s order is a DOMAIN answer',
    await getOrder(live, { caseId: 'CAS-90002', orderId: CASE.orderId }),
    'out_of_scope',
    'HTTP 200 with the envelope — the API ran and said no. The one row here that is nobody\'s fault',
  );

  expectCause(
    'a case id that names no case is a WIRING fault, and says so',
    await getOrder(live, { caseId: 'CAS-00000-NOPE', orderId: CASE.orderId }),
    'invalid_request',
    'the case comes from the session, never the model — so this is our configuration, and the API\'s detail says it',
  );

  expectCause(
    'a WRONG service token is a credential fault, not an outage',
    await getOrder({ ...live, serviceToken: 'not-the-token' }),
    'unauthorized',
    'the API answers 401 {error, reason} — no envelope. Filed as upstream_unavailable it sends the next person ' +
      'to check the network while the token sits wrong in .env',
  );

  expectCause(
    'an UNSET service token is refused before any request leaves',
    await getOrder({ ...live, serviceToken: '' }),
    'unauthorized',
    'fail closed, and labelled as what it is. invalid_request is the API\'s word for a request that broke ' +
      'its contract — the model\'s kind of mistake once tools take arguments — and this is ours',
  );
}

async function probePlumbing(live: ApiConfig): Promise<void> {
  expectCause(
    'a DEAD PORT is the upstream being unavailable, not our code throwing',
    await getOrder({ ...live, baseUrl: await deadPort() }),
    'upstream_unavailable',
    'fetch() rejects with ECONNREFUSED. Caught by guarded() it becomes `threw` — "the tool itself raised" — ' +
      'which points at a bug in this package when the fault is a process that is not running',
  );

  const hang = await hangs();
  try {
    const started = Date.now();
    const o = await getOrder({ ...live, baseUrl: hang.url, timeoutMs: HANG_TIMEOUT_MS });
    expectCause(
      'a socket that ACCEPTS AND NEVER ANSWERS times out, labelled',
      o,
      'upstream_unavailable',
      `took ${Date.now() - started}ms. fetch() has NO default timeout (FREE.md found the same on the model ` +
        'endpoint), so without one the tool call — and the model turn waiting on it — hangs forever',
    );
  } finally {
    hang.close();
  }

  const unconfigured = await answersApi503();
  try {
    expectCause(
      'the API\'s own 503 — NO token configured on ITS side — is the upstream, not our credential',
      await getOrder({ ...live, baseUrl: unconfigured.url }),
      'upstream_unavailable',
      'the one refusal that must NOT read as unauthorized: our token may be right, and the API is ' +
        'refusing everyone. A 5xx from this API always means plumbing (API.md §3)',
    );
  } finally {
    unconfigured.close();
  }

  const cut = await cutsOff();
  try {
    expectCause(
      'a response CUT OFF mid-body is the upstream failing, not a malformed contract',
      await getOrder({ ...live, baseUrl: cut.url }),
      'upstream_unavailable',
      'the status was 200 and the body never finished — nothing was malformed, the connection died',
    );
  } finally {
    cut.close();
  }
}

async function probeContract(live: ApiConfig): Promise<void> {
  const html = await answersHtml();
  try {
    expectCause(
      'a complete 200 that is NOT JSON is a contract violation',
      await getOrder({ ...live, baseUrl: html.url }),
      'malformed_response',
      'res.json() throws SyntaxError and guarded() files it as `threw`. The upstream answered, completely, ' +
        'and not in the contract — which is what malformed_response exists to say',
    );
  } finally {
    html.close();
  }

  const drifted = await answersDriftedOrder();
  try {
    expectCause(
      'ok:true with a payload that DRIFTED from the schema is malformed_response, not success',
      await getOrder({ ...live, baseUrl: drifted.url }),
      'malformed_response',
      'Step 4b\'s exact failure — the envelope says success and the fields are not where we read them. ' +
        'round-trip.ts\'s "negative control" plants a refusal, not drift, so until this check nothing ' +
        'proved the schema rejects anything',
    );
  } finally {
    drifted.close();
  }

  const nest = await answersNest404();
  try {
    expectCause(
      'a 4xx that is not the envelope is a contract violation, not an outage',
      await getOrder({ ...live, baseUrl: nest.url }),
      'malformed_response',
      'a route that is not there means our client and the API disagree about the contract. ' +
        'Reading it as upstream_unavailable says "try again later", which will never work',
    );
  } finally {
    nest.close();
  }

  const bad = await answersApi400();
  try {
    const o = await getOrder({ ...live, baseUrl: bad.url });
    expectCause(
      'the API\'s 400 {error, problems} is invalid_request, with the field named',
      o,
      'invalid_request',
      'the API promises field and rule on every 400 (API.md §3). A consumer that drops them keeps the ' +
        'label and loses the only part that says which argument was wrong',
    );
    check(
      '…and the detail carries the field and rule the API sent',
      o !== HUNG && !o.ok && /valuePence/.test(o.detail) && /invalid_format/.test(o.detail),
      `detail="${o !== HUNG && !o.ok ? o.detail : ''}"`,
    );
  } finally {
    bad.close();
  }
}

/**
 * The MCP server itself dies mid-call. PLAN.md §6.1's `transport` row —
 * "nothing comes back" — measured rather than assumed.
 *
 * The server is spawned over stdio exactly as a real client would spawn it,
 * pointed at a socket that never answers so the call is guaranteed to be in
 * flight, and killed. What matters is that the CLIENT learns promptly and by
 * rejection — not by a result, and not by waiting out a 60-second default.
 */
async function probeServerKilledMidCall(): Promise<void> {
  const hang = await hangs();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [require.resolve('ts-node/dist/bin.js'), path.resolve(__dirname, 'server.ts')],
    // EXPLICIT, not inherited. The server under test must not pick up the real
    // token and base URL from this process's environment.
    env: { ...getDefaultEnvironment(), COMMERCE_API_URL: hang.url, COMMERCE_SERVICE_TOKEN: 'irrelevant' },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'break-live', version: '0.1.0' });
  try {
    await client.connect(transport);
    const call = client.callTool({ name: 'get_order', arguments: {} });
    const settled = call.then(
      (r) => ({ kind: 'result' as const, r }),
      (e) => ({ kind: 'rejected' as const, e }),
    );
    await new Promise((r) => setTimeout(r, 300));
    const killedAt = Date.now();
    transport.pid !== null && process.kill(transport.pid!, 'SIGKILL');

    const outcome = await within(5000, settled);
    const took = Date.now() - killedAt;
    const code =
      outcome !== HUNG && outcome.kind === 'rejected' ? (outcome.e as { code?: unknown })?.code : undefined;
    check(
      'a server KILLED MID-CALL rejects the call — no result, no hang',
      outcome !== HUNG && outcome.kind === 'rejected',
      outcome === HUNG
        ? 'NO ANSWER after 5000ms — the client waits out its own default timeout'
        : outcome.kind === 'rejected'
          ? `rejected in ${took}ms, code=${String(code)}, "${String((outcome.e as Error)?.message)}". ` +
            'This is PLAN.md §6.1\'s `transport` row: a rejection, never a result, so it cannot be ' +
            'confused with a tool that ran'
          : 'a RESULT came back from a process that no longer exists',
    );
  } finally {
    hang.close();
    await client.close().catch(() => undefined);
  }
}

/** The negative control for the HARNESS. A check() that cannot fail proves nothing. */
function probeHarnessCanFail(): void {
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before;
  check('the harness counts a failure when one happens', caught, 'a check that has only ever passed proves nothing');
}

// ── orchestration ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const live: ApiConfig = apiConfigFromEnv();
  console.log(`\nStep 6 — break it against the live backend (${live.baseUrl})\n`);

  console.log('CONTROL');
  await probeControl(live);

  console.log('\nTHE LIVE API SAYING NO — each refusal a different owner');
  await probeLiveRefusals(live);

  console.log('\nPLUMBING — the upstream failing in each way it can');
  await probePlumbing(live);

  console.log('\nCONTRACT — the upstream answering, and not in the contract');
  await probeContract(live);

  console.log('\nTHE MCP SERVER ITSELF — killed mid-call, over stdio');
  await probeServerKilledMidCall();

  console.log('\nTHE HARNESS ITSELF');
  probeHarnessCanFail();

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nbreak-live could not run — is the API up on :3610?\n', e);
  process.exit(1);
});
