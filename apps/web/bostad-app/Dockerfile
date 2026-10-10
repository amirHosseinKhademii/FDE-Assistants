# syntax=docker/dockerfile:1.7-labs
#
# Bostad property-profile app as one deployable image. A pnpm workspace, so the
# build context is the REPO ROOT, same as infra/steering/Dockerfile:
#
#   docker build -f apps/web/bostad-app/Dockerfile -t bostad-app:dev .
#
# Its ignore list is apps/web/bostad-app/Dockerfile.dockerignore (BuildKit reads
# a per-Dockerfile ignore file that sits next to it), so .env never enters the
# build context.
#
# ── SECRETS ────────────────────────────────────────────────────────────────
# Browser keys are BUILD ARGS, baked into the client bundle by Vite, and are
# public by design (restrict them by HTTP referrer in Google Cloud):
#   VITE_GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_MAP_ID
# Server secrets are NOT in this file. VASTTRAFIK_CLIENT_IDENTIFIER and
# VASTTRAFIK_CLIENT_SECRET are set on the container app at runtime and never
# written into any layer.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# Same layer order as the steering image: the expensive install depends on the
# fewest files, so editing app source does not reinstall node_modules.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

COPY . .

ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_GOOGLE_MAPS_MAP_ID=""
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_GOOGLE_MAPS_MAP_ID=$VITE_GOOGLE_MAPS_MAP_ID

# Built with `pnpm --filter`, NOT `turbo run`: turbo 2 runs in strict env mode and
# strips every variable not listed in turbo.json globalEnv, and VITE_* is not
# listed there. Through turbo the Maps key would be baked in as an empty string.
# `...` builds the app and its workspace dependencies (@bostad/property, @fde/uikit).
RUN pnpm --filter "@bostad/app..." run build

RUN pnpm deploy --filter=@bostad/app --prod --ignore-scripts /out
RUN cp apps/web/bostad-app/container-entry.mjs /out/


FROM node:22-slim AS runtime

# HOST=0.0.0.0 is correct HERE and only here: inside the container, ingress has to
# reach the process. The app source defaults to loopback; container-entry.mjs
# applies HOST.
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    BOSTAD_DATA_DIR=/app/data

WORKDIR /app
COPY --from=build /out ./
# The package's data files (crime CSVs, area GeoJSON, lagesbild JSON) are read from disk at
# request time. pnpm deploy does not carry them, so they are copied here, read-only for the
# non-root user (files are 644, folders 755), and found through BOSTAD_DATA_DIR.
COPY --from=build /repo/packages/bostad/data /app/data

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "container-entry.mjs"]
