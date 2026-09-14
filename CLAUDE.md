# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FDE (Forward-Deployed Engineer) practice engagement #2: a claims-coverage Q&A
assistant for a fictional mid-size insurer ("Meridian Mutual"). The persona is
Priya, a claims adjuster who currently spends ~12 minutes per claim looking up
policy language — the assistant answers coverage questions from the insurer's
own policy documents, with citations, conflict detection, and escalation when
the answer isn't actually in the corpus.

**Read `README.md` first** — it is *how to run it* and has the fuller version
of everything below (corpus layout, the four planted flaws, eval scorecard).
`GUIDE.md` is the full narrative (what FDE is, the eight pillars, framework vs.
hand-rolled, status) — start there if coming to this cold; it also has an
[audio version](narration/README.md). `docs/PROGRESS.md` is the dated
engineering log. `docs/NEXT.md` is the plan being worked right now.
`docs/TEMPLATE.md` explains what transfers to a new domain and what doesn't —
`grep -rn "DOMAIN:" packages/insurance/src/` is the seam list.

## Commands

Run from the repo root (pnpm + Turborepo workspace; the root has no `src/` of
its own — everything delegates to `@claims/insurance` via `pnpm --filter`).

```bash
pnpm install

# Offline — no Azure, no cost, no Postgres needed:
pnpm chunks              # inspect the corpus + chunking
pnpm holder AUT-4471     # exact policyholder lookup
pnpm env:check           # is .env filled in?
pnpm schema:check        # does the answer contract hold?
pnpm compliance:check    # store:false + tracing off, asserted (Agents SDK)
pnpm compliance:mastra   # same, for the Mastra engine
pnpm severity:check      # every eval check maps to a severity bucket
pnpm guard:check         # every write-path denial still denies
pnpm leak:check           # node scripts/leak-check.mjs — no domain words leak
                          # into the seven reusable @fde/* packages
pnpm typecheck            # turbo run typecheck (all packages)
pnpm build                # turbo run build (all packages)
pnpm dev                  # turbo run dev --filter=@claims/insurance-app

# Needs Postgres + Azure:
docker run -d --name claims-pgvector \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres \
  -p 5433:5432 pgvector/pgvector:pg17
cp .env.example .env     # then fill it in
az login
pnpm ingest               # build the vector index
pnpm query "rental car limit" --form "PP 03 24 06 24"
pnpm ask                  # run the full agent loop against a question

# Evals:
pnpm eval                         # every case, 5 runs each
pnpm eval --only cov-001
pnpm eval --tag conflict
pnpm eval:smoke                   # --repeat 1: a smoke test, NOT a scorecard number
FIXTURE_MODE=record pnpm eval     # record policyholder lookups
FIXTURE_MODE=replay pnpm eval     # replay only; a miss is a hard error
pnpm eval:history                 # every baseline on disk, one row each — free, reads disk only
pnpm eval:diff                    # newest two baselines, per case + severity movement
pnpm eval:diff <before> <after>

pnpm corpus                # regenerate the bulk documents (deterministic, committed — rarely needed)
pnpm logs:sync             # ship the per-request telemetry log to Postgres
```

There is no test runner beyond the `*:check` self-tests above — each pillar's
correctness is asserted by its own `*-selftest.ts` / eval suite, not by a
separate Jest/Vitest layer. Run the specific `*:check` for the pillar you
touched rather than a global test command.

## Architecture

A pnpm + Turborepo workspace, **eight packages built around one rule: buy the
transport, write the judgment.**

```
packages/
  insurance/  @claims/insurance   THE JUDGMENT — the ~1600 lines that cannot
                                transfer to another customer: the corpus +
                                generator, the answer schema, the prompt, the
                                three tools, the severity rules, the form-id
                                scheme, the eval cases. Laid out BY PILLAR
                                (src/grounding, src/tools, src/schema,
                                src/eval, src/telemetry, src/foundry) — that
                                directory structure IS the pillar table below.
  grounding/  @fde/grounding   load → chunk → embed → store → hybrid search.
                                Domain-neutral: takes a source + descriptor. See
                                `docs/RETRIEVAL.md` — what each RAG stage is,
                                what the machine literally does, and the two
                                things here that are NOT retrieval.
  agent/      @fde/agent       the tool-calling loop, THREE interchangeable
                                engines (OpenAI Agents SDK, Mastra, LangGraph)
                                behind `LOOP=`, registry, fixtures, compliance
                                tests, and the `LLM_PROVIDER=azure|bedrock`
                                switch two of the three honour. See
                                `docs/ENGINES.md` — it is the chart for which
                                engine reaches which cloud, and why the default
                                engine refuses bedrock rather than serving it
                                from Azure.
  evals/      @fde/evals       repeat runs, severity buckets, baselines,
                                diffs, scorecards, the classifier verifier.
  schema/     @fde/schema      parse → shape-check → coherence rules, plus
                                validator/description verifiers.
  telemetry/  @fde/telemetry   per-request cost log and its DB sync.
  guard/      @fde/guard       the write-path guard and its self-test.
  foundry/    @fde/foundry     Azure AI Foundry client, Entra tokens.
  uikit/      @fde/uikit       the shared surface: controls, severity, motion,
                                tiles, the dialog that grows from a point, the
                                flow map, field lists, figure rows.
  pharma/     @meridian/pharma the second engagement's judgement + its estate.
  steering/   @vantis/steering the third engagement: the estate, the derived
                                database, the two tools, the assessment loop,
                                the fan-out that runs a whole 24-requirement bid
                                (`steering:assess-all` — serial, resumable,
                                `--run` opt-in) and a second, smaller agent that
                                summarises across finished assessments.
                                `docs/steering/` is its written record; STATE.md
                                is where it is, and NEXT.md §0 is the open
                                problem: 23 of 24 requirements price to nothing.
  surface/    @veresk/surface  THE SITE'S OWN SHARED PARTS, and NOT `@fde/*`:
                                the estate explorer, the wash behind a hero, the
                                hero entrance, the numbered step, the database
                                and pages drawings. It knows there is a firm
                                with several engagements, so it could never be
                                lifted into a customer's repo — which is the
                                whole reason it is not in `@fde/uikit`. It is
                                also the one package allowed Tailwind utility
                                classes, which costs each consumer an `@source`
                                line; see its `src/index.ts`.
apps/insurance-app/     @claims/insurance-app      TanStack Start (Vite, React 19): the page and
                                the /api/ask streaming route. Port 3000.
apps/veresk-app/        @veresk/app                TanStack Start. THE FIRM'S DOOR, and nothing
                                else — one page. The three engagement cards
                                are links to other ORIGINS, baked in at build
                                time by the pipeline. Port 3300,
                                `pnpm veresk:dev`.
apps/pharma-app/        @meridian/pharma-app       TanStack Start. Meridian Pharma's whole
                                surface: `/` the landing, `/desk`,
                                `/supplier`, `/data-flow` and the `/api/*`
                                routes. Split out of `veresk-app` on
                                2026-09-13 — the heavy dependencies were
                                always this surface's, they were just living
                                in an app that also served the firm's page.
                                Port 3301, `pnpm pharma:dev`.
apps/steering-app/      @vantis/steering-app       TanStack Start. Vantis Steering's whole
                                surface: `/` the landing, `/data-flow` where
                                the data goes, and `/desk` — one customer
                                requirement in, one assessed answer out, over
                                `/api/assess` (SSE), `/api/requirements`,
                                `/api/history` and `/api/summary` — the last
                                being "where the bid stands" across every
                                assessment filed, whose counts are GET and free
                                and whose two written paragraphs are POST and
                                cost a model call.
                                The desk landed on 2026-09-13 and brought the
                                `ssr.external` list with it; its absence used to
                                be the accurate statement and no longer is.
                                Port 3400, `pnpm steering:dev`.

                        ALL FOUR APPS DEPLOY FROM ONE WORKFLOW,
                        `.github/workflows/deploy.yml`, in a fixed order: both
                        engagements are built and deployed first, then the
                        firm's door, because it links to them and
                        `import.meta.env.VITE_*` is inlined at BUILD time. Read
                        `docs/SITE.md` before touching any of it.
docs/         examples/ (the 79-document corpus), evals/ (cases, fixtures,
              committed baselines), and the written record (PROGRESS.md,
              NEXT.md, CORPUS-PLAN.md, TEMPLATE.md). SITE.md is the one to read
              before touching the front end: three apps, two shared packages,
              which layer may use Tailwind utilities and why, the two colour
              scales, and the bugs that came out of the split.
infra/        docker-compose.langfuse.yml, DEPLOYMENT.md.
archive/      unmaintained hand-rolled predecessors of pillars 1 and 2, kept
              for diffing against when a framework surprises you — excluded
              from the build.
```

**Domain isolation is enforced, not just conventional.** `pnpm leak:check`
(`scripts/leak-check.mjs`) scans every executable line of `packages/*/src`
outside `@claims/insurance` and fails the build if insurance vocabulary leaks in.
Comments are exempt on purpose — the reasoning in those packages is often
*about* the domain boundary. The checker plants a synthetic leak and asserts
it catches its own plant, because it once passed clean while silently
stripping a real leaked credential URL (mistaking `postgresql://...` for a
trailing comment).

**The corpus and eval cases live in `docs/`, not in a package.** A customer's
documents aren't source code — `CORPUS_DIR` / `RECORDS_DIR` env vars point
elsewhere at a real engagement, and none of `docs/examples/` gets read.

### The answer contract

`packages/insurance/src/schema/coverage-schema.ts` — `CoverageAnswerSchema` (Zod,
`z.strictObject`). Fields: `answer`, `policy_id`, `policy_form`, `citations`,
`unverified_claims`, `conflicts`, `escalate`. Every field carries a
`.describe()` string that is prompt engineering, not documentation — that's
why `pnpm schema:check` fails if a field loses one.

Validation is two layers: JSON Schema checks *shape*; `coherenceErrors()`
checks *coherence* (structurally valid, still wrong) — most importantly, an
unresolved `conflicts` entry with no `escalate` is rejected, because that's
the model silently picking a side between two contradicting documents.

### The two tools

- `search_policy` — hybrid search over 12 policy wordings, chunked (form-id is
  an **exact** match, not a prefix — the corpus deliberately holds three
  revisions of the same base form, e.g. `PP 00 01 01 15` vs `PP 00 01 09 18`
  vs `PP 00 01 06 24`, and a prefix match answers a 2024 question out of a
  2015 wording without saying so). See
  `packages/insurance/src/config/form-id.ts`.
- `get_policyholder` — exact lookup by id (never searched) over 18
  policyholder records. A question with one exact answer is a lookup, not a
  search.

Search has **no score cutoff** — it returns top-k even when everything is
junk. Deciding "the answer isn't in the corpus" (e.g. rideshare coverage,
which appears in none of the 30 documents) is reading comprehension and
belongs to the model, not a similarity threshold.

### Engines

Pillar 2 (tool-calling loop) runs on the **OpenAI Agents SDK** by default, with
**Mastra** as an interchangeable second engine (`pnpm compliance:mastra`
mirrors `pnpm compliance:check` for it). Both are pinned neutral against the
hand-rolled predecessor archived at `archive/pillar-2-handrolled/`: 30/35 eval
runs, zero flaky, same as the fully hand-built system.

`pnpm compliance:check` is the pillar-2 correctness gate: it captures the
actual outgoing request and asserts `store: false`, no server-side
conversation state, and that the Agents SDK tracing exporter — which defaults
ON and ships to `api.openai.com` — stays disabled even with `OPENAI_API_KEY`
set.

### Evals

Pillar 4 runs on a **hand-written runner** (repeat count + serial execution on
purpose) feeding a **Langfuse (self-hosted)** dashboard for trace/run history —
Langfuse's own eval *runner* was rejected (50-way default concurrency, no
repeat-count parameter) but its *dashboard* is used. With no `LANGFUSE_*` env
vars set, `pnpm eval` runs exactly the same and just skips telemetry.

`eval:diff` **refuses** (exit 2) to compare two runs made with a different
model, fixture mode, or repeat count — comparing those would measure the setup
change, not the code change. A single flaky run out of five prints as `MOVED`,
never as a regression, and never fails CI.

Current baseline (2026-09-05, run 2): 7 cases × 5 runs, 30/35 runs, 6/7 cases
green, 0 flaky. Full table and per-case notes are in `README.md` and
`docs/evals/README.md` — don't re-derive it here, it drifts with every run.

## Working in this repo

- **Domain vocabulary belongs only in `packages/insurance`.** Before adding
  insurance-specific logic anywhere else, check whether it should instead be a
  parameter/descriptor passed into an `@fde/*` package — that's the whole
  point of the split (a second customer should be able to write a sibling of
  `packages/insurance` and change nothing above it).
- Always run `pnpm leak:check` after touching any `@fde/*` package.
- `packages/insurance/src/` is organized by pillar; when told to work on "pillar
  N," that directory mapping (see table in `README.md`) is the map.
- Corpus generation (`pnpm corpus`) produces deterministic, committed output —
  don't run it speculatively; only run it when intentionally changing the
  haystack.
- A red eval check is a hypothesis, not a verdict, and a green one is not
  proof — this repo's own history (§ "Every failure so far has been ours, not
  the model's" in `README.md`) is three separate cases where the check was
  wrong, not the model. Investigate before assuming the model regressed.
