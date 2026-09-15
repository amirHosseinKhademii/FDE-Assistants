# The RAG patterns — the index of this folder

*Written 2026-09-15. Five patterns, one per file, each answering a failure the
plain retrieval pipeline has no move against.*

`docs/RETRIEVAL.md` is the pipeline this repo actually runs, end to end. **This
folder is what you reach for when that pipeline is not enough**, and each
document is honest about whether the thing it describes is running here.

---

## Read in this order

Not a dependency chain — a reading order. All five assume
[`../RETRIEVAL.md`](../RETRIEVAL.md) §2–§5 (what a chunk is, what an embedding
is, what hybrid search returns). Only `CORRECTIVE` genuinely leans on another
document in this folder.

| | | the failure it answers | status |
|---|---|---|---|
| 1 | [`HYBRID.md`](HYBRID.md) | the rare word the embedding cannot see | **BUILT · MEASURED** |
| 2 | [`CORRECTIVE.md`](CORRECTIVE.md) | retrieval came back wrong and said nothing | shape built · CRAG cited |
| 3 | [`AGENTIC.md`](AGENTIC.md) | one search was not enough, and the user's words were not the corpus's | **BUILT · MEASURED** |
| 4 | [`GRAPH.md`](GRAPH.md) | the answer is in no passage at all | **not built · cited** |
| 5 | [`MULTIMODAL.md`](MULTIMODAL.md) | the meaning was in the layout, and loading threw it away | **not built · cited** |

## The other two files

| | |
|---|---|
| [`PLAN.md`](PLAN.md) | why these five, why this order, and the three-mark honesty rule every document follows. Read it if a decision in one of the five looks arbitrary. |
| [`NEXT.md`](NEXT.md) | the work queue — the brief for the `/learn` pages that read these documents. Exact `LESSONS` entries, route filenames, chart assignments, the checks. |

---

## Every claim carries one of three marks

Because two of these five documents describe things this repo has never run, and
a reader must never have to guess which.

| mark | means | how to check it |
|---|---|---|
| **MEASURED HERE** | a number a command in this repo printed | the `Run it` table at the foot of each document gives the command |
| **CITED** | a real measurement, by someone else | author, paper, URL and the date fetched, inline |
| **PROPOSED** | an argument with no number behind it | says so |

Research date is **2026-09-15** throughout. A CITED number is true as of the
date it was fetched and not thereafter — the LazyGraphRAG result in
[`GRAPH.md`](GRAPH.md) §3 exists precisely because a headline number from
eighteen months earlier stopped being the right way to build the thing.

---

## What is measured here, in one table

The five documents between them contain exactly these repo-produced numbers.
Everything else is cited or argued.

| | number | producer |
|---|---|---|
| hybrid search, baseline | recall@6 **0.813**, MRR 0.692 | `pnpm steering:retrieval-eval` |
| + cross-encoder rerank | recall@6 **0.938**, MRR 0.875 | `pnpm steering:retrieval-eval --both` |
| the reranker's honest cost | `ret-008` rr 1.00 → **0.50** | as above |
| RRF discards single-arm hits | `1/61 = 0.0164` loses to `2/110 = 0.0182` | arithmetic, from the ranks that command prints |
| the status gate is load-bearing | superseded **0.654** vs live **0.518** | `docs/ROADMAP.md`, hand-verified against the index |
| tool calls per loop | mode **2**, tail to **11**, 13.8% ≥ 6 | `logs/requests.jsonl`, 893 runs — one-liner in `AGENTIC.md` §2 |
| tokens are superlinear in turns | 3× turns → **5.8×** tokens | as above |
| the same question is not the same cost | 27,023 – 136,174 input tokens, 12 runs | as above |
| routing well vs badly | 6 calls / 43k vs 11 calls / 122k | traced 2026-09-11, `hybrid.ts` header |
| what text-only loading loses | **552 of 3,854** passages unlabelled | `docs/steering/evals/RETRIEVAL.md` |

---

## Related, elsewhere

| | |
|---|---|
| [`../RETRIEVAL.md`](../RETRIEVAL.md) | the pipeline this repo runs. **These documents extend it; they do not restate it.** |
| [`../AUGMENTED-GENERATION.md`](../AUGMENTED-GENERATION.md) | what reaches the model and what the answer contract forces back — the G that every R here feeds |
| [`../ENGINES.md`](../ENGINES.md) | the three loop engines behind `AGENTIC.md`'s `while` |
| [`../steering/evals/RETRIEVAL.md`](../steering/evals/RETRIEVAL.md) | the only measured retrieval evaluation in the repo. Most of `HYBRID.md`'s numbers are its. |

---

## Rules this folder follows

1. **This is not a corpus.** `docs/pharma/corpus/` and `docs/steering/corpus/`
   are ingested; `docs/rag/` is not, and no loader globs `docs/**`. Checked
   2026-09-15 — but check again before moving anything, because the last time a
   meta-document landed near a corpus directory, 75 chunks became 80.
2. **Names mean what they mean elsewhere.** `README.md` indexes the folder,
   `PLAN.md` is design intent, `NEXT.md` is the work queue. The five pattern
   files are named for the pattern, in caps, like every other reference document
   in `docs/`.
3. **No `*.generated.ts`.** Nothing here has a gate behind it the way
   `architecture.generated.ts` has `pnpm arch:check`. A generated file for
   secondhand figures borrows authority it has not got.
