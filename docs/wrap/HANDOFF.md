# Handoff — wrap pipeline and one-stop learning site

*Written 2026-10-09. Read this first when you come back. Commit hashes were
checked against `git log` on that date.*

---

## 1. Where we stopped (2026-10-09)

The learner paused everything except one thing: the `/learn` start-to-finish
path. The wrap pipeline (step 2.6) is parked, not finished. Wrap's own
"How it works" step pages (job 2c) are parked in git stashes. The next work is
the `/learn` path (section 5, item A).

---

## 2. Wrap pipeline (`apps/ai/wrap`) — status

Plan: `docs/wrap/PLAN.md`. Progress log: `docs/wrap/PROGRESS.md`.

| Step | What | Commit(s) | Status |
|---|---|---|---|
| 0.1–1.1 | Scaffold, make-mess corpus, first model calls, 30 golden questions | `3986869` … `2c2ec88` | Done |
| 1.2 | Eval runner, metrics, stub retrieval, diff/history/latest | `bd2e457` | Done |
| 2.1 | Format and encoding detection (`detect-formats`) | `1405f03`, fix `c49ea4f` | Done |
| 2.2 | SHA-256 exact and MinHash near-duplicate detection (`dedup-check`) | `51f5f8d`, tuning `1f1eaee` | Done. Tuned to k=5, t=0.75: 8 of 10 planted near-dups caught |
| 2.3 | Reversible PII scrubbing, allowlist (`scrub-pii`) | `5ffeb76`, handle fix `04a1959` | Done |
| 2.4 | Type-aware chunking (Markdown, C/H, CSV, text) | `43354c1` | Done |
| 2.5 | Metadata extraction (subsystem, type, IDs, dates, keywords) | `5d64c7d`, fix `0b846ae` | Done. 15,795 chunks |
| 2.6 | Stage A: schema, idempotent embedding, HNSW index | `6ef1d75` | Stage A done. Full run paused (section 3) |

Neon database: set via `WRAP_DB_URL` in the root `.env`.

---

## 3. 2.6 — PAUSED, work parked in git stash

**Why paused.** The Gemini free tier blocked the full run. Each text costs one
request. The limit is about 100 per minute, plus a daily cap.

**What exists.**

- 120 chunks embedded with `gemini-embedding-001` in table `embeddings`.
- The learner chose a local model: `bge-base-en-v1.5` (768 dimensions), run
  through `@huggingface/transformers`. It writes to a new table,
  `embeddings_local`.
- This local work is **uncommitted**. It is parked in the stash named
  `WIP 2.6: local bge-base embeddings (embeddings_local), partial run, + lockfile/root scripts`.
  The stash also holds the root `package.json` and `pnpm-lock.yaml` changes.
- The local run was stopped part way. How many rows reached `embeddings_local`
  is unknown. Re-running is safe. It is idempotent by `content_hash` + model.

**Resume steps.**

```bash
cd /home/byron/Documents/Zahra/ahk/FDE/project-a
git stash list                       # find the "WIP 2.6" stash
git stash apply <that stash>         # e.g. stash@{1}; apply, don't pop, until it works
pnpm install
pnpm -s wrap:db:migrate
nice -n 10 pnpm -s wrap:embed:local --all   # script name is in the stash's root package.json; committed package.json has only wrap:embed
```

Then run the stage C checks:

1. Re-run the embed. It should add 0 rows.
2. Count rows. Expect 15,795 chunks.
3. Run `EXPLAIN` on a query to confirm the HNSW index is used.
4. Test query: `"What is the assist torque limit?"` with kind `query`.
   bge needs the query prefix. Do not skip it.

**Clean-up due.** `packages/wrap-postgres/migrations/001-init.sql` is an old,
never-applied schema. It conflicts with `apps/ai/wrap/src/db/schema.sql`.
Retire it (delete it) and keep `schema.sql` as the one source.

---

## 4. wrap-app (`apps/web/wrap-app`)

| Item | Commit | Notes |
|---|---|---|
| TanStack Start scaffold, How it works page ported from commerce-app | `bf9f19c` | |
| How it works content, steps 0.1–2.3 | `80fa7c3` | |
| How it works, step 2.4 | `c1a7fe3` | |
| How it works, step 2.5 | `29838e0` | |
| Landing page for the wrap plan | `a33d3bf` | |
| Own theme: archive/press palette | `a277dc3` | paper/ink; marker `#9f4410`, amber `#f5b942`; Fraunces + Source Sans 3 + IBM Plex Mono |
| Deploy job, Dockerfile, veresk landing link | `60a8025` | Container app `wrap-app`; image `docker.io/amir2575/wrap` |
| Bind fix for production | `58642e6` | First deploy failed because the server listened on 127.0.0.1. Now listens on all interfaces in production |
| veresk card for wrap | `ae64910` | |

**Dev port:** 3700 (`pnpm wrap:dev`, binds 127.0.0.1).

**Job 2c — UNFINISHED.** Wrap's `/steps` page on the shared `@veresk/learn`
kit. Parked in two stashes:

- `WIP 2c: wrap-app on canonical @veresk/learn kit (unfinished)`
- `WIP 2c (part 2): new file WrapStep.tsx adapter`

Apply both to resume. Check that the adapter file is complete before building on it.

---

## 5. One-stop learning site — the plan (approved)

**Goal.** All explanatory UI from every app moves into one shared package,
`@veresk/learn` (`packages/learn`). It is mounted by `veresk-app` at `/learn`
and by `wrap-app`.

**Shape.** One start-to-finish path that follows `docs/wrap/PLAN.md` phases 0–8.
Every stop shows:

- lesson text and charts;
- wrap's hands-on step cards (plain · why · code + printed · learned · words);
- "Under the hood" pop-ups, and matching engagement pop-ups.

The side nav follows the path. The old 5 topic tracks stay as "browse by topic".

**Rules.**

- Shared code goes in `@veresk/learn`, not `@fde/*`. The leak check scans `@fde/*` for domain words.
- Colours come from CSS variables, with fallbacks.
- Move, then repoint. Do not copy. Check that the app that lost the code still builds.

**Done.**

| Step | Commit | What |
|---|---|---|
| 1a | `0bfd0fb` | Lesson kit and 10 charts moved to `packages/learn` |
| 1b | `4bfb92b` | 27 lessons, index, map and track data moved; `LearnProvider` base path; `LESSON_PAGES` registry |
| 2a | `dcd2a27` | Canonical how-it-works kit in `packages/learn/src/steps` (subpath `@veresk/learn/steps`); safety-app uses it |
| 2b | `4357f54` | commerce-app uses it. Canonical kit gained `StepState`, `Wire`, provenance `proposed`/`corrected`, `PhaseHead` status/waits |

**Next, in order.**

| Item | Work |
|---|---|
| **A** (current focus) | The start-to-finish path in `/learn`. See section 6 |
| B | Finish job 2c: wrap `/steps` on the kit (from the stash) |
| C | Move safety's 14 modals, Stage 4–7, and commerce's hoods into the package, tagged by phase |
| D | Data-flow walkthroughs (pharma, safety, steering; Journey turns) and a gallery of landing maps |
| E | wrap mounts the whole `/learn` |
| F | Port charts into wrap steps (VectorLab, Funnel, Slope, new MinHash and PII figures) |

---

## 6. The path — phase → lessons map (approved)

| Phase | Lessons | Wrap steps |
|---|---|---|
| P0 Setup & the mess | vectors, pipelines, architecture (reference) | 0.1–0.3 |
| P1 Evals first | answer-key, evals, regressions, guessing | 1.1–1.2 |
| P2 Ingestion | multimodal, residency, drift | 2.1–2.6 |
| P3 RAG ladder | retrieval, hybrid, attention, context, corrective, graph | 3.1–3.12 |
| P4 Customer's API | credentials | 4.1–4.3 |
| P5 Tools & agents | generation, loop, tools, agentic, injection, orchestration | 5.1–5.4 |
| P6 MCP | no lesson yet | 6.1–6.4 |
| P7 Product polish | forensics, cost, caching | 7.1–7.4 |
| P8 Cloud & comparison | finetuning, ceiling | 8.1–8.3 |

**Gaps.** Where the wrap step page is the lesson (no separate lesson yet):
dedup/MinHash, PII, chunking, metadata, BM25, rerank, multi-query/HyDE,
parent-child, text-to-SQL, legacy API, MCP, streaming UI, tracing.

**Rule.** A lesson with no built code gets the existing `proposed` or `cited`
badge. Never invent code for it.

---

## 7. Loose ends

| Item | Detail |
|---|---|
| `pnpm arch:check` is stale | Stale since 1b. Not run in CI. Regenerate with `pnpm arch:graph` once the stashes are resolved |
| Old paths in docs | `docs/SITE.md` and `docs/ARCHITECTURE.md` still mention old `lib/learn` and `pages/learn` paths |
| Unused CSS | commerce `app.css` has unused old `thb-*` kit rules |
| Wrong port in plan | `docs/wrap/PLAN.md` says `localhost:3500` in later steps. Wrap is on 3700 |
| Step count | `PLAN.md` says 35 steps. Its table sums to 41 |
| CSV share | CSV rows are 81% of chunks (12,760 of 15,795). Judge with Phase 3 evals |
| `.env` | Other apps' DB URLs sit on unquoted lines with `&`. Do not `source` it in a shell |

---

## 8. How to run locally

| What | Command |
|---|---|
| Wrap | `pnpm wrap:dev` → `127.0.0.1:3700` |
| veresk | `pnpm --filter @veresk/app exec vite dev --host 127.0.0.1 --port 3300` (or `pnpm veresk:dev`) |
| Mac tunnel | Run on the Mac: `ssh -t -L 3300:127.0.0.1:3300 -L 3700:127.0.0.1:3700 byron@10.242.84.107` |

---

## 9. Working rules

- Use Haiku agents for all work. Run at most 3 at a time.
- Commit as `ZahraKhademi <Khademi.zahra@ufl.edu>`. No `Co-Authored-By` trailer.
- Add files by name. Never `git add -A` or `git add .`.
- Never push. The learner pushes.
- Ask before paid model runs.
- No new Azure resources without a clear OK.
