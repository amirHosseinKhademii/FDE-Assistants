# Engines and providers — two switches, and what they each do

*Written 2026-09-14, from the code rather than from the READMEs. Every "what it
actually calls" line below was read out of the shipped package or captured on
the wire; where something is wired but has never run, it says so.*

Companion: [`BEDROCK.md`](BEDROCK.md) for the AWS estate, the quota defect and
the Support case. [`SWAP.md`](SWAP.md) for the hand-written predecessors.
[`RETRIEVAL.md`](RETRIEVAL.md) for how a passage reaches the loop in the first
place, and [`AUGMENTED-GENERATION.md`](AUGMENTED-GENERATION.md) for what the
loop is handed and what it must give back — this doc owns the per-engine
mechanics, that one owns the contract and its reasons.

---

## The one-paragraph version

An "agent" here is a `for` loop around `fetch`. Send the question and a list of
tools; the model either answers or asks for a tool; run the tool, send the
result back, repeat under a cap. **All three engines do exactly that** — they
differ in one line of ours, plus their own defaults. **Providers** are a
separate question entirely: *which cloud serves the model.* Two switches, and
they are not symmetric.

```
LOOP=sdk|mastra|langgraph          which engine drives the loop   (default: sdk)
LLM_PROVIDER=azure|bedrock|local|hosted    which cloud serves the model  (azure)
      local   no cloud at all — loopback, no credential, nothing leaves
      hosted  a THIRD PARTY on an OpenAI-compatible endpoint, with a key
                                   — see docs/FREE.md
```

---

## 1 · What the loop is, under the hood

No magic layer. One trip round the loop is one HTTPS POST with a JSON body:

```json
{ "model": "gpt-5-mini",
  "messages": [ "...the conversation so far..." ],
  "tools":    [ "...what the model may ask for..." ],
  "response_format": { "type": "json_schema", "json_schema": { "strict": true } } }
```

The reply either carries text, or carries `tool_calls`. Your code looks at
which, and decides whether to go round again. That is the entire idea.

```
  ┌─ you ──────────────────────────────────────────────────────┐
  │  question + tool list + answer schema                      │
  └───────────────┬────────────────────────────────────────────┘
                  ▼
        ┌───────────────────┐   asked for a tool    ┌──────────────────┐
        │  POST to the model│ ────────────────────► │ registry.ts runs │
        │                   │ ◄──────────────────── │ it, records it   │
        └─────────┬─────────┘    result as JSON     └──────────────────┘
                  │ answered                          ▲
                  ▼                                   │ up to 12 times
        ┌───────────────────┐                         │ (DEFAULT_MAX_TURNS)
        │ validate the shape│─── wrong shape ─────────┘
        └─────────┬─────────┘    (handed BACK to the model, never repaired)
                  ▼
              the answer
```

**What is ours and shared across all three engines:** `registry.ts` (the tools
and their audit records), the prompt, the Zod schema, `DEFAULT_MAX_TURNS`, and
the coherence re-check. That is deliberate — if any of it had to change per
engine, the contract in `core/loop.types.ts` would not be one.

---

## 2 · The three engines

**The difference is literally one line.**

| Engine | `LOOP=` | The line that drives the loop | Where |
|---|---|---|---|
| OpenAI Agents SDK | `sdk` *(default)* | `run(agent, input, { maxTurns })` | `sdk/loop-sdk.ts:227` |
| Mastra | `mastra` | `agent.generate(input, { maxSteps, structuredOutput })` | `mastra/loop-mastra.ts:297` |
| LangGraph | `langgraph` | `agent.invoke({ messages }, { recursionLimit })` | `langgraph/loop-langgraph.ts:296` |

### Where they genuinely differ

| | Agents SDK | Mastra | LangGraph |
|---|---|---|---|
| **HTTP surface** | `/responses` | `/chat/completions` | `/chat/completions` |
| **Underlying lib** | `@openai/agents` | `@mastra/core` + AI SDK | `@langchain/langgraph` + LangChain |
| **How it counts the cap** | turns | steps | **graph** steps — one turn is two, so ours is `maxTurns * 2 + 1` |
| **Structured output** | folded into the same call (`outputType`) | folded in (`structuredOutput`) | **a SEPARATE extra model call** after the loop ends |
| **Azure auth** | `setDefaultOpenAIClient` | custom `fetch` sets the bearer | custom `fetch` sets the bearer |
| **Can reach Bedrock** | **no** — see §4 | yes | yes |
| **Can reach a HOSTED compatible endpoint** | **no** — same reason as the row below: Gemini, Groq and the rest all serve `/chat/completions`, which is what "OpenAI-compatible" means in practice | yes | yes |
| **Can reach a LOCAL model** | **no** — and the reason is the row above, not a credential: Ollama and llama.cpp serve `/chat/completions` and do not implement `/responses` | yes | yes |

### WHICH ENGINES REACH GEMINI, AND WHY THE ANSWER CHANGED

This heading used to read "only one of three, and for three different reasons".
It was true on 2026-09-16 and wrong by 2026-09-17, which is the hazard of
putting a COUNT in a heading: the body below was corrected and the heading kept
asserting the old number at the top of the section, where it is read first.

MEASURED 2026-09-16 against `gemini-3.5-flash-lite`, the same question on all
three:

| engine | result | why |
|---|---|---|
| `sdk` | **refuses** | drives the **Responses API**; Gemini serves `/chat/completions`, like every other OpenAI-compatible provider |
| `langgraph` | **works, since 2026-09-17** | needed two wire-level repairs — see below |
| **`mastra`** | **works** | builds its model against chat-completions and carries the whole message back |

**The `sdk` refusal is deliberate and correct.** `setOpenAIAPI('responses')` puts
it on an API only OpenAI and Azure implement. It refuses by name rather than
failing at the transport — §4.

**LangGraph reached Gemini on 2026-09-17, and it took TWO repairs, not one.**
This section used to record a single cause. The second was unreachable until the
first was fixed, which is why nobody had seen it.

**Repair 1 — the signature.**

```
400 Function call is missing a thought_signature in functionCall parts.
This is required for tools to work correctly … function call
`default_api:get_recall`, position 2.
```

Gemini attaches a `thought_signature` to every function call it emits and
requires it **echoed back** on the following turn. Over the OpenAI-compatible
surface it arrives nested inside the tool call:

```json
"tool_calls": [{
  "id": "call_38953",
  "function": { "name": "get_recall", "arguments": "{…}" },
  "extra_content": { "google": { "thought_signature": "El4KXAERTTIPPl1…" } }
}]
```

LangChain's `ChatOpenAI` parses a tool call into `{ id, name, args }` — the
three fields the OpenAI spec defines — so `extra_content` is dropped on the way
in and cannot be present on the way out.

This section previously guessed the fix would be "probably an `additionalKwargs`
passthrough". It is one level lower: **the message object never carries the
field at all**, so the repair has to happen on the wire.

**Repair 2 — the trailing model turn.**

With the signature carried, the conversation gets one request further:

```
400 Requests ending with a model turn are not supported.
```

The offending request is LangGraph's **structured-output call** — the separate
round trip `createReactAgent` makes when `responseFormat` is set. Logged:

```
roles: user > assistant > tool > assistant
response_format: true · tools: 0
```

It replays the conversation, which ends with the model's own prose, and asks for
it back as JSON. Every other provider accepts that; Gemini requires the last
turn to be the caller's.

**Both live in `packages/agent/src/langgraph/hosted-round-trip.ts`**, wrapped
around the client's `fetch` — the only place both halves of a round trip are
visible. `pnpm safety:round-trip` asserts them against a fake fetch, with a
control for each: a request that already ends with a caller turn is sent
unchanged, and on any other provider the body passes through byte-for-byte.

**The two repairs are not equivalent, and the file says so.** Repair 1 puts back
something the provider itself sent. Repair 2 **adds a message the caller did not
write** (`"Continue."`), which is a different kind of act — it is gated on
`LLM_PROVIDER=hosted` rather than on message shape, because a trailing assistant
message is legal everywhere else.

**So the honest statement is still narrower than "three interchangeable
engines":** two of three reach Gemini, and the second one only after two
wire-level repairs to faults that no configuration could reach. The remaining
one is locked out by its HTTP surface.

That is the whole argument for having built three. A single-engine stack would
have called both of these faults "Gemini does not support tools properly" and
been wrong twice.

**`hosted` now has TWO engines: `mastra` and `langgraph`.** `local` has only
been exercised on `mastra`. `sdk` remains open work:

- **`sdk`** — would need `@fde/bedrock`-style translation, or the SDK to accept a
  chat-completions client. Large.
- **`langgraph` on `local`** — untested. The repairs above are gated on
  `hosted`, so a local server needing either would fail the same way Gemini did.

**Also open: choosing the provider from the UI.** Each desk already has an
`Engine` picker (`sdk` / `mastra` / `langgraph`) but no provider picker, so
`LLM_PROVIDER` is a deploy-time variable only. Given the matrix above, the two
controls are not independent — a provider picker has to disable the engines that
cannot serve the chosen provider, or it will offer combinations that are
guaranteed to fail.

### The local seam has a second trap, and it is not a credential

**MEASURED 2026-09-16**, Ollama 0.34.1 / `qwen2.5:7b`, three requests differing
only in what was on the wire:

| sent | `finish_reason` | tool calls | what came back |
|---|---|---|---|
| tools, no `response_format` | `tool_calls` | `search_policy({"query":"rental car reimbursement AUT-4471 per day"})` | — |
| `response_format`, no tools | `stop` | none | an answer object, invented |
| **both — what the loop sends** | `stop` | **none** | `"To determine the daily rental car reimbursement for AUT-4471, I need to search the policy corpus…"` |

The third row is the finding. The model is *saying it needs to search* while the
grammar forces it to emit an answer object instead. llama.cpp constrains
generation token by token to the schema, and a tool call is not a string that
schema can produce — so the call is never emitted, and **nothing errors**.

What it cost before it was found: `turns=1 toolCalls=0`, and a schema-VALID
answer citing `policy:CA 00 02 10 15#2.2.1` — a form never retrieved, quoting a
sentence nobody wrote. Every gate green, the answer fabricated. On Azure the same
code path called at least one tool in 139 of 146 logged mastra runs, 98 of them
two or three — so seven Azure runs answered toolless too, and the comparison is
139/146 against 0/1 rather than anything cleaner. It is still the server rather
than the loop or the model; the distribution is just the honest form of saying
so.

The fix is Mastra's own second pass — `structuredOutput: { schema, model }`
generates with tools and no grammar, then shapes the result in one more call.
`mastra/loop.ts`'s `structuringPass()` applies it **only** when
`LLM_PROVIDER=local`: Azure serves tools and a strict schema in one request, and
a second pass there would move every number in a committed baseline to fix a
problem that exists somewhere else.

After: `turns=3 toolCalls=2`, and citations carrying the corpus's own words out
of a form that really exists — 14.1s, $0.00.

**THE FIX RESTORES RETRIEVAL. IT DOES NOT MAKE THE ANSWER RIGHT, and the
difference matters.** That question is eval case `cov-008`, whose key is $50/day
for 21 days out of `PP 03 24 06 24`, the endorsement attached to AUT-4471. The
local run cited `PP 00 01 06 24` — the BASE form, $40/day for 30 days — and
escalated. `cov-008`'s own note describes that failure shape exactly: *"two tool
calls, the attached endorsement never searched."* An escalation is not evidence
of care when the thing escalated over is a document the model never looked for.

What is measured, then, is narrower than it first reads: the second pass turns
zero tool calls into two and fabricated citations into real ones. Whether a 7B
model then reasons correctly across a base form and its endorsement is a
separate question, and on this case it did not.

### LangGraph was never affected, and the reason is the thing this file called a cost

`langgraph/loop.ts`'s header records an "honest asymmetry": `createReactAgent`'s
`responseFormat` *"will make a separate call to the LLM to generate the
structured response after the agent loop is finished"* — an extra model call on
every structured run, written down as an engine difference worth surfacing
rather than papering over.

On a local server that asymmetry is not a cost. It is the fix, already present.
The loop runs with tools and no grammar because the grammar is not applied until
the loop is over. **Measured the same day, same question, same model:
`LOOP=langgraph LLM_PROVIDER=local` → `turns=5 toolCalls=3`, with no change to
any LangGraph file.**

So the ranking inverts depending on where the model is. On Azure, folding
structuring into the same call is one fewer round trip and Mastra is the cheaper
engine. Against llama.cpp, folding them is what silently disarms the tools, and
the engine that "wastes" a call is the only one of the three that worked
untouched. `structuringPass()` is Mastra being taught to do what LangGraph
already did.



Three of those cost real money or real debugging:

- **LangGraph's extra structuring call** is per run, on every structured
  answer. LangGraph's own docs state it plainly. It is an engine difference to
  surface, not to paper over.
- **The `* 2 + 1` cap.** Get it wrong and the cap bites in the wrong place, and
  a turn-cap stop reads as a wrong answer rather than as infrastructure.
- **`setDefaultOpenAIClient` is first-write-wins.** The SDK caches the client
  the first time it resolves a model and ignores later calls. A compliance test
  once had exactly that bug and recorded **zero** requests while looking green.

### What a framework costs you: its defaults are not your defaults

Both of these were found by reading the SDK's **source and types**, not its
docs, and both are opt-**out** (`sdk/loop-sdk.ts:17-45`):

| Default | What it does | Why it matters here |
|---|---|---|
| `store: true` | the provider retains every response payload | claim data persisted somewhere nobody agreed to, introduced by what looked like a pure refactor |
| tracing **ON** → `api.openai.com` | ships model inputs, tool args **and tool results** | a **second destination**. Model calls go to an EU Azure endpoint we chose; traces would leave regardless — a cross-border transfer introduced by a library default |

The tracing one is only *accidentally* safe today: the exporter no-ops without
an OpenAI key, and we authenticate with Entra. The day someone adds
`OPENAI_API_KEY` to `.env` for an unrelated reason, claim text starts flowing.

> **The transferable rule, and the reason `compliance:check` exists:** adopt the
> framework, then pin the compliance-critical behaviour with a test. Don't trust
> a default. Don't trust the docs. **Assert it on the wire.**

### When to use which

| Shape of the problem | Engine | Why |
|---|---|---|
| One question, one decision, a bounded walk | **sdk** or **mastra** | Either. Measured 2026-09-11 on insurance: both correct, one steadier, one cheaper on some cases and dearer on others. A third engine here is a redundant way to do a solved job. |
| Many rows, per-row state, a work list — and a lost run is expensive | **langgraph** | What it is actually built for: checkpointed, auditable per-step state. Scoped to pharma's N2 bottleneck rather than bolted on everywhere. |
| You need a second opinion on your own contract | **any two** | One implementation cannot test the claim that the engine is replaceable. Two can, and the eval suite settles it rather than an opinion. |

> **An engine change is a SETUP change.** `eval:diff` refuses (exit 2) to
> compare baselines across one, by design. Record a baseline per engine and
> compare them by hand.

---

## 3 · What the provider stuff is doing here

**Different question.** The engine decides *how the loop is driven*. The
provider decides *which cloud answers*. The repo was Azure-only; AWS was added
because 8 of 24 Swedish AI-engineer ads name it, and because `@fde/foundry`'s
docstring claimed *"a customer on AWS writes a sibling of this and changes
nothing else"* — an assertion nobody had tested.

### Three ways to reach AWS, and they don't share an API

Read out of each package's own `dist/`, not its README:

| Path | What it calls | AWS surface | Size |
|---|---|---|---|
| `@fde/bedrock` — hand-written | `AnthropicBedrock.messages.create` | **Anthropic Messages API** | ~130 lines + 30 assertions |
| `@ai-sdk/amazon-bedrock` — Mastra | `/converse`, `/invoke` | **Converse**, invoke fallback | ~5 lines |
| `@langchain/aws` — LangGraph | `ConverseCommand` | **Converse** only | ~5 lines |

**So neither framework provider speaks Anthropic at all.** Both speak Converse —
AWS's own cross-model normalisation layer, which does the translating
server-side.

That reframes what the hand-written adapter buys. Not *"the same thing for 25×
the lines"* but **access to fields Converse normalises away.** `pause_turn` is
the concrete one: `@fde/bedrock` passes it through unmapped, precisely because a
paused turn is resumable and a stopped one is not — and a layer whose job is to
make every model look alike has nowhere to put that.

### The four things that do not survive writing the translation yourself

From `@fde/bedrock`'s 30 assertions — the transferable part of the port:

| | OpenAI | Anthropic | Consequence |
|---|---|---|---|
| system prompt | `role: 'system'` in the message list | a separate top-level field, no such role | multiple system messages get **joined** — a choice, not a law |
| `max_tokens` | optional | **mandatory** | a default (16,000) is invented — a behaviour change hiding in a type signature |
| `json_schema.name` | **required** | nowhere to put it | the request type must require the **union** of what both need while using only the **intersection** of what both support |
| `pause_turn` | no equivalent | resumable | passed through unmapped rather than flattened to `stop` |

Two more findings that generalise:

- **`store: false` comes free on Bedrock.** Its Messages API has no server-side
  conversation state, so the property holds by construction rather than by
  assertion.
- **Embeddings cannot follow.** Anthropic models do not do embeddings at all;
  Bedrock serves them via Titan/Cohere. `@fde/grounding` stays on Azure. An
  architectural limit, not a gap in the work.

---

## 4 · The matrix — and its hole

**This is the chart to read.** `LOOP` down the side, `LLM_PROVIDER` across.

| | `LLM_PROVIDER=azure` *(default)* | `LLM_PROVIDER=bedrock` |
|---|---|---|
| **raw `chat.completions.create`**<br>*(steering's extract + ping)* | ✅ **live** — real paid calls | ⚙️ wired via `@fde/bedrock` — **never reached the network** |
| **`LOOP=sdk`** *(default engine)* | ✅ **live** — the measured eval baseline | ⛔ **REFUSES** — see below |
| **`LOOP=mastra`** | ✅ **live** | ⚙️ wired via `@ai-sdk/amazon-bedrock` — **never reached the network** |
| **`LOOP=langgraph`** | ✅ **live** | ⚙️ wired via `@langchain/aws` — **never reached the network** |

```
✅ live      real calls have gone over this path
⚙️ wired     the code is there, typechecked and asserted offline; no request has ever been made
⛔ refuses    throws on purpose, naming what to use instead
```

**Only the Azure column has ever touched the network.** The entire Bedrock
column is blocked on one thing: the account's on-demand inference quota reads
`0.0`, an AWS provisioning defect with no self-service path. See
[`BEDROCK.md`](BEDROCK.md) § *Where it is blocked*.

### Why the default engine refuses

`LOOP` defaults to `sdk`, and until 2026-09-14 that loop had **no
`LLM_PROVIDER` switch at all** — so `LLM_PROVIDER=bedrock pnpm ask` ran happily
on Azure. No error, no warning, a whole run's numbers about a cloud nobody
chose. That is exactly the failure the switch exists to prevent, sitting in the
path that runs when you type nothing.

It cannot serve Bedrock for a structural reason worth knowing:

```
mastra / langgraph   build their own model object, ignore the `client` argument
                     → the provider choice is theirs to make            → 5 lines

agents-sdk           takes an OpenAI CLIENT OBJECT (setDefaultOpenAIClient)
                     → reaching Bedrock means handing it something that speaks
                       OpenAI's protocol to Anthropic's API
                     → which is precisely what @fde/bedrock IS
                     → and it is not wired to this loop yet
```

So it throws, naming `LOOP=mastra` / `LOOP=langgraph`. **A documented limit that
throws is a switch; an undocumented one that runs anyway is the bug.**

---

## 5 · What asserts all this, and what none of it proves

```bash
pnpm provider:check      # 20 checks — routing on all three engines, offline, free
pnpm bedrock:check       # 30 checks — does the hand-written translation translate
pnpm compliance:check    #  9 checks — agents-sdk: store:false, tracing off, on the wire
pnpm compliance:mastra   #  8 checks — mastra: strict json_schema, one host, nothing phones home
pnpm steering:ping       # THE ONLY ONE THAT SPENDS MONEY — one real call, says so first
```

`provider:check` asserts silence means Azure; case and trailing whitespace still
mean Azure; `bedrock` carries the **`eu.` inference profile** rather than the
Azure deployment name; `BEDROCK_MODEL` overrides it; a typo **throws** with both
valid values named; the Agents SDK refuses; and — the one that matters most —
Mastra and LangGraph pick the **same cloud** for all five values tested. They
select through completely different code, so agreement is a property to assert,
not assume.

Each of these carries a **negative control** that plants a false assertion and
requires the counter to move. A check that has only ever passed is
indistinguishable from one that cannot fail.

### What none of it proves

| | |
|---|---|
| **No Bedrock path has ever made a request.** | Every claim in §3 and §4's right-hand column is about *construction and routing*, verified offline. |
| **AgentCore is not built.** | The ad says "Bedrock AgentCore" — a separate managed agent-runtime product. This is `bedrock-runtime` model invocation. Different thing, blocked behind the same quota plus more. |
| **Structured output through Converse is untested.** | The likeliest thing to break on the first live call — `createReactAgent`'s `responseFormat` makes a separate structuring call, and Converse normalises. **Try this first when quota clears.** |
| **`archive/pillar-2-handrolled/loop.ts` is referenced and absent.** | Three docstrings and `CLAUDE.md` point at it as *"the reference for what the protocol looks like underneath"*. It is not in this repo — never committed. Same gap as the `.github/` / `infra/` loss that `f2756bb` fixed, not yet caught. |
