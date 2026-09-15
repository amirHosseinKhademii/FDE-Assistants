# Why these five, in this order, with these marks

*Written 2026-09-15, alongside the documents. Design intent — read this when a
decision in one of the five looks arbitrary. [`README.md`](README.md) is the
index; [`NEXT.md`](NEXT.md) is the work queue.*

---

## 1 · What this folder is for

Byron asked to learn five things: hybrid RAG, graph RAG, agentic RAG, corrective
RAG, multimodal RAG. That is a list, and a list is the least useful shape for
this material, because it invites the reading these patterns most often get:
*five techniques, pick the ones that sound good.*

They are not alternatives. **They are five answers to five different failures**,
and the useful question is never "which one is best" — it is "which failure do
I have". So each document opens with the failure, not the technique:

| pattern | the failure |
|---|---|
| hybrid | the rare word that decides the answer is the word embeddings are worst at |
| corrective | retrieval always returns something and never says it found nothing |
| agentic | one search, with the user's vocabulary, against a corpus that uses different vocabulary |
| graph | the answer is a property of the whole corpus and sits in no passage |
| multimodal | the meaning was in the layout and loading discarded it before anything was embedded |

A reader who can name their failure can pick. A reader who has read five
technique descriptions cannot.

---

## 2 · The order, and why it is not a dependency chain

The order is **built-and-measured first, least-built last**, which happens to
coincide with a sensible pedagogical progression:

```
  1 hybrid       fix the search you already have
  2 corrective   check what it gave you
  3 agentic      let the model search again
  4 graph        build a different index entirely
  5 multimodal   the input was never text
```

Each step is a larger commitment than the one before, and each is worth trying
only when the one before it has not worked. That is a *recommendation*, not a
dependency — and the distinction matters enough that
[`NEXT.md`](NEXT.md) §2 makes the `needs:` field carry it rather than implying a
spine that is not there.

The genuine dependencies are:

- all five need `docs/RETRIEVAL.md` §2–§5;
- `corrective` needs `hybrid` — it gates hybrid's output and leans on `ret-008`;
- nothing else needs anything else in this folder.

Three of the five read cold. Saying so follows the precedent already set by
`forensics`, which carries `needs: null` and states on the page that it is the
one to read if only one gets read.

---

## 3 · The three marks, and why this folder needed them

Every other document under `docs/` describes something this repo does. This one
does not, and that is a genuinely new problem for a workspace whose culture is
built on *"a number in a document that describes a repo goes stale the moment
somebody works on the repo"* and *"a number with a producer that nothing checks
is no better off than a number without one."*

Neither of those rules helps here, because **two of these five documents have no
producer and never will.** No command in this repo prints 81.3, or 0.1%, or
72–83%. They come from other people's papers and they are not going to become
measurable by working harder.

The answer is not to suppress them — a document on graph RAG with no numbers in
it would be worse, not more honest. The answer is to mark where every number
came from, so a reader never has to guess:

| mark | means | the risk it manages |
|---|---|---|
| **MEASURED HERE** | a command in this repo printed it | none — this is the ordinary case |
| **CITED** | a real measurement, by someone else, with URL and fetch date | that a reader takes somebody else's benchmark as this repo's result |
| **PROPOSED** | an argument, no number | that an argument is read as a finding |

This mirrors the existing operations track, which says *"two of the five are
largely PROPOSED here, and every page says which parts are built and which are
argued."* Same problem, one step further out: the operations track's unbuilt
parts are at least *this repo's* unbuilt parts. These are someone else's built
parts.

### It survives into the UI as a fourth `Figure` kind

`Figure` has `measured | illustration | proposed`, defaulting to the strict
value so that *"a figure whose author forgot claims to be measured, is read as
measured, and is wrong in the direction somebody will notice."*

An external result fits none of the three. `illustration` says nothing in it was
measured — false. `proposed` says the numbers are made up — false and unfair.
`measured` renders no badge, and on this site an unbadged figure reads as a repo
run. So: **`cited`**, badged *"measured elsewhere — not by this repo"*. The
argument in full is [`NEXT.md`](NEXT.md) §0.

---

## 4 · Why every document has a repo anchor, and why one does not

A pattern document that is only citations is a literature review. It teaches the
idea and nothing about the *decision* — what it costs, what breaks, what you
would actually type.

So each document is anchored in this repo wherever an anchor honestly exists:

| | anchor | kind |
|---|---|---|
| hybrid | `packages/grounding/src/hybrid.ts` — RRF, the generated column, the `plainto_tsquery` trap | **verbatim** |
| corrective | `search-guidance.tool.ts` — over-fetch then gate, and the empty-result note | **verbatim** |
| agentic | `loop.types.ts` turn cap · the tool descriptions · steering's loop · 893 logged runs | **verbatim** |
| multimodal | `loader.ts` — three text extensions, *"a PDF dropped into the corpus"* | **verbatim**, one excerpt |
| graph | — | **none** |

**`GRAPH.md` has no verbatim excerpt and does not pretend otherwise.** Its §6 is
the nearest true thing — steering solved the same global-question problem with
fan-out plus a summariser, which is GraphRAG's map-reduce over the customer's
own partition instead of a discovered one — and that comparison is more useful
than a fabricated snippet would have been. §4 names the one measured case here
(`ret-005`, a two-hop question failing for two-hop reasons) that would justify
building a graph, and marks it as an argument rather than a result.

The precedent is the `HowItWorks` audit: seven walkthroughs carried a paraphrase
under a real path, one of them dropping the branch where missing configuration
**allows** in development. A page that teaches the rule while omitting the
exception is worse than a page with no code on it.

---

## 5 · Decisions taken, and what was rejected

**Five documents, not one.** A single file would have been ~2,500 lines and
nobody would read the fourth pattern in it. Five files also map 1:1 onto five
lessons, which lands exactly on the `/learn` hue ramp's five stops.

**No sixth pattern.** Self-RAG, Adaptive-RAG, RAPTOR, HyDE and contextual
retrieval all came up in the research and all are covered *inside* the five,
where they belong as variations on a failure rather than as peers of it. RAPTOR
in particular is the cheap middle of `GRAPH.md` §3 and would be actively
misleading as its own top-level pattern — it is graph RAG's answer without the
graph.

**Code in TypeScript, against this repo's stack.** Even for patterns that are
not built here, and even where the real ecosystem is Python. Two reasons: the
code has to be readable to the person who owns this repo, and writing it against
the actual store and client surfaces the integration problems that a Python
tutorial hides — `MULTIMODAL.md` §5's note that pgvector indexes one vector per
row is worth more than a working ColPali snippet.

Where the ecosystem genuinely fights TypeScript, the document says so rather
than pretending: `GRAPH.md` §5 stage 4 states plainly that there is no
maintained Leiden in JS, that `graphology-communities-louvain` is Louvain with a
known disconnected-community defect, and lists the three honest options.

**The losses are printed.** Three figures in this folder are negative results —
`ret-008`, ARC-Challenge, and the RRF single-arm finding. Each is the most
informative thing on its page, and each was the first thing a draft wanted to
drop. The house rule is already written: `ret-008` is *"printed here rather than
buried because it is the honest cost"*, and a page showing only gains would be
advertising a stage this repo ships **off by default**.

**No `*.generated.ts`.** Rejected explicitly. `architecture.generated.ts` earns
its authority from `pnpm arch:check` failing the build when it disagrees with
the manifests. A generated file holding cited figures would have the same shape
and no gate — which is precisely the failure `/learn/drift` closes on: a number
that *looks* covered is more dangerous than one that does not.

---

## 6 · What would make this folder better, in order

1. **Build the graph for `ret-005`.** One measured two-hop failure already
   exists, in a corpus that already exists, with a reranker already proven not
   to fix it. Extraction over the same 220 closure reports costs about a cent —
   that is measured, `pnpm steering:derived-extract` does it today and produces
   1,320 facts. What is missing is only the *edge* table. Building it would turn
   the weakest document here into the strongest, and it is the smallest such
   step available.
2. **Measure contextual retrieval against the heading trail.** The chunker
   prepends headings for free; Anthropic's method writes 50–100 tokens per chunk
   for $1.02 per million document tokens. Which wins on *this* corpus is an open
   question with an existing instrument — `pnpm steering:retrieval-eval` — and
   nobody has run it.
3. **Measure the RRF single-arm floor.** `HYBRID.md` §6 records the defect with
   an arithmetic proof and two candidate fixes, both marked PROPOSED. The suite
   that would score them exists. This is the same rule the reranker was held to:
   *"Adding a reranker now is guessing it helps; adding it after gives you 'the
   reranker bought 7 points.'"*

All three are cheap, all three have their instrument already built, and all
three would move a **CITED** claim into the **MEASURED HERE** column — which is
the only direction this folder should ever drift.
