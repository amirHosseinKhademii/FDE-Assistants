# Deploying the firm's door — Azure Container Apps

`veresk`, one page. `infra/pharma/DEPLOY.md` is the substantial sibling — the
secrets, the managed identity, the Foundry role and the free-tier arithmetic all
live over there, because they are all the pharma surface's.

| Piece | Value |
|---|---|
| App | `veresk` — created 2026-09-13, alongside `pharma-app` rather than instead of it |
| URL | https://veresk.lemonsky-6acd5222.swedencentral.azurecontainerapps.io |
| Image | `docker.io/amir2575/veresk` |
| Secrets | **none** |
| Identity | system-assigned, and it does not need to be — see below |

## What this app is, and what it is not

It serves the firm's page. One route, no API, no database, no model call. The
three engagement cards on it are links to other origins, and every one of those
URLs is **baked in at build time** by the pipeline, which resolves each from
Azure after deploying it.

**It briefly carried Meridian Pharma's entire surface**, which is why the image
used to be 1.3 GB and why this app was originally called `pharma-app`. Both are
now what they say they are.

## One thing left over, and it is worth doing

This app was created by copying the old combined app's configuration, so it
still has a system-assigned identity — and, until it is cleaned up, the two
secrets that came with that copy. **It needs none of them.** Nothing here opens
a database or calls a model.

A credential on an app that cannot use it is not an incident, but it is exactly
the kind of thing that is true for a year and then explains an incident. To
strip it:

```bash
az containerapp secret remove -n veresk -g rg-claims-fde \
  --secret-names pharma-db-url api-key
az containerapp identity remove -n veresk -g rg-claims-fde --system-assigned
```

The `pharma-app` resource keeps both, because it is the one that uses them.

## Deploying

There is nothing to run by hand. `.github/workflows/deploy.yml` builds and
deploys all three apps in one run, and this app is deliberately **last**: its
image cannot be built until both engagements are live, because it links to them.
