# Teaching material for the learning pages — what is in `docs/steering/`, and what each bit teaches

*Written 2026-09-15, for the session building `apps/web/veresk-app/src/routes/learn.*`.
The five lessons that exist today (`vectors`, `retrieval`, `generation`, `loop`,
`evals`) are a reading of the REPO-WIDE documents — `docs/RETRIEVAL.md`,
`docs/AUGMENTED-GENERATION.md`, `docs/ENGINES.md`, `docs/evals/README.md`. They
teach the generic pipeline, and they teach it well.*

***None of steering's own engagement material is in them.*** *This file is a
catalogue of what is available, what each piece teaches, and which measured
number belongs to it.*

---

## What this file is, and what it is not

**It is a source catalogue, not a lesson plan.** Every entry below names a
document in `docs/steering/`, the thing it teaches, and the figures it hands
you. It deliberately does NOT decide how many lessons there are, what order they
go in, or whether they extend the existing five or form a second track.

**That structural call belongs to whoever owns `lessons.ts`.** Its header says
*"this is a list and not a menu"* because the order is the argument — and the
existing five are the generic pipeline while everything here is one engagement's
specifics. Whether that is lessons 6–15, a parallel track, or a subset, is a
design decision this file has no standing to make. What it can do is name the
**dependency edges**, so whatever order gets chosen is not accidentally wrong.

### The marker convention, and this batch inverts it

`docs/steering/OPERATIONS.md` (written the same day) asks for a MEASURED /
PROPOSED distinction because almost nothing in it is built.

**Everything in §A and §B below is the opposite: built, run, dated, and
re-runnable.** These are not proposals. If a page renders one of these numbers
it is reporting a measurement, and the command that reprints it is given.

Only §C — the five operational capabilities — is PROPOSED, and it says so
throughout.

### ⚠ Number provenance — read this before transcribing anything

Several counts below look like they contradict each other. **They do not** —
they are different runs, at different dates, over different subsets, and each is
correct for its own scope:

| number | what it counts | source |
|---|---|---|
| **1,069 files** | the whole customer estate as handed over | `HOW-WE-SORTED-IT.md`, `PLAN.md` |
| **922 documents → 3,854 passages** | what is chunked and indexed, incl. 1,027 code chunks | `NEXT.md` handover, 2026-09-14 |
| **702 documents → 2,827 pieces** | the same pipeline BEFORE code chunking landed | `HOW-WE-SORTED-IT.md`, 2026-09-13 |
| **220 closure reports** | the only files sent to a model | `DATA-RESIDENCY.md` |
| **203 documents / 1,421 fields** | the K5-at-scale extraction run | `SORTING.md` §K5, 2026-09-13 |
| **1,320 facts** | the extraction as it stands after `reuse_class` was dropped | `NEXT.md`, `WHAT-WE-ASK-THE-MODEL.md` |
| **203 past jobs** | rows with attributable hours, what pricing filters over | `THE-TOOLS.md` |

**Carry the date and the source document with every figure**, exactly as the
existing lesson pages already do with their `source:` line. Dropping two of
these side by side without their scopes manufactures a contradiction that a page
will then render as fact.

---

# §A · The strongest single lesson in the whole engagement

*If only one thing from this file becomes a page, make it this one. It is
complete, self-contained, measured, and it teaches a skill that transfers to
every LLM project regardless of domain.*

## A1 · How to tell a model is guessing — without an answer key

**Source:** `SORTING.md` §"K5 at scale", `WHAT-WE-ASK-THE-MODEL.md` §5,
`HOW-WE-SORTED-IT.md` §"We can tell a good refusal from a lazy one".
**Date:** 2026-09-13. **All MEASURED.**

**The lesson in one sentence:** a field's *answer rate* tells you whether a model
is reading or guessing, and you can read it off the output distribution with no
ground truth at all.

**The setup.** Six fields are extracted from 203 closure reports — what kind of
change, what part, what safety level, how many interfaces, was the safety case
reopened, was tooling needed. Each answer must come with the sentence it was
read from.

**The per-field table, which is the whole lesson:**

```
  field                answered  refused  accuracy  fabricated
  change_class            197        0      100%        0
  interfaces_touched      166       37      100%        0
  tooling_required         31      172      100%        0
  asil                      4      199      100%        0
  safety_case_impact      203        0       94%        0
  element_kind            194        9       93%        0
  reuse_class              75      128       36%       75      ← every fabrication
```

**One field produced all 75 fabrications and 48 of the 74 wrong answers.
Everything else is 93–100%.**

**Why 36% is the number that gives it away.** `reuse_class` has three possible
values. Chance is 33%. It scored 36%. It is not reading — it is guessing, on the
one field no closure report in the corpus states.

**And the diagnosis needs no answer key.** Ask only: *how often did this field
answer at all?* `change_class` 100%, `asil` 2%, `reuse_class` 37%. The first two
are healthy — the system knows whether it can read a field. **A field answered a
third of the time, on documents that all look the same, is a field being guessed
at.** That is readable from the output alone, which is the property that makes it
work at a real customer on day one.

**A second, independent signal agreed:** `reuse_class` kept quoting a sentence
already used for a different field — exactly what inferring one fact from
another looks like.

**Then the part most people get wrong.** The prompt ALREADY forbade this, by
name, with `reuse_class` in the worked example. Given identical instructions and
documents of the same shape, it refused 128 times and guessed 75.
**Rewording is money spent to move a number that is already at chance.**

**So the field was removed, and the result is the punchline:**

```
  accuracy with reuse_class      93%
  accuracy without it            98%
  anything downstream using it   nothing
```

**What replaced the column is worth more than the column would have been:**
*"your closure reports do not record reuse, so nobody can tell you what carryover
work costs."* A pipeline that asks for something the documents do not contain
gets an answer, and that answer is noise with a citation attached — **the most
expensive kind of wrong, because it looks exactly like the others.**

**Figures this wants:** `BarRows` for the seven-field table (answer rate and
accuracy as two series, with a 33% chance line drawn across it — the chance line
IS the argument). A `Slope` for 93% → 98% on dropping the field.

**Depends on:** nothing. It can be read cold. **Feeds:** A2, B1.

---

## A2 · Proving a quote is real, with string search and nothing else

**Source:** `WHAT-WE-ASK-THE-MODEL.md` §3, `HOW-WE-SORTED-IT.md`.
**Date:** 2026-09-13. **MEASURED.**

**The lesson:** every extracted fact must carry the sentence it was read from,
and that sentence is then searched for in the source file. Not there → the fact
is discarded.

**Why it works.** Producing a plausible value is trivial. Producing a value AND a
sentence that exists word-for-word in one specific file is not. **And verifying
costs nothing — it is string search.** No second model, no human review, no list
of right answers. It works identically at a customer on day one.

**Result: zero invented sentences in 1,320 facts.**

**The three-pass matcher, and why each pass exists** — a good `Stages` figure:

| pass | ignores | why it exists |
|---|---|---|
| 1 · exact | line wrapping only | reports are hard-wrapped at 68 chars, so one read sentence is three file lines. Comparing raw would reject every true quote and measure line width instead. |
| 2 · punctuation | dashes, quote marks, control bytes | the transport mangles non-ASCII — an em dash came back as a device-control byte |
| 3 · letters only | everything not a letter | ten rejections were all the same em dash arriving as runs of control bytes |

Anything matched below pass 1 is stored **flagged** (`evidence_exact = false`)
so the looseness stays visible.

**MEASURED: the check has a 0.4% false-positive rate and zero true positives.**
Six of 1,421 evidence strings failed — all six the same em-dash mangling. The
values were right.

**What it CANNOT catch, which is the honest half:** a value misread from a REAL
sentence. That happened — `reuse_class = new` quoting *"New software, no
predecessor to carry over."* A genuine sentence, the wrong field, the wrong
answer. **The evidence check was blind to it, and A1's answer-rate signal is what
caught it.** Two independent checks, neither sufficient alone.

**Also:** the line number is found by us, not supplied by the model — so a
challenged figure traces to `EFF-BULK-0067.md:14`, not to a row nobody can
justify.

**Depends on:** nothing. **Pairs with:** A1 (they are the two halves of one
argument and could be one lesson).

---

# §B · The engagement, by topic

## B1 · Three pipelines, because a corpus is three different problems

**Source:** `HOW-WE-SORTED-IT.md` (plain) · `SORTING.md` (engineering) ·
`UI-COPY.md` (already customer-facing copy, drop-in). **MEASURED.**

They are **not three steps of one process — three different problems that happen
to share a folder**, ordered by risk:

| | kind of file | how | risk |
|---|---|---|---|
| 1 · **parse** | already has columns — timesheets, rate cards, quotes | plain code, **no AI** | fails loudly; cannot be quietly wrong |
| 2 · **index** | prose — design rationale, review notes, source code | cut into findable pieces, each remembering file + line | retrieval can miss |
| 3 · **extract** | facts inside sentences | a model reads them | **the only one that can be quietly wrong** — so it is last and has more safeguards than the other two put together |

MEASURED throughput (`NEXT.md` handover, 2026-09-14):

```
  parse     131 CSV/JSON        → ~11,500 rows       free, 4 s
  extract   220 closure reports → 1,320 facts        ~a cent
  index     922 documents       → 3,854 passages     ~1 cent
                                  (incl. 1,027 code chunks)
```

**The code-chunking subtlety, worth a `Caveat`:** code has to be cut by function,
not by heading, and the settings each function depends on are written once at the
top of the file — so a naive cut gives you functions with no settings and a
settings table belonging to nobody.

**Figure:** `Stages`, one row per pipeline, ordered by risk. `UI-COPY.md` panels
1–3 are literally written for this and can be lifted.

**Depends on:** the existing lesson 2 (retrieval) for what chunking is.

---

## B2 · Silence is not "no"

**Source:** `HOW-WE-SORTED-IT.md`, `WHAT-WE-ASK-THE-MODEL.md` §2. **MEASURED.**

Small, sharp, and it deserves its own step wherever it lands.

If a report never mentions tooling, the answer is **"the document doesn't say"** —
not "no tooling". A pipeline that reads absence as a negative **will confidently
report that 172 jobs needed no tooling when nobody ever wrote about it.**

`null` is a first-class answer. About a quarter of all answers are null,
correctly. Roughly four in ten questions came back *"the document doesn't say"* —
**that is not the system failing; those documents genuinely don't say.**

This is the same shape as `undefined` vs `0` for cached tokens in
`@fde/telemetry`, and as "no score cutoff" in search. **One idea, three places** —
a cross-reference a teaching surface can make that a code comment cannot.

---

## B3 · The two tools, and why every rule lives inside them

**Source:** `THE-TOOLS.md` (whole file, plain language, 182 lines). **MEASURED.**

**The framing to open with:** a tool is a normal function plus a description.
**The model never sees a database, never writes a query, never gets a
connection.** It picks a tool and fills in arguments. *A model given database
access will answer every question, including the ones the data cannot support.*

**`find_comparable_work` — four rules, inside the tool, not in the prompt,
because a rule a model can talk itself out of is not a rule:**

1. **Below three comparables it refuses** — and the refusal carries **no number
   anywhere**. Median, mean, total, spread all come back empty, *not zero*. Zero
   is a price. If there is a number on the page somebody will read past the
   sentence and use it.
2. **Median, never mean.** MEASURED: on the gearbox set the mean is **54% higher**
   than the median, because one job absorbed a production-line relocation.
   (`WALKTHROUGH.md` gives the same effect as 969 vs 710 hours, a 37% difference,
   and €109,272 vs the correct figure under sabotage.)
3. **`n` always comes back.** €81,455 from six jobs and €81,455 from one are
   different claims and must not print the same.
4. **A wrong argument is a MISS, not a refusal** — it returns "not found" plus
   the nine change classes the documents actually use, read from the corpus, not
   hardcoded. A typo and a genuine gap both match zero rows, and reporting one as
   the other sends somebody hunting for history that was never missing.

**`search_documents` — why two arms, with the two failures that are exact
opposites:**

- *"how much rack force must the assembly deliver?"* shares almost no words with
  the requirement that answers it → **keywords find nothing**
- `SR-EPS-0421` vs `SR-EPS-0407` are nearly identical as meaning → **vectors
  cannot separate them**

Both are in the acceptance test for exactly this reason, and **neither arm passes
both.**

**The rule that matters most: there is no relevance threshold.** The best
available passages always come back, even when every one is poor. Deciding *"the
answer is not in these documents"* is reading comprehension, not a score. **A
cutoff tuned to hide rubbish on one question hides the answer on the next, and it
fails silently in both directions.**

**Figure:** `Matrix` for the two arms × the two failure cases. The four rules want
to be four `Key` callouts.

**Depends on:** existing lesson 2. **Feeds:** B4, B6.

---

## B4 · Context engineering — the first engagement where it is forced

**Source:** `CONCEPTS.md` §"Context engineering" (the richest single section in
`docs/steering/`). **MEASURED 2026-09-13.**

**The idea, and it is counter-intuitive enough to be a whole page.** The instinct
is that the limit is the context window. **It is not — the limit is attention.** A
model handed sixty passages does not read them equally: it reads the beginning
and the end properly and the middle turns to mush. Filling the window does not
add information — past a point it *removes* it, by burying the passage that
mattered among fifty that did not.

> **More context can make the answer worse.** That is the whole subject in one
> sentence, and it is why this is engineering rather than housekeeping.

**Why it had nothing to bite on before — a three-row table that makes the case:**

| engagement | corpus | indexed passages |
|---|---|---|
| pharma | **5 files** | — |
| insurance | 97 files | ~700 |
| **steering** | **1,069 files** | **3,854** |

**The measured arithmetic** (3,854 passages, average 137 tokens each; 24
requirements each doing its own retrieval):

| `k` | one requirement | all 24 |
|---|---|---|
| 5 | ~687 tokens | **~16,500** |
| 8 | ~1,100 | **~26,400** |
| 20 | ~2,749 | **~66,000** |

At `k=20` that is 66,000 tokens of evidence to answer 24 questions, **where any
one question needs about 1,000 of it.**

**The coupling that is easy to miss, and it is the best paragraph in the
document:** because poor passages always come back by design (B3's no-cutoff
rule), raising `k` from 5 to 20 adds fifteen passages that are, *by
construction*, the worst fifteen available. **You pay more in order to think
worse.** That does not appear at five documents. It appears at 3,854.

**The four verbs** — write, select, compress, isolate — each mapped to something
real here. SELECT is the 66,000 → 1,000 move and the single largest lever.

**Figures:** `Slope` or `BarRows` for the k-table; `Stack` for what occupies a
window; the three-engagement table as-is.

**Depends on:** existing lessons 2 and 3. **Feeds:** B5.

---

## B5 · Compress, measured — and the prediction was wrong

**Source:** `THE-SUMMARY.md` (plain, 206 lines) · `CONCEPTS.md`. **MEASURED.**

**The honest-correction shape that makes this worth teaching:** `CONCEPTS.md`
predicted compression of **28×**. Measured on a real filed assessment: **4,710
characters → 1,992. 2.4×.**

The estimate assumed a resolved requirement becomes a one-line triage entry. The
line that actually works keeps the stated refusal reason and every question put
to a human — **because grouping refusals and spotting repeated questions is the
entire job of the thing reading the lines**, and it cannot do either from a
reference and a finding.

**But on TOKENS it is far better than 28×:**

| | input tokens | output | time |
|---|---|---|---|
| one requirement assessed | **188,115** | 5,447 | 64 s |
| the whole bid summarised | **3,159** | 2,423 | 26 s |

**Sixty times less input for a page about the whole bid than for one
requirement.** The character ratio understates it badly, because an assessment's
cost is not its dossier — it is the twenty retrieved passages and eight tool
results **re-sent on every one of its eight turns**. The summary has no tools, so
it sends its material once.

> That is what `isolate` buys, and **it is only visible in tokens.**

**The safety argument, which is a clean `Matrix`** — which half is a model and
which is arithmetic:

| | who | why |
|---|---|---|
| how many assessed · the finding mix · the totals · which are unpriced | **code** | counting and adding |
| what the refusals have in common · which questions repeat · the headline | **the model** | that is reading, not counting |

**And the rules made structural rather than requested:** the summary's answer
contract **has no field** for a finding, a count or a total. *A model that cannot
represent a total cannot produce a wrong one.* Both rules could have been written
into the prompt — **and a prompt is a request.** Written in code they are
properties.

**Figure:** `Slope` for 188,115 → 3,159. `Matrix` for the model/arithmetic split.

**Depends on:** B4.

---

## B6 · The answer key, worked by hand before any AI existed

**Source:** `WALKTHROUGH.md` (344 lines, plain language) · `PLAN.md` Phase A.
**MEASURED — `pnpm steering:walk-check`, 11/11 with 4 sabotage cases.**

**Why this is a lesson and not a footnote:** the answer was worked out by hand,
by a person, with three free commands that call no AI, **before the tool was
built**. You cannot tell whether a system is right if nobody knows the answer.

**The three rules it produced**, which then became the rules inside
`find_comparable_work` (B3) — so the lesson is *where rules come from*:

1. price from the **median** of a filtered set, never the mean
2. always say **how many past jobs** it rests on
3. **refuse below three** comparables rather than produce a figure

**And the rule about the output shape, which is the best sentence in the file:**

> **The product is not a price. It is the pack the meeting needs.** A tool that
> hands over one confident number replaces the judgement. A tool that hands over
> the evidence removes the two weeks of searching and leaves the judgement where
> it belongs.

**The sabotage table is the figure** — a suite of only-positive assertions cannot
tell you it is passing for the wrong reason:

| sabotage | must change the answer |
|---|---|
| remove the "can it be ordered" condition | answer flips back to the obsolete part |
| price from the mean instead of the median | €109,272 — a 37% overquote |
| lower the refusal threshold to 1 | a price appears where there is no basis |
| **keep the outlier, use the median** | **answer must NOT move** — 1%, against the mean's 37% |

That last row is the one worth dwelling on: **a sabotage test that asserts
nothing changes.** It proves the median is doing the work rather than the
filtering.

**Also worth teaching:** `walk-check` checks **bands, not exact values**. An exact
assertion on €80,034 would go red the day somebody adds one past job — a change
we want to be able to make. A band goes red when the answer moves *for a reason
that matters*. **Counts are exact, because a count moving means a filter moved.**

**Depends on:** nothing. **Feeds:** B3, and the existing lesson 5 (evals).

---

## B7 · What it costs to be honest

**Source:** `HOW-WE-SORTED-IT.md` §"What it costs to be honest". **MEASURED.**

The cost question run twice — once against tidy invented data, once against only
what the files support:

| question | made-up data | from the real files |
|---|---|---|
| gearbox change | €80,034 | **€79,640** |
| damping safety case | €202,853 | **refused — no basis** |
| brand-new safety function | refused | refused |

The gearbox answer survives, **half a percent out**. The €202,853 becomes a
refusal, because the safety level is not recorded.

**Then the part that makes it a lesson.** They checked whether the refusal could
be avoided: drop the safety-level filter, price all safety-case work, add a
footnote saying the level is unknown. That gives **451 hours instead of 1,571 —
wrong by three and a half times, presented as an answer.**

> **A footnote does not rescue a number that is a quarter of the truth.**

So the refusal stays, **and there is now a test that goes red if anybody
"improves" it later.**

**Figure:** `BarRows`, three questions × two arms, with the refusals drawn as
refusals rather than as zero — which is itself B3's rule made visual.

---

## B8 · What the customer's own paperwork cannot tell you

**Source:** `HOW-WE-SORTED-IT.md` · `SORTING.md` §K1 · `NEXT.md`. **MEASURED.**

**The findings that matter more than the software**, and the reason an FDE
engagement is not a software delivery:

- **Only a third of completed work has a closure report** — 220 of 640 jobs. The
  closure report carries the charge code, the only link between a week of
  somebody's time and a piece of engineering. So **293,019 booked hours belong to
  work no document names.** A hard ceiling on anything built from their files —
  *"and it is better to know it now than in front of the customer."*
- **The safety level is never written next to the cost.** Not once in 220 reports
  in usable form. So *"what does an ASIL D safety case cost"* — **a €200,000
  question** — cannot be answered from their documents at all.
- **Reuse is not recorded at all** (this is A1's finding, arriving from the other
  direction).
- **A quoted line cannot be traced to the requirement it priced.** That link is in
  neither the files nor their four databases.

**And the payoff, which belongs in the same breath:** one of those was fixed with
**one line added to a report template**, and a question worth roughly €190,000
went from unanswerable to answered.

MEASURED alongside it: **195 efforts reconciled to the hour. Residual 0.0 h.**
Where a closure report exists and the quarter was exported, what the documents
say and what the answer key says are **the same number**. The parse is exact.

**Figure:** `Funnel` — 640 jobs → 220 with a closure report → the hours that fall
out. `Stack` for 293,019 attributable vs unattributable hours.

---

## B9 · What leaves the building

**Source:** `DATA-RESIDENCY.md` (99 lines, and it is already structured as a
teaching table). **MEASURED — `pnpm steering:derived-compliance-check`.**

**The headline:** of **1,069 files, exactly 220 leave the machine** — about 900
bytes each — to **one host, our own Azure AI Foundry resource in Sweden.**

**Why the design makes that true rather than promised:** the parse pipeline (B1)
never leaves the machine and handles the overwhelming majority of the volume —
10,688 timesheet lines, 168 rates, 301 quoted lines. **Only prose that genuinely
needs reading comprehension is sent.** So *"nothing may leave our tenant"* is a
configuration change, not a blocker.

**The evidence table, and the column that makes it a lesson** — *how* each claim
is known, because "we checked" and "the vendor says so" are different answers and
a reviewer will ask which one you mean:

| claim | strength |
|---|---|
| only 220 documents sent, one per request — 5,664 captured bytes | **verified here** |
| exactly one host, in our tenant | **verified here** |
| `store: false`, read from the OUTGOING BYTES not the source line | **verified here** |
| Entra token, no static key, nothing `sk-` | **verified here** |
| Microsoft does not train on the data | **vendor statement — cite it, do not assert it** |
| prompts not retained for abuse monitoring | **NOT TRUE BY DEFAULT** |

**The three things the document refuses to claim** are the most teachable part —
this is what intellectual honesty looks like as a deliverable:

1. **Abuse-monitoring retention is ON by default** — up to 30 days, *not* disabled
   by `store: false`, different mechanism. The application for Modified Abuse
   Monitoring *"should be filed before this runs on real documents, not after.
   Saying so first is worth more than being asked."*
2. **The endpoint is reachable from the internet** (`publicNetworkAccess:
   Enabled`).
3. **"Azure does not train on your data" is a contract, not a measurement.** *"I
   can show what our code sends. I cannot show what the provider does with it."*

**Figure:** the claims table with a verified/vendor/must-arrange three-way tag —
your `Caveat` component, or a `Matrix`.

---

## B10 · What a green check evidences, and where the evidence stops

**Source:** `CONTROLS.md` (303 lines). **MEASURED.**

The companion to B9 and a genuinely unusual thing to have written down: the
distinction between **a control that is evidenced by a check that ran** and **a
control that needs an organisation behind it**.

Covers: which controls can be evidenced today (data protection, access control
and segregation, correctness and change management, cost and traceability); what
a control platform covers that this does not, at all; the Vanta question and why
the answer is "not yet"; which certificate and why it is probably not SOC 2; and
**what to say when a customer asks "are you compliant?"**

This is the one entry here that is more useful as an *interview* topic than as a
figure-driven page — there is little to plot. Consider it a short page or a
section inside B9.

---

## B11 · The eight pillars, and a status table that lies if you don't date it

**Source:** `CONCEPTS.md` §"The eight pillars". **MEASURED 2026-09-14.**

A natural closing page: all eight pillars, and steering is **done** on every one
of them — *"it is the most complete of the three engagements"*.

**And the lesson hiding inside it, which is why it is worth a page rather than a
table:**

> *Table refreshed 2026-09-14. The version below it carried until then said
> pillars 2, 3 and 4 were "not started" — all three were built on 2026-09-13 and
> the table simply was not updated. **Check a status table's date before trusting
> it.***

That is the same finding as `§C5` below and the same as the learning pages' own
`source:` convention. **A teaching surface that says "here is where we are" is
exactly the kind of artefact that goes stale silently** — so this page should
name its own date most loudly of all.

Also here: **what is deliberately NOT built, and why** — result caching (no
repeat questions, because no users: *"building it now is building for a load that
does not exist"*), a shared context-engineering package (*"one fan-out is not a
pattern"*), LangSmith. **Teaching what was declined, with the reason, is rarer
and more valuable than teaching what was built.**

---

## B12 · The open problem — 23 of 24 requirements price to nothing

**Source:** `NEXT.md` §0 · `OPERATIONS.md` §2. **MEASURED 2026-09-14.**

Full detail is in `OPERATIONS.md` §2 and in the message already sent to the
learn-UI session. In brief, because it is the engagement's live open problem and
the most honest possible closing page:

24 requirements, **$0.26**, ~55 s each, 66% cached → **1 priced, 23 not.**
Classified by `pnpm steering:why-unpriced` (free, no model): **13** estate,
**7** prompt, **4** unknowable, **0** vocabulary. **12 of 13 were not one field
away from anything** — which settled a fork the team had been arguing and proved
the agent was *not* over-constraining. Vantis has booked exactly two
validation-only mechanical jobs, ever.

> **The fix is the sentence, not the filter.** *"We have never done this kind of
> work"* is a finding a bid meeting can act on. *"Your filter matched 0"* reads
> like a tooling failure and gets ignored.

---

# §C · The five operational capabilities — ⚠ PROPOSED, not built

**Source:** `docs/steering/OPERATIONS.md` (1,401 lines), written 2026-09-15.

These were sent to the learn-UI session as a separate message. Unlike everything
above, **almost none of it is built**, and `OPERATIONS.md` marks every claim
MEASURED or PROPOSED for that reason.

| | capability | the one measured thing in it |
|---|---|---|
| C1 | catch model regressions | baseline 15/15, 3 cases × 5 runs, 0 flaky, `fixtures: live`; noise band = `max(1, repeat × 0.2)` |
| C2 | failure forensics | the four buckets in B12; the two-trace-shapes defect |
| C3 | LLM cost autopilot | **the eval suite is 74% of steering's LLM spend** ($1.69 of $2.28); cost per priced answer $0.26 ≈ 24× the $0.018 median |
| C4 | semantic cache | 66% of input tokens already served by the provider's prompt cache at 1/10 price — the honest recommendation may be *don't build it* |
| C5 | self-healing docs | three real drift incidents from this repo's own git history |

**The numbers in C3 carry a caveat that must travel with them:** that 74% is a
property of a **pre-production** repo — the bid ran once, the suite ran through
every change that built it. **It inverts the moment real traffic exists.**

---

# How these fit together — the dependency edges

Not an ordering. The edges, so that whatever ordering is chosen is not wrong.

```
  (existing lesson 2 · retrieval) ──┬──> B1 three pipelines
                                    ├──> B3 the two tools
                                    └──> B4 context engineering ──> B5 compress

  (existing lesson 3 · the answer) ─────> B4

  A1 guessing ──┬──> A2 evidence check        (two halves of one argument)
                └──> B8 what the paperwork cannot tell you

  B6 the answer key (by hand) ──┬──> B3 the rules inside the tools
                                └──> (existing lesson 5 · evals)

  B3 ──> B7 what it costs to be honest ──> B12 the open problem

  B1 ──> B9 what leaves the building ──> B10 controls

  everything ──> B11 the eight pillars    (a closing page, not an opening one)
```

**Three observations, offered rather than asserted:**

1. **A1 + A2 read cold.** They need none of the existing five and none of each
   other's prerequisites. If the goal is one high-value page soon, that is it.
2. **B4 is the deepest idea here** and it genuinely extends the existing lesson 3
   rather than sitting beside it — it might belong *in* the existing track.
3. **B6 comes before B3 logically** (the hand-worked answer key produced the rules
   that live inside the tools), which is the reverse of the order they were built
   in. Worth not following the build order.

---

# Every command these pages might cite

All free unless marked. **A lesson page citing a command that errors becomes the
drift problem B11 is about**, so this list is what actually exists today.

```bash
# the estate and the sorting
pnpm steering:inventory              pnpm steering:corpus-check
pnpm steering:world-check            pnpm steering:estate-check
pnpm steering:derived-reconcile      pnpm steering:derived-reconcile --sabotage
pnpm steering:derived-boundary-check pnpm steering:derived-grade-facts

# the hand-worked answer key
pnpm steering:walk-angle             pnpm steering:walk-cost
pnpm steering:walk-check             pnpm steering:walk-cost -- --from-documents

# the tools
pnpm steering:comparables-check      # free — the pricing tool, database only
pnpm steering:search-tool-check      # one embedding call
pnpm steering:retrieval-check        pnpm steering:retrieval-scorer-check

# the answer contract and the checks
pnpm steering:schema-check           pnpm steering:severity-check
pnpm steering:checks-check           pnpm steering:sql-check
pnpm steering:summary-check          pnpm steering:code-chunk-check

# what goes on the wire
pnpm steering:derived-compliance-check
az cognitiveservices account list -o table

# the open problem
pnpm steering:why-unpriced           pnpm steering:assess-all
pnpm steering:summarise --dry-run

# COSTS MONEY
pnpm steering:assess <REF> --trace   # ~2 cents
pnpm steering:assess-all --run       # ~$0.26 for the bid
pnpm steering:eval                   # ~$0.28
pnpm steering:retrieval-eval --both  # ~200 embedding tokens
pnpm steering:derived-extract --limit 220
pnpm steering:summarise
```

---

*Every figure above is a number this repo measured, with the document and date
that produced it. Where this file and the document it cites disagree, **the
document is right and this file is stale** — the same rule the learning pages
already apply to `docs/`.*
