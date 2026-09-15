/**
 * Lesson 4 — one loop, three engines, two clouds.
 *
 * A READING OF `docs/ENGINES.md`, whose §4 calls itself "the chart to read" —
 * so that matrix is the centre of this page rather than an appendix to it.
 *
 * THE RIGHT-HAND COLUMN OF THAT MATRIX HAS NEVER TOUCHED THE NETWORK, and the
 * page says so three times: in the legend, in every cell, and in the caveat. A
 * capability matrix that draws "wired" and "live" the same way is the single
 * most misleading thing this section could ship, because it is the shape a
 * reader trusts without reading.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Code, Figure, Glossary, Key, P, RunIt, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Matrix } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Loop() {
  return (
    <LessonPage slug="loop">
      <Step n={1} title="Underneath, it is a while-loop around one HTTP call">
        <P>
          There is no agent framework doing anything mysterious. A request goes out; the reply either is the
          answer or is a request to call a tool; if it is a tool call, run the tool, append the result, and go
          round again. The <Term def="A model reply asking for a named function to be run with named arguments. The model does not run anything — it asks, and your code decides.">tool call</Term>{' '}
          is the only thing that makes it a loop.
        </P>

        <Figure
          title="One question, one loop"
          sub="Every arrow is ordinary code. The model chooses which tool; the loop decides whether it is allowed to."
          source="docs/ENGINES.md §1. The cap is DEFAULT_MAX_TURNS = 12 in packages/agent/src/core/loop.types.ts:36 — one place, because the eval claims to take exactly the path a real request takes."
        >
          <Stages
            stages={[
              {
                verb: 'send',
                out: 'system + tools + contract + history',
                does: 'The whole context window, rebuilt and re-sent. Lesson 3 is what is in it.',
              },
              {
                verb: 'read',
                out: 'either a tool call, or the answer',
                does: 'A reply asking for search_policy with arguments is not an answer, and the loop does not treat it as one.',
              },
              {
                verb: 'run',
                out: 'the tool result, as text',
                does: 'Our code, our database, our rules. The model never reaches Postgres.',
                rule: 'Same-turn calls run concurrently. Serialising them was called "a silent latency bug" in the predecessor, so the framework path sets parallelToolCalls: true explicitly rather than inheriting a default.',
              },
              {
                verb: 'append',
                out: 'history, one turn longer',
                does: 'Go round again — up to 12 turns.',
                rule: 'A turn-cap stop is filed as infrastructure, never as a wrong answer. Misfiling it once sent somebody rewriting a prompt when the fix was a number.',
              },
              {
                verb: 'validate',
                out: 'a parsed answer, or the errors',
                does: 'Shape, then coherence. Errors go back to the model; nothing is repaired.',
              },
            ]}
          />
        </Figure>

        <HowItWorks
          title="How the loop keeps its receipts when it is cut off"
          path="packages/agent/src/sdk/loop.ts:110–140"
          plain={[
            'The loop runs until the model answers or the cap bites. When the cap bites, the Agents SDK THROWS rather than returning what it had — so every tool call it made is thrown away with the exception.',
            'That is not a cosmetic loss. A steering assessment hit this and reported \u201c0 turns, 98,367 ms\u201d for a run that had made six tool calls and spent real money. The cost log recorded zero.',
            'So the dispatched calls are folded into a final record before the failure is returned. The run still fails; it fails with its audit trail intact.',
            'Token counts are NOT recovered, because the exception does not carry them and a plausible number would be worse than a missing one.',
          ]}
          lines={[
            'for (;;) {',
            '  let result: any;',
            '  try {',
            '    result = await run(agent, input, { maxTurns });',
            '  } catch (e) {',
            '    if (e instanceof MaxTurnsExceededError) {',
            '      // `turns` holds only what EARLIER run() calls returned, and on',
            '      // the common case — hitting the cap on the first pass — that is',
            '      // an empty array. The dispatched calls are folded in here.',
            '      …',
            '    }',
            '    throw e;',
            '  }',
          ]}
          mark={[3, 5]}
          says={[
            { at: 'run(agent, input, { maxTurns })', is: 'The whole loop, in one library call. Everything around it is this repo making the library honest.' },
            { at: 'MaxTurnsExceededError', is: 'Caught by TYPE, not by message text. A message match would break silently on a library upgrade.' },
            { at: 'throw e', is: 'Anything that is not the cap is a real error and is not swallowed.' },
          ]}
          trap="The identical failure had already been found and fixed in the schema-retry path, where it was described as \u201cthe pass/fail was right and the audit trail was a lie\u201d. This was the one path that fix did not reach — which is what a bug class looks like when you only fix the instance."
        />
      </Step>

      <Step n={2} title="Three engines, and the difference is literally one line">
        <P>
          The same loop is implemented three times behind one contract, selected with{' '}
          <code className="font-mono text-ui-fg">LOOP=</code>. Not for variety: one implementation cannot test
          the claim that the engine is replaceable, and two can.
        </P>

        <Code
          path="packages/agent/src/{sdk,mastra,langgraph}/loop.ts"
          note="the line that drives each loop"
          lines={[
            '// sdk — packages/agent/src/sdk/loop.ts:113',
            'result = await run(agent, input, { maxTurns });',
            '',
            '// mastra — packages/agent/src/mastra/loop.ts:73',
            'res = await agent.generate(input, {',
            '  maxSteps: maxTurns,',
            '  ...(opts.responseFormat ? { structuredOutput: { schema: opts.responseFormat } } : {}),',
            '});',
            '',
            '// langgraph — packages/agent/src/langgraph/loop.ts:88',
            'result = await agent.invoke({ messages: currentMessages }, { recursionLimit: maxTurns * 2 + 1 });',
          ]}
          mark={[10]}
        />

        <P>
          <strong className="font-medium text-ui-fg">
            Look at the last line: <code className="font-mono">maxTurns * 2 + 1</code>.
          </strong>{' '}
          LangGraph counts <em className="not-italic text-ui-fg">graph steps</em>, and one turn is two of
          them. Get that arithmetic wrong and the cap bites in the wrong place — and a turn-cap stop reads as
          a wrong answer rather than as infrastructure. Three of the differences between these engines cost
          real money or real debugging, and this is one of them.
        </P>

        <P>
          The other two: LangGraph makes a <strong className="font-medium text-ui-fg">separate extra model call</strong>{' '}
          to structure its output, on every structured answer — its own docs say so. And the Agents SDK's{' '}
          <code className="font-mono text-ui-fg">setDefaultOpenAIClient</code> is{' '}
          <strong className="font-medium text-ui-fg">first-write-wins</strong>: it caches the client the first
          time it resolves a model and ignores later calls. A compliance test once had exactly that bug and
          recorded <em className="not-italic text-ui-fg">zero</em> requests while looking green.
        </P>
      </Step>

      <Step n={3} title="A framework's defaults are not your defaults">
        <P>
          Both of the settings below are non-default, both are opt-<em className="not-italic text-ui-fg">out</em>,
          and both were found by reading the SDK's source and types rather than its documentation.
        </P>

        <Code
          path="packages/agent/src/sdk/loop.ts:88–90"
          note="two words, and one of them is a data-residency decision"
          lines={[
            'modelSettings: {',
            '  // Both of these are non-default and both are load-bearing. See header.',
            '  store: false,',
          ]}
          mark={[2]}
        />

        <P>
          <code className="font-mono text-ui-fg">store</code> defaults to{' '}
          <strong className="font-medium text-ui-fg">true</strong> — the provider retains every response
          payload. Claim data persisted somewhere nobody agreed to, introduced by what looks like a pure
          refactor.
        </P>

        <P>
          Worse, and subtler: the Agents SDK's tracing exporter defaults{' '}
          <strong className="font-medium text-ui-fg">ON</strong> and ships model inputs, tool arguments{' '}
          <em className="not-italic text-ui-fg">and tool results</em> to{' '}
          <code className="font-mono text-ui-fg">api.openai.com</code>. Model calls go to an EU Azure endpoint
          somebody chose; traces would leave regardless — a second destination, and a cross-border transfer
          introduced by a library default. It is only{' '}
          <em className="not-italic text-ui-fg">accidentally</em> safe today: the exporter no-ops without an
          OpenAI key, and this repo authenticates with Entra. The day somebody adds{' '}
          <code className="font-mono text-ui-fg">OPENAI_API_KEY</code> to <code className="font-mono text-ui-fg">.env</code>{' '}
          for an unrelated reason, claim text starts flowing.
        </P>

        <Key>
          Adopt the framework, then pin the compliance-critical behaviour with a test. Don't trust a default.
          Don't trust the docs. Assert it on the wire.
        </Key>

        <Figure
          title="What asserts all of this, in checks"
          sub="Each of these captures the actual outgoing request, or the actual routing decision, rather than inspecting configuration."
          source={
            <>
              docs/ENGINES.md §5. Every one of them carries a{' '}
              <strong className="text-ui-dim">negative control</strong> that plants a false assertion and
              requires the counter to move — a check that has only ever passed is indistinguishable from one
              that cannot fail.
            </>
          }
        >
          <BarRows
            rows={[
              { label: 'pnpm bedrock:check', value: 30, note: 'does the hand-written AWS translation translate' },
              { label: 'pnpm provider:check', value: 20, note: 'routing on all three engines — silence must mean Azure' },
              { label: 'pnpm compliance:check', value: 9, note: 'agents-sdk: store:false, tracing off, on the wire' },
              { label: 'pnpm compliance:mastra', value: 8, note: 'mastra: strict json_schema, one host, nothing phones home' },
            ]}
            unit="checks"
            labelWidth={230}
            axis="all four are offline and free"
          />
        </Figure>
      </Step>

      <Step n={4} title="The matrix, and its hole">
        <P>
          Two switches: <code className="font-mono text-ui-fg">LOOP=sdk|mastra|langgraph</code> picks the
          engine, <code className="font-mono text-ui-fg">LLM_PROVIDER=azure|bedrock</code> picks the cloud.
          Not every pair exists.
        </P>

        <Figure
          title="Engine × cloud"
          sub="live = real paid calls have gone over this path. wired = the code is there, typechecked and asserted offline, and no request has ever been made."
          source={
            <>
              docs/ENGINES.md §4. The entire Bedrock column is blocked on one thing: the account's on-demand
              inference quota reads <span className="text-ui-dim">0.0</span>, an AWS provisioning defect with
              no self-service path. See docs/BEDROCK.md.
            </>
          }
        >
          <Matrix
            columns={['LLM_PROVIDER=azure (default)', 'LLM_PROVIDER=bedrock']}
            rows={[
              {
                name: 'raw chat.completions',
                sub: "steering's extract + ping",
                cells: [
                  { state: 'live', detail: 'real paid calls' },
                  { state: 'wired', detail: 'via @fde/bedrock — never reached the network' },
                ],
              },
              {
                name: 'LOOP=sdk',
                sub: 'the default engine',
                cells: [
                  { state: 'live', detail: 'the measured eval baseline' },
                  { state: 'refuses', detail: 'throws on purpose, naming what to use instead' },
                ],
              },
              {
                name: 'LOOP=mastra',
                cells: [
                  { state: 'live', detail: 'the second measured engine' },
                  { state: 'wired', detail: 'via @ai-sdk/amazon-bedrock — never reached the network' },
                ],
              },
              {
                name: 'LOOP=langgraph',
                cells: [
                  { state: 'live', detail: 'used where per-row state matters' },
                  { state: 'wired', detail: 'via @langchain/aws — never reached the network' },
                ],
              },
            ]}
            footnote="Only the Azure column has ever touched the network. Nothing in the right-hand column is a claim about whether it works — it is a claim about construction and routing, verified offline."
          />
        </Figure>

        <HowItWorks
          title="How a cloud gets chosen, and why silence has to mean Azure"
          path="packages/agent/src/mastra/provider.ts"
          plain={[
            'One environment variable picks the cloud. The rule the code enforces is that an UNSET variable, an empty one, and the word \u201cazure\u201d in any casing all mean the same thing — the default — and that anything else is either the other valid value or an error.',
            'A typo must not fall through to the default. `LLM_PROVIDER=bedrok` silently running on Azure is a whole run\u2019s numbers about a cloud nobody chose, and it is indistinguishable from success.',
            'The two builders are deliberately different shapes. Azure serves the OpenAI protocol natively, so it is a base URL and a bearer token. Bedrock is a different API, and reaching it is a separate package with 167 lines of translation in it.',
            'And the interface line matters more than it looks: `.languageModel` is on the shared interface both providers implement. The provider-specific spelling this call site used to carry would have blocked the swap on its own.',
          ]}
          lines={[
            'export function selectModel(model: string, overrides: FoundryOverrides = {}): any {',
            "  const raw = process.env.LLM_PROVIDER?.trim().toLowerCase();",
            "  if (!raw || raw === 'azure') {",
            '    const p = Object.keys(overrides).length ? buildFoundryProvider(overrides) : foundryProvider();',
            '    return p.languageModel(model);',
            '  }',
            '  …',
            '}',
          ]}
          mark={[1, 2, 4]}
          says={[
            { at: '?.trim().toLowerCase()', is: 'Trailing whitespace and capitals still mean Azure. `provider:check` asserts all three spellings, because an env var arrives from a file somebody edited by hand.' },
            { at: '!raw || raw === \'azure\'', is: 'Unset and empty are the default. Everything else must match a known value or throw with both valid values named.' },
            { at: 'p.languageModel(model)', is: 'The shared interface, not the provider-specific one. The abstraction was already there; the call site was not using it.' },
          ]}
          trap="`provider:check` asserts that Mastra and LangGraph pick the SAME cloud for all five values tested. They select through completely different code, so agreement is a property to assert rather than assume — and it is the check most likely to catch a future divergence."
        />
      </Step>

      <Step n={5} title="Why the default engine refuses rather than quietly working">
        <P>
          Until it was fixed, <code className="font-mono text-ui-fg">LLM_PROVIDER=bedrock pnpm ask</code> ran
          happily on Azure. No error, no warning, a whole run's numbers about a cloud nobody chose — the exact
          failure the switch exists to prevent, sitting in the path that runs when you type nothing.
        </P>

        <P>
          It cannot serve Bedrock for a structural reason. Mastra and LangGraph build their own model object
          and ignore the client they are handed, so the provider choice is theirs to make — five lines each.
          The Agents SDK takes an OpenAI <em className="not-italic text-ui-fg">client object</em>, so reaching
          Bedrock means handing it something that speaks OpenAI's protocol to Anthropic's API. That is
          precisely what <code className="font-mono text-ui-fg">@fde/bedrock</code> is, and it is not wired to
          this loop.
        </P>

        <Key>
          A documented limit that throws is a switch. An undocumented one that runs anyway is the bug.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm provider:check', does: 'Routing on all three engines. Asserts that silence means Azure and that a typo throws with both valid values named.', cost: 'free' },
          { cmd: 'pnpm compliance:check', does: 'Captures the real outgoing request and asserts store:false and tracing disabled — even with OPENAI_API_KEY set.', cost: 'free' },
          { cmd: 'pnpm compliance:mastra', does: 'The same gate for the second engine. Two engines agreeing is a property to assert, not assume.', cost: 'free' },
          { cmd: 'pnpm steering:ping', does: 'One real model call. It says so before it spends anything.', cost: 'money' },
        ]}
      />

      <Caveat
        items={[
          {
            claim: 'No Bedrock path has ever made a request.',
            body: 'Every claim in the right-hand column is about construction and routing, verified offline. The likeliest thing to break on the first live call is structured output through Converse — LangGraph makes a separate structuring call and Converse normalises.',
          },
          {
            claim: 'Two engines measured neutral is not "the engine does not matter".',
            body: 'It was measured on one domain, one suite, one model. It says the swap did not change behaviour here; it does not say a third engine would be free.',
          },
          {
            claim: 'An engine change is a setup change.',
            body: 'eval:diff refuses (exit 2) to compare baselines across one, by design. Record a baseline per engine and compare them by hand.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'tool call', def: 'A model reply asking for a named function with named arguments. The model does not run anything — your code does, and decides whether to.' },
          { word: 'turn', def: 'One model request and its reply. The cap is 12; hitting it is infrastructure, not a wrong answer.' },
          { word: 'engine', def: 'The framework driving the loop — OpenAI Agents SDK, Mastra or LangGraph, behind one contract and selected with LOOP=.' },
          { word: 'store: false', def: 'Tells the provider not to retain the response payload. It defaults to true, which is why it is set explicitly and asserted on the wire.' },
          { word: 'negative control', def: 'A deliberately planted failure that a check must catch. Without one, a check that has only ever passed is indistinguishable from one that cannot fail.' },
        ]}
      />
    </LessonPage>
  );
}
