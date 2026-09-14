# Where steering stands — a handover

*Rewritten 2026-09-14. Read this first when coming back cold; it says what
exists, what it proved, what is unfinished, and which command to run next.
Every claim here is from a check that ran, not from intention.*

*The 2026-09-13 version of this file said the eval had never run and that
nothing was committed. Both were false within hours of being written. This one
is dated for the same reason — treat any claim here as true **as of its date**
and verify before relying on it.*

---

## The one-paragraph version

Vantis Steering gave us **1,069 files and four databases**. The databases looked
like the finished job and were a cheat — generated alongside the documents, never
derived from them. That is now closed: everything the product reads is derived
from the files and sits in a fifth database, `vst_derived`. On top of it there is
a working agent that assesses one customer requirement, prices it from history,
refuses when the history is too thin, cites every claim to a file and a line, and
puts the genuinely contested questions to named people. **All 24 requirements of
the K2 bid have now been assessed** — and the result is the most interesting
thing in this file: twenty-three of them could not be priced.

---

## What runs today

### The data — three pipelines, all complete

| pipeline | in | out | cost |
|---|---|---|---|
| **parse** | 131 CSV/JSON | ~11,500 rows | free, 4 s |
| **extract** | 220 closure reports | 1,320 facts, each with its sentence | ~a cent |
| **chunk + index** | 922 documents | 3,854 passages incl. 1,027 code chunks | ~1 cent |

All in `vst_derived` on Neon. Separate from the customer's four, which are now
the **answer key** and are never read by the product.

### The capability

```
pnpm steering:assess CR-K2-0101 --trace
```

One requirement → search → price → a structured answer. ~55 s, 2–9 tool calls.
Two tools: `search_documents` and `find_comparable_work`.

```
pnpm steering:assess-all                    # free: the work list, spends nothing
pnpm steering:assess-all --run --limit 1    # one requirement, ~2 cents
pnpm steering:assess-all --run              # everything outstanding
```

**The fan-out, added 2026-09-14.** The whole bid: what is answered, what failed,
what was never attempted — and with `--run`, the assessments that close the gap.
Serial, resumable, and `--run` is opt-in because the plain form is the one you
want most often.

It has no batch state. The work list is recomputed from the filed answers on
every invocation, so an interrupted run resumes by being run again and a
requirement answered on the web desk simply drops out of the list. That is not a
feature that was added; it is the shape.

```
pnpm steering:walk-cost -- --from-documents
```

The deterministic walk, reading derived rows. Two of three items priced within
4% of the answer key; the third refuses.

```
pnpm steering:summarise --dry-run     # free: every count, no model
pnpm steering:summarise               # plus the written half, one call
```

Where the whole bid stands, across every assessment already filed — and only
those; it never reads the corpus. Every number is computed in code and the model
is asked for the two things counting cannot do: what the refusals have in common
and which questions repeat. [`THE-SUMMARY.md`](THE-SUMMARY.md) is the plain
version; it is the **"Where the bid stands"** panel on the desk.

---

## What it proved, with numbers

**Extraction is 98% correct** on 1,320 fields, with **zero invented sentences** —
every quote verified against its file before storing.

**The cost answer survives being honest.** From documents alone: gearbox
EUR 81,455 (key: 78,693), damping safety case EUR 188,099 (key: 193,310), and a
refusal on the third. Within 4%, on a third of the evidence.

**Retrieval finds the contradiction, not just the document.** One question —
*"what ASIL is the damping software developed to?"* — returns the requirement
saying D, a design note saying D and marked stale, and the static-analysis report
saying B. Three directories, two formats, nobody told it they were related.

**The eval suite is green.** 15/15, 3 cases × 5 runs, 0 flaky, `gpt-5-mini` on
the Agents SDK — baseline `2026-09-13T22-23-39-484Z`. **It ran `fixtures: live`**,
so it cost real money and is not reproducible offline; `find-comparable-work.tool.ts`
says an eval run must be fixture-backed to reproduce, and this one was not.

### The whole bid, assessed — 2026-09-14

24 of 24 requirements, at **$0.26 total** and a **$0.018 median per
requirement**, 66% of input tokens served from cache, ~55 s each.

| | |
|---|---|
| `change_needed` | 23 |
| `have_it` | 1 — `CR-K2-0124`, start of production |
| `new_work` · `cannot_tell` | never returned, across 24 real requirements |
| **priced** | **1** — 119 h, EUR 12,138, from 19 past jobs |
| **unpriced** | **23**, of which 7 never queried the history at all |

**Twenty-three of twenty-four could not be priced, and that is now the most
important open problem in this engagement.** Each refusal is individually
correct — the tool will not take a median of two jobs — but a system built to
price a bid from history priced one line of it. See [`NEXT.md`](NEXT.md) §0.

**The four findings about the customer's paperwork**, which is the part no
database could produce:

- only a third of completed work has a closure report, so **293,019 booked hours
  cannot be attributed to any piece of engineering**
- the safety level is not recorded next to the cost
- reuse is not recorded at all
- a quoted line cannot be traced to the requirement it priced

One of those was fixed with **one line added to a report template**, and a
question worth roughly EUR 190,000 went from unanswerable to answered.

---

## Every check, and what it guards

All free and offline unless marked.

| command | asserts |
|---|---|
| `steering:world-check` | the estate has not shifted — 37 tables, 13,712 rows, sha `400562829f7559b6` |
| `steering:estate-check` · `db-check` | 28 / 27 assertions over the answer key |
| `steering:corpus-check` | the mess is still messy — 14 planted defects intact |
| `steering:sabotage-check` | 14/14 breaks detected |
| `steering:derived-reconcile` | parsed hours match the key to the hour, 12 assertions |
| `steering:derived-sabotage` | 9/9, both directions |
| `steering:derived-grade-facts` | extraction quality, 6 signals — four need NO answer key |
| `steering:derived-boundary-check` | the ingest cannot open the customer's databases, including in comments |
| `steering:sql-check` | 8 — the answer path is read-only, names no customer database, imports no entry point; and in `src/answer/` the one file that writes may not name the estate |
| `steering:summary-check` | 20 — the roll-up's arithmetic and the summary contract, both directions, offline |
| `steering:code-chunk-check` | code chunked by function, calibration rows attached correctly |
| `steering:schema-check` | 15 — the answer contract, both directions, plus the two guard patterns |
| `steering:checks-check` | 19 — every eval check shown to FAIL as well as pass |
| `steering:severity-check` | 10 — every severity bucket reachable |
| `steering:walk-check` | 11 + 5 sabotage cases |
| `steering:derived-compliance-check` | what goes on the wire: one host, `store:false`, Entra token |
| `steering:retrieval-check` | 5 cases · **costs 5 embedding calls** |
| `steering:eval` | the suite · **costs 15 loops** |

**The fan-out has no self-test**, and neither does `explain`. Both are listed
under *Unfinished* below rather than quietly absent from this table.

---

## The documents, and which to read

| | for |
|---|---|
| [`HOW-WE-SORTED-IT.md`](HOW-WE-SORTED-IT.md) | plain language, no jargon, anyone |
| [`THE-TOOLS.md`](THE-TOOLS.md) | the two tools and why each rule is inside them |
| [`WHAT-WE-ASK-THE-MODEL.md`](WHAT-WE-ASK-THE-MODEL.md) | the prompt, the schema, the evidence check |
| [`GROUNDING-WALKTHROUGH.md`](GROUNDING-WALKTHROUGH.md) | every file from disk to a cited passage |
| [`DATA-RESIDENCY.md`](DATA-RESIDENCY.md) | what leaves the machine, evidence per claim |
| [`CONTROLS.md`](CONTROLS.md) | what our checks evidence, what a control platform would cover, and why not Vanta here |
| [`CONCEPTS.md`](CONCEPTS.md) | the eight pillars, context engineering, what to build next |
| [`FROM-PHARMA.md`](FROM-PHARMA.md) | which concepts transfer from the last engagement |
| [`NEXT.md`](NEXT.md) | **start here when resuming** |
| [`SORTING.md`](SORTING.md) | the engineering record, links to all of the above |
| [`UI-COPY.md`](UI-COPY.md) | customer-facing copy, drop-in |

**`CONCEPTS.md`'s pillar table was stale and was refreshed 2026-09-14** — it had
read *"tool loop: loop does not exist"*, *"answer shape: not started"*,
*"evals: not started"* for three pillars that were built and green. It now
carries its own date, for the reason this file does.

---

## Unfinished, honestly

**Twenty-three of twenty-four requirements are unpriced.** The largest open item
by a distance, and new — it was not visible until the whole bid was run.
[`NEXT.md`](NEXT.md) §0.

**The eval's green baseline ran live**, not fixture-backed, so it is not
reproducible offline and re-running it costs money.

**`explain` is undocumented.** The loop, the schema, the prompt, `/api/explain`
and `Explain.tsx` all exist and typecheck; it is named in no document here, has
no self-test, and its `steering:explain` surface label belongs to no script.

**The fan-out has no self-test.** `workList`'s three-state logic is exactly the
kind of thing that breaks silently — a resume that treats a failed row as done
gets shorter every run and looks like it is working.

**`@fde/foundry` reports an expired credential as `Connection error.`** The
token is fetched inside a custom `fetch`, so the OpenAI SDK cannot tell an
`az login` that has lapsed from a socket that died and wraps both as
`APIConnectionError`. It cost three wrong diagnoses in one session. The fix is in
a package insurance and pharma also use, so it is its own change.

**The trace panel reports plumbing, not contribution.** [`NEXT.md`](NEXT.md) §2.

**`walk-angle` cannot be closed.** Its part numbers appear in **one file out of
1,069**. A corpus gap, not a pipeline one.

**The eval suite is lopsided** — ten checks for over-confidence, one for
over-caution. Admitted in `eval/severity/assessment-severity.ts`. The 23
refusals make this the interesting direction, not the safe one.

---

## Resuming

```bash
pnpm steering:assess-all          # free — where the bid stands, spends nothing
pnpm steering:summarise --dry-run # free — the roll-up, every number, no model
```

Then [`NEXT.md`](NEXT.md) §0 — the pricing refusal — which is now the most
valuable thing on the board by some way.

---

## The rules this engagement keeps re-teaching

**A red check is a hypothesis about the check first.** Three times it was the
check: a Zod-3 field read against Zod 4, an assertion counting rejected rows to
prove something about stored ones, and a metric that punished the behaviour it
existed to reward. All three looked exactly like the model failing.

**A green suite is not proof either.** 15/15 with zero flakes hid two behaviours
worth changing, both found by reading the fifteen answers rather than the
summary.

**A required field a model cannot source is a field it will fabricate.** It wrote
citation line `1` four times out of five because no line was available. The fix
was never the prompt — it was supplying the value. Pharma learned the same thing
from an invented regulatory deadline.

**An error message names a layer; it does not identify one.** `Connection error.`
was an expired `az login`. Before that, a silently lost history row looked like
bad payload bytes and was a dead socket. Both were settled by dumping the error's
`cause` chain or running one query by hand — never by reading the message.

**A swallowed error is a bill you pay later.** `recordAssessment` caught
everything and said nothing, which is right for a web request and wrong inside a
batch: an assessment was produced, paid for, and lost, and the only evidence was
a work list that would not get shorter. It now reports without throwing.

**Watch it run.** Every real problem in this engagement — the rate limits, the
turn cap, the fabricated lines, the cost line that said zero, the cross-programme
noise, the lost row, and the twenty-three refusals — came from watching a run.
The code review found none of them.
