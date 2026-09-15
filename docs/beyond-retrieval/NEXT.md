# Next, for the beyond-retrieval track — the brief for the session building the pages

*Written 2026-09-15 by the session that wrote the five documents. They are
finished and will not move. **This file is the work queue for the `/learn` pages
that read them.***

Companion: [`PLAN.md`](PLAN.md) is why the track looks like this.
[`README.md`](README.md) is the folder index.

---

## 0 · What you already know, so you do not rediscover it

Everything below was learned building the RAG track. It is repeated here because
a brief that assumes you remember is a brief that will be read by somebody who
was not there.

| | |
|---|---|
| **`kind="cited"` already exists** | Added for the RAG track, badged *"measured elsewhere — not by this repo"*. Use it for every external number. Default stays `measured`. |
| **`detail` in the jsonc maps to `note`, not `display`** | `note` gets its own row; `display` prints at the end of the bar. The long strings in these figures are `note`. |
| **`BarRows` computes its own gutter** | Since `BarRows.tsx:141`. Label length is free — a 45-character `display` gets the room. |
| **`Matrix` has exactly three states** | `State = 'live' \| 'wired' \| 'refuses'`, renamed and recoloured via `marks`, **not extensible**. Every Matrix figure below names its collapse. |
| **`Slope` is rank-only** | Inverted axis, `worst` floor. **No figure in this track uses it.** Anything before/after is `BarRows` with `before` + `legend`. |
| **`Funnel` is `{n, label, op?, why?}`** | Not `{stage, n, note}`. |
| **`RunGrid` is pass/fail per case per run** | **No figure in this track uses it.** |
| **No hardcoded counts** | `TOTALS` derives from `LESSONS.length`. This was drift incident four. |
| **The ramp never encodes a series** | `hueOf` is position-within-track. Do not colour a Matrix's columns or a BarRows' rows with it. |
| **Text width only exists after layout** | The `getBBox()` probe caught six clipped labels in `BarRows`, a collision in `Path`, and — found building this track — a crop in **`Funnel`**. Run it on every new route. |
| **`Funnel`'s `op` budget is 12 characters — measured, not estimated** | `getBBox` at `fontSize={11}`: the gutter is **86 units** and the face renders about **6.6 units per character**, so the ceiling is **13** and the safe budget is **12**. `"gate + top-k"` (12) clears by 6.9 units; `"the work list"` (13) clears by **0.3**; `"days, GPUs, labelled data"` (25) is cropped by 79. There is no wrapping and the overflow runs off the **left** edge. **Put detail in `why`, which has the full width.** The numbers also live in `Funnel`'s own prop doc — this table is read by whoever writes figure data, the prop doc by whoever writes the call, and both needed them. |
| **Why `BarRows` escaped this and `Funnel` cannot** | `BarRows` now computes its gutter from its own longest string. `Funnel` cannot: its gutter is also what positions every bar, so deriving it from the label would move the chart. One is self-correcting; the other stays a constraint, permanently. That asymmetry is the reason this row exists rather than a fix. |
| **`Matrix` rows take an `explain`** | Added mid-build: plain words, a concrete example, and why the row got its verdict, opening in `OriginDialog`. Use it where row names are shorthand; skip it where they are already plain questions. The example's `shape` has **no default** — most grid examples are illustrative, so defaulting either way would be wrong about most callers. |
| **`Trifecta` and `Path` both exist** | `Path` is a chain and implies ordering. `Trifecta` is for the case where removing any one element removes the failure, and draws a missing leg dashed via `present: false`. |
| **`Snippet` speaks Python** | Added for `FINETUNING.md` §5. No new dependency; +9,407 gzipped on the shared learn chunk, and the firm's door still does not load that chunk. |

The three marks in the documents map onto `kind`:

```
  MEASURED HERE  → kind="measured", source = the command from the Run it table
  CITED          → kind="cited",    source = author, paper, URL, fetched 2026-09-15
  a drawing      → kind="illustration"  (every <Stages>, and FIG-INJ-1, FIG-CTX-3)
```

**`FINETUNING.md` is the page to watch.** Four of its five figures are `cited`;
exactly one, `FIG-FT-3`, is `measured`. Getting that page's badges right matters
more than anywhere else in this track.

---

## 1 · The five documents

All final, in `docs/beyond-retrieval/`.

| slug | file | title for the page |
|---|---|---|
| `context` | `CONTEXT.md` | The window is a budget, and it is spent unevenly |
| `injection` | `INJECTION.md` | The model cannot tell your instructions from its input |
| `credentials` | `CREDENTIALS.md` | A missing value must reduce access, never grant it |
| `orchestration` | `ORCHESTRATION.md` | The industry argued for a year and converged on what `fanout.ts` already did |
| `finetuning` | `FINETUNING.md` | Changing the model instead of the prompt, and the measurement that says whether to |

Each ends with `## Figure data for the UI` (jsonc, ids `FIG-<CTX|INJ|CRD|ORC|FT>-<n>`)
and a `Run it` table. **Take numbers from the jsonc, not the prose.**

---

## 2 · The track

Five lessons, five ramp stops. Placement is yours — the argument that put
`patterns` third was better than mine, and the same reasoning applies here:
four of these five are general, one engagement-flavoured example aside.

**`needs:` must not all say the same thing.** All five assume machine lesson 2
and the `agentic` lesson of the patterns track. Only `credentials` leans on
another lesson *in this track*.

```ts
export type LessonSlug =
  // … existing 22 …
  | 'context' | 'injection' | 'credentials' | 'orchestration' | 'finetuning';

export type TrackId = 'machine' | 'operations' | 'engagement' | 'patterns' | 'beyond';
```

```ts
  {
    id: 'beyond',
    title: 'Five things that are not retrieval',
    blurb:
      'What is left once the right passage has been found: what else is in the window and how unevenly it is read, what happens when somebody else writes some of it, who is allowed to call any of this, how many agents are doing it, and the one case where you change the model instead of the words. Four are running here and measured; the fifth is read out of other people’s papers and says so.',
  },
```

```ts
  {
    slug: 'context', track: 'beyond', n: 1,
    short: 'Context',
    title: 'The window is a budget, and it is spent unevenly',
    lede: 'A bigger context window is not a proportionally better one — position decides how well a passage is read, every model tested degraded as input grew, and the thing that fills your window is not the prompt but the history you re-send every turn.',
    source: 'docs/beyond-retrieval/CONTEXT.md',
    minutes: 10,
    needs: 'lesson 3 of the patterns track',
  },
  {
    slug: 'injection', track: 'beyond', n: 2,
    short: 'Injection',
    title: 'The model cannot tell your instructions from its input',
    lede: 'Instructions and data share one channel by construction, so there is no parameterised prompt — and the only defence that survives a model upgrade is making the dangerous outcome impossible to express rather than asking the model not to be fooled.',
    source: 'docs/beyond-retrieval/INJECTION.md',
    minutes: 11,
    needs: 'lesson 3 of the machine',
  },
  {
    slug: 'credentials', track: 'beyond', n: 3,
    short: 'Boundaries',
    title: 'A missing value must reduce access, never grant it',
    lede: 'Four boundaries, each with a convenient implementation that fails open — the API-key check everybody writes, the network property enforced in the wrong layer, the tracing default that ships data outward, and the catch block that hands a caller your database hostname.',
    source: 'docs/beyond-retrieval/CREDENTIALS.md',
    minutes: 10,
    needs: 'lesson 2 of this track',
  },
  {
    slug: 'orchestration', track: 'beyond', n: 4,
    short: 'Many agents',
    title: 'One loop is not always the shape',
    lede: 'Two labs published opposite advice about multi-agent systems and converged ten months later on one rule — writes stay single-threaded — which this repo’s fan-out had already enforced with a schema; and the measured surprise is that twice the turns cost a quarter of the tokens.',
    source: 'docs/beyond-retrieval/ORCHESTRATION.md',
    minutes: 11,
    needs: 'lesson 3 of the patterns track',
  },
  {
    slug: 'finetuning', track: 'beyond', n: 5,
    short: 'Fine-tuning',
    title: 'Changing the model instead of the prompt',
    lede: 'LoRA freezes the model and trains 0.06% of it beside the frozen weights, which is why it forgets less and also why it learns less — and the measurement that would justify one here says the problem is document shape, not subject matter.',
    source: 'docs/beyond-retrieval/FINETUNING.md',
    minutes: 11,
    needs: null,
  },
```

Total 53 minutes; `TOTALS` picks it up.

---

## 3 · Pages and routes

File-based routing, as before.

```
src/pages/learn/{Context,Injection,Credentials,Orchestration,Finetuning}.tsx
src/routes/learn.{context,injection,credentials,orchestration,finetuning}.tsx
```

---

## 4 · `HowItWorks` — the verbatim table

**Line ranges were computed from the block contents, not typed, and all 16 were
diffed against their source files at commit `78a8167`. 16 of 16 clean.** That is
a stronger claim than the RAG track could make on its first pass, where four
blocks were wrong. Re-check anyway.

| page | file | ranges |
|---|---|---|
| `context` | `packages/agent/src/core/settle.ts` | **1-22** |
| | `packages/agent/src/core/usage.ts` | **12-31** |
| `injection` | `apps/ai/pharma/src/guard/injection-selftest.ts` | **19-37**, **117-121** |
| `credentials` | `packages/guard/src/guard.ts` | **1-31**, **55-60** |
| | `packages/guard/src/public-error.ts` | **1-28** |
| | `packages/providers/foundry/src/client.ts` | **1-17** |
| | `apps/ai/steering/src/agent/loop/assess-requirement.ts` | **1-8** |
| `orchestration` | `packages/agent/src/core/fanout.ts` | **1-9**, **11-27**, **37-40**, **44-48**, **78-79** |
| `finetuning` | `packages/grounding/src/rerank.ts` | **35-42**, **44-50** |

Every other code block in the five documents is `assembled` and labelled so on
its first line. **`FINETUNING.md` §5 is Python** — `peft`, `bitsandbytes`,
`transformers` are Python and a TypeScript LoRA would teach a fiction.
**RESOLVED**: `Snippet` had four grammars and no Python; it now has five, with
no new dependency.

Best `trap` fields available:
- `context` — a retry sentence written out three times, so an engine comparison
  was partly measuring a prompt difference while reporting it as an engine one.
- `injection` — a fixture that invented its own fields, so **every attack
  "passed" because the fixture was malformed**, and only the negative control
  noticed.
- `credentials` — `if (KEY && mismatch) deny` fails open; delete the variable
  and the endpoint is public with a green deploy.
- `orchestration` — `--limit` produced a four-row list under a summary
  describing all twenty-three.

---

## 5 · Charts

All signatures already verified (§0). **No `Slope`. No `RunGrid`.**

| figure | component | note |
|---|---|---|
| `FIG-CTX-1` `FIG-INJ-4` `FIG-CRD-1` `FIG-ORC-1` `FIG-FT-1` | `Stages` | all `illustration` |
| `FIG-CTX-2` `FIG-CTX-3` `FIG-INJ-3` `FIG-INJ-5` `FIG-CRD-3` `FIG-ORC-2` `FIG-ORC-4` `FIG-FT-2` `FIG-FT-3` | `BarRows` | `detail` → `note` |
| `FIG-CTX-5` `FIG-INJ-6` `FIG-CRD-4` `FIG-ORC-5` `FIG-FT-5` | `Funnel` | `{n, label, op?, why?}` |
| `FIG-CTX-4` `FIG-INJ-2` `FIG-CRD-2` `FIG-ORC-3` `FIG-FT-4` | `Matrix` | collapses named below |
| `FIG-INJ-1` | **`Path`, or a small new drawing** | see below |

### `Matrix` collapses, named per figure

`marks` renames the three states; it does not add a fourth.

| figure | `marks` | mapping |
|---|---|---|
| `FIG-CTX-4` | built here / partly / not built | as written in the jsonc |
| `FIG-INJ-2` | present / partial / absent | as written |
| `FIG-CRD-2` | allowed / — / **denied** | two states used; the denials are the point |
| `FIG-ORC-3` | yes / conditionally / no | as written |
| `FIG-FT-4` | LoRA better / comparable / full FT better | as written |

Set `rowHeader` on all five — it defaults to `'engine'`, which is wrong for
every one of them.

### `FIG-INJ-1` — the lethal trifecta · **BUILT as `Trifecta`**

Not `Path`, and the reason is worth keeping: **`Path` is a chain and implies an
ordering.** The whole point of the trifecta is that the three legs are
unordered and that removing *any one* removes the failure. `Trifecta` draws a
missing leg dashed via `present: false`, which is what makes the caption's
finding visible rather than asserted: **this repo is missing the third leg in
every engagement, deliberately.**

### Four figures where the visual default is wrong

1. **`FIG-INJ-3`** — two of four planted attacks are **not** stopped, and a
   third is stopped *by accident*. Do not render "stopped" as success-coloured
   and leave the gaps neutral; **the gaps are the finding.** The accidental one
   needs to read differently from the deliberate one.
2. **`FIG-CRD-2`** — four of six rows are denials, and that is the point. A
   matrix that renders denials as failures inverts the page.
3. **`FIG-ORC-2`** — the fan-out bar is **shorter** and represents **more work**
   (24 turns against 12). The label must carry that or the chart reads backwards.
4. **`FIG-FT-3` is already split, because I checked `BarRows` rather than
   leaving it to you.** `width={Math.max(2, x(r.value))}` with
   `x(v) = (v/top)*plotW` means a negative value draws a **2px stub —
   pixel-identical to a very small positive one.** The chart would have said the
   fielded record scored *near* zero when it scored *below* zero, inverting the
   finding. So `FIG-FT-3` is now the two prose scores only, and `FIG-FT-3b` is
   the −0.88 as a callout, because *"it scored below zero and still ranked
   first"* is a relationship and not a magnitude. **Do not merge them back.**

### One figure must NOT be drawn twice

`FIG-CTX-2` is the same measurement as **`FIG-AGT-6`** on `/learn/agentic`.
**Draw it once and link across.** Two renderings of one measurement is exactly
the FIG-HYB-2 problem, and this time it is flagged before you build it.

---

## 6 · Checks

```bash
pnpm typecheck        # the LessonSlug union catches a missing entry
pnpm leak:check       # PASS
pnpm arch:check
pnpm build
```

Then the render sweep across **all** `/learn/*` routes at two widths, plus the
`getBBox()` text probe — it found six clipped labels last time, five of them on
pages nobody had touched. 23 routes becomes 28.

And by eye, because no command covers them:

1. `/learn/finetuning` — **four of five figures are `cited`.** Confirm none
   reads as a repo measurement, and that `FIG-FT-3` reads as one.
2. `/learn/injection` — confirm the two undefended attacks are legible as gaps.
3. `/learn/orchestration` — confirm the shorter bar reads as the cheaper one.

---

## 7 · What NOT to do

| | |
|---|---|
| **Do not redraw `FIG-AGT-6`.** | §5. |
| **Do not restate `/learn/caching` or `/learn/cost`.** | `CONTEXT.md`'s opening block names what it defers to. Link, don't re-explain. |
| **Do not soften the injection gaps.** | Two of four attacks land. The file that measures them says it *"asserts that gap rather than hiding it"*, and the page should too. |
| **Do not present `SECURITY-REVIEW.md` as current.** | It is dated. `FIG-CRD-3`'s caption must say so. |
| **Do not write a count.** | `TOTALS`. |
| **Do not add a sixth.** | Evals, cost and caching are the operations track; engines are `ENGINES.md`. See `PLAN.md` §5. |
| **Do not touch `docs/beyond-retrieval/`.** | If a document is wrong, message the session that wrote it. |

---

## 8 · Open, honestly

- **`FIG-INJ-1` is the one new drawing**, and three overlapping sets is a harder
  layout than `Path`'s four-node line. A three-row `Matrix` plus a sentence
  would carry the argument if the drawing fights you. The *conjunction* is the
  point, not the geometry.
- **`FINETUNING.md` has one measured figure out of five.** That page is thinner
  than the other four and the reason is real: nothing here has been fine-tuned
  and probably never will be. `PLAN.md` §4 explains why it is still less thin
  than `GRAPH.md` was.
