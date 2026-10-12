import type { Lesson, Module } from '../types';

const hostClientServer: Lesson = {
  slug: 'host-client-server-jsonrpc',
  number: '7.1',
  title: 'Host, client, server, and JSON-RPC',
  navTitle: 'Host, client, JSON-RPC',
  oneLiner: 'MCP, the Model Context Protocol, is a standard way for an app to reach tools and data.',
  problem: {
    without: 'Each app writes its own code for each tool. Every new tool needs new glue code in every app.',
    with: 'Tools follow one protocol. A host connects to any server that speaks it, with no custom glue code.',
  },
  steps: [
    {
      title: 'Three roles, one protocol',
      detail: 'The host is the app the user runs. Its client talks to one server, and the server offers tools and data. A tool such as get_order is the function the model can finally ask for.',
      visual: {
        kind: 'flow',
        caption: 'The roles in one chain, from left to right.',
        nodes: ['Host app', 'Client', 'Server', 'get_order tool'],
      },
    },
    {
      title: 'A request is one JSON object',
      detail: 'Each message is a JSON object with a version, an id, a method, and params. The method names the action, such as tools/call. The params hold its inputs, such as the tool name and the order id.',
      visual: {
        kind: 'table',
        caption: 'The fields of the request in the snippet.',
        columns: ['Field', 'Value', 'Meaning'],
        rows: [
          ['jsonrpc', '2.0', 'the protocol version'],
          ['id', '3', 'matches the reply'],
          ['method', 'tools/call', 'the action to run'],
          ['params', 'name and arguments', 'the inputs'],
        ],
      },
      snippet: {
        source: `const callTool = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "get_order", arguments: { orderId: "A-1042" } },
};
console.log(JSON.stringify(callTool));
`,
        output: `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_order","arguments":{"orderId":"A-1042"}}}`,
      },
    },
    {
      title: 'The id matches a reply to its request',
      detail: 'A reply repeats the id of the request it answers. The client compares the two ids to find the match. Ids let many requests share one connection without mixing up the answers.',
      visual: {
        kind: 'chips',
        caption: 'Two messages on one connection, linked by their ids.',
        items: [
          { text: 'Request, id 3', note: 'tools/call' },
          { text: 'Reply, id 3', note: 'Shipped Monday.', highlight: true },
        ],
      },
      snippet: {
        source: `const request = { id: 3, method: "tools/call" };
const reply = { id: 3, result: { text: "Shipped Monday." } };
console.log("Reply matches call:", reply.id === request.id);
`,
        output: `Reply matches call: true`,
      },
    },
    {
      title: 'Initialize opens the session',
      detail: 'The client sends the initialize request, with a protocol version such as 2024-11-05. Other requests follow only after the server answers. After that, the client can list the tools and call them.',
      visual: {
        kind: 'flow',
        caption: 'The order of the first messages in a session.',
        nodes: ['initialize', 'Server reply', 'tools/list', 'tools/call'],
      },
      snippet: {
        source: `const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05" },
};
console.log(JSON.stringify(initialize));
`,
        output: `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}`,
      },
    },
  ],
  diagram: ['Host app', 'Client', 'Server', 'Tool'],
  code: {
    source: `// The client opens a session. Every request has a unique id.
const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05" },
};

// The client asks which tools the server offers.
const listTools = { jsonrpc: "2.0", id: 2, method: "tools/list" };

// The client asks the server to run one tool.
const callTool = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "get_order", arguments: { orderId: "A-1042" } },
};

// Each request is sent as one line of JSON.
for (const request of [initialize, listTools, callTool]) {
  console.log(JSON.stringify(request));
}

// The reply carries the same id, so the client can match it.
const reply = { id: 3, result: { text: "Shipped Monday." } };
console.log("Reply matches call:", reply.id === callTool.id);
`,
    output: `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_order","arguments":{"orderId":"A-1042"}}}
Reply matches call: true`,
  },
  mistakes: [
    'Mixing up the roles. The client belongs to the host, and each client talks to one server.',
    'Reusing an id while the first request is still open. Each open request needs its own id.',
    'Calling tools before initialize finishes. A server may refuse requests before its session is open.',
  ],
  useWhen: [
    'Several apps must use the same tools.',
    'You want to add a new tool server without writing new code in each app.',
  ],
  skipWhen: [
    'One app calls one function that lives in its own code.',
  ],
  words: [
    { term: 'Host', meaning: 'The app the user runs, such as a chat window.' },
    { term: 'Client', meaning: 'The part of the host that talks to one server.' },
    { term: 'Server', meaning: 'A program that offers tools, resources, or prompts.' },
    { term: 'JSON-RPC', meaning: 'A message format with an id, a method name, and params.' },
  ],
};

const stdioServer: Lesson = {
  slug: 'stdio-server',
  number: '7.2',
  title: 'A stdio server with tools',
  oneLiner: 'A stdio server reads JSON lines from standard input and writes its replies to standard output.',
  problem: {
    without: 'Each tool is wired into one app by hand. The app must know every tool name and every input format.',
    with: 'The server lists its tools and runs them on request. Any client that speaks the protocol can use them.',
  },
  steps: [
    {
      title: 'Lines in, lines out',
      detail: 'The host starts the server as a child process. It writes one JSON line per request to standard input. The server writes one JSON line per reply to standard output.',
      visual: {
        kind: 'flow',
        caption: 'One request and its reply, through the two text streams.',
        nodes: ['Host writes a line', 'Standard input', 'Handler runs', 'Standard output', 'Host reads a line'],
      },
    },
    {
      title: 'tools/list names the tools',
      detail: 'A tools/list request asks which tools exist. The reply carries their names in a list, so the client can show them to the model. The sample has one tool, get_order.',
      snippet: {
        source: `const tools: Record<string, unknown> = { get_order: () => "" };
const reply = { id: 1, result: { tools: Object.keys(tools) } };
console.log(JSON.stringify(reply));
`,
        output: `{"id":1,"result":{"tools":["get_order"]}}`,
      },
    },
    {
      title: 'tools/call runs a handler',
      detail: 'A tools/call request names a tool and passes its arguments. The handler returns text, which goes into a content list. For A-1042, the sample returns the text Order A-1042 shipped.',
      snippet: {
        source: `const tools: Record<string, (id: string) => string> = {
  get_order: (id) => "Order " + id + " shipped.",
};
const text = tools.get_order("A-1042");
const content = [{ type: "text", text }];
console.log(JSON.stringify({ id: 2, result: { content } }));
`,
        output: `{"id":2,"result":{"content":[{"type":"text","text":"Order A-1042 shipped."}]}}`,
      },
    },
    {
      title: 'An unknown method gets an error',
      detail: 'A ping request is not in the sample, so the server returns an error. The code -32601 means method not found. The error reply still carries the id of the request it answers.',
      visual: {
        kind: 'table',
        caption: 'Three requests and the replies the server gives.',
        columns: ['Id', 'Method', 'Reply'],
        rows: [
          ['1', 'tools/list', 'tools: get_order'],
          ['2', 'tools/call', 'text: Order A-1042 shipped.'],
          ['3', 'ping', 'error -32601, method not found'],
        ],
        highlightRow: 2,
      },
    },
  ],
  code: {
    source: `// Tools this server offers, each with a handler function.
const tools: Record<string, (id: string) => string> = {
  get_order: (id) => "Order " + id + " shipped.",
};

// Answer one request with a reply that has the same id.
function handle(request: any): object {
  const { id, method, params } = request;
  if (method === "tools/list") {
    return { id, result: { tools: Object.keys(tools) } };
  }
  if (method === "tools/call") {
    const text = tools[params.name](params.orderId);
    return { id, result: { content: [{ type: "text", text }] } };
  }
  return { id, error: { code: -32601, message: "Unknown" } };
}

// Requests that a real server would read from standard input.
const order = { name: "get_order", orderId: "A-1042" };
const requests = [
  { id: 1, method: "tools/list" },
  { id: 2, method: "tools/call", params: order },
  { id: 3, method: "ping" },
];

// Each request line gets one reply line.
for (const request of requests) {
  console.log(JSON.stringify(handle(request)));
}
`,
    output: `{"id":1,"result":{"tools":["get_order"]}}
{"id":2,"result":{"content":[{"type":"text","text":"Order A-1042 shipped."}]}}
{"id":3,"error":{"code":-32601,"message":"Unknown"}}`,
  },
  mistakes: [
    'Writing logs to standard output. Log lines there corrupt the message stream, so write logs to standard error.',
    'Printing a reply across several lines. The client reads one line as one message.',
    'Dropping the id. Without it, the client cannot match the reply to its request.',
  ],
  useWhen: [
    'The tool runs on the same machine as the host.',
    'You want a simple server with no network setup.',
  ],
  skipWhen: [
    'Many users must reach one server over a network. Use the HTTP transport instead.',
  ],
  words: [
    { term: 'Standard input', meaning: 'The text stream a program reads, here one JSON line per message.' },
    { term: 'Standard output', meaning: 'The text stream a program writes to, here one JSON line per reply.' },
    { term: 'Handler', meaning: 'The function that runs one tool.' },
    { term: 'Stdio', meaning: 'Short for standard input and standard output.' },
  ],
};

const resourcesAndPrompts: Lesson = {
  slug: 'resources-and-prompts',
  number: '7.3',
  title: 'Resources and prompts',
  oneLiner: 'Resources are readable data, and prompts are reusable message templates that a server offers.',
  problem: {
    without: 'Each app copies documents and templates into its own code. The copies drift, and nobody knows which one is current.',
    with: 'The server owns the data and the templates. Clients list them, then read or fill them when needed.',
  },
  steps: [
    {
      title: 'A resource is data with a uri',
      detail: 'A resource is readable data, identified by a uri. A uri is an address such as docs://refunds. The resources/read request returns the text stored at that address.',
      visual: {
        kind: 'table',
        caption: 'Two resources that the server offers.',
        columns: ['Uri', 'Text returned'],
        rows: [
          ['docs://refunds', 'Refunds take 5 to 7 days.'],
          ['docs://shipping', 'Orders ship in 2 business days.'],
        ],
      },
      snippet: {
        source: `const resources: Record<string, string> = {
  "docs://refunds": "Refunds take 5 to 7 days.",
};
console.log(resources["docs://refunds"]);
`,
        output: `Refunds take 5 to 7 days.`,
      },
    },
    {
      title: 'A prompt fills a template',
      detail: 'A prompt is a reusable message template with a named argument. The client sends the topic, and the server fills it in. For the topic refund, the filled text is Summary of refund FAQ.',
      visual: {
        kind: 'flow',
        caption: 'One prompt, filled in by one argument.',
        nodes: ['Summary of [topic] FAQ', 'topic = refund', 'Summary of refund FAQ.'],
      },
      snippet: {
        source: `const summarize = (topic: string) => {
  return "Summary of " + topic + " FAQ.";
};
console.log(summarize("refund"));
`,
        output: `Summary of refund FAQ.`,
      },
    },
    {
      title: 'Reading never changes data',
      detail: 'A resource read returns text and changes nothing. A tool is different, because the model asks for it and the tool may change data. Keeping reads and actions apart makes each read safe to repeat.',
      visual: {
        kind: 'compare',
        caption: 'Resources and tools, compared.',
        left: { title: 'Resource', items: ['The client reads the text', 'Changes no data'] },
        right: { title: 'Tool', items: ['The model asks for it', 'May change data'] },
      },
    },
  ],
  code: {
    source: `// Resources are readable data, each identified by a uri.
const resources: Record<string, string> = {
  "docs://refunds": "Refunds take 5 to 7 days.",
  "docs://shipping": "Orders ship in 2 business days.",
};

// Prompts are reusable message templates that take named arguments.
const prompts: Record<string, (topic: string) => string> = {
  summarize_faq: (topic) => "Summary of " + topic + " FAQ.",
};

// Answer one request by its method name.
function handle(method: string, params: any): unknown {
  if (method === "resources/list") return Object.keys(resources);
  if (method === "resources/read") return resources[params.uri];
  if (method === "prompts/get") {
    return prompts[params.name](params.topic);
  }
  return { error: "unknown method " + method };
}

// List the resources, read one, then fill in a prompt.
const prompt = { name: "summarize_faq", topic: "refund" };
console.log(handle("resources/list", {}));
console.log(handle("resources/read", { uri: "docs://refunds" }));
console.log(handle("prompts/get", prompt));
`,
    output: `[ 'docs://refunds', 'docs://shipping' ]
Refunds take 5 to 7 days.
Summary of refund FAQ.`,
  },
  mistakes: [
    'Using a resource to trigger an action. Reading a resource should never change any data.',
    'Listing a uri that cannot be read. Each listed uri must work with resources/read.',
    'Treating a prompt as a fixed message. Each use fills in new arguments.',
  ],
  useWhen: [
    'Several apps need the same documents or templates.',
    'The same text must be read in many places and kept current.',
  ],
  skipWhen: [
    'One app uses the text, and the text never changes.',
  ],
  words: [
    { term: 'Resource', meaning: 'Readable data that a server offers, identified by a uri.' },
    { term: 'Uri', meaning: 'An address that names one resource, such as docs://refunds.' },
    { term: 'Prompt', meaning: 'A reusable message template with named arguments.' },
    { term: 'Argument', meaning: 'A value that fills a gap in a template, such as a topic.' },
  ],
};

const httpTransportAndTokens: Lesson = {
  slug: 'http-transport-and-tokens',
  number: '7.4',
  title: 'HTTP transport and tokens',
  navTitle: 'HTTP transport, tokens',
  oneLiner: 'The HTTP transport lets a server run on a network, and a token shows which client is calling.',
  problem: {
    without: 'A server on a network accepts any caller. Anyone who finds its address can run its tools.',
    with: 'Each request carries a bearer token. The server checks the token and allows only the methods it may use.',
  },
  steps: [
    {
      title: 'Messages travel in HTTP bodies',
      detail: 'Each JSON message is sent in the body of an HTTP request. The server returns its JSON reply in the response body. The messages are the same as the ones sent over standard input.',
      visual: {
        kind: 'flow',
        caption: 'One request and its reply over HTTP.',
        nodes: ['Client sends POST', 'Authorization header', 'Server checks token', 'JSON reply'],
      },
    },
    {
      title: 'The token names the caller',
      detail: 'The client adds an Authorization header with the word Bearer and a secret token. The server looks the token up to find the caller. An unknown token is refused before any method runs.',
      snippet: {
        source: `const tokens = new Map([["svc-reader-7f3a", "reader"]]);
const header = "Bearer svc-reader-7f3a";
const caller = tokens.get(header.replace("Bearer ", ""));
console.log("Caller: " + caller);
`,
        output: `Caller: reader`,
      },
    },
    {
      title: 'Status codes give the outcome',
      detail: '401 means the token is missing or unknown. 403 means the token is known, but the method is not allowed. 200 means the call worked.',
      visual: {
        kind: 'table',
        caption: 'Three requests and their status codes.',
        columns: ['Request', 'Token', 'Method', 'Status'],
        rows: [
          ['1', 'none', 'tools/list', '401'],
          ['2', 'reader', 'tools/list', '200'],
          ['3', 'reader', 'resources/read', '403'],
        ],
        highlightRow: 2,
      },
    },
    {
      title: 'Each token has its own methods',
      detail: 'The server keeps a list of allowed methods for each token. The reader token may list and call tools, but it may not read resources. Give each client only the methods it needs.',
      visual: {
        kind: 'compare',
        caption: 'What the reader token may call, and what it may not.',
        left: { title: 'Allowed for the reader token', items: ['tools/list', 'tools/call'] },
        right: { title: 'Refused for the reader token', items: ['resources/read, status 403'] },
      },
    },
  ],
  code: {
    source: `// Each token may call a fixed list of methods. The token is fake.
const serviceTokens = new Map<string, string[]>([
  ["svc-reader-7f3a", ["tools/list", "tools/call"]],
]);

// The parts of an HTTP request that the server checks.
type HttpRequest = {
  headers: Record<string, string>;
  method: string;
};

// Check the token, then the method. Return a status and a body.
function handleHttp(request: HttpRequest) {
  const header = request.headers["authorization"] ?? "";
  const allowed = serviceTokens.get(header.replace("Bearer ", ""));
  if (!allowed) return { status: 401, body: "unknown token" };
  if (!allowed.includes(request.method)) {
    return { status: 403, body: "method not allowed" };
  }
  return { status: 200, body: "ok" };
}

// A request with no token, then two requests with a valid token.
const reader = { authorization: "Bearer svc-reader-7f3a" };
const listTools = { headers: reader, method: "tools/list" };
const readResource = { headers: reader, method: "resources/read" };
console.log(handleHttp({ headers: {}, method: "tools/list" }));
console.log(handleHttp(listTools));
console.log(handleHttp(readResource));
`,
    output: `{ status: 401, body: 'unknown token' }
{ status: 200, body: 'ok' }
{ status: 403, body: 'method not allowed' }`,
  },
  mistakes: [
    'Sending tokens over plain HTTP. Anyone on the network path can read the header.',
    'Storing tokens as plain text. A leaked table then exposes every token.',
    'Giving every token every method. Give each token only the methods its client needs.',
  ],
  useWhen: [
    'The server runs on a network and more than one client connects.',
    'Different clients need different rights.',
  ],
  skipWhen: [
    'The server runs only on your own machine, over standard input.',
  ],
  words: [
    { term: 'Transport', meaning: 'The way messages travel between client and server, such as standard input or HTTP.' },
    { term: 'Bearer token', meaning: 'A secret string sent in a header that proves who is calling.' },
    { term: 'Authorization header', meaning: 'The HTTP header that carries the token.' },
    { term: 'Status code', meaning: 'A number in an HTTP reply that gives the outcome, such as 200 for success.' },
  ],
};

const writingAClient: Lesson = {
  slug: 'writing-a-client',
  number: '7.5',
  title: 'Writing a client',
  oneLiner: 'A client sends requests with unique ids, waits for each reply, and checks that the id matches.',
  problem: {
    without: 'The code sends a request and assumes the next line is its reply. A late message is then read as the wrong answer.',
    with: 'Each request has its own id. The client takes the reply with that id, and a mismatch is reported as an error.',
  },
  steps: [
    {
      title: 'Open the session first',
      detail: 'A client sends initialize first and waits for the reply. The other requests go out only after that reply arrives. The sample does this before it lists the tools.',
      visual: {
        kind: 'flow',
        caption: 'The order of requests in one session.',
        nodes: ['initialize', 'Wait for reply', 'tools/list', 'tools/call'],
      },
    },
    {
      title: 'Each request gets its own number',
      detail: 'A counter goes up by one for each request, so every request has a unique id. The reply to request 2 carries the id 2. The sample uses the ids 1, 2, and 3.',
      visual: {
        kind: 'table',
        caption: 'The ids in the sample session.',
        columns: ['Call', 'Request id', 'Reply id'],
        rows: [
          ['initialize', '1', '1'],
          ['tools/list', '2', '2'],
          ['tools/call', '3', '3'],
        ],
      },
      snippet: {
        source: `let nextId = 1;
const first = nextId++;
const second = nextId++;
console.log(first + ", " + second);
`,
        output: `1, 2`,
      },
    },
    {
      title: 'A mismatched id is an error',
      detail: 'The client compares the reply id with the request id. A mismatch means the reply belongs to another request, so the client throws an error. The sample never gets a mismatch, but the check protects every call.',
      visual: {
        kind: 'chips',
        caption: 'Two ids that do not match.',
        items: [
          { text: 'Request id 2' },
          { text: 'Reply id 3', note: 'belongs to another request', highlight: true },
        ],
      },
      snippet: {
        source: `const requestId = 2;
const replyId = 3;
if (replyId !== requestId) {
  const message = "id mismatch: got " + replyId;
  console.log(message + ", expected " + requestId);
}
`,
        output: `id mismatch: got 3, expected 2`,
      },
    },
    {
      title: 'The result goes back to the caller',
      detail: 'After the check, the client returns the result field to its caller. The tool list and the call text both come back this way. A reply that fails the check never reaches the caller.',
      visual: {
        kind: 'compare',
        caption: 'What the client returns, and what it refuses.',
        left: { title: 'Returned to the caller', items: ['The result field', 'The tool list and the call text'] },
        right: { title: 'Refused by the client', items: ['A reply with a wrong id', 'A reply for a request that was never sent'] },
      },
    },
  ],
  code: {
    source: `// A fake server. Each reply carries the id of its message.
function fakeServer(message: { id: number; method: string }) {
  if (message.method === "initialize") {
    return { id: message.id, result: { ok: true } };
  }
  if (message.method === "tools/list") {
    return { id: message.id, result: { tools: ["get_order"] } };
  }
  return { id: message.id, result: { text: "Shipped." } };
}

// Each request gets a number, so replies can be matched to it.
let nextId = 1;
function request(method: string): unknown {
  const id = nextId++;
  const reply = fakeServer({ id, method });
  if (reply.id !== id) throw new Error("id mismatch");
  return reply.result;
}

// Open the session, list the tools, then call one of them.
request("initialize");
console.log("Tools:", request("tools/list"));
console.log("Call:", request("tools/call"));
`,
    output: `Tools: { tools: [ 'get_order' ] }
Call: { text: 'Shipped.' }`,
  },
  mistakes: [
    'Skipping the id check. A wrong reply is then used as the answer.',
    'Reusing an id. Two open requests with one id cannot be told apart.',
    'Sending requests before initialize returns. Some servers refuse them.',
  ],
  useWhen: [
    'Your app must call tools on a server that it does not own.',
    'You are testing a server with a client of your own.',
  ],
  skipWhen: [
    'The host already provides a client that does what you need.',
  ],
  words: [
    { term: 'Client', meaning: 'The code that sends requests to one server and reads the replies.' },
    { term: 'Session', meaning: 'The period after initialize, when other requests may be sent.' },
    { term: 'Request id', meaning: 'A unique number that links a reply to its request.' },
    { term: 'Mismatch', meaning: 'A reply whose id does not match the request it answers.' },
  ],
};

export const mcp: Module = {
  slug: 'mcp',
  number: 7,
  title: 'MCP',
  summary: 'A standard way for a model host to reach tools and data over a protocol.',
  lessons: [hostClientServer, stdioServer, resourcesAndPrompts, httpTransportAndTokens, writingAClient],
};
