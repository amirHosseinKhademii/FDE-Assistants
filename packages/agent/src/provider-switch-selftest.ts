/**
 * Does `LLM_PROVIDER` actually route where it says — on BOTH engines that can
 * reach a second cloud? Offline, instant, no credentials, no spend.
 *
 * WHY THIS EXISTS SEPARATELY FROM `compliance-mastra.ts`. That file asks a
 * data-egress question — what goes on the wire, to which host, with what
 * retention. This one asks a ROUTING question: given an environment, which
 * cloud and which model id does the loop end up holding. They fail
 * differently, and the routing one fails silently: a mis-set variable produces
 * a working run against the wrong provider, and every downstream number is
 * about a model nobody chose.
 *
 * THE ASSERTIONS ARE THE DOCSTRING'S OWN CLAIMS, turned into things that can
 * fail:
 *
 *   1. Silence means Azure. Unset is the common case and it must not surprise.
 *   2. Case and stray whitespace still mean Azure — `LLM_PROVIDER=" Azure "` is
 *      what a .env file with a trailing space produces, and rejecting it would
 *      send a correct intention to the throw below.
 *   3. `bedrock` reaches AWS, carrying the INFERENCE PROFILE id rather than the
 *      Azure deployment name it was handed. This is the one that would waste an
 *      afternoon: passing `gpt-5-mini` to Bedrock fails with a validation error
 *      that reads like missing model access.
 *   4. `BEDROCK_MODEL` overrides that default, because the Support case may
 *      hand back a different profile than the one hard-coded.
 *   5. An unknown value THROWS, and the message names both valid values. A
 *      quiet fallback to Azure is the failure this whole switch exists to
 *      prevent — everything works, nothing is wrong, and the run you wanted
 *      never happened.
 *
 * IT DRIVES THE PRODUCTION FUNCTION. `selectModel` is the same call
 * `runLoopMastra` makes; the Azure branch takes an injected baseURL and token
 * only because `FOUNDRY_OPENAI_ENDPOINT` would otherwise be required, and the
 * Bedrock branch takes nothing at all — AWS's credential chain resolves at call
 * time, so the real construction runs here with every AWS_* variable unset.
 *
 * WHAT IT CANNOT TELL YOU: whether either provider answers. No request is made.
 * Azure's liveness is `pnpm steering:ping`; Bedrock has never reached the
 * network at all (`docs/BEDROCK.md` — on-demand inference quota reads 0.0).
 *
 * IT COVERS ALL THREE ENGINES, AND THEY DO NOT ALL ANSWER THE SAME WAY.
 * `LLM_PROVIDER` has to mean one thing everywhere or it is not one switch, it
 * is several that share a name — and the failure mode is a fleet where some of
 * the traffic silently went to a different cloud. Mastra and LangGraph both
 * serve `bedrock`, through entirely different code (`selectModel` vs
 * `selectChatModel`, AI SDK vs LangChain), so their agreement is asserted
 * rather than assumed. The Agents SDK CANNOT serve it — it takes an OpenAI
 * client object — so the property asserted there is that it REFUSES. A
 * documented limit that throws is a switch; an undocumented one that runs
 * anyway is the bug.
 *
 * THE THREE PATHS DO NOT EVEN SHARE AN AWS API, read out of each package's own
 * dist rather than its README:
 *
 *   @fde/bedrock            AnthropicBedrock.messages.create  → Anthropic Messages API
 *   @ai-sdk/amazon-bedrock  /converse, /invoke                → Converse, invoke fallback
 *   @langchain/aws          ConverseCommand                   → Converse only
 *
 * IT SITS ABOVE THE ENGINE FOLDERS, not inside one, because it imports from
 * both — and `sdk/`, `mastra/` and `langgraph/` are not allowed to import each
 * other (loading the Mastra module constructs an Azure credential and pulls in
 * `@mastra/core`, which a LangGraph user should not pay for). A comparison
 * between engines is the one thing that legitimately knows about all of them.
 *
 *   pnpm provider:check
 */
import { selectModel, retryingFetch } from './mastra/provider';
// Exported from the loop solely so this file can pin the AZURE branch to `{}`,
// the guard that keeps the committed eval baseline comparable.
import { structuringPass } from './mastra/loop';
import { selectChatModel } from './langgraph/provider';
import { configureSdk } from './sdk/provider';
import { DEFAULT_BEDROCK_MODEL, DEFAULT_LOCAL_MODEL, loggedModelName } from './core/loop.types';

let failed = 0;

function check(ok: boolean, name: string, detail: string): void {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  console.log(`        ${detail}`);
}

/** The Azure branch needs an endpoint; nothing here is a credential. */
const FAKE = {
  baseURL: 'https://provider-switch.test/openai/v1',
  token: async () => 'fake-token-not-a-credential',
};

/**
 * Run `body` with `LLM_PROVIDER` / `BEDROCK_MODEL` set to exactly these values,
 * then put the environment back. `undefined` means *unset*, which is a
 * different case from empty string and is case 1 above.
 */
function withEnv<T>(vars: Record<string, string | undefined>, body: () => T): T {
  const before: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    before[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return body();
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** `{ provider, modelId }` is what every AI SDK model carries; assert on both. */
function route(env: Record<string, string | undefined>): { provider: string; modelId: string } {
  return withEnv(env, () => {
    const m = selectModel('gpt-5-mini', FAKE);
    return { provider: String(m.provider), modelId: String(m.modelId) };
  });
}

/**
 * The same question of the LangGraph engine. LangChain models carry a different
 * identity pair — `_llmType()` and `.model`, not `.provider` and `.modelId` —
 * so this cannot be shared with `route` above, and pretending otherwise would
 * mean asserting on a field one of them does not have.
 */
function routeLangGraph(env: Record<string, string | undefined>): { provider: string; modelId: string } {
  return withEnv(env, () => {
    const m = selectChatModel('gpt-5-mini', FAKE);
    return { provider: String(m._llmType()), modelId: String(m.model) };
  });
}

function threw(
  env: Record<string, string | undefined>,
  via: (e: Record<string, string | undefined>) => unknown = route,
): Error | undefined {
  try {
    via(env);
    return undefined;
  } catch (e) {
    return e as Error;
  }
}

/**
 * The negative control, and it is not decoration. Every assertion routes
 * through `check`; if `check` stopped counting, all of them would print ok and
 * this file would report PASS forever while testing nothing. Same reasoning
 * `@fde/bedrock`'s selftest and `scripts/leak-check.mjs` both record.
 */
function control(): void {
  const before = failed;
  const log = console.log;
  console.log = () => {};
  check(false, 'planted', 'planted');
  console.log = log;
  const noticed = failed === before + 1;
  failed = before;
  check(
    noticed,
    'control: a false assertion IS caught',
    noticed
      ? 'a deliberately false assertion moved the counter — the checks above can fail'
      : 'a deliberately false assertion did NOT move the counter — every ok above is meaningless',
  );
}

// ASYNC BECAUSE ONE ASSERTION IS, and a synchronous runner silently skipped it:
// `process.exit()` fired before the promise resolved, the section header printed
// with nothing under it, and the suite reported PASS. That is the second time in
// one afternoon a green check covered an assertion that never ran — see the
// `retryingFetch` note in `mastra/provider.ts` for the first.
export async function runProviderSwitchCheck(): Promise<number> {
  console.log('\nProvider switch — LLM_PROVIDER routing, on both engines that can reach AWS\n');
  console.log('ROUTING — where each environment actually sends the loop');

  const unset = route({ LLM_PROVIDER: undefined, BEDROCK_MODEL: undefined });
  check(
    unset.provider.startsWith('foundry') && unset.modelId === 'gpt-5-mini',
    'silence means azure, and keeps the deployment name it was handed',
    `LLM_PROVIDER unset → ${unset.provider} / ${unset.modelId}`,
  );

  const explicit = route({ LLM_PROVIDER: 'azure', BEDROCK_MODEL: undefined });
  check(
    explicit.provider === unset.provider && explicit.modelId === unset.modelId,
    'saying azure out loud is the same path as saying nothing',
    `LLM_PROVIDER=azure → ${explicit.provider} / ${explicit.modelId}`,
  );

  const messy = route({ LLM_PROVIDER: '  AZURE ', BEDROCK_MODEL: undefined });
  check(
    messy.provider === unset.provider,
    'case and stray whitespace still mean azure',
    `LLM_PROVIDER="  AZURE " → ${messy.provider} — a .env trailing space is not a typo`,
  );

  const bed = route({ LLM_PROVIDER: 'bedrock', BEDROCK_MODEL: undefined });
  check(
    bed.provider === 'amazon-bedrock',
    'bedrock reaches AWS, with no credential present',
    `LLM_PROVIDER=bedrock → ${bed.provider}`,
  );
  check(
    bed.modelId === DEFAULT_BEDROCK_MODEL,
    'the model id CHANGES with the provider — inference profile, not the deployment name',
    bed.modelId === 'gpt-5-mini'
      ? 'it carried gpt-5-mini to Bedrock, which fails as if the model were not enabled'
      : `modelId = ${bed.modelId}`,
  );
  check(
    bed.modelId.startsWith('eu.'),
    'and it is the eu. inference profile, not the bare model id',
    `a bare anthropic.* id in an EU region fails with "on-demand throughput isn't supported" — got ${bed.modelId}`,
  );

  const pinned = route({ LLM_PROVIDER: 'bedrock', BEDROCK_MODEL: 'eu.anthropic.other-v1:0' });
  check(
    pinned.modelId === 'eu.anthropic.other-v1:0',
    'BEDROCK_MODEL overrides the default',
    `modelId = ${pinned.modelId} — so a profile from the Support case needs no code change`,
  );

  console.log('\nLOCAL — a model on this machine, through an OpenAI-compatible endpoint');

  const loc = route({ LLM_PROVIDER: 'local', BEDROCK_MODEL: undefined, LOCAL_MODEL: undefined });
  check(
    loc.provider.startsWith('local'),
    'local routes to the local provider, not to azure',
    `LLM_PROVIDER=local → ${loc.provider}`,
  );
  check(
    loc.modelId !== 'gpt-5-mini',
    'the model id CHANGES with the provider — an Ollama tag, not the Azure deployment name',
    loc.modelId === 'gpt-5-mini'
      ? 'it carried gpt-5-mini to Ollama, which fails with "model not found" and reads like a missing pull'
      : `modelId = ${loc.modelId}`,
  );

  const locPinned = route({ LLM_PROVIDER: 'local', LOCAL_MODEL: 'qwen3:14b', BEDROCK_MODEL: undefined });
  check(
    locPinned.modelId === 'qwen3:14b',
    'LOCAL_MODEL overrides the default, so swapping models needs no code change',
    `modelId = ${locPinned.modelId}`,
  );

  const lgLoc = routeLangGraph({ LLM_PROVIDER: 'local', BEDROCK_MODEL: undefined, LOCAL_MODEL: undefined });
  check(
    lgLoc.modelId === loc.modelId,
    'BOTH engines answer `local` with the SAME model id',
    `mastra ${loc.modelId} vs langgraph ${lgLoc.modelId} — if these drift, LLM_PROVIDER is two switches sharing a name`,
  );

  // THE AGENTS SDK MUST REFUSE, and for a reason unrelated to credentials:
  // `setOpenAIAPI('responses')` puts it on the Responses API, which Ollama does
  // not serve. A quiet acceptance here would fail at the transport with an
  // error that reads like a broken install.
  const sdkLocal = threw({ LLM_PROVIDER: 'local' }, (e) =>
    withEnv(e, () => configureSdk({} as never)),
  );
  check(
    sdkLocal !== undefined,
    'the agents-sdk engine REFUSES local — it speaks the Responses API',
    sdkLocal
      ? 'refused, naming mastra and langgraph as the engines that serve it'
      : 'it accepted local, and would fail at the transport looking like a broken install',
  );
  check(
    !!sdkLocal && sdkLocal.message.includes('local'),
    'and the refusal names local as a mastra/langgraph option',
    sdkLocal ? `"${sdkLocal.message}"` : 'no error to read',
  );

  console.log('\nTHE COST LOG — a free run must not be priced against a cloud meter');
{
  // FOUND IN REAL TELEMETRY, NOT IMAGINED. Three lines in `logs/requests.jsonl`
  // dated 2026-09-16 record a loop that ran entirely on this machine as
  // `"model": "gpt-5-mini"` and `"costUsd": 0.002448`, with a costNote citing a
  // meter "confirmed against the actual bill" — on a subscription that had
  // already been torn down. Every field true of the CONFIG, none of them true
  // of the run. `@fde/telemetry` was never wrong: it priced exactly the model
  // it was handed.
  withEnv({ LLM_PROVIDER: 'local', LOCAL_MODEL: undefined }, () => {
    const labelled = loggedModelName('gpt-5-mini');
    check(
      labelled === `local/${DEFAULT_LOCAL_MODEL}`,
      'a local run is NOT logged under the azure deployment name',
      labelled,
    );
    check(
      labelled.startsWith('local/'),
      'the `local/` prefix is what @fde/telemetry keys the zero off',
      'price() short-circuits on the prefix, so a tag nobody priced still logs a defensible 0',
    );
  });

  withEnv({ LLM_PROVIDER: 'local', LOCAL_MODEL: 'llama3.1:70b' }, () => {
    check(
      loggedModelName('gpt-5-mini') === 'local/llama3.1:70b',
      'a tag nobody has ever priced still carries the prefix',
      loggedModelName('gpt-5-mini'),
    );
  });

  withEnv({ LLM_PROVIDER: undefined, LOCAL_MODEL: undefined }, () => {
    check(
      loggedModelName('gpt-5-mini') === 'gpt-5-mini',
      'and AZURE still logs the azure deployment name — this changed ONE path',
      loggedModelName('gpt-5-mini'),
    );
  });
}

console.log('\nHOSTED — someone else\'s GPU, and a DIFFERENT trust boundary from local');
{
  // `local` and `hosted` share a builder and differ in the only thing that
  // matters: a credential and a network hop. They are two values rather than a
  // base-URL override BECAUSE `LLM_PROVIDER=local` must never be able to mean
  // "Google" — see `core/loop.types.ts`.
  withEnv(
    { LLM_PROVIDER: 'hosted', HOSTED_API_KEY: 'test-key-not-a-credential', HOSTED_MODEL: 'gemini-3.8-flash' },
    () => {
      const m = selectModel('gpt-5-mini', FAKE);
      check(
        String(m?.modelId ?? m?.model) === 'gemini-3.8-flash',
        'hosted routes to the hosted provider with ITS model id, not the azure deployment',
        `modelId = ${m?.modelId ?? m?.model}`,
      );
      const lg = selectChatModel('gpt-5-mini', FAKE);
      check(
        String(lg?.model ?? lg?.modelName) === String(m?.modelId ?? m?.model),
        'BOTH engines answer `hosted` with the same model id',
        `mastra ${m?.modelId ?? m?.model} vs langgraph ${lg?.model ?? lg?.modelName}`,
      );
      // THE ACCOUNTING BOUNDARY. `local/` prices at a measured zero because
      // there is no meter. A free TIER is free under a quota nobody here is
      // measuring, on a service that bills the moment you cross it — so it must
      // NOT inherit that zero.
      const labelled = loggedModelName('gpt-5-mini');
      check(
        labelled === 'hosted/gemini-3.8-flash' && !labelled.startsWith('local/'),
        'a hosted run is NOT labelled `local/`, so it cannot inherit the measured zero',
        labelled,
      );
      check(
        Object.keys(structuringPass('gpt-5-mini')).length === 0,
        'and hosted gets NO structuring pass — that fix is for llama.cpp grammars',
        'a real OpenAI-compatible server serves tools and a schema in one request',
      );
    },
  );

  // THE TWO REFUSALS. Both exist because the failing alternative is a 401 or a
  // 404 from a third party, which reads like a broken account and is not.
  withEnv({ LLM_PROVIDER: 'hosted', HOSTED_API_KEY: undefined, HOSTED_MODEL: 'gemini-3.8-flash' }, () => {
    let msg = '';
    try {
      selectModel('gpt-5-mini', FAKE);
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    check(
      /HOSTED_API_KEY/.test(msg) && /third party/i.test(msg),
      'a missing key throws BY NAME and says the prompts leave the machine',
      msg.slice(0, 120),
    );
  });

  withEnv({ LLM_PROVIDER: 'hosted', HOSTED_API_KEY: 'test-key', HOSTED_MODEL: undefined }, () => {
    let msg = '';
    try {
      selectModel('gpt-5-mini', FAKE);
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    check(
      /HOSTED_MODEL/.test(msg),
      'and a missing model id throws by name — there is deliberately no default',
      msg.slice(0, 120),
    );
  });

  withEnv({ LLM_PROVIDER: 'hosted', HOSTED_API_KEY: 'k', HOSTED_MODEL: 'm' }, () => {
    let refused = false;
    let msg = '';
    try {
      configureSdk({} as never);
    } catch (e: any) {
      refused = true;
      msg = String(e?.message ?? e);
    }
    check(
      refused && /hosted/.test(msg),
      'the agents-sdk engine REFUSES hosted too — Gemini serves /chat/completions, not /responses',
      msg.slice(0, 130),
    );
  });
}

console.log('\nTHE STRUCTURING PASS — a local-only workaround must stay local-only');
{
  // `mastra/loop.ts`'s `structuringPass()` adds a SECOND model call so a local
  // server's grammar stops suppressing tool calls. On Azure that second call
  // would be pure cost and would move every number in a committed baseline —
  // 146 logged mastra runs and the 2026-09-05 scorecard — to fix a problem that
  // does not exist there. The empty object IS the guard, so it is asserted.
  withEnv({ LLM_PROVIDER: undefined }, () => {
    check(
      Object.keys(structuringPass('gpt-5-mini')).length === 0,
      'azure gets NO second pass — the committed baseline stays comparable',
      'structuringPass() returns {} when LLM_PROVIDER is unset',
    );
  });
  withEnv({ LLM_PROVIDER: 'bedrock' }, () => {
    check(
      Object.keys(structuringPass('gpt-5-mini')).length === 0,
      'and bedrock gets none either — this is not "everything that is not azure"',
      'structuringPass() returns {} for bedrock',
    );
  });
  withEnv({ LLM_PROVIDER: 'local', LOCAL_MODEL: undefined }, () => {
    check(
      'model' in structuringPass('gpt-5-mini'),
      'local DOES get one — without it the tools are silently off',
      'measured: toolCalls 0 → 2 on qwen2.5:7b, see docs/ENGINES.md',
    );
  });
}

console.log('\nA REDIRECTED ENDPOINT — azure by switch is not azure in fact');
{
  // MEASURED 2026-09-16: `FOUNDRY_OPENAI_ENDPOINT=http://127.0.0.1:11435/v1`
  // ran the whole steering suite through a Claude Code shim while the eval
  // header printed `model: gpt-5-mini`. LLM_PROVIDER was never set, so the
  // `local/` prefix could not see it — the redirect happens one layer down, in
  // the endpoint the azure branch builds its client from.
  withEnv({ LLM_PROVIDER: undefined, FOUNDRY_OPENAI_ENDPOINT: 'http://127.0.0.1:11435/v1' }, () => {
    check(
      loggedModelName('gpt-5-mini') === 'gpt-5-mini@127.0.0.1:11435',
      'a redirected endpoint is named in the log, not hidden behind the deployment name',
      loggedModelName('gpt-5-mini'),
    );
  });
  withEnv({ LLM_PROVIDER: undefined, FOUNDRY_OPENAI_ENDPOINT: 'https://example.openai.azure.com/openai/v1' }, () => {
    check(
      loggedModelName('gpt-5-mini') === 'gpt-5-mini',
      'and a REAL azure endpoint still logs the plain deployment name',
      loggedModelName('gpt-5-mini'),
    );
  });
  withEnv({ LLM_PROVIDER: undefined, FOUNDRY_OPENAI_ENDPOINT: undefined }, () => {
    check(
      loggedModelName('gpt-5-mini') === 'gpt-5-mini',
      'an unset endpoint is not a redirect — nothing has been pointed anywhere',
      loggedModelName('gpt-5-mini'),
    );
  });
}

console.log('\nTHE RETRY — and it must be somewhere that PROVABLY runs');
{
  // THIS ASSERTION EXISTS BECAUSE THE FIRST VERSION OF IT PASSED ON DEAD CODE.
  // `maxRetries` was handed to `agent.generate(…)`; it typechecked, this file
  // asserted the number, every gate went green, and Mastra never read it —
  // `ModelConfigModelSettings` is `Omit<MastraModelSettings, 'maxRetries' | …>`.
  // So this no longer asks what a config object SAYS. It counts calls.
  let calls = 0;
  const flaky = (async () => {
    calls++;
    return { status: calls < 3 ? 503 : 200, headers: { get: () => null } } as any;
  }) as unknown as typeof fetch;

  const res: any = await retryingFetch(flaky, 4)('https://example.invalid/v1/chat' as any, {} as any);
  check(calls === 3, 'a 503 is retried until it clears — measured by CALL COUNT', `fetch called ${calls}×`);
  check(res.status === 200, 'and the caller gets the successful response, not the 503', `status ${res.status}`);

  let permanent = 0;
  const dead = (async () => {
    permanent++;
    return { status: 401, headers: { get: () => null } } as any;
  }) as unknown as typeof fetch;
  await retryingFetch(dead, 4)('https://example.invalid/x' as any, {} as any);
  check(
    permanent === 1,
    'a 401 is NOT retried — a bad key is an answer, not a queue',
    `fetch called ${permanent}×`,
  );
}

console.log('\nREFUSAL — an unknown value must not quietly become azure');

  const typo = threw({ LLM_PROVIDER: 'bedrok', BEDROCK_MODEL: undefined });
  check(
    typo !== undefined,
    'a typo throws rather than falling back',
    typo
      ? 'LLM_PROVIDER=bedrok refused'
      : 'LLM_PROVIDER=bedrok ran happily — on Azure, silently, which is the whole failure',
  );
  check(
    !!typo &&
      typo.message.includes('azure') &&
      typo.message.includes('bedrock') &&
      typo.message.includes('local'),
    'and the message names ALL THREE valid values',
    typo ? `"${typo.message}"` : 'no error to read',
  );

  const empty = route({ LLM_PROVIDER: '   ', BEDROCK_MODEL: undefined });
  check(
    empty.provider === unset.provider,
    'a variable set to whitespace is not a provider choice — it is azure',
    `LLM_PROVIDER="   " → ${empty.provider}. Turbo strips values; an empty one must not throw`,
  );

  console.log('\nTHE SECOND ENGINE — LangGraph selects through entirely different code');

  const lgUnset = routeLangGraph({ LLM_PROVIDER: undefined, BEDROCK_MODEL: undefined });
  check(
    lgUnset.provider === 'openai' && lgUnset.modelId === 'gpt-5-mini',
    'silence means azure here too',
    `LLM_PROVIDER unset → ${lgUnset.provider} / ${lgUnset.modelId} (ChatOpenAI at the Foundry endpoint)`,
  );

  const lgBed = routeLangGraph({ LLM_PROVIDER: 'bedrock', BEDROCK_MODEL: undefined });
  check(
    lgBed.provider === 'chat_bedrock_converse',
    'bedrock reaches AWS through the CONVERSE api, not the Messages api',
    `LLM_PROVIDER=bedrock → ${lgBed.provider} — a different AWS surface from @fde/bedrock's`,
  );
  check(
    lgBed.modelId === DEFAULT_BEDROCK_MODEL,
    'and it carries the same inference profile the Mastra engine does',
    `modelId = ${lgBed.modelId}`,
  );

  const lgPinned = routeLangGraph({ LLM_PROVIDER: 'bedrock', BEDROCK_MODEL: 'eu.anthropic.other-v1:0' });
  check(
    lgPinned.modelId === 'eu.anthropic.other-v1:0',
    'BEDROCK_MODEL overrides on this engine too',
    `modelId = ${lgPinned.modelId} — one variable, not one per engine`,
  );

  const lgTypo = threw({ LLM_PROVIDER: 'bedrok', BEDROCK_MODEL: undefined }, routeLangGraph);
  check(
    lgTypo !== undefined && lgTypo.message.includes('azure') && lgTypo.message.includes('bedrock'),
    'and a typo is refused the same way, with the same message',
    lgTypo ? `"${lgTypo.message}"` : 'LLM_PROVIDER=bedrok ran happily on the LangGraph engine',
  );

  console.log('\nTHE THIRD ENGINE — agents-sdk cannot reach AWS, and must say so');

  // Driven through `configureSdk`, the real entry point, rather than the guard
  // it calls — so removing the guard from production breaks this, which is the
  // whole value. The SDK globals it sets are process-wide and harmless here.
  const sdk = (e: Record<string, string | undefined>) => withEnv(e, () => configureSdk({} as never));

  const sdkAzure = threw({ LLM_PROVIDER: undefined }, sdk);
  check(
    sdkAzure === undefined,
    'azure is fine on the default engine, as it always was',
    'LLM_PROVIDER unset → configureSdk ran, no refusal',
  );

  const sdkBedrock = threw({ LLM_PROVIDER: 'bedrock' }, sdk);
  check(
    sdkBedrock !== undefined,
    'bedrock is REFUSED rather than quietly served by azure',
    sdkBedrock
      ? 'LLM_PROVIDER=bedrock refused'
      : 'it ran — on Azure, silently, which is a whole run about a cloud nobody chose',
  );
  check(
    !!sdkBedrock && sdkBedrock.message.includes('LOOP=mastra'),
    'and the refusal names the engines that CAN serve it',
    sdkBedrock ? `"${sdkBedrock.message}"` : 'no error to read',
  );

  console.log('\nAGREEMENT — one variable must mean one thing, or it is two switches');

  const AWS = (p: string) => p === 'amazon-bedrock' || p === 'chat_bedrock_converse';
  const cases: { env: Record<string, string | undefined>; label: string }[] = [
    { env: { LLM_PROVIDER: undefined }, label: 'unset' },
    { env: { LLM_PROVIDER: 'azure' }, label: 'azure' },
    { env: { LLM_PROVIDER: '  AZURE ' }, label: '"  AZURE "' },
    { env: { LLM_PROVIDER: '   ' }, label: 'whitespace' },
    { env: { LLM_PROVIDER: 'bedrock' }, label: 'bedrock' },
  ];
  const disagreed = cases.filter(({ env }) => {
    const e = { ...env, BEDROCK_MODEL: undefined };
    return AWS(route(e).provider) !== AWS(routeLangGraph(e).provider);
  });
  check(
    disagreed.length === 0,
    'mastra and langgraph pick the same cloud for every value tested',
    disagreed.length === 0
      ? `${cases.length} values agree: ${cases.map((c) => c.label).join(', ')}`
      : `DISAGREED on: ${disagreed.map((c) => c.label).join(', ')} — half the fleet is on another cloud`,
  );

  console.log('\nNEGATIVE CONTROL — the checks above must be capable of failing');
  control();

  console.log(
    failed === 0
      ? '\nprovider: PASS — azure by default everywhere, bedrock served by two engines and refused by the third, and no engine quietly disagrees\n'
      : `\nprovider: FAIL — ${failed} problem(s)\n`,
  );
  return failed;
}

if (require.main === module) {
  // `.then`, not a bare call: an un-awaited async runner exits 0 before a single
  // assertion has run, which is precisely the bug this file now tests for.
  void runProviderSwitchCheck().then((f) => process.exit(f === 0 ? 0 : 1));
}
