# syntax=docker/dockerfile:1.7-labs
#
# Calder Safety's pages as one deployable image. Built from the REPO ROOT —
# this is a pnpm workspace, so the build context has to include the lockfile and
# every package the app links to, not just apps/web/safety-app/.
#
#   docker build -f infra/safety/Dockerfile -t calder-safety:dev .
#
# ── THE SHORTEST OF THE THREE, AND IT SAYS WHY RATHER THAN LOOKING TIDY ─────
#
# No API route, no database, no model call, no corpus copy. Every figure on
# every page — the estate, the severity counts, the passage lengths — is read
# from `src/lib/estate.generated.ts`, which `pnpm safety:estate` wrote by
# counting the NHTSA flat files and which is COMMITTED. So the image carries
# numbers rather than the means of producing them, and nothing in it can differ
# from what a reader saw in the repository.
#
# `apps/web/safety-app/vite.config.ts` therefore carries no `ssr.external` list.
# That is exactly what the steering Dockerfile's header used to say before
# `/desk` landed and made it false, so: THIS COMMENT IS TRUE AS OF THE COMMIT
# THAT ADDED IT, and the thing that will make it false is the desk. When
# `/desk` arrives it will bring `@calder/safety`, the agent engines and
# `SAFETY_DATABASE_URL` with it, and this block is the one to rewrite — not
# leave standing because it reads well.
#
# NOTHING IN THE BUILD WILL HAVE TO CHANGE FOR THAT. `pnpm deploy --prod`
# resolves the app's dependency graph, so adding a dependency to
# `apps/web/safety-app/package.json` is the whole of the change.

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
#    `.npmrc` comes with them and leaving it out cost a build on the sibling
#    image: it carries `dedupe-peer-dependents=true` and `node-linker=hoisted`,
#    and without them pnpm builds peer-variant duplicates that TypeScript then
#    refuses to pass between. It holds no credentials.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

# 2. The manifests, nothing else. `--parents` keeps the directory structure so
#    packages/foo/package.json lands where it belongs (hence `-labs` at the top).
#    TWO DEPTHS, NOT ONE — `apps/web/*` and `apps/ai/*` are three levels deep and
#    a single glob silently misses them, which surfaced as `tsc: not found` on
#    the sibling image rather than as a missing manifest.
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
# all three carry this block.
ARG VITE_VERESK_URL=""
ENV VITE_VERESK_URL=$VITE_VERESK_URL

# `...` means "and everything it depends on" — @fde/uikit and @veresk/surface
# are workspace source, not published packages, and the app alone would link to
# unbuilt directories.
RUN pnpm exec turbo run build --filter=@calder/safety-app...

# --prod drops devDependencies (typescript, vite) from the result.
# --ignore-scripts for the same reason as the install above: `pnpm deploy`
# re-runs native postinstalls that were deliberately skipped.
RUN pnpm deploy --filter=@calder/safety-app --prod --ignore-scripts /out


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
# NODE_ENV above is not decoration. See the header of apps/web/safety-app/src/server.ts.
CMD ["node", "dist/server/server.js"]
