import type { Lesson, Module } from '../types';

const formatDetection: Lesson = {
  slug: 'format-detection',
  number: '3.1',
  title: 'Format detection',
  oneLiner: 'Format detection reads the first bytes of a file to find its real type, instead of trusting the file name.',
  problem: {
    without: 'A file named "report.pdf" may really be plain text. The PDF reader then fails, or it returns garbled text.',
    with: 'The first bytes name the real type. The file goes to the right reader, and a mismatch with its name is reported.',
  },
  steps: [
    {
      title: 'Signatures',
      detail: 'Many file types start with a fixed pattern of bytes, called a signature. A PDF file starts with the text "%PDF-", which is the bytes 25 50 44 46.',
    },
    {
      title: 'Known signatures',
      detail: 'The program compares the first bytes with a short list. A PNG image starts with the bytes 89 50 4E 47 in hexadecimal.',
    },
    {
      title: 'Name check',
      detail: 'The extension, such as ".pdf", is only a label. If the bytes say PDF but the name says ".txt", the mismatch is logged.',
    },
    {
      title: 'Unknown types',
      detail: 'A file with no known signature, such as plain text in "report.pdf", goes to a review list. It is not guessed, because a wrong guess can corrupt the text.',
    },
    {
      title: 'Routing',
      detail: 'Each detected type goes to its own reader. A file such as "manual.pdf" goes to the PDF reader.',
    },
  ],
  diagram: ['File', 'First bytes', 'Type', 'Reader'],
  code: {
    source: `// Known signatures: the first bytes of each file type.
const signatures: { type: string; bytes: number[] }[] = [
  { type: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
];

// Return the type whose signature matches the start of the data.
function detectType(data: Buffer): string {
  for (const sig of signatures) {
    const head = data.subarray(0, sig.bytes.length);
    if (head.equals(Buffer.from(sig.bytes))) {
      return sig.type;
    }
  }
  return "unknown";
}

const samples: [string, Buffer][] = [
  ["manual.pdf", Buffer.from("%PDF-1.7 fake body")],
  ["logo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d])],
  ["report.pdf", Buffer.from("Refunds take 5 to 7 days.")],
];

// Compare the detected type with the file extension.
for (const [name, data] of samples) {
  const ext = name.split(".").pop();
  const detected = detectType(data);
  const note = detected === ext ? "matches name" : "no name match";
  console.log(name, "->", detected, note);
}
`,
    output: `manual.pdf -> pdf matches name
logo.png -> png matches name
report.pdf -> unknown no name match`,
  },
  hood: {
    paragraphs: [
      'Signatures are short, so checking them is fast. The program reads only the first few bytes, not the whole file.',
      'Bytes are numbers from 0 to 255. The code writes them in hexadecimal, where 0x25 is the number 37.',
      'A signature does not prove the file is clean. A PDF can still be broken, so the reader must handle errors.',
      'Plain text has no signature. It is recognized by checking that every byte is valid text, which this lesson skips.',
    ],
    example: [
      { label: 'First bytes of manual.pdf', value: '25 50 44 46, the text "%PDF"' },
      { label: 'Signature for PNG', value: '89 50 4E 47' },
      { label: 'Result for report.pdf', value: 'unknown, no name match' },
    ],
  },
  mistakes: [
    'Trusting the extension alone. A renamed file then goes to the wrong reader.',
    'Reading the whole file to find its type. The first few bytes are enough.',
    'Guessing a type for unknown files. Set them aside and review them.',
  ],
  useWhen: [
    'Users upload files, and their names cannot be trusted.',
    'Your pipeline reads several formats, such as PDF and plain text.',
  ],
  skipWhen: [
    'Every file comes from one tool that always writes the same format.',
    'You accept one format only, and a failed read is shown to the user anyway.',
  ],
  words: [
    { term: 'Signature', meaning: 'The fixed bytes at the start of a file that name its type.' },
    { term: 'Extension', meaning: 'The end of a file name, such as ".pdf", used as a label.' },
    { term: 'Byte', meaning: 'A number from 0 to 255, the basic unit of stored data.' },
    { term: 'Reader', meaning: 'A program that reads one file type and returns its text.' },
  ],
};

const deduplication: Lesson = {
  slug: 'deduplication',
  number: '3.2',
  title: 'Deduplication',
  oneLiner: 'Deduplication removes repeated documents, so the same text is not stored and searched twice.',
  problem: {
    without: 'The same help page is copied into three folders. Search returns three copies of one answer, and the index grows for no gain.',
    with: 'Each document gets a fingerprint. A repeat is found by its fingerprint and skipped before it is stored.',
  },
  steps: [
    {
      title: 'Exact copies',
      detail: 'Read each file as raw bytes. Two exact copies of "faq.txt" have the same bytes, so they get the same fingerprint.',
    },
    {
      title: 'SHA-256 fingerprint',
      detail: 'SHA-256 is a fixed function that turns any text into a 64-character code. Changing one letter gives a different code.',
    },
    {
      title: 'Seen codes',
      detail: 'Store each fingerprint with its file name, such as "faq.txt". A later file whose fingerprint is already stored is a duplicate.',
    },
    {
      title: 'Skipping a duplicate',
      detail: 'The duplicate is not chunked or embedded again. The log records the match, such as "copy.txt is a copy of faq.txt".',
    },
    {
      title: 'Near duplicates',
      detail: 'Near duplicates differ by a few words, such as the year "2024". MinHash estimates how much two texts overlap, so near copies can be grouped.',
    },
  ],
  diagram: ['Document', 'Fingerprint', 'Seen before?', 'Store or skip'],
  code: {
    source: `import { createHash } from "node:crypto";

// The fingerprint: the SHA-256 code of the exact text, in hex.
const fingerprint = (text: string) =>
  createHash("sha256").update(text).digest("hex");

const docs = [
  { name: "faq.txt", text: "Refunds take 5 to 7 business days" },
  { name: "copy.txt", text: "Refunds take 5 to 7 business days" },
  { name: "2024.txt", text: "Refunds take 5 to 7 days in 2024" },
];

// Keep the first name for each code. Later copies are duplicates.
const seen = new Map<string, string>();
for (const doc of docs) {
  const code = fingerprint(doc.text);
  const kept = seen.get(code) ?? doc.name;
  seen.set(code, kept);
  const note = kept === doc.name ? "new" : "a copy of " + kept;
  console.log(doc.name, "is", note);
}
// Word overlap: shared words divided by all distinct words.
function overlap(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(" "));
  const setB = new Set(b.toLowerCase().split(" "));
  const shared = [...setA].filter((w) => setB.has(w)).length;
  return shared / new Set([...setA, ...setB]).size;
}
const score = overlap(docs[0].text, docs[2].text);
console.log("Overlap ->", score.toFixed(2));
`,
    output: `faq.txt is new
copy.txt is a copy of faq.txt
2024.txt is new
Overlap -> 0.67`,
  },
  hood: {
    paragraphs: [
      'A hash function turns input of any size into a code of fixed size. Different texts almost never share one code.',
      'Exact matching fails on small changes. A trailing space gives a new fingerprint, so trim and normalize text first.',
      'MinHash handles near duplicates at scale. It keeps a short signature per document, so no pair of full texts must be compared.',
      'Remove duplicates before chunking. Otherwise each copy creates its own chunks, and search returns them all.',
    ],
    example: [
      { label: 'Fingerprint of the FAQ sentence', value: '64 hex characters, the same for both copies' },
      { label: 'Shared words with 2024.txt', value: '6 of 9 distinct words, so 0.67' },
      { label: 'Result for copy.txt', value: 'skipped as a duplicate' },
    ],
  },
  mistakes: [
    'Hashing text before cleaning it. Extra spaces or line breaks change the fingerprint, so normalize first.',
    'Treating near duplicates as exact copies. A changed year gives a different answer, so review near copies.',
    'Keeping the wrong copy. Keep one copy, and log the others with the name of the copy kept.',
  ],
  useWhen: [
    'The same document arrives from several folders or exports.',
    'Search results repeat the same passage again and again.',
  ],
  skipWhen: [
    'Each document is unique by design, such as one record per customer.',
    'The collection is small and checked by hand.',
  ],
  words: [
    { term: 'Fingerprint', meaning: 'A short code made from a file that changes when the file changes.' },
    { term: 'Hash', meaning: 'A fixed-size code computed from input of any size.' },
    { term: 'SHA-256', meaning: 'A common hash function that makes a 64-character hex code.' },
    { term: 'MinHash', meaning: 'A method that estimates how much two texts overlap, using short signatures.' },
  ],
};

const piiScrubbing: Lesson = {
  slug: 'pii-scrubbing',
  number: '3.3',
  title: 'PII scrubbing',
  oneLiner: 'PII scrubbing replaces personal information, such as emails and phone numbers, before the text is stored.',
  problem: {
    without: 'A support ticket with a customer email is stored and returned in search results. Anyone who can search can read the address.',
    with: 'The email becomes a placeholder, such as [EMAIL], before storage. Search and answers never show the address.',
  },
  steps: [
    {
      title: 'Kinds of data',
      detail: 'Decide which values count as PII, such as email addresses, phone numbers, and account numbers. Write the list, for example "email" and "phone", before any code.',
    },
    {
      title: 'Patterns',
      detail: 'A pattern describes the shape of a value. The phone pattern matches "555-123-4567", which is three digits, a dash, three digits, a dash, and four digits.',
    },
    {
      title: 'Replacement',
      detail: 'Each match becomes a placeholder. For example, "ana.lee@example.com" becomes [EMAIL], and the sentence keeps its meaning.',
    },
    {
      title: 'Scrub before storage',
      detail: 'Scrub every document before chunking and embedding. A ticket stored before scrubbing keeps "ana.lee@example.com" in its copies.',
    },
    {
      title: 'Testing with known examples',
      detail: 'Keep a small set of text with known PII and check that every value is replaced. Count the misses, such as 1 phone number left in place out of 20 tests.',
    },
  ],
  diagram: ['Text', 'Find patterns', 'Replace with placeholders', 'Store'],
  code: {
    source: `// Two patterns for PII. Each matches the shape of a value.
const patterns: [string, RegExp][] = [
  ["[EMAIL]", /[a-z0-9._]+@[a-z0-9.]+/g],
  ["[PHONE]", /[0-9]{3}-[0-9]{3}-[0-9]{4}/g],
];

// Replace every match with its placeholder.
function scrub(text: string): string {
  let result = text;
  for (const [placeholder, pattern] of patterns) {
    result = result.replace(pattern, placeholder);
  }
  return result;
}

const ticket = "Ana wrote from ana.lee@example.com, " +
  "call 555-123-4567.";
console.log("Before ->", ticket);
console.log("After ->", scrub(ticket));
`,
    output: `Before -> Ana wrote from ana.lee@example.com, call 555-123-4567.
After -> Ana wrote from [EMAIL], call [PHONE].`,
  },
  hood: {
    paragraphs: [
      'A pattern is a regular expression, a short rule that describes the shape of text. The g flag replaces every match, not only the first.',
      'Patterns miss some PII. A name such as "Ana" looks like any other word, so names need a separate review step.',
      'Placeholders keep the sentence readable. A reader can still see that an email was present, without seeing the address.',
    ],
    example: [
      { label: 'Input', value: '"call 555-123-4567."' },
      { label: 'Pattern for phone', value: 'three digits, dash, three digits, dash, four digits' },
      { label: 'Output', value: '"call [PHONE]."' },
    ],
  },
  mistakes: [
    'Trusting one pattern. A new format, such as "(555) 123 4567", slips through, so test on real samples.',
    'Scrubbing after storage. Copies already in the index keep the original value.',
    'Forgetting names and street addresses. Simple patterns cannot find them, so add a review step.',
  ],
  useWhen: [
    'Documents may contain customer emails, phone numbers, or account numbers.',
    'The text will be sent to a model or stored in a shared index.',
  ],
  skipWhen: [
    'The documents are public manuals with no personal data.',
    'You need the exact value for a lookup. Use a separate, protected store instead.',
  ],
  words: [
    { term: 'PII', meaning: 'Personal information, such as a name, email, or phone number, that identifies a person.' },
    { term: 'Pattern', meaning: 'A rule that describes the shape of a value, such as a phone number.' },
    { term: 'Placeholder', meaning: 'A label that stands in for a removed value, such as [EMAIL].' },
    { term: 'Regular expression', meaning: 'A short rule written in code that matches text by its shape.' },
  ],
};

const chunking: Lesson = {
  slug: 'chunking',
  number: '3.4',
  title: 'Chunking',
  oneLiner: 'Chunking splits a long document into small parts, so each part can be searched and quoted on its own.',
  problem: {
    without: 'A 40-page manual is one search item. Search returns the whole manual, and the model reads far more text than it needs.',
    with: 'Each chunk is a small, self-contained part. Search returns the chunk that answers the question, so the citation is precise.',
  },
  steps: [
    {
      title: 'Natural breaks',
      detail: 'Prefer paragraph and heading breaks. A heading such as "Refund steps" marks a natural start for a chunk.',
    },
    {
      title: 'Size limit',
      detail: 'Pick a maximum size, such as 200 words per chunk. Small chunks are precise, and large chunks keep more context.',
    },
    {
      title: 'Overlap',
      detail: 'Repeat the last 20 words of one chunk at the start of the next. This keeps a sentence that crosses a border whole.',
    },
    {
      title: 'Source record',
      detail: 'Each chunk records its document name and position, such as "faq, chunk 3 of 10". The record is used for citations.',
    },
    {
      title: 'Reading samples',
      detail: 'Print a few chunks and read them. A chunk that ends with "Refunds take" is cut in half, so the size or the overlap needs a change.',
    },
  ],
  diagram: ['Document', 'Split', 'Overlap', 'Chunks'],
  code: {
    source: `// A short help-center text, split into words for this example.
const text = "Refunds take 5 to 7 business days. " +
  "Refunds go to the original card. " +
  "Contact support if the card was closed.";
const words = text.split(" ");

// Split the words into chunks, repeating some words between chunks.
function chunkWords(
  list: string[],
  size: number,
  overlap: number,
): string[] {
  const chunks: string[] = [];
  const step = size - overlap;
  for (let start = 0; start < list.length; start += step) {
    chunks.push(list.slice(start, start + size).join(" "));
    if (start + size >= list.length) break;
  }
  return chunks;
}

// Chunks of 8 words, with 2 words repeated from the last chunk.
const chunks = chunkWords(words, 8, 2);
chunks.forEach((chunk, i) => {
  const count = chunk.split(" ").length;
  console.log("Chunk", i + 1, "has", count, "words:", chunk);
});
`,
    output: `Chunk 1 has 8 words: Refunds take 5 to 7 business days. Refunds
Chunk 2 has 8 words: days. Refunds go to the original card. Contact
Chunk 3 has 8 words: card. Contact support if the card was closed.`,
  },
  hood: {
    paragraphs: [
      'The size here counts words. Real systems often count tokens, because a model limit is set in tokens.',
      'Overlap costs storage. Each repeated word is stored twice, so keep the overlap small.',
      'A chunk may be read alone, so it should name its topic. A chunk that starts with "It takes 3 days" is unclear without the sentence before it.',
    ],
    example: [
      { label: 'Words in the text', value: '20' },
      { label: 'Chunk size and overlap', value: '8 and 2' },
      { label: 'Words between chunk starts', value: '6' },
      { label: 'Chunks produced', value: '3' },
    ],
  },
  mistakes: [
    'Cutting by characters only. A cut in the middle of a word or a number gives a broken chunk.',
    'Using one size for every document. A table and an essay need different sizes, so test each type.',
    'Setting the overlap equal to the size. The chunks then repeat the same text and never move forward.',
  ],
  useWhen: [
    'Documents are longer than a few paragraphs.',
    'Answers must quote a short, exact passage.',
  ],
  skipWhen: [
    'Each document is already a short record, such as one FAQ entry.',
    'The model can read each whole document with room to spare.',
  ],
  words: [
    { term: 'Chunk', meaning: 'A small part of a document, stored and searched on its own.' },
    { term: 'Overlap', meaning: 'Words repeated at the end of one chunk and the start of the next.' },
    { term: 'Size limit', meaning: 'The largest number of words or tokens allowed in one chunk.' },
    { term: 'Citation', meaning: 'A reference to the exact source of a passage.' },
  ],
};

const metadata: Lesson = {
  slug: 'metadata',
  number: '3.5',
  title: 'Metadata',
  oneLiner: 'Metadata is extra data stored with each chunk, such as its source and year, so answers can be filtered.',
  problem: {
    without: 'Chunks are only text. An answer cannot say which manual or version it came from, so the reader cannot check it.',
    with: 'Each chunk carries its source, version, and year. Answers name the source, and old versions can be filtered out.',
  },
  steps: [
    {
      title: 'Fields',
      detail: 'Pick the fields a reader needs, such as the source, the version, and the year. For a manual, the version might be "2.1".',
    },
    {
      title: 'Attaching fields',
      detail: 'Every chunk record gets the fields of its document. A chunk from the 2024 manual stores the year 2024.',
    },
    {
      title: 'Consistent names',
      detail: 'Use one name for each field in every document. "version" should not be "ver" in one file and "release" in another.',
    },
    {
      title: 'Filters',
      detail: 'A filter drops chunks that do not match, such as "year is 2020 or later". It runs before the search ranks the rest. Lesson 4.2 covers filters.',
    },
    {
      title: 'Citations',
      detail: 'Build a citation from the fields, such as "Manual 2.1 (2024)". A reader can then find the passage in the source.',
    },
  ],
  diagram: ['Chunk text', 'Metadata fields', 'Filter', 'Citation'],
  code: {
    source: `// Each chunk record keeps its text and the fields of its document.
type Chunk = { text: string; src: string; year: number };

const chunks: Chunk[] = [
  { text: "Refunds take 5 to 7 days.", src: "2.1", year: 2024 },
  { text: "Refunds take 3 days.", src: "1.0", year: 2019 },
];

// Keep chunks from 2020 or later. This filter runs before search.
const recent = chunks.filter((c) => c.year >= 2020);

// Build a citation from the fields, such as "Manual 2.1 (2024)".
function citation(chunk: Chunk): string {
  return "Manual " + chunk.src + " (" + chunk.year + ")";
}

for (const chunk of recent) {
  console.log(citation(chunk), "->", chunk.text);
}
console.log("Dropped ->", chunks.length - recent.length);
`,
    output: `Manual 2.1 (2024) -> Refunds take 5 to 7 days.
Dropped -> 1`,
  },
  hood: {
    paragraphs: [
      'Metadata sits beside the text, not inside it. The text is what gets embedded, and the fields stay in their own columns.',
      'A filter checks fields with plain comparisons. It needs no model call, so it is fast and exact.',
      'Metadata is only as good as its entry. A wrong year in the record gives a wrong filter result.',
    ],
    example: [
      { label: 'Chunk text', value: '"Refunds take 5 to 7 days."' },
      { label: 'Source field', value: '"2.1"' },
      { label: 'Year field', value: '2024' },
      { label: 'Citation', value: 'Manual 2.1 (2024)' },
    ],
  },
  mistakes: [
    'Storing the source only in the file name. A name is hard to filter reliably, so store it as a field.',
    'Using two names for one field. A filter on "version" then misses chunks stored as "ver".',
    'Adding fields that nobody uses. Each field costs storage and review time, so keep the list short.',
  ],
  useWhen: [
    'Answers must name the source or the version.',
    'Old and new versions of a document both exist in the store.',
  ],
  skipWhen: [
    'Every document is the same kind and version, so nothing needs a filter.',
    'The answer never needs a source, such as a brainstorming tool.',
  ],
  words: [
    { term: 'Metadata', meaning: 'Extra fields stored with a chunk, such as its source or year.' },
    { term: 'Field', meaning: 'One named value in a record, such as year or src.' },
    { term: 'Filter', meaning: 'A test that keeps only the records that match a condition.' },
    { term: 'Citation', meaning: 'A reference that names the source of an answer.' },
  ],
};

const embedAndStore: Lesson = {
  slug: 'embed-and-store',
  number: '3.6',
  title: 'Embed and store',
  oneLiner: 'Embed and store turns each chunk into a vector and saves it, so a repeated load does not add duplicates.',
  problem: {
    without: 'Each run of the loader adds the chunks again. The store fills with copies, and search returns the same passage many times.',
    with: 'Each chunk gets a stable id from its source and position. A second run finds the same id and replaces the row.',
  },
  steps: [
    {
      title: 'Embedding',
      detail: 'Send the chunk text to an embedding model. For example, "Refunds take 5 to 7 days." becomes one list of several hundred numbers.',
    },
    {
      title: 'Stable ids',
      detail: 'Build the id from the source and position, such as "manual-2.1-chunk-3". The same chunk always gets the same id.',
    },
    {
      title: 'Upsert',
      detail: 'An upsert inserts a row, or updates it when the id already exists. A second load of "manual-2.1-chunk-1" replaces its row and adds nothing.',
    },
    {
      title: 'Row contents',
      detail: 'The table holds the id, the text, the metadata, and the vector. A row might hold "2.1" as its source and a vector of 300 numbers.',
    },
    {
      title: 'Index for speed',
      detail: 'An HNSW index lets search skip most rows. With 1,000,000 rows, search then checks a small share of them, at a small cost in accuracy.',
    },
  ],
  diagram: ['Chunk', 'Embedding model', 'Upsert by id', 'Store with index'],
  code: {
    source: `// A fake embedding: letter counts. A real one calls a model.
function fakeEmbed(text: string): number[] {
  const lower = text.toLowerCase();
  const letters = ["a", "e", "o"];
  return letters.map((l) => lower.split(l).length - 1);
}

// The store maps an id to a row. A repeated id replaces the row.
const store = new Map<string, { text: string; vector: number[] }>();

function upsert(id: string, text: string): void {
  store.set(id, { text, vector: fakeEmbed(text) });
}

const chunks = [
  { id: "manual-2.1-chunk-1", text: "Refunds take 5 to 7 days." },
  { id: "manual-2.1-chunk-2", text: "Contact support for a card." },
];

// Load the same chunks twice, as a rerun would.
for (const run of [1, 2]) {
  for (const chunk of chunks) upsert(chunk.id, chunk.text);
  console.log("After run", run, "rows ->", store.size);
}

// Show the stored vector for the first chunk.
const row = store.get(chunks[0].id);
console.log("Vector ->", JSON.stringify(row?.vector));
`,
    output: `After run 1 rows -> 2
After run 2 rows -> 2
Vector -> [2,2,1]`,
  },
  hood: {
    paragraphs: [
      'pgvector is an extension for PostgreSQL that adds a vector column and distance search. This lesson uses a Map, so the code runs without a database.',
      'An HNSW index links each vector to its nearby vectors in a graph. Search walks the graph to close points, so it skips most rows.',
      'Upsert means update or insert. Running the loader again is safe, because the ids stay the same.',
      'Changing the embedding model changes every vector, so the whole store must be rebuilt.',
    ],
    example: [
      { label: 'Rows after run 1', value: '2' },
      { label: 'Rows after run 2', value: '2, because the ids matched' },
      { label: 'Vector for "Refunds take 5 to 7 days."', value: '[2, 2, 1]' },
    ],
  },
  mistakes: [
    'Using random ids. Every run then adds new rows, and the store fills with copies.',
    'Mixing embedding models. Vectors from two models cannot be compared, so rebuild the whole store.',
    'Skipping the index on a large store. Search then compares every row, which gets slow.',
  ],
  useWhen: [
    'You load documents more than once, such as after each update.',
    'You search by meaning and need a store that compares vectors quickly.',
  ],
  skipWhen: [
    'The collection is a few dozen chunks. A simple list is enough.',
    'You never search by similarity, such as when every lookup uses an id.',
  ],
  words: [
    { term: 'Upsert', meaning: 'Insert a row, or update it if its id already exists.' },
    { term: 'Stable id', meaning: 'An id built from the content location, so it is the same on every run.' },
    { term: 'pgvector', meaning: 'An extension that lets PostgreSQL store and compare vectors.' },
    { term: 'HNSW index', meaning: 'A graph index that finds close vectors without comparing every row.' },
  ],
};

export const preparingDocuments: Module = {
  slug: 'preparing-documents',
  number: 3,
  title: 'Preparing documents',
  summary: 'How raw files become small, clean, searchable parts.',
  lessons: [formatDetection, deduplication, piiScrubbing, chunking, metadata, embedAndStore],
};
