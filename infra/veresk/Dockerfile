# syntax=docker/dockerfile:1.7-labs
#
# The firm's door as one deployable image — one page, `apps/veresk-app`. Built
# from the REPO ROOT because this is a pnpm workspace, so the context has to
# include the lockfile and the two packages the page links to.
#
#   docker build -f infra/veresk/Dockerfile -t veresk:dev .
#
# IT USED TO BE THE BIG ONE, and the change is worth recording. Until
# 2026-09-13 this image carried the domain package, the guard, two agent engines
# and 500 MB of ONNX runtime — because `apps/veresk-app` served Meridian
# Pharma's release desk as well as the firm's page. Those dependencies were
# always the pharma surface's; they were living in the wrong app. When that
# surface moved to `apps/pharma-app` the weight went with it, into
# `infra/pharma/Dockerfile`, and what is left here is a page.
#
# So there is no `ssr.external` list to mirror and no native postinstall to
# fight. If a route here ever calls a model, both come back at once.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# LAYER ORDER IS THE BUILD TIME. The expensive step depends on the fewest files,
# so editing a line of TypeScript does not reinstall node_modules. The longer
# version of this reasoning is in infra/pharma/Dockerfile, where it matters more.

# 1. The lockfile alone. The root package.json comes with it for
#    `packageManager: pnpm@9.15.9` — corepack reads that to decide WHICH pnpm
#    runs, and without it this layer writes a store a later layer cannot read.
# `.npmrc` COMES WITH THEM, AND LEAVING IT OUT COST A BUILD. It carries
# `dedupe-peer-dependents=true` and `node-linker=hoisted` — the two settings that
# stop pnpm building peer-variant duplicates of a library, which TypeScript then
# refuses to pass between: "Types have separate declarations of a private
# property". The host has the file, so `pnpm build` passed locally while the
# image produced two `@langchain/pgvector` builds against two `@langchain/core`
# versions and failed. It holds no credentials; see the file for the full story.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

# 2. The manifests, nothing else. `--parents` keeps the directory structure so
#    packages/foo/package.json lands where it belongs (hence `-labs` at the top).
COPY pnpm-workspace.yaml ./
# TWO DEPTHS, NOT ONE. `*/*/package.json` matches exactly two levels, which was
# every workspace until the tree grew a third: `apps/web/*`, `apps/ai/*` and
# `packages/providers/*`. Nine manifests stopped being copied, pnpm linked no
# node_modules for them, and the build died on `tsc: not found` in
# packages/providers/foundry — a missing devDependency wearing a missing-binary
# error. `pnpm install` on the host still worked, so nothing local caught it and
# only CI did. Both globs, and a `pnpm-workspace.yaml` glob added in future needs
# a line here too.
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

# 3. Now the source.
COPY . .

# ── CROSS-ORIGIN LINKS ARE BAKED IN HERE, NOT READ AT RUNTIME ───────────────
#
# `import.meta.env.VITE_*` is INLINED BY VITE AT BUILD TIME. Setting these on
# the container does nothing whatsoever; they have to be present for the build.
#
# THIS IS THE IMAGE THAT LINKS OUT, so both engagement URLs arrive here. Leaving
# either blank is SAFE rather than broken: `src/lib/links.ts` scopes its dev
# fallback to `import.meta.env.DEV`, so an unset value renders that engagement
# as visibly not-a-link instead of pointing at a port on the reader's machine.
# That exact bug shipped once, and a hard-coded URL for an app that did not yet
# exist put a 404 on the live site a few hours later. The pipeline now resolves
# both from Azure AFTER deploying them — see .github/workflows/deploy.yml.
ARG VITE_PHARMA_URL=""
ARG VITE_STEERING_URL=""
ENV VITE_PHARMA_URL=$VITE_PHARMA_URL \
    VITE_STEERING_URL=$VITE_STEERING_URL

RUN pnpm exec turbo run build --filter=@veresk/app...

RUN pnpm deploy --filter=@veresk/app --prod --ignore-scripts /out


FROM node:22-slim AS runtime

# 8080 because that is what Container Apps expects unless told otherwise;
# src/server.ts reads PORT, so this is the only place the number appears.
ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

COPY --from=build /out ./

USER node
EXPOSE 8080

# dist/server/server.js only LISTENS under import.meta.env.PROD — which is why
# NODE_ENV above is not decoration. See the header of apps/veresk-app/src/server.ts.
CMD ["node", "dist/server/server.js"]
