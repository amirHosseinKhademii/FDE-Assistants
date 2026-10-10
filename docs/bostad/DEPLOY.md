# Bostad app: standalone deploy

The bostad property-profile app (`apps/web/bostad-app`, `@bostad/app`) deploys as
its **own** Azure Container App, separate from the `deploy.yml` site. Nothing in
this document has been run against Azure. The workflow is manual-only, and
creating the Azure resources is a one-time step you run yourself.

## What the workflow does

`.github/workflows/deploy-bostad.yml`, started by hand from the Actions tab:

| Job | What it does |
|---|---|
| 1 · check | `pnpm install --frozen-lockfile`, builds `@bostad/app` and its workspace deps, runs `typecheck`. |
| 2 · image | Logs into ACR with the OIDC token, builds `apps/web/bostad-app/Dockerfile` from the repo root, pushes `<acr>.azurecr.io/bostad-app:sha-<commit>`. |
| 3 · deploy | Lists the resource group. Creates `bostad-app` if absent, otherwise updates its image. Sets the Västtrafik values as Container App secrets. Waits for the revision to be Provisioned with the new image. Smoke tests `/healthz` and `/`. |

Ingress is external on port 8080, scale is 0 to 2 replicas, 0.5 vCPU and 1 GiB.

## The image

- `apps/web/bostad-app/Dockerfile`: multi-stage on `node:22-slim`. Corepack provides
  the pnpm version from the root `packageManager` field. The runtime stage runs as
  `node` (non-root) and has a HEALTHCHECK on `/healthz`.
- `apps/web/bostad-app/Dockerfile.dockerignore`: BuildKit reads it next to the
  Dockerfile. It keeps `.env` and `node_modules` out of the context.
- `apps/web/bostad-app/container-entry.mjs`: a wrapper outside `src/`. It runs the
  built server unchanged and adds two things the source does not have. The source
  listens on `127.0.0.1`, so the wrapper rewrites that to `HOST` (`0.0.0.0` in the
  image). It also answers `GET /healthz` with 200.
- **Build-time, public:** `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID`.
  Vite inlines them into the client bundle, so anyone can read them. They are
  build args, restricted by referrer in Google Cloud.
- **Runtime, secret:** `VASTTRAFIK_CLIENT_IDENTIFIER` and `VASTTRAFIK_CLIENT_SECRET`.
  They are Container App secrets and are never written into an image layer.
- The build uses `pnpm --filter`, not `turbo`. Turbo 2 runs in strict env mode and
  strips `VITE_*` unless it is listed in `turbo.json`, which would bake an empty key.

Local check (done): image about 332 MB. `/healthz`, `/` and
`/api/profile?address=…` (with a same-origin `Origin`) all return 200 when run on
`127.0.0.1` with only the two Västtrafik values in the environment.

## One-time Azure setup (run after you approve)

Set the names once. Reuse existing resources where they already exist.

```bash
RG=<resource-group>
ENV=<containerapps-environment>      # reuse the one deploy.yml uses, if there is one
LOC=<location, e.g. swedencentral>
ACR=<acr-name>                       # globally unique, lowercase letters and digits
APP=bostad-app
GH_REPO=<owner>/<repo>
SUB=$(az account show --query id -o tsv)

az extension add -n containerapp --upgrade -y

# 1. Resource group (skip if it exists)
az group show -n "$RG" >/dev/null 2>&1 || az group create -n "$RG" -l "$LOC"

# 2. Container Apps environment (reuse if it exists)
az containerapp env show -n "$ENV" -g "$RG" >/dev/null 2>&1 \
  || az containerapp env create -n "$ENV" -g "$RG" -l "$LOC"

# 3. Container registry (reuse an existing ACR, or create one)
az acr show -n "$ACR" -g "$RG" >/dev/null 2>&1 \
  || az acr create -n "$ACR" -g "$RG" -l "$LOC" --sku Basic --admin-enabled false

# 4. Create the app with a placeholder image and a system identity.
#    The workflow replaces the image on its first run.
az containerapp create -n "$APP" -g "$RG" --environment "$ENV" \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 8080 --ingress external \
  --min-replicas 0 --max-replicas 2 --cpu 0.5 --memory 1.0Gi \
  --system-assigned

# 5. Let the app pull from ACR with its identity (no registry admin password)
PRINCIPAL=$(az containerapp show -n "$APP" -g "$RG" --query identity.principalId -o tsv)
ACR_ID=$(az acr show -n "$ACR" -g "$RG" --query id -o tsv)
az role assignment create --assignee-object-id "$PRINCIPAL" \
  --assignee-principal-type ServicePrincipal --role AcrPull --scope "$ACR_ID"
az containerapp registry set -n "$APP" -g "$RG" --server "$ACR.azurecr.io" --identity system

# 6. OIDC identity for GitHub Actions (skip if you reuse the deploy.yml identity;
#    then only add the federated credential in step 6c and the roles in 6d).
#    6a. App registration + service principal
APP_ID=$(az ad app create --display-name bostad-deploy --query appId -o tsv)
az ad sp create --id "$APP_ID"
#    6b. Federated credential. For workflow_dispatch the subject is the branch the
#        run starts from. This one is for bostad/mvp; add another for master if needed.
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"bostad-deploy-mvp\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GH_REPO}:ref:refs/heads/bostad/mvp\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"
#    6c. Roles. Push to ACR, and update the app within its resource group.
SP_OBJ=$(az ad sp show --id "$APP_ID" --query id -o tsv)
RG_ID=$(az group show -n "$RG" --query id -o tsv)
az role assignment create --assignee-object-id "$SP_OBJ" --assignee-principal-type ServicePrincipal --role AcrPush --scope "$ACR_ID"
az role assignment create --assignee-object-id "$SP_OBJ" --assignee-principal-type ServicePrincipal --role Contributor --scope "$RG_ID"

echo "AZURE_CLIENT_ID=$APP_ID  AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)  AZURE_SUBSCRIPTION_ID=$SUB"
```

The last line prints three IDs. None of them is a secret.

## GitHub repository settings (you do these)

| Kind | Name | Value |
|---|---|---|
| Secret | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | Already used by `deploy.yml`. Reuse them, or set them from the line above. |
| Secret | `VASTTRAFIK_CLIENT_IDENTIFIER`, `VASTTRAFIK_CLIENT_SECRET` | From the repo-root `.env`. Enter them in Settings → Secrets, do not paste them into a shell. |
| Variable | `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID` | Public browser keys. Variables, not secrets, because they are baked into the page. |
| Edit file | `env:` block in `deploy-bostad.yml` | Replace the four `TODO-…` values with your resource group, environment and ACR names. |

Then start it from **Actions → deploy-bostad → Run workflow**, on branch `bostad/mvp`.
It is `workflow_dispatch` only, so nothing runs on push.

## Google Maps key: add the new host

After the first successful deploy, get the host name:

```bash
az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv
```

In Google Cloud Console → APIs & Services → Credentials, open the Maps key. Under
**Application restrictions → Websites**, add `https://<that-fqdn>/*`. Keep
`localhost` entries for development. Without this the map loads blank on the new
host.

## Cost

Scale to zero (`--min-replicas 0`) means the app bills only while it serves
requests. A cold start after idle takes a few seconds, and the first request pays
it. The ACR Basic SKU is a fixed monthly charge, and that is the main standing
cost. `--max-replicas 2` caps the spend under load. Raise it only when you see
real traffic.

## Adding the backend and AI services later

- **Separate container app, same environment (preferred).** Give it
  `--ingress internal` and a target port. The web app calls it at
  `http://<backend-app-name>` from inside the environment. It gets its own scaling
  and its own image, and it can use a GPU workload profile when the AI service
  needs one. The web app gets no public path to it.
- **Sidecar in the same app.** Put a second container in the same revision.
  Containers share localhost, so there is no network hop. This suits a helper that
  only the web app calls. The trade-off is that both scale and deploy together.
- Either way, keep secrets as Container App secrets, referenced with
  `secretref:`. Do not add them to the Dockerfile or to a build arg.
