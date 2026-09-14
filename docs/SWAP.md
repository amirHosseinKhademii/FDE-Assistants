# Swapping hand-written parts for packages

*Written 2026-09-11. **Nothing here is built yet.** This is the plan and the
order; each section says what is lost as well as what is gained.*

Companion: [`RUN.md`](../RUN.md) for the pillars as they run today,
[`NEXT.md`](ROADMAP.md) for work already in flight,
[`CORPUS-PLAN.md`](plans/CORPUS.md) for the corpus decisions this sits on top of.

---

## Where this stands — read this first if you are picking it up

**Last verified 2026-09-11: `pnpm eval` → 40/40, 8/8 cases green, 0 dangerous
failures.** Baseline in `docs/evals/results/`.

```
corpus        79 documents, 10 types, 555 chunks, all in Neon
              12 policy forms (3 editions of the base) + 67 guidance documents
retrieval     dense + Postgres full-text, fused by RRF
tools         get_policyholder · search_policy · search_guidance
engines       agents-sdk and mastra, both 5/5 on the cases measured
suite         8 cases x 5 runs, 13 checks, 2 of which read the tool trace
```

### Built this session, and what state each is in

| what | state |
|---|---|
| `documents` table + `document-source.ts` | **done, verified** — `corpus:check` proves the DB yields the same index as the folder |
| `record-source.ts` | **done** — records behind a seam, deliberately NOT the documents table |
| new corpus (67 guidance docs) | **done** — generated, deterministic, byte-identical on re-run |
| ISO-style form ids with editions | **done** — `PP 00 01 06 24`, spelling forgiven, identity exact |
| `search_guidance` + narrowed `search_policy` | **done, measured** — guidance no longer leaks through the coverage tool |
| hybrid search | **done, UNMEASURED on any answer** — see §1 |
| citation checking split | **done** — existence and form-identity are now different questions |
| tool-trace checks | **done** — `calls_record_first`, `calls_tool` |
| free-text policy id normalisation | **done, measured** — `cov-008` 3/5 → 5/5 |
| answer-completeness rule | **done, measured** — every governing number, not just the one asked for |

### What is NOT done, in priority order

1. **The total-loss tax case.** The only thing that would give hybrid search a
   number. Documents exist (`CIR-IL-2024-03` includes tax + title +
   registration; `CIR-NY-2024-02` includes tax but NOT title fee); no case
   exercises them. Designed in [`CORPUS-PLAN.md`](plans/CORPUS.md) §2.5.
2. **The other planted traps have no cases either** — superseded bulletin,
   stale determination and its control, endorsement absent from the
   declarations. The corpus is booby-trapped and the suite does not step on it.
3. **Customer traffic is not traced.** Only `pnpm eval` reaches Langfuse. See §2.
4. **Neon credential rotation.** A password was printed to a terminal on
   2026-09-11 before the redaction fix landed. The fix protects future runs, not
   that one.

### If you want SIMPLICITY over more features

The codebase is ~7,800 lines, of which **13 files are domain-specific** and the
rest transfers — see [`TEMPLATE.md`](TEMPLATE.md). The honest simplification
candidates, in order:

- **`fixtures.ts`** (132 lines) is applied to one tool and its own header says
  the idea did not work for search. It could go.
- **`evals/fixtures/embeddings.json`** is 3.7 MB serving only archived code.
- **Two loop engines** are twice the surface for one job. Keeping both is a
  deliberate trade (see `NEXT.md` A2) but a template for a customer probably
  ships one.
- **`diff.ts` + `history.ts`** (400 lines) do what Langfuse already does.

None of that is urgent, and none of it is what makes this repo work. **The
harness is the asset** — checks, severity buckets, tool-trace visibility. Cut
anything before cutting those.

---

## The rule this whole document follows

**Buy the transport. Write the judgment.**

A day of debugging on 2026-09-11 produced four real bugs, and every one was a
domain rule rather than a retrieval failure:

- a citation checker that scored 67 of 79 real documents as fabricated
- a form-id matcher that would have merged three editions paying $30, $35 and $40
- `search_policy` returning bulletins, circulars and superseded editions through
  the *coverage* tool, so the two-tool split was decorative
- a substring check that flagged three correct answers as dangerous

No package would have prevented any of them. A managed retrieval service would
have leaked exactly the same superseded documents, because it has no idea that
some of them are dead.

So the split is not "hand-written = bad". It is:

```
TRANSPORT   chunk, embed, store, rank, loop, trace, run the suite
            → somebody else's code, always

JUDGMENT    which filters, in what order, what the tool TELLS the model,
            and what counts as a failure
            → ours, always, and it is the deliverable
```

**Zod is out of scope** and stays exactly as it is. The answer contract is the
one place where hand-writing the shape IS the point.

---

## Where retired code goes

**`archive/<area>/`, not `src/<area>/deprecated/`.**

`packages/insurance/tsconfig.json` has `include: ['src']` and
`exclude: [..., 'archive', ...]`. Code left under `src/` is still typechecked
and still emitted into `dist` — so every future refactor has to keep the dead
code compiling. That is most of the cost of not deleting it, with none of the
benefit.

`archive/` already exists and already holds `pillar-1-handrolled/` and
`pillar-2-handrolled/` from the first two swaps this repo made. Extend that:

```
archive/
  pillar-1-handrolled/   the original store + embedder + cli   (existing)
  pillar-2-handrolled/   the original loop + engine            (existing)
  grounding/             whatever these swaps retire
  eval/
  tools/
```

**Every retired file keeps its header comment.** Those comments are why the code
looked the way it did, and they are the only reason to keep it at all — a file
with no explanation is just clutter with a git history.

---

## 1 · Hybrid search — BUILT 2026-09-11, and it did not do what I said it would

**Status: built, verified at the retrieval level, unproven at the answer level.**

`grounding/hybrid.ts` — dense vectors and Postgres full-text, fused by
Reciprocal Rank Fusion. `content_ts` is a GENERATED column so it cannot drift
from `content`; `pnpm ingest` creates it.

### It retrieves better. Measured:

```
Q: sales tax title registration fee total loss
  1. d1/s1   circular   CIR-NY-2024-02     ← both arms rank it first
  2. d3/s2   circular   CIR-IL-2024-03     ← the total-loss tax trap
```

`d`/`s` are the ranks each arm gave. Before, the keyword arm contributed
nothing at all.

### The bug that nearly shipped

The first version used `plainto_tsquery`, which **ANDs** every term — so it
demanded one document containing *rideshare* AND *livery* AND *hire* AND
*carrying* AND *passengers*. Nothing matched, ever.

**And it looked like it worked.** Fusion still returned results, carried
entirely by the dense arm, and `fullText` reported `true` because nothing threw.
A retrieval arm that silently matches nothing is worse than one that is absent.
Caught only by printing per-arm ranks and noticing every result said `s-`.

The query is now built by hand — sanitised to `[a-z0-9]`, joined with `|` —
which gives OR semantics and makes injection impossible by construction.

### And the claim it was built on was wrong

It was justified by a traced run where the model made ten searches hunting for
*"livery"* and *"for hire"* — keyword work that embeddings are bad at. The
prediction was that hybrid would cut the thrashing. It did not:

```
                     tool calls   avg in-tokens   search_guidance calls
original baseline       5–9          57,082            (not recorded)
after narrowing         6–11         85,488            1 of 5 runs
after hybrid            7–11         95,635            0 of 5 runs
```

**Worse on every axis.** The thrashing was never a retrieval problem. The model
was not failing to FIND guidance — it was never ASKING for it, because
`search_guidance` appeared nowhere in the ordered procedure in the system
prompt. Better retrieval cannot fix a tool the model does not reach for.

`coverage-prompt.ts` already recorded why: *"an unordered list is something a
model can satisfy in a way you did not intend."* The fix was a numbered step,
not a better index.

**The lesson worth keeping: measure the thing you changed, on a case that can
show it.** `cov-002` is routing-bound, so it could never have demonstrated
retrieval quality either way. The case that would is the total-loss tax case in
[`CORPUS-PLAN.md`](plans/CORPUS.md) §2.5, and it does not exist yet.

**Keep hybrid** — it is correct, it is cheap, and the retrieval evidence is
real. But it is currently a change with no measured effect on any answer.



---

## 2 · Langfuse — ALREADY DONE for evals; the gap is the OTHER path

**Corrected 2026-09-11.** This section originally said "installed, collecting,
barely read". That was wrong, and reading `eval/langfuse.ts` before writing the
plan would have caught it. The eval path is thoroughly instrumented:

- one trace per case run, with the question, the full answer and the metadata
- **one score per check**, not one per run — a run that fails
  `citations_resolve` and one that fails `answer_contains` are the same 0 at run
  level and completely different problems
- **severity as a CATEGORICAL score**, computed by `scorecard.ts` and merely
  reported, so the dashboard cannot drift from the printed card
- dataset items linked into a named run, so runs are comparable in the UI

That last pair is also why §4 is harder than it looks: severity is the field no
eval platform models natively.

### What is actually missing

**Only `pnpm eval` is traced. Customer traffic is not.**

```
pnpm eval    →  Langfuse trace + per-check scores + dataset run
pnpm ask     →  one line in logs/requests.jsonl
/api/ask     →  one line in logs/requests.jsonl
```

The request log carries turns, tokens, cost and latency — enough to bill, not
enough to debug. When an adjuster gets a wrong answer in the web app there is no
trace to open: no tool calls, no retrieved passages, no reasoning. Exactly the
material that found every bug on 2026-09-11, and it exists only for the traffic
that is already measured.

**The fix is small**, because the seam already exists: `startEvalTelemetry()` in
`eval/langfuse.ts` wraps a run in a span. Lifting the trace half out of `eval/`
and calling it from `coverage.ts` — where both the CLI and the HTTP route
already converge — instruments both surfaces at once. `surface` is already on
every request log line, so eval, ask and http stay separable.

**What it costs, and the line to hold:** claims questions contain policy ids,
coverage amounts and the model's reasoning. This file's own header already flags
that. Self-hosted Langfuse keeps it in your infrastructure; Langfuse Cloud does
not. Tracing customer traffic is a data-residency decision, not just a
convenience — and on an insurer engagement it is a conversation, not a config
flag.

**Also worth adding while in there:** `toolNames` now exists on the outcome
(added 2026-09-11, and it is what proved `search_guidance` was never being
called) but is not in the trace metadata. Two lines.


## 3 · Reranking — ADD, measurable only after §1

**Status: on the maybe list for weeks, still unmeasured.**

A cross-encoder re-scores the top ~50 candidates before the model sees 5.
`@huggingface/transformers` is already an optional dependency, so a local
cross-encoder adds no new vendor and no data egress. Cohere Rerank is the hosted
alternative and is better; it also sends your passages to a third party, which
is the wrong trade for claims data.

**What is lost:** latency. A local cross-encoder on 50 candidates is not free,
and p95 is already 50s on the full suite.

**Sequence:** do §1 first. "The reranker bought seven points" is only a sentence
you can say against a measured hybrid baseline.

---

## 4 · The eval harness — SWAP the runner, KEEP the checks

**Status: hand-written, ~400 lines across `run.ts` + `scorecard.ts`.**

**Recommended: promptfoo.** Config-driven, runs entirely locally, sends nothing
anywhere — which matters more here than a hosted UI does. Braintrust and
LangSmith are the commercial equivalents and both want your data.

What it takes over: parallel execution, repeat runs, the comparison view,
result storage.

**What must NOT move:** `checks.ts`. Every check that found a bug on 2026-09-11
is domain logic — `calls_record_first`, `citations_resolve`, the tool-name
trace — and each is ~20 lines you would write as a custom assertion in any
harness anyway.

**What is lost, and it is real:** `scorecard.ts` classifies failures by
*severity*, and the distinction between a dangerous false answer and annoying
over-caution is this repo's most useful idea. No harness ships that. It would
have to be re-expressed as custom assertion metadata, and if it cannot be, the
swap is not worth making.

**Retire to:** `archive/eval/`.

---

## 5 · Document ingest — ADD a real extractor

**Status: not needed yet, blocking the moment it is.**

The pipeline reads markdown. A real insurer's document store is mostly **scanned
PDF with tables**, and `loader.ts` says so in its own header. Nothing in this
repo can read one.

**Options:** Unstructured (open-source, self-hostable, no egress) or Azure
Document Intelligence (managed, better on tables, stays in-region on Azure).
Given portability and residency constraints, **Unstructured self-hosted** is the
safer default; Azure Document Intelligence if the customer is already an Azure
shop and their data never leaves their tenant.

**Where it plugs in:** `document-source.ts`, which is already the seam. A PDF
source implements the same interface; nothing downstream changes.

**What is lost:** nothing. This is capability the repo does not have.

---

## 6 · Vector store — SWAP only under pressure

**Status: pgvector, working, no reason to move.**

`store.ts` is already the one file that changes per engagement, and the
`VectorStore` interface means Qdrant, Azure AI Search or Elastic are an edit to
`openStore()` and nothing else.

**Do not move by default.** "Can we run Postgres" is never a blocker at an
insurer; "can we stand up a vector database" is a new infrastructure
conversation with a team that has not met you yet. Picking the thing that does
not need a meeting is an FDE skill.

**Move when:** the customer already runs Azure AI Search or Elastic, or the
corpus outgrows what pgvector indexes comfortably. Not before.

---

## 7 · Chunking — RECOMMEND AGAINST swapping

**Status: hand-written, and the one place hand-written is correct.**

LangChain.js ships `CharacterTextSplitter`, `RecursiveCharacterTextSplitter`,
`MarkdownTextSplitter`, `TokenTextSplitter`. **Not one attaches the heading trail
to the chunk as metadata** — the Python `MarkdownHeaderTextSplitter` has no JS
equivalent.

That is not cosmetic. A retrieved fragment reading *"we will pay $40 per day"* is
worthless without *"PP 00 01 06 24 > Part IV > 4.4"*, because twelve forms
contain that sentence with different numbers. Without the trail there is nothing
to cite and `citations_resolve` has nothing to resolve. `MarkdownTextSplitter`
would also happily cut a limits table from its header row.

**If a PDF extractor lands (§5)**, revisit: layout-aware extractors emit
structure that could feed a different chunker. Until then, this stays.

---

## 8 · Agent loop — NOTHING TO DO

Two implementations already exist behind one contract — `@openai/agents` and
`@mastra/core`, chosen with `LOOP=sdk|mastra`. Both measured on 2026-09-11 at
5/5 on `cov-001` and `cov-008`. Adding LangGraph would be a third way to do a
solved job.

---

## Order, and why

```
✓  hybrid search     BUILT 2026-09-11 — correct, cheap, and so far unmeasured
                     on any ANSWER. cov-002 could never have shown it.
✓  langfuse (eval)   was already done before this plan was written
◐  langfuse (ask)    customer traffic is NOT traced — a data-residency call
1  total-loss case   the case that would finally measure hybrid. §2.5 of
                     CORPUS-PLAN.md, still unwritten
2  reranker          only after §1 above gives hybrid a number
3  eval harness      only against a stable baseline, and only if severity
                     survives the move
4  pdf ingest        when a real corpus arrives, not before
—  vector store      only under customer pressure
—  chunker           not at all
—  agent loop        done
—  zod               out of scope, by design
```

**The order changed once it met evidence.** Hybrid search was built and turned
out to be the wrong instrument for the case it was justified by; Langfuse turned
out to be already done. What moved to the top instead is a *case* — because two
of the changes made today (hybrid search, and the narrowing of `search_policy`)
are currently unmeasurable against anything in the suite.

That is the real lesson of the first pass: **the bottleneck was never the
packages, it was having a case that could tell whether a change helped.**

---

## The check that must survive all of this

`pnpm eval` has to stay **runnable offline and free of vendor lock**. Every swap
above is reversible; a suite that can only run against a hosted service is not.
If a swap makes the eval suite depend on a network call to score a result, that
swap is wrong regardless of what else it buys.
