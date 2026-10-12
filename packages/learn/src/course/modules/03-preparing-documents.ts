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
      title: 'Files start with fixed bytes',
      detail: 'Many file types start with a fixed pattern of bytes, called a signature. A byte is a number from 0 to 255, written here in hexadecimal. A PDF file starts with 25 50 44 46, which spells "%PDF" in text.',
      visual: {
        kind: 'table',
        caption: 'The first four bytes of three uploaded files.',
        columns: ['File', 'First bytes (hex)', 'Text they show'],
        rows: [
          ['manual.pdf', '25 50 44 46', '%PDF'],
          ['logo.png', '89 50 4E 47', 'one non-text byte, then PNG'],
          ['report.pdf', '52 65 66 75', 'Refu'],
        ],
      },
      snippet: {
        source: `const head = Buffer.from("%PDF-1.7 fake body").subarray(0, 4);
const hex = [...head].map((b) => b.toString(16).toUpperCase());
console.log("Bytes ->", hex.join(" "));
`,
        output: 'Bytes -> 25 50 44 46',
      },
    },
    {
      title: 'The first bytes are compared with known signatures',
      detail: 'The program compares the first bytes of a file with a short list of known signatures. Only the first few bytes are read, so the check is fast. The PNG signature 89 50 4E 47 does not match the PDF signature, so the two files are told apart.',
      visual: {
        kind: 'flow',
        caption: 'The check runs on the first bytes only, not the whole file.',
        nodes: ['First bytes', 'Compare with known list', 'Matching type', 'Reader'],
      },
      snippet: {
        source: `const signatures = [
  { type: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { type: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
];
const head = [0x89, 0x50, 0x4e, 0x47, 0x0d];
const match = signatures.find((s) =>
  s.bytes.every((b, i) => head[i] === b),
);
console.log("Type ->", match?.type ?? "unknown");
`,
        output: 'Type -> png',
      },
    },
    {
      title: 'The name is only a label',
      detail: 'The extension, such as ".pdf", is a label that anyone can set. For "report.pdf", the name says PDF, but the first bytes are plain text with no known signature. The name check then reports that the name and the content do not match. A matching signature does not prove the file is clean, so readers still handle errors.',
      visual: {
        kind: 'compare',
        caption: 'The name and the content of report.pdf disagree.',
        left: { title: 'File name', items: ['report.pdf', 'Name says: pdf'] },
        right: { title: 'First bytes', items: ['Plain text: "Refu"', 'Detected: unknown'] },
      },
      snippet: {
        source: `const name = "report.pdf";
const ext = name.split(".").pop();
// The byte check found no signature for this file.
const detected = "unknown";
const note = detected === ext ? "match" : "no name match";
console.log(ext, "vs", detected, note);
`,
        output: 'pdf vs unknown no name match',
      },
    },
    {
      title: 'Unknown types are not guessed',
      detail: 'A file with no known signature goes to a review list. The program does not guess its type, because a wrong guess can corrupt the text. Plain text has no signature, so it needs a separate check that this lesson skips. Each detected type goes to its own reader, so manual.pdf goes to the PDF reader.',
      visual: {
        kind: 'flow',
        caption: 'The path for a file with no known signature.',
        nodes: ['report.pdf', 'No known signature', 'Review list'],
      },
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
      title: 'Exact copies have the same bytes',
      detail: 'Read each file as raw bytes. Two exact copies of "faq.txt" have the same bytes, so they match. The file "2024.txt" has one different year, so its bytes differ and it does not match.',
      visual: {
        kind: 'table',
        caption: 'Three files, compared with faq.txt.',
        columns: ['File', 'Text', 'Matches faq.txt?'],
        rows: [
          ['faq.txt', 'Refunds take 5 to 7 business days', '-'],
          ['copy.txt', 'Refunds take 5 to 7 business days', 'yes'],
          ['2024.txt', 'Refunds take 5 to 7 days in 2024', 'no'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `const a = "Refunds take 5 to 7 business days";
const b = "Refunds take 5 to 7 business days";
console.log("Same bytes ->", Buffer.from(a).equals(Buffer.from(b)));
`,
        output: 'Same bytes -> true',
      },
    },
    {
      title: 'A fingerprint is a short code',
      detail: 'SHA-256 is a fixed function that turns any text into a 64-character hex code, called a fingerprint. Changing one letter gives a different code. Trimming extra spaces or line breaks first also helps, because those change the bytes.',
      visual: {
        kind: 'compare',
        caption: 'One text and its SHA-256 fingerprint.',
        left: { title: 'Text', items: ['Refunds take 5 to 7 business days'] },
        right: { title: 'Fingerprint', items: ['5d8716d1d17ffb0a', 'Full code: 64 hex characters'] },
      },
      snippet: {
        source: `import { createHash } from "node:crypto";
const code = createHash("sha256")
  .update("Refunds take 5 to 7 business days")
  .digest("hex");
console.log("Length ->", code.length);
console.log("Start ->", code.slice(0, 16));
`,
        output: `Length -> 64
Start -> 5d8716d1d17ffb0a`,
      },
    },
    {
      title: 'Seen codes make the check',
      detail: 'The store keeps each fingerprint with the name of the file that first had it. When a new file arrives, its fingerprint is looked up. If the code is already stored, the new file is a duplicate of the stored name.',
      visual: {
        kind: 'table',
        caption: 'The store after three files. The first 8 characters of each code are shown.',
        columns: ['Fingerprint', 'Stored file', 'Result'],
        rows: [
          ['5d8716d1', 'faq.txt', 'new'],
          ['5d8716d1', 'faq.txt', 'copy.txt is a duplicate'],
          ['0fa05e8b', '2024.txt', 'new'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `import { createHash } from "node:crypto";
const hash = (t: string) =>
  createHash("sha256").update(t).digest("hex").slice(0, 8);
const faq = "Refunds take 5 to 7 business days";
const seen = new Map([[hash(faq), "faq.txt"]]);
const code = hash(faq);
console.log(code, "->", seen.get(code));
`,
        output: '5d8716d1 -> faq.txt',
      },
    },
    {
      title: 'A duplicate is skipped before chunking',
      detail: 'A duplicate is not chunked or embedded again, so the index does not grow. The log records the match, such as "copy.txt is a copy of faq.txt". The check must run before chunking, because each copy would otherwise create its own chunks.',
      visual: {
        kind: 'flow',
        caption: 'A file with a seen fingerprint is logged and skipped.',
        nodes: ['copy.txt', 'Fingerprint seen before', 'Skip and log', 'Not chunked'],
      },
    },
    {
      title: 'Near duplicates share most words',
      detail: 'Near duplicates differ by a few words, such as the year "2024". An exact fingerprint misses them. Word overlap measures the share of words two texts have in common, divided by all distinct words. Here it is 6 shared words out of 9 distinct words, or 0.67. At scale, MinHash keeps a short signature per document, so full texts are not compared in pairs.',
      visual: {
        kind: 'bars',
        caption: 'Word overlap with faq.txt. The copy shares every word.',
        rows: [
          { label: 'copy.txt', value: 1, highlight: true },
          { label: '2024.txt', value: 0.67 },
        ],
      },
      snippet: {
        source: `const words = (t: string) => new Set(t.toLowerCase().split(" "));
const a = words("Refunds take 5 to 7 business days");
const b = words("Refunds take 5 to 7 days in 2024");
const shared = [...a].filter((w) => b.has(w)).length;
const all = new Set([...a, ...b]).size;
console.log("Overlap ->", (shared / all).toFixed(2));
`,
        output: 'Overlap -> 0.67',
      },
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
      title: 'Decide which values count as PII',
      detail: 'PII is personal information that identifies a person. This lesson handles two kinds: email addresses and phone numbers in the 555-123-4567 format. Write the list before any code, so the rules can be reviewed.',
      visual: {
        kind: 'table',
        caption: 'The two kinds handled in this lesson.',
        columns: ['Kind', 'Example', 'Placeholder'],
        rows: [
          ['Email', 'ana.lee@example.com', '[EMAIL]'],
          ['Phone', '555-123-4567', '[PHONE]'],
        ],
      },
    },
    {
      title: 'A pattern describes the shape of a value',
      detail: 'A pattern is a regular expression, a short rule for the shape of text. The phone pattern matches three digits, a dash, three digits, a dash, and four digits. The g flag finds every match in the text, not only the first one.',
      visual: {
        kind: 'chips',
        caption: 'The two values that the patterns find in one ticket.',
        items: [
          { text: 'ana.lee@example.com', note: 'email pattern', highlight: true },
          { text: '555-123-4567', note: 'phone pattern', highlight: true },
        ],
      },
      snippet: {
        source: `const email = /[a-z0-9._]+@[a-z0-9.]+/g;
const phone = /[0-9]{3}-[0-9]{3}-[0-9]{4}/g;
const ticket = "Ana wrote from ana.lee@example.com, " +
  "call 555-123-4567.";
console.log("Emails ->", ticket.match(email));
console.log("Phones ->", ticket.match(phone));
`,
        output: `Emails -> [ 'ana.lee@example.com' ]
Phones -> [ '555-123-4567' ]`,
      },
    },
    {
      title: 'Each match becomes a placeholder',
      detail: 'Each match is replaced with its placeholder, such as [EMAIL]. The sentence keeps its meaning, so a reader can still see that an email was present. These patterns cannot find names, so names need a separate review.',
      visual: {
        kind: 'compare',
        caption: 'The ticket before and after scrubbing.',
        left: { title: 'Before', items: ['Ana wrote from ana.lee@example.com,', 'call 555-123-4567.'] },
        right: { title: 'After', items: ['Ana wrote from [EMAIL],', 'call [PHONE].'] },
      },
      snippet: {
        source: `const pattern = /[a-z0-9._]+@[a-z0-9.]+/g;
const ticket = "Ana wrote from ana.lee@example.com, " +
  "call 555-123-4567.";
console.log(ticket.replace(pattern, "[EMAIL]"));
`,
        output: 'Ana wrote from [EMAIL], call 555-123-4567.',
      },
    },
    {
      title: 'Scrub before anything is stored',
      detail: 'Scrub each document before chunking and embedding. A ticket stored before scrubbing keeps "ana.lee@example.com" in every copy of its chunks. Scrubbing first means the address never reaches the store.',
      visual: {
        kind: 'flow',
        caption: 'Scrubbing sits before the chunks and vectors are made.',
        nodes: ['Document', 'Scrub PII', 'Chunk', 'Embed and store'],
      },
    },
    {
      title: 'Test with known examples',
      detail: 'Keep a small set of texts with known personal values. Run the scrubber on each one and check that every value is replaced. Count the misses, such as 1 phone number left in place out of 20 tests.',
      visual: {
        kind: 'bars',
        caption: 'Replaced values in a test set of 20, with one miss.',
        unit: 'of 20',
        rows: [
          { label: 'Replaced', value: 19, highlight: true },
          { label: 'Missed', value: 1 },
        ],
      },
      snippet: {
        source: `const tests = 20;
const missed = 1;
console.log("Replaced ->", tests - missed, "of", tests);
`,
        output: 'Replaced -> 19 of 20',
      },
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
      title: 'Start chunks at natural breaks',
      detail: 'Prefer paragraph and heading breaks, because they follow the structure the author wrote. A heading such as "Shipping" marks a natural start for a chunk. A cut at a fixed count can land in the middle of a sentence.',
      visual: {
        kind: 'compare',
        caption: 'Two ways to cut the same document.',
        left: { title: 'Cut at a fixed count', items: ['Can land mid-sentence', 'A chunk may mix two topics'] },
        right: { title: 'Cut at a heading', items: ['Each chunk starts at a natural break', 'A chunk stays on one topic'] },
      },
    },
    {
      title: 'Set a size limit',
      detail: 'Pick a maximum size. This example counts words, and the limit is 8 words per chunk. Real systems often count tokens, because model limits are set in tokens. Smaller chunks give more precise matches, and larger chunks keep more context.',
      visual: {
        kind: 'table',
        caption: 'The number of chunks made from the same 20 words, with two settings.',
        columns: ['Size and overlap', 'Chunks from 20 words', 'Words per chunk'],
        rows: [
          ['8 and 2', '3', '8'],
          ['4 and 0', '5', '4'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const words = 20;
const size = 8;
const overlap = 2;
const step = size - overlap;
const count = Math.ceil((words - overlap) / step);
console.log("Chunks ->", count);
`,
        output: 'Chunks -> 3',
      },
    },
    {
      title: 'Overlap keeps a sentence whole',
      detail: 'Repeat the last 2 words of one chunk at the start of the next. Here chunk 2 starts with "days. Refunds", so a sentence at the border stays whole. Overlap costs storage, because each repeated word is stored twice.',
      visual: {
        kind: 'chips',
        caption: 'The last two words of chunk 1 repeat at the start of chunk 2.',
        items: [
          { text: 'Chunk 1: Refunds take 5 to 7 business days. Refunds', note: '8 words' },
          { text: 'Chunk 2: days. Refunds go to the original card. Contact', note: '8 words', highlight: true },
        ],
      },
      snippet: {
        source: `const text = "Refunds take 5 to 7 business days. " +
  "Refunds go to the original card.";
const words = text.split(" ");
const size = 8;
const overlap = 2;
const second = words.slice(size - overlap, size * 2 - overlap);
console.log(second.join(" "));
`,
        output: 'days. Refunds go to the original card.',
      },
    },
    {
      title: 'Each chunk records its position',
      detail: 'Each chunk stores its document name and position, such as "faq, chunk 3 of 3". The record is used for citations, so an answer can name the exact part of the source. A chunk that starts with "It takes 3 days" is unclear alone, so each chunk should name its topic.',
      visual: {
        kind: 'table',
        caption: 'Three chunks from the example text, with their position records.',
        columns: ['Chunk', 'Position record', 'Starts with', 'Words'],
        rows: [
          ['1', 'faq, chunk 1 of 3', 'Refunds take', '8'],
          ['2', 'faq, chunk 2 of 3', 'days. Refunds', '8'],
          ['3', 'faq, chunk 3 of 3', 'card. Contact', '8'],
        ],
        highlightRow: 2,
      },
      snippet: {
        source: `const doc = "faq";
const total = 3;
const record = doc + ", chunk 3 of " + total;
console.log(record);
`,
        output: 'faq, chunk 3 of 3',
      },
    },
    {
      title: 'Read sample chunks alone',
      detail: 'Print a few chunks and read each one as if it were the only text. A chunk that ends with "Refunds take" is cut in half, so the size or the overlap needs a change. Check the samples again after each change.',
      visual: {
        kind: 'flow',
        caption: 'The check that catches a bad cut.',
        nodes: ['Print chunks', 'Read each one alone', 'Cut in half?', 'Change size or overlap'],
      },
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
      title: 'Metadata sits beside the text',
      detail: 'Metadata is extra data stored beside each chunk, such as its source, version, and year. The text is what gets embedded, and the fields stay in their own columns. For a manual, the version might be "2.1".',
      visual: {
        kind: 'table',
        caption: 'Two chunks, each with its text and two metadata fields.',
        columns: ['Chunk text', 'src', 'year'],
        rows: [
          ['Refunds take 5 to 7 days.', '2.1', '2024'],
          ['Refunds take 3 days.', '1.0', '2019'],
        ],
      },
      snippet: {
        source: `type Chunk = { text: string; src: string; year: number };
const chunk: Chunk = {
  text: "Refunds take 5 to 7 days.", src: "2.1", year: 2024,
};
console.log("Year ->", chunk.year);
`,
        output: 'Year -> 2024',
      },
    },
    {
      title: 'Fields come from the document',
      detail: 'Every chunk record gets the fields of the document it came from. A chunk from the 2024 manual stores the year 2024. A wrong year in the record gives a wrong filter result, so check the fields when a document is added.',
      visual: {
        kind: 'compare',
        caption: 'One document and the records of its chunks.',
        left: { title: 'Document', items: ['Manual 2.1', 'Year 2024'] },
        right: { title: 'Chunk records', items: ['Chunk 1: src 2.1, year 2024', 'Chunk 2: src 2.1, year 2024'] },
      },
    },
    {
      title: 'Use one name for each field',
      detail: 'Use one name for each field in every document. "version" should not be "ver" in one file and "release" in another. A filter on "version" misses any chunk stored under a different name.',
      visual: {
        kind: 'chips',
        caption: 'Three names for one field. Only the first one matches the filter.',
        items: [
          { text: 'version', note: 'matched by the filter', highlight: true },
          { text: 'ver', note: 'missed' },
          { text: 'release', note: 'missed' },
        ],
      },
      snippet: {
        source: `const fields = ["version", "ver", "release"];
const filterKey = "version";
const matches = fields.filter((f) => f === filterKey);
console.log("Matches ->", matches.length, "of", fields.length);
`,
        output: 'Matches -> 1 of 3',
      },
    },
    {
      title: 'A filter drops chunks before ranking',
      detail: 'A filter keeps only the chunks that match a condition, such as "year is 2020 or later". It is a plain comparison, so it needs no model call and gives an exact result. In the example, the 2019 chunk is dropped and one chunk remains. Lesson 4.2 covers filters in search.',
      visual: {
        kind: 'bars',
        caption: 'Chunks before and after the year filter.',
        unit: 'chunks',
        rows: [
          { label: 'Before filter', value: 2 },
          { label: 'After filter', value: 1, highlight: true },
        ],
      },
      snippet: {
        source: `const years = [2024, 2019];
const kept = years.filter((y) => y >= 2020);
console.log("Kept ->", kept.join(", "));
`,
        output: 'Kept -> 2024',
      },
    },
    {
      title: 'Build a citation from the fields',
      detail: 'A citation is built from the fields, such as "Manual 2.1 (2024)". A reader can then find the passage in the named source. An answer with no citation gives the reader nothing to check.',
      visual: {
        kind: 'flow',
        caption: 'The fields of one chunk become its citation.',
        nodes: ['Chunk text', 'Fields: src 2.1, year 2024', 'Citation: Manual 2.1 (2024)'],
      },
      snippet: {
        source: `const src = "2.1";
const year = 2024;
console.log("Manual " + src + " (" + year + ")");
`,
        output: 'Manual 2.1 (2024)',
      },
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
      title: 'Embedding turns text into a list',
      detail: 'The chunk text goes to an embedding model, which returns a list of numbers. Real models return hundreds of numbers. This lesson uses a fake embedding that counts the letters a, e, and o. Changing the model changes every vector, so the whole store must be rebuilt.',
      visual: {
        kind: 'chips',
        caption: 'The fake embedding of "Refunds take 5 to 7 days.", one count per letter.',
        items: [
          { text: 'a', note: '2' },
          { text: 'e', note: '2' },
          { text: 'o', note: '1' },
        ],
      },
      snippet: {
        source: `const text = "Refunds take 5 to 7 days.".toLowerCase();
const counts = ["a", "e", "o"].map((l) => text.split(l).length - 1);
console.log("Vector ->", JSON.stringify(counts));
`,
        output: 'Vector -> [2,2,1]',
      },
    },
    {
      title: 'Stable ids come from the location',
      detail: 'The id is built from the source and the position, such as "manual-2.1-chunk-1". The same chunk always gets the same id, on every run. A random id would be new each time, so each run would add a new row.',
      visual: {
        kind: 'table',
        caption: 'What a second load does with each kind of id.',
        columns: ['Id type', 'Example', 'Result on a second load'],
        rows: [
          ['Stable', 'manual-2.1-chunk-1', 'Replaces the same row'],
          ['Random', 'a new value each run', 'Adds a new row'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const stableId = (src: string, pos: number) =>
  "manual-" + src + "-chunk-" + pos;
console.log(stableId("2.1", 1));
`,
        output: 'manual-2.1-chunk-1',
      },
    },
    {
      title: 'An upsert replaces a repeated row',
      detail: 'An upsert inserts a row, or updates it when the id already exists. A second load of "manual-2.1-chunk-1" replaces its row and adds nothing. After two loads of the two chunks, the store still holds two rows.',
      visual: {
        kind: 'bars',
        caption: 'Rows in the store after each load of the same two chunks.',
        unit: 'rows',
        rows: [
          { label: 'After load 1', value: 2 },
          { label: 'After load 2', value: 2, highlight: true },
        ],
      },
      snippet: {
        source: `const store = new Map<string, string>();
const load = (id: string, text: string) => store.set(id, text);
load("manual-2.1-chunk-1", "Refunds take 5 to 7 days.");
load("manual-2.1-chunk-1", "Refunds take 5 to 7 days.");
console.log("Rows ->", store.size);
`,
        output: 'Rows -> 1',
      },
    },
    {
      title: 'Each row holds text, metadata, and a vector',
      detail: 'The table holds the id, the text, the metadata, and the vector. In a real project the table is often PostgreSQL with pgvector, an extension for vector columns. This lesson uses a Map, so the code runs without a database.',
      visual: {
        kind: 'table',
        caption: 'One row for the first chunk.',
        columns: ['Column', 'Value'],
        rows: [
          ['id', 'manual-2.1-chunk-1'],
          ['text', 'Refunds take 5 to 7 days.'],
          ['src', '2.1'],
          ['vector', '[2, 2, 1]'],
        ],
      },
    },
    {
      title: 'An index keeps search fast',
      detail: 'Without an index, search compares the query with every row. An HNSW index links each vector to nearby vectors, so search can skip most rows. With 1,000,000 rows, search checks a small share of them, at a small cost in accuracy.',
      visual: {
        kind: 'chips',
        caption: 'How much of the store a search compares.',
        items: [
          { text: 'Without an index', note: 'every row' },
          { text: 'With an HNSW index', note: 'a small share of rows', highlight: true },
        ],
      },
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
