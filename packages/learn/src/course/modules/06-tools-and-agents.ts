import type { Lesson, Module } from '../types';

const whatAToolIs: Lesson = {
  slug: 'what-a-tool-is',
  number: '6.1',
  title: 'What a tool is',
  oneLiner: 'A tool is a named function the model may ask your code to run, with a description and typed inputs.',
  problem: {
    without: 'The model can only write text. It cannot check an order status or read a customer record.',
    with: 'The model asks for a named tool with its inputs. Your code runs the tool and returns the result as text.',
  },
  steps: [
    {
      title: 'Give the tool a name',
      detail: 'Pick a short name that says what the tool does, such as get_order. The model uses this name when it asks for the tool.',
    },
    {
      title: 'Describe the tool',
      detail: 'The description tells the model when to use the tool. For example: "Return the status of one order by its id."',
    },
    {
      title: 'List the inputs with types',
      detail: 'Each input has a name and a type, such as orderId as a string. The model fills in these inputs when it asks for the tool.',
    },
    {
      title: 'Write the function',
      detail: 'The function runs only when your code calls it. It returns plain text, so the model can read the result.',
    },
  ],
  code: {
    source: `// A tool has a name, a description for the model, and typed inputs.
type Tool = {
  name: string;
  description: string;
  parameters: Record<string, string>;
  run: (input: Record<string, string>) => string;
};

// A lookup tool that returns the status of one order.
const getOrder: Tool = {
  name: "get_order",
  description: "Return the status of one order by its id.",
  parameters: { orderId: "string" },
  run: (input) => "Order " + input.orderId + " shipped on Monday.",
};

// The model sees the name, the description, and the parameters.
const { run, ...forModel } = getOrder;
console.log(JSON.stringify(forModel, null, 2));

// Your code runs the function only when it is asked to.
console.log(getOrder.run({ orderId: "A-1042" }));
`,
    output: `{
  "name": "get_order",
  "description": "Return the status of one order by its id.",
  "parameters": {
    "orderId": "string"
  }
}
Order A-1042 shipped on Monday.`,
  },
  hood: {
    paragraphs: [
      'The model sees only the name, the description, and the parameters. It never sees the body of the function.',
      'The line that starts with const removes the run function and keeps the rest. That rest is what the model receives.',
      'The description is the main hint to the model, so write it as one plain sentence.',
    ],
    example: [
      { label: 'Name', value: 'get_order' },
      { label: 'Input', value: 'orderId, a string' },
      { label: 'Result text', value: 'Order A-1042 shipped on Monday.' },
    ],
  },
  mistakes: [
    'Writing a vague description. The model then calls the tool at the wrong time, or never calls it.',
    'Returning raw data with no labels. Return text that a reader could understand without the code.',
    'Letting a tool change data before any check. Start with read-only tools.',
  ],
  useWhen: [
    'The model must check current data, such as an order status.',
    'An action must run in your code, such as sending a reply.',
  ],
  skipWhen: [
    'The answer is already in the sources sent with the question.',
    'Your own code can run the step with no model deciding anything.',
  ],
  words: [
    { term: 'Tool', meaning: 'A named function that the model can ask your code to run.' },
    { term: 'Parameter', meaning: 'A named input that a tool needs, with its type.' },
    { term: 'Description', meaning: 'A short sentence that tells the model when to use a tool.' },
  ],
};

const toolCallingLoop: Lesson = {
  slug: 'tool-calling-loop',
  number: '6.2',
  title: 'The tool-calling loop',
  oneLiner: 'The loop sends the messages, runs each tool the model asks for, and stops at a text answer.',
  problem: {
    without: 'One request gives one reply. The model cannot ask for data and then use the data it gets back.',
    with: 'Each tool result is added to the messages and sent again. The loop ends at a text reply or at a turn cap.',
  },
  steps: [
    {
      title: 'Send the messages',
      detail: 'The loop sends the question and every earlier message to the model. The model replies with a tool call or with text.',
    },
    {
      title: 'Run the tool',
      detail: 'For a tool call, the loop finds the tool by its name and runs it with the inputs. For example, get_order runs with orderId A-1042.',
    },
    {
      title: 'Keep the result',
      detail: 'The result is added to the messages, so the next request contains it. The model reads the result on its next turn.',
    },
    {
      title: 'Stop at text or at the cap',
      detail: 'When the reply is text, the loop returns it. A turn cap of five stops a loop that never finishes.',
    },
  ],
  diagram: ['Messages', 'Model', 'Run tool', 'Add result', 'Answer'],
  code: {
    source: `// One reply from the model: either a tool call or final text.
type Reply =
  | { type: "tool_call"; name: string; orderId: string }
  | { type: "text"; text: string };

// A fake model. It asks for a tool first, then gives text.
const replies: Reply[] = [
  { type: "tool_call", name: "get_order", orderId: "A-1042" },
  { type: "text", text: "Order A-1042 shipped on Monday." },
];

// Each tool is a plain function, looked up by its name.
const tools: Record<string, (id: string) => string> = {
  get_order: (id) => "Order " + id + " shipped.",
};

// Repeat until the model gives text, or the turn cap is reached.
const maxTurns = 5;
for (let turn = 1; turn <= maxTurns; turn++) {
  const reply = replies[turn - 1];
  if (reply.type === "text") {
    console.log("Answer on turn " + turn + ": " + reply.text);
    break;
  }
  const result = tools[reply.name](reply.orderId);
  const label = "Turn " + turn + " ran " + reply.name;
  console.log(label + ": " + result);
}
`,
    output: `Turn 1 ran get_order: Order A-1042 shipped.
Answer on turn 2: Order A-1042 shipped on Monday.`,
  },
  hood: {
    paragraphs: [
      'The model does not run anything. It writes a request, and the loop decides whether to run it.',
      'The sample uses a fixed list of replies in place of a real model. The output shows the steps a real loop takes.',
      'A real loop must report an unknown tool name as an error. It must not skip the request in silence.',
    ],
    example: [
      { label: 'Turn 1 reply', value: 'tool call, get_order, orderId A-1042' },
      { label: 'Turn 1 result', value: 'Order A-1042 shipped.' },
      { label: 'Turn 2 reply', value: 'text, shipped on Monday' },
      { label: 'Turns used', value: '2' },
    ],
  },
  mistakes: [
    'No turn cap. A model that keeps asking for tools would run forever.',
    'Dropping tool results from the messages. The model then cannot use them on the next turn.',
    'Trusting a tool name without a lookup. An unknown name must return an error message.',
  ],
  useWhen: [
    'The answer needs live data, such as a status or a record.',
    'The model must chain steps, such as find an id and then look it up.',
  ],
  skipWhen: [
    'The task is one fixed step that your code can do without a model.',
    'The answer is already in the sources sent with the question.',
  ],
  words: [
    { term: 'Loop', meaning: 'Code that repeats steps until a stop condition is met.' },
    { term: 'Turn', meaning: 'One request to the model and its reply.' },
    { term: 'Turn cap', meaning: 'The maximum number of turns, which stops a loop that never ends.' },
    { term: 'Message', meaning: 'One entry in the list sent to the model, such as a question or a tool result.' },
  ],
};

const lookupVsSearchTools: Lesson = {
  slug: 'lookup-vs-search-tools',
  number: '6.3',
  title: 'Lookup tools and search tools',
  navTitle: 'Lookup vs search',
  oneLiner: 'A lookup tool returns one exact record, and a search tool returns the best matches with scores.',
  problem: {
    without: 'Every question goes through one search. A question with an exact id can return a similar record instead of the right one.',
    with: 'Exact questions use a lookup that returns one record or a clear not-found. Open questions use a search with ranked matches.',
  },
  steps: [
    {
      title: 'Use lookup for an exact key',
      detail: 'A lookup takes a key, such as order id A-1042, and returns one record. If the key is missing, it says that no record was found.',
    },
    {
      title: 'Use search for words or topics',
      detail: 'A search takes a question and scores each article. For example, "refund order number" scores the refund article with three shared words.',
    },
    {
      title: 'Return ranked results with scores',
      detail: 'A search returns the best few results, each with its score. The model sees which result matched the most words.',
    },
    {
      title: 'Let the model judge weak matches',
      detail: 'A search returns the top results even when every score is zero. The code does not decide that nothing matches. The model reads the results and decides.',
    },
  ],
  code: {
    source: `// Exact lookup: one record for one id, or nothing at all.
const orders = new Map([["A-1042", "shipped"]]);
function getOrder(orderId: string): string {
  const status = orders.get(orderId);
  return status ? orderId + " is " + status : "No order " + orderId;
}

// Search: count shared words per article, keep the best few.
const articles = [
  "Refunds take 5 to 7 days.",
  "Gift cards never expire.",
  "Refund requests need the order number.",
];
function searchArticles(query: string, limit: number): string[] {
  const words = query.toLowerCase().split(" ");
  const scored = articles.map((text) => {
    const lower = text.toLowerCase();
    const hits = words.filter((w) => lower.includes(w));
    return { text, score: hits.length };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored.slice(0, limit);
  return best.map((s) => s.text + " (score " + s.score + ")");
}

// One exact lookup, one miss, then two searches.
console.log(getOrder("A-1042"));
console.log(getOrder("A-9999"));
console.log(searchArticles("refund order number", 2).join("\\n"));
console.log(searchArticles("rideshare", 1)[0]);
`,
    output: `A-1042 is shipped
No order A-9999
Refund requests need the order number. (score 3)
Refunds take 5 to 7 days. (score 1)
Refunds take 5 to 7 days. (score 0)`,
  },
  hood: {
    paragraphs: [
      'Counting shared words is the simplest kind of search. Later lessons replace it with a search by meaning.',
      'The Map stores one status for each key. A missing key returns undefined, and the code turns that into a clear message.',
      'The sort puts the highest score first. Two results with the same score keep their original order.',
    ],
    example: [
      { label: 'Query', value: '"refund order number"' },
      { label: 'Shared words with the third article', value: '3' },
      { label: 'Top result', value: 'Refund requests need the order number.' },
      { label: 'Lookup for A-9999', value: 'No order A-9999' },
    ],
  },
  mistakes: [
    'Searching for an exact id. A search can return a similar record instead of the one asked for.',
    'Expecting the search to have a score cutoff. Without one, the model must judge weak results.',
    'Treating shared words as meaning. Use word counting only as a first step.',
  ],
  useWhen: [
    'The question names one record, such as an order id.',
    'The question is open, such as a topic or a symptom.',
  ],
  skipWhen: [
    'The records are few, and a plain list is easy to read.',
  ],
  words: [
    { term: 'Lookup', meaning: 'A tool that returns one record for one exact key.' },
    { term: 'Search', meaning: 'A tool that ranks records by how well they match a query.' },
    { term: 'Score', meaning: 'A number that says how well one record matches the query.' },
    { term: 'Key', meaning: 'The exact value that a lookup uses, such as an order id.' },
  ],
};

const wrappingAMessyApi: Lesson = {
  slug: 'wrapping-a-messy-api',
  number: '6.4',
  title: 'Wrapping a messy API',
  oneLiner: 'A wrapper hides paging, retries, and errors behind one function that returns typed records.',
  problem: {
    without: 'Each tool calls the raw API on its own. Paging, rate limits, and odd responses are repeated in every tool.',
    with: 'One wrapper handles paging, retries, and errors. Each tool gets a clean list of records with known types.',
  },
  steps: [
    {
      title: 'Follow every page',
      detail: 'A paged API returns part of the data and the number of the next page. The wrapper keeps asking until there is no next page.',
    },
    {
      title: 'Retry a rate limit',
      detail: 'The API may answer rate limited for a moment. The wrapper tries the same page again, up to a fixed number of attempts.',
    },
    {
      title: 'Report the final failure',
      detail: 'After the last attempt, the wrapper throws an error that names the page. The failure is never hidden as an empty list.',
    },
    {
      title: 'Return typed records',
      detail: 'The wrapper returns a list of records with known types. The tools built on it never see the raw responses.',
    },
  ],
  code: {
    source: `// One page of results and the number of the next page, if any.
type Page = { items: string[]; nextPage: number | null };

// A fake API. Page 2 is rate limited once, then it works.
let rateLimitsLeft = 1;
function callApi(page: number): Page | null {
  if (page === 2 && rateLimitsLeft > 0) {
    rateLimitsLeft--;
    return null;
  }
  const items = page === 1 ? ["A-1", "A-2"] : ["A-3"];
  return { items, nextPage: page === 1 ? 2 : null };
}

// Read every page. Retry a rate-limited page up to three attempts.
function fetchAll(): string[] {
  const all: string[] = [];
  let page: number | null = 1;
  while (page !== null) {
    let result: Page | null = null;
    for (let attempt = 1; attempt <= 3 && !result; attempt++) {
      result = callApi(page);
    }
    if (!result) throw new Error("Page " + page + " failed");
    all.push(...result.items);
    page = result.nextPage;
  }
  return all;
}
console.log("Items: " + fetchAll().join(", "));
`,
    output: `Items: A-1, A-2, A-3`,
  },
  hood: {
    paragraphs: [
      'A null reply stands for a rate limit here. A real API reply would carry a status code, such as 429.',
      'The while loop runs until the next page is null. The for loop stops after three attempts or at the first success.',
      'The wrapper throws an error instead of returning an empty list. An empty list would look like a real result with no data.',
    ],
    example: [
      { label: 'Page 1', value: 'A-1 and A-2, next page 2' },
      { label: 'Page 2, first try', value: 'rate limited, returns null' },
      { label: 'Page 2, second try', value: 'A-3, no next page' },
      { label: 'Items returned', value: '3' },
    ],
  },
  mistakes: [
    'Retrying forever. Use a fixed number of attempts, then report the failure.',
    'Hiding a failure as an empty result. The model would then answer as if no data exists.',
    'Stopping at a fixed page count. Stop when the API says there is no next page.',
  ],
  useWhen: [
    'The API is paged, slow, or sometimes rate limited.',
    'Several tools call the same API.',
  ],
  skipWhen: [
    'The API returns one small response, with no paging and no limits.',
  ],
  words: [
    { term: 'Pagination', meaning: 'Splitting a long list into pages that are fetched one at a time.' },
    { term: 'Rate limit', meaning: 'A cap on how many requests a client may send in a time window.' },
    { term: 'Retry', meaning: 'Trying the same request again after a failure.' },
    { term: 'Wrapper', meaning: 'Code that hides a raw API behind simpler functions.' },
  ],
};

const routingQuestions: Lesson = {
  slug: 'routing-questions',
  number: '6.5',
  title: 'Routing questions',
  oneLiner: 'A router reads the question and picks the way to find sources, such as a lookup or a search.',
  problem: {
    without: 'One search method handles every question. Exact ids miss, error codes match the wrong text, and counts are never computed.',
    with: 'The router sends each question to the method that suits it. Each method finds the sources it does best.',
  },
  steps: [
    {
      title: 'List the routes',
      detail: 'Each route is one way to find sources. Examples are an exact id lookup, a keyword search, a meaning search, and a table query.',
    },
    {
      title: 'Write a rule for each route',
      detail: 'A rule is a test on the question text. A question with "order A-1042" matches the exact id route.',
    },
    {
      title: 'Check the rules in order',
      detail: 'The first rule that matches wins. Put the most specific rules first, so a broad rule does not take their questions.',
    },
    {
      title: 'Use a default route',
      detail: 'The last route catches every other question. Here the meaning search is the default, because most questions are open.',
    },
  ],
  code: {
    source: `// Pick a route from the question. Rules run from top to bottom.
function route(question: string): string {
  if (/order [A-Z]-\\d+/.test(question)) return "exactId";
  if (/error \\d+/i.test(question)) return "keyword";
  if (/how many|total/i.test(question)) return "sql";
  return "meaning";
}

// One question of each kind, to see the route it gets.
const questions = [
  "Where is order A-1042?",
  "What does error 4031 mean?",
  "How many orders shipped last week?",
  "Can I return an opened item?",
];

// Print the route name next to each question.
for (const question of questions) {
  console.log(route(question).padEnd(8) + " " + question);
}
`,
    output: `exactId  Where is order A-1042?
keyword  What does error 4031 mean?
sql      How many orders shipped last week?
meaning  Can I return an opened item?`,
  },
  hood: {
    paragraphs: [
      'A regular expression is a pattern that matches text. The pattern order then a letter, a dash, and digits matches an order id.',
      'A model can also choose the route, when the routes are listed to it as tools. Rules are easier to test, so start with rules.',
      'The rules run from top to bottom. A question can match more than one rule, and only the first match is used.',
    ],
    example: [
      { label: 'Question', value: 'Where is order A-1042?' },
      { label: 'Rule that matches', value: 'exactId, the first rule' },
      { label: 'Question', value: 'Can I return an opened item?' },
      { label: 'Rule that matches', value: 'none, so meaning is the default' },
    ],
  },
  mistakes: [
    'Writing one broad rule first. It takes questions that a narrow rule should have caught.',
    'Routing without a test set. Keep questions with known routes and check each rule against them.',
    'Sending every question to a model route. Rules are cheaper and easier to check.',
  ],
  useWhen: [
    'Your sources sit in different stores, such as a table and a document index.',
    'Some questions need one exact record and others need meaning.',
  ],
  skipWhen: [
    'All questions go to one source, so one search is enough.',
  ],
  words: [
    { term: 'Router', meaning: 'Code that picks the route for each question.' },
    { term: 'Route', meaning: 'One way to find sources, such as a lookup or a search.' },
    { term: 'Regular expression', meaning: 'A pattern that matches a piece of text, such as an order id.' },
    { term: 'Default', meaning: 'The route used when no other rule matches.' },
  ],
};

const frameworksOrOwnLoop: Lesson = {
  slug: 'frameworks-vs-hand-written-loops',
  number: '6.6',
  title: 'Frameworks or a hand-written loop',
  navTitle: 'Frameworks vs own loop',
  oneLiner: 'A framework runs the tool loop for you, and a hand-written loop shows every step and default.',
  problem: {
    without: 'A framework hides the loop. Defaults such as the turn cap are set for you, and you may never see them.',
    with: 'A hand-written loop is short and visible. Each stop condition is in your code, so you can test it.',
  },
  steps: [
    {
      title: 'Start with a loop you can read',
      detail: 'Write the loop in your own code first. For one tool it is about twenty lines, and every step is visible.',
    },
    {
      title: 'Record why the loop stopped',
      detail: 'Return a stop reason with each result, such as answered or turn cap reached. A capped run is then reported, not hidden.',
    },
    {
      title: 'Set every limit yourself',
      detail: 'Set the turn cap and the time limit in your own configuration. Do not rely on a default that you have not read.',
    },
    {
      title: 'Adopt a framework for shared loops',
      detail: 'A framework helps when many features share one loop and you need its tracing. Check its defaults against your own tests first.',
    },
  ],
  code: {
    source: `// The result says why the loop stopped.
type LoopResult = {
  answer: string | null;
  turns: number;
  stopReason: string;
};

// Fake model: asks for tools until turn 10, then answers.
function fakeModelTurn(turn: number): "tool" | "text" {
  return turn < 10 ? "tool" : "text";
}

// Run turns until the model answers or the cap is reached.
function runLoop(maxTurns: number): LoopResult {
  for (let turn = 1; turn <= maxTurns; turn++) {
    if (fakeModelTurn(turn) === "text") {
      return { answer: "done", turns: turn, stopReason: "answer" };
    }
  }
  return {
    answer: null,
    turns: maxTurns,
    stopReason: "turn cap reached",
  };
}

// Print the result with a cap of 5, then with a cap of 12.
console.log(runLoop(5));
console.log(runLoop(12));
`,
    output: `{ answer: null, turns: 5, stopReason: 'turn cap reached' }
{ answer: 'done', turns: 10, stopReason: 'answer' }`,
  },
  hood: {
    paragraphs: [
      'The LoopResult type is the record of one run. Any caller can read the turn count and the stop reason without guessing.',
      'The fake model answers on turn 10. With a cap of five, the loop stops and reports the cap, with no answer.',
      'A framework saves code, but its errors and caps still need tests. The evals in module 2 check the behavior.',
    ],
    example: [
      { label: 'Cap of 5', value: 'turn cap reached, answer null' },
      { label: 'Cap of 12', value: 'answered on turn 10' },
    ],
  },
  mistakes: [
    'Trusting a framework default. Read the defaults for turn caps and parallel calls before production use.',
    'Reporting a capped run as a normal answer. A capped run is a failure, not a reply.',
    'Starting with a framework. Without the loop in view, debugging takes longer.',
  ],
  useWhen: [
    'You want full control of each step and each stop condition.',
    'The same loop serves more than one feature.',
  ],
  skipWhen: [
    'The task is one request and one reply, so no loop is needed.',
  ],
  words: [
    { term: 'Framework', meaning: 'A library that runs common parts of a system for you.' },
    { term: 'Default', meaning: 'The value used when you do not set one.' },
    { term: 'Stop reason', meaning: 'The recorded cause of a loop ending, such as answered or turn cap reached.' },
    { term: 'Parallel tool call', meaning: 'Two or more tools run at the same time for one reply.' },
  ],
};

const manyAgentsAndFanOut: Lesson = {
  slug: 'many-agents-and-fan-out',
  number: '6.7',
  title: 'Many agents and fan-out',
  oneLiner: 'Fan-out runs several workers on separate parts of one job at once, then gathers their answers.',
  problem: {
    without: 'One agent handles every part in turn. A large job takes as long as all its parts added together.',
    with: 'A planner splits the job, the workers run at the same time, and their answers are merged in order.',
  },
  steps: [
    {
      title: 'Split the job',
      detail: 'A planner splits the question into parts that do not depend on each other. For example: refund rules, shipping times, and gift card terms.',
    },
    {
      title: 'Start one worker per part',
      detail: 'Each worker gets one part, with its own messages and tools. Workers do not wait for each other.',
    },
    {
      title: 'Wait for all the workers',
      detail: 'The code waits until every worker has finished. A failed worker is reported by its part name, not dropped.',
    },
    {
      title: 'Merge the answers in order',
      detail: 'Keep the answers in the order of the parts. A final step can then join them into one reply.',
    },
  ],
  code: {
    source: `// A fake worker. It answers one part of a question after a delay.
async function askWorker(name: string, part: string) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return name + " answered: " + part;
}

// A planner splits one question into parts, one part per worker.
const parts = ["refund rules", "shipping times", "gift card terms"];

// Start every worker at once, then wait for all the answers.
async function fanOut(): Promise<void> {
  const jobs = parts.map((part, i) => {
    return askWorker("worker " + (i + 1), part);
  });
  const answers = await Promise.all(jobs);

  // Results keep the order of the parts.
  for (const answer of answers) {
    console.log(answer);
  }
}

fanOut();
`,
    output: `worker 1 answered: refund rules
worker 2 answered: shipping times
worker 3 answered: gift card terms`,
  },
  hood: {
    paragraphs: [
      'Promise.all starts every job at once. It returns the results in input order, and it waits for the slowest job.',
      'The short delay stands in for a model call, which takes time. The sample makes no network call.',
      'Parallel workers cost more tokens in total. Measure the cost before you add more workers.',
    ],
    example: [
      { label: 'Parts', value: '3' },
      { label: 'Workers running at once', value: '3' },
      { label: 'Order of the answers', value: 'the same as the parts' },
    ],
  },
  mistakes: [
    'Splitting parts that depend on each other. A worker then needs an answer that is not ready yet.',
    'Starting too many workers at once. Rate limits and costs grow with each one.',
    'Losing the link between an answer and its part. Keep the part name with each answer.',
  ],
  useWhen: [
    'The parts are independent and the job is large.',
    'Each part can be checked on its own.',
  ],
  skipWhen: [
    'One question with one source. A single loop is simpler.',
  ],
  words: [
    { term: 'Worker', meaning: 'One agent that handles one part of a job.' },
    { term: 'Planner', meaning: 'The step that splits a job into parts.' },
    { term: 'Fan-out', meaning: 'Starting many workers at once, one for each part of a job.' },
    { term: 'Promise', meaning: 'A JavaScript value for a result that is not ready yet.' },
  ],
};

export const toolsAndAgents: Module = {
  slug: 'tools-and-agents',
  number: 6,
  title: 'Tools and agents',
  summary: 'How a model calls functions in a loop, and how to organize many of them.',
  lessons: [
    whatAToolIs,
    toolCallingLoop,
    lookupVsSearchTools,
    wrappingAMessyApi,
    routingQuestions,
    frameworksOrOwnLoop,
    manyAgentsAndFanOut,
  ],
};
