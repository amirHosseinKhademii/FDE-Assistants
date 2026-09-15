# Progress log — what is built, why, and what is left

Written 2026-09-04, end of the first build session. Updated 2026-09-05 with the
first real baseline (§5.6). Companion to
[`README.md`](../README.md) (how to run it) and [`GUIDE.md`](GUIDE.md) (everything
else in one pass). This file is the one that explains **decisions and
reasoning**, including the things that went wrong.

**A note on the doc names below.** `FDE.md`, `FRAMEWORKS.md` and `PILLARS.md`
were merged into `GUIDE.md` on 2026-09-10 and moved unedited to
[`archive/docs/`](./). Entries written before that date still cite
them by name; those citations still resolve, just one directory down.

Read `GUIDE.md` §11 for the intended build order. We followed it with one
deliberate swap, explained under Pillar 3.

Everything after §1 assumes you know the system. **§0.0 does not** — start there
if you are coming back cold.

---

## 0.0 Where we are, in plain terms

*No jargon. If a sentence below needs a definition, it is a bug in this section.*

### What we are building

An assistant for an insurance claims adjuster. She asks a question like *"how
much rental car does this customer get per day?"* and it answers **from the
insurer's own policy documents**, showing which document it got each fact from.
If the documents do not settle the question, it says so instead of guessing.

That is the whole scope. It does not decide claims, calculate payouts, or touch
any real system.

### Does it work?

Yes. You can ask it a question today and get an answer with sources.

### How well does it work?

We test it on 7 questions where we already know the right answer, running each
one 5 times. Latest score: **30 out of 35**.

Why 5 times each? Because the assistant does not answer identically every time.
Running each question once tells you almost nothing; you could run the same
suite twice and get different scores with nothing having changed. Five runs is
the smallest number that starts to tell "genuinely broken" apart from "usually
fine, occasionally not."

### The failures — and here is the thing

**Every failure so far has been ours, not the assistant's.** Three times now:

1. **Our test was wrong.** It checks the assistant only cites documents that
   really exist — good rule. But it only recognised document names written one
   particular way, so it rejected citations of documents sitting right there on
   disk. *Fixed. That question went from 2/5 to 5/5.*

2. **Our question was wrong.** We asked what rental coverage customer AUT-4472
   gets and expected "$40 per day." She never bought rental coverage. The run we
   marked as failing was the correct one. *Fixed — it is now a "this customer
   isn't covered" question, and a new question took over the job it used to do.*

3. **Our replacement check is too strict** — the one still failing, 0 out of 5.
   We told it never to mention "$40" when denying the claim. The assistant says
   *"None — she doesn't have this coverage. (If she had bought it, the form pays
   $40/day.)"* The denial is clear and the figure is plainly marked as
   hypothetical. Our check just searches for the text "$40" and cannot tell the
   two apart. **This one needs your decision** — see "What to do next".

So: **the assistant is doing fine. Our measuring equipment keeps being the
problem.** That is normal for a young test suite — test code gets none of the
scrutiny the real code gets, and it is the only place where a bug looks like a
result.

Nothing was flaky in the latest run: every question is either 5/5 or 0/5. That
is a good sign. Consistent behaviour can be diagnosed; noise cannot.

### What we fixed on 2026-09-05

0. **The two broken tests above** — citation checker, and the AUT-4472 question
   (now split into a "not covered" question plus a new question that took over
   its safety-net role). Score went from 26/30 to 30/35, with the only remaining
   failure being a check we wrote an hour ago.

1. **The assistant was being cut off mid-thought.** There was a limit on how
   many steps it could take before we forced it to stop. One question needed
   more steps than the limit allowed, so it returned nothing at all. Raised the
   limit. That one now finishes.

2. **We now run every question 5 times instead of once**, and report "4 out of
   5" rather than a bare pass/fail. This is what surfaced both problems above.

3. **We were saving copies of every search the assistant did**, so we could
   compare runs fairly. It never worked: the assistant re-words its search
   slightly every time, so every saved copy was filed under a different name and
   never reused. 84 files, none of them read. Deleted, and we stopped saving
   searches. We still save customer record lookups, where it works fine.

### What happened on 2026-09-06 — the framework migration

The system was rebuilt on frameworks. **Full account in §10**; the short version
for someone reading cold:

- **Retrieval** is now LangChain.js writing to Postgres/pgvector, replacing our
  own embedder, store and cosine loop. Score after the swap: **identical**.
- **The agent loop** is now the OpenAI Agents SDK. Our hand-rolled loop is kept,
  unbuilt, in `archive/` as the reference implementation.
- **Both swaps are measured neutral:** 30/35 with zero flaky cases, the same
  score the hand-built system had before either framework was introduced.
- **The answer schema** is now Zod, so the TypeScript type is inferred rather
  than hand-maintained alongside it. Tool parameter schemas too.
- **What we kept and why:** the chunker, because no JavaScript markdown splitter
  attaches the heading trail a citation needs; `form-id.ts`, because nothing
  knows what an insurance form id looks like; and `coherenceErrors()`, because
  no library expresses "an unresolved conflict must be escalated, never
  decided". The rule that came out of it — *the framework does the generic 90%,
  the domain 10% is what you keep.*
- **A new kind of check exists:** `pnpm compliance:check` asserts on the actual
  outgoing request that `store: false` holds and that the SDK's tracing exporter
  stays off. Both are opt-out defaults that would have sent claim data to a US
  endpoint.

### What to do next, in order

1. **Decide one thing** (issue #3c): when the assistant tells the adjuster a
   customer has no rental coverage, may it add *"if she had bought it, it would
   be $40/day"*? It does this every time, clearly labelled as hypothetical.
   - Say **yes** and we drop the check — arguably the more useful answer, since
     it tells Priya what the customer would have had.
   - Say **no** and we keep it — a number in a claims file can get quoted to a
     customer regardless of the caveat around it.
   Either way it is one small edit. Nothing else is blocked on it.
2. **Then Pillar 5** — record what each question costs. We print it today and
   throw it away; it cannot be reconstructed later.
3. **Then grow the test set.** Seven questions is a demo. A real one needs
   50–100.

### What is NOT built yet

- No web interface — it runs from a terminal.
- No record of what each question costs. We print it, we do not save it.
- Not deployed anywhere.
- Only 6 test questions. A real system needs 50–100.

### The one lesson worth carrying out of this session

**A failed test is a suspect, not a verdict.** Four things looked broken; three
were the test, one was the question, none were the thing being tested. Checking
which is which took an hour. Skipping that check would have meant rewriting a
working assistant to satisfy a broken test.

---

## 0. What this project is

FDE practice engagement #2. A fictional mid-size insurer, "Meridian Mutual."
The bottleneck is claims processing.

**Persona** (`../ROADMAP.md` §4): *Priya, a claims adjuster, who spends about
12 minutes per claim looking up policy language.*

**Scope, deliberately narrow.** Not "automate claims." Not even "decide
claims." Just: **answer coverage questions about auto policies, with citations,
and escalate when the documents do not settle it.** `../ROADMAP.md` §7 names
narrowing as the skill being practised — "automate our whole claims process"
→ "answer policy-coverage questions for auto claims" is the move.

**Explicitly out of scope** for now: claim determinations, payout amounts,
fraud detection, non-auto product lines, anything that writes to a system of
record.

---

## 1. Status at a glance

| # | Pillar | State | Built on | Evidence |
|---|--------|-------|----------|----------|
| 1 | Grounding | **done** | **LangChain.js + pgvector** | 128 chunks; 30/35 after the swap, unchanged |
| 2 | Tool-calling loop | **done** | **OpenAI Agents SDK** | `pnpm compliance:check` PASS; 30/35 unchanged after the swap |
| 3 | Structured output | **done** | **Zod** | `pnpm schema:check` 10/10 + description coverage; 30/35 unchanged |
| 4 | Evals | **done, measured** | ours, deliberately | 7 cases x 5 runs — [`evals/README.md`](evals/README.md) |
| 5 | Cost & latency telemetry | **partial** | — | printed per run, not persisted |
| 6 | Credentials & security | **partial** | `DefaultAzureCredential` | no keys; no API guard yet |
| 7 | Escalation | **works, thinly measured** | schema field | 3 escalation cases pass |
| 8 | Deployment | **not started** | — | — |

Pillars 1 and 2 were rebuilt on frameworks on 2026-09-06 — **see §10**, which is
the current state of this project and the place to start when coming back.

---

## 2. Pillar 1 — Grounding

**The problem it solves.** A model answers from training data unless you stop
it. Generic insurance knowledge is wrong for any specific insurer: limits,
exclusions and endorsements vary by company and change constantly. So the rule
is *state a fact only if a tool returned it*, and Pillar 1 is the machinery
that makes a tool able to return it.

### 2.1 The corpus — 30 documents, messy on purpose

`../ROADMAP.md` §9 lists "clean data" as a demo-killing anti-pattern: *if your
corpus is tidy, you skipped the actual job.* So the corpus was built with four
specific flaws planted in it.

**12 policy wordings** (`examples/policies/`) — searched.
**18 policyholder records** (`examples/policyholders/`) — looked up, never searched.

Three wordings are **hand-written heroes** carrying the flaws. The other nine,
plus all 18 records, are generated by `scripts/generate-corpus.mjs` — run once,
output committed, fully deterministic so re-running gives a clean `git diff`.
Generated documents cannot carry a *deliberate* flaw (you would not know which
one got it), so the traps live only in the hand-written ones and the generated
bulk exists to be plausible noise.

| Flaw | Where | Correct behaviour |
|---|---|---|
| **Contradiction** — rental benefit is `$40/day × 30 days` in `auto-pa-2023-01.md` §4.4 and `$50/day × 21 days` in `auto-pa-end-2024-03.md`; neither says which policies it attaches to | 2 heroes | cite both, flag the conflict — unless a record settles it |
| **Coverage gap** — rideshare appears in none of the 30 documents | corpus-wide | escalate; never argue from Exclusion B (goods for a fee) or I (peer-to-peer rental) |
| **3 incompatible heading styles** — `Part IV / 4.2 Collision`, `Collision Coverage / What We Pay`, `EXCLUSION B — …` | 1 per hero | citation must survive all three |
| **Tables that matter** — limits/deductibles schedules | 10 chunks | a deductible must never be split from the coverage naming it |

The contradiction's numbers **cross on purpose**: a 25-day repair is $1,000
under the base form and $1,050 under the endorsement; a 30-day repair is $1,200
vs $1,050. There is no "the newer one is obviously better" shortcut, so the
model cannot get it right by a heuristic.

The contradiction is resolvable **only** through the record's
`Endorsements Attached` field. Three cases exist deliberately:

- `AUT-4471` — endorsement attached → $50/day, 21 days
- `AUT-4472` — no endorsement → $40/day, 30 days — **wrong, see issue #3b**
- `AUT-4482` — attached but **not countersigned** → nothing settles it, escalate

⚠ The `AUT-4472` line is an error in this answer key, found 2026-09-05 (§5.6).
That record has `Rental Reimbursement | no` — the coverage was never bought, so
the correct answer is "not selected, no coverage." $40/30 is the base form's
schedule for a customer who does not have the benefit. Left standing here rather
than silently corrected, because `cov-003` still encodes it and what that case
*should* test is a decision (issue #3b), not a typo.

`AUT-4473` is the rideshare case.

### 2.2 The pipeline

```
examples/policies/*.md
  → loader.ts    readdir + readFile, sha256 per doc   → Document[]
  → chunker.ts   split on markdown headings           → Chunk[]  (128)
  → embedder.ts  batch of 96 → Azure                  → float[1536] each
  → store.ts     evals/results/index.json
```

Query: embed the query, cosine against all 128, sort, top k. Brute force. At
128 rows a vector database buys nothing, and having the similarity maths
visible is worth more than the scaling headroom.

**Three decisions that carry weight:**

**Heading trail is embedded with the body.** `text = headings.join(' > ') + body`.
Without it you get twelve chunks all reading *"we will pay $N per day"* with no
way to tell which form each came from. Proven live — see §2.4.

**Chunk key is the sha256 of its content.** So the embedder is a
content-addressed cache. Re-running ingest costs 0 API calls; editing one
clause re-embeds one chunk; renaming a file re-embeds nothing. Same idea as a
Docker layer cache. This is what makes re-ingestion safe to do casually, which
is what keeps the index in sync with the documents.

**Tables are never split from their header.** `chunker.ts`'s `window()` moves a
table whole into the next chunk, and repeats the header rows if a table alone
exceeds the budget. `$1,000` separated from the row naming the coverage is not
a citable fact.

### 2.3 Two tools, two access patterns

```
search_policy(query, policy_form?)   cosine over the index      fuzzy
get_policyholder(policy_id)          readFile(`${id}.md`)       exact
```

**The records are deliberately not in the vector index.** `AUT-4471`'s
deductible has exactly one right answer. Routing that through similarity search
is `SELECT * WHERE name LIKE '%maria%'` when you have a primary key — it
returns the five most Maria-shaped chunks and hopes. The rule worth carrying to
any engagement: **if the question has one exact answer, it is a lookup, not a
search.**

`policy_form` is a `WHERE` clause, applied **before** ranking. Filter-then-sort,
not sort-then-filter, or the top-5 is already full of the wrong form.

`get_policyholder` returns misses as readable results, not exceptions —
including the list of ids that do exist, and an explicit instruction not to
infer coverage from a different record.

### 2.4 Measured behaviour

Real output. `"how much does rental car reimbursement pay per day"`, unfiltered:

```
0.569  PA-2023-01     > Part IV > 4.4 Rental Reimbursement
0.562  PA-2021-07     > Part IV > 4.4 Rental Reimbursement
0.559  PA-2023-01-CA  > Part IV > 4.4 Rental Reimbursement
0.559  PA-2022-04     > Part IV > 4.4 Rental Reimbursement
0.550  PA-2023-01-FL  > Part IV > 4.4 Rental Reimbursement
```

Five different forms, three different dollar amounts, a score spread of 0.019.
Search is correctly saying *all five are equally on topic*; it cannot say which
is this customer's. That is the near-duplicate problem, and the heading trail
is the only thing making the results distinguishable at all.

### 2.5 No score threshold — deliberate

Measured on this corpus:

| query | top hit | score |
|---|---|---|
| rideshare (**no answer exists in the corpus**) | an irrelevant exclusion | **0.460** |
| rental limit (**answer exists**) | the limits/deductibles table | **0.360** |

A `score > 0.40` filter would keep the garbage and discard the useful result.
Cosine measures topical overlap, not "is the answer present." Those are
different questions and no threshold separates them. So search always returns
top-k and the **model** decides whether it is actually an answer — that
decision is reading comprehension and cannot be a number.

### 2.6 Bug found and fixed: prefix vs exact form matching

The first filter used `heading.startsWith(policyForm)`. `PA-2023-01` therefore
also matched `PA-2023-01-TX`, `-CA`, `-NY` and `-FL` — four forms with
different liability limits, silently merged into one result set. The right
clause from the wrong form, cited, with nothing looking broken.

Fixed in `src/grounding/form-id.ts`: extract the id by regex, compare exactly.
`pnpm chunks` now prints the filter behaviour so the fix is visible:

```
--form PA-2023-01      -> auto-exclusions-schedule-2023.md, auto-pa-2023-01.md
--form PA-2023-01-TX   -> auto-pa-2023-01-tx.md
```

(The exclusions schedule appearing under `PA-2023-01` is correct — it attaches
to that form.)

### 2.7 Bug found and fixed: a check that could not fail

`pnpm chunks` reported `orphans: 0` — no chunk holding table rows without a
header. That number was meaningless: splitting only happens above 1,200
characters, no section in the corpus is that long, so `window()` had **never
executed** and every table passed through whole by default.

A check that cannot fail reads as evidence while proving nothing. Replaced with
a stress pass at hostile budgets:

```
maxChars=1200  chunks=128  orphans=0
maxChars=400   chunks=205  orphans=0 (forced)
maxChars=200   chunks=573  orphans=0 (forced)
maxChars=120   chunks=805  orphans=0 (forced)
```

128 → 805 chunks means the splitting path actually ran. Now the zero means
something.

---

## 3. Pillar 2 — The hand-rolled tool-calling loop

**Why by hand.** A coverage answer that affects a payout gets audited — by
compliance, possibly a regulator, possibly in litigation. "The framework
decided" is not an answer in that room. An exact replayable record is: at turn
1 the model called `get_policyholder("AUT-4471")`, got back these endorsements,
and that is what drove the answer. Hand-rolling is what makes that record
exist. `src/agent/loop.ts` is ~310 lines with no agent framework.

**The protocol, entire:**

```ts
for (let turn = 1; turn <= maxTurns; turn++) {
  const res = await client.responses.create({ model, input, tools, store: false });
  const calls = res.output.filter(o => o.type === 'function_call');

  if (calls.length === 0) return validate(res.output_text);   // it answered

  input.push(...res.output);                                   // echo its request back
  for (const c of calls) {
    const result = await registry.dispatch(c.name, JSON.parse(c.arguments));
    input.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(result) });
  }
}
```

Three details that are not details:

- **`store: false`** — the API keeps no server-side memory. `input` is the whole
  conversation and we own it. More work, and the reason an audit trail is
  possible: nothing about the state is hidden.
- **`input.push(...res.output)`** — the model's own request items must be echoed
  back before you answer them. A `function_call_output` whose `call_id` has no
  matching `function_call` is rejected. This is the classic bug, and you only
  know to guard against it because you wrote the loop.
- **Tool errors become results, not exceptions.** A throwing tool returns
  `{error: "..."}` to the model, which can recover. An exception here ends the
  conversation mid-claim.

Also: tool calls run in parallel (the model asked for them together), duplicate
calls in one turn are deduped on `(name, args)`, and a schema failure is handed
back to the model to retry rather than silently repaired — **silent repair hides
the failure rate, and the failure rate is a number you need.**

`src/tools/coverage-prompt.ts` holds the domain logic as a strict **ordered**
procedure, not a set of guidelines. `FDE.md` §4.6 records why: the travel app's
first prompt offered an unordered set of things to consider and the model
satisfied it by picking the three that excluded the important one.

---

## 4. Pillar 3 — Structured output

**Built before Pillar 2, against `FDE.md` §5's order.** The schema is the API
contract: the loop validates against it, the prompt describes it, and every
eval check reads a field by name. Defining it after those exist means rewriting
all three. Same reason you do not write controllers before you know the
response type.

**Scope decision:** coverage Q&A, not claim determination. `FDE.md`'s example
`ClaimRecommendation` (approve/deny + payout) would need claim submissions,
repair estimates and damage reports that this corpus does not have.

```ts
interface CoverageAnswer {
  answer: string | null;          // null only when escalating outright
  policy_id: string | null;
  policy_form: string | null;     // which of the 12 forms, taken from the record
  citations: { source, claim, detail }[];
  unverified_claims: string[];
  conflicts: { topic, positions[], resolved_by }[];
  escalate: { reason, suggested_owner } | null;
}
```

Every field required, `additionalProperties: false`.

**`conflicts` has no equivalent in the travel app.** It exists because of the
planted contradiction: without a named box for "these two documents disagree,"
a model has exactly two options and both are wrong — silently pick one, or
refuse outright.

**`escalate` is a separate field, not a status enum**, so the model can return
partial work *plus* a flag (the `AUT-4482` case). The adjuster would rather
have the research and a caveat than a bare refusal.

**`source` has a strict format** — `policy:<FORM_ID>#<section>` or
`record:<POLICY_ID>` — which is what lets an eval check verify mechanically
that every cited document actually exists.

### 4.1 Two layers of validation

**JSON Schema checks shape** (ajv): fields present, right types.

**Shape is not enough.** `{answer: null, escalate: null}` passes the schema
perfectly and says nothing. So `coherenceErrors()` checks combinations that are
structurally valid and still wrong. The most important rule in the file:

> **An unresolved conflict with no escalation is rejected.** That is the model
> silently picking a side while looking fully compliant.

`pnpm schema:check` runs 10 hand-written responses — 3 that must be accepted, 7
that must be rejected — through the validator. Currently 10/10. This tests the
**contract**, not the model; Pillar 4 tests the model.

One case worth noting: a `confidence: 0.92` field is rejected by
`additionalProperties: false`. Models like emitting confidence scores and there
is nothing behind them — the same process that produced the guess produced the
number.

---

## 5. Pillar 4 — Evals

```
evals/cases.jsonl           6 cases, one JSON object per line
evals/fixtures/tools/       31 recorded tool responses
src/eval/checks.ts          11 check functions + a spec resolver
src/eval/run.ts             runner + scorecard
src/tools/fixtures.ts       record/replay wrapper
```

**The discipline:** a check answers *"is this box empty when it should not
be"*, never *"was this a good answer."* The second needs a human or a judge
model, costs money, and disagrees with itself between runs. The first is a
script — free, instant, identical every time.

### 5.1 The cases

| case | guards | tags |
|---|---|---|
| `cov-001` | AUT-4471 — endorsement attached, must answer $50/21 | endorsement, conflict |
| `cov-002` | AUT-4473 — rideshare gap, must escalate | gap, escalation |
| `cov-003` | AUT-4472 — no endorsement, $40/30 — **expectation is wrong, issue #3b** | **control** |
| `cov-004` | AUT-4482 — uncountersigned, must flag conflict AND escalate | conflict, unresolvable |
| `cov-005` | AUT-4476 — Texas form, must not cite the national form | near-duplicate |
| `cov-006` | AUT-9999 — no such record, must escalate not infer | missing-record |

`cov-003` is the **control for `cov-001`**. The idea: a fix that makes the model
always prefer the endorsement turns cov-001 green and cov-003 red, so a case that
can only be passed by over-correcting is how an over-broad fix gets caught.

The idea is right and **the control does not currently work** — §5.6 found that
$40/30 is not correct for AUT-4472 either, since that customer never bought
rental reimbursement. A control with a wrong target certifies a fix against
something that was never true. Issue #3b.

`citations_resolve` is the highest-value check: it verifies every cited source
resolves to a document on disk. A fabricated citation is worse than none — it
looks like evidence, so nobody re-checks it.

### 5.2 First scorecard

```
cases: 6   fixtures: record   model: gpt-5-mini

  cov-001 … PASS  30.2s  4 turns, 3 tool calls
  cov-002 … FAIL  29.8s  8 turns, 8 tool calls
      ✗ escalates: no valid answer (max_turns)
  cov-003 … PASS  21.8s
  cov-004 … PASS  71.3s
  cov-005 … PASS  21.4s
  cov-006 … PASS   7.5s

  5/6 passed
  tokens      : 100122 in / 17445 out
  p95 latency : 71.3s
```

### 5.3 Fixtures — what they do and do not buy

`FIXTURE_MODE=record|replay|off`, default `off`. Applied at the **tool**
boundary, so the frozen thing is the complete retrieval result including
ranking — freezing lower down would let a re-ingest silently change what the
model sees while every fixture still "hit."

**Narrowed to `get_policyholder` only, 2026-09-05 — see §5.7.**

**They do not make eval runs free or fast.** The model call dominates both cost
and latency and is live on every run. Tool calls here are a file read and an
embedding lookup — already cheap.

**What they buy is attribution.** Retrieval returns byte-identical passages
every run, so when the scorecard moves you know it was your change and not the
index drifting. *"We went from 61% to 84%"* is only meaningful if everything
except your change was held still.

In `replay`, a missing fixture is a hard error, never a silent live call. A run
that thought it was replaying and quietly hit the network produces a number you
cannot trust.

### 5.4 The finding that justified the whole pillar

`cov-001` was written as a **known failure**. One manual run had answered
$40/day, 30 days — wrong. The diagnosis was "prompt step 4 is being skipped,
rewrite the prompt."

Then the eval suite ran it. It passed. Run four more times: passed, passed,
passed.

**Same question, same policy, one failure in five.** A single run said
*broken*; five runs said *~20% flaky*. Those have completely different fixes,
and one run could not tell them apart. The pillar caught its own author's
misdiagnosis within an hour of existing.

The generalisation, which matters more than the case: **an eval suite run once
is a sample, not a measurement.** A 6-case suite with two ~20%-flaky cases
reports anywhere from 4/6 to 6/6 with nothing having changed. A prompt tweak
that moves 5/6 → 6/6 has proven nothing yet.

**Revised 2026-09-05 (§5.6):** `cov-001` is now 5/5, taking **4 turns in every
run**. Its lifetime record is 1 failure in 11, and that one failure was a manual
run, not this code path. So the honest reading is **unreproduced, cause
unknown** — not "flaky at ~20%," and not "fixed by the turn cap" either, since 4
turns never came near the cap of 8.

The lesson survives intact and gets sharper: five runs beat one, and the
diagnosis you draw from five runs is still a hypothesis. "~20% flaky" was itself
a number computed from five samples and a story attached to it.

### 5.5 Bug found and fixed: misfiled failure category

The first scorecard reported `false answers (dangerous): 1` for `cov-002`. That
was wrong. cov-002 hit `max_turns` — it produced *no answer at all*. That is an
infrastructure/budget failure whose fix is a config number, not a prompt
rewrite. Misfiling it would have sent us editing the prompt for no reason.

Three categories now, reported separately and never averaged (`FDE.md` §4.4):

```
false answers (dangerous) : asserted something unverified, or cited a fiction
over-caution (annoying)   : escalated something it could have handled
no answer (infra/budget)  : max_turns, schema failure, threw
```

### 5.6 First real baseline — 2026-09-05

`--repeat N` (default 5) landed, `maxTurns` went 8 -> 12 as one shared
`DEFAULT_MAX_TURNS` in `loop.ts`, and the card now reports a pass rate per case.
Full write-up and the standing baseline live in
[`evals/README.md`](evals/README.md); the short version:

```
cov-001 5/5   cov-002 2/5   cov-003 4/5   cov-004 5/5   cov-005 5/5   cov-006 5/5
26/30 runs    4/6 cases green    p95 48.7s    497k in / 72k out
```

Measured **before** search fixtures were dropped (§5.7). The rates still carry
over: of ~59 searches in the run, 58 wrote a new fixture file, so searches were
already going live almost without exception. The lookups were fixture hits then
and still are.

**Credit where the turn counts say it belongs**, because the obvious story is
wrong:

| case | turns/run | cap ever bit? | what moved it |
|---|---|---|---|
| `cov-001` | **4** every run | no — 4 < 8 | nothing; unreproduced, cause unknown |
| `cov-002` | 6–9 | **yes**, previously died at 8 | `maxTurns` |
| `cov-003` | 2–3 | no | `--repeat` — 1 run in 5 diverges |

`maxTurns` is responsible for exactly one thing: `no answer (infra/budget)`
1 -> 0 on cov-002. That did not make cov-002 pass — it made it fail
*informatively*, which is the only reason the `citations_resolve` bug became
visible. `cov-001` never touched the cap, and `--repeat` is what found cov-003.

A fifth thing the card was hiding: the four severity buckets summed to 3 while 4
runs failed. `cov-003#5` failed `cites_form` and `answer_contains`, which no
bucket rule mentions, so it fell through all four and disappeared. Now printed
as **UNCATEGORISED**. The run the accounting swallowed was the most informative
one in the baseline.

**Neither remaining failure is the model**, and both were misread at first:

- `cov-002` 2/5 — `citations_resolve` rejects citations of documents that
  exist. `formIdOf`'s regex is uppercase-only and filenames are lowercase, so
  any filename-style `source` is "unresolvable", and
  `auto-exclusions-schedule-2023.md` carries its form id in its heading, not its
  name. **Issue #3 was logged as low and is not** — it is the sole cause of a
  3-in-5 failure, currently scored under *false answers (dangerous)*.
- `cov-003` 4/5 — the "failing" run is the **correct** one. AUT-4472 has
  `Rental Reimbursement | no`, so "not selected, no coverage" is right and the
  four passing runs quoted the base form's schedule without checking whether the
  customer bought the coverage. That is the optional-rental trap from §8.4 item
  3, scoring green four times in five. And `cov-003` is `cov-001`'s **control**
  — a miswritten control certifies a fix against a target that was never right.

The generalisation, which is the reusable part: **a red check is a hypothesis,
not a verdict, and a green one is not proof.** Two of the four anomalies here
were in the harness and the case file, not the model. Both would have sent
someone editing the prompt.

### 5.7 Fixtures narrowed to lookups — the search cache never hit

A fixture is filed under a hash of the tool's exact arguments. That is a fine
key for a lookup and a useless one for a search, and the baseline made the
difference impossible to ignore.

| tool | files after 30 runs | why |
|---|---|---|
| `get_policyholder` | **6** | argument is a policy id. Six ids, six files, reused every run |
| `search_policy` | **84** | argument contains a query string the **model** composes |

The model rewrites its query every time. Five runs of `cov-003` — same case,
same question — produced five different queries all asking the same thing:

```
rental reimbursement per day number of days rental car reimbursement PA-2023-01
rental reimbursement per day how many days rental reimbursement limit per day duration
rental reimbursement per day number of days rental reimbursement Transportation Expenses Rental
rental reimbursement per day days 'rental reimbursement' 'rental car' 'transportation expense'
rental reimbursement rental car per day number of days "rental reimbursement" "loss of use"
```

Five hashes, five files. Measured: **89 tool calls across 30 runs, ~59 of them
searches, and 58 new fixture files written.** A hit rate of roughly zero.

Two consequences. The directory grows without bound — ~58 files per run,
forever. And more seriously, the layer was **not doing the job it exists for**:
§5.3 claims fixtures hold retrieval still so a moving scorecard can be blamed on
your change. They cannot hold retrieval still if the query never repeats. The
claim was true for lookups and quietly false for searches.

`search_policy` is no longer fixtured, and all 90 files were deleted. Cheap to
give up: a search here is a local cosine pass, and the model call dominates cost
and latency regardless. `FIXTURE_MODE=record` recreates the six lookup fixtures
on the next run.

**This is an abandonment, not a fix.** The attribution goal was a good one and
is now unmet for retrieval. Keying on `(case id, call index)` — "this is
cov-003's second search" — gives the same slot every run regardless of wording
and would actually achieve it. Left open deliberately: it is worth doing only
when there is a reason to compare retrieval across runs, and the harness bugs in
§5.6 come first.

The generalisation: **a cache keyed on something the model authors is not a
cache.** Anything the model writes freely — a query, a summary, a rephrasing —
is a different string every time and will miss on every lookup. Key on something
you control.

### 5.8 Second baseline — both fixes landed, and a third wrong check

7 cases x 5 runs, search unfixtured, after fixing issue #3 and #3b.

```
cov-001 5/5   cov-002 5/5   cov-003 0/5   cov-004 5/5
cov-005 5/5   cov-006 5/5   cov-007 5/5
30/35 runs    6/7 cases green    p95 46.6s    551k in / 113k out    0 flaky
```

| | baseline 1 | baseline 2 |
|---|---|---|
| `cov-002` | 2/5 | **5/5** — the citation checker fix |
| `cov-003` | 4/5 on a wrong expectation | 0/5 on a rewritten case |
| `cov-007` | — | **5/5** — new control |
| flaky cases | 2 | **0** |

**Zero flaky cases** matters more than 30/35. Every case is 5/5 or 0/5, so every
remaining disagreement is a real disagreement between us and the model rather
than noise, and is therefore diagnosable.

**Issue #3, closed.** `resolveCitedForm()` reads the 12 policy documents once and
indexes each by both its filename and the form id in its heading, then accepts
either, in any case. Verified against the exact strings that were failing —
`auto-exclusions-schedule-2023.md#…` and `auto-pa-2023-01.md#…` now resolve;
`PA-9999-99#x` and `auto-nonexistent.md#x` are still rejected; TX and the
national form still resolve separately, so §2.6's near-duplicate trap survives.

Deliberately not fixed by loosening `src/grounding/form-id.ts`. That regex also
drives search filtering, where widening it would silently merge the state
variants — the §2.6 bug itself. **Leniency belongs in the thing that is too
strict, not in the thing it shares a helper with.**

**Issue #3b, closed by splitting the case rather than choosing.** The trap was
that `cov-003` was doing two jobs: testing AUT-4472, and acting as `cov-001`'s
control. Correcting its expectation would have destroyed the control. So:

- `cov-003` becomes the **denial case** — AUT-4472 never bought rental.
- `cov-007` becomes the **control** — AUT-4473 is the only record in the corpus
  with rental selected, no endorsement, on base form PA-2023-01, which is what a
  control for cov-001 has to be. 5/5 first time out.

Worth naming: a case doing two jobs looked fine until one of them turned out to
be wrong, at which point neither could be fixed without breaking the other.

### 5.9 …and the third wrong check in a row (issue #3c)

`cov-003` is 0/5, failing only `answer_lacks:$40` — a check written **this
session**, an hour before the run that killed it.

The reasoning behind it: quoting a per-day figure for coverage a customer does
not have is how a wrong number reaches a customer. Not unreasonable. What all
five runs actually did:

```
"None on this policy. Rental Reimbursement is not selected on AUT-4472, so no
 per-day rental reimbursement is payable. (For reference: the PA-2023-01 …)"

"1) None — this policy (AUT-4472) does not include Rental Reimbursement.
 2) (If it had been purchased) the PA-2023-01 form provides $40 per day …"
```

Denial first, unambiguous, then the figure explicitly marked counterfactual.
`answer_lacks` is a substring match; it cannot separate "the answer is $40" from
"if she had bought it, it would be $40."

This is a **product decision, not a bug**: may a denial carry the figure the
customer does not get, labelled as hypothetical? Arguments both ways in a claims
context — it is more useful to Priya, and it is also a number that can be quoted
onward stripped of its caveat. Left for the case author (§9).

**Three for three.** Every failure this suite has produced since it started
being run properly:

| looked broken | actually broken |
|---|---|
| `cov-002` 2/5 | the citation checker |
| `cov-003` 4/5 | the case's expected answer |
| `cov-003` 0/5 | the check that replaced it |

Not "the model is always right" — it is what a young suite looks like. Test code
gets none of the review the system under test gets, and it is the only code
where a bug arrives disguised as a result. The working rule: **confirm the
failure is real before changing the thing being tested.** Three times now, it
was not.

---

## 6. Pillars 5–8 — partial or not started

**Pillar 5, telemetry.** Tokens, latency, turn count and tool calls are
computed and printed per run, and the eval runner writes
`evals/results/last-run.json`. **The durable request log now exists** —
`telemetry/request-log.ts` appends one per-claim line for every `ask`, `eval`
and `ingest`, and `pnpm logs:sync` ships it to Postgres. Still owed: a verified
`gpt-5-mini` price, which is PROVISIONAL today.

**Pillar 6, credentials.** `DefaultAzureCredential` only, no keys anywhere,
same code path locally (`az login`) and in Azure (managed identity). `.env`
holds identifiers, not secrets, and is gitignored. The HTTP surface now exists
(`POST /api/ask`) and the **fail-closed API key guard is written**
(`security/guard.ts`, every branch exercised by `pnpm guard:check`).
**Missing:** a deployment that actually sets `API_KEY`.

**Pillar 7, escalation.** Works, and three eval cases cover it (`cov-002`,
`cov-004`, `cov-006`). Thinly measured — three cases is not the "here are the
twenty ways this goes wrong" number.

**Pillar 8, deployment.** Not started.

---

## 7. Known issues, open

**Closed 2026-09-10 — cov-001 quoted the superseded figure, ~1 in 20.**
Measured at 19/20 with `--only cov-001 --repeat 20`. The failing run made 3 tool
calls and named `PA-END-2024-03` in the answer, then gave the base form's
$40/30 — so the cause was precedence, not a skipped search. (An earlier failure
made only 2 tool calls and looked like a skipped step; fixing that would have
been the wrong fix.) `coverage-prompt.ts` now says an attached endorsement
REPLACES the base form wording it amends and the answer must lead with the
endorsement figures. Re-measured 20/20, control `cov-007` also 20/20 and still
2 tool calls per run. **Not proof**: at a 5% rate a clean 20 occurs ~36% of the
time. Treat as "not observed since" until several full baselines agree.

**Closed 2026-09-10 — severity buckets missed two dangerous check families.**
The 17:15 baseline had `cov-001` answer $40/30 days for a customer on the $50/21
endorsement. It failed `cites_form` and `answer_contains`, and `severityOf()`
only counted `escalates|citations_resolve|answer_lacks` as `false_answer`, so
the worst run in the set reported as `uncategorised` while the card printed
"false answers: 1". `FALSE_ANSWER_CHECKS` now covers every check in `checks.ts`
except `does_not_escalate`, and `pnpm severity:check`
(`src/eval/scorecard-selftest.ts`) asserts that every name in the new
`CHECK_NAMES` export maps to a bucket, plus a negative control that an unknown
name still falls through. Verified twice: by the new test, and by `eval:history`
re-classifying the stored 17:15 baseline, which now reads `false 2` where the
live card said 1.

**Measured 2026-09-10 — cov-002 fabrication ~1.5%, and it is the expensive
case.** `--only cov-002 --repeat 20` → 20/20. With the single observed failure
earlier that is 1 in ~65 runs (~1.5%, wide error bars). Left alone: it is rare,
`citations_resolve` catches it, and tuning a prompt against a 1.5% event without
a hypothesis is guessing.

The cost finding matters more. 1,241,527 input tokens over 20 runs = **~62k per
run**, against ~11k for cov-001 — 6-11 tool calls each, 40-77s, ~$0.04 per run
at the provisional rate. Structural: nothing in the corpus addresses rideshare,
so it rephrases and re-searches until it escalates, and every turn resends the
whole transcript. **The question with no answer is the most expensive one to
ask** — an average cost per claim hides that, and a customer's hardest questions
are exactly the ones nothing addresses. Both the observed fabrication and the
longest run in this batch were 12-turn runs, i.e. at the cap; consistent with
"the harder it searches, the likelier it invents", on a sample of two.

**Open — one intermittent model failure, rate now measured.** `cov-001` skipped the
endorsement search once in five (2 tool calls instead of 3) and answered from
the base form. `cov-002` fabricated `PA-END-2023-01` once, now measured at ~1.5% (see above).
`cov-001` was fixed and is covered by its own entry.

**Closed 2026-09-10 — issue #3c, `answer_lacks:$40` on cov-003.** Decided in
favour of allowing the counterfactual: the assistant may quote the base-form
figure for coverage the customer does not hold, provided the denial comes first
and the figure is explicitly hypothetical. Rationale: an adjuster phoning an
unhappy customer needs "you would have had $40/day if you had taken that
option". The check was a substring search and could not distinguish the two
readings, so it was removed from the case rather than tightened. `cov-003` is
still guarded by `does_not_escalate`, `cites_record:AUT-4472` and `has_answer`.
Consequence: baselines recorded before this date are not comparable on cov-003.

| # | Issue | Severity | Fix shape |
|---|---|---|---|
| 1 | `cov-001` failed once, manually, and has not failed since | **unreproduced** — not closed | 5/5 in the baseline at 4 turns/run, so the cap was never the mechanism. 1 fail in 11 lifetime. Watch it; do not "fix" it |
| 2 | ~~`cov-002` sits on the turn cap~~ | **closed 2026-09-05** | `DEFAULT_MAX_TURNS = 12`, shared by `ask` and `eval` |
| 3 | ~~`citations_resolve` rejects real documents~~ | **closed 2026-09-05** | `resolveCitedForm()` in `checks.ts` reads the corpus once and accepts a form id or a filename, any case. `cov-002` 2/5 → 5/5 |
| 3b | ~~`cov-003` expects `$40/30` but AUT-4472 never bought rental~~ | **closed 2026-09-05** | `cov-003` rewritten as a denial case; new `cov-007` (AUT-4473) takes over as `cov-001`'s control, 5/5 |
| 3c | `cov-003` 0/5 — `answer_lacks:$40` rejects a correct denial that adds the base-form figure as an explicit counterfactual | **high**, blocks the scoreboard | **needs a decision** — is a labelled hypothetical figure acceptable in a denial? Drop the check, or keep it and tighten the prompt. See §5.8 |
| 4 | p95 latency 46.6s over 35 runs, but **two** outliers now — 335.6s (`cov-002`, run 1) and 209s (`cov-004`, run 2). Two in two baselines is not a one-off | medium | `reasoningEffort`, fewer turns — still empirical, now with a denominator |
| 5 | ~~Eval suite runs each case once~~ | **closed 2026-09-05** | `--repeat`, default 5, pass rate per case, counts in runs |
| 5b | ~~Severity buckets silently dropped failed runs~~ | **closed 2026-09-05** | `UNCATEGORISED` line, printed when the counts do not sum. Widening the regex would have re-run the §5.5 mistake |
| 6 | Foundry resource is shared with `../Travel-Assistant` | low now, blocking before any cost claim | its own resource |
| 6b | Retrieval is no longer frozen between runs — search fixtures dropped (§5.7), so a moving scorecard cannot be attributed to your change | medium | key fixtures on `(case id, call index)` instead of on arguments |
| 7 | Pure vector retrieval, no hybrid/BM25, no reranker | medium | `../ROADMAP.md` §Week 2 — do it **after** the eval set can measure it. Harder than expected: `@langchain/community`, where LangChain's BM25 retriever lived, is deprecated. Options are Postgres full-text search behind a custom retriever, or a small in-process BM25 fused with `EnsembleRetriever` (`@langchain/classic`, 1.x) |
| 8 | ~~Agents SDK scores 28/35 with 2 flaky cases vs the hand-rolled 30/35 with 0~~ | **closed 2026-09-06** | The full stack (SDK + LangChain) scores **30/35, 0 flaky**, and both suspect cases are 5/5. Three of the four 2x2 cells agree; the 28/35 cell was sampling noise. See §10.7. Reopen and diff against `archive/pillar-2-handrolled/loop.ts` if either case goes flaky again |
| 9 | LangChain re-embeds the whole corpus on every ingest | low now, real later | The hand-rolled embedder was a content-addressed cache keyed on a sha256 of chunk content, so a re-ingest cost zero API calls. That is gone. At 128 chunks it is pennies; on a real corpus it needs rebuilding as a check before `addDocuments` |
| 10 | ~~`narration/audio/` is stale after the migration~~ | **closed 2026-09-06** | Re-rendered 7 changed sections. 15/15 mp3s, 395 spoken lines, 0 skipped, ~59 min. Note for next time: renamed sections leave an orphaned audio directory, so delete those as well as changed ones — `narration/README.md` has the loop |

---

## 8. What to do next

*This section is the **customer** backlog. A parallel, job-shaped plan lives in
[`GUIDE.md`](GUIDE.md) §10 — a second agent framework, a streaming surface, a
second provider. It shares the eval gate with this list and nothing else; keep
the two orderings separate, because the argument below ("fix the checker before
trusting any number") stops being readable if they interleave.*

### 8.1 ~~Make the numbers trustworthy~~ — done 2026-09-05

`--repeat` (default 5), `maxTurns` 12, baseline recorded in
[`evals/README.md`](evals/README.md). Issues #2, #5 and #5b
closed; #1 downgraded to unreproduced rather than fixed — see §5.6 for why the
turn cap does not get the credit. Issue #3 was promoted low -> high.

### 8.2 Then — fix the harness and the case file, in that order

`cov-001` has nothing reproducible to fix; §5.6 found two different bugs in its
place, and **both are ours, not the model's**. Order matters:

1. **Issue #3 — `citations_resolve`.** Until it stops rejecting real documents,
   every future number carries a 3-in-5 false failure on cov-002 and the
   *false answers (dangerous)* count is not readable. Fix the harness before
   trusting anything it says. Re-baseline against **both** cov-002 and cov-001 —
   cov-001 passes `citations_resolve` 5/5 today, so a loosened checker must not
   quietly stop catching anything there.
2. **Issue #3b — `cov-003`'s expectation.** It is `cov-001`'s control and it is
   currently wrong, so the guard against an over-broad fix does not work. Decide
   whether the case becomes a denial case or is replaced by a real
   `rental: yes, no endorsement` control.
3. **Then re-baseline** and compare to 2026-09-05 before touching the prompt.

`FDE.md` §4.7 step 8 still applies to whatever is left after that: **fix the
structural cause, not the sentence.** What §5.6 adds is a step before it — make
sure the failure is real. Two of four here were not.

### 8.3 Then — Pillar 5, properly

A durable request log (`telemetry/request-log.ts`), written from every model
call, with tokens/latency/cost/tool-calls and a `claim:<id>` tag. It cannot be
reconstructed later, and the first real question a customer's finance team asks
is "what does this cost per claim."

Deliberately refuse to price a model with no verified pricing data rather than
emit a plausible number.

### 8.4 Then — grow the eval set

Six cases is a demo, not a scorecard. `../ROADMAP.md` §Week 3 says **50–100
hand-labelled**, with ~15 adversarial and ~10 that must be refused or escalated.

Sources for new cases, in order of value:
1. Every bug found from here on — write the case first, then fix.
2. The near-duplicate axis: one case per state variant.
3. The `PE-2023-01` optional-rental trap — rental is only covered if it is on
   the Declarations, so `AUT-4485` (`rental: no`) is a real denial case.
4. Questions with no policy id at all — must ask, never guess.

### 8.5 Then — retrieval improvements, measured

Hybrid search (BM25 + vectors) and a reranker. **After** the eval set can
measure them, so the deliverable is a table:

```
baseline → +hybrid → +reranker → +prompt v2
with accuracy, p95 latency, and cost per query in each row
```

That table is worth more than the app. Adding a reranker now is guessing it
helps; adding it after gives you "the reranker bought 7 points."

> **DONE — on steering, not on insurance, 2026-09-14 (§23).** The table exists
> and the sentence is real: *the reranker bought 12.5 points of recall@6.* It
> also took the predicted route — the baseline had to be built first, and it was
> the baseline that turned up the RRF flaw, not the reranker. **Insurance still
> has no retrieval suite**, so for insurance this item is unchanged.

### 8.6 Then — Pillars 6–8

The HTTP surface exists (`POST /api/ask`) and its **fail-closed** API key guard
is written and `pnpm guard:check`-tested (unset ⇒ loopback only in dev, refuse
in production, never open). What is left is setting `API_KEY` wherever this
runs, and then deployment — with the honest constraint from `FDE.md` Pillar 8 in
mind: a real insurer may not let claims data leave their network at all.

### 8.7 The customer-facing half — do not skip

`../ROADMAP.md` §2 estimates the engineering half at ~60% ready and the
customer half at ~10%, and warns that people over-invest in the comfortable
one. Still owed:

- The §7 **scoping one-pager**, written as if with the customer.
- The §8 **10-minute demo**, rehearsed out loud three times.
- A **known-failures list** to hand over. Being able to say what the system
  cannot do is a trust move, not a weakness — §7 above is the start of it.

---

## 9. Working agreement

Scaffolding and mechanical work gets written for you. The **judgment calls are
yours** — schema shape, which eval cases exist, how a failing prompt gets
fixed. `FDE.md` §4.8 is explicit that the fixing step is where the engineering
judgment lives and is worth doing yourself once with guidance rather than
watching it happen.

Decisions taken so far, and by whom:

| Decision | Choice | Who |
|---|---|---|
| Corpus flaws | all four planted | you |
| Corpus mix | 12 wordings + 18 records | you |
| Output scope | coverage answer, not claim determination | you |
| Escalation shape | separate field, allows partial answer + flag | you |
| Fixtures | record/replay | you |
| Build order | Pillar 3 before Pillar 2 | me, reasoned in §4 |
| Two tools not one | lookup ≠ search | me, on advice |

---

## 10. The framework migration — 2026-09-06

**Read this first when coming back.** It supersedes §2 and §3, which describe
the hand-rolled implementations those pillars used to have.

### 10.0 Resuming — what has to be running

The policy index now lives in Postgres, not a JSON file. Nothing works without it.

```bash
docker start claims-pgvector        # created 2026-09-06; if gone, see README
pnpm ingest                         # only if the container was recreated
pnpm typecheck && pnpm schema:check && pnpm compliance:check   # all offline
```

If `docker ps` shows no `claims-pgvector`, the create command is in `README.md`
under "Run it". `DATABASE_URL` defaults to that local container; Neon, RDS or a
customer's own cluster is a connection-string change and nothing else.

### 10.1 Why we moved at all

The brief was explicit: prefer frameworks over hand-written code, so the
architecture is one that transfers to the next engagement rather than being
re-derived each time; keep customer data inside a region we control; and stop
maintaining plumbing that somebody else maintains better.

That is a different objective from the one §3 was written under, and it changed
the answer. **The argument §3 makes for hand-rolling — that a framework destroys
your audit trail — does not survive contact with the evidence.** The Agents SDK
returns `rawResponses` and a full `history`, which is the same record, with less
code. Three reasons did survive, and they are about defaults rather than
auditability: owning the transcript (`store: false`), three non-default
behaviours we depend on, and the value of having written it once to learn it.

### 10.2 What each pillar is built on now

| | Framework | Kept by hand, and why |
|---|---|---|
| Pillar 1 | LangChain.js + `@langchain/pgvector` | `chunker.ts`, `loader.ts`'s content hash, `form-id.ts` |
| Pillar 2 | `@openai/agents` | the prompt, and the coherence rules the SDK cannot express |

**Why LangChain and not LlamaIndex.** Every LangChain package that matters is
1.x; `llamaindex` is 0.12.1 and `@llamaindex/postgres` is 0.0.66. For a decision
meant to be carried between engagements, a stable API beats a richer one.

**Why pgvector and not Azure AI Search.** Azure AI Search was recommended first
and then withdrawn when the requirement turned out to be portability rather than
Azure-nativeness. *"Can we run Postgres"* is never a blocker in any engagement;
*"can we stand up a vector database"* is a new-infrastructure conversation. The
store is the one file that changes per customer (`src/grounding/store.ts`),
which is the whole point of the arrangement.

**Honest wrinkle:** `@langchain/pgvector` is 0.1.0 and `@langchain/community` —
where LangChain's BM25 retriever lived — is deprecated outright. The risk is
contained because the stable contract is the `VectorStore` *interface*, so the
adapter can be swapped for `@langchain/qdrant` (1.0.3) without touching a line
above `openStore()`.

### 10.3 The boundary, and how it was found

Three files were archived and then measured back out of the archive:

- **`chunker.ts`** — LangChain.js ships five text splitters and **not one
  attaches the heading trail as metadata**. Python has
  `MarkdownHeaderTextSplitter`; the JS port does not. Without the trail there is
  no `PA-2023-01 > Part IV > 4.4` on a passage, so no citation, so
  `citations_resolve` has nothing to verify. LlamaIndex's `MarkdownNodeParser`
  *does* keep headers — but has no size budget and no table handling, so it
  reintroduces the orphaned-`$1,000` problem it was brought in to avoid.
- **`loader.ts`** — mostly replaced by `DirectoryLoader`/`TextLoader`. What
  survived is the stable content hash, which LangChain has no notion of.
- **`form-id.ts`** — pure domain, and `eval/checks.ts` imports it.

> **The framework does the generic 90%. The domain-specific 10% is exactly what
> you keep.**

Both boundaries were settled by reading a type signature and finding the
capability absent — minutes of work that prevented weeks of the wrong decision.
That is the transferable move, more than either library choice.

### 10.4 The chunker's parsing moved to `markdown-it`

The three rules in `chunker.ts` are **policy**; deciding which lines are
headings and where a table starts is **parsing**, which is commodity and was
being done with hand-rolled regex. It is now `markdown-it`.

Not cosmetic: `/^(#{1,6})\s+(.*)$/` cannot know it is inside a fenced code
block, so `# total` in an example would become a heading and silently reshape
chunk boundaries. Setext headings were missed entirely.

Two constraints worth not re-deriving:

- **`unified`, `remark` and `marked` are ESM-only at current versions**; this
  project is CommonJS. That eliminated the obvious choice. `markdown-it` is CJS
  and a better fit anyway — its tokens carry `map: [startLine, endLine]`, which
  is exactly what the table-windowing needs.
- **`allowSyntheticDefaultImports` is set and `esModuleInterop` is not.** So
  `import MarkdownIt from 'markdown-it'` typechecks and is `undefined` at
  runtime. Fixed with `import MarkdownIt = require('markdown-it')` rather than
  flipping a global flag mid-task.

**Verified neutral:** chunk counts at four hostile budgets are byte-identical
before and after (128 / 205 / 573 / 805, orphans 0), and the measured retrieval
scores in §2.4 reproduce exactly (0.569 / 0.562 / 0.559 / 0.559 / 0.550).

### 10.5 The two egress defaults, and the new kind of check

Found by reading the SDK's own types and source, not its docs. Both opt-**out**:

1. **`store` defaults to true** (`model.d.ts:286`). Adopting the SDK without
   setting it would have silently started persisting claim payloads on the
   provider's side, in what looked like a pure refactor.
2. **Tracing defaults to on**, exporting to
   `https://api.openai.com/v1/traces/ingest` (`openaiTracingExporter.js:527`)
   with model inputs, tool arguments and tool results attached. This is the
   worse one: a **second destination**. Model calls go to Foundry in a region we
   chose; traces would have gone to OpenAI regardless.

Today the exporter no-ops because we set no OpenAI key. **That is safety by
accident.** `pnpm compliance:check` therefore sets a fake `OPENAI_API_KEY` on
purpose and asserts nothing is dispatched anyway.

> **Adopt the framework, then pin the compliance-critical behaviour with a test
> that fails the build.** You do not trust a default and you do not trust the
> docs. You assert it on the wire.

It carries **negative controls** — re-enable tracing and the span check must
catch it; build an `Agent` without explicit settings and `store` must come back
absent — because §2.7 already caught one check that had never executed.

### 10.6 Three bugs this migration produced, all ours

Consistent with §5.9's "three for three", the score is now higher.

**The tools were never passed to the agent.** `loop-sdk.ts` built its tool array
and did not hand it to `new Agent(...)`. The model got zero tools. The eval
caught it instantly — **and two cases passed anyway**, because both are
escalation cases and a model with no tools escalates. Green for entirely the
wrong reason. A suite of only escalation cases would have shipped this. There is
now a wiring assertion in `compliance:check`.

**Turn records were overwritten on schema retry.** `turns = turnsFrom(...)`
rather than accumulating, so a retry erased the first attempt's turns and tool
calls. That is why `cov-004` reported "1 turn, 0 tool calls" for a run that had
made two tool calls: pass/fail was right and **the audit trail was a lie**. In a
claims context the audit trail is the deliverable.

**A reset helper that could not reset.** `resetSdkConfiguration()` was supposed
to give the compliance test a fresh client per scenario. `setDefaultOpenAIClient`
is **first-write-wins** — the SDK caches the client on first model resolution
and ignores later calls. A probe showed the second scenario capturing **zero**
requests while appearing to pass. The helper is deleted rather than renamed; a
function that appears to swap the client and cannot is worse than none.

### 10.7 Measured results

| Configuration | runs | green | flaky | p95 |
|---|---|---|---|---|
| hand-rolled loop + hand-rolled retrieval (2026-09-05) | 30/35 | 6/7 | 0 | 46.6s |
| **Agents SDK** + hand-rolled retrieval | 28/35 | 4/7 | **2** | 67.2s |
| hand-rolled loop + **LangChain/pgvector** | 30/35 | 6/7 | 0 | 50.4s |
| Agents SDK + LangChain/pgvector | 30/35 | 6/7 | 0 | 49.5s |
| **…plus Zod schemas (pillar 3) — current** | **30/35** | **6/7** | **0** | **41.2s** |

**Pillar 1's swap is proven neutral** — identical case for case, with `cov-003`
(issue #3c) the only failure in both.

**Pillar 2's swap is also neutral, and the second row was noise.** Read the
four rows as a 2x2: loop (hand-rolled / SDK) crossed with retrieval
(hand-rolled / LangChain). Three of the four cells are identical — 30/35, 6/7,
zero flaky. Only `SDK + hand-rolled retrieval` differs, and `cov-004` and
`cov-005` — the two cases that were flaky there — are 5/5 in the full-stack run.

Retrieval is provably neutral (rows 1 and 3 agree exactly), so the 28/35 cell
cannot be explained by retrieval either. The parsimonious reading is **sampling
noise in a 35-run sample against a model with real run-to-run variance**. The
p95 supports it: 67.2s in that cell against 46.6 / 50.4 / 49.5 elsewhere, which
is the signature of a couple of slow outliers rather than a systematically
slower loop.

Stated honestly: **not proven, but three of four cells agree and the two
suspect cases now pass 5/5.** Issue #8 is closed on that basis. If either case
goes flaky again, reopen it and diff against
`archive/pillar-2-handrolled/loop.ts` — which is precisely why that file was
kept.

**The migration is complete and measured: both frameworks adopted, scorecard
unchanged from the pre-migration baseline.**

### 10.8 What is left, in order

1. **Record all four baselines in `evals/README.md`.** It still describes the
   2026-09-05 hand-rolled run as current. The progression — baseline, then each
   framework — is the "worth more than the app" table §8.5 argues for.
2. **Pillar 5, telemetry.** Still the urgent one and still not started; it
   cannot be reconstructed later. `FRAMEWORKS.md` recommends OpenTelemetry
   exporting to Azure Monitor: instrument once, keep data in a tenant already
   cleared, avoid a new vendor review. Prisma is a reasonable fit for the
   request log itself — real relational data — but not for the vector store.
3. **Then the framework choices for pillars 3–8**, which are laid out with
   trade-offs in `FRAMEWORKS.md` and still undecided.

### 10.9 Files that moved

```
src/ingest/*                    → src/retrieval/*  and  archive/pillar-1-handrolled/*
src/agent/loop.ts               → archive/pillar-2-handrolled/loop.ts
src/agent/engine.ts             → archive/pillar-2-handrolled/engine.ts
src/agent/loop.types.ts         NEW — the contract, extracted so the loop stays replaceable
src/agent/compliance-selftest.ts NEW
src/retrieval/{embeddings,store,ingest,cli}.ts  NEW
archive/README.md               NEW — why the archive exists and what it is for
FRAMEWORKS.md                   NEW — per-pillar options and trade-offs
```

`AGENT_ENGINE` is gone; with one loop there is nothing to select. `archive/` is
excluded in `tsconfig.json`, so it neither compiles nor runs.

---

### 10.10 Pillar 3 — done, on Zod

**The defect it fixed.** `COVERAGE_SCHEMA` (JSON Schema) and `CoverageAnswer`
(the TypeScript interface) were maintained by hand, separately, with nothing
catching divergence. The type is now `z.infer<typeof CoverageAnswerSchema>` —
that class of bug is gone by construction rather than by discipline.

Scope: **both** the output schema and the tool parameter schemas. The tool
schemas are where the second hand-written JSON Schema and the `as never` casts
lived, and the Agents SDK takes Zod objects natively.

**Why Zod and not TypeBox**, reversing this file's earlier recommendation.
TypeBox preserves "the object you author is the object on the wire", which
`coverage-schema.ts`'s old header argued for. Two things overturned it:

1. *The technical objection to Zod was measured and did not hold.* The worry was
   `$ref`/`$defs` for the reused `Citation` sub-schema, which OpenAI strict mode
   rejects. Handing a Zod schema to the SDK and capturing the actual outgoing
   request gives `strict: true`, no `$ref`, no `$defs`, and
   `additionalProperties: false` on every object.
2. *"Exact object on the wire" is the same class of argument as the audit-trail
   one retracted in §10.1* — a preference for control that a framework satisfies
   differently. The generated schema prints in one line.

The deciding factor is **interop**, not elegance: Zod is what LangChain and the
Agents SDK both speak, for tool parameters as well as output. One schema
language across the stack. A tidier option that speaks to nothing else in the
stack is the worse choice.

**The risk, and the check that contains it.** The field descriptions are prompt
engineering — *"Be honest; an empty array is a strong statement and will be
audited"*, *"Do NOT resolve a conflict by picking the newer document"*. Dropping
one during the port leaves a schema that still validates, types that still
infer, a contract test that still passes, and a **quietly weaker prompt**.
Nothing in the repo would have caught it.

So `pnpm schema:check` now walks the generated JSON Schema and requires a
description on every field, at every depth. Following §2.7, it was verified
capable of failing by deleting one:

```
FAIL  every field carries a description
      MISSING on: citations[].claim — these fields lost their prompt text
```

The generalisation: **before moving anything prompt-bearing, make the thing you
are afraid of losing mechanically checkable.** The migration is otherwise
unfalsifiable — you would be trusting a diff.

**Kept hand-written:** `coherenceErrors()`. No library expresses "an unresolved
conflict with no escalation is rejected". Deliberately *not* Zod `.refine()`
calls: a refinement failure surfaces as a generic schema error, and these three
messages are handed back to the model to act on. "An unresolved conflict must be
escalated, never decided" is actionable; "invalid input" is not.

**Dropped:** `ajv`. **Added:** `zod` (already a transitive dependency of the
Agents SDK).

**One consequence for the archive:** `archive/pillar-2-handrolled/loop.ts` now
needs a one-line adapter (`z.toJSONSchema(...)`) to run, because
`LoopOptions.responseFormat` is a Zod type rather than `{name, schema}`. Noted
in `archive/README.md`. That is the ordinary cost of keeping a reference
implementation rather than maintaining one — and reading it, which is the point,
does not require it to compile.

**Verified neutral.** `pnpm schema:check` 10/10 plus description coverage,
`pnpm compliance:check` PASS, and the full baseline:

```
cov-001 5/5   cov-002 5/5   cov-003 0/5   cov-004 5/5
cov-005 5/5   cov-006 5/5   cov-007 5/5

30/35 runs    6/7 green    0 flaky    p95 41.2s    596k in / 78k out
```

Same score, same cases, zero flaky — and the **fastest p95 of any configuration
so far** (41.2s against 46.6 / 49.5 / 50.4). Not claimed as a win: nothing about
this change should affect latency, so the honest reading is that it sits inside
the same noise band the 67.2s outlier in §10.7 came from. Log:
`evals/results/zod-baseline.log`.


---

## 11. `src/` laid out by pillar

The tree had grown by accident rather than by design: `agent/` held pillar 2 and
pillar 3 together, `retrieval/` was pillar 1 under a name no document used, and
nothing in the layout told a reader which pillar a file belonged to. Since this
repo is read at least as often as it is run, that is a real defect.

```
src/grounding/   pillar 1   chunker, loader, embeddings, store, ingest, form-id, cli
src/tools/       pillar 2   loop-sdk, loop.types, coverage-prompt, *.tool, registry, fixtures
src/schema/      pillar 3   coverage-schema, schema-selftest, compliance-selftest
src/eval/        pillar 4   run, checks
src/foundry/     pillar 6   client — credentials
src/ask.ts                  the demo entry point; main/app.* are Nest scaffolding
```

Three placement calls worth recording, because each had a plausible alternative:

**`fixtures.ts` stays in `tools/`, though it exists to serve evals.** Moving it
to `eval/` would make `registry.ts` — pillar 2 — import from pillar 4. A pillar
importing its own test harness is a cycle waiting to happen. Dependencies point
*at* the thing under test, never away from it.

**The selftests are pillar 3, not pillar 4.** §4 already drew this line:
`schema-selftest.ts` and `compliance-selftest.ts` test the **contract**, which
is fixed and free to check; pillar 4 tests the **model**, which is stochastic
and costs money. Same word, different activity.

**No `shared/`.** `form-id.ts` is used by both `grounding/ingest.ts` and
`eval/checks.ts` and is the one file that resists the layout. It stays in
`grounding/` because it is a corpus concern. A `shared/` directory would have
held one file today and been a junk drawer within a month.

Pillars 5, 7 and 8 get no directory. 5 and 8 are not built; 7 is genuinely
distributed across `coherenceErrors()` and the `escalates` check, and a folder
would imply a component that does not exist.

**Verified.** Every path in the codebase resolves from `process.cwd()`, not
`__dirname` — checked before moving, because a corpus-listing check that
silently returns an empty set would *pass*. `pnpm typecheck` clean,
`pnpm schema:check` 10/10, `pnpm compliance:check` PASS. `git mv` throughout, so
rename detection survives and the history stays readable.

The `dist/` directory on disk was from a layout two refactors old
(`dist/ingest/`) and was deleted rather than left to mislead a reader.

---

### 11.1 The workspace — 2026-09-10

`src/` moved to `packages/insurance/src/` and the repo became a pnpm + Turborepo
workspace: `packages/insurance` (`@claims/insurance` — the tree above, plus
`examples/`, `evals/` and `scripts/`), `apps/insurance-app` (`@claims/insurance-app` — the page and
the `/api/ask` server route), and `infra/` (the Langfuse compose file and
`DEPLOYMENT.md`). The root is a workspace root and nothing else; `pnpm ask`,
`pnpm eval` and the rest still run from it, delegating with
`pnpm --filter @claims/insurance`.

**NestJS is gone.** `main.ts`, `app.module.ts`, `app.controller.ts`, `http/` and
`nest-cli.json` are deleted and `@nestjs/*`, `reflect-metadata` and `rxjs` are
off the dependency list. The HTTP surface is
`apps/insurance-app/src/routes/api.ask.tsx` — one app serves the page and the endpoint,
so the line above about "main/app.* are Nest scaffolding" no longer holds.

**And the `process.cwd()` verification above is now inverted.** cwd is the repo
root for `pnpm ask` and `apps/insurance-app` for the dev server, so the corpus path
silently resolved to `apps/insurance-app/examples/` and every lookup returned ENOENT.
Paths are now anchored in `packages/insurance/src/config/paths.ts`: `PACKAGE_ROOT`
for the corpus, the eval cases and their baselines, `REPO_ROOT` for the single
shared `.env` and `logs/requests.jsonl`.

**Entries above this one cite the pre-move paths.** They describe what was true
on their date; read `src/foo.ts` as `packages/insurance/src/foo.ts` throughout.

---

## 12. Pillar 4 — done, and deliberately without a framework

### 12.1 The decision

`FRAMEWORKS.md` recommended Promptfoo or Langfuse. Both were rejected, along
with Vitest, Braintrust/LangSmith, and — after checking rather than assuming —
Azure AI Foundry Evaluations. The runner stays. What the platforms were actually
being bought for was a **history and a diff view**, and that turned out to be
250 lines over baseline files this repo was already committing.

The reasoning is written up in full in `FRAMEWORKS.md` §Pillar 4. The short
version, in the order the arguments actually landed:

1. **Severity is not an assertion result.** Every platform models an eval as
   case → assertions → pass/fail. Our buckets are a classification of *which*
   check failed, aggregated over N samples. There is nowhere in Promptfoo's model
   to put that, so it comes back as a post-processing script over Promptfoo's
   JSON — the same code, one indirection further from the data.
2. **"No Docker, and it has to work at a real customer" removes the self-hosted
   option, and the managed one is worse.** An eval trace carries policy ids and
   coverage amounts. Managed Langfuse makes a third party a data processor for
   insurance data. That is a DPA and a vendor assessment — a bigger obstacle than
   the Docker container it was meant to replace.
3. **Foundry Evaluations was the best candidate and it cannot run our checks.**
   In-tenant, no new vendor, no Docker, has the UI. But the JS surface is
   `openAIClient.evals.create({ testing_criteria })` and the grader types are
   `string_check`, `text_similarity`, `score_model`, `label_model`,
   `azure_ai_evaluator`, `python`. No JavaScript grader. Our 11 checks are
   TypeScript. Verified against `@azure/ai-projects` 2.6.0 and the `openai`
   package's own `grader-models.d.ts`, not from memory.

The reusable form of this, which is the only part worth carrying to the next
engagement: **adopt a framework for the protocol, not for the judgement.**
Pillars 1–3 handed over problems with a known right answer — chunking, the
tool-call protocol, schema validation. The severity buckets are a claim about
what counts as dangerous in insurance, and no generic runner has an opinion
about that worth importing.

### 12.2 What was built instead

```
src/eval/scorecard.ts   the classifier + baseline shapes, extracted from run.ts
src/eval/diff.ts        pnpm eval:diff     — two baselines, per case
src/eval/history.ts     pnpm eval:history  — every baseline, one row each
.github/workflows/evals.yml
```

`scorecard.ts` exists for one reason: `run.ts` and `diff.ts` must classify
failures with the *same code*. Two copies of the bucket rules drift, and a
drifted classifier makes the history lie in the most expensive way available —
a "false answers 0 → 2" line that reflects a change in the classifier rather
than a change in the model. Extracting it is the whole reason the diff can be
trusted against baselines recorded weeks ago.

That the extraction is faithful is not asserted, it is shown: `pnpm eval:history`
recomputes all six historical baselines from their raw runs and reproduces the
numbers already written in this file by hand — 26/30, then 30/35 six times over,
the 28/35 wobble, and p95 41.2s at the end.

```
  when              engine      fixt   ×      runs  green flaky false     p95
  2026-09-05 19:39  unrecorded  record 5     26/30    4/6     2     3   48.7s
  2026-09-05 20:14  unrecorded  record 5     30/35    6/7     0     5   46.6s
  ···· setup changed — rows above and below are not directly comparable
  2026-09-06 10:16  sdk         off    5     28/35    4/7     2     6   67.2s
  ···· setup changed
  2026-09-06 10:33  hand        off    5     30/35    6/7     0     5   50.4s
  ···· setup changed
  2026-09-06 10:58  agents-sdk  off    5     30/35    6/7     0     5   49.5s
  2026-09-06 12:42  agents-sdk  off    5     30/35    6/7     0     5   41.2s
```

### 12.3 Two refusals, which are the point

**A diff across a changed setup refuses to run** (exit 2) rather than printing a
comparison with a warning above it. Different model, fixture mode or repeat
count means the number measures the setup, not the change. A warning above a
tidy table gets scrolled past and the number underneath gets quoted; §10.7 is
what that costs.

**A one-run move is never called a regression.** It prints as MOVED and does not
fail CI. This is the §10.7 lesson encoded: a middle run read as a regression at
28/35 with two flaky cases, and it was sampling noise. A dashboard that paints
every wobble red gets muted within a week, and a muted check is not a check.

That rule was got wrong on the first pass and caught by a negative control. The
false-answer bucket outranks the pass rate, so the gate originally failed the
build on *any* increase in it. But one run in thirty-five is the same coin flip
whichever bucket it lands in. Now the warning prints on any increase — a human
should look — and the exit code turns over only past the noise band.

### 12.4 Shown capable of failing

The same discipline `pnpm schema:check` and `pnpm compliance:check` already use.
Three synthetic baselines were built from a real one and run through the diff:

| control | expected | got |
|---|---|---|
| cov-001 dropped 5/5 → 2/5 | REGRESSION, exit 1 | REGRESSION, exit 1, `citations_resolve: failed 0 → 3` |
| model changed gpt-5-mini → gpt-5 | refuse, exit 2 | `NOT COMPARABLE`, exit 2 |
| cov-001 dropped 5/5 → 4/5 | MOVED, exit 0 | MOVED, "inside the noise band", exit 0 |

A diff tool that has never been shown to go red is a green light with no bulb.

### 12.5 CI — written, never yet run

`.github/workflows/evals.yml` is **added, not proven**. This repo has no git
remote at the time of writing, so the workflow has never executed once. Treated
the way §12.4 treats the diff: what has been shown is stated, what has not is
labelled. Before the first dispatch, four things have to exist and none of them
do yet — a remote, repository *variables* `FOUNDRY_OPENAI_ENDPOINT` /
`FOUNDRY_CHAT_DEPLOYMENT` / `FOUNDRY_EMBEDDING_DEPLOYMENT`, repository *secrets*
`AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID`, and a federated
credential on the app registration scoped to this repo. Expect the first run to
fail on something; a CI file that has never executed is a plan, not a pipeline.

The design, which is the part that is decided: `workflow_dispatch` and a nightly
cron, deliberately **not** on push. The suite calls the real model: 7 cases × 5
repeats, serial because the Foundry resource is shared (issue #6), which is a
~20-minute paid job. On every commit that spends money on typo fixes and trains
everyone to ignore a slow red X. The nightly run is not there to catch our
commits; it is there to catch **the model changing underneath us**, which has no
other signal.

Auth is `azure/login` with OIDC federation — a short-lived token
`DefaultAzureCredential` picks up exactly as it picks up `az login` on a laptop,
so `src/foundry/client.ts` needs no CI branch and no API key exists in the
workflow or in repository secrets. Postgres is a `pgvector/pgvector:pg16`
service container re-ingesting the committed corpus.

Cheap checks run first: `typecheck`, `schema:check`, `compliance:check` are free
and instant, and there is no reason to spend twenty minutes of model time to
discover the schema is broken.

### 12.6 Verified neutral

The layout refactor and the scorecard extraction were checked the way every
other pillar section checks itself — a full baseline, compared against the one
before it, using the diff tool itself. This is also `eval:diff`'s first
non-synthetic run:

```
  cov-001        5/5     5/5   ·   green, held
  cov-002        5/5     5/5   ·   green, held
  cov-003        0/5     1/5   +1   MOVED up 1 run — inside the noise band
                                answer_lacks:$40: failed 5 → 4
  cov-004        5/5     5/5   ·   green, held
  cov-005        5/5     5/5   ·   green, held
  cov-006        5/5     5/5   ·   green, held
  cov-007        5/5     5/5   ·   green, held

  runs passed    30/35 (86%) → 31/35 (89%)
  false answers  5 → 4 of 35  ▼ better
  VERDICT: NEUTRAL
```

Moving `src/` and extracting the classifier changed nothing, which is the
result a refactor wants. Note what the tool did **not** do: `cov-003` gained a
run and the dangerous bucket dropped one, and it still printed NEUTRAL rather
than claiming an improvement. One run in five is a coin flip in either
direction, and a tool that only applies that scepticism to bad news is not
sceptical, it is optimistic.

### 12.7 Still open — issue #3c, not #3b

A correction to earlier drafts of this section, which repeatedly named #3b as
the blocker. **#3b was closed on 2026-09-05** — `cov-003` was rewritten as a
denial case and `cov-007` (AUT-4473, rental selected, no endorsement) took over
as `cov-001`'s control. §5.1's table describes the pre-fix state and was read as
current. The issue table at §10 is the authoritative one.

What is actually open is **#3c**, and the record already says it needs a
decision rather than a fix: `answer_lacks:$40` rejects a correct denial that
adds the base-form figure as an explicit counterfactual. All four failing runs
in the baseline above deny coverage correctly and then say some version of *"if
it had been purchased, PA-2023-01 provides $40 per day"*.

**The recommendation is to keep the check and tighten the prompt**, not to drop
the check. A labelled hypothetical is still a number in an adjuster's notes, and
what survives a phone call is "40 dollars a day", not the sentence that framed
it. The prompt currently says nothing at all about coverage the customer did not
buy, which makes it the structural cause — and FDE.md §4.7 step 8 says fix the
structural cause, not the sentence. The over-correction risk is real and already
has its controls: a rule phrased too broadly would stop `cov-001` quoting $50/21
and `cov-007` quoting $40/30, both of which are correct because those coverages
*are* selected. Any prompt change here has to be re-run against all three. **No amount of tooling
around a wrong expectation makes it right**, which is precisely why this was not
allowed to be displaced by the framework question.


---

## 13. Pillar 4 gets a framework after all — Langfuse, self-hosted

### 13.1 What changed, and what it did not

§12 rejected all four eval platforms. One of those rejections rested on a
constraint that later moved: no server to run. Once a self-hosted service was
acceptable, exactly one of the four came back — and it is worth being precise
about why only one.

- **Promptfoo, Foundry Evaluations, Vitest** were rejected on **capability**.
  Owning the loop, no slot for severity, Python-only graders. A server changes
  none of that, so they stay out.
- **Langfuse** was rejected on **deployment**. That reason expired.

Reasons that survive a change of circumstances are worth more than reasons that
do not, and the four-way split made it possible to tell them apart in one pass
rather than re-litigating everything.

### 13.2 The line: framework for the dashboard, our loop for the judgement

Langfuse ships its own runner, `dataset.runExperiment({ task, evaluators })`,
and it is **deliberately not used**. Two properties kill it, and they are the
same two that killed Promptfoo:

1. `maxConcurrency` defaults to **50**. The repeats here are serial on purpose,
   because the Foundry resource is shared with `../Travel-Assistant` (issue #6).
2. `ExperimentParams` has **no repeat count**. A runner that visits each dataset
   item once turns the measurement back into a sample, which is the one thing
   this pillar exists to prevent.

So `run.ts` still drives, and Langfuse records. The severity buckets survive in
a form that is arguably better than the printed card: severity goes up as a
**categorical score** on each trace, computed by `scorecard.ts` — the dashboard
reports our classification rather than inventing one of its own.

`severityOf()` was extracted from `summarise()` for this, which made the
one-classifier rule real rather than aspirational: the printed card, the diff,
the history table and the dashboard now all call the same function. That the
extraction was behaviour-preserving is shown, not asserted — `eval:history`
recomputes all seven baselines and reproduces every number unchanged.

### 13.3 It is off by default, and that is not laziness

With no `LANGFUSE_*` set, `pnpm eval` behaves exactly as it always has. Half-set
throws at startup rather than silently recording nothing for twenty minutes.

The principle worth keeping: **a measurement must not require a running service
to produce a number.** The moment the eval suite needs Docker to be healthy
before it can tell you whether the model works, an infrastructure problem and a
model problem start looking identical from the outside.

### 13.4 Data residency is one environment variable

`LANGFUSE_BASE_URL` points at your own server. That is the control, and it is a
procurement decision more than a legal one: an eval trace carries policy ids,
coverage amounts and the model's reasoning about a named customer's
entitlements. Managed hosting makes a vendor a data processor for insurance
data, with a DPA to negotiate and a vendor assessment to open.

**SDK tracing stays off.** `loop-sdk.ts` calls `setTracingDisabled(true)`
because the Agents SDK's own exporter posts model inputs and tool arguments to
`api.openai.com`. Nothing here re-enables it; these spans are created by hand
and exported only to `LANGFUSE_BASE_URL`. `pnpm compliance:check` still asserts
zero SDK spans and still passes, which is what proves the two mechanisms are
unrelated rather than merely asserting it.

### 13.5 Three bugs that only running it could have found

None of these would have been caught by reasoning about the integration, and
one of them was not caused by it.

**The eval process never exited.** Pre-existing, and invisible for as long as
the only user was a human who reads the scorecard and hits ctrl-C — the output
is complete, so nothing looks wrong. It became consequential the moment §12.5
added a CI job: the suite would finish in twenty minutes and the job would then
sit there until its own 45-minute timeout killed it, reporting failure on a
green run. The pg pool was never closed. One line.

The general shape is worth keeping: **an interactive habit was hiding a bug
that only unattended execution exposes.** Every "it works when I run it" is
scoped to how you run it.

**An isolated tracer provider has no context manager.** Setting
`setLangfuseTracerProvider()` without a global context manager meant spans were
created and exported but never *active*, so `updateActiveObservation()` skipped
every update. Traces appeared in the UI with no input, no output and no
metadata — the failure was a warning line in a log and a dashboard that looked
populated. Fixed by installing `AsyncLocalStorageContextManager` globally while
keeping the tracer provider isolated, which is the narrow version of what
`provider.register()` does wholesale.

**The compose file was healthy-but-broken.** No MinIO bucket meant
`docker compose ps` reported everything healthy and ingestion 500'd on the first
trace. Now a `minio-init` service creates it and the server waits on it. Worst
failure shape there is: the status check agrees with you.

**And a fourth, found by review rather than by running:** `dataset.get()` was
being called *inside* `traceRun`, so a full baseline would have re-fetched all
seven dataset items over HTTP thirty-five times. It worked perfectly at the two
runs it had been tested on. Worse than the waste is where it would have
surfaced: the call sits in a `try` that only logs, so at volume it would have
produced 35 warning lines under a scorecard still reading PASS, with a silently
partial dataset-run view. Hoisted into `syncDataset`.

### 13.6 Verified — on a full baseline, not a smoke test

The first draft of this section claimed whole-suite verification on the strength
of `cov-006` at `--repeat 2`. `cov-006` is the fastest case in the suite and it
always passes, so the only path through `severityOf()` that had ever reached the
dashboard was `'pass'`, and the `error`/`stoppedBecause` output branch had never
run at all. That is the same defect this file keeps catching elsewhere: a claim
one notch stronger than its evidence.

Re-verified with a real 7×5 baseline, Langfuse on:

```
cov-001 5/5   cov-002 5/5   cov-003 1/5   cov-004 4/5
cov-005 5/5   cov-006 5/5   cov-007 5/5

30/35 runs   5/7 green   p95 44.3s   0 warnings, 0 link failures
baseline-2026-09-06T17-05-02-110Z.json
```

What that actually exercised, which the smoke test did not:

| | evidence |
|---|---|
| three severity categories reach the dashboard | 38 traces, 38 severity scores: 33 `pass`, 4 `false_answer` (cov-003), 1 `no_answer` (cov-004#4, `schema_invalid`) |
| failing traces carry real content | `cov-003#5` has full `output`, `case`/`run` metadata, `stoppedBecause` |
| ingestion holds at volume | 35 traces in one run, no dropped scores, no backpressure |
| the hoisted dataset fetch works | zero `could not link` lines across 35 runs |
| the process exits at full scale | exit 1 (a red case), not a hang |

`pnpm eval:diff` against the previous baseline reads NEUTRAL: `cov-004` moved
down one run and that is inside the noise band. Note where the diff put it —
`no answer (infra/budget) 0 → 1`, not a false answer. A `schema_invalid` is a
plumbing failure, and the bucket that says so is the difference between "the
model got worse" and "one response failed to parse."

**One honest limitation of the dataset-run view.** Linking is per dataset item,
so a run of 5 repeats leaves **7 linked items, not 35** — one trace per case.
All 35 traces exist with full scores and are visible in the traces view; it is
the *dataset run* comparison that shows one representative per case. That is
Langfuse's model, not a bug, but it is the reason `eval:history` and the
baseline JSON stay the authority on pass rates.

Other checks, all green: `pnpm typecheck`, `pnpm schema:check` 10/10 plus
description coverage, `pnpm compliance:check` PASS (store:false and tracing-off
still hold with Langfuse wired in), `pnpm eval:history` reproducing every
historical number after the `severityOf()` extraction, and `pnpm eval` with
`LANGFUSE_*` unset running and exiting cleanly with no telemetry.

Setup is turnkey: the compose file provisions the org, project and API keys
headlessly, so `docker compose -f infra/docker-compose.langfuse.yml up -d` plus three
lines in `.env` is the whole thing. No click-through, which means the README
instructions cannot go stale against a UI.

### 13.7 A baseline must be the whole suite

Found by the tooling catching the mess the tooling had just made. Testing the
integration with `--only cov-006 --repeat 2` wrote a **one-case baseline** into
`evals/results/`. `eval:history` then listed it as a row beside seven-case runs,
and `eval:diff` picked it as "the previous baseline" and refused to compare —
correctly, since a partial run is not comparable to anything.

The rule was `repeat > 1`. It is now `repeat > 1 && no --only/--tag`, and a
filtered run says so rather than failing silently. The dataset run name follows
the identical rule, so the dashboard cannot grow runs with no counterpart in git.

A filtered run is a debugging aid, not a measurement. It still prints its card
and still writes `last-run.json`; it just does not get to enter the record. Two
polluted files were deleted.

The reusable shape: **the artefact that records history needs a stricter
admission rule than the command that produces it.** `--only` is a good flag; it
just should never have been able to write to the permanent record.

### 13.8 Still open

Unchanged by any of this: **issue #3c** (§12.7) — `answer_lacks:$40` rejects a
correct denial that adds the base-form figure as an explicit counterfactual.
The recommendation stands: keep the check, tighten the prompt, re-run
`cov-001`/`cov-003`/`cov-007` together.

And `.github/workflows/evals.yml` is still **unrun** (§12.5). The exit bug found
in §13.5 was one of the things that would have broken it.

---

## 14. Pillar 8 — the pharma surface is deployed — 2026-09-12

Pillar 8 had no code in any form. It now has one: the pharma release desk runs
in Azure Container Apps, built and shipped by GitHub Actions, reading the same
Neon project a laptop reads. Operational detail — resource names, the redeploy
command, the secrets — lives in [`infra/veresk/DEPLOY.md`](../infra/veresk/DEPLOY.md);
this section is the reasoning and the four things that went wrong.

Insurance is **not** deployed. Nothing here is a claim about it.

### 14.1 Not one line of application code changed

That is the result worth leading with, because it is what the earlier pillars
were for.

`packages/pharma/src/config/connections.ts` derives six databases from one URL,
so the cloud reads the same Neon project by being handed the same string.
`@fde/foundry` resolves credentials through `DefaultAzureCredential`, which
picks up a **managed identity** in Azure exactly as it picks up `az login` on a
laptop — so the deployed app reaches the model with no key, through the same
code path, with no CI branch and no `if (production)`. The fail-closed guard of
Pillar 6 was already written and tested; deployment just set its key for the
first time.

The only new code is a Dockerfile, a workflow, and this documentation.

### 14.2 Why Container Apps, and what "free" actually rests on

The requirements decided it, not preference. A release assessment takes 30-90
seconds and streams Server-Sent Events, which rules out the function-shaped free
tiers — Vercel, Netlify, Cloudflare Workers all want a short invocation.

The real discriminator was credentials. On Render, Koyeb or Fly,
`DefaultAzureCredential` degrades to a stored service-principal secret, which is
the thing `.env.example` tells you to stop and reconsider. On Azure it is a
managed identity and there is no secret at all. **The hosting choice was made by
the credential story, not by the price.**

Everything stayed in the EU: Container Apps and Foundry in Sweden Central, Neon
in Frankfurt.

Free rests on one setting. The grant is 180,000 vCPU-seconds per subscription
per month and it covers **active** seconds only — an idle replica is billed, not
granted. At 0.5 vCPU that is about 100 hours against the 730 in a month, so one
always-on replica would exceed the grant seven times over. `--min-replicas 0` is
not tuning; it is the entire claim. Foundry tokens are not free on any host, and
the Foundry resource is still shared with `../Travel-Assistant`, so no cost
number can be attributed to this app until it has its own.

### 14.3 Four failures, and the pattern they share

Every one of them reported success.

**The app never scaled to zero.** It sat at one replica through an hour of
idleness. `properties.template.scale.rules` was `null`: creating an app with
`--min-replicas 0` and no scale rule PERMITS scaling to zero without ever
causing it, because nothing triggers the evaluation. Every status surface said
the app was healthy, because it was — it was also quietly spending the grant the
whole plan depends on. An explicit HTTP scale rule fixed it, and the app then
scaled down and cold-started in 28.3 seconds.

**A deploy that deployed nothing.** The deploy job took its image name from
`needs.build.outputs.image`. Re-running only the failed deploy job skips
`build`; a skipped job contributes no outputs; and `az containerapp update
--image ""` treats an empty value as "change nothing" **and exits 0**. The step
went green having created no revision. It was caught only because the job goes
on to assert that the app's template carries the exact sha — it looped forty
times printing `image=...:v1` and failed. Both jobs now derive the tag from the
commit sha independently, since it is a pure function of the commit and there is
nothing to pass between them.

**A layer cache with nothing to cache.** The Dockerfile did `COPY . .` and then
installed dependencies. Docker discards every layer after a changed COPY, so
editing one line of TypeScript threw away the install and CI re-downloaded 580
packages per commit — while `cache-from: type=gha` sat there looking correct.
Reordering so that the lockfile and manifests come first makes every install
layer report `CACHED` after a source-only edit.

**Half a gigabyte of GPU runtime.** `pnpm deploy` re-runs native postinstall
scripts that the install above it skipped, and `onnxruntime-node`'s postinstall
downloads CUDA and TensorRT provider libraries from nuget — into an image with
no GPU, for a package only reachable under `EMBEDDINGS=local` while this runs
`EMBEDDINGS=foundry`. It was downloaded, layered, pushed, exported to the CI
cache, and pulled again on every cold start. `--ignore-scripts` on the deploy
step removed it: 1.34 GB to 1.02 GB.

The pattern: **none of these produced an error.** A healthy replica, a green
check, a configured cache, a successful build. Each was found by measuring the
thing itself rather than reading the status of the command that produced it,
which is the same argument §12.4 makes about evals — a check that cannot fail
is not evidence.

### 14.4 What the pipeline asserts, and why the assertions are the point

`az containerapp update` returns before the new revision serves, so a smoke test
run immediately can hit the OLD revision, get its 200, and turn the job green.
The deploy job therefore waits until the active revision reports `Provisioned`
AND the app's template carries the sha just pushed, then makes two requests: the
page must be 200, and `POST /api/ask` with no key must be **401**.

The second assertion is the one worth having. A deploy that shipped an empty
`API_KEY` would serve a perfectly healthy page to anyone on the internet, and
nothing else in the pipeline would notice.

Tags are the commit sha and nothing else — no `latest` — so "which commit is
live" is answerable by reading the revision.

CI reaches Azure by OIDC federation, so there is no Azure secret in the
repository. The only long-lived credential in the whole pipeline is a Docker Hub
**push** token, which is registry authority and not data access. Worth naming
rather than leaving implicit.

One trap for whoever hits it next: GitHub presents an **ID-qualified** federated
subject (`repo:owner@61829292/repo@1364157067:ref:...`), not the documented
`repo:owner/repo:ref:...` form. The first run failed `AADSTS700213`. The rule is
to match a credential to the `subject claim` the failed login PRINTS, rather
than to the documented shape.

### 14.5 Measured

All on the deployed app, not locally:

| | |
|---|---|
| Cold start from zero | **28.3s** (1.02 GB image) |
| Tool-using assessment | `assess_release` → Neon → model → validated answer |
| SSE through ingress | events at +3s, +4s, +12s — **not buffered** |
| Guard | 401 with no key, 401 with a wrong key |
| Databases | `/api/lots` returns real lots from Sweden |

The SSE check matters more than it looks. Buffering would fail **silently**: the
answer would still be correct and the live tool-event UI would simply be
decoration.

One answer is worth recording as a result rather than a fault. Asked "Can
LOT-IBU200-2608-A be released?" with no market, the deployed app refused and
asked which — because EU and US carry different specification limits. That is
§12.3's refusal behaviour surviving the trip to production.

### 14.6 Still open

- **The Docker Hub repository is public.** Docker Hub creates a repo public when
  a push creates it. No secret is in the image, but the compiled domain package
  is the thing a customer pays for. Making it private needs a read-only pull
  token attached with `az containerapp registry set` — and attached BEFORE the
  flip, or there is a window where the app cannot pull its own image.
- **211 MB of `onnxruntime-node` remains**, reachable only under
  `EMBEDDINGS=local`. Removing it means `@fde/grounding` treating
  `@huggingface/transformers` as optional — a change to a domain-neutral
  package, deliberately not made as part of a deployment fix.
- **No telemetry destination.** A container's disk is ephemeral, so the Pillar 5
  request log dies with the replica. `infra/DEPLOYMENT.md` recommends
  OpenTelemetry to Azure Monitor; none of it is wired.
- **Ingress is open to the internet**, protected by one shared API key. Adequate
  for a demo; not an authentication system.
- **Insurance is not deployed**, and `evals.yml` is still unrun (§12.5).

---

## 15. Cost stops being a ceiling — cached input, modelled — 2026-09-12

Every cost figure this project has ever printed was too high, on purpose, with
a note saying so. `prices.ts` carried the admission for two days:

> Cached input bills at $0.025/1M and is NOT modelled — the figure is a ceiling.

That is now measured. **The first real question through the new path reported
12,160 of 14,015 input tokens served from cache — 86.8% — and a cost of $0.0083
against a printed ceiling of $0.0111. The number had been 24.7% too high.**

### 15.1 The finding is not "it is cheaper"

It is that **output dominates, and nobody could have known that before.**

| | ceiling | modelled |
|---|---|---|
| input | $0.0035 | **$0.00077** (−78%) |
| output | $0.0076 | $0.0076 (unchanged) |
| | | **output = 91% of the bill** |

Output tokens are never cached. So the half of the bill that caching touches
collapsed, and the half it cannot touch did not move — leaving output as almost
the entire cost.

Every instinct about where to optimise was formed while input looked like a
third of spend. It is not. **Trimming the system prompt or the tool schemas is
now worth close to nothing**; `reasoningEffort` and answer length are nearly the
whole lever. That is a conclusion about where to spend engineering effort, and
it is the reason this was worth doing rather than a tidy-up.

One caveat that has to travel with the 86.8%: it is high **because of the loop's
shape**. Each turn re-sends the system prompt, the tool schemas and the
conversation so far, so turns 2 and 3 are mostly cache hits. A single-turn
question caches nothing. The rate is a property of agent loops, not of the
deployment.

### 15.2 Prompt caching was never switched on, because it was never off

Worth stating plainly, because the capability list called this "LLM Caching" and
that implies building something. **Azure caches automatically and has been
billing the discounted `cchd` meter all along.** Nothing was enabled here and no
cache was written. What was missing is that our own numbers did not know it had
happened.

This is *measuring* caching, not *implementing* it — the less glamorous half,
and the one that was a defect rather than an exercise. Result caching (not
paying to answer the same question twice) is a different piece of work and is
not started; it is gated on whether anything actually repeats, which the web
surface's new ask-history table can answer with one query rather than a guess.

### 15.3 Three traps, written down before the code

**Cached tokens are a SUBSET of input tokens, so the formula subtracts.**
Every provider reports them that way. Added instead of subtracted, a cache HIT
makes a request look *more* expensive — and that is the direction nobody
investigates. A cost going up gets shrugged at; only a cost going down gets
audited. `pnpm price:check` exists chiefly to hold this one line.

**`undefined` is never collapsed into `0`.** Zero claims a measurement;
absence admits there wasn't one. Collapse them and an engine that simply does
not report the field looks like an engine on which caching never helps — a
false finding about exactly what three engines exist to compare. The dollar
figures are *identical* either way, which is the trap: only `costNote`
distinguishes them, so the caveat had to travel on the line.

**A discount needs BOTH facts** — an engine reporting a count AND a confirmed
rate from a bill. Either missing and the figure stays a ceiling rather than
becoming a guess. A discount applied on half the evidence understates spend,
and `prices.ts`'s standing rule is that a precise-looking wrong number is worse
than an admitted gap.

A fourth, found while writing it: **the cached count is clamped to the input
count.** Unclamped, a nonsense reading makes the remainder negative and *shrinks
the bill the more absurd it gets*. Providers report a subset; this refuses to
profit if one ever does not.

### 15.4 Field names came from type definitions, not from a paid call

Three engines, three different places, none of them guessable:

| engine | where the count lives |
|---|---|
| Agents SDK | `inputTokensDetails.cached_tokens` |
| Mastra (AI SDK) | `usage.cachedInputTokens` |
| LangGraph (LangChain) | `input_token_details.cache_read` |

**A guessed field name yields a silent zero, which is indistinguishable from a
cache that never hit** — so all three were read out of the installed packages'
own `.d.ts` files rather than from one expensive live call and a hopeful
`?? 0`.

Two details that would each have been a silent bug:

- The Agents SDK exposes `inputTokensDetails` as an **array** on the aggregate
  `Usage` (one entry per request) and as a plain object on a single
  `RequestUsage`. Reading only the object form returns nothing on the path the
  loop actually uses.
- LangChain splits `cache_read` from `cache_creation`. A *read* is a hit billed
  cheap; a *creation* is a MISS that seeded the cache, and some providers bill
  it at a **premium**. Summing them would apply a discount to tokens that cost
  extra. Azure charges no creation premium today — reading only `cache_read`
  stays correct if that changes, or if this engine meets another provider.

All three libraries document these keys as ones that "do not need to be
present", which is what made the optional field the right shape rather than a
defensive one.

### 15.5 A caption that had already gone stale once

`ask.ts` printed a hard-coded `(ceiling; cached input not modelled)`. True when
written; a lie the moment this landed. It now comes from the pricing code via
`priceDetail`, so the figure and its caveat are computed in one place and cannot
drift — the same argument `priceOf`'s own header already makes about rate tables
in two places.

### 15.6 What this breaks, and it is not flagged anywhere

**Cost columns are incomparable across 2026-09-12.** Baselines before it price
cached input at the full rate; ones after do not. `eval:diff` refuses to compare
runs across a model, fixture-mode or repeat-count change — but **not** across a
pricing-model change, which it has no concept of. So the next diff shows a cost
drop of roughly a quarter that is not a code change and carries no warning.

Same class of trap as `engineLabel`'s note on renames: a measurement you cannot
compare to yesterday's is worth much less, and the way that bites is silently.

### 15.7 Status

Done: the formula (`@fde/telemetry`), the count in all three engines, the rate
in both domains' `prices.ts` as **two deliberate copies rather than an import**
— the domains share one Foundry resource today and that is a coincidence of this
exercise, not a property.

`pnpm price:check` — 13 assertions, offline, and **proved by planting the
additive bug and watching four go red**, including the rate-independent "a cache
hit is always cheaper than no hit", which is the one that survives a
renegotiated contract.

**Only the release path has been measured live.** The supplier and insurance
paths are wired and typecheck, which is not the same as verified; they print a
ceiling until something runs through them. A wired-but-unexercised path that
reads the wrong field would compile perfectly and report nothing forever, which
is precisely the failure this section spent two pages avoiding elsewhere.

Also open: `@fde/telemetry` has no `ts-node`, so `price:check` runs as
`ts-node ../telemetry/src/price-selftest.ts` from `@meridian/pharma`, mirroring
insurance's existing `guard:check` trick. Two `@fde/*` packages now need it; a
third is when it earns a real fix instead of a third copy.

---

## 16. Fake data that cannot shift the estate — 2026-09-12

Three capabilities on the practice track were blocked on data that does not
exist: multimodal RAG needs a deviation corpus, prompt-injection guardrails need
complaints, LoRA needs a lab event log. The ask was to build the DATA so those
can be picked up later, and to build nothing on top of it.

The first thing built was not data. It was the alarm.

### 16.1 One extra random draw moves seventeen tables

The estate comes off ONE seeded sequence. `buildWorld()` creates
`makeHelpers(20260911)` and `buildOperations()` destructures the same `h` and
keeps drawing. Anything new that takes a number from that sequence shifts every
value produced after it — lot codes, dates, test results.

`NEXT.md` already warned about this, about GB market rows. **The warning was
advisory: nothing detected the shift.** The first symptom would have been an
eval going red weeks later for a reason nobody could reconstruct.

`pnpm pharma:world-check` builds the estate in memory and fingerprints all 47
tables. Offline, free, no database.

**Proved by planting the exact mistake.** One line — `h.r()`, a single draw:

```
THE SHARED RANDOM STREAM SHIFTED. 17 existing table(s) moved.
```

One draw, seventeen tables. Removed it, and the fingerprint returned to
`9fe064f6b360a262` exactly.

### 16.2 The guard had a hole, and the hole was invisible

`equipment_qualification` was populated in `seed.ts`'s `main()`, AFTER
`buildOperations`. The fingerprint stopped at `buildOperations`, so it saw that
table as empty and **could never have detected a change to it**.

A guard with a hole is worse than no guard, because the hole is invisible from
the green tick. Lifted into `equipment-qualification.ts` so the fingerprint and
the real seed run the identical pipeline. It draws no random numbers — every
date is a literal, and the original destructured `int` off the shared stream
without ever using it — so the move was stream-neutral, which `world-check`
then confirmed: every other table byte-identical.

### 16.3 The check's first real red result was a wrong diagnosis

When that table went 0 → 50 rows, `world-check` announced **"the shared random
stream shifted"**. False. A newly-COVERED table and a SHIFTED table are opposite
problems wearing the same colour.

It now separates them, and says `COVER` for the first:

```
COVER mes.equipment_qualification   0 → 50 rows (was invisible to this check)
NO SHIFT — every table that already had rows is byte-identical.
```

This repo's own history records three occasions where a red check was the
check's fault rather than the system's. This one was caught within ten minutes
of the check being written, by its own author, which is the cheapest that lesson
has ever been learned here.

### 16.4 Complaints — the first table added under the new rule

`mrd_qms.complaints`, 41 rows. Nothing reads it. It exists so that
complaint-to-recall and prompt-injection guardrails have somewhere to land
later without inventing a table at the same moment as the feature.

**`NEW qms.complaints — 41 rows. NO SHIFT.** Every existing table
byte-identical, so every committed eval baseline stayed valid. The recipe:
`makeHelpers(20260912)` — a separate stream — and the world taken READ-ONLY for
real lot and employee ids. `h` is right there on `MasterWorld` and destructuring
it is the easy mistake; `world-check` is what makes that a caught error rather
than a convention.

**THE DESIGN DECISION WORTH KEEPING: 16 of 41 complaints cannot be resolved to
a lot**, and 8 of those quote a lot number that matches nothing. A pharmacist
telephones about "the round white ones, the box said something like 2609". So
the table carries `lot_ref` (what we KNOW) and `lot_stated` (what we were TOLD)
as separate fields. A generator that always resolved the lot would have
designed the triage problem out of existence, and triage is the job.

`is_adverse_event` is likewise separate from `category`: a quality defect can
ALSO be an adverse event, and it is the flag that starts a reporting clock.
Folding them into one column would make a regulatory obligation depend on which
label somebody picked first.

Four assertions in `db:check`, all green after `db:reset` — and the 22
pre-existing checks still pass, which is the real confirmation that the reset
regenerated the same estate, traps and all. `mrd_kb` sits outside `SYSTEMS` and
survived: corpus fingerprints matched at 50 chunks and the ask history was
intact.

**NO PROMPT INJECTION IS PLANTED IN IT.** That belongs with the guardrail work.
An attack sitting in the corpus for weeks with nothing checking for it teaches
nobody anything, and the first person to find it would reasonably think it was
real.

### 16.5 Not done

Lab event log and deviation narratives — the other two blocked capabilities —
are not built. The recipe is now proven, so they can be, each on its own stream
with `world-check` as the gate.

On the multimodal artefacts specifically: a chromatogram with an out-of-spec
peak is honestly generatable, being a plot drawn from numbers. **A photograph of
a jammed tablet press is not**, and a synthetic image labelled as a photo is a
different kind of claim from fabricated text. `CORPUS.md`'s rule covers the
second; the first needs a clearly-marked placeholder or scoping out.

---

## 17. Multi-agent — four lessons, three of them from being wrong — 2026-09-12

Applied to SUPPLIER IMPACT, not release. Release is one lot and one decision;
N2 is twenty-three rows, which is the shape that makes fanning out a real
question rather than a demo.

Built: `lot-assessor.ts` (the sub-agent), `lot-debate.ts` (two advocates and an
adjudicator), `pnpm pharma:debate`.

### 17.1 A sub-agent is not a thing

`lot-assessor.ts` is an ordinary `runLoop` call with its own prompt and its own
answer shape — the same machinery `askSupplierImpact` uses. What makes it a
sub-agent is only that something other than a human calls it. "Multi-agent"
sounds like a framework and is not one.

**IT HAS NO TOOLS, and that was the first real design decision.** The evidence
for all 23 lots was already gathered in one pass; giving each sub-agent tools
would mean 23 agents re-querying an estate already read, slower and able to
disagree with each other mid-run. So evidence is handed DOWN.

Deciding what a sub-agent may LOOK UP versus what it must be TOLD is the actual
work. Tools are the easy part — and see §17.2, where that decision was reversed
on evidence.

**It never throws.** A failed lot returns `row: null` with a reason. One bad
response out of 23 must not take down the other 22 — and the helper does not
decide what a partial work list means, because "we assessed 22 of 23" is a
patient-safety judgement that has to be made out loud.

### 17.2 A sub-agent asked to cite a source it cannot reach will invent one

The first debate run produced:

> "an initial decision must be made **within 72 hours** ... per company Field
> Action SOP timeline"

**There is no Field Action SOP and no 72-hour rule.** SOP-SCM-004 §7.4 says five
working days for a lot that reached a dispensing customer.

The prompt had asked the adjudicator to cite the clock setting the urgency — and
given it no tools and no procedure text. It could not look anything up, so it
produced something plausible. **That is a prompt bug, not a model failure**, and
it is the sharpest lesson here: an invented regulatory deadline is worse than an
absent one, because it gets acted on.

Fixed by giving the ADJUDICATOR ONLY `search_procedures`, and by changing the
instruction from "cite the rule" to "if you cannot find it, write that no
timescale was found — do not supply a number from general knowledge". The next
run quoted §7.4 verbatim.

The advocates still get no tools: two advocates retrieving their own supporting
passages is a debate about two different documents.

### 17.3 A second path to an answer inherits the machinery, not the guarantee

The adjudicator then wrote:

> "a recall (or at least immediate patient-protective action) **is warranted**"

`RECALL_VERDICT` exists to forbid exactly that sentence. It did not fire, for
two reasons, both introduced by the new path:

1. the pattern caught `must be recalled` / `recall is required`, not
   `is warranted`; and
2. **the guard was never applied to this schema at all.** It lived on the
   dossier's coherence rules. The debate was a new route to an answer and
   carried none of them.

`NEXT.md` §N1 already says it in one line — *inheriting is not asserting* —
about compliance checks. The same sentence was true here and nobody applied it.

Fixed: `RECALL_VERDICT` exported and widened (`warranted|justified|appropriate|
necessary|indicated|called for|recommends`, and tolerant of a parenthetical,
which is how it slipped through), behind ONE shared `recallVerdictIn()` so
widening reaches every caller. Eleven cases tested in both directions.

**AND A DISTINCTION THAT TURNED OUT TO BE THE CRUX: a question is not a
verdict.** "Should this lot be recalled?" put TO a Qualified Person is the
correct output of the whole exercise; "a recall is warranted" is the forbidden
one. So `decision_for_human` is deliberately EXEMPT — it is a question by
construction — and every assertion field is guarded. The first version of the
test asserted that "should the lot be recalled, QA decides" ought to be caught.
It should not. Guarding it would forbid the one sentence the design exists to
produce.

### 17.4 A metric that watches one field gets evaded in another

The rebuttal round was measured — word overlap between the two sides' positions
before and after reading each other — because round 2 costs two extra calls and
"did it help" should not be a matter of taste. Three verdicts: CONVERGED,
STATIC, held apart.

It reported **"held apart — round 2 did its job"** on a run where the proportion
advocate had conceded, in `concedes`:

> "patient exposure ... **cannot be excluded** on the current record"

which IS the opposing thesis, and under §7.3 is the whole test. Positions
diverged; the collapse had moved to a field nobody was measuring. `concededAway`
now watches it, with the caveat recorded in the code that this is one more field
watched and not a general fix.

### 17.5 The collapse was a design error measured as a model failure

Three runs, three collapses, always the same side. The diagnosis was wrong twice.

The two sides had been given DIFFERENT QUESTIONS:

| | argued about |
|---|---|
| precaution | "the hazard has not been excluded" — **evidence** |
| proportion | "the response must be proportionate" — **action** |

Nobody tested for an impurity nobody knew to look for, so "not excluded" is
simply TRUE on this record. Proportion was being asked to dispute a true
statement, and an honest model concedes a true statement. **It was being
truthful, not weak.**

Fixed by stipulating the evidence gap symmetrically and taking it off the table:
neither side may claim the hazard is excluded, neither may claim a defect is
demonstrated — both true, so neither side can win by conceding. What remains is
a disagreement about SEQUENCE that cannot be conceded away: protect then test,
or test then act. Which is precisely the judgement §7.3 leaves to a human, and
therefore the only thing worth putting in front of one.

Recorded because the instinct to blame the model was strong, immediate, and
wrong twice.

### 17.6 What it costs, and a property of fanning out

| | calls | in/out | time | cost |
|---|---|---|---|---|
| single agent, **all 23 lots** | 3 | 21,073 / 10,354 | 82s | ~$0.008 |
| debate, **one lot** | 5 | ~11,000 / ~4,500 | ~30s | ~$0.011 |

Eleven contested lots would be roughly $0.12 — about fifteen times the current
cost for the same question. Not fatal; also not free.

**FANNING OUT DESTROYS PROMPT CACHING.** The single agent runs at 87% cached.
The first two debate runs reported `0 of 5825 input tokens billed as cached`,
because five calls with five different system prompts share no prefix. When the
adjudicator gained a retrieval turn — two calls sharing one prefix — caching
reappeared at 2,432 tokens.

So: fanning out across different prompts destroys caching; extra turns WITHIN
one sub-agent restore it. That is a real economic property of multi-agent
design, and it was only visible because §15 landed first.

### 17.7 What is not done

The ORCHESTRATOR does not exist. `assessOneLot` and `debateLot` are written and
exercised; nothing yet runs 23 sub-agents and assembles their rows into a
`SupplierImpactAnswerSchema` to compare against the single-agent version. Until
that exists there is no head-to-head number, only the per-lot depth visible in
`pnpm pharma:debate`.

No eval cases cover either. The debate is reachable only from its own CLI.

---

## 18. The day's ledger — 2026-09-12

A summary section, because §15–§17 record three threads that ran interleaved and
the order they happened in is itself information.

### What exists now that did not at 09:00

| | |
|---|---|
| corpus | 2 documents / 31 chunks → **5 / 75** |
| estate | 47 tables → **49** (`complaints`, `lab_events`) |
| offline checks | 6 → **11** |
| release eval | 34/35, 6/7 green → **33/35, 6/7 green** on a corpus 2.4× larger |

New commands: `pharma:world-check`, `pharma:fanout-check`,
`pharma:injection-check`, `pharma:retrieval-check`, `pharma:retrieval-eval`,
`price:check`, `pharma:history-stats`, `pharma:debate`, `pharma:fanout`,
`pharma:supplier-eval --fanout`.

### The practice track, six capabilities

| | |
|---|---|
| Retrieval Evaluation | ✓ scorer + 8 labelled cases, **8/8, recall@k 1.000** |
| LLM Caching | ✓ cost half measured (83% cached, costs were 25% high); result half **declined with evidence** |
| Multi-Agent | ✓ sub-agent, debate, orchestrator, extracted to `@fde/agent` |
| LoRA | ◐ unblocked — `lab_events` exists; needs labels and a platform check |
| Prompt injection | ◐ guardrail exists; **2 of 4 attacks still get through**, asserted not hidden |
| Multimodal RAG | ☐ the only one still blocked on data |

### Six defects, and who found them

Worth listing together because five were found by something rather than by
somebody reading code:

1. **`SOP-QC-003` missing from the corpus** — found by `rel-004` failing 2/5,
   which said so in its own escalation text. Writing it took the case to 5/5.
2. **`--limit` produced a sample indistinguishable from the estate** — found by
   reading one run's summary. Now `fanout-check`'s first assertion.
3. **`next_action: "Recall"`** — the system deciding a recall. Caused by a
   grounding fix that told the sub-agent to use §7.3's four outcomes, one of
   which IS recall. Two instructions written three hours apart, in conflict.
4. **The guard for (3) then rejected the correct answer** — "decide whether to
   initiate a recall" is the behaviour the design exists to produce.
5. **The injection self-test passed for the wrong reason** — its fixture used an
   invented `findings` shape, so attacks were rejected as malformed rather than
   as attacks. Only the both-directions control noticed.
6. **The fan-out assessed a supplier that was never disqualified** — found by
   `sup-002` on the eval's first honest run, after ~20 wasted calls and a rate
   limit.

### What that pattern says

**Four times a red result was the check's fault, not the model's.** The repo
already had that rule; it earned it four more times in one day. The worst was
(4), because a guard that rejects the right answer is invisible — every failure
looks like the model misbehaving, and the system gets trained away from the
behaviour you wanted.

**Every guard now gets tested in both directions.** What it must catch AND what
it must let through. (5) is the reason: a suite of only-negative assertions
cannot tell you it is passing for the wrong reason.

### The measurement that changed a plan

**Output is 91% of the bill.** Before the cached-token work, input looked like a
third of the cost and shortening prompts looked worthwhile. It is not — it is a
rounding error, and `reasoningEffort` plus answer length are nearly the whole
lever. Nobody could have known that without measuring it, and every earlier
instinct about cost was formed on the wrong number.

### The refactor that was impossible in the morning

`buildWorld` (547 lines) and `buildOperations` (438) had never been touched,
because the estate comes off ONE random stream and a reordering would move
everything downstream with nothing to detect it.

`world-check` detects it — measured, one extra draw moves 17 tables. Both are
now nine named functions, and the fingerprint `ab67e52dbe2e8ffd` held
byte-identical through every step.

**Build the alarm before the thing that can set it off.** The guard did not just
prevent a mistake; it unlocked work that had been deferred for months.

### What extraction actually cost

`runFanout`, the retrieval scorer and the agreement measurement moved into
`@fde/agent` and `@fde/evals`, parameterised by prompt, schema and brief.

The orchestrator went from **118 to 115 code lines**. Extraction swaps
imperative code for configuration; the win is one implementation a second caller
can use, and the explicit statement of what was previously implicit — NOT fewer
lines. Anybody promising a large reduction has not done it.

Two refusals were deliberately built into the packages: `runFanout` will not
decide what a partial result MEANS, and the agreement docs say to watch the
field where conceding is cheapest. Both are judgements that belong to a domain.

---

## 19. The steering estate stops being a cheat — 2026-09-13

Full plan: [`docs/steering/SORTING.md`](steering/SORTING.md). This is the
decision record.

### The confession the plan was hiding

`docs/steering/PLAN.md` described its four Postgres databases as *"the
structured view WE produce from"* the 1,069-file corpus. That sentence was
aspirational and it was stated as fact. **The databases were generated alongside
the corpus, from the same constants, in the same run. Nothing had ever read a
document and written a row.** Both walks — `walk-angle`, `walk-cost` — query
rows that were never derived from anything. They demonstrate the reasoning and
they prove nothing at all about the reading, which is the hard half and the half
a customer would be paying for.

That line is now corrected in place, with a ▲ block, rather than quietly
softened. A plan that overstates what was built costs more than one that admits
a gap.

### The databases stay, and change job

The tempting move was to delete them, since they are fake and the real source is
the files. Wrong: at a real engagement there is no way to know whether extraction
worked. Here there is. **The four become the answer key** — known-correct rows
the derivation is graded against — and a fifth database, `vst_derived`, holds
everything we derive from the documents and is the only thing the product reads.

The trap in owning an answer key is that it is tempting to build checks that
need one. Those checks cannot ship. So the ground-truth-free signals — coverage,
internal consistency, refusal rate, confidence distribution — come first, and
the answer key is used once, to confirm they track the truth.

### `vst_derived` is deliberately not in `SYSTEMS`

`db:drop` and `db:reset` iterate `SYSTEMS`. Pharma put its index inside the
estate and a routine reset destroyed it. So `vst_derived` gets its own constant, its
own lifecycle scripts that iterate nothing, and `assertOurs()` now rejects it
**by name** with a message saying where to go instead.

`derived:boundary-check` is the other half: nothing under `src/derived/ingest/` may name
`SYSTEMS`, `DB_NAMES`, `urlFor`, or any of the four databases. Not because
anyone plans to cheat, but because when extraction leaves a gap the cheapest fix
available to anybody, including me, is one line that reads the right answer out
of `vst_alm` — and nothing would fail, the grade would go up, and the number
would be meaningless for as long as nobody read that line.

**Comments are not exempt, unlike `leak:check`**, and the check proved the point
on its first run by failing on its own ingest file: I had written a comment
explaining that the ingest must never open `vst_alm`. A commented-out shortcut
looks exactly like a note explaining why there isn't one. The comment went, not
the rule.

### K1 — parse first, because parsing is the only stage that cannot be wrong

Three pipelines: parse (deterministic), index (chunk + embed), extract (model).
Parse goes first because it is free, exact, covers the largest block of volume,
and gives the later, riskier stages something to be checked against.

25 timesheet exports and 220 closure reports → 9,931 timesheet lines and 1,540
labelled fields in 4 seconds, no model, no cost. **195 efforts reconcile to the
hour, residual 0.0 h.**

Two things the parser deliberately does not do. It does not merge `M. Lindqvist`
with `Lindqvist, Maja` — that is a judgement about who people are, it is stated
in no document, and it belongs somewhere visible rather than inside a CSV
reader. And it stores an empty approval as **unknown, not rejected**, because
the file's own header says the column means "never signed off"; `false` would
invent a rejection that never happened and would be unrecoverable afterwards.

It does collapse `1158` / `VST1158` / `VST-1158`. That is a format change, the
file says the format changed twice, and the raw value is kept alongside.

### The finding worth more than the reconciliation

**220 of 640 efforts — 34% — have a closure report.** Only a closure report
carries the `Charge code:` line, and that line is the only bridge in 1,069 files
between a week of somebody's time and a piece of engineering work. So **293,019
booked hours belong to work that no document names.**

That is not a parser limitation. It is the customer's actual position, and it
puts a hard ceiling on any estimate built from documents alone. Knowing where
the ceiling is beats discovering it in front of the customer.

### Two more of the same shape, found before running anything

The 293,019 h headline is computed by subtraction, and nothing asserted the
buckets partitioned. They do now. **The first version of that assertion summed
the same lines on both sides** — true by construction, untestable, the fourth
appearance of this shape in this repo. It now draws the attributed side from the
answer key, which turns it into the per-effort reconciliation restated as a
total, and a total catches what the per-effort loop cannot: a charge code
recovered from a report with no lines under it.

And `derived:boundary-check` guarded one direction only. Ingest→estate was blocked;
estate→`vst_derived` was not, and that is the direction that actually destroyed
pharma's index. Two free assertions: `vst_derived` is not in `SYSTEMS`, and
`src/db/init/drop.ts` does not name it. `derived:drop` exists, is separate, and asks.

### The sabotage found a hole, which is the only reason it exists

First run: 5 of 6. "One timesheet file never ingested" stayed green.

Coverage was being derived **from the parsed rows**. Remove a file, its quarter
stops appearing in the set of quarters being judged, the reconciliation quietly
loses a quarter of the estate and reports a perfect score. **A check that
narrows its own scope to whatever data turned up cannot fail.** Same family as
the tautological negative control in `assertions.ts` — third time this shape has
appeared in this repo.

Coverage is a claim about *files ingested*, so only `source_files` may make it.
One line. The break turns red, and so does the case it really guards: a file
that is present, is read, and silently parses to nothing.

### K2 — the money documents, and a column that is always null

24 rate cards, 34 bottom-up estimates, 52 quotations. 168 rates, 298 estimate
lines, 293 quoted lines, **zero parse issues**, all exact against the key.

The rate cards look trivial and are not: **which year and region a rate applies
to is not in the data.** It is in a `#` comment and in the filename. A parser
reading only the CSV body emits 168 indistinguishable numbers, reports a clean
run, and prices eight years of work off one card. Both sources are read and
required to agree; that exact failure is now a sabotage case.

Two gaps the sorting exposed, in opposite directions. The documents cannot say
what work finally cost — `actual_hours_final` exists in 23 quotations in the key
and in no file. And `quote_lines.cr_ref`, documented in the DDL as a soft key to
`customer_requirements`, **is null in every single row** — the generator writes
`cr_ref: null` unconditionally. `db:check`'s soft-key walk could never catch it,
because a column that is always null is indistinguishable from one that is
sometimes null, which the DDL comment says is legitimate. So *"what did we last
charge for a requirement like this one?"* is answerable from neither half of the
estate. Asserted as known-empty so it goes red the day it is filled in.

Running the other way, the estimates carry `basis` and `confidence` — 66 of 298
lines are literally `guess` — and `vst_pmo` has no estimates table at all. The
only record in the estate of how sure anybody was exists solely in the
documents, and nothing uses it.

### K5 — the first step that can be wrong, and who was actually wrong

10 closure reports, 70 fields, one model call each. 63% answered, 37% refused,
95% of answered fields correct against the key.

**The extraction made two mistakes. I made four.** Every red light on the first
run was investigated before being believed and most were mine: `statedIn`
matched against text hard-wrapped at 68 columns, so seven correct answers were
reported as fabrications; its ASIL regex was `[A-D]`, and QM is an ASIL level;
and the refusal-concentration metric hardcoded two field names, so it counted
nine refusals on `tooling_required` — refusals the prompt explicitly asks for —
against the model. The check was penalising the instruction it existed to
verify. Fourth time this shape has appeared here.

One red light was neither: the model quoted `modify function \x14 Ulric.` where
the file has an em dash. Same family as the NUL byte that killed the first run —
the transport mangles non-ASCII punctuation. Near-matches are now accepted and
**flagged** (`evidence_exact = false`) rather than folded into either bucket,
because "corrupts em dashes" and "invents sentences" are different problems.

The two real errors: an element misread from the wrong sentence, and — the one
that matters — `reuse_class = new` inferred from *"New software, no predecessor
to carry over."* A real sentence, a different field, and the wrong answer. **The
evidence check could not catch it.** Only "was this field stated at all" did.
Two independent signals, and the second earned its place immediately.

What transfers: 96% of refusals landed on fields the document genuinely does not
carry, computed **without the answer key**. `statedIn` is a per-field statement
of what a mention looks like — a customer can write that in an afternoon; a
table of right answers they cannot write at all. The 95% accuracy is the number
that cannot ship.

`derived:grade-facts` stays red at 4 ok / 1 failing. One value in 70 was invented;
that is the true state. Making it green means tuning the prompt until this
document passes, or deciding one fabrication is acceptable. Neither is a result.

### K5 at scale — one field was the whole problem

203 documents, 1,421 fields. 61% answered, 91% of answered fields correct. The
summary hides the result:

    change_class        197 answered   100%      interfaces_touched  166   100%
    tooling_required     31 answered   100%      asil                  4   100%
    safety_case_impact  203 answered    94%      element_kind        194    93%
    reuse_class          75 answered    36%   ← all 75 fabrications, 48 of 74 errors

`reuse_class` has three values, so chance is 33% and it scored 36%. It is not
reading, it is guessing, on the one field no closure report states. **The prompt
already forbids exactly this** — it says "DO NOT INFER ONE FIELD FROM ANOTHER"
and names the field — and on identical documents it refused 128 times and
guessed 75. Rewording it is money spent to move a number that is at chance.

So the conclusion is structural rather than a prompt fix: `reuse_class` is not
recoverable from these documents and the pipeline should stop offering it. Same
shape as `cr_ref`. K5b measures what dropping it costs the cost walk.

**Zero fabricated sentences in 1,421 fields.** The evidence check fired six
times and all six are the same em dash in the same title line, arriving as
control characters — `integration only \t6 Yarrow.` where the file has an em
dash. All six carried the correct value. The matcher was NOT loosened again to
absorb them: one tuned until nothing fails detects nothing.

The 26 wrong answers split, measured rather than characterised: 7 of 13
`element_kind` errors are reports with two competing sentences; 3 of 13
`safety_case_impact` errors are documents that contradict themselves outright
(`EFF-BULK-0071` says both "the work was the safety case" and "no safety impact
at the change review"). The remaining 16 are plain misreads. Three cases is an
observation, not a category, which is why they are counts.

### The result that transfers, and it beat the expectation

Going in, the expectation was that no key-free signal could catch the
`reuse_class` failure — refusal placement says nothing about it, because those
75 were answers, not refusals. Two new signals catch it, neither using the key:

**Answer rate.** `reuse_class` at 37% is the only field between 15% and 82%;
every other field sits at one end or the other. A field the model cannot decide
whether it knows is a field it should not answer.

**Evidence reuse.** `reuse_class` quotes a sentence another field already quoted
17% of the time, against 0–6% elsewhere — the exact signature of inferring one
field from another. A rate, not a rule: `asil` shares at 100% legitimately.

Both are assertions now, both red, both naming `reuse_class`. A customer with no
ground truth would have found this. That is the product. The 91% is not.

### Also: a paid run that threw its own work away

The first extraction read all ten documents correctly, then lost the lot when
the insert hit `invalid byte sequence for encoding "UTF8": 0x00`. Work done,
money spent, nothing kept. Responses are now written to `.cache/` after EVERY
document, and `--from-cache` replays them with no API calls — which is how all
four grader fixes above were verified for free. Anything expensive and
non-repeatable should be durable before the cheap, fallible step after it.

### State

`derived:boundary-check` PASS 4/0 · `derived:reconcile` PASS 12/0 · `derived:reconcile
--sabotage` PASS 9/9 · `derived:grade-facts` 4 ok / 1 failing, correctly. The existing estate is untouched — `world-check` still
`4448df7ca9d82cc7`, `corpus-check` 14/0, `estate-check` 28/0, `db:check` 27/0,
`sabotage-check` 14/14, `walk-check` 11/0, `leak:check` PASS.

**The cheat is not closed yet, and saying so matters.** It closes at K7, when
`walk-angle` and `walk-cost` read `vst_derived` instead of the customer's databases.
Until then this is one pipeline of three, on the easiest tenth of the corpus.

---

## 20. All three pipelines have run — 2026-09-13

Parse (~11,500 rows), extract (1,320 facts), chunk + index (2,827 passages), all
into `vst_derived` on Neon. Twelve tables, one database, separate from the
customer's four.

### `vst_kb` became `vst_derived`, at the user's objection, and he was right

`kb` was short for "knowledge base" and appeared in a database name, a directory,
eleven scripts and four documents **without once being spelled out**. Worse, it
sat in a list beside `vst_crm`, `vst_plm`, `vst_alm` and `vst_pmo` — acronyms a
steering supplier would actually recognise — so an invented one read like a fifth
thing they were supposed to know.

`derived` says the whole story: everything in it was derived from their
documents; the other four were given to us. Renamed end to end; the old database
is dropped. One good failure on the way: the cached extraction was still named
for `kb`, and the loader REFUSED to replay rather than silently re-fetching — a
paid run saved by the corpus-fingerprint guard added two steps earlier.

### The embeddings factory was extracted, on the repo's own trigger

Insurance and pharma each carried forty lines of it, and pharma's copy contained
the condition: *"If a third domain arrives, this file is the candidate to lift
into a shared package. Two copies is not yet evidence; it is a note to self."*

The third domain arrived, and the two copies proved **byte-identical apart from
an import path**. It is now `chooseEmbeddings` in `@fde/grounding`, taking a
client and a deployment name — so the package keeps its stated promise of having
no opinion about which cloud you are on. Each domain keeps three lines saying
where its client comes from.

The label stayed `foundry` in all three rather than the generic `hosted`: that
string reaches the telemetry log's model field, and renaming it would not break a
build — it would quietly make earlier runs incomparable with later ones under the
same name.

**`@fde/grounding` needed no edit to accept a third domain.** Steering supplied
one descriptor, `config/steering-documents.ts`, and nothing else. That is the
first real evidence the split was drawn in the right place; two domains can share
a spine by coincidence.

### The order we ran the pipelines in was wrong

Extract before index was right for the *cost* question — it needs structured rows
and no retrieval. The general order is parse → index → extract, because
extraction over a large corpus wants search to find its candidates. It worked
here only because the 220 closure reports were an enumerable set.

### Two gaps, and the phase is not finished

**The 220 source files are not indexed.** `loadDirectory` reads `.md` and `.txt`.
Adding an extension is the wrong fix: code must be chunked by FUNCTION, and
`damping.c` documents its calibration parameters in a comment block above the
function, so a clean boundary split orphans the part anyone searches for. It
matters because *"what do we already have that does this?"* is mostly a question
about the code.

**Nothing searches the index.** 2,827 passages, zero queries. `walk-cost` still
opens its most valuable evidence by a path written into the source. The answer is
real and the finding of it is staged.

So ingestion is done and grounding is not: load → chunk → embed → store → SEARCH,
and the fifth is unbuilt and therefore untested. A corpus indexed and never
retrieved from is a corpus nobody has checked.

---

## 21. Steering gets an agent — and every fix was context, not capacity — 2026-09-13

Pillars 3, 2 and 4 for steering, in that order: the answer contract, the loop,
the evals. The order was deliberate — a contract retrofitted onto something
already producing convincing output means arguing with a thing that sounds right.

### The contract forbids a different sentence than pharma's

Pharma forbids *"a recall is warranted"*; insurance forbids *"this is covered"*.
**A Tier-1 supplier's dangerous sentence is a commitment** — a quotation is a
contract and a named person signs it. The cheapest one to write is *"carries
over at no cost"*, which is the exact trap the estate was built around.

Pharma's crux transferred unchanged and is the assertion most worth having:
**a question is not a verdict.** `decisions_for_human` is exempt from the
commitment guard by construction, and `schema:check` asserts that a question
naming a cost PASSES. Guarding it would forbid the one sentence the design
exists to produce — pharma's first test got this backwards.

### Five fixes to make the loop finish, and only one was a limit

Four runs died before producing an answer. The history of `maxTurns` is the
history of the wrong fix: 12 hit a rate limit, 8 stopped the flailing AND the
answer, 10 was reached after ten tool calls with nothing written.

What actually worked:

1. **`k` capped at 10.** It asked for 20 on five of six searches — ~90 passages,
   ~12,000 tokens, re-sent every turn. The tool description had invited it:
   *"ask for more when comparing documents."* The principled reason for a
   ceiling, not the budgetary one: search has NO relevance cutoff by design, so
   raising `k` adds the WORST available passages. You pay more to think worse.
2. **"An empty result is an ANSWER."** It searched eight times for a test report
   that does not exist — and the absence was the finding. Searches: 8 → 4.
3. **The opening search is done for it.** Three runs spent turn one discovering
   the context of a requirement they had been handed. This is the `write` verb
   from `CONCEPTS.md`, applied for the first time to code rather than prose.
   126 s → 46 s, and identical starting points across runs, which is what made
   evals worth writing.
4. **Retries 2 → 6**, via `withOptions` rather than editing `@fde/foundry`: the
   endpoint and auth are shared and correct; the retry count is a property of
   THIS workload's shape. A one-shot extraction and a loop that has already
   spent six calls need different patience.
5. **`maxTurns` back to 12** — but twelve with a cheaper opening is a different
   setting from twelve without one.

### The same lesson, arriving twice, about provenance

The schema required a citation line. The retrieved passages carried a file, a
heading trail and a section — **and no line.** So the first run wrote `1`, four
times out of five, and the citations looked exactly like real ones.

**A required field a model cannot source is a field it will fabricate.** Pharma's
invented 72-hour SOP, reproduced in this repo one day after it was written down.

The fix went where the gap was. `@fde/grounding`'s chunker now carries
`startLine` — it had always computed it for table-offset arithmetic and thrown
it away. **This is the first edit a third domain has required inside an `@fde/*`
package**, and by the repo's own rule that is the finding: the abstraction was
missing something every consumer needs, not something steering-specific.

Then the same lesson again, softer: with real lines, citations pointed at the
PASSAGE's start, up to 11 lines above the quoted sentence. So the line is no
longer asked for at all — `resolveCitations` locates the quote in the file and
corrects it, reusing `findEvidence`, which the extraction pipeline already used
for exactly this. One implementation of "where is this sentence", not two that
drift. Verified by hand: all five citations of the final run land exactly.

### A real bug in `@fde/agent`, found by a run that failed

`0 turn(s) · 98,367ms`. When the SDK throws `MaxTurnsExceededError`, `turns` is
returned as whatever EARLIER calls produced — empty on the first pass. Six tool
calls and 98 seconds of real spend logged as costing zero.

The comment directly above that line describes the identical failure in the
schema-retry path — *"the pass/fail was right and the audit trail was a lie"* —
and this is the one path that fix never reached. The dispatched calls are now
folded into a final record.

**The token counts were NOT invented.** The exception carries no usage, and a
zero would understate a bill rather than admit a gap, so the CLI says outright
that the logged cost of such a run is a floor. Third time this session the
honest choice was to state a gap rather than fill it with a plausible number.

### Evals, and one admission

Three cases, each anchored to a planted trap rather than a question that looked
interesting. Twelve checks, **every one paired with a case that makes it fail** —
a check that has only ever passed is indistinguishable from one that cannot.

Severity buckets because a pass rate treats an invented price and a turn-cap
timeout as the same event. `citation_lines_land` is classified `false_answer`
rather than a nuisance: a wrong line looks exactly like a right one, and
provenance that is approximately right is the kind of wrong that survives review.

**Admitted in the severity file rather than left to be inferred from the ratio:
this suite is better at catching over-confidence than over-caution**, one check
against ten. A case that would catch an unnecessary refusal needs a requirement
with a healthy comparable set, and none of the three has one.

---

## 22. The fan-out runs the whole bid — and the bid prices to nothing — 2026-09-14

Step 4 of `CONCEPTS.md`'s ladder, built in two halves, cheap half first. The
capability took an afternoon. **What it found is worth more than the
capability**, and it was not on anybody's list before the run.

### The work list came first, and it is not scaffolding

`pnpm steering:assess-all` is free: two queries, no model, no index. It prints
what is answered, what failed, what was never attempted.

The reason it is not a warm-up is that a fan-out over two dozen paid loops must
be **resumable** — a rate limit at requirement nineteen must not mean paying for
the first eighteen again — and a resume is exactly this list with the answered
ones removed. Building it first means the step that spends money is never the
step that discovers the plan was wrong.

**It has no batch state, deliberately.** The list is recomputed from the filed
answers on every invocation, so an interrupted run resumes by being run again,
and a requirement answered on the web desk an hour ago simply drops out. That
happened during the session and needed no coordination: `CR-K2-0114` was filed
from the browser under surface `http` mid-build and was gone from the next list.
No batch id, no checkpoint, no state to get out of step — **the filed answers
ARE the state.**

### Three states, not two, and the third would have failed silently

`steering:assess` files a FAILED run too, with `answer: null` and the reason —
deliberately, because a run that failed still spent tokens and still took a
minute. So *"has a row in the history"* does NOT mean *"has been answered"*.

A resume that treated any row as done would skip every requirement that had ever
failed, **permanently, while looking like it was working**: the list gets shorter
each run, the failures never come back, and the bid ships with holes in it.

`fetchFiledAssessments` already separated them, so nothing needed inventing —
`answered` is one row per reference with the newest winning, `failedSince` is the
references whose NEWEST attempt failed. A reference can be in both, and
`CR-K2-0123` is: an answer in force, and a later retry that failed. That is not a
hole and it is not collapsed into either neighbour.

### The filing rule became one copy, and that was the point

`file()` was six lines inside `assess.ts` and the batch needed the same six. The
marshalling is not what is worth sharing — **the rule is**: a run that produced
no answer is filed too, with its reason. That single branch is what makes the
three states work, and a second copy would be one dropped `else` away from
breaking it invisibly.

`src/cli/file-assessment.ts`, not `src/answer/`: `sql:check` scans the latter
under a rule it prints in its own pass line, and this helper contains no SQL. A
guard whose scope grows for unrelated reasons stops meaning what it claims.

### A swallowed error is a bill you pay later

The first real batch run stopped after one requirement. The check said the row
had not landed; a `select` typed by hand confirmed `CR-K2-0105` was genuinely
absent. **The assessment ran, cost money, and vanished.**

`recordAssessment` had a bare `catch {}`. That silence is right for the surface
it was written for — the answer is already on the reader's screen and a lost row
must not turn into a failed request — and inside a batch it means a broken write
path is invisible: every loop runs, every loop is paid for, the work list is
identical next time, and nothing says why.

It now returns `{ filed, error? }` and **still never throws**. The web route
ignores the return and behaves exactly as before. The batch stops on the first
row that does not land, on any requirement rather than only the first, and prints
the code Postgres gave — because the two kinds want opposite responses: a
`22P05` is a byte Postgres will never accept and retrying is pointless, an
`08006` is a dead socket and retrying is the whole answer. Connection-class
failures now retry once, which is the argument `ensureTable` already made about
cold starts, applied to the statement.

### Three wrong diagnoses in one session, and the message caused all three

The lost row: I reasoned from a rollback probe that a NUL byte or lone surrogate
in the payload would be rejected, confirmed both would be, ruled out the corpus,
and concluded the model had emitted a bad byte. **It was a dead connection.**

The next failure printed `Connection error.` and I read it as Postgres again. It
was the OpenAI SDK. So I checked DNS, TLS and the endpoint — all healthy — and
called it a transient network fault. It was neither.

**`az login` had expired.** `@fde/foundry` fetches the Entra token inside a
custom `fetch`, because the SDK takes a static key rather than a provider it can
call per request. When the token fetch throws, the SDK cannot tell it from a
socket failure and wraps it as `APIConnectionError` — two words pointing at
entirely the wrong layer. It took dumping the error's `cause` chain to see
`CredentialUnavailableError: Please run 'az login'`.

**An error message names a layer; it does not identify one.** Every one of the
three was settled by evidence — a query run by hand, a `cause` chain dumped —
and none by reading the message. Recorded in `NEXT.md` §3a as a defect in a
shared package, because the next person will lose the same hour.

### What the whole bid cost, measured

24 of 24 requirements assessed. Under its own surface label, which is why these
are separable from hand runs at all:

| | |
|---|---|
| total | **$0.26**, 15 runs |
| median per requirement | **$0.018** |
| input tokens | 1,316,541, of which **875,264 cached (66%)** |
| output tokens | 66,267 |
| median run | 55 s · slowest 74 s |
| the batch itself | 11 requirements, 650 s, **zero failures** |

### The finding: twenty-three of twenty-four price to nothing

One requirement priced — 119 h, EUR 12,138, from 19 past jobs. The other
twenty-three refused, and **seven never queried the history at all**; the agent
judged the scope too unclear to ask.

Every refusal is individually CORRECT. `find_comparable_work` will not take a
median of two jobs, and that rule is the difference between a grounded number and
an invented one. **But a tool that correctly refuses 96% of the time has not done
the job it was built for**, and it erodes the refusal: people discount a warning
that fires on everything.

The diagnostic added for §5b is the whole story, repeated across nearly every
refusal:

```
safety_case_impact: 146 on its own, 0 without it
asil:                37 on its own, 0 without it
change_class:        19 on its own, 0 without it
element_kind:        17 on its own, 0 without it
```

Each filter matches plenty **alone**; the conjunction matches **nothing**, out of
203 jobs with attributable hours. The agent keeps reading K2 work as
*validation-only, mechanical, QM, no safety-case impact*, and that combination
has no history behind it.

`NEXT.md` §0 states the fork rather than a fix: either the agent over-constrains
a history that could answer, or the estate genuinely lacks the work. **Those need
opposite fixes** — one is a classification problem, the other means the refusal
should say *"we have never done this"* instead of reading like a filter fault.
The measurement that settles it is free and needs no model, because the tool-call
arguments the agent actually chose are already stored in `assess_history.trace`.

### §5a answered, and the hypothesis was wrong

`NEXT.md` §5a suspected the `finding` enum had collapsed into one value after an
enum rewrite — fifteen eval runs across three requirements all returned
`change_needed`, and so did the nine answered on the desk.

`CR-K2-0124` returned **`have_it`**. So the enum is not a boolean wearing four
labels and the claim as written does not survive. What survives is weaker and
still worth fixing: 23 of 24 one value, and **`cannot_tell` returned zero times
across 24 real requirements** — including seven whose own reasoning says the
scope is too unclear to price. A requirement the agent will not price because it
cannot tell what the work is, and then labels `change_needed`, is answering two
questions with one word.

Kept rather than struck, because the correction is the more useful half — the
third time this session that pattern held.

### Concurrency was considered and deliberately not built

It was step 4 of the plan for this session and it is the wrong thing to build.
Eleven requirements ran serially in 650 s with **zero rate limits and zero
failures** — the 429 problem this codebase fought four separate times never
appeared. A concurrency layer would be built for a load that did not
materialise, which is what `CONCEPTS.md` already puts on its *"deliberately not
on the list"*. It becomes worth having at a few hundred requirements, not 24.

### What remains, in order

1. **The pricing refusal** — `NEXT.md` §0, and the largest item in the
   engagement. Start with the free measurement over the 24 stored traces; it
   answers the fork before a line of prompt is rewritten.
2. **A self-test for the fan-out's three states.** Answered / attempted-and-failed
   / never-attempted is precisely the logic that breaks silently. `sortRows`
   already has the offline pattern to copy, re-run and failure planted in it.
3. **`explain`** — built, typechecking, named in no document, and with no
   self-test where the assessment and bid-summary schemas each have one.
4. **`@fde/foundry`'s credential error**, which cost three wrong diagnoses above.
   Shared with insurance and pharma, so it is its own change.
5. **A case that catches over-caution.** The suite has ten checks for
   over-confidence and one for the other direction. Twenty-three refusals make
   that the interesting direction; `CR-K2-0111` is the one requirement in the bid
   with a healthy comparable set to build it on.

Not blocking, and true as of today: the green eval baseline ran `fixtures: live`
rather than fixture-backed, so it is not reproducible offline; and
`CONCEPTS.md`'s pillar table still reads *"not started"* for three pillars that
are built and green.

---

## 23. Retrieval gets a number, and the reranker is not the finding — 2026-09-14

`docs/RETRIEVAL.md` §9 carried this row:

> **There is no reranker, and no measurement saying one would help.**
> Its absence is a gap named, not a decision defended.

Both halves are now closed for steering. The second half was the blocker, and
the order was not negotiable — §8 of this file has said so since the first week:
*"Adding a reranker now is guessing it helps; adding it after gives you 'the
reranker bought 7 points.'"*

```
  arm        cases  recall@6   MRR
  baseline    6/8   0.813     0.692
  reranked    7/8   0.938     0.875

  +12.5 points of recall@6, +18.3 points of MRR, ~2 s per question
```

`pnpm steering:retrieval-eval --both`. 8 cases, 922 documents, 3,854 passages,
`Xenova/ms-marco-MiniLM-L-6-v2` local on CPU.

### The chain, because the reranker was the last link and not the first

Steering had **no retrieval measurement of any kind.** `retrieval:check` is five
hand-written predicates that pass or fail — and a predicate cannot regress by
four points. So:

```
a label for a steering passage  →  8 cases  →  an offline scorer + its plants
                                →  the BASELINE  →  the reranker  →  the delta
```

Only the first link was new work in the judgement sense. `@fde/evals` already
owned recall@k, MRR, the pass rule and the summary; pharma had already proved
them. What no package can supply is **what a retrieved passage is called.**

### Pharma's label would have been silently wrong here

Pharma labels by revision and clause (`SOP-QC-014 Rev 7 §7.3`), read entirely out
of the heading trail. Copying that was the obvious move and the corpus refuses
it. Measured over all 3,854 passages:

| trail shape | passages | |
|---|---|---|
| a real heading trail | 2,835 | |
| the document title alone | 467 | |
| **nothing at all** | 293 | every closure report, every MISRA report |
| **a `====` banner** | 259 | every CRS |

A trail-only label is `null` for 552 of them — including all 220 closure
reports, which are what `find_comparable_work` prices from. And `@fde/evals`
spells out the consequence in its own header: an unlabelled hit still occupies a
top-k slot while being neither a hit nor an intruder, so it is **invisible in a
recall number**. The single most important document class would have left the
measurement without a word.

Steering's label is the **path**, refined by the leaf's identifier when the trail
has one — `null` for **0 of 3,854**, 2,828 distinct labels over 3,854 passages.
The path also carries the confusable pairs for free: twelve programmes state a
rack force with different numbers at twelve paths, and `CRS-…_RevA.md`
(superseded) is a different path from `_RevB.md` (in force). That is this
corpus's Rev 6 / Rev 7 trap, solved by an identifier that was already there.

**The transferable rule:** the package takes the arithmetic, the domain keeps the
identity — and *what the identity is* does not transfer between domains even when
the shape of the problem does.

### The write-up was wrong the first time, and the correction is the finding

The first draft credited the reranker with understanding a question no keyword
could match: `ret-007` asks *"was any effort booked to a charge code that also
covers unrelated work?"*, the answer is one of 220 near-identical closure
reports, hybrid search ranked it 35th and the cross-encoder moved it to 1st.

That explanation was contradicted by a probe run earlier in the same session —
the distinguishing phrase *"for want of a separate code"* appears in exactly one
document. So the diagnostic was built rather than the claim defended:

```
ret-003   wanted: fused 27/50   dense=—  sparse=3   found by keywords
ret-007   wanted: fused 35/50   dense=—  sparse=1   found by keywords
```

**The keyword arm had ranked both targets near the top. The dense arm returned
neither. RRF buried both.** The arithmetic is not close:

| what the arms said | fused score |
|---|---|
| keyword arm **1st**, dense arm absent | 1/61 = **0.0164** |
| **both** arms **50th** | 2/110 = **0.0182** |

A document both arms rank fiftieth outranks a document the keyword arm ranks
first. That is RRF working as designed — corroboration is evidence — and it is
wrong exactly when the two arms are good at different things, which is the entire
reason `hybrid.ts` exists. Its own header argues the keyword arm in with *"a rare
legal term has few neighbours in embedding space."*

`ret-003` is the query `SR-EPS-0421`, written into the suite as *"the case only
the KEYWORD arm can win"* because embeddings cannot separate it from
`SR-EPS-0407`. The keyword arm won it at rank 3. The fuser put it 27th.

**`hybridSearch` is `@fde/grounding`, so insurance and pharma fuse identically**
and neither has a retrieval suite that could see this. Nothing was changed about
the fuser: a per-arm floor or a lower `K` are guesses until this suite scores
them, which is the rule the reranker was held to.

### Two costs, printed rather than buried

**`ret-005` the reranker could not fix**, and the runner says why:

```
ceiling: only 50% of the expected labels were in the top-50 pool at all
```

A reranker cannot retrieve — recall@k after is bounded by recall@pool before.
Without that line the obvious next move is raising the pool to 200 and spending
four times the latency discovering it changes nothing.

**`ret-008` the reranker made worse.** The question is where a module's behaviour
is actually recorded; the answer is a test file whose banner says the 2015 design
note has gone stale and the tests are the surviving specification. The
cross-encoder promoted **the stale design note** above it. Relevance and currency
are different questions, a relevance model can only see the first, and that is
the same shape as insurance's form-revision trap. It is a better argument for
leaving the stage off than the latency is.

### Shipped off

`RERANK=local`, default off, called by **no answer path**. +12.5 points against
~2 s per question is a decision for whoever owns the latency budget —
`assess-all` already runs ~55 s per requirement — and it needs an answer to
`ret-008` first. Shipping a stage on the grounds that it is usually an
improvement is how a pipeline acquires parts nobody can account for.

### Rule 20, honoured twice

Both label plants were sabotaged and **watched to go red** before being restored:

- **the banner trap** — scanning the whole trail instead of its leaf's first line
  pulls `CRS-ALT-08-001` out of a confidentiality notice and calls it a section
  anchor. 259 passages mislabelled, each plausible. When planted it took the
  superseded-revision assertion down with it, because Rev A and Rev B then
  collide on one label — exactly the damage it describes.
- **the two-digit clause** — `\d` instead of `\d+` makes §10 unlabelled rather
  than §1, silently merging it into the document preamble.

A third guard is free and runs before any money is spent: every `expect` label is
checked against the labels the index actually carries, because a case naming a
label no passage has can never pass and fails looking exactly like a retrieval
regression.

### What this does not prove

Eight cases cannot say a retriever is good; they can say it got worse, which is
the job. One run rather than five, deliberately: every stage is deterministic,
and three runs gave identical summary numbers.

**One number in the first draft of this entry was wrong, and checking it changed
the conclusion.** It claimed the cross-encoder scores correct passages "near the
floor" at a raw logit of −9.3, out of domain. That −9.3 came from a paraphrase
typed by hand into a feasibility probe, not from the corpus. Measured against the
*real* indexed passages: **+7.75** for `ret-001`, against **+8.76** for an MS
MARCO pair the model was trained on. It transfers to prose-shaped engineering
documents far better than assumed. `ret-007`'s correct passage does score low —
**−0.88** — and was still ranked first, because ranking is relative. The real
pattern is document **shape**, not subject: terse fielded records score far below
prose, and this corpus holds 220 of them. A number quoted from a scratch probe is
not a measurement, which is the same lesson as the `ret-007` write-up two
sections up, learned twice in one session.

Full write-up, including every case note: `docs/steering/evals/RETRIEVAL.md`.

---

## 24. The index question, answered no — and four wrong answers on the way — 2026-09-14

§23 gave the retriever a number. This is the other half of the same question:
**should the dense arm have an index at all?** Appendix A.4 of
[`RETRIEVAL.md`](RETRIEVAL.md) had said for a long time that the repo builds
none, that this is right at our size, and then ended honestly: *"nobody here has
measured where it starts to hurt."* That sentence is the whole reason this
section exists.

The answer is **no**, and it is now a measurement rather than a belief.

### The first reason is the column, and nobody expected that

You cannot add an index to this schema. The `vector` column is declared with no
dimension — which is exactly what lets a 384-number local corpus and a
1536-number hosted one share one table — and pgvector will not index such a
column:

```
HNSW     REFUSED: column does not have dimensions
IVFFlat  REFUSED: column does not have dimensions
```

So "add an index" is not `createHnswIndex()`; it is
`ALTER COLUMN vector TYPE vector(1536)` first, a full table rewrite, and the pin
is what actually costs. It turns `EMBEDDINGS=local` from *"re-ingest, and your
old numbers are incomparable"* into a **hard insert error**, in a package
insurance and pharma import too. A.3 had documented the dimensionless column as
a deliberate convenience; it had never priced what it forecloses.

### The second reason is the measurement

`pnpm steering:index-bench` — steering because it is the big corpus, 3,854
passages against insurance's 555, so it hits any threshold first.

| | server-side | recall@32 |
|---|---|---|
| exact scan — what ships | **19 ms** | 100% (ground truth) |
| HNSW `ef_search=40` | **0.9 ms** | see below |

Twenty times faster, and it still does not earn its place, for two reasons that
have nothing to do with each other:

**The wire eats it.** `select 1` to eu-central-1 is a **118 ms** floor. Saving
18 ms behind that is 15% of one query, inside a request that also spends an
embedding call and a model turn. The old arithmetic in A.4 asked how big the
vectors were; the question was always *where the database is*.

**Recall is unstable, and that is the real finding.** Across **14 controlled
builds over byte-identical rows**, recall at the default `ef_search` ranged from
**67.2% to 97.9%**, and only 4 of 14 cleared 86%. `ef_search` does not rescue a
bad build — where the default gave 83.9%, raising it to 128 recovered only to
85.9% — so what is lost is in the **graph**, not the search. A rebuild is not a
rare event; it is what happens after every re-ingest. The typical re-ingest
would silently cost a sixth of the exact top-32 to save 18 ms.

Ruled out as the cause: **parallel build**. Forcing
`max_parallel_maintenance_workers = 0` left the spread unchanged. Curiously, a
copy carrying only `id` and `vector` built the same graph six times running; it
is the full four-column table that wanders. Not chased further — the verdict
rests on the spread, not the mechanism, and a cause guessed at would be worse
than one left open.

### Four wrong answers, and what each one was

This section had to be rewritten four times, and every failure was in the
measurement rather than in the thing measured — which is Rule 20 territory and
worth naming individually.

1. **"IVFFlat built fine."** It had not built at all. A failed
   `CREATE INDEX CONCURRENTLY` leaves an **invalid** index in the catalogue
   (`pg_index.indisvalid = false`), and the next
   `CREATE INDEX CONCURRENTLY IF NOT EXISTS` under the same name sees the name,
   skips, and **returns success**. The bench now uses plain `CREATE INDEX` and
   says why at the line where it does.
2. **"Recall is 100%, so recall is not the argument."** The probe queries had
   never touched the index — the planner was still choosing a sequential scan,
   so "HNSW recall" was being measured against HNSW-shaped seq scans. Turning
   `enable_seqscan` off is a measurement instrument, and leaving it out made a
   test that could only pass.
3. **"The planner refuses the index."** It does not; it picks it unaided. That
   answer came from a script that ran `Promise.all` over one `pg` client, which
   pipelines queries onto a connection that cannot interleave them. The driver
   printed a deprecation warning saying so and it was read past.
4. **"Graph construction varies because of insertion order and parallel
   workers."** A plausible mechanism attached to a real observation — and the
   run data did not support it. Ruled out above.

The pattern across all four: a benchmark is code, it fails the same ways other
code fails, and a number it prints has no more authority than the method behind
it. The same lesson as §23's `−9.3`, arrived at from a different direction.

### Shipped

- `packages/grounding/src/index-bench.ts` — `benchmarkVectorIndex()`,
  domain-neutral. Copies the chunk table, times the exact scan, pins the
  dimension **on the copy**, builds three times, reports the spread, drops it in
  a `finally`. The live table is read and never written. Three builds because
  one is a sample of one presented as a property of the index.
- `pnpm steering:index-bench` — steering's probe questions (real ones; a probe
  taken from the table matches itself at distance zero and measures nothing) and
  a verdict **computed from the two thresholds that decide it**, so it will say
  *build it* on its own the day they move, rather than restating today's
  conclusion forever.
- A.3, A.4 (now A.4.1–A.4.4), the A.6 diagram and §9 of `RETRIEVAL.md`.

### One live hazard recorded while it was in view

`hnsw.ef_search` caps how many rows one index scan can return, and its default
is **40**. The dense arm does not fetch the `k` a caller types — it fetches
`k × overFetch`, which for steering is `8 × 4 = 32`. That fits, with eight rows
to spare. **Raise `k` past 10 and the dense arm truncates silently**, handing RRF
a short list, and `HybridResult.fullText` will not catch it because that flag
only ever guarded the *keyword* arm. Same shape as the `plainto_tsquery` bug. The
bench checks returned-vs-expected rows and warns.

### What this does not prove

The verdict is **"not yet at this size, at this distance"** — not "approximate
indexes are bad". Three things would flip it, and only one is about row count: a
corpus roughly 10× this one, a database that stops being a round trip away
(co-located compute makes 18 ms the whole query rather than 15% of it), or a
recall spread that turns out to be an artefact of something fixable. The
benchmark is the thing that answers it next time; the number in this entry will
be stale before the argument is.

---

## 2026-09-15 — `/learn`, five lessons on the firm's page

The three engagement pages each explain one customer's problem. Nothing on the
site explained the machinery all three are built from, and the machinery is the
part that transfers. `/learn` is five pages that do: vectors, retrieval, the
answer contract, the loop and its engines, evals — in that order, because each
assumes the one above it and none assumes the one below.

**They are a reading of `docs/`, not a second source of truth.** Every page names
the document it is a reading of and says that where the two disagree the document
is right and the page is stale. That sentence is on every lesson, in the shell
component, so a page cannot be written without it.

### The rule the content is held to, and the one place it bends

Every figure is a number this repo measured, printed with the command that
reprints it. Exactly one drawing — the draggable vectors in lesson 1 — is an
illustration, and `Figure` takes a `kind` prop rather than trusting prose to
carry that distinction. It defaults to `measured`, so a figure whose author
forgot claims to be measured and is wrong in the direction somebody notices.

**Lesson 5 draws the newest baseline on disk rather than the published one, and
says so on the figure.** `docs/evals/README.md` publishes 2026-09-05 — 7 cases,
30/35, `cov-003` at 0/5 — and `CLAUDE.md` says not to re-derive it because it
drifts with every run. It has drifted: there are eighteen baselines in
`docs/evals/results/` and the newest is an 8-case suite at 39/40 with a different
failing case. The page computes from the raw runs of
`baseline-2026-09-11T15-55-29-682Z.json`, names the file, and points at
`pnpm eval:history`.

That failure is worth the space it gets. `cov-002` asks whether a rideshare
driver is covered; no document in the corpus addresses carrying passengers for a
fee. Run 1 **got the judgement right** — refused to answer from an adjacent
exclusion, escalated to a named owner — and then cited
`record:DET-2024-004473-ROR`, which does not exist. A dangerous-bucket failure
from a run that did the hard part, caught by the cheapest check in the system.

### Three bugs, none of which any check in this repo can see

All three were found by building the thing and looking at it.

1. **Tailwind tree-shook four of the five lesson hues out of the stylesheet.**
   `@theme` emits only what it can see used, and these are read as
   `` var(`--color-learn-${n}`) `` — assembled at runtime from a lesson's number.
   Exactly one survived. Lessons 2–5 would have shipped with the custom property
   resolving to nothing, from a build that succeeds. Same family as the `@source`
   trap in `SITE.md`, and the same check: grep the built CSS. Declared in `:root`
   now — nothing here is a Tailwind colour utility, so the theme layer bought
   nothing and cost four hues.

2. **A chart note ran out from under its label and the next row's bar was drawn
   through it.** SVG has no text metrics at render time, so the only robust fix
   is to stop putting two things on one line. Notes have their own row now.

3. **The lesson map on `/learn` was clipped mid-word at 1440px** — the horizontal
   cousin of the card-back overflow already documented. Fixed by taking the entry
   and exit labels out of the row rather than by shrinking the cards, which would
   have been correct at exactly one width.

The probe for the third is in `SITE.md` and is worth running after any layout
change: page-level horizontal scroll, plus any element whose `scrollWidth`
exceeds its `clientWidth` under `overflow: hidden|clip`. Clean at 1440 and 1280
on all seven routes.

### The palette argument, settled by running the validator rather than by taste

Five hues, one per lesson, sky → orange, and **they are not allowed to encode
data**:

```
node scripts/validate_palette.js "#38bdf8,#818cf8,#c084fc,#e879f9,#fb923c" \
  --mode dark --surface "#0d0f15"
→ FAIL  worst adjacent pair ΔE 6.8 (normal vision), floor 15
```

Five hues confined to the arc left over once teal, green, amber and rose are
reserved for severity cannot be told apart as a series. So every chart is one hue
plus neutral grey with all values directly labelled, the hue never appears
without its lesson number, and severity colour appears on exactly one page —
lesson 5, where severity is the subject. A passing eval run is grey.

### `HowItWorks`

A press on any section that is really implemented by a file opens the real code
beside a plain-English reading of it — `OriginDialog` from `@fde/uikit`, which
already owns the three ways out, the scroll lock and the measured transform
origin. The content shape is fixed: *in plain words*, *the code*, *line by line*,
*what went wrong here once*. Ten of them, each quoting a real file with its line
range, and almost every one has a scar to report — which is the honest finding,
because a rule with no scar is usually a rule nobody has tested.

The hue is read off the trigger at press time: the dialog portals to `<body>`, so
it is not a descendant of the element that sets `--lesson` and every dialog would
otherwise have come out lesson one's blue.

### What this does not do

- **Nothing from `docs/steering/` is in it.** These five are the generic
  pipeline, read out of the repo-wide documents. One engagement's own material —
  roughly 4,400 lines across 15 documents — is catalogued in
  `docs/steering/LEARN-SOURCES.md` and is a separate decision about whether it
  extends this track or forms a second one.
- **No new dependency.** Every chart is hand-rolled SVG, like `FlowMap` and
  `Journey` before it.
- **No API route, no database, no model call**, so `apps/web/veresk-app` still
  carries no `ssr.external` list. That absence remains the accurate statement
  about this app even though "one page" no longer is.

---

## 2026-09-15 (later) — `/learn` grew a second track, and the code blocks became editors

Two changes on top of the five lessons above.

### Seven more lessons, from one engagement

`docs/steering/LEARN-SOURCES.md` catalogued roughly 4,400 lines across fifteen
documents — one engagement's own material, none of which was in the first five
pages. Seven lessons came out of it: **guessing, three pipelines, the answer
key, the tools, attention, what leaves the building, the ceiling.**

**They are a second track rather than lessons 6–12**, and that was the one
structural decision the catalogue deliberately left open. The first five are the
machine and are true of all three engagements; these are one customer's files.
Running them together as 1–12 would have claimed a single dependency chain that
does not exist — `guessing` assumes nothing at all, is the strongest page in the
section, and is labelled **reads cold** on its own card so a reader who starts
there knows they have skipped nothing.

**Track two has no per-lesson hue.** It has no sequence for one to encode, and
the arc left over once severity has claimed teal, green, amber, rose and blue
was not wide enough for five, let alone twelve. It is drawn in the foreground
colour, which has the useful side effect of making the two tracks distinguish
themselves without a legend.

**Three things the material forced that the first five did not need:**

- **A reference line on `BarRows`.** The field-accuracy chart has a dashed line
  at 33% — the rate three-way guessing scores — and one bar landing on it *is*
  the finding. Without the line the chart shows a low number; with it, it shows
  chance.
- **`Figure` gained `kind`.** `measured` | `illustration` | `proposed`, defaulting
  to the strict one, so a figure whose author forgot claims to be measured and is
  wrong in the direction somebody notices. Nothing rendered is `proposed` yet —
  `docs/steering/OPERATIONS.md` is where that material lives and almost none of
  it is built.
- **A provenance warning written into a page's own header.** Five counts in that
  corpus — 1,069 / 922 / 702 / 220 / 203 — are different scopes at three dates,
  not contradictions. The `guessing` page uses the 203-document run throughout
  and says how you can tell: 75 answered plus 128 refused is 203.

### Code blocks are VS Code now

`shiki`, with the editor's own `dark-plus` grammars and theme, running
synchronously so there is no loading state and nothing for hydration to
disagree about. Full account — the measured bundle cost, the two things that
survived from the hand-rolled version, and why the background is lifted off the
theme's own `#1e1e1e` — is in `docs/SITE.md`.

It is this app's first runtime dependency. **85 KB gzipped, and the firm's door
does not load it** — checked by reading what `/` actually preloads rather than
assuming the chunk split went the way it looked like it would.

### Checks

`pnpm typecheck` 31/31, `pnpm leak:check` PASS, and the overflow probe from the
entry above clean at 1440 and 1280 across all fourteen routes.

### Six pages had only ever been typechecked, and a review pass found four defects in them

Worth recording as a process finding rather than as four bugs: `vectors`,
`retrieval`, the index and one dialog were screenshotted; the other six lessons
had a green `tsc` and a 200 response and nothing else. Every one of the four was
visible in the first seconds of looking at the page.

1. **`Matrix` was reused twice without being re-labelled.** Built for engine ×
   cloud, it hardcoded `engine` as the row header and printed `live` / `wired` /
   `refuses` — so the search-arms grid said *"✕ refuses"* in `--ui-danger` for
   *"an embedding cannot separate two identifiers"*, and the summary grid had
   four rose cells where nothing was wrong. **Both pages had grown a footnote
   telling the reader to read the glyphs as something other than what the cells
   said**, which is the signal to change the labels rather than keep explaining
   them. It now takes `marks` and `rowHeader`; `EITHER_OR` is the neutral set.
2. **A refusal was drawn as a 2px bar.** `Math.max(2, x(v))` exists so a tiny
   value is never invisible, and at `value: 0` it gave every refusal a visible
   stub labelled "refused" — on the one page whose entire subject is that a
   refusal carries no number anywhere. `value: null` now means *there is no
   number* and draws nothing; `0` still draws the stub, because a measured zero
   is a measurement.
3. **A funnel repeated 220 and mixed units in one bar** — the third stage was
   the second stage again, with 293,019 *hours* in the caption of a bar counting
   *jobs*.
4. **Two adjacent pages quoted one effect at two magnitudes** — 37% and 54% for
   the mean-vs-median gap, from two different comparable sets, with nothing
   saying so. Both now name their set, the way the `guessing` page already
   named its 203-document run.

Also labelled: `849 files` on the residency page is `1,069 − 220`, our
arithmetic, in a figure otherwise sourced to a document that states the other
two numbers.

**The dialogs were unchecked too**, because the overflow probe ran with all of
them closed. Re-run driving every `.learn-open`: 20 opens across 12 routes at
two widths, no clipping, the panel scrolls, and the hue reaches the portal on
every one.

### The lesson map read as a broken numbered list, and the fix was to draw the relationships

Reported by Byron, and it is the clearest example in this section of a layout
that only *places* things near each other and leaves the reader to infer the
relationship — where they inferred the wrong one.

It rendered as three stacked rows: cards 2, 3 and 4 in a line, lesson 1 hanging
below in a half-width row of its own, then lesson 5 as a wide dashed bar. So a
reader met a numbered diagram **that starts at 2**, with 1 and 5 apparently
trailing after 4, and nothing on it saying why.

Three changes, and only one of them is cosmetic:

1. **The relationships are drawn.** A solid stem from Retrieval down to Vectors
   — that join is real, retrieval genuinely is vectors underneath — and a dashed
   bracket opening upward across all three stages for Evals. Dashed because
   `DESIGN.md` §6 reserves a dashed span for a join that is not a step, and an
   eval is not the fourth thing that happens to a question.
2. **The sentence explaining the numbering comes before the drawing.** "Why does
   this start at 2" is the first thing a reader asks and the diagram cannot
   answer it by itself.
3. **It is a grid with one shared column template**, so the stem lands under the
   first card at every width — measured at a constant 20px offset from the
   card's left edge at 1024, 1280 and 1440 — and the fractional columns mean it
   cannot clip. The fixed 12rem cards it replaced are what ran past the edge at
   1440px in the first place.

**One separate bug fell out of the report.** The chip separator was `ml-2`, which
is invisible to anything that copies the text — pasting the diagram gave
`1. Vectorswhat retrieval is made of`, which is how it arrived. It is a character
now. A page whose whole argument is that its figures are checkable should survive
being quoted.

---

## 2026-09-15 (later still) — the five topics, a third track, and the repo map

Byron's original ask, which neither session had written down: **LLM cost
autopilot, semantic cache, catch model regressions, failure forensics,
self-healing docs.** Those five were why he wanted learning pages at all, and
the first pass shipped without them. His objections were that the topics were
missing, the engagement pages had no code and no plain explanation, and the
design did not match the machine pages. All three were right.

### A third track, and the hue argument reversed

`operations` — five lessons, one per topic, slotted **second** rather than last,
because four of the five need only the machine track. Only `forensics` leans on
the engagement, and it says so.

**Track two having no colour was wrong and is fixed.** The palette validator's
finding stands — five distinguishable hues is the ceiling in the arc severity
leaves — but the conclusion drawn from it was not. A hue is now a **position
within a track**: every track samples the same sky→orange ramp at
`(n - 1) / (total - 1)`, so a five-lesson track lands on the five stops and a
seven-lesson track gets seven steps of the same thing. Tracks never interleave
on one page, so two lessons sharing a hue cannot be confused.

### `SaidOutLoud`

Each operations page ends with a paragraph you could say to somebody, and the
question they ask next. `then` is required rather than optional, because every
one of these has an obvious follow-up and knowing it is the difference between a
rehearsed answer and an argument you can stand in.

### Two figures were wrong on a page before anybody read it

The cost lesson shipped with **74%** and a **$0.0177** median, both computed by
hand from `logs/requests.jsonl`. Turning that table into `pnpm steering:spend`
found a whole surface missing from the first — `http`, the web desk, $0.2088 over
19 rows — and a wrong grouping in the second. The real figures are **68.5%**,
**$2.4675**, **$0.0151** and **24.1×**.

The page keeps the history rather than quietly carrying the better numbers, and
`/learn/drift` carries it as a live incident. **A second one landed the same
way:** `pnpm arch:graph` showed `docs/ARCHITECTURE.md` §1 stale by 5,227 lines in
the surface layer — **7,911 of which is this learning track**. A document
describing the repo became wrong because somebody added pages to the repo, and
the pages were these ones, about drift.

### `/learn/architecture` — and the half that is generated

*"Follow one requirement through the repo."* Not a lesson in any track; a
reference. **The graph is generated** — `scripts/arch-graph.mjs` reads every
`package.json` and the workspace globs into `architecture.generated.ts`, behind
`pnpm arch:graph`, checked by `pnpm arch:check`. **The walk is hand-written**,
and the page says which half is which, because which file handles which stage is
not derivable from a manifest.

Two things the generator got wrong first, both caught by building it:

1. **It counted itself.** The artifact lands inside a package it measures, so
   writing it changed the number it reports and `--check` could never agree with
   itself. `*.generated.ts` is excluded now, which is also the right answer
   independently — the figure means "how much was written".
2. **It inferred the layer from the directory**, which put `@veresk/surface`
   under a heading reading *"knows nothing about any customer — a second
   engagement uses it unchanged"*. That package's whole reason for existing is
   the opposite. The layer is now the glob **plus two documented exceptions**,
   with the disagreement rendered as a `layerNote` rather than silently
   resolved.

**And `arch:check` itself committed the failure `/learn/drift` is about.** It
compared line counts, so any edit to any file turned it red — a checker that
fires on every commit is a checker somebody turns off. It now guards the graph
(packages, layers, edges) and ignores the counts. Both behaviours are proven:
a planted edge change is caught, a planted line-count change is not.

### The defect that made `HowItWorks` mark its own excerpts

One walkthrough carried a **paraphrase** of `packages/guard/src/guard.ts` under
the real path — invented identifiers, and it dropped the branch where missing
configuration **allows** in development. The page taught *fail closed* while
omitting the one path that fails open. Beside it, in the same component with the
same `path=` prop, sat an excerpt that was verbatim to the line. A reader could
not tell which they were getting.

`HowItWorks` now takes `shape: 'verbatim' | 'assembled'`, defaulting to the
strict value, rendered in the snippet header. An audit found **seven** of the
existing walkthroughs carrying the same defect — one instance, seven
occurrences. Same argument as `Figure`'s `kind`, one level down.

The guard excerpt is the real file now, and the dev branch is the interesting
part rather than the embarrassment: the dev server binds loopback, and the
alternative — every developer setting a secret before the app starts — is how
people end up committing one.

### Checks

`pnpm typecheck` 31/31 · `pnpm leak:check` PASS · `pnpm arch:check` current ·
20 routes × 2 widths rendered with zero overflow, clipping or missing accents.

### The architecture page shipped orphaned, and the counts beside it were stale

Byron found both by reading the page, which is the honest note to end on: the
render sweep, the typecheck and the overflow probe all passed on a page nothing
linked to.

**`/learn/architecture` was reachable only by typing the URL.** The plan said it
would get an entry above the tracks; the entry was never written. The route
worked, the page rendered, and no rail, index or landing page pointed at it.

Fixed in three places, and the fix is that there is now only **one** place to
change: `MAP` in `lib/learn/lessons.ts`, read by the rail (a pinned, unnumbered
row above the tracks — it is a reference you want mid-lesson, and the rail is
the only thing on screen then), by the section index above the tracks, and by
the firm's page. A page cannot be added to this section now without a record to
put it in.

**And three surfaces said "twelve lessons, two tracks" after a third track of
five landed.** The rail, the index and the firm's page each carried the number
as a literal. The reading estimate was low by the same five pages.

That is a hardcoded count going stale the moment the thing it counts changed,
**in the navigation of the site whose last lesson is about exactly that** — and
unlike the two incidents already on `/learn/drift`, no command caught it,
because it had no producer. Somebody had typed "twelve" into three files. It is
now `TOTALS`, derived from `LESSONS.length`, `TRACKS.length` and the sum of the
per-lesson minutes.

`Drift.tsx` carries it as a fourth incident and uses it to make the point the
other three could not: the fix was not to *check* the number, it was to stop it
being a number.

### Three smaller fixes from the same pass

- **The dependency chart's per-row lists went.** Nineteen rows each carrying up
  to eight package names was a wall of small grey text, and the `Key` under it
  says to read the shape rather than the rows. The four layer blocks above
  already name every package, so the list was a third printing. Rows now carry
  layer and third-party count; the bar carries the fan-out.
- **A passing eval cell was invisible.** `--ui-raised` on `--ui-surface` is two
  near-blacks about 6% apart, so the 3×5 grid read as empty. "The absence of bad
  news does not get a colour" is not the same as "gets no contrast" — a reader
  has to be able to count the passing runs.
- **A verification method failed before the thing it verified did.** `grep -c
  'NN lessons'` returned nothing against a page that was correct: React's SSR
  markers split the number (`lessons · <!-- -->3<!-- --> tracks`). Ten minutes
  went into hunting a stale build that did not exist. A red check is a
  hypothesis — this repo's own rule, arrived at from the tooling side.

### Final state

- **17 lessons, 3 tracks, plus `/learn/architecture`.** Machine 5 · operations 5
  · engagement 7. Every lesson carries at least one `HowItWorks`; excerpts are
  marked `verbatim` or `assembled`.
- `pnpm typecheck` 31/31 · `pnpm leak:check` PASS · `pnpm arch:check` current.
- 20 routes × 2 widths: no page-level scroll, no clipped element, no lesson
  missing its accent, no `/learn/*` page missing a link to the map.

### A fifth drift incident, and it is the one that sharpens the lesson

The cost lesson's **lede** went on asserting 74% after the body of the page had
been corrected to 68.5% — on the index card and at the top of the page itself,
so a reader met the wrong number as the finding and its correction four
paragraphs later.

**That number has a producer.** `pnpm steering:spend` prints it. The producer did
not save the sentence, because nothing connected the two — the lede was written
before the command existed and lives in a different file.

> **A number with a producer that nothing checks is no better off than a number
> without one. It only looks like it is.**

Which is the sharpest thing on `/learn/drift` and it now closes that page's
argument. "Give the number a producer" is the fix that page recommends, and this
is the case proving it is necessary rather than sufficient: the producer has to
be *wired to the claim*. Until it is, a documented figure with a command behind
it is more dangerous than one without, because everybody involved believes it is
covered.

**The lede now says "two thirds" rather than 68.5%**, deliberately. A summary
carrying a precise figure is a second place for that figure to go stale, and the
body below has the exact one with the command beside it. Rounded summary,
precise body, is the only arrangement where the two cannot disagree.

Three instances of 74% survive on the site and all three are sentences *about*
the correction. Asserted by reading every one in the rendered text rather than
by grepping source.

---

## 2026-09-15 (later still) — a fourth track: five ways to retrieve

Written from `docs/rag/`, five documents produced in parallel by another
session: `HYBRID.md`, `CORRECTIVE.md`, `AGENTIC.md`, `GRAPH.md`,
`MULTIMODAL.md`. Each ends with a `## Figure data for the UI` section naming the
chart component it wants, which is why this landed in one pass rather than three.

**Five lessons, and the track sits THIRD rather than last.** The argument is the
one `operations` already made and is on the record in `lessons.ts`: these five
are general — four of them are patterns this repo has not built — and the
engagement track is one customer's files. Filing the general behind the specific
is the mistake that track was moved to avoid.

**It is a reading order, not a dependency chain, and the `needs:` lines say so.**
All five assume machine lesson 2; only `corrective` depends on a sibling. Three
read cold relative to the track and their cards say it, the way `guessing` and
`forensics` already do.

### `Figure` gained a fourth kind, and the track could not be honest without it

`measured | illustration | proposed` had no slot for *a real measurement, made
by somebody else*. ViDoRe nDCG, Self-CRAG on PopQA, GraphRAG win rates — real
numbers, other people's corpora. `illustration` says "nothing in it was
measured" and `proposed` says "these numbers are not a result"; both are false
about a published benchmark, and both undersell it.

Leaving them `measured` is worse than either, and is the reason `cited` exists:
that is the DEFAULT, it renders no badge, and on this site an unbadged figure
reads as a number somebody here printed. Two of these five pages have no repo
run behind them at all, and saying so out loud is the honest thing for them.

All three non-default kinds take the same amber marker. They differ in
provenance, not in severity, and the words carry that.

### One new chart, `Path`

A fixed-layout chain for the two-hop question in `GRAPH.md` §4. Deliberately not
force-directed: the claim is the path, not the topology, and a figure whose
positions come from a simulation draws differently on every reload.

### THE FINDING OF THIS SESSION — a string nobody can measure until it renders

Two bugs an afternoon apart, in two different components, looked separate and
are one. Recording them together because the shared cause is the useful part.

**`Path` v1** put each hop's source file in an SVG `<text>` under its own arrow.
`requirements/PRG-KST-K2/…` is far wider than the ~90px gap between two boxes,
so it ran under the node rectangles and lost its leading characters.

**`BarRows` reserved a flat 90 units** for the value label it writes after the
bar. The longest bar always ends at `1000 - gutter`, so every chart got the same
~82 usable units regardless of what it actually had to print — and the viewBox
cropped the rest without a word.

**SVG has no text metrics at render time.** That is the whole cause: in both
cases a width that only exists after layout was guessed at beforehand, and both
guesses were invisible to `tsc`, to the build, and to a 200 response.

The `BarRows` half **had already shipped on four pages, in five places**, and
nobody had a check that could see it:

```
  /learn/generation   "110,130 input tokens"  → 110,130 inpu      55.4u over
  /learn/generation   "110,177 input tokens"  → 110,177 inpu      55.8u over
  /learn/vectors      "100 % recall@32"                           21.3u over
  /learn/attention    "3,854 passages"                            14.4u over
  /learn/vectors      "1,536 numbers"                              7.6u over
```

`/learn/generation` is the sharp one: its three shorter rows printed their units
in full and its two longest did not, so a chart cut mid-word looked like a
deliberate choice. On the figure whose entire subject is the comparison between
those five runs.

**Both fixes are the same move — stop guessing the width.** `Path` draws the
hops and lists their sources in HTML underneath, where the browser wraps them.
`BarRows` computes its gutter from the longest string it will actually print,
with a floor of 90 so every chart that was already fine is untouched. The
estimate is 6.6 units per character and is deliberately generous: erring wide
costs a little plot, erring narrow costs a digit.

**And the check now exists**, which is the part worth keeping. `getBBox()` on
every `<text>` in every `.learn-chart`, against its own SVG's viewBox, after
layout — the real measurement rather than a character count, which is a proxy
that is wrong in both directions. Run over all 23 lesson routes: **6 clipped
labels before, 0 after.** A sixth, on `/learn/retrieval`, was a `Slope` note 4
units over and was shortened.

### And this is the sharpest version of `/learn/drift`'s argument

Five of those six were on pages this session did not write. They had been
shipping, and **no check in this repo could have caught them** — not by
oversight, but because none of the instruments measures that quantity:

- `tsc` passes. It is a geometry problem.
- The route returns 200.
- **The overflow probe from the earlier entries passes too**, and this is the
  part worth being precise about. It looks for page-level horizontal scroll, and
  for an element whose `scrollWidth` exceeds its `clientWidth` under
  `overflow: hidden|clip`. A `<text>` cropped by its own SVG's viewBox is
  neither of those things — it is not an overflowing element, it is an element
  drawn outside a coordinate system, and the DOM reports nothing unusual about
  it. So the blind spot is structural rather than an oversight in how the probe
  was written.

  Observed directly on `/learn/vectors`, which the geometry probe reported clean
  at both widths in the sweep before any of this was fixed, and on which the
  text probe then found two clipped labels. `/learn/generation` and
  `/learn/attention` were only put through the geometry probe after the fix had
  landed, so for those two the claim rests on the structural argument above and
  not on a measurement taken in that order.

The six incidents already on `/learn/drift` are all a number that went stale:
something was written down, something changed, and the two disagreed. There was
a wrong value sitting on a page for a reader to catch.

**Here there was nothing to catch.** No number was wrong. Nothing contradicted
anything. A label was a dozen characters shorter than its author wrote it and
the page looked deliberate — `/learn/generation`'s shorter rows printed their
units in full, which made the cropped ones read as a choice. The defect was
invisible to every check *and* to the reader, and it stayed that way until
somebody built an instrument that measured the right quantity. The instrument
existed for about an hour before it found five shipped instances.

*Give the number a producer* is the fix `/learn/drift` recommends. This is the
case one step before it: some things have no producer and no claim, and the only
way to find them is to decide what to measure.

### Two more, from looking rather than from a check

1. **Two chart notes sat closer to the wrong row than the right one**, and one
   summarised the whole chart while appearing to belong to a single bar — "123
   runs, 13.8%" under the `11 calls` row reads as *11 calls happened 123 times*.
   Both facts were already in the figure's own `sub`, so both notes came off.
2. **A caption said "the same height"** about horizontal bars.

### The promise on the index page was a count, and the count went stale

`/learn` said *"exactly one drawing is an illustration rather than a
measurement"*, naming the draggable vectors in lesson 1. True for twelve
lessons. This track arrived with process drawings and other people's benchmarks
by the figure, and the sentence became false — in the same paragraph that makes
the site's central promise about provenance.

Rephrased as a rule rather than a count: **a figure either is a number this repo
measured, with the command that reprints it, or it says on its face that it is
not one.** A promise phrased as a count goes stale when the thing it counts
grows; phrased as a rule it cannot, and `Figure`'s `kind` enforces it with the
strict default. The rail carried the same sentence and got the same fix.

**And the landing page and the index both enumerated the tracks in prose** —
"five … five … seven" — after a fourth track of five had landed. `TOTALS` fixed
the counts in the navigation last session; this is the same defect one level
out, because a count in a sentence is still a count. The landing page now
renders the track names and their sizes from `TRACKS`; the index stopped
enumerating at all, since the tracks name themselves directly below it.

That is the sixth drift incident, in the section whose last lesson is about
drift, found the same way as the other five — by a person reading the page.

### Two corrections from the other session, and one re-run here

The distribution figure said **894 runs**; the producer in `AGENTIC.md` §2 had
been tightened to exclude an embeddings row and prints **893**, with the
`0 calls` bucket at 45 rather than 46. Re-run here before changing the page —
893, 45, 123 at six or more calls, 13.8%. Every other number held.

A draft of the hybrid page **redrew the reranker slope chart `/learn/retrieval`
already owns**, with a fourth case added: one measurement, two charts, with
different numbers for the same cases. Precisely what `/learn/drift` argues
against. Removed — the page points at lesson 2 and keeps only what is its own.

And the tool-description excerpt was marked `verbatim` while carrying reflowed
lines. Rebuilt from the file. That is the `HowItWorks` audit's exact defect,
committed again in the session after the audit.

### `scripts/validate_palette.js` does not exist

`lessons.ts` and `app.css` both quoted it as a runnable producer for the ΔE 6.8
finding. `scripts/` holds `arch-graph.mjs`, `dep-graph.mjs` and
`leak-check.mjs`, and nothing else. The measurement is real and is kept; the
command is gone and both comments now say so.

**A number with a producer that nothing checks is no better off than a number
without one** is the sharpest line on `/learn/drift`. This is a step worse: a
producer that does not exist, cited in two files, inside the package that draws
the page making the argument.

### Checks

`pnpm typecheck` 31/31 · `pnpm leak:check` PASS · `pnpm arch:check` current.
Render sweep over 11 routes × 2 widths with every dialog opened: no page-level
scroll, no clipped element, no lesson missing its accent, every dialog reaching
its hue. Text-overflow sweep over all 23 lesson routes: no clipped label. The two exclusions are the ones `SITE.md` already documents — the
Aurora wash and the landing `FlowMap`, which clip their own oversized drawings
on purpose.

**22 lessons, 4 tracks**, plus `/learn/architecture`.

---

## 2026-09-15 (last) — a fifth track: five things that are not retrieval

Written from `docs/beyond-retrieval/`, five documents produced in parallel by the
session that wrote the RAG folder. Byron named four topics — context
engineering, prompt injection / credentials, multi-agent orchestration, LoRA
fine-tuning — and the second became two documents, because untrusted *content*
and untrusted *access* have different anchors and different defences.

**The track sits FOURTH, and for once the placement is forced from both sides.**
Below `patterns`, because all five assume its `agentic` lesson — retrieval as a
tool the model may call is the thing they are "beyond". Above `engagement`, by
the rule the two tracks before it already used: these are general and one
customer's files are not. The other two placements were arguments; this one has
a single slot it can occupy.

It is a **ladder of commitment** rather than a dependency chain — what you put in
the window, what somebody else puts in it, who may put anything in it, how many
windows there are, changing the model instead. Each rung costs more and undoes
less. Only `credentials` needs a sibling, and it needs `injection` because the
two are legs of the same trifecta.

### Matrix rows carry an explanation and an example now

**Byron's change, and it is the right one.** A cell saying `— not built` beside a
detail saying `no external memory anywhere` is complete for a reader who already
knows what structured note-taking IS. For a reader who does not, it is a verdict
on a term they cannot picture — which is the one thing a teaching page must not
leave lying around. The grid is a summary, and a summary is only readable by
somebody who could have written it.

So a row takes an optional `explain`: what the thing is in plain words, a
concrete instance, and why this row got the verdict it did. It opens in
`OriginDialog`, the same component `HowItWorks` uses, with the hue read off the
pressed row for the reason that component documents at length.

**`shape` on the example has NO DEFAULT, deliberately.** `HowItWorks` defaults to
`verbatim` and an audit later found seven walkthroughs carrying a paraphrase
under a real path. Most examples here are illustrative by nature — you cannot
quote the file implementing a technique you did not build — so a default in
either direction would be wrong about most callers. The caller says which it is
every time, or it does not compile.

Applied to the four grids whose row names are shorthand a reader may not have:
the long-horizon techniques, the seven failure points, the agentic taxonomy, and
pharma's trifecta legs. **Not** applied to the graph and multimodal decision
tables, whose rows are already plain questions — *"what does form X pay"* needs
no gloss, and adding one would have been affordance without content.

### `Trifecta`, and one prop that is the whole reason it exists

A small dedicated drawing for the lethal trifecta: three overlapping conditions
with the failure at the centre. Not `Path`, because `Path` draws a chain and
implies an ordering; nothing here leads anywhere, and the point is that removing
ANY ONE of the three removes the failure.

`present: false` draws a set dashed, which is this site's existing convention for
a join that does not exist. The caption reads *"this repo is missing the third
leg in every engagement, deliberately"*, and a drawing that rendered all three
alike would have made that sentence do work the picture contradicts.

### Python, which is a bundle decision and was measured before it was written down

`Snippet` carried four grammars. `/learn/finetuning` quotes `peft` and
`transformers`, which are Python; a TypeScript LoRA example would teach a
fiction, and an unhighlighted block inside a frame claiming VS Code's own
colours is worse than either.

No new dependency — the package was already installed. The cost, read off the
file rather than estimated:

```
  @shikijs/langs/dist/python.mjs     77,130 bytes raw · 9,407 gzipped
  the shared learn chunk, after      497,501 raw · 94,951 gzipped  (was ~85 KB)
```

**And the comment recording that cost was wrong for about a minute.** It was
written with "27 KB raw, 8 KB gzipped" in it before anything had been measured,
then corrected against the actual file. Worth recording because it is the exact
failure mode this section keeps documenting, committed while documenting it —
and it happened **twice**: the checks line at the foot of this entry was first
written as `typecheck 36/36`, a number nothing produced, against a run that says
31. Both were caught by running the thing rather than by reading the sentence,
which is the only method that has ever worked on this class of error.

The firm's door still does not carry any of it — checked against the built
output rather than assumed: `/` serves four chunks and none of them is the learn
chunk, while `/learn/finetuning` pulls it.

### What the render sweep found

The geometry probe was extended to open `.matrix-open` as well as `.learn-open`,
because a sweep that does not open the new dialog is the same miss the earlier
entries already record. 8 dialogs on `/learn/credentials`, 8 on `/learn/agentic`
after the explanations landed, all reaching their hue.

**The text probe earned its place again**, on a component it had not previously
caught: `Funnel` draws its `op` label right-anchored in a gutter of about 86
units, with no wrapping, so `days, GPUs, labelled data` ran 79 units off the LEFT
edge and was cropped. Same root cause as the `BarRows` clip and the `Path`
collision — a width that only exists after layout, guessed at beforehand — now
in its third component. The detail moved to `why`, which has the full width.

**And the budget was then measured rather than guessed, because a guess was
about to be written into a brief.** The first statement of it was "keep `op`
under about 12 characters", which is a rule of thumb, and the other session
immediately encoded it as a constraint and shortened four strings in its own
source data to satisfy it. So it got measured with `getBBox` instead:

```
  "gate + top-k"              12 chars   79.1 wide   6.9 clearance
  "the work list"             13 chars   85.7 wide   0.3 clearance   ← the cliff
  "days, GPUs, labelled data" 25 chars               79 units CROPPED
```

86 units at about 6.6 per character: the ceiling is ~13 and the safe budget is
12. **`the work list` was passing** — it is 0.3 units inside the edge, which the
probe correctly reports as clean and which is not a margin. Shortened, and the
numbers now live in `Funnel`'s own prop doc rather than in a document the
component cannot see.

Which is the third time in two sessions that a fix in a component would have
been undone by the data feeding it. The other session named it, and the name is
right: a constraint that lives in one place and is violated in another is the
same shape as the retry sentence written out three times in `settle.ts` — the
subject of `/learn/context` §3, written hours before either of us walked into
it. `BarRows` escaped this by computing its gutter from its content. `Funnel`
cannot, because its gutter is also what positions every bar, so the constraint
stays a constraint and the only defence is that it is now written where the
caller will see it.

### Checks

`pnpm typecheck` 31/31 · `pnpm leak:check` PASS · `pnpm arch:check` current ·
`pnpm build` clean. Geometry sweep over the new routes × 2 widths with every
dialog opened: clean. Text sweep over the new routes: clean after the `Funnel`
fix.

**27 lessons, 5 tracks**, plus `/learn/architecture`.
