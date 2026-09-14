# The A and the G — what reaches the model, and what must come back

*Written 2026-09-14, from the code and from commands re-run the same day. The
validation messages in §8 are captured output, not paraphrase.*

Companions: [`RETRIEVAL.md`](RETRIEVAL.md) is the **R** — how a passage is found
in the first place. [`ENGINES.md`](steering/ENGINES.md) is **which library drives the loop
and which cloud serves the model**. This document is the third question, and the
only one of the three that is entirely domain judgment: *what goes into the
context window, and what is allowed to come out.*

> Where this doc and `ENGINES.md` touch — structured output, retries — **that**
> one owns the per-engine mechanics and this one owns the contract and its
> reasons. Facts captured on the wire there are cited here, not re-derived.

---

## The one-paragraph version

**Augmented** is not a stage you build; it is an *assembly*. Every turn, your
code hands the model one flat list: a system prompt, the tool schemas, the
question, and everything that has happened so far. **Generation** is the model
writing the next tokens — constrained, here, to JSON matching a schema that was
sent in the same request. The interesting engineering is at both edges: deciding
what earns a place in that list, and deciding what shape an answer must have
before anyone is allowed to read it.

```
  R  ──►  passages found            RETRIEVAL.md
  A  ──►  passages + prompt + tools + history, assembled into ONE request
  G  ──►  JSON that satisfies a contract, or a retry, or an honest failure
```

The rule the whole thing exists to enforce, stated once in the prompt and then
again structurally in the schema:

> **State a fact only if a tool returned it.**

---

# PART ONE — THE A

## 1 · What is actually in the context window

There is no hidden layer. One turn is one request, and this is its body:

```
 ┌─ SYSTEM ────────────────────────────────────────────────────────────┐
 │  COVERAGE_SYSTEM_PROMPT       148 lines. Sent EVERY turn, unchanged. │
 │    · the one rule                                                    │
 │    · a 6-step ordered procedure                                      │
 │    · what kind of document you are reading                           │
 │    · similarity is not relevance                                     │
 │    · when documents disagree / when to escalate / citation format    │
 └──────────────────────────────────────────────────────────────────────┘
 ┌─ TOOLS ─────────────────────────────────────────────────────────────┐
 │  three schemas + their DESCRIPTIONS, which are prose the model reads │
 │  get_policyholder · search_policy · search_guidance                  │
 └──────────────────────────────────────────────────────────────────────┘
 ┌─ RESPONSE FORMAT ───────────────────────────────────────────────────┐
 │  CoverageAnswerSchema as strict JSON Schema. See PART TWO.           │
 └──────────────────────────────────────────────────────────────────────┘
 ┌─ USER ──────────────────────────────────────────────────────────────┐
 │  "Policy AUT-4471. how much rental car is covered?"                  │
 └──────────────────────────────────────────────────────────────────────┘
 ┌─ HISTORY — grows every turn ────────────────────────────────────────┐
 │  assistant: tool_call search_policy {query, policy_form, k}          │
 │  tool:      {"results":[{document_id, section, text, similarity}…],  │
 │              "note":"Ranked by topical similarity only. …"}          │
 │  assistant: tool_call …                                              │
 │  tool:      …                                        ← up to 12 turns │
 └──────────────────────────────────────────────────────────────────────┘
```

Everything above is **text the model reads**. Nothing in the assembly summarises,
compresses, or re-ranks on the model's behalf.

## 2 · The system prompt is an ORDERED list, not a set of guidelines

`coverage-prompt.ts` opens by calling itself *the domain logic of this app* and
saying to treat it as code, not copy: every rule exists because a specific
failure made it necessary, and should be **deleted if an eval proves it is doing
nothing**.

The structural choice is the transferable one:

> The predecessor's first prompt offered an **unordered set** of topics the model
> "should" cover. The model satisfied it by picking three — and the three
> excluded the most important one.
>
> **An unordered list is something a model can satisfy in a way you did not
> intend. A ranked, closed list is not.**

So the procedure is numbered 1–6, with the failure named inside each step rather
than left implicit:

| Step | And the reason attached to it |
|---|---|
| 1 · record **first**, before any search | the record is the **manifest** — a document not on that schedule is not part of the policy, whatever the document says about attaching |
| 2 · no id and a customer question → **escalate**, don't guess | guessing an id produces a confident answer about somebody else |
| 3 · search with the form from the record | form ids carry their **edition**; without the filter you cite the right clause from the wrong year |
| 4 · search the endorsements too | an endorsement can change what the base form says |
| 5 · `search_guidance` before concluding | **silence is not an answer** — and *do not reword the same search of the same form more than twice* |
| 6 · answer only from what came back | — |

Step 5's second half is a **budget rule written into the prompt**: two rewordings
of one form, then move on. It exists because re-searching is how a loop burns its
turn cap without learning anything — and it is carefully distinguished from step
4, which is mandatory and never counts against it.

## 3 · What a tool puts back — and what it does not

A tool result is JSON, and every field in it is a design decision:

| Field | Why it is that and not something else |
|---|---|
| `text` | the chunk's **`body`**, not the embedded `text`. The heading trail was already embedded for retrieval and is reported separately in `section` — repeating it inside the passage reads like part of the clause. |
| `section` | the full heading trail, so the citation is verifiable months later |
| `similarity` | exposed for debugging, and the schema description **tells the model not to read it as confidence** — because it isn't one (`RETRIEVAL.md` §5) |
| `note` | prose from the tool **to the model**, every time |

The `note` is the part most systems don't have. It is how a tool reports a
*state* that is not a result:

- *"Keyword search was unavailable on this query — these results are
  vector-only"* — degraded retrieval, said out loud rather than silently worse.
- *"No CURRENT contract document matched form id X… An empty result is not the
  same as the corpus being silent, and it is not an answer."*
- The guidance nudge: when a question touches sales tax, deadlines or salvage,
  the coverage tool **says that the answer may live somewhere else**.

> An empty result and a silent corpus are different facts, and the model must not
> confuse them. One means *ask again*; the other means *escalate*.

**Errors are content, never exceptions.** `registry.ts` catches everything and
returns a record the model can read. A model that invents a tool name is told
so — *"No tool named X. Available: …"* — because an exception escaping the
registry becomes a 500 and the conversation dies mid-claim.

**`summariseResult` is not part of this.** It writes the one-line `--trace`
output a *human* reads. The model always receives the full result JSON. Worth
stating because the two look adjacent in the code and are not.

## 4 · The context accumulates, and that is the bill

The system prompt and tool schemas are re-sent **unchanged every turn**. That is
what makes provider prompt caching worth having, and `TurnRecord` tracks it with
a distinction that is easy to get wrong:

> `cachedInputTokens` is **`undefined` when the engine did not say** and `0` when
> it said none. Defaulting the first to the second would make an engine that
> never reports look like an engine on which caching never helps — a false
> finding about exactly the thing three engines exist to compare.
>
> **Expect zero on turn 1.** Nothing has been sent yet. The cache bites from
> turn 2.

The cap is `DEFAULT_MAX_TURNS = 12`, raised from 8 on 2026-09-05 after the
rideshare case was seen finishing at 7 and 8 turns against a cap of 8:

> **A turn cap that bites is an infrastructure failure wearing a model failure's
> clothes.** Unused headroom costs nothing — the loop stops the moment the model
> answers.

It lives in one place because `eval/run.ts` claims the eval takes *"exactly the
path a genuine request takes"*, and two call sites with two caps would make that
comment false.

The measured spread, from one traced question: **6 tool calls and 43k tokens when
the model routed well, 11 calls and 122k when it did not.** Assembly is cheap;
*how many times you assemble* is the cost.

## 5 · Not everything augmented in was retrieved

`get_policyholder` returns the record **whole — unchunked, unranked,
untruncated**. The model reads all of it.

That is the point of the tool, and it is the clearest statement in the repo of
what augmentation is *for*:

> **If the question has one exact answer, it is a lookup, not a search.**
>
> Routing "what is Maria Santos's collision deductible" through similarity search
> returns the five most Maria-shaped chunks and hopes one of them is hers —
> which fails silently and plausibly, the worst failure shape there is.

And a **miss is context too**. When the id isn't found, the tool returns
`found: false` plus a list of ids that *do* exist — so a model that mistyped an
id can correct itself, rather than concluding the customer does not exist.

---

# PART TWO — THE G

## 6 · "Generation" here means constrained decoding against a contract

The schema is not checked after the fact; it goes **in the same request** as
strict JSON Schema, and the provider constrains decoding to match. Handing the
Zod schema to the Agents SDK and capturing the real outgoing request gives:

```
strict                        : true
has $ref / $defs              : false      ← the reused Citation is INLINED
additionalProperties: false   : every object
nullable                      : type: ["string","null"]
```

No `$ref` was the real risk — strict mode is unforgiving about them and
`Citation` appears twice. *(Which engine sends this, and LangGraph's extra
structuring call, are `ENGINES.md` §2.)*

**Strict mode makes conformance very likely, not guaranteed.** Refusals written
in prose, truncation on max tokens, and schemas a model cannot satisfy all still
produce invalid output. Hence everything below.

## 7 · The shape IS the rule

Four boxes, and **no free-text field a factual claim can hide in**:

```
   citations[]          what IS backed — and by exactly what wording
   unverified_claims[]  what ISN'T, admitted plainly
   conflicts[]          where the documents disagree with each other
   escalate             when a human has to decide
```

> The model cannot write a confident paragraph mixing three checked facts with
> one invention, **because it cannot write a paragraph at all**. A guess still
> gets made — it just has nowhere to land except a box labelled *unchecked*.

`conflicts` exists because the corpus contains a **planted contradiction**: the
base form says rental reimbursement is \$40/day for 30 days, the endorsement says
\$50/day for 21 days, and neither document states which policies it attaches to.
Without a box for *"these two disagree"*, a model has exactly two options and both
are wrong — silently pick one, or refuse entirely.

The type is **inferred from the schema, never hand-written**. The predecessor
kept a JSON Schema object and a TypeScript interface side by side with nothing to
catch them diverging.

## 8 · Two layers, because shape and sense are different questions

A schema checks **shape**: are the fields there, are they the right types. It
cannot check **coherence**: `answer: null` with `escalate: null` is a perfectly
valid object and a completely useless response.

Real output, captured 2026-09-14 by calling `validateCoverageAnswer` directly:

```
unparseable
  not valid JSON: Unexpected token 'o', "not json at all{" is not valid JSON

wrong shape
  does not match schema: /policy_id Invalid input: expected string, received
  undefined; /citations Invalid input: expected array, received undefined; …

invented an extra field
  does not match schema: (root) Unrecognized key: "extra"

incoherent — the useless answer
  internally inconsistent: answer is null and escalate is null — if you cannot
  answer, say why and name an owner in escalate

incoherent — THE DANGEROUS ONE
  internally inconsistent: conflict(s) [rental daily limit] have no resolved_by
  but escalate is null — an unresolved conflict must be escalated, never decided
```

Three things that output demonstrates and a description would not:

**1. The messages carry a PATH** (`/policy_id`, `(root)`). A model told *"invalid
input"* has to guess which field — and guessing is what produced the invalid
output in the first place.

**2. Coherence catches things the schema structurally cannot.** `positions: []`
on a conflict **passes the shape check**: `z.array(Position)` has no `.min(2)`.
Its description says *"At least two"* — which is prose for the model, not
enforcement — and the coherence rule is what actually rejects it. The two layers
are not redundant; the second is load-bearing.

**3. The coherence rules are not Zod refinements, on purpose.** Folding them into
the schema sounds tidier and is worse: a refinement failure surfaces as a generic
schema error, and **these messages are what gets handed back to the model.**

> A model told *"invalid input"* retries randomly. One told *"you recorded a
> conflict with no resolution and did not escalate"* fixes the actual problem.

The single most important rule in the file is the last one. An unresolved
conflict with no escalation means **the model silently picked a side** — which
looks, from the outside, exactly like a correct answer.

## 9 · Never repaired — handed back, and then counted

`settle.ts` owns the budget. `structuredRetries` defaults to **1**.

```
  model text ──► validate ──ok──► done
                     │
                  not ok
                     │  push the error, fire `schema_retry`
                     ▼
              retries left? ──no──► stoppedBecause: 'schema_invalid'
                     │ yes                (reported as a failure, NOT an answer)
                     ▼
        "Your previous response did not satisfy the required schema:
         <errors>. Reply again with valid JSON only."
```

> **Silent repair hides the failure rate, and the failure rate is a number you
> need**: it tells you whether the schema is too hard, the prompt is unclear, or
> the model is wrong for the job. Those have three different fixes and one of
> them is expensive.

`schemaErrors` keeps **every** failure, including ones a later retry recovered
from — so a run that eventually succeeded still reports that it struggled.

Two design notes worth lifting:

- **The retry sentence exists exactly once.** It used to be copied into all three
  engines. That sentence is a *prompt*: three copies means one can be reworded by
  a find-and-replace that misses a file, and from then on an engine comparison is
  partly measuring a prompt difference **while reporting it as an engine
  difference**. `eval:diff` would never catch it, because the engine is part of
  the setup key. *(How each engine delivers the retry genuinely differs and stays
  per-engine — `ENGINES.md` §2.)*
- **`@fde/agent` ships no default validator and throws if you ask for a schema
  without one.** A default would let raw text through as though it had passed,
  and it would typecheck. The answer contract is the most domain-specific thing
  in the stack; a package that invented one would be validating against a shape
  it made up.

**Why re-validate what the engine already validated?** Every engine's structured
output enforces shape. **None of them knows anything about coherence.** The
caller's validator is the only thing that checks both.

## 10 · Escalation is an output, not a failure

`escalate` is a required field with a nullable object, and both the prompt and
the schema description push the same way:

> **Escalation is cheap and visible. A confident wrong answer is neither.**

The prompt names four triggers — nothing addresses the situation; a conflict has
no `resolved_by`; the record is missing or its endorsements are unconfirmed; the
question needs judgment the documents do not contain — and adds the instruction
that makes it usable rather than a refusal button:

> *Where you can give partial findings alongside the escalation, do — the
> adjuster would rather have your research and a flag than a bare refusal.*

Hence `answer` and `escalate` are independently nullable: **a partial answer with
a flag is a distinct, valid, and often best outcome.** `AUT-4482` is the eval case
that exists to hold that shape in place.

And the counterpart, from the prompt's conflict section — the failure that a
schema alone would wave through:

> *Resolving the conflict and then quoting the superseded figure is the same
> wrong answer as never having looked.*

## 11 · Which generation failures are dangerous, and why stage doesn't decide it

`@fde/evals` ships **no default severity**, because which failures matter is a
judgment about what users do with a wrong answer. Here:

| Bucket | What it is | Response |
|---|---|---|
| **false answer** | asserted something unverified as if checked, or cited a source that does not exist | the dangerous one |
| **over-caution** | escalated something it could have handled | annoying, visible immediately, cheap |
| **no answer** | hit the turn cap, blew the schema, or threw | **infrastructure or budget — the fix is config, not prompt** |
| **missing fixture** | a replay took a path never recorded | infrastructure, and *not* evidence about the model |

The third bucket exists because the first eval run misfiled a `max_turns` timeout
as a *false answer* — a misdiagnosis that sends you rewriting a prompt when the
real fix was raising `maxTurns`. The buckets are reported separately and **never
averaged**.

**The link back to the R.** `has_answer` and `answer_contains` — pure generation
failures — sit in the same `FALSE_ANSWER_CHECKS` bucket as `citations_resolve`
and `cites_form`, which are retrieval failures. That is deliberate:

> Severity is assigned by **consequence, not by stage**. From the adjuster's
> side, a fabricated citation and a missing figure produce the same thing — a
> wrong number they repeat to a customer. Which pipeline stage failed is a
> debugging question, not a severity question.

`flags_conflict` is called out in the source as *the worst of them* — failing it
means the model quietly picked a side.

---

# PART THREE — the seam

## 12 · The field descriptions are simultaneously prompt and contract

This is why the A and the G are one document. Every `.describe()` string in
`coverage-schema.ts` is sent to the model as part of the request — so it is
**prompt engineering living inside the type definition**:

```ts
unverified_claims: z.array(z.string()).describe(
  'Anything you asserted that no tool checked and no document supports. ' +
  'Be honest; an empty array is a strong statement and will be audited. …')
```

*"An empty array is a strong statement and will be audited"* is not
documentation. It is doing work, at generation time, on the model's willingness
to leave the box empty.

Which is why `pnpm schema:check` **fails if a field loses its description** — a
field losing its `.describe()` is a silent prompt regression that no type error
and no test would otherwise catch. The check carries a negative control: it
strips a description and asserts the walk reports it, *because a check that has
only ever passed is indistinguishable from one that cannot fail.*

---

## What asserts all this

```bash
pnpm --filter @claims/insurance schema:check       # 10 contract cases + descriptions. offline, free
pnpm --filter @claims/insurance compliance:check   # what the loop puts ON THE WIRE
pnpm --filter @claims/insurance compliance:mastra  # the same, for the second engine
pnpm --filter @claims/insurance severity:check     # every check maps to a bucket
pnpm --filter @claims/insurance eval               # the whole thing, 5 runs a case
```

`schema:check` passes 10/10 today, and the ten are chosen to be *outcomes*
rather than field permutations: the three good shapes (conflict resolved by the
record · clean escalation · partial answer plus a flag), the two dangerous ones
(silently picked a side · answered with no evidence), the useless one (no answer,
no escalation), and four malformations including prose instead of JSON.

`compliance:check` uses **the same validator production uses** — a compliance
test driving a different construction than production would prove nothing, which
is a trap `loop-sdk.ts` records from its own history.

## What none of it proves

| | |
|---|---|
| **No measurement of prompt rules in isolation.** | The prompt's own header says a rule should be deleted if an eval proves it does nothing. Nothing currently proves any individual rule is load-bearing — the suite scores the whole prompt at once. |
| **The schema-failure rate is recorded but not tracked over time.** | `schemaErrors` survives into the result and the baseline; no scorecard line trends it, so "the schema is too hard for this model" would have to be noticed by hand. |
| **Context assembly is asserted only for what it FORBIDS.** | `compliance:check` proves `store: false` and one host. Nothing asserts what the model is *sent* — a tool that started returning half a passage would not fail a check here. |
| **`archive/pillar-2-handrolled/loop.ts` is referenced and absent.** | `loop.types.ts` points at it as the reference for the protocol without a framework. It is not in this repo — the same gap `ENGINES.md` §5 records. |
