# Running the whole thing for nothing

*Written 2026-09-16, the day the Azure resource group was deleted. Every figure
here was measured on this machine on that day; none of it is quoted from a
vendor page.*

The engagement was built on Azure AI Foundry and it was costing real money. This
is what replaced each paid piece, what the replacement actually does, and — more
usefully — the three things that went wrong on the way, because each of them
fails silently. §7 is what it costs in accuracy, which is a lot.

---

## 0 · The whole day in one table

Azure Foundry was deleted on 2026-09-16 because it cost money. Three
replacements were tried. **Only one of them works.**

| | Azure `gpt-5-mini` | local `qwen2.5:7b` RTX 3090 | local `qwen2.5:32b` RTX 4090 | **hosted Gemini flash-lite** |
|---|---|---|---|---|
| `compat:check` §1–3 | — | pass | pass | **pass** |
| `compat:check` §4 (tools+schema) | — | **FAIL** | **FAIL** | **pass** |
| `cov-008` (the hard case) | correct | fabricated | **wrong** | **correct** |
| `eval:smoke` cases green | **6/7** (30/35 runs) | **1/8** | not run | **6/8** (paced) |
| **false answers (dangerous)** | — | **3** | — | **2** |
| failures were… | — | **judgment** | **judgment** | **judgment, once pacing removed the quota noise — §10** |
| latency | — | 14 s | 80 s | **8.8 s** |
| cost | $$ | $0 | $0 | **$0** |

**The conclusion is the "failures were" row, not the pass rate.** The 7B failed
by answering confidently out of documents it had never read — the exact failure
this engagement exists to catch. Gemini failed only by not getting a turn: every
case that ran came back correct.

**Bigger hardware did not help.** A 32B on a 4090 fails §4 identically to a 7B on
a 3090, because the defect is in llama.cpp and not in the model — §9.

### What to run

```bash
pnpm compat:check                                     # verify the endpoint
LOOP=mastra pnpm --filter @claims/insurance ask "…"   # ask something
pnpm eval:smoke                                       # the suite
```

`.env` carries `LOOP=mastra`, `LLM_PROVIDER=hosted`,
`HOSTED_MODEL=gemini-3.5-flash-lite`, `EMBEDDINGS=local`. **`LOOP` is not
optional** — §11.

---

## 1 · The scorecard

| what it was | what it is now | free? |
|---|---|---|
| chat model — Foundry `gpt-5-mini` | **`LLM_PROVIDER=hosted`** — a free tier on someone else's GPU (Gemini by default) | **yes**, and §8 is why this beats local |
| — the same, on your own hardware | `LLM_PROVIDER=local` — Ollama, `qwen2.5:7b`, RTX 3090 | yes, but see §7 |
| embeddings — `text-embedding-3-small`, 1536 dims | `EMBEDDINGS=local`, bge-small, 384 dims | **yes** |
| Postgres + pgvector | Neon serverless free tier | **yes**, with a trap — §5 |
| traces / dashboard | Langfuse, self-hosted (`infra/docker-compose.langfuse.yml`) | **yes**, already was |
| chat model, LOCAL DEV ONLY | `scripts/claude-code-shim.mjs` — the Claude Code subscription behind an OpenAI endpoint | **yes**, 3 of 4 checks — §8b |
| deployment — Azure Container Apps | **rebuilt and free** — Consumption profile, `minReplicas 0` | **yes** — `infra/RESTORE.md`, and §11 for the two env vars it still needs |

Deployment was the one real gap when this was written on the morning of
2026-09-16. It closed that afternoon: the estate was rebuilt scaled-to-zero on
the Container Apps free grant — see `infra/RESTORE.md` — so the honest answer is
now "free, with two environment variables missing", not "run it locally".

---

## 2 · The machine

```
GPU    NVIDIA RTX 3090, 24 GB    23.3 GiB free to the runner
CPU    Intel i7-11700KF, 8c/16t
RAM    31 GB
disk   39 GB free after the reclaim in §3
```

`qwen2.5:7b` loads at **6.6 GB, 100% on GPU**, default context 32768. That
leaves roughly 16 GB spare — a 14B model fits comfortably, and a quantised 32B
would fit with the context reduced. Nothing here is close to the hardware's
limit; the constraint turned out to be model *behaviour*, not memory.

---

## 3 · The disk reclaim, and the command not to run

`docker system df` advertised **58.44 GB of images and 10.07 GB of volumes as
reclaimable**. The obvious command is `docker system prune -a --volumes`, and on
this machine it would have destroyed:

- **`sam3d:cu121`, 48.4 GB** — the deliberately Docker-isolated SAM-3D
  environment for the PhD work. Its own `CLAUDE.md` says it is isolated
  *because* its pinned torch stack collides with the shared venv. Rebuilding it
  is a day.
- **`cvat_cvat_data` and siblings, ~9.5 GB** — objective-3 annotation data.
- **`e0fd588…`** — the `claims-pgvector` volume, i.e. *this repo's ingested
  index*. It read as reclaimable for one reason only: the container was
  **stopped**.

That last one is the whole lesson. **"Reclaimable" means "not attached to a
running container." It does not mean "safe."** Anything you stopped last week
is, by that definition, garbage.

What was actually reclaimed — build cache and dangling images only, nothing
named, nothing attached:

```bash
docker builder prune -f      # 13.05 GB
docker image prune -f        #   805 MB
```

**25 GB → 39 GB free.** The 58 GB the tool offered was never the number.

---

## 4 · Wiring the app to the local model

```bash
ollama serve                              # binds 127.0.0.1:11434
ollama pull qwen2.5:7b
pnpm local:check                          # the gate — see below

LOOP=mastra LLM_PROVIDER=local EMBEDDINGS=local \
  pnpm --filter @claims/insurance ingest  # rebuild the index at 384 dims
LOOP=mastra LLM_PROVIDER=local EMBEDDINGS=local \
  pnpm --filter @claims/insurance ask "…"
```

Four things about that are not obvious.

**`LOOP=sdk` will refuse, and should.** The default engine calls
`setOpenAIAPI('responses')`. Ollama and llama.cpp serve `/v1/chat/completions`
and do not implement `/v1/responses`, so pointing the default engine at a local
server fails at the *transport* with an error that reads like a broken install.
It refuses by name instead. `LOOP=mastra` and `LOOP=langgraph` build their own
model objects and both serve `local`.

**`pnpm local:check` exists because the thing most likely to break is the answer
contract, not the connection.** It asserts a strict `json_schema` with
`additionalProperties: false` comes back with exactly the required keys, that a
nullable field is respected, that a tool call carries the right extracted
argument — and it has a **negative control**: an integer bounded to exactly 5 on
a question about nothing numeric. Without that control, every green tick would
only mean the model felt like complying. Both `qwen2.5:7b` and `qwen3:8b` pass.

**`qwen3:8b` passes every check and is still the wrong choice.** It has a
*thinking* capability, and it thinks before every tool call. `DEFAULT_MAX_TURNS`
is 12. One question ran past 300 seconds without finishing. A model that passes
every gate and is too slow to use is not a default.

**Local embeddings write to a different table, and that is deliberate.**
bge-small is 384 dimensions; `text-embedding-3-small` is 1536. They are not
comparable and one cannot be queried with the other. `PGVectorStore` creates an
*unconstrained* `vector` column, so mixing them does not fail at write time — it
fails at query time, later, somewhere else. So
`apps/ai/insurance/src/config/domain.ts` sends local embeddings to
`policy_chunks_local`, and the 1536-dim table is left untouched. Measured:
**79 documents, 555 chunks**, and switching `EMBEDDINGS` means re-ingesting, not
re-querying.

---

## 5 · The silent failures — three during the local work, more later

### 5a · A strict schema turns the tools off

The big one, and it produced a *correct-looking wrong answer* with every gate
green. Full measurement and the fix in [`ENGINES.md`](ENGINES.md); the short
version is that llama.cpp constrains generation token by token to the response
schema, a tool call is not a string that schema can produce, and so the model
never emits one. It answered from nothing and cited a form it had never
retrieved.

`turns=1 toolCalls=0` is the signature. On Azure the same code path called at
least one tool in **139 of 146** logged mastra runs, 98 of them two or three —
so seven Azure runs answered with no tool either, and the contrast is 139/146
against 0/1, not something cleaner than that.

### 5b · The cost log priced a free run against a deleted subscription

`logs/requests.jsonl` recorded local runs as:

```json
"model": "gpt-5-mini",  "costUsd": 0.002448,
"costNote": "… meters confirmed against the actual bill …"
```

Every field true of the *config*, none of them true of the *run* — and the bill
it cites was on a subscription that no longer existed. `@fde/telemetry` was
never wrong; it priced exactly the model it was handed, and the app handed it
`env.chatDeployment()` regardless of provider.

Fixed in two places: `loggedModelName()` labels the run `local/<tag>`, and
`price()` short-circuits on that prefix to a **measured zero** — the one cost in
the table that carries no uncertainty, since there is no provider, no meter and
no invoice. Power and hardware are real and deliberately not modelled: pricing a
GPU-second would put a made-up number in the one column whose entire purpose is
that it has none. Now reads `local/qwen2.5:7b`, `costUsd: 0`.

### 5c · Neon drops an idle connection and `pg` waits forever

Neon's free tier autosuspends. A local run is slow enough to cross that window
between tool calls, and when it does the pooler drops the connection without the
client noticing. The process then sits in `ep_poll` on a dead socket to `:5432`
**indefinitely** — one run was still holding it after ten minutes with the model
long finished.

Diagnosis, if it happens again: `ss -tnp | grep <pid>` shows one ESTABLISHED
socket to port 5432 and the process at ~2% CPU. Neon itself answers in ~1 second
when probed directly, so "the database is down" is the wrong conclusion and
costs an hour.

**Fixed, and the fix is below the application layer** — `PG_OPTIONS` in
`packages/grounding/src/pg-resilience.ts`, applied to every connection this
package opens:

```ts
keepAlive: true,                    // let the kernel probe an idle peer
keepAliveInitialDelayMillis: 10_000,
connectionTimeoutMillis: 30_000,
query_timeout: 120_000,
```

`survivesDisconnect` was already there and was not enough: it listens for an
`'error'` event, and the whole problem is that a silently half-closed socket
never emits one. Keepalive probes make the kernel discover the peer is gone,
which finally produces the error the handler had been waiting for. The timeouts
are the backstop and are deliberately loose — they exist to turn *forever* into
*an error*, not to police latency, because a tight bound would fail honest
queries against a cold serverless database and teach everyone to raise it.

Two related nuisances worth knowing:

- A clean run can still end with an unhandled `Connection terminated
  unexpectedly` stack trace from `pg` as the pool tears down. Noise, printed
  after the answer.
- `timeout 600 pnpm …` kills **pnpm**, not the `ts-node` child, which survives
  and keeps holding the socket. Put the timeout on the node process.

---

## 6 · What is genuinely not free

Deployment. Everything above runs on hardware already owned; a public URL does
not. For learning there is nothing to solve — `pnpm dev`, `pnpm veresk:dev`,
`pnpm pharma:dev`, `pnpm steering:dev` serve all four apps locally.

Neon's free tier is generous but bounded: roughly 100 compute-hours per project
per month, 0.5 GB storage, up to 100 projects. This corpus is 555 chunks and
nowhere near any of those.

---

## 7 · What this cost in accuracy

Nothing above says the local setup is as *good*, only that it is free and that
it works. It is measurably not as good. The worked case is in
[`ENGINES.md`](ENGINES.md): eval `cov-008` expects $50/day for 21 days out of
the endorsement `PP 03 24 06 24`; `qwen2.5:7b` retrieved the base form instead
and escalated. The retrieval is real, the citations are real, the reasoning
across a form and its endorsement is not there yet.

The whole suite says the same thing louder. **`pnpm eval:smoke`, local,
`qwen2.5:7b`, 2026-09-16 — a smoke test and NOT a scorecard number**, in this
repo's own words, because it is one run per case:

```
runs passed                : 1/8          (azure baseline: 30/35, 5 runs each)
cases green                : 1/8          cov-004 only
false answers (dangerous)  : 3 of 8       cov-003 cov-005 cov-008
no answer (infra/budget)   : 4 of 8       2 schema_invalid, 2 threw
over-caution (annoying)    : 0 of 8
tokens                     : 416,887 in / 15,047 out
p95 latency                : 116.5s
```

Three things in there are worth more than the headline:

- **The failures are the dangerous kind.** Zero over-caution, three false
  answers. A model that refuses too often is irritating; one that answers
  confidently from the wrong form is the failure this engagement exists to
  catch, and locally it is the *majority* of the failures.
- **`cov-001` made 126 tool calls across 8 turns and still failed the schema.**
  The grammar fix removed the floor on tool use and revealed no ceiling: the
  model searches, re-searches, and never converges on an answer the contract
  accepts. Tool-calling and *knowing when to stop* are separate abilities.
- **Two of eight threw `Cannot connect to API: Headers Timeout Error`** at 0.0s
  against the local server — not a wrong answer, an infrastructure failure. A
  single Ollama instance under a serial eval is still a queue.

416k input tokens for 8 questions is the other quiet cost: every turn re-sends
the whole conversation, and a 12-turn cap with no prompt caching multiplies it.
On Azure that is a bill; here it is only latency, which is exactly why it was
never noticed.

Treat local as the free path for *learning the machinery* — the loop, the tools,
the contract, the engines, the telemetry — and not as a replacement for the
measured scorecard. `eval:diff` already enforces that distinction: it refuses to
compare two runs made with different models, which is exactly right here.

---

## 8 · The better free path: someone else's GPU

§7 is the case against local inference on this hardware. The case *for* a free
hosted tier is that it changes the one variable that mattered — the model — and
changes nothing else.

The seam already existed before Gemini was considered. `buildLocalProvider` is
`createOpenAICompatible` with a base URL; the only thing tying it to Ollama was
the placeholder key. So:

```bash
# https://aistudio.google.com/apikey — no card
export HOSTED_API_KEY=...
export HOSTED_MODEL=gemini-3.8-flash

LLM_PROVIDER=hosted pnpm compat:check            # verify BEFORE trusting it
LOOP=mastra LLM_PROVIDER=hosted EMBEDDINGS=local \
  pnpm --filter @claims/insurance ask "…"
```

Embeddings stay local and free — bge-small is small enough to be irrelevant, and
it is the chat model that was failing, not retrieval.

### Why it is a fourth `LLM_PROVIDER` value and not a base-URL override

Because `local` means something load-bearing: loopback, no credential, nothing
leaves the machine. Pointing that value at Google would make the name lie, and
the trust boundary is the thing this repo teaches. Four values, and
`provider:check` pins the difference — including that a `hosted` run is labelled
`hosted/…` and therefore CANNOT inherit the measured `$0` that `local/` gets. A
free tier is free under a quota nobody here is measuring, on a service that
bills the moment you cross it; `costUsd: null` with a stated reason is the
honest entry.

### MEASURED 2026-09-16 — it works, and the model you pick is not the obvious one

`pnpm compat:check` against Gemini, **all four sections green**, including §4:

```
1 strict json_schema      ok   exactly the required keys, nullable honoured
2 negative control        ok   n === 5 held — the schema is ENFORCED, not advisory
3 tool calling            ok   get_policyholder({"policy_id":"AUT-4471"})
4 tools + schema TOGETHER ok   TOOLS SURVIVE — called search_policy
```

**§4 is the headline: Gemini does not have the llama.cpp defect.** Tools and a
strict grammar coexist in one request, so `hosted` correctly needs no
`structuringPass()` — the assertion in `provider-switch-selftest.ts` that said so
on reasoning now has a measurement behind it.

**And the answer is right.** Eval case `cov-008`, the one local fabricated:

```
$50 per day, for a maximum of 21 days per occurrence.     ← the answer key
form: PP 03 24 06 24                                      ← the endorsement
conflict: PP 00 01 06 24 says $40/30  vs  PP 03 24 06 24 says $50/21
          resolved by: record:AUT-4471
turns=4  toolCalls=3  wall=8.8s
```

It found the base form, found the endorsement, noticed they disagree, and
resolved it from the policyholder record rather than picking a side. That is the
whole contract working, for nothing.

### A ROUTER IS NOT A PROVIDER — measured on OpenRouter, 2026-09-16

OpenRouter's `openrouter/free` looks like the answer to the volatility below: one
key, OpenAI-compatible, and it picks among free models per request, filtering for
the capabilities the request needs. It is not the answer, and **the way it fails
is more useful than a flat refusal would have been.**

```
§1 strict structured output   ACCEPTED json_schema(strict) … then returned MARKDOWN PROSE
§2 negative control           ok — constrained field respected (n === 5)
§3 tool calling               ok — correct name, correct argument
§4 tools AND strict schema    ok — tools survive
```

**§1 and §2 disagree inside a single run.** One request had its schema enforced
and another was handed prose — same base URL, same model string, seconds apart.
That is the router behaving as documented: it selects a free model per request,
and OpenRouter states schema enforcement is a property of **the endpoint it
routes to, not of the model you named**. Some backends treat a schema as a
strong hint.

**Non-determinism is worse than incapacity**, because incapacity is visible. A
schema honoured on most requests passes a suite and breaks on an unpredictable
fraction of production traffic — which is exactly the guarantee Pillar 3 exists
to make.

**It also indicted this repo's own instrument.** `compat:check` probed each
section once. Had §1 happened to land on an enforcing backend, the whole check
would have gone green for an endpoint that breaks the answer contract at random.
So §2 now runs **three times and requires unanimity** — `COMPAT_REPEAT` tunes it.
One pass proves nothing about a router; it is the same rule as the negative
control itself, applied to the check rather than to the model.

Gemini passes 3/3, so enforcement there looks like a property of the endpoint.

**The remedy is to pin a model rather than a router — and the candidate list must
come from the API, not from prose.**

`GET https://openrouter.ai/api/v1/models` is public, needs no key and costs no
quota. On 2026-09-16 it returned **444 models, 24 at zero price, and exactly
SIX** advertising both `structured_outputs` and `tools`:

```
dots-studio/dots-3-note-preview:free    ctx=512000
liquid/lfm-2.5-2.6b:free                ctx=65536
nex-agi/nex-n2.5-mini:free              ctx=262144
nex-agi/nex-n2.5-pro:free               ctx=262144
nvidia/nemotron-3-super-120b-a12b:free  ctx=262144
openrouter/free                         ctx=200000
```

`qwen/qwen3-coder:free`, `deepseek/deepseek-v4-flash:free` and
`z-ai/glm-4.5-air:free` are **not on that list**. All three came from blog posts,
and `qwen3-coder:free` answered
`404 "This model is unavailable for free. The paid version is available now"` —
a **fourth** retirement, observed mid-test. **Derive the candidate list from the
provider's live API; a model list read out of prose is already wrong.**

### What the pinned models actually did

| model | §1 strict | §2 unanimity | §3 tools | §4 both |
|---|---|---|---|---|
| `openrouter/free` | **FAIL** — markdown prose | **1/3** | ok | ok |
| `nvidia/nemotron-3-super-120b-a12b:free` | **FAIL** — empty body | — | ok | **FAIL** |
| `qwen/qwen3-coder:free` | **404** — withdrawn | — | — | — |
| **`nex-agi/nex-n2.5-pro:free`** | **ok** — exact keys, `escalate: null` honoured | **5/5** | **ok** | **FAIL** |

**`nex-n2.5-pro` fails only §4, so `LOOP=langgraph` rescues it.** The loop needs
§3 and the separate structuring call needs §1; both pass independently, and
LangGraph never puts a grammar and tools in the same request. Nemotron failed
§1 **as well**, so nothing rescues it — a clean demonstration that "§4 only" and
"§1 and §4" are different verdicts, not degrees of the same one.

Nemotron's §4 was the textbook failure, identical in shape to llama.cpp's:
`"AUT-4471 is eligible for $50 per day in rental car reimbursement."` with no
tool call. An answer from nothing, citing a form it never read.

**The honest framing is not "Gemini wins."** `nex-n2.5-pro`'s **5/5** beats
Gemini's 3/3 on the unanimity probe, and its §1 returned the contract's real
shape rather than merely valid JSON. It is: **Gemini passes all four and works on
any engine; `nex-n2.5-pro` passes three and requires `LOOP=langgraph`.**

Quota, for either: OpenRouter's own docs give **20 req/min and 50 req/day** under $10
lifetime credits, rising to 1,000/day after — third-party pages saying 200/day
are not the docs. **One `eval:smoke` pass is about 8 runs at ~3 turns, so 50/day
is roughly ONE AND A HALF suite runs per day.** `compat:check` itself costs ~4
requests at `COMPAT_REPEAT=1`, ~6 at 3, ~10 at 5. That disqualifies the free tier
for measurement work on **quota**, not on capability — which is a different and
more fixable objection than Gemini's saturation.

### What `compat:check` learned from being wrong three times

The check is the instrument, and every one of these was found by it producing a
green or a misleading result rather than by reading the code:

| it reported | the truth | the fix |
|---|---|---|
| `ok` on a single §2 probe | enforcement can be **per request**, so one pass proves nothing about a router | §2 repeats and requires unanimity — `COMPAT_REPEAT`, default 3 |
| hung forever on §4 | `fetch` has **no default timeout**; an endpoint that accepts a connection and never answers stalls the run | `AbortSignal.timeout`, default 120s — `COMPAT_TIMEOUT_MS`. Named `TimeoutError`, retried, never again silent |
| *"Enforcement is PER-REQUEST"* under three identical 404s | a **withdrawn model id**, which is not a schema finding at all | `diagnose()` separates a uniform hard status from a mixed result, and says to check the provider's live model list |

**Retries handle errors. Nothing handled silence** — the backoff tops out at
2+4+8 = 14s and only fires on a *response*, so it could neither explain nor
rescue a hang. And a diagnosis that fires on the wrong cause teaches the wrong
lesson: 0/3 from an absent model is not non-determinism.

### ON A FREE TIER, AVAILABILITY BEATS CAPABILITY — and it is not close

The first run failed five checks with `503 "This model is currently experiencing
high demand"`, and the output read `FAIL server accepted tools`, which says
Gemini cannot call tools. **It can.** The endpoint was busy. Acting on that
reading would have sent us back to local inference over a queue that cleared in
a minute — exactly the "a red check is a hypothesis, not a verdict" rule in
`CLAUDE.md`, met in the wild.

So `post()` in the check now retries 429/5xx with backoff, reports how many
retries it needed, and prints a warning after any failure telling you to re-run
before concluding anything. The retry count is part of the reading: a check that
passed on the fourth attempt is telling you something true about a free tier
even when it is green.

Probing seven models with one tools-plus-schema request each:

| model | result |
|---|---|
| `gemini-3.5-flash-lite` | **200, 731 ms**, tools YES — and correct on `cov-008` |
| `gemini-3.5-flash` | 200, 12.0 s, tools YES — but 503'd inside the app loop |
| `gemini-flash-latest` | 200, 16.0 s, tools YES |
| `gemini-3.6` / `3.7` / `3.8-flash` | **503** — the newest are the most congested |
| `gemini-2.5-flash`, `-lite` | **404** — retired |

The newest model is the one you cannot have, and a `-lite` variant answered
sixteen times faster *and* got the hard case right. Pick for availability first.

`gemini-2.5-flash` returning 404 is also why `HOSTED_MODEL` has no default in
`core/loop.types.ts`: a hosted model id is a product name that gets retired, and
a baked-in one becomes a 404 on a date nobody chose. That happened on the first
day of use.

### The retry — CLOSED, and the first attempt at it was dead code

`gemini-3.5-flash` passed `compat:check` and then failed the real loop with a
503 the AI SDK itself labelled `isRetryable: true`. The check had earned its
retries; the loop had none.

**The first fix did nothing, and that is the more useful half of the story.**
`maxRetries` was passed to `agent.generate(…)`. It typechecked. A self-test
asserted the number. Every gate went green. Mastra never read it —
`ModelConfigModelSettings` is literally
`Omit<MastraModelSettings, 'maxRetries' | 'headers'>`, so the option is
*explicitly excluded*.

It now lives in the provider's own `fetch` (`retryingFetch` in
`mastra/provider.ts`), which cannot be ignored, and the assertion no longer asks
what a config object *says* — **it counts calls**: a 503 retried until it
clears, a 401 not retried once.

**And the replacement assertion then did not run either.** It was a floating
promise, and `process.exit()` fired before it resolved: the section header
printed with nothing under it and the suite reported PASS. The self-test is now
`async`. Twice in one afternoon a green check covered an assertion that never
ran — which is the sharpest possible illustration of this repo's own rule that a
green check is not proof.

**Necessary, not sufficient.** Retries back off to 15s, which clears a demand
spike and does *not* clear a per-minute quota: three of eight eval runs still
died of `Too Many Requests`. Pacing the runner is the remaining fix, not a
bigger number.

---

## 8b · Using the Claude Code subscription for local dev — it works, with one real limit

**The question:** can the Claude you are already talking to in the terminal drive
the app, so local development needs no key and no per-token bill?

**Yes, for local development.** `scripts/claude-code-shim.mjs` is an
OpenAI-compatible endpoint in front of `claude -p`. Nothing in the repo changes,
because `LLM_PROVIDER=local` already takes a base URL — which is the whole point
of that seam being a URL rather than a hardcoded Ollama.

```bash
node scripts/claude-code-shim.mjs &
LLM_PROVIDER=local LOCAL_OPENAI_BASE_URL=http://127.0.0.1:11435/v1 \
  LOCAL_MODEL=claude-code LOOP=mastra pnpm compat:check
```

### MEASURED 2026-09-16 — 3 of 4, and the failure is the interesting one

| | result |
|---|---|
| §1 strict structured output | **ok** — exact keys, citations shape, `escalate` honoured |
| §2 negative control (×3) | **FAIL — 2/3.** One attempt returned *"not JSON at all"* |
| §3 tool calling | **ok** — `get_policyholder({"policy_id":"AUT-4471"})` |
| §4 tools AND strict schema | **ok** — tools survive |

**§2 is the whole story: the schema is PROMPTED, not ENFORCED.** There is no
grammar behind a CLI. The schema is pasted into the prompt and a very capable
model is asked to comply — so it complies almost always, and "almost" is exactly
what Pillar 3 exists to eliminate. Two runs out of three is not a worse model
than Gemini's three out of three; it is a *weaker guarantee*, which is a
different axis.

**The repeat caught it on first use.** §2 was only made to repeat an hour earlier,
after the `openrouter/free` finding — and it immediately found the same class of
defect in a shim written by the same session that added the check. A single probe
would have said `ok` and this section would have claimed the contract held.

### What it is good for, and what it is not

**Good:** driving the loop against a strong model while you work, with no key, no
per-token bill, and correct tool calling. §3 and §4 both pass, so the agentic
half is genuinely exercised.

**Not good:** anything whose conclusion depends on the schema *holding*. Do not
quote an `eval` number produced through this shim — a run that passes may have
passed because the model chose to, and the scorecard cannot tell you which.

**Never deploy it.** It binds loopback, it fronts a CLI logged in as you, and a
subscription is not an application backend. §11's apps need `hosted`.

### Two things it costs that a provider does not

- **Claude Code's own system prompt, per call** — around 20k cache-creation
  tokens on a cold request. It bills against the subscription rather than a
  card, but an eval pass is ~24 calls and you feel every one.
- **Its own tools are disabled** (`--disallowed-tools`). Without that you get an
  agent loop nested inside an agent loop: it would read your files instead of
  calling the `search_policy` you handed it, and every turn count in the
  telemetry would describe the wrong loop.

**One trap worth writing down.** `--disallowed-tools` is VARIADIC, so a trailing
prompt argument is swallowed as one more tool name and the CLI exits 1 with
*"Input must be provided either through stdin or as a prompt argument"* — an
error that reads like the prompt is missing when it is really in the wrong
place. The shim sends the prompt on **stdin**, which also sidesteps `ARG_MAX`.

---

## 9 · A remote GPU — MEASURED 2026-09-16, and it does not rescue local

`ABE-PC` at `10.242.84.140`: **RTX 4090 (24564 MiB), i9-13900KF 32 threads,
62 GB RAM, 489 GB free.** Better than the 3090 box in every way that was
supposed to matter. It did not change the answer.

| | qwen2.5:7b, RTX 3090 | qwen2.5:32b, RTX 4090 | gemini-3.5-flash-lite |
|---|---|---|---|
| `compat:check` §1–3 | pass | pass | pass |
| **`compat:check` §4** | **FAIL** | **FAIL** | **pass** |
| `cov-008` | wrong (fabricated) | **wrong** ($40/30, base form) | **correct** ($50/21) |
| wall | 14.1 s | **80.4 s** | **8.8 s** |
| cost | $0 | $0 | $0 |

**The 32B fails §4 exactly as the 7B does.** That is the finding: the grammar
trap is a property of **llama.cpp, not of model size**, which is what justifies
`structuringPass()` being scoped to `local` for every model rather than to small
ones. A model 4.5× larger on better hardware still answered `cov-008` out of the
base form without searching the attached endorsement — the documented failure
shape — nine times slower than the free hosted model that gets it right.

**A 4090 is still 24 GB.** At 32768 context the 32B needed **28 GB** and ran
**17%/83% CPU/GPU**, matching §7's arithmetic exactly. Dropping
`OLLAMA_CONTEXT_LENGTH` to 16384 brings it back onto the card. What the remote
box genuinely fixed was disk (489 GB free, versus a 98%-full root) and
contention — not capacity, and not accuracy.

**It was running Ollama 0.1.39**, two years old and predating tool-calling
support entirely. Nothing here could have worked until it was upgraded to
0.34.1. Check `ollama --version` before concluding a model cannot call tools.

### It is LAN-only, and that decides where it can be used

`10.242.84.0/24` is RFC1918. Port 11434 refused from outside because Ollama
binds loopback — **leave it that way.** Ollama has no authentication of any
kind; an open port is an open model server. Reach it with a tunnel, which also
means the default base URL keeps working unchanged:

```bash
ssh -N -L 11434:localhost:11434 zahra@10.242.84.140
LLM_PROVIDER=local LOCAL_MODEL=qwen2.5:32b pnpm compat:check
```

Because it is not publicly routable, **the deployed apps can never reach it.**
Local is a development path; anything deployed needs `LLM_PROVIDER=hosted`.

## 9b · The original guidance, still current

A second machine with a 4090 helps more than the spec suggests, and not because
the card is faster. It is still ~24 GB, so a 32B at full 32k context is still
out of reach (§7's arithmetic is unchanged). What it fixes is the two things
that actually hurt here: model weights had nowhere to live on a 98%-full root
partition shared with a PhD estate, and one Ollama instance under a serial eval
was a queue — two of eight runs died of `Headers Timeout Error` from contention.

Wiring is one variable, no code change:

```bash
# on the remote box — it binds 127.0.0.1 by default, so the port will not answer
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

**Do not expose 11434 to the internet.** Ollama has no authentication of any
kind; an open port is an open model server. Use a tunnel, which also means the
default base URL keeps working unchanged:

```bash
ssh -N -L 11434:localhost:11434 user@remote-box
LLM_PROVIDER=local LOOP=mastra pnpm --filter @claims/insurance ask "…"
```

The grammar finding still applies — it is a property of llama.cpp, not of the
card — so `LOOP=mastra` still needs `structuringPass()` and `LOOP=langgraph`
still works untouched. Better hardware does not change §5a.

---

## 10 · Where to pick this up

**Working right now**, no further setup — `.env` carries `LLM_PROVIDER=hosted`,
`HOSTED_MODEL=gemini-3.5-flash-lite`, `EMBEDDINGS=local`:

```bash
pnpm compat:check                                   # 4/4 green
LOOP=mastra pnpm --filter @claims/insurance ask "…" # correct on cov-008, 8.8s, $0
```

**MEASURED 2026-09-16** — `pnpm eval:smoke` on `gemini-3.5-flash-lite`. Run
TWICE, because the first run's headline was wrong in an instructive way:

| | cases green | **false answers** | over-caution | no answer (infra) | p95 |
|---|---|---|---|---|---|
| Azure `gpt-5-mini` (7 cases × 5) | **6/7** | — | — | — | — |
| local `qwen2.5:7b` | **1/8** | **3** | 0 | 4 | 116.5s |
| Gemini, unpaced | 5/8 | **0** | 0 | **3** | 14.3s |
| **Gemini, paced 6s** | **6/8** | **2** | 0 | **0** | 37.8s |

**PACING DID NOT IMPROVE THE MODEL. IT REVEALED IT.** The unpaced run's "zero
false answers" was not a quality result — three cases died of
`Too Many Requests` before they could be wrong. Remove the quota failures and
two of those three turn out to be genuine judgment failures: `cov-002` and
`cov-007` answer confidently and incorrectly.

That correction matters more than the score. An infrastructure failure and a
wrong answer land in different buckets on this scorecard for exactly this
reason, and a bucket that is empty because the run never happened is not the
same as a bucket that is empty. **It is the same mistake in miniature that
`CLAUDE.md` warns about: a red check is a hypothesis, and so is a green one.**

What pacing actually bought: **`no answer (infra)` went 3 → 0.** Every case now
runs. That is what the change was for, and it worked.

So the honest standing is **6/8 against Azure's 6/7**, with two real wrong
answers rather than none — close, not equal, and measured on a smoke test that
this repo's own rules say must not be quoted as a pass rate.

`eval:diff` will refuse to compare either against the Azure baseline. That is
correct — it would measure the model swap, not the code.

**Open items, in the order they will bite:**

1. **The two deployed apps cannot call any model, and it is not configuration.**
   `pharma-app` and `steering-app` have the right env vars now — `LOOP=mastra`,
   `LLM_PROVIDER=hosted`, `HOSTED_MODEL=gemini-3.5-flash-lite` — and still fail,
   because their loops call `openaiClient()` from `@fde/foundry` **directly**
   (`assess-requirement.ts:83`, `summarise-bid.ts:77`,
   `explain-assessment.ts:66`, `release-agent.ts:127`) and pass
   `env.chatDeployment()` as the model. Insurance works on hosted only because
   the Mastra loop ignores the client it is handed. **See §11.** Unstarted; it is
   a code change in two engagements plus a re-ingest of 3,854 chunks.
2. **Quota, not capability, is the binding constraint on every free tier
   measured.** Gemini: three of eight eval runs lost to 429 before pacing.
   OpenRouter: 50/day ≈ 1.5 suite runs. Pacing (`EVAL_PACE_MS`, 6s on hosted)
   fixed the first; nothing fixes the second except paying.
3. **`docs/evals/results/last-run.json` holds the latest smoke result**, which
   changes every run and is not a scorecard. `pnpm eval:history` reads the
   committed Azure baselines and is the honest reference point.
4. **A second Gemini key is wired** — local uses it, the deployed apps keep the
   original. **Caveat: Gemini free-tier quota is per PROJECT, not per key.** If
   both were created in the same AI Studio project they still share one limit.

**The one-line summary:** local inference was measured on two GPUs and rejected
on judgment, not speed; a free hosted tier answers correctly for $0 and its only
real limit is quota; and the two deployed apps need code before any of that
reaches them.

**The most transferable lesson has nothing to do with models.** Four times in one
day a green result was covering something that had not happened — a `maxRetries`
the framework ignored, an assertion that never ran, a schema "enforced" on one
request out of three, and a pass rate of 5/8 with "zero wrong answers" that was
really three questions never asked. Every one was found by making the instrument
report *how* it knew, not just *what* it concluded.
