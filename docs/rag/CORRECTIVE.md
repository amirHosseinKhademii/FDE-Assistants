# Corrective RAG — grading what came back, before the model is allowed to use it

**Status: THE SHAPE IS BUILT HERE; CRAG PROPER IS NOT.** This repo has gates,
refusals and a no-threshold rule that is a deliberate, reasoned *disagreement*
with the CRAG paper. The paper's own mechanism — a trained evaluator, a web
search fallback, decompose-then-recompose — is cited, not built.

*Research date 2026-09-15. External sources carry a URL and the date fetched.*

---

## 1 · The plain version

Ordinary RAG has a hole in it that is easy to miss because it never announces
itself.

Retrieval always returns something. A vector index asked for the top 6 passages
returns 6 passages — it has no concept of "nothing here is relevant". It returns
the 6 least-bad, and they arrive at the model looking exactly like 6 good ones.
Same shape, same fields, same confident-looking similarity scores.

The model then does what it was told to do: answer from the provided context. If
the context is junk, the answer is junk assembled from junk, and it is *fluent*
junk with citations attached, which is the worst possible failure mode because
it is the one a reviewer is least likely to catch.

Corrective RAG is one idea: **put a grader between retrieval and generation.**
Look at what came back. Decide whether it is good enough. And — this is the part
that makes it "corrective" rather than merely "evaluative" — *do something
different depending on the answer*.

```
         ┌──────────┐     ┌──────────┐     ┌──────────┐
  q ────►│ retrieve │────►│  GRADE   │────►│ generate │────► answer
         └──────────┘     └────┬─────┘     └──────────┘
                               │
                   ┌───────────┼───────────┐
                   ▼           ▼           ▼
                CORRECT    AMBIGUOUS   INCORRECT
                refine     both        throw it away,
                what you                go somewhere
                have                    else
```

---

## 2 · CRAG, precisely

**CITED** — Yan, Gu, Zhu & Ling, *Corrective Retrieval Augmented Generation*,
arXiv:2401.15884, v1 2024-01-29, v3 2024-10-07.
<https://arxiv.org/abs/2401.15884> (fetched 2026-09-15).

### The evaluator

A **T5-large, 0.77B parameters**, fine-tuned to score a (query, document) pair
on a scale from **−1 to +1**. Positive samples came from PopQA's own
question–passage pairs; negatives were *"randomly sampled from the retrieval
results, which are rather similar to the input query but not relevant"* — which
is the interesting part of the training design. The hard negatives are the
retriever's own near-misses, so the evaluator is trained to make exactly the
distinction the retriever cannot.

Note the size. It is deliberately **not** the generator. A 0.77B grader in front
of a 7B generator costs a rounding error and runs locally.

### The three actions

| action | rule | what the generator gets |
|---|---|---|
| **Correct** | at least one document scores above the upper threshold | the retrieved documents, put through knowledge refinement |
| **Incorrect** | *all* documents score below the lower threshold | web search results, replacing the retrieved set entirely |
| **Ambiguous** | anything in between | both — refined internal knowledge *and* external web knowledge |

### The thresholds, and the honest problem with them

They are tuned **per dataset**:

| dataset | upper | lower |
|---|---|---|
| PopQA | 0.59 | −0.99 |
| PubHealth, ARC-Challenge | 0.5 | −0.91 |
| Biography | 0.95 | −0.91 |

An upper threshold of 0.95 on one dataset and 0.5 on another is a 45-point
spread on a 2-point scale. **These are not constants of nature; they are fitted
to a corpus.** Shipping CRAG means either fitting them to yours — which needs
labelled data you probably do not have — or accepting that the action selector
is miscalibrated in an unknown direction. Anyone quoting CRAG's gains should
quote this table beside them.

### Decompose-then-recompose

Applied to whatever survives, and it is the part most worth stealing:

1. **Decompose.** Cut each retrieved document into *strips* — "a few sentences
   according to the total length".
2. **Filter.** Score each strip with the same evaluator. Threshold **−0.5**.
3. **Recompose.** Concatenate the survivors, in their original order.

So a document that is 80% irrelevant contributes only its 20%. This attacks a
real and underrated problem: a retrieved chunk is a *chunk*, sized by the
chunker's convenience, and most of it is usually not the answer. Every
irrelevant sentence in the context window is a sentence the generator has to
ignore.

### The results

Self-CRAG (CRAG applied on top of Self-RAG, LLaMA2-7B):

| dataset | Self-RAG | Self-CRAG | delta |
|---|---|---|---|
| PopQA (accuracy) | 54.9 | **61.8** | +6.9 |
| Biography (FactScore) | 81.2 | **86.2** | +5.0 |
| PubHealth (accuracy) | 72.4 | **74.8** | +2.4 |
| Arc-Challenge (accuracy) | 67.3 | 67.2 | **−0.1** |

Print the last row. ARC-Challenge is multiple-choice science — the knowledge is
in the model's weights, retrieval adds little, and a correction layer on top of a
retrieval step that was not helping cannot help either. **The pattern's gain is
proportional to how much your task actually depends on retrieval**, which is a
better predictor than any of the other three numbers.

---

## 3 · What this repo does instead, and why

This repo has a rule that reads as a direct contradiction of CRAG's central
mechanism. From `CLAUDE.md`:

> Search has **no score cutoff** — it returns top-k even when everything is
> junk. Deciding "the answer isn't in the corpus" (e.g. rideshare coverage,
> which appears in none of the 30 documents) is reading comprehension and
> belongs to the model, not a similarity threshold.

That is not laziness and it is not ignorance of CRAG. It is a different bet, and
the argument is worth having explicitly:

**The case for a threshold (CRAG).** A similarity score is cheap, deterministic,
and available before you spend a generation. Catching junk at 0.77B is
enormously cheaper than catching it at 7B, or not catching it.

**The case against (here).** A similarity score does not measure whether a
passage answers a question. It measures whether a passage is *about the same
topic*. The rideshare question — *"am I covered if I drive for a rideshare
company?"* — retrieves the vehicle-use exclusion clause at a perfectly
respectable similarity, because that clause is genuinely about vehicle use. It
is topically excellent and it does not contain the answer, because the answer is
not in the corpus at all. No threshold separates those two cases, in either
direction. What separates them is *reading the passage*.

Both bets are defensible. The thing to notice is that they fail differently:
CRAG's failure is a threshold miscalibrated for your corpus silently discarding
good retrieval; this repo's failure is spending a generation on junk. The second
is more expensive per incident and much easier to see.

---

## 4 · The correction this repo does make: gates, not thresholds

The repo's actual corrective step is not scored at all. It is **metadata gating
after over-fetch**, and it is in `apps/ai/insurance/src/tools/search-guidance.tool.ts`.

```ts
// apps/ai/insurance/src/tools/search-guidance.tool.ts:132-163  — VERBATIM
    async execute({ query, doc_type, jurisdiction, include_superseded, k }) {
      const want = k ?? 5;

      // OVER-FETCH, THEN GATE. Postgres applies an equality filter on doc_type
      // before ranking, which is the selective one. Status and jurisdiction
      // need OR / inequality semantics the metadata filter cannot express, so
      // they are applied here — and that only works if we ask for more rows
      // than we intend to return. Filtering the top 5 down to 1 would look like
      // a sparse corpus when it is really a narrow gate.
      const filter = doc_type ? { docType: doc_type } : undefined;
      const { hits: fusedHits, fullText } = await hybridSearch(store, query, want * 6, filter, { tableName: DOMAIN.vectorTable });
      const hits = fusedHits.map((h) => [h.doc, 1 - h.score] as [typeof h.doc, number]);
      void fullText;

      const gated = hits
        .filter(([d]) => GUIDANCE_TYPES.includes(String(d.metadata.docType) as never))
        .filter(([d]) => {
          // Jurisdiction is a HARD GATE, not a ranking hint: a Texas circular
          // does not reach an Illinois policy at any similarity score. National
          // documents (null jurisdiction) always apply.
          const j = d.metadata.jurisdiction;
          return !jurisdiction || !j || String(j) === jurisdiction;
        })
        .filter(([d]) => {
          if (include_superseded) return true;
          const st = String(d.metadata.status ?? 'unknown');
          // 'unknown' is ALLOWED through: a document whose status we cannot
          // determine is not thereby dead, and silently dropping it would hide
          // real guidance. Only an explicit retirement excludes it.
          return st !== 'superseded' && st !== 'withdrawn' && st !== 'rescinded';
        })
        .slice(0, want);
```

Four decisions, each of which generalises:

**Over-fetch `want * 6` before gating.** A gate applied to the top 5 turns 5 into
1 and looks like a sparse corpus. A gate applied to the top 30 turns 30 into 5
and looks like a gate. Same code, entirely different diagnosis when it goes
wrong.

**Jurisdiction is a hard gate, not a ranking hint.** A Texas circular does not
reach an Illinois policy *at any similarity score*. There is no score at which
the wrong jurisdiction becomes right, so it must not be expressible as a score.
This is the general form: **some constraints are not preferences, and encoding
them as preferences is a category error that a good enough retriever will
eventually exploit.**

**`'unknown'` passes.** A document whose status cannot be determined is not
thereby dead. Silently dropping it would hide real guidance, so only an
*explicit* retirement excludes it. Compare the parse stage in
`docs/RETRIEVAL.md`: *"A missing value is not evidence of the wrong type."* The
same rule, twice, in two files, arrived at independently.

**The empty result is not empty.**

```ts
// apps/ai/insurance/src/tools/search-guidance.tool.ts:165-176  — VERBATIM
      if (gated.length === 0) {
        return {
          results: [],
          note:
            'No guidance document matched those filters. This does NOT mean no ' +
            'guidance exists — check whether the jurisdiction or doc_type was ' +
            'too narrow, and search again before concluding the corpus is ' +
            'silent. A coverage question may simply have no guidance to find, ' +
            'in which case the policy form governs and search_policy is the ' +
            'right tool.',
        };
      }
```

A tool that returns `[]` has told the model "there is nothing". A tool that
returns `[]` *and an explanation of what `[]` means here* has told it something
useful. This is the cheapest corrective mechanism in the whole document: **when
the gate eats everything, say so, and say what to do next.**

---

## 5 · Why the gate is load-bearing — the number

**MEASURED HERE**, recorded in `docs/ROADMAP.md`:

> the jurisdiction gate returns the Illinois circular for an Illinois policy and
> the New York one for New York, and the status gate is load-bearing — **the
> superseded bulletin outranks its replacement on similarity (0.654 vs 0.518)**,
> so without the gate the stale document wins.

Read that again. The *superseded* bulletin is **more similar to the query** than
the bulletin that replaced it. Not marginally — 0.654 against 0.518.

This is not a fluke of one corpus. It is structural, and the reason is worth
understanding because it generalises to every corpus with revisions:

- A replacement bulletin is usually *broader*. It covers the old case plus new
  ones, so its language is more diffuse and matches any single query less
  tightly.
- A superseded bulletin was written about exactly the situation it was written
  about. It is narrow, specific, and on-topic.
- Nothing in the *text* of either says which is live. That fact is metadata, in
  a banner, or in a third document.

So: **relevance ranking systematically prefers the stale document.** A
similarity threshold cannot fix this — the stale document scores *higher*. A
reranker cannot fix it either; see below.

---

## 6 · The same finding, from the reranker

**MEASURED HERE** — `pnpm steering:retrieval-eval --both`, 2026-09-14,
`docs/steering/evals/RETRIEVAL.md`. Case `ret-008`:

| case | what moved | baseline → reranked |
|---|---|---|
| `ret-008` | the **stale** design note overtook the test file | rr 1.00 → **0.50** |

The question asks where a module's behaviour is actually recorded. The answer is
the test file, whose own banner says the 2015 design note has gone stale and the
tests are the surviving specification. A cross-encoder — a model that reads
question and passage together and emits a relevance number, i.e. the best
relevance signal in the whole pipeline — **promoted the stale design note above
the tests.**

From that document:

> That is not tie-breaking between two correct passages — it is a relevance
> model preferring the document this corpus specifically marks as out of date.
> Relevance and currency are different questions, a cross-encoder can only see
> the first, and this is the same shape as insurance's form-revision trap.

**This is the sharpest thing in this folder, so it gets stated on its own line:**

> **A relevance model cannot see currency. Every corrective mechanism built on a
> relevance score inherits that blindness — including CRAG's evaluator, which is
> a relevance model.**

CRAG's T5 evaluator scores (query, document) relevance. Handed the superseded
bulletin, it would score it *high*, mark the retrieval **Correct**, refine it,
and hand it to the generator with confidence. The correction layer does not
correct this class of error; it certifies it.

The fix is not a better scorer. It is the metadata gate in §4 — a fact about the
document that is checked rather than weighed.

---

## 7 · Code: the pieces, assembled

None of this is running in this repo. It is written against this repo's stack so
it could be.

### A grader with a shape

```ts
// ASSEMBLED — illustrative. Not in this repo.
import { z } from 'zod';

/** A grade is not a number. Reasons make the failure diagnosable. */
const GradeSchema = z.strictObject({
  verdict: z.enum(['answers_it', 'related_only', 'irrelevant'])
    .describe('answers_it: the passage contains the answer, not merely the topic. '
            + 'related_only: same subject, does not answer the question. '
            + 'irrelevant: neither.'),
  why: z.string()
    .describe('One sentence. Quote the phrase that decided it.'),
  /** THE FIELD THAT MATTERS, and the one a similarity score cannot produce. */
  superseded_signal: z.boolean()
    .describe('True if the passage or its banner suggests it has been replaced, '
            + 'withdrawn, or is dated relative to the question. A stale passage '
            + 'is often the MOST relevant one — see CORRECTIVE.md §5.'),
});

export async function gradePassage(question: string, passage: string) {
  const res = await client.responses.parse({
    model: env.GRADER_MODEL,            // small. This is the whole point.
    input: [
      { role: 'system', content:
          'Grade whether the passage answers the question. Being about the same '
        + 'topic is not answering. Say so plainly when it does not.' },
      { role: 'user', content: `Q: ${question}\n\nPASSAGE:\n${passage}` },
    ],
    text: { format: zodTextFormat(GradeSchema, 'grade') },
  });
  return res.output_parsed;
}
```

### The three-action router

```ts
// ASSEMBLED — CRAG's control flow, with this repo's refusal instead of web search.
type Action = 'correct' | 'ambiguous' | 'incorrect';

function decide(grades: Grade[]): Action {
  if (grades.some((g) => g.verdict === 'answers_it')) return 'correct';
  if (grades.every((g) => g.verdict === 'irrelevant')) return 'incorrect';
  return 'ambiguous';
}

export async function correctiveSearch(question: string, k = 6) {
  const { hits } = await hybridSearch(store, question, k * 4);
  const grades = await Promise.all(hits.map((h) => gradePassage(question, h.doc.pageContent)));

  switch (decide(grades)) {
    case 'correct':
      return {
        passages: refine(hits, grades),                 // decompose-then-recompose
        note: 'Graded: at least one passage answers the question.',
      };

    case 'ambiguous':
      return {
        passages: refine(hits, grades),
        // The second search is a REWRITE, not a repeat. Repeating a query that
        // half-worked returns the same half.
        alsoTry: await hybridSearch(store, await rewrite(question, grades), k),
        note: 'Graded: related material only. A second search was run with '
            + 'different words. Treat both sets as incomplete.',
      };

    case 'incorrect':
      // MOST ENTERPRISE DEPLOYMENTS CANNOT DO CRAG'S WEB SEARCH. The customer's
      // corpus is the authority precisely because the open web is not. So the
      // correction is a REFUSAL, which is a real answer.
      return {
        passages: [],
        note: 'Graded: nothing retrieved answers this. Do not answer from the '
            + 'passages. Say what you searched for and escalate.',
      };
  }
}
```

### Decompose-then-recompose

```ts
// ASSEMBLED — CRAG §3.3, minus the trained scorer.
async function refine(hits: Scored[], grades: Grade[]) {
  const kept = hits.filter((_, i) => grades[i].verdict !== 'irrelevant');

  return Promise.all(kept.map(async (h) => {
    // "Strips" — a few sentences each. Sentence-splitting is a rabbit hole;
    // paragraph boundaries are usually good enough and are free.
    const strips = h.doc.pageContent.split(/\n{2,}/).filter((s) => s.trim());
    const scored = await Promise.all(strips.map((s) => gradeStrip(question, s)));

    return {
      ...h,
      // Recompose IN ORDER. Reordering a document's own sentences changes what
      // it says — "X applies. Exception: not if Y." is not the same set of
      // sentences as "Exception: not if Y. X applies."
      pageContent: strips.filter((_, i) => scored[i] > -0.5).join('\n\n'),
    };
  }));
}
```

### And the gate, which costs nothing

```ts
// ASSEMBLED — the generalised form of §4. Runs before any model call.
interface Gate<T> { name: string; keep: (d: T) => boolean; why: string }

export function applyGates<T>(docs: T[], gates: Gate<T>[], want: number) {
  const dropped: Record<string, number> = {};
  const kept = docs.filter((d) =>
    gates.every((g) => {
      const ok = g.keep(d);
      if (!ok) dropped[g.name] = (dropped[g.name] ?? 0) + 1;
      return ok;
    }),
  );
  // RETURN WHAT THE GATES ATE. "0 results" and "0 results, 28 dropped by
  // jurisdiction" are the same value and completely different bug reports.
  return { hits: kept.slice(0, want), dropped };
}
```

---

## 8 · Where corrective RAG sits among the seven failure points

**CITED** — Barnett, Kurniawan, Thudumu, Brannelly & Abdelrazek, *Seven Failure
Points When Engineering a Retrieval Augmented Generation System*, CAIN 2024,
arXiv:2401.05856. <https://arxiv.org/abs/2401.05856> (fetched 2026-09-15). Three
case studies: a research tool, an education tool over 38 documents, and BioASQ
over 4,017 documents with 1,000 QA pairs.

| | failure point | does corrective RAG help? |
|---|---|---|
| FP1 | **Missing content** — the question cannot be answered from the documents | **Yes, and this is its best case.** The only mechanism that detects it. |
| FP2 | **Missed the top-ranked documents** — the answer is there but ranked too low | Partly. Grading a wider pool surfaces it; see [`HYBRID.md`](HYBRID.md) §5 on the pool ceiling. |
| FP3 | **Not in context** — retrieved, but consolidation dropped it | Yes — decompose-then-recompose is exactly a consolidation strategy. |
| FP4 | **Not extracted** — the answer is in the context, the model missed it | No. This is a generation problem. |
| FP5 | **Wrong format** | No. This is the answer contract's job — see `docs/AUGMENTED-GENERATION.md`. |
| FP6 | **Incorrect specificity** — too vague or too narrow | No. |
| FP7 | **Incomplete** — correct but missing information that was in the context | No. |

The paper's two headline takeaways, quoted because they are the argument for
this repo's eval suite existing at all:

> 1) validation of a RAG system is only feasible during operation, and 2) the
> robustness of a RAG system evolves rather than designed in at the start.

---

## 9 · When NOT to use it

| | |
|---|---|
| **Your task does not lean on retrieval.** | ARC-Challenge: −0.1. A correction layer on a retrieval step that was not helping cannot help. |
| **You cannot reach the web, which is most enterprise deployments.** | CRAG's *Incorrect* action is "web search instead". Strip that out and the action collapses to a refusal — still valuable, but it is a different system and should not be sold on CRAG's numbers. |
| **You have no labelled data to fit thresholds.** | §2's table is a 45-point spread across four datasets. An unfitted threshold is a coin flip with a confident interface. |
| **Your corpus has revisions.** | §5 and §6. A relevance-based corrector prefers the stale document. Build the metadata gate *first*; it is cheaper, deterministic, and fixes the failure the grader cannot see. |
| **Latency matters and your grader is not small.** | The point of a 0.77B evaluator is that it is not the generator. Grading 24 passages with the 7B model costs more than the generation you are protecting. |

---

## 10 · Figure data for the UI

```jsonc
// FIG-COR-1 · <Stages> — the corrective loop
[ { "verb": "retrieve", "out": "24 passages",              "does": "over-fetch, because a gate applied to 5 looks like a sparse corpus" },
  { "verb": "gate",     "out": "5 passages + dropped[]",   "does": "facts, not scores: jurisdiction, status, type. Free." },
  { "verb": "grade",    "out": "Grade[] { verdict, why }", "does": "a small model reads each one. 0.77B in CRAG." },
  { "verb": "act",      "out": "correct | ambiguous | incorrect", "does": "refine · refine + re-search · refuse" },
  { "verb": "refine",   "out": "the surviving strips, in order", "does": "an 80%-irrelevant chunk contributes its 20%" } ]

// FIG-COR-2 · <BarRows> — MEASURED HERE. THE POINT IS THAT THE DEAD ONE IS HIGHER.
// UI: the taller bar must read as the WRONG answer. Do not colour by value.
[ { "label": "superseded bulletin", "value": 0.654, "detail": "retired — must not be used" },
  { "label": "its replacement",     "value": 0.518, "detail": "live — the correct answer" } ]

// FIG-COR-3 · <Slope> — CITED, Yan et al. 2024, Self-RAG → Self-CRAG
// UI: ARC-Challenge is a LOSS and is the most informative row. Keep it.
[ { "case": "PopQA",          "before": 54.9, "after": 61.8, "metric": "accuracy" },
  { "case": "Biography",      "before": 81.2, "after": 86.2, "metric": "FactScore" },
  { "case": "PubHealth",      "before": 72.4, "after": 74.8, "metric": "accuracy" },
  { "case": "Arc-Challenge",  "before": 67.3, "after": 67.2, "metric": "accuracy", "note": "retrieval was not the bottleneck" } ]

// FIG-COR-4 · <Matrix> — CITED, thresholds are FITTED, not constants
[ { "row": "PopQA",       "upper": 0.59, "lower": -0.99 },
  { "row": "PubHealth",   "upper": 0.50, "lower": -0.91 },
  { "row": "ARC",         "upper": 0.50, "lower": -0.91 },
  { "row": "Biography",   "upper": 0.95, "lower": -0.91 } ]

// FIG-COR-5 · <Matrix> — CITED, Barnett et al., which failure points this pattern touches
[ { "row": "FP1 missing content",      "corrective": "fixes",   "note": "its best case — the only mechanism that detects it" },
  { "row": "FP2 missed top-ranked",    "corrective": "partial", "note": "bounded by the pool" },
  { "row": "FP3 not in context",       "corrective": "fixes",   "note": "decompose-then-recompose" },
  { "row": "FP4 not extracted",        "corrective": "no",      "note": "generation problem" },
  { "row": "FP5 wrong format",         "corrective": "no",      "note": "the answer contract's job" },
  { "row": "FP6 wrong specificity",    "corrective": "no" },
  { "row": "FP7 incomplete",           "corrective": "no" } ]
```

---

## 11 · Run what exists

| command | what it does | cost |
|---|---|---|
| `pnpm eval --only cov-001` | the insurance loop, 5 runs | model calls |
| `pnpm steering:retrieval-eval --both` | produces `ret-008`, §6's finding | ~100 embedding tokens |
| `pnpm schema:check` | the answer contract, including the rule that an unresolved conflict with no escalation is rejected | free |

That last one is worth naming here. The strongest corrective mechanism this repo
actually ships is not in retrieval at all — it is `coherenceErrors()` in
`apps/ai/insurance/src/schema/`, which **rejects an answer** that records a
conflict without escalating it, *"because that's the model silently picking a
side between two contradicting documents."* A correction applied to the output
rather than the input, and it is deterministic.

---

## Sources

- Yan, Gu, Zhu & Ling, *Corrective Retrieval Augmented Generation*, arXiv:2401.15884 — <https://arxiv.org/abs/2401.15884>
- Barnett et al., *Seven Failure Points When Engineering a RAG System*, CAIN 2024 — <https://arxiv.org/abs/2401.05856>
- Asai et al., *Self-RAG*, ICLR 2024 — <https://arxiv.org/abs/2310.11511> (see [`AGENTIC.md`](AGENTIC.md))

In-repo: `apps/ai/insurance/src/tools/search-guidance.tool.ts` ·
`docs/steering/evals/RETRIEVAL.md` · `docs/ROADMAP.md` ·
`docs/AUGMENTED-GENERATION.md`
