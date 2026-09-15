# Multimodal RAG — the page is not the text on the page

**Status: NOT BUILT HERE.** Every number is CITED with a URL and a fetch date.
The one thing this repo contributes is §3: a three-word comment in the loader
that is *exactly* the fork in the road, and the measured damage that follows
from taking the text-only branch.

*Research date 2026-09-15.*

---

## 1 · The plain version

Every pipeline in this folder so far assumes documents are text. Load the file,
cut it into chunks, embed the chunks. Fine — if the meaning is in the words.

Open a real corpus and look at what is actually there. An insurance schedule of
limits is a **table**, and the limit for a coverage is defined by which row and
which column a number sits in. An engineering change notice is a **drawing**
with a callout. A clinical batch record is a **scanned form** with handwriting
in the margin. A quarterly deck is a **chart** where the finding is the shape of
the line and no sentence anywhere states it.

Run a text extractor over any of those and you get words with the structure
thrown away:

```
                                                   ┌── what the extractor emits:
  ┌──────────────────────────────────────┐         │
  │ Coverage          Limit    Deductible│         │  Coverage Limit Deductible
  ├──────────────────────────────────────┤   ───►  │  Collision 50,000 1,000
  │ Collision         50,000       1,000 │         │  Comprehensive 25,000 500
  │ Comprehensive     25,000         500 │         │  Rental 900 0
  │ Rental               900           0 │         │
  └──────────────────────────────────────┘         └── which number is the rental
                                                       deductible? 0, or 900?
```

The answer is recoverable by a careful reader. It is not recoverable by an
embedding, because the embedding was computed over that flattened string and the
spatial relationship — *this number is in the deductible column* — was destroyed
before anything was embedded. **No amount of better retrieval recovers
information that was discarded at load time.**

Multimodal RAG is the family of answers to that. There are two, and they are
genuinely different bets.

---

## 2 · The two families

### Family A — translate to text, then do everything as before

Put a vision model in the ingest path. For every page, figure, table or scan,
generate a textual description; index that description alongside (or instead of)
the extracted text.

```
  page.pdf ──► rasterise ──► VLM: "describe this page, transcribe every table
                                   as markdown, state what each chart shows"
                         ──► text ──► chunk ──► embed ──► the SAME pipeline
```

**For:** nothing downstream changes. Same store, same hybrid search, same
reranker, same tools, same citations. A caption is just a chunk. You can ship it
in an afternoon on top of what you already have.

**Against:** it is lossy in a way you cannot inspect. The VLM decided what
mattered about the page *before it knew the question*. A description that omits
the axis label cannot answer a question about the axis label, and nothing in the
retrieval logs will tell you that is what happened — you will see a confident
wrong answer and go looking at the prompt.

### Family B — never leave the image

Do not describe the page. **Embed the page itself**, as an image, and match
queries directly against it.

**CITED** — Faysse, Sibille, Wu, Omrani, Viaud, Hudelot & Colombo, *ColPali:
Efficient Document Retrieval with Vision Language Models*, arXiv:2407.01449v3
(2024-10-07), ICLR 2025. <https://arxiv.org/abs/2407.01449> (fetched
2026-09-15).

The architecture:

- **PaliGemma-3B** — SigLIP patch embeddings into a Gemma-2B language model.
- A page is processed as **~1024 image patches**, each projected to a **D=128**
  vector. So a page is not one embedding; it is roughly **1024 vectors**.
- Matching is **late interaction** (the ColBERT idea, applied to patches):
  score = for each query token vector, the **maximum** dot product against any
  page patch vector, **summed** over query tokens. *MaxSim.*

Late interaction is what makes this work. A single page vector must summarise
the whole page well enough for every question anyone might ask — the same
bottleneck a bi-encoder has over text, but worse, because a page holds more
unrelated things than a paragraph does. Late interaction defers the comparison:
each query term finds *its own best patch*. A question about a number in a table
cell matches the patch containing that cell, and the rest of the page does not
dilute it.

It is also **inspectable**, which is rare and underrated: superimpose the late
interaction scores on the page image and you get a heatmap of which patches the
query matched. You can *see* why a page was retrieved.

---

## 3 · What this repo does, and the comment that is the fork in the road

```ts
// packages/grounding/src/loader.ts:37-49  — VERBATIM
/**
 * Which extensions get read, and with what.
 *
 * `UnknownHandling.Ignore` is the important flag: without it, a stray `.DS_Store`
 * or a PDF dropped into the corpus throws and the whole ingest dies. Skipping
 * what we cannot read is the behaviour the hand-rolled version had via its
 * extension allow-list, and losing it silently would have been a regression.
 */
const LOADERS = {
  '.md': (p: string) => new TextLoader(p),
  '.markdown': (p: string) => new TextLoader(p),
  '.txt': (p: string) => new TextLoader(p),
};
```

**"a PDF dropped into the corpus […] Skipping what we cannot read."**

That is the decision, made explicitly, for good reasons, and written down. Three
extensions, all text. Everything else is skipped rather than half-parsed — which
is the *right* call when the alternative is a half-parsed PDF entering the index
looking like a real document.

It is also precisely where a multimodal branch would go. `LOADERS` is a map from
extension to loader. `'.pdf'` is one entry. The rest of this document is about
what has to be true before adding it.

### What gets lost when structure goes — measured on this corpus

**MEASURED HERE** — `docs/steering/evals/RETRIEVAL.md`, over all 3,854 passages
of the steering corpus:

| trail shape | passages | |
|---|---|---|
| a real heading trail | 2,835 | `… > 2. Requirements > SR-ALT-08-0181 — …` |
| the document title alone | 467 | |
| **nothing at all** | 293 | every closure report, every MISRA report |
| **a `====` confidentiality banner** | 259 | every CRS |

**552 of 3,854 passages — 14% — have no usable structural label.** 259 of them
have a *decorative banner* where their heading should be. And this is a corpus
of **born-digital markdown**, the friendliest input a loader will ever get.

The consequence is stated in that document and it is the sharp end:

> an unlabelled hit still occupies a top-k slot while being neither a hit nor an
> intruder, so it is **invisible in a recall number**.

That is what "losing structure" costs, concretely, in a pipeline nobody would
call multimodal. Scanned PDFs are the same failure with the volume turned up.

The fix here was not a model. It was **using the path as the label** when the
trail is empty — which is worth carrying into any multimodal design: *before
reaching for a vision model, check whether the structure you need is already
sitting in the filename or the directory.*

---

## 4 · The numbers, cited

**ViDoRe** — the Visual Document Retrieval benchmark introduced with ColPali;
page-level retrieval across domains and languages, on queries needing both
textual and visual understanding.

### Retrieval quality, nDCG@5

| system | avg nDCG@5 |
|---|---|
| Unstructured + OCR (BGE-M3) | 66.1 |
| Unstructured + Captioning (BGE-M3) | 67.0 |
| SigLIP (vanilla, no late interaction) | 51.4 |
| **ColPali** | **81.3** |

+22.6 on figures (ArxivQA), +24.5 on documents (DocVQA), **+32.4 on tables**
(TAT-DQA).

Two readings. The obvious one: 81.3 against 67.0 is a large gap. The more useful
one: **captioning beat OCR by 0.9 points.** Family A, built properly, on this
benchmark, bought less than one point over plain OCR. If you are planning to
caption your way out of this, that is the number to plan against.

And the SigLIP row is the ablation that matters: the *same* vision encoder
without late interaction scores **51.4**, thirty points below ColPali. The win is
not "use a vision model". The win is **late interaction**.

### Indexing latency, per page

| system | per page |
|---|---|
| Unstructured + OCR | ~6 s |
| Unstructured + Captioning | ~10 s |
| **ColPali** | **~0.5 s** |

The counter-intuitive result of the whole paper. The *heavier-looking* method is
**10–20× faster to index**, because it skips the PDF parsing, the layout
detection, the chunking heuristics and the captioning calls entirely. The paper's
own framing:

> optimizing the ingestion pipeline yields much greater performance on visually
> rich document retrieval than optimizing the text embedding model

Query latency is a wash: ~30 ms for ColPali query encoding against ~22 ms for
BGE-M3.

### Storage, which is where the bill arrives

| system | per page |
|---|---|
| BM25 (sparse) | 3.0 KB |
| BGE-M3 (dense, single vector) | 8.6 KB |
| **ColPali (float16 multi-vector)** | **256 KB** |

**~30× BGE-M3, ~85× BM25.** A 100,000-page corpus is ~860 MB of BGE-M3 vectors
and **~25 GB** of ColPali vectors. The paper notes cluster-centroid compression
(the PLAID line of work) can claw back about an order of magnitude — so plan for
2–3 GB with compression you will have to implement, or 25 GB without.

---

## 5 · Code

### Family A — captioning, on top of this repo's existing pipeline

```ts
// ASSEMBLED — illustrative. Not in this repo. This is the cheap branch.
import { fromPath } from 'pdf2pic';

const VISION_PROMPT = `
Transcribe this page for a SEARCH INDEX. You are not summarising; you are
making the page findable and quotable.

1. Every table as a markdown table. Preserve every column header and every
   row label — a number without its row and column is worthless.
2. Every chart: state the axes with units, the series names, and the shape
   of each series in words. If a value is printed, transcribe it.
3. Every figure: what it depicts and every label, callout and annotation.
4. All body text, verbatim, in reading order.
5. Any stamp, banner, watermark or handwriting — especially anything saying
   SUPERSEDED, DRAFT, VOID or CONFIDENTIAL.

Do not interpret. Do not add anything the page does not contain. If part of
the page is illegible, write [illegible] rather than guessing — a guess here
becomes an indexed fact.`;

export async function captionPages(pdfPath: string) {
  const render = fromPath(pdfPath, { density: 200, format: 'png', width: 1654 });
  const pages: Document[] = [];

  for (let n = 1; ; n++) {
    const img = await render(n, { responseType: 'base64' }).catch(() => null);
    if (!img) break;

    const res = await client.responses.create({
      model: env.VISION_MODEL,
      input: [{ role: 'user', content: [
        { type: 'input_text',  text: VISION_PROMPT },
        { type: 'input_image', image_url: `data:image/png;base64,${img.base64}` },
      ] }],
    });

    pages.push({
      id: `${basename(pdfPath)}#p${n}`,
      text: res.output_text,
      // KEEP THE IMAGE PATH. Retrieval finds the caption; GENERATION should be
      // handed the ORIGINAL PAGE. Answering from a description of a table when
      // the table itself is available is a lossy step you do not have to take.
      metadata: { sourcePdf: pdfPath, page: n, image: img.path, derived: 'vlm-caption' },
    });
  }
  return pages;
}
```

Point 5 of that prompt is not decoration. §5–§6 of [`CORRECTIVE.md`](CORRECTIVE.md)
is entirely about superseded documents outranking live ones. On a scanned
document, *"SUPERSEDED" is frequently a rubber stamp across the page and appears
in no text layer at all.* A caption prompt that does not ask for stamps produces
an index in which dead documents are indistinguishable from live ones.

And `derived: 'vlm-caption'` in the metadata: **a chunk that a model wrote must
be marked as such.** Otherwise a hallucinated table cell is cited to a page
number and looks exactly like a quotation.

### Family B — MaxSim, which is twenty lines

```ts
// ASSEMBLED — late interaction, in full. This is the entire scoring mechanism.
//
//   score(q, page) = Σ over query token vectors  max over page patch vectors
//                        of the dot product
//
// Compare a bi-encoder: ONE query vector · ONE page vector. Late interaction
// lets each query token find its own best patch, which is why a question about
// one cell of a table is not diluted by the other 40 rows.

export function maxSim(query: Float32Array[], page: Float32Array[]): number {
  let total = 0;
  for (const q of query) {          // ~15 query token vectors
    let best = -Infinity;
    for (const p of page) {         // ~1024 patch vectors
      let dot = 0;
      for (let d = 0; d < q.length; d++) dot += q[d] * p[d];   // D = 128
      if (dot > best) best = dot;
    }
    total += best;                  // SUM of maxima — not max of sums
  }
  return total;
}
```

```ts
// ASSEMBLED — and the reason you cannot just put this in pgvector.
//
// pgvector indexes ONE vector per row. A page is ~1024 vectors, so the options
// are all compromises:
//
//  (a) one ROW PER PATCH: 1024 rows per page, ANN over patches, then group by
//      page and MaxSim the survivors. Works. The index is 1024× the rows, and
//      "top-k patches" is not "top-k pages" — you must over-fetch hard.
//
//  (b) A PRE-FILTER: a single pooled vector per page for cheap ANN recall, then
//      exact MaxSim over the top ~100 pages. This is the practical shape, and
//      it is the SAME over-fetch-then-rescore pattern as the cross-encoder
//      reranker in packages/grounding/src/rerank.ts — with the SAME ceiling:
//      MaxSim cannot retrieve a page the pooled vector missed.
//
//  (c) A store built for it — Vespa, Qdrant multivector, LanceDB. A new
//      dependency, a new operational surface, and at most engagements a new
//      procurement conversation.

async function retrievePages(queryVectors: Float32Array[], k = 5) {
  const pooled = meanPool(queryVectors);
  const candidates = await pgvectorTopK(pooled, 100);        // (b), stage 1
  return candidates
    .map((c) => ({ page: c, score: maxSim(queryVectors, c.patchVectors) })) // stage 2
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
```

### The part everybody forgets: generation

```ts
// ASSEMBLED. Retrieval is half the problem and the other half is usually skipped.
export async function answerFromPages(question: string, pages: RetrievedPage[]) {
  return client.responses.parse({
    model: env.VISION_MODEL,
    input: [
      { role: 'system', content:
          'Answer from the page images provided. Cite page numbers. '
        + 'If the answer is in a table, state the ROW and COLUMN you read it '
        + 'from — that is how a reviewer checks you, and how you catch yourself '
        + 'reading the wrong column.' },
      { role: 'user', content: [
        { type: 'input_text', text: question },
        // THE IMAGES, not the captions. You retrieved by image; answer by image.
        ...pages.map((p) => ({ type: 'input_image' as const, image_url: p.dataUrl })),
      ] },
    ],
    text: { format: zodTextFormat(AnswerSchema, 'answer') },
  });
}
```

**Images are expensive in the context window.** A full-page image at reasonable
resolution costs on the order of a thousand-plus tokens. Five pages is more
context than most text RAG uses for an entire question, and it re-sends every
turn in an agentic loop (see [`AGENTIC.md`](AGENTIC.md) §5). Multimodal
generation and multi-turn tool loops are both individually affordable and
together are how a token budget disappears.

---

## 6 · Deciding between them

```
  Is the meaning in the LAYOUT?
    (tables where position determines meaning, charts, drawings, scans,
     stamps, handwriting, forms)
      │
      ├── no ──────────────► TEXT RAG. You are done. Do not build this.
      │                      (Every corpus in this repo is here.)
      │
      └── yes
           │
           ├── < ~10k pages, and it mostly needs to be *searchable* ?
           │      └──► FAMILY A, captioning. Nothing downstream changes.
           │           Budget ~6–10 s/page of index time and accept that the
           │           caption decided what mattered before it knew the question.
           │
           └── large, or high-stakes, or the questions are unpredictable ?
                  └──► FAMILY B, ColPali-style.
                       Budget ~0.5 s/page index, ~256 KB/page storage, and a
                       store that does multi-vector — or the two-stage
                       pre-filter in §5.
```

---

## 7 · When NOT to use it

| | |
|---|---|
| **Your corpus is born-digital text.** | All three engagements here are markdown. Multimodal buys exactly nothing and costs an ingest path. |
| **You have not measured what text-only loses.** | §3: 14% of passages here have no usable label, and it took a retrieval suite to see it. Build the instrument before the fix — the repo's own rule: *"Adding a reranker now is guessing it helps; adding it after gives you 'the reranker bought 7 points.'"* |
| **Storage is capped.** | 256 KB/page. 100k pages ≈ 25 GB before compression you have to implement. |
| **You need exact quotation.** | Family A quotes a *description*. If a regulator will read the citation, the citation must be the page. |
| **You cannot mark derived text.** | A VLM caption is generated content in the index. Unmarked, a hallucinated cell is cited to a page number and looks like a quotation. |
| **Latency is user-facing.** | Family B's retrieval is fine (~30 ms). Its *generation* sends page images, and that is not fast. |

---

## 8 · Figure data for the UI

```jsonc
// FIG-MMD-1 · <Stages> — the two families side by side. NOTE the shared tail.
{ "familyA": [
    { "verb": "rasterise", "out": "page.png @200dpi",        "does": "one image per page" },
    { "verb": "caption",   "out": "markdown text",           "does": "A VLM CALL PER PAGE, ~6–10 s", "rule": "lossy: the caption chose before it knew the question" },
    { "verb": "chunk",     "out": "Chunk[]",                 "does": "…and now it is the ordinary pipeline" },
    { "verb": "embed",     "out": "float[1536]",             "does": "the SAME store, search, reranker, tools" } ],
  "familyB": [
    { "verb": "rasterise", "out": "page.png",                "does": "one image per page" },
    { "verb": "encode",    "out": "~1024 × float[128]",      "does": "SigLIP patches through PaliGemma-3B, ~0.5 s", "rule": "nothing is transcribed; nothing is discarded" },
    { "verb": "store",     "out": "256 KB / page",           "does": "multi-vector. pgvector indexes ONE vector per row — see §5" },
    { "verb": "maxsim",    "out": "score per page",          "does": "Σ over query tokens of max over patches" } ] }

// FIG-MMD-2 · <BarRows> — CITED, ViDoRe avg nDCG@5.
// UI: the SigLIP row is the ablation and must stay — it says the win is LATE
// INTERACTION, not "use a vision model".
[ { "label": "SigLIP (no late interaction)", "value": 51.4 },
  { "label": "Unstructured + OCR",           "value": 66.1 },
  { "label": "Unstructured + Captioning",    "value": 67.0, "detail": "+0.9 over OCR — family A's real ceiling" },
  { "label": "ColPali",                      "value": 81.3 } ]

// FIG-MMD-3 · <BarRows> — CITED, indexing seconds per page. THE COUNTER-INTUITIVE ONE.
[ { "label": "Unstructured + Captioning", "value": 10.0 },
  { "label": "Unstructured + OCR",        "value": 6.0 },
  { "label": "ColPali",                   "value": 0.5, "detail": "10–20× faster — it skips the parsing entirely" } ]

// FIG-MMD-4 · <BarRows> — CITED, KB per page. THE BILL. Log scale.
[ { "label": "BM25 (sparse)",   "value": 3.0 },
  { "label": "BGE-M3 (dense)",  "value": 8.6 },
  { "label": "ColPali (fp16)",  "value": 256.0, "detail": "~30× BGE-M3 · 100k pages ≈ 25 GB" } ]

// FIG-MMD-5 · <BarRows> — MEASURED HERE. What text-only loses, on BORN-DIGITAL MARKDOWN.
[ { "label": "a real heading trail",      "value": 2835 },
  { "label": "the document title alone",  "value": 467 },
  { "label": "nothing at all",            "value": 293, "detail": "every closure report, every MISRA report" },
  { "label": "a ==== confidentiality banner", "value": 259, "detail": "every CRS — decoration where a heading should be" } ]

// FIG-MMD-6 · <Matrix> — the §6 decision
[ { "row": "meaning is in the prose",        "text": "yes", "captions": "no",    "colpali": "no" },
  { "row": "tables where position matters",  "text": "no",  "captions": "ok",    "colpali": "best — +32.4 on TAT-DQA" },
  { "row": "charts and drawings",            "text": "no",  "captions": "ok",    "colpali": "best" },
  { "row": "scans, stamps, handwriting",     "text": "no",  "captions": "ok",    "colpali": "best" },
  { "row": "must quote the page exactly",    "text": "yes", "captions": "NO",    "colpali": "yes" },
  { "row": "storage is capped",              "text": "yes", "captions": "yes",   "colpali": "no — 256 KB/page" } ]
```

---

## 9 · Run the nearest thing that exists

There is no multimodal path here. What you can run is the measurement that would
tell you whether you need one:

| command | what it does | cost |
|---|---|---|
| `pnpm steering:corpus-check` | what is in the corpus and what the loader accepted | free |
| `pnpm steering:retrieval-eval --show-labels closure-reports` | the unlabelled passages of §3, listed | free |
| `pnpm chunks` | the insurance corpus and its chunking, printed | free |

---

## Sources

- Faysse et al., *ColPali: Efficient Document Retrieval with Vision Language Models*, arXiv:2407.01449, ICLR 2025 — <https://arxiv.org/abs/2407.01449>
- Khattab & Zaharia, *ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT*, SIGIR 2020 — <https://arxiv.org/abs/2004.12832> (where late interaction comes from)
- Santhanam et al., *PLAID: An Efficient Engine for Late Interaction Retrieval*, CIKM 2022 — <https://arxiv.org/abs/2205.09707> (the compression referenced in §4)

In-repo: `packages/grounding/src/loader.ts` · `packages/grounding/src/rerank.ts`
· `docs/steering/evals/RETRIEVAL.md`
