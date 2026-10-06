# Wrap AI Project Progress — 2026-10-06

## Step 0.1 — Scaffold
**Commits:** 3986869, b0ab64b
Setup workspace, initial package structure, TypeScript configuration.

## Step 0.2 — Make-Mess
**Commit:** 74220df
Generated 1,111 deterministic test files with 41 planted flaws.
RNG seed: 42 (reproducible).

## Step 0.3 — Foundation Check (Gemini Chat & Embeddings)
**Commit:** c6b3fda
Hosted LLM integration via OpenAI-compatible endpoint.
- Chat completions (temperature sweep: 0 vs 1.2)
- Batch embeddings (cosine similarity validation)
- Cost tracking (free tier, $0)
- Corpus similarity: steering↔steering 0.824 vs steering↔weather 0.436

## Step 1.1 — Golden Questions & Validator
**Date:** 2026-10-06
Created 30 golden eval questions covering the steering corpus:
- **Lookups:** 12 questions (single-document fact retrieval)
- **Aggregate:** 8 questions (cross-document patterns)
- **Multi-hop:** 5 questions (chained reasoning)
- **Unanswerable:** 3 questions (questions outside corpus)
- **Structured:** 2 questions (CSV/data extraction)

**Validator (`golden-check.ts`)** — Validates:
- Required fields present (id, query, expected_sources, expected_facts, type, notes)
- IDs unique (q-001..q-030)
- Types in {lookup, aggregate, multi_hop, unanswerable, structured}
- All source files exist
- All facts appear in at least one source
- Unanswerable constraint: empty sources/facts + non-empty notes
- `--coverage` flag: corpus folder usage report

**Status:** All 30 questions pass validation. Corpus coverage: 11 of 12 folders referenced (eps-end-of-line has 0 questions).
