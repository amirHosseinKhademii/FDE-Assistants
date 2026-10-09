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

## Step 1.2 — Eval runner (stub retrieval)
**Date:** 2026-10-09
Built the retrieval eval harness. Retrieval is still a stub, so these numbers check the harness, not retrieval quality.
- **`runner.ts`** — runs the 30 golden questions through `stub-retrieve.ts`, scores recall@3/6/10, MRR and hit-rate, writes `evals/results/<variant>-<timestamp>.json`. Unanswerable cases (q-028..q-030) are kept in `per_case` with null metrics and left out of the aggregates.
- **`metrics.ts`** — pure recall@k, reciprocal rank and hit-rate functions.
- **`compare.ts`** — diffs two runs (metric table with signed Δ, plus per-case recall@6 changes). Refuses with exit 2 if `model`, `fixture_mode` or `repeat_count` differ.
- **`history.ts`** — one row per result file, oldest first. `--latest` prints the newest run's full metrics.
- **`results.ts`** — shared loader for the result JSON files.

**Commands (from repo root):**
```bash
pnpm wrap:eval             # run the stub eval, write a result file
pnpm wrap:eval:latest      # full metrics of the newest run
pnpm wrap:eval:history     # one row per result file
pnpm wrap:eval:diff        # newest two runs (or: pnpm wrap:eval:diff <before> <after>)
```

**Stub baseline (`pnpm wrap:eval:latest`, 27 answerable cases):**

| Metric | Value |
|---|---|
| Recall@3 | 0.037 |
| Recall@6 | 0.074 |
| Recall@10 | 0.222 |
| MRR | 0.045 |
| Hit-rate | 0.222 |

**Note:** These stub numbers are a harness check, not a retrieval score. The stub deliberately places the gold doc in the top 10 for about one query in three, so they only prove that the metrics and diff work. The real baseline comes when real retrieval replaces `stub-retrieve.ts` in Phase 2.

**Checks:** `pnpm --filter @wrap/ai exec tsc --noEmit` passes. Refusal test: a result file with an altered `model` makes `pnpm wrap:eval:diff <altered> <real>` exit 2.
