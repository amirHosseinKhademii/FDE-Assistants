# Insurance Claims Assistant

FDE practice engagement #2. The customer is a mid-size insurer (fictional —
"Meridian Mutual"); the bottleneck is claims processing. Built pillar by pillar
following the FDE method handbook carried over from
[`../Travel-Assistant`](../Travel-Assistant).

**Three docs, three jobs:** this file is *how to run it*.
[`GUIDE.md`](GUIDE.md) is *everything else in one pass* — what FDE is, the eight
pillars, which half of each is a framework and which half we wrote, the honest
status, and the four phases planned next. **Start there if you are coming to
this cold.** It also has an [audio version](narration/README.md): every word
except the code, read aloud, one MP3 per section.
[`PROGRESS.md`](docs/PROGRESS.md) is *what was built, why, what broke, and what is
left* — the engineering log, with dates.

[`CORPUS-PLAN.md`](docs/plans/CORPUS.md) is *the plan for making the corpus realistic* —
thousands of documents rather than twelve, with the eval set growing alongside.
[`NEXT.md`](docs/ROADMAP.md) is *the plan being worked right now* — Mastra, then a
streaming web surface, step by step.
[`TEMPLATE.md`](docs/TEMPLATE.md) is *how to reuse this repo for another domain* —
what transfers, what you rewrite, and `grep -rn "DOMAIN:" packages/insurance/src/`
for the seam list.
[`DEPLOYMENT.md`](infra/DEPLOYMENT.md) is *how this would run for a real
customer* — where each piece lives, and the telemetry decision. Nothing in it is
built yet.

The four docs GUIDE.md replaced — `FDE.md`, `FRAMEWORKS.md`, `PILLARS.md`,
`JOB-PLAN.md` — are kept unedited in [`archive/docs/`](archive/docs/) for the
rejected options and the long walkthroughs the merge dropped.

Persona, per [`../ROADMAP.md`](../ROADMAP.md) §4: **Priya, a claims adjuster**,
who currently spends ~12 minutes per claim looking up policy language.

## Layout

A pnpm + Turborepo workspace. The root is a workspace root and nothing else: no
`src/`, no dependencies of its own, scripts that delegate.

**Seven of the eight packages carry no insurance vocabulary in code.** That is
checked, not asserted — `pnpm leak:check` scans every executable line of
`packages/*/src` outside `@claims/insurance` and fails the build on a hit.
*Comments are deliberately exempt*: the reasoning in these packages is largely
*about* the domain boundary, and failing on it would push the explanations out
of the code.

The check earned its keep on its first run. It reported PASS while
`@fde/grounding` still defaulted to `postgresql://claims:claims@localhost/claims`
— the scanner had stripped everything after the `//` in `postgresql://`,
mistaking a URL for a trailing comment. A scanner that drops its input is
indistinguishable from a clean codebase, which is why it now plants a leak in a
synthetic file and requires itself to catch it.

Each `@fde/*` package takes what is specific to a domain as an argument — a
schema, a classifier, a document descriptor — and ships the mechanism plus the
negative control that proves the mechanism can still fail.

```
packages/
  insurance/    @claims/insurance — THE 10% THAT CANNOT TRANSFER       ~1600 lines
                  the answer schema, the prompt, the three tools, the
                  severity rules, the form-id scheme, the eval checks
  grounding/    @fde/grounding — load, chunk, embed, store, hybrid      ~1230
                  search, document + record sources, the retrieval CLI
  evals/        @fde/evals — repeat runs, severity buckets, baselines,    ~940
                  diffs, scorecards, the classifier verifier
  agent/        @fde/agent — two interchangeable loops (OpenAI Agents      ~900
                  SDK, Mastra), tool registry, fixtures, compliance tests
  schema/       @fde/schema — parse, shape-check, coherence rules,         ~150
                  plus the validator and description verifiers
  telemetry/    @fde/telemetry — per-request cost log and its DB sync      ~130
  guard/        @fde/guard — the write-path guard and its self-test        ~110
  foundry/      @fde/foundry — Azure AI Foundry client, Entra tokens        ~30
apps/insurance-app/
                @claims/insurance-app — TanStack Start: the page and
                the /api/ask route
docs/           examples/ (the 79-document corpus), evals/ (cases,
                fixtures, committed baselines), and the written record
infra/          docker-compose.langfuse.yml, DEPLOYMENT.md
```

**The corpus and the eval cases live in `docs/`, not in a package.** A
customer's documents are not source code: they are reviewed by different people,
change on a different schedule, and at a real engagement are not in this repo at
all — `CORPUS_DIR` and `RECORDS_DIR` point elsewhere and none of it is read.
Keeping data out of `packages/insurance` makes that swap a path change.

Commands are unchanged and still run from the root — `pnpm ask`, `pnpm eval`,
`pnpm chunks` all delegate to `@claims/insurance`.

## Run it

Everything except embedding runs offline, with no Azure and no cost.

```bash
pnpm install

pnpm chunks              # inspect the corpus + chunking          OFFLINE
pnpm holder AUT-4471     # exact policyholder lookup              OFFLINE
pnpm env:check           # is .env filled in?                     OFFLINE
pnpm schema:check        # does the answer contract hold?         OFFLINE
pnpm compliance:check    # store:false + tracing off, asserted    OFFLINE
pnpm severity:check      # every check maps to a severity bucket   OFFLINE
pnpm guard:check         # every write-path denial still denies    OFFLINE
pnpm leak:check          # no domain words in the reusable packages  OFFLINE
pnpm typecheck

# The policy index lives in Postgres + pgvector. Any Postgres works —
# Neon, RDS, the customer's own cluster. This is the local one.
docker run -d --name claims-pgvector \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres \
  -p 5433:5432 pgvector/pgvector:pg17

cp .env.example .env     # then fill it in
az login
pnpm ingest              # build the vector index      needs Azure + Postgres
pnpm query "rental car limit" --form "PP 03 24 06 24"
```

`pnpm compliance:check` is the one worth understanding: it captures the actual
outgoing request and asserts `store: false`, that no conversation state is held
server-side, and that the Agents SDK's tracing exporter — which defaults to ON
and ships to `api.openai.com` — stays disabled even with an `OPENAI_API_KEY`
set. It carries negative controls so it cannot silently stop checking. See
[`GUIDE.md`](GUIDE.md) §4.

`pnpm corpus` regenerates the bulk documents. Output is deterministic and
committed — you should never need to run it unless you are changing the
haystack.

## The corpus

30 fictional documents under `docs/examples/`, deliberately messy.

**12 policy wordings** (`docs/examples/policies/`) — searched via
`search_policy`. Three are hand-written "heroes" carrying planted flaws; nine
are generated near-duplicates whose job is to be plausible noise, so retrieval
has to actually discriminate.

**18 policyholder records** (`docs/examples/policyholders/`) — read
whole by id via `get_policyholder`. Never searched. A question with one exact
answer is a lookup, not a search.

### The four planted flaws

| Flaw | Where | Correct behaviour |
|---|---|---|
| **Contradiction** — rental benefit is `$40/day × 30 days` in `auto-pa-2023-01.md` §4.4 and `$50/day × 21 days` in `auto-pa-end-2024-03.md`, and neither says which policies it attaches to | two hero wordings | cite both, flag the conflict — *unless* the policyholder record settles it |
| **Coverage gap** — rideshare appears in none of the 30 documents | corpus-wide | escalate; never reason by analogy from Exclusion B (goods for a fee) or I (peer-to-peer rental) |
| **Three heading styles** — `Part IV / 4.2 Collision`, `Collision Coverage / What We Pay`, `EXCLUSION B — …` | one per hero | citation must survive all three |
| **Tables that matter** — limits/deductibles schedules | 10 chunks | a deductible must never be chunked away from the coverage it belongs to |

The numbers in the contradiction cross on purpose: a 25-day repair is $1,000
under the base form and $1,050 under the endorsement, but a 30-day repair is
$1,200 vs $1,050. There is no "the newer one is obviously better" shortcut.

The contradiction is resolvable **only** through the policyholder record's
`Endorsements Attached` field — which is what makes the two tools have to
cooperate. Three cases exist deliberately.

These are the **expected** answers — the answer key the eval cases were written
against:

- `AUT-4471` — endorsement attached → $50/day, 21 days
- `AUT-4472` — no endorsement → $40/day, 30 days — **wrong, see below**
- `AUT-4482` — attached but not countersigned → **genuinely unresolvable, escalate**

⚠ **The `AUT-4472` line is an error in this answer key**, found on 2026-09-05.
That record has `Rental Reimbursement | no` — the coverage was never purchased,
so the right answer is "not selected, no coverage," and $40/30 is the base
form's schedule for a customer who does not have the benefit. `cov-003` still
encodes the wrong expectation; tracked as PROGRESS.md issue #3b, and the fix is
a decision about what that case should test, not a typo.

`AUT-4473` is the rideshare case.

## Two things worth knowing before they look like bugs

**Search has no score cutoff.** It returns the top k even when all k are junk.
Similarity ranks topical relevance; it cannot tell you whether an answer
exists. Asking "is a rideshare driver covered" will retrieve Exclusion B at a
high score — adjacent, and not the answer. Deciding "it isn't in here" is
reading comprehension and belongs to the model, not to a threshold.

**The form filter is exact, not a prefix.** The first version used `startsWith`,
which silently merged forms that differ where it matters. The corpus holds three
revisions of the base personal auto form — `PP 00 01 01 15`, `PP 00 01 09 18`
and `PP 00 01 06 24` — so a prefix match on `PP 00 01` answers a 2024 question
out of a 2015 wording and never says it did. See
`packages/insurance/src/config/form-id.ts`; the comment there is the whole lesson.

## Pillar progress

| # | Pillar | Directory | Status |
|---|--------|-----------|--------|
| 1 | Grounding — answer from the insurer's own policy docs | `packages/insurance/src/grounding/` | **done, on LangChain.js + pgvector** — 128 chunks; chunker and form-id stay ours |
| 2 | Tool-calling loop | `packages/insurance/src/tools/` | **done, on the OpenAI Agents SDK** — `pnpm compliance:check` pins `store:false` + tracing off |
| 3 | Structured output (`CoverageAnswer`) | `packages/insurance/src/schema/` | **done, on Zod** — types inferred from the schema; `pnpm schema:check` 10/10 + description coverage |
| 4 | Evals | `packages/insurance/src/eval/` | **done, on Langfuse (self-hosted)** — 7 cases x 5 runs, 30/35 runs; our runner keeps the loop, Langfuse gets the dashboard; `eval:diff` / `eval:history` over 8 committed baselines ([baseline](docs/evals/README.md)) |
| 5 | Cost & latency telemetry | `packages/insurance/src/telemetry/` | **mostly done** — every `ask`, `eval` run and `ingest` writes a durable per-claim line; `pnpm logs:sync` ships it to Postgres. Chat pricing still provisional |
| 6 | Credentials & security | `packages/insurance/src/foundry/` | partial — `DefaultAzureCredential`, no keys |
| 7 | Escalation | *distributed* | works — `cov-002`, `cov-004`, `cov-006` cover it; thinly measured |
| 8 | Deployment | `apps/insurance-app/` | **begun** — a web app serves the page and a guarded streaming endpoint, and builds to a listening process. No image, no managed identity, nothing deployed |

`packages/insurance/src/` is laid out **by pillar**, so the table above is also the
map of the tree. Pillar 7 has no directory on purpose: escalation is a rule
enforced in two places — `coherenceErrors()` in `packages/insurance/src/schema/`,
the `escalates` check in `packages/insurance/src/eval/` — and giving it a folder
would suggest it is one component. The only files outside a pillar are the HTTP
surface in `apps/insurance-app/` and `packages/insurance/src/ask.ts`.

### One engine, and an archive

Pillar 2 runs on the OpenAI Agents SDK. The hand-rolled loop it replaced is kept
unmaintained at [`archive/pillar-2-handrolled/`](archive/README.md), excluded
from the build — it is the reference for what the raw protocol looks like, and
the thing to diff against when the SDK surprises you.

Both framework swaps are measured neutral: **30/35, zero flaky cases** — the
same score the entirely hand-built system had. A middle run looked like a
regression (28/35, two flaky) and turned out to be sampling noise; the working
through of that is `PROGRESS.md` §10.7. (GUIDE.md now describes only the code
that runs today, so that history lives in the log rather than the guide.)

### The answer contract

`packages/insurance/src/schema/coverage-schema.ts`. Scope is **coverage Q&A**, not
claim determination — the persona is an adjuster who spends 12 minutes looking
up policy language, so the deliverable is the lookup, done and cited.

```ts
export const CoverageAnswerSchema = z.strictObject({
  answer: z.string().nullable().describe('…'),      // null only when escalating
  policy_id: z.string().nullable().describe('…'),
  policy_form: z.string().nullable().describe('…'), // which of the 12 forms
  citations: z.array(Citation).describe('…'),
  unverified_claims: z.array(z.string()).describe('…'),
  conflicts: z.array(Conflict).describe('…'),
  escalate: Escalation.nullable().describe('…'),
});

export type CoverageAnswer = z.infer<typeof CoverageAnswerSchema>;
```

The `.describe()` strings are prompt engineering, not documentation, which is
why `pnpm schema:check` fails if any field loses one.

`conflicts` is the one field the travel-assistant version has no equivalent of.
It exists because of the planted contradiction: without a named box for "these
two documents disagree," a model's only options are to silently pick one or
refuse outright, and both are wrong.

`escalate` is separate from `answer` rather than a status enum, so the model can
return **partial work plus a flag** — see the `AUT-4482` case. Priya gets the
research and the caveat, instead of a refusal she has to start over from.

The validator enforces two layers. JSON Schema checks *shape*; `coherenceErrors`
checks *coherence* — combinations that are structurally valid and still wrong.
The most important one: **an unresolved conflict with no escalation is
rejected**, because that is the model silently picking a side.

### Evals — first scorecard

```
pnpm eval                        # every case, 5 runs each, pass rate per case
FIXTURE_MODE=record pnpm eval    # record policyholder lookups as it goes
FIXTURE_MODE=replay pnpm eval    # replay only; a miss is a hard error
                                 # (lookups only — search always runs live,
                                 #  see docs/evals/README.md)
pnpm eval --only cov-001
pnpm eval --tag conflict
pnpm eval:smoke                  # --repeat 1: a smoke test, NOT a number

pnpm eval:history                # every baseline on disk, one row each
pnpm eval:diff                   # the two newest, per case + severity movement
pnpm eval:diff <before> <after>  # any two by name
```

`eval:diff` and `eval:history` are free and instant — they read baselines
already on disk, call nothing, and work with no server running.

For the dashboard, run history and per-trace detail, pillar 4 uses **Langfuse,
self-hosted**:

```bash
docker compose -f infra/docker-compose.langfuse.yml up -d   # http://localhost:3000
# copy LANGFUSE_BASE_URL / _PUBLIC_KEY / _SECRET_KEY into .env, then:
pnpm eval
```

Each case run becomes a trace with its input, output, per-check scores and a
categorical severity. On a baseline run (`--repeat > 1`) it is also linked to
a dataset item under a run name identical to the baseline filename, so a number
on screen and a number in git always point at each other. `pnpm eval:smoke`
(`--repeat 1`) writes no baseline and so gets no named dataset run — a run in
the dashboard with nothing behind it in the repo is exactly what this is
supposed to prevent.

**Langfuse's own eval runner is deliberately not used.** It defaults to 50-way
concurrency against repeats that are serial on purpose, and its experiment
parameters have no repeat count. That is the same objection that rejected
Promptfoo, and it applies to Langfuse's *runner* while saying nothing about
Langfuse's *dashboard* — the useful distinction, and the reason this pillar has
a framework for one job and hand-written code for the other. `GUIDE.md` §6 has
the rest, including why Foundry Evaluations — in-tenant and
otherwise ideal — lost on a checked fact rather than a guess: its custom graders
are Python-only, and these checks are TypeScript.

With no `LANGFUSE_*` set, `pnpm eval` runs exactly as before and produces no
telemetry. The suite must never need a running service to produce a number.

Two behaviours worth knowing before reading a diff. It **refuses** (exit 2) to
compare runs made with a different model, fixture mode or repeat count, because
that measures the setup rather than the change. And a one-run move out of five
prints as MOVED, never as a regression, and never fails CI — §10.7 of
`PROGRESS.md` is a day spent chasing exactly that coin flip.

Baseline 2026-09-05 (run 2), 7 cases x 5 runs: **30/35 runs, 6/7 cases green,
0 flaky**, 551k in / 113k out tokens, p95 46.6s. Full write-up in
[`docs/evals/README.md`](docs/evals/README.md).

| case | what it guards | rate |
|---|---|---|
| `cov-001` | AUT-4471 — endorsement attached, must answer $50/21 | **5/5** |
| `cov-002` | AUT-4473 — rideshare gap, must escalate | **5/5** (was 2/5) |
| `cov-003` | AUT-4472 — never bought rental, must deny | **0/5** — our check is too strict |
| `cov-004` | AUT-4482 — endorsement uncountersigned, must flag conflict AND escalate | **5/5** |
| `cov-005` | AUT-4476 — Texas form, must not cite the national form | **5/5** |
| `cov-006` | AUT-9999 — no such record, must escalate not infer | **5/5** |
| `cov-007` | AUT-4473 — rental selected, no endorsement, base form governs | **5/5** |

Every case runs 5 times because a suite run once is a sample, not a measurement.
Nothing is flaky in this run — every case is 5/5 or 0/5, so the one disagreement
left is a real one.

`cov-007` is the **control** for `cov-001`: a fix that makes the model always
prefer the endorsement turns cov-001 green and cov-007 red. A case that can only
be passed by over-correcting is how you catch a fix that is too broad.

### Every failure so far has been ours, not the model's

Three for three:

| looked broken | actually broken | status |
|---|---|---|
| `cov-002` 2/5 | the citation checker rejected real documents | fixed — 5/5 |
| `cov-003` 4/5 | the case expected the wrong answer | fixed — split into `cov-003` + `cov-007` |
| `cov-003` 0/5 | the check that replaced it is too strict | settled 2026-09-10 — check dropped |

The third one, settled: `cov-003` must deny rental coverage for a customer who
never bought it. All five runs denied it correctly, then added *"(if she had
purchased it, PA-2023-01 pays $40/day)"* — plainly counterfactual.
`answer_lacks:$40` is a substring match and could not tell that from asserting
the figure, so it failed a correct answer five times out of five.

**Decided in favour of the counterfactual**, and the check was dropped: an
adjuster about to phone an unhappy customer needs "you would have had $40 a day
if you had taken that option". The losing argument is worth recording — a number
in a claims file gets quoted onward stripped of its caveats. `cov-003` is still
guarded by `does_not_escalate`, `cites_record` and `has_answer`, so the denial
must still be present and sourced. It was a product decision, not a bug, which
is why it needed a person rather than a fix.

The generalisation: **a red check is a hypothesis, not a verdict — and a green
one is not proof.** Test code gets none of the review the real code gets, and it
is the only code where a bug arrives looking like a result.

### Next

1. Pillar 5 — replace the provisional `gpt-5-mini` price in
   `packages/telemetry/src/request-log.ts` with a rate confirmed from Cost
   Management; the log itself is written.
2. Grow the eval set past 7 cases. Seven is a demo, not a scorecard.

## A note on the Azure resource

`.env.example` currently points at the **same Foundry resource as
Travel-Assistant**. Fine for a POC, written down rather than silently
inherited. Give this app its own resource before quoting any cost number.
