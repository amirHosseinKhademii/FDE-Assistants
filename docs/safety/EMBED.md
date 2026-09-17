# Inside the embedder — words become numbers, and padding decides the bill

*The under-the-hood companion to [`INGESTION.md`](INGESTION.md) §3.3, in the
same shape as [`PARSE.md`](PARSE.md) and [`CHUNK.md`](CHUNK.md). Written before
the code. Every figure was produced by running the real embedder over real
passages from stage 3.2.*

**One sentence:** 73,442 passages each become a list of 384 numbers, computed on
this machine, so that "similar meaning" becomes "close together".

---

## What an embedding is, plainly

A computer cannot compare meanings. An **embedding model** reads a piece of text
and produces a fixed-length list of numbers — here **384** — arranged so that
texts about similar things land near each other.

Once every passage is a list of numbers, "find the most relevant passage"
becomes arithmetic.

---

## BEFORE → AFTER, on the passage that matters

```
BEFORE   ODI 11353867, 615 characters

         2020 FORD F-150 | POWER TRAIN | filed 2020-09-08
         THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START…

AFTER    384 numbers. The first six:

         -0.0357, -0.0272, 0.0568, 0.0164, -0.0230, 0.0981
```

### Why anyone believes this works — measured, not asserted

Similarity is one number from −1 to 1:

```
"F-150 will not go into park, transmission shift"   →  0.8504   ✓
"windscreen wiper motor failure"                    →  0.5703   ✗
```

**The model was never told these are about cars.** It has never seen NHTSA. The
numbers carry the meaning.

---

## THE FINDING: sorting by length makes it 58% faster

This is the part worth reading twice, and we only found it by timing the thing.

**The model pads every text in a batch to the length of the longest one in that
batch.** Put one 2,051-character passage in with 63 short ones and all 64 are
computed as if they were 2,051 characters. The work is wasted on padding.

Measured over 320 real passages (mean 610 characters, max 2,051):

```
  as they come        29,179 ms
  sorted by length    12,369 ms      58% faster
```

Projected across the corpus:

```
  as they come     11 passages/sec   →   1 h 47 m
  sorted by length 26 passages/sec   →      47 m
```

> **The same work, the same vectors, less than half the time** — from putting
> similar-length texts next to each other before handing them over.

**The order must be restored afterwards.** `embedDocuments(texts)` promises
vectors in the order the texts arrived; anything else silently attaches every
vector to the wrong passage — the single most expensive mistake available in
this layer, and the one `@fde/grounding`'s header already warns about for hosted
APIs returning results out of order. Sort, embed, unsort.

### This belongs in `@fde/grounding`, and that is a finding

`docs/safety/PLAN.md` §9.6 says every time this engagement reaches for a change
to a shared package, it gets written down rather than quietly made.

**This is the first one.** It is not safety-specific — insurance and steering
would both get faster — and it is invisible at their size. Insurance has 555
chunks; the waste is a rounding error. At 73,442 it is an hour.

**The fourth engagement found it because it is the first corpus large enough for
it to matter.** That is the claim in `PLAN.md` §1 doing its job: point the
machinery at data nobody wrote for us, and see where it bends.

---

## The bug that is already fixed, and why it is worth remembering

An earlier version handed **all** passages to the model in one call. It does not
batch internally: it built one tensor for the lot and asked for **35.5 GB**.

```
Failed to allocate memory for requested buffer of size 35571892224
```

Insurance's 555 chunks fit. Steering's 2,827 did not. The failure is not
gradual — fine, fine, fine, then a hard allocation error — and it landed *after*
`ingestDocuments` had already emptied the table, so a crash took the index with
it.

Fixed by batching at 64 (`LOCAL_EMBEDDING_BATCH`). The length-sorting above is
the second act of the same story: **batch size stops it dying, batch
composition decides how long it takes.**

---

## What it costs

```
  vectors      73,442 × 384 × 4 bytes   =   108 MB
  time         ~47 minutes, sorted, on this CPU
  money        nothing
  egress       nothing
```

---

## Why it runs here and not in a cloud

`docs/safety/ARCHITECTURE.md` guardrail 4. Embedding touches **every passage**,
and the passages are real people's accounts of crashes, fires and 53 deaths.
Local means they never leave the machine.

And there is nothing to trade: `docs/FREE.md` §8c measured local `bge-small` at
recall@k **0.813** against the paid Azure model's **0.813** on the steering
corpus. Same number.

The model is ~130 MB, downloads once, and caches to the OS temp directory —
`packages/grounding/src/embeddings.ts` sets `cacheDir` explicitly because the
library's default is inside `node_modules` and fails in any container with a
read-only dependency tree.

---

## The checks

```
73,442 passages → 73,442 vectors of 384 dimensions

ok  every passage got exactly one vector, in its original order
ok  ODI 11353867's vector is nearest the REC-001 question (0.85) and
    far from an unrelated one (0.57)
ok  no vector is all zeros — a silent failure mode for a truncated input
```

**The order check is the important one.** A vector attached to the wrong passage
does not error, does not look wrong, and makes retrieval merely seem poor.
