# Grounding, file by file — a code walkthrough

*Written 2026-09-13, after `steering:retrieval-check` passed 5/0. Traces one
question from a file on disk to a cited passage, naming every file it touches and
why each is shaped the way it is. No prior knowledge of this package assumed.*

**The question we will follow:**

> what ASIL is the damping software developed to?

**The answer it produced:** four documents, in three directories, in two formats,
disagreeing with each other — a requirement saying ASIL D, a design note saying D
and flagged stale, a static-analysis report saying B. Nobody told it those files
were related.

---

## The shape of it

```
  docs/steering/corpus/           702 files on disk
        |
        |  loadDirectory                    @fde/grounding/loader.ts
        v
  Document { id, text, path }
        |
        |  fileDocumentSource(dir, DOMAIN)  @fde/grounding/document-source.ts
        |  + STEERING_DOCUMENTS             steering/config/steering-documents.ts
        v
  SourceDocument { documentId, docType, facets, status, ... }
        |
        |  chunkAll                          @fde/grounding/chunker.ts
        v
  Chunk[]  2,827 passages, each carrying its heading trail
        |
        |  openStore + addDocuments          @fde/grounding/store.ts
        |  embeddings                        steering/grounding/embeddings.factory.ts
        |                                 -> @fde/grounding/openai-embeddings.ts
        v
  vst_derived.document_chunks  (vector + content + metadata)
        |
        |  ensureFullTextIndex               @fde/grounding/hybrid.ts
        v
  + content_ts  (generated tsvector column, GIN index)

  ---- ask time ----

  question
        |
        |  hybridSearch                      @fde/grounding/hybrid.ts
        |    dense arm: vector similarity
        |    sparse arm: to_tsquery + ts_rank
        |    fused by reciprocal rank
        v
  searchDocuments                            steering/tools/departments/documents.ts
        v
  Passage[]  text + file + type + programme + how it was found
```

Eleven files. **Nine of them are `@fde/grounding` and shared by three customers.
Two are steering's.** That ratio is the whole argument of the package split, and
it is checkable rather than asserted: adding steering required no edit inside
`@fde/grounding` at all.

---

## 1 · The input — `docs/steering/corpus/`

702 markdown and text files. Specifications, safety assessments, module manuals,
static-analysis reports, closure reports, quotations, release notes.

Not source code. `loadDirectory` reads `.md` and `.txt`; the 220 `.c` and `.h`
files are **not indexed**, and that is a known gap rather than an oversight — see
the last section.

At a real engagement this directory is a mount of the customer's share.
`STEERING_CORPUS_DIR` points elsewhere and nothing else changes.

---

## 2 · The domain descriptor — `steering/config/steering-documents.ts`

**The 10%.** One object holding everything about this corpus that is a steering
supplier's paperwork rather than retrieval.

```ts
export const STEERING_DOCUMENTS: DocumentDomain = {
  name: 'steering-eps',
  idFields: ['reference', 'baseline', 'document'],
  classify(id) { ... },            // path shape -> document type
  retiredStatuses: ['superseded', 'withdrawn', 'obsolete'],
  relationFields: { supersedes: 'supersedes', ... },
  facets(fields, doc) { ... },     // programme, repo, revision
};
```

**`classify` keys on the file PATH, not on a header field**, and that is a
statement about this customer rather than a shortcut: their documents carry no
`Document type:` line. The only reliable signal of what a file *is* is where
somebody filed it — exactly the sort of thing that cannot be guessed from code
and has to be written down by whoever looked.

**Why the types are the ones they are.** Not because a steering programme
produces eleven kinds of document — it produces more — but because these answer
*different questions*, and mixing them is how a plausible wrong answer is made.
`safety_assessment` is split out from `module_doc` deliberately: there is exactly
one such file in 702, it holds the most valuable sentence in the estate, and a
search returning it among twenty module manuals has technically succeeded and
practically failed.

**`retiredStatuses` excludes `unknown` on purpose.** A document whose status
cannot be read is not thereby dead, and treating it as dead hides real content
silently.

---

## 3 · Loading — `@fde/grounding/loader.ts`

`loadDirectory(root)` walks the tree and returns `{ id, text, path }` per file.
An extension allow-list decides what is read. Generic; nothing domain-specific.

---

## 4 · Giving a file an identity — `@fde/grounding/document-source.ts`

`fileDocumentSource(dir, domain)` turns each loaded file into a `SourceDocument`:

```ts
{ documentId, docType, title, body, edition, effectiveOn, expiresOn,
  status, facets, relations, contentSha, sourcePath }
```

Two decisions here that took a bug each to learn:

- **Identity is the FILE, not its parent.** Two documents can legitimately share
  a programme id, and keying on the parent merges them into one row.
- **`facets` is one `jsonb` column.** Programme, repo and revision go in there
  rather than into columns, which is why a new customer is configuration and not
  a schema migration.

---

## 5 · Cutting — `@fde/grounding/chunker.ts`

The highest-leverage file in the whole path, and the one where a library would
have been the wrong answer.

Three rules, all of them policy rather than parsing:

1. **Heading-aware first.** Blind N-character windows cut clauses in half and
   strand facts from the heading that gives them meaning.
2. **Every chunk carries its heading trail.** Not just text, but
   `System Requirements Specification — K2 > 2. Requirements > SR-EPS-0421`.
   That prefix is why the result above is both answerable *and* citable. It costs
   a few tokens per chunk and is the single highest-value thing in the ingest.
3. **Tables are never split from their header row.** A `1,571` separated from
   the column naming it is worse than no value at all.

**What is the library's job and what is ours.** Deciding *which lines are
headings and where a table starts* is parsing, and is `markdown-it`. It used to
be hand-rolled regex, which could not know it was inside a fenced code block — so
a line reading `# total` in an example became a heading and silently reshaped
every boundary after it.

Output: 702 documents → **2,827 passages, 1.29M characters.**

---

## 6 · Turning text into vectors — two files, one line of steering

`steering/grounding/embeddings.factory.ts` is three lines of substance: where the
client comes from. Everything else — batching at 96 per request, restoring the
original order, usage accounting, the local fallback, the `EMBEDDINGS` switch —
is `@fde/grounding/openai-embeddings.ts`.

That file was extracted from insurance and pharma on their own recorded trigger:
*"If a third domain arrives, this file is the candidate to lift into a shared
package."* The two copies proved byte-identical apart from an import path.

**It takes a client and a deployment name and knows nothing about Azure**, which
is what lets `@fde/grounding` keep its stated promise of having no opinion about
which cloud you are on.

Two traps written into it:

- **Hosted and local are NOT comparable.** 1536 dimensions against 384. Switching
  means re-indexing everything, and any measurement under one is meaningless
  against the other.
- **Asymmetric models need a query prefix.** bge is trained with passages bare
  and questions behind an instruction. Omit it and retrieval quality drops with
  nothing looking broken — the classic shape of an embedding bug.

---

## 7 · Storing — `@fde/grounding/store.ts` and `ingest.ts`

`openStore(embeddings, { connectionString, tableName })` initialises a pgvector
store over `vst_derived.document_chunks`, cosine distance.

`ingestDocuments(store, source, opts)` runs the sequence: list, chunk, **delete
every existing chunk**, embed, insert, then build the full-text column.

That delete is why the import-time execution bug was so damaging: importing the
CLI for a constant re-ran the whole thing and emptied the table underneath a
query that was about to run. The table name now lives in
`steering/grounding/chunks.ts`, a file that does nothing, and every entry point
is guarded with `require.main === module`.

---

## 8 · The keyword half — `ensureFullTextIndex`

```sql
alter table document_chunks add column if not exists content_ts tsvector
  generated always as (to_tsvector('english', content)) stored;
create index ... using gin (content_ts);
```

**A generated column, so it cannot fall out of step with `content`.** Created
during ingest rather than in `openStore`, so that opening the store to *read*
never issues DDL — a query path that quietly alters schema is a surprise waiting
for a read-only database role.

---

## 9 · Asking — `@fde/grounding/hybrid.ts`

Two arms, run concurrently, fused.

**Dense arm.** Vector similarity over `k * 4` candidates.

**Sparse arm.** Postgres full text — and the query is built by hand:

```ts
raw.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1).join(' | ')
```

**Every built-in converter ANDs its terms.** `plainto_tsquery`,
`websearch_to_tsquery` and `phraseto_tsquery` all require a document to contain
*every* word. The first version used `plainto_tsquery` and therefore matched
nothing, ever — and it looked fine, because the dense arm still carried results
and no error was thrown. *A retrieval arm that silently matches nothing is worse
than one that is absent.*

Sanitising to `[a-z0-9]` also makes injection impossible by construction.

**Fusion is reciprocal rank**, not score addition:

```ts
score += 1 / (RRF_K + rank)
```

Because the two arms produce numbers that are not comparable — a cosine distance
and a `ts_rank` share no scale. Ranks do. Each arm over-fetches `k * 4` so a
document ranked poorly by one and well by the other still has a rank in both
lists; fusing two top-5s would mostly fuse two copies of the same five.

**`fullText: false` is returned, never swallowed.** If the column is missing
because ingest has not run, the caller is *told* it got dense-only results rather
than quietly receiving worse retrieval.

**Both arms honour the same filter**, via `@>` containment matching the store's
equality semantics. Filtering one and not the other silently reintroduces the
wrong-document leak this corpus suffered once already.

---

## 10 · The domain's view — `steering/tools/departments/documents.ts`

Wraps `hybridSearch` and returns `Passage[]`:

```ts
{ text, sourcePath, docType, programme, repo, score, foundBy }
```

**`foundBy` is `both` | `meaning` | `keywords`** — derived from which ranks are
present. Worth surfacing: dense-only often means the words did not match,
keyword-only often means the meaning did not, and *both* is the strong case. In
the worked example all five hits were `both`.

**These functions return data and print nothing.** A retrieved passage is
evidence, and the moment "here is the paragraph that proves it" is a
`console.log`, nothing but a human at a terminal can act on it.

**No score cutoff, deliberately.** Deciding *"the answer is not in this corpus"*
is reading comprehension, not a threshold. A cutoff tuned to hide junk on one
question hides the answer on the next, and fails silently in both directions.
That is why one of the five acceptance cases asks something the corpus cannot
answer and checks that the top hit *visibly* looks like junk.

**The store type is inferred, not imported.** Naming `@langchain/pgvector` here
made steering resolve its own copy, and TypeScript then refused to pass a store
built by `@fde/grounding` into a function expecting one built here — two
structurally identical classes from two installs, differing in a private field.
`Awaited<ReturnType<typeof openStore>>` means there is exactly one, by
construction. It is also the honest boundary: which vector store is used is the
package's business.

---

## 11 · The guards

| check | asserts | cost |
|---|---|---|
| `steering:sql-check` | every SQL statement on the answer path is a read; nothing there names a customer database; nothing imports an entry point; every entry point guards itself; and in `src/answer/` the one file allowed to write may not name the estate, while the file that names the estate may not write | free, offline |
| `steering:summary-check` | the bid summary's arithmetic and its contract — a re-assessed requirement counts once, a refusal never enters a total, a fabricated reference is caught | free, offline |
| `steering:derived-boundary-check` | the ingest and extraction cannot open the customer's estate, *including in comments* | free, offline |
| `steering:retrieval-check` | the five acceptance cases below | 5 embedding calls |

The five cases, and what each isolates:

1. **the hardcoded document is findable in English** — if this fails, the index
   is decoration and `walk-cost`'s hardcoded path cannot be removed
2. **a requirement found from its wording, not its id** — the question shares
   almost no words with the answer; meaning-based retrieval or nothing
3. **an exact identifier matches exactly** — vectors treat `SR-EPS-0421` and
   `SR-EPS-0407` as near-identical; only the keyword arm separates them
4. **a static-analysis deviation is reachable** — deviation D-07 is the only
   explanation of the three-way ASIL disagreement in 1,069 files
5. **a question the corpus cannot answer returns visibly weak hits**

All five pass. Cases 2 and 3 are the pair that proves the hybrid is earning its
keep: neither arm alone passes both.

---

## What this walkthrough does not cover, because it does not exist yet

- **The 220 source files are now indexed** — added after this walkthrough was
  written, so §5 covers the markdown chunker only. Code is chunked by FUNCTION,
  by `steering/grounding/code-chunker.ts`. The calibration parameters each
  function depends on are declared once in the file banner rather than above the
  function, so each function chunk carries only the rows its own body names, and
  the banner is its own chunk. `@fde/grounding` was not modified.
- **Nothing consumes the search yet.** `walk-cost` step 3 still opens its most
  valuable evidence by a path written into its source. Retrieval now demonstrably
  finds that document; deleting the path is the next change.
- **No tool wrapper.** An agent cannot call any of this. `documents.ts` is the
  data layer a tool would sit on.
