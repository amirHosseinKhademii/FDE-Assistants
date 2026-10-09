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
- **`cli/dedup-check.ts`** — walks `data/raw_dump` (or the first argument). SHA-256 of raw bytes for every file. BINARY and UNKNOWN files are hashed but not shingled. Other files are decoded with `detectFormat`/`decodeToUtf8`; files over 10 MB keep only the first and last 10% of the text. Exact groups keep the shortest relative path (tie: alphabetical). Near-dup pairs are compared among the files that survive exact dedup, flagged at ≥ 0.75 (was 0.95 before the sweep below). Writes `data/dedup-report.json` (`exact_duplicates`, `near_duplicates`, `summary`). Flags `--shingle <k>` (default 5) and `--threshold <t>` (default 0.75). Prints the summary, the first 10 of each list, and runtime. The report has no timestamp or runtime, so it is byte-identical across runs.
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
pnpm wrap:dedup-check --shingle 5 --threshold 0.95  # the pre-tuning setting
pnpm --filter @wrap/ai dedup:check # selftest (7 checks)
jq '.exact_duplicates[] | .kept' apps/ai/wrap/data/dedup-report.json
```

**Summary (`data/raw_dump`, 1111 files, 3.5 s; k=5, threshold 0.75):**
- Total files: 1111 (skipped shingling: 1, the empty `empty.txt`; errors: 0)
- Exact groups: 13, removing 18 files
- Near-dup pairs ≥ 0.75: 15 (8 planted `_v2` + 7 same-source make-mess variants). Pairs ≥ 0.9: 5. Pairs ≥ 0.8: 12
- Files after dedup: 1093

**Planted vs found at the original 0.95 threshold (make-mess, seed 42, before the tuning below):**
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

**Tuning sweep (fix):** the 0.95 / 5-gram defaults caught 1 of 10 planted `_v2` pairs. A throwaway sweep (kept outside the repo) over k in {2,3,4,5} and thresholds in {0.95 … 0.5} over the files that survive exact dedup. Ground truth is the 10 pairs in `data/raw_dump/manifest.json`. The sweep also marks any flagged pair that shares a source with a planted file (`_cp1252`, `_pii`, `huge-repeated.txt` from `CODEOWNERS`), because those are real near-copies, not noise.

| k | t | TP (of 10) | flagged, all | of which same-source variants | other (unrelated) |
|---|---|---|---|---|---|
| 2 | 0.95 | 1 | 4 | 4 | 0 |
| 2 | 0.80 | 10 | 22 | 10 | 12 |
| 3 | 0.85 | 7 | 7 | 7 | 0 |
| 3 | 0.60 | 10 | 79 | 11 | 68 |
| 4 | 0.85 | 7 | 3 | 3 | 0 |
| 4 | 0.60 | 10 | 41 | 11 | 30 |
| 5 | 0.95 | 1 | 0 | 0 | 0 (old default) |
| 5 | 0.85 | 3 | 4 | 4 | 0 |
| 5 | 0.80 | 5 | 7 | 7 | 0 |
| **5** | **0.75** | **8** | **7** | **7** | **0** (chosen) |
| 5 | 0.70 | 8 | 11 | 11 | 0 |
| 5 | 0.60 | 9 | 15 | 11 | 4 |

Min MinHash among the 10 planted pairs vs max among the other pairs: k=2 0.805 / 0.992; k=3 0.664 / 0.961; k=4 0.625 / 0.961; k=5 0.570 / 0.938. No k gives a gap, so no threshold separates all 10 from everything else. Under the strict rule (TP=10, FP=0 with any unrelated flag counted) nothing qualifies, and the best strict trade-off is k=5 at 0.95 with 1 of 10, which is the old default. The chosen setting is k=5, threshold 0.75. It catches 8 of 10 planted pairs, and every flagged pair is either planted or a make-mess copy of the same source. The two missed pairs are `pmo/closure-reports/EFF-BULK-0416_v2.md` (0.570) and `eps-motor-control/reports/misra-sat_math_7_v2.txt` (0.648). Catching them needs a threshold near 0.65 or lower. At 0.6 the unrelated count rises to 4, and the grid has no point between 0.6 and 0.7 that was measured.

Why k=5 stays: the `make-mess` edit changes 2–5 lines. Each changed line breaks about five 5-word shingles, and short files have few shingles, so the similarity falls fast. Smaller k raises similarity for short files, but it also lets unrelated files match: k=2 at 0.80 flags 12 unrelated pairs, k=3 at 0.60 flags 68. At k=5 no unrelated pair reaches 0.70, and the lowest planted pair caught is 0.781. A threshold of 0.75 therefore sits between the two, and the sweep shows no unrelated flags at 0.70 or 0.75.

Among the flagged same-source variants (none unrelated): the top are `requirements/PRG-VGR-05/system-requirements-PRG-VGR-05_pii.md` (0.938), `…PRG-MRL-30/architecture-PRG-MRL-30_pii.md` (0.922), and `pmo/closure-reports/EFF-BULK-0398_cp1252.md` (0.844). The `CODEOWNERS` vs `huge-repeated.txt` pair (0.844) is a synthetic 2 MB repeat of `CODEOWNERS`, so it is correct to flag it. One unrelated pair sits below the threshold: `eps-calibration-tools/src/filter_iir_1.h` vs `eps-steer-by-wire/src/filter_iir_1.h` (0.648), a copied header across two projects. At 0.6 it is flagged, together with 3 other unrelated pairs.

**Checks:** `dedup:check` 7/7 pass; `pnpm --filter @wrap/ai exec tsc --noEmit` passes; report byte-identical across two runs; `jq` lists 13 kept paths; the flags reject `--shingle 0` and unknown options.

## Step 2.3 — PII scrubbing

**Date:** 2026-10-09

Built reversible PII redaction (emails, email handles, phones, person names) and a CLI that scrubs `data/raw_dump` into `data/scrubbed`. Redaction is by token (`EMAIL_0001`, `HANDLE_0001`, `PHONE_0001`, `PERSON_0001`); the map that restores originals lives in `data/pii-map.json`.

- **`ingest/pii-scrubber.ts`** — `scrubPII(text, mode, map, allowlist)`, `createPiiMap()`, `loadPiiAllowlist()`, `restorePII()`. Four passes in order (emails, handles, phones, names); each pass sees the previous pass's output, so tokens are never re-matched. The map is an explicit object passed in by the caller, not a module global, so one shared map gives one token per value across all files. `EMAIL_RE` and `PHONE_RE` are exported so `--validate` uses the same patterns.
- **`ingest/pii-scrubber.selftest.ts`** — 16 checks, run by `pnpm --filter @wrap/ai pii:check`.
- **`config/pii-allowlist.json`** — `{phrases, words}`. Phrases are exact multi-word strings; words suppress any name window containing them.
- **`cli/scrub-pii.ts`** — walks `data/raw_dump` (or a directory argument), copies BINARY and UNKNOWN files unchanged, scrubs everything else in redact mode with one shared map, mirrors the tree under `data/scrubbed/`, and writes `data/pii-map.json` (array of `{token, type, original}`, chmod 600). `--validate` re-scans `data/scrubbed` for emails and phones.
- **Scripts** — `scrub-pii` in `apps/ai/wrap/package.json`, `wrap:scrub-pii` in the root `package.json`.
- **`.gitignore`** — `data/scrubbed/` and `data/pii-map.json` added.

**Commands (from repo root):**
```bash
pnpm wrap:scrub-pii                 # scrub data/raw_dump -> data/scrubbed, write data/pii-map.json
pnpm wrap:scrub-pii --validate      # re-scan data/scrubbed for remaining emails/phones/known handles
pnpm --filter @wrap/ai pii:check    # selftest (16 checks)
jq '.[] | select(.type=="PERSON")' apps/ai/wrap/data/pii-map.json
```

**Counts (`data/raw_dump`, 1111 files, after allowlist tuning):**

| Type | Found | Unique values | Tokens |
|---|---|---|---|
| EMAIL | 779 | 14 | 14 |
| HANDLE | 937 | 12 | 12 |
| PHONE | 15 | 2 | 2 |
| PERSON | 15 | 2 | 2 |

- Files scanned: 1111. Changed: 149 (was 14 before the handle fix). Copied unchanged (BINARY/UNKNOWN): 1 (`empty.txt`). Errors: 0.
- Planted values, all six got a token: John Harvey, Alice Smith, jharvey@company.local, asmith.contractor@external-firm.io, 555-0147, +44-1234-567890.
- `--validate`: 1111 scrubbed files, 0 remaining emails or phones, 0 remaining known handles.
- Fix: email local parts (git-log author handles like t.sala) leaked in 39 files; now scrubbed as HANDLE tokens.

**Allowlist tuning (PERSON):**

| Run | Found | Unique | Top originals |
|---|---|---|---|
| Before (phrases + first word list) | 484 | 52 | Programme Office (237), Requirements Specification (41), Architectural Design (40), Tundra Vehicles, Kaigan Jidosha, Electric Power variants |
| After one tuning pass | 15 | 2 | Alice Smith (9), John Harvey (6) |

- Classification of the 52 before: 2 real-looking names (the planted pair). 50 false positives: document headings and phrases ("Programme Office", "Requirements Specification", "Architectural Design", "In Progress"), and company or product names ("X Electric Power", "X Motors", "X Automotive", "Tundra Vehicles", "Voegler Nutzfahrzeuge", "Kaigan Jidosha", "Altura Mobility", "Bradmoor Commercial").
- Words added (17): Programme, Office, Requirements, Specification, Architectural, Design, Progress, Electric, Power, Mobility, Commercial, Motors, Automotive, Auto, Vehicles, Nutzfahrzeuge, Jidosha. This is one pass, not three. The list is now a PERSON list of real-looking names only, so no further pass was needed.
- Caveat: a word on the allowlist suppresses every name window that contains it. A real person named "Power" or "Design" would be missed. The current corpus shows no such case.

**Checks:** `pii:check` 16/16 pass; `tsc --noEmit` clean; two runs give a byte-identical `pii-map.json` and a byte-identical `data/scrubbed` tree; `ls -l data/pii-map.json` shows `-rw-------`; `grep -rl jharvey@company.local data/scrubbed` returns 0 files.

**Deviations from plan:**
- Allowlist shape is `{phrases, words}`, not the plan's `{names, emails, patterns}`. The plan's sample `names` list contained "John" and "Harvey", which would have exempted the planted names. Names are never allowlisted.
- The map is an explicit object passed by the caller, not a hidden global.
- Plan's `scrubPII` signature returned `{text, redactions}` with a `mode: 'redact' | 'remove'` argument; implemented as specified. Removal mode keeps no map entries and is not reversible.
- UNKNOWN files are copied unscrubbed, as specified. A text file that detection cannot classify would therefore pass through with any PII intact. Only `empty.txt` hit this case in the current corpus.

## Step 2.4 — Type-aware chunking

**Date:** 2026-10-09

Built a chunker that splits each file by its format: Markdown by heading, C and headers by function or declaration group, CSV one row per chunk, JSON and plain text by sliding window. A CLI writes every chunk of the scrubbed tree to `data/chunks.jsonl`.

- **`chunking/types.ts`** — `Chunk`, `ChunkType`, `CHUNK_SIZES` (max 500 from `MAX_TOKENS_PER_CHUNK`, text window 400, overlap 100, min merge 50), `estimateTokens` (ceil(chars / 4)), deterministic `chunkId` (sha256 of path and index, 16 hex chars).
- **`chunking/markdown.ts`** — ATX headings; fenced code (``` and ~~~) hides `#` lines; `heading_path` trail; tiny sections merge into a neighbour; oversize sections window-split, each part repeating its heading lines.
- **`chunking/csv.ts`** — header plus one `column: value` chunk per row; quoted fields with commas, doubled quotes and embedded newlines; `#` comment lines skipped; over-wide rows truncated.
- **`chunking/text.ts`** — 400-token windows, 100-token overlap, breaks on paragraph gaps, never cuts a word.
- **`chunking/c-code.ts`** — C and header chunker. A masked copy of the file (comments, string and char literals, preprocessor directives blanked, same length) drives a brace-depth and `;` scan, so a `}` in a comment or a `{` in a string does not confuse it. A top-level `{...}` preceded by `)` is a function: its chunk runs from the doc comment directly above it (no blank line between) to the closing brace; `heading_path` and `metadata.function` hold the name. Other top-level units (includes, defines, typedefs, struct/enum definitions, prototypes, globals) are packed into declaration chunks up to the max; groups before the first function are `metadata.kind = "preamble"`. A function over the max is sub-split with the text window; each part repeats the signature line, and part 1 keeps the doc comment.
- **`chunking/index.ts`** — `chunkFile(sourceFile, text, format)` routes by `Format` from `ingest/format-detector.ts`. MARKDOWN to markdown; C_SOURCE and C_HEADER to c-code; CSV to csv; JSON and TEXT to text; BINARY and UNKNOWN give `[]`.
- **`chunking/chunking.selftest.ts`** — 17 checks, run by `pnpm --filter @wrap/ai chunk:check` (11 Markdown, CSV and text checks from Part A; 6 new C and router checks).
- **`cli/chunk.ts`** — walks `data/scrubbed`, skips files listed as removed exact duplicates in `data/dedup-report.json`, detects each format, decodes to UTF-8, chunks, and writes `data/chunks.jsonl`. Prints counts, per-type totals, token stats, over-max count and top files.
- **Scripts** — `chunk` in `apps/ai/wrap/package.json`, `wrap:chunk` in the root `package.json`. `data/chunks.jsonl` added to `apps/ai/wrap/.gitignore`.

**Commands (from repo root):**
```bash
pnpm wrap:chunk                      # scrubbed tree -> data/chunks.jsonl
pnpm --filter @wrap/ai chunk:check   # selftest (17 checks)
head -1 apps/ai/wrap/data/chunks.jsonl | jq '{type, source_file, tokens, metadata}'
```

**Run (`data/scrubbed`, 1111 files):**

| Item | Value |
|---|---|
| Files chunked | 1092 |
| Skipped, removed exact duplicate | 18 (all 18 entries in `dedup-report.json` found in the tree) |
| Skipped, BINARY or UNKNOWN | 1 |
| Total chunks | 20097 |
| csv_row | 12763 |
| markdown_section | 6097 |
| code_function | 807 (593 distinct names) |
| code_struct | 220 |
| text_paragraph | 210 |
| Tokens per chunk | min 6, median 28, p95 129, max 498 |
| Chunks over MAX_TOKENS_PER_CHUNK (500) | 0 |
| Largest files by chunk count | `huge-repeated.txt` 4167, `pmo/timesheets/2020-Q4.csv` 762, `pmo/timesheets/2025-Q3.csv` 606, `pmo/timesheets/2021-Q1.csv` 541, `pmo/timesheets/2024-Q3.csv` 540 |
| Runtime | 0.36 s |

- Output is byte-identical across two runs.
- No function in the corpus was over the max, so the C oversize sub-split is exercised only by its selftest.
- PII check: 254 lines contain `EMAIL_` or `HANDLE_` tokens (the input is the scrubbed tree); `t.sala@` appears 0 times.

**Choices:**
- Token estimate is ceil(chars / 4), as in Part A. No `js-tiktoken`, so no new dependency and no token cache.
- Sizes: 500 max (from the plan's `MAX_TOKENS_PER_CHUNK`), 400 text window, 100 overlap. Min merge 50 tokens for Markdown sections.
- The C preamble is a group of declaration units packed to the max, not one chunk per struct. Header prototypes and macros are packed the same way.
- A comment separated from a function by a blank line is not its doc comment; it is kept as declaration text so no text is dropped.
- Input is the scrubbed tree. Dedup-removed files are skipped (the kept copy is chunked). Their content is not otherwise used.

**Deviations from plan:**
- Plan named `src/cli/chunk-documents.ts` and `data/chunks.jsonl` written by `chunk-documents`. Built as `src/cli/chunk.ts` with script `chunk` and root `wrap:chunk`, per the brief.
- Plan's `subsystem`, `requirement_id` and `ticket_id` metadata are not extracted yet. Only `source_file`, `chunk_index`, `start_line`, `end_line`, `heading_path` and the per-type metadata are set.
- Plan's `chunkDocument` name is `chunkFile(sourceFile, text, format)` in `chunking/index.ts`, taking the detected format.
- Plan's `chunker.ts` is not one file. The per-type chunkers are split into `markdown.ts`, `csv.ts`, `text.ts` and `c-code.ts`, with shared types in `types.ts`.
- Known limit: a function inside an `extern "C" { ... }` block is not split out; the whole block is one declaration unit, window-split if large.
