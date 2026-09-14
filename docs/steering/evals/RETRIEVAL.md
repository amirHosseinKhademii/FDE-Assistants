# Retrieval, measured — and what a reranker bought

*Built and run 2026-09-14. This is steering's answer to the row in
[`../../RETRIEVAL.md`](../../RETRIEVAL.md) §9 that read **"There is no reranker,
and no measurement saying one would help. Its absence is a gap named, not a
decision defended."** Both halves are now closed, and the second half could only
be closed after the first.*

---

## The number

```
  arm        cases  recall@6   MRR
  baseline    6/8   0.813     0.692      hybridSearch, exactly as the tool calls it
  reranked    7/8   0.938     0.875      + cross-encoder over a 50-candidate pool

  the reranker bought +12.5 points of recall@6 and +18.3 points of MRR
```

8 cases over 922 documents and 3,854 passages. `Xenova/ms-marco-MiniLM-L-6-v2`,
local, CPU, in-process. 400 passages re-scored in **15.8 s** — about 2 s of added
latency per question.

```bash
pnpm steering:retrieval-scorer-check     # free, offline: does the SCORER work
pnpm steering:retrieval-eval             # the baseline. costs ~100 embedding tokens
pnpm steering:retrieval-eval --both      # both arms, and the delta above
pnpm steering:retrieval-eval --both --save
pnpm steering:retrieval-eval --show-labels closure-reports   # free, for writing cases
```

## Why the baseline had to come first

`docs/PROGRESS.md` states the rule this repo is written under: *"Adding a
reranker now is guessing it helps; adding it after gives you 'the reranker
bought 7 points.'"* Steering had no retrieval measurement of any kind — the
existing `retrieval:check` is five hand-written predicates that pass or fail,
and **a predicate cannot regress by four points.** So the work was a chain, and
the reranker was the last link, not the first:

```
  a label for a steering passage  →  8 cases  →  an offline scorer + its plants
                                             →  the BASELINE number
                                             →  the reranker
                                             →  the delta
```

## What the reranker actually did

**It fixed `ret-007` — and chasing *why* turned up something worth more than the
reranker.** The question — *"was any effort booked to a charge code that also
covers unrelated work?"* — has an answer in exactly one of 220 near-identical
closure reports: `EFF-2021-0443`, which booked a production-line transfer to a
gearbox housing code *"for want of a separate code"*. Its reported hours are
therefore contaminated and a median taken over it is wrong.

Hybrid search ranked it **35th**. The cross-encoder moved it to **1st**. The
first draft of this document explained that as the reranker understanding a
question no keyword could match — which was wrong, and the diagnostic says so:

```
k=6  (depth 24) : target not in the fused top 6
k=50 (depth 200): target at fused position 35
                  denseRank = —     sparseRank = 1     foundBy: keywords
```

**The keyword arm ranked it FIRST.** The dense arm never returned it at all. RRF
then buried it, and the arithmetic is not close — see below. So this case does
not show that retrieval could not find the document. It shows the **fuser threw
away what only one arm found**, and the reranker happened to undo the damage.

| case | what moved | baseline → reranked |
|---|---|---|
| `ret-007` | the contaminated charge code, **35 → 1** | recall 0.00 → **1.00** |
| `ret-003` | the exact identifier `SR-EPS-0421`, rank 5 → 2 | rr 0.20 → **0.50** |
| `ret-008` | the **stale** design note overtook the test file | rr 1.00 → **0.50** ← a real loss |
| `ret-005` | rank improved, recall did not | rr 0.33 → 1.00, recall stuck at 0.50 |

`ret-008` is printed here rather than buried because it is the honest cost, and
it is a sharper cost than "noise". That case asks where the behaviour of a module
is actually recorded; the answer is the test file, whose own banner says the 2015
design note has gone stale and the tests are the surviving specification. **The
reranker promoted the stale design note above the tests.**

That is not tie-breaking between two correct passages — it is a relevance model
preferring the document this corpus specifically marks as out of date. Relevance
and currency are different questions, a cross-encoder can only see the first, and
this is the same shape as insurance's form-revision trap. It is a better argument
for leaving the stage off than the latency is.

## The case the reranker could NOT fix, and why that is the useful part

`ret-005` asks whether the damping software already meets the safety level K2
requires. Answering it needs **two** passages from two repositories — K2 requires
ASIL D, the 2021 assessment classified the component at ASIL B — and neither one
alone says anything is wrong.

The reranker moved the requirement to rank 1 and still scored 0.50, because the
runner prints the thing that explains it:

```
ceiling: only 50% of the expected labels were in the top-50 pool at all
         — a reranker cannot fix that
```

**A reranker cannot retrieve.** It reorders what it was handed, so recall@k
afterwards is bounded above by recall@pool before it. The assessment section is
not in the top 50 at all, which makes `ret-005` a *retrieval* problem — chunking,
or query rewriting, or a second search — and not a ranking one. Without that
line, the obvious next move would be to raise the pool from 50 to 200 and spend
four times the latency discovering it changes nothing.

## The finding underneath the finding: RRF discards single-arm hits

`RRF_K = 60`, and a document's fused score is `Σ 1 / (60 + rank)` over the arms
that found it. Put numbers on that:

| what the arms said | fused score |
|---|---|
| keyword arm ranks it **1st**, dense arm never returns it | 1/61 = **0.0164** |
| **both** arms rank it **50th** | 2/110 = **0.0182** |

**A document both arms rank fiftieth outranks a document the keyword arm ranks
first.** Corroboration by a second arm is worth more than being the single best
match in either — which is RRF working as designed, and is usually what you want,
because agreement is evidence.

It is not what you want when the two arms are good at different things, which is
the entire reason `hybrid.ts` exists. Its own header says so: *"a rare legal term
has few neighbours in embedding space, so 'livery' retrieves nothing closer than
general prose."*

**Two of the eight cases hit this, and they are the two that need the keyword
arm** — `retrieval:eval --rerank` prints the diagnostic on both:

```
ret-003   wanted: fused 27/50   dense=—  sparse=3   found by keywords
ret-007   wanted: fused 35/50   dense=—  sparse=1   found by keywords
```

`ret-003` is the query `SR-EPS-0421` — a bare identifier, written into this suite
as *"the case only the KEYWORD arm can win"*, because embeddings cannot separate
`SR-EPS-0421` from `SR-EPS-0407`. The keyword arm won it, at rank 3. The fuser
put it 27th. In both cases the answer is lexically distinctive and semantically
unremarkable, the dense arm contributed nothing, and **fusion read the dense
arm's silence as a vote against**.

**This is not a steering problem.** `hybridSearch` is `@fde/grounding`, so
insurance and pharma fuse the same way, and neither has a retrieval suite that
could see it. Nothing has been changed about the fuser here — it is recorded,
with a number, because that is the thing this suite was built to make possible.
Candidates worth measuring if it is picked up: a floor that keeps each arm's top
few regardless of the other, or a lower `K` (which sharpens the top of each list
relative to the corroboration bonus). Both are guesses until this suite scores
them, which is the same rule the reranker was held to.

---

## What this does NOT prove

| | |
|---|---|
| **Eight cases cannot say a retriever is good.** | They can say it got worse, which is the job. This is a regression instrument, not a benchmark. |
| **The cross-encoder is a web-search model reading automotive engineering documents.** | Measured on the real indexed passages rather than assumed: it scores `ret-001`'s correct passage at **+7.75**, against **+8.76** for an MS MARCO pair it was actually trained on — it transfers to prose-shaped documents better than "out of domain" suggests. It scores `ret-007`'s correct passage at **−0.88**, and *still ranked it first*, because ranking depends on relative and not absolute scores. The pattern to watch is document SHAPE, not subject matter: terse fielded records (`Charge code: 1002`) score far below prose, and this corpus has 220 of them. An earlier draft of this row claimed −9.3 and "scores near the floor" — that number came from a paraphrase written by hand, not from the corpus, and was wrong. |
| **One run, not five.** | Deliberate, and the opposite of `steering:eval`'s five repeats. Every stage here is deterministic — a fixed index, deterministic embeddings, RRF over ranks, an fp32 CPU cross-encoder — so a repeat count would measure nothing and cost money. Three runs produced **identical summary numbers**; the per-case orderings were not diffed line by line, so "identical" here means the table, not the bytes. |
| **`reject` is set on no case.** | Pharma's discipline, followed on purpose: a rejection written before anybody has seen what the retriever returns is this repo's three-times-repeated mistake with extra steps. Run it, read `got:`, then tighten. |
| **The reranker is OFF by default.** | `RERANK=local` turns it on. +12.5 points against ~2 s per question is a decision for whoever owns the latency budget, and shipping it silently on the grounds that it is usually an improvement is how a pipeline acquires parts nobody can account for. |

## The label, which is the only part that could not be borrowed

`@fde/evals` owns the arithmetic — recall@k, MRR, the pass rule. What steering
had to supply is `labelOf`: **what a retrieved passage is called.**

Pharma labels by revision and clause (`SOP-QC-014 Rev 7 §7.3`), read entirely
out of the heading trail. Copying that here would have been wrong, and the
corpus says so out loud — measured over all 3,854 passages:

| trail shape | passages | |
|---|---|---|
| a real heading trail | 2,835 | `… > 2. Requirements > SR-ALT-08-0181 — …` |
| the document title alone | 467 | |
| **nothing at all** | 293 | every closure report, every MISRA report |
| **a `====` confidentiality banner** | 259 | every CRS |

A trail-only label is `null` for 552 of them — including all 220 closure
reports, which are the documents `find_comparable_work` prices from and the
subject of `ret-007`. And an unlabelled hit still occupies a top-k slot while
being neither a hit nor an intruder, so it is **invisible in a recall number**.

So steering's label is the **path**, refined by the leaf's identifier when the
trail carries one:

```
pmo/closure-reports/EFF-2021-0443.md                              no trail
requirements/PRG-KST-K2/system-requirements-PRG-KST-K2.md §SR-EPS-0421
eps-steering-feel/docs/safety-assessment-2021.md §3
eps-calibration-tools/src/a2l_export.c §A2l_Export()
```

**Null for 0 of 3,854 passages**, 2,828 distinct labels. The path also carries
the confusable pairs for free: twelve programmes state a rack force with
different numbers and live at twelve paths, and `CRS-…_RevA.md` (superseded)
is a different path from `_RevB.md` (in force) — this corpus's equivalent of
pharma's Rev 6 / Rev 7 trap, solved by an identifier that was already there.

## The plants, watched to fire

A checker that has not been seen to go red is not evidence. Both were sabotaged
and observed failing before being restored:

- **the banner trap** — scanning the whole trail instead of its leaf's first line
  pulls `CRS-ALT-08-001` out of a confidentiality notice and calls it a section
  anchor. 259 passages mislabelled, each looking plausible. When planted, it took
  the superseded-revision assertion down with it, because Rev A and Rev B then
  collide on one label — which is exactly the damage it describes.
- **the two-digit clause** — `\d` instead of `\d+` makes §10 unlabelled rather
  than §1, silently merging it with the document preamble.

## Files

| | |
|---|---|
| `retrieval.jsonl` | the 8 cases |
| `retrieval-results/` | saved runs, one JSON each |
| `apps/ai/steering/src/eval/retrieval/retrieval.ts` | `labelOf` — the domain |
| `apps/ai/steering/src/eval/retrieval/retrieval-selftest.ts` | the offline scorer check |
| `apps/ai/steering/src/eval/retrieval/run-retrieval.ts` | the live runner |
| `packages/grounding/src/rerank.ts` | the reranker, domain-neutral |
