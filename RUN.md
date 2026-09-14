# Running it from scratch — Pillar 1, grounding

> **Companions:** [`GUIDE.md`](GUIDE.md) for *why*, [`TEMPLATE.md`](docs/TEMPLATE.md)
> to reuse this on another customer, [`SWAP.md`](docs/SWAP.md) for what could be
> replaced by a package and what state each swap is in.
>
> **Last full verification: 2026-09-11 — `pnpm eval` 40/40, 0 dangerous
> failures**, against a 79-document corpus. Every number in this file was
> measured, not estimated.

Why → command → file → what you should see. Nothing here is theory: if it is in
this file, it was run. Long-form reasoning lives in [`GUIDE.md`](GUIDE.md) §3.

**What Pillar 1 does.** Read 12 policy documents → cut them into chunks that
remember which form and section they came from → turn each chunk into numbers
and store it in Postgres → search by meaning, filtered to one form. The filter
is the point: 12 near-identical forms each have a section 4.4, and only one is
your customer's.

---

## The eight pillars, and where each step lands

Every step below belongs to a pillar, and every pillar answers one question.

| # | Pillar | The question it answers | Steps here | Commands |
|---|---|---|---|---|
| **1** | **Grounding** | Where do the facts come from? *Their documents — never what the model remembers.* | **1–5** | `chunks` · `holder` · `corpus:load` · `corpus:check` · `ingest` · `query` |
| **2** | **Tool loop** | How does the model get those facts? *It asks; your code fetches; repeat, under a cap.* | **6–7** | `compliance:check` · `ask` |
| **3** | **Answer shape** | How do we check what it said? *Fixed boxes, not prose — so honesty is a field, not a tone.* | **8** | `schema:check` |
| **4** | **Evals** | How do we know it works? *Known-answer questions, run five times each, counted.* | **9** | `eval:smoke` · `eval` |
| **5** | **Cost & latency** | What does a claim cost, and how long does it wait? *A durable line per claim, written when the call happens.* | inside every run | `logs:sync` |
| **6** | **Credentials** | Are we allowed to call the model? *A short-lived token, no stored password.* | inside 4 | `env:check` · `az login` |
| **7** | **Escalation** | When must a human decide? *When the documents do not settle it — as a field you can check.* | enforced inside 8 and 9 | — |
| **8** | **Deployment** | How does it run in the customer's environment? | not started | — |

Pillars 1–4 are built and run here. Pillar 5 is mostly done — every `ask`, eval
run and `ingest` writes a durable per-claim line and `pnpm logs:sync` ships it
to Postgres, with only the chat-model price still provisional. Pillar 6 is
partial: short-lived tokens and a written, tested fail-closed guard, but no
deployment yet sets its key. Pillar 7 is a rule enforced inside two other
pillars rather than a component, and 8 does not exist yet.

---

# Pillar 1 — grounding

## The map

**This is the R in RAG.** RAG means *Retrieval-Augmented Generation*, and it is
three separate jobs:

```
 R  retrieval    find the passages that actually bear on the question   ← Pillar 1, this file
 A  augmented    put those passages into the prompt                     ← Pillar 2
 G  generation   the model writes an answer from them                   ← Pillar 2
```

Everything below is the **R**. Nothing here calls a chat model or generates a
word of text. The two charts are the two halves of retrieval: building the index
once, and using it per question.

One thing worth saying precisely: textbook RAG embeds the question, takes the
top 5, and pastes them in. This does not. It looks up the customer's record
first and uses that to filter the search — retrieval driven by something it
fetched, not by the question alone. That pattern is usually called **agentic
retrieval**, and it exists here because plain RAG demonstrably fails on this
corpus: Step 5 shows the right clause ranked third behind two other products'
version of the same clause.

**Building the index** — once, and again whenever the documents or the embedding
model change:

```
docs/examples/policies/*.md 12 markdown policy documents — the SEED
      │                                (a fixture; see "who reads what" below)
      ▼
document-source.ts  fileDocumentSource()   parse the banner metadata
      │  SourceDocument { id, type, body, jurisdiction, effective, status, … }
      ▼
documents.store.ts  loadDocuments()        `pnpm corpus:load`
      │                                     upsert on content_sha, idempotent
      ▼
Postgres `documents`                   THE SOURCE OF TRUTH — whole, unchunked
      │                                12 rows, one per document
      │                                ← this is what a customer already has
      ▼
document-source.ts  dbDocumentSource()     `pnpm ingest` reads HERE, not the folder
      │  SourceDocument[] → asLoaderDocument()
      ▼
loader.ts                              (shape only — the hashing contract)
      │  Document { id, text }
      ▼
chunker.ts                             split on headings; never cut a table from
      │                                its header; glue the heading trail on
      │  Chunk { headings[], text, body, hash }
      ▼
ingest.ts                              → LangChain Document
      │                                metadata.formId ←── form-id.ts
      │                                store.delete({}) first: no stale rows
      ▼
embeddings.factory.ts                  EMBEDDINGS=foundry | local
      ├─► embeddings.ts                Azure text-embedding-3-small → 1536 numbers
      └─► embeddings.local.ts          bge-small, on this machine → 384 numbers
      │
      ▼
store.ts → PGVectorStore → Postgres `policy_chunks`
                             content   the passage
                             metadata  formId, section trail, body, hash
                             vector    the position
```

**Answering a question** — per question, and the order is the whole point:

```
   "how much rental car reimbursement does AUT-4471 get per day?"
                        │
      ┌─────────────────┴───────────────┐
      │ 1. WHICH POLICY?                │
      ▼                                 │
get-policyholder.tool.ts                │
      │  docs/examples/policyholders/AUT-4471.md — exact id, no search
      │  → form: PP 00 01 06 24 · rental: yes · endorsement: PP 03 24 06 24
      │                                 │
      └────────── formId ───────────────┤
                                        │ 2. WHAT DOES THAT FORM SAY?
                                        ▼
                             search-policy.tool.ts
                                        │  embedQuery(question) → embeddings.factory.ts
                                        │  similaritySearchWithScore(q, k, {formId})
                                        ▼
                                    store.ts
                                        │  Postgres filters on formId FIRST,
                                        │  then ranks by distance
                                        ▼
                            passages + section trail + score
```

| File | Does what | Runs at |
|---|---|---|
| `document-source.ts` | **the one file that changes per customer** — folder or document store | corpus:load *and* ingest |
| `documents.store.ts` | the `documents` table: whole documents + precedence metadata | corpus:load |
| `cli.ts` (`@fde/grounding`) | every command below, domain-neutral; `corpus:check` proves folder and database yield the same index | all of them |
| `loader.ts` | reads the markdown, hashes it | corpus:load *and* chunks |
| `chunker.ts` | heading trail + table rules | ingest |
| `form-id.ts` | extracts and **exactly** matches a form id | ingest *and* query |
| `ingest.ts` | wipes the table, writes the chunks | ingest |
| `embeddings.factory.ts` | picks the embedding model | both |
| `embeddings.ts` / `.local.ts` | text → numbers, hosted or local | both |
| `store.ts` | the only file that knows it is Postgres | both |
| `get-policyholder.tool.ts` | exact lookup — supplies the form id | query |
| `search-policy.tool.ts` | filter-then-rank, returns passages | query |
| `cli.ts` | `chunks`, `holder`, `corpus:load`, `ingest`, `query` | you |

Two arrows carry the weight. **`form-id.ts` feeds both paths** — it writes
`formId` at ingest and matches it at query, so changing one side alone breaks
retrieval silently. And **the record → filter arrow decides correctness**:
without it, search returns the right clause from whichever of the 79 documents
ranked highest.

---

## Step 1 · Pillar 1 — Install

Get everything offline green first, so a later failure is unambiguously the
cloud and not your setup.

```bash
pnpm install
pnpm typecheck        # silence is a pass
```

---

## Step 2 · Pillar 1 — Look at the corpus before trusting it

You cannot hand a model seventy-nine documents and ask about rental cars, so
they get cut into pieces. Cut carelessly and a piece arrives with no idea where
it came from.

**Files:** `loader.ts`, `chunker.ts`, `cli.ts → chunks()`

```bash
pnpm chunks           # OFFLINE
```

```
79 documents in docs/examples/policies

  maxChars=1200  chunks=555   orphans=0
  maxChars=400   chunks=643   orphans=0 (forced)
  maxChars=200   chunks=1395  orphans=0 (forced)
  maxChars=120   chunks=2114  orphans=0 (forced)

  12 distinct form ids: PP 00 01 01 15, PP 00 01 06 24, PP 00 01 09 18,
  PP 00 02 06 24, PP 00 03 06 24, PP 01 06 06 24, PP 01 20 06 24,
  PP 01 50 06 24, PP 01 79 06 24, PP 03 24 06 24, PP 04 91 06 24,
  PP 13 68 01 20
```

**Orphans** = a chunk starting mid-table with no header row, so `$1,000` arrives
with nothing saying which coverage it belongs to.

**Why four budgets:** splitting only happens above ~1200 chars and no section is
that long, so at the default the splitting code never runs — `orphans=0` would
report a code path that never executed. 555 → 2,114 chunks forces it.

**12 form ids from 79 documents** is correct, and it is the most important line
in this output. Only the **policy wordings** carry a form id. The other 67 —
bulletins, DOI circulars, claim determinations, procedures, manuals, coverage
opinions — are not forms and have none.

Note that the three editions of the base form appear **separately**:
`PP 00 01 01 15`, `PP 00 01 09 18`, `PP 00 01 06 24`. Same form, three editions,
paying $30, $35 and $40 a day. A matcher that treated `PP 00 01` as the form
would merge them and return the wrong number with a citation attached — which is
why `form-id.ts` normalises spelling but compares identity exactly.


### How it works

**One `chunks` run, end to end.** No network, no database, nothing stored:

```
pnpm chunks  [--form PP 00 01 06 24]
   │
   ▼
package.json                ts-node src/grounding/cli.ts chunks
   │
   ▼
cli.ts  chunks()
   │
   ├─ loader.ts  loadDirectory("docs/examples/policies")
   │      readdir *.md → readFile → sha256
   │      → Document { id, text }                              79 documents
   │
   ├─ for each budget in [1200, 400, 200, 120]:
   │      chunker.ts  chunkAll(docs, { maxChars: budget })
   │         parse()      markdown-it: heading tokens + table line ranges
   │         sections()   walk the headings, keep a stack, so every section
   │                      knows its full ancestry
   │         window()     split the body at the budget, BUT:
   │                        · a table moves whole into the next chunk
   │                        · header rows repeat if a table alone is too big
   │                        · ~150 chars of overlap between windows
   │         → Chunk { headings[], text, body, hash }
   │                                          555 / 643 / 1395 / 2114 chunks
   │
   │      orphans = chunks whose body starts with "|" and contains no
   │                "|---" separator → a table row with no header
   │
   └─ form-id.ts  formIdOf(headings[0]) for every chunk → distinct ids
   ▼
  maxChars=1200  chunks=555   orphans=0
  maxChars=400   chunks=205   orphans=0 (forced)
  maxChars=200   chunks=573   orphans=0 (forced)
  maxChars=120   chunks=805   orphans=0 (forced)

  12 distinct form ids: PP 00 01 01 15, PP 00 01 06 24, PP 00 01 09 18, …
```

- **This is a dry run of the first half of `ingest`.** Identical code path, and
  then it throws the chunks away instead of embedding them. Free, instant, and
  the right place to look when retrieval is returning something odd.
- **The four budgets are the point.** At 1200 no section is long enough to split,
  so `window()`'s splitting branch never executes and `orphans=0` would be
  reporting code that never ran. 555 → 2,114 forces it.
- **`--form PP 00 01 06 24`** additionally prints which documents carry that id —
  the same exact-match rule the search filter uses.

---

## Step 3 · Pillar 1 — The half that is not a search

"What is this customer's deductible" has one right answer in one file. Searching
returns the five most Maria-shaped records and hopes. So the 18 records are not
in the index at all.

**File:** `get-policyholder.tool.ts`

```bash
pnpm holder AUT-4471      # OFFLINE
pnpm holder AUT-9999      # a miss
```

Three lines matter in AUT-4471:

```
Form: PP 00 01 06 24
| Rental Reimbursement | yes | none |
## Endorsements Attached
- PP 03 24 06 24
```

That last one settles the corpus's planted contradiction — base form says
$40/day for 30 days, endorsement says $50/day for 21, and neither document says
who it applies to. A miss returns the ids that exist plus "do not infer from
another record".


### How it works

**One `holder` lookup, end to end.** One file read, and three guards around it:

```
pnpm holder AUT-4471
   │
   ▼
package.json                ts-node src/grounding/cli.ts holder AUT-4471
   │
   ▼
cli.ts  holder(id)          → getPolicyholderTool().execute({ policy_id })
   │
   ▼
get-policyholder.tool.ts
   │
   ├─ readdir docs/examples/policyholders/*.md → the 18 ids that exist
   │
   ├─ ID_PATTERN = /^AUT-\d{4}$/
   │     malformed → { found: false, known_policy_ids, note:
   │                   "ask the adjuster for the correct id rather than guessing" }
   │
   ├─ known.includes(id)?
   │     miss     → { found: false, known_policy_ids, note:
   │                  "do not infer this customer's coverage from another
   │                   record or from the policy wordings — escalate" }
   │
   └─ hit → readFile("docs/examples/policyholders/AUT-4471.md")
              the WHOLE record: no chunking, no embedding, no ranking
   ▼
{ policy_id: "AUT-4471",
  record:    "# Policyholder Record AUT-4471 — Maria Santos … Form: PP 00 01 06 24
              … Rental Reimbursement | yes … Endorsements Attached: PP 03 24 06 24",
  source:    "record:AUT-4471" }
```

- **Nothing here touches the vector store.** No embedding, no similarity, no
  Postgres. Records are looked up by exact id because the question has exactly
  one right answer — searching would return the five most Maria-shaped records
  and hope.
- **A miss is informative, not empty.** Returning the known ids lets a caller
  correct a typo; the note stops it inventing coverage for a customer who does
  not exist.
**Where records come from, and why it is NOT the documents table.** This tool
takes a `RecordSource`, not a directory — the same shape as the document seam in
Step 3b, pointed at a different system on purpose:

```
DOCUMENTS   a document management system    SEARCHED BY MEANING
RECORDS     a policy admin system           FETCHED BY EXACT KEY
            (Guidewire PolicyCenter, a
             mainframe, a SQL database)
```

Now that a `documents` table exists, moving records into it would be an
afternoon's work and would quietly undo the distinction everything here rests
on. Maria Santos's deductible is **$1,000** — not "the five most Maria-shaped
chunks". `get-policyholder.tool.ts` opens by saying it exists *to not be a
search*, and a record in a vector-searched table is a search waiting to happen.

- **This supplies the filter for everything else.** `Form: PP 00 01 06 24` is what
  `--form` gets set to, and `PP 03 24 06 24` is what settles the corpus's
  planted contradiction.
- **`source: "record:AUT-4471"`** is the citation format — the eval check
  verifies that string resolves to a real file.

---

## Step 3b · Pillar 1 — Put the documents where a customer keeps them

**Why.** Everything up to here read a folder. No insurer has a folder. Policy
wordings, endorsements, bulletins and past claim determinations live in a
document management system — FileNet, SharePoint, Documentum, Guidewire
ContentManagement — reached through an API, with metadata attached, and they
were there long before anyone arrived to build search on them.

That matters more than tidiness. The **metadata is where precedence lives**:
which edition is in force, which state a form applies to, which bulletin
replaced which. A folder has none of it, which is why the corpus could only ever
be near-identical forms: nothing else had anywhere to record what governs what.

**The split this introduces:**

```
examples/policies/*.md   →   documents table    →   policy_chunks
the SEED, in git             the source of truth    derived, disposable
diffable, reviewable         whole, UNCHUNKED       rebuild any time
a fixture for their DMS      ← THE CUSTOMER'S ──→   ← what WE build ──
```

The markdown stays in git, and that is deliberate: a corpus in version control
is diffable and reviewable in a PR, so *"why did last week's score change?"* has
an answer. A database has no diff. But **no product code reads it** — it is how
we fabricate a document history a real insurer would have accumulated over
years, exactly as the eighteen policyholder records stand in for a policy admin
system.

**Files:** `document-source.ts`, `documents.store.ts`, `cli.ts` — all in `@fde/grounding`

```bash
pnpm corpus:load      # seed files  → documents table
pnpm corpus:check     # prove the swap changes nothing
```

```
source: files:docs/examples/policies
  79 documents — 12 inserted, 67 updated, 0 unchanged, 12 removed, 10 relation(s)
```

Read that line carefully — it is the whole migration in one row. **12 removed**
are the retired PoC forms. **12 inserted** are the new wordings replacing them.
**67 updated** are the guidance documents: their ids did not change, but every
one of them cites a form id, every citation was repointed, so their content hash
moved.

Re-run it and you get `0 inserted, 79 unchanged`. Idempotent on `content_sha`,
because a loader that appended would quietly double the haystack and no
retrieval output would look wrong.

**10 relations** is the precedence graph, and it is data now rather than prose:

```
pp-00-01-06-24       supersedes              PP 00 01 09 18
pp-00-01-09-18       supersedes              PP 00 01 01 15
bulletin-2024-07     supersedes              BUL-2022-03
bulletin-2023-02     supersedes              BUL-2021-05
bulletin-2025-01     supersedes              BUL-2023-02
circular-il-2024-03  supersedes              CIR-IL-2021-08
bulletin-2025-02     amends_and_supplements  BUL-2021-04
bulletin-2024-12     withdraws               BUL-2019-01, -2019-06, -2020-02
```

Three things to notice. The **form editions** chain three deep, so "which
wording was in force on the date of loss" is a question a query can answer. The
**bulletins** chain too — that is the superseded-bulletin trap. And
`amends_and_supplements` is a different verb on purpose: BUL-2021-04 is **not**
superseded, both bulletins stay operative, and a model that has learned "the
later one wins" gets that one wrong.


### The missing-metadata report, and why it is now empty

`corpus:load` also names any document whose precedence metadata is incomplete.
Right now it names none: all 79 carry a status, an effective date and an
applies-to list, because the generator writes them into every banner.

**Do not read that as normal.** It is the one place this corpus is *less*
realistic than a customer's, and it is worth saying out loud. A real document
management system has effective dates half-populated, supersession tracked in a
spreadsheet or in somebody's head, and jurisdiction implied by a folder name.
Discovering that is usually the most valuable thing an FDE delivers in week one.
The check stays in the output precisely so that pointing this pipeline at a real
store makes the gap visible on the first run.

The retired PoC corpus did demonstrate it, and left one lesson worth keeping.
Most of its documents had no status at all, and one stated its supersession in
**prose** — *"Superseded by PA-2022-04."* — where no parser could reach it as a
relation.

**But the first count was wrong, and the error was ours.** It reported ten
documents with no effective date; the real number was three. The banner lines
were joined with a space, so the value pattern ran past the end of its line and
read `Effective: 2021-07-01` as `2021-07-01 Superseded by PA-2022-04. Retained
for claims…`, which fails the date test. Only the one document whose date sat
last on its last line survived. Joining with newlines recovered seven dates.

That is the lesson to carry into a real engagement: **a missing-data report is a
claim about your parser at least as much as a claim about the source.** It is
seductive precisely because it confirms what you already believe about messy
enterprise data. Open the file and read it before you write the finding up.


### Proving the swap changed nothing

`ingest` reads the table, not the folder. That is only safe if the index comes
out identical — same chunks, same ids, same metadata, same citations. It is a
claim, so it gets a command:

```bash
pnpm corpus:check      # one Postgres read; no embeddings, no model call
```

```
  folder (seed files)        chunks=555   fingerprint=9d06b1d9e366e8b0
  database (documents)       chunks=555   fingerprint=9d06b1d9e366e8b0
  raw loadDirectory          chunks=555   (pnpm chunks path)

  PASS — the database yields the same index as the folder.

  NEGATIVE CONTROL
  ok   reordering the documents changes the fingerprint   10e8f59288bd6803
```

Three paths, not two. The first two must agree on the **fingerprint** — a
sha256 over the content *and* metadata of every chunk the vector store would
receive. The third only has to agree on the **count**, because it is the path
`pnpm chunks` uses, and if that diverged the free offline check would stop
describing the real index.

**It earned its keep on the first run, by failing.** Both sources produced the
same chunk count and two different fingerprints. The cause: `loadDirectory`
sorts by the file-relative id — `auto-pa-2023-01.md`, *with* the extension —
while the query sorted by `document_id`, without it. That missing `.md` flipped
two documents past each other; chunk ids derive from position; every id
downstream moved. A re-ingest would have silently rewritten every citation the
model emits, and nothing in the output would have looked wrong.

The fix was to sort in **Node**, on the filename, with the same comparison
`loadDirectory` uses — not in SQL, where Postgres collation is not guaranteed to
match JavaScript's anyway.

**Why the negative control is there.** Three matching fingerprints prove nothing
unless a mismatch would show up. The control reverses the document order and
asserts the fingerprint moves; if it ever reports anything but `ok`, the
comparison above has stopped looking at anything. PROGRESS.md §2.7 records what
forgetting this costs — `orphans: 0` was reported for months by a code path that
never executed.


### Who reads what, after this step

| reader | source | why |
|---|---|---|
| `pnpm ingest` | **database** | the product path |
| `pnpm corpus:load` | folder | it is what populates the database |
| `pnpm corpus:check` | both | that is the whole job |
| `pnpm chunks` | folder | a dev tool; must work with no database |
| `eval/checks.ts` | folder | **not yet migrated** — see below |
| `get_policyholder` | folder | a different system entirely: records are an API call, not documents |

**Still to migrate:** `checks.ts` resolves a citation by listing the corpus
directory. Against the table it could do better than "does this file exist" and
check the cited **edition was in force on the date of loss** — an insurance
check rather than a filesystem one.

---

## Step 4 · Pillar 1 — Build the index

Each chunk goes to an **embedding model**: text in, ~1,500 numbers out. Treat
them as a position — passages about the same thing land near each other however
differently they are worded. Search is then "give the question a position, return
the nearest chunks". Direction, not length: `distanceStrategy: 'cosine'`.

Two rules that bite: **the same model must position both sides** (change the
model, re-ingest everything), and **the numbers are not the text** — the row
stores the passage too, and the model is handed the real words.

**Files:** `ingest.ts`, `embeddings.factory.ts`, `store.ts`

```bash
pnpm env:check        # OFFLINE — config only, says nothing about auth
pnpm ingest
```

```
indexing into policy_chunks at postgresql://…eu-central-1.aws.neon.tech/neondb
embeddings: foundry

  indexing into policy_chunks at postgresql://…@…neon.tech/neondb
  embeddings: foundry

  loaded 79 documents from db:documents
  chunked into 555 passages
  embedded and stored 555 chunks

done: 79 documents, 555 chunks
```

Same 555 as Step 2 — same cut, now with positions attached. Note the source:
**`db:documents`**, not a folder. Step 3b is why.

**Two facts worth checking in the table afterwards**, because they decide what
search can and cannot reach:

```
chunks stored   : 555
with a form id  : 90     ← exactly the 12 policy wordings
by docType      : bulletin=162, determination=150, procedure=54, form=52,
                  circular=51, manual=24, opinion=24, amendatory=20,
                  endorsement=13, schedule=5
```

Every chunk carries its document type, so the 465 guidance chunks are in the
index and identifiable. They are **not** reachable by a form-filtered search:
a bulletin is not a form and has no form id. That is the `search_guidance` work
recorded in [`CORPUS-PLAN.md`](docs/CORPUS-PLAN.md) §2.6, and until it is built a
filtered query sees 90 chunks out of 555.

> **This used to leak your password, and the fix is worth copying.** `env:check`
> and `ingest` both print `DATABASE_URL` so you can tell a local container from
> a hosted cluster at a glance — and both printed it *in full*, password
> included, into shell scrollback and into every pasted transcript. The rule
> lived as a one-liner at each call site, so one site redacted and the other did
> not. It is now a single exported function, `redactedConnectionString()` in
> `@fde/grounding`, and every printer calls it. Host and database are kept
> deliberately; only the password is replaced with `***`.

### Which model, which database

`.env` decides both. Nothing above `Embeddings` changes:

```bash
EMBEDDINGS=foundry    # text-embedding-3-small on Azure — 1536 numbers
EMBEDDINGS=local      # bge-small on this machine — 384, no credential, no cost

DATABASE_URL=postgresql://…@localhost:5433/claims                  # container
DATABASE_URL=postgresql://…@ep-….eu-central-1.aws.neon.tech/neondb?sslmode=require
```

The pgvector column has no fixed dimension, so 1536 ↔ 384 needs no schema
change — but the vectors are not comparable, so switching means re-ingesting and
it invalidates any eval baseline measured on the other model.

### Three things that cost us time

- **Endpoint host.** Use `<resource>.services.ai.azure.com/openai/v1` — Azure
  lists it as the *AI Foundry API*. The `.openai.azure.com` host it also
  advertises does not work with this path.
- **Owning the resource does not let you call it.** Without a data-plane role
  the calls 401, which reads like a broken credential:
  `az role assignment create --role "Cognitive Services OpenAI User" --scope <resource-id>`
- **Capacity is a rate limit, not a bill.** Created at capacity 10 = 10,000
  tokens/minute, and the embedder sends 96 chunks per request → `429`. Raising
  it costs nothing; you pay per token used, not per token allowed.


### How it works

**One ingest, end to end.** Everything on disk becomes rows in one pass:

```
pnpm ingest
   │
   ▼
package.json                ts-node src/grounding/cli.ts ingest
   │
   ▼
embeddings.factory.ts       EMBEDDINGS=foundry → FoundryEmbeddings
   │                        (local → LocalEmbeddings, no credential at all)
   ▼
store.ts  openStore()       PGVectorStore.initialize() —— first run only:
   │                          CREATE EXTENSION IF NOT EXISTS vector
   │                          CREATE TABLE IF NOT EXISTS policy_chunks
   ▼
ingest.ts  ingestDocuments()
   │
   ├─ dbDocumentSource().list()   SELECT * FROM documents
   │                    sorted in NODE by source_path, not in SQL — chunk ids
   │                    derive from position and Postgres collation is not
   │                    guaranteed to match JavaScript's
   │                    → SourceDocument[] → asLoaderDocument()     79 documents
   │
   ├─ chunker.ts      markdown-it parses the headings
   │                    sections()  keep a heading stack per section
   │                    window()    split at ~1200 chars, BUT move a whole
   │                                table to the next chunk rather than cut it
   │                    text = "PP 00 01 06 24 > Part IV > 4.4 …" + "\n\n" + body
   │                    → Chunk { headings[], text, body, hash }     555 chunks
   │
   ├─ store.delete({filter:{}})  ─────────► DELETE FROM policy_chunks
   │                    wipe first: a partial re-ingest leaves stale rows and
   │                    the output would look perfectly normal
   │
   ├─ toLangChainDocument(chunk)
   │                    pageContent = the trail + body (this is what is embedded)
   │                    metadata    = { formId ←── form-id.ts, section, body,
   │                                    hash, chunkId, documentId, index }
   │
   └─ store.addDocuments(docs)
            │
            ├─① embedDocuments(texts) ────► Azure, Sweden Central
            │      BATCH = 96, so 2 requests: 96 then 32
            │      results re-sorted by `index` — the API may return them out of
            │      order, and mismatched vectors would look like nothing at all
            │                                  ◄── 128 × 1536 numbers
            │
            └─② INSERT ──────────────────► Postgres, Frankfurt
                   128 rows: content, metadata jsonb, vector
   │
   ▼
done: 79 documents, 555 chunks
```

- **The heading trail is embedded, not just stored.** `pageContent` is
  `trail + body`, so "we will pay $40 per day" carries its form id into the
  vector itself. `metadata.body` keeps the bare passage for display.
- **`formId` is written here and matched at query time**, both by `form-id.ts`.
  That one file is the join between the two halves of retrieval.
- **The wipe is deliberate.** Editing a policy and re-ingesting must not leave
  last week's clause in the index, correctly cited and quietly wrong.
- **Cost lives here, once.** 128 passages embedded at ingest; a query embeds one
  short question. Re-running is only needed when the documents or the embedding
  model change.

---

## Step 5 · Pillar 1 — Search it

Same question twice: naive, then filtered to the form the customer is on. This
is the step that justifies every other decision in this pillar.

**File:** `cli.ts → query()`

```bash
pnpm query "how much does rental car reimbursement pay per day"
pnpm query "rental car limit" --form "PP 00 01 06 24"
```

### Unfiltered — the top hit is the most dangerous document in the corpus

```
0.621  DET-2023-004488-CPL — Coverage Position: Rental Reimbursement Daily Amount
0.577  PP 03 24 06 24 — Extended Transportation Expenses > Daily Amount and Maximum
0.565  PP 00 01 09 18 — Personal Auto Policy > Part IV > 4.4 Rental Reimbursement
0.562  PP 00 01 06 24 — Personal Auto Policy > Part IV > 4.4 Rental Reimbursement
0.561  PP 00 01 01 15 — Personal Auto Policy > Part IV > 4.4 Rental Reimbursement
```

**Four of the top five are wrong, and the right one is fourth.** Go through them:

| rank | what it is | why answering from it is wrong |
|---|---|---|
| 1 | a prior claim determination | it says **in its own text** that it construes a superseded edition and "must not be carried across" |
| 2 | the rental endorsement | governs **only if attached to this policy** — the declarations decides, not the document |
| 3 | base form, 2018 edition | superseded. Pays **$35** |
| 4 | base form, **current** | pays **$40** ← the answer |
| 5 | base form, 2015 edition | superseded. Pays **$30** |

Nothing here is a retrieval bug. Every one of those passages really is about the
daily rental amount, and that is precisely the problem: **similarity ranks
topical relevance, and authority is not a topic.** A determination written to
record what was once paid reads more like an answer to "how much does it pay per
day" than the policy form does, because it is phrased as an answer.

Three things are worth pausing on.

**The three editions sit four thousandths apart** — 0.565, 0.562, 0.561 — and
the current one is in the middle. No threshold, no reranker and no better
embedding model separates them, because they are near-identical prose differing
in one number. Only knowing *which policy this customer holds* separates them.

**The top hit is stale on purpose.** `DET-2023-004488-CPL` is a planted trap: it
construes `PP 00 01 01 15`, the schedule changed in later editions, and the
document says so plainly in its closing section. It ranks first anyway.

**Rank 2 is the subtler failure.** The endorsement is not stale, not wrong, and
not superseded — it simply may not be attached to this policy. No amount of
reading the document tells you. Only the declarations does.

### Filtered — one form, one edition

```
0.474  PP 00 01 06 24 > Part IV > 4.4 Rental Reimbursement
0.402  PP 00 01 06 24 > Part IV > 4.3 Schedule of Limits and Deductibles
0.323  PP 00 01 06 24 > Part IV > 4.2 Collision Coverage
0.295  PP 00 01 06 24 > Part VI > 6.3 Exclusions
0.282  PP 00 01 06 24 > Part I  > 1.1 Terms Used Throughout
```

The right clause is first, the schedule that corroborates it is second, and
**the other two editions are gone** — even though both contain a section 4.4
about the same benefit paying a different amount. That is the exact-match rule
in `form-id.ts`: a prefix match on `PP 00 01` would have merged three editions
paying $30, $35 and $40.

Note also that the scores are *lower* than the unfiltered ones. That is expected
and worth internalising: **a lower-scoring correct answer beats a
higher-scoring wrong one.** Score measures topical overlap, not correctness.

The form id came from Step 3. **Record first, then filter, then rank.**

### What this step does NOT yet fix

The filter narrows to one form, which is right for a coverage question. But 465
of the 555 chunks — every bulletin, circular, determination, procedure, manual
and opinion — have no form id, so a filtered query cannot reach them at all.

For *"how much does it pay"* that is correct: a bulletin cannot change what a
policy pays. For *"what documentation must I obtain before authorising a
rental"* it is useless, because the answer is in a bulletin and the filter
excludes it.

That gap is the `search_guidance` work recorded in
[`CORPUS-PLAN.md`](docs/CORPUS-PLAN.md) §2.6.


### How it works

**One query, end to end.** Two network calls and one SQL statement:

```
pnpm query "how much does rental car reimbursement pay per day" [--form PP 00 01 06 24] [--k 5]
   │
   ▼
package.json                ts-node src/grounding/cli.ts query "…"
   │
   ▼
cli.ts  main()              split flags from text:
   │                          positional → the question
   │                          --form     → filter   (absent here)
   │                          --k        → 5
   ▼
embeddings.factory.ts       EMBEDDINGS=foundry → FoundryEmbeddings
   │                        bearer token ← DefaultAzureCredential (your az login)
   ▼
store.ts  openStore()       connect to Postgres, hand the embedder to PGVectorStore
   │                        (the store embeds the question itself, next step)
   ▼
similaritySearchWithScore(question, k, filter)
   │
   ├─① embedQuery(question) ──────────────► Azure, Sweden Central
   │     text-embedding-3-small                ◄── 1536 numbers
   │
   └─② one SQL statement ─────────────────► Postgres, Frankfurt
         SELECT content, metadata, vector <=> $1 AS distance
         FROM policy_chunks
         -- WHERE metadata @> '{"formId":"PP 00 01 06 24"}'   ← ONLY when --form is passed
         ORDER BY distance
         LIMIT 5;                                 ◄── 5 rows
   │
   ▼
cli.ts  print               similarity = 1 - distance      (bigger = closer)
   │                        label      = metadata.section  (the heading trail)
   ▼
0.621  DET-2023-004488-CPL — Coverage Position: Rental Reimbursement Daily Amount
0.577  PP 03 24 06 24 — Extended Transportation Expenses > Daily Amount and Maximum
0.565  PP 00 01 09 18 — Personal Auto Policy > Part IV > 4.4 Rental Reimbursement
   …
```

- **`<=>` is pgvector's cosine-distance operator, and the database does the
  maths.** Nothing is loaded into Node to be sorted; Postgres compares the
  question's position against all 555 rows and returns the nearest five.
- **That commented-out `WHERE` is the entire difference between the two runs.**
  With it, the wrong forms are discarded *before* ordering. Without it, all 555
  compete — and a prior determination, an endorsement that may not be attached,
  and two superseded editions all outrank the form that governs.
- **What leaves the machine:** the question text (to Azure, which never sees the
  database) and one SQL statement (to Postgres, which never sees Azure). The
  passages themselves never go anywhere.
- **What does not happen:** no chat model runs, and nothing is generated. This
  is the whole of the **R**.

---

## Done, and one loose end

From a clean clone you can now inspect the corpus, look up a customer, build the
index on a hosted or local model, and search it filtered to one form. That is
the retrieval half of a RAG system.

**Unexplained:** twice, right after a re-ingest, `pnpm query` returned
`(no results)` while the table held all 128 rows; the same query worked seconds
later. Best guess is visibility lag through Neon's pooled endpoint after the
wipe-and-rewrite. That is a guess. A search that intermittently returns nothing
is what "the AI is broken" looks like to a customer, so it gets chased properly
if it recurs.

**Next: Pillar 2**, below.

---

# Pillar 2 — the tool-calling loop

The model cannot open a file or query your database. It can only produce text.
So you give it a menu: along with the question you send a short list of things it
may ask you to do. It replies *"run `get_policyholder` with AUT-4471"* — it does
not run anything, it asks. Your code runs it and hands back the result. Repeat
until it answers or you hit the cap.

The model decides *what it needs*; your code decides *what it gets*.

---

## Step 6 · Pillar 2 — Prove the wiring before spending anything

Adopting a framework means inheriting its defaults, and two of this SDK's
defaults send data somewhere. This check asserts the real outgoing request — no
tokens, no network, nothing billed.

**File:** `packages/agent/src/compliance-sdk.ts`

```bash
pnpm compliance:check      # OFFLINE
```

```
REAL CONFIGURATION — these are the properties we claim
  ok    a request was actually built        2 request(s) captured
  ok    store is false on every request     no provider-side retention
  ok    registered tools reach the request  search_policy is in every request
  ok    no server-side conversation state   no previous_response_id
  ok    tracing dispatched nothing          zero spans, with OPENAI_API_KEY set
  ok    nothing reached api.openai.com

NEGATIVE CONTROLS — each must FAIL, or the check above is asleep
  ok    control: tracing enabled IS detected            5 span(s) seen
  ok    control: a naive Agent does NOT send store:false  store was [null]

compliance: PASS
```

### How it works

```
pnpm compliance:check                          OFFLINE — no tokens, no network
   │
   ▼
compliance-selftest.ts
   │
   ├─ fakeClient()             a stand-in OpenAI client that RECORDS each
   │                           request instead of sending it → captured.params[]
   │
   ├─ globalThis.fetch = stub  records any URL the SDK tries to reach → fetched[]
   │
   └─ process.env.OPENAI_API_KEY = "sk-test-not-a-real-key"
                               the tracing exporter skips silently when no key
                               exists, so without this the test would pass for
                               the wrong reason
   │
   ▼
runLoopSdk(fakeClient, …)      the REAL loop-sdk.ts: real Agent, real tools,
   │                           real modelSettings — only the transport is fake
   ▼
assert on what was captured
   │   • a request exists           else every check below is vacuous
   │   • store === false            the provider keeps no copy of the claim
   │   • tools are in the request   the model can actually ground its answer
   │   • no previous_response_id    no conversation state on their servers
   │   • zero tracing spans         WITH a key set
   │   • nothing hit api.openai.com
   ▼
negative controls — these must FAIL
   │   • re-enable tracing            → 5 spans seen
   │   • Agent without modelSettings   → store is null (default: retain)
   ▼
compliance: PASS
```

- **Two defaults, both opt-out.** `store` defaults to `true` — the provider
  retains the response. Tracing defaults to on, posting inputs, tool arguments
  and tool results to `api.openai.com`. Our model calls go to a region we chose;
  traces would have gone somewhere else entirely.
- **The fake key is the whole point.** Today the exporter no-ops because there is
  no OpenAI key. That is safety by accident: the day someone adds one for an
  unrelated reason, claim text starts leaving. The test sets one on purpose and
  asserts nothing is sent anyway.
- **The negative controls make the silence mean something.** A check that cannot
  fail reads like evidence while proving nothing — so tracing is switched back on
  to confirm the span check *can* catch it.
- **The "tools reach the request" check exists because it once didn't.** An
  earlier wiring built the tool list and never passed it to the `Agent`; the
  model got zero tools, and two eval cases still passed because both were
  escalation cases and a model with nothing to search with escalates.

---

## Step 7 · Pillar 2 — Run the loop

**Why.** Everything so far you drove by hand: you ran `holder`, read the form
id, then typed it into `query --form`. Step 7 hands that job to the model. It
gets a menu of three tools and decides for itself what to fetch and in what
order — including whether a question is about what the policy PAYS or about how
the claim must be HANDLED, which are different tools and different documents.

**Files:**
- `packages/insurance/src/ask.ts` — builds the client, the store, the tool
  registry, the prompt
- `packages/agent/src/registry.ts` — the menu, and the only thing that
  can dispatch a tool
- `packages/insurance/src/tools/coverage-prompt.ts` — the ordered procedure the
  model must follow
- `packages/agent/src/loop-sdk.ts` — the loop itself, on `@openai/agents`
- `packages/agent/src/loop.types.ts` — the contract: `maxTurns` 12,
  `TurnRecord`, events

```bash
pnpm ask "how much rental car reimbursement does AUT-4471 get per day?" --trace
```

`--trace` prints each tool call as it happens. Drop it for just the answer.
`--policy AUT-4471` passes the id explicitly instead of leaving it in the text.

**You should see** an answer of $50/day for 21 days, four citations, one
conflict marked resolved, and a trace like this:

```
→ get_policyholder({"policy_id":"AUT-4471"})
← ok 1ms  record AUT-4471 (973 chars)
→ search_policy({"query":"rental reimbursement … per day","policy_form":"PP 00 01 06 24","k":5})
← ok 1919ms  5 passage(s) from 1 form(s): PP 00 01 06 24
→ search_policy({"query":"PP 03 24 06 24 rental reimbursement endorsement …","policy_form":"PP 03 24 06 24","k":5})
← ok 1205ms  5 passage(s) from 1 form(s): PP 03 24 06 24

turns=4  toolCalls=3  tokens=15626in/2441out  wall=38.4s  stopped=model_finished
```

**Read the trace before the answer.** Four things in it are the whole point:

1. **`get_policyholder` ran first**, before any search. Procedure step 1.
2. **It searched the base form, then searched the endorsement the record
   named** — procedure step 4. Skipping that second search is how you get a
   confident $40.
3. **It did NOT call `search_guidance`.** Correct: a bulletin cannot change what
   a policy pays. A third tool that gets reached for on every question would be
   a cost and a distraction, and this shows it is not.
4. **The form id survived the round trip with its spaces intact** —
   `"policy_form":"PP 00 01 06 24"`. Read out of a markdown table, passed back
   as a tool argument, matched exactly.

And the answer records the conflict rather than quietly resolving it:

```
CONFLICTS (1)
  rental reimbursement daily amount and maximum
    policy:PP 00 01 06 24 … → $40 per day, maximum 30 days
    policy:PP 03 24 06 24 … → $50 per day, maximum 21 days
    resolved by: record:AUT-4471
```

Both positions cited, the superseded one kept, and the record named as what
settles it. Getting $50 without this block would be the dangerous kind of right.

### What this costs, against a corpus 4.3× bigger

The previous baseline on the 128-chunk corpus was
`turns=4 toolCalls=3 tokens=12021in/1219out wall=19.5s`.

```
                chunks    in-tokens    turns   toolCalls
before            128       12,021       4         3
after             555       15,626       4         3
                 ×4.3       ×1.3        same      same
```

**The haystack grew 4.3× and the prompt grew 30%.** Not because retrieval got
cleverer — because it is filtered. The model still sees five passages from one
form, whichever corpus they came out of. An unfiltered pipeline would have grown
with the haystack; this one grows with the *prompt*, and most of that 30% is the
longer system prompt explaining the two document families.

That is the argument for filter-then-rank stated as a number rather than an
opinion.

The right answer is **not in any policy document**. Both numbers are in the
corpus, in two documents that contradict each other, and neither says who it
applies to. Only the record settles it.

**Three failure modes, and they are worth telling apart:**

| what you see | what went wrong |
|---|---|
| **$40/day, 30 days** | it never searched the endorsement the record named |
| **escalates** | it could not resolve a conflict the record does settle |
| **$50/21, `conflicts` empty** | right number, never noticed the documents disagree — the dangerous version of correct |

The third is the one `flags_conflict` exists to catch, and the one a human
reviewer skims past because the number is right.

### How it works

```
pnpm ask "…"  [--policy AUT-4471] [--trace]
   │
   ▼
ask.ts
   │  openaiClient()                bearer token ← DefaultAzureCredential
   │  openEmbeddings + openStore()  ← all of Pillar 1, so search_policy works
   │  new ToolRegistry([ getPolicyholderTool(),
   │                      searchPolicyTool(store),      ← what the policy PAYS
   │                      searchGuidanceTool(store) ])  ← how it is HANDLED
   │  buildUserPrompt(question, policyId)
   ▼
runLoopSdk(client, gpt-5-mini, registry, prompt, {
     system:         COVERAGE_SYSTEM_PROMPT   ← coverage-prompt.ts
     responseFormat: COVERAGE_FORMAT          ← Pillar 3's Zod schema
     onEvent:        --trace printer
   })
   │
   │   WHERE DOES "AUT-4471" COME FROM? Out of your sentence. Nothing looked it
   │   up. The model reads the question as text and recognises the id, because
   │   step 1 of COVERAGE_SYSTEM_PROMPT tells it exactly what to look for:
   │
   │      PROCEDURE, IN THIS ORDER. Do not skip a step because you think you
   │      can guess
   │      1. If the question names a policy id (format AUT-0000), call
   │         get_policyholder …
   │      2. If no policy id was given and the question is about a specific
   │         customer, do not guess an id and do not search. Escalate, asking
   │         for the policy id.
   │      3. Call search_policy with policy_form set to the form from the
   │         record.
   │
   │   --policy AUT-4471 is the same thing by another route: buildUserPrompt
   │   just prefixes the question with "Policy AUT-4471." — still text, still
   │   read by the model. There is no separate channel for it.
   │
   │   No id at all → rule 2: do not guess, do not search, escalate and ask.
   │   The alternative is a confident answer about the wrong customer, picked
   │   from the eighteen records it can see. Eval case 6 tests exactly that.
   │
   ▼
loop-sdk.ts
   │  configureSdk()  tracing OFF · our client · Responses API
   │  new Agent({ tools, modelSettings: { store:false, parallelToolCalls:true },
   │              outputType: schema })
   │
   ├─ turn 1  model ──► "call get_policyholder(AUT-4471)"
   │            code ──► registry.dispatch ──► get-policyholder.tool.ts ──► file
   │                 ◄── form PP 00 01 06 24 · rental yes · endorsement PP 03 24 06 24
   │          ────────────────────────────────────────────────────────────────
   │          WHO IS THIS CUSTOMER? The model cannot read a file, so it writes
   │          out a tool name and an argument. That is only text — nothing has
   │          run yet. Your code runs it, reads one file, hands the record back.
   │          It now knows which of the twelve forms she is on, and that an
   │          endorsement is attached. It could not have guessed either.
   │
   ├─ turn 2  model ──► "call search_policy('rental reimbursement', PP 00 01 06 24)"
   │            code ──► search-policy.tool.ts ──► embed → Postgres ──► passages
   │          ────────────────────────────────────────────────────────────────
   │          WHAT DOES HER FORM SAY? Now it can search NARROWLY, because it has
   │          the form id from turn 1. Your code embeds the question and sends
   │          one SQL query filtered to PP 00 01 06 24. This is all of Pillar 1
   │          running inside Pillar 2 — and it is what stops the answer coming
   │          from one of the other eleven forms.
   │
   ├─ turn 3  model ──► "call search_policy('rental reimbursement', PP 03 24 06 24)"
   │            code ──► passages
   │          ────────────────────────────────────────────────────────────────
   │          AND THE ENDORSEMENT? The record named PP 03 24 06 24, so it
   │          searches again with that filter. Same tool, same code, different
   │          form. It is now holding two passages that contradict each other:
   │          $40/day for 30 days, and $50/day for 21 days.
   │
   └─ turn 4  model ──► final JSON, no tool call → the loop stops
                  │    ──────────────────────────────────────────────────────
                  │    WRITE IT DOWN. No tool call is how the loop knows it is
                  │    finished. The model fills the fixed boxes: the answer,
                  │    the three sources, and the contradiction — reported in
                  │    `conflicts` as resolved_by record:AUT-4471, because the
                  │    record is the only thing that settled it.
                  ▼
            validateCoverageAnswer()   shape (Zod) + coherenceErrors()
                  │                    ─────────────────────────────────────
                  │                    Checked before anything is printed. Zod
                  │                    checks the SHAPE; coherenceErrors checks
                  │                    combinations that fit the shape and are
                  │                    still wrong — above all, an unresolved
                  │                    conflict that did not escalate.
                  │                    Invalid → the error text is handed BACK
                  │                    to the model and retried once. Never
                  │                    silently repaired: a repair you cannot
                  │                    see is a failure rate you cannot count.
                  ▼
ask.ts  render()   ANSWER · CITATIONS · CONFLICTS · RUN
```


- **The model never touches the database.** It emits the *name* of a tool and
  some arguments. `registry.dispatch` decides whether to run it and what comes
  back — which is what makes grounding enforceable rather than requested.
- **Each turn re-sends the whole transcript.** The model has no memory between
  calls, so the prompt, the record and every retrieved passage go up again every
  turn. That is why 12,021 input tokens answer a one-line question.
- **A failing tool returns JSON, not an exception.** `{"error": "..."}` is
  something the model can recover from; a thrown error ends the conversation
  mid-claim.
- **12 turns is a hard stop** (`DEFAULT_MAX_TURNS`). `stopped=model_finished`
  means it answered on its own; `max_turns` would mean the cap bit, which is an
  infrastructure failure wearing a model failure's clothes.
- **Order is enforced by the prompt, not by code.** `coverage-prompt.ts` is a
  ranked procedure — record first, filter the search to that form, read the
  endorsements too — because a model will satisfy an unordered list in a way you
  did not intend.

---

## Step 7b · Pillar 2 — The same pillar, another way: Mastra

### What a loop framework is, plainly

The model cannot answer on its own — it has to look things up. So there is a
back-and-forth: send the question, see if the model asked for something, go get
it, send it back, repeat until it stops asking. Plus the fiddly parts — stop
after N rounds so it cannot spin forever, count tokens, handle a tool that
throws, check the answer came back in the right shape and ask again if it did
not.

**That loop is the same shape every time, and a loop framework is library code
that runs it for you.** Mastra is one. The OpenAI Agents SDK is another. So is
LangGraph. They are competing products for the same chore.

Everything above ran on the OpenAI Agents SDK. **This is a second way to do the
identical job** — same tools, same prompt, same schema, same answer shape — with
a different framework driving the loop.

**Mastra has no tools of its own; it borrows ours.** `registry.ts` holds the
three tools, and the adapter is about twenty lines: for each of our schemas it
makes a Mastra tool whose body calls straight back into `registry.dispatch()`.
Timing, error shaping and the `live | fixture` audit record are therefore
identical on both engines. Mastra only decides **when** to call them. That is
why `search_guidance` needed no Mastra work at all — registered once, both
engines picked it up.

Why bother: `loop.types.ts` has always claimed the engine is replaceable. One
implementation cannot test that claim. Two can, and the eval suite is what
settles which is better rather than an opinion.

### What the two engines actually did, measured

`pnpm eval --only cov-001 --repeat 5` on each, same corpus, same prompt, same
schema — the only variable is the loop:

```
                runs   turns    tool calls   in-tokens   p95
agents-sdk       5/5    3-4      3 every run    70,760   38.1s
mastra           5/5    4        3 every run    84,315   33.3s
```

Both correct, every run. **Mastra is the steadier of the two** — 4 turns and 3
tool calls on all five, where the SDK varied between 3 and 4 turns.

Note that Mastra used **19% MORE** input here. A single earlier run had
suggested it used 26% *less*, and that was worthless: one observation is not a
measurement. The whole reason `--repeat` exists.

### A worked example of drawing the wrong conclusion

Running the same question by hand — **without `--policy`** — Mastra answered
**$40 per day** twice out of two. Two tool calls, the attached endorsement never
searched, `conflicts` empty. Every citation real, the quoted text verbatim.

That looked like an engine defect, and the difference between `ask` and `eval`
looked like the cause: the eval passes the policy id as a field, so
`buildUserPrompt` prepends "Policy AUT-4471." while `ask` without `--policy`
leaves the id in free text.

**So a case was written to pin it down — `cov-008`, identical to `cov-001` with
no `policy` field. It did not reproduce.**

```
                              --policy   runs    result
mastra   (ask, by hand)          no       2      0/2 correct
mastra   (eval, cov-008)         no       5      5/5 correct
agents-sdk (eval, cov-008)       no       5      5/5 correct
```

Ten runs on the exact input shape that was supposed to be the problem, and every
one answered $50/21 with three tool calls. The registries are identical and both
paths call the same `askCoverage`, so no structural difference explains it. **The
sample was two.**

`cov-008` stays, because it tests a path nothing else tests — every other case
hands the policy id over as structured data, so the suite had never exercised
the way a person actually types a question. It is just not evidence about
engines.

### And the check that shipped broken

`cov-008` was written with `answer_lacks:$40`, on the reasoning that a hedged
answer mentioning both figures is not a correct answer. It failed three runs
whose answers were right:

```
"$50 per day, maximum 21 days per occurrence
 (endorsement PP 03 24 06 24 replaces the form's $40/day, 30-day provision)."
                                                  ↑
                                     flagged as a DANGEROUS FALSE ANSWER
```

That is exactly what the prompt asks for — lead with the endorsement, cite the
base form as the superseded position. A substring search cannot tell an answer
from an explanation of what it supersedes.

**And this was a known bug.** `cov-003`'s note already records dropping the same
check for the same reason. A fix documented in one case did not stop the next
case reintroducing it — which is worth more as a lesson than the check was worth
as a check.

**Two conclusions drawn from tiny samples in one sitting**, both wrong: "Mastra
is 26% cheaper" (it used 19% more over five runs) and "Mastra skips the
endorsement" (it does not, 10/10). `--repeat` exists for this, and running it is
not the same as believing it.


`EMBEDDINGS` already chooses the embedding model this way; `LOOP` chooses the
engine.

```bash
LOOP=sdk|mastra                                    # .env, the default
pnpm ask "…" --policy AUT-4471 --loop mastra --trace
pnpm eval --loop mastra                            # a baseline per engine
pnpm compliance:mastra                             # OFFLINE — the wire assertions
```

```
ask.ts / eval/run.ts
   │
   ▼
loop.factory.ts   loopChoice(flag ?? LOOP ?? 'sdk')
   │
   ├─ loop-sdk.ts      @openai/agents          ← default
   └─ loop-mastra.ts   @mastra/core + @ai-sdk/openai-compatible
        │
        │  SHARED, so a diff between engines means something:
        │    registry.ts · coverage-prompt.ts · the Zod schema
        │    DEFAULT_MAX_TURNS · the coherenceErrors() re-check
        │
        │  provider: @ai-sdk/openai-compatible, NOT @ai-sdk/azure —
        │  the Azure one builds /openai/deployments/{name}?api-version=
        │  and our endpoint is already /openai/v1
        │
        │  supportsStructuredOutputs: true  ← without it the SDK sends
        │  response_format: json_object ("some JSON") and Foundry rejects
        │  the call. The obvious fix — putting "json" in the prompt — makes
        │  the error vanish having silently downgraded Pillar 3.
        │  pnpm compliance:mastra asserts json_schema on the wire.
        ▼
   same LoopResult, same TurnRecord[], same LoopEvent stream
```

**First measured difference, same question, same corpus:**

```
             turns  tools   in-tok   out-tok   wall
sdk            3      3      8,636    2,073    35.1s
mastra         4      3     12,347    2,271    30.5s
```

~43% more input tokens and a different turn boundary. Cause not yet known —
a baseline per engine settles it, and an engine change is a setup change, so
`eval:diff` will refuse to compare the two. That refusal is correct.

---

# Pillar 3 — the answer's shape

Ask a model a question and you get a paragraph. A paragraph is pleasant to read
and impossible to check: four sentences, three looked up and one invented, all in
the same confident tone. Nothing in the text tells you which is which, and nobody
re-reads a paragraph that sounds right.

So don't let it write one. Give it a form to fill in — the answer here, the
sources there, anything unverified in its own box, contradictions in another, and
whether this needs a human. That turns *"did it check this before saying it"* from
prose a person must read carefully into a field a computer reads in microseconds.

---

## Step 8 · Pillar 3 — Check the contract, without the model

**Why.** Step 7 produced a well-formed answer. That proves the schema works
*once*, on a good day, with a cooperative model. This step tests the contract
itself: hand the validator ten answers you wrote by hand — three that must be
accepted and seven that must be rejected — and see if it agrees. No model, no
tokens, no network.

**Files:**
- `packages/insurance/src/schema/coverage-schema.ts` — the shape, the Zod types,
  and `coherenceErrors()`
- `packages/insurance/src/schema/schema-selftest.ts` — the ten cases and the
  description check

```bash
pnpm schema:check      # OFFLINE
```

**You should see** each case listed `ok` or `FAIL` with a one-line *why*, then a
score out of the case count, then the description-coverage result. Anything less
than a clean sweep is a broken contract, and the model is not involved either way.

### How it works

```
pnpm schema:check                              OFFLINE — no model, no tokens
   │
   ▼
schema-selftest.ts
   │
   │   CASES[] — hand-written answers, each with `expect`:
   │             'accept'  or  a substring the error MUST contain
   │
   ├─ 3 that must be ACCEPTED
   │      · a normal cited answer
   │      · an escalation with a partial answer alongside it
   │      · a conflict that IS resolved, with resolved_by set
   │   ─────────────────────────────────────────────────────────────────────
   │   These are the control group. Without them a validator that rejects
   │   everything would score 7/10 and look strict rather than broken.
   │
   ├─ 7 that must be REJECTED, each naming the error it must produce:
   │
   │   'must be escalated, never decided'
   │   ─────────────────────────────────────────────────────────────────────
   │   A conflict with resolved_by: null and escalate: null. The shape is
   │   perfect. It means the model silently picked a side. THE most important
   │   rule in the file.
   │
   │   'must be in one list or the other'
   │   ─────────────────────────────────────────────────────────────────────
   │   An answer with no citations and no unverified_claims — a claim with
   │   nothing behind it and no admission that there is nothing behind it.
   │
   │   'if you cannot answer, say why'
   │   ─────────────────────────────────────────────────────────────────────
   │   answer: null AND escalate: null. Valid JSON that tells the adjuster
   │   nothing at all.
   │
   │   'does not match schema'  (x2)
   │   ─────────────────────────────────────────────────────────────────────
   │   Missing a required field, or an invented extra one such as
   │   confidence: 0.92. strictObject refuses it — models love emitting a
   │   confidence number and the same process that produced the guess
   │   produced the number.
   │
   │   'fewer than two positions'
   │   ─────────────────────────────────────────────────────────────────────
   │   A "conflict" listing one side. A disagreement needs two documents.
   │
   │   'not valid JSON'
   │   ─────────────────────────────────────────────────────────────────────
   │   The model refusing in prose. Must be caught and retried, not crash.
   │
   ▼
each case → validateCoverageAnswer(raw)          ← the SAME function the loop uses
   │
   ├─ JSON.parse            unparseable → 'not valid JSON'
   │
   ├─ Zod .parse            SHAPE: fields present, right types, no extras
   │                        → 'does not match schema'
   │
   └─ coherenceErrors()     COMBINATIONS that fit the shape and are still
   │                        wrong. Three plain `if` statements. Deliberately
   │                        NOT Zod .refine() calls, because the message is
   │                        what gets handed back to the model to fix, and
   │                        "invalid input" is not actionable.
   ▼
compare against `expect`   accepted when it should be? rejected with the RIGHT
   │                       error? A case that fails for the wrong reason is not
   │                       a pass.
   ▼
schema contract: N/N passed
   │
   ▼
checkDescriptions()        walks the GENERATED JSON Schema and requires a
   │                       description on every field at every depth
   │   ─────────────────────────────────────────────────────────────────────
   │   Those .describe() strings are prompt engineering, not documentation:
   │     "Be honest; an empty array is a strong statement and will be audited."
   │   Drop one and the schema still validates, the types still infer, the ten
   │   cases still pass — and the model quietly gets less guidance. Nothing
   │   else in the repo would notice. So it is checked mechanically, and the
   │   check was verified by deleting a description and confirming it failed.
   ▼
exit 1 if any case failed OR any description is missing
```

- **This tests the contract, not the model.** Ten fixed strings in, deterministic
  result out. Testing the model is Pillar 4.
- **Two layers, because shape is not enough.** `{answer: null, escalate: null}`
  passes any schema validator and says nothing. Zod cannot express "an unresolved
  conflict must escalate"; nine lines of TypeScript can.
- **Rejections name their error on purpose.** Asserting only "it was rejected"
  lets a validator pass for the wrong reason — the same trap as a test that
  cannot fail.

---

# Pillar 4 — evals

Step 7 gave you one good answer. That is an anecdote. A week after a demo the
same system states a wrong dollar figure or cites a clause that does not exist,
and the customer stops trusting *everything* it says — including all the parts
that were right. "I tried it a few times and it seemed fine" is what leads there.

An eval is a test suite where the thing being tested is the model. You write down
questions you know the answer to, run them, and count.

The trick is what you count. A check can reliably answer *"is this box empty when
it should not be"* — did it cite anything, does the citation resolve to a real
file, did it escalate. It cannot answer *"was that a good answer"*; that needs a
human or another model, which is slow, costs money, and disagrees with itself.
So you push everything you can into the first kind, and count what is left.

---

## Step 9 · Pillar 4 — Measure it

**Why.** The same question does not produce the same answer every time. Run each
case once and you have a sample, not a measurement — you could run the identical
suite twice and get different scores with nothing having changed.

**Files:**
- `docs/evals/cases.jsonl` — 8 cases, one JSON object per line
- `packages/insurance/src/eval/run.ts` — the runner
- `packages/insurance/src/eval/checks.ts` — 13 checks, two of which read the TOOL
  TRACE rather than the answer
- `packages/evals/src/scorecard.ts` — severity buckets
- `packages/evals/src/telemetry.ts` — traces and scores, silent unless
  configured

```bash
pnpm eval:smoke        # 8 runs  — a smoke test, NOT a measurement
pnpm eval              # 40 runs — 8 cases x 5 repeats, writes a baseline
```

Start with the smoke test. It is `--repeat 1`, it prints a warning saying so, and
it writes no baseline. `pnpm eval` is the real thing: **40 live model runs**, each
one a full loop with tool calls, so it costs roughly 40x what a single `pnpm ask`
costs and takes minutes rather than seconds.

```
  runs passed               : 40/40
  cases green (N/N)         : 8/8
  cases flaky (some, not all): 0
  false answers (dangerous) : 0 of 40 runs
  over-caution (annoying)   : 0 of 40 runs
  tokens                    : 767829 in / 104026 out
  p95 latency               : 74.1s  (over 40 runs)
```

**Read the severity lines before the score.** 40/40 is the headline; *false
answers: 0* is the number that matters. A suite can be 38/40 with two dangerous
failures and be far worse than 35/40 with five over-cautious ones — one category
is a wrong figure an adjuster repeats to a customer, the other is a flag they
ignore.

### What three changes cost, measured

Three landed between two baselines on 2026-09-11: `search_guidance` added to the
ordered procedure, free-text policy ids normalised in `coverage.ts`, and a
completeness rule in the prompt.

```
case      before             after
cov-002   5/5  77,111 tok    5/5  57,650 tok    ← routing, -25%
cov-008   3/5  16,467 tok    5/5  18,400 tok    ← the policy-id fix
others    5/5  unchanged     5/5  +5-8% tokens  ← completeness rule

avg input per run   20,714 → 19,195   (-7%)
output tokens       95,594 → 104,026  (+9%)
p95 latency         86.9s  → 74.1s    (-15%)
```

More correct, cheaper AND faster at once — rare enough to be worth stating
plainly. The completeness rule cost 5-8% more input on the small cases and paid
for itself several times over in `cov-002`, where routing to `search_guidance`
stopped the model hammering `search_policy` ten times per question.

### The words first

Six terms get used constantly here. None of them are complicated.

- **eval** — short for *evaluation*. A test where the thing being tested is the
  model, not the code. Normal tests ask "did this function return 4?". An eval
  asks "did the assistant answer the customer correctly?" — and since the model
  can answer differently each time, you run it repeatedly and count.
- **case** — one question you already know the right answer to, written down with
  the things that must be true of any acceptable answer.
- **check** — a tiny function that looks at one part of the answer and returns
  pass or fail. It never judges whether the writing was good. Only whether a box
  is filled, a number is present, a source exists.
- **citation** — the string the model attaches to each claim, saying where it got
  it: `record:AUT-4471`, or `policy:PP 00 01 06 24#Part IV > 4.4`. It is just text
  the model wrote, which is exactly why one check's whole job is verifying that
  the file it names actually exists.
- **fixture** — a tool's answer, recorded once and replayed afterwards instead of
  really running the tool. Removes a source of variation.
- **baseline** — the scorecard of one full run, saved to a file and committed, so
  a future run can be compared against it instead of against somebody's memory.
- **Langfuse** — an optional web dashboard, running in Docker on your own
  machine, that stores each run so you can click into it and see what happened.
  Not required: with it switched off, everything below behaves identically.

### How it works

```
pnpm eval  [--repeat N] [--only cov-001] [--tag escalation]
   │
   ▼
┌─ IN ──────────────────────────────────────────────────────────────────────┐
│ docs/evals/cases.jsonl — 7 lines, one per case: the whole suite │
│                                                                            │
│   {"id":"cov-001", "policy":"AUT-4471",                                    │
│    "input":"how much rental car reimbursement is covered per day…",        │
│    "checks":["cites_form:PP 03 24 06 24","answer_contains:50",             │
│              "citations_resolve"],                                         │
│    "note":"AUT-4471 has PP 03 24 06 24 attached, so the endorsement        │
│            governs: $50/day for 21 days"}                                  │
│                                                                            │
│ `input` is the question, typed exactly as an adjuster would ask it.        │
│ `checks` is what must be TRUE of the answer — never how to produce it.     │
│ `note` is why this case exists: the specific trap it guards.               │
└────────────────────────────────────────────────────────────────────────────┘
   │
   ▼
run.ts — the runner
   │
   ├─ builds the same client, store and tool registry that ask.ts builds
   │     ─────────────────────────────────────────────────────────────────────
   │     IN : your .env — Azure endpoint, model names, database URL
   │     OUT: a working loop identical to the one behind `pnpm ask`
   │
   │     get_policyholder is replayed from a FIXTURE — a saved copy of what
   │     that tool returned, in docs/evals/fixtures/tools/. It reads local
   │     files, so replaying changes nothing and removes a variable.
   │     search_policy is NOT replayed. Retrieval is part of what is being
   │     measured, so it hits Postgres live on every single run.
   │
   ▼
for each case, N times (default 5, one after another):
   │
   ├─ runLoopSdk(...)  ── the loop from Step 7, unchanged
   │     ─────────────────────────────────────────────────────────────────────
   │     IN : the question + the same system prompt + the same Zod schema
   │     OUT: a CoverageAnswer object, plus a record of every turn —
   │          which tools ran, how long, how many tokens
   │
   │     Nothing here is eval-only. The turn cap is not even passed, so it
   │     uses the same default a real request gets. Two caps would make
   │     "this is what a real request does" a lie.
   │
   ├─ if no valid answer came back
   │     every check is marked failed with ONE clear reason, because the
   │     cause is upstream of the checks and five confusing errors would
   │     hide it
   │
   └─ otherwise run each check named in the case
         ──────────────────────────────────────────────────────────────────────
         IN : the answer object          OUT: pass/fail + a one-line reason
         The check name says what it does. Each is a few lines of TypeScript:

         citations_resolve          for every source the model cited, does a
                                    file of that name actually exist on disk?
                                    This is the one that caught the invented
                                    "PA-END-2023-01".
         cites_form:PP 03 24 06 24  did it cite that specific document?
         answer_contains:50         is that number in the answer text?
         answer_lacks:$40           is that number ABSENT from it?
         escalates                  did it hand this to a human?
         does_not_escalate          did it NOT punt a question it could answer?

         A check name with a typo fails loudly instead of being skipped — a
         test you think you have and do not is worse than no test.
   ▼
scorecard.ts — sorts the failures
   │     ─────────────────────────────────────────────────────────────────────
   │     IN : every run's checks    OUT: one label per run, and totals
   │
   │     Why not one percentage: "80% pass" hides whether the 20% was a wrong
   │     dollar figure or a slow connection. So every failed run is labelled:
   │
   │       false_answer     DANGEROUS. Cited a document that does not exist,
   │                        or refused to escalate when the corpus was silent.
   │                        This is the one that ends customer trust.
   │       over_caution     ANNOYING. Escalated something it could have
   │                        answered. Wastes the adjuster's time, harms nobody.
   │       no_answer        The model returned nothing usable at all.
   │       missing_fixture  OUR PLUMBING, not the model. A recorded tool
   │                        response was missing.
   │       uncategorised    A failure matching none of the above. It exists
   │                        because an early version silently dropped those
   │                        runs — and the run it swallowed was the most
   │                        informative one in the set.
   ▼
write the results
   │     docs/evals/results/last-run.json          every run, always
   │     docs/evals/results/baseline-<stamp>.json  ONLY on a full run with repeat > 1
   │     ─────────────────────────────────────────────────────────────────────
   │     A baseline is a saved scorecard you commit to git, so next month you
   │     compare numbers instead of memories. A single-repeat or filtered run
   │     is not a measurement, so it is forbidden from leaving one behind
   │     pretending to be one.
   │
   └─ langfuse.ts — only if LANGFUSE_* is set in .env
         sends: one trace per run (the question, the answer, each check's
         result, and the severity label computed by scorecard.ts), so you can
         open http://localhost:3000 and click through what happened.
         Unset → nothing is sent and the suite behaves exactly the same. A
         measurement that needs a service running before it can tell you
         whether the model works has made a broken dashboard and a broken
         model look identical from the outside.
   ▼
printed scorecard + exit code 1 if anything failed
```

### Check the scorecard itself

```bash
pnpm severity:check      # OFFLINE, instant, no model
```

```
scorecard-selftest.ts ──► feeds SYNTHETIC failures into severityOf()
   │
   ├─ EVERY CHECK IN checks.ts MUST MAP TO A BUCKET
   │     escalates · citations_resolve · cites_form · cites_record ·
   │     cites_something · flags_conflict · answer_contains ·
   │     answer_lacks · policy_form_is · has_answer   → false_answer
   │     does_not_escalate                            → over_caution
   │     ─────────────────────────────────────────────────────────────
   │     A check nobody classified lands in uncategorised — which is how a
   │     dangerous failure goes uncounted. Happened 2026-09-10: a run
   │     answered $40/30 for a customer on the $50/21 endorsement, failed
   │     cites_form + answer_contains, and the card printed "false: 1".
   │
   ├─ THE BUCKETS THEMSELVES
   │     missingFixture   → missing_fixture   our harness, not the model
   │     no answer        → no_answer         nothing came back to check
   │     passed           → pass              the control: a classifier that
   │                                          called everything dangerous
   │                                          would pass every test above
   │
   └─ NEGATIVE CONTROL
         "some_check_nobody_wrote_yet" → uncategorised
         ─────────────────────────────────────────────────────────────
         The load-bearing one. If this ever classifies, the rule has become
         a catch-all and every assertion above passes for the wrong reason.
   ▼
severity: PASS
```

A widened rule only executes when something fails, so a green suite proves
nothing about it. Hence synthetic failures, every time.

### Compare it to the old baseline

```bash
pnpm eval:history      # every baseline on disk, one row each
pnpm eval:diff         # the last two, case by case
```

```
pnpm eval ──► docs/evals/results/baseline-<stamp>.json ──► committed to git
                      │
       ┌──────────────┴───────────────┐
       ▼                              ▼
 pnpm eval:history              pnpm eval:diff
 one row per baseline:          which CASE moved, and which CHECK inside it
   pass rate · dangerous          · refuses to compare runs with different
   · flaky · p95 · setup            models, fixture modes or repeat counts —
 marks where the setup             that measures your SETUP, not your change
 changed, so rows that are       · a 1-of-5 move prints MOVED, never a
 not comparable look it            regression, and never fails the build
       │
       │  dangerous outranks pass rate: a row that gains passed runs AND
       │  gains a false answer got worse
       ▼
 baseline → change ONE thing → re-run → diff → keep it or revert
       │
       │  What no tool can know: whether you changed the CASES or the
       │  SEVERITY RULES. We did both on 2026-09-10 — dropped
       │  answer_lacks:$40 from cov-003, widened FALSE_ANSWER_CHECKS — so
       │  baselines either side are not comparable on those dimensions.
       │  That judgement stays yours; the reason is written in the case
       │  `note` and above FALSE_ANSWER_CHECKS.
```

### Langfuse — the optional dashboard

```bash
docker compose -f infra/docker-compose.langfuse.yml up -d
```

```
seven containers, all local
   langfuse         web UI + ingestion API      → localhost:3000
   langfuse-worker  moves events into storage
   postgres:16      users, projects, API keys, datasets
   clickhouse       the traces themselves
   redis            ingestion queue
   minio + mc       blob storage for large payloads
        │
.env ───┤  LANGFUSE_BASE_URL=http://localhost:3000
        │  LANGFUSE_PUBLIC_KEY=pk-lf-…   ← created in the UI, per PROJECT
        │  LANGFUSE_SECRET_KEY=sk-lf-…
        ▼
pnpm eval ──► one trace per run: the question, the full answer, every
   │          check's score, and severity — computed by OUR scorecard.ts,
   │          so the dashboard reports our judgement, not its own.
   │          The dataset run is NAMED after the baseline file, so a number
   │          on screen and a number in git always point at each other.
   ▼
http://localhost:3000/project/claims
   Tracing  → individual runs        Datasets → a whole eval run

   unset LANGFUSE_* → nothing is sent and the suite behaves identically.
   Self-hosted because a trace carries policy ids, coverage amounts and
   reasoning about a named customer. LANGFUSE_BASE_URL is the whole
   data-residency control.

   gotcha  keys authenticate as the PROJECT, so traces write fine even when
           your browser user cannot see the organisation holding it — you
           get "Project Not Found" while the data is sitting there
   gotcha  ONE span per run, not per tool call. Turn counts come from
           docs/evals/results/*.json or `pnpm ask --trace`, not the dashboard
```

- **Five runs, not one.** Case 1 was written as a known failure after one manual
  run answered $40/30 — then passed 5/5. One run says *broken*, five say
  *occasionally flaky*.
- **Case 7 is the control for case 1.** Case 1 can be passed by a bad fix
  ("always prefer the endorsement"); case 7 is where that fix turns red.
- **`citations_resolve` is the highest-value check.** A fabricated citation is
  worse than none — it looks like evidence, so nobody re-checks it.

---

## Step 10 · Pillar 4 — Fix something, and prove it

The suite is not a report card. It is the only way to tell a fix from luck.

```bash
pnpm eval --only cov-001 --repeat 20     # measure the suspect
# … change ONE thing …
pnpm eval --only cov-001 --repeat 20     # measure again
pnpm eval --only cov-007 --repeat 20     # the control that must NOT break
pnpm eval                                # full suite, writes the baseline
```

```
2026-09-10, worked example
   │
   ├─ MEASURE       cov-001 --repeat 20  →  19/20
   │     the failure: 4 turns, 3 tool calls, answer "$40 per day, 30 days"
   │     ─────────────────────────────────────────────────────────────────
   │     It SEARCHED the endorsement and named it, then quoted the base
   │     form anyway. So the bug was not the procedure — it was precedence.
   │     An earlier failure (2 tool calls) looked like a skipped step and
   │     would have sent us fixing the wrong thing.
   │
   ├─ CHANGE ONE THING    packages/insurance/src/tools/coverage-prompt.ts
   │     was:  "set resolved_by to that record and answer normally"
   │     now:  "ANSWER WITH THAT DOCUMENT'S FIGURES. An attached endorsement
   │            REPLACES the base form wording it amends… Resolving the
   │            conflict and then quoting the superseded figure is the same
   │            wrong answer as never having looked."
   │
   ├─ RE-MEASURE    cov-001 --repeat 20  →  20/20
   │     ─────────────────────────────────────────────────────────────────
   │     Encouraging, NOT proof. At the old 5% rate you would still see a
   │     clean 20 about a third of the time. Confidence comes from the rate
   │     staying at zero across later full runs.
   │
   ├─ CHECK THE CONTROL   cov-007 --repeat 20  →  20/20
   │     ─────────────────────────────────────────────────────────────────
   │     cov-007 is the customer with rental cover and NO endorsement, where
   │     $40/30 is correct. If "endorsements replace base wording" had
   │     leaked into "prefer endorsements", this is where it breaks.
   │     Still 2 tool calls per run — it is not chasing an endorsement that
   │     does not exist. Targeted, not a general bias.
   │
   └─ RECORD        pnpm eval  →  baseline-<stamp>.json  →  pnpm eval:diff
```

- **Validate a fix at the rate of the BUG, not the rate of the suite.** This is
  the one a reader gets wrong. The full-suite baselines either side of the fix
  both read 35/35, and `eval:diff` returned:

  ```
  VERDICT
  No case moved by more than the noise band. On this evidence the change
  is NEUTRAL — which for a refactor is the result you want, and for a fix
  means it did not work.
  ```

  It did work. The comparison was **underpowered**: at 5 repeats a 1-in-20
  failure is expected 0.25 times, so a clean baseline says nothing either way.
  The evidence lives in the targeted runs — 19/20 → 20/20, plus 5/5 in the
  suite, i.e. 25 clean post-change runs against ~1.25 expected failures.

  ```
  full-suite baselines   →  catching REGRESSIONS across everything
  --only <case> --repeat 20  →  proving a RARE fix, both sides of the change
  ```

  The diff footer says it too — *a move of 1 run or fewer is treated as
  sampling noise — raise `--repeat` before acting on a small difference.* Read
  its verdict against the sample size, not as a fact.

- **A rare failure is cheap to observe and expensive to prove gone.** 1-in-20
  needs far more than 20 runs to call fixed. Say "not observed since", not
  "fixed".
- **Read the failing run before theorising.** The two `cov-001` failures had
  different causes — one skipped a step, one got precedence wrong — and only the
  turn count and the answer text told them apart.
- **Every fix needs its control.** A change that passes the target case and
  breaks its opposite is not a fix, and only the pair can tell you.

---

# Pillar 5 — cost and latency

Someone will ask what a claim costs and how long an adjuster waits. You cannot
work that out afterwards: a model call that already happened left no trace
unless you wrote one at the time.

---

## Step 11 · Pillar 5 — Write it down, then ship it

```bash
pnpm ask "…" --policy AUT-4471     # appends one line
pnpm eval                          # appends one line per run
pnpm ingest                        # appends one line, with embedding tokens
pnpm logs:sync --stats             # ships the file into Postgres, prints totals
```

```
every model call
   │
   ▼
telemetry/request-log.ts  logRequest()
   │   ts · claim · question · model · engine · turns · toolCalls
   │   inputTokens · outputTokens · ms · stoppedBecause · schemaRetries
   │   surface: 'ask' | 'eval:cov-001#3' | 'ingest'
   │   costUsd + costNote  ←── PRICING table
   │
   ├─ appended to logs/requests.jsonl          SYNCHRONOUS, wrapped, never throws
   │     ─────────────────────────────────────────────────────────────────
   │     A log write must not be able to fail a claim. A file append cannot
   │     fail in a way that matters; a network insert can — a timeout, a
   │     pooler hiccup, a serverless database waking from idle.
   │
   └─ pnpm logs:sync ──► Postgres table `request_log`
         │  primary key (ts, surface) + ON CONFLICT DO NOTHING → idempotent
         │  ─────────────────────────────────────────────────────────────
         │  Append locally, ship durably. If shipping breaks you still have
         │  the file; in a container with an ephemeral disk, the table is
         │  what survives a restart.
         ▼
      --stats:  cost by surface (ask vs eval vs ingest)
                cost per claim, which is the question finance asks

PRICING, in request-log.ts
   text-embedding-3-small   $0.02 / 1M      verified, retail API, swedencentral
   gpt-5-mini               $0.45 / $3.60   PROVISIONAL — every published meter
                                            for this region carries 'pp'
                                            (priority processing) and no plain
                                            GlobalStandard meter exists, so the
                                            tier is unconfirmed and may be ~2x
   ── the note travels on every logged line, not just in a comment
   ── settle it from Cost Management once usage lands (~24h), which is what you
      were actually charged and outranks any list price
```

- **Tagging by claim is the whole point.** "What did claim AUT-4471 cost" is
  unanswerable unless the tag is written at call time. Pass `--policy` on `ask`
  or the field logs null.
- **`surface` keeps eval traffic out of the customer numbers.** 35 eval runs and
  one adjuster question must never be summed together.
- **Ingest is the cost that scales with the corpus, not with traffic.**
  `embeddings.ts` now accumulates `usage.prompt_tokens` across batches so that
  line is priced with the verified embedding rate.
- **Refuse to invent a price.** An unpriced model logs `costUsd: null` plus the
  reason. A precise-looking wrong number ends up in a business case.

**Still owed:** the pricing above is provisional until Cost Management confirms
it. The HTTP surface is covered — `POST /api/ask` goes through the same
`coverage.ts` entry point as `ask` and `eval`, so it writes the same line, with
`surface: "http"`.

---

# Pillar 8 begins — the surface

Everything above runs in a terminal. An adjuster does not have a terminal.

```bash
pnpm dev          # → http://localhost:3200   (port 3000 is Langfuse here)
```

Turbo builds the domain first, then starts the web app. One command.

---

## Step 12 · The web app — what it is and what it is not

**What it is.** A TanStack Start app in `apps/insurance-app`: pages and server routes in
one project, importing the domain as a package.

```
apps/insurance-app/src/
  routes/index.tsx            the coverage desk — the adjuster's screen
  routes/api.ask.tsx          POST /api/ask — the loop, streamed
  routes/api.policyholders.tsx GET  — the customer list behind the dropdown
  routes/__root.tsx           the <html> document, fonts, query client
  lib/ask-stream.ts           reads the SSE stream with fetch
  styles/app.css              the design tokens
  server.ts                   turns the built handler into a listening process
```

**What it is not: the product a customer gets.** In a real deployment the
assistant is a panel inside the insurer's claims system — Guidewire, Duck Creek,
or something built in-house — and the adjuster never picks a customer or types a
policy id, because she already has a claim open and the host passes the id as
context. This app exists because the demo has no host to be embedded in.

That is why the seam is `{ question, policy }` and not a UI feature:

```
stays the same per customer          differs per customer
─────────────────────────────        ─────────────────────────
the endpoint contract                how the id gets there
the domain: grounding, tools,        who they authenticate as
  schema, evals, telemetry           where it renders
the answer shape and citations       the id FORMAT itself (AUT-4471 vs
                                       POL-2023-887654 vs 0012345678)
```

The per-customer work is a thin adapter mapping their claim record onto that
contract. Everything below the seam — the part with the eval suite behind it —
does not change.

### How one question flows

```
the page (index.tsx)
   │  question · policy id · engine
   ▼
lib/ask-stream.ts        fetch(), NOT EventSource
   │  ─────────────────────────────────────────────────────────────
   │  EventSource is GET-only and cannot set headers: the question would
   │  travel in the URL where proxies and access logs keep it, and there
   │  would be nowhere to put the x-api-key the guard requires.
   ▼
POST /api/ask            routes/api.ask.tsx
   │
   ├─ authorize()        Pillar 6, BEFORE parsing a body or opening a
   │                     connection. Nothing is spent on a request that is
   │                     not allowed.
   │
   ├─ askCoverage()      ONE import from the domain. The route does not
   │                     assemble a client, a store, a registry, a prompt
   │                     and a schema — that is the domain's job, and doing
   │                     it in two places lets the terminal and the browser
   │                     drift apart while both look healthy.
   │
   ├─ onEvent  ──────►   event: tool_call / tool_result / schema_retry
   │                     the same LoopEvent stream `--trace` prints, so the
   │                     terminal and the browser cannot disagree about what
   │                     happened
   │
   ├─ : heartbeat        every 15s — a proxy will drop a connection that is
   │                     idle for a minute, and cov-002-style searches are
   │
   └─ event: answer      the VALIDATED CoverageAnswer, once
      or event: error    exactly one terminal event, always
```

**The answer is not streamed token by token, on purpose.** Pillar 3 says an
answer is a validated object. Half-arrived JSON has not passed
`coherenceErrors()` yet, so streaming it would put an unchecked dollar figure on
screen for two seconds. The live feeling comes from the tool events, which are
real events rather than a typing animation.

### What the screen shows, and why

- **Working notes in the margin**, each with a plain sentence: *"Searching only
  PP 00 01 06 24, the form this customer is on. Twelve near-identical forms each
  contain a section 4.4 with different amounts, so an unfiltered search finds
  the right clause in the wrong policy."* The trace exists to be read by someone
  who does not know what a tool call is.
- **Escalation as its own block, above the findings.** Pillar 7 makes escalation
  a FIELD; a screen that buries it in a paragraph throws that away.
- **Conflicts with both positions quoted**, and either *"Settled by
  record:AUT-4471"* or *"Nothing settles it, which is why this goes to a
  person."*
- **Every claim with its source and exact wording.** An answer without a quote
  is a rumour.
- **Failure states that say which kind of failure it was** — `max_turns` reads
  as "it ran out of turns rather than answering badly", because those need
  different reactions.

### Who is who: three levels that get confused

```
Meridian Mutual                 ← the INSURER. Our customer. One deployment,
   │                              their corpus, their id format.
   │
   ├── 12 policy FORMS          ← their PRODUCTS, as documents
   │     PP 00 01 06 24, PP 00 01 09 18, PP 00 01 01 15, PP 00 03 06 24, PP 00 02 06 24,
   │     four state variants, two endorsements
   │
   └── 18 POLICYHOLDER RECORDS  ← their CUSTOMERS. One per contract.
         AUT-4471  Maria Santos    on form PP 00 01 06 24
         AUT-4472  Daniel Okafor   on form PP 00 01 06 24
         AUT-4473  Naomi Ferreira  on form PP 00 01 06 24
```

**A policy id identifies a person's contract, not a document.** The form is the
template that contract uses, and many customers share one — all three above are
on `PP 00 01 06 24`.

**Which is why the form alone is not enough:**

| | form | rental selected | endorsement | correct answer |
|---|---|---|---|---|
| Maria Santos, `AUT-4471` | PP 00 01 06 24 | yes | PP 03 24 06 24 | **$50/day, 21 days** |
| Daniel Okafor, `AUT-4472` | PP 00 01 06 24 | **no** | — | **no rental benefit at all** |

Same document, opposite outcomes. The form says what the PRODUCT offers; the
record says what THIS PERSON bought and what is attached to their policy. An
assistant that read only the forms would tell Daniel he gets $40 a day, fluently
and with a correct-looking citation.

That is the whole reason the procedure is record first, then a search filtered
to what the record named — and why the dropdown lists people. An adjuster is
never asking "what does form PP 00 01 06 24 say"; she is asking what THIS claimant
gets, with their claim open in front of her.

**At a second insurer** the forms, the customers and the id format all change —
`POL-2023-887654` instead of `AUT-4471`. That is the `DOMAIN:` seam. Within one
insurer it is still one id per contract, not one per company.

### The customer dropdown, and the rule it does not break

`GET /api/policyholders` lists all eighteen records with the form each customer
is on. It is a stand-in for the claims system.

**This does not reopen the lookup-versus-search decision.** `get_policyholder`
exists to NOT be a search, because "the five most Maria-shaped records" is a
catastrophic way to answer a deductible question. That rule is about ANSWERING.
This list is identity resolution, and the difference is who decides: the model
never sees it and never picks from it — a person does, and the pick becomes the
`policy` parameter. If that ever changes, the rule is broken and no eval case
will catch it, because no case asserts something the model was never given.

### Running it for real

```bash
pnpm build                                   # both packages
API_KEY=$(openssl rand -hex 32) PORT=8080 \
  node apps/insurance-app/dist/server/server.js        # a listening process
```

`apps/insurance-app/src/server.ts` is that process. TanStack Start 1.168 has no adapter
system — the only hook is `server.entry` — so it is ~60 lines of `node:http`
with no new dependency: serve `dist/client`, otherwise hand the request to the
built handler, and pipe the response back so SSE still streams.

**Three things it took a wrong turn to learn:**

- `createStartHandler` returns a PLAIN FUNCTION. The `{ fetch }` shape is what
  the DEFAULT EXPORT needs, for the dev plugin. Swap them and the server boots,
  listens, and throws on every request.
- Without a static-file branch the page server-renders and never hydrates,
  because `/assets/*.js` 404s. It looks fine and is dead.
- `import.meta.env.DEV` is baked to `false` at build time, so a production
  server with no `API_KEY` returns 503 to everything while health probes stay
  green. That is the fail-closed guard doing its job, and it reads like a broken
  deploy at 2am unless you know.

