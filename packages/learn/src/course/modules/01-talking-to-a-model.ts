import type { Lesson, Module } from '../types';
import { draftLesson } from '../draft';

const embeddings: Lesson = {
  slug: 'embeddings',
  number: '1.4',
  title: 'Embeddings: text as numbers',
  oneLiner: 'An embedding is a list of numbers that stands for the meaning of a piece of text.',
  problem: {
    without: 'A computer compares text by letters. The phrases "refund" and "money back" share no word, so an exact match misses the link.',
    with: 'Each text becomes a list of numbers. Texts with similar meaning get similar lists, so the computer can compare them.',
  },
  steps: [
    'A model reads the text and outputs a list of numbers. This list is the embedding.',
    'The list has a fixed length, called the dimension. Real models use hundreds or thousands of numbers. This lesson uses 3.',
    'Each number is a position on one axis. Together the numbers place the text at one point in space.',
    'Texts that mean similar things land at nearby points.',
    'Other code can now compare texts with arithmetic instead of letter matching.',
  ],
  diagram: ['Text', 'Model', 'List of numbers'],
  code: {
    source: `// Create an empty table. It maps a text to its list of numbers.
const table = new Map<string, number[]>();
// Store the embedding for "refund". It has 3 numbers.
table.set("refund", [0.9, 0.1, 0]);
// Store the embedding for "money back". Its numbers are close to "refund".
table.set("money back", [0.8, 0.2, 0.1]);
// Store the embedding for "password". Its numbers are far from "refund".
table.set("password", [0, 0.9, 0.2]);
// Store the embedding for "shipping". It is also far from "refund".
table.set("shipping", [0.1, 0.1, 0.9]);
// Return the stored list for a text. Return undefined when the text is not in the table.
function embed(text: string): number[] | undefined {
  // Ignore capital letters, so "Refund" and "refund" match.
  return table.get(text.toLowerCase());
} // End of embed.
// Print the embedding for "refund" as text.
console.log(\`refund -> \${JSON.stringify(embed("refund"))}\`);
// Print the embedding for "money back".
console.log(\`money back -> \${JSON.stringify(embed("money back"))}\`);
// Print the embedding for "Refund" with a capital letter. The lookup still works.
console.log(\`Refund -> \${JSON.stringify(embed("Refund"))}\`);
// Print the result for a text the table does not know.
console.log(\`gift card -> \${JSON.stringify(embed("gift card"))}\`);
// Print how many numbers one embedding has. This is the dimension.
console.log(\`dimension -> \${embed("refund")?.length}\`);
`,
    output: `refund -> [0.9,0.1,0]
money back -> [0.8,0.2,0.1]
Refund -> [0.9,0.1,0]
gift card -> undefined
dimension -> 3`,
  },
  hood: {
    paragraphs: [
      'The table is hand-made, so every number is known. A real model produces the numbers by reading the text.',
      'A Map is a lookup table. You give it a key, here the text, and it returns the value stored for that key.',
      'Before the lookup, the code lowercases the text. This turns "Refund" into "refund", so both find the same entry.',
      'Compare the two stored lists. The first numbers are 0.9 and 0.8. The second numbers are 0.1 and 0.2. Close numbers mean close meaning.',
      'The result for "gift card" is undefined. The table only knows the texts someone added. A real model can make a list for any text.',
    ],
    example: [
      { label: 'Input text', value: '"Refund"' },
      { label: 'After lowercasing', value: '"refund"' },
      { label: 'Stored list (the embedding)', value: '[0.9, 0.1, 0]' },
      { label: 'Dimension (numbers in the list)', value: '3' },
    ],
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
  check: [
    { q: 'Why does the table return undefined for "gift card"?', a: 'The table only holds the texts someone added. A real model can make a list for any text.' },
    { q: 'What does similar meaning look like in the numbers?', a: 'Similar texts have similar numbers, so their lists are close in value.' },
    { q: 'What is the dimension of the embeddings in this lesson?', a: '3. Each embedding has three numbers.' },
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
    draftLesson('temperature', '1.3', 'Temperature and why answers vary'),
    embeddings,
    draftLesson('cosine-similarity', '1.5', 'Cosine similarity'),
  ],
};
