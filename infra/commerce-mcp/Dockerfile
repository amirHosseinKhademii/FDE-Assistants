# syntax=docker/dockerfile:1.7-labs
#
# Thornbury Goods' MCP server as a deployable image. Built from the REPO ROOT.
#
#   docker build -f infra/commerce-mcp/Dockerfile -t thornbury-commerce-mcp:dev .
#
# ── COLD START COST AND MITIGATION ──────────────────────────────────────────
#
# The knowledge base uses local embeddings (Xenova/bge-small-en-v1.5) via
# @huggingface/transformers. Without pre-warming, the model is downloaded on
# first query (~130 MB, ~15 seconds), cached to LOCAL_EMBEDDING_CACHE.
# The runtime stage sets LOCAL_EMBEDDING_CACHE to /app/.models (not /tmp),
# so the cache survives container restarts. A build-time warm-up embeds a test
# query to download and cache the model into the image, avoiding first-request
# latency in production.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

# LAYER ORDER IS THE BUILD TIME. Everything below is arranged so that the
# expensive steps depend on the FEWEST files, because Docker throws away every
# layer after the first one whose inputs changed.

# 1. The lockfile and root package.json, for the same reason as the API image.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

# 2. The manifests. TWO DEPTHS, NOT ONE — see the commerce-api Dockerfile.
COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

# 3. Now the source.
COPY . .

# Build the MCP server and everything it depends on, including @thornbury/commerce.
# `...` means "and everything it depends on".
RUN pnpm exec turbo run build --filter=@thornbury/commerce-mcp...

# Warm up the embedding model before deploy. This downloads Xenova/bge-small-en-v1.5
# (~130 MB) and caches it into a local directory so it survives the deploy.
RUN mkdir -p /tmp/model-cache && \
    cd /repo && \
    node infra/commerce-mcp/warm-embeddings.js /tmp/model-cache

# --prod drops devDependencies (typescript, ts-node) from the result.
# --ignore-scripts to skip native postinstalls.
RUN pnpm deploy --filter=@thornbury/commerce-mcp --prod --ignore-scripts /out

# Copy the cached model into the deployment output so it persists in the runtime image.
RUN cp -r /tmp/model-cache /out/.models


FROM node:22-slim AS runtime

# 3620 is PLAN.md §13's allocation for the MCP server.
# HOST defaults to 0.0.0.0 for Container Apps, but can be overridden.
# LOCAL_EMBEDDING_CACHE is where the Xenova/bge-small-en-v1.5 model is cached,
# pre-warmed at build time so first queries are fast.
ENV NODE_ENV=production \
    COMMERCE_MCP_PORT=3620 \
    HOST=0.0.0.0 \
    LOCAL_EMBEDDING_CACHE=/app/.models

WORKDIR /app

COPY --from=build /out ./

# Ensure node user owns the cache directory (it was created as root in build stage).
RUN chown -R node:node /app/.models

USER node
EXPOSE 3620

# The MCP package has a build script (tsc); dist/http.js is the entry point.
CMD ["node", "dist/http.js"]
