# Rebuilding this from nothing — after a teardown

*Written 2026-09-16, during the rebuild it describes. The Azure side was deleted
entirely and put back; everything below was run, and the traps are the ones that
actually fired rather than the ones worth worrying about in theory.*

The three per-app runbooks — [`veresk`](veresk/DEPLOY.md),
[`pharma`](pharma/DEPLOY.md), [`steering`](steering/DEPLOY.md) — describe a
working deployment. This one describes getting back to it from an empty
subscription, which is a different list in a different order.

---

## 1 · What a teardown does and does not take

The useful thing to know first, because it decides how much work this is.

| | survives | why |
|---|---|---|
| Entra app registration | **yes** | it lives in the directory, not the subscription |
| Federated credentials | **yes** | attached to the app registration |
| Service principal | **yes** | same |
| **Role assignment** | **NO** | scoped to the resource group, and dies with it |
| Docker Hub images | **yes** | not Azure at all |
| Neon databases | **yes** | not Azure at all — `az group delete` cannot reach them |
| GitHub secrets | **yes** | not Azure at all |
| Resource group, environment, apps | no | obviously |
| Azure OpenAI / Cognitive Services | no | and its per-token history still lands on the month's bill |
| The environment's `defaultDomain` | no | a NEW random one is issued — see §5 |

**The role assignment is the one that surprises people.** The service principal
is intact, its federated credentials are intact, and the CI login still fails,
because the grant was scoped to a resource group that no longer exists.
Recreating a group with the same name does not restore it — same name, new
resource id, no assignment.

```bash
# the diagnostic: empty output means CI cannot deploy
az role assignment list --all \
  --query "[?principalType=='ServicePrincipal'].{principal:principalName, role:roleDefinitionName, scope:scope}" -o table
```

---

## 2 · The order

Each step fails in a way that reads like the previous step's problem if you skip
it, which is why the order is worth keeping.

```bash
# 1 — the group
az group create -n rg-claims-fde -l swedencentral

# 2 — the environment. --logs-destination none keeps Log Analytics ingestion
#     out of the picture; see §4 for what that does and does not cost you.
az containerapp env create -n cae-pharma -g rg-claims-fde -l swedencentral \
  --logs-destination none

# 3 — the grant CI needs. The app id is the GitHub secret AZURE_CLIENT_ID;
#     `az ad app list --all -o table` finds it if the secret is unreadable.
az role assignment create \
  --assignee <AZURE_CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUB_ID>/resourceGroups/rg-claims-fde
```

Then **push, or dispatch `deploy`**. Every deploy job creates its app if it is
missing, so the apps do not have to exist first — that was not true before
2026-09-16, when only `steering-deploy` could do it and the other two exited 3
with *"The containerapp does not exist"*.

The first run creates all three apps and **fails** on `steering-app` and
`pharma-app`, because a freshly created app has no environment variables and the
guard refuses with 503. That is the fail-closed guard working. Configure, re-run.

---

## 3 · Configuring an app

Secrets by reference, never inline: `--set-env-vars API_KEY=<value>` puts the
value in the revision template where every `az containerapp show` prints it.

```bash
KEY=$(openssl rand -hex 32)
echo "length: ${#KEY}"      # must print 64 — see the first trap below

for app in steering-app pharma-app; do
  az containerapp secret set -n "$app" -g rg-claims-fde --secrets api-key="$KEY"
  az containerapp update     -n "$app" -g rg-claims-fde --set-env-vars API_KEY=secretref:api-key
done
```

Then the databases, per app: `STEERING_DATABASE_URL` / `PHARMA_DATABASE_URL`
from Neon. Those are genuinely just configuration and they work.

> ### The model is NOT configuration, and this section used to say it was
>
> An earlier version of this file listed `LLM_PROVIDER=hosted` with
> `HOSTED_API_KEY`, `HOSTED_MODEL` and `HOSTED_BASE_URL` alongside the database
> URLs, as though setting them would give the deployed apps a working model. It
> will not, for `steering-app` and `pharma-app`, and the reason is in the code
> rather than in the environment. Corrected 2026-09-16, measured rather than
> assumed:
>
> **They bypass the provider switch.** `assess-requirement.ts:83`,
> `summarise-bid.ts:77`, `explain-assessment.ts:66` and pharma's
> `release-agent.ts:127` all call `openaiClient()` — the `@fde/foundry` Azure
> client — directly, and pass `env.chatDeployment()` as the model, which is
> `gpt-5-mini` and means nothing to any other provider.
> `apps/ai/steering/src/llm/provider.ts` does hold a switch, it knows only
> `azure|bedrock`, and its one importer is `cli/llm-ping.ts`. It is not on the
> answer path.
>
> **Insurance is the exception and it is an accident of the engine.** The
> Mastra loop ignores the client it is handed and builds its own provider, so
> `LLM_PROVIDER=hosted` reaches it. Steering and pharma use theirs directly.
> That single difference is why a "hosted works" result measured against
> insurance says nothing about the two apps that are deployed.
>
> **And the embeddings cannot be switched either.** Both default to `foundry`
> with `EMBEDDINGS` unset. Setting `EMBEDDINGS=local` would not help:
> `apps/ai/steering/src/grounding/chunks.ts:22` is
> `export const CHUNK_TABLE = 'document_chunks'` — a plain constant with no
> `_local` variant, unlike insurance's
> `embeddingsChoice() === 'local' ? 'policy_chunks_local' : 'policy_chunks'`.
> 384-dimension vectors would be written into a table holding 3,854 rows at
> 1536, and it would fail at query time rather than at write time.
>
> So a deployed `steering-app` or `pharma-app` that answers a question needs a
> provider-aware chat client and model name in two engagements, a table-name
> guard, and a re-ingest of 3,854 chunks. **That is a code change and a data
> migration, not configuration**, and nothing in this runbook will produce it.

**`LOOP` still matters** wherever a non-Azure provider *is* reachable: the
default `sdk` engine drives the Responses API and refuses both `local` and
`hosted`, so those need `LOOP=mastra` or `LOOP=langgraph`. See `.env.example`.

Reading a secret back, without putting it in your shell history:

```bash
az containerapp secret show -n steering-app -g rg-claims-fde \
  --secret-name api-key --query value -o tsv
```

A Container Apps secret is obfuscated in the portal and readable by anyone with
Reader on the group. It is not a vault. Fine for a demo key; not a pattern to
carry to a customer — which is the argument `packages/providers/foundry` makes by
using `DefaultAzureCredential` and storing no key at all.

---

## 4 · The five traps that actually fired

**An empty secret value is rejected, and the next error is a cascade.** Running
the loop above without setting `KEY` first gives
`ContainerAppSecretInvalid: value or keyVaultUrl and identity should be
provided`, immediately followed by `ContainerAppSecretRefNotFound`. That second
error is not a second problem — the secret was never created, so the reference
to it could not resolve. Fix the first and both go away. It is also the same rule
the guard applies to its own key: a variable that exists and is empty is not
configured.

**503 and 401 mean opposite things and look alike.** 503 from `/api/*` is
`API_KEY` unset on the app. 401 is the guard working — configured, and refusing
an unauthenticated request. The workflow's smoke test says which it got, in
those words, because the two were confused once.

**The steering desk reports a database failure as a missing API key.**
`BidDesk.tsx` probes `/api/requirements` and does
`setKeyState(status === 503 ? 'unconfigured' : 'needed')` — so *any* 503 renders
*"This deployment has no key configured"*, including a 503 raised because
`STEERING_DATABASE_URL` is unset. The key can be perfectly correct. Check the
server rather than the page:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<fqdn>/api/requirements                    # 401 = key IS set
curl -s -o /dev/null -w '%{http_code}\n' -H "x-api-key: $K" https://<fqdn>/api/requirements # 503 = database
```

It is also latched at first probe and never re-read, so a page opened before the
key was set keeps saying so afterwards. A hard reload clears that; the database
version does not clear, because it is true.

**`--logs-destination none` does not cost you logs.** It disables the Log
Analytics archive, not the live stream — `az containerapp logs show -n <app> -g
<rg> --tail 50` still works and still prints stack traces. Which matters,
because `public-error.ts` hands the caller a reference id and puts the real
error in the log; with no log at all those references would name nothing.

**The domain changes, and documented URLs go stale.** §5.

---

## 5 · The URLs are not yours to keep

A Container Apps FQDN is `<app>.<environment defaultDomain>`, and the domain is
randomly assigned at environment creation. The 2026-09-16 rebuild moved every
public URL from `yellowsmoke-eeb8b48f` to `lemonsky-6acd5222` — six documented
addresses across four files, stale in one command.

```bash
az containerapp env show -n cae-pharma -g rg-claims-fde \
  --query properties.defaultDomain -o tsv
```

The files that write one down: `docs/SITE.md`, `infra/veresk/DEPLOY.md`,
`infra/pharma/DEPLOY.md`, `infra/steering/DEPLOY.md`, and one comment in
`.github/workflows/deploy.yml`. **The pipeline itself is fine** — it resolves
every FQDN with `az containerapp show` after deploying, so nothing it builds can
carry a dead link. Only the prose goes stale, and only a person can notice.

---

## 6 · Keeping it free

Verified on 2026-09-16, by querying rather than by assuming:

| | |
|---|---|
| Environment | `workloadProfileType: Consumption` — no baseline charge |
| Apps | `minReplicas 0`, `maxReplicas 1`, 0.5 vCPU, 1 GiB, all three |
| Logs | `appLogsConfiguration.destination: null` |
| In the subscription | four resources, and nothing else |

Scaled to zero there are no usage charges at all. The monthly free grant —
180,000 vCPU-seconds, 360,000 GiB-seconds and 2M requests **per subscription** —
works out to roughly 100 active hours at this size, shared across all three.

Four ways to lose it: `min-replicas ≥ 1` on any app (≈7× the grant), creating a
container registry, re-attaching Log Analytics, or adding a model endpoint that
bills per token. The last is the only one this design actually wants, which is
why `LLM_PROVIDER=hosted` points at a free tier by default.

A canary, because "are we sure" should be answerable by an inbox:

```bash
az rest --method put \
  --url "https://management.azure.com/subscriptions/<SUB_ID>/resourceGroups/rg-claims-fde/providers/Microsoft.Consumption/budgets/free-canary?api-version=2023-05-01" \
  --body '{"properties":{"category":"Cost","amount":1,"timeGrain":"Monthly",
    "timePeriod":{"startDate":"2026-09-01T00:00:00Z","endDate":"2027-09-01T00:00:00Z"},
    "notifications":{"anything_at_all":{"enabled":true,"operator":"GreaterThan",
      "threshold":1,"thresholdType":"Actual","contactEmails":["you@example.com"]}}}}'
```

`threshold` is a **percentage of `amount`**, so 1 on an amount of 1 alerts at
about a cent. Do not use `az consumption budget create` for this: it fails with
a 400 on the current API version, and it has no flag for notifications — so even
when it works it creates a budget that never tells anybody anything.
