# Stage 6 — the loop, and the first model call

**Nothing here is built.** This is the plan, written while stages 4 and 5 were
fresh, so whoever picks it up does not have to re-derive the constraints.

Read [`STAGE4.md`](STAGE4.md) and [`STAGE5.md`](STAGE5.md) first — this stage is
the wire between them.

---

## The one-line version

Everything so far runs without a model. Stage 6 is where one is finally asked a
question, and where **we stop knowing what will happen**.

---

## 1 · What it is, plainly

```
a question
   → the model chooses tools           (stage 4 built the tools)
   → the tools run against Postgres
   → the model writes an answer
   → the contract checks it            (stage 5 built the contract)
   → the answer, or a rejection
```

That is the whole stage. No evals, no UI, no deployment.

---

## 2 · Why this one is different from every stage before it

Stages 1–5 are **deterministic**. Same input, same output, checkable against
`awk`. Every number in this folder was verified twice by things sharing no code.

From here that stops. The model decides which tool to call, with which
arguments, and what to write. The same question asked twice can produce two
different answers, and neither is a bug.

**Concretely:** 4.5 measured a **ceiling of 1.00** with the tools called by hand.
Stage 6 is where we find out how close a model gets to that ceiling. **It will
be lower**, and the gap between them is the only thing stage 6 actually
measures.

> Do not report stage 6's number without 4.5's beside it. Alone it says "the
> system scores X". Together they say "X of what was reachable", which is the
> sentence that tells you whether to fix the prompt or the tools.

---

## 3 · Constraints already known — do not rediscover these

**Only Mastra reaches Gemini.** `docs/ENGINES.md` is the chart:

```
LOOP=sdk         refuses non-Azure by design
LOOP=mastra      works                            ← the only option here
LOOP=langgraph   400 from Gemini — it drops a provider-specific field
                 between turns (thought_signature)
```

**`LOOP` must be set beside `LLM_PROVIDER`.** Setting the provider alone leaves
the default engine in place, which then refuses it. The two are one decision.

**The free tier rate-limits, and the failure is silent.** `docs/FREE.md` §10 is
the cautionary tale: an unpaced eval run reported **zero wrong answers** because
three of the questions never ran at all. Pacing is not an optimisation here, it
is the difference between a number and a fiction.

**The environment is already configured** — `LLM_PROVIDER`, `LOOP`,
`HOSTED_API_KEY` and `HOSTED_MODEL` are all set in `.env`.

---

## 4 · The three parts, and which is hardest

### 4a · Tool registration — the descriptions ARE the interface

`@fde/agent` takes a `Tool`: a Zod `parameters` object, a description, and an
`execute`. `packages/agent/src/core/tool.types.ts` says it plainly:

> A tool parameter's description is the only thing telling the model what to put
> there, and a vague one produces a tool that gets called with the wrong
> arguments — a failure that looks like a model problem and is a documentation
> problem.

That warning is worth more here than in most places, because **stage 4 built
five tools that are easy to confuse**:

```
get_recall          I know the campaign number
find_recalls        I know the vehicle, is there a campaign?
search_complaints   I want to read complaints
count_complaints    I want HOW MANY, and must not count passages myself
complaints_citing   I want complaints that name this campaign
```

A model that reaches for `search_complaints` when it wanted `count_complaints`
will produce a confident wrong number — REC-001's trap, arrived at from a new
direction. **The parameter descriptions are where that is prevented**, not the
prompt.

### 4b · The prompt — and the two things it must force

Most of it is ordinary. Two instructions are not, and both exist because of
measured failures:

1. **Never count by reading.** `count_complaints` exists because three of the
   eight questions want a number and no six passages contain one. A model will
   happily count the passages it was given.
2. **An empty `find_recalls` is an answer.** Not a reason to go looking for a
   near-miss. Stage 5's rule 6 rejects that, but a rejection is a retry — better
   not to produce it.

### 4c · Pacing — see §3

---

## 5 · The baby steps

Deliberately one question before eight, because the first model call will fail
in a way nobody predicted and a single case is where that is cheapest to read.

| | step | done when |
|---|---|---|
| 6.1 | tools registered, no model | each of the five is callable through `ToolRegistry`, arguments validated by its Zod schema |
| 6.2 | **REC-002, one question, one call** | *"What does recall 20V197000 cover?"* returns the campaign, and the record shows `get_recall` was called and `search_complaints` was **not** |
| 6.3 | the answer through the contract | the reply parses, passes the schema, and trips no coherence rule |
| 6.4 | REC-001, the hard one | two tool calls, in order, with the second's `filed_after` taken from the first's result |
| 6.5 | REC-005, the negative one | `find_recalls` returns empty and the answer says so without citing a campaign |
| 6.6 | pacing | a run of all eight completes without a 429, and the run reports how many calls it made |

**6.2 is the whole stage in miniature.** Its check is a *negative*: REC-002's
key says `calls_get_recall_first` **and no `search_complaints` call at all**. A
model that searches for a campaign number has misunderstood the tool layer, and
that is worth catching on question one rather than question eight.

---

## 6 · What stage 6 does NOT do

- **No evals.** Stage 7 — eight questions, repeat runs, severity buckets that
  separate *a wrong answer* from *a quota failure*.
- **No UI.** Stage 8.
- **No new tools.** If a question cannot be answered with the five, that is a
  finding to write down, not a sixth tool to add mid-stage.

---

## 7 · Decisions still open

**Which model.** `HOSTED_MODEL` is set, but Google retires product names — the
loop reads it from the environment and does not default, deliberately. Record
which model produced any number quoted; two runs on different models are not
comparable, the same rule `eval:diff` already enforces.

**What happens on a rejected answer.** Stage 5 rejects rather than repairs. Does
the loop retry with the errors appended, and how many times? A retry budget is a
cost decision on a free tier, and an un-budgeted one is how a quota disappears
in an afternoon.

**Whether the model sees `counts` filters.** Rule 4 requires every number to
carry the tool call that produced it. The cleanest version has the loop attach
that automatically from the tool-call record rather than asking the model to
copy it — a model asked to restate its own arguments will paraphrase them.

---

## 8 · The honest framing for whatever this produces

Stage 4 proved the documents are **reachable**. Stage 5 proved a right answer
can be **checked**. Neither has been tested against a model.

Everything before this stage was verified by measurement. Stage 6 is the first
one where the answer is *"it depends what it says this time"* — and the whole
value of the five stages underneath it is that when something looks wrong, the
retrieval, the counting and the contract are each already known to be sound.
