import type { Lesson, Module } from '../types';

const vectorSearch: Lesson = {
  slug: 'vector-search',
  number: '4.1',
  title: 'Vector search',
  oneLiner: 'Vector search turns the question into numbers and ranks every chunk by how close its numbers are.',
  problem: {
    without: 'A keyword search needs the same words. A question about "money back" finds nothing in a chunk that says "refund".',
    with: 'Each chunk and the question become lists of numbers. The search ranks chunks by how close their lists are, so "money back" finds "refund".',
  },
  steps: [
    {
      title: 'Each chunk is stored with a vector',
      detail: 'A vector is a list of numbers that stands for the meaning of a chunk. Each chunk gets its vector once, when the documents are loaded. The example has three chunks, and each vector has three numbers.',
      visual: {
        kind: 'table',
        caption: 'The three FAQ chunks and their vectors, as stored before any question arrives.',
        columns: ['Chunk', 'Vector'],
        rows: [
          ['Refunds take 5 to 7 days.', '0.9, 0.1, 0'],
          ['Use Forgot password to reset.', '0, 0.9, 0.2'],
          ['Orders ship in 2 days.', '0.1, 0.1, 0.9'],
        ],
      },
      snippet: {
        source: `// Three chunks, each with the vector stored at load time.
const chunks = [
  { text: "Refunds take 5 to 7 days.", vector: [0.9, 0.1, 0] },
  { text: "Use Forgot password to reset.", vector: [0, 0.9, 0.2] },
  { text: "Orders ship in 2 days.", vector: [0.1, 0.1, 0.9] },
];
for (const c of chunks) console.log(c.vector, c.text);
`,
        output: `[ 0.9, 0.1, 0 ] Refunds take 5 to 7 days.
[ 0, 0.9, 0.2 ] Use Forgot password to reset.
[ 0.1, 0.1, 0.9 ] Orders ship in 2 days.`,
      },
    },
    {
      title: 'The question gets a vector the same way',
      detail: 'The question goes through the same embedding process at search time. The words "money back" become the vector 0.85, 0.15, and 0 in this example. The plot puts each vector at its first number on the x axis and its second on the y axis.',
      visual: {
        kind: 'points',
        caption: 'Each chunk and the question, plotted by their first two numbers. The question sits closest to the refund chunk.',
        points: [
          { label: 'Refunds', x: 0.9, y: 0.1 },
          { label: 'Password', x: 0, y: 0.9 },
          { label: 'Orders', x: 0.1, y: 0.1 },
          { label: 'Question', x: 0.85, y: 0.15, highlight: true },
        ],
      },
    },
    {
      title: 'The dot product scores each chunk',
      detail: 'The dot product multiplies matching numbers in the two lists, then adds the products. For the refund chunk it is 0.85 times 0.9, plus 0.15 times 0.1, plus 0 times 0, which is 0.78. The password chunk scores 0.14 and the orders chunk scores 0.10.',
      visual: {
        kind: 'bars',
        caption: 'Scores for the question "money back", one bar per chunk. A higher score means a closer match.',
        rows: [
          { label: 'Refunds', value: 0.78, highlight: true },
          { label: 'Password', value: 0.14 },
          { label: 'Orders', value: 0.1 },
        ],
      },
      snippet: {
        source: `// Multiply matching numbers, then add the products.
function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}
const question = [0.85, 0.15, 0];
const refund = [0.9, 0.1, 0];
console.log(dot(question, refund).toFixed(2));
`,
        output: `0.78`,
      },
    },
    {
      title: 'Sort the scores and keep the top k',
      detail: 'Sort the scores from high to low, then keep the first k of them. With k set to 2, the refund chunk and the password chunk come back. The orders chunk, at 0.10, is dropped.',
      visual: {
        kind: 'chips',
        caption: 'Results for "money back" with k set to 2. The highlighted chunks are returned.',
        items: [
          { text: 'Refunds take 5 to 7 days.', note: '0.78, returned', highlight: true },
          { text: 'Use Forgot password to reset.', note: '0.14, returned', highlight: true },
          { text: 'Orders ship in 2 days.', note: '0.10, dropped' },
        ],
      },
      snippet: {
        source: `// Sort the scores from high to low, then keep k.
const scored = [
  { text: "Refunds take 5 to 7 days.", score: 0.78 },
  { text: "Use Forgot password to reset.", score: 0.14 },
  { text: "Orders ship in 2 days.", score: 0.1 },
];
const k = 2;
const top = scored.sort((a, b) => b.score - a.score).slice(0, k);
console.log(top.map((t) => t.text));
`,
        output: `[ 'Refunds take 5 to 7 days.', 'Use Forgot password to reset.' ]`,
      },
    },
    {
      title: 'Weak matches still come back',
      detail: 'A question with no good match still gets k chunks. The question "gift cards" has the vector 0, 0, and 0.1 in this example. The best score is only 0.09, so the results are weak, yet two chunks still come back. Real systems use a vector index to skip most chunks, but this example scores every chunk.',
      visual: {
        kind: 'bars',
        caption: 'Scores for "gift cards". No chunk is about gift cards, and the top score is only 0.09.',
        rows: [
          { label: 'Orders', value: 0.09 },
          { label: 'Password', value: 0.02 },
          { label: 'Refunds', value: 0 },
        ],
      },
    },
  ],
  diagram: ['Question', 'Embed', 'Score each chunk', 'Top k'],
  code: {
    source: `// Chunks of a help-center FAQ, each with a toy embedding.
const chunks = [
  { text: "Refunds take 5 to 7 days.", vector: [0.9, 0.1, 0] },
  { text: "Use Forgot password to reset.", vector: [0, 0.9, 0.2] },
  { text: "Orders ship in 2 days.", vector: [0.1, 0.1, 0.9] },
];

// Dot product. For unit-length vectors it equals cosine.
function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

// Score every chunk and return the top k, best first.
function vectorSearch(query: number[], k: number) {
  return chunks
    .map((c) => ({ text: c.text, score: dot(query, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// A fake model turned "money back" and "gift cards" into vectors.
const queries = [[0.85, 0.15, 0], [0, 0, 0.1]];
for (const query of queries) {
  for (const hit of vectorSearch(query, 2)) {
    console.log(hit.score.toFixed(2), hit.text);
  }
  console.log("---");
}
`,
    output: `0.78 Refunds take 5 to 7 days.
0.14 Use Forgot password to reset.
---
0.09 Orders ship in 2 days.
0.02 Use Forgot password to reset.
---`,
  },
  mistakes: [
    'Assuming a high score proves the answer is right. The score only shows how close two lists are.',
    'Comparing vectors from two different models. Their numbers do not line up, so the scores mean nothing.',
    'Setting k too low. The right chunk may rank third and never reach the model.',
  ],
  useWhen: [
    'Users ask in words that differ from the document, such as "money back" for "refund".',
    'The documents are short and mostly prose, such as help articles or manuals.',
  ],
  skipWhen: [
    'The question names an exact code, such as an order number. Use an exact lookup or keyword search.',
    'The answer depends on an exact field, such as a version number. Use a metadata filter first (lesson 4.2).',
  ],
  words: [
    { term: 'Chunk', meaning: 'A small part of a document, stored and searched on its own.' },
    { term: 'Score', meaning: 'A number that shows how well a chunk matches the question.' },
    { term: 'Dot product', meaning: 'Multiply matching numbers in two lists, then add the products.' },
    { term: 'Top k', meaning: 'The k highest-scoring results, where k is a number you choose.' },
  ],
};

const metadataFilters: Lesson = {
  slug: 'metadata-filters',
  number: '4.2',
  title: 'Metadata filters',
  oneLiner: 'A metadata filter removes chunks by their labels before the search scores them.',
  problem: {
    without: 'The search ranks an old 3-second reset article above the current 10-second one. Both chunks match the question well.',
    with: 'Each chunk carries labels, such as its version. The search skips chunks whose labels do not match, so only current answers come back.',
  },
  steps: [
    {
      title: 'Each chunk is stored with labels',
      detail: 'Metadata is a set of labels saved with each chunk when it is loaded. The version label says which edition of the manual the text came from. Each label must be set before any question arrives.',
      visual: {
        kind: 'table',
        caption: 'Three chunks from a device manual. Two editions are mixed in one set.',
        columns: ['Chunk', 'Version', 'Vector'],
        rows: [
          ['Hold 10 seconds.', '2', '0.9, 0.1'],
          ['Hold 3 seconds.', '1', '0.95, 0.05'],
          ['Hold the power key.', '2', '0.8, 0.2'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `// Each chunk carries its text and a version label.
const chunks = [
  { text: "Hold 10 seconds.", version: 2 },
  { text: "Hold 3 seconds.", version: 1 },
  { text: "Hold the power key.", version: 2 },
];
for (const c of chunks) console.log(c.version, c.text);
`,
        output: `2 Hold 10 seconds.
1 Hold 3 seconds.
2 Hold the power key.`,
      },
    },
    {
      title: 'A filter drops chunks before scoring',
      detail: 'A filter is a test on a label, such as version equal to 2. Chunks that fail the test are removed before any scoring happens. The version 1 chunk fails, so it is never scored and cannot rank first.',
      visual: {
        kind: 'chips',
        caption: 'The three chunks after the version 2 filter. The version 1 chunk is dropped.',
        items: [
          { text: 'Hold 10 seconds.', note: 'version 2, kept', highlight: true },
          { text: 'Hold 3 seconds.', note: 'version 1, dropped' },
          { text: 'Hold the power key.', note: 'version 2, kept', highlight: true },
        ],
      },
      snippet: {
        source: `// Keep only the chunks whose version label is 2.
const chunks = [
  { text: "Hold 10 seconds.", version: 2 },
  { text: "Hold 3 seconds.", version: 1 },
  { text: "Hold the power key.", version: 2 },
];
const kept = chunks.filter((c) => c.version === 2);
console.log(kept.length, "of", chunks.length, "kept");
`,
        output: `2 of 3 kept`,
      },
    },
    {
      title: 'Scores decide the order of what is left',
      detail: 'Each kept chunk is scored with a dot product against the question vector, 0.9 and 0.1. Without the filter, the old 3-second chunk scores 0.86 and ranks first. With the filter, the current 10-second chunk scores 0.82 and ranks first.',
      visual: {
        kind: 'compare',
        caption: 'The ranking for the same question, with and without the version 2 filter.',
        left: { title: 'No filter', items: ['Hold 3 seconds. (0.86)', 'Hold 10 seconds. (0.82)', 'Hold the power key. (0.74)'] },
        right: { title: 'Version 2 only', items: ['Hold 10 seconds. (0.82)', 'Hold the power key. (0.74)'] },
      },
      snippet: {
        source: `// Dot product of the question with a chunk vector.
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
const question = [0.9, 0.1];
const old = dot(question, [0.95, 0.05]).toFixed(2);
console.log("Old 3 seconds:", old);
const current = dot(question, [0.9, 0.1]).toFixed(2);
console.log("Current 10 seconds:", current);
`,
        output: `Old 3 seconds: 0.86
Current 10 seconds: 0.82`,
      },
    },
    {
      title: 'Labels must match exactly',
      detail: 'The filter compares labels with exact equality. A label typed as "Version 2" fails a test for the number 2. A chunk with no version label fails every version test, so check labels when the documents are loaded.',
      visual: {
        kind: 'compare',
        caption: 'Which labels pass a version 2 test and which fail.',
        left: { title: 'Passes', items: ['version = 2, a number', 'Label set by the loader'] },
        right: { title: 'Fails', items: ['version = "Version 2", text not a number', 'No version label at all'] },
      },
      snippet: {
        source: `// A chunk loaded with no version label at all.
const chunk: { text: string; version?: number } = {
  text: "Hold the power key.",
};
console.log("Passes version 2:", chunk.version === 2);
`,
        output: `Passes version 2: false`,
      },
    },
  ],
  diagram: ['Labeled chunks', 'Filter', 'Score', 'Top k'],
  code: {
    source: `// Each chunk has a vector and labels, called metadata.
const chunks = [
  { text: "Hold 10 seconds.", version: 2, vec: [0.9, 0.1] },
  { text: "Hold 3 seconds.", version: 1, vec: [0.95, 0.05] },
  { text: "Hold the power key.", version: 2, vec: [0.8, 0.2] },
];

// Dot product of two vectors.
function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

// Keep chunks with the wanted version, then rank by score.
function search(query: number[], version?: number) {
  return chunks
    .filter((c) => version === undefined || c.version === version)
    .map((c) => ({ text: c.text, score: dot(query, c.vec) }))
    .sort((a, b) => b.score - a.score);
}

// Without a filter, the old version ranks first.
console.log("No filter:");
for (const hit of search([0.9, 0.1])) console.log(hit.text);

// With the filter, only version 2 is searched.
console.log("Filter version 2:");
for (const hit of search([0.9, 0.1], 2)) console.log(hit.text);
`,
    output: `No filter:
Hold 3 seconds.
Hold 10 seconds.
Hold the power key.
Filter version 2:
Hold 10 seconds.
Hold the power key.`,
  },
  mistakes: [
    'Filtering on a label that was never set. Every chunk fails the filter, and the answer is empty.',
    'Filtering too hard. A question that names no version still needs the chunks of every version.',
    'Writing the label inside the text instead of in the metadata. The filter cannot read a label inside a sentence.',
  ],
  useWhen: [
    'Two chunks say the same thing, but one of them is outdated.',
    'Answers depend on a field, such as a product line, a region, or a date.',
  ],
  skipWhen: [
    'The filter would remove the right answer. Test the filter with a question first.',
    'The label is not known when the question arrives. A filter needs a value to test.',
  ],
  words: [
    { term: 'Metadata', meaning: 'Labels stored with a chunk, such as its version or source.' },
    { term: 'Filter', meaning: 'A test that keeps or drops each chunk before the search runs.' },
    { term: 'Equality', meaning: 'A test that passes only when two values are the same.' },
    { term: 'Edition', meaning: 'One version of a document, such as the 2019 or the 2024 release.' },
  ],
};

const keywordSearch: Lesson = {
  slug: 'keyword-search',
  number: '4.3',
  title: 'Keyword search',
  oneLiner: 'Keyword search ranks chunks by the words they share with the question, with rare words counting most.',
  problem: {
    without: 'Vector search reads meaning. A chunk with an exact product code can rank below a chunk with a similar meaning.',
    with: 'Keyword search counts exact words. A chunk with the rare word "form" and the word "refund" ranks above chunks that share only common words.',
  },
  steps: [
    {
      title: 'The index splits each chunk into words',
      detail: 'A real index stores each word with the chunks that hold it. This example splits each chunk on spaces and scans every chunk for a match. The table shows how many words each of the four FAQ chunks has.',
      visual: {
        kind: 'table',
        caption: 'Four FAQ chunks and their word counts.',
        columns: ['Chunk', 'Words'],
        rows: [
          ['refund the order within 7 days', '6'],
          ['reset the password from sign-in', '5'],
          ['the refund form is on the account page', '8'],
          ['orders ship in 2 business days', '6'],
        ],
        highlightRow: 2,
      },
      snippet: {
        source: `// Split each chunk on spaces and count its words.
const chunks = [
  "refund the order within 7 days",
  "reset the password from sign-in",
  "the refund form is on the account page",
  "orders ship in 2 business days",
];
for (const text of chunks) {
  console.log(text.split(" ").length, text);
}
`,
        output: `6 refund the order within 7 days
5 reset the password from sign-in
8 the refund form is on the account page
6 orders ship in 2 business days`,
      },
    },
    {
      title: 'Rare words weigh more',
      detail: 'Each query word gets a weight from the number of chunks that contain it. "Refund" appears in 2 of the 4 chunks, so its weight is 0.69. "Form" appears in only 1 chunk, so its weight is the higher 1.20. The common word "the" appears in 3 chunks and gets only 0.36.',
      visual: {
        kind: 'bars',
        caption: 'Weight of each word. A word found in fewer chunks gets a larger weight.',
        rows: [
          { label: 'form', value: 1.2, highlight: true },
          { label: 'refund', value: 0.69 },
          { label: 'the', value: 0.36 },
        ],
      },
      snippet: {
        source: `// N is the number of chunks. n is how many contain the word.
const N = 4;
const idf = (n: number) => Math.log((N - n + 0.5) / (n + 0.5) + 1);
console.log("form", idf(1).toFixed(2));
console.log("refund", idf(2).toFixed(2));
console.log("the", idf(3).toFixed(2));
`,
        output: `form 1.20
refund 0.69
the 0.36`,
      },
    },
    {
      title: 'Length and repeats change the points',
      detail: 'Each word score is divided by a length term, so a longer chunk gets fewer points. The term is 2.5 for a 6-word chunk and 2.875 for an 8-word chunk. The constant k1, set to 1.5, limits how fast repeated words add points.',
      visual: {
        kind: 'compare',
        caption: 'The same hit for "refund" in two chunks of different length.',
        left: { title: '6-word chunk', items: ['Length term: 2.5', 'Score for refund: 0.69'] },
        right: { title: '8-word chunk', items: ['Length term: 2.875', 'Score for refund: 0.60'] },
      },
      snippet: {
        source: `// Denominator for one hit, by chunk length in words.
const k1 = 1.5;
const lengthTerm = (len: number) => 0.25 + 0.125 * len;
const part = (len: number) => 1 + k1 * lengthTerm(len);
console.log(part(6), part(8));
`,
        output: `2.5 2.875`,
      },
    },
    {
      title: 'Ranking the query "refund form"',
      detail: 'Each chunk gets the sum of its scores for the query words. The chunk with both words, "the refund form is on the account page", scores 1.65. The chunk about the refund order scores 0.69 from refund alone. The two chunks with neither word score 0.00.',
      visual: {
        kind: 'bars',
        caption: 'Keyword scores for the query "refund form", highest first.',
        rows: [
          { label: 'Refund form page', value: 1.65, highlight: true },
          { label: 'Refund order 7 days', value: 0.69 },
          { label: 'Password reset', value: 0 },
          { label: 'Order shipping', value: 0 },
        ],
      },
    },
  ],
  code: {
    source: `// Chunks of a FAQ, each split into lowercase words.
const chunks = [
  "refund the order within 7 days",
  "reset the password from sign-in",
  "the refund form is on the account page",
  "orders ship in 2 business days",
];
const words = chunks.map((text) => text.split(" "));

// Score one chunk for a query with BM25, a common keyword rule.
function bm25(query: string[], chunk: string[]): number {
  const k1 = 1.5;
  let score = 0;
  for (const term of query) {
    const count = chunk.filter((w) => w === term).length;
    if (count === 0) continue;
    const n = words.filter((w) => w.includes(term)).length;
    const idf = Math.log((chunks.length - n + 0.5) / (n + 0.5) + 1);
    const part = count + k1 * (0.25 + 0.125 * chunk.length);
    score += (idf * count * (k1 + 1)) / part;
  }
  return score;
}

// Rank every chunk for the query "refund form".
const query = ["refund", "form"];
const ranked = chunks
  .map((text, i) => ({ text, score: bm25(query, words[i]) }))
  .sort((a, b) => b.score - a.score);
for (const r of ranked) console.log(r.score.toFixed(2), r.text);
`,
    output: `1.65 the refund form is on the account page
0.69 refund the order within 7 days
0.00 reset the password from sign-in
0.00 orders ship in 2 business days`,
  },
  mistakes: [
    'Expecting a synonym match. "Money back" does not match "refund" because the words differ.',
    'Forgetting to lowercase the text. "Refund" and "refund" are different words unless both are lowercased.',
    'Using keyword search alone for questions about meaning. Pair it with vector search (lesson 4.4).',
  ],
  useWhen: [
    'The question contains a name, a code, or a rare term that must match exactly.',
    'The documents use the same wording as the users, such as a product manual.',
  ],
  skipWhen: [
    'Users write in other words than the documents, such as "money back" for "refund".',
    'The content has no words to split, such as images or audio.',
  ],
  words: [
    { term: 'Term', meaning: 'A word from the question or from a chunk.' },
    { term: 'Inverse document frequency', meaning: 'A weight that is larger for words that appear in fewer chunks.' },
    { term: 'BM25', meaning: 'A common keyword scoring rule that uses word weights and a length limit.' },
    { term: 'Index', meaning: 'A stored structure that makes lookups fast.' },
  ],
};

const hybridSearch: Lesson = {
  slug: 'hybrid-search',
  number: '4.4',
  title: 'Hybrid search and RRF',
  oneLiner: 'Hybrid search runs vector and keyword search, then merges their ranked lists with reciprocal rank fusion.',
  problem: {
    without: 'Vector search can miss exact codes. Keyword search misses synonyms. Each search alone fails on some questions.',
    with: 'Both searches run on the same question. Reciprocal rank fusion (RRF) combines their ranks, so a chunk that either search ranks high rises.',
  },
  steps: [
    {
      title: 'Both searches read the same question',
      detail: 'Vector search and keyword search each run on the same question. Each returns a list ordered from best to worst, where rank 1 is the best. The two searches can run at the same time, so the wait is the slower one.',
      visual: {
        kind: 'table',
        caption: 'The top three chunks from each search for one question.',
        columns: ['Rank', 'Vector search', 'Keyword search'],
        rows: [
          ['1', 'refund-guide', 'refund-form'],
          ['2', 'order-page', 'refund-guide'],
          ['3', 'refund-form', 'faq'],
        ],
      },
      snippet: {
        source: `// Two ranked lists for one question, best first.
const vectorRanking = ["refund-guide", "order-page", "refund-form"];
const keywordRanking = ["refund-form", "refund-guide", "faq"];
console.log("Vector rank 1:", vectorRanking[0]);
console.log("Keyword rank 1:", keywordRanking[0]);
`,
        output: `Vector rank 1: refund-guide
Keyword rank 1: refund-form`,
      },
    },
    {
      title: 'Raw scores cannot be added',
      detail: 'A vector score of 0.78 and a keyword score of 1.65 use different scales. Adding them has no fair meaning, because each scale comes from its own formula. Only the rank of each chunk in each list is used.',
      visual: {
        kind: 'compare',
        caption: 'Two ways to combine the two lists.',
        left: { title: 'Raw scores', items: ['Vector score: 0.78 for one chunk', 'Keyword score: 1.65 for one chunk', 'Different scales, so no fair sum'] },
        right: { title: 'Ranks', items: ['Rank 1 means best in that list', 'Rank 3 means third in that list', 'Ranks from both lists can be combined'] },
      },
    },
    {
      title: 'Each rank becomes a small score',
      detail: 'RRF gives a chunk 1 divided by (60 plus its rank) for each list that contains it. Rank 1 gives 1/61, which is 0.0164, and rank 3 gives 1/63, which is 0.0159. The constant 60 is a common choice, and it keeps the top ranks from dominating the sum.',
      visual: {
        kind: 'bars',
        caption: 'RRF score for one list, by rank. The gap between ranks is small, so no single list dominates.',
        rows: [
          { label: 'Rank 1', value: 0.0164, highlight: true },
          { label: 'Rank 2', value: 0.0161 },
          { label: 'Rank 3', value: 0.0159 },
        ],
      },
      snippet: {
        source: `// RRF gives a rank score of 1 / (60 + rank).
for (const rank of [1, 2, 3]) {
  console.log("Rank", rank, (1 / (60 + rank)).toFixed(4));
}
`,
        output: `Rank 1 0.0164
Rank 2 0.0161
Rank 3 0.0159`,
      },
    },
    {
      title: 'A chunk in both lists adds two scores',
      detail: 'refund-guide is rank 1 in the vector list and rank 2 in the keyword list. Its total is 1/61 plus 1/62, which is 0.0325. The refund-form chunk is rank 3 and rank 1, so its total is 0.0323.',
      visual: {
        kind: 'table',
        caption: 'The rank scores added for the two chunks that both searches found.',
        columns: ['Chunk', 'Vector list', 'Keyword list', 'Total'],
        rows: [
          ['refund-guide', '0.0164 (rank 1)', '0.0161 (rank 2)', '0.0325'],
          ['refund-form', '0.0159 (rank 3)', '0.0164 (rank 1)', '0.0323'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `// refund-guide is rank 1 in one list and rank 2 in the other.
const total = 1 / (60 + 1) + 1 / (60 + 2);
console.log(total.toFixed(4));
`,
        output: `0.0325`,
      },
    },
    {
      title: 'The fused order',
      detail: 'The totals are sorted from high to low. The final order is refund-guide, refund-form, order-page, and faq last. A chunk found by only one search still appears, but its total is smaller.',
      visual: {
        kind: 'bars',
        caption: 'Fused totals in the final order. order-page and faq appear in only one list.',
        rows: [
          { label: 'refund-guide', value: 0.0325, highlight: true },
          { label: 'refund-form', value: 0.0323 },
          { label: 'order-page', value: 0.0161 },
          { label: 'faq', value: 0.0159 },
        ],
      },
    },
  ],
  diagram: ['Question', 'Vector list', 'Keyword list', 'RRF', 'Final order'],
  code: {
    source: `// Two ranked lists for one question, best first.
// One comes from vector search, the other from keyword search.
const vectorRanking = ["refund-guide", "order-page", "refund-form"];
const keywordRanking = ["refund-form", "refund-guide", "faq"];

// Reciprocal rank fusion: each list adds 1 / (60 + rank).
function fuse(rankings: string[][]) {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      const previous = scores.get(id) ?? 0;
      scores.set(id, previous + 1 / (60 + index + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]);
}

// Print the fused order with four decimals.
for (const [id, score] of fuse([vectorRanking, keywordRanking])) {
  console.log(id, score.toFixed(4));
}
`,
    output: `refund-guide 0.0325
refund-form 0.0323
order-page 0.0161
faq 0.0159`,
  },
  mistakes: [
    'Adding the raw scores of the two searches. Their scales differ, so one search always dominates.',
    'Reading a chunk found by only one search as a bad result. It can still be the best answer.',
    'Keeping too few candidates from each search. Fusion can only reorder what the two lists return.',
  ],
  useWhen: [
    'Users mix exact terms, such as codes, with plain questions.',
    'You want results that work on both meaning and words, without tuning weights.',
  ],
  skipWhen: [
    'One search already passes your test questions. Add a second search only when a test shows a gap.',
    'The collection is tiny. A single search reads all of it anyway.',
  ],
  words: [
    { term: 'Rank', meaning: 'The position of an item in a sorted list, where 1 is the best.' },
    { term: 'Reciprocal rank fusion (RRF)', meaning: 'A merge rule that adds 1 divided by (60 plus rank) for each list.' },
    { term: 'Fusion', meaning: 'Combining several ranked lists into one list.' },
    { term: 'Candidate', meaning: 'A chunk returned by a search before the final choice.' },
  ],
};

const reranking: Lesson = {
  slug: 'reranking',
  number: '4.5',
  title: 'Reranking',
  oneLiner: 'Reranking reads each candidate together with the question, then sorts the candidates again more carefully.',
  problem: {
    without: 'A fast first search compares the question and each chunk separately. Loose matches can look alike, so the best answer may sit below a weaker one.',
    with: 'A slower model reads the question and each candidate as one input. It scores how well the candidate answers, and the best ones move to the top.',
  },
  steps: [
    {
      title: 'The first search returns a short list',
      detail: 'The first search returns more candidates than the answer needs, such as 20. This example keeps four candidates, in the order the first search gave them. That order is rough, so the best candidate may sit lower in the list.',
      visual: {
        kind: 'chips',
        caption: 'Four candidates in first-pass order, from the fast search.',
        items: [
          { text: 'Refunds take 5 to 7 days after the item arrives', note: 'position 1' },
          { text: 'Order status is shown on the account page', note: 'position 2' },
          { text: 'Refunds for gift cards are not possible', note: 'position 3' },
          { text: 'Shipping takes 2 business days in most areas', note: 'position 4' },
        ],
      },
      snippet: {
        source: `// Four candidates in the order the fast search returned them.
const candidates = [
  "Refunds take 5 to 7 days after the item arrives.",
  "Order status is shown on the account page.",
  "Refunds for gift cards are not possible.",
  "Shipping takes 2 business days in most areas.",
];
console.log(candidates.length, "candidates");
`,
        output: `4 candidates`,
      },
    },
    {
      title: 'A reranker reads the question with each candidate',
      detail: 'The reranker takes the question and one candidate as a single input. It returns one relevance score for that pair, so the score reflects both texts. Each pair needs its own model run, so only a short list is reranked.',
      visual: {
        kind: 'flow',
        caption: 'One pair goes through the reranker to produce one score.',
        nodes: ['Question', 'One candidate', 'Reranker model', 'Relevance score'],
      },
    },
    {
      title: 'The fake scorer counts shared words',
      detail: 'The fake scorer counts the question words that appear in the candidate. The question "how long do refunds take" has five words, and the top candidate shares "refunds" and "take". That gives 2 of 5, or 0.40, while a real reranker is a trained model.',
      visual: {
        kind: 'bars',
        caption: 'Fake scores for "how long do refunds take". Each score is shared words divided by 5.',
        rows: [
          { label: 'Refunds take 5 to 7 days', value: 0.4, highlight: true },
          { label: 'Refunds for gift cards', value: 0.2 },
          { label: 'Order status is shown', value: 0 },
          { label: 'Shipping takes 2 business', value: 0 },
        ],
      },
      snippet: {
        source: `// Count the question words found in the candidate.
const question = ["how", "long", "do", "refunds", "take"];
const candidate =
  "refunds take 5 to 7 days after the item arrives.";
const words = candidate.split(" ");
const shared = question.filter((w) => words.includes(w));
console.log(shared, (shared.length / question.length).toFixed(2));
`,
        output: `[ 'refunds', 'take' ] 0.40`,
      },
    },
    {
      title: 'Sort and keep the top n',
      detail: 'The candidates are sorted by the new score, highest first. Keeping the top n, here 2, sends only two passages to the answer model. The order from the first search no longer matters after this sort.',
      visual: {
        kind: 'chips',
        caption: 'The two highest scores are kept. The other two are dropped.',
        items: [
          { text: 'Refunds take 5 to 7 days after the item arrives.', note: '0.40, kept', highlight: true },
          { text: 'Refunds for gift cards are not possible.', note: '0.20, kept', highlight: true },
          { text: 'Order status is shown on the account page.', note: '0.00, dropped' },
          { text: 'Shipping takes 2 business days in most areas.', note: '0.00, dropped' },
        ],
      },
      snippet: {
        source: `// Sort by the new score, highest first. Keep the top n.
const scored = [
  { passage: "Order status", score: 0 },
  { passage: "Refunds take 5 to 7 days", score: 0.4 },
  { passage: "Refunds for gift cards", score: 0.2 },
];
const top = scored.sort((a, b) => b.score - a.score).slice(0, 2);
console.log(top.map((t) => t.passage));
`,
        output: `[ 'Refunds take 5 to 7 days', 'Refunds for gift cards' ]`,
      },
    },
  ],
  diagram: ['Candidates', 'Pair with question', 'Score', 'Sort', 'Keep top n'],
  code: {
    source: `// Candidates from a fast first search, in their first-pass order.
const candidates = [
  "Refunds take 5 to 7 days after the item arrives.",
  "Order status is shown on the account page.",
  "Refunds for gift cards are not possible.",
  "Shipping takes 2 business days in most areas.",
];

// A fake cross-encoder reads the question and one passage together.
// Here it scores the share of question words found in the passage.
function fakeScore(question: string, passage: string) {
  const questionWords = question.toLowerCase().split(" ");
  const words = passage.toLowerCase().split(" ");
  const shared = questionWords.filter((w) => words.includes(w));
  return shared.length / questionWords.length;
}

// Score each candidate and keep the best.
function rerank(question: string, passages: string[], n: number) {
  return passages
    .map((p) => ({ passage: p, score: fakeScore(question, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

const question = "how long do refunds take";
for (const hit of rerank(question, candidates, 2)) {
  console.log(hit.score.toFixed(2), hit.passage);
}
`,
    output: `0.40 Refunds take 5 to 7 days after the item arrives.
0.20 Refunds for gift cards are not possible.`,
  },
  mistakes: [
    'Reranking too few candidates. The reranker cannot promote a chunk that the first search dropped.',
    'Reranking a long list for every query. Each pair costs a model call, so the cost grows with the list.',
    'Trusting the new order without a test. Check it on the golden questions (lesson 2.1).',
  ],
  useWhen: [
    'The first search returns the right chunk, but ranks it low.',
    'Answers must be precise, and a few extra model calls per question are acceptable.',
  ],
  skipWhen: [
    'The first search already ranks the answer first on most test questions.',
    'The time budget is tight. Each pair adds delay before the answer starts.',
  ],
  words: [
    { term: 'Candidate', meaning: 'A chunk returned by the first search, waiting to be reranked.' },
    { term: 'Reranker', meaning: 'A model that reads a question and a passage together and gives a relevance score.' },
    { term: 'Cross-encoder', meaning: 'A reranker that reads the question and the passage as one input.' },
    { term: 'Latency', meaning: 'The time from sending a request to getting the response.' },
  ],
};

const queryRewriting: Lesson = {
  slug: 'query-rewriting',
  number: '4.6',
  title: 'Query rewriting',
  oneLiner: 'Query rewriting turns one question into several search queries, then merges the results.',
  problem: {
    without: 'A user writes "my card was charged twice". The documents say "duplicate charge" and "double payment", so one search finds nothing.',
    with: 'A model writes new queries that use the words the documents use. Each query runs, and the hits are merged for the next step.',
  },
  steps: [
    {
      title: 'The question words miss the documents',
      detail: 'A user writes "my card was charged twice". None of the three chunks shares a whole word with that question, so the search returns 0 chunks. The documents say "duplicate charges" and "double payment" instead.',
      visual: {
        kind: 'table',
        caption: 'Chunks found by each query, using whole-word matches over three chunks.',
        columns: ['Query', 'Chunks found'],
        rows: [
          ['my card was charged twice', '0'],
          ['duplicate card charge', '1'],
          ['refund for a double payment', '1'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `// A fake model. A real model writes these from the question.
const fakeModel = (question: string): string[] => {
  return ["duplicate card charge", "refund for a double payment"];
};
console.log(fakeModel("my card was charged twice"));
`,
        output: `[ 'duplicate card charge', 'refund for a double payment' ]`,
      },
    },
    {
      title: 'A model writes other wordings',
      detail: 'A model writes two or three variants of the question, using the words that documents tend to use. Here a fake model returns two fixed variants, so the example runs without a network call. Each variant is searched next to the original question.',
      visual: {
        kind: 'chips',
        caption: 'The original question and its two variants.',
        items: [
          { text: 'my card was charged twice', note: 'original' },
          { text: 'duplicate card charge', note: 'variant 1', highlight: true },
          { text: 'refund for a double payment', note: 'variant 2', highlight: true },
        ],
      },
    },
    {
      title: 'Each query runs its own search',
      detail: 'A chunk matches when it shares at least one whole word with the query. The word "charged" does not match "charges", so the original question finds nothing. Each variant finds one chunk of its own.',
      visual: {
        kind: 'bars',
        caption: 'Chunks found by each query.',
        rows: [
          { label: 'Original', value: 0 },
          { label: 'Variant 1', value: 1, highlight: true },
          { label: 'Variant 2', value: 1, highlight: true },
        ],
      },
      snippet: {
        source: `// Whole-word match: "charged" is not the same word as "charges".
const query = "my card was charged twice".split(" ");
const chunk = "Duplicate charges are refunded in 5 days".split(" ");
console.log(query.filter((w) => chunk.includes(w)));
`,
        output: `[]`,
      },
    },
    {
      title: 'Merging the hits without repeats',
      detail: 'The hits from all queries are joined into one list. A Set keeps one copy of each chunk, so repeats are dropped. The three queries together find 2 different chunks, one from each variant.',
      visual: {
        kind: 'chips',
        caption: 'The two chunks found after merging, with the query that found each.',
        items: [
          { text: 'Duplicate charges are refunded within 5 days', note: 'found by variant 1', highlight: true },
          { text: 'A double payment is reversed by the bank', note: 'found by variant 2', highlight: true },
        ],
      },
      snippet: {
        source: `// A Set keeps one copy of each value.
const hits = ["chunk A", "chunk B", "chunk A"];
console.log(new Set(hits).size, [...new Set(hits)]);
`,
        output: `2 [ 'chunk A', 'chunk B' ]`,
      },
    },
    {
      title: 'A made-up answer can be searched instead',
      detail: 'HyDE, short for hypothetical document embeddings, asks the model for a short made-up answer. That answer often uses the words the documents use, so its search can find chunks the question missed. The made-up answer can be wrong, so a check is still needed.',
      visual: {
        kind: 'compare',
        caption: 'Two ways to build the search from the question.',
        left: { title: 'Query variants', items: ['Rewrites the question', 'Several short queries', 'Hits merged without repeats'] },
        right: { title: 'HyDE', items: ['Writes one made-up answer', 'Searches with that answer', 'Can be wrong, so it needs a check'] },
      },
    },
  ],
  diagram: ['Question', 'Rewrite', 'Search each', 'Merge'],
  code: {
    source: `// A fake model. It returns variants of the question it is given.
const fakeModel = (question: string): string[] => {
  return ["duplicate card charge", "refund for a double payment"];
};

// A tiny search over chunks, by shared whole words.
const chunks = [
  "Duplicate charges are refunded within 5 days",
  "A double payment is reversed by the bank",
  "Shipping takes 2 business days",
];

// Return the chunks that share a whole word with the query.
function search(query: string): string[] {
  const queryWords = query.toLowerCase().split(" ");
  return chunks.filter((chunk) => {
    const words = chunk.toLowerCase().split(" ");
    return queryWords.some((w) => words.includes(w));
  });
}

// Search with the original question, then with each variant.
const original = "my card was charged twice";
const queries = [original, ...fakeModel(original)];
const found = new Set(queries.flatMap((query) => search(query)));
console.log("Queries run:", queries.length);
console.log("Original alone found:", search(original).length);
console.log("Merged found:", found.size);
for (const chunk of found) console.log("-", chunk);
`,
    output: `Queries run: 3
Original alone found: 0
Merged found: 2
- Duplicate charges are refunded within 5 days
- A double payment is reversed by the bank`,
  },
  mistakes: [
    'Writing variants that drift from the intent. A variant about replacing a card finds the wrong chunks.',
    'Adding too many variants. Each one is a search and a model call, and the merged list grows with noise.',
    'Using HyDE without a check. A made-up answer can be wrong, so its search can pull in wrong chunks.',
  ],
  useWhen: [
    'Users write short, vague, or informal questions.',
    'The documents use different words for the same idea.',
  ],
  skipWhen: [
    'The question already uses the document words, such as an exact product name.',
    'Each extra search or model call adds delay or cost that the product cannot afford.',
  ],
  words: [
    { term: 'Query variant', meaning: 'A second wording of the same question, written to match the documents.' },
    { term: 'Merge', meaning: 'Combine several result lists into one list without repeats.' },
    { term: 'HyDE', meaning: 'A method that searches with a made-up answer instead of the question.' },
    { term: 'Union', meaning: 'All items found in any list, with repeats removed.' },
  ],
};

const parentChildAndCompression: Lesson = {
  slug: 'parent-child-and-compression',
  number: '4.7',
  title: 'Parent-child and compression',
  navTitle: 'Parent-child, compression',
  oneLiner: 'Parent-child retrieval searches small pieces, then returns the larger section that holds them.',
  problem: {
    without: 'A large section covers many topics, so one vector stands for all of them. A question about one detail can score low against it.',
    with: 'The search compares the question with short pieces, which score sharply. The model then reads the whole section, so no detail is lost.',
  },
  steps: [
    {
      title: 'Cut the section into child pieces',
      detail: 'Each sentence of a section becomes one child piece. Every child stores the id of its parent, which is the section named reset. In a real system the parent id is saved with each child in the database.',
      visual: {
        kind: 'table',
        caption: 'The three children of the reset section. Each one points to the same parent.',
        columns: ['Child text', 'Parent id'],
        rows: [
          ['Hold the button for 10 seconds', 'reset'],
          ['The light then blinks blue', 'reset'],
          ['Wait one minute before you sign in', 'reset'],
        ],
      },
      snippet: {
        source: `const section = { id: "reset" };
const sentences = [
  "Hold the button for 10 seconds",
  "The light then blinks blue",
  "Wait one minute before you sign in",
];
const children = sentences.map((text) => {
  return { text, parent: section.id };
});
console.log(children[1]);
`,
        output: `{ text: 'The light then blinks blue', parent: 'reset' }`,
      },
    },
    {
      title: 'Score each child against the question',
      detail: 'The question is compared with each child, not with the whole section. The question words share 1 word with the first child, 2 with the second, and 0 with the third. A short child gives a sharper score, since no other sentence dilutes it.',
      visual: {
        kind: 'bars',
        caption: 'Shared words between the question and each child.',
        rows: [
          { label: 'Hold the button', value: 1 },
          { label: 'The light then blinks', value: 2, highlight: true },
          { label: 'Wait one minute', value: 0 },
        ],
      },
      snippet: {
        source: `const query = ["what", "does", "the", "light", "do"];
const children = [
  "Hold the button for 10 seconds",
  "The light then blinks blue",
  "Wait one minute before you sign in",
];
for (const text of children) {
  const words = text.toLowerCase().split(" ");
  console.log(query.filter((w) => words.includes(w)).length, text);
}
`,
        output: `1 Hold the button for 10 seconds
2 The light then blinks blue
0 Wait one minute before you sign in`,
      },
    },
    {
      title: 'The best child points to its parent',
      detail: 'The best child is "The light then blinks blue", with 2 shared words. The search returns its parent, the whole reset section, so the model reads the instructions around the matched sentence. Those neighbors often hold the warning or the next action.',
      visual: {
        kind: 'flow',
        caption: 'The path from the matched child to the text the model reads.',
        nodes: ['Matched child', 'Parent id: reset', 'Whole section'],
      },
      snippet: {
        source: `const sentences = [
  "Hold the button for 10 seconds",
  "The light then blinks blue",
  "Wait one minute before you sign in",
];
const best = sentences[1];
console.log("Best child:", best);
console.log("Parent text:", sentences.join(". ") + ".");
`,
        output: `Best child: The light then blinks blue
Parent text: Hold the button for 10 seconds. The light then blinks blue. Wait one minute before you sign in.`,
      },
    },
    {
      title: 'Compression keeps the sentences that help',
      detail: 'A long parent can be cut down to the sentences that answer the question. The wait sentence does not help with the light question, so compression drops it. The model gets two sentences instead of three, which keeps the prompt short.',
      visual: {
        kind: 'compare',
        caption: 'The parent text before and after compression, for the light question.',
        left: { title: 'Full parent', items: ['Hold the button for 10 seconds', 'The light then blinks blue', 'Wait one minute before you sign in'] },
        right: { title: 'Compressed', items: ['Hold the button for 10 seconds', 'The light then blinks blue'] },
      },
    },
  ],
  code: {
    source: `// One manual section. Each sentence is a small child piece.
const section = {
  id: "reset",
  sentences: [
    "Hold the button for 10 seconds",
    "The light then blinks blue",
    "Wait one minute before you sign in",
  ],
};

// Score each sentence by the whole words it shares with the query.
function findChild(query: string): string {
  const words = query.toLowerCase().split(" ");
  let best = { text: "", score: -1 };
  for (const text of section.sentences) {
    const childWords = text.toLowerCase().split(" ");
    const hits = words.filter((w) => childWords.includes(w)).length;
    if (hits > best.score) best = { text, score: hits };
  }
  return best.text;
}

// Search the small children, then return the whole parent section.
console.log("Matched child:", findChild("what does the light do"));
console.log("Parent section:", section.sentences.join(". ") + ".");
`,
    output: `Matched child: The light then blinks blue
Parent section: Hold the button for 10 seconds. The light then blinks blue. Wait one minute before you sign in.`,
  },
  mistakes: [
    'Cutting children too small. A single word has no meaning, so it matches the wrong parents.',
    'Returning the child alone. The model then lacks the context around the matched sentence.',
    'Losing the parent pointer when the documents are loaded again. A child with no parent cannot return its section.',
  ],
  useWhen: [
    'Sections are long, and each one covers several topics.',
    'The answer needs the text around a matched sentence, such as a step and its warning.',
  ],
  skipWhen: [
    'Every chunk is already short, such as one-line FAQ entries.',
    'The whole parent is too large for the model, and no compression step is planned.',
  ],
  words: [
    { term: 'Parent', meaning: 'The larger section that holds child pieces.' },
    { term: 'Child', meaning: 'A small piece of a parent, indexed for search.' },
    { term: 'Compression', meaning: 'Removing text that does not help answer the question.' },
    { term: 'Pointer', meaning: 'A stored id that links one record to another.' },
  ],
};

const correctiveRetrieval: Lesson = {
  slug: 'corrective-retrieval',
  number: '4.8',
  title: 'Corrective retrieval',
  oneLiner: 'Corrective retrieval grades each result and rewrites the query when nothing good comes back.',
  problem: {
    without: 'The system sends weak chunks to the model anyway. The model then writes an answer from text that does not answer the question.',
    with: 'A grader checks each chunk first. When nothing passes, the system rewrites the query and searches again. It can also say the documents do not cover the question.',
  },
  steps: [
    {
      title: 'The first search finds nothing useful',
      detail: 'Users write "how long until my money is back". The words do not match the documents, which say "refund". The first search therefore returns 0 chunks from the two-chunk library.',
      visual: {
        kind: 'table',
        caption: 'Results for each query over the two-chunk library.',
        columns: ['Query', 'Chunks found'],
        rows: [
          ['how long until my money is back', '0'],
          ['refund', '1'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `// Fake search: chunks that share a whole word with the query.
const library = [
  "Gift card balances are on the account page",
  "Refund takes 5 to 7 days",
];
const words = "how long until my money is back".split(" ");
const hits = library.filter((c) => {
  return words.some((w) => c.toLowerCase().split(" ").includes(w));
});
console.log(hits.length);
`,
        output: `0`,
      },
    },
    {
      title: 'A grader keeps only chunks that answer',
      detail: 'A grader is a check that decides whether a chunk answers the question. In this example a fake grader accepts only the refund chunk. A real grader is a model call for each chunk, so systems grade only the top few results.',
      visual: {
        kind: 'chips',
        caption: 'The two library chunks after the grader has read them.',
        items: [
          { text: 'Refund takes 5 to 7 days', note: 'kept', highlight: true },
          { text: 'Gift card balances are on the account page', note: 'rejected' },
        ],
      },
      snippet: {
        source: `// Fake grader: accept only the chunk that answers the question.
const answering = new Set(["Refund takes 5 to 7 days"]);
const grade = (chunk: string) => answering.has(chunk);
console.log(grade("Refund takes 5 to 7 days"));
console.log(grade("Gift card balances are on the account page"));
`,
        output: `true
false`,
      },
    },
    {
      title: 'A rewrite uses the document words',
      detail: 'The rewriter replaces "money back" with "refund", a word the refund chunk uses. A plain search for "refund" finds that chunk, and the grader keeps it, so the second search keeps 1 chunk. Matching is by whole word, so the plural "Refunds" would not match.',
      visual: {
        kind: 'bars',
        caption: 'Chunks kept after grading, for each search.',
        rows: [
          { label: 'First search', value: 0 },
          { label: 'Rewritten search', value: 1, highlight: true },
        ],
      },
      snippet: {
        source: `// The library and the rewritten query.
const library = [
  "Gift card balances are on the account page",
  "Refund takes 5 to 7 days",
];
const rewritten = "refund";
const hits = library.filter((chunk) => {
  return chunk.toLowerCase().split(" ").includes(rewritten);
});
console.log(hits);
`,
        output: `[ 'Refund takes 5 to 7 days' ]`,
      },
    },
    {
      title: 'Refusing when nothing passes',
      detail: 'Each round is one search, one grading pass, and one rewrite. If a round keeps nothing, the system tries again. It stops after a set number of rounds, such as two. If nothing still passes, it says the documents do not cover the question instead of guessing.',
      visual: {
        kind: 'compare',
        caption: 'What the system returns after the last round, in two cases.',
        left: { title: 'A chunk passed', items: ['Answer from the kept chunk', 'Show its source'] },
        right: { title: 'Nothing passed', items: ['Say the documents do not cover it', 'Do not guess an answer'] },
      },
    },
  ],
  diagram: ['Search', 'Grade', 'Rewrite', 'Search again', 'Answer or refuse'],
  code: {
    source: `// The chunks in a small library.
const library = [
  "Gift card balances are on the account page",
  "Refund takes 5 to 7 days",
];

// Fake search: chunks that share a whole word with the query.
function search(query: string): string[] {
  const words = query.toLowerCase().split(" ");
  return library.filter((chunk) => {
    const chunkWords = chunk.toLowerCase().split(" ");
    return words.some((w) => chunkWords.includes(w));
  });
}

// Fake grader: a model judges if the chunk answers it.
const answering = new Set(["Refund takes 5 to 7 days"]);
const grade = (chunk: string) => answering.has(chunk);

// First attempt: nothing found answers the question.
const question = "how long until my money is back";
console.log("First kept:", search(question).filter(grade).length);

// Fake rewriter: a model would write a better query.
const rewrites = new Map([[question, "refund"]]);

// Corrective step: rewrite the query and search again.
const rewritten = rewrites.get(question) ?? question;
console.log("Rewritten query:", rewritten);
console.log("Second kept:", search(rewritten).filter(grade));
`,
    output: `First kept: 0
Rewritten query: refund
Second kept: [ 'Refund takes 5 to 7 days' ]`,
  },
  mistakes: [
    'Grading with the same signal that found the chunk. A grader that only repeats the search adds no check.',
    'Rewriting without a limit. Set a maximum number of rounds, such as two.',
    'Answering when the grader keeps nothing. The model must say the documents do not cover the question.',
  ],
  useWhen: [
    'Users ask in words the documents do not use, and first searches often return nothing useful.',
    'A wrong answer costs more than a refusal, such as in a billing answer.',
  ],
  skipWhen: [
    'The first search already passes your test questions. The extra step only adds delay.',
    'Each round must finish inside a tight time limit.',
  ],
  words: [
    { term: 'Grader', meaning: 'A check that decides whether a chunk answers the question.' },
    { term: 'Rewrite', meaning: 'A new query written to find better chunks.' },
    { term: 'Round', meaning: 'One cycle of search, grade, and rewrite.' },
    { term: 'Refusal', meaning: 'An answer that says the documents do not cover the question.' },
  ],
};

const textToSql: Lesson = {
  slug: 'text-to-sql',
  number: '4.9',
  title: 'Text to SQL',
  oneLiner: 'Text to SQL asks a model to write a database query, which the system checks before it runs.',
  problem: {
    without: 'Many answers sit in tables, such as prices and order dates. Searching free text over those rows cannot compare numbers or sort them.',
    with: 'A model writes a precise query, such as the plans under 40. The database then does the comparison and returns exact rows.',
  },
  steps: [
    {
      title: 'The table layout goes into the prompt',
      detail: 'The model needs the table and column names to write a valid query. Send them with the question, or the model guesses names and the query often fails. The example table has three rows and two columns, name and price.',
      visual: {
        kind: 'table',
        caption: 'The products table that the question is about.',
        columns: ['name', 'price'],
        rows: [
          ['Basic plan', '12'],
          ['Pro plan', '30'],
          ['Team plan', '80'],
        ],
      },
      snippet: {
        source: `// The schema text sent to the model with the question.
const schema = "products(name TEXT, price INTEGER)";
const question = "Plans under 40?";
console.log("Schema:", schema);
console.log("Question:", question);
`,
        output: `Schema: products(name TEXT, price INTEGER)
Question: Plans under 40?`,
      },
    },
    {
      title: 'The model writes one SQL string',
      detail: 'For "Plans under 40?" the fake model returns one SQL string, SELECT name FROM products WHERE price < 40. SQL is the language databases use to read rows. The model returns text, not rows, so a program must still run the query.',
      visual: {
        kind: 'flow',
        caption: 'The path from the question to the rows, left to right.',
        nodes: ['Question', 'SQL text', 'Check', 'Database rows'],
      },
      snippet: {
        source: `// A fake model. It returns one SQL string for the question.
const fakeModel = (question: string) => {
  if (question.includes("under")) {
    return "SELECT name FROM products WHERE price < 40";
  }
  return "DROP TABLE products";
};
console.log(fakeModel("Plans under 40?"));
`,
        output: `SELECT name FROM products WHERE price < 40`,
      },
    },
    {
      title: 'The check runs before the query',
      detail: 'The check accepts one plain SELECT and refuses any write word, such as DROP or DELETE. The SELECT passes, and "DROP TABLE products" is refused before it reaches the database. A real check parses the SQL, which is stricter than a word search.',
      visual: {
        kind: 'compare',
        caption: 'Two model outputs and the result of the check for each.',
        left: { title: 'Accepted', items: ['SELECT name FROM products WHERE price < 40'] },
        right: { title: 'Refused', items: ['DROP TABLE products'] },
      },
      snippet: {
        source: `// Accept only one SELECT with no write words.
function isSafe(sql: string): boolean {
  const upper = sql.toUpperCase();
  const banned = ["DROP", "DELETE"].some((w) => upper.includes(w));
  return upper.startsWith("SELECT ") && !banned;
}
console.log(isSafe("SELECT name FROM products WHERE price < 40"));
console.log(isSafe("DROP TABLE products"));
`,
        output: `true
false`,
      },
    },
    {
      title: 'Only matching rows come back',
      detail: 'The filter price < 40 runs on each row, and it keeps the rows that pass. Basic plan at 12 and Pro plan at 30 pass, while Team plan at 80 does not. The snippet applies the same filter to an array, so the example runs with no database.',
      visual: {
        kind: 'table',
        caption: 'Each row checked against price < 40.',
        columns: ['Name', 'Price', 'Returned'],
        rows: [
          ['Basic plan', '12', 'yes'],
          ['Pro plan', '30', 'yes'],
          ['Team plan', '80', 'no'],
        ],
      },
      snippet: {
        source: `// The same filter as the SQL, applied to an array of rows.
const products = [
  { name: "Basic plan", price: 12 },
  { name: "Pro plan", price: 30 },
  { name: "Team plan", price: 80 },
];
console.log(products.filter((r) => r.price < 40));
`,
        output: `[ { name: 'Basic plan', price: 12 }, { name: 'Pro plan', price: 30 } ]`,
      },
    },
    {
      title: 'A read-only login is the last guard',
      detail: 'A checker can miss a clever query, so it is not the only guard. A read-only database login can read rows but cannot change them, so a bad query cannot alter the data. Show the query next to the rows, so a person can see which filter was used.',
      visual: {
        kind: 'chips',
        caption: 'Two guards, before any row can change.',
        items: [
          { text: 'Check on the SQL text', note: 'stops most bad text' },
          { text: 'Read-only login', note: 'stops any write', highlight: true },
        ],
      },
    },
  ],
  code: {
    source: `// A small table of plans. A real database would hold this.
const products = [
  { name: "Basic plan", price: 12 },
  { name: "Pro plan", price: 30 },
  { name: "Team plan", price: 80 },
];

// A fake model. It turns a question into one SQL string.
const fakeModel = (question: string) => {
  const select = "SELECT name FROM products WHERE price < 40";
  if (question.includes("under")) return select;
  return "DROP TABLE products";
};

// Accept only one plain SELECT with no write words.
function isSafe(sql: string): boolean {
  const upper = sql.toUpperCase();
  const banned = ["DROP", "DELETE"].some((w) => upper.includes(w));
  return upper.startsWith("SELECT ") && !banned;
}

// Check each SQL string, and run it only when it passes.
for (const q of ["Plans under 40?", "Remove plans"]) {
  const sql = fakeModel(q);
  console.log("SQL:", sql, isSafe(sql) ? "(safe)" : "(refused)");
  const rows = products.filter((r) => r.price < 40);
  if (isSafe(sql)) console.log(rows);
}
`,
    output: `SQL: SELECT name FROM products WHERE price < 40 (safe)
[ { name: 'Basic plan', price: 12 }, { name: 'Pro plan', price: 30 } ]
SQL: DROP TABLE products (refused)`,
  },
  mistakes: [
    'Running the model output without a check. A model can write a DELETE as easily as a SELECT.',
    'Giving the model a login with write access. Use a read-only database account.',
    'Trusting the first answer. Show the query so a wrong filter is visible.',
  ],
  useWhen: [
    'The answer is a count, sum, sort, or filter over rows in a table.',
    'The data changes often, and copying it into documents would go stale.',
  ],
  skipWhen: [
    'The answer is a passage of text, such as a help article.',
    'Users may query tables they should not see, and no access rules are in place.',
  ],
  words: [
    { term: 'SQL', meaning: 'The language that databases use to read and change rows.' },
    { term: 'Table', meaning: 'A set of rows that share the same named columns.' },
    { term: 'Read-only account', meaning: 'A database login that can read rows but not change them.' },
    { term: 'Parse', meaning: 'Read a text and break it into parts that a program can check.' },
  ],
};

const graphRetrieval: Lesson = {
  slug: 'graph-retrieval',
  number: '4.10',
  title: 'Graph retrieval',
  oneLiner: 'Graph retrieval stores facts as links between named things, then follows links to gather related facts.',
  problem: {
    without: 'A search finds the chunk that says "Basic plan includes Email support". It cannot reach the support hours, which sit in another chunk.',
    with: 'Each fact is a link from one name to another. The system starts at a name and follows links for a set number of hops.',
  },
  steps: [
    {
      title: 'A fact is one link',
      detail: 'A fact has three parts: the name it starts from, a relation, and the name it points to. "Basic plan includes Email support" is one link with the relation includes. The example stores three links in this form.',
      visual: {
        kind: 'table',
        caption: 'The three stored links.',
        columns: ['From', 'Relation', 'To'],
        rows: [
          ['Basic plan', 'includes', 'Email support'],
          ['Pro plan', 'includes', 'Phone support'],
          ['Email support', 'hours', '9 to 5 weekdays'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `// One stored fact: from, relation, and to.
const edge = {
  from: "Basic plan",
  rel: "includes",
  to: "Email support",
};
console.log(edge.from, edge.rel, edge.to);
`,
        output: `Basic plan includes Email support`,
      },
    },
    {
      title: 'A lookup table from each name',
      detail: 'A Map connects each name to the links that start there. Finding the links of one name is a single lookup, so the search does not scan every link. The map entry for Basic plan holds one link in this example.',
      visual: {
        kind: 'chips',
        caption: 'The map entry for each starting name.',
        items: [
          { text: 'Basic plan', note: '1 link: includes Email support', highlight: true },
          { text: 'Pro plan', note: '1 link: includes Phone support' },
          { text: 'Email support', note: '1 link: hours 9 to 5 weekdays' },
        ],
      },
      snippet: {
        source: `const edges = [
  { from: "Basic plan", rel: "includes", to: "Email support" },
  { from: "Pro plan", rel: "includes", to: "Phone support" },
  { from: "Email support", rel: "hours", to: "9 to 5 weekdays" },
];
const graph = new Map<string, typeof edges>();
for (const e of edges) {
  graph.set(e.from, [...(graph.get(e.from) ?? []), e]);
}
console.log(graph.get("Basic plan"));
`,
        output: `[ { from: 'Basic plan', rel: 'includes', to: 'Email support' } ]`,
      },
    },
    {
      title: 'One hop reads the links of a name',
      detail: 'A hop is one move along a link. The walk starts at Basic plan, and one hop reads the links that start there. That hop finds "includes Email support" and the new name Email support.',
      visual: {
        kind: 'flow',
        caption: 'One hop from the starting name.',
        nodes: ['Basic plan', 'includes', 'Email support'],
      },
      snippet: {
        source: `const edges = [
  { from: "Basic plan", rel: "includes", to: "Email support" },
  { from: "Pro plan", rel: "includes", to: "Phone support" },
  { from: "Email support", rel: "hours", to: "9 to 5 weekdays" },
];
const next = edges.filter((e) => e.from === "Basic plan");
console.log(next.map((e) => e.from + " " + e.rel + " " + e.to));
`,
        output: `[ 'Basic plan includes Email support' ]`,
      },
    },
    {
      title: 'A second hop reaches the support hours',
      detail: 'The second hop starts at Email support, the name the first hop found. It reads one link, "hours 9 to 5 weekdays", which the first hop could not reach. Two hops return two facts in total.',
      visual: {
        kind: 'table',
        caption: 'Facts found after each hop from Basic plan.',
        columns: ['Hop', 'Names read', 'Facts found'],
        rows: [
          ['1', 'Basic plan', '1'],
          ['2', 'Email support', '2 in total'],
        ],
      },
      snippet: {
        source: `const edges = [
  { from: "Basic plan", rel: "includes", to: "Email support" },
  { from: "Pro plan", rel: "includes", to: "Phone support" },
  { from: "Email support", rel: "hours", to: "9 to 5 weekdays" },
];
const first = edges.filter((e) => e.from === "Basic plan");
const names = first.map((e) => e.to);
const second = edges.filter((e) => names.includes(e.from));
console.log(second.map((e) => e.from + " " + e.rel + " " + e.to));
`,
        output: `[ 'Email support hours 9 to 5 weekdays' ]`,
      },
    },
    {
      title: 'Each link keeps its source',
      detail: 'A link in a real system also names the document and section it came from. An answer can then be checked against the original text. A link with no source cannot be verified, so it should not be trusted.',
      visual: {
        kind: 'compare',
        caption: 'The same link with and without a source.',
        left: { title: 'Link alone', items: ['Basic plan includes Email support'] },
        right: { title: 'Link with source', items: ['Basic plan includes Email support', 'Source: plans page, section 2'] },
      },
    },
  ],
  code: {
    source: `// Facts stored as edges: from, relation, and to.
const edges = [
  { from: "Basic plan", rel: "includes", to: "Email support" },
  { from: "Pro plan", rel: "includes", to: "Phone support" },
  { from: "Email support", rel: "hours", to: "9 to 5 weekdays" },
];

// Build a lookup from each name to the edges that start there.
const graph = new Map<string, typeof edges>();
for (const edge of edges) {
  graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge]);
}

// Follow the edges for a number of hops, collecting each fact.
function walk(start: string, hops: number): string[] {
  let names = [start];
  const facts: string[] = [];
  for (let hop = 0; hop < hops; hop++) {
    const next = names.flatMap((name) => graph.get(name) ?? []);
    for (const edge of next) {
      facts.push(edge.from + " " + edge.rel + " " + edge.to);
    }
    names = next.map((edge) => edge.to);
  }
  return facts;
}

console.log("One hop:", walk("Basic plan", 1));
// Two hops reach the support hours.
console.log("Two hops:", walk("Basic plan", 2));
`,
    output: `One hop: [ 'Basic plan includes Email support' ]
Two hops: [
  'Basic plan includes Email support',
  'Email support hours 9 to 5 weekdays'
]`,
  },
  mistakes: [
    'Too many hops. Each hop can pull in unrelated facts, so the answer grows noisy.',
    'Storing facts without a source. A link with no source cannot be checked against its document.',
    'Building the graph once by hand and never updating it. Stale links answer with old facts.',
  ],
  useWhen: [
    'Questions ask how things connect, such as which plan includes which support.',
    'Facts sit in separate chunks, and only a link joins them.',
  ],
  skipWhen: [
    'The answer is one sentence in one chunk. Vector search is enough.',
    'Nobody maintains the links. The graph will go stale.',
  ],
  words: [
    { term: 'Node', meaning: 'A named thing in the graph, such as a plan.' },
    { term: 'Edge', meaning: 'A link between two nodes, with a relation name.' },
    { term: 'Hop', meaning: 'One step along an edge.' },
    { term: 'Triple', meaning: 'A fact written as from, relation, and to.' },
  ],
};

const multimodalRetrieval: Lesson = {
  slug: 'multimodal-retrieval',
  number: '4.11',
  title: 'Multimodal retrieval',
  oneLiner: 'Multimodal retrieval searches images by text, using a caption or an image vector for each picture.',
  problem: {
    without: 'Text search cannot see a photo. A question about a red light finds nothing when the manual has only a picture.',
    with: 'Each image gets a caption or an image vector. The question is matched against those, so the picture can be returned.',
  },
  steps: [
    {
      title: 'Each picture gets a caption',
      detail: 'A vision model reads each picture once, when the manual is loaded, and writes a caption. The caption then goes through the same search as a text chunk. Some systems embed the pixels directly, which can match pictures without a caption, but that costs more.',
      visual: {
        kind: 'table',
        caption: 'Three pictures from a device manual, with their captions.',
        columns: ['File', 'Caption'],
        rows: [
          ['front.png', 'Front panel with a red light.'],
          ['back.png', 'Back view with two cables.'],
          ['side.png', 'Side view with a power button.'],
        ],
      },
      snippet: {
        source: `// Each picture has a file name and a caption.
const images = [
  { file: "front.png", caption: "Front panel with a red light." },
  { file: "back.png", caption: "Back view with two cables." },
];
for (const i of images) console.log(i.file, i.caption);
`,
        output: `front.png Front panel with a red light.
back.png Back view with two cables.`,
      },
    },
    {
      title: 'Counting words gives numbers',
      detail: 'The fake embedding counts how often the words light, cable, and red appear in a caption. The front panel caption has light once and red once, so its vector is 1, 0, 1. The back view has none of the three words, so its vector is 0, 0, 0. The side view is also 0, 0, 0.',
      visual: {
        kind: 'table',
        caption: 'The vector for each caption. The columns count light, cable, and red.',
        columns: ['Caption', 'light', 'cable', 'red'],
        rows: [
          ['Front panel with a red light.', '1', '0', '1'],
          ['Back view with two cables.', '0', '0', '0'],
          ['Side view with a power button.', '0', '0', '0'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const keys = ["light", "cable", "red"];
const embed = (text: string) => {
  const words = text.toLowerCase().replace(".", "").split(" ");
  return keys.map((k) => words.filter((w) => w === k).length);
};
console.log(embed("Front panel with a red light."));
console.log(embed("Back view with two cables."));
`,
        output: `[ 1, 0, 1 ]
[ 0, 0, 0 ]`,
      },
    },
    {
      title: 'The question gets the same counts',
      detail: 'The question "blinking red light" goes through the same count, which gives 1, 0, 1. Each caption vector is then compared with it by a dot product. The front panel scores 2, and the back and side views score 0.',
      visual: {
        kind: 'bars',
        caption: 'Dot product of the question vector with each caption vector.',
        rows: [
          { label: 'Front panel', value: 2, highlight: true },
          { label: 'Back view', value: 0 },
          { label: 'Side view', value: 0 },
        ],
      },
      snippet: {
        source: `const keys = ["light", "cable", "red"];
const embed = (text: string) => {
  const words = text.toLowerCase().replace(".", "").split(" ");
  return keys.map((k) => words.filter((w) => w === k).length);
};
const dot = (a: number[], b: number[]) =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);
const query = embed("blinking red light");
console.log(dot(query, embed("Front panel with a red light.")));
`,
        output: `2`,
      },
    },
    {
      title: 'Ranking returns the image file',
      detail: 'Each image is scored with the dot product, and the list is sorted from high to low. The top file, front.png, is returned with its caption, so the reader can see what the picture shows. Small text inside a picture needs OCR, a method that reads printed text from an image.',
      visual: {
        kind: 'chips',
        caption: 'Images ranked for "blinking red light".',
        items: [
          { text: 'front.png', note: 'score 2, returned', highlight: true },
          { text: 'back.png', note: 'score 0' },
          { text: 'side.png', note: 'score 0' },
        ],
      },
    },
  ],
  code: {
    source: `// Images in a manual. A fake vision model wrote each caption.
const images = [
  { file: "front.png", caption: "Front panel with a red light." },
  { file: "back.png", caption: "Back view with two cables." },
  { file: "side.png", caption: "Side view with a power button." },
];

// Fake embedding: count the words light, cable, and red.
function embed(text: string): number[] {
  const words = text.toLowerCase().replace(".", "").split(" ");
  return ["light", "cable", "red"].map((key) => {
    return words.filter((w) => w === key).length;
  });
}

// Dot product of two vectors.
function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

// Search the image captions with a text query.
const query = embed("blinking red light");
const ranked = images
  .map((image) => ({
    file: image.file,
    score: dot(query, embed(image.caption)),
  }))
  .sort((a, b) => b.score - a.score);
for (const row of ranked) console.log(row.score, row.file);
`,
    output: `2 front.png
0 back.png
0 side.png`,
  },
  mistakes: [
    'Captioning only the title. A caption must describe what is visible, or the search cannot find it.',
    'Searching images with keyword counts and expecting meaning. Use a real embedding model for meaning.',
    'Returning the image without its page or source. A person needs the surrounding text to check it.',
  ],
  useWhen: [
    'The manual or catalog depends on diagrams, photos, or screenshots.',
    'Users ask about something visible, such as a light color or a panel layout.',
  ],
  skipWhen: [
    'The documents are text only. Use text chunks.',
    'The picture has small text that a caption cannot hold. Run OCR first.',
  ],
  words: [
    { term: 'Caption', meaning: 'A short text that describes an image.' },
    { term: 'Vision model', meaning: 'A model that reads an image and produces text or numbers.' },
    { term: 'OCR', meaning: 'Optical character recognition, a method that reads printed text from an image.' },
    { term: 'Image vector', meaning: 'A list of numbers that stands for the meaning of a picture.' },
  ],
};

const whatRetrievalCannotFix: Lesson = {
  slug: 'what-retrieval-cannot-fix',
  number: '4.12',
  title: 'What retrieval cannot fix',
  oneLiner: 'Retrieval finds the closest chunks, but it cannot add missing facts or pick the newest edition.',
  problem: {
    without: 'A user expects the search to know the answer. It returns the closest chunks anyway, and the closest chunk can be outdated or unrelated.',
    with: 'Each failure has a known cause and a known fix. Name the failure, then choose the fix from the lessons in this module.',
  },
  steps: [
    {
      title: 'Missing content cannot be ranked into view',
      detail: 'If no chunk holds the answer, no search can return it. Ranking only puts existing chunks in order, so it cannot add a missing fact. The fix is to add the document, or to say the answer is not in the documents.',
    },
    {
      title: 'Two editions can tie',
      detail: 'The 2019 and 2024 refund chunks have the same vector, so both score 0.82 for "refund time". A tie like this is a warning sign, so check the labels first. The fix is a metadata filter on the edition label (lesson 4.2).',
      visual: {
        kind: 'bars',
        caption: 'Scores for "refund time". The two editions tie at the top.',
        rows: [
          { label: '2019 refund', value: 0.82, highlight: true },
          { label: '2024 refund', value: 0.82, highlight: true },
          { label: 'Office closed', value: 0.18 },
        ],
      },
      snippet: {
        source: `const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
const query = [0.9, 0.1];
console.log("2019:", dot(query, [0.9, 0.1]).toFixed(2));
console.log("2024:", dot(query, [0.9, 0.1]).toFixed(2));
`,
        output: `2019: 0.82
2024: 0.82`,
      },
    },
    {
      title: 'Unrelated questions still get results',
      detail: 'The question "do you sell gift cards" has no matching chunk, yet search returns 2 anyway. The top score is only 0.29, for a chunk about office holidays, and scores are relative. No cutoff is safe until tests show where it belongs. A grader that can say no is the fix (lesson 4.8).',
      visual: {
        kind: 'chips',
        caption: 'The two results for "do you sell gift cards", with their scores.',
        items: [
          { text: 'Our office is closed on holidays.', note: 'score 0.29, unrelated', highlight: true },
          { text: 'Refunds take 5 days. (2019)', note: 'score 0.21, unrelated' },
        ],
      },
    },
    {
      title: 'A table of causes and fixes',
      detail: 'Four failures explain most wrong answers from retrieval. Each has a cause that ranking cannot fix on its own. Test each one on purpose by adding no-answer questions and two-edition questions to the golden set.',
      visual: {
        kind: 'table',
        caption: 'Four failures, the sign that shows each one, and the fix.',
        columns: ['Failure', 'Sign', 'Fix'],
        rows: [
          ['Missing content', 'Top results do not answer', 'Add the document, or say not covered'],
          ['Two editions', 'Equal top scores', 'Metadata filter (lesson 4.2)'],
          ['Unrelated results', 'Low top score, still returned', 'Grader that can say no (lesson 4.8)'],
          ['Vague wording', 'Zero hits for the question', 'Query rewriting (lesson 4.6)'],
        ],
      },
    },
  ],
  code: {
    source: `// Two editions of one answer, and one unrelated chunk.
const chunks = [
  { text: "Refunds take 5 days. (2019)", vec: [0.9, 0.1] },
  { text: "Refunds take 7 days. (2024)", vec: [0.9, 0.1] },
  { text: "Our office is closed on holidays.", vec: [0.1, 0.9] },
];

// Dot product of two vectors, then the top k chunks by score.
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
function topK(query: number[], k: number) {
  return chunks
    .map((c) => ({ text: c.text, score: dot(query, c.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// The two editions tie, so search cannot pick the current one.
console.log("Query: refund time");
for (const hit of topK([0.9, 0.1], 2)) {
  console.log(hit.score.toFixed(2), hit.text);
}

// The answer is missing, yet two results still come back.
console.log("Query: do you sell gift cards");
for (const hit of topK([0.2, 0.3], 2)) {
  console.log(hit.score.toFixed(2), hit.text);
}
`,
    output: `Query: refund time
0.82 Refunds take 5 days. (2019)
0.82 Refunds take 7 days. (2024)
Query: do you sell gift cards
0.29 Our office is closed on holidays.
0.21 Refunds take 5 days. (2019)`,
  },
  mistakes: [
    'Tuning the ranking for a missing answer. Ranking cannot create a document that is not there.',
    'Trusting a high score as proof. An outdated chunk can score the highest.',
    'Testing only questions that have answers. Add no-answer questions to the test set.',
  ],
  useWhen: [
    'You need a checklist before blaming the model for a wrong answer.',
    'You plan a document set with several editions of the same content.',
  ],
  skipWhen: [
    'The search already returns the right chunk for every golden question.',
    'You are not yet measuring retrieval. Start with lesson 2.2 first.',
  ],
  words: [
    { term: 'Edition', meaning: 'One version of a document, such as the 2019 or the 2024 release.' },
    { term: 'Tie', meaning: 'Two items with the same score.' },
    { term: 'Golden set', meaning: 'A fixed list of questions with known good answers.' },
    { term: 'Missing content', meaning: 'An answer that no document contains.' },
  ],
};

export const retrieval: Module = {
  slug: 'retrieval',
  number: 4,
  title: 'Retrieval',
  summary: 'How the assistant finds the passages that answer a question.',
  lessons: [
    vectorSearch,
    metadataFilters,
    keywordSearch,
    hybridSearch,
    reranking,
    queryRewriting,
    parentChildAndCompression,
    correctiveRetrieval,
    textToSql,
    graphRetrieval,
    multimodalRetrieval,
    whatRetrievalCannotFix,
  ],
};
