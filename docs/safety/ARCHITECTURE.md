# Where code goes, and why not elsewhere

*The map for `@calder/safety`. Written at stage 3.1, when one file existed, so
the shape was agreed before there was anything to argue about.*

---

## The two-line version

```
apps/ai/safety/        the judgement — what makes THIS engagement different
apps/web/safety-app/   the surface — pages and routes  (the other session)
packages/@fde/*        borrowed unchanged. Nothing new is added here.
```

**The claim being tested:** a fourth engagement can be built from the seven
`@fde/*` packages that already exist. `PLAN.md` §9.6 makes it a rule — **every
time we reach for a new shared package, that is a finding and it gets written
down**, not quietly satisfied.

---

## Inside `apps/ai/safety/src/`

The folders are the pipeline. `grounding/` holds one file per stage of
[`INGESTION.md`](INGESTION.md), in the order they run:

```
src/
  config/         connections, ids, paths — the only place a URL is named
  grounding/      THE PIPELINE, one file per stage
    parse.ts        3.1  TSV  → documents.json          ← built
    chunk.ts        3.2  documents → passages
    embeddings.factory.ts
                    3.3  which embedder, local or hosted
    index-cli.ts    3.4  passages → Postgres
    search.ts       3.5  the two arms
                    3.6  fusion lives in @fde/grounding
  tools/          the two exact tools: get_recall, recalls_for_vehicle
  agent/          the loop and its prompt
  schema/         the answer contract and its coherence rules
  eval/           the cases from WALKTHROUGH.md, and the runner
  cli/            one entry point per verb
```

**Why `grounding/` and not `ingest/`.** Insurance and steering both call it
`grounding/`, and a reader who knows one engagement should not have to relearn
the layout for the next. That is the same argument as the `PLAN.md` / `NEXT.md`
naming rules in `docs/README.md`.

**Stage 3.6 has no file.** Reciprocal rank fusion is in `@fde/grounding` and is
domain-neutral. If we ever write one here, that is the `PLAN.md` §9.6 finding.

---

## The guardrails

### 1 · Domain words stay in this package

`pnpm leak:check` fails the build if `recall`, `complaint`, `VIN` or
`campaign` appear in executable lines under `packages/*/src` outside an
engagement. Not convention — enforced.

> Before adding safety-specific logic to an `@fde/*` package, check whether it
> should be a **parameter** passed in. That is the whole point of the split.

### 2 · Parse records with quoting OFF

```ts
line.split('\t')        // yes
csv.reader(f)           // NO — merges records at unbalanced quotes
```

708 lines carry an odd `"`. `CORPUS.md` §3 is what this cost once already.

### 3 · Every count about a file gets a no-parser check beside it

```bash
awk -F'\t' '{c[NF]++} END {for (n in c) print n, c[n]}'
```

**A parser confirming its own output proves nothing.** Any figure describing the
shape of a file must be reproducible by a tool with no parser in the path,
before it is written down as a finding.

### 4 · `EMBEDDINGS=local` is a data decision here, not a cost one

The narratives are real people's words about crashes, fires and 53 deaths.
Embedding touches every passage. Local means they never leave the machine, and
`FREE.md` §8c measured that it costs nothing in accuracy — 0.813 either way.

**This engagement should fail loudly rather than silently embed this corpus
through a third party.**

### 5 · The answer contract may never assert that a remedy failed

A regulatory conclusion carries legal weight. The tension is expressed as a
`conflicts` entry with two **dated** positions and a mandatory `escalate`; the
coherence rule rejects a conflict with no escalation, so the model *structurally
cannot* resolve it. `WALKTHROUGH.md` decision 5.

### 6 · The answer key came first, and does not get edited to match the system

`WALKTHROUGH.md` was written by hand before retrieval existed. When the
assistant disagrees with it, **one of the two is wrong and it is an open
question which** — the key is not adjusted to make a run go green.

### 7 · Truncated VINs stay truncated

NHTSA publishes 11 of 17 characters as de-identification. Nothing here joins on
them, completes them, or treats them as a vehicle identifier.

---

## What the repo's own rules already give us

| | |
|---|---|
| `pnpm leak:check` | guardrail 1, enforced |
| `EMBEDDINGS=local` | `@fde/grounding`'s existing switch |
| `LLM_PROVIDER` | four values, and `loopChoice(body?.loop)` — never `?? 'sdk'` |
| `eval:diff` | refuses to compare runs made with different models |
| `EVAL_PACE_MS` | 6s on `hosted`, because a free tier is a queue |

**None of that is new work.** It is the list of things this engagement inherits
by being built where it is.

---

## Build order, and what "done" means at each stage

Each stage ends with something checkable by hand, and **no stage starts before
the one above it is verifiable**.

| | stage | done when |
|---|---|---|
| 3.1 | parse | 70,194 documents, ragged 0, count matches `awk` |
| 3.2 | chunk | 114 investigations chunked, 73,220 untouched |
| 3.3 | embed | 384 dims, local, batched |
| 3.4 | index | rows in Postgres, one dimension group |
| 3.5 | retrieve | both arms return, independently |
| 3.6 | fuse | RRF, arithmetic matching the formula on the page |
| 3.6b | rerank | a delta against 3.7a, not a default |
| 3.7 | measure | recall@6 against `WALKTHROUGH.md`, twice |
| 4 | tools | five tools, then recall@6 re-measured THROUGH them — [`STAGE4.md`](STAGE4.md) |
| 5 | contract | the schema, and coherence rejecting an unescalated conflict — [`STAGE5.md`](STAGE5.md) |
| 6 | loop | `LOOP=mastra`, `LLM_PROVIDER=hosted` |
| 7 | evals | severity buckets separating wrong answers from quota failures |
| 8 | page | a fourth surface, once there is something measured to show |

**Stages 4 and 5 were one stage until 2026-09-17.** Splitting them is not
cosmetic: a tool is a question you can ask the data, a contract is a shape an
answer must arrive in, and **neither needs the other to be testable**. Bundled,
stage 4 became the longest thing in this folder and the contract read as an
afterthought to five tools.
