# syntax=docker/dockerfile:1.7-labs
#
# Wrap's pages as one deployable image. Built from the REPO ROOT — this is a
# pnpm workspace, so the build context has to include the lockfile and every
# package the app links to, not just apps/web/wrap-app/.
#
#   docker build -f infra/wrap/Dockerfile -t wrap:dev .
#
# A SIBLING OF `infra/safety/Dockerfile`, and the same shape for the same reason:
# no API route, no database, no model call, no secrets. The app renders its
# pages from code in this repository. The ingestion pipeline lives in
# `apps/ai/wrap` and is deliberately NOT in this image; nothing here imports it.
# When an API route or a retrieval endpoint arrives, this comment is the thing
# to rewrite, and the build itself should need no change: `pnpm deploy --prod`
# resolves the app's dependency graph.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# 1. The lockfile alone, with the root package.json for `packageManager`
#    (corepack reads it to pick the pnpm version) and `.npmrc` for the
#    peer-dedupe and hoisting settings. It holds no credentials.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

# 2. The manifests, nothing else. Two depths, because `apps/web/*` and
#    `apps/ai/*` are three levels deep and a single glob silently misses them.
COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

# 3. Now the source.
COPY . .

# ── THE BACK-LINK IS BAKED IN HERE, NOT READ AT RUNTIME ─────────────────────
#
# `import.meta.env.VITE_*` is INLINED BY VITE AT BUILD TIME. Setting this on the
# container does nothing; it has to be present for the build below. Blank is
# safe: `src/lib/links.ts` scopes its dev fallback to `import.meta.env.DEV`, so
# an unset value renders "Veresk" as plain text, not as a link to a local port.
ARG VITE_VERESK_URL=""
ENV VITE_VERESK_URL=$VITE_VERESK_URL

# `...` means "and everything it depends on" — @fde/uikit and @veresk/surface
# are workspace source, not published packages.
RUN pnpm exec turbo run build --filter=@wrap/web...

# --prod drops devDependencies (typescript, vite) from the result.
# --ignore-scripts for the same reason as the install above.
RUN pnpm deploy --filter=@wrap/web --prod --ignore-scripts /out


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
# NODE_ENV above is not decoration. See the header of apps/web/wrap-app/src/server.ts.
CMD ["node", "dist/server/server.js"]
