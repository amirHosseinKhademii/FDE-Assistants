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
      title: 'A list of numbers stands for a text',
      detail: 'An embedding is a list of numbers that stands for the meaning of a text. A real model makes the list by reading the text. This lesson uses a hand-made table, so every list is known in advance.',
      visual: {
        kind: 'table',
        caption: 'Three FAQ questions and their embeddings. Each list has three numbers.',
        columns: ['Sentence', 'Embedding'],
        rows: [
          ['How do I get a refund?', '[0.9, 0.1, 0]'],
          ['Can I get my money back?', '[0.8, 0.2, 0.1]'],
          ['How do I reset my password?', '[0, 0.9, 0.2]'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `// A Map stores a value under a key, here the sentence.
const embeddingTable = new Map<string, number[]>([
  ["How do I get a refund?", [0.9, 0.1, 0]],
  ["Can I get my money back?", [0.8, 0.2, 0.1]],
]);
const numbers = embeddingTable.get("How do I get a refund?");
console.log(JSON.stringify(numbers));
`,
        output: '[0.9,0.1,0]',
      },
    },
    {
      title: 'Every list has the same length',
      detail: 'The number of values in one list is its dimension. Every embedding in this table has three values, so its dimension is 3. Real models use far more values, often hundreds, but the comparison works the same way.',
      visual: {
        kind: 'chips',
        caption: 'The three values of the refund embedding. Each value is a position on its own axis.',
        items: [
          { text: '0.9', note: 'axis 1', highlight: true },
          { text: '0.1', note: 'axis 2' },
          { text: '0', note: 'axis 3' },
        ],
      },
      snippet: {
        source: `const refundNumbers = [0.9, 0.1, 0];
console.log("Dimension ->", refundNumbers.length);
`,
        output: 'Dimension -> 3',
      },
    },
    {
      title: 'Similar meanings get nearby lists',
      detail: 'Texts with a similar meaning get similar lists. "Can I get my money back?" has 0.8, 0.2, and 0.1, close to the refund list. The password question has 0, 0.9, and 0.2, far from both. This picture uses only the first two numbers of each list.',
      visual: {
        kind: 'points',
        caption: 'The sentences placed by their first two numbers. The refund and money-back points sit close together.',
        points: [
          { label: 'Refund', x: 0.9, y: 0.1, highlight: true },
          { label: 'Money back', x: 0.8, y: 0.2 },
          { label: 'Reset password', x: 0, y: 0.9 },
        ],
        link: true,
      },
    },
    {
      title: 'A lookup has no list for new text',
      detail: 'A lookup returns nothing for a sentence that is not stored. "Do you sell gift cards?" is not in the table, so the lookup returns undefined. A real model makes a list for any text, which is why the table is only a teaching stand-in.',
      visual: {
        kind: 'flow',
        caption: 'A real model turns any sentence into a list of numbers.',
        nodes: ['Any sentence', 'Model', 'List of numbers'],
      },
      snippet: {
        source: `const embeddingTable = new Map<string, number[]>([
  ["How do I get a refund?", [0.9, 0.1, 0]],
]);
console.log(embeddingTable.get("Do you sell gift cards?"));
`,
        output: 'undefined',
      },
    },
    {
      title: 'Arithmetic compares two lists',
      detail: 'A program compares two embeddings with arithmetic, not by matching letters. It multiplies each pair of values and adds the products, which gives the dot product. The refund and money-back lists have a dot product of 0.74. The refund and password lists have 0.09, far lower.',
      visual: {
        kind: 'bars',
        caption: 'Dot products of the refund list with two others. The money-back list scores much higher.',
        rows: [
          { label: 'Money back', value: 0.74, highlight: true },
          { label: 'Password', value: 0.09 },
        ],
      },
      snippet: {
        source: `const refund = [0.9, 0.1, 0];
const moneyBack = [0.8, 0.2, 0.1];
// Multiply each pair of values, then add the products.
let dotProduct = 0;
for (let i = 0; i < refund.length; i++) {
  dotProduct += refund[i] * moneyBack[i];
}
console.log("Dot product ->", dotProduct.toFixed(2));
`,
        output: 'Dot product -> 0.74',
      },
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
      title: 'The request is a list of messages',
      detail: 'A request to a model is a list of messages. Each message has a role, which says who wrote it, and content, which holds the text. There are three roles: system, user, and assistant. This lesson sends two messages, a system rule and a user question.',
      visual: {
        kind: 'table',
        caption: 'The two messages sent in the first request.',
        columns: ['Role', 'Content'],
        rows: [
          ['system', 'Answer only from the FAQ.'],
          ['user', 'How long does a refund take?'],
        ],
      },
      snippet: {
        source: `type Role = "system" | "user" | "assistant";
type Message = { role: Role; content: string };

const messages: Message[] = [
  { role: "system", content: "Answer only from the FAQ." },
  { role: "user", content: "How long does a refund take?" },
];
console.log("Messages ->", messages.length);
console.log("First role ->", messages[0].role);
`,
        output: `Messages -> 2
First role -> system`,
      },
    },
    {
      title: 'The model reads the whole list',
      detail: 'The model reads the full list on every call and returns one text reply. It keeps no record of earlier calls. The reply depends only on the messages in that request, so both the rule and the question shape the answer.',
      visual: {
        kind: 'flow',
        caption: 'The two messages go in together, and one reply text comes out.',
        nodes: ['System rule', 'User question', 'Model', 'Reply text'],
      },
      snippet: {
        source: `// A stand-in for the model. It reads only the last message.
function fakeModel(messages: { content: string }[]): string {
  const text = messages[messages.length - 1].content;
  if (text.includes("refund")) {
    return "Refunds take 5 to 7 business days.";
  }
  return "I do not know.";
}
const q = "How long does a refund take?";
console.log("Reply ->", fakeModel([{ content: q }]));
`,
        output: 'Reply -> Refunds take 5 to 7 business days.',
      },
    },
    {
      title: 'The reply is plain text',
      detail: 'The reply is one string of text, with no role attached. The program shows it to the user or passes it on. For this question, the reply is "Refunds take 5 to 7 business days." The model can be wrong, so the reply still needs a check.',
    },
    {
      title: 'Memory needs the earlier messages again',
      detail: 'Each request stands alone. A follow-up such as "Does it cover gift cards?" makes no sense without the first question. To continue a chat, the program stores the reply as an assistant message and sends the whole list again.',
      visual: {
        kind: 'compare',
        caption: 'The list grows by one message after each reply.',
        left: { title: 'First request', items: ['2 messages: system and user'] },
        right: { title: 'Second request', items: ['3 messages: system, user, and assistant', 'The stored reply is sent again'] },
      },
      snippet: {
        source: `type Message = { role: string; content: string };
const messages: Message[] = [
  { role: "system", content: "Answer only from the FAQ." },
  { role: "user", content: "How long does a refund take?" },
];
messages.push({
  role: "assistant",
  content: "Refunds take 5 to 7 business days.",
});
console.log("Last role ->", messages[messages.length - 1].role);
`,
        output: 'Last role -> assistant',
      },
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
      title: 'A token is a piece of text',
      detail: 'A token is a piece of text that the model reads as one unit. It is often a short word or part of a long word. This lesson uses a rough rule: one token per 4 characters, rounded up, for each word. The word "refund" has 6 characters, so it counts as 2 tokens. Real tokenizers learn their pieces from data, so their counts differ.',
      visual: {
        kind: 'chips',
        caption: 'The reply, one word per chip, with its token count. The total is 10 tokens.',
        items: [
          { text: 'Refunds', note: '2 tokens' },
          { text: 'take', note: '1 token' },
          { text: '5', note: '1 token' },
          { text: 'to', note: '1 token' },
          { text: '7', note: '1 token' },
          { text: 'business', note: '2 tokens' },
          { text: 'days.', note: '2 tokens' },
        ],
      },
      snippet: {
        source: `// One token per 4 characters of each word, rounded up.
function countTokens(text: string): number {
  const words = text.split(" ").filter((w) => w.length > 0);
  return words.reduce((n, w) => n + Math.ceil(w.length / 4), 0);
}
console.log("refund ->", countTokens("refund"));
const reply = "Refunds take 5 to 7 business days.";
console.log("reply ->", countTokens(reply));
`,
        output: `refund -> 2
reply -> 10`,
      },
    },
    {
      title: 'Input and output are counted apart',
      detail: 'Input tokens cover everything sent to the model: the instructions, the help article, and the question. Output tokens cover the reply. Many providers charge more for each output token. In this example, the input is 1,208 tokens and the reply is 10.',
      visual: {
        kind: 'bars',
        caption: 'Tokens for one request. The long input and the short reply differ by a factor of over 100.',
        unit: 'tokens',
        rows: [
          { label: 'Input', value: 1208, highlight: true },
          { label: 'Output', value: 10 },
        ],
      },
      snippet: {
        source: `// A stand-in article of 1,200 words, plus the question.
const article = "text ".repeat(1200);
const question = "How long does a refund take?";
function countTokens(text: string): number {
  const words = text.split(" ").filter((w) => w.length > 0);
  return words.reduce((n, w) => n + Math.ceil(w.length / 4), 0);
}
const inputTokens = countTokens(article) + countTokens(question);
console.log("Input tokens ->", inputTokens);
`,
        output: 'Input tokens -> 1208',
      },
    },
    {
      title: 'Prices are set per million tokens',
      detail: 'Providers publish prices per million tokens. This example uses 2 dollars per million input tokens and 8 dollars per million output tokens. A request costs its input tokens times the input price, plus its output tokens times the output price. The total is divided by one million.',
      visual: {
        kind: 'table',
        caption: 'The cost of one request. The total is 0.002496 dollars.',
        columns: ['Part', 'Tokens', 'Price per million', 'Cost'],
        rows: [
          ['Input', '1,208', '$2', '$0.002416'],
          ['Output', '10', '$8', '$0.00008'],
          ['Total', '1,218', '', '$0.002496'],
        ],
        highlightRow: 2,
      },
      snippet: {
        source: `// Made-up prices, in dollars per million tokens.
const INPUT_PRICE = 2;
const OUTPUT_PRICE = 8;
function requestCost(input: number, output: number): number {
  return (input * INPUT_PRICE + output * OUTPUT_PRICE) / 1000000;
}
console.log("One request ->", requestCost(1208, 10).toFixed(6));
`,
        output: 'One request -> 0.002496',
      },
    },
    {
      title: 'Many requests add up',
      detail: 'A daily bill is the cost of one request times the number of requests. At 10,000 requests a day, this example costs about 25 dollars. Sending the article with every question is the largest cost. Without it, the same 10,000 requests cost about 1 dollar.',
      visual: {
        kind: 'bars',
        caption: 'Cost of 10,000 requests a day, in dollars.',
        unit: 'dollars',
        rows: [
          { label: 'Article with each question', value: 24.96, highlight: true },
          { label: 'Question only', value: 0.96 },
        ],
      },
      snippet: {
        source: `// The same prices: 2 and 8 dollars per million tokens.
function requestCost(input: number, output: number): number {
  return (input * 2 + output * 8) / 1000000;
}
const perDay = (input: number) => requestCost(input, 10) * 10000;
console.log("With article ->", perDay(1208).toFixed(2));
console.log("Question only ->", perDay(8).toFixed(2));
`,
        output: `With article -> 24.96
Question only -> 0.96`,
      },
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
      title: 'The model gives each next word a chance',
      detail: 'After the words "Refunds take", the model gives each possible next word a chance, written as a percent here. This example uses 50 percent for "5", 30 percent for "7", and 20 percent for "10". The chances add up to 100 percent.',
      visual: {
        kind: 'bars',
        caption: 'The chance of each next word after "Refunds take", at temperature 1.',
        unit: 'percent',
        rows: [
          { label: '5', value: 50, highlight: true },
          { label: '7', value: 30 },
          { label: '10', value: 20 },
        ],
      },
      snippet: {
        source: `// The chances the model gives after "Refunds take".
const words = ["5", "7", "10"];
const chances = [0.5, 0.3, 0.2];
const total = chances.reduce((sum, c) => sum + c, 0);
console.log("Words ->", words.join(", "));
console.log("Total chance ->", total.toFixed(1));
`,
        output: `Words -> 5, 7, 10
Total chance -> 1.0`,
      },
    },
    {
      title: 'Temperature reshapes the chances',
      detail: 'Temperature changes the chances before one word is picked. The code raises each chance to the power 1 divided by the temperature, then rescales the results to total 1. Many systems divide each raw score by the temperature, which gives the same result.',
      visual: {
        kind: 'line',
        caption: 'The chance of each word at three temperatures. A low temperature favors the top word.',
        xLabel: 'temperature',
        yLabel: 'percent',
        series: [
          { name: '5', points: [{ x: 0.5, y: 66 }, { x: 1, y: 50 }, { x: 2, y: 42 }] },
          { name: '7', points: [{ x: 0.5, y: 24 }, { x: 1, y: 30 }, { x: 2, y: 32 }] },
          { name: '10', points: [{ x: 0.5, y: 11 }, { x: 1, y: 20 }, { x: 2, y: 26 }] },
        ],
      },
      snippet: {
        source: `// Raise each chance to the power 1 / temperature, then rescale.
function adjust(chances: number[], temperature: number): number[] {
  const powered = chances.map((c) => Math.pow(c, 1 / temperature));
  const total = powered.reduce((sum, p) => sum + p, 0);
  return powered.map((p) => p / total);
}
const chances = [0.5, 0.3, 0.2];
const fmt = (w: number[]) => w.map((c) => c.toFixed(2)).join(" ");
console.log("At 0.5 ->", fmt(adjust(chances, 0.5)));
console.log("At 2 ->", fmt(adjust(chances, 2)));
`,
        output: `At 0.5 -> 0.66 0.24 0.11
At 2 -> 0.42 0.32 0.26`,
      },
    },
    {
      title: 'A random roll picks one word',
      detail: 'The program picks one word with a random number from 0 to 1, called a roll. It adds the chances in order and picks the first word where the running total passes the roll. A roll of 0.55 picks "5" at temperature 0.5, but "7" at temperature 1 and 2.',
      visual: {
        kind: 'table',
        caption: 'Running totals for a roll of 0.55. Only the lowest temperature changes the pick.',
        columns: ['Temperature', 'Total after "5"', 'Total after "7"', 'Roll 0.55 picks'],
        rows: [
          ['0.5', '0.66', '0.90', '5'],
          ['1', '0.50', '0.80', '7'],
          ['2', '0.42', '0.74', '7'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const words = ["5", "7", "10"];
// Pick the first word whose running total passes the roll.
function pick(weights: number[], roll: number): string {
  let total = 0;
  const i = weights.findIndex((w) => (total += w) > roll);
  return words[i < 0 ? words.length - 1 : i];
}
const pickA = pick([0.66, 0.24, 0.11], 0.55);
const pickB = pick([0.5, 0.3, 0.2], 0.55);
console.log(pickA, pickB);
`,
        output: '5 7',
      },
    },
    {
      title: 'The loop repeats for each word',
      detail: 'The chosen word joins the reply, so the reply becomes "Refunds take 5". The model then gives new chances for the next word, such as "days", and the program picks again. The loop stops when the reply ends or reaches a length limit. Temperature does not make a reply true, only more or less varied.',
      visual: {
        kind: 'flow',
        caption: 'One pass of the loop. The chosen word feeds the next round of chances.',
        nodes: ['Refunds take', 'Chances for "5", "7", "10"', 'Pick "5"', 'Chances for the next word'],
      },
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
      title: 'Both lists need the same length',
      detail: 'Cosine similarity compares two embeddings with the same number of values. The refund list is [0.9, 0.1, 0] and the money-back list is [0.8, 0.2, 0.1]. Both have three values, so each value pairs with the value in the same position.',
      snippet: {
        source: `const refund = [0.9, 0.1, 0];
const moneyBack = [0.8, 0.2, 0.1];
console.log("Same length ->", refund.length === moneyBack.length);
`,
        output: 'Same length -> true',
      },
    },
    {
      title: 'Multiply the pairs and add them',
      detail: 'Multiply the two values in each position, then add the three products. The products are 0.72, 0.02, and 0, so the dot product is 0.74. The dot product grows with the size of both lists, so the next block corrects for it.',
      visual: {
        kind: 'table',
        caption: 'Each position, its product, and the dot product at the bottom.',
        columns: ['Position', 'Refund', 'Money back', 'Product'],
        rows: [
          ['1', '0.9', '0.8', '0.72'],
          ['2', '0.1', '0.2', '0.02'],
          ['3', '0', '0.1', '0'],
          ['Sum', '', '', '0.74'],
        ],
        highlightRow: 3,
      },
      snippet: {
        source: `const refund = [0.9, 0.1, 0];
const moneyBack = [0.8, 0.2, 0.1];
// Multiply each pair, then add the products.
const dot = refund.reduce((s, v, i) => s + v * moneyBack[i], 0);
console.log("Dot product ->", dot.toFixed(2));
`,
        output: 'Dot product -> 0.74',
      },
    },
    {
      title: 'Divide by the two lengths',
      detail: 'The length of a list is the square root of the sum of its squared values. The refund list has length 0.91 and the money-back list has length 0.83. Dividing the dot product by both lengths gives 0.74 divided by 0.91 times 0.83, which is 0.984.',
      visual: {
        kind: 'flow',
        caption: 'The three numbers that make the score.',
        nodes: ['Dot product 0.74', 'Divide by 0.91 times 0.83', 'Score 0.984'],
      },
      snippet: {
        source: `const refund = [0.9, 0.1, 0];
const moneyBack = [0.8, 0.2, 0.1];
// Math.hypot gives the length of each list.
const a = Math.hypot(...refund);
const b = Math.hypot(...moneyBack);
const dot = refund.reduce((s, v, i) => s + v * moneyBack[i], 0);
const score = dot / (a * b);
console.log(a.toFixed(2), b.toFixed(2), score.toFixed(3));
`,
        output: '0.91 0.83 0.984',
      },
    },
    {
      title: 'Reading the score',
      detail: 'A score of 1 means the two lists point the same way. A score of 0 means they meet at a right angle, with no shared direction. A score of -1 means they point in opposite directions. The refund and password lists score 0.108, close to 0, so they share little direction.',
      visual: {
        kind: 'bars',
        caption: 'Scores of the refund list against two others. The money-back list is close to 1.',
        rows: [
          { label: 'Refund vs money back', value: 0.984, highlight: true },
          { label: 'Refund vs password', value: 0.108 },
        ],
      },
      snippet: {
        source: `const refund = [0.9, 0.1, 0];
const password = [0, 0.9, 0.2];
const dot = refund.reduce((s, v, i) => s + v * password[i], 0);
const a = Math.hypot(...refund);
const b = Math.hypot(...password);
console.log("Refund vs password ->", (dot / (a * b)).toFixed(3));
`,
        output: 'Refund vs password -> 0.108',
      },
    },
    {
      title: 'Only the direction counts',
      detail: 'Scaling a list does not change the score. The list [2, 4] is twice the list [1, 2], so both point the same way and score 1. Search systems sort texts by this score, so it is only as good as the embeddings behind it.',
      visual: {
        kind: 'points',
        caption: 'The lists [1, 2] and [2, 4] lie on one line through zero, so they point the same way.',
        points: [
          { label: '[1, 2]', x: 1, y: 2, highlight: true },
          { label: '[2, 4]', x: 2, y: 4 },
        ],
      },
      snippet: {
        source: `const cosine = (a: number[], b: number[]) => {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  return dot / (Math.hypot(...a) * Math.hypot(...b));
};
const result = cosine([1, 2], [2, 4]);
console.log("[1, 2] vs [2, 4] ->", result.toFixed(3));
`,
        output: '[1, 2] vs [2, 4] -> 1.000',
      },
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
