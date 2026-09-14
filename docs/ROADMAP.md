# The plan — Mastra, then a surface

Two pieces of work, both from reading the job ad literally. Step by step, one at
a time, with a decision point before anything irreversible.

**Status key:** ☐ not started · ◐ in progress · ☑ done

Companion: [`RUN.md`](../RUN.md) for the pillars already walked,
[`GUIDE.md`](../GUIDE.md) §10 for why these two, [`DEPLOYMENT.md`](../infra/DEPLOYMENT.md)
for what happens after.

---

## What the ad actually requires

```
Required: "TanStack Start, React Router or Next.js"            ← we have NOTHING
Required: "an agent framework or SDK such as Mastra, OpenAI
           Agents SDK, Claude Agent SDK or LangGraph"          ← already met
Nice:     "Experience with Mastra and Amazon Bedrock AgentCore"
Ideal:    "a strong product developer with a frontend focus…
           building complete products rather than isolated AI demos"
```

The unmet requirement is the frontend. Mastra is *nice-to-have* — the required
line is already satisfied by the Agents SDK. It is in this plan because it is
worth learning and because shipping on two of the four named frameworks, with an
eval suite proving the port did not break anything, is a stronger sentence than
having used either one.

---

# Part 1 — Mastra

## ☑ A0 · The spike that decides everything — DONE 2026-09-10

**Question:** can Mastra authenticate to Azure AI Foundry with an Entra token?
**Answer: yes.** No API key, so Pillar 6's no-stored-secrets property survives.

```
text : The capital of Sweden is Stockholm.
usage: inputTokens 23, outputTokens 17
keys : text, usage, steps, finishReason, toolCalls, toolResults, response, …
```

**Four findings that shape A2:**

1. **CommonJS works.** `@mastra/core@1.66.0` is dual-published (`require` →
   `dist/index.cjs`). `ai@7.0.97` and `@ai-sdk/openai-compatible@3.0.47` are
   ESM-only, but **Node 22's `require(esm)`** loads them — verified, not
   assumed. The blocker that killed `remark` and `commander@15` does not apply.

2. **The provider is `@ai-sdk/openai-compatible`, not `@ai-sdk/azure`.** The
   Azure one builds the classic `/openai/deployments/{name}?api-version=` path,
   and our endpoint is the `/openai/v1` surface — the same mismatch that made us
   reject the `AzureOpenAI` class earlier the same day.

3. **The bearer goes on through a custom `fetch`**, exactly as in
   `foundry/client.ts`: the SDK takes a static `apiKey` string, not a provider it
   calls per request, so something has to set the header each time.

4. **`generate()` returns what `TurnRecord` needs** — `usage` (input/output/
   reasoning/cached tokens), `steps`, `toolCalls`, `toolResults`,
   `finishReason`. Per-turn accounting is not a blocker.

**Also spotted, for later:** the `Agent` prototype has `approveToolCall`,
`declineToolCall`, `listSuspendedRuns` and `resumeStream`. That is the
human-in-the-loop machinery Pillar 7 currently has no runtime equivalent of —
escalation today is a field the model fills in, not a pause the system enforces.

**Still unknown, to be settled in A2:** strict structured output against the Zod
schema, tool calling through our own `registry.ts`, how the turn cap is
expressed, and what the streaming event shape looks like next to `LoopEvent`.

## ☑ A1 · Hello agent — DONE 2026-09-10

One agent, one tool, one Zod schema, run live. Result:

```
tool executions : 1        (correct args)
object          : {"amount":1000,"source":"record:AUT-4471"}
per-step usage  : [210, 271]
```

Tools **and** strict structured output together, with per-step token counts.
Nothing in the contract is unreachable.

**Four traps, each of which would have cost hours inside A2:**

1. **`execute` is `(inputData, context)` — positional, args first.** The
   `({ context })` shape in older tutorials silently yields `undefined` args.
   Observed: the model looped six tool calls deep and then apologised about a
   "tool error". It reads like a model problem and is an API-version problem.

2. **`experimental_output` is the LEGACY option.** That is where Mastra's own
   *"does not work with tools"* comment lives, and it is misleading if you read
   it in isolation. Today's `generate()` takes
   `structuredOutput: { schema }`, and its overload sits alongside tools.

3. **`supportsStructuredOutputs: true` must be set on the provider.** Without
   it, `@ai-sdk/openai-compatible` sends
   `response_format: { type: 'json_object' }` — *some* JSON, not *this shape* —
   and Foundry rejects the request outright:
   `'messages' must contain the word 'json' … to use 'response_format' of type
   'json_object'`.
   **The dangerous fix is the obvious one:** put the word "json" in the prompt
   and the error goes away, having quietly downgraded Pillar 3 from a strict
   schema to best-effort JSON. Same shape as the Agents SDK's `store: true` — a
   default that weakens a guarantee invisibly.

4. **`toolCalls[].payload`** carries `toolCallId`, `toolName`, `args`, and
   `toolResults[]` mirrors it — both map onto `ToolCallRecord` without
   invention.

**Carried into A2:** `maxSteps` is the turn cap (`stopWhen` also exists, from the
AI SDK). `res.steps[]` with per-step `usage` is the source for `TurnRecord[]`.
`requireToolApproval` and `Agent.approveToolCall` exist — a runtime pause that
Pillar 7 has no equivalent of today.

## ☑ A2 · `packages/agent/src/loop-mastra.ts`

Implement the existing contract in `loop.types.ts`, unchanged:

```
same LoopOptions in · same LoopResult out · same TurnRecord[]
same LoopEvent stream · same DEFAULT_MAX_TURNS of 12 · same Zod schema
```

`registry.ts` tools and `coverage-prompt.ts` stay untouched — they are the
controlled variables. If they have to change, the contract was not a contract.

**DECIDED (revised):** Mastra goes behind a **feature flag**, and the Agents SDK
loop **stays in the build**. Not a migration — a second engine.

```
EMBEDDINGS=foundry|local        already works this way
LOOP=sdk|mastra                 same shape, same idea
```

Both loops stay maintained, both stay testable, and `--loop` is permanent rather
than scaffolding. What that buys:

- **A fallback that is always compiled.** If Mastra cannot do strict structured
  output or per-turn token accounting, you switch a variable rather than restore
  from `archive/`.
- **A/B measurement whenever you want it.** Two baselines on the same corpus,
  same prompt, same schema — the only variable being the engine.
- **The ad's sentence gets stronger.** Not "I moved to Mastra" but "the loop is
  an interface with two implementations, and here is the scorecard for each."

The cost is honest: two implementations of one protocol to keep working, which
is exactly what this repo refused to do for the hand-rolled loop. The difference
is that this time both are frameworks — neither is code we maintain — and the
contract in `loop.types.ts` is the thing being tested by having two.

**DONE 2026-09-10.** `packages/agent/src/loop-mastra.ts` +
`packages/agent/src/loop.factory.ts`
(`LOOP=sdk|mastra`, or `--loop` per run). First live run answered correctly —
$50/21, three citations, conflict resolved by `record:AUT-4471`.

Shared and unchanged, so an engine diff means something: `registry.ts`,
`coverage-prompt.ts`, the Zod schema, `DEFAULT_MAX_TURNS`, and the
`coherenceErrors()` re-check.

**First measured difference, same question:**

```
             turns  tools   in-tok   out-tok   wall
sdk            3      3      8,636    2,073    35.1s
mastra         4      3     12,347    2,271    30.5s
```

~43% more input tokens, and a different turn boundary (4 vs 3 for the same three
tool calls). Cause unknown — more per-step context, or a different definition of
a step. **A4 measures it; do not guess.**

**One parity bug found and fixed:** the SDK hands tool args to `onEvent` as a
JSON string, Mastra as an object, so `--trace` printed `[object Object]` on one
path. Fixed in `ask.ts`. The same divergence would have reached the SSE stream.

## ☑ A3 · `--loop sdk|mastra`, and the compliance check — DONE 2026-09-10

`--loop` on both `ask` and `eval`; `LOOP=` in `.env` for the global default.
The baseline records which engine produced it, and `eval:diff` already treats
engine as part of the setup key — so it refuses to compare across engines
without being told to.

**`pnpm compliance:mastra`** — a SECOND self-test, offline, fake transport and
fake token. Not a re-run of the existing one: that file hands a fake OpenAI
client to `runLoopSdk` and reads captured params, and none of that reaches this
path. Adding an engine without its own wire assertions would leave a loop with
zero verified data-egress properties behind a green suite.

```
  ok  a request was actually built              1 request captured
  ok  registered tools reach the request        tools on the wire: get_policyholder
  ok  structured output is a strict json_schema response_format.type = json_schema
  ok  no server-side retention requested        store = undefined
  ok  exactly one host was contacted, and ours  hosts: compliance.test
  ok  nothing else phoned home                  no request bypassed our transport

NEGATIVE CONTROL
  ok  an agent without tools sends none
  ok  without structuredOutput there is no response_format
```

**`buildFoundryProvider()` is exported for this**, so the test drives the exact
construction production uses. A compliance check that builds its own subtly
different client proves nothing — the trap `loop-sdk.ts` records from its own
history.

**The finding worth keeping:** `response_format.type = json_schema`, not
`json_object`. That assertion is now permanent, so if `supportsStructuredOutputs`
is ever dropped the build fails instead of Pillar 3 quietly weakening.

## ☑ A4 · Prove the port — DONE 2026-09-10

Two full baselines, same corpus, same prompt, same schema, same cases. Only the
engine differs.

```
                 passed   dangerous   in-tok    out-tok   p95
sdk    21:29     35/35        0       596,117   75,223   56.4s
mastra 21:47     34/35        1       442,704   86,800   49.7s
```

**Mastra is 26% cheaper on input and faster** — and the single-question sample
that suggested it was *43% more expensive* was worthless. One question is not a
measurement; that is the whole reason this step exists.

**And Mastra dropped a dangerous failure the SDK did not.** `cov-004`, once in
five — the uncountersigned endorsement, where nothing settles which document
governs:

```
cov-004 run 3/5 … FAIL  3 turns, 2 tool calls
    ✗ escalates: did not escalate
    ✗ flags_conflict: conflicts is empty — it never noticed the documents disagree
```

Three turns and two tool calls, one search short of the passing runs. It answered
confidently without noticing the contradiction. **`coherenceErrors()` cannot
catch this one:** its rule is "an unresolved conflict must escalate", and a run
that records no conflict has nothing to be unresolved. The check that caught it
is `flags_conflict`, in the eval suite.

**Not yet a rate.** One occurrence in 35. Before any engine decision:

```bash
pnpm eval --only cov-004 --repeat 20               # sdk
pnpm eval --only cov-004 --repeat 20 --loop mastra # mastra
```

**Also observed:** Mastra makes fewer tool calls on `cov-002` (5-8 vs 6-11) and
holds `cov-001` at a steady 4 turns / 3 calls where the SDK varies 3-5. Fewer
searches is why it is cheaper — and possibly also why it missed the conflict in
`cov-004`. Cheaper because it looks less hard is not a bargain.

**Which is exactly why the flag is permanent.** Two engines with a measured
difference beats one engine with an opinion.

---

# Part 2 — The surface

## ☑ B1 · `POST /ask` over SSE — DONE 2026-09-10

`loop.types.ts` already emits `turn_start`, `tool_call`, `tool_result`,
`schema_retry`. Today `--trace` is their only consumer. The endpoint streams
them through, then the validated answer as the terminal event.

**DECIDED and built.** `apps/insurance-app/src/routes/api.ask.tsx` — a TanStack Start
server route, not a Nest controller. Nest is gone; one app serves the page and
the endpoint.

```
event: turn_start    {"turn":1}
event: tool_call     {"turn":1,"name":"get_policyholder","args":{"policy_id":"AUT-4471"}}
event: tool_result   {"turn":1,"name":"…","ok":true,"ms":4,"summary":"record AUT-4471"}
event: schema_retry  {"turn":3,"error":"…"}
event: answer        {…CoverageAnswer…, "run":{turns,toolCalls,inputTokens,ms,engine}}
event: error         {"message":"…","stoppedBecause":"…"}
:heartbeat           every 15s
```

Exactly one terminal event — `answer` or `error` — always fires.

**The answer is NOT streamed token by token, on purpose.** Pillar 3 says an
answer is a validated object; half-arrived JSON has not passed
`coherenceErrors()` yet, so streaming it would put an unchecked dollar figure on
screen for two seconds. The live feeling comes from the tool events, which are
real events rather than a typing animation.

**Verified live** — timestamps from the real loop, not a mock:

```
05.617  tool_call    get_policyholder {"policy_id":"AUT-4471"}
09.248  tool_call    search_policy … PA-END-2024-03
09.251  tool_call    search_policy … (two in parallel)
15.208  : heartbeat
30.209  : heartbeat
42.889  answer       "$50 per day, up to 21 days per occurrence…"
```

Both heartbeats fell inside the 30-second gap a proxy would have killed.

**Built in two bits on purpose:** fake events on a timer first, so the transport
was proven before a 30-second model call was layered onto it. When the real loop
then failed with ENOENT, the plumbing was never a suspect.

## ☑ B2 · The fail-closed guard — DONE 2026-09-10

`packages/guard/src/guard.ts`, called by `/api/ask` before it does any
work. Unset key ⇒ **loopback only** in dev and a 503 refusal in production,
never open. The obvious implementation fails *open*: forget the variable in a
deploy config and you have silently shipped an unauthenticated endpoint.

It got its negative control — `pnpm guard:check` (`security/guard-selftest.ts`),
in the same shape as `compliance:check`, asserting that every denial branch
denies. What is left is deployment-side: set `API_KEY` wherever this runs.

## ☑ B3 · Log the HTTP path — DONE 2026-09-10

`surface: 'http'` into the existing request log, so customer traffic, eval
traffic and ingest stay separable in one table.

## ◐ B4 · Workspace + the page — workspace DONE, page next

**Done: the repo is a Turborepo workspace.**

```
packages/insurance   @claims/insurance   CommonJS · ts-node · no HTTP, no React
apps/insurance-app          @claims/insurance-app      ESM · Vite · React · TanStack Start
infra             docker-compose.langfuse.yml, DEPLOYMENT.md
```

```bash
pnpm dev        # turbo run dev --filter=@claims/insurance-app  → builds the domain FIRST
                #   then Vite on port 3200
pnpm build      # turbo run build
```

The web app imports the domain as a package — `@claims/insurance/loop` — via an
`exports` map, and Vite is told to **externalise** it so Node loads the built
CommonJS rather than bundling it. Bundling would either choke on the `require()`
of ESM-only packages or produce a second copy of the domain with different module
semantics: two loops pretending to be one.

**Four things that cost time, all now comments in the config:**

- **`apps/insurance-app/src/router.tsx` must export `getRouter`.** The framework imports
  that exact name. The build error says so plainly, which is the good kind of
  convention.
- **Dev SSR and the production build need externals told separately** —
  `ssr.external` for the dev server, `build.rolldownOptions.external` for the
  build. And they match differently: `ssr.external` matches by PACKAGE (so
  `@claims/insurance` covers `@claims/insurance/loop`), Rolldown matches strings
  EXACTLY, so subpaths slip past unless you use regexes.
- **`"dev": "turbo dev"` in the root package recurses** — Turbo runs the root's
  own `dev` task, which calls Turbo. Filter it: `turbo run dev --filter=…`.
- **Port 3000 is Langfuse on this machine.** An early check returned 200 from
  Langfuse while our server was not running at all. Dev is on **3200**.

**And a real bug the workspace surfaced:** `config/domain.ts` resolved the
corpus from `process.cwd()`, which is the repo root for `pnpm ask` and
`apps/insurance-app` for the dev server — so every lookup returned ENOENT under the web
app. Now anchored in `packages/insurance/src/config/paths.ts`: `PACKAGE_ROOT` for
the corpus, the eval cases and their baselines, `REPO_ROOT` for the one shared
`.env` and `logs/requests.jsonl`. `CORPUS_DIR` / `RECORDS_DIR` still override
for deployment. The model, for its part, refused to answer rather than inventing
a deductible.

### Still to build — the page

```
question box + policy id
tool calls appearing live      "looking up AUT-4471…"
the answer when it arrives
citations as links that open the real chunk
escalation as a DISTINCT STATE, not a paragraph — Pillar 7 is a field
```

**Exit:** refreshing mid-answer does not lose the run; every citation opens its
chunk; one logged line per real request with a cost on it.

---

## Still open

- **The citation prefix `policy:` is a misleading name — resolver fixed, rename
  still open.** Observed
  2026-09-11, 1 run in 40: the model cited `record:DET-2024-004473-ROR` — a
  reservation of rights, which is a DOCUMENT and should have been `policy:`.
  The check is right to fail it and the same id resolves with the correct
  prefix, but the vocabulary invites the mistake: `policy:` / `record:` made
  sense for twelve policy forms, and **67 of 79 documents are not policies**. A
  determination genuinely is a kind of record.
  **DONE:** `citations_resolve` no longer reads the prefix. It asks "does this
  name something real in either store", which is what the check is for — a
  wrong prefix on a real id is a formatting slip, not a fabrication. An id that
  exists in neither store still fails, so the check keeps every tooth.
  `cites_form` still requires `policy:` because it asks a different question.
  **STILL OPEN:** the name itself. Renaming to `doc:` / `record:` touches the
  schema and the prompt, so it needs a baseline either side — and it would be a
  prompt change on the strength of one run in forty. Watch whether the model
  keeps choosing `record:` for determinations across the next few baselines: if
  it does, the vocabulary is the cause and the rename is justified by evidence.

- **FIXED 2026-09-11: free-text policy ids are normalised, not signposted.**
  Measured first: `cov-008` (id in the question text) failed ~1 in 5 where
  `cov-001` (id passed as a field) never failed — always the same shape, two
  tool calls, the attached endorsement never searched, a confident $40 where the
  answer is $50. The first conclusion written here was *"always pass the id
  structurally"*, which was a workaround: it tells people not to use the path
  that breaks, on a surface where typing a question IS the interface.
  The fix is `policyIdInQuestion()` in `coverage.ts` — if the caller passes no
  id and the question contains exactly one, it is used, so every surface takes
  the same path into the loop and the degraded path stops existing. Two distinct
  ids passes nothing rather than guessing.
  **Result: cov-008 3/5 → 5/5, tool sequence identical on all five runs.**
  `cov-008` now tests the fix instead of documenting the flaw, and goes flaky
  again if anyone removes the normalisation.
- **`cov-008` measured, and the theory it was built on did not survive.**
  2026-09-11: `pnpm ask` without `--policy` answered $40/day twice out of two on
  Mastra — two tool calls, endorsement never searched, no conflict recorded. The
  case was written to pin that down. It did not reproduce: **10/10 runs across
  both engines answered $50/21 with three tool calls each.** The registries are
  identical and both paths go through `askCoverage`, so no structural difference
  explains the ask-path failures — n=2 was simply too small. The case stays,
  because it tests a path nothing else tests (id in free text rather than passed
  as a field), but it is no longer evidence of anything about engines.

- **A broken check shipped and reported correct answers as dangerous.**
  `cov-008` carried `answer_lacks:$40`, which failed three runs whose answers
  were right: *"$50 per day … replaces the form's $40/day"* is exactly what the
  prompt asks for, and a substring search cannot tell an answer from an
  explanation of what it supersedes. Removed. **This was already a known bug** —
  `cov-003`'s note records dropping the same check for the same reason — so the
  lesson is that a documented fix in one case does not stop the next case
  reintroducing it. Worth a guard: any new `answer_lacks` should be justified
  against that note.
- **`search_guidance` is built but unmeasured.** 2026-09-11: two tools, split by
  question type — `search_policy` for what a policy pays, `search_guidance` for
  how a claim must be handled. Registered in both engines. Verified by hand
  against the index: the jurisdiction gate returns the Illinois circular for an
  Illinois policy and the New York one for New York, and the status gate is
  load-bearing — **the superseded bulletin outranks its replacement on
  similarity** (0.654 vs 0.518), so without the gate the stale document wins.
  **No eval case exercises it yet.** The cases that would — superseded-bulletin,
  stale-determination and its control, total-loss tax — are designed in
  [`CORPUS-PLAN.md`](plans/CORPUS.md) §2.5 and unwritten. Until they exist, the
  tool is code nothing measures, and `cov-001`–`cov-008` all pass without ever
  calling it.
- **`cov-004` on Mastra** — one dangerous failure in 35, rate unmeasured.
  `--only cov-004 --repeat 20` on both engines before any engine decision.
- **`gpt-5-mini` pricing is PROVISIONAL** — settle from Cost Management.
- **`API_KEY` in a deploy config** — B2's guard is written and passing, but it
  refuses to serve in production until the variable is set. That is deliberate;
  it still has to be done before anything is reachable.
- **Production packaging** — `dist/server/server.js` is a request handler, not a
  listening server; a deployment needs an adapter.
