# `packages/pharma` — the layout, and the rules that keep it

*Plain-language version of what this is for: [`WALKTHROUGH.md`](WALKTHROUGH.md).*

*Written 2026-09-12, after the restructure. This is the authoritative map of
`packages/pharma/src/`. [`NEXT.md`](NEXT.md) says what is being built;
[`../PHARMA-PLAN.md`](../PHARMA-PLAN.md) says why the estate looks the way it
does. This file says where code goes and why it may not go elsewhere.
[`EXTRACTION.md`](EXTRACTION.md) says which of this code should stop living
here at all — and, just as importantly, which duplication is deliberate.
[`DESIGN.md`](DESIGN.md) says what the web surface should LOOK like and why —
read it before adding a page or a component under `apps/veresk-app/`.*

---

## The tree

```
packages/pharma/
  db/schema/*.sql              the six DDL files. One per system of record.
  src/
    config/                    connections · the corpus descriptor
    db/                        THE ESTATE — building and checking it
      init/ · schema/ · seed/
    grounding/                 THE DOCUMENT HALF — chunk, embed, query, over mrd_kb

    tools/                     THE DATA LAYER — no model, no printing, no CLI
      utils/                     handle.ts · dates.ts
      departments/               one file per silo: erp mes qms hcm reg tms
      functions/
        assess-release.ts        assessRelease() — bottleneck 1, one lot → a decision
        assess-supplier-impact.ts  bottleneck 2, one supplier → a ranked work list
        supplier-impact-selftest.ts  `pnpm supplier:check` — 10 checks, both directions

    schema/                    THE ANSWER CONTRACT — what a model may return
      release-schema.ts · release-selftest.ts        `pnpm schema:check`

    telemetry/                 WHAT IT COST
      prices.ts                  this deployment's rate card, and its caveat

    guard/                     WHAT IT MUST NOT DO
      sql-write-selftest.ts      `pnpm sql:check` — no write reaches the records
      compliance-selftest.ts     `pnpm compliance:check` — what goes on the wire
      compliance-mastra-selftest.ts  the same, on the other engine

    eval/                      HOW WE KNOW IT WORKS
      checks/                    checks.ts · checks-selftest.ts  `pnpm checks:check`
      severity/                  severity.ts · severity-selftest.ts  `pnpm severity:check`
      run.ts                     `pnpm eval` — the suite
      diff.ts                    `pnpm eval:diff` — two baselines, per case
      history.ts                 `pnpm eval:history` — every baseline, free

    agent/                     WHAT A MODEL MAY TOUCH
      tool/                      assess-release.tool.ts · search-procedures.tool.ts
                                 tools-selftest.ts       `pnpm tools:check`
      prompt/                    release-prompt.ts · prompt-selftest.ts
      loop/                      release-agent.ts — the assembly

    cli/                       WHAT A PERSON RUNS — rendering only
      lot-trace.ts               `pnpm db:trace`
      release-report.ts          `pnpm db:release`
      supplier-impact.ts         `pnpm db:supplier-impact SUP-04`
      ask.ts                     `pnpm ask "…" --trace`
```

There is now a **third surface** beside the CLI and the agent loop:

```
apps/veresk-app/               THE WEB SURFACE — TanStack Start
  src/routes/
    __root.tsx                 the document, fonts, query client
    index.tsx                  composition only — and now literally so
    api.ask.tsx                POST — the stream. askRelease + recordAsk
    api.lots.tsx               GET  — the batch list, same guard
    api.history.tsx            GET  — earlier questions, same guard
  src/components/
    desk/     AskForm.tsx      composed from @fde/uikit primitives
              DeskHeader.tsx   the bar, and the one thing that moves
    answer/   Answer.tsx       THE DOSSIER — domain, written fresh
              AnswerPane.tsx   which of the three states is showing
              states.tsx       the empty screen + failure copy
    history/  History.tsx      earlier questions, ranked by what they found
  src/hooks/
    use-ask.ts                 the stream's state
    use-desk-form.ts           what the form remembers
    use-history.ts             the list, and when it may be stale
    use-lots.ts                the batch dropdown
  src/lib/
    ask-stream.ts              SSE transport
    trace-lines.ts             one streamed event → one working note
    explain.ts                 the plain-English trace sentences — domain
    tokens.ts                  what an identifier looks like here — domain
    history.ts · storage.ts    the API shape · localStorage for form state
  src/server/
    ask-history.ts             THE ONLY WRITE ON THIS SURFACE — see below

packages/uikit/                @fde/uikit — THE SHARED SURFACE LAYER
  src/styles/uikit.css         --ui-* tokens · control layer · motion
  src/tokens/tone.ts           severity as class names
  src/icons/                   one grid, one stroke weight
  src/components/              Field Select SubmitButton Chip Panel Quote
                               Mono WorkingNotes RunFigures Failure Prose
```

### The one write on the web surface, and why it is not in the package

`ask_history` records what was asked on this page and what came back.
`logs/requests.jsonl` records what a question COST and deliberately carries no
answer body, so it could not answer "what did we tell them about that batch".

It lives in the APP, not in `packages/pharma`, because of rule 19's fine print.
`pnpm sql:check` scans `src/{tools,agent,cli,eval,guard,schema,telemetry}` and
`src/*.ts`, and **prints that scope in its pass line** — it does not recurse into
new subdirectories. A `src/history/` holding this would have passed silently
while the green tick claimed coverage it did not have, which is the blind spot
the guard's own header calls worse than no guard.

The guarantee is made by the **connection**, not by the directory:
`ask-history.ts` resolves `urlFor(KB_DB)` and never touches
`tools/utils/handle.ts`, so a write physically cannot reach one of the six
however the file is later edited. That is stronger than a regex.

**`mrd_kb` is therefore no longer wholly disposable, and its docstring in
`config/connections.ts` was amended to say so.** The chunk index rebuilds from
the documents with one `pnpm ingest`; a question nobody wrote down does not come
back. There is no prune and no TTL — stated in the file header rather than
solved.

**The write happens server-side, after the answer is sent.** A reviewer never
waits on a database round trip, and a tab closed mid-answer still leaves a row.
That ordering creates a race the client must respect: `hooks/use-history.ts`
refetches when `busy` FALLS, not when the answer arrives, because the stream
closes only after the insert resolves.

**Raw events are stored, never rendered trace lines.** What happened is a fact;
how it is explained is a choice that gets reworded, and freezing today's wording
into the rows would leave old runs explaining the system in language it no
longer uses. `lib/trace-lines.ts` does that mapping for the live stream and the
stored rows alike, so the two cannot word the same step differently.

Scope, stated because the page does not: **web asks only.** `pnpm ask` and the
eval runner do not appear. Cross-surface history means the write moving beside
`logRequest` in the two loop files.

### A department module is shaped by the walk that first needed it

Everything in `tools/departments/*` was keyed by a **lot id**, because the first
question started with one lot. The second bottleneck starts at the other end —
one supplier, many lots — and composing the existing functions would have meant
ninety-four round trips to answer one question.

So both `erp.ts` and `tms.ts` grew a second, clearly-marked section going the
other way. That is not a flaw in the originals; they were right for the direction
they were written for. **Expect the third bottleneck to pay the same toll**, and
do not "fix" it by making the first set generic before a second caller proves
what generic means here — the same rule [`EXTRACTION.md`](EXTRACTION.md) applies
to packages applies inside them.

The boundary that is expensive is **between the six databases**, not inside one.
Joining three tables inside `mrd_erp` in a single query is correct and cheap;
looping a per-lot function across a silo boundary is the thing to avoid.

The palette, the type, the motion catalogue and the three colour rules that
govern all of it are in [`DESIGN.md`](DESIGN.md). The one that belongs here,
because it is the same boundary this file draws everywhere else:

**The rule that keeps the surface split honest: the package owns how severity
LOOKS, never what is severe.** `Prose` highlights typed references but is handed
the grammar; `Failure` renders a stop reason but is handed the sentence
explaining it; `WorkingNotes` renders trace lines but never writes one. Anything
that knows what the product is about stays in `apps/veresk-app`.

**The web route adds no assembly.** `api.ask.tsx` imports exactly one thing from
the domain — `askRelease` — because the CLI, the eval runner and the browser must
not be able to drift. An earlier insurance version imported ten things and built
the application twice.

Three top-level roles, each stateable in one line:

```
  cli/        what a PERSON runs — printing only, no SQL, no judgement
  agent/      what a MODEL may touch — tools, prompt, loop
  tools/      what NEITHER touches directly — the data layer and the judgement
```

and inside `tools/`, each layer may only reach downwards:

```
  functions/               judgement across silos
        ↓
  departments/             one silo each, typed fetches
        ↓
  utils/ + config/         connections, dates
```

**ONE FUNCTION, TWO FRONT DOORS.** `assessRelease()` is called by exactly two
things: `cli/release-report.ts` for a human and `agent/tool/assess-release.tool.ts`
for a model. The tool wrapper is not ceremony — it adds a name and description
the model reads, coercion of untyped arguments (`"eu"` must work, `"GB"` must be
refused), informative misses instead of exceptions, and a warning
(`releasable: true` is not permission to ship) the function has no reason to
carry. Merging them would put Zod and prompt text inside the function whose only
job is to be right.

**FILES ARE NAMED FOR THEIR ROLE, NOT THEIR TOPIC.** Three files once contained
"release" and meant three different things. Now: `assess-release.ts` is the
judgement, `assess-release.tool.ts` is the model's door to it, `release-report.ts`
is the human's. A name that appears twice with two meanings is a name that has
to be explained every time.

---

## The rules

**1. SQL lives in exactly two places.** `db/` writes the estate (DDL, seed,
checks). `tools/departments/` reads it. Nowhere else — `tools/trace.ts` contains
the string `select` zero times, and that is a property worth keeping, because it
is what made every hop individually provable during the promotion.

**2. Nothing below a CLI prints.** `departments/` and `functions/` return
values. A finding that exists only as red text in a terminal cannot be checked,
tested, or handed to a model. Every colour decision belongs in `tools/*.ts`.

**3. A finding is a value, not a raw column.** `disqualified_on` is a date;
`disqualifiedAfterUse` is the finding. `in_spec` is a column;
`supersededByRetest` is what decides whether a failure still matters. Both
distinctions were bugs first. When a check needs two columns to mean something,
compute it in the layer where both are in scope and name it.

**4. Every as-of question takes its date as an argument, and never defaults to
today.** Four of the six silos answer "what was true on day D" — was the machine
qualified, was the training current, which SOP revision governed, was the
authorisation valid. Asking "is this person qualified" returns the reassurance;
asking "were they qualified on 2026-09-04" returns the finding. `asOfDay` and
`hadLapsedBy` in `utils/dates.ts` exist so all four compare days identically.

**5. One call per silo, not one per query.** Each department exports small
single-purpose fetches *and* one `fetch<Silo>Facts` bundle. Callers use the
bundle. One lot question is ~26 queries; a tool surface exposing each one
separately would be 26 agent round trips. The small functions stay exported
because they are testable alone.

**6. Raw rows never leave a department.** Database `snake_case` is mapped to
`camelCase` typed shapes at the boundary. Above `departments/`, nothing knows
what a column is called.

**7. Cross-silo logic is never added to a department.** A department knows its
own database and nothing else. The moment a check needs two silos it belongs in
`functions/` — `assessCertifier` needs `mrd_hcm` *and* `mrd_reg`, which is
exactly why it lives in `functions/release.ts`.

**8. A new question is a new file in `functions/` plus a thin CLI.** Not a flag
on an existing one. `release.ts` answers "may this go to market M"; a supplier
impact question (T4) or a cold-chain question (T5) gets its own file, reusing the
same departments unchanged.

**9. The vector index is `mrd_kb` and never one of the six.** `db:drop` iterates
`SYSTEMS`; anything built inside a system of record is in the path of every
`db:reset`, and was destroyed that way once already.

**10. No "yes, ship it".** The strongest output is *no blocker found — for QP
review*. Absence of a finding is not a certification, and under Annex 16 the
signature is legally a human's. `src/schema/release-schema.ts` enforces this
structurally: there is no field that can carry a verdict, the schema is strict so
one cannot be smuggled in as an extra key, and a coherence rule rejects prose
that claims it anyway.

**11. `src/agent/` is model-facing; `src/tools/` is not.** The name collision is
real and worth stating once: `tools/` here means the data layer (departments,
functions, CLIs), because it took the name first. What an LLM can *call* lives in
`agent/`, and an `@fde/agent` `Tool` is never defined outside it.

**12. A tool hands the model the RESULT of a traversal, never the ability to
perform one.** `assess_release` is one call covering ~26 queries across six
databases. Six tools — one per silo — would be six round trips and six chances to
stop early, and stopping after `mrd_qms` yields "five of five tests passed,
release it": the exact wrong answer this estate exists to catch.

**13. A bad model-supplied argument returns an informative miss, never a throw.**
`ToolCallRecord.cause` distinguishes a model failure from an infrastructure one;
a tool that throws on a mistyped lot id moves that line and makes every run's
diagnosis wrong. The miss says what DOES exist so the model can correct itself.

**14. The prompt is an ORDERED list, and every rule in it earns its place.** An
unordered set is something a model can satisfy in a way you did not intend —
pick three of five and omit the one that mattered. Each rule should exist because
a specific failure made it necessary, and be deleted when an eval proves it does
nothing. `pnpm prompt:check` keeps it honest against the tools and the schema
offline; only evals can say whether it works.

**15. One assembly, many surfaces.** `release-agent.ts` owns *how* a release
question is answered — which tools exist, which prompt, which contract, which
cap. A CLI, an eval runner and a web route each assembling that themselves will
drift, and both will look healthy while answering differently. Surfaces take
input and render output; they do not choose tools. The turn cap in particular is
deliberately NOT set per surface, so an eval measures the path a user takes.

**16. Nothing here implements an agent loop.** Sending the tool list, receiving
a tool call, dispatching it, feeding the result back, retrying malformed output
— that is `@fde/agent`, bought and already proven, switchable between the
OpenAI Agents SDK and Mastra. What this package supplies is judgement: the
tools, the instructions, the answer shape.

**17. Superseded documents stay searchable, and precedence is applied PER
QUESTION.** The insurance sibling excludes superseded policy editions and is
right to — one pays nothing today. Here `SOP-QC-014 Rev 6` governed every batch
certified between 2023-07-01 and 2026-02-28, batches still within shelf life and
still inspectable. So `search_procedures` takes an `as_of` date instead of a
status filter: the revision that governs an act is the one in force when the act
happened. A `null` `effective_to` means OPEN and must be coalesced — a plain
`day <= effectiveTo` silently drops the current revision and answers every recent
question out of a superseded document.

**18. A price is a property of a contract, a region and a model — never of a
package.** `telemetry/prices.ts` is a deliberate SECOND COPY of the insurance
one, not an import: the two domains share a Foundry resource today, and that is
a coincidence of this exercise rather than a property of either. A rate baked
into `@fde/telemetry` would be quietly wrong at somebody else's customer, and a
cost figure that is quietly wrong is worse than none. An unsettled rate ships
with its caveat in `source`, so every logged line carries it.

**19. Read-only is asserted, not assumed.** The six `mrd_*` databases are the
customer's systems of record under GxP; software that can alter a disposition or
a training record is a regulatory event, not a bug. `pnpm sql:check` scans
every SQL string reachable from `tools/`, `agent/`, `cli/`, `eval/`, `schema/`,
`telemetry/` and `guard/` and fails on a write. `db/` is exempt — building the
estate is what it is for. The guarantee is SOURCE-LEVEL and the check says so in
its own output: it proves no write is written, not that the database would
refuse one. That needs a read-only Postgres role, which the estate does not have.

**20. A checker that fires on ordinary code gets disabled, not fixed.** Both
guard false positives are recorded in the file with the rule that killed them —
regex literals are parsers and are stripped before matching; `grant`, `insert`
and `update` must be followed by their object. And every such checker plants its
own violation and asserts it catches it, because a scanner never seen to fire is
one you cannot read a green tick from.

**21. A citation to a time-varying source carries the date it was read as of.**
`mrd_reg.sop_revisions#SOP-QC-014 Rev 7` is not checkable; `… as of 2026-09-04`
is. Rejected by `coherenceErrors` for the seven tables in `DATED_SOURCES`.

---

### Where the multi-agent files go, and the rule they follow

Added 2026-09-12. Three new kinds of file live under `src/agent/loop/`:

| file | what it is |
|---|---|
| `lot-assessor.ts` | a SUB-AGENT: one item in, one row out, no tools |
| `lot-debate.ts` | two advocates + an adjudicator, for contested items only |
| `supplier-impact-fanout.ts` | the ORCHESTRATOR: many sub-agents + an assembler |

**A sub-agent is not a new kind of thing.** It is an ordinary `runLoop` call
with its own prompt and answer shape — the same machinery `askSupplierImpact`
uses. What makes it "sub" is only that something other than a human calls it.
So it belongs beside the agent loops, not in a folder of its own.

**THE DECISION EVERY SUB-AGENT FORCES: what may it LOOK UP, versus what must it
be TOLD.** That is the actual design work; the tools are the easy part. Both
possible answers have now been wrong here once:

- `lot-assessor` gets NO tools. The walk gathered every item's evidence in one
  pass, so 23 agents re-querying would be slower and could disagree with each
  other mid-run. Evidence is handed down in the brief.
- But it was given NO procedure text either, and ten of twenty-three rows
  recommended a procedure that does not exist in this corpus. **A participant
  told to ground a claim in a source it cannot reach will produce a plausible
  source.**
- The fix is the third answer: **something ABOVE it looks up once and hands the
  text down.** One retrieval, one rulebook, 23 agents — rather than 23
  retrievals that can differ.

### Why sub-agents do not talk to each other

A design question that comes up immediately and has a measured answer — full
reasoning and the build plan in [`NEXT.md`](NEXT.md) §N9.

**Isolation is deliberate and buys three things:** blast radius (one request
sees one lot, so an injection reaches one row), independence (no two agents
querying the estate at different moments), and reproducibility (no ordering
between concurrent items can change the result).

**It costs coherence, measured:** four spellings of the same escalation owner
across 23 rows, because no agent can see what the others wrote.

**The answer is a CRITIC PASS, not a conversation.** One agent reads all rows
together, flags only what isolation cannot see, and only flagged rows are
re-judged. Agents rarely need to converse; they need to see each other's output
once — *produce, review, revise*. That is also the shape the debate already
uses.

**Do not build a blackboard.** Sub-agents reading a shared list of what others
posted reintroduces order-dependence, makes runs non-reproducible, and undoes
the blast-radius property that is the strongest argument for the design.

### What belongs to the package and what stays here

`@fde/agent`'s `runFanout` owns the loop, the bounded concurrency, the
never-throw-for-one-item rule, the token tally, and keeping FAILED separate from
NOT-ATTEMPTED.

It deliberately does **not** decide what a partial result MEANS. Here, a work
list short of the lots it should contain is a lie of omission about patient
exposure; in another domain it is a rounding error. That judgement stays in
`buildAnswer`, which is pure and checked offline by `pnpm pharma:fanout-check`.

Same split elsewhere: `@fde/evals` scores retrieval but `labelOf` stays here,
because what identifies a rule (revision AND clause, never a clause alone) is a
statement about this corpus.

### The guards the multi-agent work needed

| guard | catches |
|---|---|
| `recallVerdictIn` | a CLAIM — "a recall is warranted", "must be recalled" |
| `recallImperativeIn` | a COMMAND — `next_action: "Recall"`, anchored at the start |
| the referral exemption | lets through "decide whether to initiate a recall" |

**A question is not a verdict.** "Should this lot be recalled?" put TO a
Qualified Person is the correct output of the whole design; "a recall is
warranted" is the forbidden one. `decision_for_human` is therefore exempt from
the guard by construction, and every assertion field is not.

Both guards must be tested in BOTH directions — what they catch and what they
let through. The second version of `recallImperativeIn` rejected the correct
answer on its first live run.

---

## Naming

| shape | means |
|---|---|
| `fetchThing(h, id)` | one lookup, one silo, returns typed data or `undefined` |
| `fetch<Silo>Facts(h, key, …)` | the bundle a caller should use |
| `is…On(h, id, date)` / `…AsOf(h, id, date)` | an as-of range lookup |
| `assess<Question>(h, …)` | cross-silo judgement, returns a dossier |
| `Checked<Thing>` | a row plus the findings derived about it |

---

## How to verify a change here

**Start with the free ones. All of these are offline — no database, no model,
no cost:**

```bash
pnpm pharma:world-check       # did the generated estate shift? 48 tables
pnpm pharma:fanout-check      # the pure half of the orchestrator
pnpm pharma:retrieval-check   # the retrieval scorer itself
pnpm price:check              # the cost arithmetic
pnpm pharma:schema-check  pnpm pharma:supplier-schema-check
pnpm leak:check               # no domain vocabulary in the @fde/* packages
```

**`world-check` is the one that changed what is possible here.** The estate
comes off ONE seeded random stream, so any new code that draws from it shifts
every value produced afterwards — measured, one extra draw moved 17 tables.
Nothing detected that before 2026-09-12, which is why the seed's two largest
functions had never been touched. They can be split now: a byte-identical
fingerprint is proof the stream did not move.

**The rule for adding seed data:** give the generator its own
`makeHelpers(otherSeed)` and take the world READ-ONLY. `h` is right there on
`MasterWorld` and destructuring it is the easy mistake. `world-check` must say
`NO SHIFT` before the change is acceptable.

The estate is deterministic for a given seed, so the refactor test is exact
output comparison — no fixtures to maintain:

```bash
git show HEAD:packages/pharma/src/tools/trace.ts > packages/pharma/src/tools/trace-ref.ts
# run both over a set of lots, diff, delete the ref
```

Do **not** use `git stash` for this. Stashing swaps the file out from under a
running `ts-node`, and two such runs overlapping produced two false failures
during the hop promotion. A reference copy sitting beside the real one has no
such race.

Choose lots that trip the planted traps rather than convenient ones — the
promotion was verified against ten, covering T3 `LOT-PAR500-2607-A`, T4
`LOT-AMX250-2402-A`, T5 `LOT-LAT005-2608-A`, T7 `LOT-PAR500-2605-C` and the T6
pair `LOT-IBU200-2609-B` / `-D`.
