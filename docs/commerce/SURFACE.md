# Thornbury Goods' surface — what was built, and the contracts it leaves behind

*Written 2026-09-18 at a stop point, so the work can be picked up cold. This is
the account of `apps/web/commerce-app` and `infra/commerce/`. It is deliberately
blunt about what does not exist and about what I would not defend.*

Siblings: [`PLAN.md`](PLAN.md) is the engagement · [`MCP-STEPS.md`](MCP-STEPS.md)
is the build this page renders · [`../SITE.md`](../SITE.md) is the repo-wide
front-end doc and must be read before touching any app ·
[`../../infra/commerce/DEPLOY.md`](../../infra/commerce/DEPLOY.md) is the
deployment record, including the decisions **not** to build things.

---

## 1 · What exists, and what deliberately does not

| route | state |
|---|---|
| `/` | **built.** The contact, the seven tabs Iris opens today, what the assistant does in plain words, the boundary diagram, the five systems, the policy contradiction, four refusals, and a status section naming how many steps have actually run. |
| `/steps` | **built.** All fourteen steps of `MCP-STEPS.md`, in six phases as tabs, each with plain prose, a dependency chip, its code, and five "under the hood" dialogs. |
| `/desk` | **not built** |
| `/data-flow` | **not built** |
| `/api/*` | **none. There is no API route at all.** |

> **The two missing routes are not a regression and nothing broke.** `PLAN.md`
> §4 specifies a desk at `:3600` and the sibling apps all have three routes, so
> the next person will read the plan, find two routes, and reasonably assume
> something failed. It did not. **The user asked for the landing page and a
> "how does it work" page modelled on Calder Safety's `/steps`, and that is
> what was built.** The desk was scoped out on purpose, not dropped.

It is also the right call on the merits *today*: the determination the desk
renders (`PLAN.md` §8 — entitlement, amount, citations, conflicts, escalation,
approval) has nothing behind it to answer from. `search_policy` is Step 9 and
embeddings are not built. A desk now would be a fixture viewer.

**The MCP session sent a full specification for the desk** — real order ids for
each planted flaw, the API's error envelope, the three citation source shapes,
the `audience: public | internal` and `status: current | superseded | retired`
facets. It is in this session's transcript and in `API.md` / `ESTATE.md`, and it
keeps. Whoever builds the desk should start there rather than from `PLAN.md` §8
alone.

---

## 2 · The maintenance contract nobody would guess

**`/steps` quotes real source files at real line numbers, and those files belong
to another session.** This is the thing most likely to break silently.

Three blocks in
`src/components/steps/HandshakeHood.tsx` are verbatim excerpts:

```
apps/mcp/commerce/src/server.ts:92–108        createServer + the ping tool
apps/mcp/commerce/src/server.ts:63–85         register(), and the central catch
apps/mcp/commerce/src/cli/handshake.ts:100–121  the initialize exchange
```

Each is rendered by `@veresk/surface`'s `Code`, which prints a **gutter starting
at `startLine`**. So the promise made to the reader is: *open that file at those
lines and you will find exactly this*. That promise breaks the moment anybody
edits `server.ts` above line 63 — and it broke twice today, because Step 4a
moved `createServer` and Step 4b moved it again.

**Nothing in the build catches it.** `tsc` sees a string array. The page renders.
The line numbers are simply wrong, which is the failure `Snippet`'s own docstring
calls *"a small lie in the one component whose entire job is being checkable."*

### The check, which is thirty seconds and is not wired up

```bash
python3 - <<'PY'
import pathlib, json, re
hood = pathlib.Path('apps/web/commerce-app/src/components/steps/HandshakeHood.tsx').read_text()
for path, a, b in [('apps/mcp/commerce/src/server.ts', 92, 108),
                   ('apps/mcp/commerce/src/server.ts', 63, 85),
                   ('apps/mcp/commerce/src/cli/handshake.ts', 100, 121)]:
    real = pathlib.Path(path).read_text().splitlines()[a-1:b]
    blk = hood.split(f'path="{path}:{a}–{b}"')[1]
    blk = blk[blk.index('lines={['):]
    blk = blk[:blk.index('\n          ]}')]
    q = [json.loads(m) for m in re.findall(r'"(?:[^"\\]|\\.)*"', blk)]
    print(f'{path}:{a}-{b}  {"MATCH" if q == real else "MISMATCH"}')
PY
```

**It should be a `commerce:quotes-check` script and it is not.** That is the
single biggest thing I would fix next, and §6 says why it did not happen.

Until it exists, the rule is: **if you edit `apps/mcp/commerce/src/server.ts` or
`cli/handshake.ts`, run the snippet above.** A mismatch means re-extract — do not
hand-edit the quoted lines, because hand-editing is how the two drift apart
while looking fine.

> **A subtlety that cost me a wrong conclusion once.** An early version of that
> checker sliced to the first `]}` in the block, which is the close of
> `mark={[...]}`, not of `lines={[...]}`. It reported MISMATCH on all three
> quotes that were in fact correct. The checker's own bug looked exactly like
> the bug it was looking for — so if it goes red, verify the checker before
> touching the page.

---

## 3 · Counts are derived, never typed

Three numbers on `/steps` — the total, the "needs nobody" split, and each
phase's status — all read from one array, `PHASES` in `src/pages/Steps.tsx`,
plus two short lists beside it:

```
PHASES[].holds   which steps each phase holds   → the tab chip, via rangeOf()
STEPS            PHASES.flatMap(p => p.holds)   → "fourteen steps"
DONE             the steps with a ☑ in MCP-STEPS.md
doneIn(holds)    the intersection                → "3 of 4 run"
```

**This earned itself within a day.** The page was written at two finished steps
and was at five by evening. `DONE` is the only edit that took; every other
number moved on its own. `doneIn()` intersects rather than assuming, which is
why the phase statuses stayed true when `DONE` grew across a phase boundary.

`MCP-STEPS.md` itself said "thirteen" and "twelve" while having fourteen headed
items, for exactly the reason this exists. That is fixed now — but the fix does
not make the next literal safe.

**When a step's ☑ lands in `MCP-STEPS.md`, add it to `DONE` and nothing else.**

---

## 4 · Provenance badges, and why they are this engagement's words

`src/components/steps/kit.tsx` badges every figure with one of four:

```
measured here            read off this machine, or produced by running it
cited                    it comes from a named document
proposed — not run       this plan's design. The DEFAULT.
measured — corrects the plan   measured, AND it contradicts what the repo
                               already said
```

The first three are `PLAN.md`'s own vocabulary (MEASURED / CITED / PROPOSED),
not Calder's `measured / worked / target / pending`, which fit a pipeline that
counts things rather than a protocol being read.

**The fourth is the one that earns the page.** Every finished step so far has
corrected something previously written down, and filing those as plain
`measured` would lose the only thing that makes them worth reading.

---

## 5 · The palette, and the one thing that did not clear

Two accent tokens and no more, in `src/styles/app.css`:

```
--color-thb-1  #e0b184  brass   OURS      — the MCP server, the index, the client
--color-thb-2  #c2775a  copper  THE WIRE  — the protocol crossing itself
```

**The customer's five systems get no colour at all** and are drawn in the neutral
`--ui-*` greys. That is the truthful drawing: Thornbury's databases are not ours
to paint, and a house palette over them would claim an ownership the whole
architecture spends its time denying. Every other engagement colours *its
systems*; this one colours *sides of a line*, which is why two tokens suffice
where pharma needs six.

Measured with CIEDE2000 rather than chosen by eye, because `SITE.md` records a
palette that shipped **failing** at ΔE 6.8 against a floor of 15:

```
thb-1 ↔ thb-2                      ΔE 18.0   clears
thb-1 vs. Vantis' orange #fb923c   ΔE 12.8   DOES NOT CLEAR
thb-2 vs. Vantis' red    #f87171   ΔE 13.9   DOES NOT CLEAR
```

Recorded rather than hidden. The floor governs hues adjacent **in one figure**,
and these never are — different customer, different origin, differently shaped
palette. Calder's stylesheet makes the same admission about its own indigo. A
reader crossing between the two deployments in one sitting is who that note is
for, and if somebody decides it is not good enough, the stylesheet comment is
the thing to argue with.

---

## 6 · What I would not defend

Bluntly, and in order of how much they would annoy me to inherit.

1. **The quote check is manual.** §2. I ran it by hand after every edit and it
   caught two real staleness bugs, which is precisely the argument for it being
   a script. It is not one because the page's content kept being invalidated by
   other sessions landing steps, and I kept choosing to fix the content. That
   was the right call each time and the wrong call in aggregate.

2. **Five "under the hood" dialogs, not fourteen.** The user asked for
   under-the-hood code for every sub-step. Every step *does* show its code
   inline; only five have a dialog with the deeper argument. The other nine did
   not have enough behind them to be worth a dialog — but that is my judgement
   and somebody could reasonably want the shape uniform.

3. **Dialog bodies were never clicked.** They mount on click, so SSR, typecheck
   and screenshots all skip them. I exercised each one by temporarily rendering
   it inline and restoring — which proves they render, and does **not** prove
   `OriginDialog`'s open/close animation, focus handling or scroll lock work on
   this page. Nobody has actually pressed a button in a browser here.

4. **The workflow jobs have never run.** The Dockerfile is verified — it builds,
   serves, and the real smoke-step body passes against the container, including
   three negative controls. Jobs `1d`/`2d` are unexecuted, and the `commerce-app`
   container app does not exist, so the first run takes the *create* branch.

5. **The `FREE` list says nine, `MCP-STEPS.md` says seven.** Its table lists
   steps 7–8 as "nothing new", which can mean "adds no dependency" or "inherits
   4b's". Moving the transport onto HTTP and putting a token in front of it
   genuinely needs no database and no API, so the page counts them free and says
   in the note that the source says seven. Two steps, unresolved, and it changes
   the sentence the strand is justified by.

6. **The landing page is long.** Eight sections before the footer. It matches
   the house style and I would still cut it if a reader told me they stopped.

---

## 7 · Deployment — the short version

Full record in [`../../infra/commerce/DEPLOY.md`](../../infra/commerce/DEPLOY.md).
The parts most likely to be re-litigated:

- **The app image needs no secrets**, and that is true rather than "handled
  elsewhere". `/desk` is what will end it.
- **`commerce-deploy` is NOT in `veresk-build`'s `needs:`.** The ordering exists
  because `VITE_*` is inlined at build time — and the firm's page has no
  Thornbury card and no `VITE_COMMERCE_URL`, so there is no URL to bake and
  nothing to order. **When a card is added, add the dependency to jobs 3 and 4
  in the same commit.**
- **No MCP image, deliberately.** It is stdio-only, so there is no port to
  probe; and it would have nowhere to point, since `apps/api/commerce` has no
  image either. An image whose `CMD` runs `commerce:mcp-check` is a CI job
  wearing a Dockerfile — `safety-checks.yml` is the precedent.
- **`apps/mcp/**` and `apps/api/**` are deliberately out of the path filter.** No
  image is built from either, so listing them starts a run that rebuilds four
  unrelated images to publish nothing. **Add the path in the same commit that
  adds the job.**

### The gate, before an MCP deploy job can exist

```
1  Step 7   the HTTP transport, on :3620          ← the gate
2  Step 8   a bearer guard, with the fail-CLOSED test
3           apps/api/commerce has an image and a job
4           a service token, set ON THE CONTAINER APP and never in the workflow
```

Steps 1 and 2 need nobody.

---

## 8 · A recommendation, not a change: the env var split

`ECOMMERCE_DB_URL` (the estate) sits beside `COMMERCE_API_URL` and
`COMMERCE_API_TOKEN` (the MCP server's view of the backend). Two prefixes for
one engagement.

**I did not change it — it is Byron's call and it is not this session's file.**
The recommendation, for whenever it is made:

> Keep them different **on purpose**, and say so where they are defined. They
> are not two names for one thing: `ECOMMERCE_DB_URL` is a **database
> superuser-ish credential** that creates and drops five databases, and
> `COMMERCE_API_*` is a **service token that holds no database access at all**.
> The entire §4.1 argument is that those two must never be in the same process.
> A shared prefix invites exactly the copy-paste that puts them there.

If they are unified, unify *toward* `COMMERCE_*` and give the estate credential
a name that says what it is — `COMMERCE_ESTATE_ADMIN_URL` — rather than making
it look like a peer of the service token.

---

## 9 · What is on disk and not in git

**At the time of writing, none of this is committed.** Untracked:

```
apps/web/commerce-app/     the whole app
infra/commerce/            Dockerfile + DEPLOY.md
```

Modified: `.github/workflows/deploy.yml` (env, path filter, jobs 1d/2d),
`infra/DEPLOYMENT.md` (the runbook index).

Two earlier edits — `commerce:dev` in the root `package.json` and the
`commerce-app` entry in `docs/SITE.md` — **were swept into other sessions'
commits** and are already in git.

**Why it is uncommitted:** three other sessions have been working in this tree
all day and committing freely, and nobody asked me to commit. `.env.example`,
`turbo.json` and `pnpm-lock.yaml` also show as modified and are **not mine** —
so a blanket `git commit -a` would sweep up work I did not do and cannot vouch
for. A commit here should name paths explicitly:

```bash
git add apps/web/commerce-app infra/commerce .github/workflows/deploy.yml infra/DEPLOYMENT.md
```

`pnpm-lock.yaml` has a 46-line addition that **is** mine — the new app's entry —
but the file may also carry other sessions' changes, so check `git diff` on it
before including it.
