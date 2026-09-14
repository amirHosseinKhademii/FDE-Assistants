# Using this repo as a skeleton

What transfers to another domain, what you must rewrite, and what you should not
copy at all.

**The repo is eight packages**: seven domain-neutral, one that is the actual
job. You rewrite one of them.

```
@fde/grounding   documents → chunks → vectors → hybrid search
@fde/agent       the loop, two engines, registry, fixtures, compliance checks
@fde/evals       repeat runs, severity buckets, baselines, diffs
@fde/schema      parse → shape → coherence
@fde/telemetry   one durable line per request
@fde/foundry     Azure credentials, no stored key
@fde/guard       fail-closed API auth
─────────────────────────────────────────────────────────────
@claims/insurance   the corpus, the tools, the prompt, the answer fields,
                 the coherence rules, the severity classifier, the cases
```

**3,495 domain-neutral lines across seven packages, against 1,603 of judgment
in one.** Counting code only — comments excluded, since this repo has a lot of
them on purpose. Roughly **two thirds transfers, one third is yours to write.**

Two commands keep that honest, neither of which can drift the way prose can:

```bash
pnpm leak:check                          # fails the build on domain words in @fde/*
grep -rln "DOMAIN:" packages/insurance/src/ # every seam, named — 7 files of 27
```

`leak:check` scans executable lines only; comments are exempt, because the
reasoning in these packages is largely *about* the domain boundary. It carries
its own negative control, and it needs one: its first version reported PASS
while `@fde/grounding` still defaulted to a connection string naming this
customer, because the scanner had truncated the URL at `postgresql://`.

---

## What you get for free

Seven packages, none of which imports your application or contains a word of
your vocabulary. Verified, not asserted — see the grep above.

| package | what it does | the hard-won bit inside it |
|---|---|---|
| `@fde/grounding` | read documents from anywhere, chunk with a heading trail, embed, store whole documents AND chunks, hybrid search | **the index in an embeddings response is authoritative** — trusting arrival order attaches every vector to the wrong passage, silently |
| `@fde/agent` | the loop behind one contract, two engines, tool registry, fixtures | schema failures go BACK to the model, never silently repaired — the failure rate is a number you need |
| `@fde/evals` | repeat runs, per-case aggregation, severity buckets, baselines, diffs | a filtered run must not write a baseline; a check that reads the TOOL TRACE catches what an answer cannot |
| `@fde/schema` | parse → shape → coherence | coherence rules are not Zod refinements, because the MESSAGE is what the model retries against |
| `@fde/telemetry` | one durable line per request | a broken log must never break a request |
| `@fde/foundry` | Azure credentials | no stored API key anywhere, ever |
| `@fde/guard` | fail-closed API auth | **the obvious implementation fails open** |

Also free, and the reason the swaps above are safe:

| command | proves |
|---|---|
| `corpus:check` | a source swap changed nothing — fingerprints content AND metadata |
| `compliance:check` | what your agent framework actually puts on the wire |
| `severity:check` | every check maps to a bucket, and the fall-through still fires |
| `guard:check` | every denial branch denies |
| `leak:check` | no reusable package names your customer's business |
| `schema:check` | your answer contract accepts and rejects what you intended |

Each has a **negative control**. A check that cannot fail is decoration.

## What you must rewrite

| File | Why it cannot transfer |
|---|---|
| `packages/insurance/src/config/domain.ts` | every noun: corpus dir, records dir, table, id patterns, labels |
| `packages/grounding/src/chunker.ts` | the heading-trail and table rules encode what YOUR documents are |
| `packages/insurance/src/config/form-id.ts` | your document identifier, and the exact-match rule |
| `packages/insurance/src/tools/get-policyholder.tool.ts` | your exact-lookup entity |
| `packages/insurance/src/tools/search-policy.tool.ts` | your filter key and the tool descriptions the model reads |
| `packages/insurance/src/tools/coverage-prompt.ts` | your business procedure. Nothing here transfers |
| `packages/insurance/src/schema/coverage-schema.ts` | your answer's fields, and your coherence rules |
| `packages/insurance/src/tools/search-guidance.tool.ts` | your second corpus, if you have one. The conduct/coverage split is insurance; the SHAPE — a second tool gated on metadata — transfers |
| `packages/insurance/src/eval/checks.ts` | the domain checks. The generic ones stay |
| `docs/evals/cases.jsonl`, `docs/examples/` | your corpus and your test cases |

---

## The part you cannot copy, and must not skip

**The eval cases.** They encode what "dangerous" means in your domain, and no
template can guess that. Ours says a citation that resolves to nothing is
dangerous and an unnecessary escalation is merely annoying. Yours might invert
that.

Write them from real failures, not imagination — every bug you find from here
on becomes a case first and a fix second. And write the CONTROL for each one:
`cov-007` exists only because a bad fix to `cov-001` would pass `cov-001`.

---

## The order that works

1. **Corpus first, and make it messy.** Plant the contradictions your real data
   has. A tidy corpus means you skipped the job, and every mechanism below
   exists to survive a specific flaw. Give every document its METADATA — which
   edition, which jurisdiction, effective when, superseded by what — because
   precedence lives there and no amount of reading prose recovers it.
2. **`packages/insurance/src/config/domain.ts`**, then the chunker rules. Verify
   with `pnpm chunks` at hostile budgets — free, offline, and it tells you
   whether your splitting rules ever execute.
3. **The two seams** — `document-source.ts` and `record-source.ts` — before any
   tool reads a file directly. Retrofitting them means touching every caller.
4. **The tools.** One exact lookup, one search per corpus. If a question has one
   right answer, it is a lookup, not a search.
5. **The schema before the loop.** It is the API contract: the prompt describes
   it, the loop validates against it, every check reads a field by name.
6. **The prompt as an ordered procedure**, not a set of guidelines. A model will
   satisfy an unordered list in a way you did not intend — and describing a tool
   in prose NEXT TO a numbered list is the same mistake. If the model must call
   it, it is a numbered step.
7. **The harness before the tuning** — see below. Checks, severity buckets,
   tool-trace visibility.
8. **Eight cases, five runs each**, each with its control. Then measure before
   you tune anything.

---

## The two seams that decide whether this transfers at all

Everything else is detail. These two are the difference between a demo and
something you can point at a customer.

```
DOCUMENTS                              RECORDS
document-source.ts                     record-source.ts
searched by MEANING                    fetched by EXACT KEY
no single lookup key                   one right answer per question
a document management system           a policy admin system
  FileNet, SharePoint, Documentum        Guidewire PolicyCenter, a mainframe,
  Guidewire ContentManagement            a SQL database
→ documents table → chunks → vectors   → one row, handed over whole
```

**They must not become one thing.** Once a `documents` table exists it is an
afternoon's work to put records in it too, and that quietly destroys the
distinction everything rests on: "what is Maria's deductible" has one exact
answer, and similarity search is the wrong instrument for a question with one
exact answer. It fails silently and plausibly, which is the worst failure shape
there is.

Both are interfaces with two implementations — a committed fixture here, a
customer system there. **That is the whole portability story.** Landing at a
customer means writing two adapters, not rewriting a pipeline.

---

## Build the harness BEFORE the tools

The single most useful thing learned from a full day of debugging on
2026-09-11: **every bug found was caught by a check, and every check was bolted
on after the fact.** Four real defects, all domain logic, none of them a
retrieval failure:

| what broke | what caught it |
|---|---|
| citation checker scored 67 of 79 real documents as fabricated | running the checker over known-good citations |
| the coverage tool returned guidance and superseded documents | `--trace`, reading TOOL NAMES not counts |
| a substring check flagged correct answers as dangerous | reading the failing answers instead of the score |
| the model skipped a required lookup | a check that reads the tool trace |

Three of those four were the SAME mistake in different clothes: **being strict
about format in a check whose job is truth.** A checker that calls correct work
a fabrication is worse than no checker, because it poisons the metric you are
steering by.

So, on the next engagement, write these first — they are generic and they
transfer unchanged:

1. **`citations_resolve`** — does every cited source name something real. Be
   lenient about spelling, strict about identity.
2. **A check that reads the TOOL TRACE**, not just the answer. "Did it look up
   the record before searching" cannot be asked of a final answer, and a run
   that skipped the lookup and got lucky looks identical to a good one.
3. **Severity buckets** — a wrong figure an adjuster repeats and an unnecessary
   escalation are not the same failure, and averaging them into one score hides
   the only one that matters.
4. **A negative control in every self-test.** Three matching numbers prove
   nothing unless a mismatch would show up.

---

## Two habits that cost the most time

**Do not conclude from n=2.** Two wrong conclusions were drawn in one sitting —
"this engine is cheaper and worse" (ten runs said neither) and "better retrieval
will fix this" (it was routing). `--repeat` exists for this, and running it is
not the same as believing it.

**Measure the thing you changed, on a case that can show it.** Hybrid search was
justified by a case that was routing-bound, so it could never have demonstrated
retrieval quality either way. The bottleneck is almost never the packages — it
is having a case that can tell whether a change helped.

---

## Things not to change without reading why

Each of these has a comment above it explaining what broke when it was done the
obvious way:

- **exact id matching, never a prefix** — `form-id.ts`
- **no minimum similarity score** — `search-policy.tool.ts`
- **filter before ranking, never after** — same file
- **sorting embedding results by `index`** — `embeddings.ts`
- **wipe the table before re-ingest** — `ingest.ts`
- **`store: false` and tracing off** — `loop-sdk.ts`, asserted by `compliance:check`
- **schema failures returned to the model, never silently repaired** — `loop.types.ts`
- **severity buckets, never averaged into one number** — `scorecard.ts`
- **negative controls in every self-test** — a check that cannot fail proves nothing
- **leniency belongs in the CHECKER, strictness in the FILTER** — `form-id.ts`
  forgives how an id is spelled and is exact about which id it is. The same
  regex doing both jobs, made lenient for the harmless one, is dangerous in the
  other
- **a missing-data report is a claim about your PARSER** at least as much as
  about the source — `document-source.ts`. It is seductive because it confirms
  what you already believe about messy enterprise data
- **record tool NAMES, not just counts** — `run.ts`. A count cannot tell "reached
  the right corpus" from "hammered the wrong one ten times" 

---

## Renaming checklist

- the two domain-named folders — `packages/insurance/` and
  `apps/insurance-app/` — plus the workspace globs in `pnpm-workspace.yaml` and
  the `outputs` paths in `turbo.json`. The folder carries the domain on purpose:
  a sibling engagement adds `packages/<theirs>/` next to it rather than
  overwriting a folder called `domain`
- `packages/insurance/package.json` name and description
- `packages/insurance/src/config/domain.ts` — all of it
- `infra/docker-compose.langfuse.yml` — the Langfuse project/org are created in
  its UI, not in the file; make a new project so runs do not land in another
  app's dashboard
- `.env.example` — endpoints, deployment names, `EMBEDDINGS`, `DATABASE_URL`
- `scripts/leak-check.mjs` — the `BANNED` word list. One line, and it is the
  only thing standing between you and a package that quietly learns your
  customer's vocabulary. You do **not** need to touch `REUSABLE_PREFIX`: the
  scan keys off the `@fde/` package name, not the folder, so renaming
  `@claims/insurance` here cannot accidentally point the scanner at the one package
  that is supposed to be full of domain words
- `GUIDE.md`, `RUN.md`, `PROGRESS.md` — keep the structure, replace the story.
  The engineering log is worth starting on day one; it is the only artifact that
  explains why the code looks like this
