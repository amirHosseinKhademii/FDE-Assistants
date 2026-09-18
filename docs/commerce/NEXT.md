# Commerce — what is open right now

*Written 2026-09-18 at a deliberate stop point. Four sessions built four strands
in parallel and halted together so the work could be picked up cold. This file
is the handover for the **MCP strand**; the other three write their own, listed
in §1.*

**Read [`PLAN.md`](PLAN.md) for what the engagement is.** This file is only what
is done, what is not, and what the next person needs to know before touching it.

---

## 0 · The handover, in one screen

```
  BUILT AND GREEN                                    WHERE
  ─────────────────────────────────────────────────────────────────────────
  MCP server, steps 0–4b of 14                       apps/mcp/commerce
    18 offline checks   pnpm commerce:mcp-check      (no ports, no db, ~2s)
     4 live checks      pnpm commerce:mcp-round-trip (needs :3610 up)
     1 demo             pnpm commerce:mcp-live

  Policy corpus, 12 documents                        docs/commerce/corpus/
    10 checks           pnpm commerce:source-probe   (offline)
    81 chunks, 0 orphaned table rows even at 120 chars

  Estate, 5 Neon databases    ┐
  NestJS API on :3610         ├─ other sessions; see their handovers
  Web app on :3600            ┘

  NOT BUILT
  ─────────────────────────────────────────────────────────────────────────
  steps 5–14                  see §3 for what each needs
  the judgment layer          prompt · ResolutionAnswerSchema · coherence
                              rules · severity buckets — PLAN.md §8 specifies
                              all four, none is written
  the eval suite              twelve planted traps, no graded suite. THE
                              BIGGEST GAP — see §4
  embeddings / search_policy  the corpus is written and never ingested
```

**To pick this up:** `pnpm commerce:mcp-check` needs nothing and proves the
protocol layer. `pnpm commerce:source-probe` needs nothing and proves the
corpus. Between them that is 28 checks and about four seconds, and if both are
green the two strands documented here are intact.

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

**The MCP server holds no database credential.** Look at `client.ts` and at what
it does not import. If this process is compromised the damage is bounded by what
one token reaches, which is a sentence about the API's authorization — a thing
with tests. Inside the NestJS app the same sentence would be unverifiable.

**Every tool result carries its own cause.** The protocol will not. See §5.1.

---

## 3 · The fourteen steps, and what each still needs

[`MCP-STEPS.md`](MCP-STEPS.md) is the build-along with the full write-up of each.

```
  ☑ 0   the idea                        ☑ 4a  get_order against a stub
  ☑ 1   ping over stdio                 ☑ 4b  …against the live API
  ☑ 2   the inspector                   ◐ 5   typed results — LARGELY DONE by
  ☑ 3   InMemoryTransport tests               4b's schema work; what remains is
                                              outputSchema on the tool itself
  ☐ 6   break it against the LIVE backend rather than the stub.  NEEDS NOBODY
  ☐ 7   HTTP transport, :3620.                                   NEEDS NOBODY
  ☐ 8   bearer auth + the fail-closed test.                      NEEDS NOBODY
  ☐ 9   search_policy — needs embeddings and an ingested corpus
  ☐ 10  the MCP client in packages/agent/src/mcp/
  ☐ 11  the write-path allowlist
  ☐ 12  THE MEASUREMENT — §10 of the plan. Not optional, not last-if-time
```

**Steps 6, 7 and 8 need nobody and are the obvious next move.** Step 7 also
settles an open question: whether `createMcpHandler` negotiates the 2026-07-28
protocol era, which stdio does not — see §5.4.

**Step 12 is the one that justifies the engagement** and the honest expected
answer is "MCP cost us latency and tokens and bought a boundary a NestJS module
would also have bought." That is a real result and publishing it is the point.

---

## 4 · The biggest gap, stated plainly

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

## 5 · Five things that will bite whoever picks this up

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
server has; `name` is one of its parameters.

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

---

## 6 · Open decisions nobody has taken

| | |
|---|---|
| **PII across the boundary** | `/orders/:id` returns `customer.email` and `customer.fullName`. The MCP layer parses them so the contract is honest, and does **not** render them into the prose the model reads — but `structuredContent` is the model's context either way. Two sessions agree the narrow answer is probably "parse, do not forward"; *probably* is not good enough for a data-residency decision. `docs/steering/DATA-RESIDENCY.md` is the precedent for the format. **Byron's call.** |
| **the env prefix** | §5.5 |
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

All MCP-strand work is **committed**. Last commit `a1178e6`.

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

### ⚠ THE COMMIT STATE IS INCOHERENT, AND MY COMMITS DID IT

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

**The lesson, and it is the reason this is written down rather than quietly
fixed:** `git add <path>` is a claim to own everything under that path. In a
shared tree that claim is usually false, and it is false silently — nothing in
the commit output distinguishes the two files you meant from the two you did
not. Stage files, not directories, when you are not alone in the tree.

**A NestJS API was left running on `:3610`** during this session and a
`COMMERCE_SERVICE_TOKEN` was generated into `.env` (it was empty; the API is
fail-closed, so `/health` returned 401 until it was set). The token is local and
disposable. Bring the API back with:

```bash
pnpm --filter @thornbury/commerce-api dev
```
