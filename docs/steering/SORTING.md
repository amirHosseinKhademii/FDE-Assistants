# Sorting the corpus — from 1,069 files to rows we can stand behind

*Written 2026-09-13. Step S6 of [`PLAN.md`](PLAN.md). Companion to
[`WALKTHROUGH.md`](WALKTHROUGH.md), which is the answer key in prose.*

> **Coming back cold?** [`STATE.md`](NEXT.md) — what exists, what it proved,
> what is unfinished, and the next command.
>
> **What next?** [`NEXT.md`](NEXT.md) — the programme filter, the trace panel,
> and what is still queued.
>
> **The whole map?** [`CONCEPTS.md`](CONCEPTS.md) — the eight pillars, context
> engineering, multi-agent, and what to build here to learn each.
>
> **What carries over from the last engagement?** [`FROM-PHARMA.md`](FROM-PHARMA.md) —
> caching, multi-agent, the debate, the guard: which apply here and which do not.
>
> **What can an agent actually call?** [`THE-TOOLS.md`](THE-TOOLS.md) —
> the two tools in plain language, and why each rule is inside them.
>
> **Want the extraction in detail?** [`WHAT-WE-ASK-THE-MODEL.md`](WHAT-WE-ASK-THE-MODEL.md) -
> the prompt, the schema, the evidence check, and the field we withdrew.
>
> **Asked where the data goes?** [`DATA-RESIDENCY.md`](DATA-RESIDENCY.md) —
> what leaves the machine, and how each claim is evidenced.
>
> **Asked for SOC 2, ISO 27001, or a GDPR position?** [`CONTROLS.md`](CONTROLS.md) —
> what our checks evidence, what they do not, and where a control-monitoring
> platform starts.
>
> **In a hurry, or not a programmer?** Read
> [`HOW-WE-SORTED-IT.md`](HOW-WE-SORTED-IT.md) instead — same story, no jargon,
> ten minutes.

> **Not to be confused with [`docs/pharma/EXTRACTION.md`](../pharma/EXTRACTION.md).**
> That document is about extracting *code* into reusable packages. This one is
> about extracting *facts* out of a customer's documents. Same word, unrelated
> jobs.

---

## The problem, in one paragraph

Vantis has 1,069 files and four databases. The databases look like the finished
job, and they are not: they were generated alongside the files, from the same
constants, in the same run. **Nothing has ever read a document and written a
row.** Every walk we have — `walk-angle`, `walk-cost` — queries rows that were
never derived from anything. They demonstrate the reasoning and they prove
nothing about the reading. This phase closes that gap.

---

## Where the data lands, and where it does not

| | what it holds | who reads it |
|---|---|---|
| `docs/steering/corpus/` · 1,069 files | the customer's raw estate, untouched | the ingest, **at build time only** |
| **`vst_derived`** · new, fifth database | everything we derive: parsed rows, chunks, extracted facts, provenance | **everything at runtime** — the tools, the agent, the app |
| `vst_crm` `vst_plm` `vst_alm` `vst_pmo` | the answer key | one command, `derived:grade`, and nothing else |

**Nothing the product reads comes from local disk.** At a real engagement the
corpus sits on the customer's SharePoint; here it sits in `docs/`. Either way it
is an input to ingest, like source code is an input to a build.
`STEERING_CORPUS_DIR` is therefore a **build-time** variable. If the deployed app
ever resolves it, that is a bug.

Provenance is a *pointer stored as text* — file path, line or section, and the
exact sentence — never a copy of the file. So the trail stays checkable with the
corpus directory absent.

### `vst_derived` is ours, and it is deliberately not in `SYSTEMS`

`SYSTEMS` is the customer's four. `db:drop` and `db:reset` iterate it. Putting
our index in there would mean a routine estate reset silently destroys the
index — **which is exactly how pharma lost its own**. So:

- `vst_derived` gets its own constant, its own `derived:create` / `derived:migrate` / `derived:drop`.
- `assertOurs()` is left alone, guarding the four.
- A guard fails the build if anything under the ingest path imports `SYSTEMS`,
  `DB_NAMES` or `urlFor`. The ingest may read the base URL and nothing else.

That last one matters more than it looks. When extraction leaves a gap, the
cheapest fix in the world is to quietly read the right value out of `vst_alm`.
Then the grade is meaningless and nobody notices for a month.

---

## Three pipelines, because the corpus is three different problems

| | volume | mechanism | can it be wrong? |
|---|---|---|---|
| **1 · Parse** | 131 files · 580 KB · CSV + JSON | deterministic code | no — a failure is a bug we fix |
| **2 · Index** | 621 md + 220 C/H · 1.2 MB | chunk + embed | only in what it *fails to find* |
| **3 · Extract** | the facts inside the prose | a model, structured output | yes — the only one with a confidence column |

Order is parse → index → extract, and the order is the point: each stage gives
the next one something to be checked against. Parsing is free and exact, so it
goes first and becomes the harness.

### 1 · Parse — things that already have columns

Timesheets, rate cards, estimates, trace matrices, calibration exports,
`build.json`. These become real tables.

What the parser has to survive, all of it already in the corpus on purpose:
`#` preamble lines above the header; `"Lindqvist, Maja"` quoted with an embedded
comma; three charge-code formats across the years; an empty `approved` column
that means *never signed off*, not *rejected*; two missing quarters.

**The parser normalises nothing that is a judgement.** `M. Lindqvist` and
`Lindqvist, Maja` stay two values. Deciding they are one person is a call
somebody should be able to see and disagree with, so it lives downstream and
visible, not buried in a CSV reader.

### 2 · Index — things that are prose

Design rationale, review notes, MISRA `DEVIATIONS` sections, integration docs,
and the code bodies.

**Code is chunked by function, not by token window** — a token window cuts a
function in half and retrieves the half without the signature.

One complication, and it is why this is not a one-line change. The calibration
parameters a function depends on are declared once in the FILE BANNER, not
beside the function that uses them:

```
 * CALIBRATION PARAMETERS
 * name             type      unit        min     max     default  cal?
 * DAMP_GAIN_BASE   float32   Nm*s/rad    0.00    0.90    0.20     yes
```

Cut on function boundaries alone and you get functions with no parameters, and a
parameter table belonging to no function — and the parameters are what anyone
actually searches for. So the banner is its own chunk, and each function chunk
carries only the rows its own body names.

*(An earlier version of this paragraph said the parameters were in a comment
block above the function. They are not, in any of the 147 `.c` files — see the
corrected note further down.)*

### 3 · Extract — facts sitting inside sentences

"The damping module is developed to ASIL B" is a fact wearing prose. It becomes
a row, carrying file, section and the exact sentence. This is the only pipeline
a model touches and the only one that may be wrong, which is why it is last.

### The 81 MISRA `.txt` reports — half and half

`SUMMARY` is a fixed block and parses. `DEVIATIONS` is free text and does not.
They split across pipelines 1 and 3 rather than picking one. This is not a
tidiness question: **deviation D-07 is the only place in 1,069 files that
explains why the damping module compiles at ASIL D while its header and safety
assessment both say ASIL B.** If the sorting loses D-07, the estate still looks
consistent and is not, and there is no signal anywhere that a fact went missing.

---

## Grading, and the trap in having an answer key

We can grade against `vst_alm`. No customer can. So a check that needs the
answer key is a check that cannot ship, and if we build only those we will have
built something that works exactly once.

So the checks that come **first** are the ones that need no ground truth:

- **coverage** — how many files produced zero rows and zero facts?
- **internal consistency** — does the same requirement get two different ASILs
  from two documents? *(It should. Three times. That's a planted trap, and a
  consistency check that reports zero conflicts is broken.)*
- **refusal rate** — how often did extraction decline rather than guess?
- **confidence distribution** — is it bimodal, or is everything 0.8?

Then, and only then, the answer key is used for one thing: confirming that those
four proxies actually track correctness. That is the finding worth having —
*these signals predict extraction quality without ground truth* — and it is
worth more than any accuracy number, because it is the part a customer can use.

### Reconciliation asserts the planted delta, not zero

The obvious first check is "do the parsed timesheet hours equal `vst_pmo`?" They
do not, and they must not: two quarters are missing from the exports, some
bookings sit on closed charge codes, one person has two spellings. Asserting
equality means spending an afternoon "fixing" data that is correctly messy.

So the reconciliation asserts the **expected delta**, derived from the same
constants that planted the mess — and never from running the parser and
accepting whatever number came out. That mistake has already been made once in
this package (the tautological negative control in `assertions.ts`) and it
produces a check that passes forever while testing nothing.

Both directions get sabotaged, as everywhere else here: delete one timesheet
file and the reconciliation must go red; remove one planted gap from the
expected set and it must go red too.

---

## The steps

Small enough that each one ends in something runnable and showable.

| | Step | Deliverable | Exit |
|---|---|---|---|
| ☑ **K0** | **`vst_derived` exists and is ours.** `DERIVED_DB` + `derivedUrl()` outside `SYSTEMS`, `assertOurs` rejecting it by name, and `derived:boundary-check` forbidding the ingest to name the customer's databases *including in comments*. | `05-derived.sql` — `source_files`, `timesheet_lines`, `document_fields` | `derived:migrate` 3 tables · `derived:boundary-check` **PASS 4/0**, both directions |
| ☑ **K1** | **Parse the timesheets and the closure-report head blocks.** 245 files → 9,931 timesheet lines + 1,540 labelled fields, every one carrying its file and line number. Reconciled against the answer key. | `derived:parse` (4 s, no model, no cost) · `derived:reconcile` | **PASS 8/0** · sabotage **PASS 7/7** |
| ☑ **K2** | **Parse the money documents** — 24 rate cards, 34 bottom-up estimates, 52 quotations. Everything `walk-cost` needs for a *price*, as opposed to an *hours* figure. | `rate_card_lines` · `estimate_lines` · `quote_line_items` | **PASS 12/0** · sabotage **PASS 9/9** · 0 parse issues |
| ☐ K2b | The rest of pipeline 1 outside PMO — trace matrices, `build.json`, calibration exports. Not on the path to closing the cost cheat, so it waits. | | |
| ☑ **K3+K4** | **Chunk and index the prose.** 702 documents (621 markdown + 81 MISRA reports) → 2,827 passages, embedded and stored. One pass, not two: chunking is the cutting, indexing is the vector. Nothing hand-written — `@fde/grounding` did all of it, and steering supplied one descriptor. | `steering:index` · `document_chunks` | 2,827 chunks, ~322k tokens, pennies |
| ☐ K4b | **The 220 source files are NOT indexed.** See below — this is the gap, not a footnote. | | |
| ☑ **K5** | **Extract the comparables key from closure-report prose**, with provenance, plus the ground-truth-free checks. 220 documents, 1,320 fields, six fields after `reuse_class` was withdrawn. | `derived:extract` · `derived:grade-facts` | **PASS 6/0** · 98% of answered fields correct |
| ☑ **K5b** | Drop `reuse_class`. It is used by no walk, and removing it raised accuracy 93% → 98%. | | |
| ☑ **K9** | **Search the index.** `documents.ts` (department), `steering:search` (CLI), `steering:retrieval-check` (five cases). | `steering:retrieval-check` | **PASS 5/0** — and the damping question returns the three-way ASIL disagreement in one result set |
| ☐ K9b | Remove the hardcoded path from `walk-cost` step 3 once K9 passes. **That is where the second cheat closes.** | | |
| ☐ K4b | Chunk the 220 source files BY FUNCTION, carrying leading comment blocks. | | |
| ☑ **K10** | **A full code walkthrough of the grounding pillar** — every file on the path from a file on disk to a cited passage, in order. | [`GROUNDING-WALKTHROUGH.md`](GROUNDING-WALKTHROUGH.md) | eleven files, nine of them shared; `@fde/grounding` needed no edit for a third domain |
| ☐ K6 | Grade against the answer key — once — and report whether the four proxies tracked it. | | |
| ☑ **K7** | **`walk-cost --from-documents`** reads past jobs from `vst_derived` instead of `vst_pmo`. Same reasoning, same filters, same refusal rule — only the source changes. **The cheat is closed here.** | `ANSWER_KEY` / `FROM_DOCUMENTS` in `derive.ts` | one priced answer survives at 0.5%, one €202,853 answer becomes a refusal |
| ☑ **K8** | **A plain-language account of how the sorting works** — no jargon, for somebody who has not read a line of this. | [`HOW-WE-SORTED-IT.md`](HOW-WE-SORTED-IT.md) | reads standalone; no term used before it is explained |

### `walk-angle` is blocked on raw data, not on sorting

Measured, not assumed: the part numbers `walk-angle` reasons about — `VS-RACK-…`,
`VS-ECU-…` — appear in **one file out of 1,069.** `vst_plm` has 8 tables and
1,622 rows and essentially **no document source at all**. No amount of parsing,
chunking or extraction produces it, because it is not in the corpus.

That is a finding rather than a delay, and it is the kind a real engagement
produces in week one: *the hardware estate is not in the documents you gave us.*
The fix is more raw data — a part-master export, a BOM, a lifecycle-status
report — not more pipeline. It belongs with the corpus generators, not here.

`walk-cost` has the opposite situation: timesheets, rate cards, quotes,
estimates and 220 closure reports, all of it documented. So cost is closed
first, and it is closed properly.

---

## What K1 actually found — 2026-09-13

`derived:reconcile` · PASS 12/0 · `derived:reconcile --sabotage` · PASS 9/9 · `derived:boundary-check` · PASS 4/0.

- **195 efforts reconciled to the hour. Residual 0.0 h.** Where a closure report
  exists and the quarter was exported, what the documents say and what the
  answer key says are the same number. The parse is exact.
- **220 of 640 efforts — 34% — have a closure report**, and therefore a charge
  code, and therefore a link between a week of somebody's time and a piece of
  engineering. **293,019 booked hours belong to work no document names.** That
  is not a parser limitation; it is the customer's actual position, and it is
  the single most useful thing K1 produced. Two thirds of the cost history
  cannot be classified from the files alone, which puts a hard ceiling on any
  estimate built from documents only — and tells us exactly where the ceiling
  is instead of leaving it to be discovered in front of the customer.
- 3 quarters were never exported (2020-Q4, 2021-Q2, 2026-Q1); 30 lines / 253.7 h
  are booked against closed codes and are kept, flagged and set aside; 12 people
  are spelled two ways and stay that way; 742 lines were never signed off and
  are stored as unknown rather than as rejected.

### Two holes found by writing the checks, not by running them

**The headline number had no conservation check.** The 293,019 h figure is
computed by subtraction — lines whose charge code is not in the bridge — and a
subtraction is only as good as the claim that there is no third bucket. So the
partition is now asserted: every booked hour is either attributed or explicitly
unattributable, exactly once.

The first version of that assertion **summed the same lines on both sides**, so
the two buckets partitioned by construction and it could not fail whatever the
data did. It now takes the attributed side from the answer key, which makes it
the per-effort reconciliation restated as a total — and a total catches the case
the per-effort loop never looks at, which is a charge code that was recovered
from a report and has no lines under it at all.

**The guard ran in one direction only.** `derived:boundary-check` stopped the ingest
reaching the customer's databases. Nothing stopped the estate reaching ours —
and that is the direction that actually destroyed pharma's index. `assertOurs`
rejects `vst_derived` by name, but only if something calls it with that name, and a
loop over `SYSTEMS` never would. Two free assertions now hold it: `vst_derived` is
not a member of `SYSTEMS`, and `src/db/init/drop.ts` does not name it.

## What K2 added — 2026-09-13

24 rate cards, 34 estimates, 52 quotations. **168 rates, 298 estimate lines, 293
quoted lines, 0 parse issues.** All of it exact against the answer key.

**The rate cards are the one that looks trivial and is not.** A rate card is
seven rows of `discipline,rate`. *Which year and which region those rates apply
to is not in the data* — it is in a `#` comment above the header, and in the
filename. A parser that reads only the CSV body produces 168 numbers that cannot
be told apart, reports a clean run, and prices eight years of work off one card.
Both sources are read and required to agree, and the sabotage case for it is
exactly that failure.

Quotations are Markdown, which is where pipeline 1 stops being CSV reading. The
table and the bold total line are regular and parse exactly; the Assumptions
section below them is prose and is handed to pipeline 3 rather than guessed at.
Same split as the MISRA reports.

### Two things the money documents cannot tell us, and one they alone can

- **What the work finally cost.** 23 quotations carry `actual_hours_final` in the
  answer key. No document records it. The comparison between quoted and actual
  is the only evidence the estate holds about *how wrong our estimates tend to
  be, and in which direction* — and it is not recoverable from files.
- **Which requirement a quoted line priced.** Found by writing the assertion and
  being wrong about it: `vst_pmo.quote_lines.cr_ref` is documented in the DDL as
  a soft key to `customer_requirements`, and **every row is null.** The generator
  writes `cr_ref: null` unconditionally. `db:check`'s soft-key walk never noticed
  and could not — a column that is *always* null is indistinguishable from one
  that is *sometimes* null, which the comment says is legitimate. So the question
  *"what did we last charge for a requirement like this one?"* has no answer in
  the documents **or** the databases. It is now asserted as known-empty, so the
  day it gets filled in, the line goes red and says why.
- **How sure anybody was.** The estimates carry `basis` — `guess`,
  `engineering judgement`, `from the last programme`, `supplier quote` — and a
  confidence. **66 of 298 lines are `guess`.** `vst_pmo` has no estimates table
  at all, so this exists only in the documents, the answer key cannot grade it,
  and nothing uses it. An estimate built from supplier quotes is not the same
  evidence as one built from guesses, and today nothing can tell them apart.

### The hole the sabotage found, which is the reason it exists

The first sabotage run went **5 of 6**. "One timesheet file never ingested"
stayed green — and the reason is worth writing down, because it is a shape that
will recur in every pipeline after this one.

Coverage was being derived **from the parsed rows**. Remove a file and its
quarter simply stopped appearing in the set of quarters being judged, so the
reconciliation lost a quarter of the estate and reported a perfect score. **A
check that narrows its own scope to whatever data turned up cannot fail.**

The fix is one line and the principle behind it is not: coverage is a claim
about *files ingested*, so only `source_files` may make it. With that change the
break turns red, and so does the case it really guards — a file that is present,
is read, and silently parses to nothing.

---

## What K5 found on 10 documents — 2026-09-13

70 fields. **63% answered, 37% refused, 0% resting on a sentence that is not in
the file. 42 of 44 answered fields correct against the answer key (95%).**

### The extraction made two mistakes in 70 fields. I made four.

That ratio is the headline, and it is the third time this repo's history has
produced it. Every red light on the first run was investigated before being
believed, and most of them were mine:

| red light | actual cause |
|---|---|
| "8 values invented" | **My grader.** The reports are hard-wrapped at 68 columns; `statedIn` matched against raw text, so `4 interface(s)\n   were affected` never matched and seven correct answers were reported as fabrications. `findEvidence` had already solved this one directory over and the fix was not carried across. |
| "1 fact rests on a sentence not in the document" | **The transport.** The model quoted `modify function \x14 Ulric.` where the file says `modify function — Ulric.` — an em dash replaced by a control byte. Same family as the NUL that killed the first run. The sentence was real. |
| "`asil = QM` invented" | **My grader again.** The regex was `ASIL\s+[A-D]`. QM is an ASIL level. |
| "refusals only 58% concentrated" | **My metric.** It asked "is this refusal on `reuse_class` or `asil`?" and counted nine refusals on `tooling_required` against the model — refusals the prompt explicitly asks for. The check was penalising the instruction it existed to verify. |

Rewritten, all four: `statedIn` flattens whitespace and knows QM; evidence
matching accepts a punctuation-normalised near-match and **flags it**
(`evidence_exact = false`) rather than folding it into either bucket, because
"the model corrupts em dashes" and "the model invents sentences" are different
problems with different fixes and one run had both.

### The two real mistakes

- **`EFF-BULK-0067/element_kind`: read `software_domain`, key says `mechanical`.**
  The report says *"Changes were made to the existing control software. The work
  was on the rack and housing."* The model took the first sentence. The second
  is the one that names the element. A misread, not an invention.
- **`EFF-BULK-0010/reuse_class = new`.** The one that matters. It quoted a
  sentence that genuinely exists — *"New software, no predecessor to carry
  over."* — and inferred a **different field** from it. That is trap 2 in the
  prompt, stated explicitly, and the key says `modified`, so the inference was
  also wrong.

  **The evidence check could not catch this**, because the sentence is real.
  Only "was this field stated at all" caught it. Two independent signals, and
  the second one earned its place on its first outing.

### One field was refused that should not have been

`EFF-BULK-0004/element_kind` — the document says *"The work was on the rack and
housing"*, wrapped across two lines, and the model declined. 1 of 26 refusals.

### What transfers, which is the actual product

96% of refusals landed on fields their document genuinely does not carry. That
number is computed **without the answer key** — `statedIn` is a per-field
statement of "what would a mention of this look like", written by reading a
handful of documents. Any customer can produce that in an afternoon. A table of
right answers, they cannot produce at all.

So the two signals that work at a real engagement both fired correctly here:
evidence-not-found caught a transport failure, and refusal-placement caught the
one genuine fabrication. The 95% accuracy figure is the one that cannot ship.

### `derived:grade-facts` is still red, and stays red

One value in 70 was invented. That is the true state, the check is correct, and
making it green would mean either fixing the prompt until this document happens
to pass or lowering the bar to "one fabrication is fine". Neither is a result.

---

## K5 at scale — 203 documents, 1,421 fields — 2026-09-13

**61% answered · 38% refused · 91% of answered fields correct against the key.**
And that summary hides the only thing that matters, which the per-field table
does not:

| field | answered | refused | accuracy | fabricated |
|---|---|---|---|---|
| `change_class` | 197 | 0 | **100%** | 0 |
| `interfaces_touched` | 166 | 37 | **100%** | 0 |
| `tooling_required` | 31 | 172 | **100%** | 0 |
| `asil` | 4 | 199 | **100%** | 0 |
| `safety_case_impact` | 203 | 0 | 94% | 0 |
| `element_kind` | 194 | 9 | 93% | 0 |
| **`reuse_class`** | **75** | 128 | **36%** | **75** |

**One field produced all 75 fabrications and 48 of the 74 wrong answers.**
Everything else is 93–100%.

`reuse_class` has three possible values, so chance is 33% and the model scored
36%. It is not reading. It is guessing — on the one field no closure report in
the corpus states.

### The prompt is not the fix

It already says *"DO NOT INFER ONE FIELD FROM ANOTHER"* and names `reuse_class`
in the example. Given identical instructions and documents of the same shape it
refused 128 times and guessed 75 times. Another wording is thirty minutes and a
few cents to move a number that is already at chance.

**The conclusion is structural: `reuse_class` is not recoverable from these
documents, and the pipeline should stop offering it.** Same shape as `cr_ref`
being null in every row — a hole in the estate, found by trying. K5b measures
what dropping it costs `walk-cost`, which is the question that actually matters.

### The evidence check has a 0.4% false-positive rate and zero true positives

Six of 1,421 evidence strings failed verification. **All six are the same em
dash in the same title line**, mangled into control characters:

```
file:   integration only — Yarrow.
model:  integration only \t6 Yarrow.
        safety case only \u000e \bH1.
        validation only \u000b\u000b\u000b…\u000bKite.
```

All six carried the **correct** value. Plus three NUL bytes and six
punctuation near-matches elsewhere in the same run.

So: **not one fabricated sentence in 1,421 fields.** The detector is currently
measuring transport corruption of one non-ASCII character, not invention. It is
not loosened further to make it pass — a matcher tuned until nothing fails is a
matcher that detects nothing. The honest statement is the one above.

### The two wrong-answer categories, measured rather than characterised

- `element_kind`: 13 wrong. **7 of 13** are reports that contain two competing
  sentences — *"Changes were made to the existing control software. The work was
  on the rack and housing."* The model takes the first; the second is the one
  that names the element. The other 6 are plain misreads.
- `safety_case_impact`: 13 wrong. **3 of 13** are documents that contradict
  themselves outright. `EFF-BULK-0071` says both *"The work was the safety case:
  requirements, evidence and the argument itself"* and *"Assessed as having no
  safety impact at the change review."* There is no correct reading. The right
  behaviour is to flag a conflict, which this pipeline currently cannot express —
  the insurance engagement solved exactly this with `conflicts` + `escalate`.
  The other 10 are misreads.

Three cases is an observation, not a category. Stated as counts for that reason.

### The finding that transfers, and it is better than expected

The expectation was that the key-free signals would catch the transport failures
and **miss** the substantive one — refusal placement can say nothing about
`reuse_class`, because those 75 were answers, not refusals.

Two new signals catch it anyway, and neither touches the answer key:

**1 · Answer rate.** A field the documents state is answered nearly always; one
they never state is refused nearly always. `reuse_class` at **37%** is the only
field on the whole corpus between 15% and 82% — every other field sits at one
end or the other (2%, 15%, 82%, 96%, 100%, 100%). *A field the model cannot
decide whether it knows is a field it should not be answering.*

**2 · Evidence reuse.** `reuse_class` cites a sentence another field already
cited **17% of the time** (13 of 75), against 0–6% for the reliable fields. That
is the exact signature of inferring one field from another. It is a rate rather
than a rule — `asil` shares at 100%, legitimately, because the ASIL sentence
genuinely states the safety-case position too.

Both are now assertions in `derived:grade-facts`, both go red, and both name
`reuse_class` specifically. **A customer with no ground truth would have found
this failure.** That is the product; the 91% accuracy figure is not.

---

## K7 — the cheat, closed — 2026-09-13

`derivePrice` now takes a `Source`. Two exist: `ANSWER_KEY` (`vst_pmo`, the
rows that were never derived from anything) and `FROM_DOCUMENTS`
(`vst_derived.derived_effort`, assembled from closure reports and timesheets by the
sorting pipeline). **Both go through the identical filter, statistic and
refusal rule.** Nothing about the reasoning changes; only what it may see —
which is what makes the difference between the two runs a measurement of the
*documents* rather than of two different programs.

| query | answer key | from documents |
|---|---|---|
| A · gearbox change | n=9 · 710 h · **EUR 80,034** | n=3 · 706 h · **EUR 79,640** |
| B · damping safety case, ASIL D | n=11 · 1,571 h · **EUR 202,853** | **n=0 · REFUSED** |
| C · new ASIL D software function | n=1 · refused | n=0 · refused |

**The gearbox price survives at 0.5% out. A €202,853 answer becomes a refusal.**

### Why B collapses, and it is not extraction quality

`asil` is null for 199 of 203 derived jobs, because no closure report states it.
Extraction got all four that exist right and correctly refused the other 199.
Any query filtering on ASIL therefore finds nothing. **The customer does not
record the safety level next to the cost**, and no pipeline can invent that.

### The median is visibly doing work at n=3

The document-derived gearbox set contains `EFF-2021-0443`, the production-line
relocation: 3,180 hours against a median of 706. Mean 1,480 h, **110% above the
median**. Pricing from the mean here would quote more than double.

But the *warning* cannot be printed. The explanation — "roughly 2,400 of these
hours are the relocation" — is prose in section 3 of the closure report, and
nothing has asked a model for it. So `outcome_note` is null by construction in
`FROM_DOCUMENTS`, and the honest version of this walk knows the number is
distorted without being able to say why. **That is a real regression against the
answer-key version and it is stated in the column definition rather than
discovered as a missing paragraph.**

### `walk-angle` still cannot follow, for the reason established earlier

Its part numbers appear in one file out of 1,069. Sorting cannot produce what
is not there.

---

## Why ASIL cannot be recovered from the engineering documents — 2026-09-13

The plan after K5 was to extract ASIL from the requirements and code documents,
where it appears in 484 files, and join it back to the effort records — turning
query B's refusal into an answer. **It cannot be done, and the reason is worth
more than the feature would have been.**

The requirements documents state ASIL in a form that needs no model at all:

    ### SR-EPS-0407 — Rack force at the rack, including internal losses
    - ASIL: B · verification: test · owner: systems

That parses. The problem is the other end of the join. In
`db/seed/effort.ts`, every bulk effort record draws its classification
independently:

    const asil = h.pick(['QM', 'QM', 'B', 'B', 'C', 'D']);
    element_kind: h.pick(ELEMENT_KINDS),
    reuse_class:  h.pick(['carryover', 'modified', 'new']),

**An effort record's ASIL is a random draw, unrelated to any requirement.** The
`chr_ref` link is also a random pick. So there is no relationship between the
two halves to recover — the join is not missing a key, it is missing a fact.

This is the **third** defect the sorting has exposed in an estate that passes
27/27 of its own checks, after `cr_ref` being null in every row and the
timesheet coverage gaps. They share a cause: generating the databases and the
documents from the same constants made them consistent wherever the generator
happened to share a variable, and independent wherever it did not. **Only trying
to derive one from the other tells you which is which** — which is exactly the
argument for having done this phase at all.

### Both halves fixed — 2026-09-13, at the user's direction

**1 · `effort_records.asil` now inherits.** A job's safety level is taken from
the requirement its change request targets (`change_request_items` with
`target_kind = 'sr'` → `system_requirement_versions.asil`), and is drawn only
where the work traces to nothing — about 40%, standing work nobody recorded.
The die roll is still taken and discarded, so the same number of values is
consumed and every later draw in that loop stays where it was: six tables moved,
and the requirements and architecture did not.

**2 · Closure reports now print it.** `Safety level:  ASIL D`, on the 131 of 220
reports whose work traces to a change request. That one line is the deliverable
a customer can act on — not *"your extraction needs work"* but *"add this field
to your template and a quarter of your cost history becomes machine-answerable"*.

New fingerprint `400562829f7559b6`, 13,712 rows. `estate-check` 28/0,
`db:check` 27/0, `corpus-check` 14/0, `sabotage-check` 14/14, `walk-check` 11/0
with 5 sabotage cases, `derived:reconcile` 12/0.

### The data change exposed a bug in a check, which is the point of having them

`T3` — "the safety-case multiplier is recoverable from the effort history" —
went red at **4.69×** against a 3.8–4.6 band, and the generator's multiplier had
not changed at all.

It was pooling every record into two heaps and dividing one median by the other.
A new-hardware job and a recalibration differ by two orders of magnitude in base
hours, so the moment the safety-case mix shifted between change classes, the
pooled ratio moved for reasons that have nothing to do with safety cases.
Measured **within** each class it is 3.88–4.90, median **4.41**, against a
generator value of 4.2.

**The check was doing the exact thing the product refuses to do.** `walk-cost`
will not price from an unfiltered set, and `walk-check` asserts that widening a
comparable set gives an answer 3.5× out — and meanwhile `T3` was comparing
across incomparable work. It took a data change to expose it. The band was not
widened; the measurement was corrected.

Two counts moved and no answer did: the gearbox set 9 → 11 comparables
(710 → 698 h) and the safety-case set 11 → 21 (1,571 → 1,497 h), both still
inside bands agreed before the change.

---

## The result, after both estate fixes — 2026-09-13

**220 documents · 1,540 fields · 69% answered · 93% of answered fields correct.**

### `walk-cost --from-documents` now prices two of three items

| query | answer key | from documents |
|---|---|---|
| A · gearbox change | 698 h · EUR 78,693 (n=11) | 747 h · **EUR 84,218** (n=5) |
| B · damping safety case | 1,497 h · EUR 193,310 (n=21) | 1,497 h · **EUR 193,310** (n=5) |
| C · new ASIL D software function | n=1 · refused | n=0 · refused |

**Query B matches the answer key to the euro** — a €193,310 figure derived
entirely from documents, where a week earlier the only honest output was a
refusal. The unlock was one line added to a report template, not a better
prompt. Query A is 7% high on a third of the evidence. Query C still refuses,
correctly, on both sides.

### `asil` went from unreadable to perfect, and the check nearly punished it

Before: stated in 21 of 220 reports, answered 4 times. After: stated in 141,
**answered 100% of those and 0% of the 79 that do not state it.**

That 64% overall answer rate tripped the "no field is answered a middling
fraction of the time" assertion — which was **a false alarm**. The signal asked
only *what fraction did it answer*, which works while every field is
all-or-nothing across a corpus and breaks the moment one is genuinely present in
two thirds of it.

Replaced with the conditioned version: **answer rate on documents that state the
field, against documents that do not.** `asil`, `interfaces_touched` and
`tooling_required` all separate perfectly — 100% against 0%. `reuse_class`
cannot be scored that way at all, because no document states it, and it answers
83 of 220 regardless. Still no answer key involved.

*A signal that cannot tell "answers selectively" from "answers at random" will
eventually punish the behaviour it exists to reward.*

### Zero fabricated sentences, again, in 1,540 fields

Ten evidence rejections, **all ten the same em dash** in the same title line,
arriving as control bytes (`new function \u000b\u001f…`, `safety case only
\t6 Kestra.`). The values were right. The detector's false-positive rate is
0.6% and its true-positive count remains zero.

### What is still red, and correctly

`reuse_class` — 83 values on a field no document states, quoting another
field's sentence 11% of the time. Unchanged by either estate fix, because
neither addressed it. It is not used by any walk. **K5b's answer stands: drop
it.**

---

## After dropping `reuse_class` — 2026-09-13

Replayed from cache, no API calls, no cost.

**`derived:grade-facts` PASS 6/0.** 220 documents × 6 fields = 1,320 · 75% answered ·
**98% of answered fields correct**, up from 93%.

Deleting one field raised accuracy five points, because that field was
contributing 83 answers at chance. Nothing downstream used it. The question it
would have answered — *what does carryover work cost* — is now correctly
unanswerable, and the sentence a customer can act on is *"your closure reports
do not record reuse."*

### Two checks were wrong and are now right

**The evidence assertion was testing the wrong table.** It claimed *"no fact
rests on a sentence that is not in the document"* — a statement about STORED
facts — and tested it by counting REJECTED ones, rows the pipeline had already
thrown away so that the claim would hold. It went red because the safety
mechanism had worked. Split in two:

- **every stored fact re-verified from the database**, not trusted from the
  writer, so a bug in the ingest cannot satisfy it by construction. 988 of 988.
  Must be zero.
- **the rejection rate, with a 1% ceiling**, currently 0.2%. A ceiling rather
  than a target, so a climb gets noticed before it becomes a fabrication rate.

**The matcher gained a third tier and the rejections fell from 10 to 2.** All
ten were the title line's em dash arriving as control bytes, sometimes with
digits mixed in (`new function \u000212 Kite.`) — unrepairable by punctuation
normalisation, because what came back is no longer punctuation. The third tier
compares letters only. It still checks every word, which is what a fabrication
would change; it gives up noticing a changed number inside a quotation, which
is carried in `value` and was never checked against the quote anyway.

**The two that remain are a different defect and are correctly rejected**: the
model looping — `integration only \n\n integration only \n\n integration
only` where the file says `integration only — Lumen.` A quote that repeats
itself is not in the document. Accepting it would mean tuning the matcher past
the point of measuring anything.

**Still zero invented content in 1,320 fields.**

### And an empty knowledge base no longer reports as an honest refusal

When `derived:extract` died mid-run, `walk-cost --from-documents` printed three
confident *"we have not done enough of this to know"* refusals. Every word was
false: it had no history to be short of. Those are opposite claims — one is a
finding about the customer, the other is a broken pipeline — and the walk
printed them identically.

`derivePrice` now reads how much history exists before any filter, and an empty
source says so in its own words. **A refusal is only honest if it can say what
it is refusing from.**

### Where the cost answer stands

| query | answer key | from documents |
|---|---|---|
| A · gearbox change | 698 h · EUR 78,693 (n=11) | 722 h · **EUR 81,455** (n=6) |
| B · damping safety case | 1,497 h · EUR 193,310 (n=21) | 1,457 h · **EUR 188,099** (n=6) |
| C · new ASIL D software function | n=1 · refused | n=0 · refused |

Both priced items within 4% of the answer key, on roughly a third of the
evidence, derived from documents alone.

---

## All three pipelines have run — 2026-09-13

| pipeline | in | out | where |
|---|---|---|---|
| **Parse** | 131 spreadsheet-like files | ~11,500 rows | `vst_derived` |
| **Extract** | 220 closure reports | 1,320 facts, each with its sentence | `vst_derived` |
| **Chunk + index** | 702 prose documents | 2,827 passages + vectors | `vst_derived` |

Twelve tables, one database, separate from the customer's four.

### The order we ran them in was wrong, and it is worth recording why

Parse first was right: exact, free, and it becomes the harness everything else
is checked against.

**Extract before index was a mistake.** It was the right call for the *cost*
question, which needs structured rows and no retrieval at all — but the general
order is parse → index → extract, because extraction over a large corpus wants
search to find its candidates. It only worked here because the 220 closure
reports were a known, enumerable set. On a corpus where the relevant documents
have to be found first, doing it in this order would not have worked at all.

### Two things are NOT done, and calling the data phase finished would be wrong

**1 · The 220 source files are not indexed.** `loadDirectory` reads `.md` and
`.txt`. The corpus is:

```
621 .md   ✓ indexed        147 .c    ✗ not indexed
 81 .txt  ✓ indexed         73 .h    ✗ not indexed
                           123 .csv, 8 .json  → parsed, correctly not indexed
```

That is not an oversight to patch with an extra extension. Code must be chunked
**by function**, not by heading or window, and the reason is a real property of
this corpus rather than a general fact about C.

▲ **CORRECTED 2026-09-13.** This paragraph previously said `damping.c`
"documents its calibration parameters in a comment block ABOVE the function".
**It does not, and no function in the corpus does** — measured across all 147
`.c` files. The calibration table is in the FILE BANNER, separated from the
first function by `#include` lines and file-scope statics, and the files hold
1–12 functions each (median 4). A chunker built to "carry the preceding comment
block into the function below it" would have done nothing at all, silently.

The real rule is different and better: the banner becomes its own chunk, and
each function chunk carries **only the calibration rows its own body names**.
`Damping_Apply` references four of `damping.c`'s five parameters, so it gets
those four with their units, ranges and defaults — and not `DAMP_ENABLE`.
Copying the whole banner onto every function was rejected: at 500–900 bytes
against a 100–300 byte body, six chunks from one file would be ~80% identical
text, embedding to near-identical vectors and destroying the precision that
function-chunking exists for.

It matters because *"what do we already have that does this?"* — the first of
the four questions this engagement exists to answer — is mostly a question about
the code.

**2 · Nothing searches the index.** 2,827 passages are stored and no line of
code queries them. `walk-cost` still opens its most valuable evidence by a file
path written into the source, with a regex keyed to a constant also written into
the source. The answer is real; the finding of it is staged.

**So: ingestion is done. Grounding is not.** Grounding is load → chunk → embed →
store → *search*, and the fifth is unbuilt and therefore untested. A corpus that
has been indexed but never retrieved from is a corpus nobody has checked.

---

## What this does not answer yet

- **Whether extraction should ever write to the four.** Current answer: never.
  They are frozen as the key. If that changes, the key stops being a key.
- **How chunks and facts relate.** A fact points at a sentence; a chunk contains
  it. Whether a fact also points at its chunk id is a K5 question and depends on
  what the retrieval actually needs.
- **Re-ingest cost.** `source_files` carries a sha256 so unchanged files can be
  skipped, but nothing yet decides what happens to the *facts* derived from a
  file that changed.
