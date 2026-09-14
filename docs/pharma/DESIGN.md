# The pharma surface — the design language, and the rules that keep it

*Written 2026-09-12, after the landing page and the dossier restyle. This is the
authoritative description of how the web surface looks and why. Read it before
adding a page or a component under `apps/veresk-app/`.*

[`ARCHITECTURE.md`](ARCHITECTURE.md) says where code goes. This says what it
should look like when it gets there. The two overlap in exactly one place — the
split between `@fde/uikit` and the app — and that split is the first section
here because everything else depends on it.

---

## 1. Where a style belongs

There are two layers and the boundary between them is not stylistic tidiness.
It is the reason a second customer can reuse half of this.

| | `@fde/uikit` | `apps/veresk-app` |
|---|---|---|
| **Owns** | control sizing, severity, motion primitives, the `--ui-*` tokens | everything that knows what the product is about |
| **Colour** | only `--ui-*`, never a literal hex | free to add its own palette |
| **Examples** | `Field` `Select` `SubmitButton` `Panel` `Chip` `WorkingNotes` `RunFigures` `Prose` | `Answer` `History` `AskForm` `Landing` `DeskHeader` |

**The rule, stated once:** *the package owns how severity LOOKS, never what is
severe.* `Prose` highlights typed references but is handed the grammar.
`WorkingNotes` renders a trace line but never writes one. `Panel` draws a tone
but is told which one.

**The test:** the insurance surface next door is light, serif, and set like a
paper claims file. Any component that would break when its `--ui-*` tokens are
re-pointed to that does not belong in the package.

So: **a new component that mentions a batch, a market, a blocker or a Qualified
Person goes in the app.** A new component that is a control, a container or a
severity treatment goes in the package — and then only with a second caller, per
[`EXTRACTION.md`](EXTRACTION.md).

---

## 2. Colour

### The semantic tokens — colour that MEANS something

From `packages/uikit/src/styles/uikit.css`. These are the only colours any
component may reference by name.

```
--ui-bg       #07080b   the page
--ui-surface  #0d0f15   a panel sitting on it
--ui-raised   #13161f   a control, or a block that should lift
--ui-line     #1e232e   a divider
--ui-line-lit #2b3240   a divider under the cursor

--ui-fg       #eef2f7   text
--ui-dim      #98a2b3   secondary text
--ui-faint    #5f6878   labels, metadata

--ui-accent   #2dd4bf   ACTION and live machinery — never severity
--ui-danger   #fb7185   a blocker
--ui-warn     #fbbf24   a gap, or a human decision owed
--ui-info     #60a5fa   worth seeing, not blocking
--ui-ok       #34d399   "a tool returned something" — see the warning below
```

Reach them through `TONES` in `packages/uikit/src/tokens/tone.ts`, which hands
back class names for `text` `border` `wash` `rail` `dot`. Passing `"danger"`
states severity; passing `"red"` would be deciding what red means.

### The six hues — colour that means NOTHING, deliberately

From `apps/veresk-app/src/styles/app.css`. Local to this product on purpose: the
next customer has no use for them, and the package would be handing over a
palette it cannot explain.

```
--color-hop-1  #2dd4bf   Materials      mrd_erp
--color-hop-2  #22d3ee   Manufacture    mrd_mes
--color-hop-3  #60a5fa   Quality        mrd_qms
--color-hop-4  #a78bfa   People         mrd_hcm
--color-hop-5  #f472b6   Registration   mrd_reg
--color-hop-6  #fbbf24   Transport      mrd_tms
```

**They are a ROUTE, not a ranking.** One per system of record, in the order a lot
actually travels them, running teal → amber so the eye reads a journey rather
than six categories. That is the one thing the product is trying to say: six
databases no single query can join, walked one hop at a time.

Used in four places, and each use is the same idea: the front page's walk, the
spectrum hairline under the desk header, the rail on the summary block, and the
cycling rail on history rows.

**Where a hop hue appears, say in a comment that it means nothing.** The history
rows do. Without that, somebody reads "the amber ones" as a severity six months
from now, and they will be reading a position in a list.

---

## 3. The three colour rules

These are not preferences. Each one exists because the alternative is the
product making a claim it is built not to make.

### A zero is never green

`release-schema.ts` has no field that can carry a verdict, the schema is strict
so one cannot be smuggled in as an extra key, and `coherenceErrors()` rejects
prose that claims one anyway. **A reassuring green tile is that verdict,
expressed in the one language nobody audits.**

So: colour arrives when there is something to colour. `0 blockers` renders grey.
The summary block on a clean answer keeps its decorative rail rather than turning
green. **Bad news gets a colour; the absence of bad news does not get the
opposite colour.**

`--ui-ok` exists for "a tool returned something" — a successful trace line. Think
hard before using it for anything else.

### Counted, never quoted

Every coloured summary — the verdict headline, the count tiles, the history row
chips, which variant the summary block wears — is derived from the **structured
fields**, never from the model's prose. A row that echoed the summary could
describe a batch as clear while the panel below it lists three blockers, and the
reader would be choosing which one to believe.

Where two things rank the same fields, they share one function. `ledeTone()` and
`verdict()` mirror each other deliberately: two rankings is two rankings that
will one day disagree, and the page would say one thing in its headline and
another in its colour.

### Decoration is allowed, but it must be labelled

The aurora fields, the six hues, the spectrum hairline, the gradient card border
— all decoration, all fine. What is not fine is decoration that could be mistaken
for meaning. If a new colour is free, its comment says so.

---

## 4. Type

Two families, both already loaded.

| | | |
|---|---|---|
| **Inter** | `--font-ui-sans` | everything a person reads in sentences |
| **JetBrains Mono** | `--font-ui-mono` | display headlines, identifiers, counts, clause references, timestamps |

**The monospace is the display face, and that is a choice rather than a default.**
The obvious move on a dark technical page is a large sans headline. But a GxP
record *is* a monospaced printout — batch records, certificates of analysis,
chromatogram headers — so a mono headline at 3–7rem puts the page in its own
industry's vernacular. Use `.title-spectrum` for a hero; below that, plain
`font-mono` with `tracking-tight`.

Identifiers always take `Mono`: `LOT-IBU200-2609-B` and `-D` differ by one
character and ship to different markets under different limits. A proportional
face makes that difference harder to see, which is not a typographic problem.

**Measure:** body prose caps at 46–68 characters. The lists in the dossier are
narrower than the summary on purpose — the summary is the thing meant to be read
straight through.

**Labels** are 0.6875rem, uppercase, wide-tracked, `--ui-faint`. A label is
indented to the same inset as its control's text (`0.875rem`), or a field reads
ragged down its left edge.

---

## 5. Motion

Every animation is decoration over a page that reads correctly without it. The
catalogue, and what each one is tied to:

| class | what it is | tied to |
|---|---|---|
| `.aurora` | slow colour fields behind a page | nothing — ambient, drifts, never pulses |
| `.hop-wake` `.hop-label` `.hop-span` | the light walking the six systems | nothing — one 6.4s loop, staggered by index |
| `.title-spectrum` | the gradient drifting across a hero headline | nothing |
| `.cta-glow` / `.glow-btn` | the live control breathing | *pressable* — stops when disabled or busy |
| `.lift-in` | a page section assembling | mount |
| `.ui-note-in` | a trace line landing, with its marker | a real tool event |
| `.ui-scan` | the travelling light on the header hairline | an OPEN REQUEST, nothing else |
| `.ui-ping` | the live dot | an open request |
| `.ui-count-in` | a figure resolving | mount |

**Two rules with teeth:**

1. **A progress indicator is tied to an event, never a timer.** `.ui-scan` and
   `.ui-ping` run from `busy`, which is the stream being open. A spinner on a
   timer keeps spinning after the work has failed, which is worse than no
   spinner.
2. **`.lift-in` is for things that are on the page when it renders.** It animates
   `filter: blur()` with fill mode `both`, so anything mounting LATE sits at
   opacity zero until its delay elapses. That is what made the history rows
   invisible — they arrive from the server after the page has rendered. **Use
   `.ui-note-in` for anything that fills in asynchronously.**

**Reduced motion** is handled once, in the package, and it zeroes DURATIONS AND
DELAYS. The delay half is not optional: a staggered list holds its start frame
until its delay elapses, so killing only the duration leaves someone who asked
for less motion watching a list materialise out of nothing.

**Stagger** is `index * 55–90ms`, capped (`Math.min(i, 8)`). An uncapped stagger
makes the fortieth row wait two seconds.

---

## 6. Shape and structure

```
radius   0.5rem  controls          0.75rem  panels, tiles
         1rem    cards             9999px   chips
border   1px     always; weight comes from colour, never thickness
```

**Structural devices encode information; they do not decorate.**

- **A rail** states severity and separates items that would otherwise run
  together. `.finding-row` puts one in each finding's own tone — three stacked
  findings ran into one another, and a coloured edge lets the eye count them
  without reading them.
- **A dashed span** is a join that does not exist. The gaps between the six
  systems on the landing page are dashed because `mrd_erp` and `mrd_tms` are
  separate databases on separate credentials. A solid line would draw a join and
  be a lie.
- **A numbered node on a line** is a sequence. `.gate-line` uses it for "what
  would have to happen first" because those genuinely are gates in order. Do not
  number something that is not a sequence.
- **A count in a panel heading** is read before any of the items are.

**`.card-aura`** — a gradient border drawn as a padding-box/border-box underlay,
so the frame is one pixel of colour and the surface behind the content stays
properly dark. A gradient *behind* content tints the text and costs contrast.

---

## 7. Page shell

Both pages share it, and a third should too:

```tsx
<div className="relative min-h-screen">
  <Aurora muted />           {/* muted on a working surface, full on a front door */}
  <Header />                 {/* sticky, backdrop-blur, spectrum hairline */}
  <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28">
```

- `max-w-6xl`, gutters `px-5` on a phone and `px-6` from `sm`.
- The aurora is **muted on the desk and full on the landing page**: the front
  door gets seconds of attention, the working surface gets minutes, and content
  has to stay readable the whole time.
- Two-column working layouts are `lg:grid-cols-[17rem_1fr]`, with the narrow
  column `lg:sticky lg:top-24 lg:self-start`.
- **What a person returns to goes at the TOP of the sticky column.** The history
  sat under the working notes, which grow with every tool call, so it drifted off
  screen exactly when there was something worth going back to.

**Mobile is checked at 390px.** Twenty characters of mono headline do not fit
there; the hero steps `text-[1.75rem] sm:text-5xl md:text-7xl`. Anything with
`ml-auto` needs `sm:ml-auto`, or it right-aligns awkwardly once the row wraps.

---

## 8. Words

Same discipline as the spacing. Full guidance is in each component's header; the
rules that keep being needed:

- **Never "yes".** The strongest sentence available is *no blocker found — for
  QP review*. Not "cleared", not "approved", not "ready to ship".
- **An empty state is an invitation, not a mood.** Say what will be here and
  what will not: the history's empty state says questions asked before it existed
  are absent, because only their cost was ever recorded.
- **A failure says what happened and what to do.** It does not apologise and it
  is never vague.
- **A control that sometimes does nothing teaches people to stop pressing it.**
  "Show N more" appears only when there is an N.
- **Sentence case everywhere.** Uppercase is for 11px labels only.
- **A count in a heading is the FULL count**, even when the list below it is
  collapsed. A list that both hides rows and under-reports its size is a list
  people stop trusting.

---

## 9. Adding a page — the checklist

1. `pages/YourPage.tsx` for the composition; `routes/your-page.tsx` does nothing
   but name it. A route file is where a framework's conventions arrive, and
   mixing them into a page is how the page stops being movable.
2. State and fetching go in `hooks/`. Presentation goes in `components/<area>/`.
3. Page shell from §7. `<Aurora muted />` if it is a working surface.
4. Any severity comes from `TONES`. Any free colour is commented as free.
5. Entrances: `.lift-in` for what renders immediately, `.ui-note-in` for what
   arrives later.
6. Check it at **390px** and with **reduced motion forced**.
7. `pnpm leak:check` if you touched any `@fde/*` package.

### Verifying it

Screenshots found three bugs that reasoning did not: rows at opacity zero, a
glow painting a slab around a blank grid row, and reduced motion leaving delays
intact. **Look at the page.**

```bash
pnpm veresk:dev
google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --force-prefers-reduced-motion --window-size=1440,1400 \
  --virtual-time-budget=12000 --screenshot=/tmp/page.png http://localhost:3300/desk
```

`--force-prefers-reduced-motion` is the important flag: without it, entrance
animations are caught mid-flight and everything looks broken. With it, the page
renders at its final state — and it doubles as the reduced-motion check from
step 6.
