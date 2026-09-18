/**
 * Inside step 2 — what a client we did not write says about the same failure.
 *
 * ── THIS PANEL EXISTS FOR ONE FINDING ──────────────────────────────────────
 *
 * Step 2 reads like a chore: point the official debugger at the server, look at
 * the messages. It produced the best correction of the two steps that have run —
 * that a failure's NAME is a property of the protocol *and the client*, not of
 * the protocol alone. Everything in the taxonomy panel downstream depends on it,
 * so it gets a panel rather than a paragraph.
 *
 * ── AND ON A MEASUREMENT TAKEN THROUGH A PIPE ──────────────────────────────
 *
 * The last section is the one worth reading twice. A draft of the source
 * document said the inspector's CLI does not signal failure by exit code. It
 * does — exit 5. The first run had been piped into `head`, so the shell reported
 * `head`'s status. That is a whole class of wrong measurement and it is recorded
 * rather than quietly fixed.
 */
import { HoodSection, HoodText } from './Hood';
import { Figure, Raw } from './kit';

export function InspectorHood() {
  return (
    <>
      <NotOurs />
      <TwoVocabularies />
      <ThroughAPipe />
    </>
  );
}

function NotOurs() {
  return (
    <HoodSection title="a program we did not write used our server">
      <Figure caption="the command" from="measured" source="@modelcontextprotocol/inspector 2.7.0">
        <Raw>
          {`cd apps/mcp/commerce
npx -y @modelcontextprotocol/inspector@2.7.0 npx ts-node src/server.ts`}
        </Raw>
      </Figure>
      <HoodText>
        That is the point of the step, and it is easy to undersell. Until this
        ran, the only thing that could talk to the server was the handshake CLI
        in the same folder — which proves a program can talk to itself. A client
        from a different package, written by different people, spawning it and
        negotiating with it is what makes it an MCP server rather than a program
        with a JSON habit.
      </HoodText>
      <Figure caption="what the CLI mode proved" from="measured" source="2026-09-18">
        <Raw>
          {`--method tools/list              → our one tool, with the JSON Schema the model
                                   would see
--method tools/call ping         → { content: [ { type: "text", text: "pong" } ] }
--method tools/call no_such_tool → stderr:
      {"error":{"code":"tool_not_found",
                "message":"Tool 'no_such_tool' not found on server."}}
      exit code 5`}
        </Raw>
      </Figure>
      <HoodText>
        The inspector has three modes — a clickable web UI, a terminal UI, and
        this scriptable CLI. The CLI is what is recorded here because it can be
        captured; the web UI is the one worth opening yourself, because it shows
        the message log as a list you can click through.
      </HoodText>
    </HoodSection>
  );
}

function TwoVocabularies() {
  return (
    <HoodSection title="the same failure, described two ways">
      <Figure caption="one event, two clients" from="corrected" source="step 1 vs. step 2">
        <Raw>
          {`raw wire (our CLI)  { "code": -32602,           "message": "Tool no_such_tool not found" }
the inspector       { "code": "tool_not_found", "message": "Tool '...' not found on server." }`}
        </Raw>
      </Figure>
      <HoodText>
        A <em>string</em> code where the protocol has a <em>number</em>, a
        different message, on <strong>stderr</strong> rather than stdout, and
        signalled by exit code 5. Nothing is wrong here — the inspector
        normalised the error into its own vocabulary, which is a reasonable thing
        for a debugger to do.
      </HoodText>
      <HoodText>
        But it means the failure taxonomy is not purely a property of the
        protocol. It is a property of the protocol <strong>and the client you
        use</strong>. A normalising client can hand you a cleaner discriminator
        than the wire has — <code>tool_not_found</code> is <em>exactly</em> the
        distinction step 1 discovered the numeric codes cannot make — or it can
        flatten a distinction you needed and never tell you.
      </HoodText>
      <HoodText>
        The rule that follows: write the discriminator against the client you
        actually ship, and verify it there. Not against the wire, and definitely
        not against whatever a debugging tool prints. Anything on a screen that
        names a failure should render what <em>our</em> loop reported, and no UI
        copy anywhere should hard-code a numeric code — it is not stable across
        clients.
      </HoodText>
    </HoodSection>
  );
}

function ThroughAPipe() {
  return (
    <HoodSection title="and one measurement that was nearly wrong">
      <HoodText>
        The first run of that command was piped into <code>head</code>. So{' '}
        <code>$?</code> reported <code>head</code>'s exit status — 0 — and the
        draft of the source document said “the CLI does not signal failure via
        exit code.” It does; it exits 5. Re-running it without the pipe is the
        only reason that sentence is not in the document.
      </HoodText>
      <Figure caption="the shape of the error">
        <Raw>
          {`$ thing-that-fails | head        $? = 0   ← head's status
$ thing-that-fails               $? = 5   ← the thing's status`}
        </Raw>
      </Figure>
      <HoodText>
        A measurement taken through a pipe measures the pipe. It is on this page
        because it is the kind of mistake that produces a confident, quotable,
        wrong sentence in a document that everything downstream then trusts.
      </HoodText>
    </HoodSection>
  );
}
