# The concepts, and where each one bites in steering

*Written 2026-09-13, after reading `GUIDE.md` §2b, `docs/pharma/BOTTLENECK-2.md`
and `docs/PROGRESS.md` §15/§17 rather than working from memory. Companion to
[`FROM-PHARMA.md`](FROM-PHARMA.md), which covers caching, fan-out, the debate and
the output guard. This one is the whole map: the eight pillars, context
engineering, and what to build here to learn each.*

---

## The eight pillars, and where steering actually stands

From `GUIDE.md` §2b. Insurance built 1–4 and most of 5; pharma added the
multi-agent work on top.

*Table refreshed 2026-09-14. The version below it carried until then said
pillars 2, 3 and 4 were "not started" — all three were built on 2026-09-13 and
the table simply was not updated with them. Check a status table's date before
trusting it.*

| # | Pillar | steering |
|---|---|---|
| 1 | **Grounding** — where do the facts come from? | **done and verified.** 3,854 passages, hybrid search, `retrieval-check` 5/0 |
| 2 | **Tool loop** — how does the model get them? | **done.** `search_documents` + `find_comparable_work`, ~55 s a requirement, and a fan-out that ran all 24 of the bid |
| 3 | **Answer shape** — how do we check what it said? | **done.** `schema:check` 15/0, both directions, plus the two guard patterns |
| 4 | **Evals** — how do we know it works? | **done, thinly.** 3 cases × 5 runs, 15/15, 0 flaky — but the baseline ran `fixtures: live`, so it is not reproducible offline |
| 5 | **Cost & latency** | **done for what runs.** Every loop logs per request; the whole bid is separable by surface label and cost $0.26 at 66% cached |
| 6 | **Credentials** | **done, inherited.** Entra tokens, no stored key, asserted on the wire by `derived:compliance-check` |
| 7 | **Escalation** — when must a human decide? | **done.** `decisions_for_human` carries it, exempt from the commitment guard by construction; 23 of 24 requirements refused to price and said why |
| 8 | **Deployment** | **done.** `steering-app` builds and deploys from `.github/workflows/deploy.yml` alongside the other three; see [`docs/SITE.md`](../SITE.md) |

The honest reading has changed and is worth restating. Steering is no longer
absent anywhere — **it is the most complete of the three engagements**, and the
open problems are no longer "pillar N is unbuilt" but questions the built system
raised: twenty-three of twenty-four requirements price to nothing
([`NEXT.md`](NEXT.md) §0), the `finding` enum returns one value in 23 of 24
cases (§5a), and the eval suite is far better at catching over-confidence than
over-caution — which is the wrong way round for a system that refuses almost
everything.

---

## Context engineering — and steering is the first engagement where it is forced

### What it is

Deciding what the model sees on each turn. LangChain's taxonomy is four verbs —
**write, select, compress, isolate**
([LangChain, *Context Engineering for Agents*](https://www.langchain.com/blog/context-engineering-for-agents);
[Anthropic, *Effective context engineering for AI agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).

It is not prompt writing. Prompt writing is what you say; this is what you let
into the window at all, and what you take back out.

### Why it had nothing to bite on before

`BOTTLENECK-2.md` puts it plainly:

> Every pillar so far assembles a **bounded** context: one lot, six silos, one
> dossier, one tool result. Context engineering has had nothing to bite on,
> because the *whole* dossier fit in a turn.

That was true, and the corpus sizes say why:

| engagement | corpus | indexed passages |
|---|---|---|
| pharma | **5 files** | — |
| insurance | 97 files | ~700 |
| **steering** | **1,069 files** | **3,854** |

Pharma reached the fan-out shape at 23 lots. **Steering reaches it on volume
alone**, before any fan-out: 24 requirements, each needing retrieval over 3,854
passages and comparables over 203 past jobs. The whole thing cannot fit in a
turn and there is no version of it that does.

### What it actually is, and the thing that is not obvious

Deciding **what the model is allowed to see on each turn**, and what you take
back out. Not prompt writing — the prompt is *what you say*, this is *what is in
the room while you say it*.

The instinct is that the limit is the context window. It is not; modern windows
are large. **The limit is attention.** A model handed sixty passages does not
read them equally: it reads the beginning and the end properly and the middle
turns to mush. Filling the window does not add information — past a point it
*removes* it, by burying the passage that mattered among fifty that did not.

**More context can make the answer worse.** That is the whole subject in one
sentence, and it is why this is engineering rather than housekeeping.

### The numbers, measured on our own index — 2026-09-13

```
3,854 passages   ·  average 137 tokens each  ·  longest 1,520 chars
203 past jobs
evidence sentence, average 12 tokens
```

Assessing 24 requirements, each doing its own retrieval:

| `k` | one requirement | all 24 |
|---|---|---|
| 5 | ~687 tokens | **~16,500** |
| 8 | ~1,100 | **~26,400** |
| 20 | ~2,749 | **~66,000** |

Passages alone — before comparable jobs, before the requirement text, before the
answer being assembled. At `k=20` that is 66,000 tokens of evidence to answer 24
questions, where any one question needs about 1,000 of it. **The attention is
spent on 65,000 tokens already discounted.**

### The four verbs, mapped to things that exist here

**WRITE — state the shape, do not make the model re-derive it.**
Does the estate walk hand over *"24 requirements: 6 look like carryover, 3 have
no comparable history, 1 has a safety-case impact"*, or 24 raw rows it must
count itself every turn? Today `walk-cost` prints a summary **for a human** and
returns nothing structured. That summary is the artefact — it just is not
reaching a model.

**SELECT — each unit sees its own evidence, not everyone's.**
If 24 requirements are assessed, does the assessor for requirement 7 see
requirement 7's passages, or all 24 sets? This is the same decision pharma made
one level up when it gave its sub-agents **no tools** and handed evidence down —
and then reversed on evidence for the adjudicator. The steering version is not
obvious and should be measured, not argued.

**COMPRESS — a resolved item becomes one line.**
*"CR-K2-0104 — hysteresis 0.5 N·m — carryover, no cost, evidence
`system-requirements-PRG-KST-K2.md:37`"* is one line. Its four retrieved
passages and six comparable jobs do not need to stay in the window for the
other 23 requirements. A human triage list works exactly this way.

**ISOLATE — keep the noisy lookup out of the main reasoning.**
Steering's candidate is obvious: the **73 MISRA reports.** Half of each one is a
fixed SUMMARY block and half is free prose, and most of it is irrelevant to any
given question. Pulling deviation D-07 into a sub-context that returns one
sentence is different from letting 73 static-analysis reports into the window
that is also weighing a price.

Concretely, on the numbers above: **SELECT is the 66,000 → 1,000 move** and is
the single largest lever on the table. **COMPRESS** turns a resolved requirement
into roughly 25 tokens where it occupied 700 — a 28x reduction on every item
already dealt with.

**MEASURED, 2026-09-13: 2.4x, not 28x.** The compress verb is built —
`pnpm steering:summarise`, and [`THE-SUMMARY.md`](THE-SUMMARY.md) is the plain
version. On a real filed assessment, 4,710 characters of dossier became 1,992
characters of line.

The estimate above assumed a resolved requirement becomes a triage entry:
reference, finding, one citation. The line that actually works keeps the stated
refusal reason and every question put to a human — because grouping refusals and
spotting repeated questions is the entire job of the thing reading the lines,
and it cannot do either from a reference and a finding.

So the verb is real and the saving is a third of what it looked like on
characters. **On tokens it is far better than 28x:** one requirement assessed
cost 188,115 input tokens; the whole bid summarised cost 3,159. Sixty times
less, for a page about all of it.

The character ratio understates it because an assessment's cost is not its
dossier — it is the passages and tool results it re-sends on every turn. The
summary has no tools, so it sends its material once. Compress and isolate are
doing the work together, and neither is visible in a character count.

That is the reason this section ends by saying **measure it** rather than by
estimating it — and the reason to measure the bill rather than the text.

### The one steering has that pharma did not

**`k` is a context decision wearing a search parameter's clothes.** Every call to
`search_documents` chooses how many passages enter the window. Pharma never had
to think about it — five documents.

And it couples to the **no-cutoff rule** in a way that is easy to miss. Because
poor passages always come back by design, raising `k` from 5 to 20 adds fifteen
passages that are, *by construction*, the worst fifteen available. It does not
merely cost more tokens: **you pay more in order to think worse.**

That coupling does not appear at five documents. It appears at 3,854.

### How you use it, in practice

Not as a library — there is nothing worth adding. Four questions, asked at each
design point:

1. What does this step genuinely need to see?
2. What can it be **told** instead of **looking up**?
3. What can be discarded once it is resolved?
4. What is noisy enough to deserve its own room?

And then the part that separates it from taste: **measure it.** Tokens per
requirement. A compressed row against a full one. Whether isolating the MISRA
lookup changes the *answer* or only the bill. `@fde/telemetry` is wired now, so
these are countable rather than arguable — which is exactly why telemetry came
first and this comes at step 4.

---

## Multi-agent — what it actually is

From `PROGRESS.md` §17.1, and worth quoting because the name misleads:

> A sub-agent is not a thing. It is an ordinary loop call with its own prompt and
> its own answer shape — the same machinery the top-level call uses. What makes
> it a sub-agent is only that something other than a human calls it.
> **"Multi-agent" sounds like a framework and is not one.**

The real work is the context decision above: what may a sub-agent look up, and
what must it be told.

### The failure to expect, because pharma had it

> A sub-agent asked to cite a source it cannot reach will invent one.

Its adjudicator wrote *"an initial decision must be made within 72 hours, per
company Field Action SOP timeline"*. **No such SOP and no such rule exist.** The
prompt asked it to cite the clock and gave it no way to look one up.

A prompt bug, not a model failure — and an invented deadline is worse than an
absent one, because it gets acted on.

**Steering's version is predictable in advance:** an advocate asked *why* an ASIL
was allocated, without access to the safety assessment, will produce a plausible
decomposition argument that does not exist. The corpus even contains the real
one, which makes the fabrication harder to spot, not easier.

---

## LangGraph — the question pharma reopened, and whether it reopens here

`BOTTLENECK-2.md` argued that a fan-out over 23 rows, *"where a human may need
to act on row 6 while row 19 is still being assessed"*, is **a graph of per-item
state, not a single request-response loop** — and that this is LangGraph's
stated fit rather than a third way to do a solved job.

Steering's 24 requirements have the same shape. But the prerequisite is the
same too: **the single case has to work first.** Reaching for a state graph
before one requirement can be assessed end to end is choosing an engine for a
program that does not exist.

---

## What to build, to learn each

In order, because each one is the prerequisite for the next.

| | build | learns | status |
|---|---|---|---|
| 1 | **The answer contract** — no field that can say *"we'll do it"* | pillar 3, escalation-as-a-field | ☑ `schema:check` 13/0 |
| 2 | **The agent loop** — one requirement, two tools, one answer | pillar 2, tool-calling | ☑ runs in ~46 s, 4 searches, citations exact |
| 3 | **Eval cases** — built on the planted traps | pillar 4 | ☑ `checks:check` 19/0 · `severity:check` 10/0 · baseline 15/15, **live fixtures** |
| 4 | **Fan-out over 24 requirements** | multi-agent, and all four context verbs at once | ☑ 2026-09-14, `steering:assess-all` — serial, resumable. Concurrency deliberately NOT built: 11 ran in 650 s with zero rate limits |
| 5 | **The debate** — on the two questions `walk-cost` already prints | adversarial judgement, the citation trap | ☐ needs a working single assessment to argue about |

### What steps 1–3 actually taught, which was not what the plan predicted

The plan said step 4 was where context engineering *"stops being a reading topic
and becomes a set of measurements"*. It arrived two steps early, in the single
case, and three times:

- **`k` capped at 10.** The model asked for 20 on five of six searches — 90
  passages, ~12,000 tokens, re-sent every turn — and hit a rate limit. The
  description had invited it: *"ask for more when comparing documents."*
- **"An empty result is an ANSWER."** It searched eight times for a test report
  that does not exist. The absence WAS the finding. Adding that instruction took
  the search count from 8 to 4.
- **The opening search is now done for it** (`write`). Three runs spent turn one
  discovering the context of a requirement they had been handed. Seeding it cut
  the run from ~126 s to ~46 s and made the starting point identical across
  runs, which is what made the evals worth writing at all.

None of those were found by reading about attention budgets. They were found by
a loop dying, three different ways.

Steps 4 and 5 are where context engineering stops being a reading topic and
becomes a set of measurements: how many tokens per requirement, what a compressed
row costs against a full one, whether isolating the MISRA lookup changes the
answer or only the bill.

---

## What is deliberately not on the list

- **Result caching** — no repeat questions, because no users. Building it now is
  building for a load that does not exist.
- **A shared context-engineering package** — pharma's own rule: scope it to the
  bottleneck, generalise on the second occurrence. One fan-out is not a pattern.
- **LangSmith** — pharma's note stands: a learning trial on synthetic data with
  the production boundary stated, not a route for real customer evals through a
  US-hosted vendor.
