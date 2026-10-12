# /learn redesign plan (2026-10-12)

## Why

The learner's verdict on the current veresk `/learn`: vague, not plain, hard to read, scattered (two navs: phases and topics, lessons written about our own apps), and the under-the-hood code is hard to follow.

## Goal

One course, start to finish, that teaches every concept used across all our apps (insurance, pharma, steering, wrap, commerce, safety) in a **generic** way. A software developer with no AI background should be able to read it top to bottom and build the same kind of system. No app names, no customer names, no domain words.

## Design rules (apply to every page)

1. **One path.** One linear list: modules, then lessons. No second "by topic" view, no phase pages.
2. **Fixed lesson template.** Every lesson has the same sections in the same order, so the reader always knows where to look:
   1. **In one sentence**: what it is (25 words max).
   2. **The problem**: "Without it" vs "With it", two short boxes side by side.
   3. **How it works**: 3 to 6 steps. Each step has a small "Step N" label, a bold title and 2 to 3 plain sentences with a concrete example value. No number column on the left. Optional simple left-to-right box diagram.
   4. **Code and under the hood (one button, one modal)**: a single compact row on the page with one "Open →" button. The modal holds, in order: (a) one self-contained TypeScript snippet (30 lines max, no imports from this repo, descriptive variable names, comments on their own line above a block, not trailing) with its literal output; (b) an "Under the hood" heading with the real data shapes: paragraphs, an example input and intermediate values, and an optional second snippet with its output.
   5. **Common mistakes**: 2 to 4 bullets.
   6. **Use it when / Skip it when**: two short lists.
   7. **Words to know**: term plus a one-line meaning.
   8. Previous / Next buttons. (No quiz: "Check yourself" was removed on 2026-10-12 at the learner's request.)
3. **Plain writing.** Sentences of 20 words or fewer. Define every term the first time it appears. No metaphors, no "we", no hype. American spelling. No em dashes, no en dashes, no semicolons.
4. **Generic.** Examples use neutral data (a help-center FAQ, a product manual, a support ticket). Never mention our apps, customers, or their domains. Any number copied from this repo's docs keeps a source note, otherwise drop it.
5. **No hard-coded counts.** Lesson and module counts are derived from the data, like `TOTALS` does today.

## UI and navigation

- **`/learn`** (index): one short paragraph "What you will be able to build", a "Start lesson 0.1" button, then the whole map: one card per module, listing its lessons with numbers.
- **`/learn/$module/$lesson`** (lesson page):
  - Left sidebar (300px on desktop; each lesson is one line, with `navTitle` as the short label): every module, collapsible, current lesson highlighted, visited lessons ticked (`localStorage`, wrapped in try/catch).
  - Top bar: breadcrumb `Module 4 · Retrieval › 4.4 Hybrid search` and `Lesson 23 of N`.
  - Reading column 720px max, body text 17px with line-height 1.65, section headings numbered.
  - Code block: line numbers, copy button, monospace. "What it prints" block underneath in a muted style.
  - Mobile: sidebar becomes a "Contents" drawer button. No horizontal scroll at 375px.
- **Readability first (learner, 2026-10-12): the theme, text, and content must all be much easier to read than today.**
  - Plain, calm theme: off-white page (#fafaf7) with near-black text (#1a1a1a) in light mode, #121212 page with #e8e8e3 text in dark mode. One accent color only, used for links and the current lesson. No gradients, no aurora/wash backgrounds, no animated heroes, no decorative motion on lesson pages.
  - Contrast at least WCAG AA (4.5:1) for all text, including muted text and code comments.
  - Font: system UI sans (`system-ui, -apple-system, Segoe UI, Roboto, sans-serif`), body 17px, line-height 1.65, paragraphs 65 to 75 characters wide. Headings clearly larger and bold (h1 32px, h2 22px), with generous space above each section.
  - Code: `ui-monospace, SFMono-Regular, Menlo, monospace` at 14.5px, light code background in both themes (no dark-on-dark), comments in a readable gray that still passes AA.
  - Short paragraphs (3 sentences max), lists over walls of text, one idea per paragraph.
- Light and dark via CSS variables. `packages/learn` must not use Tailwind utility classes (only `@veresk/surface` may). Follow how existing `packages/learn` components style themselves.
- `apps/web/veresk-app/src/routes/learn.tsx` (the layout) is rewritten to mount the new sidebar instead of the old `LessonNav`.

## Code layout

- New folder `packages/learn/src/course/`:
  - `types.ts`: the `Lesson` and `Module` types (below).
  - `modules/NN-slug.ts`: one file per module, exporting its `Module` with its lessons.
  - `index.ts`: the ordered `COURSE` array plus derived helpers (`allLessons`, `findLesson`, `prevNext`, counts).
  - `ui/`: `CourseIndex.tsx`, `LessonPage.tsx`, `Sidebar.tsx`, `CodeBlock.tsx`, `course.css`.
- Exported from `@veresk/learn` **beside** the old exports. Do not remove or change `@veresk/learn/wrap-glossary` or `@veresk/learn/wrap-steps`: wrap-app imports them.
- Old veresk single-segment routes (`learn.vectors.tsx` and the rest) are deleted only in the final cleanup batch, after every module is written.

```ts
export type Lesson = {
  slug: string;              // 'hybrid-search'
  number: string;            // '4.4'
  title: string;
  navTitle?: string;         // short sidebar label, about 26 characters or fewer
  oneLiner: string;
  problem: { without: string; with: string };
  steps: { title: string; detail: string }[];
  diagram?: string[];        // box labels, drawn left to right
  code: { source: string; output: string };
  hood: { paragraphs: string[]; example?: { label: string; value: string }[] };
  mistakes: string[];
  useWhen: string[];
  skipWhen: string[];
  words: { term: string; meaning: string }[];
};
export type Module = { slug: string; number: number; title: string; summary: string; lessons: Lesson[] };
```

## The course (modules and lessons)

| # | Module | Lessons |
|---|---|---|
| 0 | Start here | 0.1 What you will build (an assistant that answers from documents and uses tools), the full map. 0.2 How to read a lesson |
| 1 | Talking to a model | 1.1 One model call (messages in, text out). 1.2 Tokens and cost. 1.3 Temperature and why answers vary. 1.4 Embeddings: text as numbers. 1.5 Cosine similarity |
| 2 | Measure first: evals | 2.1 The golden set. 2.2 Retrieval metrics (hit rate, recall@k, MRR). 2.3 Checking answers and LLM-as-judge. 2.4 Repeat runs and flaky results. 2.5 Baselines, diffs, regressions. 2.6 Severity buckets and control cases |
| 3 | Preparing documents | 3.1 Format detection. 3.2 Deduplication (SHA-256, MinHash). 3.3 PII scrubbing. 3.4 Chunking. 3.5 Metadata. 3.6 Embed and store (pgvector, HNSW, idempotent re-ingest) |
| 4 | Retrieval | 4.1 Vector search (naive RAG). 4.2 Metadata filters. 4.3 Keyword search (BM25). 4.4 Hybrid search and RRF. 4.5 Reranking. 4.6 Query rewriting (multi-query, HyDE). 4.7 Parent-child and compression. 4.8 Corrective RAG. 4.9 Text-to-SQL. 4.10 Graph RAG. 4.11 Multimodal. 4.12 What retrieval cannot fix |
| 5 | Writing the answer | 5.1 Building the context. 5.2 The prompt. 5.3 Structured output with a schema. 5.4 Coherence rules. 5.5 Citations, refusing, escalating. 5.6 Long context and attention |
| 6 | Tools and agents | 6.1 What a tool is. 6.2 The tool-calling loop. 6.3 Lookup vs search tools. 6.4 Wrapping a messy API (pagination, retries, rate limits, typed client). 6.5 Routing questions (agentic RAG). 6.6 Frameworks vs hand-written loops. 6.7 Many agents and fan-out |
| 7 | MCP | 7.1 Host, client, server, JSON-RPC. 7.2 A stdio server with tools. 7.3 Resources and prompts. 7.4 HTTP transport and tokens. 7.5 Writing a client |
| 8 | Safety | 8.1 Prompt injection. 8.2 Guardrails and confirm-before-write. 8.3 Credentials. 8.4 What data leaves your servers |
| 9 | Running it for real | 9.1 Streaming answers with citations. 9.2 Tracing and logs. 9.3 Tracking cost. 9.4 Caching. 9.5 Drift. 9.6 Debugging a bad answer |
| 10 | Beyond retrieval | 10.1 Context, retrieval, or fine-tuning: choosing. 10.2 Fine-tuning. 10.3 Switching model providers |

## Old content to new lesson (nothing dropped)

| Old | New |
|---|---|
| architecture | 0.1 |
| vectors | 1.4, 1.5 |
| guessing | 1.3 |
| evals | 2.1 to 2.3 |
| regressions | 2.5 |
| answer-key | 2.6 |
| retrieval | 4.1 |
| hybrid | 4.3, 4.4 |
| corrective | 4.8 |
| graph | 4.10 |
| multimodal | 4.11 |
| ceiling | 4.12 |
| generation | 5.1 to 5.5 |
| attention | 5.6 |
| loop | 6.2 |
| tools | 6.1, 6.3 |
| agentic | 6.5 |
| pipelines, orchestration | 6.7 |
| injection | 8.1 |
| credentials | 8.3 |
| residency | 8.4 |
| cost | 9.3 |
| caching | 9.4 |
| drift | 9.5 |
| forensics | 9.6 |
| context, finetuning | 10.1, 10.2 |
| wrap PLAN phases 0 to 8 | modules 1 to 10 by topic (phase 4 to 6.4, phase 6 to module 7, phase 7 to module 9, phase 8 to 10.3) |
| commerce and safety `/steps` (MCP handshake, guard, cost, loop, search) | 7.1 to 7.5, 8.2, 9.3, 6.2, 4.x |
| all glossaries (wrap, commerce, safety) | the "Words to know" of the lesson that introduces each term |

## Batches (Haiku agents, at most 2 or 3 at a time)

| Batch | Work |
|---|---|
| A | Types, `COURSE` index, `CourseIndex`, `LessonPage`, `Sidebar`, `CodeBlock`, CSS, new routes, new `learn.tsx` layout. Fully write module 0 and lesson 1.4 as the **exemplar**. Stub every other lesson (title and number only, page shows "Being written"). Screenshots at 1280px and 375px |
| B to L | One module per agent, written to match the exemplar's length and tone |
| M | Cleanup: delete the old veresk single-segment learn routes and `components/learn/LessonNav.tsx`, check the mapping table above is covered, update docs |

## Every batch must pass

- `pnpm --filter @veresk/app build` and `pnpm --filter @wrap/web build`, plus `pnpm typecheck`.
- `grep -rniE "meridian|vantis|veresk|thornbury|calder|@wrap|wrap-app|insur|pharma|steering|policy|claim|recall campaign|nhtsa" packages/learn/src/course/` returns nothing.
- `grep -rnP "\x{2014}|\x{2013}|;" packages/learn/src/course/modules/` finds no em dash, en dash, or semicolon inside prose strings (code strings may use semicolons).
- Dev server on `127.0.0.1` only.
- Commit by exact file names as `ZahraKhademi <Khademi.zahra@ufl.edu>`, no Co-Authored-By trailer, never push.
