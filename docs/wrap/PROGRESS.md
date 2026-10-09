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

## Step 2.1 — Format detection

**Date:** 2026-10-09

Built content-based format and encoding detection and a CLI that runs it over a directory. Detection reads the bytes, not the extension; the extension only feeds the mismatch flag.

- **`format-detector.ts`** — `detectFormat(buf, filename)` returns a `DetectionResult` (`{format, encoding, confidence, reason}`), not a bare `Format` as the plan's first draft said. Also exports `detectEncoding`, `decodeToUtf8`, `Format` and `Encoding`. Magic bytes (PDF, gzip, ZIP, images, ELF, MZ) route to BINARY. Heuristics cover C source/header, CSV (needs at least 5 non-`#` rows), JSON, and Markdown.
- **`format-detector.selftest.ts`** — 17 checks, run by `pnpm --filter @wrap/ai detect:check`.
- **`cli/detect-formats.ts`** — walks a directory (default `data/raw_dump`, or the first CLI argument), writes one JSON line per file to `data/format-detection.jsonl` (`path`, `extension`, `format`, `encoding`, `confidence`, `reason`, `mismatch`), and prints a summary. UNKNOWN files get a one-line warning and stay in the output. A file that cannot be read is recorded as an error and does not stop the run.
- **`.gitignore`** — `data/format-detection.jsonl` added (it was not ignored; `data/raw_dump/` already is, via the root `.gitignore`).

**Commands (from repo root):**
```bash
pnpm wrap:detect-formats                 # scan data/raw_dump, write the jsonl, print the summary
pnpm wrap:detect-formats <other-dir>     # scan another directory
pnpm --filter @wrap/ai detect:check      # selftest (17 checks)
```

**Summary (`data/raw_dump`, 1111 files):**
- Formats: MARKDOWN=670, C_SOURCE=147, CSV=123, TEXT=88, C_HEADER=73, JSON=9, UNKNOWN=1
- Encodings: UTF8=1109, LATIN1=1, UNKNOWN=1
- Errors: 0
- Extension mismatches: 6 (listed below; the list is short enough to show in full)
  - `empty.txt` → UNKNOWN (empty file)
  - `eps-core/docs/module-filter_iir_2_misnamed.txt` → MARKDOWN
  - `huge-repeated.txt` → MARKDOWN
  - `eps-safety-monitor/reports/hil-PRG-TDR-31-06_misnamed.c` → MARKDOWN
  - `pmo/closure-reports/EFF-BULK-0225_misnamed.csv` → TEXT
  - `pmo/quotes/QUO-0049_misnamed.json` → MARKDOWN
- Fix: Markdown now needs ≥2 signals; git-log.txt files were misread as Markdown on a single '#' line.

**Notes:**
- `make-mess` plants no BOM, UTF-16 or binary files, so BINARY=0 and UTF-16=0 in the real corpus. Those paths are covered by the selftest only.
- Only 1 of the 4 cp1252 files has high bytes. The other 3 are pure ASCII, so they detect as UTF8 and are indistinguishable from plain text by bytes alone.
- CSV detection needs at least 5 non-`#` rows, so shorter CSV-like files fall to TEXT.

**Checks:** `detect:check` 17/17 pass; `pnpm --filter @wrap/ai exec tsc --noEmit` passes; `pnpm wrap:eval` runs (stub, 27 answerable cases; Recall@6 0.07, unchanged in kind from Step 1.2).

## Step 2.2 — Dedup

**Date:** 2026-10-09

Built exact (SHA-256) and near-duplicate (word shingles + MinHash) detection by hand, with no libraries beyond Node's `crypto`, and a CLI that writes a report.

- **`ingest/dedup.ts`** — `computeSHA256`, `computeShingles(text, k=5)`, `generateHash(seed, s)`, `computeMinHash(shingles, 128)`, `jaccardSimilarity`, `exactJaccard` (for checking the estimate). Hash is seeded FNV-1a with a murmur3 fmix32 finaliser, seed 42 + i per slot.
- **`ingest/dedup.selftest.ts`** — 7 checks, run by `pnpm --filter @wrap/ai dedup:check`.
- **`cli/dedup-check.ts`** — walks `data/raw_dump` (or the first argument). SHA-256 of raw bytes for every file. BINARY and UNKNOWN files are hashed but not shingled. Other files are decoded with `detectFormat`/`decodeToUtf8`; files over 10 MB keep only the first and last 10% of the text. Exact groups keep the shortest relative path (tie: alphabetical). Near-dup pairs are compared among the files that survive exact dedup, flagged at ≥ 0.95. Writes `data/dedup-report.json` (`exact_duplicates`, `near_duplicates`, `summary`). Prints the summary, the first 10 of each list, and runtime. The report has no timestamp or runtime, so it is byte-identical across runs.
- **Report shape:** the plan's sketch was adjusted. Exact groups are `{hash, files, kept, removed}`, where `removed` is the list of removed paths (not a count). Near-dups are `{file_a, file_b, similarity}`. Summary counts are `total_files, skipped_shingling, exact_groups, exact_removed, near_dup_pairs, pairs_ge_0_9, pairs_ge_0_8, files_after_dedup`. The two `pairs_ge` counts are cumulative and include the ≥ 0.95 pairs.
- **`.gitignore`** — `data/dedup-report.json` added. It is regenerated output.

**Choices:**
- Shingles are word 5-grams, lowercased, with whitespace collapsed. Punctuation stays part of the word.
- 128 MinHash slots. Estimate standard error at Jaccard 0.9 is about ±0.025, so the 0.95 flag is noisy (see the borderline pair below).
- FNV-1a + fmix32 seed 42 instead of the plan's HMAC hint. It is much faster for 128 hashes over every shingle and still deterministic.
- `kept` = shortest path, so the original wins over `_copy_N_of_` and `_misnamed` copies.

**Commands (from repo root):**
```bash
pnpm wrap:dedup-check              # scan data/raw_dump, write the report, print the summary
pnpm wrap:dedup-check <other-dir>  # scan another directory
pnpm --filter @wrap/ai dedup:check # selftest (7 checks)
jq '.exact_duplicates[] | .kept' apps/ai/wrap/data/dedup-report.json
```

**Summary (`data/raw_dump`, 1111 files, 3.5 s):**
- Total files: 1111 (skipped shingling: 1, the empty `empty.txt`; errors: 0)
- Exact groups: 13, removing 18 files
- Near-dup pairs ≥ 0.95: 1. Pairs ≥ 0.9: 5. Pairs ≥ 0.8: 12
- Files after dedup: 1093

**Planted vs found (make-mess, seed 42):**
- Exact duplicates: 5 originals × 2 `_copy_N_of_` files = 10 planted. All 5 groups found, all 10 copies removed.
- Wrong-extension copies (8 files, byte-identical to an original, not a dup plant): found as 8 extra exact groups. That is correct, since the bytes match.
- Near-duplicates: 10 `_v2` files planted. At ≥ 0.95, 1 found. The other 9 are below 0.95:

| `_v2` file | MinHash | exact Jaccard |
|---|---|---|
| eps-core/reports/hil-PRG-VGR-18-03_v2.md | 0.9531 (flagged) | 0.909 |
| pmo/closure-reports/EFF-BULK-0288_v2.md | 0.8906 | 0.898 |
| pmo/closure-reports/EFF-BULK-0520_v2.md | 0.8516 | 0.858 |
| pmo/closure-reports/EFF-BULK-0257_v2.md | 0.8359 | 0.867 |
| releases/eps-steer-by-wire-4.20.1_v2.md | 0.8359 | 0.840 |
| eps-diagnostics/docs/module-lookup_table_1_v2.md | 0.7969 | 0.800 |
| requirements/PRG-MRL-04/review-notes-PRG-MRL-04_v2.md | 0.7969 | 0.804 |
| requirements/PRG-CHV-29/architecture-PRG-CHV-29_v2.md | 0.7813 | 0.841 |
| pmo/closure-reports/EFF-BULK-0416_v2.md | 0.5703 | 0.594 |
| eps-motor-control/reports/misra-sat_math_7_v2.txt | 0.6484 | 0.590 |

  The 0.95 threshold misses 9 of 10 planted near-dups. The `make-mess` edit changes 2–5 lines, and each changed line breaks about five 5-word shingles. Short files lose a lot of similarity. The one flagged pair is borderline: the exact Jaccard is 0.909, so it is a 0.95 only by estimate noise. Both the threshold and the shingle size are open questions for the next step. At ≥ 0.8, 5 of the 10 are caught (the flagged pair and four more at 0.84–0.89).

**Checks:** `dedup:check` 7/7 pass; `pnpm --filter @wrap/ai exec tsc --noEmit` passes; report byte-identical across two runs (`sha256sum`); `jq` lists 13 kept paths.
