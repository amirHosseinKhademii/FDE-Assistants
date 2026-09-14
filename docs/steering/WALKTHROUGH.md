# The answer key — worked out by hand, before any AI

*Written 2026-09-13. Phase A of [`PLAN.md`](PLAN.md). No jargon: if a sentence
below needs a definition, that is a bug in this document.*

> **Note, added the same day.** After this was written the estate was re-rooted:
> the customer's reality is now **1,069 documents** — specifications, trace
> matrices, timesheets, closure reports, a code base — and the four databases
> are the structured view *we* produce from them.
>
> **Everything below still holds**, and was re-run after the change: the same
> answers, the same evidence, `walk-check` still 11/11 with 4 sabotage cases.
> What changed is where the data *comes from*, not what it says.
>
> One consequence worth carrying into Phase B: the walks below read the
> databases, which means they read **our extraction**, not the customer's
> documents. Whether that extraction is faithful is now its own question, and
> it is not one this document answers.

Three commands, all free, none of them call an AI:

```bash
pnpm steering:walk-angle    # "do we already have this?"  — shows its working
pnpm steering:walk-cost     # "what does it cost?"        — shows its working
pnpm steering:walk-check    # are those answers still the answers?
```

---

## Why this document exists before the tool does

A steering supplier gets a request from a car maker. Somebody has two weeks to
answer four questions:

1. What do we already have that does this?
2. What nearly does it, and how big is the change?
3. What doesn't exist at all?
4. What do we charge?

Today that is two weeks of searching through code and documents. Dissolving that
search is the point of the project.

**But we worked the answer out by hand first, and that is not a detour.** Once
software starts producing answers they will be fluent and confident whether or
not they are right, and there will be nothing to check them against. So this is
the answer key. Anything built later either matches it or it doesn't.

It also tests something that was not guaranteed: *is the question answerable
from this data at all?* Better to find out in an afternoon, for free, than after
building an assistant that produces confident nonsense.

---

## The request

Kestrel Motors, programme K2, a mid-size SUV. Rack-assist electric steering,
start of production September 2028. The specification asks for twenty-four
things; this document works through three of them.

Two versions of that specification exist. **Revision A, from May, is
superseded. Revision B, from July, is in force.** That distinction is the first
thing every answer below establishes, because answering against the old version
gives a confident answer to a question the customer withdrew.

---

## Question 1 — "do we already have something that steers ±50°?"

### The route

Eight lookups across three databases. Not one of them is a join, because no
join is possible — the requirement lives in one system, the part evidence in a
second, and the vehicle programmes in a third. Every crossing is stitched
together in code.

| | The lookup | What came back |
|---|---|---|
| 1 | Which version of the request is in force? | Rev B. Rev A superseded on 30 July. |
| 2 | What does the requirement say? | ±50°, must-have, proven by test |
| 3 | Did it change between versions? | No — worth establishing, not assuming |
| 4 | Which parts *claim* to do it? | **10** |
| 5 | Which have a *test* behind the claim? | **6** — four were paper only |
| 6 | Do those six actually ship? | |
| 7 | On the same kind of steering system? | |
| 8 | Shortlist | **2 survive** |

### The four conditions, and why there are four

A candidate is only an answer if **all** of these hold:

1. test evidence at or above the requirement
2. it is in production — **it can actually be ordered**
3. it has actually shipped on something
4. on at least one programme of the same steering architecture

### The mistake that produced condition 2

The first version of this walk used one rule: *best number wins.* It answered
`VS-RACK-2001-D` — 55.86°, the highest of the lot, with a genuine rig test
behind it.

**That part is obsolete. You cannot buy it.**

The answer was wrong in a way that looks completely right: correct number,
correct evidence, useless conclusion. Nothing in the shape of the answer would
have told you.

This is the single most useful thing Phase A produced. "Best number wins" is
the rule everyone writes first, and the data was built specifically to punish
it.

### The answer

> **CR-K2-0102 — road wheel angle ±50°: we already have this.**
>
> `VS-RACK-1245-D` demonstrated **54.28°** on a rig (report TR-BULK-0041,
> 2 November 2023, LV124), is in production, and ships on the H1 programme —
> rack-assist, 7600 N, in production. **No change required.**

Five lines of evidence, each pointing at a specific record:

```
requirement    vst_alm  CR-K2-0102 as of CRS-KST-K2-001 Rev B
claim          vst_plm  part_capabilities  VS-RACK-1245-D
proof          vst_plm  qualification_tests QT-BULK-0041 → TR-BULK-0041
ships          vst_plm  part_program_usage × 1
comparable     vst_crm  programs × 1 at rack-assist
```

### What a person still has to decide

- **4.28° of margin.** Whether that is enough on a new vehicle with different
  geometry is an engineering judgement. The data cannot settle it.
- **`VS-RACK-2001-D` did better — 55.86° — and cannot be ordered.** If the
  margin above is judged too thin, reviving it is a commercial question, not a
  technical one. It stays in the output rather than being silently dropped,
  because a silent exclusion is how a meeting never hears about an option.

---

## Question 2 — "what does it cost?"

This is the dangerous question, and the reason is worth stating plainly.

**Question 1 can fail loudly.** If nothing satisfies the requirement you get an
empty shortlist and you notice.

**Cost cannot fail that way.** It will always produce a number. A number that is
the average of everything the company has ever done looks exactly like a number
that means something.

### Item A — the gearbox

The customer needs 8000 N of rack force.

```
customer needs     8000 N
datasheet claims   8000 N   ← by calculation. Nobody tested it.
rig demonstrated   7600 N   ← the only actual evidence
```

**400 N short on evidence.** The datasheet says we are there; nothing tested
says so. Reading the capability record alone gives "carryover, no cost" and is
wrong. This is a change, and it has to be priced.

Nine comparable past jobs — same kind of change, same kind of component, no
safety work:

```
median     710 h   ← price from this
mean       969 h   ← 37% higher. Something is dragging it.
```

The something is `EFF-2021-0443`: **3,180 hours**, because that job quietly
absorbed a factory relocation — tooling transfer, re-qualification, a second
approval round. Roughly 2,400 of those hours are the relocation, not the
gearbox.

It is a real number answering a different question. **It is excluded by using
the median, not by deleting the record** — deleting history is how you lose the
reason it was strange.

**710 hours → about €80,000**, split across hardware, validation, systems and
project management at the 2026 rates.

### Item B — the damping software, and the reason the whole corpus exists

The damping software ships at one safety level. The K2 programme needs a higher
one.

**No database anywhere says what level it ships at.** It is a sentence in the
third paragraph of a released safety assessment sitting on disk:

> `SWC-DAMP` and `SWC-HYSTCOMP` are **developed to ASIL B**. The decomposition
> argument rests entirely on the independence of `SWC-SAFEMON`…

and the same document, further down, warns:

> A programme that allocates a higher ASIL directly to the damping path…
> **cannot inherit this classification.** In that case the component requires
> re-development to the allocated ASIL, and the work is substantially the safety
> case rather than the code.

The K2 requirement asks for **ASIL D**. So: the C code very likely survives; the
safety *argument* does not. Requirements, verification evidence, tool
qualification and the case itself are all new work.

Eleven comparable past jobs, and this set is well behaved — mean 1,625 against
median 1,571, only 3% apart, so nothing is distorting it.

**1,571 hours → about €203,000.** The largest item on the page.

> **A tool built on the four databases alone would have quoted this job without
> it.** That is the whole argument for treating the code base as documents to be
> read rather than as tables to be queried.

### Item C — and one we cannot price

```
comparable set: a new software function at the highest safety level
found: 1 past job

✗ FEWER THAN 3 COMPARABLES. No price.
```

This is not a gap in the tool. It is the honest answer: *we have not done enough
of this to know.* It goes to the meeting as an open item, not as a number with a
caveat attached.

Three is not a magic number — it is the smallest set on which a median means
anything at all.

### The answer

| item | hours | cost | based on |
|---|---|---|---|
| gearbox change | 710 | €80,034 | 9 past jobs |
| damping safety case | 1,571 | €202,853 | 11 past jobs |
| new high-safety function | — | **no basis** | 1 past job |
| **priced** | **2,281** | **€282,888** | |

**This is not the quote.** It is three line items out of twenty-four
requirements, and it is deliberately not scaled up — multiplying three items by
eight is exactly the arithmetic that produces a confident number from nothing.

### What a person still has to decide

- **Is 400 N of missing evidence a re-test or a re-design?** The gearbox may
  well already do 8000 N — nobody has tried. A week on a rig is cheap. The
  €80,000 above assumes the expensive reading.
- **Does the safety case need rebuilding at all**, or could the K2 architecture
  keep damping out of the assist path and inherit the 2021 decision? That is an
  architecture choice and it is worth more than every other line on this page.
- **The unpriced item needs a bottom-up estimate** from somebody who has done
  one. History cannot help and should not be made to look like it can.

---

## The three rules this produced

Everything above reduces to three conditions for an honest cost answer:

1. **Price from the median of a filtered set, never the mean.** The gearbox set
   shows why: 969 against 710, a 37% difference, caused by one record.
2. **Always say how many past jobs it rests on.** A price without its evidence
   count cannot be judged by the person reading it.
3. **Refuse below three comparables** rather than produce a figure.

And one about the shape of the output:

> **The product is not a price. It is the pack the meeting needs.** What the
> records support, what is missing or contradictory, a cost range with its
> evidence count, and the short list of things only a person can decide. A tool
> that hands over one confident number replaces the judgement. A tool that hands
> over the evidence removes the two weeks of searching and leaves the judgement
> where it belongs.

---

## Keeping it true

`pnpm steering:walk-check` asserts every conclusion above against the live
databases, through the same code the walks print from — so the two cannot drift
apart.

It checks **bands, not exact values**: an exact assertion on €80,034 would go
red the day somebody adds one past job, which is a change we want to be able to
make. A band goes red when the answer moves for a reason that matters. Counts
are exact, because a count moving means a filter moved.

And it is tested in **both directions**, because a suite of only-positive
assertions cannot tell you it is passing for the wrong reason:

| sabotage | must change the answer |
|---|---|
| remove the "can it be ordered" condition | answer flips back to the obsolete part |
| price from the mean instead of the median | €109,272 — a 37% overquote |
| lower the refusal threshold to 1 | a price appears where there is no basis |
| **keep the outlier, use the median** | **answer must NOT move** — 1% against the mean's 37% |

That last row is the let-through direction. A guard that rejects everything
passes every negative test and is useless.

```
walk-check: PASS — 11 ok, 4 sabotage cases, 0 failing
```

---

## What Phase A settled

**The question is answerable from this data.** That was not guaranteed.

**The traps are real.** Two of the seven planted in the estate caught this
walk's own author: the obsolete part, and the mean that lies by 37%.

**The hardest part is not the arithmetic — it is knowing which records to
compare against.** Both mistakes above were filter mistakes, not calculation
mistakes.

**And the biggest single cost item was only findable by reading a document.**

---

## What happens next

Phase B builds the tool, and now there is something to measure it against.

0. **Check the extraction is faithful** — the databases are now a derived view
   of 1,069 documents. Nothing yet proves a requirement in the database says
   what the specification says. This is new work created by the re-root, and it
   comes first, because every answer below rests on it.
1. **Make the files searchable** — index the corpus so a search for "what safety
   level is the damping software?" lands on the right paragraph. Checked by
   searching for things whose answers are already known.
2. **Give it the database lookups** — a small fixed set of questions it may ask.
   It asks; our code fetches.
3. **Let it answer the whole thing** — same request, same questions — and hold
   the result against this document.
4. **Score it properly** — turn the seven planted traps into test questions, run
   each several times, and count how often it is caught.

Step 3 is the first moment anything is learned about the assistant. Everything
before it is building the measuring stick.
