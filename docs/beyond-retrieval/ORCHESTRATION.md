# Multi-agent orchestration — the industry argued about this for a year and converged on what `fanout.ts` already did

**Status: BUILT HERE, AND MEASURED.** `packages/agent/src/core/fanout.ts` is
running code; 16 fan-out runs are in the telemetry log. The published
disagreement — Anthropic *for*, Cognition *against*, and Cognition's own 2026
revision — is CITED.

> **Extends, does not restate.** [`../rag/AGENTIC.md`](../rag/AGENTIC.md) owns the
> single-agent tool loop, the turn cap, and the taxonomy table that already says
> *"multi-agent: nearly — fan-out + a summariser. Two roles, not a
> conversation."* **This document is that row, opened up.**
> [`CONTEXT.md`](CONTEXT.md) §5 owns sub-agents as a context technique.

*Research date 2026-09-15. External sources carry a URL and the date fetched.*

---

## 1 · The plain version

One agent, one context window, one conversation. It works until one of three
things happens:

- **the window fills** — see [`CONTEXT.md`](CONTEXT.md) §2, and the accumulation
  measured at 136,174 tokens by turn 12;
- **the work is embarrassingly parallel** — 24 requirements, 220 reports, 500
  lots, and each is independent;
- **one perspective is not enough** — the thing that writes the code is the
  worst possible reviewer of it.

Multi-agent orchestration is any answer to those. The shapes worth naming:

```
  ROUTER          one agent picks which specialist handles the request
                  cheap; the "specialists" are usually just tool sets

  FAN-OUT         N agents, one per item, each seeing ONLY its item
    + ASSEMBLE    then one agent reads all N results and writes across them
                  ← THIS REPO

  ORCHESTRATOR    a lead agent spawns subagents dynamically, each with its own
    / WORKER      window, and synthesises what comes back
                  ← ANTHROPIC'S RESEARCH SYSTEM

  DEBATE          two or more agents argue; a judge decides
                  ← pharma has one (`pnpm pharma:debate`)

  REVIEW LOOP     a writer agent, then a reviewer agent with FRESH context
                  ← COGNITION'S 2026 POSITION
```

---

## 2 · The argument, and it is a real one

### For: Anthropic's research system

**CITED** — Anthropic, *How we built our multi-agent research system*,
<https://www.anthropic.com/engineering/built-multi-agent-research-system>
(fetched 2026-09-15).

An orchestrator-worker architecture: a lead agent coordinates and spawns
subagents that explore different aspects in parallel, **each with its own context
window, tools and trajectory.**

| | |
|---|---|
| beat single-agent Claude Opus 4 on their internal research eval by | **90.2%** |
| token cost versus a normal chat interaction | **≈ 15×** |
| share of performance variance on BrowseComp explained by token usage alone | **80%** |

That third number is the one to sit with. **Token usage explained 80% of
performance variance**, with tool-call count and model choice as the other two
factors. Which reframes the whole architecture: parallel subagents are, to a
first approximation, *a way to spend more tokens on a problem* — each window
starts fresh, so N agents burn N budgets without any of them paying the
accumulation tax.

Their stated limit: it works for problems that **divide into parallel strands**
and is *less effective for tightly interdependent tasks such as coding*.

### Against: Cognition

**CITED** — Walden Yan (Cognition), *Don't Build Multi-Agents*, 12 June 2025,
<https://cognition.com/blog/dont-build-multi-agents> (fetched 2026-09-15).

Two principles, quoted:

> 1. **"Share context, and share full agent traces, not just individual
>    messages"**
> 2. **"Actions carry implicit decisions, and conflicting decisions carry bad
>    results"**

The worked example is the clearest thing in this argument. Split *"build a
Flappy Bird clone"* across parallel subagents: one builds a **Super Mario Bros.
background**, another builds an inconsistent bird sprite, and the final agent
must combine two incompatible sets of assumptions. Neither subagent could see
the other's decisions, so each made reasonable aesthetic choices that were
mutually wrong.

**The failure is not that the agents were bad. It is that every action encodes a
decision that was never stated**, and two agents cannot agree on a decision
neither of them knows it is making.

Their recommendation in 2025: a single-threaded linear agent, with an LLM-based
compression layer for very long tasks.

### The resolution, and it is the useful part

**CITED** — Walden Yan (Cognition), *Multi-Agents: What's Actually Working*, 22
April 2026, <https://cognition.com/blog/multi-agents-working> (fetched
2026-09-15).

The same author, ten months later, with three patterns that do work — a
code-review loop (a reviewer with fresh context, catching ~2 bugs per PR, 58%
severe), a "smart friend" pattern (a primary model consulting a stronger one
selectively), and manager-child delegation.

And the constraint they all share:

> **The single writer principle: "writes stay single-threaded"** — additional
> agents contribute *intelligence* rather than *actions*. One agent performs the
> modifications; others analyse, suggest, or oversee.

Plus: *"Make sure they see the same sources of information, stay on the same
page (todo list, plan files), and share the same priors about the overall
task."*

**So the disagreement was never about whether to use multiple agents.** It was
about whether they may all *act*. Anthropic's subagents research and report —
they read, they do not write. Cognition's failure case had subagents *building*.
Both positions are the single writer principle, seen from different tasks.

---

## 3 · The anchor: `fanout.ts` states the principle before it was published

```ts
// packages/agent/src/core/fanout.ts:1-9  — VERBATIM
/**
 * Many small agents over many items, then one that reads all of them.
 *
 * ONE AGENT PER ITEM, EACH SEEING ONLY ITS OWN. Then an assembler that sees
 * every result and writes the part no individual agent could — the patterns
 * across items, the shape of the whole, the findings that belong to no single
 * item. That second half is the honest cost of isolation made visible: an agent
 * judging item 6 alone cannot notice that items 6, 11 and 19 all name the same
 * customer.
```

That paragraph is Cognition's objection **and** its answer, in one place: the
per-item agents cannot see each other — that is a real loss — so an assembler
exists specifically to recover what isolation destroyed.

And the single writer principle, arrived at independently and stated as a schema
constraint:

```ts
// packages/agent/src/core/fanout.ts:37-40  — VERBATIM
 *   assemblerSchema    what the assembler returns. It should NOT contain the
 *                      items: an assembler that can rewrite judgements it did
 *                      not make can quietly overrule them, and then the fan-out
 *                      measured nothing.
```

> **"An assembler that can rewrite judgements it did not make can quietly
> overrule them, and then the fan-out measured nothing."**

That is "writes stay single-threaded", enforced by a type rather than by a
convention. The per-item agents write the judgments. The assembler writes *only*
the across-items part. It is not asked to behave — it is given a schema with no
field for the thing it must not do, which is the same defence
[`INJECTION.md`](INJECTION.md) §4 calls layer 2.

### What the package refuses to decide

```ts
// packages/agent/src/core/fanout.ts:11-27  — VERBATIM
 * ══ WHAT THIS PACKAGE REFUSES TO DECIDE ═══════════════════════════════════
 *
 * WHAT A PARTIAL RESULT MEANS.
 *
 * Twenty-three independent calls will not all succeed forever. This reports
 * exactly which items failed and which were never attempted — it does NOT
 * decide whether what is left is usable. In the caller this was extracted from,
 * a work list short of the lots it should contain was a lie of omission about
 * patient exposure; somewhere else it is a rounding error. That is a judgement
 * about YOUR domain and it stays with you.
 *
 * The failure that motivated saying so: a `--limit` flag intended as a cheap
 * first look produced a four-row list under a summary describing all
 * twenty-three, because "skipped" and "failed" were conflated and skipped items
 * were counted as neither. Hence `notAttempted` and `failed` are SEPARATE
 * fields here — one was a choice, the other an error, and they read differently
 * to a human.
```

**This is the operational finding nobody writes down.** N parallel calls will
not all succeed, so every fan-out has three outcomes per item, not two:

```
   succeeded      you have a result
   failed         you tried and it broke          ← an ERROR
   notAttempted   you never tried                 ← a CHOICE
```

Conflating the last two produced *a four-row list under a summary describing all
twenty-three*. The summary was not wrong about the four; it was wrong about the
nineteen it did not mention. And the domain decides whether that matters — *"a
lie of omission about patient exposure"* in one place, a rounding error in
another — which is why the package reports the distinction and refuses to
interpret it.

### Concurrency is a constraint, not a knob

```ts
// packages/agent/src/core/fanout.ts:44-48  — VERBATIM
 * ══ CONCURRENCY IS A CONSTRAINT, NOT A TUNING KNOB ════════════════════════
 *
 * The default is deliberately small. Firing every item at once is the fastest
 * way to meet a provider rate limit, and a rate-limited run records as a
 * quality failure unless something separates them.
```

`DEFAULT_FANOUT_CONCURRENCY = 4`. And the reason is a measurement-integrity
argument, not a politeness one: **a rate-limited run records as a quality
failure unless something separates them.** Your eval says the answer was bad;
the truth is the request was throttled. That is the 429 finding from
[`../rag/AGENTIC.md`](../rag/AGENTIC.md) §5 showing up again one level out.

---

## 4 · The measurement: fan-out is *cheaper per turn*, by a lot

**MEASURED HERE** — `logs/requests.jsonl`, 16 rows where the engine carries
`+fanout`.

```bash
node -e "const r=require('fs').readFileSync('logs/requests.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(x=>String(x.engine).includes('fanout'));console.log(r.length+' fan-out runs');console.table(r.map(({surface,engine,turns,toolCalls,inputTokens,ms})=>({surface,engine,turns,toolCalls,inputTokens,ms})))"
```

| | turns | median input tokens | **per turn** |
|---|---|---|---|
| **fan-out** (24 turns, n=5) | 24 | 34,533 | **1,439** |
| **single loop** (12 turns, n=7) | 12 | 136,174 | **11,348** |

**Twice the turns. A quarter of the tokens. Per turn, a 7.9× difference.**

The reason is the whole argument for this architecture, and it is the same
mechanism [`CONTEXT.md`](CONTEXT.md) describes from the other side: a single loop
re-sends its entire growing history every turn, so turn 12 pays for turns 1–11
again. **A fan-out turn belongs to an agent that started fresh with a small
brief and will never see turn 2.** Nothing accumulates.

So Anthropic's "15× the tokens" and this repo's "a quarter of the tokens" are
both true and not in conflict: Anthropic's subagents *do more work* (more
searches, deeper exploration), while each unit of that work is cheap. Fan-out
does not save money by doing less. **It removes the accumulation tax, and then
you decide how much of the saving to spend on more work.**

### And every fan-out agent made zero tool calls

```
fan-out tool calls across all 16 runs: [ 0 ]
```

Not one. Because of this, from the spec:

```ts
// packages/agent/src/core/fanout.ts:78-79  — VERBATIM
  /** Tools for the per-item agents. Usually none — the brief carries the facts. */
  itemTools?: ToolRegistry;
```

> **Isolation here is enforced by what an agent is *given*, not by what it is
> *allowed*.** A per-item agent has no tools, so it cannot reach another item's
> data — not because a permission check denies it, but because there is no
> mechanism. That is the strongest form of the capability argument in
> [`CREDENTIALS.md`](CREDENTIALS.md) §4, and it costs nothing.

The assembler is the exception and the spec says so: *"Often retrieval, so it can
ground what it states."* The one agent that writes across items is the one
allowed to look things up.

---

## 5 · Code

### The fan-out, as a spec you fill in

```ts
// ASSEMBLED — the shape @fde/agent implements. The REAL thing is
// packages/agent/src/core/fanout.ts; this is its contract with the noise off.
export interface FanoutSpec<Item, ItemOut, Assembled> {
  items: Item[];
  notAttempted?: Item[];          // §3 — a CHOICE, kept separate from a failure
  idOf: (item: Item) => string;

  // "The most important function you will write" — fanout.ts's own words.
  // "The evidence never reached the prompt" is a failure that looks exactly
  // like bad reasoning, and it is diagnosed here or not at all.
  briefFor: (item: Item) => string;
  itemSystem: string;
  itemSchema: ZodType;

  assemblerBrief: (results: ItemOut[], failedIds: string[], notAttemptedIds: string[]) => string;
  assemblerSystem: string;
  // MUST NOT contain the items. See §3.
  assemblerSchema: ZodType;

  itemTools?: ToolRegistry;       // usually none. The brief carries the facts.
  assemblerTools?: ToolRegistry;  // often retrieval, so it can ground claims.
  concurrency?: number;           // 4. A constraint, not a knob.
}
```

### The three-outcome result

```ts
// ASSEMBLED — the return type is where the §3 lesson lives.
export interface FanoutResult<ItemOut, Assembled> {
  succeeded: Array<{ id: string; value: ItemOut }>;
  /** Tried and broke. `error` carries WHY — usually a rate limit, which is a
   *  fact about quota rather than about their data and reads completely
   *  differently to somebody watching their money being spent. */
  failed: Array<{ id: string; error: string }>;
  /** Never tried. A --limit, a filter, a budget. NOT a failure. */
  notAttempted: string[];
  assembled: Assembled | null;
}

// AND THE RULE THE PACKAGE WILL NOT WRITE FOR YOU:
//   is `succeeded.length < items.length` acceptable?
// That is a domain judgement. In pharma it was a lie of omission about patient
// exposure. Somewhere else it is a rounding error.
```

### A review loop — Cognition's 2026 pattern, in this repo's idiom

```ts
// ASSEMBLED. The single writer principle: the reviewer has NO write tool and
// NO ability to change the answer. It returns findings. A human or the writer
// acts on them.
async function reviewLoop(question: string) {
  const answer = await runLoop({ system: WRITER_SYSTEM, question, registry: fullTools, schema: AnswerSchema });

  const review = await runLoop({
    system: REVIEWER_SYSTEM,
    // FRESH CONTEXT IS THE ENTIRE MECHANISM. A reviewer that saw the writer's
    // reasoning inherits the writer's blind spots and will agree with them —
    // it is not a second opinion, it is the same opinion asked twice.
    question: `Review this answer against the sources it cites.\n\n${JSON.stringify(answer)}`,
    registry: readOnlyTools,
    schema: ReviewSchema,        // { findings: [...] } — no field can carry a rewrite
  });

  return { answer, review, agreed: review.findings.length === 0 };
}
```

### What NOT to build

```ts
// ── DO NOT ────────────────────────────────────────────────────────────────
// Two agents that both write, coordinating by passing messages.
//
//   const [ui, api] = await Promise.all([
//     agent('build the UI for the settings page'),
//     agent('build the API for the settings page'),
//   ]);
//
// This is the Flappy Bird failure (§2). Each will make reasonable, unstated
// decisions — a field name, a date format, an error shape — and neither can
// see the other's. The failure surfaces at integration, looks like a bug, and
// is actually two correct answers to two different questions.
//
// If the work genuinely must split, ONE agent decides the interface FIRST and
// both are given it as a fact in their brief. That is `briefFor`, and it is
// why fanout.ts calls it the most important function you will write.
```

---

## 6 · When NOT to use it

| | |
|---|---|
| **The items are not independent.** | Anthropic's own limit: it works for *"problems that can be divided into parallel strands"* and is worse for *"tightly interdependent tasks such as coding"*. If item 6 needs item 3's answer, this is a pipeline, not a fan-out. |
| **More than one agent would write.** | The single writer principle. Additional agents contribute intelligence, not actions. |
| **You have fewer than ~10 items.** | The assembler is a second model call and the orchestration is real code. At five items a single loop with a longer prompt is simpler and probably cheaper. |
| **You cannot say what a partial result means.** | §3. Decide before you run, not when nineteen of twenty-three are missing and somebody is asking. |
| **The reviewer will see the writer's reasoning.** | Then it is not a second opinion. Fresh context is the mechanism; without it you have paid twice for one opinion. |

---

## 7 · Figure data for the UI

> `detail` → `note`. `Matrix` has exactly three states.

```jsonc
// FIG-ORC-1 · <Stages> — illustration. Fan-out and assemble.
[ { "verb": "split",    "out": "N items",                    "does": "the customer's own units — 24 requirements, 220 reports", "rule": "if they are not independent, stop: this is a pipeline" },
  { "verb": "brief",    "out": "one prompt per item",        "does": "briefFor() — the most important function you will write", "rule": "'the evidence never reached the prompt' looks exactly like bad reasoning" },
  { "verb": "fan out",  "out": "N judgements",               "does": "concurrency 4. NO TOOLS — the brief carries the facts.", "rule": "isolation by what they are GIVEN, not what they are allowed" },
  { "verb": "assemble", "out": "the across-items part only", "does": "one agent reads all N", "rule": "its schema MUST NOT contain the items — it may not rewrite what it did not judge" } ]

// FIG-ORC-2 · <BarRows> — MEASURED HERE. THE HEADLINE. Producer in §4.
// UI: the label must make clear the fan-out has MORE turns and FEWER tokens.
[ { "label": "single loop, 12 turns", "value": 11348, "display": "11,348/turn", "note": "median 136,174 total — every turn re-sends the whole history" },
  { "label": "fan-out, 24 turns",     "value": 1439,  "display": "1,439/turn",  "note": "median 34,533 total — nothing accumulates; each agent starts fresh" } ]

// FIG-ORC-3 · <Matrix> — the published disagreement and where this repo sits.
// marks: live="yes" · wired="conditionally" · refuses="no"
// columns: Anthropic 2025 | Cognition 2025 | Cognition 2026 | here
[ { "row": "subagents may READ in parallel",  "cells": ["live","wired","live","live"],       "detail": "nobody actually disputes this" },
  { "row": "subagents may WRITE in parallel", "cells": ["refuses","refuses","refuses","refuses"], "detail": "THE SINGLE WRITER PRINCIPLE — unanimous" },
  { "row": "subagents share full traces",     "cells": ["refuses","live","live","refuses"],  "detail": "the one real disagreement left" },
  { "row": "an assembler writes across items","cells": ["live","refuses","live","live"],     "detail": "fanout.ts calls this the honest cost of isolation, made visible" } ]

// FIG-ORC-4 · <BarRows> — CITED, Anthropic. The cost of the orchestrator-worker shape.
[ { "label": "single-agent chat",          "value": 1,  "display": "1×",    "note": "baseline" },
  { "label": "multi-agent research system","value": 15, "display": "≈15×",  "note": "and it beat single-agent Opus 4 by 90.2% on their internal research eval" } ]

// FIG-ORC-5 · <Funnel> — MEASURED HERE. The three outcomes, and the bug that named them.
[ { "n": 23, "label": "items in the bid",        "op": "the list", "why": "what assess-all prints for free" },
  { "n": 4,  "label": "returned by --limit",     "op": "a CHOICE", "why": "notAttempted — NOT a failure" },
  { "n": 4,  "label": "described by the summary","why": "the summary said twenty-three. It was not wrong about the four; it was wrong about the nineteen it never mentioned." } ]
```

---

## 8 · Run it

| command | what it does | cost |
|---|---|---|
| `pnpm steering:assess-all` | the whole 24-requirement work list | **free** — spends nothing |
| `pnpm steering:assess-all --run --limit 1` | one requirement, for real | ~2 cents |
| `pnpm steering:summarise` | the assembler, across finished assessments | a model call |
| `pnpm pharma:fanout` | the pharma fan-out | model calls |
| `pnpm pharma:fanout-check` | asserts the fan-out's own contract | free |
| `pnpm pharma:debate` | the debate pattern | model calls |

---

## Sources

- Anthropic, *How we built our multi-agent research system* — <https://www.anthropic.com/engineering/built-multi-agent-research-system>
- Yan (Cognition), *Don't Build Multi-Agents*, 12 Jun 2025 — <https://cognition.com/blog/dont-build-multi-agents>
- Yan (Cognition), *Multi-Agents: What's Actually Working*, 22 Apr 2026 — <https://cognition.com/blog/multi-agents-working>
- Singh et al., *Agentic RAG: A Survey*, arXiv:2501.09136 — <https://arxiv.org/abs/2501.09136>

In-repo: `packages/agent/src/core/fanout.ts` · `logs/requests.jsonl` ·
`apps/ai/steering/src/cli/assess-all.ts` · `docs/rag/AGENTIC.md`
