# The guide to this project

One file. What Forward Deployed Engineering is, what the eight pillars are, what
this repo has built, which half of each pillar is a framework and which half is
ours, and what gets built next. No jargon — if a sentence here needs something
you do not already have, that is a bug in this file.

Everything except the code blocks has an [audio version](narration/README.md).

**The other two docs.** [`README.md`](README.md) is how to run it.
[`PROGRESS.md`](docs/PROGRESS.md) is the engineering log — every decision, bug and
date, in full. This file replaces the former `FDE.md`, `FRAMEWORKS.md`,
`PILLARS.md` and `JOB-PLAN.md`, which are kept unedited in
[`archive/docs/`](archive/docs/) for the rejected options and the long
walkthroughs that did not survive the merge.

---

## Section 0. The four documents, and which to read

| file | answers |
|---|---|
| **`GUIDE.md`** (this) | *why* the code looks like this — long-form reasoning per pillar |
| [`RUN.md`](RUN.md) | *how to run it* — why → command → file → what you should see, every number measured |
| [`TEMPLATE.md`](docs/TEMPLATE.md) | **use it on another customer** — what transfers, what you rewrite, what to build first |
| [`SWAP.md`](docs/SWAP.md) | what is hand-written, what a package could replace, and what state each swap is in |

If you are picking this up cold: `RUN.md` to run it, `TEMPLATE.md` to reuse it.

---

## Section 1. What this is

A **Forward Deployed Engineer** is embedded with one customer, handed their
specific messy problem, and has to build something they will trust — fast, with
a language model somewhere in the middle. Not research; not building for
millions of anonymous users over three years. **One customer, one problem, prove
it works, on a clock.** The word doing the work there is *prove*, because a
model out of the box is a very confident stranger: it answers anything,
fluently, with no visible difference between what it knows and what it made up.
The eight pillars are eight parts of a cage around that stranger.

**The pretend customer:** Meridian Mutual, a mid-size insurer. Fictional, and
so are all thirty documents in `docs/examples/`.

**The pretend bottleneck:** an adjuster — Priya — spends about twelve minutes
per claim just *looking things up* in policy wordings. Not deciding. Looking up.

**The scope, deliberately tiny — read this twice.** We answer coverage questions
about auto policies, with citations, and escalate when the documents do not
settle it. That is the whole scope. Narrowing like that *is* the skill: the
customer says "automate our claims process" and your job is to turn that into
something that can be built, measured and trusted rather than only demoed.
Explicitly out and staying out: approving or denying, calculating payouts,
fraud, any product line but auto, anything that writes to a real system.

**Today** it runs from a terminal, is not deployed, and has seven eval cases
where a real system needs fifty.

---

## Section 2. The one rule everything serves

> A checkable fact may be asserted only if a tool checked it or a document says
> it. Everything else is marked unverified, or escalated to a human.

Every piece of machinery below exists to make that sentence enforceable rather
than aspirational.

The system is layered, and each layer may depend only on the layers below —
never sideways, never up:

```
Platform (auth) → Telemetry → Retrieval → Tools → Agent loop →
Domain logic (prompt + schema) → API → UI → Evals (which check all of it)
```

The boring plumbing goes first because none of it retrofits cheaply. You cannot
decide in three months to have logged every request — the history is gone. You
cannot add structured output once fifty prompts already emit prose.

Downward-only dependencies are what let you replace the top without touching the
bottom. `packages/agent/src/loop-sdk.ts` has no idea policy search
exists; it runs whatever tools it is handed. That is what makes the loop itself
replaceable without touching one tool, prompt or eval case — which Section 10's
Phase A is about to rely on.

---

## Section 2b. The eight pillars at a glance

Each pillar answers one question. The `Steps here` column points at [`RUN.md`](RUN.md), which walks the commands in order.

| # | Pillar | The question it answers | Steps here | Commands |
|---|---|---|---|---|
| **1** | **Grounding** | Where do the facts come from? *Their documents — never what the model remembers.* | **1–5** | `chunks` · `holder` · `ingest` · `query` |
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

## Section 3. Pillar 1 — Grounding

### In plain words

Priya asks how much rental car her customer gets per day. The answer can come
from one of two places: what the model picked up while it was being trained, or
this insurer's own documents. Only the second one is safe. General insurance
knowledge is wrong for any specific insurer — limits, exclusions and
endorsements vary company by company and change every year. "Rental coverage is
usually about thirty dollars a day" is not helpful. It is wrong in a way that
sounds helpful.

So the documents have to be in front of the model. But you cannot hand it 79
full policy documents and ask about rental cars — too much text, and almost all
of it is about something else. So you cut the documents into pieces, and later
you fetch only the pieces that look relevant to the question.

The cutting is where it goes wrong. Cut carelessly and a piece arrives at the
model with no idea where it came from: *"we will pay $40 per day"* — from which
of the twelve forms? Nobody can tell, including the model. And that was the
small version of the problem: the corpus now holds 79 documents of ten types,
and most of them are not forms at all.

And some questions are not a search at all. "What is this customer's collision
deductible" has exactly one right answer sitting in one file. Looking for it by
similarity means asking for the five most Maria-shaped documents and hoping.

**The corpus is messy on purpose.** A tidy corpus means you skipped the job.
Four flaws are planted in the thirty documents under
`docs/examples/`:

1. **A contradiction.** The base form says $40/day for 30 days; an endorsement
   says $50/day for 21 days. Neither says which policies it attaches to — only
   a field on the individual customer's record settles it. The numbers cross
   deliberately: a 25-day repair favours the endorsement, a 30-day repair
   favours the base form. No "newer document wins" shortcut works. The model has
   to check the record.
2. **A coverage gap.** Rideshare driving appears in none of the documents. The
   correct behaviour is to escalate; the dangerous one is arguing from the two
   temptingly close exclusions — goods for a fee, renting your car out. Neither
   is about passengers.
3. **Three incompatible heading styles.** A citation has to survive all three.
4. **Tables carrying the numbers.** A deductible separated from the row naming
   its coverage is not a citable fact.

### Who is who: three levels that get confused

```
Meridian Mutual                 ← the INSURER. Our customer. One deployment,
   │                              their corpus, their id format.
   │
   ├── 12 policy FORMS          ← their PRODUCTS, as documents
   │     PP 00 01 06 24 and its two superseded editions, two other
   │     programs, four state amendatories, two endorsements, one
   │     exclusions schedule
   │
   ├── 67 GUIDANCE documents    ← how claims must be HANDLED, and what was
   │     24 adjuster bulletins    decided before. None of them changes what
   │     10 DOI circulars         a policy pays.
   │     20 determinations
   │      6 procedures · 3 manuals · 4 coverage opinions
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

**Two kinds of document, two access patterns.** Twelve policy wordings get
*searched*. Eighteen policyholder records get *looked up by exact id* and are
deliberately not searchable — AUT-4471's deductible has exactly one right
answer, and routing that through similarity search is `SELECT * WHERE name LIKE
'%maria%'` when you have a primary key sitting right there.

> **If the question has one exact answer, it is a lookup, not a search.**

### What you run

```bash
pnpm chunks                    # cut the corpus, report chunks + orphan tables   OFFLINE, free
pnpm holder AUT-4471           # exact record lookup, no search involved         OFFLINE, free
pnpm corpus:load               # seed files -> the `documents` table             NEEDS Postgres
pnpm corpus:check              # prove folder and database yield one index       NEEDS Postgres
pnpm ingest                    # embed every chunk into pgvector                 NEEDS an embedding model + Postgres
pnpm query "rental car limit" --form PP 00 01 06 24   # ranked retrieval             NEEDS Azure + Postgres
```

`pnpm chunks` prints `79 documents`, `chunks=555 orphans=0`, then re-runs at
400/200/120 chars so the splitting path actually executes: `orphans=0` is the
table rule holding. `pnpm holder` returns one record verbatim, no scores and no
ranking, which is the point. `corpus:load` must run before `ingest`, and
`ingest` before `query` finds anything.

### Where the documents actually live

The corpus used to be a folder, and `ingest` read it directly. **No customer has
a folder.** Policy wordings, endorsements, bulletins and past claim
determinations sit in a document management system — FileNet, SharePoint,
Documentum, Guidewire ContentManagement — reached through an API, and they were
there long before anyone arrived to build search on them.

So there are three layers now, and only the middle one is the source of truth:

```
examples/policies/*.md   →   documents table    →   policy_chunks
the SEED, in git             whole, UNCHUNKED       chunks + vectors
diffable, reviewable         precedence metadata    derived, disposable
── a fixture for their DMS ──┤                      ── what WE build ──
                        THE BOUNDARY
```

Everything left of that line is the insurer's and we only simulate it.
Everything right of it is the work. `ingest` now reads the **table**;
`corpus:load` is what puts the fixture there.

**Why the markdown stays in git anyway.** A corpus in version control is
diffable and reviewable in a pull request, so *"why did last week's score
change?"* has an answer. A database has no diff. The files are how we fabricate
a document history a real insurer would have accumulated over years — exactly
the way the eighteen policyholder records stand in for a policy admin system.
No product code reads them.

**Unchunked, deliberately.** Chunk size is already a tunable — `pnpm chunks`
reports 1200/400/200/120 — and it will change. If chunks were the only stored
form, re-chunking would mean going back to a source that is no longer there.

**What the seed reveals about metadata, and why the report is now empty.**
`corpus:load` names any document whose precedence metadata is incomplete. Today
it names none: all 79 carry a status, an effective date and an applies-to list,
because the generator writes them into every banner.

**Do not read that as normal.** It is the one place this corpus is *less*
realistic than a customer's. A real document management system has effective
dates half-populated, supersession tracked in a spreadsheet or in somebody's
head, and jurisdiction implied by a folder name. Discovering that is usually the
most valuable thing an FDE delivers in week one, and the check stays in the
output so that pointing this pipeline at a real store makes the gap visible on
the first run.

**The retired PoC corpus did demonstrate it, and left a lesson worth keeping.**
Most of its documents had no status at all, and one stated its supersession in
*prose* — "Superseded by PA-2022-04." — where no parser could reach it as a
relation. But the first count we published was wrong, and the error was ours: it
reported ten documents with no effective date when the real number was three.
The banner lines were joined with a space, so the value pattern ran past the end
of its line and swallowed the following sentence. Only the one document whose
date sat last on its last line survived.

That is the lesson: **a missing-data report is a claim about your parser at
least as much as a claim about the source**, and it is seductive precisely
because it confirms what you already believe about messy enterprise data. Open
the file and read it before you write the finding up.

**The swap was proved, not asserted.** `pnpm corpus:check` chunks the corpus
from both sources and compares a fingerprint of everything the vector store
receives — content and metadata. It failed on its first run: `loadDirectory`
sorts by filename (`auto-pa-2023-01.md`), the query sorted by document id
(without the `.md`), and that one character flips two documents past each other.
Chunk ids derive from position, so every id downstream moved. A re-ingest would
have silently rewritten every citation the model emits, and nothing would have
looked wrong. The check has a negative control for the same reason `orphans=0`
needed one.

### How it works

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

**Building the index.** Runs once, and again whenever the documents or the
embedding model change:

```
docs/examples/policies/*.md    12 markdown policy documents
        │
        ▼
loader.ts                                 read each file, sha256 the contents
        │   Document { id, text }
        ▼
chunker.ts                                split on headings; never cut a table
        │                                 from its header; glue the heading
        │                                 trail onto the front of the body
        │   Chunk { headings[], text, body, hash }
        ▼
ingest.ts                                 Chunk → LangChain Document
        │                                 metadata.formId ←── form-id.ts
        │                                 store.delete({}) first: no stale rows
        │   Document { pageContent, metadata }
        ▼
embeddings.factory.ts                     EMBEDDINGS=foundry | local
        ├─► embeddings.ts                 Azure text-embedding-3-small → 1536 numbers
        └─► embeddings.local.ts           bge-small, on this machine → 384 numbers
        │   number[][]
        ▼
store.ts  →  PGVectorStore  →  Postgres table `policy_chunks`
                                 content   the passage
                                 metadata  formId, section trail, body, hash
                                 vector    the position
```

**Answering a question.** Runs per question, and the order is the whole point:

```
   "how much rental car reimbursement does AUT-4471 get per day?"
                          │
        ┌─────────────────┴──────────────────┐
        │ 1. WHICH POLICY?                   │
        ▼                                    │
get-policyholder.tool.ts                     │
        │  reads docs/examples/policyholders/AUT-4471.md — exact id, no search
        │  → form: PP 00 01 06 24 · rental: yes · endorsement: PP 03 24 06 24
        │                                    │
        └──────── formId ────────────────────┤
                                             │ 2. WHAT DOES THAT FORM SAY?
                                             ▼
                                  search-policy.tool.ts
                                             │  embedQuery(question)
                                             │      └─► embeddings.factory.ts
                                             │  similaritySearchWithScore(q, k, {formId})
                                             ▼
                                        store.ts
                                             │  Postgres filters on formId
                                             │  FIRST, then ranks by distance
                                             ▼
                            passages, each with its section trail
                            and a similarity score
```

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
   │                                            128 / 205 / 573 / 805 chunks
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

  11 distinct form ids: PP 00 01 01 15, PP 00 01 09 18, PP 00 01 06 24, …
```

- **This is a dry run of the first half of `ingest`.** Identical code path, and
  then it throws the chunks away instead of embedding them. Free, instant, and
  the right place to look when retrieval is returning something odd.
- **The four budgets are the point.** At 1200 no section is long enough to split,
  so `window()`'s splitting branch never executes and `orphans=0` would be
  reporting code that never ran. 128 → 805 forces it.
- **`--form PP 00 01 06 24`** additionally prints which documents carry that id —
  the same exact-match rule the search filter uses.

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
- **This supplies the filter for everything else.** `Form: PP 00 01 06 24` is what
  `--form` gets set to, and `PP 03 24 06 24` is what settles the corpus's
  planted contradiction.
- **`source: "record:AUT-4471"`** is the citation format — the eval check
  verifies that string resolves to a real file.

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
   ├─ loader.ts       readdir docs/examples/policies/*.md → read → sha256
   │                    → Document { id, text }                     79 documents
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
0.569  PP 00 01 06 24 — Personal Auto Policy … > Part IV > 4.4 Rental Reimbursement
0.562  PP 00 01 01 15 — Personal Auto Policy … > Part IV > 4.4 Rental Reimbursement
   …
```

- **`<=>` is pgvector's cosine-distance operator, and the database does the
  maths.** Nothing is loaded into Node to be sorted; Postgres compares the
  question's position against all 128 rows and returns the nearest five.
- **That commented-out `WHERE` is the entire difference between the two runs.**
  With it, the wrong forms are discarded *before* ordering. Without it, all 128
  compete and five different products' section 4.4 win.
- **What leaves the machine:** the question text (to Azure, which never sees the
  database) and one SQL statement (to Postgres, which never sees Azure). The
  passages themselves never go anywhere.
- **What does not happen:** no chat model runs, and nothing is generated. This
  is the whole of the **R**.

| File | Does what | When it runs |
|---|---|---|
| `loader.ts` | reads the markdown, hashes it | ingest |
| `chunker.ts` | heading trail + table rules — the domain 10% | ingest |
| `form-id.ts` | extracts and **exactly** matches a form id | ingest *and* query |
| `ingest.ts` | chunk → LangChain doc, wipes the table, writes | ingest |
| `embeddings.factory.ts` | picks the embedding model | both |
| `embeddings.ts` / `embeddings.local.ts` | text → numbers, hosted or local | both |
| `store.ts` | the only file that knows it is Postgres | both |
| `get-policyholder.tool.ts` | exact lookup — supplies the form id | query |
| `search-policy.tool.ts` | filter-then-rank, returns passages + trail | query |
| `cli.ts` | the four commands: `chunks`, `holder`, `ingest`, `query` | you |

**Two arrows carry all the weight.** `form-id.ts` feeds *both* paths — it writes
`formId` into the metadata at ingest and matches it at query, so a change on one
side without the other silently breaks retrieval. And the arrow from the
policyholder record into the search filter is the one that decides whether the
answer is right: without it, the top five for "how much does rental
reimbursement pay per day" are a prior determination that says in its own text
it is not authority, an endorsement that may not be attached to this policy, and
three editions of the same form paying $30, $35 and $40 — with the one that
governs ranked fourth.

**What "embed" means, plainly.** The question *"how much rental car per day?"*
and the clause *"we will pay $40 per day, for a maximum of 30 days"* share
almost no words, so no keyword search finds one from the other. An embedding
model fixes that: text in, ~1,500 numbers out, and those numbers are a
*position* — passages about the same thing land near each other however
differently they are worded. Ingest gives every chunk a position; a query gets
its own position at ask time; Postgres returns the chunks nearest to it.
"Nearest" is by direction, not length, which is what `distanceStrategy:
'cosine'` selects.

Two consequences. **The same model must position both sides** — change
`FOUNDRY_EMBEDDING_DEPLOYMENT` and every stored position becomes meaningless, so
the whole corpus must be re-ingested. And **the numbers are not the text**: the
row stores the passage and its metadata alongside the vector, because the
coordinates only find the row and the model is handed the real words.

LangChain owns embedding, storage, retrieval and filtering. What it cannot do is
the transformation that encodes *what a policy document is*: its five JS text
splitters all drop the heading trail (Python has `MarkdownHeaderTextSplitter`,
the JS port does not) and `MarkdownTextSplitter` cuts a limits table away from
its header row. No trail means no `PP 00 01 06 24 > Part IV > 4.4` on a passage, so
no citation, so `citations_resolve` — the highest-value eval check — has nothing
to verify.

The search tool has **no score threshold**: on this corpus "rideshare coverage" —
answer *not present* — scores **0.460**, while "rental car limit" — answer present
— scores **0.360**, so a filter at 0.40 keeps the garbage and drops the useful
result. Similarity ranks topical overlap, not whether the answer is there; that
judgement is reading comprehension and belongs to the model. It also **filters
before it ranks**, because near-identical forms each carry a section 4.4:

```
0.569  PP 00 01 06 24     > Part IV > 4.4 Rental Reimbursement
0.562  PP 00 01 01 15     > Part IV > 4.4 Rental Reimbursement
0.559  PP 01 06 06 24  > Part IV > 4.4 Rental Reimbursement
0.559  PP 00 01 09 18     > Part IV > 4.4 Rental Reimbursement
0.550  PP 01 20 06 24  > Part IV > 4.4 Rental Reimbursement
```

Three different dollar amounts, nineteen thousandths of spread. Rank first and
filter after, and the top k is already full of the wrong form.

### The code

`packages/grounding/src/chunker.ts` — embeds the heading trail with the
body, so every retrieved fragment announces its own provenance:

```ts
for (const body of window(section.body, maxChars, overlapChars, localTables)) {
  const trail = headings.join(' > ');            // "PP 00 01 06 24 > Part IV > 4.4 …"
  const text  = trail ? `${trail}\n\n${body}` : body;
  chunks.push({ id: `${doc.id}#${chunks.length}`, documentId: doc.id,
                headings, text, body, hash: sha(text), index: chunks.length });
}
```

`body` is kept separately for display, because repeating the trail inside a quoted
passage reads like part of the clause. `window()` holds the table rule: it moves a
whole table into the next chunk rather than cutting it, repeating the header rows
if a table alone exceeds the budget.

`packages/insurance/src/config/form-id.ts` — matches a policy form id exactly,
so `PP 00 01 06 24` never also matches its four state variants:

```ts
// Greedy on the optional state suffix, so PP 01 50 06 24 wins over PP 00 01 06 24.
const FORM_ID = /\b(P[APE]-(?:END-)?\d{4}-\d{2}(?:-[A-Z]{2})?)\b/;

export function matchesForm(heading: string | undefined, wanted: string): boolean {
  return formIdOf(heading).toUpperCase() === wanted.trim().toUpperCase();
}
```

A `startsWith` on `PP 00 01 06 24` also returns `-TX`, `-CA`, `-NY` and `-FL` — four
state variants with different liability limits, silently merged: the right clause
from the wrong form, correctly cited, with nothing looking broken.

`packages/grounding/src/embeddings.ts` — ~30 lines of adapter, the only
file that changes if the provider changes, because LangChain talks to any
embedding provider through one two-method interface:

```ts
const BATCH = 96;                    // Azure caps a single embeddings request

const res = await this.client.embeddings.create({ model: this.deployment, input: batch });
// The API may return items out of order; `index` is authoritative. Sorting on
// it rather than trusting arrival order is the difference between a correct
// index and one that is subtly, silently wrong.
const sorted = [...res.data].sort((a, b) => a.index - b.index);
```

Get that sort wrong and chunk 5's coordinates attach to chunk 12's text. Nothing
looks broken; search just returns the wrong passage forever.

`packages/insurance/src/grounding/embeddings.factory.ts` — which embedding model,
decided in one place, because the four callers should never learn which they
got:

```ts
export function openEmbeddings(client?: OpenAI): EmbeddingsInterface {
  if (embeddingsChoice() === 'local') return new LocalEmbeddings();   // EMBEDDINGS=local
  return new FoundryEmbeddings({ client: client ?? openaiClient(),
                                 deployment: env.embeddingDeployment() });
}
```

`EMBEDDINGS=local` runs `bge-small` on the machine — 384 numbers per passage
instead of 1,536, no credential, no cost — and was written when the Foundry
resource became unavailable mid-session. It is the adapter claim above tested
rather than asserted: nothing above `Embeddings` changed. The standing caveat is
that **vectors from two models are not comparable**, so switching means
re-ingesting and it invalidates any eval baseline measured on the other one.

`packages/grounding/src/store.ts` — the one function that decides where
vectors live; this is the whole per-engagement change:

```ts
export async function openStore(embeddings: EmbeddingsInterface): Promise<PGVectorStore> {
  return PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: { connectionString: connectionString() },
    tableName: POLICY_TABLE,          // metadata carries formId + heading trail
    distanceStrategy: 'cosine',
  });
}
```

Postgres is the default for a non-technical reason: *"can we run Postgres"* is
never a blocker and it stays in the insurer's datacentre, while *"can we stand up
a vector database"* is a new-infrastructure meeting. `QdrantVectorStore` or
`AzureAISearchVectorStore` is a one-line change here.

`packages/insurance/src/tools/search-policy.tool.ts` — filtered similarity search
that says which kind of empty it is:

```ts
const filter = policy_form ? { formId: policy_form } : undefined;
const hits   = await store.similaritySearchWithScore(query, k ?? 5, filter);

if (policy_form && hits.length === 0) {
  return { results: [], note:
    `No document in the corpus has form id "${policy_form}". This does NOT mean ` +
    `the coverage question has no answer — it means the form id is wrong.` };
}
```

"No such form id" and "the corpus does not address this" are different facts with
different next steps — one is *ask again*, the other is *escalate*.

`packages/insurance/src/tools/get-policyholder.tool.ts` — the mirror image, whose
design is *not being a search*; a miss returns the ids that do exist and forbids
inference:

```ts
if (!known.includes(id)) {
  return { policy_id: id, found: false, known_policy_ids: known, note:
    `No policyholder record exists for ${id}. Do not infer this customer's ` +
    `coverage from another record or from the policy wordings — say the ` +
    `record was not found and escalate.` };
}
```

**Status: done.** LangChain.js + pgvector, with `chunker.ts` (274 lines) and
`form-id.ts` (43) as the domain half. Weak spot: pure vector search, no keyword
matching or reranker — deliberately, see Section 10.

---

## Section 4. Pillar 2 — The tool-calling loop

### In plain words

The model cannot open a file or query your database. It can only produce text.
So how does it get the customer's record?

You could paste everything into the question and hope you guessed right about
what it needs. That does not survive contact with a real corpus — you would be
pasting twelve policy forms into every question.

Instead you give it a menu. Along with the question you send a short list of
things it may ask you to do: *look up a policyholder*, *search the wordings*. It
replies **"run `get_policyholder` with AUT-4471"** — it does not run anything,
it asks. Your code runs it, and hands the result back. Then it either asks for
something else or answers. You repeat until it answers or you hit the cap.

That back-and-forth is the loop. The important part is who does what: the model
decides *what it needs*, your code decides *what it gets*. A model that could
reach the database itself would be a model you have to trust. This one you do
not have to.

### What you run

```bash
# one full question, end to end: tools called, validated answer out   NEEDS Azure + an ingested index
pnpm ask "how much rental car is covered?" --policy AUT-4471 --trace

# does the loop actually behave the way we claim on the wire?         OFFLINE, free (fake client)
pnpm compliance:check
```

The question is the first non-flag argument, so quote it; `--policy` says which
record to start from, `--trace` prints every tool call as it happens. Watch the
trace: a wrong answer with a sensible trace is a prompt problem, with a nonsense
trace a tool-description problem. `pnpm compliance:check` prints a
real-configuration table plus negative controls and ends in `compliance: PASS`.

### How it works

`@openai/agents` drives the loop, capped at 12 turns. Azure needs no
Azure-specific code — the SDK takes the already-configured Foundry client. Three
settings are non-default and all three are load-bearing, and **two of them are
why this pillar has its own compliance test**:

- **`store` defaults to `true`** — the provider retains the response payload
  whether or not you ever chain off it.
- **Tracing defaults to on**, exporting model inputs, tool arguments and tool
  results to `api.openai.com/v1/traces/ingest`. This is the dangerous one: it is
  a *second destination*, so model calls go to a Foundry endpoint in a region we
  chose while traces leave for OpenAI regardless — for an EU insurer, a
  cross-border transfer introduced by a library default nobody typed.
- **`parallelToolCalls` defaults to `false`**, which serialises same-turn calls
  and makes the whole path slower for reasons unrelated to the model.

Both egress defaults came from reading the SDK's types and source, not its docs.
Today the exporter happens to no-op — it skips when no OpenAI key is present and
we authenticate with `DefaultAzureCredential` — but **that is safety by
accident**: add `OPENAI_API_KEY` for an unrelated reason and claim text starts
leaving. So `pnpm compliance:check` captures the real outgoing request, asserts
these properties **with a fake `OPENAI_API_KEY` set**, and pairs each with a
**negative control** that must fail, because a check that cannot fail reads like
evidence while proving nothing:

```
REAL CONFIGURATION — these are the properties we claim
  ok    store is false on every request
  ok    registered tools reach the request
  ok    tracing dispatched nothing        zero spans, with OPENAI_API_KEY set

NEGATIVE CONTROLS — each must FAIL, or the check above is asleep
  ok    control: tracing enabled IS detected      5 span(s) seen
  ok    control: a naive Agent does NOT send store:false
```

> **Adopt the framework, then pin the compliance-critical behaviour with a test
> that fails the build.** You assert on the wire, not in a comment.

**One `ask`, end to end.** The loop, turn by turn:

```
pnpm ask "…"  [--policy AUT-4471] [--trace]
   │
   ▼
ask.ts
   │  openaiClient()                bearer token ← DefaultAzureCredential
   │  openEmbeddings + openStore()  ← all of Pillar 1, so search_policy works
   │  new ToolRegistry([ getPolicyholderTool(),      ← WHOSE policy is it
   │                      searchPolicyTool(store),   ← what the policy PAYS
   │                      searchGuidanceTool(store) ]) ← how it is HANDLED
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


### The code

`packages/agent/src/loop-sdk.ts` — points the SDK at Foundry and shuts
off its telemetry:

```ts
export function configureSdk(client: OpenAI): void {
  if (configured) return;
  setTracingDisabled(true);            // else traces go to api.openai.com
  setDefaultOpenAIClient(client as never);   // the whole Azure story — no branch anywhere
  setOpenAIAPI('responses');
  configured = true;
}
```

`packages/agent/src/loop-sdk.ts` — builds the agent with the two settings
that matter, and hands the Zod schema straight in as `outputType`:

```ts
const agent = new Agent({
  name: 'coverage', instructions: opts.system ?? '', model, tools,
  modelSettings: {
    store: false,               // no conversation state on the provider's side
    parallelToolCalls: true,    // SDK default is false
  },
  ...(opts.responseFormat ? { outputType: opts.responseFormat } : {}),
});
```

`packages/agent/src/loop-sdk.ts` — each tool's `execute` is a one-liner
over **our** registry, so fixtures, timing, error shaping and the
`source: 'live' | 'fixture'` record are unchanged; the SDK only decides *when*:

```ts
execute: async (args: unknown) => {
  const rec = await registry.dispatch(s.name, args);
  return JSON.stringify(rec.ok ? rec.result : { error: rec.error });
},
```

A failed tool comes back as readable JSON the model can recover from, never a
thrown exception — an exception ends the conversation mid-claim.

`packages/agent/src/loop.types.ts` — the contract `ask.ts`, `eval/run.ts`
and every check depend on, which is what keeps the loop replaceable:

```ts
export const DEFAULT_MAX_TURNS = 12;   // raised from 8: cov-002 was finishing at 7–8
```

The cap lives here, not at the call sites, so the eval path and a real request
cannot diverge; a cap that bites is an infrastructure failure wearing a model
failure's clothes. Two rules in the same file protect the scorecard: **schema
failures go back to the model, never silently repaired**, and **turns accumulate
across a retry** — overwriting them erases the first attempt's tool calls, and in
a claims context the audit trail *is* the deliverable.

**Where the domain lives:** `packages/insurance/src/tools/coverage-prompt.ts` (88
lines), written as a strict **ordered procedure**, not guidelines — look up the
record first, filter the search to that form, read the endorsements too. An
unordered list is one a model can satisfy in a way you did not intend.

**Status: done**, on `@openai/agents`, behind `loop.types.ts` — and since
**What a loop framework is, in one paragraph.** The model cannot answer alone —
it has to look things up — so something has to run the back-and-forth: send the
question, see what the model asked for, fetch it, send it back, repeat until it
stops asking, while capping the rounds, counting tokens, surviving a tool that
throws, and re-asking when the answer comes back the wrong shape. That loop is
the same shape every time, and a loop framework is library code that runs it for
you. Mastra is one; the OpenAI Agents SDK is another; LangGraph is a third.

**Why this project has two.** The job ad named Mastra, and the code had always
claimed the engine was replaceable without touching the tools, the prompt or the
answer shape. One implementation cannot test that claim; two can. Building the
second is how you find out whether the boundary was real or just a comment.

**Mastra has no tools of its own — it borrows ours.** The adapter wraps each
schema from `registry.ts` in a Mastra tool whose body calls
`registry.dispatch()`, so both engines share one dispatcher and one audit trail.
Mastra only decides *when* to call things. Four things are held identical across
the two — the tools, the prompt, the schema and the corpus — which is what makes
"Mastra used 26% fewer input tokens" a measurement rather than an anecdote.

**And it has already paid.** Running both on the same cases showed Mastra
cheaper on input **and** missing a contradiction the other engine caught.
Cheaper because it looks less hard is not a bargain, and you only learn that by
running both.

So since 2026-09-10 there is a **second engine behind the same contract**: `LOOP=mastra`
runs `loop-mastra.ts` on `@mastra/core` + `@ai-sdk/openai-compatible`, with its
own wire assertions in `pnpm compliance:mastra`. Two live implementations are
what keep the contract honest rather than assumed. See [`NEXT.md`](docs/NEXT.md).

---

## Section 5. Pillar 3 — The answer's shape

### In plain words

Ask a model a question and you get a paragraph back. A paragraph is pleasant to
read and impossible to check. Four sentences, three of them looked up and one of
them invented, and they are written in exactly the same confident tone. Nothing
about the text tells you which is which — and nobody re-reads a paragraph that
sounds right.

So do not let it write one. Give it a form to fill in instead: the answer here,
the sources it used there, anything it could not verify in its own box, any
contradictions it found in another, and whether this needs a human.

That one change moves the question *"did it check this before saying it"* out of
prose a person has to read carefully and into a field a computer looks at in
microseconds.

And notice what the form leaves out: there is nowhere to put a factual claim
except next to its source, or in the box marked unverified. The model still
guesses sometimes. It just has nowhere to hide the guess.

### What you run

```bash
pnpm schema:check    # runs packages/insurance/src/schema/schema-selftest.ts — no Azure, no network, no database
```

Ten hand-written responses go through the validator — three that must be
accepted, seven that must be rejected — scoring 10/10; then it walks the JSON
Schema the model receives and fails if any field lost its description. That
proves the **contract** holds, not that the model is good. Testing the model is
the next pillar.

### How it works

Zod defines the shape, validates against it, and generates the TypeScript type,
so the two cannot drift. It is also the schema language LangChain and the Agents
SDK both speak, for tool parameters as well as output, so there is one language
across the stack and no casts between our types and theirs.

Two details are deliberate. `escalate` is a **separate field, not a status
value**, so the model can return partial work *plus* a flag — Priya would rather
have the research with a caveat than a bare refusal. And a citation source has a
strict format, `policy:<FORM_ID>#<section>` or `record:<POLICY_ID>`, which is
exactly what lets a check verify mechanically that every cited document exists.

The `.describe()` strings are **prompt engineering, not documentation** —
*"Be honest; an empty array is a strong statement and will be audited."* Delete
one and the schema still validates, the types still infer, the contract cases
still pass, and the model quietly gets less guidance. Hence the
description-coverage assertion, verified capable of failing by deleting one:

```
FAIL  every field carries a description
      MISSING on: citations[].claim — these fields lost their prompt text
```

**Shape is not enough.** `{answer: null, escalate: null}` passes the schema and
says nothing. So a second layer checks *coherence*: combinations that are
structurally valid and still wrong. Those rules are deliberately *not* Zod
`.refine()` calls, because a refinement failure surfaces as a generic schema
error and **the message is what gets handed back to the model to fix** — "an
unresolved conflict must be escalated, never decided" is actionable, "invalid
input" is not. It is also why the loop re-validates what the SDK already
validated: `responseFormat` enforces shape and knows nothing about coherence.

### The code

`packages/insurance/src/schema/coverage-schema.ts` — the answer's shape, in Zod,
with the type inferred from it.

```ts
export const CoverageAnswerSchema = z.strictObject({
  answer:            z.string().nullable().describe('…'),
  policy_id:         z.string().nullable().describe('…'),
  policy_form:       z.string().nullable().describe('…'),
  citations:         z.array(Citation).describe('…'),
  unverified_claims: z.array(z.string()).describe('…'),
  conflicts:         z.array(Conflict).describe('…'),
  escalate:          Escalation.nullable().describe('…'),
});

export type CoverageAnswer = z.infer<typeof CoverageAnswerSchema>;   // inferred, never written
```

`strictObject` means the model cannot invent extra fields — a response carrying
`confidence: 0.92` is refused, because there is nothing behind such a number:
the same process that produced the guess produced the score.

`packages/insurance/src/schema/coverage-schema.ts` — the coherence rules Zod cannot
express, each with its own message.

```ts
function coherenceErrors(v: CoverageAnswer): string[] {
  const errs: string[] = [];

  if (v.answer === null && v.escalate === null)
    errs.push('answer is null and escalate is null — if you cannot answer, ' +
              'say why and name an owner in escalate');

  if (v.answer !== null && v.citations.length === 0 && v.unverified_claims.length === 0)
    errs.push('gave an answer with no citations and no unverified_claims — every ' +
              'factual claim must be in one list or the other');

  // The single most important rule in the file.
  const unresolved = v.conflicts.filter((c) => c.resolved_by === null);
  if (unresolved.length > 0 && v.escalate === null)
    errs.push('conflict(s) have no resolved_by but escalate is null — an ' +
              'unresolved conflict must be escalated, never decided');

  return errs;
}
```

**An unresolved conflict that did not escalate is the model quietly picking a
side while looking fully compliant** — the most dangerous thing this system can
do, caught by nine lines of ordinary TypeScript.

**Status: done**, on Zod, with `coherenceErrors()` as the domain half.

---

## Section 6. Pillar 4 — Evals

The deepest pillar, and where most of the work went.

### In plain words

You try it a few times, it looks right, you demo it, everyone is impressed. A
week later it states a wrong dollar figure, or cites a clause that does not
exist. Now the customer trusts *nothing* it says — including everything it got
right. That is the most common way this kind of project dies, and "I tried it
and it seemed fine" is what led there.

An eval is just a test suite where the thing being tested is the model. You
write down questions you know the right answer to, run them, and count.

The trick is what you count. A check can reliably answer *"is this box empty
when it should not be"* — did it cite anything, does the citation point at a
real file, did it escalate. It cannot answer *"was that a good answer"*; that
needs a human or another model, which is slow, costs money, and disagrees with
itself between runs. So you keep pushing questions from the second kind into the
first kind, and you count the ones that are left.

### What you run

```bash
pnpm eval                      # the measurement: 7 cases × 5 runs. NEEDS Azure + Postgres
pnpm eval --only cov-001       # one case, or --tag conflict for a batch. NEEDS Azure + Postgres
pnpm eval:smoke                # = `pnpm eval --repeat 1`: alive, not a number. NEEDS Azure + Postgres
pnpm eval:history              # every baseline in docs/evals/results/ — offline
pnpm eval:diff [a.json b.json] # two baselines compared case by case; defaults to newest two — offline
```

A scorecard prints, and a baseline JSON lands in
`docs/evals/results/` — but only for a full unfiltered run with
`--repeat` above 1, since a baseline has to be the whole suite to be comparable.
Green means the seven known-answer questions still come out right *across
repeats*, the only form of "it works" you can hand to a customer. Langfuse is
optional: with no `LANGFUSE_*` set the suite runs identically and skips the
tracing.

### How it works

A case is one line of JSON in `docs/evals/cases.jsonl`: the question,
the customer, and the checks that must hold. Nothing about *how* to answer —
only what must be true of the answer.

```json
{"id": "cov-001", "policy": "AUT-4471",
 "input": "how much rental car reimbursement is covered per day and for how many days?",
 "checks": ["cites_form:PP 03 24 06 24", "answer_contains:50", "answer_contains:21",
            "citations_resolve"],
 "tags": ["endorsement", "conflict"],
 "note": "AUT-4471 has PP 03 24 06 24 attached, so the endorsement governs."}
```

Seven cases, each guarding one specific failure:

| case | customer | guards |
|---|---|---|
| 1 | AUT-4471 | endorsement attached → $50/21 days, cited to the endorsement |
| 2 | AUT-4473 | rideshare is nowhere in the corpus → **must escalate**, not reason by analogy |
| 3 | AUT-4472 | never bought rental at all → denial, cited to the record. The base form's $40 is the trap |
| 4 | AUT-4482 | endorsement attached but not countersigned → flag the conflict **and** escalate |
| 5 | AUT-4476 | Texas form, BI limit $30k where the national form says $100k and reads identically |
| 6 | AUT-9999 | no such customer → escalate, never infer from another record |
| 7 | AUT-4473 | rental selected, no endorsement → base form governs, $40/30 days |

Case 7 is the **control** for case 1: case 1 can be passed by a bad fix — always
prefer the endorsement — and case 7 is the customer where that fix turns red. A
case that can only be passed by over-correcting is how an over-broad fix gets caught.

**Five runs per case.** The system does not answer identically every time, so one
run tells you almost nothing. Case 1 was written as a known failure — a manual run
had answered $40/30 days — then passed five times out of five. **One run said
*broken*; five runs said *occasionally flaky*.** Different fixes, and one run
cannot tell them apart, which is why `--repeat 1` prints a smoke-test warning.

Failures are then sorted into **three severity buckets, never averaged into one
number**: a wrong dollar figure (`false_answer`), an over-cautious escalation
(`over_caution`) and a plumbing problem (`missing_fixture`) are different
failures, and one percentage hides which you have.

**Where the framework line fell — inside the pillar, not around it.** Langfuse
is adopted, self-hosted, for the dashboard, run history and trace storage. **Its
runner is not used**, for two concrete reasons: `ExperimentParams` has no repeat
count at all, and `maxConcurrency` defaults to 50 while our repeats are serial on
purpose because the Foundry resource is shared with another project. Promptfoo
fails the same way. Severity is also not an assertion result — it is a
classification of *which* check failed, aggregated across N samples — so on any
other platform it comes back as a script parsing their output, whereas Langfuse
takes it as a **categorical score computed by our own `scorecard.ts`**.

Two rejections worth keeping. **Foundry Evaluations** was ideal on paper —
already in the approved tenant, no new vendor, no server, and it has the UI — but
its grader types are `string_check`, `text_similarity`, `score_model`,
`label_model`, `azure_ai_evaluator` and **`python`**. There is no JavaScript
grader and the eleven checks are TypeScript; four minutes to verify, and it would
have been wrong if guessed. **Braintrust and LangSmith** are US-hosted, which ends
the conversation — and managed Langfuse would not have escaped that either: an
eval trace carries policy ids, coverage amounts and reasoning about a named
customer's entitlements, so a hosted vendor becomes a data processor for insurance
data. `LANGFUSE_BASE_URL` is the entire data-residency control.

`eval:diff` **refuses to compare** runs made with different models, fixture modes
or repeat counts — a difference there measures the setup, not your change — and
**a one-run move out of five prints as MOVED, never a regression, never a build
failure.** A dashboard that paints every wobble red is muted within a week.

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

### The code

`packages/insurance/src/eval/run.ts` — runs one case through exactly the path a
real request takes, then applies its checks.

```ts
const result = await runLoopSdk<CoverageAnswer>(
  client, env.chatDeployment(), registry, buildUserPrompt(c.input, c.policy),
  { system: COVERAGE_SYSTEM_PROMPT, responseFormat: COVERAGE_FORMAT },
  // maxTurns deliberately not set — DEFAULT_MAX_TURNS, the same cap a real
  // request gets. Two caps would make that claim a lie.
);

const checks = c.checks.map((spec) => ({ name: spec, ...resolveCheck(spec)(result.structured!) }));
return { ...base, passed: checks.every((r) => r.pass), checks, answer: result.structured };
```

Same loop, same prompt, same schema, same turn cap — that is what makes the
number mean anything. The runner stays deliberately dumb about what a check
*does*: adding a twelfth means one function and one map entry. An unknown spec
fails loudly rather than being skipped, because a typo'd check name that
silently passes is a test you think you have and do not.

`packages/insurance/src/eval/checks.ts` — the highest-value check: every cited
source must resolve to a document on disk.

```ts
export const citationsResolve: Check = (a) => {
  const records = new Set(readdirSync(DOMAIN.recordsDir)
    .filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '').toUpperCase()));

  const bad: string[] = [];
  for (const s of sources(a)) {
    if (s.startsWith('record:')) {
      const id = s.slice('record:'.length).split('#')[0].trim().toUpperCase();
      if (!records.has(id)) bad.push(`${s} (no such record)`);
    } else if (s.startsWith('policy:')) {
      if (!resolveCitedForm(s.slice('policy:'.length)))
        bad.push(`${s} (no policy document of that name)`);
    } else {
      bad.push(`${s} (source must start with "policy:" or "record:")`);
    }
  }
  return bad.length === 0 ? { pass: true, detail: '…' }
                          : { pass: false, detail: `unresolvable citation(s): ${bad.join('; ')}` };
};
```

A fabricated citation is worse than none: it *looks* like evidence, so nobody
re-checks it. `resolveCitedForm` accepts a form id or a filename in any case and
the part after `#` is ignored — a check that fails for formatting reasons trains
you to ignore it, and an ignored check is worse than no check.

`packages/evals/src/scorecard.ts` — puts every failed run in exactly one
severity bucket.

```ts
export function severityOf(o: CaseOutcome): Severity {
  if (o.passed) return 'pass';
  if (o.missingFixture) return 'missing_fixture';        // plumbing
  if (!o.answer) return 'no_answer';
  if (o.checks.some((r) => !r.pass &&
      /^(escalates|citations_resolve|answer_lacks)/.test(r.name))) return 'false_answer';  // dangerous
  if (o.checks.some((r) => !r.pass && r.name === 'does_not_escalate')) return 'over_caution';
  return 'uncategorised';
}
```

`uncategorised` exists because the first version of these buckets silently
dropped runs matching none of them — and the run it swallowed was the most
informative one in the set. Every failed run must land in exactly one bucket.

**Status: done.** 30/35 with zero flaky cases; baselines in
`docs/evals/results/`.

---

## Section 7. Pillars 5 to 8 — partial or not started

### Pillar 5 — cost and latency: mostly done

**In plain words:** someone will ask what this costs per claim, and how long an
adjuster waits for an answer. You cannot work that out afterwards — a model call
that already happened left no trace unless you wrote one at the time. So you
write a line for every call, from the first one.

**What you run:** `pnpm eval` folds these numbers up per case, and every
surface also appends one durable line per call to `logs/requests.jsonl`.

```bash
pnpm eval        # per case: turns, wall time, in/out tokens, tool calls
                 # → docs/evals/results/last-run.json (+ baseline-<stamp>.json)
pnpm ask "..."   # prints the same numbers on its RUN line, then throws them away
```

**Which file / the code:** `packages/agent/src/loop.types.ts` says what
every turn must report; `packages/insurance/src/eval/run.ts` folds those turns into
one row per case.

```ts
// packages/agent/src/loop.types.ts
export interface TurnRecord {
  turn: number; ms: number; inputTokens: number; outputTokens: number;
  toolCalls: ToolCallRecord[]; text?: string;
}
// packages/insurance/src/eval/run.ts — folded up per case
inputTokens:  result.turns.reduce((a, t) => a + t.inputTokens, 0),
outputTokens: result.turns.reduce((a, t) => a + t.outputTokens, 0),
toolCalls:    result.turns.reduce((a, t) => a + t.toolCalls.length, 0),
```

**The durable log now exists.** `packages/telemetry/src/request-log.ts`
appends one line per model call to `logs/requests.jsonl`, tagged by claim, with
tokens, latency, tool count and a cost in USD. It is written from
`packages/insurance/src/coverage.ts` — the single path behind `pnpm ask`, `pnpm
eval` and the HTTP route — and from `packages/insurance/src/grounding/cli.ts` for
`ingest`. The write never throws: a broken log costs you data, a broken request
costs the customer an answer. `pnpm logs:sync` ships the file into a
`request_log` table in Postgres, idempotently, so the question can be answered
in SQL. That log is the business case: AI cost per claim next to the review time
it saved. Latency can be a legal requirement too — acknowledgement inside 24–48
hours.

**What is still missing:** a *verified* chat-model price. The `PRICING` table
holds a confirmed rate for `text-embedding-3-small` and an explicitly
PROVISIONAL one for `gpt-5-mini` — every meter published for the region carries
the `pp` priority-processing marker, so the tier this deployment bills at is not
established and the rate may be about 2x high. Settle it from Cost Management
once usage lands. The rule that holds regardless: it must **refuse to price a
model with no verified pricing** rather than emit a number, which is why an
unknown model logs `cost: null` and a stated reason.

### Pillar 6 — credentials: partial

**In plain words:** the app has to prove it is allowed to talk to the model.
The easy way is a password in a config file, and that is the thing a security
reviewer looks for first. Instead it asks for a short-lived token each time —
the same way on your laptop and in production, with no branch between them and
nothing secret written down.

The second half is what happens when config is wrong. A guard that forgets to
check a missing setting lets everyone in. It has to do the opposite: unset
means *less* access, never more.

This pillar can single-handedly kill an engagement at security review no matter
how good the AI is. Insurance is regulated, claims data includes personal and
sometimes medical information, and it is subject to commissioner audits.

**What you run:** `pnpm env:check` lists the settings offline and says nothing
about whether you can authenticate; `az login` proves you actually can.

**Which file / the code:** `packages/foundry/src/client.ts` — the one
place credentials are resolved; a short-lived token, never a stored password.
`DefaultAzureCredential` tries an environment service principal, then a managed
identity, then your `az` login, so the same code runs locally and in Azure.

```ts
// packages/foundry/src/client.ts — cached bearer, refreshed a minute before expiry
export async function foundryToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresOn - 60_000) return cachedToken.token;
  const t = await credential.getToken(FOUNDRY_SCOPE);   // https://ai.azure.com/.default
  cachedToken = { token: t.token, expiresOn: t.expiresOnTimestamp };
  return t.token;
}
// Entra tokens expire hourly and the JS SDK takes only a static apiKey, so
// openaiClient() injects a fresh bearer through a custom fetch instead:
headers.set('authorization', `Bearer ${await foundryToken()}`);
```

**The guard is written.** The HTTP surface exists — `POST /api/ask` in
`apps/insurance-app/src/routes/api.ask.tsx` — and it calls
`packages/guard/src/guard.ts` first. The obvious API-key check fails
*open*: forget the variable in a deploy config and you ship an unauthenticated
endpoint. This one reads key set → must be presented, compared in constant time;
key unset in dev → allowed, because the dev server binds loopback and that
guarantee comes from the listener, not from application code; key unset in
production → refused, because nothing here can prove the listener is
loopback-only. `pnpm guard:check` exercises every branch offline, including the
ones that must deny. **What is still missing:** nothing in code — the deploy
config has to actually set `API_KEY`.

### Pillar 7 — escalation: works, thinly measured

**In plain words:** sometimes the documents genuinely do not settle the
question — they contradict each other, or they never mention it at all. The
system has to be able to say so and hand it to a person. Not as an error, and
not as a hedge buried in a paragraph, but as a field you can check: *this one
goes to a human, and here is why.*

Arguably the most important pillar here: a wrongly *approved* claim costs money
and invites scrutiny, a wrongly *denied* one invites litigation. The correct
shape for any regulated financial decision is **AI recommends, human decides**,
with escalation as the default path for anything ambiguous.

**What you run:** it has no command of its own. `pnpm eval --tag escalation`
runs the three escalation cases in
`docs/evals/cases.jsonl` — `cov-002`, `cov-004`,
`cov-006`, each asserting `escalates`. Filtered runs write no baseline.

**Which file / the code:** it has no folder on purpose — a folder would imply a
component that does not exist. It is a rule enforced in two places: the
unresolved-conflict rule in `coherenceErrors()` in
`packages/insurance/src/schema/coverage-schema.ts` (Section 5), and the
`escalates` check in `packages/insurance/src/eval/checks.ts`.

**What is missing:** coverage — three of the seven eval cases exercise it, which
is thin. The open upgrade: the Agents SDK's `needsApproval` on tools turns "AI
recommends, human decides" from a field the model fills in into a runtime pause.

### Pillar 8 — deployment: begun

**In plain words:** the system has to run somewhere the customer controls, and
the person using it needs a screen rather than a terminal.

**What exists now.** `apps/insurance-app` — a TanStack Start app serving both the page and
the endpoint, in one process:

```
GET  /                     the coverage desk: question, customer, engine
POST /api/ask              the loop, streamed as server-sent events
GET  /api/policyholders    the customer list behind the dropdown
```

Both endpoints go through the fail-closed guard, and `/api/ask` calls
`askCoverage()` — the same single entry point `pnpm ask` uses, so the terminal
and the browser cannot answer differently.

`apps/insurance-app/src/server.ts` turns the built handler into a listening process:
TanStack Start 1.168 has no adapter system, so it is ~60 lines of `node:http`
with no new dependency. `pnpm build && node apps/insurance-app/dist/server/server.js`
serves static files, SSR and SSE.

**The screen is a demo surface, not the product.** In a real deployment the
assistant is a panel inside the insurer's claims system, and the adjuster never
picks a customer or types a policy id — she has a claim open and the host passes
the id as context. That is why the seam is `{ question, policy }`: the domain,
the schema, the evals and the guard stay the same per customer, while how the id
arrives, who they authenticate as, and where it renders all differ. The
per-customer work is a thin adapter onto that contract.

**What is still missing**, and it is the deployment half rather than the
software half: no container image, no adapter for a managed identity in place of
`az login`, and `API_KEY` has to be set in whatever runs it — the guard returns
503 to everything without one, deliberately, while health probes stay green.
`infra/DEPLOYMENT.md` has the ordered list.

It is still hard for reasons that have nothing to do with AI. An insurer may not
let claims data leave their network, so the target might be their private cloud,
their SSO, and a change-management process where production means a ticket and a
maintenance window rather than a `git push`. The Pillar 6 choices are what keep
that possible without a rewrite.

## Section 8. The five lessons

The transferable part of the whole project.

**1. Adopt a framework for the protocol, not for the judgement.** A *protocol*
has a right answer somebody already worked out — how to chunk a document, how
the tool-call format works, how to validate a schema, how to store a trace.
A *judgement* is a claim about insurance: which document governs, when a
disagreement goes to a human, what counts as *dangerous* rather than merely
annoying. No library has an opinion on those worth importing. And the
granularity matters: **"should we use a framework here" is usually the wrong
question; "which of these jobs should it do" is the right one.** Langfuse's
dashboard was worth adopting on the same day its runner was worth declining, and
both shipped in the same package.

| Pillar | Framework | What we wrote, and why it could not be bought |
|---|---|---|
| **1. Grounding** | LangChain.js + pgvector | `form-id.ts` (43 lines) — exact form match. The first version used "starts with" and silently also matched four state variants with different liability limits. `chunker.ts` (274) — heading trail and table rules |
| **2. Tool loop** | OpenAI Agents SDK | `coverage-prompt.ts` (88) — the ordered procedure, written as a ranked list because a model satisfies an unordered one in ways you did not intend |
| **3. Answer shape** | Zod | `coherenceErrors()` — catches answers that fit the shape perfectly and are still wrong |
| **4. Evals** | Langfuse (self-hosted) | `checks.ts` (274) — 11 checks. `scorecard.ts` (273) — dangerous / annoying / plumbing. And the run loop itself |

**2. Assert on the wire.** Do not trust a default, do not trust the docs.
`store: true` and tracing-on were both found by reading the SDK's source, and
both would have shipped inside a "pure refactor."

**3. A check that cannot fail reads like evidence while proving nothing.** The
corpus inspector reported `orphans: 0` — but splitting only happens above 1,200
characters and no section is that long, so the splitting code had **never
executed**. Re-run at hostile budgets (128 → 805 chunks) the zero finally meant
something. Same instinct produced the negative controls in
`pnpm compliance:check` and the description check in `pnpm schema:check`. When a
test passes, ask whether it *could* have failed.

**4. A failed test is a suspect, not a verdict.** Every failure this suite has
produced was a bug in the test, not the thing tested:

| what looked broken | what actually was |
|---|---|
| case 2, failing 2 in 5 | our citation checker — it only recognised uppercase form ids, and one document carries its id in a heading rather than its filename. Fixed with an index, not a looser regex — **leniency belongs in the thing that is too strict, not in the helper it shares** |
| case 3, failing 1 in 5 | our expected answer. The customer never bought the coverage; the four "passing" runs had quoted the base form without checking. **A trap that scores green four times in five** |
| case 3, failing 5 in 5 | the check that replaced it — a substring search that cannot tell "the answer is $40" from "if she had bought it, it would be $40". Still open, see Section 9 |
| every case, during the framework swap | our wiring — **and two cases passed anyway** |

Its mirror is equally important: **a green check is not proof either.**

**5. A framework migration is not done when it compiles; it is done when the
scorecard says it is neutral.** When the loop was first wired to the SDK, it
built its tool list and never passed it to the `Agent`. The model got **zero tools** — and `cov-002` and
`cov-006` still reported PASS, because both are escalation cases and a model with
nothing to search with escalates. Green for entirely the wrong reason. Had the
suite held only escalation cases, the swap would have shipped with a clean
scorecard and no retrieval at all. There is now a compliance check asserting the
tools reach the outgoing request, because that is cheaper than re-learning this.

A structural note on why the test code kept being the bug: test code gets none of
the scrutiny real code gets, and it is the only place in a project where a bug
arrives disguised as a result.

---

## Section 9. Honest status, and the one decision you owe

`packages/insurance/src/` is laid out by pillar, so this is also the map of the
tree.

```
packages/insurance/src/
  grounding/     pillar 1   loader, chunker, embeddings, store, ingest, form-id, cli
  tools/         pillar 2   loop-sdk, loop.types, coverage-prompt, the tools, registry
  schema/        pillar 3   coverage-schema + the two self-tests
  eval/          pillar 4   run, checks, scorecard, diff, history, langfuse
  telemetry/     pillar 5   request-log, logs-sync
  foundry/       pillar 6   client — credentials
  security/      pillar 6   guard + its self-test
  coverage.ts               the one entry point every surface uses
  ask.ts                    the demo entry point
```

| # | Pillar | Status |
|---|---|---|
| 1 | Grounding | **done** — LangChain.js + pgvector |
| 2 | Tool loop | **done** — OpenAI Agents SDK |
| 3 | Answer shape | **done** — Zod |
| 4 | Evals | **done** — self-hosted Langfuse for the dashboard, our runner |
| 5 | Cost & latency | **mostly done** — every `ask`, `eval` run and `ingest` writes a durable per-claim line; `pnpm logs:sync` ships it to Postgres. Chat pricing still provisional |
| 6 | Credentials | **partial** — short-lived tokens, no stored password; the fail-closed guard is written and `pnpm guard:check`-tested, but no deployment sets `API_KEY` yet |
| 7 | Escalation | **works**, thinly measured — 3 of 7 cases |
| 8 | Deployment | **begun** — a web app serves the page and a guarded, streaming endpoint, and builds to a listening process. No image, no managed identity, nothing deployed |

Anything marked done has a baseline in `docs/evals/results/`;
`pnpm eval:history` prints them all.

**Why the order is not arbitrary.** 2 needs 1 — a loop with nothing true to
fetch just lets the model guess more elaborately. 3 needs 2 — "show your
sources" is only demandable once a tool produces real ones. 7 needs 3 —
"it escalated" has to be a field you can check, not a tone you hope to detect.
4 needs 1, 2 and 3 — "every citation resolves" is meaningless until citations
exist and are structured. 5 and 8 need 4 — deploying what you cannot measure
means finding out from the customer. 6 sits under all of it. **Read backwards,
that is the argument for the build order: every pillar you skip makes the next
one measure the wrong thing.**

**Two known problems, neither of which any framework choice affects.**

*The decision that was owed (issue #3c) — settled 2026-09-10.* When the
assistant tells Priya a customer has no rental coverage, may it add "if she had
bought it, the form pays $40 a day"? **Yes.** An adjuster about to phone an
unhappy customer needs that context, and the answer already states the denial
first and marks the figure as hypothetical. The `answer_lacks:$40` check on
`cov-003` was therefore dropped — it was a substring search and could not tell
*"the answer is $40"* from *"if she had bought it, it would be $40"*. What still
guards the case is `does_not_escalate` + `cites_record` + `has_answer`: the
denial must be present and sourced to the record. The opposing argument, which
lost, is that a number in a claims file gets quoted onward stripped of its
caveats.

*The CI workflow has never run.* No git remote, no cloud credentials configured.
It is a plan, not a pipeline.

---

## Section 10. What gets built next

Two lists, deliberately kept apart. **The customer backlog** is `PROGRESS.md` §8:
fix the `citations_resolve` checker before trusting any number it produces, then
grow the eval set from seven cases toward fifty, then hybrid search and a
reranker — *after* the suite can score them, so the deliverable is a table with
one row per change and a column each for accuracy, p95 latency and cost. "The
reranker bought seven points" is a sentence you can only say if you measured
first. That table is worth more than the app.

**The other list is job-shaped**, from reading a "Fullstack and AI Developer"
ad. It adds **no ninth pillar** — it closes three that are already partial. Four
phases, in order, with the eval suite gating all of them:

**Phase A — a second loop, on Mastra.** *(Spike done 2026-09-10: Mastra
authenticates to Foundry with an Entra token and no API key, via
`@ai-sdk/openai-compatible` and a custom `fetch`; `@mastra/core` is
CJS-requireable and the ESM-only AI SDK loads through Node 22's `require(esm)`.
Details in [`NEXT.md`](docs/NEXT.md).)* `loop.types.ts` exists precisely for
this: `ask.ts`, `eval/run.ts` and every check depend on `LoopOptions` /
`LoopResult` and on nothing about how the loop is driven. Build
`loop-mastra.ts` against the same contract, add `--loop sdk|mastra`, record a
full baseline. **The gate is not "the evals pass"** — Section 8 lesson 5 is
exactly this trap, and a Mastra port that silently loses its tool binding goes
green on the same two escalation cases. So: diff `TurnRecord.toolCalls` **and**
`schemaErrors` between the two loops on a case known to need tools. Both fields
are already in the contract. And `pnpm compliance:check` must pass against the
Mastra loop — the Agents SDK had two opt-out egress defaults and Mastra's are
unknown.

**Phase B — the streaming surface** (closes Pillars 5, 6 and 8, and is the
largest real gap). In order: an SSE endpoint streaming `LoopEvent` — `onEvent`
was written for a live trace and has never had a consumer, and Pillar 6's
fail-closed guard already covers it the same way it covers `/api/ask`; then the
same Langfuse span the eval runner uses, on the **real** request path, tagged `claim:<id>`;
then a TanStack Start or Next.js page rendering the tool call in flight, the
answer as it arrives, and citations as links that resolve to the actual passage.
Escalation renders as a distinct state, because Pillar 7 is a field, not a tone.
Exit: refreshing mid-answer does not lose the run, every citation opens its
chunk, one trace per real request with a cost on it.

**Phase C — a second provider.** Put `packages/foundry/src/client.ts`
behind a provider interface, add one alternative, re-run the same suite through
each. The deliverable is a table — accuracy, dangerous failures, p95, cost per
query, and **where the data sits**. That last column is what makes it an FDE
artifact rather than a benchmark: a provider that wins on the first four and
loses on the fifth is still the wrong answer. Same gate as Phase A — assert the
model actually served the request, since a silent fallback to a default model
scores fine and proves nothing.

**Phase D — MCP, optional.** Expose `get_policyholder` and `search_policy` so
the registry is consumable outside this repo. Half a day, and it makes the tools
portable rather than merely internal.

If only one thing is ever done: **A plus the front half of B.** Port the loop,
put a streaming page on it, and let the scorecard you already trust say whether
the port survived.

**And the half that is easy to skip.** `../ROADMAP.md` §2 puts the engineering
half at ~60% ready and the customer-facing half at ~10%, and warns that people
over-invest in whichever is more comfortable. Still owed: a scoping one-pager
written as if with the customer, a ten-minute demo rehearsed out loud three
times, and a known-failures list to hand over. Being able to say precisely what
the system cannot do is a trust move, not a weakness.

---

## Section 11. What week one of a real engagement looks like

The pillars in the order you would actually build them:

1. **Talk to the people doing the work, not just management.** Find out what
   really makes a claim take six weeks — usually not "the AI could read faster"
   but "nobody can find the right clause in a 200-page document." That tells you
   which pillar to invest in first.
2. **Stand up the boring plumbing** (6, 5, 2) against a tiny fake or sandboxed
   dataset, before touching real customer data.
3. **Grounding** (1) against one product line only. Prove retrieval finds the
   right clause before expanding scope.
4. **Structured output** (3) early, before prompts get written around a shape
   you will have to change.
5. **A first eval set** (4), aimed at the failure modes that would hurt *this*
   customer — sourced from real past disputes if you can get them, not invented.
6. **Escalation-first deployment** (7) — ship as a copilot that drafts with
   citations and a human always signs off, before anyone discusses automation.
7. **Only then deployment** (8), once the scorecard gives both sides a reason to
   trust it beyond a demo.

---

## Section 12. The working agreement

Scaffolding and mechanical work gets written for you. The judgement calls are
yours — what shape the answer takes, which eval cases exist, how a failing prompt
gets fixed. The fixing step is where the real engineering judgement lives, and
it is worth doing once yourself with guidance rather than watching it happen.

| Decision | Choice | Who |
|---|---|---|
| Corpus flaws | all four planted | you |
| Corpus mix | 12 wordings + 18 records | you |
| Output scope | coverage answer, not claim determination | you |
| Escalation shape | separate field, allows a partial answer plus the flag | you |
| Fixtures | record and replay | you |
| Build order | pillar 3 before pillar 2 | me |
| Two tools, not one | a lookup is not a search | me |

Every scoping and product decision has been yours; the two made on your behalf
were both about build ordering and are both reasoned out in `PROGRESS.md`.

---

## Section 13. The audio version

Everything here except the fenced code blocks is narrated to speech.
`narration/prepare.py` strips the code, converts markdown and notation into
speakable English — "section 4.7" for `§4.7`, "30 out of 35" for `30/35`, "40
dollars per day" for `$40/day` — and writes one script per section;
`narration/generate.sh` renders each to an MP3 with Piper.

```bash
narration/prepare.py          # GUIDE.md → narration/scripts/*.txt
narration/generate.sh         # scripts   → audio/*/narration.mp3
```

Scripts are editable by hand before rendering, but `prepare.py` overwrites them
— for a permanent fix, change the prose here.
