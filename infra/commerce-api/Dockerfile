# syntax=docker/dockerfile:1.7-labs
#
# Thornbury Goods' commerce API as a deployable image. Built from the REPO ROOT —
# this is a pnpm workspace, so the build context has to include the lockfile and
# every package the app links to, not just apps/api/commerce/.
#
#   docker build -f infra/commerce-api/Dockerfile -t thornbury-commerce-api:dev .
#
# ── WHY TWO STAGES ────────────────────────────────────────────────────────────
#
# The build needs pnpm, turbo, typescript and 1.4 GB of node_modules; the runtime
# needs a Node process and the production closure. Shipping the build stage would
# be an image several times larger.
#
# WHY `pnpm deploy` AND NOT A PLAIN COPY. apps/api/commerce/vite.config.ts
# (if one existed) would deliberately NOT bundle @fde/guard, pg, @nestjs/* and
# the rest — they are `ssr.external`, so Node `require`s them at runtime and they
# must exist as real node_modules entries. `pnpm deploy` is the mechanism that
# turns workspace links into a self-contained tree outside the workspace.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# Provide a dummy ECOMMERCE_DB_URL for the Prisma generate step. Turbo strict mode
# strips variables not in its globalEnv, so we declare it here even though we don't
# actually connect to a database during the offline generate phase.
ENV ECOMMERCE_DB_URL=postgresql://localhost/dummy

# LAYER ORDER IS THE BUILD TIME. The reasoning is written out at length in the
# pharma Dockerfile rather than repeated here: the expensive steps depend on the
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
#    TWO DEPTHS, NOT ONE — this app is at `apps/api/commerce/`, three levels
#    down, and the single `*/*/package.json` glob misses it entirely. That miss
#    surfaces as `tsc: not found` rather than as a missing manifest, which is why
#    it is called out here as well as on the sibling image where it happened.
COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

# 3. Now the source.
COPY . .

# ── PRISMA CLIENTS ──────────────────────────────────────────────────────────
#
# Prisma generates clients to `apps/api/commerce/generated/{shop,wms,fleet,…}`.
# These are .gitignored so pnpm deploy won't include them. They must be generated
# before build so tsc can resolve their types at compile time, and before
# pnpm deploy so they ship in the runtime image.
#
# The `generate` command is offline — no database needed.
RUN pnpm --filter @thornbury/commerce-api generate

# Build the API. `...` means "and everything it depends on" — @fde/guard and the
# @thornbury/commerce package are workspace source, not published packages.
RUN pnpm exec turbo run build --filter=@thornbury/commerce-api...

# The API has a build script that outputs to dist/main.js, and a start script
# that runs it. `pnpm deploy` copies dist/ and the slimmed node_modules; the
# runtime stage will have everything needed to run `node dist/main.js`.
#
# --prod drops devDependencies (typescript, ts-node) from the result.
# --ignore-scripts to skip native postinstalls that were already skipped above.
RUN pnpm deploy --filter=@thornbury/commerce-api --prod --ignore-scripts /out

# Copy the generated Prisma clients into the deploy output. They are gitignored
# and won't be included by pnpm deploy, but the runtime needs them to require
# the clients at startup.
RUN mkdir -p /out/generated && \
    cp -r apps/api/commerce/generated/* /out/generated/


FROM node:22-slim AS runtime

# 3610 is PLAN.md §13's allocation for the commerce API.
# HOST defaults to 0.0.0.0 for Container Apps, but can be overridden.
ENV NODE_ENV=production \
    PORT=3610 \
    COMMERCE_API_PORT=3610 \
    HOST=0.0.0.0

WORKDIR /app

COPY --from=build /out ./

USER node
EXPOSE 3610

# dist/main.js is the output of the API's build script.
CMD ["node", "dist/main.js"]
