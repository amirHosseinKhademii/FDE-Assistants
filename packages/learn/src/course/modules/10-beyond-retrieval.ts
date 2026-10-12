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
      title: 'Missing facts go into the context',
      detail: 'The context is all the text sent to the model in one request. If an answer needs a fact the model lacks, add that fact to the context. A price list of 30 items fits in one request, so the fix is to paste it in.',
      visual: {
        kind: 'table',
        caption: 'The three cases from the code, and the flags that describe each one.',
        columns: ['Case', 'Missing fact', 'Too many docs', 'Bad format', 'Failed tries'],
        rows: [
          ['Price list, 30 items', 'yes', 'no', 'no', 'no'],
          ['Manual, 2,000 pages', 'yes', 'yes', 'no', 'no'],
          ['Format after many tries', 'no', 'no', 'yes', 'yes'],
        ],
        highlightRow: 0,
      },
    },
    {
      title: 'Too many documents means retrieval',
      detail: 'Retrieval searches the documents and adds only the few chunks that match each question. A manual of 2,000 pages cannot fit in one request, and documents that change each week are hard to paste. The code sends a case to retrieval only when the missing-fact flag and the too-many flag are both true.',
      visual: {
        kind: 'flow',
        caption: 'The retrieval path for the 2,000-page manual, left to right.',
        nodes: ['Question', 'Search picks a few chunks', 'Chunks go into the request'],
      },
      snippet: {
        source: `// Retrieval only when a fact is missing and the docs are too many.
const choose = (missing: boolean, tooMany: boolean) => {
  return missing && tooMany ? "retrieval" : "better context";
};
console.log(choose(true, true));
`,
        output: `retrieval`,
      },
    },
    {
      title: 'Format problems start with instructions',
      detail: 'If replies have the wrong shape, improve the instructions first. Fine-tuning comes later, when the instructions still fail, such as when 3 of 10 replies still add extra text. The code chooses fine-tuning only when the format flag and the failed-tries flag are both true.',
      visual: {
        kind: 'chips',
        caption: 'The format path, in the order the lesson recommends.',
        items: [
          { text: 'Better instructions', note: '3 of 10 still add extra text', highlight: true },
          { text: 'Fine-tuning', note: 'used only when instructions fail' },
        ],
      },
      snippet: {
        source: `// Fine-tuning only when the format is bad and the tries failed.
const chooseFormat = (badFormat: boolean, failed: boolean) => {
  if (badFormat && failed) return "fine-tuning";
  return "better instructions";
};
console.log(chooseFormat(true, true));
`,
        output: `fine-tuning`,
      },
    },
    {
      title: 'Measure each option on the same eval set',
      detail: 'Run the same eval set for each option, and compare the scores. Suppose the price-list fix raises the score from 36 to 44 out of 50. Keep the cheapest option that gives the best score. A rule like this one is only a starting point, and the eval set decides.',
      visual: {
        kind: 'bars',
        caption: 'Eval score out of 50, before and after the price-list fix.',
        rows: [
          { label: 'Before fix', value: 36 },
          { label: 'Price list in context', value: 44, highlight: true },
        ],
      },
    },
    {
      title: 'Record the reason and the order',
      detail: 'Record why the option was chosen, such as "answers missed the 2024 price list". The record stops the team from retraining for the same reason later. The order matters. A longer prompt is cheap to try, retrieval needs a store, and training needs data and compute.',
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
      title: 'Each example is an input and an ideal output',
      detail: 'A training pair holds an input and the ideal output for it. For a format task, the question "Refund time?" pairs with a reply in one exact JSON shape. JSON is a text format for data written as named values. The set in this lesson has five pairs in that shape.',
      visual: {
        kind: 'table',
        caption: 'The five training pairs in this lesson.',
        columns: ['Question', 'Ideal reply'],
        rows: [
          ['Refund time?', '{"answer":"5 to 7 days"}'],
          ['Shipping time?', '{"answer":"2 business days"}'],
          ['Reset password?', '{"answer":"Forgot password"}'],
          ['Gift card limit?', '{"answer":"not in the FAQ"}'],
          ['Change address?', '{"answer":"Account settings"}'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const pairs = [
  { q: "Refund time?", a: '{"answer":"5 to 7 days"}' },
  { q: "Shipping time?", a: '{"answer":"2 business days"}' },
  { q: "Reset password?", a: '{"answer":"Forgot password"}' },
  { q: "Gift card limit?", a: '{"answer":"not in the FAQ"}' },
  { q: "Change address?", a: '{"answer":"Account settings"}' },
];
for (const p of pairs) console.log(p.q, "->", p.a);
`,
        output: `Refund time? -> {"answer":"5 to 7 days"}
Shipping time? -> {"answer":"2 business days"}
Reset password? -> {"answer":"Forgot password"}
Gift card limit? -> {"answer":"not in the FAQ"}
Change address? -> {"answer":"Account settings"}`,
      },
    },
    {
      title: 'Cleaning removes bad pairs',
      detail: 'Remove duplicates, wrong replies, and personal data before training. A pair whose reply says "5 to 7 dys" would teach a typo, so it is dropped. A bad example teaches a bad habit, because the model copies the errors it is trained on.',
      visual: {
        kind: 'compare',
        caption: 'One pair kept and one pair dropped during cleaning.',
        left: { title: 'Kept', items: ['Refund time? -> 5 to 7 days'] },
        right: { title: 'Dropped', items: ['Refund time? -> "5 to 7 dys"', 'Reason: typo in the reply'] },
      },
    },
    {
      title: 'The split holds back test rows',
      detail: 'The rows are cut at 80 percent. The first 80 percent train the model, and the last 20 percent are kept for testing. With five rows, four train the model and one is held back. The test rows are never used for training, so the score stays honest.',
      visual: {
        kind: 'table',
        caption: 'The split of the five rows at 80 percent.',
        columns: ['Use', 'Rows', 'Questions'],
        rows: [
          ['Training', '4', 'Refund time, Shipping time, Reset password, Gift card limit'],
          ['Test', '1', 'Change address'],
        ],
      },
      snippet: {
        source: `const rows = [
  "Refund time?",
  "Shipping time?",
  "Reset password?",
  "Gift card limit?",
  "Change address?",
];
const cut = Math.floor(rows.length * 0.8);
const train = rows.slice(0, cut).length;
console.log("Train:", train, "Test:", rows.length - cut);
`,
        output: `Train: 4 Test: 1`,
      },
    },
    {
      title: 'Each pair becomes one JSON line',
      detail: 'A training file holds one JSON object per line. This layout is common because each line can be read alone. Each object holds a user message and an assistant message. The assistant message is the ideal reply, and its quotes are escaped inside the line.',
      visual: {
        kind: 'flow',
        caption: 'How one pair becomes one line of the training file.',
        nodes: ['User message', 'Assistant message', 'One JSON line'],
      },
      snippet: {
        source: `const row = JSON.stringify({
  messages: [
    { role: "user", content: "Refund time?" },
    { role: "assistant", content: '{"answer":"5 to 7 days"}' },
  ],
});
console.log(row);
`,
        output: `{"messages":[{"role":"user","content":"Refund time?"},{"role":"assistant","content":"{\\"answer\\":\\"5 to 7 days\\"}"}]}`,
      },
    },
    {
      title: 'The training run changes the weights',
      detail: 'The training run changes the model weights, which are the numbers inside the model, using the training rows. Training costs money and time, so start with a small set, such as 100 pairs, before using 10,000. Fine-tuning is a weak place to store facts that change, such as prices.',
      visual: {
        kind: 'bars',
        caption: 'Pairs in each training run, from a small first run to a full one.',
        rows: [
          { label: 'First run', value: 100 },
          { label: 'Full run', value: 10000, highlight: true },
        ],
        unit: 'pairs',
      },
    },
    {
      title: 'The held-out test decides',
      detail: 'Run the new model on the test rows, and compare its replies with the old model. For example, it must beat the old model on 20 test pairs before it ships. Re-test the whole eval set, not only the new format, because training can change other answers.',
      visual: {
        kind: 'compare',
        caption: 'The same test pairs, scored for two models.',
        left: { title: 'Old model', items: ['Same 20 test pairs', 'Score recorded before the change'] },
        right: { title: 'New model', items: ['Same 20 test pairs', 'Must score higher to ship'] },
      },
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
      title: 'One function for every model call',
      detail: 'The rest of the code calls one function, complete(messages). It takes a list of messages and returns text. An interface is a fixed contract that every adapter must follow, so callers never need to know which provider answered.',
      visual: {
        kind: 'flow',
        caption: 'Callers talk to one interface, and only the adapter talks to a provider.',
        nodes: ['Calling code', 'complete(messages)', 'Adapter', 'Provider'],
      },
      snippet: {
        source: `type Message = { role: string; content: string };
type ModelClient = { complete: (m: Message[]) => string };
const alpha: ModelClient = {
  complete: () => "Refunds take 5 to 7 days.",
};
const ask = [{ role: "user", content: "Refund time?" }];
console.log(alpha.complete(ask));
`,
        output: `Refunds take 5 to 7 days.`,
      },
    },
    {
      title: 'Each provider gets an adapter',
      detail: 'An adapter translates the interface into the request format of one provider. Providers differ in message roles, length limits, and error codes, and the adapter hides those differences. The beta adapter has the same signature, so it can replace alpha. In this lesson both adapters are fake, and each returns a fixed reply.',
      visual: {
        kind: 'compare',
        caption: 'Two adapters with the same signature and different replies.',
        left: { title: 'alpha adapter', items: ['Same complete(messages) signature', 'Returns "Refunds take 5 to 7 days."'] },
        right: { title: 'beta adapter', items: ['Same complete(messages) signature', 'Returns "Refunds: 5-7 days."'] },
      },
    },
    {
      title: 'A setting picks the adapter',
      detail: 'A setting, such as PROVIDER set to "alpha", picks the adapter when the program starts. Calling code only reads the chosen client, so changing the setting changes no calling code. The example prints the default name, which is alpha.',
      visual: {
        kind: 'table',
        caption: 'Each setting value and the adapter it selects.',
        columns: ['Setting', 'Adapter used'],
        rows: [
          ['PROVIDER = "alpha"', 'alpha'],
          ['PROVIDER = "beta"', 'beta'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const providers = {
  alpha: { name: "alpha" },
  beta: { name: "beta" },
};
const PROVIDER = "alpha";
console.log("Default ->", providers[PROVIDER].name);
`,
        output: `Default -> alpha`,
      },
    },
    {
      title: 'The same eval runs on each adapter',
      detail: 'Run the same golden set against every adapter, with the same messages. Compare the pass count and the cost of each run, such as 42 of 50 against 39 of 50. The check here is simple: the reply must contain the fact 5 to 7. Record the cost in every eval report, because prices change over time.',
      visual: {
        kind: 'bars',
        caption: 'Illustrative pass counts out of 50 for each provider.',
        rows: [
          { label: 'alpha', value: 42, highlight: true },
          { label: 'beta', value: 39 },
        ],
        unit: 'of 50',
      },
      snippet: {
        source: `const replies = {
  alpha: "Refunds take 5 to 7 days.",
  beta: "Refunds: 5-7 days.",
};
for (const [name, reply] of Object.entries(replies)) {
  console.log(name, reply.includes("5 to 7") ? "PASS" : "FAIL");
}
`,
        output: `alpha PASS
beta FAIL`,
      },
    },
    {
      title: 'Rollback is one setting',
      detail: 'Change the default only when the score and the cost are acceptable. Keep the old adapter, so a rollback is one setting, such as PROVIDER back to "alpha". A cheaper provider that fails the eval is a worse choice, not a bargain.',
      visual: {
        kind: 'flow',
        caption: 'A rollback when the new provider fails the eval.',
        nodes: ['Switch PROVIDER to beta', 'Eval fails', 'PROVIDER back to alpha'],
      },
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
