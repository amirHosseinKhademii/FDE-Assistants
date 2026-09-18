/**
 * Thornbury Goods — the MCP server. STEP 1: one tool, and nothing else.
 *
 * WHY THIS FILE EXISTS BEFORE ANY REAL TOOL DOES. The whole engagement turns on
 * a claim — that putting a protocol between the model and the customer's
 * backend buys a boundary worth its cost (docs/commerce/PLAN.md §10). A claim
 * like that is only testable if the protocol part works in isolation first, so
 * this server touches no database, no HTTP API and no credential. It answers
 * `ping` with `pong`, and the point is the HANDSHAKE either side of that.
 *
 * WHAT `McpServer` IS. Not a web server. It is a JSON-RPC peer that has to be
 * handed a transport before it can hear anything — hence `connect()` at the
 * bottom rather than a `listen()`. Step 7 swaps the transport for HTTP and this
 * file's tool definitions do not change, which is the property being set up.
 *
 * STDIO, AND WHY IT IS FIRST. The server reads its own stdin and writes its own
 * stdout. No port, no TLS, no auth — four things that can go wrong, deferred.
 * The consequence is the one that confuses everyone once: RUNNING THIS PRINTS
 * NOTHING AND LOOKS HUNG. It is not hung; it is waiting to be spoken to, and a
 * stdio server is spawned by its client rather than visited.
 *
 * ⚠ NEVER console.log IN A STDIO SERVER. stdout IS the protocol channel, and a
 * stray log line is a parse error at the other end that reads like a transport
 * bug. Diagnostics go to stderr. This is the single most common way to lose an
 * hour here, which is why `serverLog` exists below rather than a bare log.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

/** stderr, never stdout. See the header. */
export function serverLog(...parts: unknown[]): void {
  process.stderr.write(`[commerce-mcp] ${parts.join(' ')}\n`);
}

export const SERVER_INFO = { name: 'thornbury-commerce', version: '0.1.0' } as const;

/**
 * Build the server, without connecting it.
 *
 * SEPARATE FROM `main()` ON PURPOSE. Step 3 drives this exact object over
 * `InMemoryTransport` with no subprocess and no socket, and it can only do that
 * if construction and transport are not welded together. A `createServer()` that
 * also chose its transport would make the protocol untestable, which is how you
 * end up with a protocol nobody tests.
 */
export function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO);

  server.registerTool(
    'ping',
    {
      title: 'Ping',
      // THE DESCRIPTION IS PROMPT TEXT, not documentation. It is the only thing
      // telling a model what this tool is for, and it is sent on every single
      // request. packages/agent/src/core/tool.types.ts makes the same point
      // about the in-process version; over MCP it is worse, because the text
      // will eventually live in a different deployable from the prompt.
      description:
        'Returns "pong". Proves the transport, the handshake and tool dispatch ' +
        'are working. Carries no business meaning and reads no data.',
      // An empty object, not `undefined`: the tool takes no arguments, and
      // SAYING SO is different from declining to say. `tools/list` publishes
      // this schema, and the server validates against it before dispatch.
      inputSchema: z.object({}),
    },
    async () => ({ content: [{ type: 'text', text: 'pong' }] }),
  );

  return server;
}

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  serverLog(`${SERVER_INFO.name} ${SERVER_INFO.version} listening on stdio`);
}

// `require.main === module` rather than a bare call, so importing this file for
// a test does not start a server on the test runner's stdin.
if (require.main === module) {
  main().catch((e) => {
    serverLog('fatal:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
