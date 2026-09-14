/**
 * Compliance self-test for the MASTRA loop. Offline: fake transport, fake token,
 * no credential, no spend.
 *
 * WHY A SECOND FILE. `compliance-selftest.ts` asserts against `loop-sdk.ts` by
 * handing it a fake OpenAI client and reading the captured params. None of that
 * reaches this path — different provider, different transport, different request
 * shape. Adding an engine without adding its own wire assertions would leave a
 * loop with ZERO verified data-egress properties while a green suite implied
 * otherwise.
 *
 * WHAT IS ASSERTED, and why each one:
 *
 *   1. A request was actually built. Without this every check below is vacuous —
 *      the mistake `scorecard.ts` and `chunker.ts` both record.
 *   2. The registered tools reach the request. This check exists because a loop
 *      once shipped with ZERO tools and two eval cases passed anyway, both being
 *      escalation cases: a model with nothing to search with escalates.
 *   3. `response_format` is a STRICT json_schema, not `json_object`. The AI SDK
 *      sends json_object unless `supportsStructuredOutputs` is set, which is
 *      "some JSON" rather than "this shape" — a silent downgrade of Pillar 3.
 *   4. Exactly one host is contacted, and it is ours. Mastra ships an
 *      observability layer; the Agents SDK shipped tracing to api.openai.com
 *      that was ON by default. Assume nothing.
 *   5. No conversation state is requested server-side.
 *
 *   pnpm compliance:mastra
 */
import { z } from 'zod';
import type { ComplianceFixture } from '../sdk/compliance-sdk';
import { ToolRegistry } from '../core/registry';
import { buildFoundryProvider, toMastraTools } from './loop-mastra';

const { Agent } = require('@mastra/core/agent');

const captured: { url: string; body: any }[] = [];
const otherHosts: string[] = [];

/** A minimal OpenAI-shaped chat completion, so the run finishes cleanly. */
function cannedResponse(): Response {
  const body = {
    id: 'chatcmpl-fake',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-5-mini',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: '{"ok":true}' },
        finish_reason: 'stop',
      },
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

export async function runMastraComplianceCheck(fixture: ComplianceFixture): Promise<number> {
  console.log('\nCompliance self-test — the Mastra loop (loop-mastra.ts)\n');

  // Catch anything that bypasses our transport: telemetry, a second exporter,
  // a phone-home on first use. Same trick the SDK self-test uses.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init: any) => {
    otherHosts.push(String(url?.url ?? url));
    return realFetch(url, init);
  }) as any;

  const registry = new ToolRegistry([stubTool(fixture.toolName ?? 'search_tool')]);

  const provider = buildFoundryProvider({
    baseURL: 'https://compliance.test/openai/v1',
    token: async () => 'fake-token-not-a-credential',
    fetch: (async (url: any, init: any = {}) => {
      let body: any = undefined;
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
      } catch {
        body = init?.body;
      }
      captured.push({ url: String(url), body });
      return cannedResponse();
    }) as any,
  });

  const agent = new Agent({
    name: 'compliance',
    instructions: 'test',
    // `.languageModel`, matching what `selectModel` now calls in production.
    // It said `.chatModel` until 2026-09-14, which is exactly the drift this
    // file's own header warns about: the Bedrock swap moved production onto the
    // shared `ProviderV4` spelling and left the check asserting against the
    // openai-compatible-only one. Both were then measured to put a
    // byte-identical request on the wire, so nothing regressed — but the check
    // had stopped being able to notice either way.
    model: provider.languageModel('gpt-5-mini'),
    tools: toMastraTools(registry, [], {}),
  });

  try {
    // The question comes from the fixture: a compliance package that shipped
    // one customer's vocabulary would put it on the wire at every other.
    await agent.generate(fixture.question ?? 'test question', {
      maxSteps: 2,
      structuredOutput: { schema: z.object({ ok: z.boolean() }) },
    });
  } catch {
    // The canned response is deliberately minimal; a parse complaint downstream
    // does not matter. What matters is the request we captured on the way out.
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

  const body = captured[0]?.body ?? {};

  const toolNames: string[] = (body.tools ?? []).map(
    (t: any) => t?.function?.name ?? t?.name,
  );
  check(
    toolNames.includes(fixture.toolName ?? 'search_tool'),
    'registered tools reach the request',
    toolNames.length
      ? `tools on the wire: ${toolNames.join(', ')}`
      : 'NO tools in the request — the model would answer from nothing',
  );

  const rf = body.response_format;
  check(
    rf?.type === 'json_schema',
    'structured output is a strict json_schema',
    rf
      ? `response_format.type = ${rf.type}` +
          (rf.type === 'json_object'
            ? ' — "some JSON", not "this shape". supportsStructuredOutputs is not set.'
            : '')
      : 'no response_format on the request at all',
  );

  check(
    body.store === undefined || body.store === false,
    'no server-side retention requested',
    `store = ${JSON.stringify(body.store)} (absent is correct for this API surface)`,
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

  const naive = buildFoundryProvider({
    baseURL: 'https://compliance.test/openai/v1',
    token: async () => 'fake',
    fetch: (async (_u: any, init: any = {}) => {
      naiveBodies.push(typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body);
      return cannedResponse();
    }) as any,
  });
  const naiveAgent = new Agent({
    name: 'naive',
    instructions: 'test',
    model: naive.languageModel('gpt-5-mini'),
    // NO tools, and NO structuredOutput below.
  });
  try {
    await naiveAgent.generate('hello', { maxSteps: 1 });
  } catch {
    /* same as above */
  }

  const nb = naiveBodies[0] ?? {};
  check(
    (nb.tools ?? []).length === 0,
    'control: an agent without tools sends none',
    'so the tools check above is reading the request rather than always passing',
  );
  check(
    nb.response_format === undefined,
    'control: without structuredOutput there is no response_format',
    `response_format = ${JSON.stringify(nb.response_format)} — so the schema check can fail`,
  );

  console.log(
    failed === 0
      ? '\ncompliance (mastra): PASS — strict schema, tools on the wire, one host, and both checks shown capable of failing\n'
      : `\ncompliance (mastra): FAIL — ${failed} problem(s)\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

const naiveBodies: any[] = [];

