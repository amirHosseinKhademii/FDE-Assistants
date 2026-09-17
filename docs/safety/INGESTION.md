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

### BEFORE → AFTER

```
BEFORE   we believe search works, because the results look plausible
AFTER    recall@6 = 0.81 plain, 0.9x reranked — and we know which ones
         each of them misses, by name
```

> Your steering engagement measures **0.813**. That is the bar. A number lets us
> change the chunker and *know* whether it helped — `RETRIEVAL.md`'s point that
> **a plausible result is not a measured one**.

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
| [**graph**](../rag/GRAPH.md) | not built | **genuinely real here**: complaint → component → recall → manufacturer |
| [**multimodal**](../rag/MULTIMODAL.md) | not built | recall documents are PDFs — later, if ever |

---

## Where we are

**3.1 is next, and it is only parsing.** Read one file, write one file, print
three documents. Nothing is embedded, stored, or asked.

**Nothing below 3.1 gets built until you have looked at the output of 3.1.**
