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
| `eval:smoke` cases green | **6/7** (30/35 runs) | **1/8** | not run | **5/8** |
| **false answers (dangerous)** | — | **3** | — | **0** |
| failures were… | — | **judgment** | **judgment** | **quota** |
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

**MEASURED 2026-09-16** — `pnpm eval:smoke` on `gemini-3.5-flash-lite`. A smoke
test and NOT a scorecard, in this repo's own words, because it is one run per
case:

| | cases green | **false answers** | over-caution | failures were |
|---|---|---|---|---|
| Azure `gpt-5-mini` | **6/7** (30/35 runs, 5 each) | — | — | the committed baseline |
| local `qwen2.5:7b` | **1/8** | **3** | 0 | **judgment** |
| hosted Gemini | **5/8** | **0** | 0 | **quota only** |

**Read the third column, not the first.** All three Gemini failures were
`Too Many Requests` — every case that actually ran came back correct. Nothing
was wrong; three never executed. The local 7B, by contrast, failed by answering
confidently from documents it had not read, which is the failure this engagement
exists to catch.

`p95` 14.3s, 54,671 input tokens across 8 runs, $0.

So the model's judgment is sound and **the free tier's per-minute quota is the
binding constraint.** `retryingFetch` backs off to 15s, which clears a spike and
does not clear a per-minute quota; pacing the runner, or waiting out a longer
`Retry-After`, is the real fix.

`eval:diff` will refuse to compare this against the Azure baseline. That is
correct — it would measure the model swap, not the code.

**Open items, in the order they will bite:**

1. **DONE, but not enough.** `retryingFetch` in `mastra/provider.ts` now retries
   429/5xx with backoff, asserted by call count. It clears spikes. It does NOT
   clear a per-minute quota — three of eight eval runs still died of
   `Too Many Requests`. The remaining fix is to pace the runner or honour a
   long `Retry-After`, not a bigger retry count.
   **`LOOP=mastra` IS REQUIRED ALONGSIDE `LLM_PROVIDER=hosted`.** Omitting it
   fails all eight cases at 0.0s with an identical refusal, because `LOOP`
   defaults to `sdk`, which drives the Responses API. It reads like a broken
   install and is a missing variable.
2. **Rate limits are unmeasured here.** Google no longer publishes free-tier
   numbers; they are per-account at
   <https://aistudio.google.com/rate-limit>. The eval runner is serial by
   design, which helps against a per-minute cap.
3. **`docs/evals/results/last-run.json` currently holds the 1/8 LOCAL smoke
   result.** It is transient by design, but do not mistake it for a scorecard.
4. **`pnpm eval:history` still reads the committed Azure baselines** — free,
   disk only, and the honest reference point for any of this.

**The one-line summary:** local inference was measured and rejected (1/8); a free
hosted tier on the same seam gets the hard case right in 8.8s for $0, and the
only real engineering left is retrying a busy endpoint.

---

## 11 · The deployed apps — what they still need

**Checked against the live estate on 2026-09-16** with `az containerapp show`,
not read off a workflow file:

| app | `LLM_PROVIDER` | `LOOP` | `HOSTED_MODEL` |
|---|---|---|---|
| `pharma-app` | `hosted` | **UNSET** | `gemini-3.8-flash` |
| `steering-app` | `hosted` | **UNSET** | `gemini-3.8-flash` |
| `veresk` | — | — | — (correct: no API route, no model call) |

Both rows are broken, for two independent reasons, and **neither is a code
problem** — the images are fine.

### `LOOP` unset is the one that fails instantly

`LOOP` defaults to `sdk`, which drives the **Responses API**. Gemini serves
`/chat/completions`, like every other OpenAI-compatible provider, so the sdk
engine *refuses* `hosted` by design rather than failing at the transport. The
apps will serve pages perfectly and fail the moment anyone asks a question.

This is not hypothetical: omitting `LOOP` locally failed all eight eval cases at
**0.0s** with eight identical refusals. It reads like a broken install and is a
missing variable. `.env.example` now says so where the `hosted` block is.

### `gemini-3.8-flash` is the wrong model to have picked

Measured the same day: `3.8`, `3.7` and `3.6-flash` all returned
`503 "This model is currently experiencing high demand"` — `3.8` survived eight
retries and still failed. `gemini-2.5-flash` returns **404**, retired.
`gemini-3.5-flash-lite` answered in 731 ms throughout and is what `.env` uses.

**On a free tier the newest model is the one you cannot have**, and availability
moves minute to minute. That volatility is exactly why `HOSTED_MODEL` has no
default in `core/loop.types.ts`: a hosted model id is a product name that gets
retired, and a baked-in one becomes a 404 on a date nobody chose. It did, on day
one.

### The fix

```bash
for app in pharma-app steering-app; do
  az containerapp update -n "$app" -g rg-claims-fde \
    --set-env-vars LOOP=mastra HOSTED_MODEL=gemini-3.5-flash-lite
done
```

**NOT APPLIED AS OF THIS WRITING** — it is an outward-facing change to a live
estate that a second session also manages.

### One key, one quota, and it is already the binding constraint

Both deployed apps and local development share a single `HOSTED_API_KEY`, so
they share one rate limit. Three of eight eval runs died of `Too Many Requests`
with **one** user and **nothing** deployed. Two live apps make that worse.

For learning, fine — expect occasional 429s. Before showing it to anyone, issue
a second key for the deployed apps so local work cannot starve a demo.

---

## 12 · What was cleaned up

Local inference was measured, rejected, and removed rather than left lying
around:

- **This machine:** Ollama binary, `~/.ollama`, both models, the SSH tunnel — all
  deleted. Port 11434 closed. Disk 24 GB → **38 GB free**.
- **`ABE-PC` (10.242.84.140):** `qwen2.5:32b` deleted (19 GB), the
  `OLLAMA_CONTEXT_LENGTH` systemd override removed and the service restarted
  clean, temp scripts removed, **the SSH key removed and absence verified**.
- **Left deliberately:** Ollama there is still upgraded from **0.1.39 → 0.34.1**.
  Reverting is riskier than leaving it, the pre-existing `llama3` and
  `nomic-embed-text` models still work, and 0.1.39 predates tool-calling support
  entirely. **Check `ollama --version` before concluding a model cannot call
  tools.**

The code seam stays. `LLM_PROVIDER=local` still works against any
OpenAI-compatible server and is still asserted by `pnpm provider:check` — what
was removed is 13 GB of weights, not the capability. §9b is how to bring a remote
box back if one is ever worth it.
