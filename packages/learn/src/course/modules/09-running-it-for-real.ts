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
      title: 'Text arrives one piece at a time',
      detail: 'The model writes its answer in small pieces, and each piece is sent as soon as it exists. The sample answer arrives as six pieces, each with a trailing space. The screen can show each piece at once.',
      visual: {
        kind: 'chips',
        caption: 'The six pieces of the sample answer, in arrival order.',
        items: [
          { text: 'Refunds ' },
          { text: 'take ' },
          { text: '5 ' },
          { text: 'to ' },
          { text: '7 ' },
          { text: 'days. ', note: 'last text piece' },
        ],
      },
    },
    {
      title: 'A generator yields each piece',
      detail: 'An async generator is a function that yields values over time. Each yield hands one piece to the caller, and the caller reads it with for await. The sample yields two pieces to show the pattern.',
      snippet: {
        source: `async function* streamWords() {
  for (const word of ["Refunds", "take"]) {
    yield word + " ";
  }
}
(async () => {
  for await (const piece of streamWords()) {
    console.log(JSON.stringify(piece));
  }
})();
`,
        output: `"Refunds "
"take "`,
      },
    },
    {
      title: 'Citations come last',
      detail: 'The stream carries two kinds of event. Text events hold one piece of the answer each. The citations event holds the source ids, and it arrives only after the last text piece.',
      visual: {
        kind: 'table',
        caption: 'The two event kinds in the sample stream.',
        columns: ['Event', 'Holds', 'When it arrives'],
        rows: [
          ['text', 'one piece of the answer', 'as each piece is written'],
          ['citations', 'the source ids, such as faq-12', 'after the last text piece'],
        ],
        highlightRow: 1,
      },
    },
    {
      title: 'The screen joins the pieces',
      detail: 'Each piece keeps its own trailing space, so the pieces join with the right gaps. The full answer is trimmed once at the end, which removes the last space. The sample joins six pieces into one sentence.',
      visual: {
        kind: 'flow',
        caption: 'The path of one answer from the model to the screen.',
        nodes: ['Model', 'Text events', 'Screen', 'Citations'],
      },
      snippet: {
        source: `const pieces = ["Refunds ", "take ", "5 to 7 days."];
let shown = "";
for (const piece of pieces) {
  shown += piece;
}
console.log(shown.trim());
`,
        output: `Refunds take 5 to 7 days.`,
      },
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
      title: 'A span records one step',
      detail: 'A span holds a request id, a step name, a start time, a duration, and an ok flag. The generate span in the sample starts at 40 milliseconds and lasts 900 milliseconds. Its ok flag is false, so it failed.',
      visual: {
        kind: 'table',
        caption: 'The fields of the generate span.',
        columns: ['Field', 'Value'],
        rows: [
          ['requestId', 'req-0042'],
          ['step', 'generate'],
          ['startMs', '40'],
          ['durationMs', '900'],
          ['ok', 'false'],
        ],
        highlightRow: 4,
      },
    },
    {
      title: 'The clock adds up the durations',
      detail: 'The clock starts at zero and moves forward by each duration. A step starts where the previous step ended. The retrieve step takes 40 milliseconds, so generate starts at 40, and cite starts at 940.',
      visual: {
        kind: 'bars',
        caption: 'How long each step of the sample request took.',
        unit: 'ms',
        rows: [
          { label: 'retrieve', value: 40 },
          { label: 'generate', value: 900, highlight: true },
          { label: 'cite', value: 5 },
        ],
      },
    },
    {
      title: 'Each span is one JSON line',
      detail: 'JSON.stringify turns a span into one line of text. A log file holds one line per span. A reader can then search the lines by requestId or by step name.',
      snippet: {
        source: `const span = {
  requestId: "req-0042",
  step: "generate",
  startMs: 40,
  durationMs: 900,
  ok: false,
};
console.log(JSON.stringify(span));
`,
        output: `{"requestId":"req-0042","step":"generate","startMs":40,"durationMs":900,"ok":false}`,
      },
    },
    {
      title: 'The ok flag finds the failure',
      detail: 'Filtering the lines on ok set to false finds the failed step. The sample log has two lines, and only the generate line is marked as failed. Its duration then shows whether the failure was also slow.',
      snippet: {
        source: `const lines = [
  '{"step":"retrieve","ok":true}',
  '{"step":"generate","ok":false}',
];
for (const line of lines) {
  const span = JSON.parse(line);
  if (!span.ok) console.log("Failed step: " + span.step);
}
`,
        output: `Failed step: generate`,
      },
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
      title: 'Prices are per million tokens',
      detail: 'The sample uses 2 for input tokens and 8 for output tokens, per million tokens. These prices are invented for the example. Real prices come from the current price list that a model provider publishes.',
      visual: {
        kind: 'table',
        caption: 'The example prices used in the sample, per million tokens.',
        columns: ['Token type', 'Price per million'],
        rows: [
          ['input', '2'],
          ['output', '8'],
        ],
      },
    },
    {
      title: 'The cost of one request',
      detail: 'Each token count is divided by one million and then multiplied by its price. The 1,200 input tokens cost 0.0024, and the 150 output tokens cost 0.0012. Together they cost 0.0036.',
      visual: {
        kind: 'bars',
        caption: 'The two parts of the cost of request 1, in dollars.',
        unit: 'USD',
        rows: [
          { label: 'Input, 1,200 tokens', value: 0.0024 },
          { label: 'Output, 150 tokens', value: 0.0012 },
        ],
      },
      snippet: {
        source: `const price = { input: 2, output: 8 };
const usage = { input: 1200, output: 150 };
const cost = (usage.input / 1_000_000) * price.input
  + (usage.output / 1_000_000) * price.output;
console.log(cost.toFixed(6));
`,
        output: `0.003600`,
      },
    },
    {
      title: 'The day total adds the requests',
      detail: 'The day total adds up the cost of every request. The three example requests cost 0.0036, 0.00232, and 0.0112. Their sum is 0.01712, which prints as 0.017120 with six decimal places.',
      visual: {
        kind: 'bars',
        caption: 'Cost of each request, in dollars.',
        unit: 'USD',
        rows: [
          { label: 'Request 1', value: 0.0036 },
          { label: 'Request 2', value: 0.00232 },
          { label: 'Request 3', value: 0.0112, highlight: true },
        ],
      },
    },
    {
      title: 'Rounding changes only the display',
      detail: 'Floating-point math can leave tiny errors, because a computer stores decimals in binary. The toFixed call rounds the value only for printing. The stored number keeps its full precision.',
      snippet: {
        source: `const total = 0.1 + 0.2;
console.log(total);
console.log(total.toFixed(6));
`,
        output: `0.30000000000000004
0.300000`,
      },
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
      title: 'Normalize before hashing',
      detail: 'The question is trimmed and lowercased before it is hashed. Two questions that differ only in spacing or case then give the same key. The sample turns the question into one plain form.',
      snippet: {
        source: `const raw = "  how long do REFUNDS take? ";
const normal = raw.trim().toLowerCase();
console.log(JSON.stringify(normal));
`,
        output: `"how long do refunds take?"`,
      },
    },
    {
      title: 'The key is a SHA-256 hash',
      detail: 'SHA-256 is a hash function, which turns any text into a fixed-length code. The key hashes the model name and the normalized question together. The same text always gives the same code, so it works as a lookup key.',
      snippet: {
        source: `import { createHash } from "node:crypto";
const text = "model-a|how long do refunds take?";
const key = createHash("sha256").update(text).digest("hex");
console.log("Key starts with " + key.slice(0, 12));
console.log("Key length: " + key.length);
`,
        output: `Key starts with 27384c6a4ec6
Key length: 64`,
      },
    },
    {
      title: 'A hit skips the model',
      detail: 'A hit finds the saved answer under the key and makes no model call. A miss calls the model once and saves the answer under the key. The table shows three requests, and only the first and third miss.',
      visual: {
        kind: 'table',
        caption: 'Three requests, and whether each one reaches the model.',
        columns: ['Request', 'Key found', 'Model call'],
        rows: [
          ['How long do refunds take? (model-a)', 'no', 'yes'],
          ['Same question, extra spaces (model-a)', 'yes', 'no'],
          ['Same question (model-b)', 'no', 'yes'],
        ],
        highlightRow: 1,
      },
    },
    {
      title: 'Counting calls shows the saving',
      detail: 'The modelCalls counter counts how many times the model runs. The sample makes three requests, and the model runs only twice. The cache holds two entries, one for each model.',
      visual: {
        kind: 'bars',
        caption: 'Requests made, and model calls actually made.',
        rows: [
          { label: 'Requests', value: 3 },
          { label: 'Model calls', value: 2, highlight: true },
        ],
      },
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
      title: 'A pass rate is a share of checks',
      detail: 'Each weekly run asks the same questions and checks the same expected sources. The pass rate is the passed checks divided by all checks. A rate of 0.92 means that 92 of 100 checks passed.',
      visual: {
        kind: 'table',
        caption: 'Two weeks of the fixed test set, as checks passed.',
        columns: ['Week', 'Checks passed', 'Pass rate'],
        rows: [
          ['1', '92 of 100', '0.92'],
          ['5', '84 of 100', '0.84'],
        ],
      },
    },
    {
      title: 'The baseline averages the first four weeks',
      detail: 'The baseline is the average pass rate of the first four weeks. The four rates add up to 3.66, and dividing by four gives a baseline of 0.915. Later weeks are compared with that line.',
      visual: {
        kind: 'line',
        caption: 'Pass rate by week, from the sample runs.',
        xLabel: 'Week',
        yLabel: 'Pass rate',
        series: [
          {
            name: 'Pass rate',
            points: [
              { x: 1, y: 0.92 },
              { x: 2, y: 0.91 },
              { x: 3, y: 0.93 },
              { x: 4, y: 0.9 },
              { x: 5, y: 0.84 },
            ],
          },
        ],
      },
      snippet: {
        source: `const weeks = [0.92, 0.91, 0.93, 0.9];
const sum = weeks.reduce((total, rate) => total + rate, 0);
console.log("Baseline: " + (sum / weeks.length).toFixed(3));
`,
        output: `Baseline: 0.915`,
      },
    },
    {
      title: 'The threshold flags a drop of more than 0.05',
      detail: 'A week is flagged when its rate is more than 0.05 below the baseline. Weeks 1 to 4 are within that range. Week 5 is 0.075 below the baseline, so it is flagged.',
      visual: {
        kind: 'table',
        caption: 'Each week, its drop below the baseline of 0.915, and its flag.',
        columns: ['Week', 'Rate', 'Drop', 'Flag'],
        rows: [
          ['1', '0.92', '-0.005', 'ok'],
          ['2', '0.91', '0.005', 'ok'],
          ['3', '0.93', '-0.015', 'ok'],
          ['4', '0.90', '0.015', 'ok'],
          ['5', '0.84', '0.075', 'DRIFT'],
        ],
        highlightRow: 4,
      },
    },
    {
      title: 'A flag starts a check, not a fix',
      detail: 'A flag tells you that quality dropped, but not why. The next step is to find the changed document, prompt, or model. Only then does a fix follow.',
      snippet: {
        source: `const baseline = 0.915;
const rate = 0.84;
const drop = baseline - rate;
console.log(drop > 0.05 ? "DRIFT" : "ok");
`,
        output: `DRIFT`,
      },
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
      title: 'Stages run in a fixed order',
      detail: 'A request passes through retrieval, context, and generation, in that order. Retrieval finds the source chunks, context builds the text the model reads, and generation writes the answer. Each stage can fail on its own.',
      visual: {
        kind: 'flow',
        caption: 'The stages of one request, from left to right.',
        nodes: ['Retrieval', 'Context', 'Generation', 'Answer'],
      },
    },
    {
      title: 'Retrieval checks the found ids',
      detail: 'The expected source is faq-12. In run A, retrieval found only faq-40, so faq-12 never reached the context. A prompt change cannot fix that run, so the search must change.',
      visual: {
        kind: 'table',
        caption: 'Four logged runs. Each should have used faq-12.',
        columns: ['Run', 'Found', 'Sent', 'Answer right', 'First failed stage'],
        rows: [
          ['A', 'faq-40', 'faq-40', 'no', 'retrieval'],
          ['B', 'faq-12, faq-40', 'faq-40', 'no', 'context'],
          ['C', 'faq-12', 'faq-12', 'no', 'generation'],
          ['D', 'faq-12', 'faq-12', 'yes', 'none'],
        ],
        highlightRow: 0,
      },
      snippet: {
        source: `const found = ["faq-40"];
if (!found.includes("faq-12")) console.log("retrieval");
`,
        output: `retrieval`,
      },
    },
    {
      title: 'Context checks the sent ids',
      detail: 'Run B found faq-12, but the context sent only faq-40 to the model. The context builder dropped the source. A size limit or a sorting bug is a likely cause.',
      snippet: {
        source: `const found = ["faq-12", "faq-40"];
const sent = ["faq-40"];
if (found.includes("faq-12") && !sent.includes("faq-12")) {
  console.log("context");
}
`,
        output: `context`,
      },
    },
    {
      title: 'Generation fails last',
      detail: 'Run C sent faq-12, and the answer was still wrong. The prompt, the rules, or the model is the cause now. Change the prompt, then run the eval set again to confirm the fix.',
      visual: {
        kind: 'chips',
        caption: 'The stage that failed for each logged run.',
        items: [
          { text: 'A', note: 'retrieval' },
          { text: 'B', note: 'context' },
          { text: 'C', note: 'generation', highlight: true },
          { text: 'D', note: 'no failure' },
        ],
      },
      snippet: {
        source: `const sent = ["faq-12"];
const answerRight = false;
const sentSource = sent.includes("faq-12");
if (sentSource && !answerRight) console.log("generation");
`,
        output: `generation`,
      },
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
