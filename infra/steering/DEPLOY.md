# Deploying Vantis Steering — Azure Container Apps

The engagement's page, as its own deployment. `infra/veresk/DEPLOY.md` is the
sibling and has the fuller account of the environment, the free-tier arithmetic
and the federated credential; this covers what is different here, plus the
one-time setup.

## Why it is deployed at all

It was deliberately *not*, at first: no API route, no database connection, no
model call, so a container for it is a page that could have been a static file.

**That was the wrong trade.** The firm's front page then carried an engagement
it could not link to, and the fallback behaviour — a nav item present in
development and absent in production — was worse than the cost it saved. A
portfolio whose third engagement cannot be opened is not a portfolio.

## What is different from the veresk deployment

| | veresk | steering |
|---|---|---|
| image | ~1.3 GB | **362 MB** — no domain package, no agent engines, no ONNX runtime |
| secrets on the app | `API_KEY`, database URLs | **none** |
| managed identity | system-assigned, reaches Foundry | **none needed** |
| smoke test | 200 on `/`, **401** on `/api/ask` | 200 on `/`, and the page contains its own figures |

**It holds no credentials because it has nothing to reach.** The page renders
two generated files committed to the repository. There is no write path to fail
closed, so the guard assertion its sibling runs would be theatre here.

## One-time setup

Everything below spends money and is not run by CI. The container app has to
exist before `deploy-steering.yml` can update it.

```bash
az login
az account set --subscription <subscription-id>
```

For the very first image, push one by hand — `az containerapp create` needs *an*
image, and the tag is a pure function of the commit:

```bash
docker build -f infra/steering/Dockerfile \
  --build-arg VITE_VERESK_URL=https://pharma-app.yellowsmoke-eeb8b48f.swedencentral.azurecontainerapps.io \
  -t docker.io/amir2575/vantis-steering:sha-$(git rev-parse HEAD) .

docker push docker.io/amir2575/vantis-steering:sha-$(git rev-parse HEAD)
```

Then create the app:

```bash
az containerapp create \
  --name steering-app \
  --resource-group rg-claims-fde \
  --environment cae-pharma \
  --image docker.io/amir2575/vantis-steering:sha-$(git rev-parse HEAD) \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 --memory 1.0Gi \
  --min-replicas 0 --max-replicas 1 \
  --registry-server docker.io \
  --registry-username "$DOCKERHUB_USERNAME" \
  --registry-password "$DOCKERHUB_READONLY_TOKEN"
```

**Same environment as `pharma-app`, deliberately** — the FQDN is then the app
name against the same domain, which is exactly what both workflows hard-code.

**`--min-replicas 0` is not a tuning choice, it is the entire free claim.** The
Container Apps grant covers active seconds only, and an idle replica is billed
outright. The cost is a cold start on the first request after an idle period,
which is why the workflow's smoke test uses a generous `--max-time`.

**The registry password here is the READ-ONLY pull token**, not the read/write
one in `DOCKERHUB_TOKEN`. Two different tokens for two different jobs; pasting
the push token here would give the running app more access than it needs,
permanently.

Then confirm the URL both workflows assume:

```bash
az containerapp show -n steering-app -g rg-claims-fde \
  --query "properties.configuration.ingress.fqdn" -o tsv
# expected: steering-app.yellowsmoke-eeb8b48f.swedencentral.azurecontainerapps.io
```

**If that FQDN differs, two files are wrong** and will link to nothing:
`STEERING_URL` in `.github/workflows/deploy-veresk.yml`, and `VERESK_URL` in
`deploy-steering.yml`. They are hard-coded rather than looked up because a
cross-origin link has to be baked into the OTHER image at build time, and a
build cannot query Azure.

## The cross-origin links, and the trap in them

Each app links to the other by URL, because they are separate origins and a
router link cannot cross one.

**`import.meta.env.VITE_*` is inlined by Vite at BUILD time.** Setting these on
the container does nothing whatsoever. They are `ARG`s in both Dockerfiles and
`build-args` in both workflows, and that is the only place they work.

This shipped as a bug once: `links.ts` fell back to `http://localhost:3400` when
the variable was unset, the Docker build set nothing, and the deployed firm page
sent real visitors to a port on their own machine. The fallback is now scoped to
`import.meta.env.DEV`, so an unset variable degrades to *visibly not a link*
rather than to a wrong one.

Verified locally by building with the arg set and serving the result with **no**
environment variable present: the URL lands in both the client and the server
bundle, and the nav item and the engagement card both render as real links.

## After the first deploy

`deploy-steering.yml` runs on pushes to `master` touching
`apps/steering-app/**`, `packages/**`, its Dockerfile or itself. `packages/**`
is in both workflows' path filters on purpose: `@fde/uikit` and
`@veresk/surface` are workspace source compiled into each image, so a change to
either rebuilds both apps. That is the price of them genuinely being shared.
