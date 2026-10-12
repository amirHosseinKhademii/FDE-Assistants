import type { Lesson, Module } from '../types';

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

const oneModelCall: Lesson = {
  slug: 'one-model-call',
  number: '1.1',
  title: 'One model call',
  oneLiner: 'A model call sends a list of messages in and gets one piece of text back.',
  problem: {
    without: 'A program sends one bare question. The model has no instructions, no earlier turns, and no source text to use.',
    with: 'The program sends a list: instructions, earlier turns, and the new question. The reply follows from that whole list.',
  },
  steps: [
    {
      title: 'Write the instructions',
      detail: 'The first message has the role "system". It says how to answer, such as "Answer only from the FAQ."',
    },
    {
      title: 'Add the question',
      detail: 'The next message has the role "user" and holds the question, such as "How long does a refund take?"',
    },
    {
      title: 'Send the whole list',
      detail: 'The program sends the system message and the question, "How long does a refund take?", in one request. The model keeps no memory between calls, so earlier turns must be sent again.',
    },
    {
      title: 'Read the reply',
      detail: 'The model returns plain text, such as "Refunds take 5 to 7 business days." The program then shows that text to the reader.',
    },
    {
      title: 'Store the reply',
      detail: 'To continue the chat, add the reply as a message with the role "assistant". The next request then includes it.',
    },
  ],
  diagram: ['Messages', 'Model', 'Reply text'],
  code: {
    source: `// A fake model. A real call goes over the network and costs money.
// This stand-in returns a fixed reply, so the program runs offline.
type Role = "system" | "user" | "assistant";
type Message = { role: Role; content: string };

function fakeModel(messages: Message[]): string {
  const last = messages[messages.length - 1];
  if (last.content.includes("refund")) {
    return "Refunds take 5 to 7 business days.";
  }
  return "I do not know.";
}

// The conversation is a list of messages, each with a role.
const messages: Message[] = [
  { role: "system", content: "Answer only from the FAQ." },
  { role: "user", content: "How long does a refund take?" },
];

// One call: the full list goes in, one text reply comes out.
const reply = fakeModel(messages);
console.log("Messages sent ->", messages.length);
console.log("Reply ->", reply);

// Store the reply, so the next call includes it.
messages.push({ role: "assistant", content: reply });
console.log("Last role ->", messages[messages.length - 1].role);
`,
    output: `Messages sent -> 2
Reply -> Refunds take 5 to 7 business days.
Last role -> assistant`,
  },
  hood: {
    paragraphs: [
      'The model reads the whole list on every call. It does not remember an earlier call unless you send that history again.',
      'Each message has two fields. The role says who wrote it, and the content holds the text.',
      'Many model interfaces use the same three roles: system, user, and assistant.',
      'The fake model in the code is a stand-in. A real call travels over the network, takes time, and costs money.',
    ],
    example: [
      { label: 'Messages in the first call', value: '2 (system and user)' },
      { label: 'Messages in the second call', value: '3, after the reply is stored' },
      { label: 'Reply text', value: '"Refunds take 5 to 7 business days."' },
    ],
  },
  mistakes: [
    'Expecting the model to remember earlier calls. Send the earlier turns again in every request.',
    'Putting the instructions in the user message. Keep them in the system message, so they stay separate from the question.',
    'Treating the reply as checked. The model can be wrong, so test its answers.',
  ],
  useWhen: [
    'You want one answer to a question, based on text you send with it.',
    'You are building a chat that must remember earlier turns.',
  ],
  skipWhen: [
    'A fixed answer is enough. A lookup table is simpler, cheaper, and always gives the same result.',
    'You need the exact same text every time. Model replies can vary, as lesson 1.3 shows.',
  ],
  words: [
    { term: 'Message', meaning: 'One item in the list sent to a model, with a role and some content.' },
    { term: 'Role', meaning: 'The label on a message: system, user, or assistant.' },
    { term: 'System message', meaning: 'Instructions that set how the model should answer.' },
    { term: 'Request', meaning: 'One call that sends messages to a model and waits for a reply.' },
  ],
};

const tokensAndCost: Lesson = {
  slug: 'tokens-and-cost',
  number: '1.2',
  title: 'Tokens and cost',
  oneLiner: 'A token is a small piece of text that a model counts, and providers charge by the number of tokens.',
  problem: {
    without: 'A team guesses what each request costs. The bill arrives at the end of the month with no clear cause.',
    with: 'The program counts the tokens in each request and reply. It estimates the cost before a change goes live.',
  },
  steps: [
    {
      title: 'Cut the text into tokens',
      detail: 'A token is a piece of text, often a short word or part of a long word. As a rough rule, English has about four characters per token. The word "refund" has 6 characters, so this lesson counts it as 2 tokens.',
    },
    {
      title: 'Count the input tokens',
      detail: 'Every token you send counts as input, including the instructions. A 1,200-word passage plus a short question gives 1,208 input tokens in this lesson.',
    },
    {
      title: 'Count the output tokens',
      detail: 'The reply counts too. The reply "Refunds take 5 to 7 business days." counts as 10 tokens here, and many providers charge more per output token.',
    },
    {
      title: 'Multiply by the price',
      detail: 'Prices are listed per million tokens. At an example price of 2 dollars per million input tokens, 1,208 input tokens cost about 0.0024 dollars.',
    },
    {
      title: 'Add up the calls',
      detail: 'A daily bill is the sum of all request costs. At the same size, 10,000 requests a day cost about 25 dollars.',
    },
  ],
  diagram: ['Text', 'Count tokens', 'Multiply by price', 'Cost'],
  code: {
    source: `// A rough token count: one token per 4 characters of each word.
function countTokens(text: string): number {
  const words = text.split(" ").filter((w) => w.length > 0);
  return words.reduce((n, w) => n + Math.ceil(w.length / 4), 0);
}

// Example prices per million tokens. The numbers are made up.
const INPUT_PRICE = 2;
const OUTPUT_PRICE = 8;

// The cost of one request, from its token counts.
function requestCost(input: number, output: number): number {
  return (input * INPUT_PRICE + output * OUTPUT_PRICE) / 1000000;
}

// A 1,200-word passage plus a short question.
const passage = "text ".repeat(1200);
const question = "How long does a refund take?";
const inputTokens = countTokens(passage) + countTokens(question);

// A short reply.
const reply = "Refunds take 5 to 7 business days.";
const outputTokens = countTokens(reply);
const oneCost = requestCost(inputTokens, outputTokens);

// Print the counts and the cost estimates.
console.log("Input tokens ->", inputTokens);
console.log("Output tokens ->", outputTokens);
console.log("One request ->", oneCost.toFixed(6));
console.log("10,000 requests ->", (oneCost * 10000).toFixed(2));
`,
    output: `Input tokens -> 1208
Output tokens -> 10
One request -> 0.002496
10,000 requests -> 24.96`,
  },
  hood: {
    paragraphs: [
      'The count here is a rough estimate. Real tokenizers learn their pieces from data, so their counts differ from this simple rule.',
      'Input and output are priced apart. A new price changes the cost, but it does not change the token count.',
      'Longer input costs more on every call. A 10,000-token document sent with each question is paid for every time.',
    ],
    example: [
      { label: 'Input tokens (passage plus question)', value: '1,208' },
      { label: 'Output tokens (the reply)', value: '10' },
      { label: 'Cost of one request', value: '0.002496 dollars' },
      { label: 'Cost of 10,000 requests', value: 'about 25 dollars' },
    ],
  },
  mistakes: [
    'Counting characters instead of tokens. The two differ, so a character count can be far off.',
    'Ignoring the reply. Long replies add cost, so set a maximum reply length.',
    'Sending a whole manual with every question. The cost grows on every call, even when the answer is short.',
  ],
  useWhen: [
    'You need to estimate the monthly cost of a feature before you launch it.',
    'You want to find out why one request costs more than another.',
  ],
  skipWhen: [
    'You run only a few test requests by hand. The bill is small, so a rough check is enough.',
    'Your provider shows a usage report that you already trust.',
  ],
  words: [
    { term: 'Token', meaning: 'A piece of text that a model reads and counts.' },
    { term: 'Input tokens', meaning: 'Tokens sent to the model, including the instructions and the question.' },
    { term: 'Output tokens', meaning: 'Tokens the model writes back as its reply.' },
    { term: 'Price per million', meaning: 'The charge for one million tokens, the usual unit on a price list.' },
  ],
};

const temperature: Lesson = {
  slug: 'temperature',
  number: '1.3',
  title: 'Temperature and why answers vary',
  navTitle: 'Temperature',
  oneLiner: 'Temperature sets how much the next-word choice can vary, so one prompt can give different replies.',
  problem: {
    without: 'The same question gets different wording on each run. Tests fail at random, and nobody can tell whether a change helped.',
    with: 'A low temperature makes the choice nearly fixed. The same question then gets the same reply, so test runs can be compared.',
  },
  steps: [
    {
      title: 'Score the next words',
      detail: 'At each step the model gives every possible next word a score. After "Refunds take", the word "5" might score high and "10" lower.',
    },
    {
      title: 'Turn the scores into chances',
      detail: 'The scores become chances that add up to 1. In this lesson the chances are 50 percent for "5", 30 percent for "7", and 20 percent for "10".',
    },
    {
      title: 'Apply the temperature',
      detail: 'A temperature of 0.5 turns the chances into about 66, 24, and 11 percent. A temperature of 2 flattens them to 42, 32, and 26 percent.',
    },
    {
      title: 'Pick one word by chance',
      detail: 'The program picks one word with a random number between 0 and 1. At temperature 1, a roll of 0.55 picks "7", because it passes the first 50 percent.',
    },
    {
      title: 'Repeat for each word',
      detail: 'The chosen word is added to the reply, such as "Refunds take 5". The model then scores the next word, such as "days".',
    },
  ],
  diagram: ['Scores', 'Chances', 'Temperature', 'Pick one word'],
  code: {
    source: `// Made-up chances for the next word after "Refunds take".
const words = ["5", "7", "10"];
const chances = [0.5, 0.3, 0.2];

// Raise each chance to the power 1 / temperature, then rescale.
function adjust(temperature: number): number[] {
  const powered = chances.map((c) => Math.pow(c, 1 / temperature));
  const total = powered.reduce((sum, p) => sum + p, 0);
  return powered.map((p) => p / total);
}

// Pick the first word whose running total passes the roll.
function pick(weights: number[], roll: number): string {
  let running = 0;
  for (let i = 0; i < weights.length; i++) {
    running += weights[i];
    if (roll < running) return words[i];
  }
  return words[words.length - 1];
}

// Show the chances, then the word a roll of 0.55 picks.
for (const t of [0.5, 1, 2]) {
  const weights = adjust(t);
  const shown = weights.map((c) => c.toFixed(2)).join(" ");
  console.log("Temperature", t, "->", shown);
  console.log("  roll 0.55 picks", pick(weights, 0.55));
}
`,
    output: `Temperature 0.5 -> 0.66 0.24 0.11
  roll 0.55 picks 5
Temperature 1 -> 0.50 0.30 0.20
  roll 0.55 picks 7
Temperature 2 -> 0.42 0.32 0.26
  roll 0.55 picks 7`,
  },
  hood: {
    paragraphs: [
      'The model does not pick a word by itself. A program reads the scores, applies the temperature, and picks one word.',
      'Many systems divide each score by the temperature. The code uses an equivalent form, raising each chance to the power 1 divided by the temperature.',
      'Temperature does not make a reply true. It only changes which plausible words get chosen.',
    ],
    example: [
      { label: 'Chances at temperature 1', value: '5: 0.50, 7: 0.30, 10: 0.20' },
      { label: 'Chances at temperature 2', value: '5: 0.42, 7: 0.32, 10: 0.26' },
      { label: 'Roll 0.55 at temperature 2', value: '"7"' },
    ],
  },
  mistakes: [
    'Setting temperature to 0 and expecting correct answers. It only makes the choice repeatable, and the top word can still be wrong.',
    'Comparing two runs made at different temperatures. The difference comes from the setting, not from your code change.',
    'Using a high temperature for facts. Higher values pick less likely words, which raises the chance of a wrong detail.',
  ],
  useWhen: [
    'You want the same reply each time, such as in a repeatable test run.',
    'You want varied wording, such as several sample titles for one product.',
  ],
  skipWhen: [
    'The output must follow a fixed format. Check the format in code, because temperature does not guarantee it.',
    'You need one exact fact. A lookup returns the same value on every call.',
  ],
  words: [
    { term: 'Temperature', meaning: 'A setting that controls how much the next-word choice can vary.' },
    { term: 'Chance', meaning: 'A number from 0 to 1 that says how likely an outcome is.' },
    { term: 'Sampling', meaning: 'Picking one outcome at random, using the chances.' },
    { term: 'Roll', meaning: 'A random number between 0 and 1 used to pick an outcome.' },
  ],
};

const cosineSimilarity: Lesson = {
  slug: 'cosine-similarity',
  number: '1.5',
  title: 'Cosine similarity',
  oneLiner: 'Cosine similarity is a score from -1 to 1 that shows how closely two lists point the same way.',
  problem: {
    without: 'Two embeddings are two long lists of numbers. Comparing them value by value gives no single clear answer.',
    with: 'One score sums up the comparison. A high score means the texts are close in meaning, and a low score means they are not.',
  },
  steps: [
    {
      title: 'Line up the two lists',
      detail: 'Both lists must have the same length. The refund list [0.9, 0.1, 0] pairs with the money-back list [0.8, 0.2, 0.1].',
    },
    {
      title: 'Multiply and add',
      detail: 'Multiply each pair of numbers, then add the products. For these two lists the sum is about 0.74.',
    },
    {
      title: 'Divide by both lengths',
      detail: 'The length of a list is the square root of the sum of its squared values. The refund list has length about 0.91, and the money-back list about 0.83.',
    },
    {
      title: 'Read the score',
      detail: 'A score of 1 means the lists point the same way. A score of 0 means they point at right angles and share no direction.',
    },
    {
      title: 'Ignore the scale',
      detail: 'The list [1, 2] and the list [2, 4] point the same way, so their score is 1. Only the direction counts, not the length.',
    },
  ],
  diagram: ['Two lists', 'Multiply and add', 'Divide by lengths', 'Score'],
  code: {
    source: `// The score for two lists, from -1 to 1. Lengths must match.
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let lengthA = 0;
  let lengthB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    lengthA += a[i] * a[i];
    lengthB += b[i] * b[i];
  }
  return dot / (Math.sqrt(lengthA) * Math.sqrt(lengthB));
}

// The refund list, as an example embedding.
const refund = [0.9, 0.1, 0];

// Score each pair, rounded to three decimal places.
const pairs: [string, number[], number[]][] = [
  ["Refund vs money back", refund, [0.8, 0.2, 0.1]],
  ["Refund vs password", refund, [0, 0.9, 0.2]],
  ["[1, 2] vs [2, 4]", [1, 2], [2, 4]],
  ["[1, 0] vs [-1, 0]", [1, 0], [-1, 0]],
  ["[1, 0] vs [0, 1]", [1, 0], [0, 1]],
];

for (const [label, a, b] of pairs) {
  console.log(label, "->", cosineSimilarity(a, b).toFixed(3));
}
`,
    output: `Refund vs money back -> 0.984
Refund vs password -> 0.108
[1, 2] vs [2, 4] -> 1.000
[1, 0] vs [-1, 0] -> -1.000
[1, 0] vs [0, 1] -> 0.000`,
  },
  hood: {
    paragraphs: [
      'The dot product grows with the length of both lists. Dividing by both lengths keeps only the angle between the lists.',
      'Because of that division, the score for two lists of the same length always falls between -1 and 1.',
      'Search systems use this score to rank texts. The score is only as good as the embeddings, so it cannot fix poor numbers.',
    ],
    example: [
      { label: 'Refund list', value: '[0.9, 0.1, 0]' },
      { label: 'Money-back list', value: '[0.8, 0.2, 0.1]' },
      { label: 'Dot product', value: 'about 0.74' },
      { label: 'Score', value: '0.984' },
    ],
  },
  mistakes: [
    'Comparing lists of different lengths. The formula needs the same number of values in both lists.',
    'Reading the score as a percent. A score of 0.8 is not 80 percent sure. It only measures closeness in direction.',
    'Choosing a cutoff without testing it. The right cutoff depends on your data, so test it on real examples.',
  ],
  useWhen: [
    'You rank texts by how close they are in meaning.',
    'You compare two embeddings that came from the same model.',
  ],
  skipWhen: [
    'The lists have different lengths or come from different models. The score then means nothing.',
    'You need the size of the gap between two values, not the direction. A distance measure fits better.',
  ],
  words: [
    { term: 'Cosine similarity', meaning: 'A score from -1 to 1 for how closely two lists point the same way.' },
    { term: 'Dot product', meaning: 'Multiply each pair of values, then add the products.' },
    { term: 'Length', meaning: 'The square root of the sum of the squared values. It is also called the norm.' },
    { term: 'Ranking', meaning: 'Sorting results from the best match to the weakest.' },
  ],
};

export const talkingToAModel: Module = {
  slug: 'talking-to-a-model',
  number: 1,
  title: 'Talking to a model',
  summary: 'How a model takes text in and gives text back, and how text becomes numbers.',
  lessons: [oneModelCall, tokensAndCost, temperature, embeddings, cosineSimilarity],
};
