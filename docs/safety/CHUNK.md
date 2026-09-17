# Inside the chunker — the stage that mostly declines to run

*The under-the-hood companion to [`INGESTION.md`](INGESTION.md) §3.2, in the
same shape as [`PARSE.md`](PARSE.md). Written before the code. Every number
below was produced by running `@fde/grounding`'s existing chunker over the real
output of stage 3.1.*

**One sentence:** 73,334 documents go in, 73,442 passages come out — because
73,220 of them are left exactly as they are.

---

## What chunking is, plainly

Search returns *pieces*. A 40-page manual has to be cut up, or a question about
one paragraph drags in the other thirty-nine pages.

So the chunker's job is to decide **where to cut**. And its real job on this
corpus is to decide **where not to**.

---

## BEFORE → AFTER, in one table

```
                      in          out       what happened
  complaints       70,194  →   70,194      untouched
  recalls           3,026  →    3,026      untouched
  investigations      114  →      222      cut
                   ───────     ───────
                   73,334      73,442      +108 passages, from 114 documents
```

**0.3% of the corpus is affected.**

---

## Why complaints are not cut — and it is not because they are short

The obvious reason is wrong, and worth being precise about:

```
complaints over the 1,200-character default:   8,121 of 70,194  (11.6%)
recalls over it:                                  138 of  3,026
```

**One complaint in nine is long enough to cut.** We decline anyway.

A complaint is **one person's account of one incident**. Cutting it splits the
symptom from the circumstance:

```
  piece 1   "THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START.
             ALSO, THE DISPLAY INDICATES I AM IN THE WRONG GEAR…"
  piece 2   "…DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN DRIVE,
             DISPLAY SHOWS REVERSE BUT THE…"
```

Piece 2 has lost the word **PARK**. A question about *"will not go into park"*
now half-matches a fragment that no longer contains it — and a citation reading
*"piece 2 of complaint 11353867"* is not a thing a person can look up. An ODI
number is.

> **The rule:** a passage should be the smallest unit that still makes sense
> alone. For a complaint that is the whole complaint, however long it runs.

Same argument for a recall campaign: `20V437000` is what a person quotes.

---

## What the chunker actually did to the 114 — and it surprised us

`AQ25002`, a Tesla ADAS investigation, 3,318 characters:

```
BEFORE   one document, 3,318 chars

AFTER    piece 1     257 chars
         piece 2   3,060 chars   ← still 2.5x the 1,200 limit
```

**Not three equal pieces.** The chunker is **structure-aware**: it splits on
headings and line breaks first and only then on size, because cutting mid-
sentence to hit a character budget is how you get a passage that says nothing.

NHTSA investigation summaries are **one unbroken block of prose**. There is no
structure to cut on, so the chunker leaves the block whole rather than slicing
it arbitrarily. 114 documents become 222 passages, not the ~340 a naive
character count would predict.

> **That is the chunker being right, not failing.** A library that always hit
> its budget would be one that always cut mid-sentence.

---

## The code

```ts
import { chunkDocument } from '@fde/grounding';

export function toPassages(docs: SafetyDoc[]): Passage[] {
  return docs.flatMap((doc) =>
    doc.kind === 'investigation'
      ? chunkDocument({ sourcePath: doc.id, text: doc.text })
          .map((c, i) => ({ ...c, id: `${doc.id}#${i}`, meta: doc.meta }))
      : [{ id: doc.id, text: doc.text, startLine: 1, meta: doc.meta }],
  );
}
```

**Nothing new is written.** `chunkDocument` is `@fde/grounding`'s, used by
insurance and steering unchanged — which is `PLAN.md` §9.6's test passing
quietly: this engagement needed no new shared code at this stage.

The `#0`, `#1` suffix only ever appears on investigations. A complaint's
passage id **is** its ODI number, so a citation points at the thing itself.

---

## Where the leverage actually is

`docs/RETRIEVAL.md` calls the chunker *"the highest-leverage file in the
path"*, and on a corpus of long documents it is — where you cut decides what
can be found.

**Here it touches 114 documents out of 73,334 and leaves 99.7% alone.**

So the leverage moved *upstream*, to stage 3.1. The line that decides whether a
question about a 2020 F-150 finds the right complaint is **the header the
parser prepends** — the narrative itself never says "F-150". On this corpus the
parser is the highest-leverage file, and a pipeline tuned by adjusting chunk
sizes would be tuning the one stage with almost nothing to do.

---

## What it does not do

No embedding, no database, no network, no model. Documents in, passages out.

---

## The checks

```
73,334 documents → 73,442 passages
  complaints      70,194 → 70,194   untouched
  recalls          3,026 →  3,026   untouched
  investigations      114 →     222   cut

ok  every complaint id is still an ODI number, citable on its own
ok  ODI 11353867 survived as exactly one passage (REC-001)
ok  no passage is empty, and none lost its metadata
```
