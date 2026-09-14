# The R in RAG — parse, chunk, embed, index, retrieve, and what each word buys

*Written 2026-09-14, from the code and from commands re-run the same day. Every
number below was printed by a command named next to it; every "what it actually
does" line was read out of the shipped file.*

Companions: [`ENGINES.md`](ENGINES.md) is the other half — once passages are
retrieved, that is what drives the loop that reads them.
[`steering/GROUNDING-WALKTHROUGH.md`](steering/GROUNDING-WALKTHROUGH.md) is the
**file-by-file trace of one question through one corpus**; this document is the
other axis — what each stage *is*, cross-engagement, and what the machine
literally does. Read that one to follow a question; read this one to know what
the words mean.

---

## The one-paragraph version

Retrieval is a **database query**, not a model. Before anyone asks anything, the
corpus is read, cut into passages, turned into numbers, and written to Postgres.
At ask time a question becomes numbers too, Postgres returns the nearest rows
plus the rows that literally contain the words, the two lists are merged by
*position*, and the surviving passages go into the prompt as text. **No step
between the corpus and the prompt involves a language model** — except embedding,
which is a model that only ever produces coordinates. The judgment ("does this
clause answer the question") happens afterwards, in the loop, and belongs there.

```
INGEST  (once, offline, costs pennies)     ASK  (per question, costs a query)
  parse → chunk → embed → index              route → retrieve → fuse → gate → cite
```

---

## 1 · The vocabulary, and which of these this repo actually does

Most of the confusion in RAG is that ten different operations share five words.

| Word | What it actually means | Here? | Where |
|---|---|---|---|
| **Load** | get bytes off a disk / an API | ✅ | `loader.ts` — LangChain `DirectoryLoader` |
| **Parse** *(in)* | pull *structure* out of a document: headings, tables, metadata fields | ✅ | `markdown-it` in `chunker.ts`; banner fields in `document-source.ts` |
| **Chunk** | cut a document into passages small enough to retrieve and big enough to mean something | ✅ **hand-written** | `chunker.ts`, `code-chunker.ts` |
| **Embed** | turn a passage into a fixed-length list of numbers whose *direction* encodes meaning | ✅ | `embeddings.ts` + `openai-embeddings.ts` |
| **Index** | store those numbers so "nearest" is a fast query, plus a second index over the words | ✅ | `store.ts` (pgvector) + `hybrid.ts` (tsvector/GIN) |
| **Retrieve** | ask the index for candidates | ✅ **two arms** | `hybrid.ts` |
| **Rank** | order candidates within one arm | ✅ | cosine distance; `ts_rank` |
| **Fuse** | merge two rankings into one | ✅ RRF | `hybrid.ts`, `RRF_K = 60` |
| **Filter / gate** | drop candidates by metadata, before or after ranking | ✅ **both** | `search-policy.tool.ts` |
| **Rerank** | a *second model* re-scores the shortlist (cross-encoder, LLM-as-judge) | ❌ **none** | — |
| **Query rewriting** | a model rephrases the question before searching | ❌ none as a stage | the model just searches again |
| **Route** | choose *which* retriever/tool the question goes to | ✅ | three tools, and the model picks |
| **Parse** *(out)* | check the model's own citation names a real document | ✅ | `corpus-index.ts` |
| **Extract** | a model reads documents and writes *structured fields* into a database | ✅ — **and it is not retrieval** | `steering/src/derived/extract/` |

> **On "no reranker":** there is no cross-encoder and no LLM re-scoring pass
> (`grep` confirms). But RRF *is* a re-order, so the honest line is **"fusion by
> rank is the only re-ordering, and it uses no model."**

---

## 2 · The chart — stages and the shape of the data between them

```
 ══ INGEST ═══════════════════════════════════════════════════════════════════

   files / a DMS / a customer API
        │
        │  LOAD          allow-list of extensions; unreadable files SKIPPED
        ▼
   Document { id, text, hash }              ← id is the path; hash is content
        │
        │  PARSE         markdown-it AST → where headings are, where tables are
        │                blockquote banner → Key: Value metadata fields
        ▼
   SourceDocument { documentId, docType, status, effectiveOn, facets, … }
        │                                    ← precedence metadata. NULLABLE.
        │  CHUNK         split on headings first, then window at ~1200 chars
        │                · every chunk keeps its HEADING TRAIL
        │                · tables never split from their header row
        │                · startLine recorded, so a citation can point
        ▼
   Chunk { text = "trail\n\nbody", body, headings[], startLine, index }
        │
        │  EMBED         batches of 96 → one vector per chunk
        │                hosted: 1536 numbers · local bge-small: 384
        ▼
   number[]  +  metadata
        │
        │  INDEX         insert into Postgres
        ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ document_chunks                                                │
   │   id · vector(pgvector, cosine) · content · metadata(jsonb)    │
   │   content_ts   tsvector  GENERATED ALWAYS AS (…) STORED  + GIN │
   └────────────────────────────────────────────────────────────────┘
          ▲ dense arm reads `vector`      ▲ sparse arm reads `content_ts`


 ══ ASK ══════════════════════════════════════════════════════════════════════

   question
        │
        │  ROUTE         the MODEL picks a tool. Not a classifier.
        ▼
   ┌──────────────────┬───────────────────┬────────────────────────┐
   │ get_policyholder │  search_policy    │  search_guidance       │
   │ exact key lookup │  contract docs    │  bulletins, circulars, │
   │ NO SEARCH        │  only             │  determinations        │
   └────────┬─────────┴─────────┬─────────┴───────────┬────────────┘
            │                   │                     │
            │ one record        │  FILTER-THEN-RANK: metadata filter
            │ verbatim          │  goes to Postgres, not to a post-filter
            │                   ▼
            │        ┌──────────────────────┬──────────────────────┐
            │        │   DENSE arm          │   SPARSE arm         │
            │        │   embed the question │   to_tsquery(a|b|c)  │
            │        │   ORDER BY <=>       │   ORDER BY ts_rank   │
            │        │   ~120 rows          │   ~120 rows          │
            │        └───────────┬──────────┴──────────┬───────────┘
            │                    └────────┬────────────┘
            │                       FUSE  │  score = Σ 1/(60 + rank)
            │                             │  magnitudes thrown away
            │                             ▼
            │                    GATE  docType ∈ contract types
            │                          status ∉ {superseded, withdrawn, …}
            │                             │
            │                             ▼  top k (default 5)
            └──────────────┬──────────────┘
                           ▼
                  passages as TEXT in the prompt
                           │
                           ▼   the loop reads them  → ENGINES.md
                     answer + citations
                           │
                           │  PARSE (out)  does the cited id name a real doc?
                           ▼               offline, free, no database
                     eval verdict
```

---

## 3 · Ingest, stage by stage — and the bug that set each rule

### Parse — two different parses, and only one is about text

**Structure.** `markdown-it`, not regex. A regex of the form `/^(#{1,6})\s+/`
cannot know it is inside a fenced code block, so a line reading `# total` in an
example becomes a heading and **silently reshapes every chunk boundary after
it**. The parser's tokens also carry `map: [startLine, endLine]`, which is
exactly what the windowing needs. (`remark`/`unified` is the obvious choice and
was rejected: ESM-only at v11, and this project is CommonJS.)

**Metadata.** A leading blockquote of `Key: Value` pairs separated by `·`. Kept
*in* the document rather than in a sidecar so the document and the facts about it
stay in one reviewable diff. The quoted lines are joined with **newlines, not
spaces** — joining with a space let the value pattern run past the end of the
line and swallow the next sentence, which lost seven effective dates before
anyone noticed.

### Chunk — the highest-leverage file in the path, and deliberately not a library's

LangChain.js ships five text splitters. **Not one attaches the heading trail to
the chunk as metadata** — the Python `MarkdownHeaderTextSplitter` has no JS
equivalent. In a corpus of near-identical documents that is fatal:

> A retrieved fragment reading *"we will pay $40 per day"* is worthless. Twelve
> near-identical forms each contain that sentence with a different number.
> Prefixed with `PP 03 24 06 24 — … > Part IV > 4.4 Rental Reimbursement`, it is
> answerable **and** citable.

Three rules, all **policy** rather than parsing — which is exactly why no package
will ever ship them:

1. **Heading-aware first.** Blind N-character windows cut clauses in half.
2. **Every chunk carries its trail.** A few tokens per chunk; the single
   highest-value thing in the whole ingest.
3. **A table is never split from its header row.** `$1,000` with no column name
   retrieves well, reads authoritatively, and means nothing. An oversized table
   is split with the header rows **repeated** on every piece.

`startLine` exists for a reason worth generalising: the answer schema required a
line number, the passages carried none, and the model **wrote `1`, four times out
of five**, producing citations that looked entirely real.

> **A required field a model cannot source is a field it will fabricate.** The
> fix belonged in the chunker — which had always known the line and threw it
> away — not in the schema.

**A different corpus needs a different chunker.** Steering's C source is cut
**one chunk per function**, plus the file banner as its own chunk, with only the
calibration-table rows a function names by reference copied onto it. Copying the
whole 500–900-byte banner onto each 100–300-byte function was the obvious repair
and a bad one: six chunks from one file would be ~80% identical text, embed to
nearly the same vector, and destroy the precision that chunking by function is
*for*.

### Embed — plumbing, and the one bug available at this layer

An embedding is a fixed-length list of numbers. Nothing more. Similar meanings
point in similar directions; that is the entire mechanism.

What surrounds the call is where it goes wrong, and `embeddings.ts` handles all
of it once:

| | |
|---|---|
| **Batching** | every hosted API caps one request. 96 is Azure's practical cap. |
| **Ordering** | **the response carries an `index` and it is authoritative.** Trusting arrival order attaches every vector to the wrong passage — no error, no crash, retrieval that merely seems poor. The most expensive mistake available here. |
| **Usage** | tokens are per-request, so they accumulate across batches. |
| **Query prefix** | asymmetric models (bge) embed passages bare and questions behind an instruction. Omitting it costs real accuracy and **nothing looks broken**. |

`EMBEDDINGS=local` swaps to bge-small — 384 dimensions against 1536, no
credentials, no network after the first download. **The two are not comparable.**
Switching means re-ingesting, and any retrieval measurement under one is
meaningless against the other.

### Index — why Postgres, and why that is not a technical argument

pgvector is the default because *"can we run Postgres"* is never a blocker —
every organisation has it, every cloud has a managed one, and it runs on-prem for
a customer who will not let regulated data leave the building. *"Can we stand up
a vector database"* is a new infrastructure conversation with a team that has not
met you yet. **Picking the thing that does not need a meeting is an FDE skill.**

The full-text half is a **generated column**, not a trigger:

```sql
alter table document_chunks add column if not exists content_ts tsvector
  generated always as (to_tsvector('english', content)) stored;
create index … using gin (content_ts);
```

A trigger can be dropped. A generated column **cannot be out of date**. It is
created during ingest rather than in `openStore`, so opening the index to *read*
never issues DDL — which a read-only database role would refuse.

---

## 4 · Ask time

### Route — three tools, and the split only works if both sides honour it

| Tool | Serves | Rule |
|---|---|---|
| `get_policyholder` | 18 records | exact id, **never** fuzzy. One right answer per question. |
| `search_policy` | forms, endorsements, amendatory, schedules | what the policy **pays** |
| `search_guidance` | bulletins, circulars, procedures, determinations, opinions | how the claim is **handled** |

`search_guidance` was added and `search_policy` was not narrowed to match — so a
traced run returned bulletins, circulars and a coverage opinion *through the
coverage tool*, while `search_guidance` was never called once in ten tool calls.

> **A split that only one side honours is not a split. It is a second tool the
> model has no reason to reach for.**

The same trace priced the routing: **6 tool calls and 43k tokens when the model
routed well, 11 calls and 122k when it did not.** Routing is not a footnote to
retrieval; it is most of the bill.

The mitigation shipped with the split: when a question touches amounts a form
usually does not state — sales tax on a total loss, claim deadlines, salvage —
`search_policy` *says so in its own result*, because a form's **silence is not an
answer**.

### Retrieve — two arms, because embeddings are worst at exactly the words that matter

A traced run of the rideshare question made **ten searches in one question**,
hunting for the literal strings *"livery"*, *"for hire"*, *"transportation
network"*. A rare legal term has few neighbours in embedding space; a keyword
index finds it in one hop.

Postgres full-text, **not a BM25 package**: both arms live in one store,
maintained by one ingest, so they cannot drift. An in-memory BM25 index is a
second copy of the corpus with its own staleness bug, and nothing about a stale
second copy looks wrong from the outside.

**Every built-in tsquery converter ANDs its terms.** `plainto_tsquery`,
`websearch_to_tsquery` and `phraseto_tsquery` all require a document to contain
*every* word — the first version used one and therefore **returned nothing,
ever**, while looking fine, because the dense arm still carried results and no
error was thrown. So the query is built by hand: strip to `[a-z0-9]`, drop
one-character fragments, join with `|`. Sanitising that hard also makes injection
impossible by construction.

A keyword-arm failure is **reported, never silent** — `fullText: false` reaches
the model as a note saying the results are vector-only.

### The fetch arithmetic, which is larger than it looks

```
  k (default 5)
    × 6      search_policy over-fetches, because the gates below drop rows
    × 4      hybridSearch's overFetch, so a doc ranked well by ONE arm
             still has a rank in BOTH lists
  = ~120 rows per arm, ~240 candidates fused, gated, sliced to 5
```

Fusing two top-5s would mostly fuse two copies of the same five.

### Fuse — reciprocal rank, and why not just add the scores

A cosine distance and a `ts_rank` are **different units on different scales**.
Adding or averaging them is meaningless and whichever has the larger range wins.
RRF throws magnitudes away and uses only position:

```
score(d) = Σ  1 / (60 + rank_in_that_list)
```

A document ranked 2nd by vectors and 30th by keywords beats one ranked 1st by
keywords and nowhere by vectors. `K=60` is the original paper's value; it
flattens rank 1 against rank 2 so one list cannot dominate.

### Gate — filter before ranking, and again after

**Before:** the form-id filter goes into the SQL, not a post-filter. Twelve forms
each have a section 4.4 saying rental reimbursement is *some* dollar amount.
Ranking first and filtering after leaves the top k already full of the wrong
forms.

**After:** document type ∈ contract types, and status ∉ {superseded, withdrawn,
rescinded}. A run once returned a superseded circular and **two superseded form
editions paying different amounts**.

Both gates let `null`/`unknown` **pass**. A missing value is not evidence of the
wrong type, and a document whose status cannot be read is not thereby dead.

### No score cutoff — on purpose, and this is the load-bearing one

Similarity ranks **topical relevance**. It cannot tell you whether the answer is
present. Measured directly on the predecessor system: an *unanswerable* question
scored **0.572** while an *answerable* one scored **0.472**. A threshold would
have rejected the real question and admitted the impossible one.

Sharper here: *"is a rideshare driver covered?"* retrieves the exclusion about
transporting goods for a fee at a high score, because it is the most topically
adjacent clause in the corpus. It is also not the answer — that exclusion is
about goods, not passengers, and rideshare appears in **none** of the documents.

> **Whether a retrieved clause APPLIES is reading comprehension. It belongs to
> the model, not to a number.** Deciding "the answer isn't in the corpus" is the
> product; a similarity threshold is a way of pretending it is arithmetic.

---

## 5 · The number the model is shown — read the arithmetic, not the comment

`search_policy` reports a `similarity` per passage. Traced through the code as
it stands today:

```
hybrid.ts     r.score = r.score / best          → best result is exactly 1.000
search-policy   fusedHits.map(h => [doc, 1 - h.score])
search-policy   similarity: (1 - score)         → 1 - (1 - h.score) = h.score
```

So **`similarity` is the normalised RRF score**: the top hit reports `1.000` by
construction, every run, regardless of whether anything matched. It is a
*relative* position within one result set and has **no absolute scale at all**.

That is fine — the tool description already tells the model, correctly, that the
number is not a confidence signal. But the in-file comment still explains it as
`1 - cosine distance`, which was true before hybrid search landed and is not true
now. Worth fixing; noted here rather than silently changed.

---

## 6 · The parse on the way *out* — the cheapest high-value check in the system

A grounded system's most valuable question is **"does this cited source name a
document that exists?"** — and it is free, because the corpus is right there.
`corpus-index.ts` reads the files (not the database, so an eval runs offline and
for nothing) and resolves what the model wrote.

The rule is the same one that governs form ids, pointing the other way:

> **Lenient about spelling. Strict about identity.**

A model punctuates a citation however it likes — with a `#`, with an em dash,
with the whole heading trail appended, in the wrong case. Every one of those is a
real citation of a real document, and **rejecting it reports honest work as
fabrication**. That happened three separate times in one day on this corpus, and
each time it poisoned the metric being steered by.

What must *not* be lenient is **which** document. `PP 00 01 01 15`,
`PP 00 01 09 18` and `PP 00 01 06 24` are the same form three editions apart,
paying $30, $35 and $40 a day. An earlier version matched with `startsWith` and
silently merged five state variants with five different liability limits —
returning the wrong number **with a citation attached**, and nothing in the
output looked broken.

---

## 7 · Two things that are NOT retrieval, and must not become it

### Records are fetched, not searched

|  | Documents | Records |
|---|---|---|
| Lives in | a DMS — FileNet, SharePoint, a CMS | a system of record — policy admin, CRM, ERP |
| Accessed by | **meaning**. No single key. | **exact key**. One right answer. |
| Here | `search_policy` / `search_guidance` | `get_policyholder` |

A customer's deductible is $1,000 — full stop, not *"the five most
customer-shaped chunks."* Now that a `documents` table exists, putting records in
it would be one afternoon's work and would quietly undo the thing the design
rests on. **A record fetched from a vector-searched table is a search waiting to
happen, and a search returns what is similar, not what is true.**

### Extraction runs a model over documents and writes columns

`steering:derived-extract` is the opposite direction from retrieval: instead of
fetching passages *for* a question, a model reads each document once and writes
**structured fields** into a derived database, which is then queried normally.

Two transferable rules came out of its first paid run:

- **The sample is chosen from the documents, never from the answer key.**
  Selecting the hard cases by the thing being measured is leakage, and the score
  flatters itself. A fixed quota does the job instead.
- **The model's answers hit disk before anything else happens.** The first paid
  run extracted ten documents correctly, then threw the lot away when the
  database insert failed and the transaction rolled back. The work was done, the
  money was spent, nothing survived. `--from-cache` replays with no API calls.
  **Anything expensive and non-repeatable should be durable before the cheap,
  fallible step that follows it.**

`--dry-run` on both `derived:extract` and `steering:index` spends nothing: the
run that costs money should never be the run that tells you the file list was
wrong.

---

## 8 · The three corpora, measured

All re-measured 2026-09-14 — `pnpm --filter <pkg> chunks`, and for steering
`pnpm --filter @vantis/steering index --dry-run`. Offline, free, no database,
nothing embedded.

| | insurance | pharma | steering |
|---|---|---|---|
| Documents indexed | **79** | **5** | **922** |
| Passages @ 1200 chars | **555** | **75** | **3,854** (1,667k chars) |
| Orphaned table rows | **0** | **0** | — |
| Distinct identifiers | 12 form ids | 5 (two revision pairs) | path-derived |
| Chunkers in play | markdown | markdown | markdown **+ code** |

Steering's 922 is 702 markdown/text documents plus **220 `.c`/`.h` files through
the separate code chunker** — which is newer than
[`GROUNDING-WALKTHROUGH.md`](steering/GROUNDING-WALKTHROUGH.md), where the source
files are still listed as a known gap and the count is 702 → 2,827. The
walkthrough is right about the day it was written; this table is today's.

**Why the sweep runs four budgets, and it is not a stress test.** At the default
1200 no section in these corpora is long enough to force a split — so the
splitting path never executes and the orphan count reports `0` for code that has
**never once run**. The hostile budgets (400/200/120) are the *negative control*:
they force the split, and if orphans stay at zero even at 120 characters, then
the orphan rule itself works. A check that cannot fail reads like evidence while
proving nothing.

---

## 9 · What asserts this, and what none of it proves

```bash
pnpm --filter @claims/insurance chunks         # the sweep above. offline, free
pnpm --filter @claims/insurance corpus:check   # file source vs DB source, fingerprinted
pnpm --filter @meridian/pharma retrieval:check # the retrieval SCORER, offline
pnpm --filter @meridian/pharma retrieval:eval  # live retrieval, needs the index
pnpm --filter @vantis/steering code-chunk:check
pnpm leak:check                                # no domain words in @fde/*
```

`corpus:check` is the one worth copying. It fingerprints **everything the vector
store would receive** — embedded text *and* metadata — from two sources and
asserts they agree, at the cost of one read and no embeddings. It exists because
"it is only a refactor" is how an index gets silently rewritten, and it caught a
source returning the same 555 chunks in a **different order**, which renumbers
every chunk id and would have rewritten every citation the model emits.

Key order is normalised before hashing (Postgres reorders `jsonb`, so identical
data hashed differently and the first version reported a FAIL on a byte-identical
corpus). And it carries a **negative control**: it reverses document order — the
exact bug it was built to catch — and asserts the fingerprint moves. If that ever
stops failing, the comparison above it has gone blind.

### What none of it proves

| | |
|---|---|
| **No recall@k or nDCG number exists for insurance.** | Pharma has `retrieval:eval`, which scores the *ranking*. Insurance's only retrieval signal is `citations_resolve` (§6) — it catches an **invented** source but says nothing about whether the right passage was ranked first, or retrieved at all. A model can cite a real document and still have been served the wrong one; that is exactly how a retrieval failure hides behind a green answer check. |
| **Orphan count is the only chunk-quality metric.** | It catches a table row severed from its header. It says nothing about a clause split mid-sentence. |
| **There is no reranker, and no measurement saying one would help.** | Its absence is a gap named, not a decision defended. |
| **`similarity` is a within-result-set rank, not a quality score.** | §5. The top hit is `1.000` on every query ever made, including one that matched nothing useful. |
| **`CLAUDE.md` and several file comments cite `pnpm chunks`, `pnpm ingest`, `pnpm query`, `pnpm corpus:check` at the repo root.** | Those scripts exist only in `packages/insurance/package.json`; at the root they are not defined. Use the `--filter` form above. |
