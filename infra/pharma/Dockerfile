# syntax=docker/dockerfile:1.7-labs
#
# Meridian Pharma's surface as one deployable image — the release desk, the
# supplier walk, the data-flow page and the API routes behind them, which is
# what `apps/pharma-app` serves. Built from the REPO ROOT: this is a pnpm
# workspace, so the build context has to include the lockfile and every package
# the app links to, not just apps/pharma-app/.
#
# THIS FILE WAS `infra/veresk/Dockerfile` AND DID NOT CHANGE MUCH, which is the
# point. The heavy dependencies — the domain package, the guard, two agent
# engines, pg — were always the PHARMA surface's, they were just living in an
# app that also served the firm's door. When that surface moved to its own app
# on 2026-09-13 the image followed it, and `infra/veresk/Dockerfile` became the
# small one it should have been all along.
#
#   docker build -f infra/pharma/Dockerfile -t meridian-pharma:dev .
#
# WHY TWO STAGES. The build needs pnpm, turbo, typescript and 1.4 GB of
# node_modules; the runtime needs a Node process and the production closure.
# Shipping the build stage would be an image several times larger, and on
# Container Apps with min-replicas 0 the image size IS the cold start the user
# waits through on the first question after an idle period.
#
# WHY `pnpm deploy` AND NOT A PLAIN COPY. apps/pharma-app/vite.config.ts
# deliberately does NOT bundle @meridian/pharma, @fde/guard, pg, openai and the
# rest — they are `ssr.external`, so Node `require`s them at runtime and they
# must exist as real node_modules entries. `pnpm deploy` is the mechanism that
# turns workspace links into a self-contained tree outside the workspace.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# LAYER ORDER IS THE BUILD TIME. Everything below is arranged so that the
# expensive steps depend on the FEWEST files, because Docker throws away every
# layer after the first one whose inputs changed.
#
# This was originally a single `COPY . .` followed by the install, which meant
# editing one line of TypeScript invalidated the dependency install — the
# slowest step in the build — on every single build. The CI layer cache was
# configured correctly and had nothing cacheable to hold.

# 1. THE LOCKFILE ALONE, so the download survives every source edit. `pnpm
#    fetch` populates the store from the lockfile and reads nothing else — it
#    does not need a single package.json, which is exactly why it can come
#    first.
#    THE ROOT package.json COMES WITH IT, and not for its dependencies — it has
#    none. It carries `packageManager: pnpm@9.15.9`, which is what corepack
#    reads to decide WHICH pnpm runs. Without it here, this layer silently used
#    pnpm 12 (corepack's default) to write a store that pnpm 9 then had to read
#    two layers later. Same command, two versions, one store format.
COPY package.json pnpm-lock.yaml ./
#    `--ignore-scripts` because onnxruntime-node, sharp and protobufjs ship
#    native build scripts that pnpm refuses to run unattended. They were already
#    being skipped by the plain `pnpm install` this replaces — `pnpm fetch` just
#    turns the warning into an error. Nothing reachable in this deployment needs
#    them: sharp is unused and onnxruntime only matters under EMBEDDINGS=local,
#    while this runs EMBEDDINGS=foundry.
RUN pnpm fetch --ignore-scripts

# 2. THE MANIFESTS, nothing else. Linking the store into node_modules needs to
#    know the workspace shape, and that lives in the package.json files — which
#    change far less often than the code beside them. `--parents` keeps the
#    directory structure, so packages/foo/package.json lands where it belongs
#    instead of collapsing onto one path (hence the `-labs` syntax at the top).
COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json ./
RUN pnpm install --frozen-lockfile --offline

# 3. NOW the source. Editing it re-runs the two steps below and nothing above.
#    node_modules survives this COPY because .dockerignore excludes it from the
#    context, so there is no second install.
COPY . .

# ── CROSS-ORIGIN LINKS ARE BAKED IN HERE, NOT READ AT RUNTIME ───────────────
#
# `import.meta.env.VITE_*` is INLINED BY VITE AT BUILD TIME. Setting one of
# these on the container has no effect whatsoever — the value has to be present
# for the `turbo run build` below, which is why it is an ARG and not an ENV on
# the runtime stage.
#
# THIS COST US A LIVE BUG. `apps/pharma-app/src/lib/links.ts` used to fall back
# to `http://localhost:3400` when the variable was unset, on the reasoning that
# a dev default beats a dead card locally. Nothing set it here, so the literal
# was compiled into the production bundle and the deployed firm page sent real
# visitors to a port on their own machine. The fallback is now scoped to
# `import.meta.env.DEV`, so leaving this blank is SAFE: the page renders the
# engagement as visibly not-a-link instead of linking somewhere wrong.
#
# Set it the day `apps/steering-app` gets a deployment:
#   docker build --build-arg VITE_STEERING_URL=https://… -f infra/veresk/Dockerfile .
# Nothing cross-origin is baked into THIS image: the pharma pages link only
# within themselves. The firm's page is the one that links out, and its
# Dockerfile carries the ARGs.

# `...` means "and everything it depends on". The app alone would link to
# unbuilt dist/ directories and fail at the first require.
RUN pnpm exec turbo run build --filter=@meridian/pharma-app...

# --prod drops devDependencies (typescript, ts-node, vite) from the result.
#
# --ignore-scripts IS WORTH 513 MB AND MOST OF THE BUILD TIME. `pnpm deploy`
# re-runs native postinstalls even though the install above skipped them, and
# onnxruntime-node's postinstall DOWNLOADS CUDA AND TENSORRT PROVIDER LIBRARIES
# from nuget — half a gigabyte of GPU runtime, in an image with no GPU, for a
# package that is only reachable under EMBEDDINGS=local. This deployment runs
# EMBEDDINGS=foundry, so not one byte of it is ever loaded. It was being
# downloaded, packed into a layer, pushed to the registry, exported to the CI
# cache and pulled again on every cold start.
RUN pnpm deploy --filter=@meridian/pharma-app --prod --ignore-scripts /out


FROM node:22-slim AS runtime

# 8080 because that is what Container Apps expects unless told otherwise;
# src/server.ts reads PORT, so this is the only place the number appears.
ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# ONE COPY, AND THE ATTEMPT TO SPLIT IT IS WORTH RECORDING.
#
# This was briefly three COPYs — node_modules, package.json, dist — on the
# theory that dependencies change rarely and code changes constantly, so a
# source-only edit would re-upload only the small layer. MEASURED, THE THEORY IS
# WRONG HERE, twice over:
#
#   1. `pnpm deploy` puts the WORKSPACE packages inside node_modules/.pnpm
#      (@meridian+pharma@file+packages+pharma_..., @fde+agent@file+..., and so
#      on). The domain code IS a dependency in this layout, so the big layer
#      changes whenever the domain changes.
#   2. Every file is re-copied with fresh mtimes, which a layer digest includes.
#      Two builds of identical source still produce different digests.
#
# So all three layers differed between consecutive builds and the split bought
# nothing but complexity. Making it pay would need both timestamp normalisation
# and a way to separate third-party packages from workspace ones inside .pnpm.
#
# The lever that actually shrinks this is upstream: @huggingface/transformers
# and its ONNX runtime are only reachable under EMBEDDINGS=local, and this
# deployment runs EMBEDDINGS=foundry. Making that dependency optional in
# @fde/grounding cuts the image itself rather than rearranging it.
COPY --from=build /out ./

USER node
EXPOSE 8080

# dist/server/server.js only LISTENS under import.meta.env.PROD — which is why
# NODE_ENV above is not decoration. See the header of apps/pharma-app/src/server.ts.
CMD ["node", "dist/server/server.js"]
