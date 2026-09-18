/**
 * Does the wire behave the way the plan says it does? Offline, instant, no ports.
 *
 * WHY THIS EXISTS IN THIS SHAPE. `docs/commerce/PLAN.md` §6.1 proposes a
 * five-way failure discriminator, and §11's whole spec format is "every check
 * carries a negative control." Neither is worth anything until the failures can
 * be PRODUCED on demand. `InMemoryTransport.createLinkedPair()` gives a client
 * and a server in one process with no subprocess and no socket, so every plant
 * below is three lines instead of a fixture directory.
 *
 * THE FIRST TWO CASES ARE CONTROLS, NOT FILLER. A server that failed every call
 * would pass every failure assertion in this file. `guard/selftest.ts` makes the
 * same point in its own words — *"the control: a guard that denied everything
 * would pass every denial test below."*
 *
 * WHAT THIS IS NOT. It does not test the NestJS API, the databases, or the
 * model. It tests the protocol layer and nothing else, which is the only reason
 * it can run in milliseconds and be worth running on every change.
 *
 *   pnpm commerce:mcp-check
 */
import { McpServer } from '@modelcontextprotocol/server';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { Client } from '@modelcontextprotocol/client';
import { z } from 'zod';
import { createServer, register } from './server';
import { startOrderStub, STUB } from './stub/order-stub';
import type { Outcome } from './api/outcome';

// ── the harness ─────────────────────────────────────────────────────────────

let failed = 0;

function check(name: string, ok: boolean, why: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        why: ${why}`);
}

/** Connect a client to a server over a linked in-memory pair. No ports. */
async function connected(server: McpServer): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'wire-selftest', version: '0.1.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** The JSON-RPC error code from a rejected request, or undefined if it was not one. */
function errorCodeOf(e: unknown): number | undefined {
  const code = (e as { code?: unknown })?.code;
  return typeof code === 'number' ? code : undefined;
}

/** The first text block of a tool result, for asserting on content. */
function firstText(result: { content?: unknown }): string | undefined {
  const blocks = (result.content ?? []) as Array<{ type?: string; text?: string }>;
  return blocks.find((b) => b.type === 'text')?.text;
}

// ── the planted servers, one per failure we need to be able to produce ───────

/** A tool that RAN and decided the answer is no. The domain refusing, not a fault. */
function serverWithRefusingTool(): McpServer {
  const server = new McpServer({ name: 'plant-refuses', version: '0.0.0' });
  server.registerTool(
    'always_refuses',
    { description: 'Always returns isError.', inputSchema: z.object({}) },
    async () => ({ content: [{ type: 'text', text: 'not in scope for this case' }], isError: true }),
  );
  return server;
}

/** A tool that throws. Infrastructure, not a domain answer — and they must differ. */
function serverWithThrowingTool(): McpServer {
  const server = new McpServer({ name: 'plant-throws', version: '0.0.0' });
  server.registerTool(
    'always_throws',
    { description: 'Always raises.', inputSchema: z.object({}) },
    async () => {
      throw new Error('socket is on fire');
    },
  );
  return server;
}

/** A tool with a real schema, so bad arguments have something to fail against. */
function serverWithTypedTool(): McpServer {
  const server = new McpServer({ name: 'plant-typed', version: '0.0.0' });
  server.registerTool(
    'needs_an_order_id',
    {
      description: 'Takes a required string.',
      inputSchema: z.object({ orderId: z.string().describe('An order id.') }),
    },
    async ({ orderId }) => ({ content: [{ type: 'text', text: `saw ${orderId}` }] }),
  );
  return server;
}

// ── the cases ───────────────────────────────────────────────────────────────

/** CONTROL. Without this, a server that failed everything would pass this file. */
async function probeHappyPath(): Promise<void> {
  const client = await connected(createServer());
  const result = await client.callTool({ name: 'ping', arguments: {} });
  check(
    'the real server answers ping with pong',
    firstText(result) === 'pong',
    'the control — every assertion below is about a FAILURE, and a server that ' +
      'could not succeed would satisfy all of them',
  );
  await client.close();
}

/**
 * CONTROL. The payload that lands in the model's context on every request.
 *
 * ASSERTS THE SET, NOT A COUNT. `tools.length === 1` was the first version and
 * it went red the moment `get_order` was registered — correctly, but it could
 * only say "the number changed", so the fix was to type a new number, which is
 * a check that teaches you to silence it. Naming the tools means an unexpected
 * one is reported BY NAME and a missing one likewise.
 */
const EXPECTED_TOOLS = ['get_order', 'ping'];

async function probeToolsList(): Promise<void> {
  const client = await connected(createServer());
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  check(
    'tools/list publishes exactly the tools we registered',
    names.join(',') === EXPECTED_TOOLS.join(','),
    `published [${names.join(', ')}], expected [${EXPECTED_TOOLS.join(', ')}]. ` +
      'This list IS the prompt the model reads — PLAN.md §10.1 measures its size ' +
      'and its byte-stability, and §7 gates the write path on names from it',
  );
  await client.close();
}

/**
 * PLANT — and a regression test for the Step 1 finding.
 *
 * The plan first predicted -32601 METHOD_NOT_FOUND. The wire says -32602
 * INVALID_PARAMS, because `tools/call` IS a method the server has and `name` is
 * one of its parameters. This case exists so that finding cannot quietly revert.
 */
async function probeUnknownToolCode(): Promise<void> {
  const client = await connected(createServer());
  let code: number | undefined;
  try {
    await client.callTool({ name: 'no_such_tool', arguments: {} });
  } catch (e) {
    code = errorCodeOf(e);
  }
  check(
    'an unknown TOOL is -32602, not -32601',
    code === -32602,
    `got ${code}. -32601 is for a JSON-RPC METHOD that does not exist, which the ` +
      'model cannot ask for. PLAN.md §6.1 depends on this staying true',
  );
  await client.close();
}

/**
 * PLANT. A refusal must arrive as a RESULT the model can read, not as a
 * protocol error — otherwise "the tool said no" and "the tool broke" are the
 * same event and the blame in every eval is unattributable.
 */
async function probeDomainRefusal(): Promise<void> {
  const client = await connected(serverWithRefusingTool());
  const result = await client.callTool({ name: 'always_refuses', arguments: {} });
  check(
    'a tool that refuses returns isError on a 200, not a JSON-RPC error',
    result.isError === true && typeof firstText(result) === 'string',
    'the DOMAIN saying no is a legitimate answer with a readable reason. ' +
      'A throw here would turn a domain outcome into infrastructure noise',
  );
  await client.close();
}

/** PLANT. A throwing tool must not kill the connection or surface as transport death. */
async function probeThrownTool(): Promise<void> {
  const client = await connected(serverWithThrowingTool());
  const result = await client.callTool({ name: 'always_throws', arguments: {} });
  check(
    'a tool that throws is converted into isError, not a dead connection',
    result.isError === true,
    'registry.ts already guarantees this in-process — "an exception that escapes ' +
      'here becomes a 500 and the conversation dies mid-claim." The SDK does the same',
  );
  await client.close();
}

/** PLANT. Bad arguments must be rejected BY THE SERVER, before the handler runs. */
async function probeBadArguments(): Promise<void> {
  const client = await connected(serverWithTypedTool());
  const result = await client.callTool({ name: 'needs_an_order_id', arguments: { orderId: 42 } });
  check(
    'arguments that violate the schema are rejected before the handler runs',
    result.isError === true,
    'a number where a string was declared. This is the class of failure that did ' +
      'not exist in-process and is why PLAN.md §6.1 needs an `invalid_args` cause',
  );
  await client.close();
}

/**
 * THE FINDING. Three causes with three different owners arrive in ONE shape.
 *
 * `ToolCallRecord.cause` exists to keep model-blame and infrastructure-blame
 * apart. Over MCP the server flattens all of it into `isError: true` plus free
 * text, so the protocol DESTROYS the distinction the field is for. This case
 * asserts the collapse rather than wishing it away, because a plan written as
 * though the protocol preserved it would be wrong in a way nothing would catch.
 */
async function probeCausesCollapse(): Promise<void> {
  const shapes = await Promise.all([
    connected(serverWithRefusingTool()).then((c) => c.callTool({ name: 'always_refuses', arguments: {} })),
    connected(serverWithThrowingTool()).then((c) => c.callTool({ name: 'always_throws', arguments: {} })),
    connected(serverWithTypedTool()).then((c) => c.callTool({ name: 'needs_an_order_id', arguments: { orderId: 42 } })),
  ]);
  check(
    'a refusal, a throw and a schema violation are ALL isError:true',
    shapes.every((r) => r.isError === true),
    'the domain said no · the code broke · the model sent the wrong type. Three ' +
      'different owners, one wire shape. See the note below this check',
  );
  const texts = shapes.map((r) => firstText(r) ?? '');
  check(
    'only the validation one is identifiable, and only by a message PREFIX',
    texts[2]!.startsWith('Input validation error:') &&
      !texts[0]!.startsWith('Input validation error:') &&
      !texts[1]!.startsWith('Input validation error:'),
    'the other two are free text a tool author chose. Matching on prose is not a ' +
      'discriminator, it is a guess — so OUR tools must put the cause in ' +
      'structuredContent, because the protocol will not carry it',
  );
}

/**
 * PLANT. An undeclared field is ACCEPTED, silently, and the handler still runs.
 *
 * Zod objects are not strict by default and the SDK does not make them so. The
 * answer contract uses `z.strictObject` for exactly this reason
 * (`coverage-schema.ts`); tool inputs crossing a trust boundary deserve the
 * same, and this check is here so that decision is made deliberately.
 */
async function probeExtraFieldAccepted(): Promise<void> {
  const client = await connected(serverWithTypedTool());
  const result = await client.callTool({
    name: 'needs_an_order_id',
    arguments: { orderId: 'THB-1049', unexpected: 'ignored' },
  });
  check(
    'an undeclared argument is silently accepted',
    result.isError !== true && firstText(result) === 'saw THB-1049',
    'recorded as behaviour, not endorsed. If a tool ever branches on a field it ' +
      'did not declare, nothing here would have stopped the caller supplying one',
  );
  await client.close();
}

// ── Step 4a: the boundary ───────────────────────────────────────────────────

/** The outcome a tool put in structuredContent — the only place the cause survives. */
function outcomeOf(result: { structuredContent?: unknown }): Outcome<any> {
  return result.structuredContent as Outcome<any>;
}

interface Stub {
  url: string;
  close: () => void;
}

async function withStub(): Promise<Stub> {
  const { server, url } = await startOrderStub();
  return { url, close: () => server.close() };
}

function serverAgainst(url: string, caseId: string, token: string = STUB.token): McpServer {
  return createServer({
    api: { baseUrl: url, serviceToken: token },
    session: { caseId, orderId: STUB.orderId },
  });
}

/** The happy path, and the field T3 turns on. */
async function probeGetOrder(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const outcome = outcomeOf(result);
  check(
    'get_order reads a real order across the boundary',
    outcome.ok === true && outcome.data.order.id === STUB.orderId,
    'no database credential in this process — a base URL and a service token. ' +
      'That emptiness is what PLAN.md §4.1 claims and this is where it becomes true',
  );
  check(
    'the prior refund is in the payload, not hidden behind the order total',
    outcome.ok === true && outcome.data.priorRefunds.length === 1 &&
      (firstText(result) ?? '').includes('PRIOR REFUNDS: REF-700118'),
    'T3: £22 already refunded on line L1 of a £208.96 order, which still reads ' +
      'unrefunded at the order level. POL-DOA-002 §4.1 makes this the FIRST check',
  );
  await client.close();
}

/** THE SECURITY PROPERTY. The model cannot name an order, so it cannot ask for one. */
async function probeNoOrderArgument(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const { tools } = await client.listTools();
  const schema = tools.find((t) => t.name === 'get_order')?.inputSchema as
    | { properties?: Record<string, unknown> }
    | undefined;
  check(
    'get_order publishes NO parameters at all',
    Object.keys(schema?.properties ?? {}).length === 0,
    'the order is fixed by the session. A tool with an orderId parameter lets ' +
      'anything that can influence the model reach any order the token can — and ' +
      'that includes text a customer typed into a contact form (T5)',
  );
  await client.close();
}

/**
 * Scope, AND the collapse that protects the order book.
 *
 * A record outside the case and a record that does not exist must answer
 * IDENTICALLY. If they differed, varying one path parameter would enumerate
 * Thornbury's orders without reading a row. PLAN.md §7.1.
 */
async function probeOutOfScope(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, 'CASE-SOMEONE-ELSE'));
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const outcome = outcomeOf(result);
  check(
    'a case that does not own this order gets out_of_scope, not the order',
    outcome.ok === false && outcome.cause === 'out_of_scope',
    `cause=${outcome.ok ? 'ok' : outcome.cause}. The API checks the header ` +
      'independently — a check on our side of the wire is one an attacker is past',
  );
  check(
    'and the refusal says nothing about whether the record exists',
    outcome.ok === false && !/exist|unknown|no such/i.test(outcome.detail),
    `detail="${outcome.ok ? '' : outcome.detail}". "Not found" and "not yours" ` +
      'must be byte-identical or the PAIR of answers is the disclosure',
  );
  await client.close();
}

/** FAIL CLOSED. An unset token must refuse everything, not authenticate nothing. */
async function probeNoToken(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId, ''));
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const outcome = outcomeOf(result);
  check(
    'an unset service token refuses the call',
    outcome.ok === false && result.isError === true,
    'the obvious implementation allows everything when the variable is unset. ' +
      '@fde/guard exists as a package because of that exact shape',
  );
  await client.close();
}

/** THE POINT OF THE ENVELOPE. The cause survives a boundary that erases causes. */
async function probeCauseSurvives(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, 'CASE-SOMEONE-ELSE'));
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const text = firstText(result) ?? '';
  check(
    'the cause is readable from structuredContent, not guessed from prose',
    outcomeOf(result).ok === false && typeof (outcomeOf(result) as any).cause === 'string' &&
      !text.startsWith('Input validation error:'),
    'isError:true alone cannot say whether the domain refused or the socket died. ' +
      'Three causes share that shape, so the tool carries its own — PLAN.md §6.1',
  );
  await client.close();
}

/**
 * THE NEGATIVE CONTROL FOR `register()`'s CENTRAL CATCH.
 *
 * Registers a tool that throws and that does NOT call `guarded()` — the exact
 * mistake a tool author makes once. If the catch lived in each tool instead of
 * in `register`, this arrives as `isError: true` with NO structuredContent and
 * the cause is unrecoverable, because a handler that throws never reaches its
 * return. That is the failure this check exists to make impossible to ship.
 */
async function probeUnguardedToolStillLabelled(): Promise<void> {
  const server = new McpServer({ name: 'plant-unguarded', version: '0.0.0' });
  register(server, {
    name: 'forgets_to_guard',
    config: { title: 'Forgets', description: 'Throws, unguarded.', inputSchema: z.object({}) },
    run: async () => {
      throw new Error('the author forgot to catch');
    },
    render: () => 'unreachable',
  });

  const client = await connected(server);
  const result = await client.callTool({ name: 'forgets_to_guard', arguments: {} });
  const outcome = result.structuredContent as { ok: boolean; cause?: string } | undefined;
  check(
    'a tool that throws and never calls guarded() is STILL labelled',
    outcome?.ok === false && outcome.cause === 'threw',
    `structuredContent=${JSON.stringify(outcome)}. register() wraps every body, so ` +
      'the guarantee does not depend on a tool author remembering — which is the ' +
      'half that cannot be recovered after the fact',
  );
  await client.close();
}

/** The negative control for the HARNESS. A check() that cannot fail proves nothing. */
function probeHarnessCanFail(): void {
  const before = failed;
  check('(negative control) a false assertion is reported as FAIL', false, 'expected to fail');
  const caught = failed === before + 1;
  failed = before; // un-count the deliberate failure
  check(
    'the harness counts a failure when one happens',
    caught,
    'leak-check.mjs plants a synthetic leak on every run for this reason — a ' +
      'check that has only ever passed is indistinguishable from one that cannot fail',
  );
}

// ── orchestration ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\nWire self-test — MCP over InMemoryTransport (no ports, no subprocess)\n');

  console.log('CONTROLS — the server can succeed');
  await probeHappyPath();
  await probeToolsList();

  console.log('\nPLANTED FAILURES — PLAN.md §6.1, one per bucket we must tell apart');
  await probeUnknownToolCode();
  await probeDomainRefusal();
  await probeThrownTool();
  await probeBadArguments();

  console.log('\nWHAT THE PROTOCOL DOES NOT CARRY — PLAN.md §6.1');
  await probeCausesCollapse();
  await probeExtraFieldAccepted();

  console.log('\nSTEP 4a — THE BOUNDARY, against a stub the shape of the real API');
  const stub = await withStub();
  try {
    await probeGetOrder(stub);
    await probeNoOrderArgument(stub);
    await probeOutOfScope(stub);
    await probeNoToken(stub);
    await probeCauseSurvives(stub);
    await probeUnguardedToolStillLabelled();
  } finally {
    stub.close();
  }

  console.log('\nTHE HARNESS ITSELF');
  probeHarnessCanFail();

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
