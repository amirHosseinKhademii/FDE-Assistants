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
import { selectModel } from './mastra/provider';
import { selectChatModel } from './langgraph/loop-langgraph';
import { configureSdk } from './sdk/loop-sdk';
import { DEFAULT_BEDROCK_MODEL } from './core/loop.types';

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

export function runProviderSwitchCheck(): number {
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
    !!typo && typo.message.includes('azure') && typo.message.includes('bedrock'),
    'and the message names both valid values',
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

if (require.main === module) process.exit(runProviderSwitchCheck() === 0 ? 0 : 1);
