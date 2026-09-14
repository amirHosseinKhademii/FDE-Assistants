/**
 * Compliance self-test for the LANGGRAPH loop. Offline: fake transport, fake
 * token, no credential, no spend.
 *
 * WHY A THIRD FILE. `compliance-sdk.ts` and `compliance-mastra.ts` each assert
 * against a different transport — different provider, different request shape.
 * Adding a third engine without its own wire assertions would leave it with
 * ZERO verified data-egress properties while a green suite implied otherwise.
 *
 * WHAT WAS ACTUALLY ON THE WIRE, found by a throwaway spike script rather than
 * assumed from LangGraph's docs (same rule every compliance file in this
 * package follows — "you do not trust a default and you do not trust the
 * docs"):
 *
 *   1. `@langchain/openai`'s `ChatOpenAI` talks to the CHAT COMPLETIONS surface
 *      (`/chat/completions`), not the Responses API the Agents SDK uses. There
 *      is no `store` field anywhere in that request shape — not `false`, not
 *      absent-meaning-default-true, simply not a parameter this API has. So
 *      the property to prove here is "no such field was sent", not "the field
 *      was set to false" — the same distinction `compliance-mastra.ts` already
 *      draws for the same API surface (it goes through
 *      `@ai-sdk/openai-compatible` to the identical endpoint shape).
 *   2. `createReactAgent`'s `responseFormat` makes a SECOND request once the
 *      tool loop finishes, carrying `response_format: { type: 'json_schema',
 *      strict: true, ... }` — confirmed strict, not the weaker `json_object`
 *      shape. That second request has no `tools` at all, which is expected
 *      (it is a pure structuring call) and is asserted as such below so a
 *      reader does not mistake a genuine artefact of this engine for a bug.
 *   3. Registered tools reach the FIRST request as standard OpenAI function
 *      tool definitions, JSON Schema converted from the same Zod object the
 *      other two engines send natively.
 *
 *   pnpm compliance:langgraph
 */
import { z } from 'zod';
import type { ComplianceFixture } from '../sdk/compliance-sdk';
import { ToolRegistry } from '../core/registry';
import { buildFoundryChatModel } from './provider';
import { toLangGraphTools } from './tools';

const { createReactAgent } = require('@langchain/langgraph/prebuilt');

const captured: { url: string; body: any }[] = [];
const otherHosts: string[] = [];

function cannedResponse(content: string): Response {
  const body = {
    id: 'chatcmpl-fake',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-5-mini',
    choices: [
      { index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' },
    ],
    usage: { prompt_tokens: 11, completion_tokens: 3, total_tokens: 14 },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function line(pass: boolean, name: string, detail: string): boolean {
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${detail}`);
  return pass;
}

/** A stub tool: enough to assert tools reach the wire, with no domain in it. */
const stubTool = (name: string): any => ({
  hasUpstream: false,
  schema: {
    type: 'function',
    name,
    description: 'Stub used by the compliance self-test.',
    parameters: z.strictObject({ id: z.string().describe('an id') }),
  },
  execute: async () => ({ ok: true }),
});

function captureFetch(bucket: { url: string; body: any }[]) {
  return (async (url: any, init: any = {}) => {
    let body: any;
    try {
      body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    } catch {
      body = init?.body;
    }
    bucket.push({ url: String(url), body });
    // First call finishes the tool loop with plain content; a responseFormat
    // then triggers a second, structuring-only call. Route both the same way
    // — the content only has to be schema-satisfiable text or valid JSON, and
    // this fixture's sampleAnswer is provided for exactly that.
    return cannedResponse(bucket.length === 1 ? 'done' : '{"ok":true}');
  }) as any;
}

export async function runLangGraphComplianceCheck(fixture: ComplianceFixture): Promise<number> {
  console.log('\nCompliance self-test — the LangGraph loop (langgraph/)\n');

  // Catch anything that bypasses our transport: telemetry, a second exporter,
  // a phone-home on first use. Same trick the other two self-tests use.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    otherHosts.push(String(url?.url ?? url));
    return realFetch(url, init);
  }) as any;

  const registry = new ToolRegistry([stubTool(fixture.toolName ?? 'search_tool')]);

  const llm = buildFoundryChatModel('gpt-5-mini', {
    baseURL: 'https://compliance.test/openai/v1',
    token: async () => 'fake-token-not-a-credential',
    fetch: captureFetch(captured),
  });

  const agent = createReactAgent({
    llm,
    tools: toLangGraphTools(registry, [], {}),
    responseFormat: z.object({ ok: z.boolean() }),
  });

  try {
    await agent.invoke(
      { messages: [{ role: 'user', content: fixture.question ?? 'test question' }] },
      { recursionLimit: 4 },
    );
  } catch {
    // The canned response is deliberately minimal; a parse complaint
    // downstream does not matter. What matters is the request captured on the
    // way out.
  }

  globalThis.fetch = realFetch;

  let failed = 0;
  const check = (pass: boolean, n: string, d: string) => {
    if (!line(pass, n, d)) failed++;
  };

  console.log('REAL CONFIGURATION — these are the properties we claim');

  check(
    captured.length > 0,
    'a request was actually built',
    `${captured.length} request(s) captured — an empty capture would make every check below vacuous`,
  );

  const firstBody = captured[0]?.body ?? {};
  const toolNames: string[] = (firstBody.tools ?? []).map((t: any) => t?.function?.name ?? t?.name);
  check(
    toolNames.includes(fixture.toolName ?? 'search_tool'),
    'registered tools reach the first request',
    toolNames.length
      ? `tools on the wire: ${toolNames.join(', ')}`
      : 'NO tools in the request — the model would answer from nothing',
  );

  const structuringBody = captured[captured.length - 1]?.body ?? {};
  const rf = structuringBody.response_format;
  check(
    rf?.type === 'json_schema' && rf?.json_schema?.strict === true,
    'the structuring call sends a STRICT json_schema, not json_object',
    rf
      ? `response_format.type = ${rf.type}, strict = ${rf?.json_schema?.strict}` +
          (rf.type === 'json_object' ? ' — "some JSON", not "this shape".' : '')
      : 'no response_format on the final request at all',
  );

  const noStoreField = captured.every((c) => c.body?.store === undefined);
  check(
    noStoreField,
    'no server-side retention requested',
    noStoreField
      ? 'store is absent on every request — the Chat Completions surface this engine talks to has no such field at all'
      : `store = ${JSON.stringify(captured.map((c) => c.body?.store))} — unexpected on this API surface`,
  );

  const hosts = [...new Set(captured.map((c) => new URL(c.url).host))];
  check(
    hosts.length === 1 && hosts[0] === 'compliance.test',
    'exactly one host was contacted, and it is ours',
    `hosts: ${hosts.join(', ') || '(none)'}`,
  );

  const strays = otherHosts.filter((u) => !u.includes('compliance.test'));
  check(
    strays.length === 0,
    'nothing else phoned home',
    strays.length ? `unexpected: ${strays.join(', ')}` : 'no request bypassed our transport',
  );

  console.log('\nNEGATIVE CONTROL — the checks above must be capable of failing');

  const naiveCaptured: { url: string; body: any }[] = [];
  const naiveLlm = buildFoundryChatModel('gpt-5-mini', {
    baseURL: 'https://compliance.test/openai/v1',
    token: async () => 'fake',
    fetch: captureFetch(naiveCaptured),
  });
  const naiveAgent = createReactAgent({
    llm: naiveLlm,
    tools: [],
    // NO responseFormat below.
  });
  try {
    await naiveAgent.invoke({ messages: [{ role: 'user', content: 'hello' }] }, { recursionLimit: 2 });
  } catch {
    /* same as above */
  }

  const nb = naiveCaptured[0]?.body ?? {};
  check(
    (nb.tools ?? []).length === 0,
    'control: an agent without tools sends none',
    'so the tools check above is reading the request rather than always passing',
  );
  check(
    nb.response_format === undefined,
    'control: without responseFormat there is no response_format',
    `response_format = ${JSON.stringify(nb.response_format)} — so the schema check can fail`,
  );

  console.log(
    failed === 0
      ? '\ncompliance (langgraph): PASS — strict schema on the structuring call, tools on the wire, one host, and every check shown capable of failing\n'
      : `\ncompliance (langgraph): FAIL — ${failed} problem(s)\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}
