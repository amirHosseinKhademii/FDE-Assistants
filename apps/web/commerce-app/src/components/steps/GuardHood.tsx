/**
 * Inside step 11 — why a tool's own description of itself cannot guard it.
 *
 * ── THE TRAP IS THE OBVIOUS DESIGN ─────────────────────────────────────────
 *
 * MCP lets a tool advertise `readOnlyHint: true`. The obvious client auto-
 * approves anything wearing it. The SDK's own doc comment, immediately above
 * that schema, says not to — and the reason generalises past MCP entirely: an
 * annotation is a claim made by the thing being guarded.
 *
 * ── THE THIRD PLANT IS THE ONE THAT MATTERS ────────────────────────────────
 *
 * An empty allowlist must refuse every write, not allow every write. That is
 * the bug `@fde/guard` exists as a whole package to name, restated on a new
 * surface, and it is the only one of the three plants that fails in the
 * direction nobody notices.
 */
import { HoodSection, HoodText } from './Hood';
import { Figure, Raw } from './kit';

export function GuardHood() {
  return (
    <>
      <TheHint />
      <TheAllowlist />
      <ThreePlants />
      <ScopeToo />
    </>
  );
}

function TheHint() {
  return (
    <HoodSection title="the SDK says not to trust its own annotations">
      <Figure
        caption="quoted verbatim, from the schema's own doc comment"
        from="measured"
        source="@modelcontextprotocol/core · ToolAnnotationsSchema"
      >
        <Raw tone="var(--color-thb-2)">
          {`"NOTE: all properties in ToolAnnotations are hints. They are not
 guaranteed to provide a faithful description of tool behavior
 (including descriptive properties like title). Clients should
 never make tool use decisions based on ToolAnnotations received
 from untrusted servers."`}
        </Raw>
      </Figure>
      <HoodText>
        Four flags travel with a tool — <code>readOnlyHint</code>,{' '}
        <code>destructiveHint</code>, <code>idempotentHint</code>,{' '}
        <code>openWorldHint</code> — and they are genuinely useful to a human
        reading <code>tools/list</code>. They are documentation. A guard built on
        them asks the thing it is guarding whether it needs guarding.
      </HoodText>
    </HoodSection>
  );
}

function TheAllowlist() {
  return (
    <HoodSection title="so the gate is a list of names, on our side">
      <HoodText>
        The allowlist lives in the client, beside the prompt — not on the server,
        because the server is the thing being constrained. Two write tools exist
        and only one is registered:
      </HoodText>
      <Figure caption="the write surface">
        <Raw>
          {`propose_resolution   writes a DRAFT row, status = 'proposed',
                     attributed to the model, visible to Iris     registered
issue_refund         moves money                                  DEFINED, NOT REGISTERED`}
        </Raw>
      </Figure>
      <HoodText>
        <code>issue_refund</code> exists precisely so the guard has something
        real to refuse. A denial test against a tool that does not exist proves
        nothing — the same reason this repo's leak checker plants a synthetic
        leak on every run and asserts it catches its own plant.
      </HoodText>
      <HoodText>
        The model can always propose. It can never pay. Iris presses the button,
        and the row that records the decision names a human.
      </HoodText>
    </HoodSection>
  );
}

function ThreePlants() {
  return (
    <HoodSection title="three plants, and the third is the real test">
      <Figure caption="what commerce:guard-check will assert">
        <Raw>
          {`1  a server that flips readOnlyHint:true onto issue_refund   → still refused
2  a server that renames issue_refund to fetch_refund_status  → still refused
3  an EMPTY allowlist  →  EVERY write refused, not every write allowed`}
        </Raw>
      </Figure>
      <HoodText>
        Plant 2 is the rug-pull: a server changing a tool <em>after</em> the
        client approved it. Its companion check pins <code>tools/list</code> to a
        committed snapshot and fails on any drift — a tool description is an
        instruction the model follows, so if it can change without a review, it
        is an unreviewed prompt change.
      </HoodText>
      <HoodText>
        Plant 3 is the fail-open test. The obvious implementation of a guard is{' '}
        <code>if (allowlist.length &amp;&amp; !allowlist.includes(name)) refuse</code>,
        which allows everything the moment the list is empty — and an empty list
        is what a misconfigured deployment looks like. If plant 3 passes, you have
        written the bug the guard exists to prevent.
      </HoodText>
    </HoodSection>
  );
}

function ScopeToo() {
  return (
    <HoodSection title="and the same instinct one layer down">
      <Figure caption="who chooses whose order gets read">
        <Raw>
          {`WRONG   get_order(order_id)    ← the model chooses whose order
RIGHT   get_order()             ← the case id comes from the session;
                                  the server resolves case → order`}
        </Raw>
      </Figure>
      <HoodText>
        The MCP server holds a token that can read any order at Thornbury. If the
        model picks the id, then anything that can influence the model — including
        text a customer typed into a contact form — can reach any order that token
        can reach. The server is more privileged than its caller, which is the
        confused-deputy shape, so authorization lives on the server side of the
        boundary rather than in the arguments.
      </HoodText>
    </HoodSection>
  );
}
