# Hybrid RAG — two searches, because one is reliably wrong about different things

**Status: BUILT HERE, AND MEASURED.** This is the only one of the five patterns
that is running code in this repo with a number behind it. Every code block
marked `verbatim` below is copied from a file you can open; every number marked
MEASURED HERE was printed by a command you can run.

*Research date 2026-09-15. External sources carry a URL and the date fetched.*

---

## 1 · The plain version

You have a pile of documents and a question. You want the handful of passages
that answer it.

There are two completely different ways to find them, and they fail in opposite
directions.

**Search by meaning.** Turn every passage into a list of numbers that encodes
roughly what it is about, turn the question into the same kind of list, and
return the passages whose numbers point in the most similar direction. This is
*dense* or *vector* search. It finds "what does my policy pay if my car is
stolen" in a passage headed *Comprehensive — Theft*, even though the two share
almost no words.

**Search by words.** Build the index a library card catalogue would build: which
documents contain which words, weighted so that a rare word counts for more than
a common one. Return the documents containing the most of the query's rare
words. This is *sparse* or *keyword* or *BM25* or *full-text* search. It finds
`SR-EPS-0421` because it is looking for the literal string `SR-EPS-0421`.

Now the failure. **Meaning-search is worst at exactly the words that matter
most.** An embedding is trained on ordinary prose, so a rare technical or legal
term — *livery*, *subrogation*, `SR-EPS-0421` — has almost no neighbours in the
space. It gets encoded as "vaguely about vehicles" or "vaguely an identifier",
and the passage that actually contains it is not meaningfully closer to the
query than a hundred passages that do not.

And **word-search is worst at paraphrase.** A question that shares no vocabulary
with its answer returns nothing at all.

Hybrid RAG is the observation that you do not have to choose. Run both. Then the
only real question is: *given two ranked lists, how do you make one?*

---

## 2 · Why you cannot just add the scores

This is the first thing everybody gets wrong, and it is worth being precise
about.

The dense arm gives you a **cosine distance** — a number between 0 and 2, where
small is good, clustered for real corpora somewhere in 0.2–0.6 and with a
distribution that depends on the embedding model.

The sparse arm gives you a **`ts_rank`** (or a BM25 score) — an unbounded
positive number, where big is good, whose scale depends on document length, term
frequency across the corpus, and how many query terms matched.

These are different units on different scales. Adding them, averaging them, or
taking a weighted sum of them is not a compromise between two opinions — it is
**whichever arm happens to have the larger numeric range winning every time**,
and the weight you tune to fix that is a per-corpus constant that goes stale
when the corpus grows.

The standard answer is to throw the magnitudes away and keep only the **rank**.

### Reciprocal Rank Fusion

> score(d) = Σ over lists i of  1 / (K + rank of d in list i)

That is the whole algorithm. `K` is a smoothing constant; `K = 60` is the value
from the original paper and is what almost everybody uses.

**CITED** — Cormack, Clarke and Büttcher, *Reciprocal rank fusion outperforms
Condorcet and individual rank learning methods*, SIGIR 2009, pp. 758–759.
<https://dl.acm.org/doi/10.1145/1571941.1572114> (fetched 2026-09-15). RRF beat
both Condorcet Fuse and the individual systems it fused.

What `K = 60` buys you is *flattening the top*. Without it, rank 1 scores `1/1`
and rank 2 scores `1/2` — a 50% cliff, so whichever list happens to put
something first dominates. With `K = 60`, rank 1 scores `1/61 = 0.01639` and
rank 2 scores `1/62 = 0.01613`, a difference of 1.6%. Being first in one list is
worth barely more than being second, so **agreement between the arms is worth
more than being the best answer in either one.**

Hold onto that sentence. §6 is about the case where it is wrong.

---

## 3 · The implementation, verbatim

`packages/grounding/src/hybrid.ts` is 228 lines and does exactly this. The
fusion itself is fifteen of them.

```ts
// packages/grounding/src/hybrid.ts:210-225  — VERBATIM
  const fused = new Map<string, Scored>();
  const add = (doc: LCDocument, rank: number, arm: 'dense' | 'sparse') => {
    const key = keyOf(doc);
    const prev = fused.get(key) ?? { doc, score: 0 };
    prev.score += 1 / (RRF_K + rank);
    if (arm === 'dense') prev.denseRank = rank;
    else prev.sparseRank = rank;
    fused.set(key, prev);
  };

  dense.forEach(([doc], i) => add(doc, i + 1, 'dense'));
  sparse.docs.forEach((doc, i) => add(doc, i + 1, 'sparse'));

  const ranked = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, k);
  const best = ranked[0]?.score ?? 1;
  for (const r of ranked) r.score = Number((r.score / best).toFixed(3));
```

Four things in there are decisions, not syntax:

**`denseRank` and `sparseRank` are kept on every hit.** They are not used by the
fusion. They exist so that when retrieval goes wrong you can ask *which arm
found this, and where* — which is the single most useful diagnostic in the whole
pipeline and is the thing that produced §6.

**The score is normalised so the best hit is 1.0, and the type comment says
`NOT a similarity`.** A fused RRF score has no meaning on its own — `0.0182` is
not "1.8% relevant". Normalising makes it readable as "how far behind the leader"
and the comment stops anyone from thresholding on it.

**Over-fetch.** Each arm fetches `k * 4` before fusing:

```ts
// packages/grounding/src/hybrid.ts:195  — VERBATIM
  const depth = k * (opts.overFetch ?? 4);
```

> Each arm fetches `k * overFetch` so that a document ranked poorly by one and
> well by the other still has a rank in both lists — fusing two top-5s would
> mostly fuse two copies of the same five.

**A keyword failure is reported, never silent.**

```ts
// packages/grounding/src/hybrid.ts:201-206  — VERBATIM
  const sparsePromise = keywordSearch(
    query, depth, filter, opts.tableName ?? DEFAULT_CHUNK_TABLE, opts.connectionString,
  ).then(
    (r) => ({ ok: true as const, docs: r }),
    () => ({ ok: false as const, docs: [] as LCDocument[] }),
  );
```

`HybridResult.fullText` is `false` when the keyword arm could not run. The
caller is told it got dense-only results rather than quietly receiving worse
retrieval from a system that still looks like it is working.

### The sparse arm is a generated column, not a second index

```sql
-- A READING of packages/grounding/src/hybrid.ts:83-89 — the two SQL statements
-- lifted out of their `await client.query(` wrappers and the `${table}`
-- interpolation flattened, so the DDL reads as DDL. Open the file for the real
-- thing; nothing about the semantics has been changed.
alter table {table} add column if not exists content_ts tsvector
  generated always as (to_tsvector('english', content)) stored;

create index if not exists {table}_fts_idx on {table} using gin (content_ts);
```

Both arms live in one Postgres table, maintained by one ingest, so they cannot
drift out of sync. The file's own header makes the argument:

> An in-memory BM25 index is a second copy of the corpus with its own staleness
> bug, and nothing about a stale second copy looks wrong from the outside.

And a **generated column rather than a trigger**: Postgres recomputes
`content_ts` on every write, so it is *impossible* for it to disagree with
`content`. A trigger can be dropped; a generated column cannot be out of date.

---

## 4 · The trap that makes the whole arm return nothing

This is the most valuable twenty lines in the file, and it is a bug that shipped.

```ts
// packages/grounding/src/hybrid.ts:116-122  — VERBATIM
function orQuery(raw: string): string {
  const terms = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  return [...new Set(terms)].join(' | ');
}
```

Why hand-build a tsquery instead of using Postgres's own converter? Because
**every built-in converter ANDs its terms.** `plainto_tsquery`,
`websearch_to_tsquery` and `phraseto_tsquery` all require a document to contain
*every* word of the query. A model-written query is a sentence. No chunk
contains every word of a sentence.

From the file's header comment:

> the first version of this file used `plainto_tsquery` and therefore returned
> NOTHING, ever. It looked like it worked: the fusion still produced results,
> because the dense arm carried them, and `fullText` was reported as true
> because no error was thrown. **A retrieval arm that silently matches nothing
> is worse than one that is absent.**

Two more properties fall out of doing it by hand:

- `ts_rank` over an OR-query favours documents matching *more* of the terms, so
  a passage containing both "livery" and "hire" outranks one containing only
  "hire". You get the AND behaviour as a ranking preference instead of as a
  filter.
- Sanitising to `[a-z0-9]` makes **tsquery injection impossible by
  construction**. `to_tsquery` has real syntax; a model writes queries full of
  quotes, apostrophes and ampersands that are a syntax error at best.

---

## 5 · What it measures, here

**MEASURED HERE** — `pnpm steering:retrieval-eval --both`, run 2026-09-14,
recorded in `docs/steering/evals/RETRIEVAL.md`:

```
  arm        cases  recall@6   MRR
  baseline    6/8   0.813     0.692     hybridSearch, exactly as the tool calls it
  reranked    7/8   0.938     0.875     + cross-encoder over a 50-candidate pool
```

8 cases over 922 documents and 3,854 passages. The reranker is
`Xenova/ms-marco-MiniLM-L-6-v2`, local, CPU, in-process; 400 passages re-scored
in 15.8 s, about 2 s of added latency per question. It is **off by default**
(`RERANK=local` turns it on) because +12.5 points of recall against 2 s per
question is a decision for whoever owns the latency budget.

Per case, and the loss is printed rather than buried:

| case | what moved | baseline → reranked |
|---|---|---|
| `ret-007` | the contaminated charge code, **35 → 1** | recall 0.00 → **1.00** |
| `ret-003` | the exact identifier `SR-EPS-0421`, rank 5 → 2 | rr 0.20 → **0.50** |
| `ret-005` | rank improved, recall did not | rr 0.33 → 1.00, recall stuck at 0.50 |
| `ret-008` | the **stale** design note overtook the test file | rr 1.00 → **0.50** ← a real loss |

`ret-008` is the honest cost and it is sharper than "noise". The question asks
where a module's behaviour is actually recorded. The answer is the test file,
whose own banner says the 2015 design note has gone stale and the tests are the
surviving specification. **The reranker promoted the stale design note above the
tests.** Relevance and currency are different questions; a cross-encoder can
only see the first. (That observation is load-bearing again in
[`CORRECTIVE.md`](CORRECTIVE.md) §7.)

### The ceiling nobody states

**A reranker cannot retrieve.** It reorders what it was handed, so recall@k
after reranking is bounded above by recall@poolSize before it. `ret-005` needs
two passages from two repositories and the runner prints why it is still stuck:

```
ceiling: only 50% of the expected labels were in the top-50 pool at all
         — a reranker cannot fix that
```

Without that line, the obvious next move is to raise the pool from 50 to 200 and
spend four times the latency discovering it changes nothing. The distinction is
between *"the retriever cannot find it"* — widen the pool, or fix chunking — and
*"the retriever finds it and ranks it badly"*, which is the only thing a
reranker fixes.

---

## 6 · The finding that argues against RRF

**MEASURED HERE**, and it is the part of this document worth the most.

`RRF_K = 60`, and a document's fused score is `Σ 1 / (60 + rank)` over the arms
that found it. Put numbers on that:

| what the arms said | fused score |
|---|---|
| keyword arm ranks it **1st**, dense arm never returns it | `1/61` = **0.0164** |
| **both** arms rank it **50th** | `2/110` = **0.0182** |

**A document both arms rank fiftieth outranks a document the keyword arm ranks
first.**

That is RRF working exactly as designed — corroboration by a second arm is worth
more than being the single best match in either, because agreement is evidence.
It is usually what you want.

It is *not* what you want when the two arms are good at different things, which
is the entire reason hybrid search exists in the first place. Two of the eight
steering cases hit it, and they are the two that need the keyword arm:

```
ret-003   wanted: fused 27/50   dense=—  sparse=3   found by keywords
ret-007   wanted: fused 35/50   dense=—  sparse=1   found by keywords
```

`ret-003` is the query `SR-EPS-0421` — a bare identifier, written into the suite
as *"the case only the KEYWORD arm can win"*, because embeddings cannot separate
`SR-EPS-0421` from `SR-EPS-0407`. The keyword arm won it at rank 3. **The fuser
put it 27th.** In both cases the answer is lexically distinctive and
semantically unremarkable, the dense arm contributed nothing, and fusion read
the dense arm's silence as a vote against.

Nothing has been changed about the fuser on the strength of this. It is recorded
with a number, which is what the suite was built to make possible. Two
candidates worth measuring if anyone picks it up:

```ts
// PROPOSED — not built, not measured. Both are guesses until the suite scores them.

// (a) a floor: each arm's top-N survives fusion regardless of the other arm.
const FLOOR = 3;
for (const [i, doc] of sparse.docs.slice(0, FLOOR).entries()) {
  const hit = fused.get(keyOf(doc))!;
  hit.score = Math.max(hit.score, 1 / (RRF_K + 1) + (FLOOR - i) * 1e-6);
}

// (b) a lower K: sharpens the top of each list relative to the corroboration bonus.
//     K = 10 →  rank 1 alone  = 1/11  = 0.0909
//               rank 50 twice = 2/60  = 0.0333   ← single-arm rank 1 now wins
const RRF_K = 10;
```

**This is not a steering problem.** `hybridSearch` is `@fde/grounding`, so
insurance and pharma fuse the same way, and neither has a retrieval suite that
could see it.

---

## 7 · The rest of the state of the art

### Contextual retrieval — fixing the chunk, not the fuser

**CITED** — Anthropic, *Contextual Retrieval in AI Systems*,
<https://www.anthropic.com/engineering/contextual-retrieval> (fetched
2026-09-15).

The observation: a chunk cut out of a document loses the context that made it
meaningful. *"The company's revenue grew by 3% over the previous quarter"* does
not say which company or which quarter. So before embedding, have a cheap model
write 50–100 tokens situating the chunk in its document, and prepend that.

Measured on recall@20 (top-150 retrieved before reranking, reranked to 20):

| configuration | failure rate | reduction |
|---|---|---|
| baseline embeddings | 5.7% | — |
| + contextual embeddings | 3.7% | 35% |
| + contextual BM25 (i.e. hybrid) | 2.9% | **49%** |
| + reranking | 1.9% | **67%** |

One-time cost: **$1.02 per million document tokens** with prompt caching,
assuming 800-token chunks in 8k-token documents.

Two things to take from that table. The middle row is the hybrid step and it is
worth 14 points on its own. And the same source states the threshold at which
none of this is worth doing: **if your knowledge base is under ~200,000 tokens
(about 500 pages), put the whole thing in the prompt and skip retrieval
entirely.**

This repo does something adjacent but not the same: the chunker prepends the
*heading trail* to every chunk — free, deterministic, no model call. Contextual
retrieval replaces that trail with a written sentence and pays a model per
chunk. Nobody here has measured which wins on this corpus, and that is a
genuinely open question, not a rhetorical one.

### Query rewriting and HyDE

Before searching, ask a model to improve the query. Two shapes:

- **Rewrite / expand.** Turn one question into three, search all three, fuse.
  RRF already handles more than two lists — that is the general form.
- **HyDE** (Hypothetical Document Embeddings). Ask the model to *write the
  answer it expects*, then embed that and search with it. A hypothetical answer
  is written in the register of the documents you are looking for; a question is
  not. Trades one cheap model call for better dense recall, and does nothing for
  the keyword arm.

```ts
// ASSEMBLED — illustrative. Not in this repo.
async function hydeSearch(store: PGVectorStore, question: string, k: number) {
  const hypothetical = await client.responses.create({
    model: env.MODEL,
    input: `Write a short passage that would answer this question, in the style
            of a technical document. Do not hedge, do not say you are unsure —
            a wrong guess in the right register still retrieves better than a
            question does.\n\n${question}`,
  });
  // Search with BOTH: the hypothesis for the dense arm's benefit, the original
  // for the keyword arm's, because a hallucinated passage has hallucinated
  // identifiers in it.
  const [a, b] = await Promise.all([
    hybridSearch(store, hypothetical.output_text, k * 2),
    hybridSearch(store, question, k * 2),
  ]);
  return fuseRanked([a.hits, b.hits], k);   // RRF over two fused lists
}
```

**The trap, stated because it is not obvious:** HyDE's hypothetical document
contains invented identifiers, invented form numbers, invented dates. Feeding it
to the *keyword* arm searches for strings that do not exist. Use it for the
dense arm and keep the literal question for the sparse arm.

---

## 8 · A minimal implementation you can read in one sitting

Everything above, with the Postgres and the LangChain removed.

```ts
// ASSEMBLED — a complete, dependency-free RRF you can paste into a scratch file.

export interface Ranked<T> { id: string; item: T }

/**
 * Fuse any number of ranked lists. Lists are 1-indexed by position.
 * K = 60 is Cormack et al. 2009. Lower it to favour single-list leaders.
 */
export function rrf<T>(lists: Ranked<T>[][], k: number, K = 60) {
  const acc = new Map<string, { item: T; score: number; ranks: (number | null)[] }>();

  lists.forEach((list, listIndex) => {
    list.forEach(({ id, item }, i) => {
      const rank = i + 1;
      const row = acc.get(id) ?? {
        item,
        score: 0,
        ranks: Array(lists.length).fill(null) as (number | null)[],
      };
      row.score += 1 / (K + rank);
      row.ranks[listIndex] = rank;          // keep provenance — see §6
      acc.set(id, row);
    });
  });

  return [...acc.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
```

```ts
// ASSEMBLED — the two arms, then the fusion, then the shape the model sees.
async function search(question: string, k = 6) {
  const depth = k * 4;                                   // over-fetch, §3

  const [dense, sparse] = await Promise.all([
    vectorSearch(await embed(question), depth),          // cosine, ANN index
    keywordSearch(orQuery(question), depth),             // tsquery, GIN index
  ]);

  const hits = rrf([toRanked(dense), toRanked(sparse)], k);

  // The model is given text and provenance. It is NOT given the fused score:
  // an RRF score is not a similarity and inviting the model to threshold on one
  // is inviting it to invent a confidence it does not have.
  return hits.map((h) => ({
    text: h.item.text,
    source: h.item.path,
    line: h.item.startLine,
  }));
}
```

---

## 9 · When NOT to use it

| | |
|---|---|
| **The corpus is under ~200k tokens.** | Put it all in the prompt. Retrieval is a cost you are paying to avoid a cost you do not have. (Anthropic, §7.) |
| **Every query is a known identifier.** | You want an exact lookup, not a search. This repo's `get_policyholder` is deliberately a lookup: *"a question with one exact answer is a lookup, not a search."* |
| **You cannot keep both indexes in one write path.** | Two stores maintained by two jobs will drift, and a stale second index has no external symptom. If you cannot do the generated-column trick, measure whether the sparse arm is still earning its keep. |
| **You are tempted to tune a weighted sum.** | The weight is a per-corpus constant that goes stale. If you genuinely need weighting, weight the *reciprocal ranks* (`w_i / (K + rank)`), not the raw scores — at least the units stay comparable. |

And the cost, stated plainly: two queries per search, two indexes per ingest,
and one more component that can silently return nothing.

---

## 10 · Figure data for the UI

Pre-computed so the page cannot invent numbers. Chart components live in
`apps/web/veresk-app/src/components/learn/charts/`.

```jsonc
// FIG-HYB-1 · <Stages> — the two arms and the fuser
[ { "verb": "embed",   "out": "float[1536]",          "does": "the question becomes one vector" },
  { "verb": "dense",   "out": "24 hits, cosine-ranked", "does": "ANN index over pre-embedded chunks" },
  { "verb": "orQuery", "out": "livery | hire | vehicle", "does": "OR, not AND — every built-in converter ANDs" },
  { "verb": "sparse",  "out": "24 hits, ts_rank-ranked", "does": "GIN index over a generated tsvector column" },
  { "verb": "fuse",    "out": "6 hits, rank-scored",   "does": "Σ 1/(60+rank); magnitudes discarded" } ]

// FIG-HYB-2 · <Slope> — MEASURED HERE, pnpm steering:retrieval-eval --both, 2026-09-14
// NOTE FOR THE UI: ret-008 is a LOSS. Draw it in the same hue, differing only in
// the direction of the line. A figure showing only the three gains would be
// advertising a stage this repo decided to ship OFF by default.
[ { "case": "ret-007", "before": 0.00, "after": 1.00, "metric": "recall@6", "note": "rank 35 → 1" },
  { "case": "ret-003", "before": 0.20, "after": 0.50, "metric": "rr",       "note": "rank 5 → 2" },
  { "case": "ret-005", "before": 0.33, "after": 1.00, "metric": "rr",       "note": "recall stuck at 0.50 — pool ceiling" },
  { "case": "ret-008", "before": 1.00, "after": 0.50, "metric": "rr",       "note": "stale design note beat the tests" } ]

// FIG-HYB-3 · <BarRows> — the RRF arithmetic of §6. THE POINT IS THE ORDERING.
[ { "label": "keyword rank 1, dense absent",  "value": 0.0164, "detail": "1/61" },
  { "label": "both arms rank 50",             "value": 0.0182, "detail": "2/110  ← wins" } ]

// FIG-HYB-4 · <BarRows> — CITED, Anthropic contextual retrieval, recall@20 failure rate
[ { "label": "baseline embeddings",        "value": 5.7 },
  { "label": "+ contextual embeddings",    "value": 3.7 },
  { "label": "+ contextual BM25 (hybrid)", "value": 2.9 },
  { "label": "+ reranking",                "value": 1.9 } ]

// FIG-HYB-5 · <Funnel> — the pool ceiling, MEASURED HERE
[ { "stage": "corpus",          "n": 3854 },
  { "stage": "fused pool",      "n": 50,  "note": "what the reranker may reorder" },
  { "stage": "shown to model",  "n": 6,   "note": "recall@6 here is bounded by recall@50 above" } ]
```

---

## 11 · Run it

| command | what it does | cost |
|---|---|---|
| `pnpm steering:retrieval-scorer-check` | does the scorer work, with its planted failures | free, offline |
| `pnpm steering:retrieval-eval` | the baseline: recall@6 and MRR over 8 cases | ~100 embedding tokens |
| `pnpm steering:retrieval-eval --both` | both arms and the delta in §5 | as above ×2 |
| `pnpm steering:retrieval-eval --both --save` | writes a baseline to disk | as above |
| `pnpm query "rental car limit" --form "PP 03 24 06 24"` | one hybrid search against insurance | one embedding call |

---

## Sources

- Cormack, Clarke & Büttcher, *Reciprocal rank fusion outperforms Condorcet and individual rank learning methods*, SIGIR 2009 — <https://dl.acm.org/doi/10.1145/1571941.1572114>
- Anthropic, *Contextual Retrieval in AI Systems* — <https://www.anthropic.com/engineering/contextual-retrieval>
- Barnett et al., *Seven Failure Points When Engineering a Retrieval Augmented Generation System*, CAIN 2024 — <https://arxiv.org/abs/2401.05856>

In-repo: `packages/grounding/src/hybrid.ts` · `packages/grounding/src/rerank.ts`
· `docs/steering/evals/RETRIEVAL.md` · `docs/RETRIEVAL.md`
