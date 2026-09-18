# Stage 7 — the evals, where observations become numbers

Read [`STAGE6.md`](STAGE6.md) first. Everything there was **one run each**, and
that is precisely what this stage exists to fix.

---

## The one-line version

Stage 6 showed the system can answer. Stage 7 asks **how often**, and refuses to
average a quota failure together with a wrong answer.

---

## 1 · Why one run told us so little

Across stage 6, the same question produced:

```
escalated without calling a single tool          once
called six tools and did not escalate            four times
answered in 3.9 seconds                          once
answered in 131.3 seconds                        once
made 8 tool calls                                once
made 10 tool calls, same question, same prompt   once
```

Every one of those was a correct-looking run. **None of them is a number.**

> A single green run is a smoke test. This engagement has been reading tea
> leaves since 6.2, and saying so each time; stage 7 is where that stops.

---

## 2 · What it measures, and what it refuses to

```
MEASURES     how often each case passes its checks
             which checks fail, by name
             whether a failure is stable or flaky
             what a full pass costs in requests and wall clock

REFUSES      to average a quota failure into a score
             to compare runs made with a different model or repeat count
             to report a number without its denominator
```

**The refusal is the point.** `docs/FREE.md` §10: an unpaced run reported *zero
wrong answers* because three questions never ran. Stage 6.6's own detector
shipped broken and printed PASS over a real 429. **A hole in a run is not a
result, and this stage's first job is to notice holes.**

---

## 3 · The checks, and an honest split

The answer key states checks per case. They fall into two kinds, and conflating
them would manufacture precision:

### Mechanical — decidable from the run, no judgement

```
which tools were called, and which were not          REC-002: no search_complaints
whether the answer is null                           REC-005: must state it plainly
whether it escalated                                 REC-006 must, REC-003 must not
which campaigns are cited                            REC-005: none
whether a number appears in `counts`                 every number, traceable
whether the contract rejected it                     a rejection is its own bucket
```

These are the checks stage 7 runs. They are exactly the properties stage 6 built
the recording layer to expose.

### Editorial — requires reading the prose

```
does it make the 103-vs-957 distinction and say why   REC-007
does it decline to conclude a cause                   REC-004
does it surface the uncovered complaints as a finding REC-001
```

**These are NOT scored mechanically here.** A regex for "did it explain the
distinction" measures the regex.

> **CORRECTION, 2026-09-18.** This paragraph used to say `@fde/evals` "has a
> classifier verifier for this". **It does not.** `verifyClassifier` verifies a
> SEVERITY classifier — that every check name maps to a bucket — and
> `agreement.ts` is word overlap. Neither reads prose for meaning, and there is
> no LLM judge anywhere in this repo. The claim survived two handoffs before
> anybody opened the file.

They are judged by `pnpm safety:judge`, reported apart, and **never added to the
decided score**. The judge is the same model being judged, which is a real
weakness — so every rubric ships with a failing exemplar AND a passing one, and
the judge must reject the first and accept the second before its verdict on the
real answer is reported at all. A judge stuck on "yes" scores perfectly and is
worthless, and that is the direction everyone wants to believe.

---

## 4 · Severity, and why a bucket is not a score

Three outcomes that must never merge:

```
WRONG      the system answered, and the answer fails a check
DECLINED   the system said it could not answer      — sometimes correct
BROKEN     quota, network, a rejected answer        — infrastructure
```

`eval:diff` on the insurance engagement already refuses to compare runs made
with a different model, fixture mode or repeat count, because that measures the
setup change rather than the code change. The same rule applies here, and the
model id must be recorded with every baseline — Google retires product names.

---

## 5 · The cost, which constrains the design

Measured in 6.6: **842 seconds for one pass of eight questions**, paced at
4.5s per model turn against a 15-request-per-minute limit.

```
1 repeat    ~14 minutes
3 repeats   ~42 minutes
5 repeats   ~70 minutes     the insurance engagement's default
```

Five repeats is the right number and a bad default here. **Start at 3**, and say
in the output that three is a floor rather than a standard — the honest reason
being a free tier, not a methodological one.

---

## 6 · The baby steps

| | step | done when |
|---|---|---|
| 7.1 | the mechanical checks, one pass | every case reports pass/fail per check, and a rejection is its own bucket |
| 7.2 | repeats, and flakiness | 3 runs per case; a case that passes twice and fails once reports as FLAKY, not as a failure |
| 7.3 | the baseline on disk | a committed JSON carrying the model id, repeat count and pacing, so two runs can be compared or refused |
| 7.4 | the number, with its denominator | *"n of 8 cases, 3 runs each, on gemini-3.5-flash-lite"* — never a bare percentage |

---

## 7 · The finding this stage inherits

REC-001's key requires an escalation, because *"is the fix holding"* cannot be
answered from a corpus that records no repair completions.

**Four consecutive stage-6 runs did not escalate.** The prompt says almost
verbatim that completion is not in the corpus. This is the first thing stage 7
should quantify, and the outcome decides what to do about it:

```
fails 3 of 3   →  the instruction does not work; change the mechanism, not
                  the wording — the contract could require it structurally
fails 1 of 3   →  variance, and the prompt is roughly right
```

That distinction is unavailable from a single run, which is the whole argument
for this stage in one example.

---

## 7a · The trajectory, four baselines

```
before tool note   20 pass · 7 flaky · 1 fail · 0 broken   of 28
after tool note    23 pass · 5 flaky · 0 fail · 1 broken
after model fix    26 pass · 1 flaky · 1 fail · 0 broken
after no-op fix    28 pass · 0 flaky · 0 fail · 0 broken
```

**Four fixes, and not one of them was a prompt edit:**

```
a fact moved into the tool result, read at the moment of use     REC-001
a filter taught to match the name a person actually says         REC-003
a count that reports when its own narrowing did nothing          REC-007
a count that says it is not yet a quotation                      REC-004
```

The two that landed last:

```
reports more than one number                1/3 → 1/3 → 0/3 → 3/3
cites at least one complaint by ODI number  2/3 → 1/3 → 1/3 → 3/3
```

REC-007 had two successes in nine runs and was the clearest remaining failure.
What fixed it was not an instruction about ambiguity — it was
`count_complaints` fetching the unnarrowed count whenever `matching` is set, and
saying so when the two are equal. A model narrowing with *"transmission"* inside
a transmission component now narrows with terms that actually separate a defect
from its component.

Every one was found by **reading a baseline**, not by reasoning about the
system, and every one was verified against the baseline before it.

### And 28 of 28 is the DECIDED checks only

```
decided    28 of 28     mechanically verifiable
judged      0 of 3      has to be read, every control passing
```

Both numbers are real and they are not added. The system does what a mechanism
makes it do and does not do what only a prompt asks for — which is the finding
of this stage, and it survives a perfect mechanical score.

### One cost, worth watching

Times rose sharply as the fixes landed: REC-007 to 128s, REC-001 to 115s,
REC-008 to 100s, against 25–53s in the previous baseline. **The answers do more
work than they did this morning**, and that work is the extra tool calls the
notes prompt. A future fix of this kind should be weighed against it.

---

## 7b · REC-007 — SOLVED at the fourth baseline

*Kept as written, because the reasoning was right before the outcome was known.*

Three baselines, and *"reports more than one number"* scored **1/3, 1/3, 0/3** —
two successes in nine runs.

The question is deliberately ambiguous: *"how many complaints about the 2020
F-150 transmission were filed after the recall"* has two true answers, and the
key requires **refusing the premise** and giving both. The model answers what
was asked, which is the trap working exactly as designed.

**Why it is harder than the two that were fixed.** REC-001 and REC-003 were
cases where the machine lacked a fact — that completions are not recorded, that
a model name is stored differently. Supplying the fact fixed them. Here the
machine has every fact it needs and lacks *suspicion*: nothing is missing except
the instinct that a question might not mean what it says.

**What was tried, 2026-09-18.** The tool already said "this counts the
COMPONENT, not the defect" and that produced 2 of 9. It now names the specific
second call to make when it sees the ambiguous shape — a component filter, a
date, and no `matching`:

```
THIS QUESTION HAS TWO TRUE ANSWERS AND THIS IS THE BROADER ONE …
call again with `matching` set to words from the recall's own defect
description. REPORT BOTH NUMBERS and say what separates them.
```

Advice about a distinction is easy to read past; a specific next call is harder.
That is what worked for the AND-versus-OR zero and for the empty `find_recalls`.

**And it is a nudge, like the other two were.** Whether it moves 0/3 is the next
baseline's to say. If it does not, the honest conclusion is that this is not
reachable by giving the model better information, and the options become
structural — a required field for "what else could this question mean", or a
second model pass whose only job is to look for ambiguity.

---

## 7c · The editorial checks, judged — and what the control caught

First run, 2026-09-18:

```
VOID   REC-001   the judge failed its own control
yes    REC-004   avoids stating a cause
yes    REC-007   gives both numbers and explains the distinction
```

**The control did its job on its first outing.** REC-001's judge ACCEPTED an
exemplar written to fail — an answer that reports only a total and never
mentions the complaints no campaign covers. A judge that lenient would have
reported the real answer as passing, and there would have been no way to tell
that from the system being good.

Its verdict is discarded rather than reported. `2 of 2`, with the third VOID,
is the honest shape.

### And the control described itself backwards

The line it printed was *"rejected the bad exemplar"* — which is correct
behaviour — when the judge had in fact **accepted** it. The message was composed
from two conditionals and both branches were inverted.

> A control that reports its own result incorrectly is worse than no control,
> because it is trusted. Fixed, and spelled out rather than composed.

### The disagreement worth keeping

REC-007 is scored by both systems, and they disagree:

```
mechanical   "reports more than one number"    0 of 3
judged       "gives both numbers and explains why"   yes
```

Two readings, and this run cannot distinguish them:

1. **The mechanical check tests `counts.length >= 2`.** An answer that states
   both numbers in prose while filing only one in `counts` fails it and
   satisfies the judge. If so the mechanical check is measuring bookkeeping
   rather than the property, and it is the check that needs changing.
2. **The judge is lenient**, as it demonstrably was on REC-001 minutes earlier
   with the same model.

**Nothing here resolves that**, and picking one would be a guess. What it does
show is why the two are reported apart: a combined score would have averaged a
`no` and a `yes` about the same sentence into something meaningless.

### Second run, after both fixes: 0 of 3, and every control passed

```
first run    VOID   REC-001      the judge accepted an answer written to fail
             yes    REC-004
             yes    REC-007

second run   no     REC-001      all three controls passed
             no     REC-004
             no     REC-007
```

Two things changed between them: REC-001's rubric was sharpened after its own
control failed, and the judge was told **which way to err** — yes only on a
clear and explicit satisfaction, no when partial, implied or unsure.

**The swing from 2-of-2 to 0-of-3 is large and it was caused by an instruction
I wrote.** So the obvious suspicion is that the judge is now stuck on "no",
which would be exactly as useless as being stuck on "yes".

**The controls are the answer to that.** All three rubrics required the judge to
*accept* a passing exemplar, and all three did. A judge answering no to
everything cannot pass a control that demands a yes. It discriminates; it simply
does not think these answers qualify.

### Which is the interesting result

```
decided    26 of 28 checks         what can be mechanically verified
judged      0 of 3                 what has to be read
```

The system is **mechanically excellent and editorially weak**. It cites, it
escalates, every number carries the tool that produced it, it proves an absence
rather than inferring it — and it does not explain *why* two numbers differ, or
hold the line on allegation-versus-finding when writing prose.

That is a coherent picture rather than a contradiction. Every mechanical check
has a mechanism behind it: a contract rule, a tool result, a coherence check.
**Nothing in this system makes an answer explain itself** — that was left to the
prompt, and the prompt is read once at the start.

> It is the same finding as REC-001's escalation, one level up. What a tool
> result says at the moment of use, the system does. What a prompt asks for in
> general, it does when it happens to.

**One run each, and the judge is the same model being judged.** These numbers
are provisional until repeated, and they must not be added to the 26.

---

### And I claimed this was already answerable. It is not.

The line here first read: *"a question the recorded tool calls and counts in the
baseline can now answer without spending a single request."*

**No baseline carries those fields.** Call recording was added to the eval
harness *after* the last baseline was taken, so the capability exists in code
and has produced no data. Checking the file says `FIELD ABSENT` on all three
runs.

> Third time today a capability was described as available because it had been
> built. Built is not measured, and a file is the cheapest possible way to find
> out which.

**Settling it costs one question**, not a baseline:

```
pnpm safety:ask "How many complaints about the 2020 F-150 transmission were filed after the recall?"
```

That prints the prose and the `counts` entries side by side. If the prose holds
both numbers and `counts` holds one, the mechanical check is measuring
bookkeeping. If the prose holds one, the judge was lenient.

---

## 8 · What stage 7 does NOT do

- **No prompt tuning inside the loop.** Three prompt edits were already made
  after failing single runs in stage 6, and a fourth on a sample of one would be
  overfitting. Change the prompt between baselines, never during.
- **No UI.** Stage 8.
- **No new tools.** If a case cannot be answered with the five, that is a
  finding.
