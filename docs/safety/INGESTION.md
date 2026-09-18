# From a line in a file to an answer — the seven stages, explained

*Written 2026-09-17, before any of it is built. Every example below is **real
data** from the NHTSA slice, and every number was produced by running the thing
it describes.*

**Read this before we write code.** It follows one complaint — ODI `11353867`,
a 2020 Ford F-150 whose gear display disagreed with its gearbox — from a raw
line in a 1.5 GB file all the way to being the passage that answers a question.

The stages are the ones in [`../RETRIEVAL.md`](../RETRIEVAL.md). Nothing here is
new machinery; this is that pipeline pointed at messier data.

---

## The whole thing in one picture

```
  A FILE                                              A QUESTION
  100,980 tab-separated lines                    "is the F-150 park
         │                                        problem fixed?"
         ▼                                                │
  3.1  PARSE      ──►  70,194 documents                   │
         │              text + metadata                   │
         ▼                                                │
  3.2  CHUNK      ──►  passages                            │
         │              (complaints: 1 each)               │
         ▼                                                ▼
  3.3  EMBED      ──►  384 numbers each          3.5  RETRIEVE
         │                                          two arms, in parallel
         ▼                                          ├─ meaning  (vectors)
  3.4  INDEX      ──►  Postgres                     └─ keywords (text)
                        vector + text                      │
                             └─────────────────────────────┤
                                                           ▼
                                                  3.6  FUSE  (RRF)
                                                           │
                                                           ▼
                                                  3.6b RERANK (optional)
                                                   re-read the top 50
                                                   properly, keep 6
                                                           │
                                                           ▼
                                                  3.7  MEASURE
                                                   did we find the
                                                   passage we know
                                                   is the right one?
```

**Stages 3.1–3.4 happen once, offline.** Stages 3.5–3.6b happen every time
somebody asks a question. Stage 3.7 is how we know any of it works.

---

## 3.1 · PARSE — turning lines into documents

### What we are doing, plainly

The file is 100,980 lines of tab-separated values with **no header row**. A
column means something only because of its position. Parsing is deciding *what a
document is* and *which fields are text and which are labels*.

### BEFORE — one raw line (tabs shown as `⇥`)

```
1690864⇥11353867⇥Ford Motor Company⇥FORD⇥F-150⇥2020⇥N⇥20200906⇥N⇥0⇥0⇥
POWER TRAIN⇥SPRING⇥TX⇥1FTEW1E43LF⇥20200908⇥20200908⇥2800⇥1⇥THE GEAR WILL
NOT GO INTO PARK AND ALLOW ME TO START. ALSO, THE DISPLAY INDICATES I AM IN
THE WRONG GEAR DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE, DISPLAY SHOWS
REVERSE BUT THE...
```

Unreadable, and **position-dependent**: field 20 is the narrative only because
it is twentieth. Get that wrong and narratives land in the date column — and
nothing errors.

### AFTER — one document

```json
{
  "id": "11353867",
  "text": "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08\nTHE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START. ALSO, THE DISPLAY INDICATES I AM IN THE WRONG GEAR DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE...",
  "meta": {
    "odino": "11353867",   "make": "FORD",    "model": "F-150",
    "year": 2020,          "filed": "2020-09-08",
    "components": ["POWER TRAIN"],
    "crash": false, "fire": false, "injuries": 0, "deaths": 0,
    "miles": 2800, "state": "TX", "vin11": "1FTEW1E43LF"
  }
}
```

### The three decisions, and why

**① Collapse the repeats.** NHTSA writes **one row per component**. This is real
— ODI `11341276` is one person, five rows, identical narrative:

```
11341276  STRUCTURE:BODY                                    ┐
11341276  ELECTRICAL SYSTEM                                 │  ONE complaint
11341276  POWER TRAIN                                       │  written FIVE times
11341276  ENGINE                                            │
11341276  FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY  ┘
```

Merged into one document with `components: [all five]`.

> **Why it matters:** without this, that one person's story occupies **five of
> the six** result slots and crowds out four other people. It also makes every
> count we quote 44% too high — 100,980 rows are **70,194 complaints**.

**② The header line is added on purpose.** `text` starts with
`2020 FORD F-150 | POWER TRAIN | filed 2020-09-08`. The narrative itself never
says "F-150". A question *"2020 F-150 transmission"* would match nothing without
it.

> `RETRIEVAL.md` calls the chunker *"the highest-leverage file in the path"*.
> This is why: **what you put in the text is what can be found.**

**③ Metadata is filtered, never searched.** `deaths: 0` is a number you filter
on. Putting "deaths 0" in the text would make every complaint match a question
about fatalities.

### One parser setting, and it is not the default

Read these files with **`quoting=csv.QUOTE_NONE`**, or split each line on `\t`.
NHTSA says *"TAB delimited"* and names no quote character — but 708 lines carry
an odd number of `"` because people write `THE "SERVICE ENGINE" LIGHT CAME ON`.
With quote handling on, the reader swallows newlines looking for a closing quote
and silently merges 52 records. `CORPUS.md` §3 is what that cost.

### Dates — one function, one place

All three flat files use `YYYYMMDD`. The **API** uses `MM/DD/YYYY` for
complaints and `DD/MM/YYYY` for recalls. We store `YYYY-MM-DD` and parse in one
tested function, because eval case REC-008 exists specifically to catch this
going wrong silently.

### What you will see

A `parse` command writing `documents.json`, and the first three documents
printed. **No embedding, no database.**

---

## 3.2 · CHUNK — and why complaints should not be

### Plainly

Search returns *pieces*, not whole files. Long documents get cut into pieces of
roughly 500–1,000 characters. The question is how big a piece should be.

### The decision: complaints are NOT chunked

**MEASURED over the whole slice, per unit of meaning** — an earlier draft
guessed at the recalls and guessed wrong:

| | mean | max | chunked? |
|---|---|---|---|
| **complaint** | **596** | 2,048 | **no** — one complaint, one passage |
| **recall campaign** | **696** | 1,608 | **no** — shorter than the longest complaint |
| investigation | **2,504** | 5,796 | **yes** — and there are only 114 of them |

> **The recall line is the correction.** This document first said recalls run to
> "thousands of characters — chunk them". Defect + consequence + remedy averages
> **696** and never exceeds 1,608. So **only investigations need a chunker at
> all**, and the chunker stops being the highest-leverage file in this pipeline
> — it barely runs. Found by the `fde-assistants-73` session measuring instead of
> trusting the prose.

### BEFORE and AFTER — why cutting hurts

```
IF WE CHUNKED AT 400 CHARACTERS:

  piece 1  "THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START.
            ALSO, THE DISPLAY INDICATES I AM IN THE WRONG GEAR…"
  piece 2  "…DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE,
            DISPLAY SHOWS REVERSE BUT THE…"
```

Piece 2 has lost the word **PARK**. A question about *"will not go into park"*
now half-matches a fragment that no longer says it, and a citation points at
"piece 2 of complaint 11353867" — which is not a thing a person can look up.

> **The rule:** a passage should be the smallest unit that still makes sense on
> its own. For a complaint, that is the whole complaint.

---

## 3.3 · EMBED — turning words into numbers

### Plainly

A computer cannot compare meanings. An **embedding model** turns a piece of text
into a list of numbers — here **384** of them — arranged so that texts meaning
similar things get similar lists.

### BEFORE → AFTER (real output, `bge-small`, run for this document)

```
text:  "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08
        THE GEAR WILL NOT GO INTO PARK…"

vector: 384 numbers, first 8 of them —
        -0.0609, -0.0364, 0.0624, 0.0009, -0.0165, 0.0766, -0.0246, 0.0202
```

### Why anyone believes this works

Similarity is a single number from −1 to 1. **Measured, not claimed:**

```
question: "F-150 transmission will not go into park"
                                    → similarity 0.8035   ✓ close

question: "windscreen wiper motor failure"
                                    → similarity 0.5570   ✗ far
```

The model was never told these are about cars. **The numbers carry the meaning.**

### Two things that matter here

- **It runs on your machine.** ~130 MB model, no network, no API key. It is also
  the reason these narratives never leave the building — see `CORPUS.md` §6.
- **It must be batched.** Feeding all 70,194 at once asks for a single 35 GB
  tensor and dies. We already hit this and fixed it: 64 at a time.

---

## 3.4 · INDEX — where they live

### Plainly

One Postgres table. Each row is one passage, and carries **two** searchable
forms of the same text.

```sql
CREATE TABLE complaint_chunks (
  id         uuid PRIMARY KEY,
  content    text,        -- the passage, for reading and quoting
  vector     vector(384), -- for MEANING   (stage 3.5, arm A)
  content_ts tsvector,    -- for KEYWORDS  (stage 3.5, arm B)
  metadata   jsonb        -- for FILTERING (make, year, deaths…)
);
```

> **The whole hybrid idea lives in this table.** `vector` and `content_ts` are
> two different indexes over the *same* words, because they fail at different
> things.

---

## 3.5 · RETRIEVE — two arms, because one is not enough

### Plainly

Ask both, independently, at the same time:

**Arm A — meaning (vectors).** Embed the question, find the nearest passages.
Good at *"gearbox shows the wrong gear"* matching *"display indicates I am in
the wrong gear"* with no shared words.

**Arm B — keywords (full text).** Plain word matching. Good at the things
embeddings are worst at.

### Why arm B is not optional — the point of `HYBRID.md`

This corpus is full of tokens that only match exactly:

```
  20V197000    a recall campaign number
  11353867     an ODI complaint number
  P0219A       a fault code
  PRNDL        the gear indicator
```

> Your `RETRIEVAL.md` puts it bluntly: *"embeddings are worst at exactly the
> words that matter."* Ask for `20V197000` and the dense arm returns things that
> *look like* campaign numbers. The keyword arm returns **that** campaign.

### BEFORE → AFTER

```
question: "F-150 will not go into park after the recall"

  ARM A (meaning)              ARM B (keywords)
  1. ODI 11353867              1. ODI 11298441   ← says "recall" literally
  2. ODI 11412093              2. ODI 11353867
  3. ODI 11298441              3. ODI 11501233
  …                            …

  → two ranked lists, disagreeing. Stage 3.6 settles it.
```

---

## 3.6 · FUSE — combining two lists that do not share a scale

### The problem, plainly

Arm A gives similarity like `0.80`. Arm B gives a keyword relevance like
`0.41`. **They are different units.** Adding them is meaningless — like adding a
temperature to a price.

### The fix: ignore the scores, use the *positions*

**Reciprocal Rank Fusion.** A passage scores `1 / (60 + rank)` in each list, and
the two are added. 60 is a convention that stops the top slot dominating.

### Worked by hand

```
ODI 11353867   arm A rank 1   →  1/(60+1)  = 0.01639
               arm B rank 2   →  1/(60+2)  = 0.01613
                                  TOTAL    = 0.03252   ← wins

ODI 11298441   arm A rank 3   →  1/(60+3)  = 0.01587
               arm B rank 1   →  1/(60+1)  = 0.01639
                                  TOTAL    = 0.03227
```

> **Why this is the right instinct:** a passage both arms like beats one that
> either arm loves. `11353867` never ranks first in the keyword arm, and still
> wins — because both arms agree it belongs near the top.

### What broke here the first time, and why nothing complained

The worked example above hides an assumption. To add two lists together, fusion
must first decide **which entries are the same passage**. It needs an identity.

It reads `metadata.chunkId`. **Our loader never wrote one.** And the fallback,
when it is missing, is *the first 120 characters of the text*.

That is a sensible fallback for prose. It is the wrong one for this corpus,
because stage 3.1 **prepends a generated header to every passage**:

```
2019 HONDA CR-V | FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY BRAKING | filed 2019-08-14
└────────────────────── 92 characters before a single word of the driver's account ──────────────────────┘
```

Two different drivers, same car, same component, same month — **identical for
the first 120 characters.** Measured on the loaded table:

```
rows                                73,442
distinct 120-character prefixes     72,465
rows sharing a prefix with another     977

the worst three
  174 x  "2019 HONDA CR-V | FORWARD COLLISION AVOIDANCE: AUTOMATIC EME…"
  115 x  "2019 FORD ECOSPORT | ENGINE AND ENGINE COOLING | filed 2024-…"
  111 x  "2019 HONDA ODYSSEY | FORWARD COLLISION AVOIDANCE: ADAPTIVE C…"
```

174 distinct complaints became **one entry** in the fusion map. And fusion does
not overwrite — it accumulates:

```js
prev.score += 1 / (RRF_K + rank);   // ADDS. That is the whole point of fusion,
                                    // and the whole problem when the key is wrong.
```

So a group of collided passages scores like a passage that every arm loved,
several times over.

### The symptom — and why it does not look like a key problem

A real run, before the fix:

```
query:  "recall 20V197000"

   1.  RQ24011#1     meaning  ·    keywords 22    score 1.000
   3.  20V197000     meaning  4    keywords  1    score 0.842
```

Read that arithmetically. A keyword rank of 22 contributes `1/(60+22) = 0.0122`.
A keyword rank of 1 contributes `1/(60+1) = 0.0164`. **The thing at rank 22
cannot outscore the thing at rank 1.** Both chunks of investigation `RQ24011`
open with the same heading, so they collided *with each other* and their two
scores summed.

The exact-match campaign number — the single most findable thing in this corpus,
first in the keyword arm — was pushed to third by an arithmetic accident.

### BEFORE → AFTER

```
BEFORE   identity = first 120 characters of the text
         977 rows collide · scores add · the fused order is quietly wrong

AFTER    identity = the passage id  (metadata.chunkId)
         73,442 rows, 73,442 distinct keys, one entry per passage
```

The fix is one line in the loader. The cost of finding it was two searches that
looked *merely disappointing*.

> **The lesson, and it is the fifth of its kind in this repo:** nothing errored.
> The SQL was valid, every row loaded, every check passed, the vectors were in
> the right place — and search returned the wrong order. The natural suspect
> when results look mediocre is the embedder or the chunker, and both were
> innocent. **A silent wrong answer costs more than a loud failure**, which is
> why every stage here checks what *landed* rather than what was sent.

### The two guards that now exist

Neither shares code with the thing it checks — the same rule as stage 3.1's
`awk` cross-check:

1. **`pnpm safety:index` check 5** asks *Postgres*, in SQL, whether every row
   carries a distinct `chunkId`. The loader is not consulted about its own work.
2. **`pnpm safety:search` recomputes the fusion arithmetic** from the two ranks
   it just printed — `1/(60+rank)` summed, normalised — and prints
   `FUSION IS NOT ADDING UP` when a reported score is not one its own ranks can
   produce. The `60` is restated there deliberately rather than imported: a
   check that shares a constant with its subject agrees with it by construction.

---

## 3.6b · RERANK — a second opinion on the top 50

### Plainly

Stages 3.5 and 3.6 are fast and slightly dumb. The vector arm compares the
question to **each passage separately** — it never looks at the two together.
That is what makes it fast enough to search 70,194 passages.

A **cross-encoder** is the slow, careful version. It reads the question and one
passage **at the same time** and answers a single question: *does this passage
actually answer this question?* Far better, and far too slow to run on 70,194
things.

So you use both. Hybrid search narrows 70,194 → 50. The cross-encoder re-reads
those 50 properly and re-orders them.

```
  70,194 passages
        │   stage 3.5 + 3.6  — fast, approximate
        ▼
      top 50
        │   stage 3.6b       — slow, careful
        ▼
      top 6   ──►  shown to the model
```

### You already have one

`packages/grounding/src/rerank.ts`. A small model (`ms-marco-MiniLM-L-6-v2`)
that runs **on this machine, on the CPU**, no network and no key — same story as
the embedder. It is off unless `RERANK=local` is set.

### What it was worth on the steering engagement — MEASURED

```
  arm        cases   recall@6    MRR
  baseline    6/8      0.813     0.692
  reranked    7/8      0.938     0.875     + local cross-encoder, 50 candidates
```

**+12.5 points.**

### Why it helps, and it is not the reason you would guess

The most useful thing that measurement turned up was a *failure of fusion*.

Steering's `ret-007` asks which past job booked effort to a contaminated charge
code. The answer is in **one** of 220 near-identical closure reports. Hybrid
search ranked it **35th**; the cross-encoder moved it to **1st**.

Why was it 35th? Because of how RRF adds up:

```
  keyword arm ranked it 1st, dense arm never returned it
        →  1/(60+1)                  = 0.0164

  a WORSE passage, both arms ranked 50th
        →  1/(60+50) + 1/(60+50)     = 0.0182   ← wins
```

> **RRF rewards agreement.** A passage one arm is *certain* about, and the other
> never saw, loses to a passage both arms are lukewarm about. That is usually
> the right instinct — and it is exactly wrong when only one arm can see the
> thing that matters.

### Why we expect it to matter MORE here — a prediction, written before measuring

That failure shape is the normal case in this corpus, not the exception:

- The things **only the keyword arm** can find are the things that matter most —
  `20V197000`, `11353867`, `P0219A`, `PRNDL`. The dense arm returns things that
  *look like* campaign numbers.
- **REC-001 is `ret-007` at ten times the scale**: 103 relevant complaints
  hiding among 957 near-identical ones about a *different* transmission fault.
  Near-identical neighbours are precisely what a cross-encoder is for.

**Writing the prediction down before the run is the point.** If the delta here
is smaller than steering's +12.5, that is a finding about this corpus and not a
disappointment.

### What it costs

A second model over 50 candidates on every question. Slower, and ~200 MB of
optional dependency. Nothing leaves the machine.

---

## 3.7 · MEASURE — did we find what we already knew?

### Plainly

We wrote the answers **by hand first**
([`WALKTHROUGH.md`](WALKTHROUGH.md)), before any of this existed. So we can ask
the only question that matters at this stage:

> **When we ask REC-001's question, does ODI `11353867` come back in the top 6?**

### The number: recall@6

```
recall@6  =  how many known-right passages were in the top 6
             ─────────────────────────────────────────────────
             how many known-right passages there are
```

### TWO numbers, not one — the plain pipeline and the reranked one

```
  3.7a   recall@6, hybrid alone        the baseline
  3.7b   recall@6, RERANK=local        the same run, reranked
```

Same questions, same corpus, one variable changed. **This is the only way the
reranker's value is a measurement rather than a belief** — turn it on from the
start and you learn one number that cannot answer *"did the reranker help, or
was the chunking simply fine?"*

### FIRST, DECIDE THE DENOMINATOR — passages or documents?

This has to be settled *before* a number is quoted, because the two are
different and both are called "recall@6".

```
WALKTHROUGH.md names DOCUMENTS        ODI 11353867 · campaign 20V197000
the index holds PASSAGES              RQ24011#0, RQ24011#1
```

A two-chunk investigation can occupy **two of the six slots**, so:

```
recall@6 over passages    both chunks count separately — six slots, maybe four documents
recall@6 over documents   dedupe hits by documentId first — six slots, six documents
```

**We measure over documents**, deduplicating by `documentId` before counting,
because the answer key names documents and because "did we retrieve the right
complaint" is the question a fleet analyst is actually asking.

> **And this is why the comparison to steering's 0.813 has to wait.** That
> number was measured on another corpus with its own denominator. Confirm it was
> counted the same way before putting the two side by side — otherwise the
> comparison measures the counting rule, not the retrieval. Same failure as
> `eval:diff` refusing to compare runs made with a different model.

### BEFORE → AFTER

```
BEFORE   we believe search works, because the results look plausible
AFTER    recall@6 = 0.40 plain, 0.40 reranked — and we know which ones
         each of them misses, by name
```

### MEASURED, 2026-09-17 — and the two numbers are the same

```
3.7a  hybrid alone    recall@6 = 0.40
3.7b  reranked        recall@6 = 0.40

REC-001   0.00   both targets missing from the top 6 AND from the top 50
REC-004   0.20   1 of 5; the one found moved 3rd → 1st under reranking
REC-005   1.00   found at position 1; that hit moved 36th → 1st
```

**The reranker moved passages a long way and changed nothing**, because the
documents the key asks for were never in the 50 it was handed:

```
20V197000  (the recall)      keyword rank    93
11302656                     keyword rank   121
11533202                     keyword rank 1,169
11524321                     keyword rank 1,239
11473666                     keyword rank 2,271
11353867  (the complaint)    keyword rank 3,026
```

This is §3.6b's ceiling, confirmed rather than quoted. The diagnosis is **"never
found it"**, not "found it and ranked it badly" — so no reranker moves these,
and neither would a better one.

### The cause: two of three questions are filters wearing the clothes of questions

`2020 F-150`, `Tesla Model 3`, `involving a death` are **structured fields
sitting in the metadata**, and search is matching them as words. REC-001's
question matches **54,541 documents** on ordinary vocabulary alone — "run",
"2020", "transmission", "problem", "fix". The right answer drowns.

Measured, rather than asserted:

```
filter make=TESLA, model=MODEL 3, deaths>0     → exactly the 5 targets, recall 1.00
filter make=FORD, model=F-150, POWER TRAIN,
  then rank by park/prndl/roll/shift           → 11353867 at rank 8, from 3,026
filter kind=recall, F-150, PRNDL component     → 20V197000, exactly
```

> **The fix is a metadata filter reached through a tool** — not a better
> embedder, not a better chunker, not a better reranker. It is the finding
> insurance already records as `get_policyholder`: *a question with one exact
> answer is a lookup, not a search.* Reached here independently, on a corpus
> that shares nothing with it.

### MEASURED 2026-09-18 — and the first attempt published a single run

**This section said `0.50` for about ten minutes.** That was one run. The next
run of the same code, same question, same model, gave **0.17**:

```
run 1    REC-001 0.50 · REC-004 1.00 · REC-005 0.00   →  0.50
run 2    REC-001 0.50 · REC-004 0.00 · REC-005 0.00   →  0.17
```

REC-004 went from five of five to nothing, because the model answered from
`count_complaints` alone and retrieved no complaints at all.

> This engagement spent a whole stage establishing that one run is a smoke test
> and not a number, and then published one. The harness now repeats and reports
> a RANGE, and refuses to print a headline figure when the runs disagree — a
> mean of 0.50 and 0.17 is 0.33, which is a number no run produced.

Repeated properly — three runs, three cases:

```
plain retrieval               0.40           deterministic
tools, called BY HAND         1.00           the ceiling, deterministic
tools, called BY THE MODEL    0.17 to 0.50   runs: 0.50, 0.17, 0.17
```

### And the range is misleading, because the model is stable

Per case, across those three runs:

```
REC-001   0.50  0.50  0.50     stable
REC-004   1.00  0.00  0.00     ALL of the variance is here
REC-005   0.00  0.00  0.00     stable
```

**Two of the three cases never move.** The entire spread comes from REC-004, and
there it is binary: either the model calls `search_complaints` and retrieves all
five death complaints, or it answers from `count_complaints` alone and retrieves
nothing.

That is the same behaviour stage 7 measured from the other side — REC-004's
*cites at least one complaint by ODI number* scored **1 of 3**. Two independent
measurements, one behaviour, the same frequency.

### What is left once the artefacts are named

```
REC-005   0.00 stable, and its ANSWER checks are 3/3 on all four.
                It proves the absence with find_recalls and never needs a
                complaint. The metric charges it for a shortcut.

REC-001   0.50 stable. It finds the campaign every time and reaches for
                complaints_citing rather than the complaint the key names —
                arguably better evidence, scored as a miss.

REC-004   the only genuine retrieval shortfall: sometimes it reports a
          count without fetching a single example to quote.
```

> So the honest sentence is not "the model reaches 0.17 to 0.50 of the ceiling".
> It is: **one case retrieves nothing about a third of the time, and the other
> two are stable — one of them scored zero for answering efficiently.**

### And two of the three shortfalls are the METRIC, not the model

**REC-005 scores 0.00 while answering perfectly.** Its stage-7 answer checks are
`3/3` on all four, including *states it plainly* and *records the empty search as
evidence*. The model called `find_recalls` twice, established that no recall
covers the vehicle, and said so.

It never retrieved a complaint — so recall@6 scores zero. But the complaints
were only ever *corroboration*; the empty search is the **proof**. The model took
the shorter, stronger route and the metric charged it for the difference.

**REC-001 loses half for the same reason.** It reached for `complaints_citing`
instead of `search_complaints`, retrieving the seven complaints that name the
campaign — arguably the better evidence for "is the fix holding" — and the key
names a different complaint.

> `STAGE4.md` §4b predicted exactly this before the number existed: **a fixed-k
> recall metric scores what the key NAMED, not what a good answer would cite.**
> Here it is, doing that twice out of three times.

**So there is no single honest headline yet, and what exists is not a grade.**
The gap to 1.00 is three things at once: a model reaching fewer of the named
documents, a metric that cannot tell a shortcut from a shortfall, and run-to-run
variance wide enough to swamp both. Stage 7's answer checks —
26 of 28 — are the number that reflects whether the answers are any good, and
the two must not be averaged.

---

### And the number is flattered

`0.40` is **n=3**, and REC-005 scored 1.00 against a bar of "return any one of
400 documents". The two hard cases scored 0.00 and 0.20. It is a starting
number, not a scorecard.

> Steering measures **0.813** on its own corpus. **Do not put the two side by
> side** until it is confirmed both counted the same denominator — otherwise the
> comparison measures the counting rule rather than the retrieval. Same rule
> `eval:diff` enforces by refusing runs that differ in setup.

---

## What we are deliberately NOT doing yet

| | why |
|---|---|
| no model call | if search cannot find the passage, no model saves it |
| no answer contract | stage 4 |
| no tools, no agent | stage 5 |
| no reranker **on the first run** | it is 3.6b and it *is* in scope — but measured as a delta against the plain pipeline, or you cannot say what it bought |

---

## The five RAG patterns, and which ones this corpus actually exercises

| pattern | status in the repo | here |
|---|---|---|
| [**hybrid**](../rag/HYBRID.md) | built, measured | **the core.** Campaign numbers and fault codes are exactly what dense search misses |
| [**corrective**](../rag/CORRECTIVE.md) | shape built | **now measurable.** With 70,194 noisy narratives the top 6 are often *all* junk — rare at insurance's 555 chunks |
| [**agentic**](../rag/AGENTIC.md) | built, measured | stage 5 — the model choosing to search again |
| [**graph**](../rag/GRAPH.md) | not built | real, but **shallow** — measured below |
| [**multimodal**](../rag/MULTIMODAL.md) | not built | no images in this slice. Not applicable |

### Which of them are actually worth building, now that 3.7 has measured

**Agentic is not an extra — it IS stage 4 and 5.** A model choosing between
`get_recall`, `find_recalls`, `search_complaints` and `count_complaints`, and
calling one after another, is what agentic retrieval means. Nothing further
needs inventing; see [`STAGE4.md`](STAGE4.md).

**Corrective has a specific job here, and 3.7 showed what it is.** The generic
version — grade the results, re-retrieve if they are poor — would have correctly
judged REC-001's results as junk and then fetched the same junk again, because
the query was never the problem. What corrective means on this corpus is
narrower and more useful:

```
find_recalls(...) returned []         → widen the component filter before
                                        concluding no recall exists
count_complaints(...) returned 0      → the filter is wrong, not the corpus
search inside a filter returned junk  → the filter was too narrow; say so
                                        rather than answering from junk
```

Every one of those is a **filter correction**, not a query rewrite. Worth
building, and small.

### The graph, measured rather than asserted

The earlier claim here was "complaint → component → recall → manufacturer,
genuinely real". Half right. The edges were counted:

```
investigations                                    114
  ...carrying a campaign number                    42
  ...whose campaign resolves to a recall we hold   14     ← 12% of investigations

complaints naming a campaign id in their text   5,361
  distinct campaigns named                        689
  ...resolving to a recall we hold                563     ← a real edge

complaints naming REC-001's campaign directly       7
```

**The valuable edge is the one nobody planned.** The investigation → recall link
is the documented one and it resolves only 14 times. The useful link is
**owners typing a campaign number into their complaint narrative** — 563
campaigns reachable that way, and for REC-001 it produces the 7 complaints that
are the strongest possible evidence on whether a fix is holding.

> **But that traversal is one hop, and one hop is a lookup.** `complaints
> citing 20V197000` is a string match we can already express. It does not need a
> graph store, node embeddings or community detection — it needs **one more
> tool**, and it should be built as one rather than as a retrieval layer.

So: a fifth tool for stage 4, `complaints_citing(campaign)`, and no graph
infrastructure. If the corpus later gains multi-hop questions — *this
investigation led to that recall, which was superseded by another* — revisit it
with the same instinct: **measure whether the hops resolve before building the
machinery to walk them.**

---

## Where we are

**3.1 through 3.4 are built and run.** 73,442 passages parsed, chunked,
embedded locally in 36.6 minutes and loaded into Neon — 287 MB, every check
green.

**3.5 and 3.6 are built, and the first real searches found a bug in our own
loader** rather than in retrieval: the missing `chunkId` above. Fixed, and the
table needs reloading before any number from it means anything.

```
pnpm safety:index      reload — about a minute, now that the vectors exist
pnpm safety:search "recall 20V197000"     confirm the arithmetic
```

**3.6b and 3.7 come after that**, in that order, and 3.7 is the first stage that
produces a number worth quoting.

### The older note, kept because it still holds

**3.1 was only parsing.** Read one file, write one file, print
three documents. Nothing is embedded, stored, or asked.

**Nothing below 3.1 gets built until you have looked at the output of 3.1.**
