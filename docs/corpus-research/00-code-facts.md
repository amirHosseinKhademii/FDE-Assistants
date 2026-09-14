# What the code actually does today — measured, not assumed

*Written 2026-09-11, before any corpus design. Everything here was run or read,
not inferred. This is the input to the Step 2 design in
[`CORPUS-PLAN.md`](../plans/CORPUS.md); the other files in this directory are
web research into what real claims documents look like.*

---

## Baseline numbers

`pnpm chunks`, 2026-09-11:

```
12 documents in docs/examples/policies

  maxChars=1200  chunks=128   orphans=0
  maxChars=400   chunks=205   orphans=0 (forced)
  maxChars=200   chunks=573   orphans=0 (forced)
  maxChars=120   chunks=805   orphans=0 (forced)

  11 distinct form ids: PA-2021-07, PA-2022-04, PA-2023-01, PA-2023-01-CA,
  PA-2023-01-FL, PA-2023-01-NY, PA-2023-01-TX, PA-END-2023-11, PA-END-2024-03,
  PE-2023-01, PP-2023-01
```

12 documents, 11 form ids: `auto-exclusions-schedule-2023.md` deliberately shares
`PA-2023-01`, because the exclusions *are* part of that form.

---

## Finding 1 — the id regex silently swallows every new document type

`config/domain.ts` has one pattern, and `form-id.ts`, `ingest.ts`,
`search-policy.tool.ts` and `eval/checks.ts` all stand on it:

```js
documentIdPattern: /\b(P[APE]-(?:END-)?\d{4}-\d{2}(?:-[A-Z]{2})?)\b/
```

Run against the id shapes the plan proposes:

```
BUL-2024-07      ""     ← bulletin
CL-2024-3        ""     ← state circular
NY-CL-2024-03    ""     ← state circular, prefixed
DET-2023-0042    ""     ← prior determination
PA-2023-01       "PA-2023-01"
PA-2023-01-TX    "PA-2023-01-TX"
PA-END-2024-03   "PA-END-2024-03"
```

Empty string, not an error. That has two consequences, and neither announces
itself.

### 1a · Every bulletin citation is scored as a FABRICATION

`checks.ts:resolveCitedForm()` tries the id regex, gets `''`, falls through to
the filename branch — which looks up `policyIndex()`, itself built from the same
regex, so the match's `formId` is `''` too. Falsy. Pushed onto `bad[]` as
*"no policy document of that name"*, and `citations_resolve` fails.

Per the `cov-002` note in `cases.jsonl`, a `citations_resolve` failure is
counted under **"false answers (dangerous)"** — the bucket reserved for invented
evidence. So adding bulletins to the corpus would inflate the dangerous-failure
count with documents that are sitting right there on disk. That is the exact
metric Step 6 exists to measure.

The root cause is that `resolveCitedForm` answers two different questions with
one return value: *does this document exist* and *which form is it*. For a form
those are the same question. For a bulletin they are not.

### 1b · Bulletins are unreachable by any filtered search

`ingest.ts:toLangChainDocument` stamps `formId: formIdOf(trail) || formIdOf(...)`
— `''` for a bulletin. `search-policy.tool.ts` builds a Postgres equality filter
`{ formId: policy_form }`, and its own description instructs the model to pass
`policy_form` *whenever it knows which form the customer is on*. A chunk with
`formId: ''` matches no such filter.

**This makes two of Step 5's proposed cases unpassable by construction** —
`superseded-bulletin` and `state-circular-overrides-form`. They would fail for
plumbing reasons, not retrieval reasons, and the debugging budget would go
there instead of where it belongs.

So the design has to settle **now** how a bulletin enters the candidate set for
a form-filtered query. It cannot wait for Step 6.

### The fix that must NOT be taken

Widening `documentIdPattern` to cover the new prefixes. `form-id.ts`'s header
comment is explicit that the same regex drives search filtering, and that the
first version of it — a `startsWith` prefix match — silently merged the five
state variants into one. Leniency belongs in the checker, which is the thing
being too strict. The filter must stay exact.

---

## Finding 2 — `evals/fixtures/embeddings.json` is dead weight

3.7 MB, 128 keys, one per chunk at `maxChars=1200`. Nothing in `src/` or
`scripts/` references it. Its only consumer is
`archive/pillar-1-handrolled/embedder.ts:22`, which was archived when Pillar 1
moved to LangChain.

`tools/fixtures.ts` is a different, live mechanism — it fixtures whole TOOL
responses, and its own header records that it was narrowed to
`get_policyholder` only, because `search_policy`'s arguments are free text the
model rewrites every run.

**What this means for Step 4.** There is no embedding cache on the live path, so
`pnpm ingest` embeds the whole corpus every time, and its cost scales linearly
with chunk count. At 128 chunks that is invisible. The plan's own estimate of
~2,000 chunks makes it a real, if still small, line item — and it is the
strongest argument for the incremental-ingest half of Step 2b.

It also means the re-run in Step 4 is not offline. `pnpm chunks` is the only
free check, which is why the plan is right to lean on it.

---

## Finding 3 — what "additive" costs in the generator as written

`scripts/generate-corpus.mjs` is 521 lines, and the shape is:

```
WORDINGS[]          8 objects of numbers/strings
  → wordingDoc(v)   one ~200-line template literal
GLASS_ENDORSEMENT   one hand-written string constant
HOLDER_ROWS[]       18 positional arrays
  → holderDoc(r)    one ~60-line template literal
main()              writes all of them, overwriting
```

Two things follow.

**The output is overwritten, not appended.** Determinism is what makes that
safe: same input, byte-identical files, clean `git diff`. "Additive" therefore
means *do not edit the existing `WORDINGS` and `HOLDER_ROWS` entries or their
templates* — not that the script avoids touching the files.

**Three hero documents are NOT generated** and must stay that way:
`auto-pa-2023-01.md`, `auto-pa-end-2024-03.md`,
`auto-exclusions-schedule-2023.md`. The generator writes 9 of the 12 policy
files. Every eval case points at a specific sentence in a hero, and a templated
document cannot carry a deliberate flaw.

**`HOLDER_ROWS` uses positional arrays with 12 fields.** Adding a thirteenth
means editing all 18 rows — which touches existing data and breaks additivity in
practice if not in spirit. Any new per-record field should go in a side table
keyed by id, the way `OCCUPATION` and `ENDORSEMENT_NOTE` already do.

Adding five document types by extending this one file takes it past 2,000 lines
with five more inline templates. Splitting into `scripts/corpus/<type>.mjs` with
a thin `generate-corpus.mjs` that imports them is worth doing as part of Step 3
— but it is a move, not a rewrite, and the existing output must stay byte-identical
across it. That is checkable: regenerate, `git diff`, expect nothing.

---

## Finding 4 — the system prompt FORBIDS the reasoning the new cases require

This is the largest of the four, and it is not in the plan at all.

`tools/coverage-prompt.ts`, under WHEN DOCUMENTS DISAGREE:

> - If a policyholder record settles which document governs (for example, it
>   lists the endorsement as attached), set `resolved_by` to that record and
>   ANSWER WITH THAT DOCUMENT'S FIGURES.
> - If nothing settles it, set `resolved_by` to null AND escalate. **Never
>   resolve a conflict yourself by preferring the newer document, the more
>   specific one, or the one that seems more reasonable.**

Precedence today is binary: **a policyholder record settles it, or you escalate.**
There is no third branch. And the one thing explicitly banned is preferring the
newer or the more specific document.

Now read Step 5's proposed cases against that:

| proposed case | what it needs the model to do | the prompt's verdict |
|---|---|---|
| `superseded-bulletin` | prefer the **newer** bulletin | explicitly forbidden |
| `state-circular-overrides-form` | prefer the **more specific** (state) document | explicitly forbidden |
| `prior-determination-is-stale` | prefer the **newer** policy edition | explicitly forbidden |

Three of the five new cases are unpassable against the current prompt, and a
model that passed them would be violating a rule the repo put there on purpose.

### The distinction that resolves it

The current rule is right, and it is right for a reason the wording does not
quite capture. What it is actually banning is **precedence the model invents** —
"this one is newer, so it probably wins" is a plausible-sounding heuristic that
happens to be wrong about as often as it is right, and `cov-004` exists to catch
it.

What the new corpus introduces is different in kind: **precedence the documents
themselves state.** A bulletin that says "this supersedes Bulletin 2024-03" is
not the model guessing. A state amendatory form that says "where this form is
silent, PA-2023-01 controls" — wording the existing generator already emits —
is a stated rule, not an inference.

So the rule to grow into is roughly:

> Resolve a conflict only when something **states** which document governs — a
> policyholder record, a supersession notice, or a jurisdiction clause. Never
> resolve it from your own sense that one document is newer, more specific, or
> more reasonable. If the precedence is not written down somewhere you
> retrieved, it does not exist.

That keeps `cov-004` red-for-the-right-reason — nothing in that corpus *states*
whether the uncountersigned endorsement is in force — while making the three
new cases reachable.

### Why this cannot be deferred

`coverage-prompt.ts` is a **controlled variable**. `NEXT.md` §A2 lists it among
the things held identical across the SDK and Mastra engines, precisely so an
engine diff means something. Changing it changes both baselines at once.

So it has to be sequenced deliberately: the prompt change is a **setup change**,
the same as a corpus change, and the two land together or the Step 4 re-run
measures two things at once and attributes them to neither.

### One smaller thing in the same file

Step 5's `calls-the-record-first` case asserts `get_policyholder` ran before any
search. The prompt already says so, as procedure step 1. But there is **no check
in `eval/checks.ts` that can see tool order** — every check in that file has the
signature `(a: CoverageAnswer) => CheckResult`, and a `CoverageAnswer` carries
no tool trace. The case needs a new check *kind*, reading `TurnRecord[]` rather
than the answer. That is a small piece of runner work, and it is invisible in
the plan's one-line description of the case.
