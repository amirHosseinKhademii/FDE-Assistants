# Graph RAG — building a map first, because some questions have no passage

**Status: NOT BUILT HERE.** Every number in this document is CITED from an
external source with a URL and a fetch date. There is no `verbatim` excerpt from
this repo in §1–§6 because there is no graph in this repo — §7 is about the
*different* thing this repo built for the same class of question, and that part
is measured.

*Research date 2026-09-15.*

---

## 1 · The plain version, and the question that breaks ordinary RAG

Everything in [`HYBRID.md`](HYBRID.md) rests on one assumption so basic it is
rarely said out loud:

> **the answer is in a passage.**

Retrieval finds passages. Generation reads passages. If the answer is sitting in
some chunk somewhere, the whole machine works. Now ask:

> *"What are the main themes across these 1,069 files?"*

There is no passage that answers that. Not a badly-ranked one — **none**. The
answer is a property of the *whole corpus*, and it exists in no individual
document. Retrieval returns the 6 passages most similar to the phrase "main
themes", which is a query about a corpus matched against documents that are not
about corpora, and the model summarises six arbitrary passages and presents it
as an overview. Fluently. With citations.

The distinction has names:

| | |
|---|---|
| **local question** | answered by one or a few passages. *"What is the rental car limit on form PP 03 24 06 24?"* Vector RAG is excellent at these. |
| **global question** | answered by the shape of the whole corpus. *"What are the recurring causes of overrun?"* Vector RAG cannot do these at all, and does not say so. |

Graph RAG is one answer: **before anyone asks anything, read the entire corpus
once and build a structured map of it.** Then answer global questions from the
map rather than from the documents.

---

## 2 · Microsoft GraphRAG, precisely

**CITED** — Edge, Trinh, Cheng, Bradley, Chao, Mody, Truitt, Metropolitansky,
Ness & Larson (Microsoft), *From Local to Global: A GraphRAG Approach to
Query-Focused Summarization*, arXiv:2404.16130, April 2024.
<https://arxiv.org/abs/2404.16130> (fetched 2026-09-15).

Seven stages, and the first three are the expensive ones:

```
  1  source documents  ──►  text chunks             600-token chunks, overlapped
  2  text chunks       ──►  element instances       AN LLM CALL PER CHUNK:
                                                    entities, relationships, claims
  3  element instances ──►  knowledge graph         aggregate duplicates; nodes,
                                                    edges, consolidated descriptions
  4  knowledge graph   ──►  graph communities       LEIDEN, recursively, until
                                                    leaves cannot be partitioned
  5  communities       ──►  community summaries     AN LLM CALL PER COMMUNITY,
                                                    bottom-up, at every level
  ─────────────── everything above is INDEX TIME, once ───────────────
  6  summaries         ──►  community answers       MAP: every relevant community
                                                    answers the query in parallel
  7  community answers ──►  global answer           REDUCE: rank and synthesise
```

**Stage 2 is the cost.** One LLM call per 600-token chunk, over the entire
corpus, before anyone has asked a question. A million-token corpus is roughly
1,700 extraction calls, and each one both reads and writes.

**Stage 4 is the idea.** Leiden is a community-detection algorithm: it partitions
a graph into clusters of densely-interconnected nodes. Run recursively, it gives
a *hierarchy* — and each level is a partition that covers every node "in a
mutually exclusive, collectively exhaustive way". That MECE property is what
makes stage 6's map-reduce sound: you can answer from every community at a level
and know you have covered the corpus exactly once.

**Stages 6–7 are the query.** No retrieval in the vector sense. Every community
summary at the chosen level answers the question independently and in parallel;
partial answers are ranked and synthesised.

### The graphs it built

| corpus | tokens | nodes | edges |
|---|---|---|---|
| podcast transcripts | ~1.0 M | 8,564 | 20,691 |
| news articles | ~1.7 M | 15,754 | 19,520 |

### The results

Head-to-head win rates against naive vector RAG, LLM-judged on four metrics:

| metric | podcasts | news |
|---|---|---|
| **comprehensiveness** | 72–83% | 72–80% |
| **diversity** | 75–82% | 62–71% |
| empowerment | mixed | mixed |
| **directness** | **vector RAG wins** | **vector RAG wins** |

Comprehensiveness and diversity results are reported as statistically
significant (p < .001).

**Directness is the row to read.** It is a control metric, and vector RAG wins it
by design — six specific passages produce a specific answer; a synthesis across
forty community summaries produces a broad one. **Graph RAG does not beat vector
RAG. It answers a different question**, and it is worse at the original one.

### Query-time token cost

Context tokens per query, as a fraction of the naive-RAG maximum:

| level | podcasts | news |
|---|---|---|
| root-level summaries (C0) | 2.6% | 2.3% |
| low-level summaries (C3) | 73.5% | 66.8% |
| naive RAG | 100% | 100% |

Root-level is a 9–43× reduction. That is the genuinely surprising result: a
global answer from the top of the hierarchy is *cheaper at query time* than
stuffing retrieved chunks in — because a summary of a summary of a summary is
very short. You paid for it once, at index time, for every question you will
ever ask.

---

## 3 · The cost, and the paper that undercuts it

Stage 2 is an LLM call per chunk over the whole corpus. Nobody argues about
this; the argument is whether it is worth it.

**CITED** — Microsoft Research, *LazyGraphRAG sets a new standard for GraphRAG
quality and cost*,
<https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/>
(fetched 2026-09-15):

> LazyGraphRAG data indexing costs are identical to vector RAG and **0.1% of the
> costs of full GraphRAG**.

> For comparable query costs to vector RAG, LazyGraphRAG outperforms all
> competing methods on local queries […] the same LazyGraphRAG configuration
> also shows comparable answer quality to GraphRAG Global Search for global
> queries, but **more than 700 times lower query cost**.

The mechanism: **defer all LLM summarisation to query time.** Index only what is
cheap and deterministic — co-occurrence, noun phrases, a lightweight graph.
Summarise only the communities a specific question actually touches.

Two readings, and both are right:

- The practical one. If you are about to build stage 2 and stage 5 over a
  customer's corpus, read this first. A thousandth of the indexing cost is not a
  tuning difference.
- The methodological one, and it is the more useful. **A published pipeline's
  expensive stage was, eighteen months later, shown to be largely deferrable
  without quality loss.** The index-time/query-time boundary is a *choice*, not
  a property of the problem — and it is worth asking of any pipeline: what is
  this precomputing for questions nobody will ask?

### RAPTOR — the cheaper middle

**CITED** — Sarthi, Abdullah, Tuli, Khanna, Goldie & Manning, *RAPTOR: Recursive
Abstractive Processing for Tree-Organized Retrieval*, ICLR 2024,
arXiv:2401.18059. <https://arxiv.org/abs/2401.18059> (fetched 2026-09-15).

Recursively **embed, cluster, and summarise** chunks, building a tree of
increasing abstraction bottom-up. At query time, retrieve from the tree — so a
single search can return both a leaf (a specific passage) and an internal node
(a summary covering hundreds).

Reported: coupling RAPTOR retrieval with GPT-4 improves the best performance on
the QuALITY benchmark by **20% in absolute accuracy**, and RAPTOR outperforms
BM25 and DPR across all tested language models.

**No entity extraction. No relationships. No Leiden.** Clustering embeddings you
already computed, then one summary per cluster. If your global questions are
about *themes* rather than about *how things connect*, this gets most of the
benefit for a fraction of the build — and it drops into an existing vector store
because a summary node is just another chunk.

---

## 4 · Where a graph actually earns its keep

Stage 2 extracts *relationships*, not just entities, and that is the capability
neither vector RAG nor RAPTOR has at any price: **multi-hop questions where no
document contains both hops.**

> *"Which suppliers are exposed to the component that failed the 2021 safety
> assessment?"*

Document A says the assessment classified component X at ASIL B. Document B says
supplier S ships component X. **No document says supplier S is exposed.** That
fact exists only in the join — and a join is exactly what an edge is.

Vector RAG retrieves A or B or both, and the model has to notice the connection
in a context window where the two passages sit next to forty others. Sometimes
it does. There is no mechanism making it reliable, and no signal when it fails.

This is the honest case for a graph, and it is narrower than the marketing: not
"graphs make RAG better", but **"a graph can answer a question whose answer is an
edge."** If you cannot name a question of that shape in your customer's actual
work, you do not need one.

A close relative of this is live in this repo and unsolved. From
`docs/steering/evals/RETRIEVAL.md`, case `ret-005`:

> asks whether the damping software already meets the safety level K2 requires.
> Answering it needs **two** passages from two repositories — K2 requires ASIL D,
> the 2021 assessment classified the component at ASIL B — and neither one alone
> says anything is wrong.

**MEASURED HERE:** `ret-005` scores recall 0.50 both with and without a
reranker, and the runner prints why —

```
ceiling: only 50% of the expected labels were in the top-50 pool at all
         — a reranker cannot fix that
```

That is a two-hop question, failing for two-hop reasons, in a corpus this repo
already has. It is the single most concrete argument for a graph anywhere in
this workspace — and it is an argument, not a result, because nobody has built
one and measured it.

---

## 5 · Code

None of this runs here. It is written against this repo's stack so it could.

### Stage 2 — extraction, and the schema is the whole design

```ts
// ASSEMBLED — illustrative. Not in this repo.
import { z } from 'zod';

const ExtractionSchema = z.strictObject({
  entities: z.array(z.strictObject({
    name: z.string().describe('The canonical surface form as written. Do NOT normalise — '
                            + 'resolution happens at stage 3, where you can see duplicates.'),
    type: z.enum(['person', 'organisation', 'component', 'document', 'requirement'])
      .describe('DOMAIN-SPECIFIC AND THE HIGHEST-LEVERAGE FIELD HERE. A generic '
              + 'type set produces a generic graph. This list is the judgment.'),
    description: z.string().describe('One sentence, from THIS chunk only.'),
  })),
  relationships: z.array(z.strictObject({
    source: z.string(),
    target: z.string(),
    description: z.string().describe('What the relationship is, in the document\'s own words.'),
    strength: z.number().min(1).max(10).describe('How strongly this chunk asserts it.'),
  })).describe('THE POINT OF THE WHOLE PIPELINE. Entities alone give you a tag '
             + 'cloud; edges give you the joins of §4.'),
  claims: z.array(z.strictObject({
    subject: z.string(),
    statement: z.string(),
    // Provenance survives every later stage or the final answer cannot cite.
    sourceLine: z.number(),
  })),
});

export async function extractElements(chunk: Chunk) {
  const res = await client.responses.parse({
    model: env.EXTRACTION_MODEL,       // a SMALL model. This runs N times.
    input: [
      { role: 'system', content:
          'Extract entities, relationships and claims from the passage. Use only '
        + 'what the passage states. Do not infer relationships that are merely '
        + 'plausible — a wrong edge is worse than a missing one, because the '
        + 'graph makes it look like a finding.' },
      { role: 'user', content: chunk.text },
    ],
    text: { format: zodTextFormat(ExtractionSchema, 'elements') },
  });
  return res.output_parsed;
}
```

> **"A wrong edge is worse than a missing one."** A missing edge costs you a
> question you could have answered. A wrong edge produces a confident,
> well-cited claim about a relationship that does not exist — and it is
> *structural*, so it will keep surfacing across every global question that
> touches either node.

### Stage 3 — the graph, in Postgres, next to everything else

```sql
-- ASSEMBLED. No graph database required for this scale: 8k–16k nodes is small.
create table graph_nodes (
  id           text primary key,          -- normalised name; the resolution key
  name         text not null,
  type         text not null,
  description  text not null,             -- LLM-consolidated across mentions
  degree       int  not null default 0,   -- cached; Leiden wants it constantly
  community    jsonb                      -- {"0": 3, "1": 14, "2": 57} level → id
);

create table graph_edges (
  source      text references graph_nodes(id),
  target      text references graph_nodes(id),
  description text not null,
  strength    int  not null,
  -- PROVENANCE. Without it a community summary cannot cite, and an uncitable
  -- global answer is exactly the fluent-but-unverifiable output RAG existed
  -- to eliminate.
  chunk_ids   text[] not null,
  primary key (source, target)
);
```

### Stage 4 — clustering, and an ecosystem warning

```ts
// ASSEMBLED. READ THIS BEFORE PLANNING A TYPESCRIPT GRAPHRAG.
//
// Leiden (Traag et al. 2019) has no maintained JS implementation. The reference
// is `leidenalg`, Python, on top of igraph — which is why essentially every
// GraphRAG implementation in the wild is Python, including Microsoft's.
//
// In TypeScript the practical option is `graphology-communities-louvain`:
// LOUVAIN, not Leiden. Louvain's known defect is that it can produce internally
// DISCONNECTED communities — and a disconnected community summarised as one
// thing is a summary of two unrelated things wearing one label. Leiden exists
// specifically to fix that.
//
// Honest options: (a) Louvain in TS and accept it, (b) a Python sidecar for the
// index job only — it runs once, offline, so a second runtime is cheap there
// and nowhere else, (c) RAPTOR instead (§3), which needs no community detection
// at all.
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

export function detectCommunities(nodes: Node[], edges: Edge[], levels = 3) {
  const g = new Graph({ type: 'undirected' });
  for (const n of nodes) g.addNode(n.id);
  for (const e of edges) g.mergeEdge(e.source, e.target, { weight: e.strength });

  const hierarchy: Record<number, Record<string, number>> = {};
  let current = g;

  for (let level = 0; level < levels; level++) {
    hierarchy[level] = louvain(current, { resolution: 1 + level * 0.5 });
    // Recurse: collapse each community to a node, re-cluster. This is what
    // "hierarchical" means — and each level must remain a partition (MECE),
    // or the map-reduce in stage 6 double-counts.
    current = collapse(current, hierarchy[level]);
  }
  return hierarchy;
}
```

### Stages 6–7 — map-reduce at query time

```ts
// ASSEMBLED — the query path. No vector search anywhere in it.
export async function globalQuery(question: string, level = 0) {
  const summaries = await loadCommunitySummaries(level);   // C0 = root = cheapest

  // MAP — every community answers independently, in parallel, and SCORES its
  // own usefulness. The score is what makes reduce affordable.
  const partials = await Promise.all(summaries.map(async (s) => {
    const r = await client.responses.parse({
      model: env.MODEL,
      input: [
        { role: 'system', content:
            'Answer the question using ONLY this community report. If it is not '
          + 'relevant, say so and score 0 — a low score is a useful answer and '
          + 'costs the next stage nothing.' },
        { role: 'user', content: `Q: ${question}\n\nREPORT:\n${s.text}` },
      ],
      text: { format: zodTextFormat(z.strictObject({
        answer: z.string(),
        score: z.number().min(0).max(100)
          .describe('How much this report contributes. 0 if not relevant.'),
        citations: z.array(z.string()).describe('chunk ids. Provenance or it did not happen.'),
      }), 'partial') },
    });
    return r.output_parsed;
  }));

  // REDUCE — rank, drop the zeroes, synthesise under a token budget.
  const useful = partials.filter((p) => p.score > 0).sort((a, b) => b.score - a.score);

  return client.responses.create({
    model: env.MODEL,
    input: [
      { role: 'system', content:
          'Synthesise one answer from these partial answers, highest-scored first. '
        + 'Preserve citations. Where two partials disagree, SAY SO rather than '
        + 'choosing — a global answer that hides a disagreement is worse than no '
        + 'global answer.' },
      { role: 'user', content: JSON.stringify(useful.slice(0, 20)) },
    ],
  });
}
```

That last instruction is the same rule the insurance schema enforces
mechanically: an unresolved conflict with no escalation is rejected, *"because
that's the model silently picking a side between two contradicting documents."*
Map-reduce across communities makes that failure much more likely — forty
partials will disagree — and much less visible.

---

## 6 · What this repo built instead, and it is the useful comparison

**MEASURED HERE.** Steering had exactly the global-question problem: 1,069 files,
four databases, 24 customer requirements, and the question *"where does the bid
stand?"*, whose answer is in no file.

It was not solved with a graph. It was solved with **fan-out plus a summariser**,
which is stages 6 and 7 without stages 1–5:

```
  pnpm steering:assess-all --run     one agent per requirement, serial, resumable
                                     → 24 structured assessments, each cited
  pnpm steering:summarise            a SECOND, SMALLER agent reads the finished
                                     assessments and writes across them
```

The shape is identical to GraphRAG's map-reduce. The difference is **what gets
mapped over**: GraphRAG maps over *communities discovered by clustering an
extracted graph*; steering maps over *units the customer already defined* — the
24 requirements of the K2 bid.

**When the customer's own structure is the right partition, discovering a
partition is work you do not need to do.** A bid has requirements. A trial has
sites. A factory has lines. Clustering to rediscover that is expensive and worse,
because the discovered clusters do not line up with how anybody talks about the
work.

Graph RAG earns its cost when there is **no such given structure** — a pile of
transcripts, a decade of support tickets, a corpus nobody has ever organised.
Then the map is genuinely new information.

And the repo's derived pipeline is stage 2 without the graph:

| pipeline | in | out | cost |
|---|---|---|---|
| **extract** | 220 closure reports | **1,320 facts, each with its sentence** | ~a cent |

Entity-and-claim extraction at corpus scale, with provenance, for about a cent.
What was never built is the *edge* table — so the joins of §4 are not available,
and `ret-005` still fails. **The missing half is the half graph RAG is named
after.**

---

## 7 · When NOT to use it

| | |
|---|---|
| **Your questions are local.** | Both engagements here are lookups and assessments — "what does form X pay", "price this requirement". §2's directness row says vector RAG is *better* at these. |
| **The corpus already has a structure the customer uses.** | §6. Map over that. |
| **You cannot afford an LLM call per chunk.** | Read LazyGraphRAG first (§3). 0.1% of the indexing cost is not a tuning parameter. |
| **The corpus changes often.** | The whole index is a derivative of the corpus. A new document can change communities globally, and incremental re-clustering is an unsolved operational problem, not a config flag. |
| **You need a citation to a line.** | Provenance survives stages 2–5 only if you carry it deliberately, and even then a community summary cites a summary that cites a chunk. Two engagements here cite file-and-line; that property is expensive to keep through a graph. |
| **You are writing it in TypeScript.** | §5, stage 4. No maintained Leiden. Plan for Louvain's disconnected communities, a Python sidecar, or RAPTOR. |

---

## 8 · Figure data for the UI

```jsonc
// FIG-GRF-1 · <Stages> — CITED, Edge et al. 2024. The line between 5 and 6 is the whole cost story.
[ { "verb": "chunk",     "out": "600-token chunks",            "does": "overlapped" },
  { "verb": "extract",   "out": "entities, relationships, claims", "does": "AN LLM CALL PER CHUNK — this is the cost", "rule": "index time" },
  { "verb": "aggregate", "out": "nodes + edges, deduplicated", "does": "consolidated descriptions", "rule": "index time" },
  { "verb": "cluster",   "out": "a hierarchy of communities",  "does": "Leiden, recursive, MECE at every level", "rule": "index time" },
  { "verb": "summarise", "out": "a report per community",      "does": "AN LLM CALL PER COMMUNITY, bottom-up", "rule": "index time" },
  { "verb": "map",       "out": "a partial answer per community", "does": "parallel; each scores its own usefulness", "rule": "query time" },
  { "verb": "reduce",    "out": "one global answer",           "does": "rank, drop zeroes, synthesise", "rule": "query time" } ]

// FIG-GRF-2 · NEW CHART — node-link. THE ONE GENUINELY NEW COMPONENT NEEDED.
// A small hand-built graph showing the §4 two-hop join. Not force-directed —
// a fixed layout, because the point is the PATH, not the topology.
{ "nodes": [ { "id": "K2",   "label": "K2 requirement",        "type": "requirement", "x": 0.10, "y": 0.5 },
             { "id": "ASIL", "label": "ASIL D",                "type": "claim",       "x": 0.35, "y": 0.5 },
             { "id": "CMP",  "label": "damping component",     "type": "component",   "x": 0.62, "y": 0.5 },
             { "id": "ASMT", "label": "2021 assessment: ASIL B","type": "document",   "x": 0.88, "y": 0.5 } ],
  "edges": [ { "source": "K2",  "target": "ASIL", "label": "requires",        "doc": "requirements/PRG-KST-K2/…" },
             { "source": "ASIL","target": "CMP",  "label": "applies to",      "doc": "requirements/PRG-KST-K2/…" },
             { "source": "CMP", "target": "ASMT","label": "was classified by","doc": "eps-steering-feel/docs/safety-assessment-2021.md §3" } ],
  "caption": "No document contains both ends. The contradiction — D required, B assessed — is the PATH, not a passage. MEASURED HERE: ret-005 scores 0.50 recall with and without a reranker." }

// FIG-GRF-3 · <BarRows> — CITED, win rate vs naive vector RAG (podcasts).
// UI: directness is the CONTROL and vector RAG wins it. Keep it in, same hue.
[ { "label": "comprehensiveness", "value": 78, "detail": "72–83%, p<.001" },
  { "label": "diversity",         "value": 79, "detail": "75–82%, p<.001" },
  { "label": "empowerment",       "value": 50, "detail": "mixed" },
  { "label": "directness",        "value": 38, "detail": "vector RAG wins — by design" } ]

// FIG-GRF-4 · <BarRows> — CITED, query-time context tokens as % of naive RAG
[ { "label": "root summaries (C0)",  "value": 2.6,   "detail": "podcasts · 9–43× reduction" },
  { "label": "low summaries (C3)",   "value": 73.5,  "detail": "podcasts" },
  { "label": "naive RAG",            "value": 100.0, "detail": "baseline" } ]

// FIG-GRF-5 · <Slope> — CITED, LazyGraphRAG. A LOG SCALE, and say so on the axis.
[ { "case": "indexing cost",  "before": 100, "after": 0.1,   "metric": "% of full GraphRAG" },
  { "case": "global query cost","before": 100, "after": 0.14, "metric": "% — >700× lower" } ]

// FIG-GRF-6 · <Matrix> — which pattern for which question
[ { "row": "what does form X pay",             "vector": "best",    "raptor": "ok",    "graph": "worse" },
  { "row": "what are the recurring themes",    "vector": "cannot",  "raptor": "good",  "graph": "best" },
  { "row": "who is exposed to the failed part","vector": "cannot",  "raptor": "cannot","graph": "best — the answer is an edge" },
  { "row": "where does the bid stand",         "vector": "cannot",  "raptor": "ok",    "graph": "overkill — map over the 24 requirements" } ]
```

---

## 9 · Run the nearest thing that exists

| command | what it does | cost |
|---|---|---|
| `pnpm steering:derived-extract` | 220 closure reports → 1,320 facts, each with its sentence. Stage 2 without the graph. | ~a cent |
| `pnpm steering:assess-all` | the work list across all 24 requirements | **free** |
| `pnpm steering:summarise` | the second agent, across finished assessments. §6's map-reduce. | a model call |
| `pnpm steering:retrieval-eval --both` | produces `ret-005` — the two-hop failure of §4 | ~100 embedding tokens |

---

## Sources

- Edge et al. (Microsoft), *From Local to Global: A GraphRAG Approach to Query-Focused Summarization*, arXiv:2404.16130 — <https://arxiv.org/abs/2404.16130>
- Microsoft Research, *LazyGraphRAG sets a new standard for GraphRAG quality and cost* — <https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/>
- Sarthi et al., *RAPTOR*, ICLR 2024, arXiv:2401.18059 — <https://arxiv.org/abs/2401.18059>
- Traag, Waltman & van Eck, *From Louvain to Leiden: guaranteeing well-connected communities*, Scientific Reports 9, 5233 (2019) — <https://www.nature.com/articles/s41598-019-41695-z>

In-repo: `docs/steering/evals/RETRIEVAL.md` (`ret-005`) · `docs/steering/NEXT.md`
· `apps/ai/steering/src/derived/` · `apps/ai/steering/src/cli/assess-all.ts`
