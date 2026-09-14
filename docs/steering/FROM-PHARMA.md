# What transfers from pharma, and what does not

*Written 2026-09-13. Pharma built prompt-cache cost modelling, multi-agent
fan-out, a debate, and an output guard. This is an honest assessment of which of
those apply to steering, which do not, and in what order. Sources:
`docs/PROGRESS.md` §15 (cost), §17 (multi-agent).*

---

## The gap that comes before any of them

`packages/steering` used **none** of `@fde/telemetry`, `@fde/evals`,
`@fde/schema` or `@fde/guard`. Pharma uses telemetry and evals.

Meanwhile steering had already spent roughly **530,000 embedding tokens and 220
chat calls**, plus a run that died at document 36 and one that re-indexed the
whole corpus twice by accident — and **nothing measured any of it.** The double
index was caught only because a banner printed twice.

That is not a concept to learn. It is a defect, and it is fixed first: see
§Telemetry below.

---

## 1 · Cost modelling with cached input — APPLIES, and will land differently

### What pharma found

Not "it is cheaper". **Output dominates, and nobody could have known before
measuring.**

| | ceiling | modelled |
|---|---|---|
| input | $0.0035 | **$0.00077** (−78%) |
| output | $0.0076 | unchanged |
| | | **output = 91% of the bill** |

Every instinct about trimming system prompts and tool schemas was formed while
input looked like a third of spend. It is not. `reasoningEffort` and answer
length are nearly the whole lever.

### Why it lands differently here

Pharma's 86.8% cache rate is **a property of the loop's shape**, not of the
deployment: each turn re-sends the system prompt, the tool schemas and the
conversation, so turns 2 and 3 are mostly cache hits.

Steering's extraction is **one turn per document, 220 times.** It should cache
close to nothing.

**That is a prediction, and it is now measurable.** If it comes back high, the
assumption was wrong and that is worth knowing. The extraction logs
`cachedInputTokens` straight through from the provider, never defaulted — `0`
claims a measurement and absence admits there was not one.

### The traps, carried over verbatim because they cost pharma real time

- **Cached tokens are a SUBSET of input tokens, so the formula subtracts.**
  Added instead, a cache HIT makes a request look *more* expensive — wrong in
  the direction nobody investigates, because only a cost going *down* gets
  audited.
- **`undefined` is never collapsed into `0`.** The dollar figures are identical
  either way, which is the trap; only the note distinguishes them.
- **A published price list tells you what a meter COSTS; only the bill tells you
  which meter you are ON.** Searching the retail API for "5 mini" returns only
  the priority-processing meters, and the guess taken from them ran 1.8x high
  for two days. `az consumption usage list` settled it.

---

## 2 · Multi-agent fan-out — APPLIES, and steering has the right shape

Pharma's rule for when fanning out is real rather than a demo:

> Release is one lot and one decision; supplier impact is twenty-three rows,
> which is the shape that makes fanning out a real question.

Steering has exactly that shape, and `walk-cost` already says so in its own
output: **"three line items out of twenty-four requirements."** Assessing 24
requirements against the estate is a genuine fan-out.

### The lesson that transfers hardest

> Deciding what a sub-agent may LOOK UP versus what it must be TOLD is the
> actual work. Tools are the easy part.

Pharma gave its sub-agents **no tools**, because the evidence for all 23 lots
was already gathered in one pass — 23 agents re-querying an estate already read
is slower and lets them disagree with each other mid-run.

Steering's equivalent question: does a per-requirement assessor get
`search_documents`, or is it handed the passages? The honest answer is not
obvious, and pharma reversed its own decision on evidence (§17.2), which is the
reason to measure rather than argue.

### And one that is not about agents at all

> A sub-agent is not a thing. It is an ordinary loop call with its own prompt
> and answer shape. What makes it a sub-agent is only that something other than
> a human calls it. "Multi-agent" sounds like a framework and is not one.

---

## 3 · The debate — APPLIES, and the disagreements are already written down

Pharma ran two advocates and an adjudicator over a recall decision. Steering has
two genuinely contested judgements with money on them, and `walk-cost` prints
them today as open items:

> Is 400 N of missing evidence a re-TEST or a re-DESIGN? A rig week is cheap; a
> redesign is not.
>
> Does the damping safety case have to be rebuilt at all, or can the K2
> architecture keep damping out of the assist path and inherit the 2021
> decomposition?

Neither is manufactured. Both are exactly what the meetings argue about.

### The failure to expect, because pharma had it

> A sub-agent asked to cite a source it cannot reach will invent one.

Its adjudicator wrote *"an initial decision must be made within 72 hours, per
company Field Action SOP timeline"*. **There is no Field Action SOP and no
72-hour rule.** The prompt asked it to cite the clock and gave it no way to look
one up.

**That is a prompt bug, not a model failure** — and an invented deadline is
worse than an absent one, because it gets acted on. The fix was to give the
adjudicator the retrieval tool and change the instruction from "cite the rule"
to "if you cannot find it, write that none was found — do not supply a number
from general knowledge".

Steering's version of that trap is obvious in advance: an advocate asked why an
ASIL was allocated, with no access to the safety assessment, will produce a
plausible decomposition argument that does not exist.

---

## 4 · The output guard — APPLIES, and steering's plan already specifies it

Pharma's `RECALL_VERDICT` forbids the model writing *"a recall is warranted"*.
[`PLAN.md`](PLAN.md) already names steering's equivalent and it is not built:

> the quote-dossier answer contract with **no field that can say "we'll do it"**

Two sub-lessons, both transferable:

**Inheriting is not asserting.** The debate was a second route to an answer and
carried none of the dossier's coherence rules — the guard lived on the wrong
schema and never fired.

**A question is not a verdict, and this is the crux.** "Should this lot be
recalled?" put TO a Qualified Person is the correct output of the whole
exercise; "a recall is warranted" is the forbidden one. So the
`decision_for_human` field is deliberately EXEMPT from the guard. The first
version of pharma's test asserted that "should the lot be recalled, QA decides"
ought to be caught — **it should not.** Guarding it would forbid the one
sentence the design exists to produce.

Steering's line is the same: *"is 400 N a re-test or a redesign — engineering
decides"* is the deliverable. *"A redesign is required"* is the thing to forbid.

---

## 5 · Result caching — DOES NOT APPLY YET

Not paying to answer the same question twice. Pharma gated it on whether
anything actually repeats, which its ask-history table can answer with one query
rather than a guess.

Steering has no repeat questions because it has no users. Building it now is
building for a load that does not exist.

---

## Telemetry, done

`src/telemetry/prices.ts` — the third copy of a price table in this repo, and
**deliberately a copy**, which needs saying because two turns earlier a
different third copy (the embeddings factory) was extracted for having reached
three.

> The embeddings factory was **mechanism** — batching, ordering, a provider
> switch. Identical in three places because the problem is identical. Three
> copies of that is a smell.
>
> A price is **policy** — a property of a contract, a region and a model. The
> three copies agree today because all three engagements sit on one Foundry
> resource, which is a coincidence of this practice repo and not a fact about
> any customer. Importing one customer's rate card into another's makes a
> renegotiation somewhere else change your invoice.

**Duplication of mechanism is a smell; duplication of policy that happens to
coincide is not.**

Two places now log, into the same `logs/requests.jsonl` the other two
engagements write to, with `surface` telling them apart:

| surface | what it records |
|---|---|
| `derived:extract` | one record per document, with cached input passed through |
| `steering:index` | one record per index run — the cost that scales with the CORPUS, not with traffic |

`steering:index` logs **one** record rather than one per batch: a batch is an
artefact of the 96-input cap, not a unit anybody reasons about. And it omits
`cachedInputTokens` rather than sending `0`, because embeddings have no prompt
cache and a measured zero would be a small lie in the one column built to hold
that distinction.

---

## The order

| | | why here |
|---|---|---|
| 1 | **Telemetry** ☑ | a defect, not an exercise; makes every later decision measurable instead of argued |
| 2 | **Answer contract + guard** | before anything writes prose, define what it may not say |
| 3 | **The agent loop** | one requirement, the two tools, an answer |
| 4 | **Fan-out** | 24 requirements, once the single case works |
| 5 | **The debate** | last, on the two open questions that are already written down |

Result caching is not on the list, and that is the finding rather than an
omission.
