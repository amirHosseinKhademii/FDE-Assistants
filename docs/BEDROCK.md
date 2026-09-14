# A second cloud — Amazon Bedrock beside Azure

*Written 2026-09-14. What exists, what it proved, what is unfinished, and the
one command to run when AWS verification clears. Every claim here is from a
check that ran.*

---

## Why

`@fde/foundry`'s own docstring says: *"A customer on AWS writes a sibling of
this and changes nothing else."* That was an assertion. This is the attempt to
make it true, and the interesting part is where it wasn't.

Also: 8 of 24 Swedish AI-engineer ads name AWS, and the repo was Azure-only.
Consultancies don't pick the customer's cloud.

---

## What runs today

```bash
pnpm bedrock:check       # 30 assertions, offline, no credentials, no spend
```

| | |
|---|---|
| `packages/bedrock` | `@fde/bedrock` — the AWS deployment adapter |
| `src/client.ts` | region/model config, client construction, `credentialKind()` |
| `src/openai-shape.ts` | **the translator** — OpenAI-shaped in, Anthropic-shaped out |
| `src/selftest.ts` | 30 checks incl. a negative control |
| `packages/steering/src/llm/provider.ts` | the `LLM_PROVIDER` switch. Azure is default |

Nothing calls it yet. Azure remains the only live path; insurance and pharma
are untouched.

---

## What the port cost — the useful part

**1. The seam wasn't where the docstring said.** `@fde/foundry` claims one place
knows about Azure. There are three: `loop-mastra.ts:67` and
`loop-langgraph.ts:66` construct `DefaultAzureCredential` directly rather than
going through the package. A second cloud found that; a code review had not.

**2. Four things don't survive the protocol translation.**

- **System prompts move.** OpenAI carries them as `role: 'system'` in the
  message list; Anthropic has a separate top-level field and no such role.
  Multiple system messages are *joined* — a choice, not a law.
- **`max_tokens` becomes mandatory.** Optional on OpenAI, rejected-without on
  Anthropic. So a default (16,000) is invented — a behaviour change hiding in a
  type signature.
- **`json_schema.name` is dropped.** OpenAI requires it; Anthropic's
  `JSONOutputFormat` is `{type, schema}` with nowhere to put it. So the request
  type must require the **union** of what both providers require while only
  using the **intersection** of what they support.
- **`pause_turn` has no equivalent.** Passed through unmapped rather than
  flattened to `stop`, because a paused turn is resumable and a stopped one is
  not.

**3. `store: false` comes free.** `pnpm compliance:check` asserts it on the
Azure path because the OpenAI surface will keep server-side conversation state
if allowed. Bedrock's Messages API has none, so the property holds by
construction. The check should still run — a property you stopped testing is one
you stopped having.

**4. Embeddings cannot follow.** Anthropic models don't do embeddings at all;
Bedrock serves them via Titan/Cohere. `@fde/grounding` stays on Azure. This is
an architectural limit, not a gap in the work.

**5. A second cloud broke code that touches neither.** Adding `@fde/bedrock` to
steering made `assess-requirement.ts:271` stop compiling:

```
Property '#private' in type 'OpenAI' refers to a different member
that cannot be accessed from within type 'OpenAI'
```

`openai@7` declares **optional peer dependencies on the AWS SDK** — it has its
own Bedrock support. While nothing supplied them, pnpm built one `openai`. Once
`@fde/bedrock` brought AWS in, pnpm built a second with the peers satisfied;
`@fde/agent` saw one and steering the other. Fixed with `node-linker=hoisted`
in `.npmrc`.

**What that trade cost, stated rather than buried:** pnpm's strict isolation is
gone — it's what caught an undeclared `@anthropic-ai/sdk` import an hour
earlier. One identity per library was judged worth more than catching undeclared
imports. `leak:check` and `typecheck` still run.

---

## The cheaper route, not taken here

The Vercel AI SDK (already in this repo as `@ai-sdk/openai-compatible`) has an
official `@ai-sdk/amazon-bedrock` provider. For the **Mastra** and **LangGraph**
loops that's ~5 lines instead of a translator.

It does not reach the **Agents SDK** loop (which wants an OpenAI *client
object* via `setDefaultOpenAIClient`) or the three raw `chat.completions.create`
call sites — which is why the adapter exists. Doing both, and writing down what
each costs, is the more valuable artefact. Not yet done.

---

## Unfinished

- **No real call has ever been made.** AWS returned
  `Your account is currently being verified` — an account-level hold, not
  permissions. Everything below the API is tested with a fake client.
- **The provider switch is wired to nothing.** No call site uses `completion()`
  yet.
- **The budget kill-switch has never fired.** Wiring is verified; firing is not.
  `--approval-model AUTOMATIC` means it cannot be triggered manually, so it can
  only be proven by real spend crossing 80%.
- **Embeddings, and therefore the whole grounding path, stay on Azure.**

---

## Resuming

```bash
# 1. has the account verification cleared? (on the machine with AWS credentials)
aws bedrock-runtime converse \
  --region eu-north-1 --profile bedrock \
  --model-id eu.anthropic.claude-haiku-4-5-20251001-v1:0 \
  --messages '[{"role":"user","content":[{"text":"Reply with exactly: OK"}]}]'

# 2. then, the first call through our own code
LLM_PROVIDER=bedrock AWS_PROFILE=bedrock pnpm bedrock:check
```

**The guardrails already in place** (AWS account `257478996634`): a $0.01
zero-spend alarm, a $10 `monthly-cap` with alerts at 20/50/80%, and a budget
action that attaches `deny-bedrock` to the `bedrock-invoke` user at 80%. That
user can invoke **Haiku only** — not Opus, not Fable, and nothing outside
Bedrock.
