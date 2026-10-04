# syntax=docker/dockerfile:1.7-labs
#
# Thornbury Goods' pages as one deployable image. Built from the REPO ROOT —
# this is a pnpm workspace, so the build context has to include the lockfile and
# every package the app links to, not just apps/web/commerce-app/.
#
#   docker build -f infra/commerce/Dockerfile -t thornbury-commerce:dev .
#
# ── WHAT THIS IMAGE CARRIES ──────────────────────────────────────────────
#
# Two pages and the `/api/ask` route. Pages read at authoring time — that is
# `docs/commerce/` and source quoted on `/steps`. The `/api/ask` route is server-
# side streaming from the MCP server, so it needs @thornbury/commerce in scope at
# runtime to shape questions and handle responses.
#
# The app imports `@thornbury/commerce` (its domain code), so the build's
# `pnpm deploy --prod` resolves it and includes it. Building the app builds its
# dependency graph, so `pnpm exec turbo run build --filter=@thornbury/commerce-app...`
# is sufficient; no change needed here.

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
