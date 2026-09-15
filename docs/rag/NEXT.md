# Next, for the RAG track — the brief for the session building the pages

*Written 2026-09-15 by the session that wrote the five pattern documents. The
documents are finished and will not move. **This file is the work queue for the
`/learn` pages that read them**, and it exists because `/learn/architecture`
already shipped once as a route nothing linked to.*

Companion: [`PLAN.md`](PLAN.md) is why the track looks like this —
read it if a decision below seems arbitrary. [`README.md`](README.md) is the
folder index.

---

## 0 · The one rule that makes this track different from every other page in `/learn`

Every existing lesson is a reading of a document whose numbers were produced by
a command in this repo. `pnpm steering:retrieval-eval` prints the retrieval
numbers. `pnpm arch:graph` prints the package sizes. `pnpm steering:spend`
prints the cost. That is the whole discipline of the section, and
`/learn/drift`'s closing argument is that **a number with a producer that
nothing checks is no better off than a number without one.**

**Two of these five pages have no producer at all.** Every number on
`/learn/graph` and `/learn/multimodal` comes from somebody else's paper. There
is no command in this repo that reprints 81.3, or 0.1%, or 72–83%, and there
never will be.

So the load-bearing decision for this track is how a figure declares that.

### The recommendation: a fourth `Figure` kind

`kit.tsx` currently has three:

```
  measured      every number in it came off a run, and `source` says which.
  illustration  a drawing of an idea. Nothing in it was measured.
  proposed      the shape of a decision not yet taken. The numbers are made up.
```

An external paper's result fits none of them. It **was** measured — carefully,
peer-reviewed, by people with a GPU cluster — just not here. `illustration` says
"nothing in it was measured", which is false and undersells it. `proposed` says
"the numbers are made up", which is false and defames it. And leaving it
`measured` is the worst of the three, because `measured` is the default, renders
**no badge at all**, and on this site an unbadged figure reads as a repo run.

Add:

```
  cited         measured, but not by us. `source` must carry author, paper,
                URL and the date fetched.
```

Badge copy, in the same register as the existing two: **"measured elsewhere —
not by this repo"**. Same `--ui-warn` treatment; the decision being warned about
("is this number mine?") is the same class as the existing warning.

Every jsonc block in the five documents is prefixed `MEASURED HERE` or `CITED`.
That maps 1:1 onto `kind`. The `<Stages>` pipeline diagrams are
`illustration`. The two `PROPOSED` code blocks in `HYBRID.md` §6 are `proposed`
if you draw them at all.

> If you decide against a fourth kind, the fallback is `illustration` plus a
> `source` that names the paper — **not** `measured`. Do not let an external
> number render unbadged.

---

## 1 · The five documents

All final. All in `docs/rag/`. None will be rewritten.

| slug | file | title for the page |
|---|---|---|
| `hybrid` | `HYBRID.md` | Two searches, because one is reliably wrong about different things |
| `corrective` | `CORRECTIVE.md` | Grading what came back, before the model may use it |
| `agentic` | `AGENTIC.md` | Retrieval becomes a tool the model may call, and call again |
| `graph` | `GRAPH.md` | Building a map first, because some questions have no passage |
| `multimodal` | `MULTIMODAL.md` | The page is not the text on the page |

Each document ends with a `## Figure data for the UI` section: jsonc, ids
`FIG-<HYB|COR|AGT|GRF|MMD>-<n>`, each naming the chart component it is for.
**Take the numbers from there rather than from the prose** — the blocks are the
copy-editable form and the prose is the argument.

Each also ends with a `Run it` table. Where a command exists, it belongs in the
figure's `source`.

---

## 2 · The track, and why `needs:` must not all say the same thing

Five patterns, five lessons, so the track lands on the ramp's five stops exactly
— `(n - 1) / (total - 1)` hits `0, .25, .5, .75, 1`.

**The order is a reading order, not a dependency chain, and the `needs:` field
should say so rather than implying a spine that is not there.** The shared
prerequisite is machine lesson 2 (Retrieval); only `corrective` genuinely leans
on an earlier lesson *in this track*.

This is the same honesty the operations track already carries — `forensics` has
`needs: null` and says so on the page.

---

## 3 · `apps/web/veresk-app/src/lib/learn/lessons.ts`

### 3a · The union — typed, so a missing entry fails the build

```ts
export type LessonSlug =
  // … existing 17 …
  // Track four — the retrieval patterns.
  | 'hybrid'
  | 'corrective'
  | 'agentic'
  | 'graph'
  | 'multimodal';
```

```ts
export type TrackId = 'machine' | 'operations' | 'engagement' | 'patterns';
```

### 3b · The `TRACKS` entry

Append. Order in this array is the order on the index.

```ts
  {
    /*
     * FOURTH, AND AFTER THE ENGAGEMENT RATHER THAN BEFORE IT.
     *
     * These five are variations on lesson 2, so the tempting placement is
     * second — straight after the thing they vary. That would put five pages
     * of pattern survey between the machine and the one engagement that shows
     * the machine doing real work, and two of the five are about techniques
     * this repo does not use.
     *
     * A reader who has watched retrieval fail on somebody's actual files is a
     * better reader of "here are five ways people fix that" than one who has
     * not. So: last.
     */
    id: 'patterns',
    title: 'Five ways to retrieve',
    blurb:
      'Variations on lesson 2, each answering a failure the plain pipeline has no move against: the word the embedding cannot see, the passage that came back wrong, the question that needs a second search, the question no passage answers, and the page whose meaning is not in its text. Two of the five are running here and measured; three are read out of other people’s papers and say so.',
  },
```

### 3c · The `LESSONS` entries

Append, in this order.

```ts
  {
    slug: 'hybrid',
    track: 'patterns',
    n: 1,
    short: 'Hybrid',
    title: 'Two searches, because one is reliably wrong about different things',
    lede: 'Embeddings are worst at exactly the rare words that decide an answer, so a second keyword arm runs beside them and the two are fused by rank rather than score — and the fusion has a measured flaw that buries a document only one arm can find.',
    source: 'docs/rag/HYBRID.md',
    minutes: 10,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'corrective',
    track: 'patterns',
    n: 2,
    short: 'Corrective',
    title: 'Grading what came back, before the model may use it',
    lede: 'Retrieval always returns something and never says it found nothing, so a grader sits between search and generation — but the sharpest failure here is one no grader catches, because a relevance model cannot see that a document is out of date.',
    source: 'docs/rag/CORRECTIVE.md',
    minutes: 11,
    needs: 'lesson 1 of this track',
  },
  {
    slug: 'agentic',
    track: 'patterns',
    n: 3,
    short: 'Agentic',
    title: 'Retrieval becomes a tool the model may call, and call again',
    lede: 'Search stops being a pipeline stage and becomes a function the model calls with words it chose — which is how one question became ten searches for terms the user never typed, and why cost stops being a number and becomes a distribution.',
    source: 'docs/rag/AGENTIC.md',
    minutes: 11,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'graph',
    track: 'patterns',
    n: 4,
    short: 'Graph',
    title: 'Building a map first, because some questions have no passage',
    lede: '"What are the themes across these thousand files" has no answer in any chunk, so the corpus is read once into a graph and summarised by community — and eighteen months later the same lab showed the expensive half was largely deferrable.',
    source: 'docs/rag/GRAPH.md',
    minutes: 12,
    needs: 'lesson 2 of the machine',
  },
  {
    slug: 'multimodal',
    track: 'patterns',
    n: 5,
    short: 'Multimodal',
    title: 'The page is not the text on the page',
    lede: 'A table means something because of where the numbers sit, and text extraction throws that away before anything is embedded — so either a vision model describes the page, or the page is never turned into text at all.',
    source: 'docs/rag/MULTIMODAL.md',
    minutes: 11,
    needs: 'lesson 2 of the machine',
  },
```

Total 55 minutes, which `TOTALS.hours` picks up on its own.

### 3d · Counts

**Nothing to do, and that is the point.** `TOTALS` derives from
`LESSONS.length`, `TRACKS.length` and the minute sum. Do not write `22`, `four
tracks`, or a reading estimate anywhere. That was drift incident four, in the
navigation of the site whose last lesson is about drift.

After adding these, grep for literals before you finish:

```bash
grep -rn "seventeen\|17 lessons\|three tracks\|3 tracks" apps/web/veresk-app/src docs/SITE.md ../../CLAUDE.md
```

Note the SSR trap recorded in `PROGRESS.md`: `grep -c 'NN lessons'` against the
*rendered* page returns nothing even when it is correct, because React's SSR
markers split the number (`lessons · <!-- -->3<!-- --> tracks`). Grep the source,
not the output.

---

## 4 · Pages and routes

Routes are **file-based** (`routes/learn.<slug>.tsx` → `routeTree.gen.ts`).

```
apps/web/veresk-app/src/pages/learn/Hybrid.tsx
apps/web/veresk-app/src/pages/learn/Corrective.tsx
apps/web/veresk-app/src/pages/learn/Agentic.tsx
apps/web/veresk-app/src/pages/learn/Graph.tsx
apps/web/veresk-app/src/pages/learn/Multimodal.tsx

apps/web/veresk-app/src/routes/learn.hybrid.tsx
apps/web/veresk-app/src/routes/learn.corrective.tsx
apps/web/veresk-app/src/routes/learn.agentic.tsx
apps/web/veresk-app/src/routes/learn.graph.tsx
apps/web/veresk-app/src/routes/learn.multimodal.tsx
```

Each route follows the existing one exactly:

```tsx
/** `/learn/hybrid` — lesson 1 of the patterns track — Two searches. */
import { createFileRoute } from '@tanstack/react-router';
import { Hybrid } from '../pages/learn/Hybrid';

export const Route = createFileRoute('/learn/hybrid')({
  head: () => ({ meta: [{ title: 'Two searches, because one is reliably wrong about different things · Veresk' }] }),
  component: Hybrid,
});
```

`routes/learn.tsx` is the layout and needs no change — the rail reads `LESSONS`.

**The `/learn` layout has no `ssr.external` list and must keep none.** Every
figure on these pages is baked in at build time from a document in `docs/`.
Nothing here opens a database, calls a model, or needs an API route. If a page
ever wants a live retrieval demo, that list arrives in its own commit saying so.

---

## 5 · Charts

**Signatures below were read from the components on 2026-09-15, not assumed.**
An earlier draft of this section assigned `RunGrid` and `Slope` to figures
neither can draw; the UI session caught both. What follows is the corrected
mapping, and it corrects two more the UI session had not reached.

> **The jsonc blocks in `docs/rag/*.md` are DATA, not prop signatures.** Field
> names there (`detail`, `stage`, `note`, `row`) are for reading, and several do
> not match the component. The mapping is below and the peer owns it.

### Verified signatures

```ts
BarRows  rows: BarRow[]                 // { label, value: number|null, before?, display? }
         max?  unit?  labelWidth?  legend?: [string, string]
         axis?  reference?: { at: number; label: string }
         // value: null means THERE IS NO NUMBER — a refusal, not a zero. Nothing
         // in this track uses it, but do not pass null for "unknown".
         // `before` + `legend` is how BarRows draws before/after. See below.

Matrix   columns: string[]
         rows: Array<{ name, sub?, cells: Array<{ state: State; detail: string }> }>
         marks?: Record<State, Mark>    rowHeader?: string
         // State = 'live' | 'wired' | 'refuses'. EXACTLY THREE. `marks` renames
         // and recolours them; it does not add a fourth.

Funnel   stages: Array<{ n: number; label: string; op?: string; why?: string }>
         note?: string

Slope    rows: Array<{ id, from: number, to: number, note: string }>
         labels: [string, string]       worst: number
         // FOR RANK. The axis is INVERTED so 1 is at the top, and `worst` is a
         // fixed floor. Pass it an accuracy and it renders upside down.

Stages   stages: Array<{ verb, out, does, rule? }>
```

### The mapping

| figure | component | transform needed |
|---|---|---|
| `FIG-HYB-1` `FIG-COR-1` `FIG-AGT-1` `FIG-GRF-1` | `Stages` | none — the jsonc already matches |
| `FIG-MMD-1` | `Stages` ×2 | two separate `Stages`, one per family, each in its own `Figure`. It is not one chart. |
| `FIG-HYB-3` `FIG-HYB-4` `FIG-AGT-2` `FIG-AGT-3` `FIG-AGT-6` `FIG-COR-2` `FIG-GRF-3` `FIG-GRF-4` `FIG-MMD-2/3/4/5` | `BarRows` | `detail` → `display` |
| `FIG-COR-3` `FIG-GRF-5` | `BarRows` | **not `Slope`** — see below |
| `FIG-HYB-5` `FIG-AGT-5` | `Funnel` | `stage` → `label`, `note` → `why` |
| `FIG-AGT-4` `FIG-GRF-6` `FIG-MMD-6` | `Matrix` | collapse to three states — see below |
| `FIG-COR-4` | **not a `Matrix`** | see below |
| `FIG-COR-5` | `Matrix` | fixes / partial / no → `live` / `wired` / `refuses` |
| **`FIG-GRF-2`** | **NEW** | the only new component needed |
| `FIG-HYB-2` | **probably nothing** | see below |

### Five corrections, each with its reason

**1 · `RunGrid` is used by no figure here.** It draws pass/fail per case per run.
`FIG-AGT-3` is a distribution with no cases and no pass, and is now a `BarRows`
over 893 logged runs.

**2 · `Slope` is wrong for all three figures a draft gave it.** It is built for
**rank**: inverted axis, 1 at the top, `worst` as a fixed floor. `FIG-COR-3` is
*accuracy* (54.9 → 61.8, higher is better) and `FIG-GRF-5` is a *percentage*
spanning three orders of magnitude. Both render nonsense on an inverted rank
axis. Use `BarRows` with `before` and `legend: ['Self-RAG', 'Self-CRAG']` — that
is the supported before/after path and it reads the right way up. For
`FIG-GRF-5` put the magnitude in `display` ("0.1% of full GraphRAG", "0.14% —
>700× lower"); a log axis appearing once on one figure is a reading convention
taught for a single chart.

**3 · `Matrix` has exactly three states.** `State = 'live' | 'wired' |
'refuses'`, renameable via `marks` but not extensible. Three figures need
collapsing, and the collapse is a judgment — make it deliberately:

| figure | its values | → three states |
|---|---|---|
| `FIG-AGT-4` | yes · emergent · partial · shape · nearly · no | `live` = yes/nearly · `wired` = emergent/partial/shape · `refuses` = no |
| `FIG-GRF-6` | best · good · ok · worse · cannot · overkill | `live` = best/good · `wired` = ok/worse/overkill · `refuses` = cannot |
| `FIG-MMD-6` | yes · ok · best · no · NO | `live` = yes/best · `wired` = ok · `refuses` = no |

`detail` on each cell carries the original word, so nothing is lost — the
three-state glyph is the scan and the detail is the truth. Give `marks` words
that fit the question (`FIG-GRF-6` is not about liveness) and set `rowHeader`,
which defaulted to `'engine'` on callers that had no engines in them.

**4 · `FIG-COR-4` is not a `Matrix`.** CRAG's per-dataset thresholds are two
*numbers* per row (upper and lower on a −1..1 scale), and `Matrix` cells are
states with a detail string. Numbers are not states. Render it as a plain
markdown-style table in the prose, or as two `BarRows` read against each other
with a shared `max`. The finding is the **45-point spread** between PopQA's 0.59
and Biography's 0.95 — whatever draws that spread is right.

**5 · `FIG-HYB-2` probably should not exist.** `/learn/retrieval` already draws
this exact comparison, correctly, as a `Slope` over **ranks** (`ret-007` 35→1,
`ret-003` 5→2, `ret-008` 1→2, `worst: 35`). Redrawing it on the hybrid page —
especially with different numbers for the same cases — creates a second source
of truth for one measurement, which is what `/learn/drift` is about. **Link to
lesson 2 instead.** The hybrid page's own figures are `FIG-HYB-3` (the RRF
single-arm arithmetic) and `FIG-HYB-4`, and neither appears anywhere else.

If you do want a per-case figure on the hybrid page, take lesson 2's rank data
verbatim rather than the recall/rr values in `HYBRID.md` §5 — the table there is
prose, not a chart spec.

### `detail` in the jsonc maps to `note`, not `display` — and the clipping it caused is fixed

**Nothing here needs changing. This section is kept because getting it wrong was
instructive.**

Each figure's jsonc carries a `detail` string. It maps to `BarRows`'s **`note`**,
which gets its own row under the bar, *not* to `display`, which is printed at the
end of the bar in the gutter. The UI session made that call and it was the right
one — `FIG-COR-2` keeps `display: '0.654'` with `note: 'retired — must not be
used'`, so the argument sits beside the taller bar and nothing had to be
shortened.

An earlier version of this section said the opposite. It assumed `detail` →
`display`, measured every max-row string by **character count**, listed five
figures as at risk and told the reader to set `max` on each. Every part of that
was wrong:

- the mapping was wrong, so none of the five were ever at risk;
- **character count is the wrong instrument.** `1/61 = 0.0164` and
  `WWWWWWWWWWWWW` are both 13 characters and one is half again as wide. A proxy
  that is wrong in both directions cannot find the cases it misses or clear the
  ones it flags;
- and the remedy was per-figure, for a defect that was in the component.

What actually found it: a probe that calls `getBBox()` on every `<text>` in every
`.learn-chart` **after layout** and compares it to that SVG's own viewBox. Over
23 lesson routes it found **six clipped labels, five of them on pages predating
this track** — the worst on `/learn/generation`, where `110,130 input tokens`
rendered as `110,130 inpu` on the figure whose entire subject is the comparison
between those runs, while its three shorter rows printed their units in full. A
chart cut mid-word reads as deliberate.

The fix went into `BarRows`: the gutter is computed from the longest string it
will actually print, floored at 90 so charts that were already fine are
pixel-identical.

```ts
// apps/web/veresk-app/src/components/learn/charts/BarRows.tsx:141  — VERBATIM
  const gutter = Math.max(90, Math.round(longestLabel * 6.6) + 18);
```

Six clipped before, zero after, and the `max={0.024}` workaround added to
`FIG-HYB-3` came back out. **So a future figure may use a 45-character label and
will get the room.**

> **The finding, which `Path` v1 shares:** a width that only exists after layout,
> guessed at beforehand, twice, in two components. Invisible to `tsc` and to an
> HTTP 200. The probe is the durable part, and it is recorded in `SITE.md`
> beside the overflow probe.

**Why the existing sweep could never have caught it, stated precisely** — because
the next person to extend that sweep will want to know this was a blind spot by
construction rather than a miss. A `<text>` cropped by its own viewBox **is not
an overflowing element.** It is an element drawn outside a coordinate system, and
the DOM reports nothing unusual about it: no `scrollWidth`, no `clientWidth`,
nothing for `overflow: hidden | clip` to bite on. The geometry probe is not badly
written. It measures a different quantity.

That is what makes this different from the six incidents on `/learn/drift`. All
six are *a number went stale*: something was written down, something changed, the
two disagreed, and a wrong value sat on a page for a reader to catch. Here there
was **nothing to catch** — no number was wrong, nothing contradicted anything,
and on `/learn/generation` the shorter rows printing their units in full made the
cropped ones read as deliberate.

> *"Give the number a producer"* is the fix `/learn/drift` recommends. This is the
> case one step before it: some things have no producer and no claim, and the
> only way to find them is to decide what to measure.

### The one new chart

A small **fixed-layout node-link** for `GRAPH.md` §4's two-hop join. Data (four
nodes, three edges, `x`/`y` in 0–1) is in `GRAPH.md` §8.

**Not force-directed.** The point is that a path exists between two documents
sharing no passage — the topology is the argument, and a simulation that settles
differently on every render makes the argument differently each time. Hard-code
the coordinates.

### Two traps carried forward, both already paid for

**The ramp never encodes a series.** `hueOf` is position-within-track, five
stops sampled at `(n-1)/(total-1)`. `lessons.ts` records that it **fails** as a
categorical palette — adjacent pair ΔE 6.8 against a floor of 15 — and that the
finding still stands. It is legitimate *as a ramp*, read as "how far along", and
only because no chart uses it for series. Do not colour `FIG-GRF-6`'s columns
with it, or `FIG-AGT-3`'s twelve bars.

(The command `lessons.ts` quotes for that check, `scripts/validate_palette.js`,
is **not in this repo** — checked 2026-09-15; `scripts/` holds `arch-graph.mjs`,
`dep-graph.mjs` and `leak-check.mjs` only. The ΔE finding is recorded in the
comment, not reproducible from the repo. Do not cite it as a runnable producer.)

**Contrast.** `--ui-raised` on `--ui-surface` is two near-blacks about 6% apart;
a passing eval cell once rendered invisible and a 3×5 grid read as empty. "The
absence of bad news does not get a colour" is not "gets no contrast".

### Three figures where the visual default is wrong

1. **`FIG-COR-3`, ARC-Challenge 67.3 → 67.2** — a 0.1-point move. On `BarRows`
   with `before`, the two bars will be visually identical, **and that is
   correct**: the finding is "retrieval was not the bottleneck", and bars that
   do not move say exactly that. Do not exaggerate it to read as a loss. Let
   `display` and the note carry it.
2. **`FIG-COR-2`** — the **taller bar is the wrong answer.** Superseded bulletin
   0.654; its live replacement 0.518. Do not colour by value, and do not sort so
   the tall one reads as the winner. The caption has to carry it.
3. **`FIG-AGT-3`** — the tail is the finding. **Do not truncate the axis at 6
   calls.** The mode is 2 and 13.8% of runs reach 6 or more; a chart cut at the
   mode argues the opposite of the page.

The third genuine negative result in this track, `HYBRID.md` §6's RRF
single-arm finding, is `FIG-HYB-3` — two bars where **the taller one is the
document that should have lost**. Same treatment as `FIG-COR-2`.

---

## 6 · `HowItWorks` — which excerpts are real

`shape: 'verbatim' | 'assembled'`, defaulting to the strict value. The audit
that added this prop found **seven** walkthroughs carrying a paraphrase under a
real path.

Every code block in the five documents is already labelled in a comment on its
first line.

**`verbatim` is available on three pages only:**

| page | file | what |
|---|---|---|
| `hybrid` | `packages/grounding/src/hybrid.ts` | RRF fusion (210–225), `orQuery` (116–122), the generated column (84–89), over-fetch (195) |
| `corrective` | `apps/ai/insurance/src/tools/search-guidance.tool.ts` | the gate (132–163), the empty-result note (165–176) |
| `agentic` | `packages/agent/src/core/loop.types.ts` (23–36) · `search-guidance.tool.ts` (82–98, 27–34) · `apps/ai/steering/src/agent/loop/assess-requirement.ts` (1–8, 70–80) |
| `multimodal` | `packages/grounding/src/loader.ts` (37–49) — one excerpt, and it is the fork in the road |

`AGENTIC.md` §2 also gains a **fourth** verbatim source that is not code:
`logs/requests.jsonl`, 893 logged loop runs, with the `node -e` one-liner that
reprints the histogram. That one-liner is the figure's producer and belongs in
`source` exactly as `pnpm steering:retrieval-eval` does elsewhere. Promoting it
to a `pnpm rag:turns` script would be an improvement and is deliberately left
undone here — it touches root `package.json`, which is shared, and the figure is
reproducible without it.

**`graph` has no verbatim excerpt and must not fake one.** Every block on that
page is `assembled`. Say it on the page.

Line numbers were read on 2026-09-15 at commit `2c93733`. **Re-read each range
before pasting** — a line number is exactly the kind of fact that goes stale
silently, which is this section's own lesson.

`HowItWorks` requires `plain` (2–4 sentences, no identifiers) before the code,
and a caller cannot reorder or drop it. Each document's prose around the excerpt
is written to be that. The `trap` field is optional and nearly every one of these
has a real one — §4 of `HYBRID.md` (the arm that silently matched nothing) and
§4 of `AGENTIC.md` (a routing failure looks like a reasoning failure) are the two
best.

---

## 7 · Linking, so nothing ships orphaned

`/learn/architecture` was built, routed, rendered, passed the sweep — and was
reachable only by typing the URL, because the link lived in whichever component
someone remembered to edit. The fix was `MAP`, read by every surface.

A new **track** is read from `TRACKS` and `LESSONS` by the rail, the index and
the firm's page, so adding the entries in §3 should be enough. **Verify, do not
assume:**

- `components/learn/LessonNav.tsx` — the rail
- `pages/learn/LearnIndex.tsx` — the section index
- `pages/VereskLanding.tsx` — the firm's door

If any of those three enumerates tracks by literal rather than mapping `TRACKS`,
that is the bug this section exists to catch, and fixing it is part of this work.

---

## 8 · Checks before you call it done

```bash
pnpm typecheck        # 31/31 — the LessonSlug union catches a missing entry
pnpm leak:check       # PASS — @fde/* stays domain-neutral
pnpm arch:check       # the generated package graph still matches the manifests
pnpm build            # every package
```

Then the render sweep the last session ran: **every `/learn/*` route at two
widths**, asserting no page-level scroll, no clipped element, no lesson missing
its accent, and no page missing a link back to the map. Twenty routes becomes
twenty-five.

And three by eye, because no command covers them:

1. Open `/learn/graph` and `/learn/multimodal` and confirm **no figure on
   either reads as a repo measurement**. Those two pages have no producer.
2. Confirm `FIG-COR-2` does not read as "superseded wins".
3. Confirm `ret-008` and ARC-Challenge are visible as losses.

---

## 9 · What NOT to do

| | |
|---|---|
| **Do not mint a `rag.generated.ts`.** | `architecture.generated.ts` has `pnpm arch:check` behind it. A generated file for secondhand figures borrows that authority with no gate under it — the exact failure `/learn/drift` closes on. Hand-write these; they cannot go stale because their source is a paper, not this repo. |
| **Do not restate `docs/RETRIEVAL.md`.** | `HYBRID.md` extends it. Two documents describing one pipeline is how the numbers diverge. Link to lesson 2 rather than re-explaining embeddings. |
| **Do not write a count.** | §3d. |
| **Do not soften the losses.** | §5. Three figures are losses on purpose and each is the most informative thing on its page. |
| **Do not add a sixth pattern.** | Self-RAG, Adaptive-RAG, RAPTOR, HyDE and contextual retrieval are all covered *inside* the five, where they belong as variations. A sixth page would break the five-stop ramp for no gain. |
| **Do not touch `docs/rag/`.** | The other session owns it. If a document is wrong, message it. |

---

## 10 · Open, and honestly open

- **The fourth `Figure` kind is a recommendation, not a decision.** §0. It is
  the one judgment call in this brief, it changes a shared component, and it is
  the UI session's to make.
- **`graph` and `multimodal` have no repo anchor.** Two pages in a section
  otherwise built entirely on this repo's own runs. `GRAPH.md` §6 and
  `MULTIMODAL.md` §3 each carry the nearest true thing — the fan-out-plus-
  summariser, and the 552 unlabelled passages — and neither is a substitute.
  **If those pages feel thinner than the other three, they are, and the reason
  is real.**
- **`ret-005` is the strongest argument in this folder and it is unbuilt.** A
  two-hop question, failing for two-hop reasons, in a corpus that already
  exists. A graph would plausibly fix it. Nobody has tried, so `GRAPH.md` §4
  says "argument, not a result". Building it would turn the weakest page into
  the strongest.
