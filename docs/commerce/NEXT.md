# Commerce — what is open right now

*Written 2026-09-18 at a deliberate stop point. Four sessions built four strands
in parallel and halted together so the work could be picked up cold. This file
is the handover for the **MCP strand**; the other three write their own, listed
in §1.*

**Read [`PLAN.md`](PLAN.md) for what the engagement is.** This file is only what
is done, what is not, and what the next person needs to know before touching it.

> **2026-09-27 — picked up again, three sessions.** This session (MCP strand):
> Steps 6 and 5 done (in that order), Step 7 paused by Byron. **Then the three
> missing read tools, and the fixes the answer key forced — see §9.** The answer
> key itself is committed (`37e35ac`, re-measured at `c21f625`, `78972d4`). A
> third session is redesigning `apps/web/commerce-app`. **Later the same day,
> Steps 7–11 and `propose_resolution` — see §10.** Everything through Step 11
> is built and green; Step 12 (the measurement) and the judgment layer are what
> is left.

---

## 0 · The handover, in one screen

```
  BUILT AND GREEN                                    WHERE
  ─────────────────────────────────────────────────────────────────────────
  MCP server, steps 0–11 of 14                       apps/mcp/commerce
    tools: get_order · get_delivery · get_contact_history · get_policy_rules
           · search_policy · propose_resolution (a DRAFT) — issue_refund
           defined, never registered
    stdio, and HTTP on :3620 (pnpm commerce:mcp-serve-http) — bearer
           COMMERCE_MCP_TOKEN, x-case-id per request, 2026-07-28 only
    31 offline checks   pnpm commerce:mcp-check      (no ports, no db, ~2s)
    14 checks           pnpm commerce:mcp-http-check (ports, stub — Steps 7–8)
    21 live checks      pnpm commerce:mcp-round-trip (needs :3610 — 13 trap
                        cases × every tool, stdio AND HTTP, + the index)
    16 live checks      pnpm commerce:mcp-break      (needs :3610 — Step 6)
  MCP client (Step 10)                               packages/agent/src/mcp
    13 offline checks   pnpm mcp-adapter:check
  The gate (Step 11), and one question through the loop  apps/ai/commerce/src/agent
    13 live checks      pnpm commerce:guard-check    (spawns the server)
     1 smoke            pnpm commerce:ask-mcp        (a model call, free tier)
  Policy index (Step 9)                              thb_kb, read-only role
    pnpm commerce:kb-check · commerce:corpus-check · commerce:retrieval-eval
    83 chunks · recall@6 0.912 over 17 cases (+1 absence) — see §10

  Policy corpus, 12 documents                        docs/commerce/corpus/
    13 checks           pnpm commerce:source-probe   (offline)

  Estate, 5 Neon databases    ┐
  NestJS API on :3610         ├─ other sessions; see their handovers
  Web app on :3600            ┘

  NOT BUILT
  ─────────────────────────────────────────────────────────────────────────
  step 12                     THE MEASUREMENT — every prerequisite now exists
  the judgment layer          prompt · ResolutionAnswerSchema · coherence
                              rules · severity buckets — PLAN.md §8 specifies
                              all four, none is written
  the eval RUNNER             the answer key and 18 cases exist (§4); the
                              client exists (Step 10); nothing runs them until
                              the judgment layer does
```

**To pick this up:** `pnpm commerce:mcp-check` (31) and `pnpm commerce:source-probe`
(13) need nothing — no build, no ports, no database; `search_policy`'s index
module is loaded lazily, so a fresh clone runs them. `commerce:mcp-http-check`
(14) needs ports only. Everything else needs the API on `:3610`, and
`commerce:guard-check` / `commerce:ask-mcp` also need `pnpm build` first (they
import `@fde/agent` and `@thornbury/commerce` from their built `dist/`).

---

## 1 · Who built what, and where their handovers are

| strand | package | handover |
|---|---|---|
| the estate — 5 Neon databases, 44 tables, the six planted traps | `apps/ai/commerce` | `docs/commerce/ESTATE.md` |
| the NestJS API, `:3610`, no AI in it anywhere | `apps/api/commerce` | `docs/commerce/API.md` |
| the web app, `:3600`, `/` and `/steps` only | `apps/web/commerce-app` | `docs/SITE.md` + `infra/commerce/DEPLOY.md` |
| **the MCP server, `:3620` when it gets a transport** | **`apps/mcp/commerce`** | **this file** |

Everything below is the fourth row.

---

## 2 · What the MCP strand actually built

### 2.1 · The files, and the one sentence each is for

```
src/server.ts        createServer() + register(). register() sets
                     structuredContent, isError AND CATCHES — see §5.2, this was
                     wrong once and the correction is the interesting part
src/session.ts       the case and its order, established before the model runs.
                     THE SECURITY ARGUMENT OF THE ENGAGEMENT, in twenty lines
src/api/client.ts    a base URL and a service token. NO connection string, no
                     pg, no ORM — that emptiness is the deliverable
src/api/outcome.ts   the six causes, and why the protocol cannot carry them
src/api/schemas.ts   what the API actually returns, PARSED not asserted
src/tools/get-order.ts   the one tool. Takes no arguments, on purpose
src/stub/order-stub.ts   a stub the shape of the real contract — it lied once
src/wire-selftest.ts     18 checks, offline
src/round-trip.ts        4 checks, live
src/cli/handshake.ts     raw JSON-RPC, for seeing the wire
src/cli/live.ts          one live call, for seeing it work
src/config/env.ts        finds the workspace .env by walking up, not counting ..
```

### 2.2 · The three properties worth not breaking

**`get_order` takes no arguments.** The order is fixed by the session. A tool
with an `orderId` parameter lets anything that can influence the model reach any
order the service token can reach — and what can influence the model includes
text a customer typed into a contact form, which is planted flaw T5 sitting in
`thb_crm` right now. A check asserts the published `inputSchema` has zero
properties, so the property lives in `tools/list` and not in a comment.

**The MCP server holds no credential to Thornbury's databases.** Look at
`client.ts` and at what it does not import. *(Precise since Step 9: it holds
exactly one database login — `thb_kb_reader`, read-only, to OUR index, which
`commerce:kb-check` proves cannot write — and since Step 10 its process loads
only its own `COMMERCE_*` keys, so the estate's admin URL is not even in its
environment.)* If this process is compromised the damage is bounded by what
one token reaches, which is a sentence about the API's authorization — a thing
with tests. Inside the NestJS app the same sentence would be unverifiable.

**Every tool result carries its own cause.** The protocol will not. See §5.1.

---

## 3 · The fourteen steps, and what each still needs

[`MCP-STEPS.md`](MCP-STEPS.md) is the build-along with the full write-up of each.

```
  ☑ 0   the idea                        ☑ 4a  get_order against a stub
  ☑ 1   ping over stdio                 ☑ 4b  …against the live API
  ☑ 2   the inspector                   ☑ 5   typed results — 2026-09-27. The
  ☑ 3   InMemoryTransport tests               SDK's own output check ERASES the
                                              cause; register() checks first
  ☑ 6   break it against the LIVE backend — 2026-09-27. 9 of 14
        causes were mislabelled at the API boundary; see MCP-STEPS
  ☑ 7   HTTP transport, :3620        ┐ 2026-09-27, together — 7 alone
  ☑ 8   bearer auth + fail-closed    ┘ is an open door
  ☑ 9   search_policy over thb_kb, read-only role — 2026-09-27
  ☑ 10  the MCP client, packages/agent/src/mcp/ — 2026-09-27
  ☑ 11  the write-path allowlist — 2026-09-27
  ☐ 12  THE MEASUREMENT — §10 of the plan. Not optional, not last-if-time
```

**Step 12 is the obvious next move, and nothing blocks it.** §5.4's question is
answered: the HTTP handler negotiates 2026-07-28 — when the client opts in.

**Step 12 is the one that justifies the engagement** and the honest expected
answer is "MCP cost us latency and tokens and bought a boundary a NestJS module
would also have bought." That is a real result and publishing it is the point.

---

## 4 · The biggest gap, stated plainly

> **▲ HALF CLOSED 2026-09-27.** The answer key exists: `docs/commerce/WALKTHROUGH.md`
> (every trap worked by hand from live data) plus `evals/cases.jsonl` and
> `evals/README.md` — **18 cases**, 13 trap (T1 ×1, T2 ×1, T3 ×2, T4 ×1, T5 ×2,
> T6 ×6) and 5 clean-answer controls, every check carrying a §11.1 bucket. It
> found ten defects in the estate, corpus and API; §9 is what happened to each.
> Its own stated gaps: nothing yet requires the answer "late", and T4 tolerates
> one citation (POL-RET-001 Rev 3 §7) as a decision Byron can overrule. **What
> is still missing is anything that RUNS it** — the judgment layer (PLAN §8) and
> Step 10's client come first. The text below is the 2026-09-18 state.

**There is no eval suite, and twelve planted traps have nothing grading them.**

The estate has six traps with reserved case ids. The corpus has the document
half of three of them plus one deliberate absence. Neither is graded by
anything. `PLAN.md` §11 names sixteen checks; eight exist.

**And the corpus cannot grow until this exists.** [`CORPUS.md`](CORPUS.md) §5
argues the count is a measurement rather than a target: padding to forty
documents before one eval case has run adds retrieval difficulty nobody can
attribute. The gate is `retrieval:eval` against these twelve. That gate does not
exist, so the corpus is correctly frozen at twelve.

This is the right next handoff to a fresh session. It depends on the estate and
the corpus, which both now exist, and on nothing that is in flight.

---

## 5 · Six things that will bite whoever picks this up

### 5.1 · The protocol erases three of the five failure causes

Measured, not reasoned. A domain refusal, a thrown implementation and a schema
violation **all** arrive as `isError: true` plus free text:

```
DOMAIN refusal   isError=true  text="not in scope for this case"
THROWN           isError=true  text="socket is on fire"
BAD ARGS         isError=true  text="Input validation error: … received number"
```

Only the third is identifiable, by a message *prefix*. So the cause is carried
in `structuredContent` by every tool, and `register()` is what makes that
unforgettable. **Do not "simplify" a discriminator to key on wire shape** — the
mapping from cause to shape is many-to-one and `probeCausesCollapse` asserts it.

Also: an unknown *tool* is `-32602`, not `-32601`. `tools/call` is a method the
server has; `name` is one of its parameters. **And since Step 5 it is not the only
thing `-32602` means:** a known tool whose output breaks its advertised schema is
also `-32602` at a client that has listed tools. Check the name against the last
`tools/list` — MCP-STEPS Step 5.

### 5.2 · `register()` catches, and that is load-bearing

It did not, for one commit. Each tool called `guarded()` itself, which is the
mistake a tool author makes once — **and a handler that throws never reaches its
return**, so the cause is unrecoverable afterwards. `probeUnguardedToolStillLabelled`
registers a tool that throws and never guards, and requires the cause anyway.

Verified by sabotage: remove the catch from `register()` and that check goes red.

### 5.3 · The boundary parses, because a cast cannot disagree

Step 4b returned `ok: true`, `isError: false`, and an order whose every scalar
was `undefined`. Nothing failed. The stub was flat; the real payload nests under
`order`. **A silently wrong success is the worst available failure** — a 500 is
loud, a refusal is labelled, this is neither.

`getJson` now takes a Zod schema rather than a type parameter, so no overload
skips the check, and `malformed_response` is a sixth cause. `commerce:mcp-round-trip`
asserts one schema parses both the stub and the live API.

**If the API changes a field name, that check is what catches it.** It survived
a full estate reseed on 2026-09-18 with no code change, which is the evidence
that it is doing its job rather than encoding today's data.

### 5.4 · Two protocol eras, and stdio only reaches the older one

`LATEST_PROTOCOL_VERSION` in `@modelcontextprotocol/server@2.0.0` is
**`2025-11-25`**, and `SUPPORTED_PROTOCOL_VERSIONS` does not contain
`2026-07-28` at all. The modern era lives in separate constants and is reached
through the `createMcpHandler` HTTP path. We asked for `2026-07-28` and were
answered `2025-11-25` with no error and no warning.

**Open:** whether the HTTP handler negotiates the modern era in practice. Step 7
settles it by running it. Do not guess.

### 5.5 · The env var prefix is split, and nobody has decided

```
ECOMMERCE_DB_URL          the database
ECOMMERCE_DB_DIRECT_URL   the non-pooled endpoint, for CREATE DATABASE
COMMERCE_SERVICE_TOKEN    everything else
COMMERCE_API_URL
COMMERCE_API_PORT
```

One engagement, two prefixes. It has tripped up two sessions and Byron once.
**Raised and not answered — do not rename unilaterally**, because the estate
session reads the first two and a half-applied rename is worse than a confusing
one.

### 5.6 · A transfer failing is not the tool throwing — and the causes are now eight

Added 2026-09-27, by Step 6. `fetch()` and `res.json()` *throw*, so before Step
6 a dead port, a hang and a cut-off body all reached `guarded()` and were filed
as `threw` — "our code raised". `getJson` now catches the transfer itself and
labels it `upstream_unavailable`, with a **15s timeout** (there was none; the
reasoning for 15 is in `client.ts`). A seventh cause, **`unauthorized`**, covers
a 401 and an unset token, which had been `upstream_unavailable` and
`invalid_request` respectively. Step 5 added an eighth, **`invalid_output`**: our
tool returned a success that breaks its own declared shape. `CAUSES` in
`outcome.ts` is now a runtime list, because the published `outputSchema` names
every value. **If you add a tool, do not re-introduce a bare
`fetch`** — go through `getJson`, and `commerce:mcp-break` will say if the label
is wrong.

**One defect found and left for the API's owner:** the 401 body reads
`"x-api-key does not match"`, but this API's header is `x-service-token`. The
text is `@fde/guard`'s own, hardcoded. Harmless to the MCP layer (which does not
repeat it) and misleading to an operator.

---

## 6 · Open decisions nobody has taken

| | |
|---|---|
| **PII across the boundary** | `/orders/:id` returns `customer.email` and `customer.fullName`. The MCP layer parses them so the contract is honest, and does **not** render them into the prose the model reads — but `structuredContent` is the model's context either way. Two sessions agree the narrow answer is probably "parse, do not forward"; *probably* is not good enough for a data-residency decision. `docs/steering/DATA-RESIDENCY.md` is the precedent for the format. **Byron's call.** *Since Step 5 the published `outputSchema` of `get_order` names both fields too — it is the literal statement of what leaves the tool, so the answer to this row changes that schema as well as the API.* |
| **the env prefix** | §5.5 — and the two sessions that recorded a view **disagree**, which is why it needs deciding rather than defaulting. The estate session: unify to `COMMERCE_DATABASE_URL`, because it is inconsistent with all four siblings (`PHARMA_`/`STEERING_`/`SAFETY_DATABASE_URL`) on two axes at once. The web session: **keep them different on purpose and say why at the definition** — `ECOMMERCE_DB_URL` creates and drops five databases, `COMMERCE_API_*` is a token holding no database access at all, §4.1's whole argument is that those must never sit in one process, and a shared prefix invites the copy-paste that puts them there. Their compromise if unified: rename the estate credential to say what it is, `COMMERCE_ESTATE_ADMIN_URL`, rather than making it look like a peer of the service token. |
| **what leaves the tools, beyond the customer** | Decided at the tool layer 2026-09-27, recorded here so it can be overruled: `get_delivery` does **not** pass on the driver's `fullName` or `licenceNo`, or the proof of delivery's `recipientName` (no trap needs them; the schema strips them), nor the API's `calendarDaysLateIfNaive` (the wrong answer printed next to the right one). `get_contact_history` treats the customer's `displayName` and `email` exactly as `get_order` does — parsed, not rendered — so it does not pre-empt the row above. |
| **tool-input strictness** | Zod objects are not strict by default and the SDK does not make them so — an undeclared argument is silently accepted. `coverage-schema.ts` uses `z.strictObject` for the answer contract; tool inputs crossing a trust boundary arguably deserve the same. Recorded as behaviour, not endorsed. |

A line from the estate session worth keeping whoever answers the first one:
**the estate is the place to state what EXISTS, and the tool layer is the place
to state what LEAVES.** Conflating them is how a schema quietly enforces a
policy nobody wrote.

---

## 7 · The method that produced most of the findings

Four strands each had their own passing checks, and almost every real defect was
found by **one session reading another's claim against its code**. My own checks
caught none of the three the UI session found.

Two rules came out of it, and they are in `PLAN.md` §6.1 with the evidence:

**Write the check before the paragraph.** Four conclusions were drawn from four
measurements. The measurements were right every time. The conclusions were wrong
about half the time — and *the ones that survived are exactly the ones that had
a check written against them.* With the limit attached: if a conclusion is not
reachable by a check, "write the check first" silently becomes "do not write the
paragraph", and §10's conclusion is exactly that shape.

**Plant the specific mistake, not a generic failure.** An empty allowlist is not
"a guard test", it is the guard's actual failure mode. A tool that forgets
`guarded()` is not "an error test", it is the mistake a real author makes once.

**And verify by sabotage.** Break it on purpose and watch the right check fail.
A control that has only ever passed is worth less than one somebody has watched
go red.

---

## 8 · State of the tree at the stop point

*As of 2026-09-18.* All MCP-strand work was **committed** at `a1178e6`. Steps 5
and 6 were committed on 2026-09-27 — see the note under the title.

```
apps/mcp/commerce/**          committed
docs/commerce/{PLAN,CORPUS,MCP-STEPS,NEXT}.md   committed
docs/commerce/corpus/**       committed
docs/beyond-retrieval/MCP.md  committed
apps/ai/commerce/src/{config,grounding}/        committed (the descriptor and
                              probe are mine; src/db/ is the estate session's)
```

The three other strands were reporting uncommitted work at the stop point. Their
handovers say what.

### ⚠ THE COMMIT STATE WAS INCOHERENT, AND MY COMMITS DID IT

> **RESOLVED by `725ec3c` (2026-09-18),** which committed the three other
> strands' work with scoped paths. A fresh clone of `master` now contains every
> package its scripts name. What follows is kept for the rules, not the state.

**Three of my commits used `git add <directory>` in a tree four sessions were
writing to, and each swept in work I did not own.** The result is a HEAD that
describes an engagement it does not contain.

| what HEAD has | what HEAD does not have |
|---|---|
| `apps/ai/commerce/package.json` — declares `db:create`, `db:migrate`, `db:seed`, `db:check` | `apps/ai/commerce/db/**` and `src/db/**` — the ~6,000 lines those scripts run |
| `apps/ai/commerce/src/config/connections.ts` | `apps/ai/commerce/tsconfig.json` |
| 8 `commerce:api-*` scripts in the root `package.json` | **`apps/api/commerce` — 58 files, ZERO tracked** |
| `docs/commerce/API.md`, `docs/commerce/ESTATE.md` — the other sessions' handovers | the packages both of them document |
| an `apps/api/*` workspace glob | anything matching it |

```
  23202e6   git add apps/ai/commerce/src/config …   swept connections.ts, package.json
  6b9d619   git add docs                            swept docs/commerce/API.md
  a1178e6   git add docs                            swept docs/commerce/ESTATE.md
```

**A fresh clone of master cannot run any of it.** The scripts exist, the
packages do not, and the failure arrives at run time reading like a broken
script rather than a missing file. That is worse than either clean state.

Also uncommitted and named by the sessions that own them: `turbo.json` (the
`globalEnv` entries and the build `inputs`/`outputs` — **must land with the API
package**, because without `generated/**` declared as an output turbo caches a
`dist/` that cannot run) and the `.env.example` `COMMERCE_*` block.

**Left for Byron rather than fixed.** Committing three other sessions' work is
not mine to do, and all three declined for the same reason: their standing
instruction is to commit when the user asks, and a peer cannot grant that. One
command settles it:

```bash
git add apps/ai/commerce apps/api/commerce apps/web/commerce-app \
        infra/commerce turbo.json .env.example .github/workflows/deploy.yml
git commit
```

**The lesson — and the web session found a stronger version of it by being on
the receiving end.**

My first statement was *"stage files, not directories."* That is true and it is
not enough. `43a26a7` — the commit whose **message** is about directory
ownership — staged exactly one file, `docs/commerce/NEXT.md`, and contains
**5,265 lines of somebody else's web surface and deployment work and none of my
own reasoning about it.**

Because `git add` was never the whole problem. The web session staged their work
with fully explicit paths, precisely to avoid sweeping anyone up, and then went
away to write a commit message. My `git commit` ran in between and took the
entire loaded index.

```
  git add <dir>            → you take what is under that path
  git add <file>; commit   → you take whatever ANYONE has staged since
```

> **The safe unit is stage-and-commit as ONE action.**
> `git commit -F msg -- <paths>` — never a stage that waits.

Explicit paths protect you from what *you* sweep up. They do not protect you
from somebody else committing while your index is loaded, and in a tree several
agents share, the index is shared state with no lock on it. This paragraph was
committed with `git commit -- <paths>` for that reason.

**Nothing was lost** — their work is committed and the tree is correct. What is
wrong is only the attribution and the messages, and neither is worth a rewrite
of published history to repair.

**A NestJS API was left running on `:3610`** during this session and a
`COMMERCE_SERVICE_TOKEN` was generated into `.env` (it was empty; the API is
fail-closed, so `/health` returned 401 until it was set). The token is local and
disposable. Bring the API back with:

```bash
pnpm --filter @thornbury/commerce-api dev
```

---

## 9 · 2026-09-27 — the answer key's ten findings, and what happened to each

The answer-key session (`project-a-c9`) worked every trap by hand from live data
before anything could grade itself, and found ten defects that every existing
check had been green over. **Each strand's checks compared that strand with
itself; none read one strand against another.** Byron took three decisions on
them; this session implemented those and the fixes they needed.

| # | finding | what happened | where it is proven |
|---|---|---|---|
| F1 | the corpus's carrier contracts (Northgate, Pelham) name carriers the estate does not have; every T6 order went by Nexdrop | **Decision 1 — documents follow data.** Rewritten as `CON-CAR-NEXDROP-2025` and `CON-CAR-PARCELANE-2025`, every value matching `carrier_sla`. Both count WORKING days: the estate has no calendar-day clock, so Pelham's calendar-day clause went. **T6 now tests working days against naive subtraction — the carrier-clock contrast is gone because nothing in the data backed it.** T6's prose half is `CON-CAR-NEXDROP-2025#2` | `commerce:source-probe` 13 (three new checks read each contract against `carrier_sla`; sabotage-verified) |
| F2 | `/policy/rules` dropped every `any` row | fixed in the API; its check had accepted `null` | `commerce:api-check` 62 — API.md §0 |
| F3 | T5a's message complained about a lamp not on its order | **Decision 3 — the message was wrong** (no suggestion had been offered; the order is the record, and the frame is the fragile line). Now names the photo frame | `db-check` 56, new T5 check |
| F4 | `promised_by` a working day early on 65 shipments | seed fixed; only the DATE moved | `api-check`, new promise assertion; ESTATE.md §0 |
| F5 | 82 Nexdrop `next_day` shipments have no SLA row | **open** — `get_delivery` returns the delivery with `sla` labelled `not_found` | — |
| F6 | no address outside England & Wales; jurisdiction never exercised | **open** | — |
| F7 | no tool reached `/policy/sla` | `get_delivery` folds the working-day verdict in | `commerce:mcp-round-trip` T6 ×6 |
| F8 | config and corpus disagreed in unplanted places | **Decision 2 — make them agree, except the planted T2 conflict.** DOA §3, GDW §3/§4 (+ new §4.4), BUL-HV, FRD §3/§5 aligned to the rows. c9's seven scored clauses kept their meaning; no Revision Id bumped. **Three places where the DATA disagrees with itself are left open**: PV-HIGHVALUE says items, RR-006 says orders; AT-REFUND-MGR caps a manager at £250 while RR-006 makes >£250 a manager decision (no one can approve it — the prose says escalate); several documents' Effective dates differ from `policy_versions` | CORPUS.md §2 ▲ |
| F9 | stale prose in ESTATE.md and PLAN.md | **open**, listed in ESTATE.md §0 | — |
| F10 | ordinary traffic too incoherent for clean controls | **open** — c9 proposes a reserved `CAS-8xxxx` control block, including a T6 mirror that IS late | — |

**The three read tools** (`get_delivery`, `get_contact_history`, `get_policy_rules`)
were in PLAN.md §5.1 and in none of the fourteen steps; without them the
assistant could reach one trap of six. They are registered through `register()`
(output schema, labelled causes), the two customer-data ones take no arguments
(asserted), and `commerce:mcp-round-trip` sends all 13 trap cases through every
tool as a listing client and checks each trap against the hand-worked key.
Sabotage-verified: filtering the customer's text, letting driver PII through the
schema, giving `get_delivery` an `orderId`, and asking the SLA without the
delivery instant each turn exactly one check red. **Still not built:**
`search_policy` (the index is unclaimed and needs a decision on where it lives)
and `propose_resolution` (it writes rows; it belongs with Step 11's allowlist).

> **⚠ A CREDENTIAL WAS EXPOSED IN A TRANSCRIPT.** While reconciling the corpus, a
> worker session printed the live `ECOMMERCE_DB_DIRECT_URL` — password included —
> into its own tool output. It is in a local session transcript only; no file in
> the repo contains it. **Rotating that Neon role's password is recommended** —
> it is the estate's admin credential, the one that creates and drops all five
> databases. Byron's call; nothing here has been rotated.

---

## 10 · 2026-09-27, later — Steps 7–11, and the decisions taken on the way

Byron: "do the still-open stuff". The write-ups are in MCP-STEPS.md, one ☑ box
per step; this is what the next person needs and what Byron should confirm.

**Decisions made here — each can be overruled:**

| decision | taken | why, and what overruling costs |
|---|---|---|
| `legacy` on the HTTP server | **`reject`** — 2026-07-28 only | one era to test. MEASURED cost: the SDK client's default and inspector 2.7.0 are refused over HTTP (stdio unaffected). Overrule with `legacy: 'stateless'`; `commerce:mcp-http-check` pins it |
| where the index lives | **`thb_kb`, a sixth database on the commerce Neon project**, read by **`thb_kb_reader`** (SELECT on one table) | the estate's admin credential never reaches the MCP process. A separate Neon project would isolate it further; it would need an account change |
| new variables | **`COMMERCE_MCP_TOKEN`** (inbound bearer, NOT the API's token), **`COMMERCE_MCP_PORT`** (3620), **`COMMERCE_KB_URL`** (the reader) | all `COMMERCE_*`, the MCP process's prefix — §5.5's open split is untouched |
| `propose_resolution` | the model supplies `kind` + `amountPence` only; the case is the session's; **`proposedBy` is fixed by the server** | the API stores it as free text — a model argument is how T5b's "Dave approved it" writes "Dave". The answer key now also bounds every draft's AMOUNT (`78972d4`) |
| PLAN §14 q4 | **YES, it is a write** — so the allowlist is of what the model SEES | "write" ≠ "spends money"; `issue_refund` is the money, never listed, never registered |
| failure causes in `@fde/agent` | **mapped into the existing two** (`unknown_tool`, `threw`) | no change to the eval runners that read them; PLAN §6.1's five-way union waits for a consumer |
| tool-input strictness | the existing default (`z.object`) | the query and body are built from declared fields only, so an undeclared argument never reaches the API. §6's row stays open |

**Things that will bite:**

- **The MCP process loads ONLY its own keys from `.env`** (`COMMERCE_*` +
  `EMBEDDINGS`). It used to load the whole file — the estate admin URL included,
  unread. A tool needing a new variable must use `COMMERCE_*` or be added to
  `ownKeys` in `config/env.ts` on purpose; `commerce:mcp-check` asserts the filter.
- **Any client of the HTTP server must pin `versionNegotiation`** — the SDK
  default cannot connect. `apps/ai/commerce/src/agent/mcp-client.ts` does.
- **`tools.snapshot.json` pins the tools block.** Changing a tool's description,
  input schema or annotations turns `commerce:guard-check` red until someone
  reviews it and runs `pnpm commerce:guard-check --accept`. That is the point:
  a description is prompt text.
- **Retrieval reproduces T2's trap.** The natural electronics-return question
  returns only 14-day sources; the current published policy needs
  `audience: published`. MEASURED, recorded as `ret-t2-005`, not tuned. The
  defence belongs to the judgment layer (the answer contract, or a second search).
- **`pnpm install` removed 71 orphaned packages** that were in no lockfile; the
  workspace typecheck (39/39) and every suite passed afterwards.
- **`@fde/grounding`'s `openStore` gained `readOnly`** — skips the DDL a reader
  cannot run. The default is unchanged for the other engagements.
- **New infrastructure on Byron's Neon account**: database `thb_kb` and role
  `thb_kb_reader` (created by `commerce:kb-provision`). The reader can CONNECT to
  the estate databases — PostgreSQL grants CONNECT to every role by default — but
  reading them is refused; `kb-check` asserts the refusal. Revoking CONNECT on the
  five would close that too; it is not done.
- **Two new secrets were written to `.env`** (gitignored, never printed):
  `COMMERCE_MCP_TOKEN` and `COMMERCE_KB_URL`. `.env.example` has placeholders.
- **A missing `tools.snapshot.json` is RED**, not re-pinned — the first version
  pinned itself when absent and compared against what it had just written.
- **`guard-check` cleans up by the server's fixed proposer label**, before and
  after its one write — not by what the response said, which a malformed
  response would leave empty (sabotaged: the row is still deleted).
- **The first `search_policy` loads the embedding model in the MCP process**
  (2.3s first, ~1.9s warm, mostly Neon). Step 12 must separate that from protocol cost.
