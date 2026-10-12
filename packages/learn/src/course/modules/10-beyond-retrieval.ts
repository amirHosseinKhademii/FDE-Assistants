import type { Lesson, Module } from '../types';

const contextRetrievalOrFineTuning: Lesson = {
  slug: 'context-retrieval-or-fine-tuning',
  number: '10.1',
  title: 'Context, retrieval, or fine-tuning',
  navTitle: 'Context or fine-tuning',
  oneLiner: 'Pick the cheapest option that fixes the problem: better context first, then retrieval, then fine-tuning.',
  problem: {
    without: 'A team trains a custom model for every complaint about answers. Each training run is slow and costly, and the facts still go stale.',
    with: 'A short list of questions picks the option. Most problems are fixed by better context or retrieval before any training.',
  },
  steps: [
    {
      title: 'Missing facts',
      detail: 'If the answer needs a fact the model lacks, add the fact to the context. A price list of 30 items fits in one request.',
    },
    {
      title: 'Too many documents',
      detail: 'If the documents are too many to paste, or they change each week, use retrieval. For example, a manual of 2,000 pages cannot fit in one request.',
    },
    {
      title: 'Format problems',
      detail: 'If replies have the wrong shape, fix the instructions first. If 3 of 10 replies still add extra text, fine-tuning can teach the shape.',
    },
    {
      title: 'Measuring options',
      detail: 'Run the same eval set for each option. Suppose the price-list fix raises the score from 36 to 44 out of 50. Keep the cheapest option that does this.',
    },
    {
      title: 'Reason on record',
      detail: 'Record why the option was chosen, such as "answers missed the 2024 price list". The record stops the team from retraining for the same reason later.',
    },
  ],
  diagram: ['Problem', 'Context', 'Retrieval', 'Fine-tuning'],
  code: {
    source: `// Flags: missing facts, many docs, wrong format, failed prompts.
function choose(flags: boolean[]): string {
  const [missing, tooMany, badFormat, failed] = flags;
  if (badFormat && failed) return "fine-tuning";
  if (missing && tooMany) return "retrieval";
  if (missing) return "better context";
  return "better instructions";
}

const cases: [string, boolean[]][] = [
  ["Price list, 30 items", [true, false, false, false]],
  ["Manual of 2,000 pages", [true, true, false, false]],
  ["Format wrong after many tries", [false, false, true, true]],
];

// Print the option chosen for each case.
for (const [name, flags] of cases) {
  console.log(name, "->", choose(flags));
}
`,
    output: `Price list, 30 items -> better context
Manual of 2,000 pages -> retrieval
Format wrong after many tries -> fine-tuning`,
  },
  hood: {
    paragraphs: [
      'The order matters. A longer prompt costs little to try, retrieval needs a store, and training needs data and compute.',
      'Fine-tuning changes how the model behaves. It is a weak way to store facts that change, so do not use it for prices or dates.',
      'A rule like this one is a starting point. The eval set makes the final decision.',
    ],
    example: [
      { label: 'Price list, 30 items', value: 'better context, since the list fits in the request' },
      { label: 'Manual of 2,000 pages', value: 'retrieval, since the manual is too large to paste' },
      { label: 'Format wrong after many tries', value: 'fine-tuning, since the instructions failed' },
    ],
  },
  mistakes: [
    'Fine-tuning to add facts. The facts go stale, and the model may still answer from memory.',
    'Choosing without an eval. Without a score, the choice rests on opinion.',
    'Building retrieval for a few short facts. Pasting them into the request is simpler and exact.',
  ],
  useWhen: [
    'A team must decide which option to build before writing code.',
    'Answers keep failing, and the cause is not yet known.',
  ],
  skipWhen: [
    'The task already passes the eval set with the current setup.',
    'You need a different model, not a better setup. Lesson 10.3 covers that case.',
  ],
  words: [
    { term: 'Context', meaning: 'All the text sent to the model in one request.' },
    { term: 'Retrieval store', meaning: 'A database of chunks that search reads from.' },
    { term: 'Fine-tuning', meaning: 'Extra training on example pairs that changes the model weights.' },
    { term: 'Weights', meaning: 'The numbers inside a model that set how it responds.' },
  ],
};

const fineTuning: Lesson = {
  slug: 'fine-tuning',
  number: '10.2',
  title: 'Fine-tuning',
  oneLiner: 'Fine-tuning trains a model further on example pairs, so it learns one fixed format or style.',
  problem: {
    without: 'A long prompt repeats the same format rules in every request, and the rules still fail on some replies.',
    with: 'Training on examples of the right format teaches the pattern, so each request can use a shorter prompt.',
  },
  steps: [
    {
      title: 'Example pairs',
      detail: 'Gather pairs of input and ideal output. For a format task, one pair might be the question "Refund time?" and the reply in the exact JSON shape.',
    },
    {
      title: 'Cleaning',
      detail: 'Remove duplicates, wrong replies, and personal data. For example, drop a pair whose reply says "5 to 7 dys". A bad example teaches a bad habit.',
    },
    {
      title: 'Training and test split',
      detail: 'Put about 80 percent of the pairs in training, and keep 20 percent for testing. The test pairs are never used for training.',
    },
    {
      title: 'Training run',
      detail: 'The training run changes the model weights using the training pairs. It costs money, so start with 100 pairs before you use 10,000.',
    },
    {
      title: 'Held-out test',
      detail: 'Run the new model on the test pairs and compare it with the old one. For example, it must beat the old model on 20 test pairs.',
    },
  ],
  diagram: ['Example pairs', 'Clean', 'Split', 'Train', 'Test'],
  code: {
    source: `// Example pairs: a question and the ideal reply, in one format.
const pairs = [
  { q: "Refund time?", a: '{"answer":"5 to 7 days"}' },
  { q: "Shipping time?", a: '{"answer":"2 business days"}' },
  { q: "Reset password?", a: '{"answer":"Forgot password"}' },
  { q: "Gift card limit?", a: '{"answer":"not in the FAQ"}' },
  { q: "Change address?", a: '{"answer":"Account settings"}' },
];

// Turn each pair into one chat row, one line of the file.
const rows = pairs.map((p) =>
  JSON.stringify({
    messages: [
      { role: "user", content: p.q },
      { role: "assistant", content: p.a },
    ],
  }),
);
console.log("Rows ->", rows.length);

// Keep the first 80 percent for training and the rest for testing.
const cut = Math.floor(rows.length * 0.8);
const train = rows.slice(0, cut);
const test = rows.slice(cut);
console.log("Train ->", train.length, "Test ->", test.length);
console.log("First row ->", train[0]);
`,
    output: `Rows -> 5
Train -> 4 Test -> 1
First row -> {"messages":[{"role":"user","content":"Refund time?"},{"role":"assistant","content":"{\\"answer\\":\\"5 to 7 days\\"}"}]}`,
  },
  hood: {
    paragraphs: [
      'The file holds one JSON object per line. This layout is common for training files, because each line can be read on its own.',
      'The test pairs are the only honest score. A model that has seen a test pair will score too well on it.',
      'Training pairs must look like real use. If real questions are long, train on long questions.',
      'Fine-tuning changes the weights, so re-test the whole eval set, not only the new format.',
    ],
    example: [
      { label: 'Pairs written', value: '5' },
      { label: 'Training rows', value: '4' },
      { label: 'Test rows', value: '1' },
      { label: 'Split rule', value: 'first 80 percent train, last 20 percent test' },
    ],
  },
  mistakes: [
    'Using too few examples. A handful of pairs may not change the model enough, so test before you rely on it.',
    'Testing on training pairs. The score then looks high and proves nothing.',
    'Training on a wrong or private example. The model repeats it, so review each pair first.',
  ],
  useWhen: [
    'The output must follow one fixed format or style, and prompts do not hold it.',
    'You have many good examples, and real requests look like them.',
  ],
  skipWhen: [
    'The problem is missing facts. Training does not store new facts reliably.',
    'You have only a few good examples, so you cannot test the result.',
  ],
  words: [
    { term: 'Training pair', meaning: 'One input with the ideal output for it.' },
    { term: 'JSON Lines', meaning: 'A file with one JSON object on each line.' },
    { term: 'Held-out set', meaning: 'Examples kept out of training and used only for testing.' },
    { term: 'Fine-tuning', meaning: 'Extra training on example pairs that changes the model weights.' },
  ],
};

const switchingProviders: Lesson = {
  slug: 'switching-providers',
  number: '10.3',
  title: 'Switching model providers',
  oneLiner: 'Switching providers is safe when every model call goes through one interface, and the eval set decides.',
  problem: {
    without: 'Model calls are spread across the code. Changing the provider means editing many files and hoping nothing breaks.',
    with: 'One interface hides the provider. A new provider needs one adapter, and the same eval set compares it with the old one.',
  },
  steps: [
    {
      title: 'One interface',
      detail: 'Write one function, such as complete(messages), that takes a list of messages and returns text. For example, "Refunds take 5 to 7 days." is a valid return.',
    },
    {
      title: 'One adapter per provider',
      detail: 'An adapter translates the interface into one provider request format. A second adapter, such as "beta", serves another provider with the same signature.',
    },
    {
      title: 'Provider setting',
      detail: 'A setting, such as PROVIDER set to "alpha", picks the adapter at start-up. No calling code changes when the setting changes.',
    },
    {
      title: 'Running the eval',
      detail: 'Run the same golden set against every adapter. Compare the pass counts and the cost of each run, such as 42 of 50 against 39 of 50.',
    },
    {
      title: 'Rollback',
      detail: 'Change the default only when the score and the cost are acceptable. Keep the old adapter, so a rollback is one setting, such as PROVIDER back to "alpha".',
    },
  ],
  diagram: ['Code', 'Interface', 'Adapter', 'Provider'],
  code: {
    source: `// The one interface the rest of the code uses.
type Message = { role: string; content: string };
type ModelClient = {
  name: string;
  complete: (messages: Message[]) => string;
};

// Two fake adapters. Real ones call a provider over the network.
const alpha: ModelClient = {
  name: "alpha",
  complete: () => "Refunds take 5 to 7 days.",
};
const beta: ModelClient = {
  name: "beta",
  complete: () => "Refunds: 5-7 days.",
};

// The setting picks the provider, so calling code never changes.
const providers: Record<string, ModelClient> = { alpha, beta };
const PROVIDER = "alpha";
console.log("Default ->", providers[PROVIDER].name);

// Run the same case against every adapter and compare.
const ask: Message[] = [{ role: "user", content: "Refund time?" }];
for (const name of Object.keys(providers)) {
  const reply = providers[name].complete(ask);
  const pass = reply.includes("5 to 7");
  console.log(name, pass ? "PASS" : "FAIL", "|", reply);
}
`,
    output: `Default -> alpha
alpha PASS | Refunds take 5 to 7 days.
beta FAIL | Refunds: 5-7 days.`,
  },
  hood: {
    paragraphs: [
      'An interface is a contract. Every adapter takes the same inputs and returns the same kind of output.',
      'Providers differ in message roles, length limits, and error codes. The adapter hides those differences, and the eval shows the rest.',
      'Prices change over time, so record the cost of each adapter in every eval report.',
    ],
    example: [
      { label: 'Setting', value: 'PROVIDER = "alpha"' },
      { label: 'alpha reply', value: '"Refunds take 5 to 7 days."' },
      { label: 'beta reply', value: '"Refunds: 5-7 days."' },
      { label: 'Result', value: 'beta fails the exact-fact check' },
    ],
  },
  mistakes: [
    'Writing provider-specific code outside the adapter. A switch then needs edits in many files.',
    'Comparing providers with different prompts. Send the same messages, or the test measures the prompts.',
    'Switching on price alone. A cheaper provider that fails the eval is a worse choice.',
  ],
  useWhen: [
    'Your provider raises prices or has outages, and you need a second option.',
    'You want to compare two providers on your own questions.',
  ],
  skipWhen: [
    'You use one provider and have no plan to change it.',
    'The code calls a model in one place only, so a switch is already small.',
  ],
  words: [
    { term: 'Interface', meaning: 'A fixed set of function names and inputs that the rest of the code relies on.' },
    { term: 'Adapter', meaning: 'Code that translates one interface into the calls of one provider.' },
    { term: 'Provider', meaning: 'A company or service that runs models and charges for their use.' },
    { term: 'Rollback', meaning: 'Going back to the previous setting after a bad switch.' },
  ],
};

export const beyondRetrieval: Module = {
  slug: 'beyond-retrieval',
  number: 10,
  title: 'Beyond retrieval',
  summary: 'When to change the model itself, and how to choose between the options.',
  lessons: [contextRetrievalOrFineTuning, fineTuning, switchingProviders],
};
