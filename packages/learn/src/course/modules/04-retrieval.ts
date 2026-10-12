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
      title: 'What a chunk vector holds',
      detail: 'Each chunk is stored with a list of numbers, its embedding. The chunk "Refunds take 5 to 7 days." holds the list 0.9, 0.1, and 0. The list is computed once, before any question arrives.',
    },
    {
      title: 'The question vector',
      detail: 'A question is turned into a list in the same way, at search time. "Money back" becomes 0.85, 0.15, and 0 in this lesson.',
    },
    {
      title: 'Scoring with a dot product',
      detail: 'Multiply the matching numbers of two lists, then add the products. The question and the refund chunk score 0.78, a high score. A higher score means closer meaning.',
    },
    {
      title: 'Top k results',
      detail: 'Sort the scores from high to low and keep the first k. With k set to 2, two chunks come back.',
    },
    {
      title: 'Weak matches still return',
      detail: 'A question with no good match still gets k chunks. The unrelated question here scores 0.09 and 0.02, so those results are weak.',
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

// A fake model turned "money back" and "unrelated" into vectors.
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
  hood: {
    paragraphs: [
      'The chunk vectors are computed once and stored. Only the question needs a model call at search time.',
      'The dot product multiplies matching positions and adds the results. For the first two lists it is 0.85 times 0.9, plus 0.15 times 0.1, which is 0.78.',
      'The sort puts the highest score first. The slice keeps the first k items, so the search returns exactly k results.',
      'Real systems use a vector index, a structure that finds close vectors without scoring every chunk. This lesson scores every chunk, which is fine for a short list.',
    ],
    example: [
      { label: 'Question embedding', value: '[0.85, 0.15, 0]' },
      { label: 'Best chunk and its score', value: '"Refunds take 5 to 7 days." with 0.78' },
      { label: 'Results returned for k = 2', value: '2, even when the scores are low' },
      { label: 'Best score for the unrelated question', value: '0.09' },
    ],
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
      title: 'Labels on each chunk',
      detail: 'Each chunk is stored with labels called metadata. The label version 2 says which edition of the manual the chunk came from. The label must be set when the chunk is stored.',
    },
    {
      title: 'The filter condition',
      detail: 'A filter is a test on a label, such as version equal to 2. The app or a model chooses it for each question. In this lesson it is set by hand.',
    },
    {
      title: 'Filtering before scoring',
      detail: 'Chunks that fail the test are removed before the search scores anything. The old 3-second article, version 1, never reaches scoring.',
    },
    {
      title: 'Why the filter matters',
      detail: 'Without a filter, the old 3-second article scores 0.86 and ranks first. The current article scores 0.82 and ranks below it.',
    },
    {
      title: 'Missing labels fail',
      detail: 'A chunk with no version label fails every version filter. Check the labels when a document is loaded, not when a user asks.',
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
  hood: {
    paragraphs: [
      'Each chunk is an object with its text, its vector, and its labels. The filter checks the labels with a simple equality test.',
      'The filter runs before the score. A removed chunk costs no multiplication, and it cannot win the ranking.',
      'With no filter, the old 3-second article scores 0.86 and ranks first. The filter removes it, so the 10-second article ranks first.',
      'Filters need exact labels. A typo in a label name removes every chunk that should have matched.',
    ],
    example: [
      { label: 'Question vector', value: '[0.9, 0.1]' },
      { label: 'Old article score (version 1)', value: '0.86' },
      { label: 'Current article score (version 2)', value: '0.82' },
      { label: 'Chunks left after the version 2 filter', value: '2 of 3' },
    ],
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
      title: 'Words in each chunk',
      detail: 'The index splits each chunk into words. "The refund form is on the account page" becomes eight separate words.',
    },
    {
      title: 'Rare words count more',
      detail: 'Each word gets a weight from how many chunks contain it. "form" appears in 1 of 4 chunks, so it gets a high weight.',
    },
    {
      title: 'Repeats and length',
      detail: 'A repeated word adds points, but the points level off at a limit. A long chunk gets fewer points than a short one with the same hits.',
    },
    {
      title: 'Ranking a query',
      detail: 'For "refund form", the chunk with both words scores 1.65. A chunk with only "refund" scores 0.69, and chunks with neither word score 0.00.',
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
  hood: {
    paragraphs: [
      'A real index stores each word with the chunks that contain it. The code here scans every chunk, which is simple but slow for a large set.',
      'Rarity uses a formula called inverse document frequency. The formula gives a larger weight when fewer chunks contain the word.',
      'The score for one word is its weight times its repeat count, scaled by the chunk length. The constant 1.5 controls how fast repeats stop adding points.',
      'Common words such as "the" and "on" get a small weight, because many chunks contain them.',
    ],
    example: [
      { label: 'Query words', value: '"refund", "form"' },
      { label: 'Chunk with both words', value: '1.65' },
      { label: 'Chunk with only "refund"', value: '0.69' },
      { label: 'Chunks with neither word', value: '0.00' },
    ],
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
      title: 'Two ranked lists',
      detail: 'Vector search returns refund-guide, order-page, then refund-form. Keyword search returns refund-form, refund-guide, then faq. Rank 1 is the best.',
    },
    {
      title: 'Why ranks, not scores',
      detail: 'Raw scores sit on different scales, so they cannot be added fairly. RRF uses only the rank of each chunk in each list.',
    },
    {
      title: 'The RRF formula',
      detail: 'Each list adds 1 / (60 + rank) for every chunk it contains. A rank 1 chunk adds 1/61, which is about 0.0164.',
    },
    {
      title: 'A chunk in both lists',
      detail: 'refund-guide is rank 1 in one list and rank 2 in the other. Its total is 1/61 plus 1/62, which is 0.0325.',
    },
    {
      title: 'The fused order',
      detail: 'The final order is refund-guide (0.0325), refund-form (0.0323), order-page (0.0161), then faq (0.0159). A chunk found by only one search still appears.',
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
  hood: {
    paragraphs: [
      'The constant 60 is a common choice. It keeps the top ranks from dominating the sum.',
      'Raw scores cannot be compared. A dot product of 0.78 and a BM25 score of 1.65 cannot be added, but their ranks can.',
      'A chunk missing from one list adds nothing from that list. It can still rank well from the other list alone.',
      'Hybrid search runs two searches per question. Run them in parallel, so the wait is the slower search, not both added together.',
    ],
    example: [
      { label: 'Vector ranks', value: 'refund-guide 1, order-page 2, refund-form 3' },
      { label: 'Keyword ranks', value: 'refund-form 1, refund-guide 2, faq 3' },
      { label: 'Fused score for refund-guide', value: '0.0325' },
      { label: 'Fused score for faq', value: '0.0159' },
    ],
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
      title: 'Candidates from the first search',
      detail: 'The first search returns more candidates than the model needs, such as 20. The example has four candidates in first-pass order.',
    },
    {
      title: 'Reading a pair together',
      detail: 'The reranker reads the question and one candidate as one input. It sees the words of both at once, which the first search does not do.',
    },
    {
      title: 'A scoring example',
      detail: 'A fake scorer counts the share of question words found in the candidate. "Refunds take 5 to 7 days after the item arrives" scores 0.40.',
    },
    {
      title: 'Sorting and keeping the top',
      detail: 'The candidates are sorted by the new score, highest first. Keeping the best n, here 2, sends only two passages to the model.',
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
  hood: {
    paragraphs: [
      'A real reranker is a model that reads the question and a passage together. Each pair costs more than a vector comparison, so it runs only on a short list.',
      'The fake scorer is simple. It counts shared words and divides by the number of question words, so every score is between 0 and 1.',
      'The sort uses a comparison function. Subtracting the scores puts the larger score first.',
      'Reranking changes only the order. It cannot find new chunks, so a missing answer stays missing.',
    ],
    example: [
      { label: 'Question', value: '"how long do refunds take"' },
      { label: 'Question words', value: '5' },
      { label: 'Shared words with the top passage', value: '2 (refunds, take)' },
      { label: 'Top passage score', value: '0.40' },
    ],
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
      title: 'Variants of the question',
      detail: 'A model writes two or three variants of the question. For "my card was charged twice" it writes "duplicate card charge" and "refund for a double payment".',
    },
    {
      title: 'One search per query',
      detail: 'Each query runs its own search, and the original question runs too. The original alone finds 0 chunks in the example.',
    },
    {
      title: 'Merging the hits',
      detail: 'The results are combined, and repeats are removed. The three queries together find 2 different chunks.',
    },
    {
      title: 'What rewriting does not change',
      detail: 'Rewriting changes what is searched, not how the answer is written. The merged chunks still go to ranking or to the model.',
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
  hood: {
    paragraphs: [
      'The variants come from a fake model here. The code returns fixed strings, so the example runs without a network call.',
      'The search matches whole words. "Duplicate" matches "Duplicate", but "charged" does not match "charges".',
      'A Set keeps one copy of each chunk. The flatMap call joins the hits of every query into one list before the Set removes repeats.',
      'HyDE, short for hypothetical document embeddings, asks the model for a made-up short answer. Searching with that answer often uses the words the documents use.',
    ],
    example: [
      { label: 'Original question', value: '"my card was charged twice"' },
      { label: 'Hits for the original alone', value: '0' },
      { label: 'Queries run', value: '3' },
      { label: 'Merged hits', value: '2' },
    ],
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
      title: 'Small children, one parent',
      detail: 'Each section is cut into child pieces, here one per sentence. Every child stores the id of its parent section, such as reset.',
    },
    {
      title: 'Scoring the children',
      detail: 'The question is scored against each child, not against the whole section. "What does the light do" matches "The light then blinks blue" best, with 2 shared words.',
    },
    {
      title: 'Returning the parent',
      detail: 'The best child points to its parent. The whole section is returned, so the model gets the steps around the matched sentence.',
    },
    {
      title: 'When compression helps',
      detail: 'A long parent can be cut down to the sentences that answer the question. This keeps the prompt short, and the snippet leaves it out.',
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
  hood: {
    paragraphs: [
      'Children are short, so each child vector stands for one idea. That makes the best match sharper than a match against a long section.',
      'The findChild function counts shared whole words. The child with the highest count wins, and the first child wins a tie.',
      'The snippet returns the parent as one string. A real system stores the parent id with each child in the database.',
      'Compression removes sentences that do not help the answer. The snippet leaves it out to stay short.',
    ],
    example: [
      { label: 'Question', value: '"what does the light do"' },
      { label: 'Best child', value: '"The light then blinks blue"' },
      { label: 'Shared words in the best child', value: '2 (the, light)' },
      { label: 'Parent returned', value: 'the section with id reset' },
    ],
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
      title: 'A search with no good result',
      detail: 'For "how long until my money is back" the words differ from the documents. The first search returns 0 chunks.',
    },
    {
      title: 'A grader decides',
      detail: 'A grader judges whether each chunk answers the question. In this lesson a fake grader accepts only the "Refund takes 5 to 7 days" chunk.',
    },
    {
      title: 'A rewritten query',
      detail: 'When grading keeps nothing, a rewriter writes a better query. The rewrite "refund" matches the chunk words, so the second search keeps 1 chunk.',
    },
    {
      title: 'Refusing when nothing passes',
      detail: 'If the second round also keeps nothing, the system says the documents do not cover the question. It does not guess.',
    },
    {
      title: 'Limiting the rounds',
      detail: 'Set a maximum number of rounds, such as two. The loop then always stops, even when no chunk passes.',
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
  hood: {
    paragraphs: [
      'The grader is the costly part. A model call for each chunk takes time, so systems grade only the top few results.',
      'The grader here is a lookup set. A real grader asks a model whether the chunk answers the question, yes or no.',
      'The search matches whole words only. "Refunds" does not match "refund", so the rewrite uses the singular form.',
      'A corrective system needs a stop rule. Without one, the rewrite loop can run forever, so the system limits the number of rounds.',
    ],
    example: [
      { label: 'Question', value: '"how long until my money is back"' },
      { label: 'First search result', value: '0 chunks' },
      { label: 'Rewritten query', value: '"refund"' },
      { label: 'Second search kept', value: '1 chunk, "Refund takes 5 to 7 days"' },
    ],
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
      title: 'Table layout in the prompt',
      detail: 'Send the table and column names with the question. Without them, the model guesses, and the query often fails.',
    },
    {
      title: 'One SQL string',
      detail: 'For "Plans under 40?" the fake model returns SELECT name FROM products WHERE price < 40. The model writes text, and it does not return rows.',
    },
    {
      title: 'The check before running',
      detail: 'The check allows one plain SELECT and refuses words such as DELETE or DROP. The output "DROP TABLE products" is refused.',
    },
    {
      title: 'A read-only login',
      detail: 'The database login can read rows but cannot change them. A bad query then cannot alter the data, even if the check misses it.',
    },
    {
      title: 'Showing the query with the rows',
      detail: 'Show the user the rows and the query text. A person can then see which filter produced the answer.',
    },
  ],
  diagram: ['Question', 'Model writes SQL', 'Check', 'Run', 'Rows'],
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
  hood: {
    paragraphs: [
      'The table layout belongs in the prompt. Without column names, the model guesses, and the query often fails.',
      'The check here is simple. It looks for a leading SELECT and for forbidden words. A real system parses the query, which is stricter.',
      'The snippet does not run SQL. It applies the same price filter to an array, so the example runs with no database.',
      'The read-only account is the main safeguard. A checker can miss a clever query, so the database must also refuse writes.',
    ],
    example: [
      { label: 'Question', value: '"Plans under 40?"' },
      { label: 'Generated SQL', value: 'SELECT name FROM products WHERE price < 40' },
      { label: 'Check result', value: 'safe' },
      { label: 'Rows returned', value: 'Basic plan (12) and Pro plan (30)' },
    ],
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
      title: 'Facts as links',
      detail: 'A fact has three parts: from, relation, and to. "Basic plan includes Email support" is one link with the relation includes.',
    },
    {
      title: 'Starting at a name',
      detail: 'The question names "Basic plan", so the walk starts there. A real system finds the name with a search or a model.',
    },
    {
      title: 'One hop',
      detail: 'One hop reads the links that start at Basic plan. It finds "Basic plan includes Email support".',
    },
    {
      title: 'Two hops',
      detail: 'The second hop starts at Email support. It finds "Email support hours 9 to 5 weekdays", a fact the first search would miss.',
    },
    {
      title: 'Keeping a source',
      detail: 'Each link in a real system also names its document. An answer can then be checked against the original text.',
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
// One hop, then two hops, which reaches the support hours.
console.log("Two hops:", walk("Basic plan", 2));
`,
    output: `One hop: [ 'Basic plan includes Email support' ]
Two hops: [
  'Basic plan includes Email support',
  'Email support hours 9 to 5 weekdays'
]`,
  },
  hood: {
    paragraphs: [
      'The graph is a Map from each name to its outgoing links. Finding the links of one name takes a single lookup.',
      'Hops set the reach. Each hop adds the next layer of links, so two hops reach facts one link further away.',
      'The walk keeps a list of names for the next hop. Each hop replaces that list with the targets of the links it just followed.',
      'Graphs help with links between named things. Long prose still needs chunks and vector search.',
    ],
    example: [
      { label: 'Start name', value: '"Basic plan"' },
      { label: 'Facts after hop 1', value: '1 (includes Email support)' },
      { label: 'Facts after hop 2', value: '2 (adds the support hours)' },
      { label: 'Links stored in this example', value: '3' },
    ],
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
      title: 'Captions for pictures',
      detail: 'A vision model writes a caption for each picture. "Front panel with a red light." is one caption in this lesson.',
    },
    {
      title: 'Numbers from a caption',
      detail: 'This lesson uses a fake embedding that counts the words light, cable, and red. The front panel caption gives the list [1, 0, 1].',
    },
    {
      title: 'The question as numbers',
      detail: 'The question "blinking red light" gets the same counts, [1, 0, 1]. Each image vector is then compared with it.',
    },
    {
      title: 'Ranking the images',
      detail: 'The front panel scores 2, and the other two score 0. The top file, front.png, is returned with its caption.',
    },
  ],
  diagram: ['Image', 'Caption', 'Embed', 'Score', 'Image file'],
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
  hood: {
    paragraphs: [
      'Some systems embed the pixels with an image model. They can match pictures that have no caption, at a higher cost.',
      'A caption is a simple route. The vision model reads each picture once, when the document loads. The caption then uses the same search as a chunk.',
      'The fake embedding counts keywords, which is far weaker than a real model. Real vectors also match synonyms.',
      'A caption can miss small detail. A diagram with small labels needs a text reader for images, called OCR, as well.',
    ],
    example: [
      { label: 'Question vector (light, cable, red)', value: '[1, 0, 1]' },
      { label: 'Front panel caption vector', value: '[1, 0, 1]' },
      { label: 'Front panel score', value: '2' },
      { label: 'Back view score', value: '0' },
    ],
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
    with: 'Each failure has a known cause and a known fix. Name the failure first, then choose the fix from the lessons in this module.',
  },
  steps: [
    {
      title: 'Missing content',
      detail: 'If no chunk holds the answer, no search can find it. The fix is to add the document or to say the answer is not in the documents.',
    },
    {
      title: 'Two editions of one answer',
      detail: 'The 2019 and 2024 refund chunks both score 0.82 for "refund time". The fix is a metadata filter (lesson 4.2).',
    },
    {
      title: 'Unrelated questions still return results',
      detail: 'A question about gift cards returns two chunks, though neither answers it. The top score is only 0.29. The fix is a grader that can say no (lesson 4.8).',
    },
    {
      title: 'Vague wording',
      detail: 'Words the documents do not use cause misses. The fix is query rewriting (lesson 4.6).',
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
  hood: {
    paragraphs: [
      'Retrieval ranks what exists. It cannot create a fact, and no ranking order fixes a document that is missing.',
      'Equal scores are a warning sign. The two editions tie at 0.82, so a tie should trigger a check of the labels.',
      'Low scores do not mean no answer. Vector scores are relative, so any cutoff must be tested on real questions first.',
      'Test the failure cases on purpose. Add questions with no answer, and questions with two editions, to the golden set.',
    ],
    example: [
      { label: 'Question', value: '"do you sell gift cards"' },
      { label: 'Top result score', value: '0.29' },
      { label: '2019 refund chunk for "refund time"', value: '0.82' },
      { label: '2024 refund chunk for "refund time"', value: '0.82' },
    ],
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
