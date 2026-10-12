import type { Lesson, Module } from '../types';
import { draftLesson } from '../draft';

const embeddings: Lesson = {
  slug: 'embeddings',
  number: '1.4',
  title: 'Embeddings: text as numbers',
  navTitle: 'Embeddings',
  oneLiner: 'An embedding is a list of numbers that stands for the meaning of a piece of text.',
  problem: {
    without: 'A computer compares text by letters. The phrases "refund" and "money back" share no word, so an exact match misses the link.',
    with: 'Each text becomes a list of numbers. Texts with similar meaning get similar lists, so the computer can compare them.',
  },
  steps: [
    {
      title: 'Read the sentence',
      detail: 'A model is a program that reads text and writes text back. It reads "How do I get a refund?" and outputs a list of numbers. That list is the embedding.',
    },
    {
      title: 'Fix the length',
      detail: 'Every embedding has the same length, called the dimension. Real models use hundreds of numbers. This lesson uses three, such as 0.9, 0.1, and 0.',
    },
    {
      title: 'Place the text in space',
      detail: 'Each number is a position on one axis. Together the numbers place the sentence at one point in space.',
    },
    {
      title: 'Put similar meanings close',
      detail: 'Sentences with similar meaning land at nearby points. "Can I get my money back?" gets 0.8, 0.2, and 0.1, close to the refund list.',
    },
    {
      title: 'Compare with arithmetic',
      detail: 'Code can compare two lists with arithmetic instead of matching letters. The two refund lists score 0.98, and a score near 1 means they point the same way.',
    },
  ],
  diagram: ['Text', 'Model', 'List of numbers'],
  code: {
    source: `// A tiny embedding table. Each sentence maps to three numbers.
const embeddingTable = new Map<string, number[]>([
  ["How do I get a refund?", [0.9, 0.1, 0]],
  ["Can I get my money back?", [0.8, 0.2, 0.1]],
  ["How do I reset my password?", [0, 0.9, 0.2]],
]);

// Print a sentence and its numbers, or undefined if unknown.
function show(sentence: string): void {
  const numbers = embeddingTable.get(sentence);
  console.log(sentence, "->", JSON.stringify(numbers));
}

// Show the refund sentence. It becomes three numbers.
show("How do I get a refund?");

// A sentence with the same meaning gets close numbers.
show("Can I get my money back?");

// A sentence with a different meaning gets far numbers.
show("How do I reset my password?");

// A sentence that is not in the table has no numbers.
show("Do you sell gift cards?");

// The length of the list is the dimension.
const refundNumbers = embeddingTable.get("How do I get a refund?");
console.log("Dimension ->", refundNumbers?.length);
`,
    output: `How do I get a refund? -> [0.9,0.1,0]
Can I get my money back? -> [0.8,0.2,0.1]
How do I reset my password? -> [0,0.9,0.2]
Do you sell gift cards? -> undefined
Dimension -> 3`,
  },
  hood: {
    paragraphs: [
      'The table is hand-made, so every list is known in advance. A real model produces the numbers by reading the text.',
      'A Map is a lookup table. You give it a key, here the sentence, and it returns the value stored for that key.',
      'The similarity compares the refund list with the money-back list. The score 0.98 is close to 1, so the lists point the same way.',
      'The gift card question returns undefined because the table has no list for it. A real model can make a list for any text.',
    ],
    example: [
      { label: 'Input sentence', value: '"How do I get a refund?"' },
      { label: 'Stored list (the embedding)', value: '[0.9, 0.1, 0]' },
      { label: 'Dimension (numbers in the list)', value: '3' },
      { label: 'Similarity with the money-back list', value: '0.98' },
    ],
    code: {
      source: `// Two embeddings from the table in the lesson.
const refund = [0.9, 0.1, 0];
const moneyBack = [0.8, 0.2, 0.1];

// Step 1: the dot product. Multiply each pair, then add them up.
let dotProduct = 0;
for (let i = 0; i < refund.length; i++) {
  dotProduct += refund[i] * moneyBack[i];
}

// Step 2: the length of a list. Square, add, then take the root.
function lengthOf(list: number[]): number {
  const squares = list.map((value) => value * value);
  return Math.sqrt(squares.reduce((sum, s) => sum + s, 0));
}

// Step 3: divide the dot product by both lengths.
const refundLength = lengthOf(refund);
const moneyBackLength = lengthOf(moneyBack);
const similarity = dotProduct / (refundLength * moneyBackLength);

console.log("Dot product ->", dotProduct);
console.log("Length of refund ->", lengthOf(refund));
console.log("Length of money back ->", lengthOf(moneyBack));
console.log("Similarity ->", similarity);
`,
      output: `Dot product -> 0.7400000000000001
Length of refund -> 0.9055385138137417
Length of money back -> 0.8306623862918076
Similarity -> 0.9837851170821987`,
    },
  },
  mistakes: [
    'Reading one number as a meaning. The whole list carries the meaning, not one value.',
    'Comparing embeddings from different models. Each model makes its own numbers, so the values do not line up.',
    'Expecting a lookup table to handle new text. A real model is needed for any text that was not added in advance.',
  ],
  useWhen: [
    'You need to find texts with similar meaning, not only the same words.',
    'You want to group, sort, or compare texts with arithmetic.',
  ],
  skipWhen: [
    'The question has one exact answer, such as an order number. Use an exact lookup.',
    'The text must match letter for letter, such as a product code.',
  ],
  words: [
    { term: 'Embedding', meaning: 'A list of numbers that stands for the meaning of a text.' },
    { term: 'Vector', meaning: 'Another name for a list of numbers with a fixed length. This course uses the two words the same way.' },
    { term: 'Dimension', meaning: 'The number of values in one embedding.' },
    { term: 'Map', meaning: 'A container that stores a value under a key, so you can look it up later.' },
  ],
};

export const talkingToAModel: Module = {
  slug: 'talking-to-a-model',
  number: 1,
  title: 'Talking to a model',
  summary: 'How a model takes text in and gives text back, and how text becomes numbers.',
  lessons: [
    draftLesson('one-model-call', '1.1', 'One model call'),
    draftLesson('tokens-and-cost', '1.2', 'Tokens and cost'),
    draftLesson('temperature', '1.3', 'Temperature and why answers vary', 'Temperature'),
    embeddings,
    draftLesson('cosine-similarity', '1.5', 'Cosine similarity'),
  ],
};
