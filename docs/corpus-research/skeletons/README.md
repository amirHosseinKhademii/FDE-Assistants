# Canonical skeletons — one sample document per new type

These are **not corpus files.** They live here, never in
`docs/examples/policies/`, and nothing ingests them.

They exist for two reasons:

1. **They settle the shape before Step 3.** The four researchers produced sample
   skeletons in four idioms. A generator author reconciling four conventions at
   generation time is doing design work after the review gate — which is what
   the gate exists to prevent. One of these per type is the shape the generator
   templates.
2. **They made the corpus size measurable rather than arguable.** Pointing
   `CORPUS_DIR` at them and running `pnpm chunks` converted six guesses into six
   measurements, for free and offline. See §2.3 of
   [`CORPUS-PLAN.md`](../../CORPUS-PLAN.md).

## Measured, 2026-09-11

```
CORPUS_DIR=/tmp/corpus-probe pnpm chunks

6 documents

  maxChars=1200  chunks=69    orphans=0
  maxChars=400   chunks=99    orphans=0 (forced)
  maxChars=200   chunks=243   orphans=0 (forced)
  maxChars=120   chunks=349   orphans=0 (forced)

  0 distinct form ids:
```

| file | type | words | chunks @1200 |
|---|---|---|---|
| `bulletin-2024-07.md` | adjuster bulletin | 503 | 8 |
| `circular-il-2024-03.md` | DOI circular | 491 | 8 |
| `prc-006.md` | claims procedure | 1411 | 19 |
| `uwm-002.md` | underwriting manual | 1332 | 21 |
| `opn-2024-011.md` | coverage opinion | 408 | 6 |
| `det-2023-004471.md` | determination summary | 337 | 7 |
| `det-note-004471.md` | claim file note | 330 | 9 |
| `det-cpl-004472.md` | coverage position letter | 260 | 8 |
| `det-ror-004482.md` | reservation of rights | 380 | 9 |
| `det-den-004485.md` | denial letter | 384 | 10 |

**Ten shapes, not six.** The first pass had one `det-*.md`, because
`CORPUS-PLAN.md` Step 1 lists "prior claim determinations" as a single type. The
research found **four** distinct shapes under that name — file note, coverage
position letter, reservation of rights, denial letter — with different authors,
different legally-required contents and different precedence. Each is here, and
each measures 8–10 chunks rather than the 7 the single shape suggested.

**Two findings, both from this one free run.**

**`orphans=0` on the new table shapes.** Bulletins, circulars and manuals carry
tables the existing corpus has no equivalent of — authority matrices, component
schedules, lookback thresholds. The chunker's never-split-a-table-from-its-header
rule holds on all of them, down to a hostile 120-character budget. That was not
knowable from the current corpus's `orphans=0`, which only says the chunker
handles the *forms*.

**`0 distinct form ids`** — live confirmation of
[`00-code-facts.md`](../00-code-facts.md) Finding 1. Every one of the six gets
`formId: ''`, so every one would be invisible to a form-filtered `search_policy`
and every citation of one would be scored a dangerous fabrication. Predicted
from reading the regex; now measured.

## The finding that changed the size decision

**Chunk count tracks heading density, not word count.** `det-2023-004471.md` is
337 words and produces 7 chunks — 48 words per chunk. These documents are
heading-dense by nature: a bulletin is a dozen short numbered sections, not
three long ones, and the chunker splits on headings first by design.

The first estimate in the design was built from length and was 2.5–3× low across
every type. Real insurance documents in these categories are short and
*sectioned*, and sectioning is what the chunker counts.

A 48-word chunk is still a good retrieval unit here, because the heading trail
travels with it: `BUL-2024-07 > 6. Escalation` plus forty words is citable. But
it means the corpus is bigger in chunks — and therefore in ingest cost — than
page counts suggest.
