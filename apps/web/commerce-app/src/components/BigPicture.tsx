/**
 * Who holds what, and where the line is — shared by the landing page and `/steps`.
 *
 * THE ONE BOLD DRAWING on either page. Five boxes in the order a request
 * travels. Ours are teal, Thornbury's are grey, and the dashed line between our
 * MCP server and their API is the whole architecture: everything left of it we
 * wrote; everything right of it the customer already owned. On a phone it
 * becomes a column and the arrows point down (see `.thb-map` in app.css).
 *
 * ONE COMPONENT RATHER THAN TWO DRAWINGS because the landing page used to carry
 * its own ASCII version, and two drawings of one architecture is how one of
 * them ends up claiming a port or a credential the other does not.
 */
export function BigPicture() {
  return (
    <>
      <div className="thb-map mt-8" role="list">
        <Node side="person" name="Iris" who="a person" holds="Reads the assistant’s draft and approves or rejects it. Only a person can move money." />
        <Arrow label="asks" />
        <Node side="ours" name="The assistant" who="we build it" holds="A language model and the loop around it. Holds only the key to our own MCP server." />
        <Arrow label="MCP messages" />
        <Node side="ours" name="Our MCP server" who="we build it" holds="Owns the tools. Holds one token for Thornbury’s API — and no password to Thornbury’s databases." />
        <Arrow label="HTTPS + token" line />
        <Node side="theirs" name="Thornbury’s API" who="Thornbury owns it" holds="Checks the token and decides what the caller may see." />
        <Arrow label="database queries" />
        <Node side="theirs" name="Five databases" who="Thornbury owns them" holds="Orders, warehouse, deliveries, customer history, policy settings." />
      </div>

      <div className="thb-map-key mt-5">
        <span>
          <span className="thb-swatch" data-side="ours" />
          What we build and deploy
        </span>
        <span>
          <span className="thb-swatch" />
          What Thornbury already owned
        </span>
        <span>Dashed line: the boundary between the two</span>
      </div>

      <div className="thb-prose mt-6 max-w-[66ch]">
        <p>
          <strong>Why the line matters.</strong> If our MCP server were ever
          broken into, the damage is limited to what its one token can reach —
          and Thornbury’s own API decides that, with its own tests. Had we put the
          AI’s tools inside Thornbury’s backend instead, that same process would
          hold passwords to all five databases. (Its one database login is for
          our own search index, and can read one table.)
        </p>
      </div>
    </>
  );
}

function Node({ side, name, who, holds }: { side: 'ours' | 'theirs' | 'person'; name: string; who: string; holds: string }) {
  return (
    <div className="thb-node" data-side={side} role="listitem">
      <span className="thb-node-name">{name}</span>
      <span className="thb-node-who">{who}</span>
      <span className="thb-node-holds">{holds}</span>
    </div>
  );
}

function Arrow({ label, line = false }: { label: string; line?: boolean }) {
  return (
    <div className="thb-link" data-line={line} aria-hidden>
      <span className="thb-link-arrow" />
      <span>{label}</span>
    </div>
  );
}

