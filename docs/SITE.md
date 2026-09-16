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
apps/web/insurance-app  @claims/insurance-app   Meridian Mutual. Port 3000, pnpm dev.
                                                Untouched by this work.
apps/web/veresk-app     @veresk/app             The firm's door at `/`, and `/learn` —
                                                three tracks and a map, added 2026-09-15.
                                                HOW MANY LESSONS IS NOT WRITTEN HERE:
                                                `TOTALS` in `src/lib/learn/lessons.ts`
                                                derives it, after the literal that used
                                                to sit on this line went stale.
                                                Port 3300, `pnpm veresk:dev`.
apps/web/pharma-app     @meridian/pharma-app    Meridian Pharma: `/`, `/desk`,
                                                `/supplier`, `/data-flow`, `/api/*`.
                                                Its own app — the pages this block
                                                once listed under veresk-app moved
                                                here with it.
                                                Port 3301, `pnpm pharma:dev`.
apps/web/steering-app   @vantis/steering-app    Vantis Steering, at `/` of its own
                                                deployment. Port 3400,
                                                `pnpm steering:dev`.

packages/uikit          @fde/uikit              Liftable into a customer's repo.
                                                Controls, severity, motion, tokens.
packages/surface        @veresk/surface         THIS SITE's shared parts. Not
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
| `veresk` | https://veresk.lemonsky-6acd5222.swedencentral.azurecontainerapps.io |
| `steering-app` | https://steering-app.lemonsky-6acd5222.swedencentral.azurecontainerapps.io |

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


---

## `/learn` — twelve lessons in two tracks, added 2026-09-15

> **Superseded, and kept on purpose.** This is the first pass as it shipped.
> The shape it settled into — three tracks and a map — is *"`/learn` as it now
> stands"* further down, and every count in this entry is historical the moment
> you read it. The forward pointer is here because the correction was 190 lines
> away and a reader arriving at this heading had no way to know.

*Twelve pages under `apps/web/veresk-app/src/pages/learn/`, a layout route for
the rail, and app-local components. Nothing went into `@veresk/surface` or
`@fde/uikit`: there is one caller, and this repo's rule is extraction on a
**measured second** one.*

### Two tracks, and why not one run of twelve

The first five are the MACHINE — true of all three engagements, naming a
customer only as an example. The next seven are ONE ENGAGEMENT, read out of the
~4,400 lines in `docs/steering/` catalogued by `docs/steering/LEARN-SOURCES.md`.

Folding them into one numbered run would have broken what the first five are
built on: that the order is the argument and each lesson assumes the one above.
Track two does not assume track one that way. Three of its lessons depend on
lessons 2 and 3 and say so on the page; its first depends on nothing at all, is
the strongest page in the section, and is labelled **reads cold** so a reader
who starts there knows they have skipped nothing.

**Track two has no per-lesson hue**, and that is the same palette argument
resolved the other way: it has no sequence for a hue to encode, and the arc left
over once severity has claimed teal, green, amber, rose and blue is not wide
enough for seven more anyway. It is drawn in the foreground colour, which also
makes the two tracks tell themselves apart at a glance.

### It did not need the externals list, and that is the accurate statement

`vite.config.ts` opens by saying this app serves one page, calls no model, opens
no database and has no API route — and that *"if a route here ever needs one of
those, the externals list comes with it"*. It now serves seven pages and still
needs none of it: every figure is baked into the bundle at build time from a
document already in `docs/`. The day a lesson wants a live retrieval demo is the
day that list arrives, deliberately and in a commit that says so.

### The one rule the content is held to

**Every figure is a number the repo measured, printed with the command that
reprints it.** Exactly one drawing is an illustration — the draggable vectors in
lesson 1 — and `Figure` takes a `kind` prop rather than trusting prose to carry
the distinction, defaulting to the strict value so a figure whose author forgot
claims to be measured and is wrong in the direction somebody notices.

**Lesson 5 draws the newest baseline on disk rather than the published one.**
`docs/evals/README.md` publishes 2026-09-05 (7 cases, 30/35) and `CLAUDE.md`
says not to re-derive it because it drifts. It has drifted — there are eighteen
baselines in `docs/evals/results/` and the newest is a different suite. So the
page computes from `baseline-2026-09-11T15-55-29-682Z.json`, names the file, and
says the README quotes an earlier run. Quoting a number the page cannot
reproduce from anything it can see is the failure *"counted, never quoted"*
exists to prevent.

### Three bugs, and all three were invisible to every check this repo has

**1. Tailwind tree-shook four of the five lesson hues out of the build.**
`@theme` variables are emitted only where Tailwind can *see* them used. These are
read as `` var(`--color-learn-${n}`) `` — built at runtime from a lesson's number
— so exactly one survived, the one `.lesson` names literally, and lessons 2–5
rendered with the custom property resolving to nothing. No error, no warning, a
successful build. **Same family as the `@source` trap above, and the check is the
same: read the output.**

```bash
grep -o -- '--color-learn-[0-9]:[^;]*' apps/web/veresk-app/dist/client/assets/*.css
```

They are declared in `:root` now. Nothing here is used as a Tailwind colour
utility, so the theme layer bought nothing and cost four hues.

**2. A chart note was drawn under its label and ran out under the plot.** SVG has
no text metrics at render time, so "Part IV > 4.4 Rental Reimbursement" at a
150-unit label width ran into the next row and that row's bar was drawn straight
through it. Notes have their own line now. **Found by screenshotting the page,
which is the only check that can see it.**

**3. The lesson map on `/learn` was clipped at 1440px**, cut mid-word — the
horizontal cousin of the card-back overflow above. The row came to ~55rem in a
column that is 52.5. Shrinking the cards would have fixed it at exactly one
width; taking the entry and exit labels out of the row removed 13rem and two
gaps, so it cannot clip at any width a person reads at.

The probe that catches all three of that shape — page-level horizontal scroll,
and any element clipping its own content — is worth keeping:

```js
// at each width, on each route
document.documentElement.scrollWidth > innerWidth + 1            // page scrolls sideways
[...document.querySelectorAll('*')].filter((el) => {
  const o = getComputedStyle(el).overflowX;
  return ['hidden', 'clip'].includes(o) && el.scrollWidth > el.clientWidth + 1;
})                                                                // element clips its own content
```

Run clean at 1440 and 1280 on all seven routes, once the Aurora wash (which
clips its own oversized gradients on purpose) and the landing `FlowMap` (already
documented above) are set aside.

### The palette, and why no chart encodes a series with it

Five hues, one per lesson, sky → orange. **They are decoration and the validator
says they cannot be anything else:**

```bash
node scripts/validate_palette.js "#38bdf8,#818cf8,#c084fc,#e879f9,#fb923c" \
  --mode dark --surface "#0d0f15"
# FAIL — worst adjacent pair ΔE 6.8 (normal vision), against a floor of 15
```

Five hues confined to the arc left over once teal, green, amber and rose are
reserved for severity cannot be told apart as a series. So a chart gets one hue
plus neutral grey with every value directly labelled, the hue never appears
without its lesson number beside it, and severity colour appears on exactly one
page — lesson 5, where severity *is* the subject and is labelled as such.

**A pass is grey.** Thirty passing runs do not turn the page green; the five
failures are the only coloured thing on the grid.

### `HowItWorks` — the press that opens the real code

`OriginDialog` from `@fde/uikit`, which already has the three ways out, the
scroll lock and the measured transform origin. The content shape is fixed —
*in plain words*, *the code*, *line by line*, *what went wrong here once* — so no
walkthrough can become "here is some code, work it out".

**The hue is read off the trigger at press time, and it has to be.** The dialog
portals to `<body>` (deliberately — an ancestor with a transform would otherwise
become the containing block for its `fixed` overlay, which this repo has already
measured), so the panel is not a descendant of the element that sets `--lesson`
and inheritance cannot reach it. Every dialog on every lesson would have come out
lesson one's sky blue. A CSS fix would also have been written against the wrong
class name: the panel is `.ui-dialog`.

### `Snippet` — VS Code's own colours, and the one dependency this app has

Code on these pages is highlighted by **`shiki`**, running VS Code's own
TextMate grammars and its `dark-plus` theme. Not an imitation: the same grammars
and the same theme file the editor ships, so a reader who lives in that editor
reads a snippet without re-learning it.

**It runs synchronously**, which is the whole reason the shape works.
`createHighlighterCoreSync` with the JavaScript regex engine has no WASM to
await, so there is no loading state on a static page and nothing for SSR and
hydration to disagree about. Four grammars and one theme are named individually
rather than pulled from the bundle carrying every language shiki supports —
that list is the cost control, so adding a language is a decision somebody makes
rather than a default.

**Measured cost, because it is the app's first runtime dependency:**

| | raw | gzip |
|---|---|---|
| the shared learn chunk (shiki + 4 grammars + theme + the charts) | 419 KB | **85 KB** |
| React and the router, for comparison | 344 KB | 107 KB |

**The firm's door does not load it.** Checked rather than assumed — `/` preloads
four chunks and none of them is the highlighter; it appears only under
`/learn/*`:

```bash
curl -s localhost:3399/ | grep -o 'assets/[A-Za-z.-]*-[A-Za-z0-9_-]*\.js' | sort -u
```

If that ever stops being true, the alternative already exists and is this repo's
usual shape: pre-tokenise at build time into a `*.generated.ts` behind a
`pnpm learn:snippets` command, since every snippet on these pages is a static
literal.

**Two things survived from the hand-rolled version and both are load-bearing:**

- **`mark`.** Syntax colour says what a token *is*; only the page knows which
  line its own paragraph is about. It is drawn as a tinted row plus a gutter
  rule, **under** the tokens, so it can never change what a token looks like.
- **No line numbers unless a real first line is given.** The gutter rendered
  empty at first, which looked like a gutter that had failed to load; numbering
  from 1 would have been worse. Almost every snippet is an excerpt whose header
  names a real range, so `1, 2, 3` beside `classification.ts:196–285` is a small
  lie in the one component whose entire job is being checkable. The code being
  quoted there says it better: *provenance that is approximately right is the
  kind of wrong that survives review, because it looks exactly like provenance
  that is right.*

**The background is lifted off the theme's own `#1e1e1e`**, to `#1e2024` on the
page and `#262a30` inside the dialog. Against a `#0d0f15` surface the original
has no visible edge — it reads as a patch of slightly different darkness rather
than as an editor, and inside the dialog it is worse because the code is the
thing the reader opened the dialog for. **The token colours are untouched**: the
whole point of using shiki is that those are VS Code's values, and adjusting
them would make that claim false.

---

## `/learn` as it now stands — 27 lessons, 5 tracks, and a map

*Grown from the five of 2026-09-15 across that one day. The entries above
describe the passes it went through; this is the shape it settled into. The
counts in this heading are the only ones written by hand anywhere on the
subject — every surface reads `TOTALS`.*

```
  THE MACHINE (5)              what every engagement is built from
    vectors · retrieval · the answer · the loop · evals

  WHAT YOU BUILD AFTER IT WORKS (5)     the operational pillars
    regressions · forensics · cost · caching · drift

  FIVE WAYS TO RETRIEVE (5)             the state of the art around track one
    hybrid · corrective · agentic · graph · multimodal

  FIVE THINGS THAT ARE NOT RETRIEVAL (5)   what is left once the passage is found
    context · injection · credentials · orchestration · fine-tuning

  ONE ENGAGEMENT, END TO END (7)        Vantis Steering's own material
    guessing · pipelines · answer key · tools · attention · residency · ceiling

  /learn/architecture          a REFERENCE, in no track
```

### The beyond track, and the two things it added to the kit

Its placement is the only one in the section that is forced from both sides:
below `patterns` because all five assume its `agentic` lesson, above
`engagement` by the general-before-specific rule the two tracks before it used.
It is a **ladder of commitment** rather than a dependency chain — each rung costs
more and undoes less than the one before.

**`Matrix` rows take an `explain`**, which was Byron's call and is the right one.
A cell reading `— not built` next to `no external memory anywhere` is complete
only for a reader who already knows what the row NAMES; for anybody else it is a
verdict on a term they cannot picture. A row now opens into what the thing is in
plain words, a concrete example, and why it got that verdict — in `OriginDialog`,
the component `HowItWorks` already uses, with the hue read off the pressed row.

`shape` on those examples has **no default at all**. `HowItWorks` defaults to
`verbatim` and an audit later found seven paraphrases under real paths; most
examples in a grid are illustrative by nature, so a default in either direction
would be wrong about most callers. The caller states it or it does not compile.

It is on the four grids whose rows are shorthand — the long-horizon techniques,
the seven failure points, the agentic taxonomy, pharma's trifecta legs — and
deliberately **not** on the graph and multimodal decision tables, whose rows are
already plain questions.

**`Trifecta`** is the one new drawing: three overlapping conditions, failure at
the centre, and a `present: false` that draws a set dashed because this repo is
missing the third leg on purpose.

### Python is in the bundle now, and it is one page's decision

`Snippet` carried four grammars and now carries five. `/learn/finetuning` quotes
`peft` and `transformers`; a TypeScript LoRA example would be a fiction. No new
dependency — the package was already installed — and the cost was read off the
file rather than estimated:

```
  @shikijs/langs/dist/python.mjs   77,130 raw · 9,407 gzipped
  the shared learn chunk           497,501 raw · 94,951 gzipped   (was ~85 KB)
```

**The firm's door still does not load any of it**, checked against the built
output rather than assumed — `/` serves four chunks and none is the learn chunk,
while `/learn/finetuning` pulls it. That is the same check the shiki entry above
made, re-run because the chunk changed.

### The patterns track, and the two rules it forced

It sits **third, not last**, on the argument `operations` already made: four of
its five are patterns this repo has NOT built, which makes them general, and the
engagement track is one customer's files. The general does not go behind the
specific.

It is a **reading order rather than a dependency chain** — every other track is
a sequence where each lesson assumes the one above, and this one is not. All
five assume machine lesson 2; only `corrective` assumes a sibling. Saying so in
`needs:` rather than smoothing it over is the same call `guessing` and
`forensics` already carry.

**`Figure` gained `kind="cited"`** — a real measurement made by somebody else.
`illustration` ("nothing in it was measured") and `proposed` ("these numbers are
not a result") are both false about a published benchmark, and leaving such a
figure `measured` is worse than either, because that is the default and renders
no badge at all. Two pages in this track have no repo run behind them; the badge
is how they say so. All three non-default kinds share the amber marker: they
differ in provenance, not in severity.

**`Path`** is the one new chart — a fixed-layout chain of nodes for a two-hop
question, with each hop's source file listed in HTML beneath the drawing. Not
force-directed, because the claim is the path and not the topology. The sources
were SVG text under their own arrows in the first version and collided with the
node boxes; see `PROGRESS.md` for why that is the same bug `BarRows` already
taught this repo.

### The provenance promise is a rule now, not a count

This page and the rail both used to say *"exactly one drawing is an illustration
rather than a measurement"*. That was true for twelve lessons and false the
moment a track arrived carrying process drawings and other people's benchmarks.
It reads:

> a figure either is a number this repo measured, with the command that reprints
> it, or it says on its face that it is not one

A promise phrased as a count goes stale when the thing it counts grows. Phrased
as a rule it cannot, and `Figure`'s strict default enforces it.

### The width you cannot measure until it renders

`BarRows` reserved a flat 90 units for the value label it writes after the bar,
which is a guess about how wide that label would be. It was wrong on four pages
in five places — `/learn/generation` printed `110,130 inpu`, cut mid-word — and
`Path`'s first version made the identical mistake with an SVG label under an
arrow. **SVG has no text metrics at render time**, so in both cases a width that
only exists after layout was guessed beforehand, invisibly to `tsc` and to the
build.

`BarRows` computes its gutter from the longest string it will actually print
now, floored at 90 so charts that were already fine are untouched. `Path` lists
its sources in HTML under the drawing, where the browser wraps them.

**The probe is the durable part** and it belongs beside the overflow probe
above: `getBBox()` on every `<text>` in every `.learn-chart` against its own
viewBox, after layout. A character count is a proxy for this and is wrong in
both directions. Six clipped labels before, none after.

### `scripts/validate_palette.js` is not in this repo

The ΔE 6.8 finding below is real and still governs the hue rule. The command
that produced it was quoted in `lib/learn/lessons.ts` and in `styles/app.css` as
though it were reproducible, and `scripts/` contains only `arch-graph.mjs`,
`dep-graph.mjs` and `leak-check.mjs`. Both comments now say the number is
recorded rather than runnable. Restoring the script is the real fix.

### The hue rule, corrected

A lesson's accent is its **position within its track**: every track samples one
sky→orange ramp at `(n - 1) / (total - 1)`. A five-lesson track lands on the five
stops; a seven-lesson track gets seven steps of the same ramp.

The first version gave a hue only to tracks of exactly five and drew the rest in
the foreground colour, on the argument that they had no sequence to encode. The
argument was wrong — every track is a sequence — and the result was a track that
visibly did not belong to the same site. **The palette validator's finding still
stands and still governs the rule around the hue:** no chart encodes a series
with it, and it never appears without its lesson number.

### Three components the section grew

| | |
|---|---|
| `HowItWorks` | a press that opens the real code beside a plain reading. Fixed shape — *in plain words · the code · line by line · what went wrong here once*. Takes `shape: 'verbatim' \| 'assembled'`, default verbatim. |
| `SaidOutLoud` | the paragraph you could say to somebody, plus the follow-up it provokes. `then` is required. |
| `Snippet` | shiki, VS Code's own `dark-plus` grammars, synchronous. |

### `MAP` and `TOTALS` exist because both failed as literals

`/learn/architecture` shipped reachable only by typing the URL — routed,
rendered, and linked from nowhere. And three surfaces said *"twelve lessons, two
tracks"* after a third track of five landed.

Both are single records in `lib/learn/lessons.ts` now, read by every surface that
shows them. **The general rule this section keeps re-learning:** a fact
duplicated across components is a fact that will disagree with itself, and the
check that catches it is a person reading the page.

### What guards what

```bash
pnpm arch:graph     # regenerate the package graph the architecture page draws
pnpm arch:check     # fail if it disagrees with package.json — proven to catch planted drift
pnpm leak:check     # no customer vocabulary in the shared layer
pnpm typecheck      # 31/31
```

`arch:check` guards **the graph** — packages, layers, edges — and deliberately
ignores line counts. Comparing those made it fire on every source edit, which is
a checker somebody turns off, and `/learn/drift` is a page about that failure.
