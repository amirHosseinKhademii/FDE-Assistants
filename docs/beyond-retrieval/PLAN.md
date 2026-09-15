# Why these five, in this order, with these marks

*Written 2026-09-15 alongside the documents. Design intent — read this when a
decision in one of the five looks arbitrary. [`README.md`](README.md) is the
index; [`NEXT.md`](NEXT.md) is the work queue.*

---

## 1 · Four topics became five documents

Byron named four: **context engineering, prompt injection / credentials,
multi-agent orchestration, LoRA fine-tuning.**

The second is two documents here, and the split is deliberate:

| | the failure | the anchor |
|---|---|---|
| [`INJECTION.md`](INJECTION.md) | untrusted **content** — text the model reads can change what it does | `apps/ai/pharma/src/guard/injection-selftest.ts` |
| [`CREDENTIALS.md`](CREDENTIALS.md) | untrusted **access** — who may call, what the model may reach, what leaves on the way out | `packages/guard/`, `packages/providers/foundry/` |

They are related — both are the trust boundary — and they have nothing in common
mechanically. One is defended by a schema with no field for the dangerous
outcome. The other is defended by a function that refuses to serve when a
variable is unset. Each has a document's worth of verbatim material, and
compressing them into one would have meant cutting the half that had less code.

Five also lands on the `/learn` ramp's five stops exactly, the same as the RAG
track — but that is a convenience, not the reason.

---

## 2 · The order

**Ascending commitment**, which is also a sensible reading order:

```
  1 context        what you put in the window        free, reversible
  2 injection      what somebody else puts in it     a schema
  3 credentials    who may put anything in it        a boundary
  4 orchestration  how many windows there are        an architecture
  5 finetuning     change the model instead          a model you now own
```

Each step costs more and undoes less than the one before. `FINETUNING.md` §1
states that ladder explicitly and argues most problems belong on the first two
rungs — which is the honest summary of the whole folder.

Genuine dependencies:

- all five assume [`../RETRIEVAL.md`](../RETRIEVAL.md) and
  [`../rag/AGENTIC.md`](../rag/AGENTIC.md);
- `CREDENTIALS.md` needs `INJECTION.md` — its §4 is the third leg of the lethal
  trifecta, named there;
- nothing else needs anything else here.

Three read cold, and `NEXT.md` §2 makes `needs:` say so rather than implying a
spine that is not there.

---

## 3 · The overlap problem, and how it was handled

Four of these five shadow something that already exists. Left alone, that
produces two documents describing one thing, which is how numbers diverge — the
failure `/learn/drift` is about.

So each document opens with an **extends-does-not-restate** block naming what it
defers to:

| document | defers to | keeps |
|---|---|---|
| `CONTEXT.md` | `AUGMENTED-GENERATION.md` (what is assembled) · `/learn/cost` (what it costs) · `/learn/caching` (whether to cache, answer: no) · `rag/AGENTIC.md` §5 (superlinearity) | **what happens to information once it is in the window** — position, degradation, and the retry-sentence lesson |
| `INJECTION.md` | `SECURITY-REVIEW.md` (a dated scan) · `/learn/residency` | the threat model and the four planted attacks |
| `CREDENTIALS.md` | `/learn/residency` (what leaves) · `INJECTION.md` (untrusted content) | the four boundaries and the fail-open failure |
| `ORCHESTRATION.md` | `rag/AGENTIC.md` §7 (the taxonomy row) · `CONTEXT.md` §5 | **that row, opened up** — plus the measurement |

`FINETUNING.md` shadows nothing, which is why it is the one document here with
no overlap paragraph.

**One figure is deliberately duplicated and marked as such**: the
turns-versus-tokens table appears in `rag/AGENTIC.md` as FIG-AGT-6 and in
`CONTEXT.md` as FIG-CTX-2. `NEXT.md` §5 tells the UI session to draw it **once**
and link across, because the FIG-HYB-2 lesson was that redrawing one
measurement in two places creates two things that can disagree.

---

## 4 · Every document has a repo anchor, including the one that should not

| | anchor | kind |
|---|---|---|
| context | `settle.ts` — a retry sentence is a prompt, and three copies is a measurement bug · `usage.ts` | **verbatim** |
| injection | `injection-selftest.ts` — four planted attacks, **two undefended** | **verbatim** |
| credentials | `guard.ts` · `public-error.ts` · `foundry/client.ts` | **verbatim** |
| orchestration | `fanout.ts` · 16 rows of telemetry | **verbatim + measured** |
| finetuning | `rerank.ts` · the cross-encoder's measured domain mismatch | **verbatim + measured** |

**`FINETUNING.md` was expected to be this folder's `GRAPH.md` — cited-only, no
anchor — and it is not.** `docs/steering/evals/RETRIEVAL.md` contains a measured
domain-mismatch study: a web-search cross-encoder scoring this corpus at +7.75
against +8.76 in-domain on prose, and **−0.88 on a terse fielded record that it
nonetheless ranked first.** That is precisely the input a fine-tuning decision
takes, and it produces a specific brief — *the predictor is document shape, not
subject matter* — rather than a general one.

So the weakest document in the folder is the one about the thing that is least
built, and it still has a measured figure. That is better than the RAG set
managed.

---

## 5 · Decisions taken, and what was rejected

**`docs/beyond-retrieval/`, named by a negation.** Mildly weak and the least
consequential choice here. It is accurate, it is a sibling of `docs/rag/`, and
the track title writes itself against "Five ways to retrieve".

**No sixth document.** Evaluation, cost and caching are already the operations
track. Engines are `ENGINES.md`. Residency is `/learn/residency`. Adding any of
them here would be the overlap problem in §3 with no mitigation.

**Code in the language the ecosystem actually uses.** TypeScript throughout,
*except* `FINETUNING.md` §5, which is Python — because `peft`, `bitsandbytes`
and `transformers` are Python and writing a TypeScript LoRA would teach a
fiction. `GRAPH.md` took the opposite decision for Leiden and said so; the rule
is the same rule, applied to a case where the answer differs.

**The gaps are printed.** Two of pharma's four planted attacks are **not**
defended, and a third is defended *by accident* — a length ceiling on a field
doing a safety rule's job. That is on the page, in a figure, because the
file itself records it that way: *"this file asserts that gap rather than
hiding it."*

**The accepted risk is printed too.** `SECURITY-REVIEW.md` finding 1 left five
identifiers in git history on the reasoning that a force-push would not remove
them. `CREDENTIALS.md` §6 keeps that, because **an accepted risk written down
with its reasoning is a stronger posture than a fix that does not work.**

**No `*.generated.ts`.** Same as `docs/rag/`.

---

## 6 · What would make this folder better, in order

1. **Close the two recorded injection gaps, or write down why not.**
   `pharma:injection-check` says a direct instruction to clear a lot and a
   forged authority note both land. The fix is the same shape as the recall
   defence that works: remove the field they land in, or make clearance an enum
   the model cannot write prose into. This is the cheapest real security work
   available here.
2. **Replace the accidental defence with a deliberate one.** The fabricated-rule
   attack is stopped by an `in_short` length ceiling. That will be removed by
   somebody tidying a schema, and nothing will fail. A deliberate check with a
   test is a one-line change that converts luck into a constraint.
3. **Measure the context ordering.** `CONTEXT.md` §7 applies lost-in-the-middle
   to passage layout and says plainly that nobody has tested it here. The
   instrument exists — `pnpm steering:retrieval-eval` — and this is a cheap
   experiment that would move a CITED finding into the MEASURED column.
4. **Count the fan-out rows properly.** 16 runs is enough to show the per-turn
   difference and not enough to characterise it. `pnpm pharma:fanout` costs
   model calls; twenty more runs would turn a ratio into a distribution.

All four are small, all four have their instrument already built, and three of
the four move something from CITED to MEASURED — which is the only direction
this folder should drift.
