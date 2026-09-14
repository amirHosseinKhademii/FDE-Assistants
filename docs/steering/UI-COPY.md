# How it works — copy for the customer-facing page

*Short, technical, no jargon that is not explained on the spot. Written to be
lifted into the UI. Numbers are from the current corpus and will drift — the
build prints them, so wire them rather than typing them in.*

---

## Header

**1,069 files in. Answers out, with the sentence each one came from.**

Your documents are not a database. Nothing can be counted, compared or filtered
until they are. Three pipelines do that, and they are separate because your
files are three different problems.

---

## Panel 1 — PARSE  ·  files that already have columns

**In:** 131 timesheets, rate cards, estimates, quotations
**Out:** ~11,500 rows
**Runs in:** 4 seconds · no AI · never leaves your machine

Exports from your finance and PMO systems are already tabular, so they are read
with code, not a model.

**Under the hood.** A hand-written reader, not a CSV library, because your files
carry things a library gets wrong: comment lines above the header, quoted fields
with commas inside them (`"Lindqvist, Maja"`), three charge-code formats from two
finance migrations, and an empty approval column that means *never signed off*
rather than *rejected*.

**What we do not do.** We do not tidy. `M. Lindqvist` and `Lindqvist, Maja` stay
two values, because deciding they are one person is a judgement and judgements
belong where you can see and overrule them — not inside a file reader.

**What guarantees it.** A parse failure is an error, not a silent gap. Every row
carries its file and line number. Totals are reconciled against your own
records, and the reconciliation asserts the *expected* difference — the quarters
that were never exported, the bookings against closed codes — rather than
demanding a zero that would never come.

---

## Panel 2 — SEARCH  ·  documents that are prose

**In:** 702 specifications, assessments, reports, release notes
**Out:** 2,827 searchable passages
**Runs in:** under a minute · one-off cost, pennies

You cannot query a paragraph. So each document is cut into passages small enough
to retrieve and specific enough to be useful.

**Under the hood.** Cutting happens on structure, not on length. A fixed
character window slices clauses in half and separates a number from the heading
that gives it meaning. Instead:

- split on headings first, so a passage is a coherent section
- **every passage carries its heading trail** — `K2 > 3. Requirements >
  SR-EPS-0421` — so a retrieved fragment is both answerable and citable
- tables are never split from their header row; a value without its column name
  is worse than no value

Each passage is then turned into a vector — a numeric fingerprint of its meaning
— so a question can find it by *what it says*, not by which words it happens to
share. Search runs both ways at once: meaning and exact keyword. Exact matters
because a part number or a requirement id must match literally.

**What guarantees it.** Every passage keeps its file path and position, so any
result can be opened at the line it came from.

---

## Panel 3 — EXTRACT  ·  facts buried in sentences

**In:** 220 project closure reports
**Out:** 1,320 facts, each with the sentence it came from
**Runs in:** minutes · this is the only step a model reads

Some facts are not written as fields anywhere. To compare a new job with a past
one you need *what kind of change, which part, what safety level* — and your
reports say it in English:

> The existing hardware was modified. The work was on the gearbox. The existing
> safety case remained valid and was not reopened.

**Under the hood.** One request per document. The model must return two things
for every field: the value, **and the exact sentence it read it from**. The
response shape is enforced by a strict schema, so it cannot return prose, cannot
skip the evidence, and cannot invent a category outside the list.

**Then we check it.** Before anything is stored, that sentence is searched for in
the original file. If it is not there, the fact is discarded and kept in a
separate table for review. Inventing a plausible value is easy; inventing a value
*and* a sentence that exists word-for-word in one specific file is not. The check
is string search — it costs nothing and needs no second opinion.

**"The document does not say" is a real answer.** If a report never mentions
tooling, the answer is empty, not *no*. About a quarter of all answers are empty,
correctly. A system that reads silence as a negative will tell you with total
confidence that 196 jobs needed no tooling, when nobody ever wrote about it.

**What guarantees it.** Two independent signals, neither needing a known-correct
answer to compare against:

1. **Evidence found.** Every stored fact re-verified against the file it claims
   to come from — checked from the database side, so a bug in the loader cannot
   satisfy it by construction.
2. **Selective answering.** For each field, how often it answers on documents
   that mention it versus documents that do not. A field being *read* scores
   100% against 0%. A field being *guessed* scores similarly on both — which is
   exactly what guessing looks like from outside.

That second one is how we found a field that was answering 38% of the time on
documents that never mentioned it, and removed it.

---

## Panel 4 — What you get, and what you do not

**A price comes with its evidence.** How many past jobs it is based on, the
spread, and which documents. A figure without its evidence count cannot be
judged, so it is never shown alone.

**It refuses.** Below three comparable jobs there is no number. Not a number with
a caveat — no number. Widening the search until one appears was measured and is
worse: dropping a single filter produced an answer three and a half times too
low, and it looked just as confident.

**It tells you what your documents cannot answer.** That is the part that does
not come out of a database:

- only a third of completed work has a closure report, so most booked time
  cannot be attributed to a piece of engineering
- the safety level is not recorded next to the cost
- a quoted line cannot be traced back to the requirement it was priced for

Each of those is a field you could start recording. One of them, added to a
report template, turned a question worth roughly €190,000 from unanswerable into
answered.

---

## Panel 5 — Where your data goes

- **Parse and search indexes run against your corpus in place.** The largest part
  of the volume never goes anywhere.
- **Only the 220 closure reports are sent to a model**, one at a time, each about
  900 bytes, to a single endpoint: an Azure AI Foundry resource in the EU.
- **No retention on the provider side**, no server-side conversation state, and
  authentication is a short-lived directory token — no API key stored anywhere.
- The outgoing request is **captured and asserted by a check that ships with the
  code**, so this is demonstrable rather than claimed.

Nothing in the design assumes a public service. If the requirement is that no
data leaves your tenant, the model deployment moves inside it — one setting, and
the other two pipelines are unaffected.
