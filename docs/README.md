# The documentation — what to read, and when

*Index rebuilt 2026-09-14, when the docs were renamed for consistency. If you add
a document, add a line here and follow the naming rules at the bottom.*

There are **three built engagements** in this repo, one **partly built**
(`commerce/`), one **planned** (`safety/`), and a shared toolkit underneath them
all.
Most confusion here has come from **not knowing which scope a document is
about**, so that is how this index is organised.

---

## Start here

| | |
|---|---|
| [`GUIDE.md`](GUIDE.md) | The full narrative — what an FDE is, the pillars, framework vs hand-rolled. **Start here if you are coming to this cold.** |
| [`../CLAUDE.md`](../CLAUDE.md) | The orientation file: commands, architecture, the rules that govern working in this repo. |
| [`RUN.md`](RUN.md) | The pillars already walked, end to end. |
| [`PROGRESS.md`](PROGRESS.md) | The dated engineering log. Long, and the most reliable record of *why* something is the way it is. |
| [`ROADMAP.md`](ROADMAP.md) | What is planned next, repo-wide. *(Was `NEXT.md` — renamed because three files had that name.)* |

## How the AI actually works — read in this order

The RAG pipeline, split by the three letters. Each is self-contained; together
they cover one question from a file on disk to a validated answer.

| | |
|---|---|
| [`RETRIEVAL.md`](RETRIEVAL.md) | **R** — parse, chunk, embed, index, retrieve, fuse. Ends with a from-scratch appendix on vector databases and vector search. |
| [`AUGMENTED-GENERATION.md`](AUGMENTED-GENERATION.md) | **A and G** — what is assembled into the context window, and what the answer contract forces back out. |
| [`rag/`](rag/) | **Five patterns for when the pipeline above is not enough** — hybrid, corrective, agentic, graph, multimodal. One file each, plus [`README.md`](rag/README.md). Two are built here and measured; three are read out of other people's papers and say so, because every claim carries MEASURED HERE / CITED / PROPOSED. |
| [`beyond-retrieval/`](beyond-retrieval/) | **Six things that are NOT retrieval** — context engineering, prompt injection, credentials and the trust boundary, [**MCP**](beyond-retrieval/MCP.md), multi-agent orchestration, LoRA fine-tuning. One file each, plus [`README.md`](beyond-retrieval/README.md). Starts where `rag/` stops: four are built here and measured, and two are not built — `MCP.md` reads its protocol claims off the SDK in `node_modules` and names the file for each, `FINETUNING.md` is cited. |
| [`ENGINES.md`](ENGINES.md) | The two switches: `LOOP=sdk\|mastra\|langgraph` and `LLM_PROVIDER=azure\|bedrock`, and the engine × cloud matrix. |
| [`BEDROCK.md`](BEDROCK.md) | The AWS estate, the translation nobody else writes, and the quota defect blocking it. |
| [`FREE.md`](FREE.md) | **Running the whole thing for nothing**, after the Foundry model was deleted for cost. §0 is the whole measurement in one table: local inference tried on two GPUs and rejected, a free hosted tier that works. Also the disk trap, the cost log that priced a free run, Neon's idle hang, and what the deployed apps still need. |

## How the repo is put together

| | |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Every package, what it does, and the dependency graph. The layering rule and what enforces it. |
| [`SITE.md`](SITE.md) | The web surface — the apps, the two shared UI packages, which layer may use Tailwind utilities. |
| [`TEMPLATE.md`](TEMPLATE.md) | Using this repo as a skeleton for a new domain: what transfers and what does not. |
| [`SWAP.md`](SWAP.md) | Where a hand-written part was replaced by a package, and what that cost. |
| [`plans/REFACTOR.md`](plans/REFACTOR.md) | The measurement that decided what became a shared package — **and what deliberately did not.** |
| [`PATTERN-DATABASE-UI.md`](PATTERN-DATABASE-UI.md) | Showing a database on a page, as a reusable pattern. |
| [`SECURITY-REVIEW.md`](SECURITY-REVIEW.md) | What a scan of the whole repo and its git history found, what was fixed, and the one exposure that is accepted rather than fixed. Dated — re-run it, don't trust it. |

## The three built engagements

Each engagement owns a folder. **The same three filenames mean the same thing in
every folder**, which is the point of the renaming. The two planned ones
(`commerce/`, `safety/`) follow the same rules and are listed after this table:

| | insurance | [`pharma/`](pharma/) | [`steering/`](steering/) |
|---|---|---|---|
| **what it is & why** | — | [`PLAN.md`](pharma/PLAN.md) | [`PLAN.md`](steering/PLAN.md) |
| **what is open now** | [`ROADMAP.md`](ROADMAP.md) | [`NEXT.md`](pharma/NEXT.md) | [`NEXT.md`](steering/NEXT.md) |
| **plain-language tour** | — | [`WALKTHROUGH.md`](pharma/WALKTHROUGH.md) | [`WALKTHROUGH.md`](steering/WALKTHROUGH.md) |
| **where code goes** | [`ARCHITECTURE.md`](ARCHITECTURE.md) | [`ARCHITECTURE.md`](pharma/ARCHITECTURE.md) | — |
| **eval cases** | [`evals/`](evals/) | [`evals/`](pharma/evals/) | [`evals/`](steering/evals/) |

Insurance has no folder of its own because it *is* the repo's worked example —
its documents sit at the top level.

### pharma — the rest

[`DESIGN.md`](pharma/DESIGN.md) the surface's design language ·
[`EXTRACTION.md`](pharma/EXTRACTION.md) which code should stop living in the
package, and which duplication is deliberate ·
[`BOTTLENECK-2.md`](pharma/BOTTLENECK-2.md) what to point it at next ·
[`CORPUS.md`](pharma/CORPUS.md) **the corpus is fabricated — read this before
quoting any of it.** (It lives beside `corpus/`, never inside it — see the rule
below.)

### steering — the rest

Steering documents everything **twice on purpose**: a plain-language version and
an engineering version. That pairing is deliberate, not duplication.

| Plain language | Engineering |
|---|---|
| [`HOW-WE-SORTED-IT.md`](steering/HOW-WE-SORTED-IT.md) | [`SORTING.md`](steering/SORTING.md) |
| [`WALKTHROUGH.md`](steering/WALKTHROUGH.md) — the answer key, worked by hand | [`GROUNDING-WALKTHROUGH.md`](steering/GROUNDING-WALKTHROUGH.md) — file by file |
| [`THE-TOOLS.md`](steering/THE-TOOLS.md) · [`THE-SUMMARY.md`](steering/THE-SUMMARY.md) · [`WHAT-WE-ASK-THE-MODEL.md`](steering/WHAT-WE-ASK-THE-MODEL.md) | [`CONCEPTS.md`](steering/CONCEPTS.md) · [`CONTROLS.md`](steering/CONTROLS.md) |

Also: [`FROM-PHARMA.md`](steering/FROM-PHARMA.md) what transferred and what did
not · [`DATA-RESIDENCY.md`](steering/DATA-RESIDENCY.md) what leaves the building
· [`UI-COPY.md`](steering/UI-COPY.md) copy to be lifted into the page ·
[`OPERATIONS.md`](steering/OPERATIONS.md) **the five operational capabilities —
cost autopilot, semantic cache, catching model regressions, failure forensics,
self-healing docs.** Teaching document and build plan in one; every claim is
marked MEASURED or PROPOSED, and none of it is built yet ·
[`LEARN-SOURCES.md`](steering/LEARN-SOURCES.md) **what in this folder teaches
what** — a source catalogue for the `/learn` pages, with the measured figure and
the dependency edges for each topic. Deliberately not a lesson plan.

### commerce — the fifth engagement, PARTLY BUILT

[`commerce/PLAN.md`](commerce/PLAN.md) — the plan. **The MCP server's protocol
layer and the policy corpus are built; the estate, the API and the desk are being
built by three other sessions.** [`commerce/CORPUS.md`](commerce/CORPUS.md) is
the corpus meta-document — read it before quoting anything in `commerce/corpus/`,
and note §4: there is a question the corpus deliberately cannot answer, and
writing the missing document would destroy the test. Thornbury Goods,
a mid-size online retailer with its own last-mile fleet; the persona is a
resolutions specialist answering *"my order arrived damaged."* Five Postgres
databases (shop · wms · fleet · crm · policy) with real foreign keys inside each
and soft keys between, a **twelve**-document policy corpus (not the forty the
plan first guessed — `CORPUS.md` §5 argues why a count is a measurement and not a
target), **a NestJS backend with no
AI in it**, and — the thing that makes this engagement different from the other
four — **an MCP server between the model and every tool.** Read
[`beyond-retrieval/MCP.md`](beyond-retrieval/MCP.md) first for the
protocol; the plan's §6, §7 and §10 are what MCP breaks in this repo's existing
machinery, how a write path is guarded when annotations cannot be trusted, and
the measurement that decides whether the protocol was worth its cost.
[`commerce/MCP-STEPS.md`](commerce/MCP-STEPS.md) is the build-along — twelve
steps, each one sitting, each naming the tech and why that tech. Steps 0–3
depend on nothing and can start before the estate exists.

### safety — the fourth engagement, PLANNED ONLY

[`safety/PLAN.md`](safety/PLAN.md) — **nothing is built.** Point the existing
machinery at NHTSA's public vehicle-safety record: a corpus nobody wrote for us,
with a real unplanted contradiction (51 of 55 sliding-door complaints filed AFTER
the recall that was meant to fix them) and two endpoints of the same agency using
different date formats. Four documents, in the order they were written: [`PLAN.md`](safety/PLAN.md) why
and what, [`CORPUS.md`](safety/CORPUS.md) what the data actually is,
[`WALKTHROUGH.md`](safety/WALKTHROUGH.md) the answer key worked by hand before
anything could grade itself, and [`INGESTION.md`](safety/INGESTION.md) the seven
retrieval stages with real before-and-after.

## Research and reference

| | |
|---|---|
| [`corpus-research/`](corpus-research/) | What a real claims corpus holds — four clusters plus [`README.md`](corpus-research/README.md). Research notes, not instructions. |
| [`plans/CORPUS.md`](plans/CORPUS.md) | How the insurance corpus was grown to 79 documents, and why each planted flaw is there. |
| [`evals/README.md`](evals/README.md) | The insurance eval baseline and per-case notes. |

---

## Naming rules — so this does not drift again

Four names carry meaning. Use them, and do not invent a fifth word for the same
thing.

```
  PLAN.md          what this is and why it looks like this   (design intent)
  NEXT.md          what is open right now                    (the work queue)
  WALKTHROUGH.md   the plain-language tour                   (no jargon)
  ARCHITECTURE.md  where code goes and why not elsewhere     (the map)
  README.md        the index of the folder it sits in
```

And two rules about **where** a document lives:

1. **Scope decides the folder.** A document about one engagement lives in that
   engagement's folder. A repo-wide document lives at `docs/`. There is no third
   option — `PHARMA-PLAN.md` at the top level was confusing precisely because it
   was neither.
2. **Never put a document inside a corpus directory.** `docs/pharma/corpus/` and
   `docs/steering/corpus/` are `CORPUS_DIR` — the haystack the assistants
   retrieve from. `@fde/grounding`'s loader ingests **every** `.md` it finds
   there, with no exclusion list, so a README about the corpus becomes a
   retrievable document the model can cite as if it were a procedure. A
   meta-document goes *beside* the folder, never in it. This happened on
   2026-09-14 and `pharma:corpus-check` caught it: 75 chunks became 80.
3. **A plan with a horizon longer than the current work goes in `plans/`.**
   `ROADMAP.md` is the live queue; `plans/` is for the design documents behind a
   specific piece of work.

> **Why the rename happened.** Three files were called `NEXT.md` at three
> different scopes. On 2026-09-14 one of them was moved on top of another and
> **633 lines of steering's plan were destroyed** — recovered only because it was
> committed. A filename that is ambiguous about its scope is not a cosmetic
> problem.
