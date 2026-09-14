# A second cloud — Amazon Bedrock beside Azure

*Updated 2026-09-14. What exists, what it proved, what is unfinished, and the
exact commands to resume. Every claim here is from a check that ran or an API
that answered.*

Companion: [`ENGINES.md`](ENGINES.md) — the two switches (`LOOP` x
`LLM_PROVIDER`), what each engine does under the hood, when to use which, and
the engine x cloud matrix. **This file is the AWS estate**: the account, the
guardrails, the four access gates and the quota defect.

---

## Why

`@fde/foundry`'s own docstring said: *"A customer on AWS writes a sibling of
this and changes nothing else."* That was an assertion. This is the attempt to
make it true — and the interesting part is where it wasn't.

Also: 8 of 24 Swedish AI-engineer ads name AWS, and this repo was Azure-only.
Consultancies don't get to pick the customer's cloud.

---

## Part 1 — the code

```bash
pnpm bedrock:check      # 30 assertions, offline, no credentials, no spend
```

| Path | What it is |
|---|---|
| `packages/bedrock/src/client.ts` | region/model config, client construction, `credentialKind()` |
| `packages/bedrock/src/openai-shape.ts` | **the translator** — OpenAI-shaped in, Anthropic-shaped out |
| `packages/bedrock/src/selftest.ts` | 30 checks including a negative control |
| `packages/steering/src/llm/provider.ts` | the `LLM_PROVIDER` switch. **Azure is the default** |

Status: **32/32 offline checks pass, 27/27 typecheck, no regressions.**
Nothing calls it yet — insurance and pharma are untouched, Azure is still the
only live path.

### What the port cost — the transferable part

**1. The seam was not where the docstring said.** `@fde/foundry` claims one
place knows about Azure. There are three: `loop-mastra.ts:67` and
`loop-langgraph.ts:66` construct `DefaultAzureCredential` directly instead of
going through the package. A second cloud found that; a code review had not.

**2. Four things do not survive the protocol translation.**

- **System prompts move.** OpenAI carries them as `role: 'system'` in the
  message list; Anthropic has a separate top-level field and no such role.
  Multiple system messages are *joined* — a choice, not a law.
- **`max_tokens` becomes mandatory.** Optional on OpenAI, rejected-without on
  Anthropic. A default (16,000) is invented — a behaviour change hiding in a
  type signature.
- **`json_schema.name` is dropped.** OpenAI *requires* it; Anthropic's
  `JSONOutputFormat` is `{type, schema}` with nowhere to put it. So the request
  type must require the **union** of what both providers require while only
  using the **intersection** of what they support.
- **`pause_turn` has no equivalent.** Passed through unmapped rather than
  flattened to `stop`, because a paused turn is resumable and a stopped one is
  not.

**3. `store: false` comes free.** `pnpm compliance:check` asserts it on the
Azure path because the OpenAI surface keeps server-side conversation state if
allowed. Bedrock's Messages API has none, so the property holds by construction.

**4. Embeddings cannot follow.** Anthropic models do not do embeddings at all;
Bedrock serves them via Titan/Cohere. `@fde/grounding` stays on Azure. An
architectural limit, not a gap in the work.

**5. A second cloud broke code that touches neither.** Adding `@fde/bedrock` to
steering made `assess-requirement.ts:271` stop compiling:

```
Property '#private' in type 'OpenAI' refers to a different member
that cannot be accessed from within type 'OpenAI'
```

`openai@7` declares **optional peer dependencies on the AWS SDK** — it has its
own Bedrock support. While nothing supplied them pnpm built one `openai`; once
`@fde/bedrock` brought AWS in, pnpm built a second with the peers satisfied.
`@fde/agent` saw one and steering the other. Fixed with `node-linker=hoisted`
in `.npmrc`.

**The trade, stated rather than buried:** pnpm's strict isolation is gone — the
thing that caught an undeclared `@anthropic-ai/sdk` import an hour earlier. One
identity per library was judged worth more. `leak:check` and `typecheck` still
run.

**6. `leak:check` caught the author.** It flagged `"claims"` in the sentence
*"0 claims a measurement"* — the English verb, in a **string literal**.
Comments are exempt; executable strings are not, and the scanner cannot tell
that verb from insurance's noun. Correct behaviour, reworded.

### The cheaper route — TAKEN, 2026-09-14

The Vercel AI SDK (already here as `@ai-sdk/openai-compatible`) has an official
`@ai-sdk/amazon-bedrock` provider. For the **Mastra** loop that is ~5 lines
instead of a translator; **LangGraph** is another ~5 via `@langchain/aws`. Both
are now built, behind one `LLM_PROVIDER` switch, with `pnpm provider:check`
asserting the routing on all three engines offline.

It still does not reach the **Agents SDK** loop (which wants an OpenAI *client
object* via `setDefaultOpenAIClient`) or the three raw `chat.completions.create`
call sites — which is why the adapter exists. That loop now **refuses**
`LLM_PROVIDER=bedrock` rather than running silently on Azure, which it did until
this was charted.

**And doing both paid off in a way the plan did not predict.** Read out of each
package's own dist, the three do not share an AWS api:

```
@fde/bedrock            AnthropicBedrock.messages.create  → Anthropic Messages API
@ai-sdk/amazon-bedrock  /converse, /invoke                → Converse, invoke fallback
@langchain/aws          ConverseCommand                   → Converse only
```

Neither framework provider speaks Anthropic at all — both speak Converse, AWS's
cross-model normalisation layer, which translates server-side. So the
hand-written adapter is not "the same thing for 25x the lines"; it is access to
fields Converse normalises away, `pause_turn` being the concrete one. The full
comparison, the engine x cloud matrix and when to use which engine are in
[`ENGINES.md`](ENGINES.md).

---

## Part 2 — the AWS estate

Account **257478996634**, region **eu-north-1** (Stockholm — EU for the
data-residency story).

### Guardrails, built before anything could spend

| Resource | What it does |
|---|---|
| Budget `zero-spend-alarm` | $0.01 — emails the moment the account costs anything |
| Budget `monthly-cap` | $10 (~100 SEK), alerts at 20 / 50 / 80% |
| Budget `My Monthly Cost Budget` | $5 — pre-existing, not ours |
| Role `budgets-action-role` | what Budgets assumes; pinned to this account via `aws:SourceAccount` |
| Policy `deny-bedrock` | explicit Deny on all four invoke actions |
| Budget action `05e89c87-…` | at 80% of `monthly-cap`, attaches `deny-bedrock` to `bedrock-invoke`. `AUTOMATIC` |

**AWS Budgets do not stop spending by themselves — they only email.** The
budget *action* is the part that blocks. Both exist here for that reason.

### Users, deliberately split

| User | Can | Cannot |
|---|---|---|
| `golang-bank` | manage budgets, read Bedrock catalogue, accept model agreements, Marketplace subscribe | **invoke any model** |
| `bedrock-invoke` | invoke **Claude Haiku 4.5 only** (`Resource` is scoped to that model + its `eu.` inference profile) | change permissions, touch billing, invoke any other model |

The user that can accept licences cannot spend; the user that can spend cannot
change permissions. `bedrock-invoke` is stored as a separate CLI profile
(`--profile bedrock`) so the default profile — which owns full S3 and DynamoDB
— is never the one making model calls.

**A leaked key proved the value of that split.** An access key for
`bedrock-invoke` was pasted into a chat transcript. It was deleted within
minutes, and the blast radius was: invoke the cheapest model, inside a $10
ceiling, with a deny action armed. Had it been the `golang-bank` key it would
have been full S3 and DynamoDB. Rotation pattern now in use writes the secret
straight into `~/.aws/credentials` without ever printing it.

### Model access — four gates, not one

Discovered the hard way; each returns a different error that reads like the
others:

1. **Account verification** — `AccessDeniedException: Your account is currently
   being verified`. Account-level hold, up to 2 hours. Nothing to fix. **Cleared.**
2. **Anthropic use-case form** — `ResourceNotFoundException: Model use case
   details have not been submitted`. One-time per account.
   `aws bedrock put-use-case-for-model-access`, `formData` is a base64 blob;
   **`--cli-binary-format raw-in-base64-out` is mandatory** or the CLI base64s
   your base64 and returns "Invalid Form Data". Success is HTTP 201 with an
   **empty body**, which is indistinguishable from nothing happening — always
   confirm with `get-use-case-for-model-access`.
3. **Model agreement** — via **AWS Marketplace**, needs
   `aws-marketplace:{ViewSubscriptions,Subscribe}`. `list-…-agreement-offers`
   → `create-foundation-model-agreement --offer-token`. **Done, AVAILABLE.**
4. **Availability** — `get-foundation-model-availability` reports
   `authorizationStatus`, `entitlementAvailability`, `regionAvailability`,
   `agreementAvailability`. Last reading: **AUTHORIZED / AVAILABLE / AVAILABLE /
   AVAILABLE.**

Model ids that matter:
```
anthropic.claude-haiku-4-5-20251001-v1:0        # the model (catalogue, agreements)
eu.anthropic.claude-haiku-4-5-20251001-v1:0     # the INFERENCE PROFILE — invoke THIS in eu-north-1
```
Calling the bare model id in an EU region fails with a validation error that
reads like missing access and is not.

---

## Proven end-to-end — on Azure

`pnpm steering:ping` makes **one real, paid model call through the provider
switch**. On the default path it works:

```
  provider : azure (gpt-5-mini)
  answer   : "OK"
  stopped  : stop
  tokens   : in 24, out 11
  cached   : 0 token(s)
  latency  : 3412ms
  ping: PASS — azure answered
```

So the switch, the `ChatResponse` shape and the usage mapping are not theory —
they carry a real answer. Note `cached: 0 token(s)` rather than *"not
reported"*: Azure returned a measured zero and the code kept it as one. That is
the absent-vs-zero distinction working against a live provider rather than a
fixture.

**Only the Bedrock branch is unproven.** Everything shared between the two
branches now has a real call behind it.

### Why a ping rather than wiring a real call site

`extract/run.ts` is the obvious first caller, and pointing it at a provider that
has never answered once would mean debugging the extraction pipeline and the
transport simultaneously. The ping does the smallest thing that can fail: one
turn, one sentence, no tools, no schema, no corpus. If it works, the transport
is sound and every later failure belongs to the caller.

It is also the only command in this repo that **spends money**, and it says so
before it does — every `*:check` here is free, and a command that quietly costs
money is a command people run by accident.

---

## Where it is blocked — an AWS-side defect, not the code

**The port is finished. Every gate is passed. The account is broken.**

| Gate | State |
|---|---|
| Account verification | cleared |
| Anthropic use-case form | satisfied |
| Marketplace model agreement | AVAILABLE |
| IAM (`bedrock:InvokeModel`, Haiku-scoped) | granted |
| Short-lived credentials | resolving |
| **On-demand inference quota** | **0.0 — an AWS provisioning defect** |

Last failure, from `pnpm steering:ping`:

```
429 Too many tokens per day, please wait before trying again.
x-amzn-requestid=f6144b47-e7b7-4dc8-b2fa-073741fc0c49
```

### Why this is a defect and not a limit

`list-service-quotas` reports every on-demand inference quota for Claude Haiku
4.5 as **`0.0`**:

```
Cross-region model inference requests per minute   0.0   L-CCA5DF70
Cross-region model inference tokens per minute     0.0   L-58BE175A
Global cross-region inference tokens per minute    0.0   L-9A11C666
Global cross-region inference requests per minute  0.0   L-E5084BBA
```

But `request-service-quota-increase` **refuses** them:

```
You must provide a quota value greater than the default quota value of 10000.0
You must provide a quota value greater than the default quota value of 5000000.0
```

Those two facts cannot both describe a normal account. The *default* is 10,000
requests/min and 5,000,000 tokens/min; the *applied* value is zero. The new
`bedrock-mantle` quota system initialised these at 0 for some accounts instead
of inheriting the defaults, so **there is no self-service path** — you cannot
request an increase below a default you are already nominally granted.

Notably the **batch** quotas are all normal (1 GB input files, 100,000 records),
so this is not an account-wide freeze. On-demand inference specifically is
zeroed.

Both `eu-north-1` and `eu-central-1` fail identically, so region-switching does
not help — these are *cross-region* quotas, which is exactly what the `eu.`
inference profile uses.

"Per day" in the message is misleading: nothing resets. Waiting does not fix it.

### Every path tested — it is not a configuration error

| Path | Result |
|---|---|
| `eu.anthropic.claude-haiku-4-5-20251001-v1:0` | **429** (`f6144b47-…`, `cd2fdaca-…`) |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | **429** (`0823fb1e-…`) |
| `anthropic.claude-haiku-4-5-20251001-v1:0` (bare) | **400** — *"Invocation with on-demand throughput isn't supported. Retry with an inference profile."* |
| `eu-central-1` (Frankfurt) | **429** |

In-region invocation is impossible for this model *by design*, so an inference
profile is mandatory — and both profiles are quota-zeroed. One genuine
misconfiguration was found and fixed along the way (the invoke policy scoped
only `eu.*`, so `global.*` had never actually been reachable); correcting it
changed nothing. There is no remaining configuration that could work.

**A note on the credential type, learned here:** temporary credentials from
`sts get-session-token` **cannot call IAM at all** unless MFA was included when
minting them — `InvalidClientTokenId`, regardless of the user's permissions. So
the short-lived token that makes this safe to keep on a shared box also makes it
unable to change its own policy. That is the right trade and worth knowing in
advance.

### The route out

An **AWS Support case**, roughly 48 hours. Ask them to *verify and correct the
effective quotas for Anthropic Claude models*, quoting the request id above —
not to "increase a quota", which is what got auto-rejected.

### What this cost us, methodologically

Two quota-increase commands were issued on a wrong reading: `0.0` was seen and
"new account, zero default, ask for more" assumed, without checking whether the
zero was legitimate. The rejection messages contained the disproof. **Search
before theorising about a platform's behaviour** — the answer was in AWS's own
forums, and the first guess cost two failed calls and an assumption written into
a plan.

## Resume

```bash
# 1. was the form ever actually submitted?
aws bedrock get-use-case-for-model-access --region eu-north-1 --no-cli-pager

# 2. if not — submit it. Silence = success (HTTP 201, empty body).
aws bedrock put-use-case-for-model-access \
  --region eu-north-1 \
  --form-data file:///tmp/usecase.json \
  --cli-binary-format raw-in-base64-out

# 3. is the quota still zero? (needs the golang-bank profile, not bedrock-invoke)
aws service-quotas list-service-quotas --service-code bedrock --region eu-north-1 \
  --query "Quotas[?contains(QuotaName,'Haiku 4.5')].[QuotaName,Value,QuotaCode]" --output table

# 4. first real call — a fraction of a cent
aws bedrock-runtime converse \
  --region eu-north-1 --profile bedrock \
  --model-id eu.anthropic.claude-haiku-4-5-20251001-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Reply with exactly: OK"}]}]'

# 4. then through our own code
LLM_PROVIDER=bedrock AWS_PROFILE=bedrock pnpm bedrock:check
```

---

## Still to do

- **Make one real call *on Bedrock*.** The Azure branch is proven; the Bedrock
  branch has never reached the network.
- **Wire the switch to a real call site.** `extract/run.ts:296` is the obvious
  first one — single-turn, non-agent. Blocked on the line above, deliberately.
  (The switch itself now reaches three of the four paths — see
  [`ENGINES.md`](ENGINES.md) §4 for the matrix and its one deliberate hole.)
- **Prove the deny actually denies.** Attach `deny-bedrock` to `bedrock-invoke`,
  watch a real call fail, detach, watch it work. Both halves, the way
  `packages/guard/src/selftest.ts` does it. Not possible until a call succeeds.
- **The budget kill-switch has never fired.** `AUTOMATIC` approval means it
  cannot be triggered manually (`ResourceLockedException` during STANDBY), so
  only real spend past 80% would prove it.
- **The AI SDK comparison** — `@ai-sdk/amazon-bedrock` for the Mastra loop, next
  to the hand-rolled adapter, with the cost of each written down.
- **Embeddings stay on Azure permanently** unless Titan or Cohere is added.
