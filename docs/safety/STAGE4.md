# Stage 4 — the tools

**Read [`INGESTION.md`](INGESTION.md) §3.7 first.** This document exists because
of what that measurement found, and half of what is below would have been
designed differently without it.

---

## The one-line version

Stage 3 can only ask one question: *"what text looks like this?"* Stage 4 gives
the machine the questions the data can actually answer — by name, by vehicle, by
count.

---

## 1 · What stage 4 actually is, plainly

So far there is no model. Nothing has been asked. Stage 3 takes a question,
returns six passages, and stops.

Stage 4 adds ONE thing:

```
TOOLS      ways the model can ask the database a question that
           is not "find me text like this"
```

That is all. **No answer contract** — that is [`STAGE5.md`](STAGE5.md), and it
was split out of here on 2026-09-17 because the two are different kinds of work:
a tool is a question you can ask the data, and a contract is a shape an answer
must arrive in. Bundling them made stage 4 the longest thing in this folder and
hid the fact that **the contract is testable without a single tool, and the
tools are testable without any contract.**

No loop, no evals, no page either. Those are stages 6, 7 and 8.

---

## 2 · Why the original plan is now wrong, and what changed it

[`PLAN.md`](PLAN.md) §8 said stage 4 was *"the two tools and the answer
contract — `get_recall` exact, `search_complaints` hybrid."*

Then 3.7 measured recall@6 = **0.40**, and diagnosed why:

```
20V197000  (the recall)      keyword rank    93
11353867   (the complaint)   keyword rank 3,026
```

The key's documents were nowhere near the top. Not because search is bad, but
because **two of the three questions were filters wearing the clothes of
questions** — `2020 F-150`, `Tesla Model 3`, `involving a death` are structured
fields being matched as prose.

And the fix was measured, not guessed:

```
filter make=TESLA, model=MODEL 3, deaths>0     → exactly the 5 targets
filter make=FORD, model=F-150, POWER TRAIN,
  then rank by park/prndl/roll/shift           → 11353867 at rank 8, from 3,026
```

**So the tools are not "exact lookup plus search". They are filters.** That is
the first change.

### The second change, which 3.7 also exposed

Look at what the answer key actually asks for:

| Case | The answer is | Can six passages contain it? |
|---|---|---|
| REC-001 | **103**, and not 1,060 | **No** |
| REC-004 | **5** | **No** |
| REC-007 | **103 and 957** | **No** |

Three of eight cases want a **count**. A count is not in the documents. You
cannot read six passages and know there are 103 of something — and a model that
tries will produce a number that sounds right, which is the single most
dangerous failure available here.

> **No amount of better retrieval ever answers "how many".** Retrieval returns
> examples; counting is an aggregate. They are different operations and they
> need different tools.

---

## 3 · The five tools

Not two. The count came from §2, the fourth from the negative case, and the
fifth from measuring the corpus for a graph and finding a different one than
expected.

### 3.1 · `get_recall(campaign_number)` — exact, and it must not search

```
get_recall("20V197000")
  → the campaign: vehicles covered, units, component, defect,
    consequence, remedy, who initiated it, date owners were notified
```

**A question with one exact answer is a lookup, not a search.** This is
`get_policyholder` from the insurance engagement, reached again here.

REC-002 asks *"What does recall 20V197000 cover?"* and its check is
`calls_get_recall_first` **and no `search_complaints` call at all**. Searching
for a campaign number returns passages that look like they contain campaign
numbers.

*Done when:* returns the campaign for a valid number, and a clean "no such
campaign" for an invalid one — never a near miss.

---

### 3.2 · `find_recalls({ make, model, year, component? })` — and it may return nothing

```
find_recalls({ make: "HONDA", model: "ODYSSEY",
               component: "FORWARD COLLISION" })
  → []
```

**The empty list is the point.** REC-005 asks whether a recall exists for the
Odyssey's forward-collision braking. It does not. Verified: zero covering
campaigns.

Today, search always returns *something* — there is no score cutoff, by design.
So "no recall exists" is currently a judgement the model makes by reading six
loosely-related results and deciding none of them count. That is exactly the
rideshare case from insurance, and it is the hardest thing to get right.

Here we can do better, and it is worth being precise about why:

> Insurance could not prove absence, because "is rideshare covered" is not a
> field in a policy document. **Here it is.** A campaign names the make, model,
> year and component it covers, so the absence of a match is a *fact about the
> corpus*, not an impression of it.

*Done when:* returns `[]` for the Odyssey forward-collision query, and the
recall for `find_recalls({make:"FORD", model:"F-150", component:"PRNDL"})` —
which is `20V197000`, measured.

---

### 3.3 · `search_complaints({ ...filters, query })` — filter first, then search

```
search_complaints({
  make: "FORD", model: "F-150", component: "POWER TRAIN",
  filed_after: "2020-04-27",
  query: "will not go into park, rolls away"
})
  → the complaints themselves, to quote
```

Every filter is a column we already have in metadata: `make`, `model`, `year`,
`component`, `filed_after`, `filed_before`, `crash`, `fire`, `min_deaths`,
`min_injuries`.

The hybrid search from 3.5/3.6 still runs — **but inside the filtered set**,
which is the whole difference. 681 documents instead of 70,194, and the target
moves from rank 3,026 to rank 8.

*Done when:* the REC-001 complaint `11353867` comes back in the top 6 for a
filtered call, where it was absent from the top 50 unfiltered.

---

### 3.4 · `count_complaints({ ...filters })` — a number, never passages

```
count_complaints({ make:"FORD", model:"F-150",
                   component:"POWER TRAIN", filed_after:"2020-04-27" })
  → { count: 1057, filter: { ... } }
```

**It returns the filter alongside the number, and that is not decoration.** It
is what lets the answer contract check that a number in the prose came from a
tool rather than from the model's sense of what a plausible number looks like.

REC-001's whole trap is that **1,057 and 103 are both true and only one answers
the question.** 1,057 matched on *component*; 103 matched on *defect*. A system
that says 1,057 confidently has done the arithmetic correctly and answered the
wrong question.

*Done when:* the same filters produce the same numbers as `awk` over the raw
file — the no-parser check that guardrail 3 requires.

---

### 3.5 · `complaints_citing(campaign_number)` — the edge owners built by hand

```
complaints_citing("20V197000")  → 7 complaints whose narrative names it
```

**Measured before being proposed.** 5,361 complaints name a campaign id in their
free text; 689 distinct campaigns, of which **563 resolve to a recall we hold**.

This is the graph everyone expects to find in this corpus — and it is not the
documented link. The investigation→recall field resolves only **14 times out of
114**. The edge that works is the one owners typed themselves.

For REC-001 — *"is the fix holding?"* — those 7 complaints are the strongest
evidence available, because the person filing them had the campaign in front of
them. That is a different claim from "a complaint about the same component",
which is the trap the whole case is built around.

*Done when:* returns 7 for `20V197000`, verified against `grep` on the raw file.

> **And it stays a tool, not a graph layer.** One hop is a lookup. See
> [`INGESTION.md`](INGESTION.md) — the traversal needs no graph store, no node
> embeddings and no community detection, and building those would be ceremony
> around a string match.

---

## 4 · The baby steps, and what "done" means

**No step starts before the one above it is verifiable.** Same rule as stage 3,
which is how 3.7 caught a problem that would otherwise have surfaced as "the
model seems bad".

| | step | done when |
|---|---|---|
| 4.1 | `get_recall` | returns `20V197000` exactly; a bad number returns nothing, not a near miss |
| 4.2 | `find_recalls` | `[]` for the Odyssey case; `20V197000` for the F-150 PRNDL case |
| 4.3 | `search_complaints` with filters | `11353867` in the top 6, where it was outside the top 50 |
| 4.4 | `count_complaints` | numbers match `awk` over the raw file |
| 4.4b | `complaints_citing` | returns 7 for `20V197000`, verified by `grep` |
| 4.5 | re-run 3.7 **through the tools** | recall@6 rises from 0.40, and we can say by how much and why |

**4.5 is the one that matters, and it ends the stage.** It re-uses stage 3.7's
harness with the tools in front of retrieval, and it is how we learn whether the
diagnosis in §2 was right. If recall does not move, the tools are not the answer
and **stage 5 should not begin** — there would be nothing worth writing a
contract around.

---

## 4b · recall@6 has a slot budget, and it distorts twice

Both of these came out of building stage 4, two cases apart, and they are the
same artefact wearing different clothes. **Neither is about retrieval.**

```
REC-004   the key named 12 targets for a 6-slot metric
          → recall@6 could not exceed 0.5, by arithmetic
          → a healthy retriever would have scored as a failure
          → surfaced only because the 12 turned out to be a row count, and
            the real figure is 5

REC-001   the 7 complaints CITING the recall are the best evidence the
          corpus holds for "is the fix holding"
          → none of them is the target the key named
          → adding them pushes the named target out of 6 slots
          → THE METRIC WOULD PUNISH CALLING THE RIGHT TOOL
```

> **A fixed-k recall metric scores what the key NAMED, not what a good answer
> would cite.** With few targets it flatters; with many it caps; and it is
> actively hostile to a tool that returns more correct material than the key
> happened to list.

It is still the right metric for stage 3 and 4, because those stages ask *can
the machine reach the document* and nothing else. **It stops being the right
metric the moment an answer is being judged** — which is stage 7, and this is
why stage 7 scores the answer rather than the retrieval.

Worth carrying to another engagement: when a retrieval number looks strange,
check the slot budget before checking the retriever.

---

## 5 · What stage 4 deliberately does NOT do

- **No model call.** Tools are functions; the loop that lets a model call them
  is stage 5. Each tool is testable from a CLI with no network.
- **No answer contract.** [`STAGE5.md`](STAGE5.md).
- **No prompt.** It belongs with the loop, stage 6.
- **No evals.** Stage 7, with severity buckets that separate *a wrong answer*
  from *a quota failure* — [`FREE.md`](../FREE.md) §10 is the cautionary tale,
  where an unpaced run reported zero wrong answers because three questions
  never ran.
- **No UI.** Stage 8.

---

## 6 · The learnings this stage is built on

Everything here came from somewhere measured:

| Learning | Where it was learned | What it changes here |
|---|---|---|
| A question with one exact answer is a lookup | insurance, `get_policyholder` | 4.1 exists, and REC-002 forbids searching |
| Filters beat search when the field exists | **3.7, measured** | 4.2–4.4 are filters; rank 3,026 → 8 |
| Retrieval cannot count | **3.7, measured** | 4.4 exists; `counts` is in the contract |
| A reranker cannot fetch | **3.6b, measured** | why we are not tuning retrieval further |
| An unresolved conflict must escalate, never resolve | insurance coherence | rule 3 |
| Absence is an answer | insurance, the rideshare case | 4.2, and provable here rather than inferred |
| Complaints are allegations, not findings | this corpus, guardrail 5 | rule 5 |
| Check every count against something that shares no code | **this engagement, four times** | 4.4's `awk` check |
| A number without its denominator gets quoted without it | **3.7** | `counts` carries its filter |

---

## 7 · The component filter — decided, 2026-09-17, before building it

NHTSA's components are a tree written with colons:

```
POWER TRAIN
POWER TRAIN:AUTOMATIC TRANSMISSION
POWER TRAIN:AUTOMATIC TRANSMISSION:GEAR POSITION INDICATION (PRNDL)
FORWARD COLLISION AVOIDANCE: WARNINGS
FORWARD COLLISION AVOIDANCE: ADAPTIVE CRUISE CONTROL
```

**The rule is PREFIX MATCH ON THAT HIERARCHY**, and nothing looser:

```
value = filter                    an exact component
value starts with filter + ':'    that component and everything under it
value starts with filter + ': '   the same, because NHTSA uses both spacings
```

So `FORWARD COLLISION AVOIDANCE` matches both its children, and
`POWER TRAIN:AUTOMATIC TRANSMISSION` matches the PRNDL branch without dragging
in all of `POWER TRAIN`. **The caller chooses how specific to be**, which is
what the answer key needs: REC-005 wants the whole forward-collision subtree,
REC-001 wants one branch of the transmission.

Substring matching was rejected: `BRAKE` would catch `PARKING BRAKE` and
`BRAKE HOSE` whether or not anyone meant it, and a caller could not express
"only the top level". Exact matching was rejected because the model would have
to know every sub-component string in advance.

### Verified against the key before being written down

```
Odyssey + prefix "FORWARD COLLISION AVOIDANCE"   →  400   key says 400 ✓
F-150 + prefix "POWER TRAIN"                     →  1,077  (1,057 of them
                                                    filed after 2020-04-27)
recalls + prefix "POWER TRAIN:AUTOMATIC TRANSMISSION"
                                                 →  the PRNDL branch, and not
                                                    the bare POWER TRAIN rows
```

### The same shape, for model names — added 2026-09-17 after REC-003

`find_recalls(FORD, "F-250")` returned **nothing**. The campaign is filed under
`F-250 SD`.

```
a person says          F-250
the corpus stores      F-250 SD
an exact match makes the natural name WRONG
```

REC-003 — *"did Ford volunteer the F-250 tailgate recall, or was it pushed?"* —
scored **1 of 3** in the first baseline, and all three of its checks failed
together in the two bad runs. It was never three properties failing; it was one
lookup returning nothing, after which the model escalates and cites nothing.

So model names get the same treatment as components, separated by a space
instead of a colon: **exact, or a child of it.**

```
"F-250"    → F-250 SD      and 19V864000 is found
"F-150"    → F-150         and nothing else
"MODEL 3"  → MODEL 3       and not MODEL 3 PERFORMANCE, were there one
```

**Verified not to move anything already published**, which is the condition for
changing a filter this late:

```
                 exact   prefix
FORD F-150        2043    2043
TESLA MODEL 3     1062    1062
HONDA ODYSSEY     1416    1416
```

Every number this engagement has stated — 1,057, 5, 400 — comes from a filter
this rule leaves alone, and `safety:count` still agrees three ways with `awk`.

> **And it excludes the corpus's own junk without trying to.** The recall data
> contains `redundant F-250` and `redundant  F-250`, one space and two, in the
> model field — NHTSA's data entry, not this pipeline's. A prefix rule cannot
> reach them because they do not *start* with the name. Substring matching would
> have swept them in, which is one more reason it was not chosen.

Both rules now live in `apps/ai/safety/src/tools/matching.ts`. The component
rule had been written twice — once in `find_recalls`, once in the builder
`count_complaints` imports — and two definitions of "what does this component
mean" that can drift is the same hazard as two copies of a scoring rule.

---

### And one rule that comes with it, for `count_complaints`

Filtering on components means **unnesting an array**, and a complaint can carry
several: **21,747 of 70,194 have more than one.** Unnested, one complaint
becomes several rows.

The first run of the check above returned **675** for the Odyssey — the number
this key already had to have corrected out of it, arrived at by a completely
different route. `count(*)` over the unnested rows is a row count again.

> **Any count that filters on component MUST be `count(distinct id)`.** This is
> the third appearance of the same trap in this engagement — 1,407 recalls that
> were 107 campaigns, 12 death complaints that were 5, and now 675 that are
> 400 — and it is the first time it is structural rather than a mistake: the
> unnest creates the duplicates itself.
>
> `count_complaints` is the tool whose entire output is a number. It gets this
> rule in its own test.
