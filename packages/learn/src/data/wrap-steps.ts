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
import type { TermKey } from './wrap-glossary';

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
  /** Part 5 — words to know, each a key of GLOSSARY in data/wrap-glossary.ts. */
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
        status: 'done',
        done: '2026-10-09',
        needs: 'Step 2.3 (done)',
        plain:
          'Cut each document into pieces that can be searched on their own. Cut them where the document already has natural breaks: Markdown at its headings, C code at each function, a CSV one row at a time, and plain text in overlapping windows.',
        why: 'A piece cut from the middle of a sentence or a function loses the words that say what it is, so no question that names it will find it.',
        code: {
          caption: 'The router. The file’s format picks the splitter, and binary or unknown files give no chunks at all.',
          from: 'measured',
          source: 'pnpm wrap:chunk, 2026-10-09',
          path: 'apps/ai/wrap/src/chunking/index.ts',
          lang: 'typescript',
          code: String.raw`export function chunkFile(sourceFile: string, text: string, format: Format): Chunk[] {
  switch (format) {
    case Format.MARKDOWN:
      return chunkMarkdown(text, sourceFile);
    case Format.C_SOURCE:
    case Format.C_HEADER:
      return chunkC(text, sourceFile);
    case Format.CSV:
      return chunkCsv(text, sourceFile);
    case Format.JSON:
    case Format.TEXT:
      return chunkText(text, sourceFile);
    case Format.BINARY:
    case Format.UNKNOWN:
      return [];
  }
}`,
          printed: `Files in data/scrubbed: 1111
  chunked: 1092
  skipped, removed exact duplicate: 18
  skipped, BINARY/UNKNOWN: 1
Total chunks: 20097 -> data/chunks.jsonl
Chunks per type:
  csv_row 12763, markdown_section 6097
  code_function 807, code_struct 220
  text_paragraph 210
Tokens per chunk: min 6, median 28, p95 129, max 498
Chunks over MAX_TOKENS_PER_CHUNK (500): 0`,
        },
        learned:
          'Chunks are small: the median is 28 tokens, because requirement documents are many short sections. CSV rows are 64% of all chunks (12,763 of 20,097), and they may crowd search results. Phase 3 evals will judge that; grouping rows is the usual fix. Token count is estimated as characters divided by 4, not counted with a tokenizer. No C function exceeded 500 tokens, so the sub-split for oversize functions is covered only by the selftest. The 20,097 above is from before the 2.5 fix. After it (manifest.json skipped, identical chunks kept once), the total is 15,795. huge-repeated.txt went from 4,167 chunks to 1, and CSV rows are now 12,760 of 15,795 (81%).',
        terms: ['chunk', 'token', 'chunkSize', 'slidingWindow', 'overlap', 'metadata'],
        hood: {
          title: 'Under the hood: the brace-depth scan',
          code: String.raw`  let i = 0;
  while (i < n) {
    const d = directives[di];
    if (d && i === d.start) {
      // A declaration cut short by a directive ends here; the directive is its own unit.
      if (codeStart >= 0) close("decl", i);
      units.push({ kind: "decl", start: unitStart, end: d.end, codeStart: d.start, brace: -1 });
      di++;
      reset(d.end);
      i = d.end;
      continue;
    }
    const c = masked[i];
    if (isSpace(c)) {
      i++;
      continue;
    }
    if (codeStart < 0) codeStart = i;
    if (c === "{") {
      if (depth === 0 && brace < 0) {
        brace = i;
        braceIsFunc = lastCode >= 0 && masked[lastCode] === ")";
      }
      depth++;
    } else if (c === "}") {
      if (depth > 0) depth--;
      if (depth === 0) {
        if (brace >= 0 && braceIsFunc) close("func", i + 1);
        else if (!continuesDeclaration(masked, i + 1, directives, di)) close("decl", i + 1);
      }
    } else if (c === ";" && depth === 0) {
      close("decl", i + 1);
    }
    lastCode = i;
    i++;
  }`,
          printed: `{"type":"code_function","source_file":"eps-calibration-tools/src/a2l_export.c","tokens":56,"start_line":19,"end_line":28,"metadata":{"function":"A2l_Load","kind":"function"}}
Std_ReturnType A2l_Load(const A2lExportIn_t *in, A2lExportOut_t *out)
{`,
        },
      },
      {
        n: '2.5',
        title: 'Metadata extraction',
        status: 'done',
        done: '2026-10-09',
        needs: 'Step 2.4 (done)',
        plain:
          'Read the subsystem from each file’s folder, and the requirement IDs, ticket IDs, dates and keywords from its text. Attach them to every chunk, so search can filter by them.',
        why: 'Without these tags, a question that names a subsystem or a requirement has to match the chunk’s own words, and chunks that never repeat those words are missed.',
        code: {
          caption: 'The two ID patterns. Each one stops at a letter, digit or dash on either side, so a longer code that contains it is not matched.',
          from: 'measured',
          source: 'grep over data/scrubbed, 2026-10-09',
          path: 'apps/ai/wrap/src/ingest/metadata-extractor.ts',
          lang: 'typescript',
          code: String.raw`/** CR-TDR-32-0537, SR-EPS-0407, CR-HLX-H1-0001. Not PRG-/CRS-/EL-/SWC- (those are other IDs). */
const REQUIREMENT_ID = /(?<![-A-Za-z0-9])(?:CR|SR)-(?:[A-Z][A-Z0-9]{1,3}-)?(?:H\d-|\d{2}-)?\d{4}(?![-A-Za-z0-9])/g;

/** VST-4471 (Jira), CHR-2021-0177 (change request). Lookarounds stop matches inside EFF-BULK-0225 etc. */
const TICKET_ID = /(?<![-A-Za-z0-9])(?:VST-\d{4,6}|CHR-\d{4}-\d{4})(?![-A-Za-z0-9])/g;`,
          printed: `Chunks with >=1 requirement id: 2465 (15.6%)
Chunks with >=1 ticket id:      4064 (25.7%)
Chunks with >=1 date:           11773 (74.5%)
Top requirement id: CR-KAI-25-0426 (18 chunks)`,
        },
        learned:
          'The plan’s ID guesses were wrong, so the patterns were measured from the corpus. Requirements are CR- and SR- rows, such as CR-TDR-32-0537 and SR-EPS-0407. PRG- is a programme code and CRS- names a requirements document, so neither is tagged. Tickets are VST-NNNN (Jira exports) and CHR-YYYY-NNNN (change requests). The plan’s generic ticket pattern would have grabbed BULK-0225 out of EFF-BULK-0225. On the first run, 12.4% of chunks had a requirement ID, 20.2% a ticket ID and 58.6% a date. The fix found two problems: make-mess’s manifest.json, an answer key for the planted flaws, was being indexed, and huge-repeated.txt produced 4,167 near-identical chunks. After the fix the figures are the ones in the printed block, on 15,795 chunks.',
        terms: ['regex', 'requirementId', 'ticketId', 'isoDate', 'keyword', 'stopword', 'filter', 'metadata'],
        hood: {
          title: 'Under the hood: keywords, then one metadata merge per chunk',
          code: String.raw`export function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  const cleaned = text.replace(PLACEHOLDER, " ");
  for (const raw of cleaned.match(WORD) ?? []) {
    const word = raw.toLowerCase();
    if (word.length < KEYWORD_MIN_LENGTH || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= KEYWORD_MIN_COUNT)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, KEYWORD_TOP_N)
    .map(([word]) => word);
}

/** Path-based and content-based metadata for one chunk. Empty arrays are returned, not omitted. */
export function extractMetadata(chunk: Chunk): ChunkMetadata {
  const meta: ChunkMetadata = {};
  const subsystem = subsystemOf(chunk.source_file);
  if (subsystem !== undefined) meta.subsystem = subsystem;
  meta.type_category = typeCategory(chunk.source_file);
  meta.requirement_ids = sortedUnique(matches(REQUIREMENT_ID, chunk.content));
  meta.ticket_ids = sortedUnique(matches(TICKET_ID, chunk.content));
  meta.dates = extractDates(chunk.content);
  meta.keywords = extractKeywords(chunk.content);
  return meta;
}

/** Returns a copy of the chunk with extracted metadata merged into metadata (existing keys kept). */
export function enrichChunk(chunk: Chunk): Chunk {
  return { ...chunk, metadata: { ...chunk.metadata, ...extractMetadata(chunk) } };
}`,
          printed: `{"subsystem":"requirements","type_category":"requirements","requirement_ids":["CR-KAI-25-0420","CR-KAI-25-0421","CR-KAI-25-0422","CR-KAI-25-0423","CR-KAI-25-0424","CR-KAI-25-0425","CR-KAI-25-0426","CR-KAI-25-0427","CR-KAI-25-0428","CR-KAI-25-0429","CR-KAI-25-0430","CR-KAI-25-0431","CR-KAI-25-0432","CR-KAI-25-0433","CR-KAI-25-0434","CR-KAI-25-0435","CR-KAI-25-0436","CR-KAI-25-0437"],"dates":["2020-10-31","2023-12-24","2024-11-23"]}`,
        },
      },
      {
        n: '2.6',
        title: 'Embed and store in pgvector',
        status: 'next',
        needs: 'Step 2.5 (done)',
        plain:
          'Turn each chunk into an embedding and store it, with a content hash so a rerun skips what is already there, and an HNSW index for fast search.',
        why: 'Without a stored vector, search has nothing to compare a question against. Without a content hash, every rerun would embed and store all 15,795 chunks again, whether or not they changed.',
      },
    ],
  },
  {
    id: 'rag',
    label: 'RAG ladder',
    status: 'Not started',
    what: 'Retrieval built one rung at a time: plain vector search first, then the techniques that make it more precise, each measured against the golden questions.',
    waits: ['Phase 2 must finish first: retrieval needs the chunks and the embeddings.'],
    steps: [
      {
        n: '3.1',
        title: 'Naive vector RAG: embed and stuff',
        status: 'planned',
        needs: 'Step 2.6 (embeddings stored in pgvector)',
        plain:
          'Embed the question with the same model that embedded the chunks, then ask Postgres for the chunks whose embeddings are nearest by cosine distance. The top few go into the prompt with their file names, so the model can answer from them and say where each part came from. This is the baseline that every later rung is measured against. The Vectors and Retrieval lessons on the path explain the mechanism.',
        why: 'Without a working retriever, the model answers from memory and cannot point at a source. Without a fixed baseline, a later technique could look better only because the test changed.',
        code: {
          caption: 'Sketch, not run: the naive vector retriever. It embeds the question, then asks pgvector for the nearest stored chunks.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/naive-vector.ts',
          lang: 'typescript',
          code: String.raw`import OpenAI from 'openai';
import type { Pool } from 'pg';
import { readEmbeddingConfig } from '../ingest/embedder';

export function createNaiveVectorRetriever(pool: Pool) {
  const cfg = readEmbeddingConfig();
  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });

  return {
    name: 'naive-vector',
    async retrieve(query: string, k: number) {
      const res = await client.embeddings.create({ model: cfg.model, input: query, dimensions: cfg.dimensions });
      const vector = '[' + res.data[0].embedding.join(',') + ']';
      // pgvector's <=> is cosine distance (0 means identical), so similarity is 1 minus it.
      const { rows } = await pool.query(
        [
          'SELECT c.id, c.source_file, c.heading_path, c.content,',
          '       1 - (e.embedding <=> $1::vector) AS similarity',
          '  FROM embeddings e JOIN chunks c ON c.id = e.chunk_id',
          ' WHERE e.model = $2',
          ' ORDER BY e.embedding <=> $1::vector',
          ' LIMIT $3',
        ].join('\n'),
        [vector, cfg.model, k],
      );
      return rows;
    },
  };
}`,
        },
        learned:
          'This step will record recall@3, recall@6, recall@10 and MRR on the golden questions, plus the hit rate and the latency. These numbers are the reference line for steps 3.2 to 3.12.',
        terms: ['embedding', 'vector', 'cosineSimilarity', 'pgvector'],
      },
      {
        n: '3.2',
        title: 'Metadata filtering',
        status: 'planned',
        needs: 'Step 3.1 (the baseline) and Step 2.5 (metadata on each chunk)',
        plain:
          'Ask the model to read the question and pull out any filters it names, such as a subsystem, a file type or a ticket ID. The filters narrow the chunks before the vector search ranks them, so chunks from an unrelated subsystem cannot crowd out the right answer. If the model names nothing, every filter stays empty and the search runs on everything.',
        why: 'Without filters, a question about one subsystem can be answered from a similar passage in another subsystem, and the search has no way to tell them apart.',
        code: {
          caption: 'Sketch, not run: the model proposes filters as JSON, and one SQL query applies them before the vector ranking.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/metadata-filter.ts',
          lang: 'typescript',
          code: String.raw`import { z } from 'zod';

// The filters the model may name. A field the question does not mention is null.
export const FiltersSchema = z.object({
  subsystem: z.string().nullable(),
  type: z.string().nullable(),
  ticket_id: z.string().nullable(),
});
export type Filters = z.infer<typeof FiltersSchema>;

export async function extractFilters(question: string, ask: (prompt: string) => Promise<string>): Promise<Filters> {
  const reply = await ask('Return JSON with keys subsystem, type and ticket_id. Use null for any key the question does not name.\nQuestion: ' + question);
  // JSON.parse throws on a reply that is not JSON. The caller catches it and logs it.
  const parsed = FiltersSchema.safeParse(JSON.parse(reply));
  return parsed.success ? parsed.data : { subsystem: null, type: null, ticket_id: null };
}

// A null parameter skips its filter, so one query serves every question.
export const FILTERED_SQL = [
  'SELECT c.id, c.source_file, c.heading_path, c.content,',
  '       1 - (e.embedding <=> $1::vector) AS similarity',
  '  FROM embeddings e JOIN chunks c ON c.id = e.chunk_id',
  ' WHERE e.model = $2',
  "   AND ($3::text IS NULL OR c.metadata->>'subsystem' = $3)",
  '   AND ($4::text IS NULL OR c.type = $4)',
  "   AND ($5::text IS NULL OR c.metadata->'ticket_ids' @> to_jsonb($5::text))",
  ' ORDER BY e.embedding <=> $1::vector',
  ' LIMIT $6',
].join('\n');`,
        },
        learned:
          'This step will compare recall@k and latency with Step 3.1 on the same golden questions, and count how often the model proposes a filter that drops a right file. A wrong filter lowers recall, and that is the failure this step is checking for.',
        terms: ['metadata', 'filter', 'ticketId'],
      },
      {
        n: '3.3',
        title: 'BM25 from scratch',
        status: 'planned',
        needs: 'Phase 2 (the chunk text in Postgres)',
        plain:
          'BM25 is a keyword score. It counts how often each query word appears in a chunk, and gives more weight to words that are rare across all the chunks, so a ticket ID or a function name stands out. It is written by hand here, with no search engine behind it. Embeddings often miss exact IDs like these, so this rung exists to catch them.',
        why: 'Without keyword matching, a search for an exact ticket ID or function name depends on the embedding noticing a code-like string, and embeddings often do not do that well.',
        code: {
          caption: 'Sketch, not run: BM25 scoring for one query, with the index built once from the chunk text.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/bm25.ts',
          lang: 'typescript',
          code: String.raw`// bm25.ts: keyword scores written by hand.
const K1 = 1.5;
const B = 0.75;
const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'is']);

// Underscores and hyphens stay inside a word, so VST-4471 and gpio_init each stay whole.
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_-]+/g) ?? []).filter(t => !STOPWORDS.has(t));
}

export function buildIndex(rows: Array<{ id: string; content: string }>) {
  const words = new Map<string, string[]>();
  const df = new Map<string, number>();
  for (const row of rows) {
    const w = tokenize(row.content);
    words.set(row.id, w);
    for (const term of new Set(w)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const avgLen = [...words.values()].reduce((sum, w) => sum + w.length, 0) / rows.length;
  return { words, df, n: rows.length, avgLen };
}

export function bm25Score(index: ReturnType<typeof buildIndex>, query: string, id: string): number {
  const doc = index.words.get(id) ?? [];
  let total = 0;
  for (const term of new Set(tokenize(query))) {
    const df = index.df.get(term) ?? 0;
    if (df === 0) continue;
    const tf = doc.filter(w => w === term).length;
    const idf = Math.log((index.n - df + 0.5) / (df + 0.5));
    total += idf * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * doc.length / index.avgLen));
  }
  return total;
}`,
        },
        learned:
          'This step will record recall@k on the golden questions that name an exact ID or symbol, and the latency of a query, which makes no embedding call. It will also show the drop on questions that do not name one, which is expected.',
        terms: ['keyword', 'stopword', 'recallAtK'],
      },
      {
        n: '3.4',
        title: 'Hybrid retrieval',
        status: 'planned',
        needs: 'Steps 3.1 and 3.3 (both rankings)',
        plain:
          'Run the keyword search and the vector search, then merge the two ranked lists by rank rather than by score. A chunk near the top of either list rises in the merge, so keyword scores and cosine scores never have to be put on the same scale. The Hybrid lesson on the path explains why two searches beat one.',
        why: 'Each search on its own misses something. Keyword search misses paraphrases, vector search misses exact IDs, and their scores sit on different scales, so adding them together means little.',
        code: {
          caption: 'Sketch, not run: Reciprocal Rank Fusion over the keyword and vector rankings, written by hand.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/hybrid-rrf.ts',
          lang: 'typescript',
          code: String.raw`// hybrid-rrf.ts: merge ranked lists by rank, not by score.
const RRF_K = 60;

export interface Retriever {
  retrieve(query: string, k: number): Promise<Array<{ id: string }>>;
}

// Each list holds chunk ids, best first. A chunk scores 1 / (RRF_K + rank) in every list it appears in.
export function fuseRrf(lists: string[][], topK: number): string[] {
  const score = new Map<string, number>();
  const bestRank = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => {
      const rank = i + 1;
      score.set(id, (score.get(id) ?? 0) + 1 / (RRF_K + rank));
      bestRank.set(id, Math.min(bestRank.get(id) ?? Infinity, rank));
    });
  }
  // Equal scores go to the chunk that ranked higher in some list.
  return [...score.keys()]
    .sort((a, b) => score.get(b)! - score.get(a)! || bestRank.get(a)! - bestRank.get(b)!)
    .slice(0, topK);
}

export async function hybridRrf(query: string, keyword: Retriever, vector: Retriever, topK = 6) {
  const [kw, vec] = await Promise.all([keyword.retrieve(query, 50), vector.retrieve(query, 50)]);
  return fuseRrf([kw.map(h => h.id), vec.map(h => h.id)], topK);
}`,
        },
        learned:
          'This step will check recall@k against the better of Steps 3.1 and 3.3 on the golden questions, and report the latency as the sum of both searches. Whether the fused list beats both single searches is the question this step is built to answer.',
        terms: ['keyword', 'vector', 'recallAtK'],
      },
      {
        n: '3.5',
        title: 'Reranking',
        status: 'planned',
        needs: 'Step 3.4 (the top 100 candidates)',
        plain:
          'Take the top 100 candidates from the hybrid search, ask a model to score each one for how well it answers the question, and keep the best few. The first search is fast but rough, while the model reads each chunk more closely, at a higher cost per chunk. The Corrective lesson on the path covers a related idea: grading what came back before the model uses it.',
        why: 'Search scores measure word and meaning overlap, not whether a chunk answers the question. A chunk can share the question\'s words and still say nothing useful, so the top of the list can fill with near misses.',
        code: {
          caption: 'Sketch, not run: a model scores candidates in batches of 10, and the best five are kept.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/rerank-lte.ts',
          lang: 'typescript',
          code: String.raw`// rerank-lte.ts: a model scores each candidate, in batches.
const BATCH = 10;

export interface Candidate {
  id: string;
  content: string;
}

// ask is a chat call that returns the model's text. It is not written yet.
export async function judge(query: string, passage: string, ask: (prompt: string) => Promise<string>): Promise<number> {
  const reply = await ask('Question: ' + query + '\nPassage: ' + passage + '\nRate 1 to 5, where 5 means the passage answers the question. Reply with one digit.');
  const n = parseInt(reply, 10);
  // A reply that is not 1 to 5 counts as 1. The step logs how often that happens.
  return n >= 1 && n <= 5 ? n : 1;
}

export async function rerank(query: string, candidates: Candidate[], ask: (prompt: string) => Promise<string>, keep = 5) {
  const scored: Array<Candidate & { score: number }> = [];
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const scores = await Promise.all(batch.map(c => judge(query, c.content, ask)));
    batch.forEach((c, j) => scored.push({ ...c, score: scores[j] }));
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, keep);
}`,
        },
        learned:
          'This step will check MRR and recall@3 against the hybrid run, and count the model calls and the added latency for each question. It will also record how often the model score disagrees with the golden answer key, since the judge can be wrong too.',
        terms: ['mrr', 'golden', 'recallAtK'],
      },
      {
        n: '3.6',
        title: 'Multi-query',
        status: 'planned',
        needs: 'Steps 3.1 and 3.4 (the retriever and the fusion)',
        plain:
          'Ask the model to write a few other ways of asking the question, run the search once for each version, and merge the lists with the same rank fusion as Step 3.4. A chunk that uses different words from the question can still be found through one of the rewrites. The Hybrid lesson on the path covers the fusion step.',
        why: 'One phrasing can miss a chunk that says the same thing in other words, such as calibration against sensor offset. One search per question leaves that chunk out, and the model never sees it.',
        code: {
          caption: 'Sketch, not run: the question and its rewrites are each searched, and the lists are fused by rank.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/multi-query.ts',
          lang: 'typescript',
          code: String.raw`// multi-query.ts: rewrite the question, retrieve for each, fuse.
import { fuseRrf, type Retriever } from './hybrid-rrf';

// ask is a chat call that returns the model's text. It is not written yet.
export async function multiQuery(
  question: string,
  retriever: Retriever,
  ask: (prompt: string) => Promise<string>,
  rewriteCount = 3,
  topK = 6,
): Promise<string[]> {
  const reply = await ask(
    'Write ' + rewriteCount + ' other ways to ask this question, one per line, with no numbering.\n' + question,
  );
  const rewrites = reply.split('\n').map(s => s.trim()).filter(Boolean).slice(0, rewriteCount);
  const queries = [question, ...rewrites];
  const lists = await Promise.all(queries.map(q => retriever.retrieve(q, 20)));
  return fuseRrf(lists.map(list => list.map(h => h.id)), topK);
}`,
        },
        learned:
          'This step will compare recall@6 and MRR with the single-query hybrid run, and count how often a rewrite adds no chunk that the original question did not already find. Each rewrite is one more search, so the latency and the cost per question are recorded as well.',
        terms: ['golden', 'recallAtK', 'mrr'],
      },
      {
        n: '3.7',
        title: 'HyDE',
        status: 'planned',
        needs: 'Step 3.1 (the vector baseline)',
        plain:
          'Ask the model to write a short imagined answer to the question, then search with that answer in place of the question. A short question can sit far from the long passages that answer it, while a plausible answer often sits closer to them. It may help with “explain” questions and hurt when the question names an exact ID.',
        why: 'Without it, the search only sees the question as written. A short question can sit far from the passages that answer it, so the right chunk ranks below weaker matches, and there is no cheap way to test whether that gap is the cause.',
        code: {
          caption: 'Sketch, not run. A HyDE retriever: write a hypothetical answer, embed it, then search the way step 3.1 does. The helper names are proposed.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/hyde.ts',
          lang: 'typescript',
          code: String.raw`import type { Pool } from 'pg';
import { embedText } from '../embed/embed';
import { complete } from '../llm/complete';
import { searchByVector } from './vector-search';

export async function hydeSearch(pool: Pool, query: string, k = 10) {
  // One short call to a cheap model. The answer does not need to be right,
  // only written in the same style as the corpus.
  const hypothetical = await complete({
    tier: 'haiku',
    system: 'You are an expert on this codebase. Answer in 2 to 3 sentences, using specific names.',
    prompt: 'Question: ' + query,
    maxTokens: 120,
  });

  // Embed the imagined answer instead of the question. Everything after this is step 3.1.
  const vector = await embedText(hypothetical);
  const rows = await searchByVector(pool, vector, k);
  return rows.map((row) => ({ ...row, via: 'hyde' as const }));
}`,
        },
        learned:
          'This step will compare HyDE with the plain vector baseline from step 3.1 on recall@k and MRR, split by question type. The plan expects gains on open questions and losses on exact ID lookups, and the eval will show which happens. The split only means something if the golden set has enough “explain” questions.',
        terms: ['embedding', 'vector', 'golden', 'mrr'],
      },
      {
        n: '3.8',
        title: 'Parent–child retrieval',
        status: 'planned',
        needs: 'Step 3.1 (and step 2.6 for the chunks table)',
        plain:
          'Search small chunks, so a match is precise, then hand the model the larger section that the chunk came from. A single line can name the right function but leave out what it does, and the section gives the model enough to answer.',
        why: 'Without it, the model gets a fragment with none of the lines around it. Large chunks are harder to match precisely, because one vector has to cover several topics, so the choice is between precise but thin and full but blurry.',
        code: {
          caption: 'Sketch, not run. The parent is the section named in heading_path, because schema.sql has no parent_id column yet. Helper names are proposed.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/parent-child.ts',
          lang: 'typescript',
          code: String.raw`import type { Pool } from 'pg';
import { searchByVector } from './vector-search';

// Cap the parent so one huge section cannot fill the context window.
const MAX_PARENT_CHARS = 6000;

export async function parentChildSearch(pool: Pool, vector: number[], k = 5) {
  // Step 1: precise search over the small chunks, as in step 3.1.
  const hits = await searchByVector(pool, vector, k);

  // Step 2: for each hit, load the other chunks of the same section.
  const sections = [];
  for (const hit of hits) {
    if (!hit.heading_path) {
      // No section to climb to, so the chunk stands alone.
      sections.push({ hit_id: hit.id, source_file: hit.source_file, text: hit.content });
      continue;
    }
    const { rows } = await pool.query(
      'SELECT content FROM chunks WHERE source_file = $1 AND heading_path = $2 ORDER BY chunk_index',
      [hit.source_file, hit.heading_path],
    );
    const text = rows.map((r) => r.content).join('\n');
    sections.push({ hit_id: hit.id, source_file: hit.source_file, text: text.slice(0, MAX_PARENT_CHARS) });
  }
  return sections;
}`,
        },
        learned:
          'This step will check whether returning the section instead of the chunk changes recall@k and MRR, since the parent carries more unrelated text and may push the right hit down. Faithfulness of the final answer needs a manual read of a sample, because the plan’s metrics do not measure context directly.',
        terms: ['chunk', 'metadata', 'token', 'pgvector'],
      },
      {
        n: '3.9',
        title: 'Contextual compression',
        status: 'planned',
        needs: 'Step 3.4 (hybrid retrieval, planned) for the chunks to compress',
        plain:
          'Ask a model to keep only the sentences in each retrieved chunk that bear on the question, and put a short header on top saying which file and subsystem the text came from. Fewer tokens reach the final model. This ties to the context lesson, which treats the window as a budget that is spent unevenly.',
        why: 'Without it, every retrieved chunk arrives whole, so most of the window goes to lines that do not answer the question. The model has to find the one useful sentence among many, and it may lose track of which file the text came from.',
        code: {
          caption: 'Sketch, not run. Each hit is trimmed by a short model call, and a header keeps its source. Helper names are proposed.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/contextual-compress.ts',
          lang: 'typescript',
          code: String.raw`import { complete } from '../llm/complete';

type Hit = { id: string; source_file: string; subsystem: string | null; content: string };

const COMPRESS_SYSTEM =
  'Copy only the sentences from the text that help answer the question. Do not rephrase or add anything. If none help, reply NONE.';

export async function compressHits(question: string, hits: Hit[]) {
  // One short model call per hit, all in parallel.
  const out = await Promise.all(
    hits.map(async (hit) => {
      const kept = await complete({
        tier: 'haiku',
        system: COMPRESS_SYSTEM,
        prompt: 'Question: ' + question + '\n\nText:\n' + hit.content,
        maxTokens: 300,
      });
      if (kept.trim() === 'NONE') return null;
      // The header is added here. It is not part of the source text.
      const header = '[' + hit.id + ' (' + hit.source_file + ', ' + (hit.subsystem ?? 'no subsystem') + ')]';
      return header + '\n' + kept.trim();
    }),
  );
  return out.filter((text): text is string => text !== null);
}`,
        },
        learned:
          'This step will check recall@k before and after compression, because dropping a chunk that holds the answer is the failure to watch for. It will also count the tokens that reach the final model for each question. A manual read of a sample is needed for faithfulness, since a compressed sentence can drift from its source.',
        terms: ['chunk', 'token', 'metadata', 'corpus'],
      },
      {
        n: '3.10',
        title: 'Corrective RAG',
        status: 'planned',
        needs: 'Step 3.4 (hybrid retrieval, planned)',
        plain:
          'Grade each retrieved chunk as relevant or not before the model sees it, and search again with a changed query when too few pass. If the second try also fails, say so instead of answering. This is the corrective lesson: a passage can rank first and still be the wrong answer.',
        why: 'Without it, the model is handed whatever the search returned, even when nothing matches, and it answers from weak text as if it were sure. Questions about a requirement or ticket that is not in the corpus are where this does the most damage.',
        code: {
          caption: 'Sketch, not run. Grade, rewrite, retry, and refuse when no attempt passes. The hybrid search is step 3.4, and the helper names are proposed.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/corrective-rag.ts',
          lang: 'typescript',
          code: String.raw`import { complete } from '../llm/complete';
import { hybridSearch } from './hybrid-rrf';

const MIN_RELEVANT = 3;
const MAX_ATTEMPTS = 3;

async function grade(question: string, content: string): Promise<'RELEVANT' | 'PARTIAL' | 'IRRELEVANT'> {
  const answer = await complete({
    tier: 'haiku',
    system: 'Answer with one word: RELEVANT, PARTIAL, or IRRELEVANT.',
    prompt: 'Question: ' + question + '\n\nPassage:\n' + content,
    maxTokens: 5,
  });
  const word = answer.trim().toUpperCase();
  if (word === 'RELEVANT' || word === 'PARTIAL') return word;
  return 'IRRELEVANT';
}

export async function correctiveSearch(question: string, k = 5) {
  let query = question;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const hits = await hybridSearch(query, k * 2);
    const graded = await Promise.all(hits.map(async (h) => ({ ...h, grade: await grade(question, h.content) })));
    const good = graded.filter((h) => h.grade === 'RELEVANT');
    if (good.length >= MIN_RELEVANT) return { status: 'ok' as const, hits: good };

    // Too few relevant passages: rewrite the query and try again.
    query = await complete({
      tier: 'haiku',
      system: 'Rewrite the search query to be more specific. Reply with the query only.',
      prompt: query,
      maxTokens: 40,
    });
  }
  // Every attempt failed, so refuse rather than answer from weak text.
  return { status: 'no_data' as const, hits: [] };
}`,
        },
        learned:
          'This step will check how often a good passage is lost to a refusal, because a false refusal costs recall. It will also check faithfulness on questions the corpus cannot answer, which should improve. The grader is a model too, so its calls are checked by hand on a sample.',
        terms: ['chunk', 'golden', 'mrr', 'baseline'],
      },
      {
        n: '3.11',
        title: 'Text-to-SQL',
        status: 'planned',
        needs: 'Step 2.6 and a read-only database role (neither built yet)',
        plain:
          'For questions about the structured CSV exports, such as counts or lists of tickets, have the model write one SQL SELECT and answer from the rows it returns. A search returns passages, not counts, so an exact question needs a query. This path runs only when the question looks like a data question.',
        why: 'Without it, a question such as how many open tickets sit in one subsystem is answered from a few passages that happen to mention tickets. The number is a guess from a sample, and nothing in the answer shows that.',
        code: {
          caption: 'Sketch, not run. One SELECT, checked before it runs, and sent to a read-only role with a timeout. The table name is proposed, since the CSV load is not built.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/text-to-sql.ts',
          lang: 'typescript',
          code: String.raw`import type { Pool } from 'pg';
import { complete } from '../llm/complete';

const SCHEMA =
  'jira_tickets(id text, summary text, priority text, status text, subsystem text, estimate_hours numeric)';

/** Accept one SELECT only. The read-only database role is the real guard. */
function isSingleSelect(sql: string): boolean {
  const body = sql.trim().replace(/;\s*$/, '');
  if (body.includes(';')) return false;
  if (!/^select\s/i.test(body)) return false;
  return !/\b(insert|update|delete|drop|alter|create|grant|truncate)\b/i.test(body);
}

export async function answerFromTable(pool: Pool, question: string) {
  const sql = await complete({
    tier: 'haiku',
    system: 'Write one PostgreSQL SELECT for the question, using only this table: ' + SCHEMA + '. Reply with the SQL only.',
    prompt: question,
    maxTokens: 200,
  });
  if (!isSingleSelect(sql)) return { status: 'refused' as const, rows: [] };

  try {
    const { rows } = await pool.query({ text: sql, query_timeout: 5000 });
    return { status: 'ok' as const, rows };
  } catch {
    return { status: 'sql_error' as const, rows: [] };
  }
}`,
        },
        learned:
          'This step will check exact-answer questions about the ticket data against counts computed directly from the CSV, so the number is checked rather than guessed. It will also count refused and sql_error answers, since those need a fallback. Recall@k does not suit this path, so its numbers are reported apart from the passage variants.',
        terms: ['corpus', 'filter', 'metadata', 'token'],
      },
      {
        n: '3.12',
        title: 'Graph RAG lite',
        status: 'planned',
        needs: 'Step 2.6 (chunks), entity extraction at ingest (not built), and step 3.4 for fusion',
        plain:
          'Pull the names of functions, files and tickets out of the corpus, store the links between them in two small tables, then follow one or two links from the entities a question names. This reaches answers that sit two hops away from the passage that matches. The graph lesson explains why some questions have no single passage that holds the answer.',
        why: 'Without it, a question such as what calls the function that the motor module uses returns passages that name the motor module, and the function it calls may sit in a file the search never ranks. A chain of two links is easy for plain search to miss.',
        code: {
          caption: 'Sketch, not run. Two hops over stored edges, then the chunks that mention the reached entities. The nodes and edges tables are proposed and not in schema.sql yet.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/retrieval/graph-rag.ts',
          lang: 'typescript',
          code: String.raw`import type { Pool } from 'pg';

// Proposed tables, not in schema.sql yet:
// nodes(id text primary key, label text, entity_type text, chunk_id text references chunks(id))
// edges(from_id text, to_id text, edge_type text)

// More than two hops costs a lot, and the signal fades.
const HOPS = 2;

export async function graphExpand(pool: Pool, startLabel: string) {
  // startLabel comes from the question, by matching it against node labels.
  const seed = await pool.query('SELECT id FROM nodes WHERE label = $1', [startLabel]);
  let frontier: string[] = seed.rows.map((r) => r.id);
  const seen = new Set<string>(frontier);

  for (let hop = 0; hop < HOPS && frontier.length > 0; hop++) {
    const { rows } = await pool.query(
      'SELECT to_id AS id FROM edges WHERE from_id = ANY($1) UNION SELECT from_id AS id FROM edges WHERE to_id = ANY($1)',
      [frontier],
    );
    frontier = rows.map((r) => r.id).filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
  }

  // The chunks that mention any reached entity become candidates for fusion in step 3.4.
  const { rows } = await pool.query(
    'SELECT DISTINCT c.id, c.source_file, c.content FROM nodes n JOIN chunks c ON c.id = n.chunk_id WHERE n.id = ANY($1)',
    [[...seen]],
  );
  return rows;
}`,
        },
        learned:
          'This step will check whether two-hop questions reach a passage that plain search misses, measured as recall@k on the multi-hop golden questions. It will also check the cost of the walk, since a hub entity such as a widely used function can pull in many chunks. MRR is reported only for the questions the graph route actually answers.',
        terms: ['chunk', 'golden', 'mrr', 'corpus'],
      },
    ],
  },
  {
    id: 'api',
    label: 'Customer’s API',
    status: 'Not started',
    what: 'A small legacy-style API with paging, rate limits and occasional failures, plus a typed client that is checked against its contract.',
    steps: [
      {
        n: '4.1',
        title: 'Scaffold the API with NestJS modules',
        status: 'planned',
        needs: 'a Postgres database and the WRAP_DB_URL setting in the root .env',
        plain:
          'The customer API is a small NestJS server with its own Postgres database, one module each for orders, shipments, returns and tickets, and SQL migrations that create the tables. A seed script fills them with fake records that come out the same on every run, with a few deliberate traps planted, such as a return that refunds more than its order cost. The seed holds no real credentials, and the lesson on credentials, A missing value must reduce access, never grant it, covers the access rules that come later.',
        why: 'Without a fixed schema and fixed data, every test starts from a different place, and a bug found on one run cannot be found again on the next. Tidy records also hide the cases that agents fail on in real use.',
        code: {
          caption: 'Sketch, not run: a seed script that uses the same seeded generator as the make-mess step, so every run writes the same orders.',
          from: 'proposed',
          path: 'apps/api/wrap/src/db/seed/index.ts',
          lang: 'typescript',
          code: String.raw`import { Pool } from 'pg';

// Commit this value. Lose it and the seeded rows cannot be rebuilt.
const SEED = 42;

// The same generator as apps/ai/wrap/src/cli/make-mess.ts.
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedOrders(pool: Pool, count = 50): Promise<void> {
  const rand = mulberry32(SEED);
  const statuses = ['pending', 'shipped', 'delivered'];
  for (let i = 1; i <= count; i++) {
    const id = '00000000-0000-4000-8000-' + String(i).padStart(12, '0');
    const status = statuses[Math.floor(rand() * statuses.length)];
    const total = Math.round(rand() * 50000) / 100;
    await pool.query(
      'INSERT INTO orders (id, order_number, status, total_amount, created_at) ' +
        "VALUES ($1, $2, $3, $4, TIMESTAMPTZ '2026-01-01' + ($5 || ' days')::interval) " +
        'ON CONFLICT (id) DO NOTHING',
      [id, 'ORD-' + String(i).padStart(5, '0'), status, total, Math.floor(rand() * 180)],
    );
  }
}`,
        },
        learned:
          'Nothing has run, so there are no figures. When it does, the check is that two seeds with the same value write the same rows, and that the planted traps can be counted, because Phase 5 asks whether the agent finds them.',
        terms: ['baseline', 'isoDate'],
      },
      {
        n: '4.2',
        title: 'Make it behave like a legacy API',
        status: 'planned',
        needs: 'Step 4.1 running locally on 127.0.0.1:3510',
        plain:
          'Four things make the API behave like an old system. Lists come back a page at a time, using a cursor that points at the last row seen rather than a page number. Too many requests get a 429 with a Retry-After header, and a small share of requests fail with a 500 or 503 on purpose. One legacy endpoint returns camelCase names and Unix timestamps while the rest of the API uses snake_case and ISO dates.',
        why: 'An agent written against a clean API fails the first time it meets a 429, a 503 or a page that ends early. Without a retry rule and a check on field names, one flaky response can end the whole run.',
        code: {
          caption: 'Sketch, not run: cursor paging on the orders list. It asks for one extra row, so it knows whether another page exists.',
          from: 'proposed',
          path: 'apps/api/wrap/src/orders/orders.controller.ts',
          lang: 'typescript',
          code: String.raw`import { Controller, Get, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // The cursor is the last row's id and created_at, base64url encoded. Clients send it back unchanged.
  @Get()
  async list(@Query('cursor') cursor?: string, @Query('limit') limit = '10') {
    const size = Math.min(parseInt(limit, 10) || 10, 100);
    const after = cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) : null;
    // One extra row tells us whether another page exists.
    const rows = await this.orders.page(after, size + 1);
    const data = rows.slice(0, size);
    const last = data[data.length - 1];
    const nextCursor =
      rows.length > size && last
        ? Buffer.from(JSON.stringify({ id: last.id, created_at: last.created_at })).toString('base64url')
        : null;
    return { data, nextCursor };
  }
}`,
        },
        learned:
          'Nothing has run, so there are no counts. When it does, the step will count the 429 and 5xx answers a client receives, check that paging returns every order exactly once, and confirm that the legacy endpoint returns camelCase while the main one does not.',
        terms: ['filter', 'isoDate'],
      },
      {
        n: '4.3',
        title: 'Typed client and contract test',
        status: 'planned',
        needs: 'the API from Step 4.2 running on 127.0.0.1:3510',
        plain:
          'The agent does not call the API with raw fetch. A typed client in apps/ai/wrap wraps each call with a 5 second timeout, retries 429 and 5xx answers while honoring Retry-After, and turns every failure into one error type with a short code. A paging helper hides the cursor, so a loop can read every order without knowing the cursor exists. A contract test then calls the running API and fails when the fields the client expects have moved.',
        why: 'Without the client, one flaky answer ends the agent run, and every caller invents its own retry rule. Without the contract test, the API can rename a field, and the agent keeps running on wrong data until someone notices.',
        code: {
          caption: 'Sketch, not run: a getOrder call with a 5 second timeout, retries for 429 and 5xx, and failures reduced to one error type.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/tools/api-client.ts',
          lang: 'typescript',
          code: String.raw`export type WrapErrorCode = 'not_found' | 'validation' | 'rate_limited' | 'timeout' | 'internal';

export class WrappedError extends Error {
  constructor(readonly code: WrapErrorCode, message: string) {
    super(message);
  }
}

const CODES: Record<number, WrapErrorCode> = { 400: 'validation', 404: 'not_found', 429: 'rate_limited' };

export class WrapApiClient {
  constructor(private readonly baseUrl = 'http://127.0.0.1:3510') {}

  async getOrder(id: string): Promise<Record<string, unknown>> {
    return this.request('/api/orders/' + encodeURIComponent(id));
  }

  // Retries only 429 and 5xx, never 4xx. Retry-After wins over the 1s, 2s, 4s backoff.
  private async request(path: string, attempts = 4): Promise<any> {
    for (let i = 1; ; i++) {
      const res = await fetch(this.baseUrl + path, {
        headers: { Authorization: 'Bearer ' + (process.env.WRAP_API_SERVICE_TOKEN ?? '') },
        signal: AbortSignal.timeout(5_000), // A timeout makes fetch reject. Not yet turned into a WrappedError.
      });
      if (res.ok) return res.json();
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || i >= attempts) throw new WrappedError(CODES[res.status] ?? 'internal', 'API answered ' + res.status);
      const retryAfter = Number(res.headers.get('Retry-After'));
      await new Promise((r) => setTimeout(r, retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * 2 ** (i - 1), 8000)));
    }
  }
}`,
        },
        learned:
          'Nothing has run, so there are no figures. The contract test will check that getOrder returns the fields the client expects, and the eval will count the retries the client made, so an API that keeps pushing back shows up in the numbers.',
        terms: ['golden', 'isoDate'],
      },
    ],
  },
  {
    id: 'agents',
    label: 'Tools and agents',
    status: 'Not started',
    what: 'A tool-calling loop written by hand, a catalogue of tools it can call, and guardrails that stop it from answering badly or doing harm.',
    steps: [
      {
        n: '5.1',
        title: 'Tool-calling loop by hand',
        status: 'planned',
        needs: 'the search from phase 3 and model access through @fde/foundry',
        plain:
          'A language model cannot look anything up by itself, so the wrap project gives it tools it can ask us to run. This step writes the loop that does the work: send the model the question and the tool list, run any tool it asks for, send the results back, and repeat until it answers in plain text. The loop is written by hand with no agent framework, so every request and every tool call is visible in our own code.',
        why: 'Without a loop, the model can only answer from what it already knows, or name a tool it has no way to run. A loop with no cap can keep calling tools forever and run up a bill, so this one stops after ten turns.',
        code: {
          caption: 'Sketch, not run. The loop calls the model, runs the tool calls it asks for, sends the results back, and stops at a text answer or the turn cap.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/agent/loop.ts',
          lang: 'typescript',
          code: String.raw`import type { Message, ToolUse } from './types';
import { callModel } from './model';
import { TOOLS, runTool } from '../tools';

const MAX_TURNS = 10;

export async function runAgent(question: string): Promise<string> {
  const messages: Message[] = [{ role: 'user', content: question }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const reply = await callModel({ messages, tools: TOOLS });
    const calls = reply.content.filter((b): b is ToolUse => b.type === 'tool_use');

    if (calls.length === 0) {
      return reply.content.find((b) => b.type === 'text')?.text ?? '';
    }

    messages.push({ role: 'assistant', content: reply.content });
    const results = [];
    for (const call of calls) {
      const started = performance.now();
      const output = await runTool(call.name, call.input); // errors come back as text, never thrown
      console.log(JSON.stringify({ turn, tool: call.name, ms: Math.round(performance.now() - started), bytes: output.length }));
      results.push({ type: 'tool_result', tool_use_id: call.id, content: output });
    }
    messages.push({ role: 'user', content: results });
  }

  throw new Error('Stopped after ' + MAX_TURNS + ' turns');
}`,
        },
        learned:
          'This step will check that every question ends in a plain text answer, and log how many turns and tool calls each one takes. A question that reaches the ten-turn cap counts as a failure, not as an answer. The counts are compared with a saved baseline run, so a change to the loop can be shown to help or to hurt.',
        terms: ['token', 'embedding'],
      },
      {
        n: '5.2',
        title: 'Tool catalogue',
        status: 'planned',
        needs: 'the typed API client from step 4.3 and the search from phase 3',
        plain:
          'A tool is a function the model can ask us to run, such as searching the docs, reading one order or creating a return. Each tool comes with a schema, a list of named inputs and their types, so a bad request can be refused before anything runs. This step registers the search, lookup and write tools, and the lesson “Every rule lives inside the tool, not in the prompt” explains why the rules sit in the tool code.',
        why: 'Without a schema, the model can send a malformed or harmful argument, such as a SQL statement that deletes rows, and the tool will act on it. An error also has to come back as text the model can read, or one bad call ends the whole answer.',
        code: {
          caption: 'Sketch, not run. One tool with its schema, the SELECT-only check for the SQL tool, and a runner that turns every error into text.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/tools/index.ts',
          lang: 'typescript',
          code: String.raw`import { z } from 'zod';

const GetOrderInput = z.object({
  id: z.string().uuid().describe('The order ID (a UUID)'),
});

const SELECT_ONLY = /^\s*select\b/i;
const WRITE_WORDS = /\b(drop|delete|insert|update|alter|truncate)\b/i;

export const TOOLS = [
  {
    name: 'get_order',
    description: 'Fetch one order when you already know its exact ID. Returns the status and total, or an error.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Order ID (UUID)' } },
      required: ['id'],
    },
  },
  // search_docs, query_tickets_sql, list_shipments and create_return follow the same shape.
];

export function checkSelectOnly(sql: string): string | null {
  if (!SELECT_ONLY.test(sql)) return 'Only SELECT queries are allowed';
  if (WRITE_WORDS.test(sql)) return 'Statements that change data are rejected';
  return null;
}

export async function runTool(name: string, input: unknown): Promise<string> {
  try {
    if (name === 'get_order') {
      const { id } = GetOrderInput.parse(input);
      return JSON.stringify({ ok: true, order: await client.getOrder(id) });
    }
    return JSON.stringify({ ok: false, error: 'Unknown tool: ' + name });
  } catch (err) {
    return JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}`,
        },
        learned:
          'This step will check that a bad argument returns a readable error and does not crash the loop, and that the SELECT-only check rejects every write statement in a set of test strings. It will also count the tool calls that fail on bad input, so the eval shows how often the model asks for something the schema refuses. Those counts sit beside answer correctness.',
        terms: ['regex', 'filter'],
      },
      {
        n: '5.3',
        title: 'Agentic RAG router',
        status: 'planned',
        needs: 'the loop and tools from 5.1 and 5.2, and the rungs measured in phase 3',
        plain:
          'Not every question needs the strongest search. A short keyword question may be answered well by a cheap search, while a multi-part question needs the slower one. This step lets the agent pick which rung suits the question type, using a small model call before retrieval. It is the idea from the lesson “Retrieval becomes a tool the model may call, and may call again”, applied to choosing a rung on purpose.',
        why: 'Without a router, every question pays for the same rung, so easy questions wait on the slowest search. A router also costs a model call of its own, so it only helps if the answers get better or faster overall, and that has to be measured rather than assumed.',
        code: {
          caption: 'Sketch, not run. A small model call sorts the question as simple or complex, and the router maps that to a rung before retrieval.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/agent/router.ts',
          lang: 'typescript',
          code: String.raw`import { callModel } from './model';

export type Rung = 'naive' | 'hybrid';
type QuestionType = 'simple' | 'complex';
type Retrieve = (query: string, k: number) => Promise<string[]>;

const RUNG_FOR: Record<QuestionType, Rung> = {
  simple: 'naive',
  complex: 'hybrid',
};

export async function classifyQuestion(question: string): Promise<QuestionType> {
  const reply = await callModel(
    'Answer with one word: simple or complex. A simple question asks for one fact. A complex question has several parts. Question: ' + question,
  );
  return reply.trim().toLowerCase().startsWith('complex') ? 'complex' : 'simple';
}

export async function routedRetrieve(question: string, retrievers: Record<Rung, Retrieve>) {
  const rung = RUNG_FOR[await classifyQuestion(question)];
  const ids = await retrievers[rung](question, 10);
  return { rung, ids };
}`,
        },
        learned:
          'This step will check the router’s choice against a labelled set of questions, and compare recall at 10 and MRR with the same run when it always uses the hybrid rung. It will also measure the extra time the classification call adds to each question. The router is kept only if those numbers justify the extra call, otherwise the fixed rung stays.',
        terms: ['recallAtK', 'mrr'],
      },
      {
        n: '5.4',
        title: 'Guardrails',
        status: 'planned',
        needs: 'the loop from 5.1 and the tools from 5.2',
        plain:
          'A guardrail is a check that stops the agent from doing harm or saying things it cannot back up. This step adds four: a person must confirm before any refund is posted, every answer must cite a tool result, instructions hidden in a document are detected, and a set of hard red-team questions is added to the evals. The lesson “The model cannot tell your instructions from its input” explains why the injection check is needed.',
        why: 'Without a confirmation step, one wrong answer could refund the wrong customer before anyone sees it. Without a citation check, a fluent answer can state a claim that no tool returned, and the reader has no way to tell.',
        code: {
          caption: 'Sketch, not run. The confirmation gate for create_return, and the citation check for a finished answer. The injection check and red-team cases are not in this sketch.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/tools/returns.ts',
          lang: 'typescript',
          code: String.raw`import { z } from 'zod';

const CreateReturnInput = z.object({
  order_id: z.string().uuid(),
  reason: z.string().min(3),
  amount: z.number().positive(),
});

export async function createReturn(input: unknown, confirmed = false): Promise<string> {
  const req = CreateReturnInput.parse(input);
  const order = await client.getOrder(req.order_id);
  if (req.amount > order.total_amount) {
    return JSON.stringify({ ok: false, error: 'Refund is more than the order total' });
  }
  if (!confirmed) {
    // Nothing is posted here. The loop shows this request to the person and waits for a yes.
    return JSON.stringify({ ok: true, pending_confirmation: true, request: req });
  }
  console.log('[return] posting ' + JSON.stringify(req));
  return JSON.stringify({ ok: true, posted: await client.createReturn(req) });
}

// Every sentence of an answer must end with a marker such as [1] that points to a tool result.
export function uncitedSentences(answer: string): string[] {
  const sentences = answer.split(/(?<=[.!?])\s+/).filter((s) => s.trim() !== '');
  return sentences.filter((s) => !/\[\d+\]/.test(s));
}`,
        },
        learned:
          'This step will check that no return is posted without a yes from the person, and that an answer with an uncited sentence goes back for a rewrite. It will also plant an instruction inside a test document and count how often the agent follows it, where the goal is zero. The red-team cases add a count of refusals and clarifying questions to the evals.',
        terms: ['golden', 'redaction'],
      },
    ],
  },
  {
    id: 'mcp',
    label: 'MCP',
    status: 'Not started',
    what: 'The tools and documents exposed through the Model Context Protocol, over stdio and over HTTP, with a client of our own on the other side.',
    steps: [
      {
        n: '6.1',
        title: 'Stdio MCP server',
        status: 'planned',
        needs: 'nothing from the earlier steps, since the handlers are stubs until Step 5.2',
        plain:
          'The MCP server exposes the agent tools over standard input and output, so a client can start it as a child process and talk to it through its pipes. A client first asks which tools exist, then calls one by name with arguments that are checked against a schema. The first version returns stub answers, and the real handlers arrive once the tool catalogue exists. Standard output carries the protocol, so any logging goes to standard error.',
        why: 'Without a standard protocol, every client needs its own wiring to reach the tools, and each one has to guess their names and arguments. A server that lists its tools in one standard form lets any MCP client find them and check the arguments before a call.',
        code: {
          caption: 'Sketch, not run: one tool registered on a stdio server, with a stub handler that returns text.',
          from: 'proposed',
          path: 'apps/mcp/wrap/src/index.ts',
          lang: 'typescript',
          code: String.raw`import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const server = new McpServer({ name: 'wrap-mcp', version: '0.0.1' });

server.registerTool(
  'search_docs',
  {
    title: 'Search docs',
    description: 'Search the steering corpus and return the best matching chunks. Read-only.',
    inputSchema: z.object({
      query: z.string().min(1),
      variant: z.enum(['naive', 'bm25', 'hybrid']),
    }),
  },
  async ({ query, variant }) => ({
    content: [{ type: 'text', text: 'stub: ' + variant + ' search for ' + query }],
  }),
);

async function main() {
  // Standard output carries the protocol, so diagnostics go to standard error only.
  console.error('[wrap-mcp] starting on stdio');
  await server.connect(new StdioServerTransport());
}

main();`,
        },
        learned:
          'Nothing has run, so there are no counts. The check is what the MCP Inspector shows: the tool list with its descriptions and schemas, and a call to search_docs that returns the stub text.',
        terms: ['stub', 'ticketId'],
      },
      {
        n: '6.2',
        title: 'MCP resources and prompts',
        status: 'planned',
        needs: 'the MCP server from Step 6.1',
        plain:
          'Besides tools, an MCP server can offer resources, which are documents a client reads by address such as wrap://docs/123, and prompts, which are reusable instructions with optional arguments. A client lists both, then fetches one by name or address. Here the document resource returns stub text, and the triage prompt fills in a severity argument.',
        why: 'Without resources, a client that needs a document has to call a tool and guess its shape, and the instructions for a task get copied into every prompt by hand. A named address and a named prompt let one shared text serve every client.',
        code: {
          caption: 'Sketch, not run: a document resource at wrap://docs/{id} and a triage prompt with an optional severity argument.',
          from: 'proposed',
          path: 'apps/mcp/wrap/src/index.ts',
          lang: 'typescript',
          code: String.raw`import { ResourceTemplate } from '@modelcontextprotocol/server';
import { z } from 'zod';

// Added to the same server as the stdio step, before connect().

server.registerResource(
  'document',
  new ResourceTemplate('wrap://docs/{id}', { list: undefined }),
  { title: 'Document', description: 'One document by ID', mimeType: 'text/plain' },
  async (uri, { id }) => ({
    contents: [{ uri: uri.href, mimeType: 'text/plain', text: 'stub text for document ' + id }],
  }),
);

server.registerPrompt(
  'triage-ticket',
  {
    title: 'Triage a ticket',
    description: 'Ask for a severity call on one ticket',
    argsSchema: z.object({ severity: z.enum(['low', 'medium', 'high']).optional() }),
  },
  ({ severity }) => ({
    messages: [{ role: 'user', content: { type: 'text', text: 'Triage this ticket as ' + (severity ?? 'medium') + '.' } }],
  }),
);`,
        },
        learned:
          'Nothing has run, so there are no counts. The check is that the Inspector lists the document template and the triage prompt, and that a read of wrap://docs/test123 returns the stub. Later the eval will ask whether a client fetched a resource or a prompt when the task called for one.',
        terms: ['chunk', 'metadata'],
      },
      {
        n: '6.3',
        title: 'HTTP transport and service-token auth',
        status: 'planned',
        needs: 'the API from Step 4.2, and two tokens in the root .env (mode 600)',
        plain:
          'The server also listens on HTTP at 127.0.0.1:3520, so a service can reach it without starting a process. Every request must carry a bearer token that matches WRAP_MCP_TOKEN, and a request without one gets a 401 before any tool runs. The server calls the API with its own service token and never holds the database password, which is the boundary the credentials lesson, A missing value must reduce access, never grant it, is about.',
        why: 'A server that only runs over stdio cannot be shared by a service, and one with no token would let anyone who reaches the port call its tools. If the server also held the database password, a leak from the server would expose the whole database instead of one API.',
        code: {
          caption: 'Sketch, not run: the gate in front of the HTTP server. A missing secret refuses every request, and the token is compared in constant time.',
          from: 'proposed',
          path: 'apps/mcp/wrap/src/http.ts',
          lang: 'typescript',
          code: String.raw`import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

// Read once at startup. An empty value refuses everything, so an unset token never means open.
const EXPECTED = process.env.WRAP_MCP_TOKEN ?? '';

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const http = createServer((req, res) => {
  const presented = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!EXPECTED || !sameSecret(presented, EXPECTED)) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  // Only a request that passes the gate reaches the MCP handler.
});

http.listen(3520, '127.0.0.1');`,
        },
        learned:
          'Nothing has run, so there are no counts. The check is three requests: a good token passes the gate, and a missing or wrong token gets a 401. The startup log must contain none of the database settings, and the eval will count which token each call used.',
        terms: ['redaction', 'pgvector'],
      },
      {
        n: '6.4',
        title: 'Custom MCP client',
        status: 'planned',
        needs: 'the HTTP server from Step 6.3 on 127.0.0.1:3520, and the agent loop from Step 5.1',
        plain:
          'The agent app gets a small MCP client of its own. It asks the HTTP server for its tool list, then calls a tool by name with arguments, sending each request as JSON-RPC over HTTP with the bearer token. Tools from the server are merged with the local ones, so the agent loop can call either kind. Claude Code is pointed at the same server too, so the server is checked from the other side as well.',
        why: 'Testing the server only with its own tools proves little about how a client sees it. A client written against the protocol shows whether the names, schemas and error answers can be used by something that did not build them.',
        code: {
          caption: 'Sketch, not run: a client that lists tools and calls one over HTTP. It skips the initialize handshake, so it is a first draft only.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/mcp-client/index.ts',
          lang: 'typescript',
          code: String.raw`export class MCPClient {
  private nextId = 1;

  constructor(private readonly url: string, private readonly token: string) {}

  private async rpc<T>(method: string, params?: unknown): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as { result?: T; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    return body.result as T;
  }

  listTools() {
    return this.rpc<{ tools: { name: string; description?: string; inputSchema: unknown }[] }>('tools/list');
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const out = await this.rpc<{ content: { type: string; text?: string }[] }>('tools/call', { name, arguments: args });
    return out.content.map((c) => c.text ?? '').join('\n');
  }
}`,
        },
        learned:
          'Nothing has run, so there are no counts. The check is that the agent lists the server tools and that a call returns the same text the Inspector shows. The eval will count how many tool calls went through this client rather than a local handler.',
        terms: ['golden', 'baseline'],
      },
    ],
  },
  {
    id: 'polish',
    label: 'Product polish',
    status: 'Not started',
    what: 'A streaming chat screen with citations, traces of every call, cost controls and a dashboard that compares the retrieval rungs.',
    steps: [
      {
        n: '7.1',
        title: 'Streaming chat UI with citations',
        status: 'planned',
        needs: 'the agent loop from 5.1 and the citation check from 5.4',
        plain:
          'A chat screen shows the answer as it arrives, a few words at a time, instead of after a long wait. Each claim in the answer links to the chunk it came from, so the reader can check it against the source. There is no separate lesson for this step yet, so this page explains it.',
        why: 'Without streaming, the screen stays blank for the whole model call, which can take many seconds, and the reader may think it has frozen. Without links to the source, the reader has to take the answer on trust.',
        code: {
          caption: 'Sketch, not run. The server side streams each token and each citation as a server-sent event, then sends a done event.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/llm/stream.ts',
          lang: 'typescript',
          code: String.raw`import { runAgentStream } from '../agent/loop';

// Server-sent events: each event is one JSON line, and a blank line ends it.
export async function* streamAnswer(question: string, rung: string): AsyncGenerator<string> {
  const { pieces, chunks } = await runAgentStream(question, rung);
  for await (const piece of pieces) {
    yield 'data: ' + JSON.stringify({ type: 'token', content: piece }) + '\n\n';
  }
  for (const chunk of chunks) {
    const text = chunk.content.slice(0, 200);
    yield 'data: ' + JSON.stringify({ type: 'citation', chunk_id: chunk.id, text }) + '\n\n';
  }
  yield 'data: ' + JSON.stringify({ type: 'done' }) + '\n\n';
}`,
        },
        learned:
          'This step will check that every citation points to a chunk the search really returned, and it will record how long the first token takes to arrive. A citation to a chunk that was never retrieved counts as a failure. Both checks sit beside the answer scores, because a fast screen with false links is still a failed answer.',
        terms: ['chunk', 'metadata', 'token'],
      },
      {
        n: '7.2',
        title: 'Tracing and observability',
        status: 'planned',
        needs: 'the agent loop from 5.1',
        plain:
          'Tracing writes down each step of an answer, such as the search, the rerank and each model call, with its time and its token counts. A slow or costly answer can then be opened and read one step at a time. There is no separate lesson for tracing yet. This page explains it, and Langfuse, a trace viewer, is the one we plan to use.',
        why: 'Without traces, a slow answer is just a long wait, and nobody can tell whether the search, the rerank or the model is to blame. Cost is also invisible, so the cheapest rung cannot be chosen from evidence.',
        code: {
          caption: 'Sketch, not run. After each answer, one line goes to the shared request log with its turns, tool calls, tokens and time.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/telemetry/trace.ts',
          lang: 'typescript',
          code: String.raw`import { logRequest } from '@fde/telemetry';

// AgentRun is what runAgent returns along with its counts. The names here are proposed.
export async function tracedAnswer(question: string, model: string, run: () => Promise<AgentRun>) {
  const started = performance.now();
  const result = await run();
  logRequest({
    ts: new Date().toISOString(),
    subject: null,
    question,
    model,
    engine: 'hand-rolled',
    turns: result.turns,
    toolCalls: result.toolCalls,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    ms: Math.round(performance.now() - started),
    stoppedBecause: result.stoppedBecause,
    schemaRetries: 0,
    surface: 'wrap-ai',
    costUsd: null,
  });
  return result.answer;
}`,
        },
        learned:
          'This step will check that every question writes one line to the request log, with its turns, tool calls, tokens and time. A question with no line counts as a failed check. Those lines are the raw data for the cost table in the next step.',
        terms: ['token', 'baseline'],
      },
      {
        n: '7.3',
        title: 'Cost analysis and caching',
        status: 'planned',
        needs: 'the request log from 7.2 and verified prices for each model',
        plain:
          'Each question has a cost in model tokens, and this step turns those tokens into dollars using the verified price of each model. A cache keeps an answer that was already paid for, so a repeated question does not cost twice. The lessons “What it costs, and the denominator nobody picks” and “Two caches, and only one of them can be wrong” explain the two halves of this step.',
        why: 'Without measuring, the cost of a rung is a guess, and a rung that looks cheap for one question can be the expensive one across a whole test set. Without a cache, the same answer is paid for each time it is asked, and a cache keyed only on the question would keep serving an old answer after a document changes.',
        code: {
          caption: 'Sketch, not run. The cache key includes the content hash of each chunk used, and the cost comes from the shared price table.',
          from: 'proposed',
          path: 'apps/ai/wrap/src/llm/cache.ts',
          lang: 'typescript',
          code: String.raw`import { createHash } from 'node:crypto';
import { priceDetail } from '@fde/telemetry';

// In memory for the sketch. The hashes are chunks.content_hash for each chunk the answer used.
const answers = new Map<string, string>();

export function answerKey(question: string, rung: string, contentHashes: string[]): string {
  const parts = [question, rung, ...[...contentHashes].sort()];
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

export async function cachedAnswer(key: string, produce: () => Promise<string>): Promise<string> {
  const hit = answers.get(key);
  if (hit !== undefined) return hit;
  const fresh = await produce();
  answers.set(key, fresh);
  return fresh;
}

// Returns null when the model has no verified price, rather than a guessed one.
export function answerCost(model: string, inputTokens: number, outputTokens: number): number | null {
  return priceDetail(model, inputTokens, outputTokens).costUsd;
}`,
        },
        learned:
          'This step will check the cost of each question against its token counts in the request log, and that a repeated question is served from the cache with no model call. It will also check that changing one document makes its answers miss the cache. The cost table goes into the progress log, with the cache hit count beside it.',
        terms: ['token', 'sha256'],
      },
      {
        n: '7.4',
        title: 'RAG comparison dashboard',
        status: 'planned',
        needs: 'the eval results from phase 3',
        plain:
          'The dashboard puts the scores of every retrieval rung side by side, so the trade-offs can be seen at a glance. Each rung is one way of searching, and its scores come from the eval runs saved in the results folder. The table reads those saved files, so nothing is typed in by hand.',
        why: 'Without one place to compare, each rung’s scores sit in a separate file, and the choice of rung is made from memory or from whichever run someone opened last. A side-by-side view also shows when a rung wins on recall but loses on rank, which a single number hides.',
        code: {
          caption: 'Sketch, not run. A loader reads each saved run file from the eval folder and sorts the rungs by MRR.',
          from: 'proposed',
          path: 'apps/web/wrap-app/src/routes/dashboard.tsx',
          lang: 'typescript',
          code: String.raw`import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// The folder that evals/results.ts names, counted from the repo root.
const RESULTS_DIR = 'apps/ai/wrap/evals/results';

export async function loadRungs() {
  const names = (await readdir(RESULTS_DIR)).filter((n) => n.endsWith('.json'));
  const runs = await Promise.all(
    names.map(async (n) => JSON.parse(await readFile(join(RESULTS_DIR, n), 'utf-8'))),
  );
  return runs
    .map((r) => ({ variant: r.variant, timestamp: r.timestamp, ...r.metrics }))
    .sort((a, b) => b.mrr - a.mrr);
}`,
        },
        learned:
          'This step will check that every rung in the results folder appears once in the table, with recall at 3, 6 and 10, MRR and hit rate. It will also check that the sort order matches the MRR column, and that runs with a different model or repeat count are shown apart rather than compared as if they were equal.',
        terms: ['recallAtK', 'mrr', 'hitRate'],
      },
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
