/**
 * The words `/steps` uses, in plain English.
 *
 * ── THE RULE FOR AN ENTRY ──────────────────────────────────────────────────
 *
 * Say what it IS first, in one sentence with no other jargon in it, then what
 * it is HERE, in this build, if that differs. A definition that only works if
 * you already know two other terms is not a definition.
 *
 * Every step's `terms` list in lib/steps.ts must name a key that is defined
 * here. Keys are identifier-safe (no hyphens) so TermKey stays a plain union.
 */

export interface Term {
  /** The word as it appears on the page. */
  word: string;
  /** What it is, in general. */
  is: string;
  /** What it is in this build. Optional. */
  here?: string;
}

export const GLOSSARY = {
  corpus: {
    word: 'corpus',
    is: 'The full set of documents a system is meant to search or learn from.',
    here: 'The steering documents in docs/steering/corpus. The messy copy the pipeline reads is 1111 files in apps/ai/wrap/data/raw_dump.',
  },
  chunk: {
    word: 'chunk',
    is: 'A piece of a document, small enough to be searched on its own and handed to a model.',
    here: 'Step 2.4 cut the scrubbed corpus into 20,097 chunks from 1,092 files, written to apps/ai/wrap/data/chunks.jsonl.',
  },
  token: {
    word: 'token',
    is: 'The unit a language model reads and counts: a word, part of a word, or a symbol. In English, about four characters on average.',
    here: 'Not counted with a tokenizer. The chunker estimates it as characters divided by 4, rounded up.',
  },
  chunkSize: {
    word: 'chunk size',
    is: 'The largest piece a splitter may produce, measured in tokens. Too large and a chunk mixes topics; too small and it says too little on its own.',
    here: '500 tokens (MAX_TOKENS_PER_CHUNK). No chunk in the corpus is over it.',
  },
  slidingWindow: {
    word: 'sliding window',
    is: 'A fixed-size piece of text cut from a long document, moved along it one step at a time, so the pieces cover all of it.',
    here: 'Plain text uses 400-token windows. A Markdown section or C function over the max is cut the same way.',
  },
  overlap: {
    word: 'overlap',
    is: 'The text that two neighbouring windows share, so a sentence cut at one edge still appears whole in the next piece.',
    here: '100 tokens between neighbouring text windows.',
  },
  metadata: {
    word: 'metadata',
    is: 'Labels kept beside a piece of text that say where it came from, such as its file, its heading or its date. A search can filter on them without reading the text.',
    here: 'Every chunk has source_file, start_line and end_line, plus a per-type field such as heading_path, the function name or the CSV column names. Subsystem, ticket and requirement IDs come in Step 2.5.',
  },
  embedding: {
    word: 'embedding',
    is: 'A list of numbers a model produces for a piece of text, built so that texts with a similar meaning get similar lists.',
    here: 'Made by the hosted model in Step 0.3. The index in Step 2.6 will store one per chunk.',
  },
  vector: {
    word: 'vector',
    is: 'A list of numbers with a fixed length, which can be read as a point in a space with that many axes.',
    here: 'The schema reserves 1536 numbers per vector (vector(1536) in 001-init.sql).',
  },
  cosineSimilarity: {
    word: 'cosine similarity',
    is: 'How closely two vectors point the same way: 1 means the same direction, 0 means unrelated, and -1 means opposite. Length does not matter.',
    here: 'Step 0.3 scored two steering texts at 0.824 and steering against weather at 0.436.',
  },
  pgvector: {
    word: 'pgvector',
    is: 'An extension for Postgres that stores vectors and finds the nearest ones to a given vector.',
    here: 'Runs in Docker on 127.0.0.1:5432 (Step 0.1). Nothing reads from it yet.',
  },
  golden: {
    word: 'golden question',
    is: 'A question written by hand, with the file or files that answer it and the facts the answer must contain. It is the answer key.',
    here: 'Thirty of them in apps/ai/wrap/evals/golden.jsonl: 27 with an answer in the corpus, 3 with none.',
  },
  recallAtK: {
    word: 'recall@k',
    is: 'The share of questions where a right file appears among the top k results.',
    here: 'Reported at k = 3, 6 and 10.',
  },
  mrr: {
    word: 'MRR',
    is: 'Mean reciprocal rank. For each question, take 1 divided by the rank of the first right file (0 if there is none), then average over the questions.',
    here: 'The stub run scored 0.04.',
  },
  hitRate: {
    word: 'hit rate',
    is: 'The share of questions with at least one right file in the top 10.',
    here: 'The stub run scored 0.22.',
  },
  baseline: {
    word: 'baseline',
    is: 'A recorded run that later runs are compared against, so a change can be shown to help or to hurt.',
    here: 'The stub run is a baseline for the harness only. The first real one needs a real retriever.',
  },
  stub: {
    word: 'stub',
    is: 'A stand-in with the same shape as the real thing that does none of its work.',
    here: 'stub-retrieve.ts peeks at the answer key to decide where to place a right file, so its scores say nothing about search.',
  },
  magicBytes: {
    word: 'magic bytes',
    is: 'The first few bytes of a file: a fixed signature that says what kind of file it is. For example, a PDF starts with the bytes for %PDF.',
    here: 'The detector checks 10 signatures: PDF, gzip, ZIP, PNG, JPEG, GIF, two TIFF forms, MZ and ELF.',
  },
  encoding: {
    word: 'encoding',
    is: 'How the characters of a text file are stored as bytes. UTF-8 is the common one. Latin-1 is an older one in which the byte 0xE9 means é.',
    here: 'Detected per file. In the corpus: 1109 UTF-8, 1 Latin-1, and 1 unknown (the empty file).',
  },
  bom: {
    word: 'BOM',
    is: 'A byte-order mark: a few bytes at the start of a text file that say it is UTF-8 or UTF-16, and in which order the 16-bit units are stored.',
    here: 'The corpus has none, so the BOM and UTF-16 paths are only covered by the detector selftest.',
  },
  sha256: {
    word: 'SHA-256',
    is: 'A fingerprint of a file’s bytes, always 64 hex digits. The same bytes always give the same fingerprint, and different bytes almost never do.',
    here: 'Used for the exact-duplicate check on the raw bytes of every file.',
  },
  shingle: {
    word: 'shingle',
    is: 'A run of k consecutive words from a text. The set of all its shingles is a fingerprint of its wording.',
    here: 'Five words, lowercased, with punctuation kept as part of the word.',
  },
  jaccard: {
    word: 'Jaccard similarity',
    is: 'The overlap of two sets as a share: the size of the common part divided by the size of everything together. It runs from 0 (nothing shared) to 1 (identical).',
    here: 'The dedup step compares shingle sets this way: exactly for the checks, and estimated by MinHash for the scan.',
  },
  minhash: {
    word: 'MinHash',
    is: 'A short, fixed-size signature for a set. The share of matching slots between two signatures estimates the Jaccard similarity of the sets.',
    here: 'Seeded hashes, 128 slots per text. The estimate is within a few points of the exact value.',
  },
  nearDuplicate: {
    word: 'near-duplicate',
    is: 'Two documents whose text is almost the same, with a few lines changed, added or removed.',
    here: 'Flagged at a similarity of 0.75 or more. The corpus has 15 such pairs.',
  },
  pii: {
    word: 'PII',
    is: 'Personal information: names, email addresses, phone numbers and anything else that identifies a person.',
    here: 'Found in the corpus: 779 email addresses, 937 usernames inside them, 15 phone numbers and 15 names.',
  },
  allowlist: {
    word: 'allowlist',
    is: 'A list of words and phrases that a scrubber must leave alone, so that common capitalised headings are not taken for names.',
    here: 'config/pii-allowlist.json holds phrases and words. Names are never on it.',
  },
  redaction: {
    word: 'redaction',
    is: 'Replacing a sensitive value with a stand-in, so the text no longer shows the value.',
    here: 'Done with tokens rather than blanks, so the change can be reversed with the map.',
  },
  placeholderToken: {
    word: 'token (placeholder)',
    is: 'A stand-in such as EMAIL_0001 that takes the place of a real value. The same value always gets the same token.',
    here: 'Tokens are counted per type (EMAIL, HANDLE, PHONE, PERSON). The map from token to value is data/pii-map.json, which git ignores.',
  },
  regex: {
    word: 'regex',
    is: 'A regular expression: a pattern written as characters that matches text by its shape, such as three letters, a dash and four digits.',
    here: 'The requirement and ticket patterns in metadata-extractor.ts. Lookarounds at each end stop a match from starting or ending inside a longer code.',
  },
  requirementId: {
    word: 'requirement ID',
    is: 'A code that names one requirement, so the same requirement can be found wherever it is cited.',
    here: 'CR- or SR- followed by an optional programme code and a four-digit number, such as CR-TDR-32-0537 or SR-EPS-0407. PRG- codes name programmes, so they are not tagged.',
  },
  ticketId: {
    word: 'ticket ID',
    is: 'A code that names one work item in an issue tracker, such as a bug, a change or a task.',
    here: 'VST- followed by 4 to 6 digits (Jira exports), or CHR- with a year and a number (change requests), such as VST-4471 or CHR-2021-0177.',
  },
  isoDate: {
    word: 'ISO date',
    is: 'A date written year first, then month and day with two digits each, such as 2024-11-23. Sorted as text, it is also in date order.',
    here: 'Dates are found in ISO form, US month/day/year, and month-name forms, then written this way. A date that is not real, such as 2025-13-45, is dropped.',
  },
  keyword: {
    word: 'keyword',
    is: 'A word that says what a piece of text is about. Often picked by counting how often each word appears.',
    here: 'Lowercase words of six or more letters that appear at least twice in a chunk, keeping the top 10 by count.',
  },
  stopword: {
    word: 'stopword',
    is: 'A common word, such as "the" or "would", that carries no meaning for search and is thrown away before counting.',
    here: 'A fixed list of English words in metadata-extractor.ts. Placeholder tokens such as EMAIL_0001 are removed as well.',
  },
  filter: {
    word: 'filter',
    is: 'A rule that keeps only the items matching a condition, such as only the chunks from one subsystem.',
    here: 'Every chunk now carries subsystem, type_category and its ID and date lists, so a search can filter on them. Step 3.2 uses them; Step 2.5 only stores them.',
  },
} satisfies Record<string, Term>;

export type TermKey = keyof typeof GLOSSARY;

/** The order the glossary is printed in. */
export const GLOSSARY_ORDER: TermKey[] = [
  'corpus',
  'chunk',
  'token',
  'chunkSize',
  'slidingWindow',
  'overlap',
  'metadata',
  'embedding',
  'vector',
  'cosineSimilarity',
  'pgvector',
  'golden',
  'recallAtK',
  'mrr',
  'hitRate',
  'baseline',
  'stub',
  'magicBytes',
  'encoding',
  'bom',
  'sha256',
  'shingle',
  'jaccard',
  'minhash',
  'nearDuplicate',
  'pii',
  'allowlist',
  'redaction',
  'placeholderToken',
  'regex',
  'requirementId',
  'ticketId',
  'isoDate',
  'keyword',
  'stopword',
  'filter',
];

export const termId = (key: TermKey) => `term-${key}`;
