# syntax=docker/dockerfile:1.7-labs
#
# Brf Exempelgården's demo as one deployable image: the question page and the
# /api/ask stream that apps/web/brf-app serves. Built from the REPO ROOT, because
# this is a pnpm workspace and the build needs the lockfile and every package the
# app links to.
#
#   docker build -f infra/brf/Dockerfile -t brf-demo:dev .
#
# NOT DEPLOYED. Writing this file creates no Azure resource. The deploy step is
# a later decision, and the workflow that would run it is a manual draft in
# .github/workflows/deploy-brf.yml.
#
# Modelled on infra/pharma/Dockerfile, which carries the reasoning for each step.
# The differences are below.
#
# THE CORPUS IS COPIED IN. The engine reads its documents from docs/brf/corpus
# (BRF_CORPUS_DIR overrides), and `pnpm deploy` only packs workspace packages, so
# without the explicit COPY the runtime image would have no documents to search.
#
# THE INDEX IS NOT IN THE IMAGE. The vectors live in a Postgres database, reached
# through BRF_DATABASE_URL at runtime. Nothing here sets it, so the container
# refuses to answer until the variable is provided.
#
# EMBEDDINGS=local runs the local MiniLM model through onnxruntime-node. --ignore-scripts
# skips its postinstall, which only fetches GPU libraries. The pharma and steering
# images run EMBEDDINGS=local the same way, so this matches a deployment that already
# works. The model itself downloads on first use, into a cache directory that must be
# writable at runtime.

FROM node:22-slim AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

WORKDIR /repo

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm fetch --ignore-scripts

COPY pnpm-workspace.yaml ./
COPY --parents */*/package.json */*/*/package.json ./
RUN pnpm install --frozen-lockfile --offline

COPY . .

RUN pnpm exec turbo run build --filter=@brf/app...

RUN pnpm deploy --filter=@brf/app --prod --ignore-scripts /out


FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    LLM_PROVIDER=hosted \
    HOSTED_MODEL=gemini-3.5-flash-lite \
    LOOP=mastra \
    EMBEDDINGS=local

WORKDIR /app

COPY --from=build /out ./
COPY --from=build /repo/docs/brf/corpus ./docs/brf/corpus

USER node
EXPOSE 8080

CMD ["node", "dist/server/server.js"]
