# Deploying Meridian Pharma — Azure Container Apps

*This file moved back from `infra/veresk/` on 2026-09-13. It always described
THIS app — the secrets, the managed identity, the Foundry role — it was just
living under the name of the app that happened to serve the pharma pages at the
time. When `apps/pharma-app` was split out, the document followed the thing it
was about.*

What actually runs, what it costs, and how to put a new build on it. Every
command here was run on 2026-09-12 and the results are recorded below. This is
Pillar 8 for the pharma domain; `infra/DEPLOYMENT.md` is the wider plan and the
telemetry decision, which this does not settle.

**The directory moved from `infra/pharma/` on 2026-09-13**, with the workflow,
when `apps/veresk-app` became the name of the thing being built. Three names in
the table below did NOT move with it — the container app, the image repository
and the app registration all still say "pharma", because each is a live object
outside this repo and renaming it means recreating it. That asymmetry is the
row-by-row note below, not an oversight.

**Both apps deploy from one workflow**, `.github/workflows/deploy.yml`, in a
fixed order: build steering → deploy steering → build veresk → deploy veresk.
The order is the point. The apps link to each other, `import.meta.env.VITE_*` is
inlined at BUILD time, and two independent workflows racing on one push cannot
guarantee that the target exists before the linker is built. It did not once,
and put a 404 on the live site.

**`apps/steering-app` has its own image and app** — `infra/steering/DEPLOY.md`. It was briefly not deployed at all, on the grounds that a
container for a page with no model call costs money for nothing. That was the
wrong trade: the firm's front page then carried an engagement it could not link
to. The two apps link to each other by URL, baked into each image at BUILD time;
the trap in that is written up in the steering DEPLOY.md.

## What exists

> **The `<angle-bracket>` values are redacted on purpose.** This repository is
> public, and a tenant id next to a client id names the exact app registration
> to attack — even though neither is a credential and the federated token
> exchange is what actually authenticates. Read the real values out of the
> portal, or:
>
>     az account show --query '{subscription:id, tenant:tenantId}'
>     az ad app list --display-name gh-deploy-pharma --query '[].appId'
>     az containerapp show -n pharma-app -g rg-claims-fde --query identity.principalId
>
> What this document is *for* is the prose around the table, not the ids.

| Piece | Value |
|---|---|
| Subscription | `Claims FDE` — `<subscription-id>` |
| Resource group | `rg-claims-fde` (shared with the Foundry resource, deliberately) |
| Region | `swedencentral` — same as Foundry. Neon is Frankfurt. The whole path stays in the EU. |
| Environment | `cae-pharma`, **Consumption-only** |
| App | `pharma-app` — renamed from `pharma-app` on 2026-09-13. Azure has no rename for a container app, so this was a recreate: same image, same two secrets, same environment, a fresh system-assigned identity granted the same Foundry role, verified end to end, and only then pointed at by the pipeline. The FQDN changed with it. |
| URL | https://pharma-app.lemonsky-6acd5222.swedencentral.azurecontainerapps.io |
| Image | `docker.io/amir2575/veresk` — was `meridian-pharma`; the repo name follows the app, the old one is left in place rather than deleted |
| Identity | system-assigned, `<identity-principal-id>`, holding `Cognitive Services OpenAI User` on `<foundry-resource>`. The old app's was `<old-identity-principal-id>`; a recreate gets a new principal, so the role assignment has to be made again — forgetting it gives a page that loads and fails on the first question. |
| Databases | unchanged — the same Neon project the laptop uses |

## Why it is free, and the one setting that decides it

Container Apps gives 180,000 vCPU-seconds and 360,000 GiB-seconds per
subscription per month, and **the grant covers ACTIVE seconds only** — an idle
replica is billed outright, not granted.

At the 0.5 vCPU this app is given, 180,000 vCPU-s is about 100 hours against the
730 in a month. So a single always-on replica would exceed the grant seven times
over. `--min-replicas 0` is not a tuning choice; it is the entire free claim. A
60-second answer costs about 30 vCPU-s, which leaves room for thousands of them.

**What is NOT free: Foundry tokens.** Every answer bills chat and embedding
calls, on any host. And per `.env.example`, this app still points at the Foundry
resource shared with ../Travel-Assistant — that was a note while it ran on a
laptop. Deployed and clicked by other people, it becomes a cost you cannot
attribute. Give it its own resource before quoting a number to anyone.

`--logs-destination none` avoids a Log Analytics workspace. Live streaming with
`az containerapp logs show --follow` still works; nothing is retained.

## Credentials — what is a secret and what is not

Foundry access uses the **system-assigned managed identity** holding
*Cognitive Services OpenAI User* on `<foundry-resource>`. No key, anywhere. This
is the same `DefaultAzureCredential` code path as `az login` on the laptop,
which is why nothing in the app changed to deploy it.

That role name was not recalled — it was read off the working local setup with
`az role assignment list` against the Foundry account, and then granted to the
app's principal.

`PHARMA_DATABASE_URL` and `API_KEY` are Container Apps **secrets**, referenced
as `secretref:`, not plain env vars. The generated API key is recoverable:

    az containerapp secret show -n pharma-app -g rg-claims-fde \
      --secret-name api-key --query value -o tsv

A registry pull credential, if the image is made private, is a THIRD kind of
thing: it is not data access and it does not weaken the managed-identity story.

## Verified on the deployed app

- page 200, hydration entry script present and served
- `/api/lots` returns real lots — the six Neon databases are reachable
- fail-closed guard 401s with no key and with a wrong key
- a full release assessment runs: `assess_release` tool call → Neon → model →
  schema-validated answer, with **managed identity supplying the token**
- **SSE is not buffered by ingress**: events arrive at +3s, +4s, +12s rather
  than landing together at the end. That failure would be silent — the answer
  would still be correct and the live tool-event UI would be pointless.
- a question without a market is REFUSED rather than guessed, because the
  spec limits differ by market. That is the contract working, not a fault.

## Putting a new build up

    docker build -f infra/veresk/Dockerfile -t amir2575/meridian-pharma:v2 .
    docker push amir2575/meridian-pharma:v2
    az containerapp update -n pharma-app -g rg-claims-fde \
      --image docker.io/amir2575/meridian-pharma:v2

**Use a new tag every time.** Pushing over `:v1` and updating to the same string
is the exact failure `infra/DEPLOYMENT.md` records: a revision serving a stale
image because nobody could tell which one the tag meant.

## Deploying from CI

`.github/workflows/deploy-veresk.yml` does the whole thing: build the image,
push it, update the app, and then prove the deployed thing is the thing it just
built. It runs on `workflow_dispatch` and on a push to `master` that touches the
app, the packages, the Dockerfile or the lockfile.

**No Azure secret is stored for it.** A federated credential lets GitHub's OIDC
token be exchanged for a short-lived Azure token — the same "no long-lived key"
position the managed identity takes for Foundry. What was created:

| Object | Value |
|---|---|
| App registration | `gh-deploy-pharma` — client id `<client-id>` |
| Service principal | `<service-principal-id>` |
| Federated subject | `repo:amirHosseinKhademii/Insurance-Assistant:ref:refs/heads/master` **and** the ID-qualified form below |
| Role | **Contributor scoped to the `pharma-app` resource** — not the resource group |

The narrow scope is deliberate and is not yet proven: it is enough to change the
app's image, and if `containerapp update` turns out to need read on the managed
environment the first run will say so. Widen it then, to the environment, not to
the subscription.

**TWO federated credentials exist, and the second one is the one that works.**
The documented subject format is `repo:<owner>/<repo>:ref:<ref>`, and the first
run failed `AADSTS700213` because GitHub actually presented:

    repo:amirHosseinKhademii@61829292/Insurance-Assistant@1364157067:ref:refs/heads/master

— the owner and repository IDs embedded in the claim. The error names the
subject it presented, so read it rather than the documentation: whatever is in
the `subject claim` line of the failed `azure/login` step is what the credential
must match, byte for byte. Both are registered, so a change on GitHub's side in
either direction keeps working.

### Repository secrets

    AZURE_CLIENT_ID        <client-id>
    AZURE_TENANT_ID        <tenant-id>
    AZURE_SUBSCRIPTION_ID  <subscription-id>
    DOCKERHUB_USERNAME     amir2575
    DOCKERHUB_TOKEN        read/WRITE Docker Hub token

None of those three Azure values is a credential — they are identifiers. The
token exchange is what authenticates, and it cannot happen from outside the
federated subject above.

**`DOCKERHUB_TOKEN` is a SECOND, different token from the read-only one that
Container Apps will use to pull.** Push needs write; pull needs read. Using one
token for both gives the cloud more authority than it needs, and pasting the
read-only one into CI fails the push with a 403 that mentions nothing useful.

### The silent non-deploy, and why the wait loop earned its keep

The deploy job originally took the image name from the build job as
`needs.build.outputs.image`. Re-running ONLY the failed deploy job skips
`build`, a skipped job contributes no outputs, and `az containerapp update
--image ""` treats an empty value as "change nothing" **and exits 0**. So the
step went green, no revision was created, and the app carried on serving the
old image.

Nothing about that is visible in the command's output. It was caught only
because the job goes on to assert that the app's template carries the exact sha
— it looped forty times reporting `image=...:v1` and failed, which is the
correct outcome.

The tag is a pure function of the commit, so both jobs now derive it
independently and there is nothing to lose between them.

### What the deploy job asserts

`az containerapp update` returns before the new revision serves, so a smoke test
run immediately can hit the OLD revision, get a 200, and go green having
deployed nothing. The job therefore waits until the active revision reports
`Provisioned` AND the app's template carries the exact sha that was just pushed,
and only then makes two requests: the page must be 200, and `POST /api/ask` with
no key must be **401**. The second is the one that catches a deploy that shipped
an empty `API_KEY` — which would otherwise look completely healthy while being
open to the internet.

### Ordering, when the image is made private

Attach the pull credential FIRST, then flip the repository to private:

    az containerapp registry set -n pharma-app -g rg-claims-fde \
      --server docker.io --username amir2575 --password <READ-ONLY token>

The other order gives a window where the app cannot pull its own image, and a
scale-from-zero in that window fails with no obvious cause.

## Build time — where it went, and what fixed it

A CI build took nearly five minutes. Reading the log rather than guessing, two
things dominated, and neither was the compile:

**`pnpm deploy` re-runs native postinstall scripts.** The install step skips
them; `deploy` does not. `onnxruntime-node`'s postinstall DOWNLOADS CUDA and
TensorRT provider libraries from nuget — 302 MB of GPU runtime, into an image
with no GPU, for a package this deployment never loads. It was downloaded,
layered, pushed to the registry, exported to the CI cache, and pulled again on
every cold start. `--ignore-scripts` on the deploy step removes all of it:
1.34 GB → 1.02 GB.

**`cache-to: type=gha,mode=max`** exports every intermediate layer. Measured in
CI: over two minutes in "exporting to GitHub Actions Cache" — more than the
install it was there to save. Now `mode=min`, which keeps the final stage that
the next build actually matches against.

Note the first run after any of this still pays full price: a cache that has
never been written cannot be read.

## Known, and not yet done

- **The Docker Hub repo is PUBLIC.** Docker Hub creates a repo public when a
  push creates it. Nothing sensitive is in the image — `.dockerignore` keeps
  `.env` out — but the compiled domain package is the thing a customer pays
  for. Making it private needs a read-only access token attached with
  `az containerapp registry set`.
- **The image is 1.02 GB and the cold start is 28.3 seconds**, measured after
  the app genuinely scaled to zero — not estimated. 211 MB of what remains is
  `onnxruntime-node`, pulled in by `@huggingface/transformers`, which is only
  reachable when `EMBEDDINGS=local`; this deployment runs `foundry` and never
  loads a byte of it. Removing it needs `@fde/grounding` to treat that
  dependency as optional — a change to a domain-neutral package, so it is
  deliberately not done here.
- **No telemetry destination.** `infra/DEPLOYMENT.md` recommends OpenTelemetry
  to Azure Monitor; nothing is wired here, and a container's disk is ephemeral,
  so the Pillar 5 request log currently dies with the replica.
- **Ingress is open to the internet**, protected only by the shared API key.
  That is adequate for a demo and is not an authentication system.
