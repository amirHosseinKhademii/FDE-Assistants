/**
 * Inside step 1 — the two files that exist, and the run that corrected the plan.
 *
 * ── EVERYTHING IN THIS PANEL IS REAL, WHICH IS TRUE OF NO OTHER ONE ────────
 *
 * The code is quoted from `apps/mcp/commerce/src/` with its real paths, so a
 * reader can open the file. The trace is the actual output of
 * `pnpm commerce:mcp-handshake` on 2026-09-18, captured by the session that
 * wrote the server and handed over verbatim. Nothing here is illustrative.
 *
 * ── THE PANEL'S REAL SUBJECT IS THE TWO CORRECTIONS ────────────────────────
 *
 * A `ping` tool returning `pong` is not worth a dialog. What is worth one is
 * that running it contradicted two things this repo had already written down —
 * the protocol version and the error code — and neither would have been found by
 * reading the SDK more carefully. That is the argument for step 1 being a step
 * at all, so the corrections get the top of the panel and the code sits under
 * them.
 */
import { Code } from '@veresk/surface';
import { HoodSection, HoodText } from './Hood';
import { Figure, Raw, Wire } from './kit';
import type { WireLine } from './kit';

/**
 * The captured exchange, reformatted only by wrapping — no field renamed, no
 * value rounded. `mark` points at the fragment the paragraph above it is about.
 */
const TRACE: WireLine[] = [
  {
    dir: 'out',
    body:
      '{"jsonrpc":"2.0","id":1,"method":"initialize",\n' +
      ' "params":{"protocolVersion":"2026-07-28","capabilities":{},\n' +
      '           "clientInfo":{"name":"handshake-cli","version":"0.1.0"}}}',
    mark: '"protocolVersion":"2026-07-28"',
  },
  {
    dir: 'in',
    body:
      '{"jsonrpc":"2.0","id":1,"result":{\n' +
      '   "protocolVersion":"2025-11-25",\n' +
      '   "capabilities":{"tools":{"listChanged":true}},\n' +
      '   "serverInfo":{"name":"thornbury-commerce","version":"0.1.0"}}}',
    mark: '"protocolVersion":"2025-11-25"',
  },
  { dir: 'out', body: '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' },
  {
    dir: 'in',
    body:
      '{"jsonrpc":"2.0","id":2,"result":{"tools":[{\n' +
      '   "name":"ping","title":"Ping",\n' +
      '   "description":"Returns \\"pong\\". Proves the transport, the handshake\n' +
      '                  and tool dispatch are working. Carries no business\n' +
      '                  meaning and reads no data.",\n' +
      '   "inputSchema":{"type":"object","properties":{},\n' +
      '                  "$schema":"https://json-schema.org/draft/2020-12/schema"}}]}}',
  },
  {
    dir: 'out',
    body: '{"jsonrpc":"2.0","id":3,"method":"tools/call",\n "params":{"name":"ping","arguments":{}}}',
  },
  {
    dir: 'in',
    body: '{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"pong"}]}}',
  },
  {
    dir: 'out',
    body:
      '{"jsonrpc":"2.0","id":4,"method":"tools/call",\n' +
      ' "params":{"name":"no_such_tool","arguments":{}}}',
  },
  {
    dir: 'in',
    body: '{"jsonrpc":"2.0","id":4,"error":{"code":-32602,\n                                 "message":"Tool no_such_tool not found"}}',
    mark: '-32602',
  },
];

export function HandshakeHood() {
  return (
    <>
      <Version />
      <ErrorCode />
      <TheServer />
      <TheClient />
      <FullTrace />
    </>
  );
}

/** Correction one: the answer came back lower than the question, in silence. */
function Version() {
  return (
    <HoodSection title="we asked for one protocol version and were given another">
      <HoodText>
        The client asked to speak <code>2026-07-28</code>. The server replied{' '}
        <code>2025-11-25</code> — and that is the whole exchange. No error, no
        warning, no field saying a downgrade happened. Version negotiation means
        the answer is allowed to be lower than the question, and a client that
        does not read the reply will believe it got what it asked for.
      </HoodText>
      <Figure caption="the two lines that disagree" from="corrected" source="pnpm commerce:mcp-handshake · 2026-09-18">
        <Wire lines={TRACE.slice(0, 2)} />
      </Figure>
      <HoodText>
        <code>LATEST_PROTOCOL_VERSION</code> in this SDK is <code>2025-11-25</code>.
        The <code>2026-07-28</code> era is real but is reached through the HTTP
        handler rather than through <code>initialize</code>, which is now step 7's
        problem. The consequence for anything that displays this: show what was{' '}
        <strong>agreed</strong>, never what was requested.
      </HoodText>
    </HoodSection>
  );
}

/** Correction two: one error code for two different people's mistakes. */
function ErrorCode() {
  return (
    <HoodSection title="an unknown tool is −32602, not −32601">
      <HoodText>
        The plan predicted <code>-32601 METHOD_NOT_FOUND</code>. The wire says{' '}
        <code>-32602 INVALID_PARAMS</code>, and it is obvious afterwards:{' '}
        <code>tools/call</code> <em>is</em> a method this server implements, and{' '}
        <code>name</code> is one of its parameters, so a bad one is an invalid
        parameter.
      </HoodText>
      <Figure caption="the deliberate miss" from="corrected" source="pnpm commerce:mcp-handshake · 2026-09-18">
        <Wire lines={TRACE.slice(6)} />
      </Figure>
      <HoodText>
        The note this step wrote at the time drew a further consequence: that
        “the model invented a tool” and “the model called a real tool with
        arguments it does not take” would arrive under the{' '}
        <strong>same code</strong>, separable only by checking the name against
        the last <code>tools/list</code>.
      </HoodText>
      <HoodText>
        <strong>Step 3 measured that and it turned out not to hold.</strong>{' '}
        Arguments the schema rejects never reach the JSON-RPC error channel at
        all — they come back as <code>isError: true</code> with an{' '}
        <code>Input validation error:</code> prefix. So this code is cleaner than
        step 1 feared: <code>−32602</code> from a <code>tools/call</code> means a
        tool name nobody registered, and nothing else.
      </HoodText>
      <HoodText>
        The reason this is on the page rather than quietly fixed is that it is
        the second time in three steps that a consequence reasoned out from a
        correct measurement was itself wrong. The measurement was right both
        times. What was wrong both times was the sentence written immediately
        after it, before anything tested that sentence.
      </HoodText>
    </HoodSection>
  );
}

function TheServer() {
  return (
    <HoodSection title="the server — one tool, no database, no credential">
      <Figure caption="registering a tool" from="measured" source="quoted whole, comments and all">
        <Code
          path="apps/mcp/commerce/src/server.ts:92–108"
          startLine={92}
          mark={[14, 15, 16]}
          lines={[
            "export function createServer(deps: ServerDeps = {}): McpServer {",
            "  const server = new McpServer(SERVER_INFO);",
            "  const api = deps.api ?? apiConfigFromEnv();",
            "  const session = deps.session ?? sessionFromEnv();",
            "",
            "  server.registerTool(",
            "    'ping',",
            "    {",
            "      title: 'Ping',",
            "      // THE DESCRIPTION IS PROMPT TEXT, not documentation. It is the only thing",
            "      // telling a model what this tool is for, and it is sent on every single",
            "      // request. packages/agent/src/core/tool.types.ts makes the same point",
            "      // about the in-process version; over MCP it is worse, because the text",
            "      // will eventually live in a different deployable from the prompt.",
            "      description:",
            "        'Returns \"pong\". Proves the transport, the handshake and tool dispatch ' +",
            "        'are working. Carries no business meaning and reads no data.',",
          ]}
        />
      </Figure>
      <HoodText>
        Two details in there are not style. The description is the only sentence
        a model ever reads about this tool, and it is sent on every single
        request — which makes it prompt text with a token cost, not
        documentation. And <code>inputSchema: z.object(&#123;&#125;)</code> is an
        empty object rather than an omission, because publishing “this takes
        nothing” is a different statement from declining to say.
      </HoodText>
      <HoodText>
        <code>createServer()</code> does not choose a transport. That separation
        is what lets step 3 drive this exact object over an in-memory transport
        with no subprocess and no socket — a protocol you can only test by
        starting a server is a protocol nobody tests.
      </HoodText>

      <HoodText>
        <strong>And step 4a added what looked like the answer to step 6's
        cost.</strong> The finding there was that the protocol will not carry a
        failure's cause, so each tool must carry its own — and that a discipline
        moved into every handler is one that can be forgotten one handler at a
        time. <code>register()</code> was written to remove the chance.
      </HoodText>
      <HoodText>
        <strong>It half did, and the missing half is the interesting one.</strong>{' '}
        It centralised the <code>structuredContent</code> write and left the{' '}
        <em>catch</em> in each tool. So the sentence that had to be true of it —
        “a tool author cannot forget” — was true of the easy half and false of
        the half that matters: a handler that throws never reaches this
        function's return at all, the SDK converts the exception, and the cause
        is gone. The claim and the code were written in the same commit, with
        nothing between them that could disagree.
      </HoodText>
      <Figure
        caption="the catch, after it moved"
        from="corrected"
        source="apps/mcp/commerce/src/server.ts · quoted whole"
      >
        <Code
          path="apps/mcp/commerce/src/server.ts:63–85"
          startLine={63}
          mark={[15, 18, 19]}
          lines={[
            "export function register(server: McpServer, tool: Tool): void {",
            "  server.registerTool(tool.name, tool.config, async (args: Record<string, unknown>) => {",
            "    // THE CATCH LIVES HERE, NOT IN THE TOOL \u2014 corrected 2026-09-18.",
            "    //",
            "    // It was `tool.run(args)` bare, with each tool calling `guarded()` itself.",
            "    // That is exactly the failure this function claims to prevent: a tool author",
            "    // who forgets the wrapper gets a throw that escapes into the SDK, which",
            "    // converts it to `isError: true` with NO structuredContent, and the cause is",
            "    // gone. \"Centralised\" was true of the structuredContent write and false of",
            "    // the catch, which is the half that cannot be recovered afterwards.",
            "    //",
            "    // Found by the UI session reading this function against the claim made for",
            "    // it. `probeUnguardedToolStillLabelled` is the negative control: it registers",
            "    // a tool that throws and never calls `guarded`, and requires the cause to",
            "    // arrive anyway.",
            "    const outcome = await guarded(() => tool.run(args));",
            "    return {",
            "      content: [{ type: 'text' as const, text: tool.render(outcome) }],",
            "      structuredContent: outcome,",
            "      isError: !outcome.ok,",
            "    };",
            "  });",
            "}",
          ]}
        />
      </Figure>
      <HoodText>
        Now <code>structuredContent</code>, <code>isError</code> and the catch
        are all set in one place, from one value, and a tool author writes none
        of them. That is why the <code>Tool</code> type splits <code>run</code>{' '}
        from <code>render</code>: <code>run</code> returns an outcome and{' '}
        <code>render</code> turns it into words, so the boolean the protocol
        carries and the cause it refuses to carry cannot disagree.
      </HoodText>
      <HoodText>
        <strong>And it was verified by sabotage rather than by reading.</strong>{' '}
        <code>probeUnguardedToolStillLabelled</code> registers a tool that throws
        and never guards itself, and requires the cause to arrive anyway.
        Removing the central catch turns it red; restoring it turns it green. A
        control that has only ever passed is worth less than one somebody has
        watched fail — which is the same argument the guard in step 11 makes
        with its empty allowlist, and the same one the leak checker in this repo
        makes by planting a synthetic leak on every run.
      </HoodText>
      <HoodText>
        The general form is worth more than the fix:{' '}
        <strong>centralising the part that is easy to centralise is not the same
        as centralising the part that matters.</strong> Forgetting to write the
        outcome is recoverable — you see <code>undefined</code> and go looking.
        Forgetting to catch is not.
      </HoodText>
    </HoodSection>
  );
}

function TheClient() {
  return (
    <HoodSection title="the client — raw JSON-RPC, deliberately not the SDK">
      <HoodText>
        Step 10 writes a real client. This is not it. The client SDK is the right
        way to talk to a server and the wrong way to <em>learn</em> one, because
        it hides the handshake — and the handshake is the only part of step 1
        worth looking at.
      </HoodText>
      <Figure caption="the first exchange, as code" from="measured" source="quoted whole">
        <Code
          path="apps/mcp/commerce/src/cli/handshake.ts:100–121"
          startLine={100}
          mark={[12]}
          lines={[
            "/**",
            " * Both sides declare capabilities, and neither may use what the other did not",
            " * declare. WE DECLARE NOTHING \u2014 no sampling, no elicitation \u2014 which is exactly",
            " * the state PLAN.md \u00a79.1 describes and not an oversight.",
            " */",
            "async function initialize(send: Send): Promise<void> {",
            "  send({",
            "    jsonrpc: '2.0',",
            "    id: 1,",
            "    method: 'initialize',",
            "    params: {",
            "      protocolVersion: PROTOCOL_VERSION,",
            "      capabilities: {},",
            "      clientInfo: { name: 'handshake-cli', version: '0.1.0' },",
            "    },",
            "  });",
            "  await settle(1500);",
            "",
            "  // No id, no reply: this one is a notification.",
            "  send({ jsonrpc: '2.0', method: 'notifications/initialized' });",
            "  await settle(300);",
            "}",
          ]}
        />
      </Figure>
      <HoodText>
        <code>capabilities: &#123;&#125;</code> is the sentence that costs the
        most later. A server may only use what the client declared, and this
        client declares nothing — so the server cannot ask the human to confirm a
        refund, and cannot borrow the client's model. Neither is missing by
        accident; both are named as out of scope in the plan, and step 11's
        approval is therefore ours to build rather than the protocol's to
        provide.
      </HoodText>
      <Figure caption="the framing, verified rather than assumed">
        <Raw>
          {`require('@modelcontextprotocol/server').serializeMessage({...})
  -> '{"jsonrpc":"2.0","id":1,"method":"ping"}\\n'`}
        </Raw>
      </Figure>
      <HoodText>
        One JSON object per line, in each direction. That is the entire
        transport.
      </HoodText>
    </HoodSection>
  );
}

function FullTrace() {
  return (
    <HoodSection title="the whole run">
      <Figure
        caption="four exchanges, start to finish"
        from="measured"
        source="pnpm commerce:mcp-handshake · 2026-09-18"
      >
        <Wire lines={TRACE} />
      </Figure>
      <HoodText>
        The second reply is the payload that lands in the model's context on
        every single request, for every tool the server has. At one tool it is
        noise. At seven it is the number step 12 measures, and the reason a
        stable byte-for-byte <code>tools/list</code> turns out to matter more
        than it sounds.
      </HoodText>
    </HoodSection>
  );
}
