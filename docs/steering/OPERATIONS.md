# Operations, for steering

*Written 2026-09-15. Five capabilities to learn and then build on this
engagement: an LLM cost autopilot, a semantic cache, catching model
regressions, failure forensics, and self-healing docs.*

*This is a **teaching document and a build plan in one file**. Each section
explains the idea in plain language first, says what the field actually does,
then says what this repo already has, what is missing, and the exact steps to
close it. Nothing here has been built yet except where a line says MEASURED.*

---

## How to read this file

### The two markers, and why they exist

`docs/steering/NEXT.md` sets the standard this repo is held to: *"Every claim
here is from a check that ran, not from intention."* Most of this file is
forward-looking, so every claim carries one of two markers:

```
  MEASURED — dated, with the command that produced it. Re-runnable.
  PROPOSED — does not exist. An argument, not a result.
```

A paragraph with neither marker is exposition — an explanation of how something
works in general, not a claim about this system.

This matters more than it looks. Section 5 builds a checker that verifies the
numbers in documents against the code that produces them. If PROPOSED numbers
were written the same way as MEASURED ones, that checker's first run would
report this file as 200 lines of drift. **Only MEASURED claims carry the
machine-readable marker** — see §5.

### Each section has the same six parts

| | |
|---|---|
| **In one paragraph** | What it is, with no jargon. |
| **The mental model** | The idea underneath, explained from scratch. |
| **What the field does** | Named techniques, tools, and the numbers published about them — so the vocabulary is the one an interviewer will use. |
| **What we already have** | MEASURED, with `file:line`. Usually more than expected. |
| **The build** | Numbered steps. Files, commands, code sketches. |
| **How we prove it** | The acceptance check. A capability with no measurement attached is a feature request, not an engineering result. |

Each section ends with **the interview answer** — the two or three sentences
that are worth saying out loud, and the follow-up question they invite.

**If you read nothing else**, read [If there is only an
afternoon](#if-there-is-only-an-afternoon) at the bottom: four items, the first
three of which change nothing about how the system behaves.

### What any of this costs to run

Free, offline, no model, no database:

```bash
pnpm steering:eval-history        # (after §0a) every baseline on disk
pnpm steering:eval-diff           # (after §0a) the newest two, compared
pnpm steering:why-unpriced        # re-reads stored traces, counts the estate
pnpm steering:assess-all          # the work list, spends nothing
pnpm steering:summarise --dry-run # every count, no model
pnpm steering:retrieval-scorer-check
```

Spends money: `steering:assess`, `steering:assess-all --run`, `steering:eval`,
`steering:retrieval-eval`, `steering:summarise`, `steering:index`.

---

## The five, and the order to build them in

The order is not the order they were listed in. It is the order in which each
one makes the next one possible.

| # | Capability | Depends on | Why here |
|---|---|---|---|
| **0** | *(prerequisites)* fixtures + a diff command | — | Two small gaps that block four of the five. |
| **1** | Catch model regressions | 0 | The safety net. Every capability below changes behaviour; without a net you cannot tell a saving from a breakage. |
| **2** | Failure forensics | 1 | You cannot fix what you cannot explain. This one attacks §0 — the engagement's live open problem — directly. |
| **3** | LLM cost autopilot | 1, 2 | Cost work trades quality for money. It is only safe once quality is measured (1) and failures are explicable (2). |
| **4** | Semantic cache | 1, 3 | A specific cost lever, and the riskiest. It can silently serve a wrong answer, which is exactly what 1 exists to catch. |
| **5** | Self-healing docs | — | Independent of the rest; can land at any time. Placed last because its best target is the numbers the four above produce. |

**The through-line, and it is the thing worth understanding.** Four of these
five are cost or reliability levers, and every one of them is a *trade*: money
for quality, speed for freshness, coverage for confidence. The only thing that
makes a trade an engineering decision rather than a gamble is a measurement of
both sides. That is why §1 is first and why every section here ends with an
acceptance check rather than a demo.

---

## §0 · Two prerequisites, and one is ten lines

*Both are small. Both are blocking. Do them before anything else in this file.*

### §0a · Steering had no `eval:diff` and no `eval:history` — BUILT 2026-09-15

**MEASURED — 2026-09-15**, `node -p` over the three engagements' package
manifests:

| engagement | `eval` | `eval:smoke` | `eval:diff` | `eval:history` |
|---|---|---|---|---|
| insurance | yes | yes | yes | yes |
| pharma | yes | yes | yes | yes |
| **steering** | yes | yes | **no** | **no** |

`@fde/evals` already exports `runDiff` and `runHistory`
(`packages/evals/src/index.ts:63-64`). Pharma's two wrappers are 36 and 26
lines, most of that header comment — the executable part is about a dozen lines
each (`apps/ai/pharma/src/eval/diff/diff.ts`, `history.ts`), and it does nothing
but say where the baselines live and what counts as dangerous. Steering has four
committed baselines in `docs/steering/evals/results/` that **nothing can read**.

This is the cheapest real win available in this repo, and it is a prerequisite
for §1, §3 and §4, all of which are measured as a before/after between two
baselines.

**BUILT 2026-09-15.** `apps/ai/steering/src/eval/diff/{diff,history}.ts`, plus
`steering:spend` — the by-surface and per-denominator figures §3 quotes are now
a command rather than a transcription. Verified: `steering:eval-history` prints
all four baselines, and `steering:eval-diff` reports the 21:22 → 22:23 move as
`MOVED up 1 run — inside the noise band, not a result` rather than as an
improvement, which is the behaviour the noise band exists for.

**What the build was.** Create `apps/ai/steering/src/eval/diff/diff.ts` and
`history.ts`, copying pharma's two files and changing three things: the results
directory to `docs/steering/evals/results`, the severity import to
`../severity/assessment-severity`, and the answer type to
`RequirementAssessment` from `../../schema/assessment-schema`. Add to
`apps/ai/steering/package.json`:

```json
"eval:diff":    "ts-node src/eval/diff/diff.ts",
"eval:history": "ts-node src/eval/diff/history.ts",
```

and to the root `package.json`:

```json
"steering:eval-diff":    "pnpm --filter @vantis/steering eval:diff",
"steering:eval-history": "pnpm --filter @vantis/steering eval:history",
```

**Acceptance.** `pnpm steering:eval-history` prints four rows without spending
anything. `pnpm steering:eval-diff` compares the newest two baselines.

**One thing to expect, so it is not read as a broken build.** All four committed
baselines are `fixtures: 'live'`, and §0b changes that. The first `eval-diff`
across that boundary will **exit 2** — correctly, because a live run and a
replay run are not the same measurement. **The first post-fixture baseline
starts a new comparable series**, and nothing recorded before it can be compared
to anything after. That is the setup-key guard doing its job, not a failure; it
is also a good argument for landing §0b immediately after §0a rather than
letting more incomparable baselines accumulate.

Expect the diff to **refuse** on some pairs, and that is the tool working:
`runDiff` exits 2 when two baselines differ in model, engine, fixture mode or
repeat count, because such a comparison measures the setup change and not the
code change (`packages/evals/src/diff.ts:74-110`).

### §0b · Nothing in steering is fixtured, and the eval says so

**MEASURED — baseline `2026-09-13T22-23-39-484Z`**: `fixtures: 'live'`,
hard-coded at `apps/ai/steering/src/eval/run.ts:164`, with `missingFixture:
false` written explicitly at every outcome site so that the compiler names each
one when fixtures arrive (`run.ts:53-55`, and again at `:94`).

**What a fixture is.** A recorded tool response, filed under a hash of the
arguments that produced it, replayed on later runs instead of calling the real
tool. `packages/agent/src/core/fixtures.ts` already implements this, with
`FIXTURE_MODE=record|replay|off`.

**What it buys, stated precisely, because it is easy to oversell.** That file's
own header makes the argument: it does **not** make eval runs free — the model
call dominates cost and latency and is still live. What it buys is
**attribution**. Retrieval returns byte-identical passages on every run, so when
the scorecard moves you know it was your change and not a re-indexed corpus or
a shifted embedding model. *"We went from 61% to 84%"* is only a meaningful
sentence if everything except your change was held still.

**And the trap it already fell into once, which decides the design here.**
Insurance fixtured both its tools and then un-fixtured search. A fixture is
keyed on a hash of the exact arguments; the model *writes* the search query, and
it writes a different one every time. Five runs of one case produced five
different queries all asking the same thing — five hashes, five files. Across
one baseline, ~59 searches produced 58 new files: a hit rate of about zero, an
unbounded directory, and none of the attribution the layer exists for
(`fixtures.ts:29-45`).

**So steering's two tools split, and the split is not a compromise:**

| tool | arguments | fixture? |
|---|---|---|
| `find_comparable_work` | structured — `change_class`, `element_kind`, `asil`, `safety_case_impact`, `tooling_required` | **yes.** A small, closed vocabulary; the same combinations recur across runs, so hashes collide the way a cache is supposed to. |
| `search_documents` | free text the model writes | **not on the arguments.** Key on `(case id, call index)` instead — the option insurance's `evals/README.md` left open and nobody has taken. |

**The build.**

1. `configureFixtures(resolve(REPO_ROOT, 'docs/steering/evals/fixtures'))` in
   `assess-requirement.ts`, beside the existing `configureRequestLog` import.
2. Wrap `findComparableWorkTool(handle)` in `fixtured()` at the `ToolRegistry`
   construction (`assess-requirement.ts:102`).
3. Record: `FIXTURE_MODE=record pnpm steering:eval`. Commit the directory —
   fixtures are reviewable by design, which is why each file stores its
   arguments next to the response.
4. Replace the two hard-coded `false` literals for `missingFixture` with the
   real value, and change `setup.fixtures` from the string `'live'` to the mode
   actually in force. **The type system will name every site that has to
   decide**, which is what `run.ts:53-55` predicted.
5. Leave `search_documents` live for now, and write down why in the file. A
   `(case id, call index)` key is a second piece of work; doing it badly
   produces the unbounded directory again.

**Acceptance.** `FIXTURE_MODE=replay pnpm steering:eval` runs the comparables
tool without touching Postgres, and a missing fixture is a hard error rather
than a silent live call — the rule at `fixtures.ts:104-108`. A test that quietly
hits the network when you thought it was replaying is worse than one that
fails: it passes, and you trust a number measured against something you did not
control.

---

## §1 · Catch model regressions

### In one paragraph

The model underneath this product is not yours and does not hold still. The
provider ships a new version, a deployment is repointed, a prompt is edited, a
tool's output format shifts — and the system quietly starts answering
differently. *Catching model regressions* means having a fixed set of questions
with known-good answers, running them on a schedule and before every change,
and being able to say — with a number, not an impression — whether behaviour got
worse, and by how much, and whether the difference is larger than the system's
own run-to-run noise.

### The mental model

Three things make this harder than ordinary regression testing, and all three
have to be handled or the suite lies to you.

**1. The system is not deterministic, so a single run is not a measurement.**
Ordinary tests are `expect(f(x)).toBe(y)` — run it twice, get the same answer.
A model does not work that way. `gpt-5-mini` takes no temperature parameter at
all, and even where temperature 0 is available it reduces variation rather than
removing it; providers do not guarantee determinism at zero. So the unit of
measurement is not a run, it is a **rate over N runs**. This repo's suite runs
each case five times by default, and `--repeat 1` is documented as a smoke test
that is explicitly *not* a scorecard number (`eval/run.ts:8-11`).

**2. A difference between two rates might be noise.** If a case goes 5/5 → 4/5,
that is one flipped coin. Calling it a regression sends someone to spend a day
investigating sampling variance — and this repo has the scar: PROGRESS.md §10.7
records exactly that day. So a **noise band** is required, and it has to widen
with the sample, or raising `--repeat` makes the tool *more* trigger-happy,
which is backwards (`packages/evals/src/diff.ts:41-54`).

**3. A comparison is only valid if everything except the change was held
still.** Compare a run on model A against a run on model B and you have
measured the model swap, not your prompt edit. Compare five repeats against
twenty and the bucket counts are not on the same scale. This is why
`@fde/evals` **refuses** the diff — exit 2, not a warning — when model, engine,
fixture mode or repeat count differ. A printed warning above a pretty table gets
scrolled past, and the number underneath it gets quoted.

The fourth idea, which this repo does not have yet and which the field has
converged on, is the **negative flip**: an item that was correct before the
change and is wrong after it. Aggregate accuracy can rise while negative flips
accumulate, and users only ever feel the flips — the thing that worked
yesterday and does not today. Aggregate-only reporting hides them by
construction.

### What the field does

- **Repeat sampling and majority scoring** — run each case N times, report a
  rate and a confidence interval; count a case as passing only on a strict
  majority. `pass@k` is the same statistical idea from code generation.
- **Statistical tests, chosen by metric type.** For binary pass/fail on the same
  items, **McNemar's test** — it looks only at *discordant pairs*, the items
  where the two versions disagree, because items both got right or both got
  wrong carry no information about which is better. Under the null hypothesis
  the discordant pairs should split evenly. Under ~10 discordant pairs, the
  exact binomial test. For continuous scores, a paired *t*-test; for anything
  else, a permutation test.
- **Negative-flip tracking** across model versions, reported alongside the
  aggregate.
- **LLM-as-judge, and its own flakiness.** A judge model inherits exactly the
  variance of the thing it grades — reported at 5–15% verdict flips on re-run.
  Using a stochastic judge as if it were a deterministic oracle is a named bug
  in most eval libraries. This repo dodges it: its checks are deterministic
  predicates over structured fields, not judge calls.
- **Tooling** — Braintrust, promptfoo, Langfuse, and CI-gated eval runs.

### What we already have — and it is most of the pillar

**MEASURED — baseline `2026-09-13T22-23-39-484Z`:** 15/15 runs green, 3 cases ×
5 repeats, 0 flaky, `gpt-5-mini` on the Agents SDK.

`@fde/evals` is 2,072 lines and already implements:

| | where |
|---|---|
| repeat runs, serial on purpose | `suite.ts` |
| per-case reports and severity buckets | `scorecard.ts` |
| committed baselines | `docs/steering/evals/results/` |
| setup-key refusal | `diff.ts:74-110` |
| noise band, derived from the repeat count | `diff.ts:41-54` |
| a classifier verifier — every check maps to a severity | `verify-classifier.ts` |
| retrieval scoring: recall@k, MRR | `retrieval.ts` |
| rate-limit pacing, and the lesson behind it | `eval/run.ts:99-136` |

Steering also has a **retrieval** suite, which most teams never build:

**MEASURED — `pnpm steering:retrieval-eval --both`, 2026-09-14:**

```
  arm        cases  recall@6   MRR
  baseline    6/8   0.813     0.692
  reranked    7/8   0.938     0.875
```

And the eval infrastructure has already found a real bug in shared code. Two of
the eight cases needed the keyword arm, and **RRF buried both**: a document the
keyword arm ranks *1st* and the dense arm misses entirely scores `1/61 =
0.0164`, while a document *both* arms rank 50th scores `2/110 = 0.0182`. The
worse document wins. That affects insurance and pharma identically, because
`hybridSearch` is `@fde/grounding`.

### The gap

| gap | why it matters |
|---|---|
| **3 cases.** | The suite covers the assessment loop and nothing else. `summarise-bid` and `explain-assessment` both call the model and neither is in a suite. |
| **`fixtures: live`.** | §0b. Not reproducible offline; a moved number cannot be attributed. |
| **No diff command.** | §0a. Four baselines nothing can read. |
| **No model-swap protocol.** | The literal job named in this section's title. `runDiff` refuses across models — correctly — so there is *no* supported way to answer "did upgrading break anything". |
| **No negative-flip reporting.** | The scorecard reports totals per case; nothing names the specific runs that flipped. |
| **No CI gate.** | Every check is run by hand. |

### The build

**Step 1 — do §0a and §0b.** Everything below assumes both.

**Step 2 — grow the suite from 3 cases to 10, chosen from §0's evidence, not
from imagination.** This is the step most people do worst: they write cases for
the paths that work. The 24-requirement bid run handed us a ready-made list of
the paths that do not.

| new case | why | asserts |
|---|---|---|
| one of `CR-K2-0105/0106/0109/0112/0114/0123/0124` | the seven that never called the pricing tool at all | `callsTool('find_comparable_work')` — already exported by `@fde/evals` (`checks.ts`) |
| `CR-K2-0124` | the only `have_it` in 24 | `finding:have_it` |
| `CR-K2-0111` | the only requirement carrying a price | a price is present and cites ≥3 jobs |
| a refusal case | 13 of 24 | the refusal *sentence* — see §2, this is the one that will change |
| a free-typed requirement with no `ref` | the desk allows it; nothing tests it | no crash, no invented `requirement_ref` |

**And stage the growth, because §3 has already named the suite as the expensive
thing.** **MEASURED — 2026-09-15:** 91 eval runs cost $1.6897, about **$0.0186 a
run**. Today's suite is 3 cases × 5 repeats = 15 runs ≈ **$0.28**. Ten cases
would be 50 runs ≈ **$0.93** — a 3.3× increase in the single largest line of
steering's spend. That is affordable and it is not free, so go **3 → 6 → 10**,
adding the seven-that-never-asked case and the priced case first, because those
two cover the failure classes §2 is about to work on. Land §0b before the last
step: fixtures do not make the model call free, but they make each added case
worth what it costs by making its movement attributable.

**Step 3 — negative flips in the diff.** `runDiff` already loads both baselines
and walks per-case runs. Add a per-case line naming the runs that changed
direction:

```
  asr-002    4/5 → 4/5   ·  1 flip out of 5  (run 3 passed → failed: citations_resolve)
```

A case at the same rate with flips inside it is a different system from one that
is genuinely stable, and today they print identically.

**Step 4 — the model-swap protocol, which is a design decision and not a
script.** `runDiff` refuses across models on purpose, and that refusal must not
be weakened. So a swap gets its **own** comparison, with its own name, that is
honest about measuring the setup:

```bash
pnpm steering:model-compare <baseline-A> <baseline-B>
```

It prints what `runDiff` prints, plus:

- the **discordant pairs only** — cases where A and B disagree — because
  concordant cases carry no evidence either way;
- **McNemar's exact test** over those pairs at small N, with the *p* value and
  the honest sentence when N is small: *"3 discordant pairs — this cannot
  distinguish a regression from noise. Raise `--repeat` or add cases."*
- **cost and latency deltas**, from `logs/requests.jsonl`, because a model swap
  is always a three-way trade and reporting only quality hides two thirds of it.

It must never print `PASS`/`FAIL`. A model swap is a judgement someone makes
with a number in hand, not a gate.

**Step 5 — a CI gate on the free checks only.** Every `*:check` in steering is
offline and costs nothing: `schema:check`, `severity:check`, `checks:check`,
`sql:check`, `retrieval-scorer:check`, `code-chunk:check`, `summary:check`,
`comparables:check`, `search-tool:check`, `walk:check`, `derived:boundary-check`,
plus `leak:check` and `typecheck`. Those belong in CI on every push. The
model-spending evals do not — they go on a manual trigger, and the baseline is
committed by a human who looked at it.

### How we prove it

1. `FIXTURE_MODE=replay pnpm steering:eval` twice in a row, same setup. The two
   baselines should differ only in the ways the model can vary. `pnpm
   steering:eval-diff` prints `MOVED` at most, never `REGRESSION`. **If it
   prints a regression on an unchanged system, the noise band is wrong** — and
   finding that out now is the entire point of running it twice.
2. `pnpm steering:eval-diff <an-old-baseline> <a-new-one>` across a deliberate
   prompt change, and the moved cases are the ones you expected.
3. A deliberately sabotaged check — flip one predicate — and the suite goes red
   in the bucket you predicted. This repo does this already in two places
   (`sabotage:check`, and the leak checker plants a synthetic leak and asserts
   it catches its own plant), and that pattern is the reason to trust them.

### The interview answer

> We ran each case five times, not once, because the system is not
> deterministic — `gpt-5-mini` takes no temperature parameter, and four
> consecutive runs of the same requirement made 4, 6, 7 and 8 searches. Then the
> diff tool refuses to compare two baselines made with a different model,
> fixture mode or repeat count, because that measures the setup change and not
> yours. And a single-run move inside a five-run sample prints as MOVED, never
> as a regression — we have a day in the log that went to investigating a coin
> flip, and a tool that renders every wobble in red teaches everyone to ignore
> it.

The follow-up is always *"so how do you ever compare two models?"* — and the
answer is §1 step 4: a separate command, discordant pairs only, McNemar, cost
and latency printed alongside, and no pass/fail verdict.

---

## §2 · Failure forensics

### In one paragraph

When the system produces a bad answer, *forensics* is the ability to go back
afterwards and say exactly why — which passages it retrieved and at what rank,
what it asked its tools and what came back, what the model actually emitted,
where the schema rejected it, and which of those was the first thing to go
wrong. Without it, every failure investigation starts by re-running the question
and hoping it fails the same way.

### The mental model

**A failure has a first cause, and it is usually several steps upstream of where
you noticed.** An assessment that refuses to price could be: retrieval never
returned the document (a retrieval failure), or returned it at rank 35 below the
context cut (a ranking failure), or the model read it and chose a filter that
matches nothing (a reasoning failure), or the tool answered correctly and the
prompt gave the model no path to recover (a prompt failure). **Those four need
four different fixes**, and from the outside they look identical: no price.

**So forensics is a classification problem before it is a debugging problem.**
The output is not "here's the bug" — it is *which kind* of failure this is, and
crucially, **how many of each kind you have**. One instance is an anecdote. A
bucket count is a work plan.

**And the record has to be captured at the time.** A trace you did not keep is a
trace you cannot analyse. This is the same argument `@fde/telemetry`'s header
makes about the request log: *"the calls that already happened are gone, and no
amount of later tooling brings them back. A dashboard is something you add on
top of a durable log, never instead of one."*

### What the field does

- **MAST** — the Multi-Agent System Failure Taxonomy: 14 failure modes in 3
  categories (specification and system design, inter-agent misalignment, task
  verification), built from 150 hand-annotated traces at inter-annotator
  κ = 0.88, with 1,600+ annotated traces released. The point is not the specific
  14; it is that failures cluster into a small number of kinds and counting them
  is what tells you where to spend.
- **TRAIL** — trace-based localisation: given an annotated trace, name the step
  or component responsible.
- **Deterministic replay / time-travel debugging** — record every model call,
  tool response and routing decision to a trace file; replay with stubs for zero
  cost, or replay to step N then go live. "VCR for agents."
- **OpenTelemetry GenAI semantic conventions** — the standard attribute names:
  `gen_ai.*` for model, token counts, finish reason, spans for tool executions,
  agent runs, retrieval operations. Experimental as of 2026 but converging, and
  worth naming in an interview because it is the answer to "how do you avoid
  vendor lock-in on observability." Note its content-capture design: prompts go
  in **span events**, not attributes, so a Collector can drop them without an
  application change — a PII control, and directly relevant to
  `DATA-RESIDENCY.md`.

### What we already have — including one genuinely excellent piece

**MEASURED — `pnpm steering:why-unpriced`, 2026-09-14.** This repo has already
built a domain-specific forensics tool, and it works. It re-reads the
`find_comparable_work` calls stored in `assess_history.trace`, counts each key
against the estate, and for every refusal prints what the estate carries beside
the value the agent chose. Free, no model, re-runnable. Its output **is** a
failure taxonomy:

| count | bucket | whose fault |
|---|---|---|
| 13 | asked, understood, too few comparable jobs | the **estate** |
| 7 | never called the pricing tool at all | the **prompt** — entirely ours |
| 4 | called it, arguments not kept by the trace | **unknowable** |
| 0 | asked with a value no document uses | no vocabulary mismatch at all |

And it produced the decisive number, which no amount of reading single traces
would have: **12 of 13 refusals were not one field away from an answer.**
Dropping any single filter would have rescued at most one. That settles a fork
that had been open for a day — the agent is *not* over-constraining; Vantis has
booked exactly two validation-only mechanical jobs, ever. The fix is **the
sentence, not the filter**: *"we have never done this kind of work"* is a
finding a bid meeting can act on, *"your filter matched 0"* reads like a tooling
failure and gets ignored.

That is what good forensics produces — a reclassification of the problem, not a
patch.

Also present: `logs/requests.jsonl` with `stoppedBecause`, `schemaRetries`,
`turns`, `toolCalls`, `ms` and per-request cost on every line; `--trace` on
`steering:assess`; `assess_history` in `vst_derived` with the answer body; and
`infra/docker-compose.langfuse.yml`.

### The gap, and the first one is a live defect

**MEASURED — 2026-09-14. `assess_history.trace` holds two incompatible shapes.**
The CLI files `result.turns` — `TurnRecord[]`, carrying each call's arguments
and full result (`apps/ai/steering/src/cli/file-assessment.ts:79`). The web desk
files `events` — `LoopEvent[]`, carrying a tool name, a timing and a one-line
summary, and **no arguments**. Nothing documents this and nothing asserts it.

The consequence, and it is the best argument for this whole section: the first
version of `why-unpriced` read only the turn shape, found no tool calls in any
desk row, and **was about to report `CR-K2-0111` — the one requirement in the
bid carrying a price — as having invented it.** It had called the pricing tool
three times. A column holding two structures with no discriminator is a trap for
everything that reads it later.

The other gaps:

| gap | consequence |
|---|---|
| **retrieval is not captured** | Which passages came back, at what rank and score, is gone the moment the turn ends. §0b measured a case where *only 50% of the expected labels were in the top-50 pool at all* — a retrieval failure, not a ranking one — and that distinction is invisible in a stored trace today. |
| **no run id** | `logs/requests.jsonl`, `assess_history` and any eval outcome cannot be joined. Three records of one event, no key. |
| **`schemaRetries` is a count, not a record** | You know the model was rejected twice. Not what it emitted, nor which field failed. |
| **no replay** | Reproducing a failure means paying for it again, and getting a different failure. |

### The build

**Step 1 — one run id, threaded everywhere.** A ULID generated at the top of
`assessRequirement`, carried into `logRequest` (add `runId` to `RequestRecord`),
into the `assess_history` row, and into the eval outcome. Nothing else in this
section is possible without it, and it is an afternoon.

**Step 2 — fix the two-shape defect, and assert it.** File `result.turns` from
the app as the CLI does, and add a `steering:trace-check` that reads every
`assess_history` row and fails if any does not parse as `TurnRecord[]`. Two
independent fixes; do both. *This is the one item here that is a correctness bug
rather than a new capability — it goes first, with step 1.*

**Step 3 — the run bundle.** One JSON file per run at
`logs/runs/<runId>.json`, written by the same never-throws discipline as the
request log:

```ts
interface RunBundle {
  runId: string;
  at: string;
  subject: string | null;        // the requirement ref
  model: string; engine: string; provider: 'azure' | 'bedrock';
  promptVersion: string;         // §5 gives this a source of truth
  corpusFingerprint: string;     // §4 needs this; see db/seed/fingerprint.ts
  turns: TurnRecord[];           // arguments AND results, the CLI shape
  retrieval: {                   // THE NEW THING
    turn: number;
    query: string;
    hits: { id: string; label: string; score: number;
            denseRank: number | null; sparseRank: number | null;
            foundBy: 'dense' | 'keywords' | 'both' }[];
  }[];
  schemaFailures: { attempt: number; raw: string; errors: string[] }[];
  outcome: 'answered' | 'refused' | 'failed';
  costUsd: number | null;
}
```

The `denseRank` / `sparseRank` / `foundBy` fields are not speculative — the
retrieval eval already computes them, and they are what turned "the reranker
helped" into the RRF finding in §0b. Capturing them on **every** run, not just
eval runs, is what makes a production failure diagnosable.

**Step 4 — `pnpm steering:forensics <runId>`.** Free, offline, reads the bundle:

```
  CR-K2-0109   refused · 55.2s · $0.019 · 7 turns · 4 tool calls
  ─────────────────────────────────────────────────────────────
  FIRST DIVERGENCE   turn 3 — searched "steering rack validation effort",
                     the closure report EFF-2021-0443 was rank 34 (dense: —,
                     keyword: 2). Below the k=6 cut. Never seen.
  CLASSIFIED         retrieval-miss  (not ranking, not reasoning)
  WOULD RERANK FIX?  yes — in the top-50 pool
```

**Step 5 — the taxonomy, and take it from §0 rather than inventing one.** The
buckets are already earned:

```
  retrieval-miss       the passage was not in the candidate pool at all
  ranking-miss         in the pool, below the cut  → a reranker may fix it
  tool-not-called      the model never asked        → prompt
  estate-thin          asked correctly, history genuinely has ~nothing
  vocabulary-miss      value no document uses       → recovered via the miss
                                                       design; count separately
  schema-reject        model emitted, contract refused
  infrastructure       429, timeout, connection     → never a judgement failure
```

`infrastructure` as its own bucket is load-bearing. Six of fifteen runs once
died on `429` and **none was a judgement failure — every run that produced an
answer passed, 9 of 9.** A suite that cannot separate those two is worthless in
both directions.

**Step 6 — replay.** `pnpm steering:forensics <runId> --replay` re-runs the loop
with the bundle's tool results stubbed and the model live. Answers *"is this
still broken after my prompt change?"* for the price of the model call and
nothing else. `fixtures.ts` is 80% of this already.

### How we prove it

**The acceptance check is §0's open problem, and this is why this section is
second rather than fifth.** Run the bundle capture across the 24-requirement
bid and produce the classification for all 23 unpriced requirements, replacing
the current 13 / 7 / 4 / **0-because-unknowable** split with a complete one. The
four unknowable rows become knowable by construction once step 2 lands.

Specifically: **the seven that never called the pricing tool.** §0b already
suspects they were working from passages that never arrived — *"worth testing
whether those seven were working from passages that never arrived."* The run
bundle answers that question directly and for free, and the answer decides
whether the fix is the prompt or the retrieval.

### The interview answer

> When we ran the whole bid, 23 of 24 requirements came back unpriced, and the
> useful question was not "why did this one fail" — it was "how many *kinds* of
> failure is this." So we built a free, offline diagnostic that re-read the
> stored tool calls and counted them against the estate. It said four kinds, and
> the biggest one — 13 — was the customer's data, not our system: Vantis had
> booked two validation-only mechanical jobs ever. Twelve of those thirteen were
> not one field away from an answer, which ruled out the over-constraining
> hypothesis we had been about to spend a week on. The fix turned out to be the
> refusal sentence, not the retrieval.

The follow-up is *"what did you find you couldn't explain?"* — and the honest
answer is the best part: four runs were unknowable because two code paths wrote
two different structures into the same trace column with no discriminator, and
the first version of the diagnostic was about to report the one correctly-priced
requirement in the bid as having invented its number.

---

## §3 · LLM cost autopilot

### In one paragraph

Today the system measures what it spent. An *autopilot* is the step after that:
the spend signal is fed back into decisions the system makes on its own — which
model handles this question, how many searches it may run, when to stop, what
happens when a budget is reached. The word to be suspicious of is "auto." Every
lever here trades money against quality, so an autopilot without §1's
measurement is not automation, it is an unsupervised quality cut.

### The mental model

**Where the money actually goes in a tool loop.** A multi-turn agent re-sends
its entire conversation every turn. Turn 7 pays for turns 1–6 again. So cost
grows roughly with the *square* of the turn count, not linearly, and the two
levers that matter most are *how much goes into the context* and *how many turns
there are* — not the per-token price.

**MEASURED — `steering:eval`, 2026-09-15:** 102,068 input tokens on average per
eval run, against ~3,700 output tokens. **Input is 96% of the tokens.**

**The two caches, which are completely different things and get confused
constantly.**

| | **prompt cache** (provider) | **semantic cache** (yours, §4) |
|---|---|---|
| matches on | an **exact prefix** of the token sequence | **meaning** — embedding similarity |
| stores | the model's internal attention state (KV) | the finished answer |
| who runs it | the provider, often automatically | you |
| can be wrong | no — identical prefix, identical computation | **yes** — that is its whole risk |
| saving here | input tokens at 1/10 price | the entire call |

Prompt caching is free money and has no correctness risk. Semantic caching is a
product decision with a failure mode. **Exhaust the first before touching the
second** — §4 exists partly to argue that here we should stop after this line.

**Cache-aware prompt ordering.** Because the match is on a *prefix*, one changed
token early in the message array invalidates everything after it. The ordering
that maximises hits is: tool definitions → system prompt → few-shot examples →
retrieved context → the user's question. Anything that varies per request goes
**last**. On Azure/OpenAI the cache engages at ≥1,024 tokens and grows in
128-token increments; Anthropic uses explicit `cache_control` breakpoints with a
5-minute TTL by default, reads at ~10% of input and writes at 1.25×.

**Routing and cascades**, the two named patterns:

- **Routing** — decide *before* the call which model gets this question. One
  decision, no wasted work, needs a difficulty predictor.
- **Cascade** — try the cheap model, judge the output, escalate on failure.
  Simpler and self-correcting, but a failed cheap attempt is pure waste, so the
  economics depend on how often it is right.

Published: RouteLLM ~85% cost reduction at ~95% of GPT-4 quality on MT-Bench;
FrugalGPT up to 98% on some benchmarks. Treat both as upper bounds from
benchmark conditions, not as forecasts.

**And the metric that decides whether any of it worked.** Cost per *call* is the
easiest number to compute and the least useful. The number that matters is
**cost per accepted answer** — spend divided by the outputs a human actually
used. An agent whose cost per call drops 25% while cost per resolved task rises
40% is the most common failure in this area, and cost-per-call reports it as a
win.

### What we already have

**MEASURED — 2026-09-15**, `node` over `logs/requests.jsonl` (910 lines, 14
surfaces, $14.35 repo-wide):

```
  surface                     n        usd   cached   avg s
  steering:eval              91    $1.6897    70.3%    68.0
  steering:assess-all        15    $0.2647    66.5%    55.9
  http                       19    $0.2088    60.6%    84.8
  steering:assess             9    $0.1712    59.5%    91.4
  steering:desk-summary       5    $0.1019    25.2%    78.2
  steering:summarise          2    $0.0206    41.0%    44.1
  steering:index              1    $0.0106     0.0%    85.5
  TOTAL                     142    $2.4675
```

**Three things fall out of that table, and the first one is the section's
headline.**

**1. The eval suite is 68.5% of steering's entire LLM spend** — $1.69 of $2.47.
The expensive thing here is not serving customers, it is *measuring ourselves*.
That reorders the work: the highest-value cost optimisation available today is
making the eval suite cheaper to run, and §0b's fixtures are the first step of
exactly that. Anyone who went straight to model routing would have optimised the
26%.

**And the caveat is as important as the finding, because this ratio is a
property of a pre-production system.** The log is a development history, not a
traffic mix: the bid has been run once, and the suite has been run through every
change that built it. **The moment real traffic exists the ratio inverts** — a
handful of eval runs a week against thousands of assessments, and then routing
and caching are where the money is. The transferable lesson is not "evals are
expensive"; it is that the shape of your spend is not the shape you assume, and
one `node` one-liner over a log you already keep tells you which regime you are
in. Re-run it after the first week of real traffic and expect a different table.

**2. The prompt cache is already working and nothing was done to enable it.**
66% of input tokens served from cache at 1/10 the price. Azure caches
automatically. **MEASURED** at `apps/ai/steering/src/telemetry/prices.ts`:
`gpt-5-mini` at $0.25/M input, **$0.025/M cached input**, $2.00/M output —
meters confirmed against the actual bill via `az consumption usage list`. Note
that this differs from the commonly-published 50% discount for Azure OpenAI
prompt caching; the repo's number came from the bill and the published one did
not, which is the whole reason that file insists on verification. A published
price list tells you what a meter **costs**; only the bill tells you which meter
you are **on**.

**3. `steering:desk-summary` caches at 25%** against 66–70% elsewhere. A
single-call path with a long varying prefix. That is a cache-aware-ordering
candidate, visible for free in a table nobody had printed.

The pricing infrastructure itself is unusually careful and worth knowing in
detail, because most of the interview questions land on it:

- **`cachedInputTokens` is optional, and `undefined` is not `0`** — `0` means
  measured and none were cached; `undefined` means the engine does not report
  it, so the cost stays a **ceiling** rather than becoming a guess
  (`request-log.ts:94-108`).
- **Two independent facts must both hold before a discount is applied** — the
  engine reported cached tokens *and* the deployment has a confirmed cached
  rate. Either missing and the figure stays a ceiling
  (`request-log.ts:134-155`).
- **The cached count is clamped** to the input count, so a provider reporting
  cached > input cannot hand back a *smaller* bill the more absurd the reading
  gets.
- **A model with no verified price logs `costUsd: null` plus a reason**, never
  an invented figure. A precise-looking wrong number is worse than an admitted
  gap — it gets quoted in a business case.
- **The caveat travels with the number** — `basis` is on every line, because a
  figure and its caveat stored in different places is a figure whose caveat gets
  lost on the way to a spreadsheet.
- **A `PROVISIONAL` prefix on `source`** rides onto every logged line.
- **Prices are per-engagement on purpose.** Three copies exist and that is not a
  smell: *duplication of mechanism is a smell; duplication of policy that
  happens to coincide is not* (`prices.ts:19-24`). A price is a property of a
  contract, a region and a model; importing one customer's rate card into
  another's makes a renegotiation somewhere else change your invoice.

### The gap

There is a **meter and no governor**. Nothing reads the cost signal and acts.
Specifically: no budget ceiling anywhere; no per-request spend cap; no model
choice (one model, everywhere); no cost-per-accepted-answer figure; nothing
watching the search budget against outcome; and `logs:sync` exists but no alert.

### The build

**Step 1 — the honest denominator. Free, and it reframes everything.**

Add `cost per accepted answer` to `pnpm steering:summarise --dry-run`, which
already counts assessments by outcome and spends nothing.

**MEASURED — `pnpm steering:spend`, 2026-09-15.** Computed over the newest run
per requirement across every ANSWER surface (`steering:assess`,
`steering:assess-all` and `http`, the web desk), with the eval surface excluded
because an eval run is not an assessment anybody wanted:

**23 requirements, $0.3637 in total, median $0.0151 each, 63.3% cached.**

Two corrections to the figures this section first carried, both from computing
them rather than transcribing them:

- the first version counted only the two CLI surfaces and reported **15**
  requirements. The web desk logs under `http`, and adding it brings the bid to
  **23**. (`CR-K2-0114` reached the log on no surface at all — 23, not 24.)
- NEXT.md's `$0.26 / $0.018 / 66%` is the `assess-all` surface alone, which is
  correct for what it says and is not the whole bid.

Now divide by outcomes instead of by calls. Across the bid, **1 of 23
logged requirements came back with a price.** If a priced answer is the product, cost
per accepted answer is roughly **$0.26 — about 24× the median cost per
request.**

**And the denominator is a judgement, which is the point.** A well-evidenced
refusal *is* a usable answer for a bid meeting — §0 concluded the fix for 13 of
them is the sentence, not the filter. So the tool should print **both**, and
name the assumption:

```
  cost per request              $0.0151   median of 23 runs
  cost per priced answer        $0.3637   1 priced of 23   24.1x the median
  cost per actionable           $0.0158   all 23, counting a grounded
                                          refusal as an answer
```

Three numbers, one denominator argument, and a spreadsheet that cannot quietly
pick the flattering one. **This is the single highest-value item in this
section** and it costs nothing to compute.

**Step 2 — a spend ceiling per run, fail-closed.** A `CostMeter` created in
`assessRequirement` beside the existing run id, incremented from each turn's
usage via the `priceOf` that already exists. Before dispatching turn *n+1*, if
projected spend exceeds `STEERING_MAX_USD_PER_RUN` (default ~$0.10, ~5× the
observed median), **stop the loop and return a partial assessment with
`stoppedBecause: 'budget'`**.

Three rules, and each has a reason:

- **Never silently continue.** `stoppedBecause` is already a first-class field
  in both the request log and the eval outcome, and `@fde/evals` already buckets
  by it. A budget stop must be visible in the scorecard or it will be read as a
  model failure — the same distinction `infrastructure` earns its own bucket for
  in §2.
- **Return what it has.** A run killed at turn 6 has six turns of grounded
  searching in it. Discarding that spends the money and keeps nothing.
- **Ship it off by default** (`Infinity`), turned on per surface. A cap that
  fires during a demo is worse than no cap.

**Step 3 — cache-aware ordering, and measure it.** Audit the message assembly in
`assess-requirement.ts` and `summarise-bid.ts` for anything varying that sits
before anything static. `desk-summary`'s 25% is the first suspect. This is free,
carries no quality risk, and is verified by the `cached%` column moving in the
same table above.

**Step 4 — a search budget tied to outcome.** `SearchBudget` already exists in
`agent/tool/search-documents.tool.ts`. The forensics bundle (§2 step 3) makes
the question answerable for the first time: **did the searches after the third
one ever change the answer?** If not, the budget is a free saving. If they did,
it is not, and the current number is correct. *Measure before optimising against
it* — this repo has the scar: two hours went into making the loop cheaper while
the actual failure was a deployment provisioned at capacity 20 against a
subscription limit of 1,000, visible in `az cognitiveservices account deployment
list` the whole time.

**Step 5 — a cascade, and only if steps 1–4 leave a reason.** The natural shape
here, if it exists at all, is **not** a cheap-model-first cascade: it is
*skipping the model for the 7 requirements that never needed the pricing tool*,
which §2 will have identified. That is a routing decision made from measured
failure classes rather than from a difficulty score.

**Where this lives, and what would make it a package.** All of it in
`apps/ai/steering/src/`. Do **not** create `@fde/budget` today. This repo's
extraction rule is explicit — the embeddings factory was extracted *because it
had reached three copies*, and policy that coincides across engagements is not a
smell. Draw the seam so extraction is mechanical later: the **mechanism**
(accumulate usage, project the next turn, compare to a ceiling, signal stop) is
domain-neutral and goes in one file with no steering vocabulary; the **policy**
(the ceiling, which surfaces enforce it, what an accepted answer is) stays in
steering. Extract when pharma or insurance grows the second copy, and record
that as the trigger.

### How we prove it

Every cost change is a **paired measurement**, and neither half is optional:

1. `pnpm steering:eval-history` — is the baseline you are about to compare
   against itself unusual?
2. `FIXTURE_MODE=replay pnpm steering:eval` before, and after.
3. `pnpm steering:eval-diff` — quality held, or moved inside the noise band.
4. The same `node` one-liner over `logs/requests.jsonl`, filtered by surface —
   cost moved, and by how much.
5. Cost per accepted answer, both denominators, before and after.

**A cost reduction reported without step 3 is not a result.** That is the whole
discipline of this section, and it is why §1 comes first.

### The interview answer

> We had per-request cost on every line from the start, with the cached-token
> subtlety handled — cached tokens are a subset of input, not an addition, so
> treating them as an addition makes a cache *hit* look more expensive, which is
> wrong in the direction nobody audits. But the useful move was printing spend by
> surface: 68.5% of it was the eval suite, not production. The second was changing
> the denominator. Median cost per requirement was 1.8 cents and one of 24 came
> back with a price, so cost per priced answer was 26 cents — about 24×. Nothing
> about the per-call number was wrong; it was answering a question nobody asked.

The follow-up is *"so what did you actually cut?"* — and the honest answer is
that the first three things were free: fixtures for the eval suite, prompt
ordering for the one path caching at 25%, and a denominator.

---

## §4 · Semantic cache

### In one paragraph

An ordinary cache answers *"have I seen this exact question before?"* A semantic
cache answers *"have I seen a question that **means** the same thing?"* — by
embedding the incoming question, searching stored questions by vector
similarity, and returning the stored answer if the nearest one is close enough.
It is the largest single cost lever available, because a hit skips the model
entirely. It is also **the only capability in this file that can silently return
a wrong answer**, and on this workload there is a specific reason to think it
might.

### The mental model

**The mechanism**, and it is genuinely simple:

```
  question → embed → nearest stored question by cosine similarity
           → similarity ≥ threshold ?
                yes → return the stored answer.  No model call.
                no  → call the model, store (embedding, question, answer)
```

**The threshold is the entire product decision.** Too low and the cache answers
a *different* question — a **false hit**, the dangerous failure. Too high and it
never hits and you have paid for embeddings and a database to achieve nothing.
Published practice: production teams settle between **0.92 and 0.97**; below
0.90 false positives degrade quality; above 0.98 it rarely hits. Redis LangCache
defaults to 0.65, which is a *demo* default, not a production one. A commonly
recommended first deployment is **0.97** — hit rate 5–10%, false-positive rate
under 0.5%.

**False hit rates are measurable and tools differ a lot.** On one 700-query
benchmark, GPTCache produced **233** false hits where MeanCache produced **89**.
That number is not a detail; it is the product.

**Layer exact before semantic.** Exact-match lookup first (zero correctness
risk), semantic on miss, model on miss again.

**Invalidation is the part that sinks naive implementations.** A cached answer
is a function of *four* things, and the key has to carry all four or the cache
serves an answer that was correct under conditions that no longer hold:

```
  cache key = (question embedding, corpus version, prompt version, model)
```

Change the corpus and every stored answer describes a world that no longer
exists. Change the prompt and the cache keeps serving the old behaviour — the
prompt "ships" and nothing changes, which is a maddening bug to chase. Tie the
namespace to the prompt version and it flips on deploy. **Stale cache is worse
than no cache.**

### What the field does

- **GPTCache** — Python-native, wraps the client in two lines.
- **Redis LangCache / Redis vector cache** — distributed, shared across pods.
- **MeanCache** — a research system specifically targeting false-hit rate.
- **Gateways** — LiteLLM, Portkey, Helicone offer caching as one of four levers
  alongside per-key quotas, spend budgets and routing. (Both Helicone and
  Portkey were acquired in 2026 — worth knowing the space is consolidating.)
- **Version-based invalidation** — attach a corpus version, e.g. a git hash of
  the document set, and purge on change; combine with a TTL rather than
  choosing between them.
- **"A cache hit is a hypothesis, not a guarantee"** — keep the evidence, run a
  coverage check under each hit, escalate rather than confidently answering from
  less than the retriever had.

### What we already have

Everything except the cache itself:

| piece | where |
|---|---|
| embeddings, batched, provider-switchable | `packages/grounding/src/embeddings.ts`, `apps/ai/steering/src/grounding/embeddings.factory.ts` |
| pgvector + cosine search | `packages/grounding/src/store.ts`, `vst_derived` on Neon |
| a durable answer store, keyed by requirement | `apps/ai/steering/src/answer/filed-assessments.ts` |
| the **corpus-version half of the key**, already solved for a different reason | `apps/ai/steering/src/db/seed/fingerprint.ts` — per-table SHA of the generated estate, offline, free, and deliberately **per table** because *"it changed" is not actionable and "vst_scm.commits changed and you did not touch it" is* |
| embedding price | $0.02/M, **MEASURED**, `telemetry/prices.ts` |

**MEASURED — 2026-09-15:** embeddings are ~0.5% of steering's spend
(`steering:index` $0.0106 of $2.28). A semantic cache's *own* cost is
negligible here. Only its correctness is in question.

### The gap — and the honest answer may be "don't build it"

**This section is written so that "no" is an allowed outcome**, because on this
workload there are three specific reasons to doubt it, and a measured decision
not to ship is a better engineering result than an unmeasured build.

**1. The prompt cache already takes 66% of the input tokens**, at 1/10 price,
with zero correctness risk, automatically. The remaining headroom is smaller
than a cache-shaped hole looks.

**2. The workload is adversarial to semantic caching by construction.** The 24
K2 requirements are near-identical in phrasing and **must** produce different
answers. `CR-K2-0101` (rack force ≥ 8000 N) and its neighbours sit close in
embedding space and are not interchangeable. This is the textbook false-hit
setup, and §0's finding sharpens it: 23 of 24 refuse, and *"we have never done
this kind of work"* is a sentence that would be returned verbatim from a cache
for a requirement where it may be false.

**3. Traffic is low and the corpus changes.** A cache's value is a hit rate, and
a hit rate needs repeated questions.

**Where it could genuinely pay, and it is not the assessment loop:**

- `explain-assessment` — *"explain this in plain language"* over an already-filed
  assessment. The input is a stored row; identical requests are likely; an
  **exact-match** cache keyed on `(assessmentId, promptVersion)` needs no
  embeddings at all and has **zero** false-hit risk.
- `desk-summary` — **MEASURED:** 5 calls, $0.1019, only 25.2% prompt-cached, and
  its counts are GET and free while its two written paragraphs are POST and cost
  a model call. If the filed assessments have not changed, the paragraphs cannot
  have. That is exact-match caching on a content hash, again with no embeddings.

**So the recommended order is: exact-match first, on two named paths, and
semantic only if a measured miss analysis says the exact key is too strict.**

### The build

**Step 1 — the adversary set, before the cache. Free, offline.**

`docs/steering/evals/cache-adversary.jsonl`: pairs of questions that are
semantically close and **must not** share an answer. The corpus hands them over:
the 24 K2 requirements, `CR-K2-0101` vs `0102`, the ASIL-D-vs-B contradiction
from §0b, and the three form-revision-shaped traps.

Then a scorer — `pnpm steering:cache-check`, offline, one embedding call per
question — that sweeps the threshold and prints:

```
  threshold   hit rate   FALSE hits (adversary pairs that matched)
  0.90          41%        17 of 24      ← unusable
  0.95          12%         3 of 24
  0.97           4%         0 of 24
  0.99           1%         0 of 24
```

**This table is the deliverable of §4, whichever way it comes out.** If the
false-hit column does not reach zero before the hit-rate column reaches
uselessness, the answer is *don't build it*, and that is a result — measured,
dated, and re-runnable when the workload changes.

**Step 2 — exact-match on the two named paths.** A `llm_cache` table in
`vst_derived`:

```sql
key TEXT PRIMARY KEY,   -- sha256(promptVersion | model | corpusFingerprint | canonical input)
answer JSONB, at TIMESTAMPTZ, hits INT
```

Every component of that key is load-bearing, and there is precedent in this repo
for each: `promptVersion` from §5, `corpusFingerprint` from `fingerprint.ts`,
`model` because a rate and a behaviour both change with it.

Log a hit like any other request — `costUsd: 0`, a `cacheHit` flag, real
latency. **A hit that is not logged makes the cost graph drop for an invisible
reason**, which looks like a win and is unauditable.

**Step 3 — semantic, only if step 1's table justifies it**, at the threshold
step 1 measured and never at a default. Exact first, semantic on miss, model on
miss again. Store the retrieved passage ids with the entry so a hit can still
answer *"what was this grounded in."*

**Step 4 — invalidation, three mechanisms, all of them.** Namespace flips on
prompt-version and corpus-fingerprint change (a rebuild, not a purge); a TTL as
a backstop against the key you forgot; and a manual `steering:cache-drop`.

### How we prove it

1. The threshold sweep, with the false-hit column — before any cache is wired in.
2. Add the adversary pairs to the **eval suite**, so a future threshold change
   that reintroduces false hits fails the scorecard rather than a side script.
3. `pnpm steering:eval-diff` across cache-on / cache-off — quality must be
   **unchanged**, not merely acceptable. A cache that changes a single answer is
   not a cache, it is a different system.
4. Hit rate and cost delta from `logs/requests.jsonl`, with hits logged at zero.

### The interview answer

> Before building it we built the adversary set, because the failure mode of a
> semantic cache is that it answers a *different* question. Our workload is 24
> customer requirements that are near-identical in wording and must produce
> different answers, so it is close to the worst case. We swept the threshold
> against those pairs and reported hit rate against false-hit rate. We also
> found the provider's prompt cache was already serving 66% of input tokens at a
> tenth of the price with no correctness risk — so the honest recommendation was
> exact-match caching on the two paths where the input is a stored row, and no
> semantic cache until the miss analysis justifies one.

The follow-up is *"what would change your mind?"* — traffic with genuine
repetition, or a miss analysis showing near-misses that are safely equivalent.
The threshold sweep is committed and re-runnable, so the answer is a command,
not an opinion.

---

## §5 · Self-healing docs

### In one paragraph

This repo's documentation is full of numbers — 3,854 passages, 98% extraction
accuracy, recall@6 0.813, $0.26 for the bid, 15/15 green. Every one of them was
true when written, and every one can become false when code changes, with
nothing to say so. *Self-healing docs* means **marking** the claims that come
from a machine, **checking** them against the thing that produces them, and
**rewriting** the ones that have drifted — so a documented number is a build
artifact rather than a memory.

### The mental model

**The only claims worth checking are the ones with a producer.** A sentence like
*"the refusal should say we have never done this work"* is a judgement and no
checker can verify it. A sentence like *"3,854 passages"* has a producer:
`pnpm steering:corpus-check`. **The distinction — claim with a producer vs.
prose — is the whole design**, and getting it wrong in either direction ruins
the tool: check too much and it fires on opinions; check too little and it
misses the numbers that get quoted.

**"Healing" is not the model rewriting your docs.** It is: the producer emits a
value, the checker compares it to the marked value, and on mismatch it either
fails (CI) or substitutes the new value and stamps the date (`--heal`). No model
call. Deterministic, reviewable as a diff.

**Why this beats "remember to update the docs."** Because nobody does, and this
repo can prove it. The evidence is in its own git history.

### What the field does

- **Docs-as-code / doc gates in CI** — the doc build fails the same way a test
  does.
- **Claim extraction and verification** — tools that read prose, extract
  concrete claims about the codebase, and check each against source; drift
  becomes a failing check.
- **Derived-artifact discipline** — make docs and SDKs generated outputs of one
  versioned definition, and fail CI when a change is not reflected everywhere at
  once. The strongest version of the idea: the number in the doc should not be
  *checked*, it should be *generated*.
- **`doctest`** — the oldest form: code blocks in docs are executed.
- **Staleness scoring** — compare git modification times of code against its
  docs and flag divergence. Cheap, noisy, and a reasonable second signal.

### What we already have — the culture, without the enforcement

**The repo already generates documentation artifacts.** `corpus.generated.ts`,
`estate.generated.ts`, `worked-example.generated.ts` in
`apps/web/steering-app/src/lib/` are produced by `steering:corpus-web`,
`steering:estate-web` and `steering:worked-example` — the derived-artifact
pattern, already in use.

**`@fde/scanner` is exactly the right shape for the checker.** *"Read a source
tree and prove a rule about it"* — machinery shared, **rule supplied by the
caller**. And its header carries the lesson that makes it trustworthy: it exists
because three checks each wrote their own comment-stripper, the three disagreed,
and a documented, already-fixed bug was still live in one of them.

**`scripts/leak-check.mjs` is the pattern to copy, including its paranoia.** It
plants a synthetic leak and asserts it catches its own plant — because it once
passed clean while silently stripping a real leaked credential URL, mistaking
`postgresql://...` for a trailing comment. **A checker that has never been shown
to fail is not evidence of anything.**

**And the drift is real and documented.** Three entries from this repo's own
history:

| evidence | what drifted |
|---|---|
| `6c2faf4` *"Say that the whole corpus is embedded, because the page claimed only 220 files left"* | a count in the UI, stale |
| `053a7b0`, correcting `2809171` | `docs/SITE.md` said "four of nine card kinds" overflowed; corrected by hand a commit later to "7 of 13 cards — 4 of its 7 card kinds". A count measured once, written down, and wrong by the next commit. |
| NEXT.md's own preamble | *"The 2026-09-13 version of this file said the eval had never run and that nothing was committed. Both were false within hours of being written."* |

That last one is the argument in a sentence. The repo's response was to date
every section and warn the reader — a discipline, applied by hand, that a
checker can enforce.

### The gap

Nothing verifies a documented number against its producer. Every `*:check` in
this repo checks **code**; none checks **prose**.

### The build

**Step 1 — the marker convention. Settle it before writing a checker.**

```markdown
<!-- claim id=corpus-passages src="pnpm steering:corpus-check" field=passages -->
3,854 passages
<!-- /claim -->
```

Four rules, and each closes a specific hole:

1. **Only marked text is checked.** Unmarked prose is never verified. This is
   what lets a forward-looking document like this one coexist with the checker:
   PROPOSED numbers carry no marker, so they cannot be reported as drift.
2. **`src` is a command, not a file.** A file can be stale too; a command is
   re-run.
3. **`field` names a key in that command's `--json` output.** So every producer
   grows a `--json` flag. Parsing a CLI's human output is how this becomes
   brittle.
4. **The marker is an HTML comment**, so it is invisible in every markdown
   renderer including GitHub.

**Step 2 — `pnpm steering:docs-check`, over `docs/steering/**` only.** Walk the
files, collect claims, group by `src`, run each producer once with `--json`,
compare. Report:

```
  docs/steering/NEXT.md:112   corpus-passages   3,854  →  3,854   ok
  docs/steering/NEXT.md:118   extract-facts     1,320  →  1,347   DRIFT
  docs/steering/OPERATIONS.md:305  bid-median   $0.0177 → $0.0177 ok
```

Exit non-zero on drift. Free for producers that are free — and **only free
producers may be marked**. A claim whose verification costs a model call is a
claim nobody will check, so it stays unmarked prose with a date on it. That
rules out eval pass rates and rules in corpus counts, row counts, fingerprints,
price-table entries, retrieval scores read from a committed baseline file, and
the cost table in §3.

**Scope, and why this one command is not repo-wide on day one.** `docs/README.md`
rule 1 says scope decides the folder, and this file is engagement-scoped for the
same reason as the other four sections. But §5 is the one capability here whose
natural end state *is* repo-wide — insurance and pharma carry the same kind of
numbers and the same drift. So build it scoped, and **when it graduates its home
is `docs/`, not `docs/steering/`**: a repo-wide `pnpm docs:check` and a
repo-wide document describing it. Scoping first is not a smaller version of the
right thing; it is how the marker convention gets a chance to be wrong cheaply.

**Step 3 — `--heal`.** Rewrite drifted values in place and stamp
`checked 2026-09-15` in the marker. Never run in CI; it produces a diff a human
reads.

**Step 4 — plant a drift and watch it fire**, in the checker's own self-test,
exactly as `leak-check.mjs` does. Non-negotiable. This checker's failure mode is
passing while parsing nothing, and that failure is silent and confidence-building.

**Step 5 — the prompt version, which §2 and §4 both need.** A single exported
constant derived from a hash of the assembled system prompt, surfaced by
`steering:prompt-version --json` and marked as a claim in
`WHAT-WE-ASK-THE-MODEL.md`. Three capabilities need it: forensics needs to know
which prompt produced a run, the cache needs it in its key, and the docs need it
to notice the prompt changed and the description did not.

**Scope discipline.** Start with **one file and five claims** — the three in the
table above plus this file's cost figures. A checker over 20 documents on day
one will be turned off in a week.

### How we prove it

1. Plant drift → red. Unplant → green. In the self-test, committed.
2. Run against `docs/steering/NEXT.md` as it stands today. **Expect it to find
   something** — that file carries dozens of numbers across sections dated
   2026-09-13 and 2026-09-14, and several were already corrected in place by
   later evidence.
3. Run `--heal`, read the diff, and confirm every change is a number and not a
   sentence.

### The interview answer

> Documentation drifts silently and this repo could prove it — a page claimed
> 220 files when the whole corpus was embedded, and a plan file opened by saying
> its own previous version had two claims that were false within hours of being
> written. So we marked the claims that have a machine producer, gave every
> producer a `--json` flag, and made `docs:check` compare them. Only marked
> claims are checked — judgements and proposals are deliberately out of scope,
> because a checker that fires on opinions gets turned off. And the checker
> plants its own drift and asserts it catches it, because the one already in
> this repo once passed clean while silently parsing nothing.

The follow-up is *"why not have an LLM keep the docs up to date?"* — because the
value is the **failing check**, not the rewrite. A model that rewrites prose
produces a diff nobody can review and can quietly launder a wrong number into
confident-sounding text. Deterministic comparison, model-free, reviewable.

---

## What this adds, in commands

Everything proposed above, as the commands it would create. All free unless
marked.

```bash
# §0 — prerequisites
pnpm steering:eval-diff                 # compare two baselines
pnpm steering:eval-history              # every baseline on disk
FIXTURE_MODE=record pnpm steering:eval  # COSTS — record comparables fixtures
FIXTURE_MODE=replay pnpm steering:eval  # COSTS the model call only

# §1 — regressions
pnpm steering:model-compare <A> <B>     # discordant pairs, McNemar, cost delta

# §2 — forensics
pnpm steering:trace-check               # every stored trace parses as TurnRecord[]
pnpm steering:forensics <runId>         # first divergence, classified
pnpm steering:forensics <runId> --replay  # COSTS the model call only

# §3 — cost
pnpm steering:summarise --dry-run       # + cost per accepted answer, both denominators
pnpm steering:spend                     # logs/requests.jsonl by surface

# §4 — cache
pnpm steering:cache-check               # threshold sweep vs the adversary set
pnpm steering:cache-drop

# §5 — docs
pnpm steering:prompt-version --json
pnpm steering:docs-check
pnpm steering:docs-check --heal
```

## If there is only an afternoon

In order, and the first three change nothing about the system:

1. ~~**§0a** — the two eval wrappers.~~ **DONE 2026-09-15.** All four committed
   baselines are readable, and the first diff correctly refused to call a
   one-run move an improvement.
2. ~~**§3 step 1** — cost per accepted answer, every denominator.~~ **DONE
   2026-09-15**, as `pnpm steering:spend`. It found two errors in this
   document's own figures, which is the argument for making a number a command.
3. **§2 step 2** — assert the trace shape. It is a live defect that already
   nearly produced a false accusation against the one correct answer in the bid.
4. **§0b** — fixtures on `find_comparable_work` only. Unblocks everything else.

## Sources

The state of the art referenced above, for the vocabulary as much as the
content.

**Routing, cascades and cost**
[FrugalGPT / RouteLLM survey](https://neuraltrust.ai/blog/llm-model-routing) ·
[Cluster, Route, Escalate (2026)](https://arxiv.org/html/2606.27457) ·
[Is Escalation Worth It?](https://arxiv.org/pdf/2605.06350) ·
[LLM gateway cost levers](https://usagebox.com/articles/llm-gateway-cost-control-token-quotas-2026) ·
[Cost per resolved task](https://tianpan.co/blog/2026-06-02-the-agent-budget-that-approved-cost-per-call-and-never-measured-cost-per-resolved-task) ·
[Tracking LLM costs — Braintrust](https://www.braintrust.dev/articles/how-to-track-llm-costs-2026)

**Prompt caching**
[OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) ·
[Azure OpenAI prompt caching](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/prompt-caching) ·
[Across providers](https://www.prompthub.us/blog/prompt-caching-with-openai-anthropic-and-google-models)

**Semantic caching**
[Redis — what it is](https://redis.io/blog/how-to-cache-semantic-search/) ·
[10 optimisation techniques](https://redis.io/blog/10-techniques-for-semantic-cache-optimization/) ·
[MeanCache (false-hit rates)](https://arxiv.org/pdf/2403.02694) ·
[From Exact Hits to Close Enough](https://arxiv.org/pdf/2603.03301) ·
[Stale RAG vs expensive RAG](https://dev.to/vectorlinklabs/stale-rag-vs-expensive-rag-how-to-cache-rag-context-without-serving-outdated-answers-335f) ·
[The RAG freshness problem](https://tianpan.co/blog/2026-04-10-rag-freshness-problem-stale-embeddings-silent-failure)

**Regressions and eval statistics**
[Within-Model Reliable Change Detection](https://arxiv.org/pdf/2604.27405) ·
[Statistical significance in evals](https://futureagi.com/blog/statistical-significance-llm-evals/) ·
[Measure variance before setting thresholds](https://oneuptime.com/blog/post/2026-08-31-measure-llm-eval-variance-thresholds/view) ·
[Stochastic judges as deterministic oracles](https://dev.to/gabrielanhaia/every-llm-eval-library-has-the-same-bug-stochastic-judges-used-as-deterministic-oracles-16o8) ·
[ReCatcher](https://arxiv.org/pdf/2507.19390)

**Forensics and observability**
[MAST — Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657) ·
[Silent failures in a production agent runtime](https://arxiv.org/pdf/2606.14589) ·
[Evidence tracing and execution provenance](https://arxiv.org/html/2606.04990v1) ·
[OpenTelemetry GenAI observability](https://opentelemetry.io/blog/2026/genai-observability/) ·
[GenAI semantic conventions guide](https://greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions) ·
[Deterministic replay debugging](https://tianpan.co/blog/2026-04-12-deterministic-replay-debugging-non-deterministic-ai-agents)

**Docs**
[Docverity — claims checked against source](https://glama.ai/mcp/servers/deveshagarwal/docverity) ·
[Stopping schema drift](https://buildwithfern.com/post/stopping-schema-drift-coupling-sdks-documentation-claude) ·
[Documentation-contract drift in agent systems](https://zylos.ai/research/2026-08-21-documentation-contract-drift-detection-agent-systems/)

---

*§0a and §3 step 1 were built on 2026-09-15 and are marked so in place.
Everything else here is still PROPOSED. Every MEASURED claim carries the command
that produced it — re-run it rather than trusting the date.*
