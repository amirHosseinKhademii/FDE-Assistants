# syntax=docker/dockerfile:1.7-labs
#
# Vantis Steering's page as one deployable image. Built from the REPO ROOT —
# this is a pnpm workspace, so the build context has to include the lockfile and
# every package the app links to, not just apps/steering-app/.
#
#   docker build -f infra/steering/Dockerfile -t vantis-steering:dev .
#
# A SIBLING OF `infra/veresk/Dockerfile`. It used to be the shorter one, and the
# note here said why: no API route, no database, no model call. `/desk` ended
# that — the image now carries `@vantis/steering`, `@fde/guard` and the agent
# engines, because `apps/steering-app/vite.config.ts` externalises them and an
# externalised import has to survive as a real node_modules entry at runtime.
#
# NOTHING IN THIS FILE HAD TO CHANGE FOR THAT, which is the part worth knowing:
# `pnpm deploy --prod` resolves the app's dependency graph, so adding a
# dependency to `apps/steering-app/package.json` is the whole of the change. The
# comment is what rotted, not the build.
#
# ── THE RUNTIME NEEDS SECRETS THIS FILE DOES NOT CARRY ──────────────────────
#
# `/desk` reads `vst_alm` and `vst_derived` and calls Foundry, so the container
# needs `STEERING_DATABASE_URL`, the Foundry variables and `API_KEY` — set on
# the container app, NOT baked in here. Without them the page still loads and
# the guard refuses every assessment, which is the correct failure: fail-closed
# means an unconfigured deployment answers nothing rather than answering
# unauthenticated.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# LAYER ORDER IS THE BUILD TIME, and the reasoning is written out at length in
# the veresk Dockerfile rather than repeated here: the expensive steps depend on
# the fewest files, so editing a line of TypeScript does not reinstall 1.4 GB of
# node_modules.

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
# `import.meta.env.VITE_*` is INLINED BY VITE AT BUILD TIME. Setting this on the
# container does nothing at all; it has to be present for the build below.
#
# Leaving it blank is SAFE and is not a broken link: `src/lib/links.ts` scopes
# its dev fallback to `import.meta.env.DEV`, so a production build with nothing
# set renders the firm's name as text rather than as a link to a port on the
# reader's own machine. That exact bug shipped once on the other image, which is
# why both now carry this block.
ARG VITE_VERESK_URL=""
ENV VITE_VERESK_URL=$VITE_VERESK_URL

# `...` means "and everything it depends on" — @fde/uikit and @veresk/surface
# are workspace source, not published packages, and the app alone would link to
# unbuilt directories.
RUN pnpm exec turbo run build --filter=@vantis/steering-app...

# --prod drops devDependencies (typescript, vite) from the result.
# --ignore-scripts for the same reason as the other image: `pnpm deploy` re-runs
# native postinstalls that the install above deliberately skipped.
RUN pnpm deploy --filter=@vantis/steering-app --prod --ignore-scripts /out

# ── THE CORPUS SHIPS WITH THE IMAGE, AND IT IS NOT OPTIONAL ─────────────────
#
# `resolveCitations` opens the file a citation names and finds the line the
# quoted sentence is really on. `pnpm deploy` copies the app and its
# node_modules and NOTHING from the repo root, so without this the corpus
# directory does not exist in the container — and `resolveCitations` degrades
# silently: every citation comes back `unresolved`, and the desk reports "3 NOT
# found in the file cited" about three citations that are perfectly good.
#
# That failure is worse than a crash. The page's strongest claim is that a quote
# can be traced to a file and a line, and the deployed copy would have spent a
# minute and a few cents to accuse itself of fabricating.
#
# At a real engagement this is a mount of the customer's share and the variable
# points at it instead. Here the corpus is generated, committed and small.
RUN cp -r docs/steering/corpus /out/corpus


FROM node:22-slim AS runtime

# 8080 because that is what Container Apps expects unless told otherwise;
# src/server.ts reads PORT, so this is the only place the number appears.
# STEERING_CORPUS_DIR is read at RUNTIME by the citation resolver — see the
# copy in the build stage. Overridable, so a real deployment can mount the
# customer's share somewhere else and set this to it.
ENV NODE_ENV=production \
    PORT=8080 \
    STEERING_CORPUS_DIR=/app/corpus

WORKDIR /app

COPY --from=build /out ./

USER node
EXPOSE 8080

# dist/server/server.js only LISTENS under import.meta.env.PROD — which is why
# NODE_ENV above is not decoration. See the header of apps/steering-app/src/server.ts.
CMD ["node", "dist/server/server.js"]
