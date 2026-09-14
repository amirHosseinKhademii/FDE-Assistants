# Eval baseline

The number this suite reports is only worth quoting if it was measured the same
way twice. This file records how, when, and against what.

Companion to [`PROGRESS.md`](../PROGRESS.md) (why the system is shaped the
way it is) and [`README.md`](../../README.md) (how to run it).

---

## How to run

```bash
FIXTURE_MODE=record pnpm eval        # the baseline command: 7 cases x 5 runs
pnpm eval --only cov-003             # one case, still 5 runs
pnpm eval --tag conflict             # a themed batch
pnpm eval:smoke                      # --repeat 1, a smoke test, NOT a number

pnpm eval:history                    # every baseline on disk, one row each
pnpm eval:diff                       # the two newest, per case
pnpm eval:diff <before> <after>      # any two, by filename or path
```

The last two read baselines already on disk and call nothing, so they are free,
instant, and work with no server running — which is why they are kept even now
that there is a dashboard.

The dashboard is **Langfuse, self-hosted** (`docker compose -f
infra/docker-compose.langfuse.yml up -d`, then three lines in `.env`). Every case run
becomes a trace carrying its input, output, per-check scores and a categorical
severity. Baseline runs (`--repeat > 1`) are additionally linked to a dataset
item under a run name identical to the baseline filename; a `--repeat 1` smoke
test writes no baseline and gets no named run, so the dashboard never shows a
run with no counterpart in git. Langfuse's *own* eval runner is not used — 50-way default concurrency
against deliberately serial repeats, and no repeat count in its experiment
parameters. See `GUIDE.md` §6.

Unset `LANGFUSE_*` and the suite behaves exactly as it always has.

Both share one classifier with the runner
(`packages/insurance/src/eval/scorecard.ts`). That is not tidiness: two copies of
the severity rules drift, and a drifted classifier makes the history lie in the
worst available way — a "false answers 0 → 2" line that reflects a change in the
*classifier* rather than in the model. The extraction is shown faithful rather
than asserted: `eval:history` recomputes all six historical baselines from their
raw runs and reproduces every number already written by hand in this file.

**Every case runs 5 times and the card reports a pass rate.** A suite run once
is a sample, not a measurement: a 6-case suite with two ~20%-flaky cases reports
anywhere from 4/6 to 6/6 with nothing having changed. `--repeat 1` prints a
warning saying so, because a single green run is the easiest number in this repo
to quote by accident.

Repeats are serial. The Foundry resource is shared with `../Travel-Assistant`
(PROGRESS.md issue #6) and parallel runs would race the same rate limit.

**A one-run difference between two baselines is not a result.** `eval:diff`
prints it as MOVED and never as a regression, and never fails CI on it. This is
the §10.7 lesson made mechanical: a run that read as a regression at 28/35 with
two flaky cases turned out to be sampling noise, and a report that paints every
wobble red gets muted within a week. `eval:diff` also **refuses outright**
(exit 2) to compare two runs made with a different model, fixture mode or repeat
count — that difference measures the setup, not the change, and a warning
printed above a tidy table gets scrolled past while the number underneath gets
quoted.

A CI workflow for this exists at `.github/workflows/evals.yml` — on demand and
nightly, never on push, because the suite calls the real model and takes ~20
minutes of paid time, and the nightly run is there to catch the model changing
underneath us rather than to catch our own commits. It has **never been run**:
the repo has no remote yet and none of the Azure federation is configured. See
PROGRESS.md §12.5 for the prerequisites.

## Fixtures cover lookups only

`FIXTURE_MODE=record|replay|off` wraps **`get_policyholder` only**. `search_policy`
always runs live.

A fixture is filed under a hash of the tool's exact arguments. `get_policyholder`
takes a policy id — six ids, six files, reused every run. `search_policy` takes a
query the **model** writes, and it rewrites it every time; five runs of `cov-003`
produced five different queries all asking the same thing. Across the baseline,
~59 searches wrote 58 new files. A hit rate of about zero, a directory that grows
forever, and none of the attribution fixtures exist for — they cannot hold
retrieval still if the query never repeats.

So search is unfixtured and the 90 accumulated files were deleted (2026-09-05).
The six lookup fixtures come back on the next `FIXTURE_MODE=record` run.

**Cost of that:** retrieval is no longer held still between runs, so a moving
score cannot be cleanly attributed to your change. That is a real loss, recorded
as issue #6b. The fix, when it is worth doing, is to key on `(case id, call
index)` — "cov-003's second search" — which is the same slot every run whatever
the wording. Keying on free text the model authors was never going to work.

Green means **every case passed every run**. A case at 4/5 is not green — a
threshold below 1.0 would quietly re-admit the flakiness this pillar exists to
surface.

---

## Baseline — 2026-09-06, the framework migration (current)

Pillars 1 and 2 moved onto frameworks (LangChain.js + pgvector; OpenAI Agents
SDK). The question this set of runs exists to answer is not "is the framework
good" but **"did the swap change behaviour"** — and the only honest way to
answer it was to run all four combinations rather than the one that mattered.

| loop | retrieval | runs | green | flaky | p95 | log |
|---|---|---|---|---|---|---|
| hand-rolled | hand-rolled | 30/35 | 6/7 | 0 | 46.6s | 2026-09-05, below |
| **Agents SDK** | hand-rolled | 28/35 | 4/7 | **2** | 67.2s | `sdk-baseline.log` |
| hand-rolled | **LangChain** | 30/35 | 6/7 | 0 | 50.4s | `pillar1-langchain.log` |
| **Agents SDK** | **LangChain** | **30/35** | **6/7** | **0** | 49.5s | `final-sdk-langchain.log` |
| + **Zod schemas** (pillar 3) | LangChain | **30/35** | **6/7** | **0** | **41.2s** | `zod-baseline.log` |

Pillar 3 moved to Zod afterwards — output schema and tool parameter schemas —
and scored 30/35 with zero flaky again, so all three framework adoptions are
individually measured neutral.

Per case in the current configuration:

```
cov-001 5/5   cov-002 5/5   cov-003 0/5   cov-004 5/5
cov-005 5/5   cov-006 5/5   cov-007 5/5

30/35 runs    6/7 cases green    0 flaky    p95 41.2s    596k in / 78k out
```

`cov-003` is issue #3c and is unchanged by any of this — it is a check we wrote
that rejects a correct denial. Every other case is 5/5 in three of the four
configurations.

### Why the second row is not a regression

It looked like one. Two fewer passes, 44% worse p95, and **two flaky cases where
there had been none** — and §5.8 of PROGRESS.md argues zero-flaky matters more
than the raw score, because it is what makes a disagreement diagnosable. On that
row alone the correct-sounding conclusion was "the SDK is worse, do not adopt."

Running the other two cells is what settled it:

- **Retrieval is provably neutral.** Rows 1 and 3 agree exactly, so the swap
  from a hand-rolled cosine loop to LangChain/pgvector changed nothing.
- **Therefore row 2 cannot be blamed on retrieval either**, and the two cases
  that were flaky there — `cov-004` and `cov-005` — are 5/5 in row 4.
- **The latency agrees.** 67.2s against 46.6 / 50.4 / 49.5 is the shape of two
  slow outliers in a 35-run sample, not a systematically slower loop.

Verdict: **sampling noise.** Stated as a judgement rather than a proof — three
of four cells agree and the suspect cases now pass consistently, which is enough
to proceed. The hand-rolled loop is kept unbuilt in
[`archive/pillar-2-handrolled/`](../../archive/README.md) as the thing to diff
against if either case goes flaky again.

### The generalisation, which is this file's own lesson one level up

This file already opens with *"a suite run once is a sample, not a
measurement."* Row 2 is the same mistake at the next level: **a suite run once
against one configuration is also a sample.** A 35-run suite is enough to
measure a case's pass rate and not enough, on its own, to attribute a two-run
difference between two configurations.

The fix cost twenty minutes of extra runs and turned "the framework made it
worse" into "the framework is neutral." Cheap, next to abandoning a migration
that was fine.

### Retrieval equivalence, checked directly

Independently of the scorecard, the swap was verified at the retrieval layer.
Chunk counts at four hostile budgets are byte-identical before and after
(128 / 205 / 573 / 805, orphans 0), and the measured scores from PROGRESS.md
§2.4 reproduce exactly:

```
0.569  PA-2023-01     > Part IV > 4.4 Rental Reimbursement
0.562  PA-2021-07     > Part IV > 4.4 Rental Reimbursement
0.559  PA-2023-01-CA  > Part IV > 4.4 Rental Reimbursement
0.559  PA-2022-04     > Part IV > 4.4 Rental Reimbursement
0.550  PA-2023-01-FL  > Part IV > 4.4 Rental Reimbursement
```

That check is worth more than the eval numbers for this particular change: it
isolates the layer that moved, where the scorecard measures the whole system.

---

## Baseline — 2026-09-05, run 2 (superseded by the migration above)

Taken after both harness fixes below, with search unfixtured. **This is the
baseline to compare against.**

```
model      gpt-5-mini
fixtures   record (lookups only)
repeat     5   (7 cases x 5 = 35 runs)
evidence   evals/results/baseline-2026-09-05T20-14-55-134Z.json
```

| case | rate | reading |
|---|---|---|
| `cov-001` | **5/5** | endorsement attached, $50/21 |
| `cov-002` | **5/5** | was 2/5 — the `citations_resolve` fix landed |
| `cov-003` | **0/5** | **our check is wrong again — see below** |
| `cov-004` | **5/5** | unresolvable conflict, flagged and escalated |
| `cov-005` | **5/5** | Texas near-duplicate |
| `cov-006` | **5/5** | missing record, escalated |
| `cov-007` | **5/5** | new control for cov-001; base form governs, $40/30 |

```
runs passed               : 30/35
cases green (N/N)         : 6/7
cases flaky               : 0        <- nothing flaky at all this run
false answers (dangerous) : 5 of 35 runs   (all cov-003 — miscategorised, see below)
over-caution (annoying)   : 0 of 35 runs
no answer (infra/budget)  : 0 of 35 runs
missing fixture (infra)   : 0 of 35 runs
UNCATEGORISED             : 0 of 35 runs
tokens                    : 550,584 in / 112,858 out
p95 latency               : 46.6s over 35 runs
```

### What moved

| | run 1 | run 2 |
|---|---|---|
| `cov-002` | 2/5 | **5/5** — `citations_resolve` now accepts filenames |
| `cov-003` | 4/5 (wrong expectation) | 0/5 (rewritten as a denial case, new check too strict) |
| `cov-007` | — | **5/5** — new, takes over as cov-001's control |
| flaky cases | 2 | **0** |

**Zero flaky cases.** Every case is now 5/5 or 0/5. That is worth more than the
headline number: consistent behaviour is diagnosable, and every remaining
disagreement is between us and the assistant, not noise.

Second latency outlier observed: `cov-004` run 1 at **209s** against ~30s for
its siblings. That is two outliers in two baselines (335.6s previously), both on
different cases. No longer dismissable as a one-off — issue #4.

### `cov-003` 0/5 — the third wrong check in a row, and this one is mine

`cov-003` was rewritten this session into a denial case: AUT-4472 never bought
rental reimbursement, so the right answer is "no rental benefit on this policy."
I added `answer_lacks:$40` to it, reasoning that handing an adjuster a figure
for coverage the customer cannot claim is how a wrong number reaches a customer.

All five runs got the substance right and all five failed that check:

```
"AUT-4472 does not include Rental Reimbursement — it is not selected on the
 Declarations, so no rental reimbursement will be paid under this policy"

"None on this policy. Rental Reimbursement is not selected on AUT-4472, so no
 per-day rental reimbursement is payable. (For reference: the PA-2023-01 …)"

"1) None — this policy (AUT-4472) does not include Rental Reimbursement.
 2) (If it had been purchased) the PA-2023-01 form provides $40 per day …"
```

Every answer denies first, unambiguously, and only then adds the base-form
figure clearly marked as counterfactual. That is defensible adjuster behaviour —
arguably better than a bare denial, since it tells Priya what the customer would
have had. `answer_lacks` does a substring match and cannot tell "the answer is
$40" from "if she had bought it, it would be $40."

**This is a genuine product decision, not a bug**: may a denial cite the figure
the customer does not get, if it is labelled hypothetical? In a claims context
there is a real argument either way, and it belongs to the case author.

Tracked as issue #3c. The pattern is now three for three — see *Reading the
card*.

---

## Baseline — 2026-09-05, run 1 (superseded)

Taken **before** search fixtures were dropped, so the retrieval behind these
numbers came from recorded files on some calls and live search on others. It
stands as the baseline; the next one will be entirely live search.

```
model      gpt-5-mini
fixtures   record
repeat     5   (6 cases x 5 = 30 runs)
evidence   evals/results/baseline-2026-09-05T19-39-45-539Z.json
```

| case | rate | failing check | reading |
|---|---|---|---|
| `cov-001` | **5/5** | — | was the "known failure"; clean at `maxTurns: 12` |
| `cov-002` | **2/5** | `citations_resolve` 3/5 | **check bug, not a model failure** — see below |
| `cov-003` | **4/5** | `cites_form` / `answer_contains` 1/5 | **the case is miswritten** — see below |
| `cov-004` | **5/5** | — | the unresolvable conflict, flagged and escalated every run |
| `cov-005` | **5/5** | — | Texas near-duplicate, never confused with the national form |
| `cov-006` | **5/5** | — | missing record, escalated every run, never inferred |

```
runs passed               : 26/30
cases green (N/N)         : 4/6
cases flaky               : 2   cov-002:2/5  cov-003:4/5
false answers (dangerous) : 3 of 30 runs   (all cov-002 — see the caveat)
over-caution (annoying)   : 0 of 30 runs
no answer (infra/budget)  : 0 of 30 runs
missing fixture (infra)   : 0 of 30 runs
UNCATEGORISED             : 1 of 30 runs   cov-003#5
tokens                    : 497,399 in / 71,887 out
p95 latency               : 48.7s over 30 runs
```

One latency outlier worth not averaging away: `cov-002` run 3 took **335.6s**
against ~40s for its four siblings. One occurrence in 30 — watch it, do not act
on it yet.

Those four categories sum to 3, and 4 runs failed. The missing one is
`cov-003#5`, which failed `cites_form` and `answer_contains` — checks no
severity rule matched, so it fell through all four buckets and vanished from the
accounting. That leak is now printed as **UNCATEGORISED** (see *Reading the
card*), and the run it swallowed turned out to be the most informative one here.

### What changed to get here, and what each change is actually responsible for

Two changes: `--repeat` (default 5), and `maxTurns` 8 -> 12 as
`DEFAULT_MAX_TURNS` in `packages/insurance/src/tools/loop.types.ts`, shared by
`pnpm ask` and `pnpm eval`
so the eval genuinely takes the path a real request takes.

Which change gets credit for which result is worth being exact about, because
the turn counts settle it and the obvious story is wrong:

| case | turns/run | cap ever bit? | what moved it |
|---|---|---|---|
| `cov-001` | **4** every run | no — 4 < 8 | nothing. See below |
| `cov-002` | 6–9 | **yes**, previously died at 8 | `maxTurns` |
| `cov-003` | 2–3 | no | `--repeat` — 1 run in 5 diverges |

**`cov-001` is 5/5 and the cap is not why.** It used 4 turns in all five runs,
well inside the old cap of 8, so `maxTurns` cannot have been the mechanism. Its
lifetime record is now 1 failure in 11, and that one failure was a *manual* run
(PROGRESS.md §5.4), not necessarily this code path. The honest statement is
**unreproduced, cause unknown** — not "fixed."

`maxTurns` earns credit for exactly one thing: `no answer (infra/budget)` 1 ->
0, on `cov-002`. That did not make cov-002 pass; it made cov-002 fail
*informatively*, which is how the `citations_resolve` bug below became visible
at all.

`--repeat` earns `cov-003`. Its failure was hidden by the suite running each
case once, and nothing else would have surfaced it.

---

## The two failures, and why neither is the model

Recorded here rather than in the issue table because the point generalises: a
red check is a hypothesis, not a verdict. Both of these were read wrong at first
glance, and both would have sent someone editing the prompt.

### `cov-002` 2/5 — `citations_resolve` rejects citations of real documents

The three failing runs cited things like:

```
policy:auto-exclusions-schedule-2023.md#EXCLUSION B — TRANSPORTING GOODS …
policy:auto-pa-2023-01.md#Part IV — Physical Damage Coverage > 4.3 Schedule …
```

Both files exist. Nothing was fabricated. The check fails them because
`citationsResolve` runs `formIdOf()` over the citation string, and `formIdOf`'s
regex is uppercase-only (`P[APE]-…`), while filenames are lowercase — so *any*
filename-style citation is unresolvable, and
`auto-exclusions-schedule-2023.md` has no form id in its name at all. Its id
lives in its **heading** (`… (Attaches to PA-2023-01)`), which is what
`formIdOf` was written for.

So the check cannot express "the exclusions schedule" no matter what the model
emits — and PROGRESS.md issue #3 was logged as **low** on the belief that the
malformed `source` was cosmetic. It is not: it is the sole cause of a 3-in-5
failure, and it is currently being counted under **false answers (dangerous)**,
the most serious category on the card.

The check's own doc comment says it is "deliberately lenient" about formatting.
The leniency covers the part after the `#` and not the part before it.

Not fixed here. Whether the fix belongs in the checker (resolve filenames too),
in the prompt (emit `policy:PA-2023-01#…`), or in a normaliser is a judgment
call, and the `escalates` check — the thing cov-002 actually exists to guard —
passed on all five runs.

### `cov-003` 4/5 — the one "failing" run is the correct one

`examples/policyholders/AUT-4472.md`:

```
| Rental Reimbursement | no       | none |
```

Rental reimbursement is **not selected** on AUT-4472. The case expects
`$40/day, 30 days` cited to `PA-2023-01`. The single "failing" run answered:

> None. Rental Reimbursement is not selected on policy AUT-4472, so there is no
> per-day amount or days of rental coverage available under this policy.

That is right. The four runs that "passed" quoted the base form's schedule
without checking whether the customer bought the coverage — the exact failure
`PE-2023-01`'s optional-rental trap was planted to catch (PROGRESS.md §8.4
item 3), scoring green four times out of five.

This matters more than a wrong expectation on one case, because **`cov-003` is
the control for `cov-001`**. A miswritten control is worse than no control: it
certifies that a fix did not over-correct, using a target that was never
correct.

Left for the case author (PROGRESS.md §9 puts case authorship in the user's
column). The shape of the fix is a decision, not a typo: either `cov-003`'s
expected answer becomes "not selected, no coverage" — which changes what
`cov-001` is a control *against* — or `cov-003` is retired and a new record with
`rental: yes, no endorsement` takes over the control role.

---

## Reading the card

Failure types are reported separately and never averaged (`GUIDE.md` §6). They
are not the same severity and each needs a different response:

| category | means | fix lives in |
|---|---|---|
| **false answer** (dangerous) | asserted something unverified, or cited a source that does not resolve | prompt / retrieval |
| **over-caution** (annoying) | escalated something it could have handled | prompt |
| **no answer** (infra/budget) | turn cap, schema failure, threw | config |
| **missing fixture** (infra) | a `replay` run took a tool path never recorded | re-record, then re-read |
| **UNCATEGORISED** | failed, but matched no rule above | the category rules — classify it before reading the card |

The last two are **not evidence about the model** and must never be averaged
into a pass rate. Both categories exist because the mistake was made once: the
first scorecard filed a `max_turns` timeout as a false answer, which is a
misdiagnosis that sends you rewriting a prompt when the fix was a number in a
config. `missing fixture` was added pre-emptively so replay mode cannot
reproduce that error one level down.

The `cov-002` finding above shows the categories are necessary but not
sufficient: a check can be wrong, and a wrong check reports in the most alarming
category available to it.

**Three for three.** Every failure this suite has produced since it started
being run properly has been ours, not the assistant's:

| what looked broken | what was actually broken |
|---|---|
| `cov-002` 2/5 | the citation checker rejected real documents |
| `cov-003` 4/5 | the case expected the wrong answer |
| `cov-003` 0/5 | the replacement check was too strict |

Not a claim that the assistant is right and the tests are wrong — it is what
happens when a suite is young. Test code gets none of the scrutiny the system
under test gets, and it is the only code where a bug looks like a result.
**Before changing the assistant, confirm the failure is real.** So far, none
have been.

**UNCATEGORISED** exists because the buckets are pattern rules over check names,
and a check name no rule mentions falls through all of them silently. The first
version of the card did exactly that to `cov-003#5`. The fix is deliberately not
a wider pattern — guessing which severity an unmatched check implies is how the
§5.5 misfiling happened in the first place. Better to say "I do not know what
this is" loudly. Before quoting any card: the five counts must sum to
`runs - passed`.

## Counts are in runs, not cases

With repeats, one case can land in two categories across its five samples.
Reporting per-case would force a choice between them and lose the fact that it
does both. So the card reads `3 of 30 runs`, and the denominator is always
printed.
