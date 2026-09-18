# Beyond retrieval — the index of this folder

*Written 2026-09-15. **Six** things that are not retrieval, each answering a
problem that remains after the passage has been found. ([`MCP.md`](MCP.md) was
added 2026-09-18 and took position 4 — see the note under the table.)*

[`../rag/`](../rag/) is five ways to **find the right text**. This folder is
what is left once you have it: what you put in the window, who is allowed to put
things there, how the tools reach it, how many agents are doing it, and whether
to change the model instead.

---

## Read in this order

Not a dependency chain — a reading order. All six assume
[`../RETRIEVAL.md`](../RETRIEVAL.md) and [`../rag/AGENTIC.md`](../rag/AGENTIC.md)
(retrieval as a tool, the loop, the turn cap). Two now lean on another document
in this folder: `CREDENTIALS.md` genuinely did already, and `MCP.md` is downstream
of it.

| | | the problem it answers | status |
|---|---|---|---|
| 1 | [`CONTEXT.md`](CONTEXT.md) | the window is read unevenly and degrades as it fills | **BUILT · MEASURED** |
| 2 | [`INJECTION.md`](INJECTION.md) | the model cannot tell your instructions from its input | **BUILT · gaps recorded** |
| 3 | [`CREDENTIALS.md`](CREDENTIALS.md) | the convenient implementation of every boundary fails open | **BUILT · REVIEWED** |
| 4 | [`MCP.md`](MCP.md) | the tool belongs to somebody else, so it needs a wire and a boundary | **not built · MEASURED off the SDK** |
| 5 | [`ORCHESTRATION.md`](ORCHESTRATION.md) | one agent, one window, is not always the shape | **BUILT · MEASURED** |
| 6 | [`FINETUNING.md`](FINETUNING.md) | when to change the weights instead of the words | **not built · cited** |

> **Why `MCP.md` is 4 and not 6.** The ladder is a ladder of commitment, and
> MCP's rung is *"the boundary is now real"* — which only means anything after
> `CREDENTIALS.md` has established that the convenient version of every boundary
> fails open. It sits before `ORCHESTRATION.md` because a second agent is a
> bigger commitment than a second process. Its status line is unusual on purpose:
> nothing here runs it, but its protocol claims were read off
> `@modelcontextprotocol/{core,server}@2.0.0` in this workspace's `node_modules`
> rather than recalled, and each one names the file it came from.
> [`../commerce/PLAN.md`](../commerce/PLAN.md) is the engagement that would move
> it to **BUILT**.

## The other two files

| | |
|---|---|
| [`PLAN.md`](PLAN.md) | why these five, why this order, why four topics became five documents. **Written before `MCP.md` existed — it argues a five-document folder and has not been revised.** |
| [`NEXT.md`](NEXT.md) | the work queue — the brief for the `/learn` pages, with the chart signatures already verified. |

---

## Every claim carries one of three marks

The same scheme as [`../rag/`](../rag/README.md), for the same reason: two of
these six documents describe something this repo has never run.

| mark | means | how to check it |
|---|---|---|
| **MEASURED HERE** | a number a command in this repo printed | the `Run it` table at the foot of each document |
| **CITED** | a real measurement, by someone else | author, paper, URL, fetch date, inline |
| **PROPOSED** | an argument with no number | says so |

Research date **2026-09-15** throughout.

---

## What is measured here, in one table

| | number | producer |
|---|---|---|
| tokens are superlinear in turns | 3 turns → 14,094 · 12 turns → 136,174 | `logs/requests.jsonl`, one-liner in [`../rag/AGENTIC.md`](../rag/AGENTIC.md) §2 |
| **fan-out is cheaper per turn** | 1,439/turn against 11,348/turn — **7.9×** | `logs/requests.jsonl`, one-liner in [`ORCHESTRATION.md`](ORCHESTRATION.md) §4 |
| fan-out agents make no tool calls | `[ 0 ]` across all 16 runs | as above |
| the injection surface, by engagement | 2 of 3 trifecta legs in pharma, 1 of 3 elsewhere | inspection of the tool registries |
| planted attacks stopped | **2 of 4 — and one of those by accident** | `pnpm pharma:injection-check` |
| guard denials | 6 branches, 4 of them denials | `pnpm guard:check` |
| a real security scan of this repo | 8 findings; 1 accepted rather than fixed | `docs/SECURITY-REVIEW.md` |
| the reranker's domain mismatch | +8.76 in-domain · **+7.75** this corpus prose · **−0.88** fielded | `pnpm steering:retrieval-eval` |

---

## Related, elsewhere

| | |
|---|---|
| [`../rag/`](../rag/) | five ways to retrieve. This folder starts where that one stops. |
| [`../AUGMENTED-GENERATION.md`](../AUGMENTED-GENERATION.md) | what is assembled into the window, and the answer contract |
| [`../ENGINES.md`](../ENGINES.md) | the three loop engines and the two clouds |
| [`../SECURITY-REVIEW.md`](../SECURITY-REVIEW.md) | a dated scan. Re-run it; do not cite it as current. |
| [`../steering/DATA-RESIDENCY.md`](../steering/DATA-RESIDENCY.md) | what leaves the building, and how each claim is known |

---

## Rules this folder follows

1. **This is not a corpus.** No loader globs `docs/**`; the corpus dirs are
   `docs/pharma/corpus/` and `docs/steering/corpus/`. Checked 2026-09-15.
2. **Names mean what they mean elsewhere.** `README.md` indexes, `PLAN.md` is
   design intent, `NEXT.md` is the work queue.
3. **No `*.generated.ts`.** Nothing here has a gate behind it the way
   `architecture.generated.ts` has `pnpm arch:check`.
4. **Every `VERBATIM` block was diffed against its source**, and the line ranges
   were computed from the content rather than typed. 16 of 16 clean at commit
   `78a8167`. Re-check before pasting — a line number is exactly the kind of
   fact that goes stale silently.
