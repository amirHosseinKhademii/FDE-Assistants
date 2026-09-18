# Deploying Thornbury Goods

*Written 2026-09-18, when the fifth engagement's surface got its image. The
short version: **one of this engagement's four deployables is deployed, and the
other three cannot be yet.** This file says which, and exactly what unblocks the
rest, because "not deployed" and "not deployable" are different words and only
one of them is a decision.*

Companions: [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the pipeline as a whole ·
[`../../docs/SITE.md`](../../docs/SITE.md) before touching any front end ·
[`../../docs/commerce/PLAN.md`](../../docs/commerce/PLAN.md) §4 for why there
are four deployables at all.

---

## What is deployed

| | | |
|---|---|---|
| `apps/web/commerce-app` | `@thornbury/commerce-app` | **deployed** — jobs `1d` / `2d`, image `infra/commerce/Dockerfile` |
| `apps/mcp/commerce` | `@thornbury/commerce-mcp` | not deployed — **no HTTP transport yet**, see below |
| `apps/api/commerce` | `@thornbury/commerce-api` | not deployed — not this session's, and it holds five database credentials |
| `apps/ai/commerce` | `@thornbury/commerce` | never deployed — a library and its CLIs, no port |

The container app is `commerce-app` in `rg-claims-fde`, on the shared
`cae-pharma` environment, `--min-replicas 0` like the other four. It costs
nothing while idle.

---

## The image, and why it is the simplest of the five

**It needs no secrets.** Not "its secrets are set elsewhere" — it has none. The
two pages it serves (`/` and `/steps`) have no API route, no database, no model
call and no corpus. Every figure on them was read at authoring time and written
into a component, so the image carries statements rather than the means of
producing them.

`safety-app` could say that until its `/desk` landed, and the sentence in its
Dockerfile header had to be rewritten. Expect the same here: **`/desk` is what
will end it.** It brings a loop, a model, an MCP client and a service token, and
when it lands, that token goes on the container app and never into
`deploy.yml` — the same way all four of the others handle theirs. The jobs only
push an image and update a tag.

Nothing in the build changes for that. `pnpm deploy --prod` resolves the app's
dependency graph, so adding a dependency to the app's `package.json` is the
whole of the change.

**It depends on no package from its own engagement.** `@thornbury/commerce`,
`-api` and `-mcp` are all being written by other sessions, and this app imports
nothing from any of them. Their build state cannot break this image. The MCP
server's source appears on `/steps` as *quoted text*, which is a different
relationship from an import and survives the file being mid-refactor.

```bash
docker build -f infra/commerce/Dockerfile -t thornbury-commerce:dev .
docker run --rm -p 8099:8080 thornbury-commerce:dev
# then: http://localhost:8099/ and /steps
```

---

## Why this job is NOT in the host's `needs:`

Jobs `3` and `4` build and deploy `veresk-app`, and they wait on
`steering-deploy`, `pharma-deploy` and `safety-deploy`. They do **not** wait on
`commerce-deploy`, and that is deliberate.

The ordering constraint exists for one reason: `import.meta.env.VITE_*` is
inlined at **build** time, so the firm's page must be built *after* the app it
links to is live, or it bakes in a URL for an origin that does not answer. That
is a real bug this pipeline has shipped once.

**The firm's page does not link to Thornbury.** There is no card, no
`VITE_COMMERCE_URL`, and nothing in `apps/web/veresk-app/src/lib/links.ts`
naming it. So there is no URL to bake in and no ordering to enforce — adding
`commerce-deploy` to the host's `needs:` would only make the host wait on a job
whose output it does not use.

> **When a Thornbury card is added to `veresk-app`, add `commerce-deploy` to
> the `needs:` of BOTH job 3 and job 4 in the same commit.** They are one
> change. A card without the dependency is exactly the bug the pipeline's header
> describes.

The link is one-way in the meantime: the commerce app resolves and bakes in the
*host's* URL (job `1d` looks it up), so the back-link works while the forward
link does not exist.

---

## The MCP server

Deliberately not deployed, and this is the part worth reading — the whole
engagement is an argument about a boundary, so "where does the boundary run" is
not a detail.

**It cannot be deployed today, for two independent reasons.**

1. **It is stdio-only.** `apps/mcp/commerce/src/server.ts` connects a
   `StdioServerTransport` — it reads its own stdin and writes its own stdout.
   There is no `createMcpHandler`, no `listen()` outside the local test stub,
   and therefore **no port for Container Apps to probe**. An image of it would
   start, wait on a stdin nobody is attached to, and fail every health check. A
   stdio server is spawned by its client; it is not a service you visit.
   **Step 7 of [`../../docs/commerce/MCP-STEPS.md`](../../docs/commerce/MCP-STEPS.md)
   is the gate** — it moves the server onto `:3620`.
2. **It would have nowhere to point.** Its environment is meant to hold
   `COMMERCE_API_URL` and `COMMERCE_API_TOKEN`, and the NestJS API those name
   has no image and no job either. Deploying a server whose only job is to reach
   a backend that is not there produces a green deploy and a dead service.

**There is no `mcp.Dockerfile`, and that is a decision.** The tempting one to
write is an image whose `CMD` runs `pnpm commerce:mcp-check` — the wire
self-test. That is a CI job wearing a Dockerfile: the check is a `ts-node`
invocation that needs no image, `.github/workflows/safety-checks.yml` is the
precedent for a per-engagement check workflow, and a second manifest to keep in
sync with `apps/mcp/commerce/package.json` buys nothing a workflow does not.

**Its secrets story will be the inverse of the app's.** The app needs none. The
MCP server will need exactly two things and no database credential at all — and
that emptiness *is* the deliverable (`PLAN.md` §4.1): if the process is
compromised, the blast radius is what one service token can reach, which is a
sentence about the API's authorization and therefore a thing with tests. When it
is deployed, the token is set **on the container app**, never in the workflow.

### What has to be true before an MCP job exists

```
1  Step 7   the HTTP transport, on :3620          ← the gate
2  Step 8   a bearer-token guard in front of it, with the fail-CLOSED test
            (unset the variable and confirm everything is REFUSED)
3           apps/api/commerce has an image and a job, so COMMERCE_API_URL
            names something that answers
4           a service token minted and set on the container app
```

Steps 1 and 2 need nobody — they are about the server and nothing else. Step 3
is another session's. So the MCP server is two steps from *buildable* and three
from *useful*.

---

## Path filters

`deploy.yml` is path-filtered so a README edit does not rebuild five images. The
commerce entries are `apps/web/commerce-app/**` and `infra/commerce/Dockerfile`.

`apps/mcp/**` and `apps/api/**` are **deliberately absent**. No image is built
from either, so listing them would start a run that rebuilds four unrelated
images for a change that cannot affect any of them. Add the path in the same
commit that adds the job, not before — the pipeline's own header records the
opposite mistake (a source that ends up in an image and is *not* listed, so a
push silently deploys nothing).

---

## What has not been run

The jobs above have **never executed**. The image builds and serves locally —
that part is verified — but `1d`/`2d` have not run in CI, the `commerce-app`
container app does not exist yet, and the first run of `2d` will take the
*create* branch rather than the update branch.

Two things to expect on that first run, both of which are the pipeline working
rather than failing:

- The identity needs **Contributor on the resource group**, not on a single app.
  Job `2d` fails with an explicit message if it cannot list the apps.
- The back-link resolves to empty and logs a warning if `veresk` has no ingress.
  That is correct: an unset `VITE_VERESK_URL` renders the firm's name as plain
  text rather than as a link to a port on the reader's own machine.
