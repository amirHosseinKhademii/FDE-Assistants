# The two tools, plainly

*Written 2026-09-13. What `find_comparable_work` and `search_documents` are,
what they do, and why each rule inside them is there. No jargon that is not
explained on the spot. Code: `packages/steering/src/agent/tool/` and
`src/tools/functions/`.*

---

## What a "tool" is here

A normal TypeScript function, plus a written description of what it does and
what arguments it takes. The description is the only thing telling the model
when to reach for it and what to put in the fields.

**The model never sees a database, never writes a query, and never gets a
connection.** It picks a tool and fills in arguments; everything else happens in
code that can be read, tested and refused.

That boundary is the point. A model given database access will answer every
question, including the ones the data cannot support.

---

## `find_comparable_work` — *what did work like this cost us before?*

### What it takes

Seven arguments, **all optional**:

| | |
|---|---|
| `change_class` | modify hardware, new function, safety case only, recalibrate… |
| `element_kind` | gearbox, ECU, motor, sensor, control software… |
| `asil` | the safety level required |
| `safety_case_impact` | does the safety argument have to be reopened? |
| `tooling_required` | does metal have to be cut? |
| `rate_year`, `rate_region` | which approved rate card to price at |

Optional because a new requirement is described in the terms that are known
about it, which is rarely all six. **A narrower filter is not automatically a
better one** — it is a smaller sample.

### What it does

Filters the 203 past jobs derived from the customer's own closure reports and
timesheets, takes the **median** hours of the matches, splits those hours across
disciplines, and prices each discipline at the approved rate.

### What it gives back

Median hours · the euro breakdown by discipline · **n**, the number of jobs the
figure rests on · the spread from cheapest to dearest · and, for every job, the
file and the sentence that says what it was.

### The four rules that live inside it

They are inside the tool, not in a prompt, because a rule a model can talk
itself out of is not a rule.

**1 · Below three comparables it refuses.** And the refusal carries **no number
anywhere** — median, mean, total and spread all come back empty, not zero. Zero
is a price. If there is a number on the page somebody will read past the
sentence and use it.

**2 · Median, never mean.** On the gearbox set the mean is 54% higher than the
median, because one job in it absorbed a production-line relocation. The median
ignores that; the mean nearly doubles the quote.

**3 · `n` always comes back.** A price without its evidence count cannot be
judged. €81,455 from six jobs and €81,455 from one are different claims and must
not print the same.

**4 · A wrong argument is a MISS, not a refusal.** Ask for
`modify_gearbox_thingy` and it returns "not found" plus the nine change classes
the documents actually use — read from the corpus, not hardcoded. A typo and a
genuine gap both match zero rows, and reporting one as the other sends somebody
hunting for history that was never missing.

### What it will not do

Decide what to charge. This is what similar work *cost*; contingency, commercial
position and risk are somebody else's call, and the tool description says so.

### What it replaces

Someone searching the archive and estimating from memory across a couple of
meetings.

---

## `search_documents` — *what do the documents actually say?*

### What it takes

A `question` in plain English, and optionally `doc_type`, `programme`, `repo`
and `k` (how many passages to return).

### What it does

Runs the question two ways at once over 3,854 indexed passages, then merges the
two rankings:

- **by meaning** — every passage was turned into a numeric fingerprint, so a
  question finds it by what it says rather than which words it shares
- **by exact keyword** — Postgres full-text search

### Why both, and not just the clever one

Each fails alone, and the failures are opposite:

- *"how much rack force must the assembly deliver?"* shares almost no words with
  the requirement that answers it. **Keywords find nothing.**
- `SR-EPS-0421` and `SR-EPS-0407` are nearly identical as meaning. **Vectors
  cannot separate them.**

Both cases are in the acceptance test for exactly this reason, and neither arm
passes both.

### What it gives back

The passage text, the file it came from, the document type, the programme, and
**how it was found** — by meaning, by keywords, or by both. That last field is
worth reading: *both* is the strong case; one arm alone tells you which half of
the search did the work.

### The rule that matters most

**There is no relevance threshold.** The best available passages always come
back, even when every one of them is poor.

That is deliberate. Deciding *"the answer is not in these documents"* is reading
comprehension, not a score. A cutoff tuned to hide rubbish on one question hides
the answer on the next, and it fails silently in both directions.

So the tool description tells the model plainly: read the passages and judge
them; if they do not answer the question, say the documents do not cover it
rather than citing the closest thing that came back.

### What it replaces

Reading 1,069 files to find the one paragraph that matters. The safety level of
the damping software is a sentence in an assessment written in 2021 — there is
no column anywhere in four databases that holds it.

---

## How they work together

1. A new customer requirement lands.
2. `search_documents` — what do our documents say about this today? What is it
   classified as, what did the last review conclude, what did we commit to?
3. From that, the work is described in the terms the cost history uses.
4. `find_comparable_work` — what did jobs like that cost?
5. Where there is not enough history, it refuses, and that goes to the meeting
   as an open item rather than as a number with a caveat attached.

Those are the four questions Vantis answers by hand today:

> what do we already have · what nearly does it · what does not exist · what do
> we charge

---

## What they deliberately do not do

- **No recommendation.** Neither tool says "quote this" or "reuse that".
- **No writing.** Everything on this path is a read, asserted by
  `pnpm steering:sql-check`, which fails the build if a write statement appears.
- **No reach into the customer's systems.** Both read only the database we
  derived from the documents. The same check fails the build if anything here so
  much as names one of the four — including in a comment, which has caught the
  author three times.

---

## Running them

```bash
pnpm steering:comparables-check      # free — the pricing tool, database only
pnpm steering:search-tool-check      # one embedding call
```
