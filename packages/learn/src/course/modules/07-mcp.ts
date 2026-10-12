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
      title: 'The three roles',
      detail: 'The host is the app the user runs. The client lives inside the host and talks to one server. The server offers tools and data.',
    },
    {
      title: 'Message format',
      detail: 'Every JSON-RPC message is a JSON object. A request has an id, a method name, and optional params. For example, tools/call names the tool get_order.',
    },
    {
      title: 'Starting the session',
      detail: 'The client sends initialize first, with a protocol version such as 2024-11-05. Other requests follow after the server answers that first request.',
    },
    {
      title: 'Matching replies',
      detail: 'A reply repeats the id of the request it answers. The sample prints true because reply id 3 matches call id 3. Ids let several requests share one connection.',
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
  hood: {
    paragraphs: [
      'JSON-RPC is a message format. Each message is a JSON object with a version, a method name, and params, or a result for an id.',
      'The id lets many requests share one connection. A reply with the same id belongs to that request.',
      'A message without an id is a notification, and it gets no reply. A request with an id always gets a reply.',
    ],
    example: [
      { label: 'Method in the request', value: 'tools/call' },
      { label: 'Id in the request', value: '3' },
      { label: 'Id in the reply', value: '3' },
      { label: 'Reply matches the request', value: 'true' },
    ],
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
      title: 'Standard input and output',
      detail: 'The host starts the server as a child process. It writes one JSON line per request to standard input. The server writes one JSON line per reply to standard output.',
    },
    {
      title: 'Listing the tools',
      detail: 'A tools/list request returns the names of the tools. The sample returns get_order as the only name. The client can then show that list to the model.',
    },
    {
      title: 'Calling a tool',
      detail: 'A tools/call request names a tool and passes its arguments. The handler returns text, which goes into a content list. The sample returns the text Order A-1042 shipped.',
    },
    {
      title: 'Unknown methods',
      detail: 'The ping method is not in the sample, so the server returns an error. The code -32601 means method not found. The error reply still carries the id of the request.',
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
  hood: {
    paragraphs: [
      'Stdio means standard input and standard output. The host starts the server as a child process and writes to its input.',
      'A real server uses a line reader to feed each line to the handler. The sample uses a fixed list of requests in its place.',
      'The sample reply omits the jsonrpc field for brevity. A real reply must include it, as lesson 7.1 shows.',
    ],
    example: [
      { label: 'Request line', value: 'id 2, tools/call, get_order' },
      { label: 'Handler result', value: 'Order A-1042 shipped.' },
      { label: 'Reply line', value: 'id 2, with one text item' },
    ],
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
      title: 'Resources',
      detail: 'A resource is readable data, identified by a uri. A uri is an address such as docs://refunds. resources/list returns the uris, and resources/read returns the text.',
    },
    {
      title: 'Prompts',
      detail: 'A prompt is a reusable message template with named arguments. The sample fills the template with topic refund and returns Summary of refund FAQ.',
    },
    {
      title: 'Data and actions',
      detail: 'Resources are data that the client reads. Tools are actions that the model asks for. Reading a resource should never change any data.',
    },
    {
      title: 'Where the data lives',
      detail: 'The sample keeps its data in plain objects. A real server reads the same shape from files or a database. The client does not need to know where the data is stored.',
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
  hood: {
    paragraphs: [
      'The sample keeps the server data in plain objects. A real server reads its data from files or a database.',
      'The params argument holds the request fields. Each branch reads only the fields that its method needs.',
      'Here a prompt is a function from its arguments to text. The text is the message that the client sends on.',
    ],
    example: [
      { label: 'Resource uri', value: 'docs://refunds' },
      { label: 'Resource text', value: 'Refunds take 5 to 7 days.' },
      { label: 'Prompt name', value: 'summarize_faq' },
      { label: 'Prompt output', value: 'Summary of refund FAQ.' },
    ],
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
      title: 'Sending over HTTP',
      detail: 'Each JSON message travels in the body of an HTTP request. The server sends its JSON reply in the response body. The messages are the same as over standard input.',
    },
    {
      title: 'The bearer token',
      detail: 'The client adds an Authorization header with the word Bearer and a token. The server looks up the token in its table. The token shows which client is calling.',
    },
    {
      title: 'Status codes',
      detail: 'An unknown or missing token gets status 401, which means not authenticated. A known token that asks for a forbidden method gets 403, which means forbidden. A valid call gets 200.',
    },
    {
      title: 'Allowed methods per token',
      detail: 'The table maps each token to a list of methods. The sample allows tools/list and tools/call for the reader token. A resources/read call with the same token gets 403.',
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
  hood: {
    paragraphs: [
      'A bearer token travels as plain text in the header. It must only be sent over HTTPS.',
      'The sample maps each token to its allowed methods. A real server stores tokens in hashed form, not as plain text.',
      'The status codes come from HTTP. 401 means no valid credential, and 403 means a known caller may not do that.',
    ],
    example: [
      { label: 'No token sent', value: '401, unknown token' },
      { label: 'Valid token, tools/list', value: '200, ok' },
      { label: 'Valid token, resources/read', value: '403, method not allowed' },
    ],
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
      title: 'Starting the session',
      detail: 'The client sends initialize first and waits for its reply. Other requests are sent only after that reply arrives. The sample does this before it lists the tools.',
    },
    {
      title: 'Numbering requests',
      detail: 'The nextId counter goes up by one for each request. Every request therefore has a unique id. The sample uses the ids 1, 2, and 3.',
    },
    {
      title: 'Checking the id',
      detail: 'The client compares the reply id with the request id. A mismatch throws an error, because the reply belongs to another request. The sample never sees a mismatch.',
    },
    {
      title: 'Using the result',
      detail: 'The client returns the result field to its caller. The sample prints the tool list, then the call result. The output shows both values.',
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
  hood: {
    paragraphs: [
      'The fake server is a function. A real client sends each message through a transport, such as standard input or HTTP.',
      'Each reply carries the id of its message. The client can match replies even when they arrive out of order.',
      'The sample throws on a mismatch. Logging the mismatch and carrying on would hide a broken connection.',
    ],
    example: [
      { label: 'Id for initialize', value: '1' },
      { label: 'Id for tools/list', value: '2' },
      { label: 'Id for tools/call', value: '3' },
    ],
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
