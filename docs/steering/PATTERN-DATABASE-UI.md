# Showing a database on a page — a reusable pattern

*Generic guidelines. Nothing here is specific to one product: it is the recipe
for turning a real schema into a page a non-engineer can read, where clicking a
table shows what is actually in it. Hand this to an agent along with a database
connection and a page to build.*

---

## What this pattern produces

Three things, in this order, and they are worth separating because each one
fails differently:

1. **A generated description of the schema** — tables, row counts, columns, and
   one real sample value per column. Produced by a script that talks to the
   database. Committed.
2. **Hand-written prose about each table** — what it is, where it came from,
   what it lets you ask. Cannot be generated, must be written, and must be
   *forced* to stay in step with (1).
3. **A page** that draws each table as a table, groups the tables by where they
   came from, and opens one real row on click.

The split matters. Numbers drift, prose does not; if you write them in the same
file, somebody hand-edits a row count and the page starts lying.

---

## 1 · The generated layer

### Run introspection, write a typed file, commit it

Write a script that connects to the database and emits a source file. Not JSON
loaded at runtime — a source file, so the build typechecks against it and the
page has no database dependency.

```
scripts/describe-db.ts   →   src/lib/estate.generated.ts
```

Emit, per table:

| field | why |
|---|---|
| `name` | the table name |
| `rows` | exact count, not an estimate — `count(*)`, and if that is too slow the number is not worth showing |
| `columns[].name` | in ordinal order, as the database reports it |
| `columns[].sample` | **one real value**, nullable |
| `measuredBy` | the command that produced this, printed on the page |
| `measuredAt` | a date, printed on the page |

Also emit a **union type of every table key**:

```ts
export type TableKey = 'schema.table_a' | 'schema.table_b' | ...;
```

That single line is what makes step 2 safe. See below.

### Why a real sample value, and the rule that comes with it

A column list explains nothing. `charge_code_raw` and `charge_code_key` next to
each other are two names; with their real values next to them a reader can see
that one is as the file wrote it and the other is normalised. The sample is the
difference between a schema dump and an explanation.

**The rule that must come with it:** a sample value is real data on a public
page. Before this ships, classify every table:

- *safe* — synthetic, reference, or already public.
- *redact* — real but structurally interesting: emit a shape (`AAA-0000`,
  `name@example.com`), not the value.
- *never* — free text a human typed, anything identifying. Emit `null` and let
  the page render "not shown".

Put the classification **in the generator**, keyed on table name, and default to
`never` for anything unclassified. A new table then arrives redacted rather than
published, which is the safe direction to be wrong in.

### Freshness

Print `measured by <command> · <date>` on the page, in small type. It converts
"trust me" into "here is how to re-derive it", and it makes a stale page look
stale instead of looking current.

---

## 2 · The hand-written layer, and how to force it to stay in step

For each table, write three plain sentences:

- **what it is** — one line, no jargon.
- **where it came from** — which source, by which process.
- **what you can ask now** — the question this table makes answerable. This is
  the one people actually read.

Plus, optionally, one line per column, in plain words rather than the column
name restated.

Key the whole thing on the generated union type:

```ts
export const NOTES: Record<TableKey, TableNote> = { ... };
```

**This is the load-bearing trick in the whole pattern.** `Record<Union, T>` is
exhaustive: add a table to the database, re-run the generator, and the build
fails until somebody writes the sentences. Without it, new tables silently
appear on the page with no explanation and nobody notices for months.

Do the same for anything else keyed by table — colours, groupings, ordering.

---

## 3 · The page

### Draw a table as a table

The instinct is a rounded card with a name and a count. That is the shape of a
button and it says nothing. A table has a header and rows; draw that:

```
┌───────────────────────────────┐
│ timesheet_lines      10,688   │  ← header bar, tinted, name + row count
├───────────────────────────────┤
│ line_id                       │
│ file_id                       │  ← first 3–5 columns, one per line,
│ week_ending                   │     hairline between them
│ +7                            │  ← how many more there are
└───────────────────────────────┘
```

Rules that make it work:

- **Real columns, in schema order.** The moment they are decorative, the drawing
  is a lie and a reader who knows the schema will spot it.
- **Cap at 4–5 and count the rest.** A card is a handle, not the full story.
- **`text-overflow: ellipsis` with `white-space: nowrap`** on the column line —
  a long column name must not change the card's width.
- **Equal heights across a row**: `li { display: grid }` on the grid child and
  `height: 100%; align-content: start` on the card. Otherwise a table with four
  columns and one with eleven leave a ragged edge.

### Do not draw a cylinder per table

The cylinder is the universal symbol for *a database*. If all the tables live in
one database, one cylinder for the page and none on the tables is the truthful
drawing. Using it per table says there are twelve databases. Pick the drawing
that matches the cardinality, every time.

### Group by where the rows came from

Ungrouped, a list of twelve tables is twelve equal things. Grouped by the
process that produced them — with the group carrying that process's number and
colour from earlier on the page — the page answers "what did that step actually
make?" without a sentence asking the reader to remember.

If one table is assembled from the others, take it out of the groups and give it
its own panel at the end. It is the point, and burying it among its ingredients
loses that.

### Colour is a claim; use one scale per claim

Pick two or three scales and write down, in a comment, what each one means —
e.g. *warm = systems the customer runs*, *cool = things we derived*. Then never
mix them. A reader learns the rule in about four seconds if it holds everywhere
and never learns it if it does not.

Tables read out of the same source get the same hue; that is usually the only
thing worth encoding at the tile level.

---

## 3b · The implementation recipe

**Stack this was built on:** React 19 + plain hand-written CSS. No CSS-in-JS, no
component library, no design-system package. The dialog uses `createPortal`; the
grow-from-origin uses `getBoundingClientRect`. If you are translating to another
stack, these are the four mechanisms to carry over — everything else is
ordinary markup.

### Page skeleton

```
<section>
  <h2>            one sentence, the claim the section makes
  <p>             intro, with the total row count COMPUTED from the data
  for each group:
    <header>      [n] Label ................... N rows (computed)
    <p>           one line: what this step did to get them
    <ul grid>     one table card per table
  <panel>         the assembled/join table, if there is one, with its own copy
  {dialog}        rendered only when something is open
</section>
```

### Tone threading — one custom property, set once

Set the group's hue **once**, inline, on the group container. Every descendant
derives its entire palette from it and none of them names a colour:

```tsx
<section className="group" style={{ '--tone': group.tone } as React.CSSProperties}>
```

This is what makes "one colour scale per claim" enforceable instead of
aspirational: a card cannot get the wrong hue, because it does not know any
hues. Adding a fourth group later means adding one value, not editing CSS.

### The `color-mix` ladder

One hue in, a coherent card out. These percentages are worth copying verbatim —
they are tuned so that a saturated tone and a pale one both land in the same
visual weight, because `oklab` mixes perceptually rather than in sRGB:

| part | recipe |
|---|---|
| card background | `color-mix(in oklab, var(--tone) 4%, transparent)` |
| card border | `color-mix(in oklab, var(--tone) 24%, var(--line))` |
| header bar background | `color-mix(in oklab, var(--tone) 12%, transparent)` |
| row-count text | `color-mix(in oklab, var(--tone) 80%, var(--dim))` |
| hover border | `color-mix(in oklab, var(--tone) 55%, var(--line))` |
| hover background | `color-mix(in oklab, var(--tone) 9%, transparent)` |
| group rule (left edge) | `color-mix(in oklab, var(--tone) 40%, transparent)` |

Always mix toward `transparent` for fills and toward the neutral line colour for
borders. Mixing a fill toward the page background instead looks identical until
the component is placed on a different surface, and then it is a visible patch.

### Responsive without media queries

```css
.grid { display: grid; gap: 0.375rem; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
.grid > li { display: grid; }          /* so the card can fill the track */
.card { height: 100%; align-content: start; }   /* equal heights, content at top */
```

`auto-fill` + `minmax` is the whole responsive behaviour: five across on a wide
screen, one on a phone, no breakpoints to maintain. The two extra lines are what
stop a four-column table and an eleven-column one leaving a ragged edge.

### Glyphs that work under more than one convention

If a drawing is shared between contexts that name their tone variable
differently, chain the fallbacks rather than wrapping it:

```jsx
stroke="var(--tone, var(--node, currentColor))"
```

One SVG, correct in both, and it degrades to the text colour where neither is
set.

---

## 4 · The detail view

### Open it from the thing that was clicked

Measure the clicked element's rectangle and animate the dialog out from it. The
reader's eye is already there, so nothing has to be re-found.

```ts
const rect = el.getBoundingClientRect();
// pass {x, y, w, h} to the dialog; use it as transform-origin / start frame
```

**The one bug everybody hits:** `position: fixed` is relative to the viewport
*only* if no ancestor has `transform`, `filter`, `perspective`, `backdrop-filter`
or `will-change` on those. Any of those makes that ancestor the containing
block, and your full-screen scrim becomes the size of a card halfway down the
page.

Two things follow, and you need both:

1. **Render the dialog through a portal to `document.body`.** Do not rely on the
   markup's position in the tree.
2. **Beware `animation-fill-mode: both`.** An element that has finished an
   entrance animation still has `transform: matrix(1,0,0,1,0,0)` applied — an
   identity transform, visually nothing, and it creates a containing block
   exactly like a real one. Sections with entrance animations are the usual
   culprit.

Verify it by measurement, not by eye: the scrim's `getBoundingClientRect()`
height must equal `innerHeight`. If it is 3,887 instead of 860, you have this
bug.

### What goes inside

Three plain answers and **one real row**:

```
where it came from     one sentence
what you can ask now   one sentence

one row, column by column
  ┌──────────────────────────────────────────────┐
  │ column_name                    real value    │
  │ what this column means, in plain words       │
  ├──────────────────────────────────────────────┤
  │ ...                                          │
```

- Value on the right, monospace, `overflow-wrap: anywhere`.
- Null renders as *empty* in italic dim type, not as a blank — a blank looks
  like a rendering bug.
- Keep the column name visible even though it means little to a lay reader:
  somebody in the room will want to write the query.

### The interaction floor

- The card is a real `<button>`, so it is reachable by keyboard and announced.
- `:focus-visible` outline, always. Hover-only affordances exclude keyboard users.
- Escape closes; clicking the scrim closes; focus moves into the dialog on open
  and returns to the trigger on close.
- `prefers-reduced-motion: reduce` disables the grow-from-origin and the hover
  lift; the dialog still opens.
- Lock body scroll while the dialog is open.

---

## 5 · Layout traps to check before declaring it done

**Grid and flex children default to `min-width: auto`.** They will not shrink
below their content's minimum width. One `<pre>` or one long unbroken string
then pushes the *whole page* into horizontal scroll, on desktop as well as
mobile. Put `min-width: 0` on every grid/flex child that can contain wide
content. This is the single most common cause of "why does my page scroll
sideways".

**Do not ship a horizontal scrollbar as a design element.** Inside a card, wrap
(`white-space: pre-wrap; overflow-wrap: anywhere`) instead. Sideways scroll
inside a page is a gesture almost nobody performs, so the content at the end of
the line is effectively invisible.

**`translate(-50%, -50%)` moves paint, not layout.** The element still occupies
its original box, so a "centred" absolutely-positioned node can create overflow
somewhere you are not looking. Give it zero size, or clip the container
(`overflow: clip` with an `overflow-clip-margin` large enough for the glyph).

**Watch for class-name collisions in unlayered CSS.** A generic name like
`.field` or `.card` written as plain CSS beats a utility class from a framework
in the cascade, and the damage shows up in a component you did not touch. Prefix
everything in a pattern like this (`.tbl-`, `.land-`), and grep before naming.

---

## 6 · Verify by measurement, not by eye

Screenshot at a wide and a narrow viewport and *look at them*; then assert the
things eyes are bad at:

```js
document.documentElement.scrollWidth <= innerWidth   // no horizontal overflow
scrim.getBoundingClientRect().height === innerHeight  // dialog really is fixed
dialog.getBoundingClientRect().top >= 0               // it is on screen
```

A headless browser run at 1280 and 390 catches essentially all of the traps in
section 5, and catches them faster than reading the CSS does.

---

## 7 · Copy rules

- **Expand every abbreviation once.** A schema prefix is obvious from the inside
  and invisible from outside. That is the whole failure mode of writing about
  your own system.
- **A name is not an explanation.** "Six tables in `app_derived`" tells a new
  reader nothing. Say what they hold and what they let you ask.
- **Never hardcode a number that the generator produces.** It will drift, and a
  wrong number on the page discredits the right ones next to it. If a heading
  wants a count, compute it.
- **Say what is missing.** If half the sources produced no rows, draw them and
  label them *not read yet*. A page that quietly omits them makes the work look
  further along than it is, and that is the one error a customer will remember.

---

## Checklist

- [ ] Generator script connects to the DB and emits a committed, typed source file
- [ ] Emits `rows`, `columns[].name`, `columns[].sample`, `measuredBy`, `measuredAt`
- [ ] Emits a union type of table keys
- [ ] Sample values classified safe / redact / never, defaulting to `never`
- [ ] Prose notes stored as `Record<TableKey, Note>` so a new table fails the build
- [ ] Tables drawn as tables: header bar, real columns, `+N` for the rest
- [ ] One cylinder for the database, not one per table
- [ ] Grouped by what produced them, in that producer's colour
- [ ] Colour scales documented, one meaning each, never mixed
- [ ] Cards are `<button>`, equal height, ellipsised column names
- [ ] Dialog portals to `document.body` and grows from the clicked rect
- [ ] Dialog: Esc, scrim click, focus in and back, body scroll lock, reduced motion
- [ ] Dialog shows one real row with a plain sentence per column; null renders as *empty*
- [ ] `min-width: 0` on every grid/flex child that can hold wide content
- [ ] No horizontal scroll at 390px — asserted, not eyeballed
- [ ] No hardcoded counts anywhere in the copy
