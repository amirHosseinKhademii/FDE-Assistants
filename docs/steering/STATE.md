# Where steering stands — a handover

*Written 2026-09-13, end of session. Read this first when coming back cold; it
says what exists, what it proved, what is unfinished, and which command to run
next. Every claim here is from a check that ran, not from intention.*

---

## The one-paragraph version

Vantis Steering gave us **1,069 files and four databases**. The databases looked
like the finished job and were a cheat — generated alongside the documents, never
derived from them. That is now closed: everything the product reads is derived
from the files and sits in a fifth database, `vst_derived`. On top of it there is
a working agent that assesses one customer requirement, prices it from history,
refuses when the history is too thin, cites every claim to a file and a line, and
puts the genuinely contested questions to named people.

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

One requirement → search → price → a structured answer. ~46 s, 4 searches,
5 turns. Two tools: `search_documents` and `find_comparable_work`.

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

**Assessments made from the command line are now filed.** They were not before —
`assess_history` held one answered row, written by the web desk, after a day of
CLI runs. Everything else was printed and lost.

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

---

## Unfinished, honestly

**The eval has never been run.** Cases, checks and severity are built and
self-tested; there is no baseline. `asr-002` and `asr-003` have never executed —
if either goes red, it is genuinely unknown whether the case, the check or the
model is wrong. **That is the next command.**

**The programme filter is unused.** A real trace returned passages from six
programmes for a question about one. See [`NEXT.md`](NEXT.md) §1 — correctness,
not tidiness.

**The trace panel reports plumbing, not contribution.** [`NEXT.md`](NEXT.md) §2.

**`walk-angle` cannot be closed.** Its part numbers appear in **one file out of
1,069**. A corpus gap, not a pipeline one.

**The eval suite is lopsided** — ten checks for over-confidence, one for
over-caution. Admitted in `eval/severity/assessment-severity.ts`.

**Nothing is committed.**

---

## Resuming

```bash
pnpm steering:eval-smoke        # 3 cases x 1 run — a smoke test, NOT a scorecard
pnpm steering:eval              # 3 x 5 = 15 loops, writes a baseline
```

Then [`NEXT.md`](NEXT.md) §1 — the programme filter — which is the cheapest real
improvement on the board.

---

## The three rules this session kept re-teaching

**A red check is a hypothesis about the check first.** Three times it was the
check: a Zod-3 field read against Zod 4, an assertion counting rejected rows to
prove something about stored ones, and a metric that punished the behaviour it
existed to reward. All three looked exactly like the model failing.

**A required field a model cannot source is a field it will fabricate.** It wrote
citation line `1` four times out of five because no line was available. The fix
was never the prompt — it was supplying the value. Pharma learned the same thing
from an invented regulatory deadline.

**Watch it run.** Every real problem this session — the rate limits, the turn
cap, the fabricated lines, the cost line that said zero, the cross-programme
noise — came from watching a run, not from reading the code. The code review
found none of them.
