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
      title: 'The model sees a name and a description',
      detail: 'The model receives the tool name, its description, and its parameters. It never receives the body of the run function. The sample removes run from the object and prints the rest.',
      visual: {
        kind: 'compare',
        caption: 'What goes to the model, and what stays in your code.',
        left: { title: 'Sent to the model', items: ['name: get_order', 'description', 'parameters: orderId'] },
        right: { title: 'Kept in your code', items: ['The run function', 'The code that reads the orders'] },
      },
    },
    {
      title: 'The description guides the choice',
      detail: 'The description tells the model when to use the tool. A clear sentence leads to correct calls. A vague one leads to wrong calls or to no call at all.',
      visual: {
        kind: 'chips',
        caption: 'Two descriptions for the same tool.',
        items: [
          { text: 'Get the order info', note: 'vague, wrong calls' },
          { text: 'Return the status of one order by its id.', note: 'clear', highlight: true },
        ],
      },
      snippet: {
        source: `const getOrder = {
  name: "get_order",
  description: "Return the status of one order by its id.",
};
console.log(getOrder.description);
`,
        output: `Return the status of one order by its id.`,
      },
    },
    {
      title: 'Typed inputs are checked before a run',
      detail: 'Each parameter has a name and a type. The model fills in the values, and it can send a value of the wrong type. Your code checks each value before it calls run.',
      visual: {
        kind: 'table',
        caption: 'Two calls that pass one orderId value to the tool.',
        columns: ['Value sent', 'Type', 'Check'],
        rows: [
          ['A-1042', 'text', 'passes'],
          ['1042', 'number', 'rejected'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `const parameters = { orderId: "string" };
const input: Record<string, unknown> = { orderId: 1042 };
const typeOk = typeof input.orderId === parameters.orderId;
console.log("orderId is a string: " + typeOk);
`,
        output: `orderId is a string: false`,
      },
    },
    {
      title: 'The run function runs only on request',
      detail: 'Your code calls run only after the checks pass. The model never runs the function itself. The sample calls run with A-1042 and prints the text that goes back to the model.',
      visual: {
        kind: 'flow',
        caption: 'The order of events for one tool call.',
        nodes: ['Model asks', 'Your code checks', 'run() executes', 'Text returned'],
      },
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
      title: 'The model returns one of two replies',
      detail: 'A reply is either a tool request or final text. The Reply type holds both shapes, and its type field says which one arrived. The loop reads that field first.',
      visual: {
        kind: 'table',
        caption: 'The two reply shapes the loop handles.',
        columns: ['type', 'Fields', 'What the loop does'],
        rows: [
          ['tool_call', 'name, orderId', 'Runs the tool, then sends the result back'],
          ['text', 'text', 'Returns the answer and stops'],
        ],
      },
    },
    {
      title: 'The loop looks up the tool by name',
      detail: 'The tools map links each name to a function. The loop picks the function with the name from the reply, then passes the inputs. Here get_order runs with orderId A-1042.',
      visual: {
        kind: 'flow',
        caption: 'One tool call, from the reply to the result text.',
        nodes: ['Reply', 'Find by name', 'Run with inputs', 'Result text'],
      },
      snippet: {
        source: `const tools: Record<string, (id: string) => string> = {
  get_order: (id) => "Order " + id + " shipped.",
};
const reply = { name: "get_order", orderId: "A-1042" };
console.log(tools[reply.name](reply.orderId));
`,
        output: `Order A-1042 shipped.`,
      },
    },
    {
      title: 'The result joins the messages',
      detail: 'The messages list is what the model reads on each turn. The tool result is added to that list, so the next request contains it. Without this step, the model cannot use the data.',
      visual: {
        kind: 'chips',
        caption: 'The message list after the tool runs.',
        items: [
          { text: 'User: Where is order A-1042?' },
          { text: 'Tool: Order A-1042 shipped.', highlight: true },
        ],
      },
      snippet: {
        source: `const messages: string[] = ["User: Where is order A-1042?"];
const result = "Order A-1042 shipped.";
messages.push("Tool: " + result);
console.log("Messages now: " + messages.length);
`,
        output: `Messages now: 2`,
      },
    },
    {
      title: 'The turn cap stops a loop that never ends',
      detail: 'A turn is one request to the model and its reply. The maxTurns value of five stops a model that keeps asking for tools. This sample ends on turn 2, well under the cap.',
      visual: {
        kind: 'bars',
        caption: 'Turns used against the cap of five.',
        unit: 'turns',
        rows: [
          { label: 'Turn cap', value: 5 },
          { label: 'Turns used', value: 2, highlight: true },
        ],
      },
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
      title: 'A lookup takes one exact key',
      detail: 'A lookup takes one key, such as order id A-1042, and returns one record. The Map stores each id with its status. A missing key returns undefined, which the code turns into a clear message.',
      visual: {
        kind: 'table',
        caption: 'Two lookups in the orders map.',
        columns: ['Key', 'Map returns'],
        rows: [
          ['A-1042', 'shipped'],
          ['A-9999', 'undefined, no record'],
        ],
        highlightRow: 1,
      },
      snippet: {
        source: `const orders = new Map([["A-1042", "shipped"]]);
console.log(orders.get("A-1042"));
console.log(orders.get("A-9999"));
`,
        output: `shipped
undefined`,
      },
    },
    {
      title: 'A search counts shared words',
      detail: 'A search splits the query into words and counts how many appear in each article. The query refund order number shares three words with the refund request article. Scores set the order of the results.',
      visual: {
        kind: 'bars',
        caption: 'Scores for the query "refund order number".',
        rows: [
          { label: 'Refund requests need the order number.', value: 3, highlight: true },
          { label: 'Refunds take 5 to 7 days.', value: 1 },
          { label: 'Gift cards never expire.', value: 0 },
        ],
      },
      snippet: {
        source: `const query = "refund order number".split(" ");
const article = "Refund requests need the order number.";
const text = article.toLowerCase();
const hits = query.filter((word) => text.includes(word));
const label = "Shared: " + hits.join(", ");
console.log(label + " (" + hits.length + ")");
`,
        output: `Shared: refund, order, number (3)`,
      },
    },
    {
      title: 'Results come back without a cutoff',
      detail: 'The search returns the best few results even when every score is zero. A rideshare query shares no words with any article, yet one result still comes back, with score 0. The model must judge whether that result answers the question.',
      visual: {
        kind: 'table',
        caption: 'Two searches, each with its top result.',
        columns: ['Query', 'Top result', 'Score'],
        rows: [
          ['refund order number', 'Refund requests need the order number.', '3'],
          ['rideshare', 'Refunds take 5 to 7 days.', '0'],
        ],
      },
    },
    {
      title: 'Choose by the question',
      detail: 'Use a lookup when the question names one record. Use a search when the question is about a topic or a symptom. A search for an exact id can return a similar record instead.',
      visual: {
        kind: 'compare',
        caption: 'Which tool fits which question.',
        left: { title: 'Use a lookup', items: ['The question names one id', 'Returns one record or not found'] },
        right: { title: 'Use a search', items: ['The question names a topic or symptom', 'Returns ranked matches with scores'] },
      },
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
      title: 'Each page gives items and a next page',
      detail: 'A paged API returns part of the list and the number of the next page. The wrapper keeps asking until the next page is null. Page 1 holds A-1 and A-2, and it points to page 2.',
      visual: {
        kind: 'table',
        caption: 'The calls the wrapper makes to read every order.',
        columns: ['Call', 'Reply', 'Next page'],
        rows: [
          ['Page 1', 'A-1, A-2', '2'],
          ['Page 2, try 1', 'null, rate limited', 'not known'],
          ['Page 2, try 2', 'A-3', 'none'],
        ],
        highlightRow: 1,
      },
    },
    {
      title: 'A rate-limited call is retried',
      detail: 'A null reply means the API refused the call for now. The loop tries the same page again, up to three attempts in total. The second attempt on page 2 works.',
      visual: {
        kind: 'chips',
        caption: 'The attempts on page 2.',
        items: [
          { text: 'Try 1', note: 'null, rate limited' },
          { text: 'Try 2', note: 'A-3, ok', highlight: true },
        ],
      },
      snippet: {
        source: `let result: string[] | null = null;
for (let attempt = 1; attempt <= 3 && !result; attempt++) {
  result = attempt === 1 ? null : ["A-3"];
  const label = result ? "ok" : "null";
  console.log("attempt " + attempt + ": " + label);
}
`,
        output: `attempt 1: null
attempt 2: ok`,
      },
    },
    {
      title: 'Failure after three attempts is an error',
      detail: 'If all three attempts fail, the wrapper throws an error that names the page. An empty list would look like a real result with no orders. The error lets the caller report the failure instead.',
      snippet: {
        source: `try {
  const result: string[] | null = null;
  if (!result) throw new Error("Page 2 failed");
} catch (error) {
  console.log((error as Error).message);
}
`,
        output: `Page 2 failed`,
      },
    },
    {
      title: 'Typed items reach the tools',
      detail: 'The wrapper returns a plain list of strings. Tools built on it never see raw API replies or null values. The list joins into one line, as the full program shows.',
      visual: {
        kind: 'chips',
        caption: 'The list that the wrapper returns to a tool.',
        items: [
          { text: 'A-1', note: 'string' },
          { text: 'A-2', note: 'string' },
          { text: 'A-3', note: 'string' },
        ],
      },
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
      title: 'A rule is a pattern that matches text',
      detail: 'A regular expression is a pattern that matches text. This pattern reads the word order, a space, a capital letter, a dash, and digits. It matches an order id such as A-1042, and the test method returns true when it matches.',
      snippet: {
        source: `const pattern = /order [A-Z]-\\d+/;
console.log(pattern.test("Where is order A-1042?"));
console.log(pattern.test("Can I return an opened item?"));
`,
        output: `true
false`,
      },
    },
    {
      title: 'The first matching rule wins',
      detail: 'Rules are checked from top to bottom, and the first match decides the route. Narrow rules sit at the top, so a broad rule cannot take their questions. The last route has no rule, so it catches every question left over.',
      visual: {
        kind: 'table',
        caption: 'The rules in the order the router checks them.',
        columns: ['Order', 'Rule matches', 'Example', 'Route'],
        rows: [
          ['1', 'an order id like A-1042', 'Where is order A-1042?', 'exactId'],
          ['2', 'the word error and a number', 'What does error 4031 mean?', 'keyword'],
          ['3', 'how many or total', 'How many orders shipped?', 'count'],
          ['4', 'no rule matches', 'Can I return an opened item?', 'meaning'],
        ],
        highlightRow: 3,
      },
    },
    {
      title: 'The router as code',
      detail: 'The route function holds the rules in order. The keyword rule takes the error question, because it is the first rule that matches. The sample prints the route name for that question.',
      snippet: {
        source: `function route(question: string): string {
  if (/order [A-Z]-\\d+/.test(question)) return "exactId";
  if (/error \\d+/i.test(question)) return "keyword";
  return "meaning";
}
console.log(route("What does error 4031 mean?"));
`,
        output: `keyword`,
      },
    },
    {
      title: 'The default route catches the rest',
      detail: 'A question that matches no rule takes the default route, which is the meaning search. The sample sends four questions through the router, and each one gets a route name.',
      visual: {
        kind: 'chips',
        caption: 'Four questions and the route each one takes.',
        items: [
          { text: 'Where is order A-1042?', note: 'exactId' },
          { text: 'What does error 4031 mean?', note: 'keyword' },
          { text: 'How many orders shipped last week?', note: 'count' },
          { text: 'Can I return an opened item?', note: 'meaning, default', highlight: true },
        ],
      },
    },
  ],
  code: {
    source: `// Pick a route from the question. Rules run from top to bottom.
function route(question: string): string {
  if (/order [A-Z]-\\d+/.test(question)) return "exactId";
  if (/error \\d+/i.test(question)) return "keyword";
  if (/how many|total/i.test(question)) return "count";
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
count    How many orders shipped last week?
meaning  Can I return an opened item?`,
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
      title: 'The loop has a turn cap',
      detail: 'A fake model asks for a tool on every turn before turn 10, and it answers on turn 10. The loop must stop somewhere, so it checks a cap first. The first five turns all ask for a tool.',
      snippet: {
        source: `function fakeModelTurn(turn: number): "tool" | "text" {
  return turn < 10 ? "tool" : "text";
}
for (let turn = 1; turn <= 5; turn++) {
  console.log(turn + ": " + fakeModelTurn(turn));
}
`,
        output: `1: tool
2: tool
3: tool
4: tool
5: tool`,
      },
    },
    {
      title: 'A cap of five stops early',
      detail: 'With a cap of five, the loop stops after turn 5, before the model answers. It returns no answer, so the caller must treat the run as a failure. The model needed 10 turns in total.',
      visual: {
        kind: 'bars',
        caption: 'Turns used before the loop stops, for each cap.',
        unit: 'turns',
        rows: [
          { label: 'Cap of 5', value: 5, highlight: true },
          { label: 'Cap of 12', value: 10 },
        ],
      },
    },
    {
      title: 'The result records the stop reason',
      detail: 'LoopResult holds the answer, the turn count, and the stop reason. The caller reads the reason instead of guessing why the loop ended. A cap of twelve lets the model answer on turn 10.',
      visual: {
        kind: 'table',
        caption: 'Both runs, as the loop reports them.',
        columns: ['Cap', 'Answer', 'Turns', 'Stop reason'],
        rows: [
          ['5', 'null', '5', 'turn cap reached'],
          ['12', 'done', '10', 'answer'],
        ],
        highlightRow: 0,
      },
    },
    {
      title: 'A framework runs this loop for you',
      detail: 'A framework runs the same loop with its own defaults, such as the turn cap. Read those defaults before you rely on them in production. A hand-written loop shows every default in one file.',
      visual: {
        kind: 'compare',
        caption: 'The trade-off between a framework and a hand-written loop.',
        left: { title: 'Hand-written loop', items: ['Every stop condition is in your code', 'Easy to test each rule'] },
        right: { title: 'Framework', items: ['Less code to write', 'Defaults set for you, so read them first'] },
      },
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
      title: 'A planner splits the job',
      detail: 'A planner splits one question into parts that do not depend on each other. The sample has three parts: refund rules, shipping times, and gift card terms. Each part can go to its own worker.',
      visual: {
        kind: 'flow',
        caption: 'One question, split into three parts.',
        nodes: ['One question', 'Planner', 'Refund rules', 'Shipping times', 'Gift card terms'],
      },
    },
    {
      title: 'Each worker answers one part',
      detail: 'The askWorker function handles one part and returns its answer. Each answer carries the worker name, so the reader can see which part it came from. The map creates one worker call for each part.',
      snippet: {
        source: `async function askWorker(name: string, part: string) {
  return name + " answered: " + part;
}
askWorker("worker 1", "refund rules").then(console.log);
`,
        output: `worker 1 answered: refund rules`,
      },
    },
    {
      title: 'Promise.all waits for every worker',
      detail: 'Promise.all waits until every worker has finished, then returns the answers in input order. A Promise is a value for a result that is not ready yet. The answers print in the order of the parts, even if a worker finishes later.',
      snippet: {
        source: `const jobs = [
  Promise.resolve("refund rules done"),
  Promise.resolve("shipping times done"),
];
Promise.all(jobs).then((answers) => console.log(answers));
`,
        output: `[ 'refund rules done', 'shipping times done' ]`,
      },
      visual: {
        kind: 'table',
        caption: 'Three workers, with the position of each answer.',
        columns: ['Worker', 'Part', 'Position in result'],
        rows: [
          ['worker 1', 'refund rules', '1'],
          ['worker 2', 'shipping times', '2'],
          ['worker 3', 'gift card terms', '3'],
        ],
      },
    },
    {
      title: 'Parallel workers cut the wait, not the cost',
      detail: 'Three workers make three model calls, the same number as one agent working in turn. The sample waits 10 milliseconds per worker, so running together takes about 10 milliseconds, not 30. Rate limits can still stop too many workers at once.',
      visual: {
        kind: 'bars',
        caption: 'Waiting time for the three parts, in milliseconds.',
        unit: 'ms',
        rows: [
          { label: 'One agent, in turn', value: 30 },
          { label: 'Three workers, at once', value: 10, highlight: true },
        ],
      },
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
