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
import { McpServer, Server } from '@modelcontextprotocol/server';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { Client } from '@modelcontextprotocol/client';
import { z } from 'zod';
import { createServer, register } from './server';
import { startOrderStub, STUB, STUB_WRITES } from './stub/order-stub';
import { PROPOSED_BY } from './tools/propose-resolution';
import { ownKeys } from './config/env';
import { ok, type Outcome } from './api/outcome';

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
const EXPECTED_TOOLS = ['get_contact_history', 'get_delivery', 'get_order', 'get_policy_rules', 'ping', 'propose_resolution', 'search_policy'];

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
      'model cannot ask for. PLAN.md §6.1 depends on this staying true — and since ' +
      'Step 5, -32602 is NOT the only thing it can mean: see probeLyingServer',
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
    // No index offline: search_policy must REFUSE, labelled — see probeSearchWithoutIndex.
    kb: { connectionString: '' },
  });
}

/** Step 9, offline: with no index URL the search refuses, labelled — it never guesses a database. */
async function probeSearchWithoutIndex(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const result = await client.callTool({ name: 'search_policy', arguments: { query: 'return window for electronics' } });
  const outcome = outcomeOf(result);
  check(
    'search_policy with COMMERCE_KB_URL unset refuses, labelled unauthorized',
    result.isError === true && outcome.ok === false && outcome.cause === 'unauthorized',
    `cause=${outcome.ok ? 'ok' : outcome.cause}. Fail closed, like the API token: an unset credential is a refusal, not a default`,
  );
  await client.close();
}

/** The happy path, and the field T3 turns on. */
async function probeGetOrder(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const outcome = outcomeOf(result);
  check(
    'get_order reads a real order across the boundary',
    outcome.ok === true && outcome.data.order.id === STUB.orderId,
    "no credential to Thornbury's databases in this process — a base URL and a service token. " +
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

/**
 * THE SECURITY PROPERTY. The model cannot name an order, so it cannot ask for one.
 *
 * Extended 2026-09-27 to EVERY tool that reads customer data. get_delivery and
 * get_contact_history reach further than get_order does — the route, the
 * driver's reports, every message the customer ever sent — so the property
 * matters more for them, not less.
 */
const CUSTOMER_DATA_TOOLS = ['get_order', 'get_delivery', 'get_contact_history'];

async function probeNoOrderArgument(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const { tools } = await client.listTools();
  const withParams = CUSTOMER_DATA_TOOLS.filter((name) => {
    const schema = tools.find((t) => t.name === name)?.inputSchema as
      | { properties?: Record<string, unknown> }
      | undefined;
    return !schema || Object.keys(schema.properties ?? {}).length > 0;
  });
  check(
    `the customer-data tools (${CUSTOMER_DATA_TOOLS.join(', ')}) publish NO parameters at all`,
    withParams.length === 0,
    `${withParams.length ? `PARAMETERS ON: ${withParams.join(', ')}. ` : ''}The case is fixed by the session. ` +
      'A tool with an orderId or customerId parameter lets anything that can influence the ' +
      'model reach any record the token can — and that includes text a customer typed ' +
      'into a contact form (T5)',
  );
  const rules = tools.find((t) => t.name === 'get_policy_rules')?.inputSchema as
    | { properties?: Record<string, unknown>; required?: string[] }
    | undefined;
  check(
    '…and get_policy_rules, which reads no customer data, takes the question as arguments',
    ['category', 'channel', 'valuePence'].every((k) => rules?.required?.includes(k)) &&
      !Object.keys(rules?.properties ?? {}).some((k) => /order|customer|case/i.test(k)),
    `required=[${rules?.required?.join(', ')}]. Policy rows are nobody's record, so there is ` +
      'no confused deputy — and T2 needs the model to ask about a category the product is not filed under',
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
    data: z.object({}),
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

// ── Step 5: typed results ───────────────────────────────────────────────────
//
// Every check below was a scratch measurement first (2026-09-27). They are
// here so the measurements outlive the session that made them: three of them
// pin SDK behaviour this package's design depends on, and one of them is the
// design itself.

/**
 * PIN. The union goes out object-rooted, and nothing is re-nested.
 *
 * On the 2025 era — which is what stdio and InMemoryTransport negotiate
 * (`2025-11-25`, measured) — the SDK wraps `structuredContent` as `{result: …}`
 * when the advertised schema's root is not `type: "object"`. A success/failure
 * union looks like exactly that. If a later SDK publishes it as a bare `oneOf`,
 * `ok` and `cause` move one level down and every reader silently misses them.
 */
async function probeOutputSchemaIsObjectRooted(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const { tools } = await client.listTools();
  const schema = tools.find((t) => t.name === 'get_order')?.outputSchema as
    | { type?: string; oneOf?: unknown[] }
    | undefined;
  check(
    'get_order publishes an outputSchema: object-rooted, both halves of the envelope',
    schema?.type === 'object' && schema.oneOf?.length === 2,
    `root type=${schema?.type}, oneOf=${schema?.oneOf?.length}. The failure half is ` +
      'the one that carries the cause — a success-only schema would leave it undeclared',
  );
  const unrooted = tools
    .filter((t) => t.name !== 'ping')
    .filter((t) => (t.outputSchema as { type?: string } | undefined)?.type !== 'object')
    .map((t) => t.name);
  check(
    '…and so does every other Thornbury tool',
    unrooted.length === 0,
    unrooted.length ? `NOT object-rooted: ${unrooted.join(', ')}` : 'register() publishes it for every tool, so none can be added without one',
  );
  const result = await client.callTool({ name: 'get_order', arguments: {} });
  const sc = result.structuredContent as Record<string, unknown> | undefined;
  check(
    '…and structuredContent arrives un-nested, ok at the top level',
    sc?.ok === true && !('result' in (sc ?? {})),
    `keys=[${Object.keys(sc ?? {}).join(', ')}]. A {result: …} wrap here means the SDK ` +
      'treated the root as non-object, and every reader of .ok and .cause is now wrong',
  );
  await client.close();
}

/**
 * MEASURED SDK BEHAVIOUR — the reason register() checks first.
 *
 * A plain `registerTool` with an `outputSchema`, whose handler returns a success
 * that breaks it. The SDK notices, and replaces the ENTIRE result: our
 * structuredContent, cause and all, is gone, and what arrives is free text.
 */
async function probeSdkDropsCauseOnBadSuccess(): Promise<void> {
  const server = new McpServer({ name: 'plant-bad-output', version: '0.0.0' });
  server.registerTool(
    'bad_output',
    { description: 'Declares a number, returns a string.', inputSchema: z.object({}), outputSchema: z.object({ n: z.number() }) },
    async () => ({ content: [{ type: 'text', text: 'hi' }], structuredContent: { n: 'not a number' } as any }),
  );
  const client = await connected(server);
  const result = await client.callTool({ name: 'bad_output', arguments: {} });
  check(
    'the SDK\'s own output check ERASES structuredContent on a mismatch',
    result.isError === true && result.structuredContent === undefined &&
      (firstText(result) ?? '').startsWith('Output validation error:'),
    `isError=${result.isError}, structuredContent=${JSON.stringify(result.structuredContent)}. ` +
      'Recorded, not endorsed: left to the SDK, a bug in our tool reaches the model ' +
      'as prose with no cause — the blind spot Step 6 closed at the API boundary',
  );
  await client.close();
}

/** MEASURED SDK BEHAVIOUR. An isError result is never output-checked — so a label survives. */
async function probeErrorResultsSkipValidation(): Promise<void> {
  const server = new McpServer({ name: 'plant-labelled-error', version: '0.0.0' });
  server.registerTool(
    'says_no',
    { description: 'Declares a number, refuses.', inputSchema: z.object({}), outputSchema: z.object({ n: z.number() }) },
    async () => ({
      content: [{ type: 'text', text: 'no' }],
      structuredContent: { ok: false, cause: 'out_of_scope', detail: 'x' } as any,
      isError: true,
    }),
  );
  const client = await connected(server);
  const result = await client.callTool({ name: 'says_no', arguments: {} });
  check(
    'an isError result passes the output check untouched, structuredContent intact',
    result.isError === true && outcomeOf(result)?.ok === false &&
      (outcomeOf(result) as { cause?: string }).cause === 'out_of_scope',
    'both the server and the client skip output validation when isError is set. ' +
      'This is what lets register() convert a bad success into a LABELLED failure ' +
      'the SDK will then leave alone',
  );
  await client.close();
}

/**
 * THE DESIGN. The same mistake, through register(), arrives labelled.
 *
 * STEP 5's own stop-check — "break the handler's return shape on purpose and
 * watch the server reject it" — with the part the step did not ask for: the
 * rejection has to say whose it was.
 */
async function probeBadSuccessLabelled(): Promise<void> {
  const server = new McpServer({ name: 'plant-bad-output-registered', version: '0.0.0' });
  register(server, {
    name: 'bad_output',
    config: { title: 'Bad output', description: 'Declares a number, returns a string.', inputSchema: z.object({}) },
    data: z.object({ n: z.number() }),
    run: async () => ok({ n: 'not a number' } as any),
    render: (o) => (o.ok ? 'fine' : `failed: ${o.detail}`),
  });
  const client = await connected(server);
  const result = await client.callTool({ name: 'bad_output', arguments: {} });
  const outcome = outcomeOf(result) as { ok?: boolean; cause?: string; detail?: string } | undefined;
  check(
    'a success that breaks its own declared shape arrives as invalid_output, LABELLED',
    result.isError === true && outcome?.ok === false && outcome.cause === 'invalid_output' &&
      /\bn\b/.test(outcome.detail ?? ''),
    `structuredContent=${JSON.stringify(outcome)}. register() checks before the SDK ` +
      'does, so the SDK never sees a mismatch it could erase. Remove conforming() ' +
      'from register() and this is the check that goes red',
  );
  await client.close();
}

/**
 * MEASURED CLIENT BEHAVIOUR — and a correction to a claim in four documents.
 *
 * A server that advertises one output shape and returns another. Our server
 * cannot do this (register() and then the SDK both check first); a server we
 * do not control can. What the CLIENT does depends on whether it listed tools
 * before calling: if it did, it throws -32602; if it did not, it accepts the
 * mismatch silently.
 *
 * So once any tool declares an outputSchema, -32602 from tools/call has TWO
 * meanings — an unknown tool name, or a server whose output broke its own
 * advertised schema — and the structural way to tell them apart is whether the
 * name is in the last tools/list. Step 10's client must also ALWAYS list before
 * calling, or its output check switches off without a word.
 */
function lyingServer(): Server {
  const server = new Server({ name: 'plant-liar', version: '0.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler('tools/list', async () => ({
    tools: [{
      name: 'liar',
      description: 'Advertises a number, returns a string.',
      inputSchema: { type: 'object' as const, properties: {} },
      outputSchema: { type: 'object' as const, properties: { n: { type: 'number' } }, required: ['n'] },
    }],
  }));
  server.setRequestHandler('tools/call', async () => ({
    content: [{ type: 'text' as const, text: 'hi' }],
    structuredContent: { n: 'a string' },
  }));
  return server;
}

async function probeLyingServer(): Promise<void> {
  const listed = await connected(lyingServer() as unknown as McpServer);
  await listed.listTools();
  let code: number | undefined;
  let message = '';
  try {
    await listed.callTool({ name: 'liar', arguments: {} });
  } catch (e) {
    code = errorCodeOf(e);
    message = String((e as Error)?.message);
  }
  check(
    'a KNOWN tool whose output breaks its advertised schema is ALSO -32602',
    code === -32602 && /does not match the tool's output schema/.test(message),
    `code=${code}, "${message.slice(0, 90)}". So -32602 no longer means only "no such ` +
      'tool": the name-in-tools/list cross-check is load-bearing again for Step 10',
  );
  await listed.close();

  const unlisted = await connected(lyingServer() as unknown as McpServer);
  let accepted = false;
  try {
    const r = await unlisted.callTool({ name: 'liar', arguments: {} });
    accepted = (r.structuredContent as { n?: unknown })?.n === 'a string';
  } catch {
    accepted = false;
  }
  check(
    '…but a client that never listed tools accepts the same mismatch SILENTLY',
    accepted,
    'the client validates against the schema it cached from tools/list. No list, ' +
      'no cache, no check — and no warning that the check is off',
  );
  await unlisted.close();
}

/**
 * THE WRITE TAKES `kind` AND `amountPence` AND NOTHING ELSE THAT MATTERS.
 *
 * Sends exactly the arguments an injected message would want — another case,
 * a person's name as the proposer, an approver — and asserts what the STUB
 * RECEIVED, not what came back. T5b's "Dave already approved it" must not be
 * able to write "Dave" anywhere.
 */
async function probeProposeTakesOnlyKindAndAmount(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, STUB.caseId));
  const before = STUB_WRITES.length;
  const result = await client.callTool({
    name: 'propose_resolution',
    arguments: { kind: 'partial_refund', amountPence: 2200, caseId: 'CAS-SOMEONE-ELSE', proposedBy: 'Dave', approvedBy: 'Dave' },
  });
  const sent = STUB_WRITES[before];
  const outcome = outcomeOf(result);
  check(
    'propose_resolution writes a DRAFT on the SESSION\'s case, proposed by the server\'s fixed label',
    outcome.ok === true && outcome.data.resolution.status === 'proposed' &&
      sent?.caseId === STUB.caseId && sent?.proposedBy === PROPOSED_BY && !('approvedBy' in (sent ?? {})),
    `the stub received ${JSON.stringify(sent)}. The model sent caseId, proposedBy and approvedBy too; ` +
      'none of them reached the API. PLAN.md §14 q4: it IS a write — a draft other people read — and moves no money',
  );
  await client.close();
}

/** A draft on a case this session does not own is a labelled refusal, not a write. */
async function probeProposeOutOfScope(stub: Stub): Promise<void> {
  const client = await connected(serverAgainst(stub.url, 'CASE-SOMEONE-ELSE'));
  const result = await client.callTool({ name: 'propose_resolution', arguments: { kind: 'full_refund', amountPence: 100 } });
  const outcome = outcomeOf(result);
  check(
    'a draft for a case the session does not own is out_of_scope, labelled',
    result.isError === true && outcome.ok === false && outcome.cause === 'out_of_scope',
    `cause=${outcome.ok ? 'ok — A WRITE LANDED' : outcome.cause}`,
  );
  await client.close();
}

/**
 * THE PROCESS, NOT JUST THE CODE, HOLDS NO DATABASE CREDENTIAL.
 *
 * A planted .env with the estate's admin URL, another engagement's database
 * URL and a model key beside this server's own keys. Only the server's keys
 * may come through.
 */
function probeEnvAllowlist(): void {
  const planted = {
    ECOMMERCE_DB_URL: 'postgresql://admin:x@h/db',
    ECOMMERCE_DB_DIRECT_URL: 'postgresql://admin:x@h/db',
    PHARMA_DATABASE_URL: 'postgresql://x',
    HOSTED_API_KEY: 'k',
    COMMERCE_SERVICE_TOKEN: 't',
    COMMERCE_KB_URL: 'postgresql://reader:x@h/thb_kb',
    EMBEDDINGS: 'local',
  };
  const kept = Object.keys(ownKeys(planted)).sort();
  check(
    'loading the workspace .env gives this server its OWN keys and no estate credential',
    kept.join(',') === 'COMMERCE_KB_URL,COMMERCE_SERVICE_TOKEN,EMBEDDINGS',
    `kept [${kept.join(', ')}] of a planted file that also held ECOMMERCE_DB_URL, another ` +
      "engagement's URL and a model key. api/client.ts's claim is about the PROCESS, so the load is an allowlist",
  );
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

    console.log('\nTHE ONE WRITE — propose_resolution, against the stub');
    await probeProposeTakesOnlyKindAndAmount(stub);
    await probeProposeOutOfScope(stub);
    await probeSearchWithoutIndex(stub);

    console.log('\nSTEP 5 — TYPED RESULTS: the shape published, and enforced where the cause survives');
    await probeOutputSchemaIsObjectRooted(stub);
    await probeSdkDropsCauseOnBadSuccess();
    await probeErrorResultsSkipValidation();
    await probeBadSuccessLabelled();
    await probeLyingServer();
  } finally {
    stub.close();
  }

  console.log('\nTHE PROCESS — what it loads');
  probeEnvAllowlist();

  console.log('\nTHE HARNESS ITSELF');
  probeHarnessCanFail();

  console.log(`\n${failed === 0 ? 'all checks passed' : `${failed} FAILED`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
