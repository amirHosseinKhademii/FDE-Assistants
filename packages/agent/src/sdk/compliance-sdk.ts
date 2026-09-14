/**
 * The compliance test for the SDK engine. `pnpm compliance:check`.
 *
 * WHAT THIS IS FOR. `sdk/` sets two non-default options — `store: false`
 * and `setTracingDisabled(true)` — and the entire data-protection story rests on
 * them. A comment saying "we set store to false" is worth nothing: it is not
 * checked, it drifts, and an SDK upgrade can change a default underneath it.
 * This file asserts both ON THE WIRE, so the claim is testable rather than
 * aspirational.
 *
 * This is the pattern worth carrying to any engagement:
 *
 *   ADOPT THE FRAMEWORK, THEN PIN THE COMPLIANCE-CRITICAL BEHAVIOUR WITH A
 *   TEST THAT FAILS THE BUILD.
 *
 * You do not trust a default and you do not trust the docs.
 *
 * WHY THE NEGATIVE CONTROLS. PROGRESS.md section 2.7 records a check that
 * reported `orphans: 0` for months while never having executed once — "a check
 * that cannot fail reads like evidence while proving nothing." Every assertion
 * here is therefore paired with a case that makes it fail on purpose. If a
 * control ever stops failing, the corresponding check has silently stopped
 * checking.
 *
 * WHY THE FAKE OPENAI_API_KEY. The SDK's tracing exporter posts to
 * `https://api.openai.com/v1/traces/ingest`, and skips silently when no key is
 * present. We authenticate to Foundry with DefaultAzureCredential and set no
 * OpenAI key, so today the export would no-op — but that is safety by accident.
 * The moment someone adds OPENAI_API_KEY to a .env for an unrelated reason,
 * claim text starts leaving for a US endpoint. So this test sets a key on
 * purpose: it asserts the property that actually matters, which is that
 * tracing stays off EVEN WHEN a key exists to export with.
 */
import { setTraceProcessors, setTracingDisabled } from '@openai/agents';
import { ToolRegistry } from '../core/registry';
import { runLoopSdk } from './loop';

/**
 * What these checks need from YOUR application.
 *
 * Everything else they assert is a property of the TRANSPORT — whether the
 * provider is asked to retain your data, whether conversation state lives on
 * their servers, whether tracing phones home, how many hosts get contacted.
 * None of that is domain-specific, and all of it is what a regulated customer
 * asks about first.
 */
export interface ComplianceFixture {
  /** A schema-valid answer, so the loop reaches a clean finish rather than retrying. */
  sampleAnswer: string;
  /** The strict response format the loop should send. */
  responseFormat: any;
  /** Your validator — the loop ships none, deliberately. */
  validate: (raw: string) => any;
  /** Name of the stub tool asserted to reach the wire. */
  toolName?: string;
  /** The question to send. Any string; it never reaches a real model. */
  question?: string;
}

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

interface Captured {
  params: any[];
}

/**
 * A tool that does nothing, purely so we can assert it reaches the wire.
 *
 * This exists because of a real bug: the first version of the loop built its
 * tool array and then forgot to pass it to `new Agent(...)`. The model got zero
 * tools and answered from nothing. The eval suite caught it — but two cases
 * PASSED anyway, because both are escalation cases and a model with no tools
 * escalates. Green for entirely the wrong reason, which is the failure mode
 * PROGRESS.md keeps warning about. A wiring check is cheaper than re-learning
 * that lesson.
 */
const stubTool = (name: string): any => ({
  schema: {
    type: 'function',
    name,
    description: 'Stub used by the self-test.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'query' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  hasUpstream: false,
  execute: async () => ({ results: [] }),
});

/**
 * Stands in for the configured Foundry client. Records every request the SDK
 * builds, which is what "on the wire" means here — this is the exact object
 * that would have been serialised and sent.
 */
function fakeClient(captured: Captured, answer: string): any {
  return {
    responses: {
      create: async (params: any) => {
        captured.params.push(params);
        return {
          id: 'resp_fake',
          object: 'response',
          created_at: Math.floor(Date.now() / 1000),
          model: 'gpt-5-mini',
          status: 'completed',
          output: [
            {
              id: 'msg_fake',
              type: 'message',
              role: 'assistant',
              status: 'completed',
              content: [{ type: 'output_text', text: answer, annotations: [] }],
            },
          ],
          output_text: answer,
          usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
        };
      },
    },
  };
}

/** Records any span the tracing provider dispatches. Silence is the pass. */
function spyProcessor(seen: string[]) {
  return {
    onTraceStart: async (t: any) => void seen.push(`trace:${t?.traceId ?? '?'}`),
    onTraceEnd: async () => {},
    onSpanStart: async (s: any) => void seen.push(`span:${s?.type ?? '?'}`),
    onSpanEnd: async () => {},
    shutdown: async () => {},
    forceFlush: async () => {},
  } as any;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

let failures = 0;

function check(name: string, pass: boolean, detail: string): void {
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${detail}`);
  if (!pass) failures++;
}

/**
 * ONE fake client for the whole process, deliberately.
 *
 * `setDefaultOpenAIClient` is FIRST-WRITE-WINS: the SDK caches the client the
 * first time a model is resolved and ignores later calls. An earlier version of
 * this file called `resetSdkConfiguration()` and handed each scenario its own
 * client, which looked reasonable and silently sent every request after the
 * first to the wrong recorder — the second scenario captured zero requests
 * while appearing to pass. The assertions that mattered still held (spans and
 * tracing state are global), but the capture was a fiction.
 *
 * So: one client, one capture array, and scenarios differ only in global
 * tracing state. If you need a genuinely separate client, construct
 * `OpenAIResponsesModel` explicitly — see the naive control at the bottom.
 */
const captured: Captured = { params: [] };
const fetched: string[] = [];
const spans: string[] = [];

/** Drive the real loop once, exactly as `ask` and `eval` do. */
async function exercise(fixture: ComplianceFixture): Promise<void> {
  const CLIENT = fakeClient(captured, fixture.sampleAnswer);
  await runLoopSdk(CLIENT, 'gpt-5-mini', new ToolRegistry([stubTool(fixture.toolName ?? 'search_tool')]), 'test question', {
    system: 'test',
    responseFormat: fixture.responseFormat,
    // Same validator production uses. A compliance test that drove a
    // DIFFERENT construction would prove nothing — the trap sdk/
    // records from its own history.
    validate: fixture.validate,
  });
}

export async function runSdkComplianceCheck(fixture: ComplianceFixture): Promise<number> {
  console.log('\nCompliance self-test — the agent loop (sdk/)\n');

  // Anything reaching the network at all should show up as a URL, not a silent
  // pass. Restored in the finally block.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any) => {
    fetched.push(String(url?.url ?? url));
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as any;

  // The scenario that matters: a key IS available to export traces with.
  const priorKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'sk-test-not-a-real-key';

  try {
    console.log('REAL CONFIGURATION — these are the properties we claim');
    await exercise(fixture);

    // Installed AFTER the first run, so it replaces the real OpenAI exporter.
    // A disabled provider dispatches to nobody and the spy stays empty — that
    // silence is the assertion.
    setTraceProcessors([spyProcessor(spans)]);
    await exercise(fixture);

    const params = captured.params;
    check(
      'a request was actually built',
      params.length > 0,
      `${params.length} request(s) captured — an empty capture would make every check below vacuous`,
    );

    const allStoreFalse = params.every((p) => p.store === false);
    check(
      'store is false on every request',
      allStoreFalse,
      allStoreFalse
        ? 'no request asks the provider to retain the response'
        : `store was ${JSON.stringify(params.map((p) => p.store))} — the SDK omits it by default, so the provider default (retain) applies`,
    );

    const toolName = fixture.toolName ?? 'search_tool';
    const toolsOnWire = params.every((p) => (p.tools ?? []).some((t: any) => t.name === toolName));
    check(
      'registered tools reach the request',
      toolsOnWire,
      toolsOnWire
        ? `${toolName} is in every request — the model can actually ground its answer`
        : `tools sent: ${JSON.stringify(params.map((p) => (p.tools ?? []).map((t: any) => t.name)))} — ` +
          'a model with no tools still answers, and escalation cases still pass, so this fails silently',
    );

    const noServerState = params.every(
      (p) => !p.previous_response_id && !p.conversation && !p.previousResponseId,
    );
    check(
      'no server-side conversation state',
      noServerState,
      noServerState
        ? 'no previous_response_id and no conversation id — we send the whole transcript every turn'
        : 'a request chained off provider-held state',
    );

    check(
      'tracing dispatched nothing',
      spans.length === 0,
      spans.length === 0
        ? 'zero spans, with OPENAI_API_KEY set — so this is not passing merely because no key exists'
        : `${spans.length} span(s) dispatched: ${spans.slice(0, 3).join(', ')}`,
    );

    const openaiCalls = fetched.filter((u) => u.includes('api.openai.com'));
    check(
      'nothing reached api.openai.com',
      openaiCalls.length === 0,
      openaiCalls.length === 0
        ? 'no request to the OpenAI trace ingest endpoint'
        : `${openaiCalls.length} call(s): ${openaiCalls.join(', ')}`,
    );

    // -----------------------------------------------------------------------
    console.log('\nNEGATIVE CONTROLS — each must FAIL, or the check above is asleep');

    // Same client, same spy — only the global tracing flag changes. That is the
    // one variable, which is what makes this a control rather than a rerun.
    setTracingDisabled(false);
    await exercise(fixture);
    check(
      'control: tracing enabled IS detected',
      spans.length > 0,
      spans.length > 0
        ? `${spans.length} span(s) seen once tracing was re-enabled — the span check can fail, so its silence above means something`
        : 'NO spans seen even with tracing on — the tracing check proves nothing and must be rewritten',
    );

    // Build a request the way a careless adoption would: no modelSettings.
    // The model is constructed explicitly rather than via setDefaultOpenAIClient,
    // because that global is first-write-wins and CLIENT already claimed it.
    const naive: Captured = { params: [] };
    try {
      const { Agent, run, OpenAIResponsesModel } = await import('@openai/agents');
      await run(
        new Agent({
          name: 'naive',
          instructions: 'test',
          model: new OpenAIResponsesModel(fakeClient(naive, fixture.sampleAnswer) as never, 'gpt-5-mini'),
        }),
        'test question',
        { maxTurns: 2 },
      );
    } catch (e) {
      console.log(`        (naive run ended early: ${(e as Error).message.slice(0, 120)})`);
    }

    const naiveStore = naive.params.map((p) => p.store);
    check(
      'control: a naive Agent does NOT send store:false',
      naive.params.length > 0 && !naiveStore.every((v) => v === false),
      naive.params.length === 0
        ? 'no request captured — control inconclusive, treat the store check as unproven'
        : `store was ${JSON.stringify(naiveStore)} without explicit modelSettings — the provider default (retain) would apply`,
    );
  } finally {
    globalThis.fetch = realFetch;
    if (priorKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorKey;
    setTracingDisabled(true);
    setTraceProcessors([]);
  }

  console.log(
    `\ncompliance: ${failures === 0 ? 'PASS' : `${failures} FAILED`}` +
      (failures === 0
        ? ' — store:false and tracing-off hold, and both checks were shown to be capable of failing'
        : ''),
  );
  process.exit(failures === 0 ? 0 : 1);
}

