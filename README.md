# Grounded assistants for regulated work

Three production-shaped assistants for three customers, built on one shared
platform. Each answers a narrow, high-stakes question from the customer's own
documents and databases — with citations, with an explicit refusal when the
answer is not there, and with a written record of every tool it called.

The interesting constraint is that **none of them may guess.** A coverage
answer that sounds right and cites nothing, a batch released on a procedure
that was superseded, a bid priced from two comparable jobs instead of twenty —
each is worse than "I don't know", and all three are what a language model does
by default. Most of the engineering here is about making that failure visible
instead of fluent.

## The three

| | Customer | The question | Grounded in | Surface |
|---|---|---|---|---|
| **Claims** | Meridian Mutual, a mid-size insurer | *Is this claim covered, and under which form?* | 97 policy documents and policyholder records | `:3200` |
| **Pharma** | Meridian Pharma | *Can this batch be released, and what does this supplier change affect?* | 6 source-system databases + controlled SOPs | `:3301` |
| **Steering** | Vantis Steering, an automotive tier-1 | *What should this requirement cost, from what we have actually done before?* | 4 databases + a 1,069-file engineering corpus | `:3400` |

`:3300` is the firm's own page, which links to the other three.

Each is a separate deployment with its own origin, its own database estate and
its own evaluation suite. They share the platform beneath them and nothing else.

### What the three have in common

- **A tool is the only way to a fact.** The model never sees the database; it
  calls a typed tool and gets rows back. Every call is recorded with its
  arguments, its timing, and whether it ran live or replayed a fixture.
- **The answer is a contract, not prose.** A strict JSON schema, checked twice:
  once for *shape*, then again for *coherence* — the rules a type system cannot
  express. The load-bearing one is that an unresolved conflict with no
  escalation is rejected, because that is the model quietly picking a side
  between two documents that disagree.
- **Refusal is a first-class outcome.** Retrieval has no score cutoff: it
  returns its best matches even when all of them are junk, and deciding "this
  isn't in the corpus" is left to the model, where it belongs. Steering's
  pricing tool will not take a median of two jobs, and says so.
- **Every claim is measured.** 47 offline self-tests, each carrying a negative
  control that plants a failure and requires the check to catch it. A check
  that has only ever passed is indistinguishable from one that cannot fail.

## Architecture

**One rule: buy the transport, write the judgment.**

```
packages/            what lifts into any customer's repo unchanged
  agent/             the tool-calling loop — three interchangeable engines
  grounding/         load → chunk → embed → store → hybrid search
  evals/             repeat runs, severity buckets, baselines, diffs
  schema/            parse → shape-check → coherence rules
  providers/         foundry (Azure) · bedrock (AWS) — two adapters, see below
  telemetry/  guard/  scanner/  estate/  uikit/

apps/ai/             one per customer — transfers to nobody
  insurance/  pharma/  steering/
                     the corpus, the tools, the prompts, the answer schema,
                     the severity rules, the eval cases. This is the job.

apps/web/            one deployable surface per customer
  insurance-app/  pharma-app/  steering-app/  veresk-app/
```

`pnpm leak:check` enforces the boundary rather than trusting it: it scans every
`@fde/*` package for customer vocabulary and fails the build if any leaks in. It
plants a synthetic leak on every run and asserts it catches its own plant,
because it once passed clean while silently dropping a real leaked credential.

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) is the full picture — the
dependency graph, every package in its own words, and what was deliberately
*not* shared.

### Two switches

```
LOOP=sdk|mastra|langgraph        which agent engine drives the loop
LLM_PROVIDER=azure|bedrock       which cloud serves the model
```

Three engines behind one contract, because one implementation cannot test the
claim that the engine is replaceable and two can. They are structurally
identical — `provider.ts`, `tools.ts`, `turns.ts`, `loop.ts` — so a diff between
them means something.

Two clouds, reached three different ways, and they do not share an AWS API: the
hand-written adapter speaks Anthropic's Messages API, while the Mastra and
LangGraph providers both speak Converse. Keeping all three is what lets the repo
answer what writing the translation yourself actually buys.
[`docs/ENGINES.md`](docs/ENGINES.md) has the engine × cloud matrix, including
the one deliberate hole: the Agents SDK engine **refuses** `bedrock` rather than
silently serving from Azure.

## Tech

| | |
|---|---|
| Language / runtime | TypeScript 5.9, Node 22, pnpm 9 + Turborepo |
| Agent frameworks | OpenAI Agents SDK 0.17 · Mastra 1.66 · LangGraph 1.4 |
| Model providers | Azure AI Foundry (Entra, no stored key) · Amazon Bedrock |
| Retrieval | Postgres + pgvector, dense + full-text fused by RRF |
| Schema | Zod 4 — one schema for tool arguments *and* answer shape |
| Web | TanStack Start, React 19, Vite 8, SSE streaming |
| Observability | per-request cost log in Postgres, Langfuse dashboard |
| Deploy | three Docker images, one GitHub Actions workflow |

## Run it

Everything below is offline — no cloud account, no database, no cost.

```bash
pnpm install
pnpm typecheck                # every package
pnpm leak:check               # no customer vocabulary in the shared packages
pnpm provider:check           # LLM_PROVIDER routes where it claims, all 3 engines
pnpm settle:check             # when a loop stops, and what a schema failure costs
pnpm scanner:check  pnpm estate:check  pnpm bedrock:check
pnpm compliance:check         # store:false and tracing-off, asserted on the wire
```

To bring up a surface:

```bash
pnpm dev            # claims        :3200
pnpm pharma:dev     # pharma        :3301
pnpm steering:dev   # steering      :3400
pnpm veresk:dev     # the firm      :3300
```

Live answers need Postgres and a model provider:

```bash
docker run -d --name claims-pgvector \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres \
  -p 5433:5432 pgvector/pgvector:pg17

cp .env.example .env          # then fill it in
az login
pnpm --filter @claims/insurance ingest    # build the vector index
pnpm ask                                 # one question through the full loop
pnpm eval                                # the suite, 5 runs per case
```

Per-customer commands live in each engagement's own docs; `pnpm run` lists them
all.

## On the data

**Every document and every row in this repository is synthetic.** Meridian
Mutual, Meridian Pharma and Vantis Steering do not exist. The SOPs are written
to read like controlled documents and are not ones — they carry a `FABRICATED`
banner for that reason, and it stays in the text rather than in a wrapper.

The corpora are deliberately messy, because a clean corpus tests nothing. The
claims corpus alone holds three revisions of the same base policy form, a
superseded bulletin, a stale determination with a control beside it, and an
endorsement missing from the declarations. The eval suites exist to step on
those traps on purpose.

At a real engagement none of it is read: `CORPUS_DIR` and `RECORDS_DIR` point
somewhere else entirely. A customer's documents are not source code.

## How it is verified

```
pnpm typecheck        31 packages
pnpm build            all packages and apps
47 check scripts      each with a negative control
pnpm eval             the graded suite — costs money, needs a provider
```

The self-tests are the spec. `compliance:check` captures the real outgoing HTTP
request and asserts `store: false` and that the Agents SDK's tracing exporter —
which defaults **on**, shipping tool arguments and results to a third party —
stays disabled. Both were found by reading the SDK's source rather than its
docs, and both are opt-out. The transferable rule: adopt the framework, then pin
the compliance-critical behaviour with a test. Do not trust a default, do not
trust the docs, assert it on the wire.

### Every failure so far has been ours, not the model's

Three separate times a red check turned out to be a wrong check rather than a
regression — and the reverse is worse. A green check is not proof:
`pharma`'s write-path guard printed *"all 4 plants caught"* for months while
being blind to any write on a line that also held a URL, because every plant
tested the pattern and none went through the comment-stripper in front of it.
A control that exercises half the pipeline tells you about half the pipeline.

## Where to read more

- [`docs/README.md`](docs/README.md) — the index, and the naming rules
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — packages, dependencies, boundaries
- [`docs/ENGINES.md`](docs/ENGINES.md) — the two switches, engine × cloud
- [`docs/TEMPLATE.md`](docs/TEMPLATE.md) — what transfers to a new domain
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — the dated engineering log
- [`infra/DEPLOYMENT.md`](infra/DEPLOYMENT.md) — how it runs for a customer
