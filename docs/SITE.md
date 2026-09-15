# The web surface — three apps, two shared packages, and the decisions behind them

*Written 2026-09-13, at the end of the session that split the site into separate
deployments and rebuilt Vantis Steering's page. Everything below is on disk and
committed; this is the account of WHY, which the code cannot carry on its own.*

> **Scope.** This is about what is deployed and how the front end is put
> together. `docs/steering/PLAN.md` and `docs/steering/SORTING.md` are the
> engagement and its data pipeline; `docs/pharma/DESIGN.md` is the surface's
> palette, type and motion rules, which still govern everything here.

---

## What exists now

```
apps/insurance-app   @claims/insurance-app   Meridian Mutual. Port 3000, pnpm dev.
                                             Untouched by this work.
apps/veresk-app      @veresk/app             The firm's door at `/`, and Meridian
                                             Pharma's pages: `/pharma`, `/desk`,
                                             `/supplier`, `/data-flow`.
                                             Port 3300, `pnpm veresk:dev`.
apps/steering-app    @vantis/steering-app    Vantis Steering, at `/` of its own
                                             deployment. Port 3400,
                                             `pnpm steering:dev`.

packages/uikit       @fde/uikit              Liftable into a customer's repo.
                                             Controls, severity, motion, tokens.
packages/surface     @veresk/surface         THIS SITE's shared parts. Not
                                             liftable, and not meant to be.
```

**Each engagement is its own deployment, which is why they are separate apps
rather than separate routes.** The firm's page links across by URL
(`VITE_STEERING_URL`, defaulting to the dev port), and a link that crosses an
origin should not be able to pretend it does not. A typed
`<Link to="/steering">` would have compiled, looked identical, and 404'd the
moment the two were deployed apart.

---

## The three-layer split, and the line between layers

| | what it is | may it use Tailwind utilities? |
|---|---|---|
| `@fde/uikit` | the layer a customer could lift into their own repository | **no** |
| `@veresk/surface` | this site's shared parts — the estate explorer, the hero wash, the numbered step, the database and pages drawings | yes, at a cost |
| the app | everything only that app draws | yes |

### Why `@veresk/surface` had to exist

`EstateExplorer`, `Aurora`, `RouteProgress` and two glyphs were shared between
two ROUTES; splitting the apps made them shared between two APPS. The obvious
home was `@fde/uikit` and it is the wrong one, for two reasons:

1. **It knows too much.** `EstateExplorer` knows what a *system of record* is,
   that some of them may not publish sample values, and that a thing in an
   estate might not be a database at all. Three of this firm's judgements, in a
   package meant to leave the building.
2. **The mechanical one, which would have failed silently.** `@fde/uikit` uses
   no Tailwind utility classes, and that is load-bearing. Tailwind v4 does not
   scan `node_modules`, so a package carrying utility classes renders unstyled
   unless the consumer names it with `@source`. A consumer who forgets gets a
   blank-looking page **from a build that succeeds** — the same failure shape
   `apps/veresk-app/vite.config.ts` already documents for `@fde/guard`.

So `@veresk/surface` is allowed utilities, because it has exactly three
consumers — pharma, steering and veresk — all in this repo, all carrying the
line:

```css
@source '../../../../../packages/surface/src';
```

**Count the levels.** It was four until the apps moved from `apps/<app>/` to
`apps/web/<app>/`, at which point all three resolved to `apps/packages/surface/src`
— a directory that does not exist.

**A WRONG path fails exactly like a missing one, and that is the trap.** Tailwind
does not error on a `@source` that matches nothing. It scans no files, emits no
classes for them, and the build SUCCEEDS. Every utility used only inside
`@veresk/surface` silently stopped being generated in all three apps, and the
first visible symptom was a shared component rendering with its layout classes
gone: numbered markers sitting on top of their own titles. `tsc` passed,
`vite build` passed, and `pnpm build` passed.

So: this line is invisible in every check this repo has, and is verified by
looking at the page. If you move an app, re-resolve it:

```bash
for f in apps/web/*/src/styles/app.css; do
  rel=$(grep -oE "@source '[^']+'" "$f" | sed "s/@source '//;s/'//")
  [ -d "$(dirname "$f")/$rel" ] || echo "BROKEN: $f"
done
```

---

## Vantis Steering's page, section by section

The order is the argument, and it changed twice during the session.

1. **Hero** — *"What of this do we already have?"*
2. **Four answers, two weeks, one bid** — the four bid questions.
3. **What they gave us, and what we made of it** — two rows of openable tiles.
4. **From 1,069 files to rows we can stand behind** — the three pipeline stages.
5. **And the answer key we mark ourselves against** — the customer's four.
6. **Nothing here answers anything yet** — the state panel.

### §3 — the two rows

Eight source groups on top, six `vst_kb` tables underneath, a rule between them
reading *"read, with the line it came from"*. Both rows open.

- **The top row opens onto the real files** — the first fourteen lines of one
  real file per group, verbatim, `#` comments and quoted commas intact.
  Describing a rate card cannot convey that the year it applies to lives in a
  comment above the header; the file conveys it instantly.
- **The bottom row opens onto the table it became** — every column with its real
  stored value AND a sentence saying what that column means. The first version
  was a column list with samples, and it told a reader nothing: it showed
  `charge_code_raw` and `charge_code_key` with two identical-looking values and
  left them to work out why there were two.
- **Four of the eight top tiles produce nothing yet** and are drawn dashed, grey,
  and unresponsive to hover. 738 of the 1,069 files have produced no rows at
  all; a row that quietly omitted them would make the reading look four times
  further along than it is.

### §5 — why the answer key is last and not first

It used to lead. In that position it read as *"here is the estate"* — the exact
framing `PLAN.md` retracted, because the four databases were generated alongside
the documents rather than derived from them. **A reader met the cheat before
they met the customer's actual files.** Moved below the reading it measures, it
says the true thing: this is the yardstick, and here is the shape a finished
answer has to arrive in.

It was also **narrowed** — `vst_kb` and the corpus card left it for §3, where
they are openable and explained. That caught a real bug: the figures said
*5 databases, 43 tables* above **four** tiles, because the count came from
`ESTATE` and the tiles from a filtered list. Anything a reader can count on
screen must be computed from the thing they are counting.

---

## Colour, and the two scales that must not be confused

| | hues | means |
|---|---|---|
| `--color-vst-1..4` | green, lime, orange, red-orange | which of Vantis's four systems |
| `--color-src-1..6` | cyan, blue, indigo, violet, fuchsia, pink | read out of the files, by us |

**Warm is theirs, cool is ours**, and no hue is shared or within reach of
another — the two scales sit a few hundred pixels apart on one page.

**The pairing is the information.** `Timesheets` and `timesheet_lines` carry the
same cyan because one was read out of the other. A reader can run their eye down
the page and see which pile became which table without being told once.

**Nothing is green.** Green means "nothing found" in the shared severity
palette, and a green tile on a page about extraction would read as *this one is
fine*, which is a claim none of them makes.

Pharma's six hop hues (teal → amber) are **not** defined on this deployment, so
that whole range was free to use. Each app's stylesheet holds its own palette;
the moment two customers' palettes share a file, somebody uses the wrong one.

---

## Bugs found and fixed along the way

Five of these were mine. The first was live on the deployed site.

### A dev fallback compiled into the production bundle

The firm's deployed page linked to **`http://localhost:3400`**. `links.ts` read:

```ts
export const STEERING = import.meta.env.VITE_STEERING_URL ?? 'http://localhost:3400';
```

with a comment arguing a dev default beats a dead card locally. The argument is
fine; the code was wrong twice. **`import.meta.env.*` is inlined at BUILD
time**, and the Docker build sets nothing — so the literal was compiled into the
production bundle. And `apps/steering-app` is deliberately not deployed, so no
correct value existed to set anyway.

**A fallback that is right in development and wrong in production is worse than
no fallback**, because it cannot fail locally and always fails deployed.

The fallback is now scoped with `import.meta.env.DEV`, a compile-time constant.
A production build gets `null`, and the page renders that engagement the way it
already rendered Meridian Mutual: visibly not a link, saying where it runs. That
pattern was three feet away the whole time. Same fix applied in reverse to
`apps/steering-app/src/lib/links.ts`.

`VITE_STEERING_URL` is now a documented `ARG` in `infra/veresk/Dockerfile` and a
(blank) `build-args` entry in the workflow, so wiring it up the day steering is
deployed is a one-line change in a place somebody will find.

**Check it the way it was checked here** — build, then read what is served:

```bash
pnpm --filter @veresk/app build
PORT=3399 node apps/veresk-app/dist/server/server.js &
curl -s localhost:3399/ | grep -c 'localhost:'
```

### `.ui-field` — a class-name collision that broke two pages

`FieldList` (estate rows) took the class name `.ui-field`, which the form
`Field` component had used since long before. **Unlayered CSS beats Tailwind's
utilities**, so `display: flex` won over the `grid` the form passes: every
control on the release desk and the supplier form collapsed to its content
width, labels shrank to 10px, and each row grew a bullet and a bottom rule.
"EU" rendered as a bare globe; "Agents SDK" as "Ag".

The estate set is now `.ui-datum`; the form keeps `.ui-field` because it was
there first. **A typecheck cannot see a class-name collision, and neither can a
screenshot of the page that still looks right.**

### The flow map's phantom horizontal scrollbar

The nerve map was horizontally scrollable **at every width, including 1440px**,
and scrolled 58px to reveal nothing. Cards are centred on their node with
`translate(-50%, -50%)`, and **a transform moves what is painted without moving
what is laid out** — so a node anchored at 88.4% held a full-card-wide layout box
running past the right edge. Fixed with `width: 0; height: 0` on the anchor plus
`overflow: clip; overflow-clip-margin: 1rem` on the stage. The 1rem is measured:
1.5rem leaves 4px behind, 4rem brings the whole thing back.

Genuine scrolling below ~960px is unaffected, which is what the scroller is for.

### The dialog's scroll lock

`OriginDialog` set `overflow: hidden` on `<html>` and restored it on close. It
now also captures and restores `scrollY`, compensates the scrollbar gutter so the
page cannot jolt sideways, and uses `behavior: 'instant'` so the restore cannot
animate. **Not proven against the reported symptom** — headless Chrome has no
scrollbars, which is exactly the condition under which the original behaves.

## The two shared drawings, and how to reuse them

Both were built for one engagement, then needed by a second. Both are now in a
shared package with the second caller proving the interface — not before.

### `Journey` — the hop-by-hop walkthrough · `@veresk/surface`

The "where your data goes" walk on both the pharma and steering pages. You give
it `Turn[]`; it draws the rail, the travelling light, the numbered markers and
the lane colours. It knows nothing about either domain.

```tsx
import { Journey, type Turn } from '@veresk/surface';

const TURNS: Turn[] = [{
  label: 'Five searches — 40 passages out, 1,069 files stay',
  n: '3',                       // optional: step number, a string so "2–6" works
  plain: 'Up to 10 passages leave per search, about 900 bytes each.',
  example: 'requirements/…_RevB.md:41\n  "… at least 8000 N at the rack …"',
  note: '5 model requests. Passages 10, 0, 10, 10, 10 — 1487/934/2092/1389/1523 ms.',
  crosses: true,                // drives the whole block's tone
  hops: [{
    where: 'crosses',           // browser · yours · crosses · back
    title: 'Only the matched passages cross',
    plain: 'Up to 10 passages leave, to one host — about 900 bytes each.',
    payload: 'role: "tool", name: "search_documents"',
    detail: 'Each passage carries the file and the line it starts on.',
  }],
}];

<Journey turns={TURNS} />
```

**`n`, `plain` and `example` are optional**, which is how steering added them
without touching pharma's page. `plain` and `example` exist because the page has
two readers: the payload and `detail` are for somebody who will grep them
against the source, and a compliance reviewer needs a different thing at the
same step — which data, and to whom. That used to live in a separate block of
questions above the walk, which meant reading the answer in one place and its
evidence in another.

**The rule that makes it worth having: every payload is real.** Tool and
argument names come from the source; counts and timings come from a recorded
run (`worked-example.generated.ts` for steering, `ask_history` for pharma). A
diagram with invented field names is one a reviewer disproves with a single
grep, and then nothing else on the page survives either.

**Lane colour is the boundary, not decoration.** `--color-flow-person`,
`--color-flow-internal` and `--color-flow-model` are the only three, and every
payload box is tinted with its own lane at 4.5% — enough to group by eye, far
too little to read as a highlight. Before that, every box was the same grey
except the crossing one, so the palette said "this one is different" and nothing
about the rest.

### `FlowMap` — the node map · `@fde/uikit`

Steering's `AssessMap` and pharma's `NerveMap` are both this component. Two
traps are already fixed in it and are worth knowing before building anything
that flips a card:

**Do not rotate the element that receives the pointer.** The card used to rotate
as a whole. Hit testing uses *transformed* geometry, so half way through the
520 ms turn the button was edge-on and its hit area was about 1px wide — the
pointer sitting still fell out of it, `mouseleave` fired, it turned back,
`mouseenter` fired, and it juddered. The two faces rotate now and the button
stays a stable rectangle; the faces are `pointer-events: none`.

**A container's `onMouseLeave` does not tell you a card was left.** It fires at
the outer boundary only, so a card stayed open until the pointer left the entire
map. Each node needs its own.

**Measure back faces against their box.** On steering's map, 7 of 13 cards —
4 of its 7 card kinds — were overflowing by 2–16px and being clipped by
`overflow: hidden`, the last line of an explanation simply gone from a page that
renders without a warning. The shape of the check is `back text scrollHeight +
tag + rowGap + padding` against `getBoundingClientRect().height`. It only bites where a box has BOTH a fixed
height and `overflow: hidden`; `Journey`'s payload boxes have neither.

### The rule both of them taught, the expensive way

**A shared component's CSS has to move with it.** `Journey` was lifted into
`@veresk/surface` so two apps could draw the same walkthrough; its CSS stayed
behind in pharma's `app.css`. The second consumer rendered the markup with none
of the rules — markers on top of titles, badges overlapping the text beside
them. It typechecked, it built, and it was wrong only on screen.

Both apps already `@import '@veresk/surface/styles.css'`, so the fix was to move
the rules there too and neither app needed a line changed. **If you share a
component, grep its class names and its custom properties, and move those with
it.**

---

### `@fde/uikit` additions, both on a measured second caller

- `Tile` gained `className` (two pages were hand-rolling `<div className="ui-tile …">`)
  and `style` (so a row can land in reading order).
- Neither was added speculatively.

---

## Generators, and the rule they all follow

Every figure on these pages is printed by a command, and the command is on the
page beside it.

```bash
pnpm steering:estate        # the databases → apps/steering-app/src/lib/estate.generated.ts
pnpm steering:corpus-web    # the files     → apps/steering-app/src/lib/corpus.generated.ts
pnpm steering:corpus-check  # asserts the traps are still IN the files
pnpm steering:kb-reconcile  # what the parse produced vs the answer key
pnpm pharma:estate          # the pharma equivalent
```

`estate-web.ts` and `corpus-web.ts` are **deliberate siblings, not a shared
thing** — one walks `information_schema`, the other walks a directory, and every
line they have in common is a coincidence of both being small.

`readDatabase` takes a **URL, not a database name**, and that is the whole
`vst_kb` story in one signature: `urlFor` runs `assertOurs`, which throws by
design on anything outside the customer's four, including our own index.
Reaching `vst_kb` by loosening that guard would delete the thing that stops a
mistyped base URL dropping somebody else's estate.

**The type system is the drift check.** `estate-notes.ts` types its map as
`Record<EstateTableKey, string>` over the generated union, so a table added
without a note is a failing typecheck. This bit for real when `vst_kb` arrived
with six tables — exactly as intended.

---

## Deployment

**One workflow, `.github/workflows/deploy.yml`, four jobs in a chain:**

| | job | why it is here |
|---|---|---|
| 1 | build steering image | |
| 2 | deploy steering + smoke test | |
| 3 | build veresk image | takes the steering URL from the job that just watched it return 200 |
| 4 | deploy veresk + smoke test | asserts the firm's page carries that URL, and that the guard still 401s |

**The order is the whole design.** The apps link to each other and
`import.meta.env.VITE_*` is inlined at BUILD time, so the firm's page has to
know the engagement's URL before its own image exists. Two independent
workflows racing on one push cannot guarantee that, and did not: a hard-coded
URL was baked in before the app it named was created, and the live site served a
404.

Three bugs came out of that and all three are now closed in the pipeline:

- **the URL is resolved, not written down** — `az containerapp show` at build
  time, and an app that does not exist resolves to empty, which `links.ts`
  renders as visibly-not-a-link rather than as a guess;
- **the app is created if missing** — a run failed with *"The containerapp
  'steering-app' does not exist"* after building and pushing the image, for want
  of a one-time command nobody had run. A pipeline needing an undocumented
  manual step fails exactly that way;
- **the deploy identity needs Contributor on the RESOURCE GROUP.** It was
  scoped to `containerApps/pharma-app` alone — correct when there was one app,
  and the cause of a red run when there were three. And the check was written
  as `az containerapp show -n "$APP" || create`, which reads "may not read it"
  and "is not there" as the same answer: `show` failed on an app that existed,
  the create branch fired, and the run died saying the managed environment
  "does not exist". **Two failures that need opposite responses must not share
  a branch.** It now lists the group — if the list fails that is reported as a
  permissions problem, and only a successful list with the name absent means
  create;
- **the veresk job has no create branch, deliberately** — that app carries two
  secrets and an identity with a Foundry role, and a create-if-missing would
  quietly stand up a credential-less copy that 500s on every question.

**Live today:**

| | |
|---|---|
| `veresk` | https://veresk.yellowsmoke-eeb8b48f.swedencentral.azurecontainerapps.io |
| `steering-app` | https://steering-app.yellowsmoke-eeb8b48f.swedencentral.azurecontainerapps.io |

`veresk` was `pharma-app` until 2026-09-13. Azure has no rename for a container
app, so it was a recreate — and `FOUNDRY_OPENAI_ENDPOINT` carries an
`/openai/v1` suffix that a hand copy dropped. Caught by diffing the env vars
old-against-new rather than eyeballing them; it would have shipped a page that
loads and fails on the first question. **A recreate also gets a new identity
principal, so the Foundry role assignment has to be made again.**

`pharma-app` is still running and is not referenced by anything. Deleting it is
one command and is left as a decision rather than taken:

```bash
az containerapp delete -n pharma-app -g rg-claims-fde --yes
```

## Verification, and what is NOT verified

Run after any change here:

```bash
pnpm typecheck     # 23/23
pnpm leak:check    # PASS — @veresk/surface is exempt, it is not @fde/*
pnpm build         # 13/13
```

Screenshot verification was done with headless Chrome over the DevTools
Protocol; the pages were checked at 1440 and at 390 CSS pixels, with zero
horizontal overflow at both, and both estate dialogs opened and read.

**Not verified:**

- **The veresk image has still not been built end to end since the split.** The
  steering one has — it builds, runs, and serves its page at 362 MB — which is
  good evidence that `@veresk/surface` resolves through `pnpm deploy --prod`,
  since that image carries it too. The veresk build is the larger one and is
  what filled the disk last time. Run:
  `docker build -f infra/veresk/Dockerfile -t veresk-app:dev .`
- **The scroll-to-top report.** Could not be reproduced headless. The one place
  that touches the document scroller is hardened; if it recurs, the page and
  what you had just done will narrow it fast.
- **Reduced motion on the two new pages.** The rules are written
  (`prefers-reduced-motion` blocks on the tiles, the stage cards and the
  cascade) but not screenshotted with `--force-prefers-reduced-motion`.

---

## Picking it up

### Next, in order

1. **`vst_kb` is moving under you.** `kb:extract` and `kb:grade-facts` exist and
   stage 3 is being built in another session. When the facts tables land:
   `pnpm steering:estate`, then write the notes the typecheck will demand, then
   add the plain-language entry in `apps/steering-app/src/lib/plainly.ts`. The
   Pipeline section's stage 3 flips from `built: false` in
   `apps/steering-app/src/lib/pipeline.ts`.
2. **Build the Docker image** and confirm the new package resolves.
3. **`crm`, `plm`, `alm`, `pmo` are never expanded on the page.** The tiles carry
   plain labels ("Customers", "Requirements") so they read fine, but the
   abbreviations themselves are industry jargon with no gloss. `vst_kb` had the
   same problem and it was a real reader question — this is the same bug one
   level down.
4. **A richer FDE explanation on `/`.** The firm's page has the reuse graph and
   the engagement cards; whether that satisfies "explain what FDE is" is a
   judgement nobody has made yet.

### Where things are

| looking for | it is in |
|---|---|
| the estate row, the dialog that grows from a tile | `packages/surface/src/components/EstateExplorer.tsx` |
| the two before/after rows and both their dialogs | `apps/steering-app/src/components/BeforeAfter.tsx` |
| the three pipeline stages and their dialogs | `apps/steering-app/src/components/Pipeline.tsx` + `lib/pipeline.ts` |
| plain-English column meanings | `apps/steering-app/src/lib/plainly.ts` |
| one-sentence table notes (the terser register) | `apps/steering-app/src/lib/estate-notes.ts` |
| the palettes | each app's `src/styles/app.css` |
| the shared CSS | `packages/surface/src/styles/surface.css` |

### Two registers, on purpose

`estate-notes.ts` is one sentence per table for a bid engineer skimming a row of
tiles; it assumes the reader knows what a charge code is. `plainly.ts` is the
same tables explained from scratch, for whoever that engineer forwards the link
to. **They are two different pieces of writing for two different readers**, and
a single string that tried to serve both would serve neither. Keep them apart.
