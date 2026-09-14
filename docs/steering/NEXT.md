# Next, for steering

*Started 2026-09-13, at the end of the session that built the loop and the
evals. Extended 2026-09-14 by the session that built the fan-out and ran the
whole bid — §0 is that session's finding and it displaces the rest. Ordered by
what costs most to leave alone; sections keep their own dates because several
have been corrected by later evidence and the corrections are the useful part.*

---

## 0 · Twenty-three of twenty-four requirements are unpriced — 2026-09-14

*The whole K2 bid was assessed on 2026-09-14 — 24 requirements, $0.26, ~55 s
each. This is what it found, and it displaces everything below it.*

The system exists to price a bid from the company's own history. It priced
**one** requirement: 119 h, EUR 12,138, from 19 past jobs. The other twenty-three
came back with no price, and **seven of those never queried the history at all** —
the agent judged the scope too unclear to ask.

Every individual refusal is CORRECT. `find_comparable_work` will not take a
median of two jobs, and that rule is the difference between a grounded number and
an invented one. But a tool that correctly refuses 96% of the time has not done
the job it was built for, and it erodes the refusal itself: people discount a
warning that fires on everything.

### The diagnostic already says where it breaks

The counts added for §5b are the whole story, and they repeat across almost every
refusal:

```
safety_case_impact: 146 on its own, 0 without it
asil:                37 on its own, 0 without it
change_class:        19 on its own, 0 without it
element_kind:        17 on its own, 0 without it
```

Each filter matches plenty **alone**. The combination matches **nothing**, out of
203 jobs with attributable hours. The agent keeps classifying K2 work as
*validation-only, mechanical, QM, no safety-case impact* — and that conjunction
has essentially no history behind it.

### The question to answer first, and it is a fork

**Either** the agent is over-constraining a history that could answer, **or** the
history genuinely holds no work of this kind. Those need opposite fixes and the
numbers to tell them apart are already being printed:

- if `validation_only` alone matches 19 jobs and `mechanical` alone matches 17,
  but together they match 0, the history has the work and not in that shape
- if the estate simply contains no validation-only mechanical work, then the
  honest product answer is *"we have never done this"*, and the refusal should
  SAY that rather than reading as a filter problem

§5b already established that `walk-cost` and the agent classify the same job
differently — the walk assumes `modify_hardware` on a gearbox, the agent reads it
as validation on mechanical — and that **which reading is right is the open
question the walk itself puts to a human**. Twenty-three refusals say that is not
one requirement's ambiguity; it is the shape of the whole bid.

### What is NOT allowed, still

Widening the filter automatically. `walk-check` asserts that dropping the ASIL
filter produces an answer 3.5x too low, and that assertion stands. Counts, never
medians, remain the thing a widened set may report.

### Worth measuring before changing anything

Run `find_comparable_work` directly over the 24 classifications the agent
actually chose, and count how many jobs each field combination reaches. That is
free, deterministic, needs no model, and it answers the fork above before a line
of prompt is rewritten.

### MEASURED — `pnpm steering:why-unpriced`, 2026-09-14

Built and run. It re-reads the `find_comparable_work` calls already stored in
`assess_history.trace`, counts each key against the estate, and for every
refusal prints what the estate carries BESIDE the value the agent chose. Free,
no model, re-runnable — §0 asks for a before and an after.

**The missing prices are not one problem. They are four, and only one of them is
about the customer's data:**

| | | |
|---|---|---|
| 13 | asked, understood, too few comparable jobs | a fact about the **estate** |
| 7 | never called the pricing tool at all | a **prompt** problem, entirely ours |
| 4 | called it, arguments not kept by the trace | **unknowable**, see below |
| 0 | asked with a value no document uses | no vocabulary mismatch at all |

**Seven requirements never asked.** `CR-K2-0105`, `0106`, `0109`, `0112`,
`0114`, `0123`, `0124`. The agent searched, decided the scope was too unclear to
price, and wrote that up — without ever putting a question to the tool that
would have told it how much history existed. That is 29% of the bid, it is not
the estate's fault, and it is the cheapest of the four to fix.

#### For the 13 that did ask, the agent is NOT being over-narrow

This is the arm of the fork the marginals settle, and it is the opposite of what
"the filter is too tight" implies. Almost every refusal keyed on
`validation_only` + `mechanical`:

```
of the 19 jobs with changeClass = validation_only,
   elementKind is: ecu 5, software_domain 4, sensor 4, motor 3, mechanical 2, (not recorded) 1
of the 17 jobs with elementKind = mechanical,
   changeClass is: modify_hardware 5, recalibrate 3, reuse_as_is 2, validation_only 2, ...
```

Both marginals agree: **Vantis has booked exactly two validation-only mechanical
jobs, ever.** The conjunction is not an artefact of a greedy filter — the work
genuinely is not in the history. The refusal is a TRUE statement about the
company, worded as though it were a fault in the query.

**So the fix for these 13 is the sentence, not the filter.** *"We have never
done this kind of work"* is a finding a bid meeting can act on — it means
subcontract, or estimate bottom-up, or decline. *"Your filter matched 0"* reads
like a tooling failure and gets ignored.

#### CORRECTED — `asil` is NOT the filter to reconsider, and the first reading of this was wrong

The first version of this section said `asil` was *"the one filter genuinely
worth reconsidering"*, reasoning from a real number:

```
of the 146 jobs with safetyCaseImpact = false,
   asil is: (not recorded) 58, B 32, QM 31, C 13, D 12
```

**Forty percent of the usable history has no ASIL recorded**, which is finding
#2 about the customer's paperwork (*"the safety level is not recorded next to
the cost"*) showing up two steps downstream. That fact is true and worth
keeping.

**It is not what causes the refusals.** `countWithoutEachField` — the same
counter the tool prints inside its own refusal sentence, collected across all
thirteen measurable refusals instead of one — says:

```
  1 of 13   dropping change_class alone would have crossed the floor of 3
  1 of 12   dropping element_kind alone would have crossed the floor of 3
  0 of 13   dropping safety_case_impact alone would have crossed the floor
  0 of 10   dropping asil alone would have crossed the floor
  0 of 12   dropping tooling_required alone would have crossed the floor
```

**Dropping `asil` would have rescued zero refusals.** The corpus gap is real and
it is not load-bearing here. Reasoning from a marginal distribution to a cause
was the error — *"this field is often missing"* does not imply *"this field is
why the query returned nothing"*, and only the drop-one counts can tell them
apart.

#### The decisive number: 12 of 13 were not one field away from anything

```
  1 of 13 were ONE field away from an answer.
 12 were not — no single field was holding them back.
```

That is what *"we have never done this work"* looks like from the inside, and it
settles §0's fork about as firmly as it can be settled: **the agent is not
over-constraining. The history does not contain the work.**

So the fix for these twelve is **the sentence, not the filter** — and that is now
the recommendation on evidence rather than on the marginals it was first guessed
from. *"We have never done this kind of work"* is a finding a bid meeting can
act on: subcontract, estimate bottom-up, or decline. *"Your filter matched 0"*
reads like a tooling failure and gets ignored.

The remaining one genuinely was a filter problem and is worth looking at on its
own rather than generalising from.

#### The vocabulary misses are invisible in the bucket counts, and they are a success

Three calls used an `element_kind` no closure report contains — `steering_system`
twice and `software` once. **Every one was followed by a corrected call**,
because `find_comparable_work` answers an unknown value with the list of real
ones rather than an empty result.

The bucket count reports `0 vocabulary mismatch` because it reports how each
requirement ENDED, and all three recovered. Worth stating plainly: that is the
miss design working exactly as intended, and it would have been reported as
nothing at all.

#### Four are unknowable, and that is a defect in the desk

`CR-K2-0102`, `0104`, `0110`, `0111`. **`assess_history.trace` holds two
different shapes.** The CLI files `result.turns` — `TurnRecord[]`, carrying each
call's arguments and full result. The web desk files `events` — `LoopEvent[]`,
carrying a tool name, a timing and a one-line summary, and **no arguments**.

Nothing documents this and nothing asserts it. The first version of the
diagnostic read only the turn shape, found no tool calls in any desk row, and
was about to report `CR-K2-0111` — the one requirement in the bid carrying a
price — as having invented it. **It had called the pricing tool three times.**

Two fixes, and they are independent: file `result.turns` from the app as the CLI
does, so both surfaces are auditable; and assert the shape, because a column
holding two incompatible structures with no discriminator is a trap for
everything that reads it later.

---

## 1 · The programme filter is never used — CORRECTNESS, not tidiness

A trace of a real assessment returned passages from **six different
programmes** — PRG-NBX-15, PRG-ORV-13, PRG-MRL-04, PRG-CHV-29, PRG-CHV-33,
PRG-TDR-19 — for a question about one.

`search_documents` takes a `programme` filter. Its own description says *"most
real questions are about one programme, and a result set spanning eleven
answers none of them."* **The system prompt never tells the model to use it**,
and it does not.

Every cross-programme passage is a near-miss that looks plausible: the corpus
holds eleven programmes writing the same requirements in the same words with
different numbers. `8000 N` for K2 and `7500 N` for another sit side by side and
read identically out of context.

**This is the `select` verb from [`CONCEPTS.md`](CONCEPTS.md), unused.** And the
information is free: the programme is derivable from the requirement id before
the loop starts, the same way the requirement text already is.

### CONFIRMED as a reasoning error, not just wasted tokens — 2026-09-13

An assessment of `CR-K2-0102` (road wheel angle, ±50°) returned `cannot_tell`,
which is the CORRECT finding: the evidence that would settle it is part-level
data living in a database with almost no document behind it. The agent reached
that conclusion independently, which is the strongest evidence so far that the
refusal behaviour is real.

**But one of its three stated reasons was false.** It wrote that the corpus
contains *"several customer requirements that mention road wheel angle but they
disagree among themselves."*

They do not disagree. **Sixty-seven different programmes each carry their own
angle requirement** — 44.6°, 45°, 45.11° … 55.78°, using all four verification
methods. Those are sixty-seven different cars. K2's is 50°; the rest belong to
other people.

That is a reasonable inference from what the model was SHOWN and false about the
world. Unfiltered retrieval handed it a spread of values for one attribute and
it read the spread as inconsistency.

So this is no longer a token-efficiency item. **An unfiltered search produces
wrong statements in the reasoning**, and the reasoning is what a bid meeting
reads.

### FIXED for identified requirements — 2026-09-13

`spec_documents.program_ref` now travels with the requirement and binds every
search. The next run of the case that produced the fabricated conflict produced
**no conflict panel at all**, which is correct: there is no disagreement.

An escape hatch was kept deliberately — `widen_beyond_programme` — because
"has anyone else solved this?" is a real question and the estate holds eleven
programmes precisely so carryover can be found. Narrowed by default, widened on
request, and the widening is visible in the trace.

**Still open for FREE-TYPED requirements**, which have no programme to bind
until the model works out which one they match. One run then cited
`PRG-CHV-07/CRS-CHV-07-001_RevA.md:63` for a sentence about K2 — boilerplate
that appears word for word in **76 of the 76 CRS files**, so it is not false,
just the wrong copy. K2's own is at line 72 and an earlier run cited it
correctly.

Addressed for now by instruction: cite the copy belonging to the programme in
question, and once you have worked out which programme a free-typed requirement
matches, cite that one from then on. **The structural fix would be to re-bind
mid-loop** once the requirement is identified — worth doing if the instruction
proves unreliable, and worth measuring before assuming it is.

The two ways this was considered, and why binding won:

- **tell the model** to pass `programme` — cheap, and it will sometimes forget
- **default it** in the seeded search and pass the programme into the tool as a
  bound default — it cannot forget, and a deliberate cross-programme question
  ("has anyone else solved this?") has to override explicitly

The second is better and needs one decision: whether a bound default can be
overridden by the model, or only by the caller. **Prefer overridable**, because
"what did we do on Ember?" is a real question — but make the override visible in
the trace, since a widened search is exactly when a reader should know.

Measure before and after: passages per run, cross-programme share, turns, and
whether the answer changes or only the bill.

### THIRD confirmation, and now it has a headline — 2026-09-13

An assessment of a free-typed requirement (*"steering-wheel angle ±50°"*)
produced a conflict panel reading:

> **value required for 'road wheel angle' across customer documents**
> `CR-K2-0102 … ±50 deg` — K2
> `5. road wheel angle deg. The system shall achieve 53.7 deg` — **PRG-CHV-07**

**PRG-CHV-07 is a different car.** K2 needs ±50°, Chevron-07 needs 53.7°. There
is no disagreement, and the UI presents it under a heading that says there is.

The escalation is the point:

| | symptom |
|---|---|
| first | wasted tokens, six programmes in one result set |
| second | a false SENTENCE in the reasoning — "they disagree among themselves" |
| third | a fabricated CONFLICT, rendered as a headline panel |

Worth noting what is NOT broken: the same answer also found a **real** conflict —
"steering-wheel angle" versus "road-wheel angle" — which is a genuine
terminology ambiguity worth raising. The model is not bad at finding conflicts.
It is being handed other programmes' documents and told they are relevant.

---

## 1b · `reasoning` is doing three jobs and should do one

The prose field currently states the finding, quotes the evidence inline, AND
enumerates what was searched. The quotes are already listed beneath it with
files and lines, so most of the paragraph is the citations panel written out
again.

A real answer opened with two useful sentences and then continued *"Evidence in
the corpus: (1) … (2) … (3) …"* for another 200 words, every one of them
duplicated below.

**Fix in the contract, not the UI.** `reasoning` is two or three sentences,
says why the finding follows, and does not quote — the citations carry the
quotes. Add a `.describe()` that says so and a length the schema enforces, so
the constraint is in the contract rather than a request in the prompt.

A reader who wants the evidence looks at the evidence panel. A reader who wants
the argument should not have to read the evidence twice to find it.

---

## 2 · The trace panel should say what happened, not that something happened

The UI currently renders each tool call as:

```
searched the documents
6 passage(s) from 5 file(s): requirements/PRG-NBX-15/…, requirements/PRG-ORV-13/…
1777ms
```

That proves the plumbing worked. It does not say what the step CONTRIBUTED, and
a trace nobody reads twice is decoration.

`summariseResult` in `agent/loop/assess-requirement.ts` is the one place to
change — it already reports the finding rather than the row count for the
pricing tool, and the search half has not caught up.

**What a search step should show:**

| | why |
|---|---|
| the question asked, in full | it is the single most diagnostic thing and it is currently truncated mid-word |
| how many passages, and **from how many programmes** | the cross-programme share is item 1's own symptom, visible per call |
| the document types returned | `safety_assessment` against `closure_report` is the difference between reading the argument and reading the invoice |
| **meaning / keywords / both** | already computed and thrown away. One arm alone is a weaker hit and the reader should see which |
| top score, and the spread to the last | a flat spread means nothing stood out — which is what "the corpus does not contain this" looks like from outside |
| **zero results, stated loudly** | an empty search is an ANSWER here, and the prompt says so. The trace should agree rather than showing a quiet `0` |

**What a pricing step should show:** the filter it actually used, `n` against the
total available, and the refusal sentence when it refused. `n=0 of 203` and
`n=0 of 0` are completely different facts and currently print the same.

**And one thing the trace should say that nothing says today:** which call the
answer's citations came FROM. A reader looking at eight searches cannot tell
which one produced the evidence that survived into the dossier.

---

## 3 · Already queued

- ~~**Fan-out over 24 requirements**~~ — **BUILT 2026-09-14**, `steering:assess-all`.
  Serial, resumable, `--run` opt-in. All 24 assessed for $0.26. What it found is
  §0 above.
- **The debate** — on the two questions `walk-cost` already prints as open items.
  §0 makes this more attractive, not less: the fork it names (over-constrained
  filter vs. a history that genuinely lacks the work) is exactly a question two
  agents could argue from the same counts.
- **A case that catches over-caution.** The eval suite has ten checks for
  over-confidence and one for the other direction, admitted in
  `eval/severity/assessment-severity.ts`. **Twenty-three refusals out of
  twenty-four make this the interesting direction, not the safe one.** It needs a
  requirement with a healthy comparable set, which none of the three cases has —
  `CR-K2-0111` is the one requirement in the bid that priced, from 19 jobs.
- **`walk-angle` cannot be closed** — its part numbers appear in one file out of
  1,069. That is a corpus gap, not a pipeline one.

### 3a · Added 2026-09-14

- **`@fde/foundry` reports an expired credential as `Connection error.`** The
  Entra token is fetched inside a custom `fetch`, so when `az login` has lapsed
  the OpenAI SDK cannot tell it from a dead socket and wraps both as
  `APIConnectionError`. It sent one session chasing a network fault, then a
  Postgres fault, before `cause` was dumped and the real message appeared. The
  fix is small; the package is shared with insurance and pharma, so it is its own
  change rather than a fold-in.
- **`explain` is undocumented and untested.** `agent/loop/explain-assessment.ts`,
  `schema/explanation-schema.ts`, `/api/explain` and `Explain.tsx` all exist and
  typecheck. No document here mentions them, there is no self-test where the
  assessment and bid-summary schemas each have one, and the `steering:explain`
  surface label it logs under belongs to no script.
- **The fan-out has no self-test.** `workList`'s three-state logic — answered /
  attempted-and-failed / never-attempted — is exactly the shape that breaks
  silently: a resume that counts a failed row as done gets shorter every run and
  looks like it is working. Worth a `sortRows`-style offline test with a re-run
  and a failure planted in it.
- **Concurrency was considered and deliberately NOT built.** Eleven requirements
  ran serially in 650 s with zero rate limits and zero failures — the 429 problem
  this codebase fought four times never appeared. A concurrency layer would be
  built for a load that did not materialise, which `CONCEPTS.md` already puts on
  its "deliberately not on the list". It becomes worth it at a few hundred
  requirements, not 24.

---

## The rule to carry into the next session

Everything in item 1 and item 2 was found by **watching a real run**, not by
reading the code. Four rounds of loop fixes came the same way — a rate limit, a
turn cap, a citation that said line 1, a cost line that said zero.

The code review found none of them.

---

## 4 · A summary across assessments — the `compress` verb, and cheap

Asked for after nine assessments were filed and no single one could answer
"where does the bid stand". A second, small agent over the ASSESSMENTS ALREADY
MADE — never over the corpus, which is what keeps it cheap.

What it should answer, none of which any single dossier can:

- how many of the 24 requirements are `have_it` / `change_needed` / `new_work` /
  `cannot_tell`
- what is priced, what refused, and **what the refusals have in common**. Six
  requirements refusing for want of a test report is ONE finding, not six, and
  it is the finding a bid meeting needs
- which questions for humans **repeat**. The same owner asked the same thing
  across five requirements is a meeting, not five tickets
- the total, with its evidence count, and an explicit statement that it is **not
  the quote** — the same refusal the single assessment already makes

This is `compress` from [`CONCEPTS.md`](CONCEPTS.md): a resolved assessment
becomes one line, and the summary reads lines rather than dossiers. It is the
cheapest of the four verbs to demonstrate and the easiest to measure — tokens
per summarised requirement against tokens per full one.

**Two things it must not do**, both inherited from rules that already exist:

- **not re-derive a finding.** If an assessment said `cannot_tell`, the summary
  says `cannot_tell`. A summariser that revisits conclusions is a second
  assessment with less evidence.
- **not total a refusal into a number.** Two priced items and one refusal is
  "two items, EUR X, one unpriced" — never a total with the gap smoothed over.

### BUILT — 2026-09-13. [`THE-SUMMARY.md`](THE-SUMMARY.md) is the plain version

`pnpm steering:summarise` (`--dry-run` is free), `pnpm steering:summary-check`
(20 ok, 0 failing, offline), and the **"Where the bid stands"** panel on the
desk over `GET`/`POST /api/summary`.

**Both prohibitions became properties rather than instructions.** The summary's
answer contract has no field for a finding, a count or a total — the mix, the
money and the evidence counts are computed in `agent/summary/roll-up.ts` and
printed from there. A model that cannot represent a total cannot total a refusal
into one. What the model is asked for is the two things counting cannot do:
group the refusals by what they are waiting on, and find the questions that
repeat.

Two things found on the way, both worth more than the feature:

**Nothing from the command line was ever being filed.** `assess_history` held
ONE answered row — written by the web desk — after a day of `pnpm
steering:assess`. Every command-line assessment was printed and thrown away. The
filing code moved from the app into `answer/filed-assessments.ts` and
`steering:assess` now records what it produced, failures included.

**That move let the package write to a database, so `sql:check` grew to cover
it.** In `src/answer/`, the file that writes may not name the customer's estate
and the file that names the estate may not write — planted in both directions.
It also lost two false positives it had been carrying: `drop\s+` matched the
English word "Drop" in a comment, and every verb now requires the object a real
statement gives it. 5 assertions became 8.

**The first two real runs found four defects, all ours**, and the last two are
the valuable ones: the schema guard's error message quoted the start of the
field rather than the phrase it matched, and `COMMITMENT` read **"delivered by
the customer"** as a promise — the most common honest sentence on a blocked bid.
Both fixed and asserted; see [`THE-SUMMARY.md`](THE-SUMMARY.md).

**Measured compression: 2.4x, not the 28x this file's sibling predicted** — a
real line keeps the refusal reason and the questions for humans, because those
are what the summariser reads. Recorded as measured.

---

## 5 · Two things the first green baseline is hiding — 2026-09-13

`pnpm steering:eval` reached **15/15**, 0 false answers, 0 over-caution, 0 infra
failures. Reading the fifteen answers rather than the summary shows two
behaviours no check currently objects to.

### 5a · The `finding` field barely discriminates — ANSWERED 2026-09-14

All fifteen runs, across three different requirements, returned
`change_needed`. `asr-003` returned `cannot_tell` in a UI run the day before —
correctly, because the evidence that would settle it is part-level data living
in a database with no document behind it.

The likely cause is my own fix. The enum rewrite that resolved a genuine overlap
also says *"do NOT use cannot_tell merely because a question remains open"*, and
that may have pushed every case into one box.

**A field that always returns the same value carries no information**, which is
worse than the ambiguity it replaced. The check `not_finding:have_it` still
protects the expensive direction, so nothing dangerous is happening — but the
other three values are currently decorative.

Worth measuring before rewording again: run a requirement that genuinely does
not exist in the estate and see whether `new_work` is reachable at all. If three
of four values are unreachable, the enum is a boolean wearing four labels.

#### The measurement, on all 24 requirements — 2026-09-14

**The hypothesis as stated is wrong, and the correction is worth more than it.**

`CR-K2-0124` (start of production) returned **`have_it`**. So the enum is not a
boolean: a second value is reachable, on a real requirement, with no prompt
change. The claim that the enum rewrite pushed every case into one box does not
survive.

What IS true is weaker and still worth fixing:

| | |
|---|---|
| `change_needed` | 23 of 24 |
| `have_it` | 1 |
| `new_work` · `cannot_tell` | 0, across 24 genuinely different subjects |

One value in 24 is a signal, barely. And `cannot_tell` returning zero times is
the surprising half — `asr-003` returned it in a UI run, and twenty-four real
requirements did not, including seven whose own reasoning says the scope is too
unclear to price. **A requirement the agent refuses to price because it cannot
tell what the work is, and then labels `change_needed`, is answering two
questions with one word.**

Look at `CR-K2-0124` before rewording anything: `have_it` for a schedule
constraint is itself questionable. Its own text says *"this requirement is a
schedule (SOP) constraint, not a discrete technical change"* — which reads like
`cannot_tell` rather than "we already have it".

### 5b · CORRECTED — the agent classifies differently, it does not over-filter

*The version below was written from the summary and is wrong in its diagnosis.
Kept, because the correction is the more useful of the two.*

Building the diagnostic disproved the hypothesis immediately. The numbers:

```
validation_only (alone)                     19
mechanical (alone)                          17
validation_only + mechanical                 2   <- the pair is the constraint
modify_hardware + gearbox + no safety case   6   <- what walk-cost uses
```

The agent read the job as **validation only, on mechanical** — you need a test
report, not a redesign. `walk-cost` assumes `modify_hardware` on a gearbox and
says so in its own output: *"the price above assumes the expensive reading."*

**Which classification is right is literally the open question the walk puts to
a human** — *"is 400 N of missing evidence a re-test or a redesign?"* So the
agent is not being over-cautious; it picked the cheap reading, and for that
reading the history genuinely holds two jobs, which is below the floor.

Two jobs is a correct refusal. The capability gap I diagnosed does not exist.

**What the diagnostic still buys**, and it is why it was kept: a refusal now
distinguishes *"we have never done this"* from *"you asked too narrowly"*, which
are opposite findings that previously printed identically.

**And the first version of the diagnostic was itself wrong.** It reported only
"matches without this field", which for a five-field key showed 0 everywhere and
concluded the filter was innocent. That was an artefact of dropping one field at
a time. Adding "matches on this field alone" showed the truth: two fields that
are each common and rarely co-occur. `without` cannot tell that apart from a
corpus that has nothing.

---

### 5b (original, superseded) · The agent refuses where the deterministic walk answers

`walk-cost --from-documents` prices the gearbox change from **six** comparables
at EUR 81,455. The agent, on the same requirement, finds **zero** and refuses —
five times out of five.

The difference is filtering. The walk matches on three fields; the agent passes
all five, adding `asil` and `tooling_required`, and constrains itself to
nothing. `find_comparable_work`'s own description says *"a narrower filter is
not automatically a better one"* and it is not being heeded.

**A refusal that a deterministic query could have answered is not caution, it is
a capability regression wearing caution's clothes.** It also erodes the refusal
itself: a tool that refuses when it did not need to teaches people to discount
the refusals that matter.

**The fix that is NOT allowed:** widening automatically. `walk-check` asserts
that dropping the ASIL filter produces an answer 3.5x too low, and that
assertion stands.

**The fix worth trying:** when a filter matches fewer than `MIN_COMPARABLES`,
report what a LOOSER filter would match — **counts only, never medians or
prices**. "Your filter matched 0. Without `asil`: 6. Without `tooling_required`:
12." The model then decides whether dropping a field is legitimate for this
question — and dropping ASIL on a safety-case question is not, which is a
judgement it can make with the numbers in front of it and cannot make blind.

Counts and not prices, deliberately: a median attached to a widened set is the
3.5x-wrong answer, pre-computed and waiting to be quoted.

### What this says about the suite

Both were found by reading the fifteen answers, not the summary. The suite was
green and correct, and the system has two behaviours worth changing.

`README.md` already says a red check is a hypothesis. The other half belongs
next to it: **a green suite is not proof, and the fastest and cleanest runs are
where to look first.**
