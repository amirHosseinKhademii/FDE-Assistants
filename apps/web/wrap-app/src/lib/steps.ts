/**
 * The content of `/steps`: phases, each holding steps, each step in five parts.
 *
 * ── HOW TO FILL THIS IN ────────────────────────────────────────────────────
 *
 * Add real steps to the `steps` array of a phase and fill the fields below.
 * Nothing else needs to change: the tab bar, the progress bar, the roadmap and
 * the counts are all derived from this array.
 *
 *   status    'done'    it ran; `done` holds the date, and `learned` says what
 *                       we found (past tense)
 *             'next'    the step being worked on now (at most one)
 *             'planned' not started; `learned` says what it WILL check
 *
 * Figures carry a `from` badge so a reader can tell measured output from a plan:
 *   measured   real output from running the thing
 *   corrected  real output that changed the plan
 *   cited      taken from a named document
 *   proposed   the plan's design, not built yet (the default)
 *   excerpt    real code, shortened for the page
 *
 * Code is copied from the repo as it stood on 2026-10-09. Every excerpt in this
 * file can be checked line by line against the file it names.
 */
import type { Lang } from '@veresk/surface';
import type { TermKey } from './glossary';

export type StepStatus = 'done' | 'next' | 'planned';

export type Provenance = 'measured' | 'corrected' | 'cited' | 'proposed' | 'excerpt';

/** The "code and what it printed" part of a step. */
export interface StepCode {
  /** What the figure shows, as a short sentence. */
  caption: string;
  /** Which badge the figure carries. */
  from: Provenance;
  /** Where the code came from, shown beside the badge. Optional. */
  source?: string;
  /** The file name or command shown above the code block. */
  path: string;
  lang: Lang;
  /** The real code, as one string with newlines. */
  code: string;
  /** What running it printed, as one string. Optional. */
  printed?: string;
}

/** The "under the hood" dialog attached to a step. */
export interface StepHood {
  title: string;
  /** The real code, as one string with newlines. */
  code: string;
  /** What it printed, as one string. */
  printed: string;
}

export interface StepDef {
  /** The step number as written on the page, e.g. '1.2'. Also the anchor id. */
  n: string;
  title: string;
  status: StepStatus;
  /** ISO date (2026-09-18) the step ran. Only meaningful when status is 'done'. */
  done?: string;
  /** What the step waits for, or 'nobody' if it can be built on a laptop. */
  needs: string;
  /** Part 1 — what the step does, in plain words. */
  plain: string;
  /** Part 2 — what would go wrong without it. */
  why?: string;
  /** Part 3 — the code and what it printed. */
  code?: StepCode;
  /** Part 4 — what we learned (done) or what it will check (planned). */
  learned?: string;
  /** Part 5 — words to know, each a key of GLOSSARY in lib/glossary.ts. */
  terms?: TermKey[];
  /** The "under the hood" dialog. Optional. */
  hood?: StepHood;
}

export interface PhaseDef {
  id: string;
  /** What the tab is called. */
  label: string;
  /** Two or three words on the tab, e.g. 'Started' or 'Not written yet'. */
  status: string;
  /** What you would have at the end of this phase that you did not have at the start. */
  what: string;
  /** What is stopping this phase, if it has not started. Omit once it can run. */
  waits?: string[];
  steps: StepDef[];
}

const planned = (n: string, title: string, plain: string): StepDef => ({
  n,
  title,
  status: 'planned',
  needs: 'the steps before it',
  plain,
});

export const PHASES: PhaseDef[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    status: 'Done',
    what: 'A database that can hold vectors, a deliberately messy copy of the corpus to work on, and a first proof that the hosted model returns numbers we can compare.',
    steps: [
      {
        n: '0.1',
        title: 'Set up the project and a Postgres with pgvector',
        status: 'done',
        done: '2026-10-06',
        needs: 'nobody',
        plain:
          'The wrap project is four apps inside the monorepo, and it gets its own Postgres database with the pgvector extension. Pgvector lets Postgres store lists of numbers and search them by closeness, which is how embeddings are searched later. The database runs in Docker, so any machine gets the same setup from one command.',
        why: 'Without a database that can store vectors, there is nowhere to keep the index that retrieval searches, and each machine would set Postgres up differently.',
        code: {
          caption: 'The first migration: turn on pgvector, then create the tables for chunks and their embeddings.',
          from: 'excerpt',
          path: 'packages/wrap-postgres/migrations/001-init.sql',
          lang: 'sql',
          code: String.raw`CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store document chunks with metadata
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  subsystem TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table to store embeddings for each chunk
CREATE TABLE IF NOT EXISTS embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  embedding vector(1536),
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
        },
        learned:
          'Plumbing only, so there are no figures. The database listens on 127.0.0.1 only. No step reads from it yet; the first real use is Step 2.6, which stores the embeddings.',
        terms: ['pgvector'],
      },
      {
        n: '0.2',
        title: 'Make the mess: a messy copy of the corpus, with a fixed seed',
        status: 'done',
        done: '2026-10-06',
        needs: 'nobody',
        plain:
          'The steering corpus is copied into a working folder on purpose, with the usual problems added: exact copies, near copies, wrong file extensions, an empty file, a huge file and fake personal details. The random choices come from a seeded generator, so every run plants the same mess and every engineer sees the same bugs.',
        why: 'Clean test data hides the bugs that real customer files cause. A pipeline that has only seen tidy files fails at the first messy one.',
        code: {
          caption: 'The random numbers come from a generator that is seeded from RNG_SEED (default 42), so a rerun plants the same flaws.',
          from: 'excerpt',
          path: 'apps/ai/wrap/src/cli/make-mess.ts',
          lang: 'typescript',
          code: String.raw`function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// (lines 51–216 left out: the shuffle, the transforms and the file walk)

async function main() {
  const seed = parseInt(process.env.RNG_SEED || "42", 10);
  const rng = mulberry32(seed);`,
        },
        learned:
          'The copy holds 1111 files and 41 planted flaws, recorded in the Step 0.2 log. Every later step works on this copy. Caveat: it plants no byte-order marks, UTF-16 or binary files, so those paths are only tested by the selftests.',
        terms: ['corpus'],
        hood: {
          title: 'Under the hood: the seeded random numbers',
          code: String.raw`function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}`,
          printed: `seed 42, run 1: 0.601104 0.448291 0.852466
seed 42, run 2: 0.601104 0.448291 0.852466`,
        },
      },
      {
        n: '0.3',
        title: 'First model calls: chat, embeddings and cosine similarity',
        status: 'done',
        done: '2026-10-06',
        needs: 'a hosted model key in .env',
        plain:
          'The first script calls the hosted model twice. A chat call sends a prompt and gets text back, and each call is priced per token, which is roughly four characters. An embedding call turns a text into a vector, a list of numbers that stands for its meaning. Cosine similarity then measures how close two vectors point, so we can check that texts about steering sit closer together than texts about weather.',
        why: 'Every model call costs money, and retrieval depends on embeddings behaving sensibly. Measuring cost and similarity first tells you later whether a change helped or quietly broke something.',
        code: {
          caption: 'Cosine similarity, written out by hand with no library: the dot product divided by the two lengths.',
          from: 'cited',
          source: 'docs/wrap/PROGRESS.md, Step 0.3',
          path: 'apps/ai/wrap/src/cli/foundation-check.ts',
          lang: 'typescript',
          code: String.raw`function l2Norm(vec: number[]): number {
  return Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, av, i) => sum + av * b[i], 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const normA = l2Norm(a);
  const normB = l2Norm(b);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct(a, b) / (normA * normB);
}`,
          printed: `Steering ↔ steering: 0.824
Steering ↔ weather:  0.436
(rounded, as recorded in docs/wrap/PROGRESS.md; the full-precision log was not kept)`,
        },
        learned:
          'The order came out right: the two steering texts scored 0.824 and steering against weather scored 0.436. That is one call on three texts, so it shows the pipeline works, not how good the model is. Cost on the free tier was $0. The temperature sweep ran, but its outputs were not recorded.',
        terms: ['embedding', 'vector', 'cosineSimilarity'],
        hood: {
          title: 'Under the hood: cosine on toy vectors',
          code: String.raw`function cosineSimilarity(a: number[], b: number[]): number {
  const normA = l2Norm(a);
  const normB = l2Norm(b);
  if (normA === 0 || normB === 0) return 0;
  return dotProduct(a, b) / (normA * normB);
}`,
          printed: `cos([1,0,1],[1,1,0]) = 0.5000
cos([1,2,3],[2,4,6]) = 1.0000
cos([1,0],[0,1])     = 0.0000`,
        },
      },
    ],
  },
  {
    id: 'evals',
    label: 'Evals first',
    status: 'Done',
    what: 'A hand-written answer key of 30 questions and a runner that scores any retriever the same way, so every later change can be measured against the same yardstick.',
    steps: [
      {
        n: '1.1',
        title: 'Thirty golden questions, written by hand',
        status: 'done',
        done: '2026-10-06',
        needs: 'nobody',
        plain:
          'Before any search exists, we write 30 questions by reading the corpus ourselves. Each question names the file or files that answer it and the facts the answer must contain. A validator then checks the list: ids are unique, every type is known, every named file exists, and every fact appears in a named file.',
        why: 'Without an answer key, every later score is a guess, and a sloppy key makes the evals report green while the system is wrong.',
        code: {
          caption: 'The first of the 30 records. Each line is one question with its expected files and facts.',
          from: 'measured',
          source: 'pnpm --filter @wrap/ai golden:check, 2026-10-09',
          path: 'apps/ai/wrap/evals/golden.jsonl',
          lang: 'json',
          code: String.raw`{"id":"q-001","query":"What build platform is used for the eps-calibration-tools?","expected_sources":["docs/steering/corpus/eps-calibration-tools/README.md","docs/steering/corpus/eps-steer-by-wire/README.md"],"expected_facts":["make PLATFORM=adaptive"],"type":"lookup","notes":"Line 7 in calibration-tools; shared Adaptive AUTOSAR build platform"}`,
          printed: `✓ q-028 (unanswerable): 0 sources, 0 facts
✓ q-029 (unanswerable): 0 sources, 0 facts
✓ q-030 (unanswerable): 0 sources, 0 facts
Total: 30 questions (12 lookup, 2 structured, 8 aggregate, 5 multi_hop, 3 unanswerable)
All sources exist: ✓`,
        },
        learned:
          'All 30 validate: 12 lookups, 8 aggregates, 5 multi-hop, 3 unanswerable and 2 structured. The validator checks that each fact appears in a named file, not that the expected answer is right; that part was checked by reading the files. Eleven of the twelve folders are referenced. eps-end-of-line has no question.',
        terms: ['golden', 'corpus'],
      },
      {
        n: '1.2',
        title: 'The eval runner: recall, MRR and hit-rate',
        status: 'done',
        done: '2026-10-09',
        needs: 'nobody',
        plain:
          'The runner sends each answerable question to a retriever and checks where the right file landed. Recall@k asks whether a right file is in the top k. MRR (mean reciprocal rank) rewards a right file that ranks high. Hit-rate asks whether a right file is anywhere in the top 10. The retriever is still a stub, so these numbers test the harness, not search.',
        why: 'Without a runner that scores every change the same way, nobody can say whether a change helped. The runner also refuses to compare two runs whose settings differ, so a model swap cannot pass as a code change.',
        code: {
          caption: 'Scoring one question: the metrics for a single case, from the list of ranked file ids and the gold file ids.',
          from: 'measured',
          source: 'pnpm wrap:eval, 2026-10-09',
          path: 'apps/ai/wrap/src/evals/metrics.ts',
          lang: 'typescript',
          code: String.raw`export function scoreCase(retrieved: string[], gold: string[]): CaseMetrics {
  return {
    recall_at_3: recallAtK(retrieved, gold, 3),
    recall_at_6: recallAtK(retrieved, gold, 6),
    recall_at_10: recallAtK(retrieved, gold, 10),
    reciprocal_rank: reciprocalRank(retrieved, gold),
    hit: hitAtDepth(retrieved, gold),
    rank_of_first_match: rankOfFirstMatch(retrieved, gold),
  };
}`,
          printed: `Variant: stub   cases scored: 27   unanswerable skipped: 3   repeats: 1
Metric          Value
Recall@3        0.04
Recall@6        0.07
Recall@10       0.22
MRR             0.04
Hit-rate@10     0.22`,
        },
        learned:
          'The stub put a right file in the top 10 for about one question in three, so Recall@6 of 0.07 and MRR of 0.04 check the harness and nothing else. The three unanswerable questions are kept in the per-case list and left out of the averages. A real baseline waits for a real retriever: PROGRESS places that in Phase 2, but the plan puts the first one at Step 3.1.',
        terms: ['golden', 'recallAtK', 'mrr', 'hitRate', 'stub', 'baseline'],
        hood: {
          title: 'Under the hood: recall, reciprocal rank and hit',
          code: String.raw`export function rankOfFirstMatch(retrieved: string[], gold: string[]): number | null {
  const goldSet = new Set(gold);
  for (let i = 0; i < retrieved.length; i++) {
    if (goldSet.has(retrieved[i])) return i + 1;
  }
  return null;
}

export function recallAtK(retrieved: string[], gold: string[], k: number): number {
  const rank = rankOfFirstMatch(retrieved.slice(0, k), gold);
  return rank === null ? 0 : 1;
}

export function reciprocalRank(retrieved: string[], gold: string[]): number {
  const rank = rankOfFirstMatch(retrieved, gold);
  return rank === null ? 0 : 1 / rank;
}

export function hitAtDepth(retrieved: string[], gold: string[], depth = HIT_DEPTH): boolean {
  return rankOfFirstMatch(retrieved.slice(0, depth), gold) !== null;
}`,
          printed: `{"recall_at_3":1,"recall_at_6":1,"recall_at_10":1,"reciprocal_rank":0.3333333333333333,"hit":true,"rank_of_first_match":3}
{"recall_at_3":0,"recall_at_6":0,"recall_at_10":0,"reciprocal_rank":0,"hit":false,"rank_of_first_match":null}`,
        },
      },
    ],
  },
  {
    id: 'ingest',
    label: 'Ingestion',
    status: 'In progress',
    what: 'Files that have been identified by content, de-duplicated and scrubbed of personal details, ready to be cut into chunks and stored.',
    steps: [
      {
        n: '2.1',
        title: 'Format detection: read the bytes, not the name',
        status: 'done',
        done: '2026-10-09',
        needs: 'nobody',
        plain:
          'The detector looks at what a file actually contains. A fixed signature at the start of the file (its magic bytes) identifies binary types such as PDF or ZIP. For text, simple checks tell Markdown, C, CSV and JSON apart, and a separate check reads the encoding, UTF-8 or Latin-1. The file extension only feeds a mismatch warning.',
        why: 'A PDF saved as .txt would be read as text and fill the index with junk. A Latin-1 file read as UTF-8 turns accented letters into broken characters, and nothing fails loudly.',
        code: {
          caption: 'The magic-byte table: the first bytes that give a file away as binary, with its name for each.',
          from: 'measured',
          source: 'pnpm wrap:detect-formats, 2026-10-09',
          path: 'apps/ai/wrap/src/ingest/format-detector.ts',
          lang: 'typescript',
          code: String.raw`const MAGIC: Array<{ bytes: number[]; name: string }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], name: "PDF (%PDF)" },
  { bytes: [0x1f, 0x8b], name: "gzip archive" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], name: "ZIP archive (or docx/xlsx/pptx/jar)" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], name: "PNG image" },
  { bytes: [0xff, 0xd8, 0xff], name: "JPEG image" },
  { bytes: [0x47, 0x49, 0x46, 0x38], name: "GIF image" },
  { bytes: [0x49, 0x49, 0x2a, 0x00], name: "TIFF image (little-endian)" },
  { bytes: [0x4d, 0x4d, 0x00, 0x2a], name: "TIFF image (big-endian)" },
  { bytes: [0x4d, 0x5a], name: "Windows executable (MZ header)" },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], name: "ELF executable" },
];`,
          printed: `Total files: 1111 (unknown: 1, errors: 0)
Formats: MARKDOWN=670, C_SOURCE=147, CSV=123, TEXT=88, C_HEADER=73, JSON=9, UNKNOWN=1
Encodings: UTF8=1109, UNKNOWN=1, LATIN1=1
Extension mismatches: 6
  eps-core/docs/module-filter_iir_2_misnamed.txt: .txt → MARKDOWN
  pmo/quotes/QUO-0049_misnamed.json: .json → MARKDOWN
  ...(4 more)`,
        },
        learned:
          'The first version called a git log Markdown because one "#" line looked like a heading. Markdown now needs two signals, and a lone heading in a log falls back to TEXT. Caveats: three pure-ASCII cp1252 files look like UTF-8 by their bytes, and no byte-order marks, UTF-16 or binary files are in the corpus, so those paths are only covered by the 17 selftest checks.',
        terms: ['magicBytes', 'encoding', 'bom'],
        hood: {
          title: 'Under the hood: magic bytes and the Markdown rule',
          code: String.raw`function matchMagic(buf: Buffer): string | null {
  for (const { bytes, name } of MAGIC) {
    if (buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b)) {
      return name;
    }
  }
  return null;
}

function detectMarkdown(text: string, lines: string[]): Candidate | null {
  const headings = lines.filter((l) => /^#{1,6}[ \t]+\S/.test(l)).length;
  const fences = lines.filter((l) => /^\s*${'`'}${'`'}${'`'}/.test(l)).length;
  const links = countMatches(text, /\[[^\]\n]+\]\([^)\s]+\)/g);
  const bullets = lines.filter((l) => /^\s*[-*][ \t]+\S/.test(l)).length;
  const bold = countMatches(text, /\*\*[^*\n]+\*\*/g);
  const signals = [headings > 0, fences >= 2, links > 0, bullets >= 2, bold > 0].filter(Boolean).length;`,
          printed: `pdf.txt -> BINARY UNKNOWN conf=1 | magic bytes say PDF (%PDF); not a text format
log.txt -> TEXT UTF8 conf=0.6 | plain text: no JSON, C, CSV or Markdown signal
notes.txt -> MARKDOWN UTF8 conf=0.85 | Markdown structure: 2 heading(s), ...; extension .txt but content is MARKDOWN
latin.txt -> TEXT LATIN1 conf=0.6 | plain text: no JSON, C, CSV or Markdown signal`,
        },
      },
      {
        n: '2.2',
        title: 'Dedup: exact SHA-256 matches, then MinHash near-copies',
        status: 'done',
        done: '2026-10-09',
        needs: 'nobody',
        plain:
          'First the exact check: a SHA-256 fingerprint of each file’s raw bytes, so identical files match. Then near-duplicates: each text is cut into 5-word shingles (overlapping runs of words), and MinHash compresses each set of shingles into 128 numbers. The share of matching numbers estimates how much two texts overlap (their Jaccard similarity). Pairs at 0.75 or more are flagged. Everything is written by hand, using only Node’s crypto for SHA-256.',
        why: 'Without dedup, the same paragraph is stored and retrieved several times, and the top results fill up with copies of one document instead of different answers.',
        code: {
          caption: 'Making shingles: lowercase the words, then slide a window of five words along the text.',
          from: 'measured',
          source: 'pnpm wrap:dedup-check, 2026-10-09',
          path: 'apps/ai/wrap/src/ingest/dedup.ts',
          lang: 'typescript',
          code: String.raw`export function computeShingles(text: string, shingle_size: number = DEFAULT_SHINGLE_SIZE): Set<string> {
  // (argument check left out)
  const words = normalizedWords(text);
  const out = new Set<string>();
  if (words.length === 0) return out;
  if (words.length < shingle_size) {
    out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i + shingle_size <= words.length; i++) {
    out.add(words.slice(i, i + shingle_size).join(" "));
  }
  return out;
}`,
          printed: `Total files: 1111 (skipped shingling: 1, errors: 0)
Exact groups: 13 (removed: 18)
Near-dup pairs >= 0.75: 15 (>= 0.9: 5, >= 0.8: 12)
Files after dedup: 1093`,
        },
        learned:
          'The plan’s 0.95 threshold caught 1 of the 10 planted near-copies. With 5-word shingles at 0.75, 8 of 10 are caught and no unrelated pair is flagged. The two misses score 0.570 and 0.648. Catching them needs a threshold near 0.65, which lets in unrelated pairs (4 at 0.6), and no threshold separates all ten from the rest.',
        terms: ['sha256', 'shingle', 'jaccard', 'minhash', 'nearDuplicate'],
        hood: {
          title: 'Under the hood: MinHash and the Jaccard estimate',
          code: String.raw`export function computeMinHash(shingles: Set<string>, num_hashes: number = DEFAULT_NUM_HASHES): number[] {
  const mins = new Array<number>(num_hashes).fill(EMPTY_SLOT);
  for (const s of shingles) {
    for (let i = 0; i < num_hashes; i++) {
      const v = generateHash(BASE_SEED + i, s);
      if (v < mins[i]) mins[i] = v;
    }
  }
  return mins;
}

/** Estimated Jaccard similarity: fraction of MinHash slots that agree. Returns 0..1. */
export function jaccardSimilarity(minHash1: number[], minHash2: number[]): number {
  // (length check left out)
  let equal = 0;
  for (let i = 0; i < minHash1.length; i++) {
    if (minHash1[i] === minHash2[i]) equal++;
  }
  return equal / minHash1.length;
}`,
          printed: `shingles A=36 B=36
minhash estimate=0.5859 exact=0.5652
first 3 slots A: 127266987, 46195401, 9406172`,
        },
      },
      {
        n: '2.3',
        title: 'PII scrubbing: tokens in, the map kept apart',
        status: 'done',
        done: '2026-10-09',
        needs: 'nobody',
        plain:
          'Personal details are swapped for numbered tokens: EMAIL_0001, HANDLE_0001, PHONE_0001, PERSON_0001. The same value always gets the same token. Four passes run in order (emails, email usernames, phone numbers, then names), so a later pass never matches a token from an earlier one. The map from each token back to its value goes into a separate file, readable only by its owner.',
        why: 'Without it, real names and phone numbers flow into the index and into every answer that quotes a file, and nothing takes them back out later.',
        code: {
          caption: 'The two patterns that find emails and phone numbers. Each one must stand alone, so a version number or an ID is not mistaken for a phone number.',
          from: 'measured',
          source: 'pnpm wrap:scrub-pii (counts only), 2026-10-09',
          path: 'apps/ai/wrap/src/ingest/pii-scrubber.ts',
          lang: 'typescript',
          code: String.raw`export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export const PHONE_RE =
  /(?<![\w.+\/-])(?:\(\d{3}\) ?(?:\d{3}[-. ]\d{4}|\d{4})|\d{3}[-.]\d{3}[-.]\d{4}|\d{3}[-.]\d{4}|\+\d{1,3}[-. ]\d{1,4}(?:[-. ]\d{2,6}){1,3})(?![\w-])/g;`,
          printed: `Files scanned: 1111 (changed: 149, copied unchanged BINARY/UNKNOWN: 1, errors: 0)
Per type (found / unique values / tokens):
  EMAIL     779 /    14 / 14
  HANDLE    937 /    12 / 12
  PHONE      15 /     2 / 2
  PERSON     15 /     2 / 2
PII map: data/pii-map.json (chmod 600, 30 entries)`,
        },
        learned:
          'Two findings. The first version missed email usernames that appear without an @, such as git-log author names, and left them in 39 files; they are now redacted as HANDLE tokens (149 files changed in all). The plan’s allowlist listed the planted names, which would have exempted them, so names are never allowlisted. The allowlist holds phrases and words instead, which cut the PERSON false positives from 52 unique values to 2. Caveat: a word on the allowlist hides every name that contains it.',
        terms: ['pii', 'redaction', 'placeholderToken', 'allowlist'],
        hood: {
          title: 'Under the hood: the scrub pass order',
          code: String.raw`export function scrubPII(
  text: string,
  mode: ScrubMode,
  map: PiiMap,
  allowlist: PiiAllowlist,
): { text: string; redactions: Redaction[] } {
  // (working offsets set up here)
  const redactions: Redaction[] = [];

  state = applySpans(state, regexSpans(state.text, EMAIL_RE, "EMAIL"), mode, map, redactions);

  // Known emails: those redacted in this call plus every email already in the shared map.
  const emails = [
    ...redactions.filter((r) => r.type === "EMAIL").map((r) => r.original),
    ...map.entries().filter((e) => e.type === "EMAIL").map((e) => e.original),
  ];
  state = applySpans(state, handleSpans(state.text, emails), mode, map, redactions);

  state = applySpans(state, regexSpans(state.text, PHONE_RE, "PHONE"), mode, map, redactions);
  state = applySpans(state, nameSpans(state.text, allowlist), mode, map, redactions);

  return { text: state.text, redactions };
}`,
          printed: `Reviewed by PERSON_0001 (EMAIL_0001), call PHONE_0001 or PHONE_0002. PERSON_0001 signed off. Build Programme Office notes.
Author: HANDLE_0001 (git log)
EMAIL_0001 EMAIL | HANDLE_0001 HANDLE | PHONE_0001 PHONE | PHONE_0002 PHONE | PERSON_0001 PERSON`,
        },
      },
      {
        n: '2.4',
        title: 'Type-aware chunking',
        status: 'next',
        needs: 'Step 2.3 (done)',
        plain:
          'Cut each document into pieces that can be searched on their own. Cut them where the document already has natural breaks: Markdown at its headings, C code at each function, a CSV one row at a time, and plain text in overlapping windows.',
        why: 'A piece cut from the middle of a sentence or a function loses the words that say what it is, so no question that names it will find it.',
        terms: ['chunk'],
      },
      planned('2.5', 'Metadata extraction', 'Read the subsystem, ticket IDs, dates and requirement IDs from each file’s path and text, and attach them to every chunk.'),
      planned('2.6', 'Embed and store in pgvector', 'Turn each chunk into an embedding and store it, with a content hash so a rerun skips what is already there, and an HNSW index for fast search.'),
    ],
  },
  {
    id: 'rag',
    label: 'RAG ladder',
    status: 'Not started',
    what: 'Retrieval built one rung at a time: plain vector search first, then the techniques that make it more precise, each measured against the golden questions.',
    waits: ['Phase 2 must finish first: retrieval needs the chunks and the embeddings.'],
    steps: [
      planned('3.1', 'Naive vector RAG: embed and stuff', 'Embed the question, take the nearest chunks from pgvector, and hand them to the model. This is the baseline every later rung is measured against.'),
      planned('3.2', 'Metadata filtering', 'Let the model choose filters such as subsystem or document type, and apply them before the vector search.'),
      planned('3.3', 'BM25 from scratch', 'Keyword search written by hand, which finds exact symbols and IDs that embeddings often miss.'),
      planned('3.4', 'Hybrid retrieval', 'Combine the keyword and vector rankings with Reciprocal Rank Fusion, written by hand.'),
      planned('3.5', 'Reranking', 'Ask a model to re-order the top 100 candidates and keep the best few.'),
      planned('3.6', 'Multi-query', 'Generate a few rewrites of the question, retrieve for each, and fuse the results.'),
      planned('3.7', 'HyDE', 'Ask the model to write an imagined answer, then search with that text in place of the question.'),
      planned('3.8', 'Parent–child retrieval', 'Search small chunks for precision, but return the larger section they came from.'),
      planned('3.9', 'Contextual compression', 'Trim each retrieved chunk to the sentences that matter, with a short header saying where it came from.'),
      planned('3.10', 'Corrective RAG', 'Grade each retrieved chunk for relevance, and search again when the grades are poor.'),
      planned('3.11', 'Text-to-SQL', 'For the structured CSV data, have the model write SQL and answer from the rows it returns.'),
      planned('3.12', 'Graph RAG lite', 'Extract entities and links, then follow one or two hops from the matched entities.'),
    ],
  },
  {
    id: 'api',
    label: 'Customer’s API',
    status: 'Not started',
    what: 'A small legacy-style API with paging, rate limits and occasional failures, plus a typed client that is checked against its contract.',
    steps: [
      planned('4.1', 'Scaffold the API with NestJS modules', 'Build the API skeleton, its Postgres schema and a deterministic seed of records.'),
      planned('4.2', 'Make it behave like a legacy API', 'Add pagination, rate limits, flaky responses and inconsistent data, the way an old system really behaves.'),
      planned('4.3', 'Typed client and contract test', 'Write a typed client for the API in the agent code, and a test that fails when the two drift apart.'),
    ],
  },
  {
    id: 'agents',
    label: 'Tools and agents',
    status: 'Not started',
    what: 'A tool-calling loop written by hand, a catalogue of tools it can call, and guardrails that stop it from answering badly or doing harm.',
    steps: [
      planned('5.1', 'Tool-calling loop by hand', 'Write the loop that sends the model a question, runs any tool it asks for, and sends the result back.'),
      planned('5.2', 'Tool catalogue', 'Register the search, lookup and write tools, each with a schema the model must follow.'),
      planned('5.3', 'Agentic RAG router', 'Let the agent pick which retrieval rung suits the question type.'),
      planned('5.4', 'Guardrails', 'Require confirmation before a write, check every answer for citations, detect injected instructions, and add red-team cases to the evals.'),
    ],
  },
  {
    id: 'mcp',
    label: 'MCP',
    status: 'Not started',
    what: 'The tools and documents exposed through the Model Context Protocol, over stdio and over HTTP, with a client of our own on the other side.',
    steps: [
      planned('6.1', 'Stdio MCP server', 'Expose the tools through a server that talks over standard input and output.'),
      planned('6.2', 'MCP resources and prompts', 'Add documents as resources and reusable prompts that a client can list and fetch.'),
      planned('6.3', 'HTTP transport and service-token auth', 'Move the server to HTTP and protect it with a service token.'),
      planned('6.4', 'Custom MCP client', 'Write our own client in the agent app, so the server is checked from the other side too.'),
    ],
  },
  {
    id: 'polish',
    label: 'Product polish',
    status: 'Not started',
    what: 'A streaming chat screen with citations, traces of every call, cost controls and a dashboard that compares the retrieval rungs.',
    steps: [
      planned('7.1', 'Streaming chat UI with citations', 'A chat screen that streams the answer and links each claim to its source.'),
      planned('7.2', 'Tracing and observability', 'Record each call, its tokens and its time, so a slow or costly answer can be traced.'),
      planned('7.3', 'Cost analysis and caching', 'Measure what each question costs and cache the answers that repeat.'),
      planned('7.4', 'RAG comparison dashboard', 'Show the eval scores of every retrieval rung side by side.'),
    ],
  },
  {
    id: 'optional',
    label: 'Optional: cloud',
    status: 'Not started',
    what: 'Optional extras: the same evals run on two cloud providers, a comparison with a shared library, and a written case study.',
    steps: [
      planned('8.1', 'Multi-provider eval', 'Run the same evals on two cloud model providers and compare the results and the cost.'),
      planned('8.2', 'Compare with @fde/grounding', 'Measure this build against the shared grounding library on the same questions.'),
      planned('8.3', 'Interview case study', 'Write up the build, its measurements and its mistakes as a case study.'),
    ],
  },
];
