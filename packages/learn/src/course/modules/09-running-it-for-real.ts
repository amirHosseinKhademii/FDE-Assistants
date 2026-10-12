import type { Lesson, Module } from '../types';

const streamingWithCitations: Lesson = {
  slug: 'streaming-with-citations',
  number: '9.1',
  title: 'Streaming answers with citations',
  navTitle: 'Streaming with citations',
  oneLiner: 'Streaming sends the answer piece by piece as it is written, and sends the citations last.',
  problem: {
    without: 'The reader waits in silence until the whole answer is ready. A long answer can take many seconds.',
    with: 'Text appears as soon as the first piece arrives. The citations follow at the end, once they are known.',
  },
  steps: [
    {
      title: 'Event shapes',
      detail: 'Each stream event is either text or citations. A text event has a value with one piece of the answer. The citations event holds the list of source ids.',
    },
    {
      title: 'Yielding the pieces',
      detail: 'The generator yields one text event per word, each with a trailing space. It then yields one citations event. The sample has six words, so six text events come first.',
    },
    {
      title: 'Reading the stream',
      detail: 'The for await loop takes each event as it arrives. Text is printed right away, and the citations are printed when they arrive. The full answer is joined at the end.',
    },
    {
      title: 'Keeping the spaces',
      detail: 'Each piece keeps its own trailing space. The full answer is trimmed once at the end. This keeps the words from running together.',
    },
  ],
  diagram: ['Model', 'Text events', 'Screen', 'Citations'],
  code: {
    source: `// One event from the stream: a piece of text, or the citations.
type StreamEvent =
  | { type: "text"; value: string }
  | { type: "citations"; ids: string[] };

// A fake stream. It yields one event per word, then the citations.
async function* streamAnswer(words: string[]) {
  for (const word of words) {
    yield { type: "text", value: word + " " } as StreamEvent;
  }
  yield { type: "citations", ids: ["faq-12"] } as StreamEvent;
}

// Show each piece of text as it arrives. Citations come last.
async function main(): Promise<void> {
  const words = ["Refunds", "take", "5", "to", "7", "days."];
  let shown = "";
  for await (const event of streamAnswer(words)) {
    if (event.type === "text") {
      shown += event.value;
      console.log("text: " + JSON.stringify(event.value));
    } else {
      console.log("citations: " + event.ids.join(", "));
    }
  }
  console.log("Full answer: " + shown.trim());
}

main();
`,
    output: `text: "Refunds "
text: "take "
text: "5 "
text: "to "
text: "7 "
text: "days. "
citations: faq-12
Full answer: Refunds take 5 to 7 days.`,
  },
  hood: {
    paragraphs: [
      'An async generator is a function that yields values over time. The for await loop takes each value as it arrives.',
      'StreamEvent is a union of two shapes. The if statement checks the type field, so each branch sees the right fields.',
      'The sample stream has no delay. A real stream waits on the network between events.',
    ],
    example: [
      { label: 'First event', value: 'text, "Refunds "' },
      { label: 'Last text event', value: 'text, "days. "' },
      { label: 'Final event', value: 'citations, faq-12' },
      { label: 'Full answer', value: 'Refunds take 5 to 7 days.' },
    ],
  },
  mistakes: [
    'Showing citations before the answer ends. The list can change, so wait for the citations event.',
    'Losing the text when the stream fails halfway. Show an error and keep what arrived, marked as partial.',
    'Dropping the spaces between pieces. Keep each piece exactly as sent, or the words run together.',
  ],
  useWhen: [
    'Answers are long, and the reader would otherwise wait many seconds.',
    'Each answer must end with its sources.',
  ],
  skipWhen: [
    'Answers are short and return in well under a second.',
    'The reader only sees the final text, such as in an email.',
  ],
  words: [
    { term: 'Stream', meaning: 'A reply sent in pieces over time, not all at once.' },
    { term: 'Event', meaning: 'One item in a stream, such as a text piece or the citations.' },
    { term: 'Async generator', meaning: 'A function that yields values over time instead of returning one value.' },
    { term: 'Partial answer', meaning: 'An answer that is not finished yet.' },
  ],
};

const tracingAndLogs: Lesson = {
  slug: 'tracing-and-logs',
  number: '9.2',
  title: 'Tracing and logs',
  oneLiner: 'A trace records each step of one request, with its start time, duration, and outcome.',
  problem: {
    without: 'A failed request leaves no record of its steps. Nobody can tell whether retrieval, generation, or citing failed.',
    with: 'Each request writes one span per step. A failed step is visible by name, with its time.',
  },
  steps: [
    {
      title: 'The span record',
      detail: 'A span has a request id, a step name, a start time, a duration, and an ok flag. For example, the generate span starts at 40 and lasts 900 milliseconds.',
    },
    {
      title: 'Clock and start times',
      detail: 'The clock starts at zero and moves forward by each duration. A step starts where the previous one ended. The cite step therefore starts at 940.',
    },
    {
      title: 'One line per span',
      detail: 'JSON.stringify turns each span into one line of text. A log reader can then search the lines by requestId or by step name.',
    },
    {
      title: 'Finding the failure',
      detail: 'The generate line has ok set to false, so filtering on that flag finds the failed step. Its duration shows whether the failed step was also slow.',
    },
  ],
  code: {
    source: `// One span records one step: its name, its times, and its outcome.
type Span = {
  requestId: string;
  step: string;
  startMs: number;
  durationMs: number;
  ok: boolean;
};

// A fake clock keeps the output the same on every run.
const requestId = "req-0042";
let clockMs = 0;
const spans: Span[] = [];

// Record one step. Its duration is fixed for this sample.
function traceStep(step: string, durationMs: number, ok: boolean) {
  const startMs = clockMs;
  spans.push({ requestId, step, startMs, durationMs, ok });
  clockMs += durationMs;
}

// Three steps of one request. The generate step fails.
traceStep("retrieve", 40, true);
traceStep("generate", 900, false);
traceStep("cite", 5, true);

// Write one JSON line per span, as a log file would hold them.
for (const span of spans) {
  console.log(JSON.stringify(span));
}
`,
    output: `{"requestId":"req-0042","step":"retrieve","startMs":0,"durationMs":40,"ok":true}
{"requestId":"req-0042","step":"generate","startMs":40,"durationMs":900,"ok":false}
{"requestId":"req-0042","step":"cite","startMs":940,"durationMs":5,"ok":true}`,
  },
  hood: {
    paragraphs: [
      'The times here come from fixed numbers, so the output is the same on every run. A real trace reads the clock at each step.',
      'A start time is the sum of the durations before it. The cite step starts at 940, which is 40 plus 900.',
      'Logs must not hold secrets or full user text. Keep ids and counts, and store text only where your rules allow.',
    ],
    example: [
      { label: 'Request id', value: 'req-0042' },
      { label: 'Step that failed', value: 'generate' },
      { label: 'Its duration', value: '900 milliseconds' },
      { label: 'Start of the cite step', value: '940 milliseconds' },
    ],
  },
  mistakes: [
    'Logging without a request id. Lines from many requests then mix together.',
    'Logging only failures. Without normal timings, a failure has nothing to compare with.',
    'Writing full user text into the log. Logs are read by many people, so keep them small.',
  ],
  useWhen: [
    'A request passes through several steps, and any one of them may fail.',
    'You need to find out why a request was slow.',
  ],
  skipWhen: [
    'The system has one step with no failure cases, and a single counter is enough.',
  ],
  words: [
    { term: 'Trace', meaning: 'The full set of spans for one request.' },
    { term: 'Span', meaning: 'The record of one step, with its start time and duration.' },
    { term: 'Log', meaning: 'A file or stream of records written as the system runs.' },
    { term: 'JSON line', meaning: 'One JSON object written on its own line.' },
  ],
};

const trackingCost: Lesson = {
  slug: 'tracking-cost',
  number: '9.3',
  title: 'Tracking cost',
  oneLiner: 'The cost of a request is its token counts times the price per token, summed over all requests.',
  problem: {
    without: 'The bill arrives at the end of the month. Nobody knows which feature or request caused the spending.',
    with: 'Each request records its tokens, so the cost per request and per day is known as the system runs.',
  },
  steps: [
    {
      title: 'Input and output prices',
      detail: 'The sample uses 2 for input and 8 for output, per million tokens. These prices are invented for the example. Real prices come from the current list that a model provider publishes.',
    },
    {
      title: 'Cost of one request',
      detail: 'Each cost is the token count divided by one million, times the price. For example, 1,200 input tokens cost 0.0024. The 150 output tokens add 0.0012.',
    },
    {
      title: 'The day total',
      detail: 'The day total adds up the cost of every request. The three example requests cost 0.0036, 0.00232, and 0.0112. Their sum is 0.01712.',
    },
    {
      title: 'Rounding for display',
      detail: 'Floating-point math can leave tiny errors. The toFixed call rounds each printed value to six decimal places. The stored numbers do not change.',
    },
  ],
  code: {
    source: `// Example prices per one million tokens. The numbers are invented.
const price = { input: 2, output: 8 };

// The token counts that a model response reports for one request.
type Usage = { input: number; output: number };

// Turn the token counts of one request into dollars.
function costOf(usage: Usage): number {
  const million = 1_000_000;
  const inCost = (usage.input / million) * price.input;
  const outCost = (usage.output / million) * price.output;
  return inCost + outCost;
}

// Three requests from one day, with their token counts.
const requests: Usage[] = [
  { input: 1200, output: 150 },
  { input: 800, output: 90 },
  { input: 4000, output: 400 },
];

// Add up the cost of each request and of the whole day.
let total = 0;
requests.forEach((usage, index) => {
  const cost = costOf(usage);
  total += cost;
  console.log("request " + (index + 1) + ": $" + cost.toFixed(6));
});
console.log("day total: $" + total.toFixed(6));
`,
    output: `request 1: $0.003600
request 2: $0.002320
request 3: $0.011200
day total: $0.017120`,
  },
  hood: {
    paragraphs: [
      'Divide by one million first, then multiply by the price. The result is in dollars, because the price is in dollars.',
      'Floating-point arithmetic can show tiny errors. The toFixed call rounds the printed value to six decimal places.',
      'Real prices change and differ by model. Store the price with each request, so old costs stay correct when prices change.',
    ],
    example: [
      { label: 'Input tokens', value: '1,200' },
      { label: 'Output tokens', value: '150' },
      { label: 'Input cost', value: '0.0024' },
      { label: 'Output cost', value: '0.0012' },
      { label: 'Total', value: '0.0036' },
    ],
  },
  mistakes: [
    'Using a price from memory. Prices change, so read the current price list each time you set them.',
    'Ignoring output tokens. Long answers can cost more than the question that caused them.',
    'Looking only at one day. Compare weeks as well, because a slow rise is easy to miss.',
  ],
  useWhen: [
    'Spending must be tracked per feature or per user.',
    'You plan a budget for a new feature.',
  ],
  skipWhen: [
    'The system runs on a fixed monthly plan with no charge per token.',
  ],
  words: [
    { term: 'Input token', meaning: 'A token sent to the model in the request.' },
    { term: 'Output token', meaning: 'A token that the model writes back.' },
    { term: 'Price per million', meaning: 'The cost of one million tokens, the unit that prices are often given in.' },
    { term: 'Budget', meaning: 'The amount you allow for spending in one period.' },
  ],
};

const caching: Lesson = {
  slug: 'caching',
  number: '9.4',
  title: 'Caching',
  oneLiner: 'A cache saves an answer under a key, so a repeat question gets the saved answer with no model call.',
  problem: {
    without: 'Each repeat question calls the model again. The same answer costs time and money every time.',
    with: 'A repeat question finds its saved answer by key. The model runs only for questions it has not answered.',
  },
  steps: [
    {
      title: 'The normalized question',
      detail: 'The question is trimmed and lowercased before it is hashed. For example, "  how long do REFUNDS take? " becomes the same text as "How long do refunds take?"',
    },
    {
      title: 'The hash key',
      detail: 'The key hashes the model name and the normalized question with SHA-256. The same text always gives the same 64 character hex key. The key is short enough to store as a map key.',
    },
    {
      title: 'A hit and a miss',
      detail: 'A hit returns the saved answer and makes no model call. A miss calls the model once and saves the answer under the key. The sample has one miss for each model.',
    },
    {
      title: 'Counting the savings',
      detail: 'The modelCalls counter counts how many times the model runs. The sample asks three times, and the model runs twice. The cache holds two entries, one for each model.',
    },
  ],
  code: {
    source: `import { createHash } from "node:crypto";

// Saved answers, keyed by a hash. Repeats skip the model.
const cache = new Map<string, string>();
let modelCalls = 0;

// The key hashes the model name and the normalized question.
function cacheKey(question: string, model: string): string {
  const text = model + "|" + question.trim().toLowerCase();
  return createHash("sha256").update(text).digest("hex");
}

// Return the saved answer, or call the fake model once and save it.
function answer(question: string, model: string): string {
  const key = cacheKey(question, model);
  if (cache.has(key)) return cache.get(key) as string;
  modelCalls++;
  const fresh = "Answer to: " + question.trim();
  cache.set(key, fresh);
  return fresh;
}

// Repeat with other spacing and case, then with another model.
console.log(answer("How long do refunds take?", "model-a"));
console.log(answer("  how long do REFUNDS take? ", "model-a"));
console.log(answer("How long do refunds take?", "model-b"));
console.log("Model calls: " + modelCalls);
console.log("Cache entries: " + cache.size);
`,
    output: `Answer to: How long do refunds take?
Answer to: How long do refunds take?
Answer to: How long do refunds take?
Model calls: 2
Cache entries: 2`,
  },
  hood: {
    paragraphs: [
      'SHA-256 is a hash function from the Node.js crypto module. The same input always gives the same hash.',
      'The key holds the model name, because two models give different answers. A real key also holds the prompt version and the source version.',
      'Normalizing is a choice. Two questions with different meanings must not share a key, so keep the normalizing simple.',
    ],
    example: [
      { label: 'Repeat with other spacing', value: 'same key, cache hit' },
      { label: 'Same question, other model', value: 'new key, model call' },
      { label: 'Model calls', value: '2' },
      { label: 'Cache entries', value: '2' },
    ],
  },
  mistakes: [
    'Leaving the model name out of the key. An answer from one model is then served for another.',
    'Leaving the sources or the prompt version out of the key. Old answers then survive a change to the documents.',
    'Caching a refused or failed answer. Save only answers that passed the checks.',
  ],
  useWhen: [
    'Many users ask the same questions.',
    'Answers are slow or costly, and they do not change between requests.',
  ],
  skipWhen: [
    'Each question is unique, so there are no repeats to save.',
    'Answers must reflect the newest data on every request.',
  ],
  words: [
    { term: 'Cache', meaning: 'A store that keeps results so they can be reused.' },
    { term: 'Key', meaning: 'The value that finds a saved item in a cache.' },
    { term: 'Hash', meaning: 'A fixed-length code computed from text, the same for the same text.' },
    { term: 'Cache hit', meaning: 'A request answered from the cache, with no model call.' },
  ],
};

const drift: Lesson = {
  slug: 'drift',
  number: '9.5',
  title: 'Drift',
  oneLiner: 'Drift is a slow change in answer quality, found by running the same fixed test set over time.',
  problem: {
    without: 'Quality falls by a few points each week. Nobody notices until users complain.',
    with: 'A weekly run on the same test set shows the trend. A drop past a set threshold raises a flag.',
  },
  steps: [
    {
      title: 'The fixed test set',
      detail: 'Each weekly run asks the same questions and checks the same expected sources. A pass rate is the passed checks divided by all checks. For example, 0.92 means that 92 of 100 checks passed.',
    },
    {
      title: 'The baseline',
      detail: 'The baseline is the average of the first four weeks. The sample adds 0.92, 0.91, 0.93, and 0.90, which sum to 3.66. Dividing 3.66 by 4 gives 0.915.',
    },
    {
      title: 'The threshold',
      detail: 'A week is flagged when it is more than 0.05 below the baseline. Week 4 is 0.015 below, so it is ok. Week 5 is 0.075 below, so it is flagged.',
    },
    {
      title: 'Reading the output',
      detail: 'Each line shows the week, its rate to two decimals, and a flag. Only week 5 shows DRIFT. A flag starts an investigation, not a fix.',
    },
  ],
  code: {
    source: `// Weekly pass rate on the same fixed eval set, as a fraction.
const weeklyPassRate = [0.92, 0.91, 0.93, 0.9, 0.84];

// The baseline is the average of the first four weeks.
const firstWeeks = weeklyPassRate.slice(0, 4);
const sum = firstWeeks.reduce((total, rate) => total + rate, 0);
const baseline = sum / firstWeeks.length;

// Flag a week that falls more than five points below the baseline.
const threshold = 0.05;
weeklyPassRate.forEach((rate, index) => {
  const drop = baseline - rate;
  const flag = drop > threshold ? "DRIFT" : "ok";
  const label = "week " + (index + 1) + ": " + rate.toFixed(2);
  console.log(label + " " + flag);
});
`,
    output: `week 1: 0.92 ok
week 2: 0.91 ok
week 3: 0.93 ok
week 4: 0.90 ok
week 5: 0.84 DRIFT`,
  },
  hood: {
    paragraphs: [
      'The pass rate is the passed checks divided by all checks, on the same set. It stays comparable when the set does not change.',
      'Drift has many causes. New documents, changed prompts, and model updates can each shift answers, so a flag starts an investigation.',
      'The threshold is a choice. A tight threshold flags noise, and a loose one misses real drops.',
    ],
    example: [
      { label: 'Baseline', value: '0.915' },
      { label: 'Week 4', value: '0.90, drop 0.015, ok' },
      { label: 'Week 5', value: '0.84, drop 0.075, DRIFT' },
    ],
  },
  mistakes: [
    'Changing the test set each week. The scores then measure the new set, not the drift.',
    'Using one run as the baseline. One unusual run sets the wrong reference line.',
    'Setting the threshold once and never checking it. Test it against real past changes.',
  ],
  useWhen: [
    'The system runs for months while documents or models change.',
    'Users report that quality is falling, with no clear change to blame.',
  ],
  skipWhen: [
    'The system is new and changes often, so a baseline has no meaning yet.',
  ],
  words: [
    { term: 'Drift', meaning: 'A slow change in quality over time.' },
    { term: 'Baseline', meaning: 'A reference score that new runs are compared with.' },
    { term: 'Threshold', meaning: 'The size of a change that raises a flag.' },
    { term: 'Pass rate', meaning: 'The share of checks that passed in one run.' },
  ],
};

const debuggingABadAnswer: Lesson = {
  slug: 'debugging-a-bad-answer',
  number: '9.6',
  title: 'Debugging a bad answer',
  oneLiner: 'Debug a bad answer by checking the stages in order and naming the first stage that failed.',
  problem: {
    without: 'The answer is wrong, so a fix is guessed. A prompt change is tried, and the answer still fails for another reason.',
    with: 'A logged request shows what each stage produced. The first failing stage points to the fix.',
  },
  steps: [
    {
      title: 'Stages in order',
      detail: 'A request passes through retrieval, context, and generation, in that order. Each stage can fail on its own. The check goes through the stages in the same order.',
    },
    {
      title: 'Retrieval failure',
      detail: 'Run A retrieved only faq-40, so the expected faq-12 was never found. Changing the prompt cannot help a run like this. The search must change.',
    },
    {
      title: 'Context failure',
      detail: 'Run B retrieved faq-12 but sent only faq-40 to the model. The context builder dropped the source. A size limit or a sorting bug is a likely cause.',
    },
    {
      title: 'Generation failure',
      detail: 'Run C sent faq-12, and the answer was still wrong. The prompt, the rules, or the model is the cause now. Change the prompt, then run the eval set again.',
    },
  ],
  code: {
    source: `// Logged runs: name, retrieved ids, context ids, correct answer.
// Each one should have used the source faq-12.
const runs: [string, string[], string[], boolean][] = [
  ["A", ["faq-40"], ["faq-40"], false],
  ["B", ["faq-12", "faq-40"], ["faq-40"], false],
  ["C", ["faq-12"], ["faq-12"], false],
  ["D", ["faq-12"], ["faq-12"], true],
];

// Check the stages in order. Name the first stage that failed.
function diagnose(found: string[], sent: string[], ok: boolean) {
  if (!found.includes("faq-12")) return "retrieval";
  if (!sent.includes("faq-12")) return "context";
  if (!ok) return "generation";
  return "no failure";
}

// Print the stage that failed for each logged request.
for (const [name, found, sent, ok] of runs) {
  console.log(name + ": " + diagnose(found, sent, ok));
}
`,
    output: `A: retrieval
B: context
C: generation
D: no failure`,
  },
  hood: {
    paragraphs: [
      'The order matters. A missing source at retrieval makes every later stage look wrong, so check the earliest stage first.',
      'Each check returns a stage name. The same names let you group many failed requests in one report.',
      'The sample has four logged runs. Run A failed at retrieval, run B at context, run C at generation, and run D passed.',
    ],
    example: [
      { label: 'Run A', value: 'retrieval, faq-12 not retrieved' },
      { label: 'Run B', value: 'context, faq-12 retrieved but not sent' },
      { label: 'Run C', value: 'generation, source sent but answer wrong' },
      { label: 'Run D', value: 'no failure' },
    ],
  },
  mistakes: [
    'Changing the prompt first. Many bad answers start at retrieval or context, not at the wording.',
    'Judging a stage without its log. A guess skips the evidence that the log holds.',
    'Stopping at the first wrong-looking answer. Check every logged request that shares the failure.',
  ],
  useWhen: [
    'A user reports a wrong answer, and you need the cause.',
    'A change made the eval scores drop.',
  ],
  skipWhen: [
    'The answer is right, and you only want to change its wording.',
  ],
  words: [
    { term: 'Stage', meaning: 'One step of the pipeline, such as retrieval or generation.' },
    { term: 'Retrieval', meaning: 'Finding the source chunks for a question.' },
    { term: 'Log entry', meaning: 'The record kept for one request.' },
    { term: 'Failed stage', meaning: 'The first stage that went wrong, which explains the rest.' },
  ],
};

export const runningItForReal: Module = {
  slug: 'running-it-for-real',
  number: 9,
  title: 'Running it for real',
  summary: 'What changes when real users arrive: streaming, logs, cost, caching, drift, and debugging.',
  lessons: [
    streamingWithCitations,
    tracingAndLogs,
    trackingCost,
    caching,
    drift,
    debuggingABadAnswer,
  ],
};
