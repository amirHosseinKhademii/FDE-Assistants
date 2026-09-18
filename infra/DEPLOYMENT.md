# Deployment — running this for a real customer

**Status: built for pharma, not for insurance.** The pharma release desk runs on
Azure Container Apps, deployed by GitHub Actions —
[`infra/veresk/DEPLOY.md`](pharma/DEPLOY.md) is what actually exists, and
[`docs/PROGRESS.md`](../docs/PROGRESS.md) §14 is the reasoning and the four
silent failures it turned up. This file remains the plan for the INSURANCE side
and for the questions a real customer asks, none of which the pharma deployment
settles: telemetry destination, SSO, redaction, retention, sampling. This file is the plan
and the decisions it depends on, written down so the choices already made
(managed identity, `store: false`, one file that knows the database) can be
shown to pay off — or be corrected early. The two pillars it leans on are no
longer gaps: Pillar 5 now writes a durable request log, and the fail-closed
guard of Pillar 6 is written and tested.

Companion: [`GUIDE.md`](../GUIDE.md) §7 for what Pillars 5–8 are, §9 for the
current per-pillar status, and §10 for the build order.

---

## The rule that decides everything

> Claims data includes personal information, sometimes medical records, and is
> subject to insurance-commissioner audits. Every question below is really the
> same question: **where does this data physically sit, and who else can read
> it?**

An insurer may simply not allow claims data to leave their network. Design for
that and the easier cases come free; design for a convenient managed cloud and
you may have to rewrite before you can even discuss it with their
infrastructure team.

---

## What runs where

| Piece | Local today | In their environment |
|---|---|---|
| The app | `pnpm ask` / `pnpm eval` on your laptop, plus `POST /api/ask` — a TanStack Start server route (`apps/insurance-app/src/routes/api.ask.tsx`) on `pnpm dev` | a container: Azure Container Apps, AKS, or Docker Compose on their VM |
| Policy index | Neon (Frankfurt) or a local container | **their** Postgres + pgvector — Azure Database for PostgreSQL, RDS, or on-prem |
| Chat + embedding models | Azure AI Foundry, Sweden Central | Foundry in **their** tenant and region, or whatever their approved provider is |
| Credentials | `az login` on your machine | **managed identity** — same code path, no branch, no key |
| Telemetry | `logs/requests.jsonl` on disk, `pnpm logs:sync` into Postgres, Langfuse in Docker | the log file must be **shipped off the box** on a schedule — a container's disk is ephemeral; the dashboard is the real decision, see below |
| Baselines | `docs/evals/results/*.json` in git | unchanged. Files in a repo need no service and cross no border |

Two of those need no work at all, and that is the point of how they were built.
`packages/insurance/src/grounding/store.ts` is the only file that knows the
database, and `packages/insurance/src/foundry/client.ts` resolves credentials
through `DefaultAzureCredential`, which picks up a managed identity in Azure
exactly as it picks up your `az login` locally.

---

## Telemetry — the decision that actually matters

A trace carries the question, the retrieved policy wording, and the model's
reasoning about a named customer's entitlements. That is claims data. Three
options, ranked by how the security review goes:

### A. Langfuse, self-hosted in their environment

Everything stays inside their network. Six services to run — Postgres,
ClickHouse, Redis, S3-compatible storage, the web app, the worker — each mapped
to a managed equivalent they already operate, or all of it on one VM via the
compose file.

**Buys:** the LLM-specific views — per-trace cost, dataset-run comparison, click
into any answer.
**Costs:** six services to operate, monitor and back up. Real work, not a
`docker compose up`.

### B. OpenTelemetry → Azure Monitor

Telemetry lands in the same tenant they already approved for the models. **No
new vendor, no new assessment, no new border crossed** — which is often the
difference between shipping this quarter and next.

The instrumentation is already OpenTelemetry-based (`@langfuse/otel`,
`@opentelemetry/sdk-trace-node`), so the destination is an exporter setting
rather than a rewrite. In outline:

```
npm i @azure/monitor-opentelemetry

APPLICATIONINSIGHTS_CONNECTION_STRING=<from their App Insights resource>
```

…and the same spans this app already emits go to Application Insights instead
of, or in addition to, Langfuse. **Spike this before promising it** — package
APIs move, and the GenAI semantic conventions are still settling.

**Buys:** one pane with the rest of their infrastructure, zero procurement.
**Costs:** no LLM-native views. Token counts and costs become custom metrics you
define, not a built-in screen.

### C. Managed Langfuse Cloud

Fastest to stand up, and it makes a third party a **data processor for insurance
data** — a DPA to negotiate and a vendor assessment to open. Sometimes fine.
Rarely fast. Never assume it.

### The recommendation

**Instrument once with OpenTelemetry, export to Azure Monitor by default, and
add self-hosted Langfuse if the team wants the LLM views.** The instrumentation
is the expensive part and it is already portable; the destination is config.

---

## Four things production needs that local does not

- **SSO.** Whoever opens the dashboard logs in with the corporate identity
  provider. Langfuse supports OIDC. Without it you have created an unmanaged
  account store holding claims data.
- **Redaction before send.** Decide what may never enter a trace — names,
  addresses, claim narratives. Strip it at the source. Explaining later why it
  is in there is a worse conversation.
- **Retention.** Traces accumulate forever by default. A retention window is
  both a cost control and usually a compliance requirement.
- **Sampling.** At ten thousand claims a month you do not trace every one. Trace
  every failure and a percentage of successes.

---

## Pillar 5 — what exists, and what is still owed regardless of destination

The durable request log now exists. Every call through
`packages/insurance/src/coverage.ts` — which is the single path behind `pnpm ask`,
`pnpm eval` and the HTTP route — appends one line to `logs/requests.jsonl`,
tagged with the claim, carrying tokens, latency, tool count, stop reason and a
cost in USD. `packages/insurance/src/grounding/cli.ts` does the same for `ingest`,
which is the cost that scales with the corpus rather than with traffic. The
write is wrapped and never throws: a broken log costs you data, a broken request
costs the customer an answer.

`pnpm logs:sync` ships that file into a `request_log` table in Postgres so the
question can be answered in SQL. It is idempotent — the key is the line's
timestamp plus its surface — so re-running it inserts nothing twice. The split
is deliberate and survives a container with an ephemeral disk: append locally
where a write cannot fail in a way that matters, ship afterwards where it can.

**What is still owed:**

- **The chat-model price is PROVISIONAL.** The `PRICING` table in
  `packages/insurance/src/telemetry/request-log.ts` carries a *verified* rate for
  `text-embedding-3-small` (Azure retail price API, `swedencentral`, the
  GlobalStandard `-glbl` meter, checked 2026-09-10) and an explicitly
  provisional one for `gpt-5-mini`: every `gpt-5-mini` meter published for that
  region carries the `pp` priority-processing marker and there is no plain
  meter, so the tier this deployment actually bills at is not established — the
  rate may be about 2x high. Settle it from Cost Management once real usage
  lands; what you were charged outranks any published list price. Until then
  every logged line carries the caveat in its `costNote`.
- **Shipping the log off a deployed box.** `logs:sync` is run by hand today. In
  their environment it needs to be a scheduled job, with the same retention and
  redaction decisions as the traces above.

One rule survives unchanged, and it is the reason the provisional rate is
labelled rather than quietly used: whatever writes this log must **refuse to
price a model with no verified pricing data** rather than emit a
plausible-looking number. `price()` returns `costUsd: null` plus a stated reason
for any model absent from `PRICING`. A precise-looking wrong number is worse
than an admitted gap — it gets quoted in a business case.

---

## Pillar 6 — the guard on the HTTP surface

The HTTP endpoint exists — `POST /api/ask`, a TanStack Start server route in
`apps/insurance-app/src/routes/api.ask.tsx` — and it is **guarded**.
`packages/insurance/src/security/guard.ts` holds the decision, transport-agnostic
so `pnpm guard:check` can exercise every branch offline, including the branches
that must deny. The route calls it before doing any work.

It fails *closed*. The obvious API-key check (`if (process.env.API_KEY && ...)`)
fails open — forget the variable in a deploy config and you have silently
shipped an unauthenticated endpoint. This one instead reads: key set → the
request must present it, compared in constant time; key unset in dev → allowed,
because the dev server binds loopback and that guarantee is made by the listener
rather than by application code; key unset in production → **refused**, because
nothing in application code can prove the listener is loopback-only. Deploying
without a key is a configuration error and it reads like one.

What that leaves for deployment: **set `API_KEY` in the deploy config**, and
bind the container's listener deliberately rather than by default. A proxy
header is attacker-controlled and is not evidence of where a request came
from.

---

## The runbooks

| | |
|---|---|
| [`RESTORE.md`](RESTORE.md) | **rebuilding the Azure side from an empty subscription.** What a teardown takes and what it cannot, the order that matters, and the five traps that actually fired on 2026-09-16. Read this one first if nothing is deployed. |
| [`veresk/DEPLOY.md`](veresk/DEPLOY.md) | the firm's door — one page, no secrets |
| [`pharma/DEPLOY.md`](pharma/DEPLOY.md) | the substantial one: secrets, identity, the free-tier arithmetic |
| [`steering/DEPLOY.md`](steering/DEPLOY.md) | the bid desk |
| [`commerce/DEPLOY.md`](commerce/DEPLOY.md) | the fifth engagement — the one where **three of four deployables cannot be deployed yet**, and the reasons are structural rather than scheduling. Read it for why the MCP server has no image and what unblocks one. |

---

## Deployment targets

| Option | Where data sits | Notes |
|---|---|---|
| **Azure Container Apps** | your/their Azure region | simplest, scales to zero. Never deploy a mutable `:latest` tag — the stale-image trap |
| **AKS** | their region | full Kubernetes; nodes and load balancers are never free |
| **Docker Compose on their infrastructure** | entirely theirs | the maximal residency answer. Their change-management process, not `git push` |

Start on Container Apps for your own demo, **design for the third**. The choices
already made — managed identity over static keys, no secrets in the image,
`store: false` so no conversation state sits with the provider — are exactly
what keeps that option open without a rewrite.

---

## The order to do it in

1. ~~**Pillar 5 first.**~~ Done — the request log is written and syncs to
   Postgres. What remains is a confirmed `gpt-5-mini` price and a scheduled
   sync, not a missing record. Deploying something you cannot measure means
   finding out from the customer.
2. ~~**Then the fail-closed guard**~~, before anything is reachable over HTTP.
   Written and tested; deploying it means setting `API_KEY`.
3. **Then a deployment target**, once the eval scorecard gives both sides a
   reason to trust it beyond a demo. This is the part that is still entirely
   unbuilt.

Everything above is reversible except the data you never wrote down.
