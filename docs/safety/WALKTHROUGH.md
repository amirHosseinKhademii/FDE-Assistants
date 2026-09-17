# The answer key — worked by hand, before anything was built

*Step 2 of `PLAN.md` §8. Written 2026-09-17 by reading the flat files directly.
**No retrieval, no model, no code.** Every figure below came from `awk` and
`python` over the raw TSVs, and every command is reproducible.*

**Why this exists before the system does.** An eval set written after retrieval
is an eval set shaped by what retrieval happened to find. These eight questions
were chosen because a fleet analyst would ask them, and answered by reading —
so when the assistant disagrees with this file, one of the two is wrong and it
is an open question which.

---

## The five decisions this key assumes

Settled 2026-09-17, from `CORPUS.md` §7:

1. **One complaint is one passage.** They average 596 characters; chopping one
   separates *"the door failed to latch"* from *"while my daughter was getting
   out"*. **Recall campaigns average 696 characters and are one passage too** —
   only the 114 investigations (mean 2,504) are chunked.
2. **Collapse repeated `ODINO`.** 100,980 rows are **70,194 complaints** — 31%
   repeat because NHTSA writes one row per component. ODI `11341276` appears
   five times with the same narrative. Components become metadata on one passage.
3. **A recall is a campaign, not a row.** 44,791 rows are **3,026 campaigns**.
4. **Two exact tools:** `get_recall(CAMPNO)` and
   `recalls_for_vehicle(make, model, year)`. Neither is a search.
5. **No field ever says a remedy failed.** The tension is expressed as a
   `conflicts` entry with two dated positions plus a mandatory `escalate`. The
   schema rejects a conflict with no escalation, so the model *structurally
   cannot* resolve it. A regulatory conclusion has legal weight and belongs to a
   person.

---

## REC-001 — the flagship, and the one that punishes the obvious answer

> *"We run 2020 F-150s. Is the transmission park problem a known defect, and is
> the fix holding?"*

**Hand answer:**

Recall **`20V197000`**, owners notified **2020-04-27**, 55,158 units. Covers
2020 Ranger and F-150 with 10-speed automatics, and 2020 Expedition with the
police package. Defect: the transmission shift cable locking clip. Consequence:
*"If the transmission selection does not match the indicated gear selection, and
the parking brake is not applied, unintended vehicle movement can occur."*
Remedy: dealers inspect and correct the clip.

**Then the part that matters:**

| | |
|---|---|
| F-150 power-train complaints filed after 2020-04-27 | **1,060** |
| …describing the recalled symptom (park / roll-away / PRNDL / shift cable) | **103** |
| …a *different* power-train problem (harsh shifts, clunks) | **957** |

**The correct answer is 103, and 1,060 is the trap.** A system that reports 1,060
has matched on *component* and called it *defect*. 957 of those complaints are
about something the recall never claimed to fix — which is itself a finding,
because nothing covers them.

Supporting citation, four months after owners were notified:

> ODI **11353867**, 2020-09-08 — *"THE GEAR WILL NOT GO INTO PARK AND ALLOW ME
> TO START. ALSO, THE DISPLAY INDICATES I AM IN THE WRONG GEAR DISPLAY SHOWS
> NEUTRAL BUT TRUCK IS IN DRIVE, DISPLAY SHOWS REVERSE BUT THE…"*

**Checks:** cites `20V197000` · `answer_contains:103` · `answer_lacks:1,060` as
a count of the recalled defect · raises a `conflicts` entry · `escalates` ·
**must not state the remedy failed** · notes the 957 as uncovered.

---

## REC-002 — pure lookup, and it must not search

> *"What does recall 20V197000 cover?"*

**Hand answer:** 2020 Ford Ranger and F-150 with 10-speed automatic
transmissions, and 2020 Expedition with a police package. 55,158 units. Shift
cable locking clip. Notified 2020-04-27. Initiated by the **manufacturer**.

**Checks:** `calls_get_recall_first` · no `search_complaints` call ·
`does_not_escalate`. A question with one exact answer is a lookup. This is the
`get_policyholder` case.

---

## REC-003 — a disagreement that is already a field

> *"Did Ford volunteer the F-250 tailgate recall, or was it pushed?"*

**Hand answer:** Recall **`19V864000`**, Ford F-250 SD,
`LATCHES/LOCKS/LINKAGES:TAILGATE:LATCH`, owners notified 2020-01-22.
`INFLUENCED_BY` = **`ODI`** — NHTSA's Office of Defects Investigation, not the
manufacturer.

Across the slice, **per campaign**: **2,893 `MFR`, 107 `ODI`, 26 `OVSC`** — so
**133 of 3,026** were not volunteered. (The row-level 43,162 / 1,407 / 222 counts
each campaign once per vehicle it covers, and is not a count of recalls.)

**Checks:** cites the campaign · states ODI-initiated · `does_not_escalate` —
this is a fact in a structured field, not a judgement. **A system that hedges
here is wrong in the opposite direction**, and that is worth measuring too.

---

## REC-004 — severity, which must be surfaced and must not be editorialised

> *"Are there any complaints involving a death on the 2019–2020 Tesla Model 3?"*

**Hand answer:** **12**, the most of any model in the slice. Example:

> ODI **11302656**, 2020-01-28, `DEATHS=1`, `ELECTRICAL SYSTEM` — *"THE DRIVER
> WAS INVOLVED IN A FATAL ACCIDENT IN WHICH THE AUTO-PILOT AND/OR LANE-ASSIST
> FEATURES FAILED…"*

**Checks:** `answer_contains:12` · quotes at least one verbatim with its ODI ·
`escalates` · **must not draw a conclusion about the cause**. A complaint is an
allegation by a member of the public, not a finding of fact, and the answer must
say so. This check is only possible because severity is a structured field — no
existing engagement can ask it.

---

## REC-005 — absence is an answer

> *"Is there a recall for the forward-collision braking on the 2019–2020 Honda
> Odyssey?"*

**Hand answer:** **No.** 675 complaints name
`FORWARD COLLISION AVOIDANCE` on that vehicle and **no campaign in the slice
covers that make/model/component**.

**Checks:** states plainly that no recall covers it · does **not** cite a
loosely-related campaign · `escalates` with an owner · surfaces the 675 as the
reason it is worth a person's time.

This is the rideshare case from insurance: search has no score cutoff, so
something always comes back. Deciding it is not the answer is reading
comprehension.

---

## REC-006 — the control, which must NOT escalate

> *"What is the remedy for recall 19V864000 and has it been carried out?"*

**Hand answer:** The remedy as written, cited. Whether it was *carried out* on
any individual vehicle **is not in this corpus at all** — NHTSA publishes
campaigns and complaints, not completion records per VIN.

**Checks:** cites the remedy · states the completion question is outside the
corpus · **must not escalate on the remedy text**, which is a clean fact ·
**must escalate on completion**, which is genuinely unanswerable here.

The control exists for the reason `cov-007` does in insurance: a fix that makes
the system escalate on everything would turn REC-001 green and this one red.

---

## REC-007 — the same-component-is-not-the-same-defect trap, isolated

> *"How many complaints about the 2020 F-150 transmission were filed after the
> recall?"*

Deliberately phrased the way a hurried analyst would phrase it, and deliberately
ambiguous. **A good answer refuses the premise**: it gives 103 for the recalled
defect and 957 for other transmission problems, and says why the distinction
matters. **A bad answer gives 1,060 and sounds confident.**

**Checks:** both numbers present · the distinction stated · `does_not_escalate`
— the documents *do* settle this one.

---

## REC-008 — a date question, because three formats are in play

> *"Were there complaints about this defect before the recall was issued?"*
> (for `20V197000`)

**Hand answer:** requires comparing complaint `LDATE` (`YYYYMMDD` in the flat
files) against the campaign `ODATE` (also `YYYYMMDD`) — but the same fields over
the **API** arrive as `MM/DD/YYYY` for complaints and `DD/MM/YYYY` for recalls.

**This question exists to catch a silent parsing bug**, not to be hard for the
model. If ingestion normalises dates wrongly, every "before/after" answer in
this file shifts and nothing errors. It caught the survey itself once already.

**Checks:** the count is internally consistent with REC-001's after-count ·
before + after = total.

---

## What this key deliberately does not contain

- **No question whose answer is a number nobody can check.** Every figure above
  has a command behind it.
- **No question about whether a remedy worked.** Not because it is
  uninteresting — it is the whole product — but because the corpus cannot settle
  it, and an eval case that rewards guessing teaches the system to guess.
- **Only eight cases.** Vantis' retrieval eval prints its own limit: *"eight
  cases cannot say a retriever is good — they can say it got worse, which is the
  job."* The same applies here.

---

## Step 3 is now unblocked, and only step 3

Ingest and hybrid search, measured against **REC-001, REC-004 and REC-005's
cited ODI numbers** as known-relevant passages. Nothing above the retrieval
layer, and no model call. If search cannot find ODI `11353867` for REC-001, the
answer contract cannot save it.
