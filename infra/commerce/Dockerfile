# syntax=docker/dockerfile:1.7-labs
#
# Thornbury Goods' pages as one deployable image. Built from the REPO ROOT —
# this is a pnpm workspace, so the build context has to include the lockfile and
# every package the app links to, not just apps/web/commerce-app/.
#
#   docker build -f infra/commerce/Dockerfile -t thornbury-commerce:dev .
#
# ── THE SIMPLEST OF THE FIVE, AND THE REASON IS WORTH READING ───────────────
#
# No API route, no database, no model call, no corpus copy, no secrets. The two
# pages this serves are readings of documents in `docs/commerce/` and of source
# files in `apps/mcp/commerce/`, and both were read AT AUTHORING TIME and baked
# into the components. So the image carries statements rather than the means of
# producing them, and nothing in it can differ from what a reader saw in the
# repository.
#
# It is also the only one of the five that depends on NO package from its own
# engagement. `@thornbury/commerce`, `@thornbury/commerce-api` and
# `@thornbury/commerce-mcp` are being written by three other sessions; this app
# imports nothing from any of them, so their build state cannot break this
# image. The MCP server's source appears on `/steps` as QUOTED TEXT, which is a
# different relationship from an import and survives the file being mid-refactor.
#
# ── WHAT WILL MAKE THIS HEADER FALSE ────────────────────────────────────────
#
# `/desk`. It runs a loop, a model and an MCP client, and it brings
# `@fde/agent`, the engines, an `ssr.external` list in `vite.config.ts` and a
# service token with it. THIS COMMENT IS TRUE AS OF THE COMMIT THAT ADDED IT.
# The safety image's header says the same thing about its own desk, having been
# rewritten once already when the steering one went stale — so when `/desk`
# lands here, this block is the one to rewrite rather than leave standing
# because it reads well.
#
# NOTHING IN THE BUILD WILL HAVE TO CHANGE FOR THAT. `pnpm deploy --prod`
# resolves the app's dependency graph, so adding a dependency to
# `apps/web/commerce-app/package.json` is the whole of the change.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# LAYER ORDER IS THE BUILD TIME. The reasoning is written out at length in the
# veresk Dockerfile rather than repeated here: the expensive steps depend on the
# fewest files, so editing a line of TypeScript does not reinstall node_modules.

# 1. The lockfile alone. The root package.json comes with it for
#    `packageManager: pnpm@9.15.9` — corepack reads that to decide WHICH pnpm
#    runs, and without it this layer writes a store a later layer cannot read.
#    `.npmrc` carries `dedupe-peer-dependents=true` and `node-linker=hoisted`;
#    leaving it out cost a build on a sibling image, because without them pnpm
#    builds peer-variant duplicates that TypeScript then refuses to pass
#    between. It holds no credentials.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

# 2. The manifests, nothing else. `--parents` keeps the directory structure so
#    packages/foo/package.json lands where it belongs (hence `-labs` at the top).
#    TWO DEPTHS, NOT ONE — this app is at `apps/web/commerce-app/`, three levels
#    down, and the single `*/*/package.json` glob misses it entirely. That miss
#    surfaces as `tsc: not found` rather than as a missing manifest, which is why
#    it is called out here as well as on the sibling image where it happened.
COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

# 3. Now the source.
COPY . .

# ── THE CROSS-ORIGIN LINK IS BAKED IN HERE, NOT READ AT RUNTIME ─────────────
#
# `import.meta.env.VITE_*` is INLINED BY VITE AT BUILD TIME. Setting this on the
# container app does nothing at all; it has to be present for the build below.
#
# Leaving it blank is SAFE and is not a broken link: `src/lib/links.ts` scopes
# its dev fallback to `import.meta.env.DEV`, so a production build with nothing
# set renders the firm's name as text rather than as a link to a port on the
# reader's own machine. That bug shipped once on the veresk image, and it is why
# every one of these files carries this block.
#
# THE ARROW ONLY POINTS ONE WAY SO FAR. This app links TO the firm; the firm
# does not yet link back, because `veresk-app` has no Thornbury card and no
# `VITE_COMMERCE_URL`. See infra/commerce/DEPLOY.md — that asymmetry is why this
# image's deploy job is NOT in the host's `needs:`.
ARG VITE_VERESK_URL=""
ENV VITE_VERESK_URL=$VITE_VERESK_URL

# `...` means "and everything it depends on" — @fde/uikit and @veresk/surface
# are workspace source, not published packages, and the app alone would link to
# unbuilt directories.
RUN pnpm exec turbo run build --filter=@thornbury/commerce-app...

# --prod drops devDependencies (typescript, vite) from the result.
# --ignore-scripts for the same reason as the install above: `pnpm deploy`
# re-runs native postinstalls that were deliberately skipped.
RUN pnpm deploy --filter=@thornbury/commerce-app --prod --ignore-scripts /out


FROM node:22-slim AS runtime

# 8080 because that is what Container Apps expects unless told otherwise;
# src/server.ts reads PORT, so this is the only place the number appears.
# NOT 3600 — that is the dev port and it appears in no deployed URL.
ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

COPY --from=build /out ./

USER node
EXPOSE 8080

# dist/server/server.js only LISTENS under import.meta.env.PROD — which is why
# NODE_ENV above is not decoration. See the header of
# apps/web/commerce-app/src/server.ts.
CMD ["node", "dist/server/server.js"]
