# The Thornbury backend, as built

*Stage S3 of [`PLAN.md`](PLAN.md). Written 2026-09-18, after the API was running
against the seeded estate.*

**Badges, and they are not decoration here.** Everything about this API's own
behaviour is **MEASURED** — it was printed by one of its five checks, 110
assertions of which 48 run against the live estate. But the thing this API exists
for has **not** happened yet: the MCP server has never called it. So the contract
in §2 and §3 is MEASURED as an API and **PROPOSED as an integration**. When
`fde-assistants-86`'s step 4b wires the two together, the first failure is likelier
to be a disagreement about this contract than a regression in either side.

The estate this reads from is [`ESTATE.md`](ESTATE.md) — table shapes, soft keys,
row counts and fingerprints live there and are deliberately not repeated here,
because they move every time the estate is reseeded and a second copy would be
stale within the day.

```
apps/api/commerce   @thornbury/commerce-api   :3610
46 TypeScript files · ~4,500 lines · 5 Prisma schemas · ~840 schema lines
```

---

## 1 · What it is, and the one rule that shapes everything

**It is the customer's own backend, and there is no AI anywhere in it.** No model
call, no embedding, no prompt, no `@fde/agent` dependency. That is the whole point
of the fifth engagement rather than an omission: the other four engagements let
the model call a TypeScript function that opens a Postgres connection in the same
process. Most customers instead have *a backend already*, and the interesting
work is putting an agent in front of the API they have without becoming a second
source of truth, a second authorization system, or a second place credentials
live.

The signal is reliable enough to use as a rule: **if something AI-shaped needs
importing into this package, it belongs in `apps/ai/commerce` or
`apps/mcp/commerce` instead.** It is written at the top of `src/app.module.ts`.

One Nest module per source system — `ShopModule`, `WmsModule`, `FleetModule`,
`CrmModule`, `PolicyModule` — each owning its own pool. Five pools, closed on
shutdown by the module that opened them.

`WmsModule` has no endpoint. PLAN.md §4.3 marks the warehouse "(no MCP endpoint
yet)", and the module exists anyway because the rule is *one module per source
system*, not one per endpoint. What keeps it from being dead code is `GET /health`,
which opens all five: **a pool nobody has ever seen connect is a pool you are
hoping about**, and the day the pack photos are needed is not the day to discover
the credential was never right.

---

## 2 · The seven routes

Five reads the MCP server was specified to need, one write, plus health and the
calendar helper.

| route | module | what it answers |
|---|---|---|
| `GET /health` | all five | every pool, pinged and reported **separately** |
| `GET /orders/:id` | Shop | order · items · payments · **prior refunds** · totals |
| `GET /deliveries/by-order/:orderId` | Fleet | shipment · scans · delivery events · POD · route · **driver reports + depot incidents for that route that day** |
| `GET /customers/:id/history` | Crm | customer · cases with resolutions · messages |
| `GET /policy/rules?category=&channel=&valuePence=[&tier=&action=]` | Policy | return window · refund rules · goodwill limits · approval thresholds · overrides |
| `GET /policy/sla?carrierRef=&serviceLevel=&dispatchedAt=[&deliveredAt=]` | Policy | the working-day calendar helper — T6 |
| `POST /resolutions` | Crm | writes a **draft**, `status='proposed'` |

Two headers, on every call:

```
x-service-token: <COMMERCE_SERVICE_TOKEN>   unset ⇒ EVERY request refused, /health included
x-case-id:       <the session's case id>    absent ⇒ invalid_request on any customer-data read
```

### Why `/deliveries/by-order` returns so much

It is the only endpoint that matters for planted flaw **T1**, and it is shaped
around the question rather than around the schema. The walk, which is also the
list of methods in `fleet.service.ts`:

```
order_ref (a soft key) → shipment → stops → route → driver reports that day
                                          → depot → depot incidents that day
```

**`shipments` has no `route_id`.** The only path from a parcel to the round it
travelled on is `stops.shipment_id`, which fde-assistants-2d confirms is
load-bearing and intentional: *"if a route_id ever appears on shipments, T1 stops
being a trap and get_delivery becomes a lookup."* Splitting this into three
endpoints would spend model turns on a join **and** make finding T1 depend on the
model thinking to ask a third question. It would find it sometimes, which is the
worst of the options.

One method per hop, deliberately. Written as a single forty-line function the walk
is unreadable, and the question on the day the answer comes back empty is *which
hop lost it*.

### The one place this API reads prose

`driver_reports` has no stop column — the stop number exists **only** in what the
driver typed (*"trolley tipped at stop 14, two parcels re-stacked"*), because that
is how someone writes up a round: against the round, naming a stop, not an order.

So the API returns `mentionsStops: number[]` (a regex over the body),
`namesThisStop: boolean` (matched against `stops.seq`), **and the raw `body`
untouched**. Keeping the body is the important half: a report phrased *"the
fourteenth drop"* is missed by the regex, and a helper that replaced the evidence
with its own verdict would turn a missed phrasing into a fact that never reached
anybody. T1 is a reading problem wearing a lookup's clothes.

---

## 3 · The answer envelope, and the argument that changed the spec

Every endpoint returns a structured outcome. Not a bare body, not a status code
carrying the meaning, not an exception.

```ts
{ ok: true,  data: {...} }
{ ok: false, cause: 'out_of_scope' | 'not_found' | 'invalid_request'
                  | 'upstream_unavailable',
             detail: '<safe to show a human>' }
```

| `cause` | when | produced? |
|---|---|---|
| `out_of_scope` | a caller-named record not reachable from this case — **or absent** | yes |
| `not_found` | a `thb_policy` row that does not exist | yes |
| `invalid_request` | no case header · unknown case · unusable argument | yes |
| `upstream_unavailable` | *(reserved)* | **no — declared, never produced** |

`upstream_unavailable` is listed because it is in the type, and flagged because
nothing emits it. It is there for the day a dependency is added that can be down;
until then, do not write a consumer branch that waits for it.

**Why a field and not a status code.** fde-assistants-86 measured the MCP layer
against three planted failures and got one wire shape back:

```
DOMAIN refusal   isError=true  text="not in scope for this case"
THROWN           isError=true  text="socket is on fire"
BAD ARGS         isError=true  text="Input validation error: … received number"
```

Three different owners — the domain said no, the code broke, the caller sent the
wrong type — flattened to a boolean plus free text. **A boundary that serialises
does not preserve what the type system was preserving.** Anything the far side
needs to know goes in the payload.

### The property a consumer depends on by name

> **A 5xx from this API always means plumbing.**

Every domain outcome is an HTTP 200 carrying a `Failure`, or a 400 from the Zod
pipe. The MCP layer's five-way blame discriminator (PLAN.md §6.1) reads `cause`
straight into `structuredContent` rather than sniffing prose, and rests on this.
If a domain outcome ever starts arriving as a 500, the far side's `threw` vs
`tool_error` split silently stops working and **every eval that blames the model
for a dead socket will look correct.** It is written at the top of
`src/common/outcome.ts`, naming the consumer, and §10 is the defect that proved
it needed a test.

### The oracle, and a brief that was wrong

The instruction was that "not found" and "out of scope" be different `cause`
values, **and** that an out-of-scope answer never reveal that the record exists.
Those cannot both hold. If a nonexistent order returns `not_found` and a real
order belonging to someone else returns `out_of_scope`, the *pair of answers* is
the disclosure: a caller varying one path parameter learns exactly which order ids
are real, without ever reading a row — an enumeration oracle over Thornbury's
order book, worth more than any single order.

So for a record the **caller names** inside a case's scope, both states collapse
to `out_of_scope` with byte-identical `detail`. There is one function producing
that text, not two, and `commerce:api-scope-check` asserts the two are
indistinguishable — give them different wording later and the check goes red.

`not_found` stays alive on `thb_policy` paths, where there is nothing to
enumerate. That is what makes the collapse a decision rather than an oversight.

This was accepted and is now the spec: PLAN.md §7.1 carries the argument and its
general form — *a distinction that is useful to a debugger is a side channel to an
attacker* — as of commit `23202e6`.

---

## 4 · Auth, and the one branch deliberately closed

`@fde/guard` is reused rather than reimplemented, because the obvious
reimplementation is the bug the package is named after:

```ts
if (process.env.API_KEY && header !== process.env.API_KEY) return 401;   // allows everything when unset
```

But `authorize` has one branch this API must not take. With no key configured and
`isDev: true` it **allows**, reasoning that a dev server binds loopback and the
*listener* makes that promise. Sound for a laptop UI, wrong here: the requirement
is literal — unset means refuse everything, with no "except in development" — and
the caller is another service, which can be handed a token as easily in
development as in production.

**So `isDev` is passed `false` unconditionally.** The dev branch is not unreachable
by accident. `commerce:api-guard-check` asserts that `@fde/guard` *still allows* on
that input (so the test is not vacuous) while this API *still refuses* — thread
`isDev` through and it goes red, rather than staying green against a running server
that now has the hole.

This is the only place this package deliberately closes a branch a shared `@fde/*`
package leaves open, which is why it gets its own section rather than a comment.

`/health` is guarded too. That costs a liveness probe one header and buys the
literal truth of "every request refused": an exempt endpoint is an endpoint the
check does not cover, and the exemption is always the one that gets widened later.

---

## 5 · Scope comes from the session, never from the model

PLAN.md §7.1, enforced. The MCP server's token can read **any** order at
Thornbury — it must, since it does not know in advance which case it will be asked
about. The model must not inherit that reach.

```
WRONG   the model names an order id, and the API reads it
RIGHT   the case id arrives in a header set from the session; the server reads
        cases.order_ref off that case; an order that is not that order is refused
```

The model can ask for anything. **Asking is not reaching.**

This is also the sanctioned cross-system walk, and worth naming as such: the case
lives in `thb_crm` and the order in `thb_shop`, different databases, so
`cases.order_ref` is a soft key and there is no join to write. Two queries in
application code, on purpose and in public.

`commerce:api-scope-check` tests both halves, because there are two ways to remove
a scope check: the *decision* stops refusing (driven against a stub contact
centre, offline and free), or a *call site* stops asking. A perfect `ScopeService`
that nobody calls is the likelier regression and the harder one to notice, so the
controller sources are also read and asserted to resolve scope — with
`policy.controller.ts` asserted to *not* have one, and to say why, so that a
deliberate exception cannot be confused with an omission.

---

## 6 · Five Prisma clients, and a join that does not compile

The brief asked that a cross-system join be **unexpressible, not merely
discouraged** — and gave no check for it.

Five pools do not deliver that; you can always type a join into raw SQL text. Five
databases deliver it at the storage layer, but only where somebody is connected to
the right one. What genuinely delivers it is **five generated clients with five
output paths**: `shopClient` has no `shipment` model, so the join is not a policy
violation, it is a type error.

That is a claim about the compiler, so `commerce:api-isolation-check` asks the
compiler: it writes six probe files, compiles each alone, and asserts which fail.

```
same-system include COMPILES (positive control)   ← the assertion that matters
shop client has no `shipment` model               ← must not compile
an order cannot `include` a shipment              ← must not compile
the fleet client has no `order` model             ← must not compile
a shipment cannot `include` the order it references
the crm client cannot reach the policy rules
```

The **positive control is the important half**. A broken runner — wrong cwd,
missing `tsc`, a typo in the arguments — makes everything fail to compile and turns
every "must not compile" assertion green while proving nothing.

> A first draft of those probes wrote `{ include: { shipment: true } as never }`
> and passed. The cast erased the very error being tested. A probe that casts away
> the error is testing the cast.

**Do not enable `multiSchema`.** It merges datasources into one client and hands
the join straight back.

---

## 7 · The schema workflow: pull, humanise, generate. Never push.

fde-assistants-2d owns the DDL (`apps/ai/commerce/db/schema/*.sql`) and the
comments in it are a deliverable — they name which columns are soft keys and why
they cannot be foreign keys. So this package **introspects and never pushes**:

```bash
pnpm commerce:api-pull        # prisma db pull, all five
                              # then scripts/prisma-humanise.mjs
pnpm commerce:api-generate    # prisma generate, all five
```

There is deliberately **no `db push` target** — the runner refuses the command by
name. Pushing from here would drop 2d's comments and rewrite column types chosen
on purpose.

**What `prisma-humanise.mjs` does and does not do.** Introspection names a field
after its column, so `cases.case_id` arrives as `case_id`. The script renames it to
`caseId` and pins the real column with `@map("case_id")` — a Prisma-side alias
only, zero SQL, nothing in the database changes. It is idempotent and
re-introspection-safe: Prisma preserves field names it can match through an
existing `@map`, so after one run the next pull keeps the camelCase names and adds
only what is new.

It also **re-applies the header comments**, because `prisma db pull` rewrites each
file and drops every `//` comment. For files whose whole point is a documented
architectural constraint, that is the wrong thing to lose.

> **The failure this workflow produced once, worth knowing about.** The first
> version of the script detected relation fields as "the type starts with a
> capital" — which matches `String`, `Int`, `DateTime`, `Boolean` and `Decimal`.
> Every scalar was classified as a relation and **none of them got its `@map`**.
> The schema still validated. Prisma still generated. `tsc` was clean. The first
> query failed at runtime with `The column cases.caseId does not exist`.
> **A rename without its `@map` is not a compile error anywhere — it is a lie the
> database settles later.** Relations are now detected against the actual list of
> models declared in the file.

Two Prisma 7 facts that cost time and are written into the schema headers:

- **`url` is gone from the datasource block** (`P1012`). Connection strings live in
  `prisma.config.ts` and the client takes a **driver adapter**. That is why `pg` is
  still a dependency after moving to Prisma — and why "five pools" stayed literally
  true: each client is handed a `pg.Pool` this code owns and closes.
- The **legacy `prisma-client-js` generator** is used on purpose. Prisma 7's default
  `prisma-client` emits TypeScript whose relative imports carry explicit `.ts`
  extensions, needing `rewriteRelativeImportExtensions` — a setting no other package
  in this CommonJS + tsc workspace turns on.

---

## 8 · Working days, and the two traps in T6

Carrier SLAs count **working days excluding England & Wales bank holidays**;
`orders` stores timestamps. Subtracting one from the other in calendar days
invents a penalty over any bank-holiday weekend — and it invents it in the
company's favour about as often as against, so nobody notices from the totals.

The second trap is easier to miss: **a timestamp is an instant; a working day is a
civil date in a place.** A parcel dispatched `2026-05-03T23:30:00Z` is already
4 May in London — BST — which in 2026 is the early May bank holiday. So every
instant is converted to a Europe/London civil date first, once, at the boundary.

Separate named functions rather than one helper with a mode flag:
`londonCivilDate`, `civilDate` (for `date` columns, which must **not** go through
the London formatter — UTC midnight in July reads back as the previous day),
`isWorkingDay`, `addWorkingDays`, `workingDaysBetween`, `slaDueDate`,
`workingDaysLate`, `londonDayRange`.

**The holiday table is a committed data file**, not a `thb_policy` row, so
`commerce:sla-check` runs offline and free — a date-arithmetic test that needs
Postgres is one that gets skipped on the day it matters. The estate has its own
`bank_holidays` table, so `commerce:api-check` **reconciles the two**: they agree
for 2025 and 2026. Jurisdiction is filtered explicitly with no fallback, because
2d's table also holds Scotland, whose August holiday is the *first* Monday where
England & Wales take the *last*.

`/policy/sla` also returns `calendarDaysLateIfNaive` — the wrong answer, computed
on purpose, so the two numbers can be seen to disagree.

---

## 9 · The checks, and the fact that they can fail

Five, each with a negative control, because a check that has only ever passed is
indistinguishable from one that cannot fail.

| check | asserts | negative control | offline? |
|---|---|---|---|
| `commerce:api-guard-check` | unset token ⇒ every request refused | the classic fail-open guard, and a restored dev exemption, are both caught | yes · 11 |
| `commerce:api-scope-check` | out-of-scope ⇒ structured miss | a ScopeService that always allows, and a controller that never asks | yes · 18 |
| `commerce:sla-check` | working-day arithmetic across a bank holiday | drop the holiday table — the answers must **move** | yes · 26 |
| `commerce:api-isolation-check` | a cross-system join does not compile | a probe that *should* compile does | yes · 7 |
| `commerce:api-check` | every endpoint, against the seeded estate | — | **live · 48** |

**A check that could not run fails rather than passes** (the repo learned this at
commit `7b450fc`). `commerce:api-check` exits 2 with a sentence when the estate is
down or unseeded, rather than printing a cheerful summary of zero assertions.

It also **writes and deletes one row** — a draft resolution, removed in a `finally`
so a crash cannot leave it behind. Not for the fingerprint's sake:
`commerce:world-check` is offline and hashes an in-memory world, so a stray row
would never move it. The check it disturbs is `commerce:db-check`, which compares
live row counts and would report *"the estate drifted"* when the truth is *"a
self-test crashed mid-write"* — precise, and accusing the wrong thing.

```
build 23/23 · typecheck 38/38 · leak:check PASS · 110 assertions, 5/5 green
```

---

## 10 · Three defects the checks were written to catch, and did

All three were invisible to a green local run, which is the only thing that makes
them worth writing down.

**1 · Turbo cached a `dist/` that could not run.** The build is
`prisma generate && tsc`, and the generated clients are gitignored. With
`generated/**` declared neither as an input nor an output, a cache hit restored
`dist/**` *without* it — and every file in `dist/` requires `../../generated/shop`
at runtime. `pnpm build` printed `>>> FULL TURBO` and left a tree that threw
`MODULE_NOT_FOUND` on boot. Editing a `.prisma` file also invalidated nothing.
*What was green while it was broken:* `pnpm typecheck`, because that package's
typecheck script runs `generate` itself first.

A second facet appeared after the first fix: `tsconfig.tsbuildinfo` lived at the
package root, outside turbo's declared outputs, so it **survived** a cache restore
that wiped `dist/` — after which `tsc` read it, concluded everything was current,
and emitted nothing. `pnpm build` reported success with no `dist/main.js` in it.
Incremental state now lives inside `dist/`, with the artefact it describes.

**2 · A caller's date became a 500.** `/policy/sla` validated that `dispatchedAt`
*parsed*, not that it was within the holiday table's horizon. A date in 2028 threw
out of the calendar and became a 500 — which the MCP layer reads as `transport`,
blame: infrastructure, for something entirely the caller's doing. Exactly the
inversion §3's contract exists to prevent, on caller-supplied input.

Fixed twice over: argument validation now runs **before** the database lookup
(whether an argument is usable must not depend on whether an unrelated row
happens to exist — previously an unparsable date was reported as `not_found`), and
the check asserts both `status !== 500` and `cause === 'invalid_request'`.
*What was green while it was broken:* all 44 assertions, because none of them sent
a date outside 2024–2027.

**3 · The T1 day window was an hour wrong every summer.** Driver reports were
filtered by a **UTC** day built from `route_date` (a `date` column) against
`reported_at` (a `timestamptz`). During BST that drops reports filed 00:00–01:00
London on the route date and wrongly includes the first hour of the next day.

On the T1 path that is not a rounding error. **A driver writing up a round just
after midnight is exactly the report that says the trolley tipped** — so
`get_delivery` would have answered "no driver reports" for a damaged parcel, and
the model would have correctly denied the claim from the evidence it was given.
*What was green while it was broken:* everything, because the seeded timestamps sit
mid-shift. Now uses a real Europe/London day range, with four assertions including
the 00:30-London case.

A fourth, smaller: the stop lookup was an unordered `findFirst`, so a
re-delivered parcel with two stops on two rounds could resolve to the wrong route
and therefore the wrong day's reports. `findShipmentByOrder` was ordered for
exactly that reason; this one now is too.

---

## 11 · Deviations from the plan

| # | deviation | why |
|---|---|---|
| 1 | **`apps/api/commerce`**, not `apps/backend` | `apps/backend` matches no `pnpm-workspace.yaml` glob and breaks the `apps/<kind>/<engagement>` convention a sixth engagement would need. PLAN.md §4 already names the kind `api`. Added an `apps/api/*` glob. |
| 2 | **Prisma**, not raw `pg` | Byron's call, and it turned out stronger than the brief: a pool cannot stop you typing a join, a generated client can. `pg` survives underneath as the driver adapter, so "five pools" stayed literal. |
| 3 | **Hand-rolled `ZodValidationPipe`**, not `nestjs-zod` | MEASURED: `nestjs-zod@5.5.0` peers `@nestjs/common` `^10 \|\| ^11` — not the `^12` the plan pins — and additionally requires `@nestjs/swagger`, a whole OpenAPI layer this API has no use for. The pipe is shorter than the paragraph justifying it. Revisit when it declares `^12`. |
| 4 | **`/policy/sla` is a sixth endpoint** | The brief asked for "a working-day calendar helper" without saying where it lives. `carrier_sla` is a `thb_policy` row, so it belongs to PolicyModule. It takes the timestamps as **parameters** rather than reading `thb_fleet` — reading fleet from the policy module is precisely the cross-system join the estate exists to prevent. Accepted by 86. |
| 5 | **`not_found` / `out_of_scope` collapse** | §3. The only deviation where **the brief was wrong and got changed** — now in PLAN.md §7.1 at commit `23202e6`. A different category from the four above. |

Two smaller notes returned to the plan's owner: PLAN.md §4.3 claimed decorators are
enabled in this package only — `packages/guard/tsconfig.json` already sets both, so
the accurate claim is that no other package *needs* them (now struck through in
§4.3). And `commerce:guard-check` / `commerce:scope-check` were renamed to
`commerce:api-*` to avoid colliding with the MCP side's checks of the same name.

---

## 12 · For the sessions downstream

**What has been run:** all five checks green against the live estate, a clean
`pnpm build` from an empty tree, and a fully-cached rebuild verified to restore
both `dist/` and `generated/` and to boot.

**What has NOT been run, and is the next real risk:**

- **The MCP server has never called this API.** Everything in §2 and §3 is a
  contract this side honours and the other side has not yet exercised.
- **No load of any kind.** Five pools at 4 connections each is 20 against a metered
  Neon project, sized for a caller that numbers one.
- **`upstream_unavailable` has never been produced**, because nothing can yet fail
  in a way that warrants it.

**Re-pull after every estate change.** 2d has changed data twice since the first
introspection (`promised_by` now holds the SLA due date; T1's route is
`RTE-20260908-BRM-1`; `RR-MARKETPLACE` was removed from `refund_rules` to protect
T4). Structure has not moved, but `pnpm commerce:api-pull && pnpm commerce:api-generate`
is one command and the alternative is a runtime error.

One thing to **not** do: `products.marketplace_seller` in `thb_shop` is surfaced
per line item as `marketplaceSeller`. That is inventory data, not policy text — it
is what lets the model *see* an item was third-party-sold while finding no policy
that addresses it, which is T4 working. Do not add a marketplace *rule* anywhere to
"fix" it; 2d's `db-check` scans every text column of `thb_policy` for exactly that
and fails by name.
