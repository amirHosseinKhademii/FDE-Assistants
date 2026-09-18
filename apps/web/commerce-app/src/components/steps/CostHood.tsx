/**
 * Inside step 12 — the measurement, and the failure that stays green.
 *
 * ── THE STEP THAT COULD END THE ENGAGEMENT, AND SHOULD BE ABLE TO ──────────
 *
 * Every other engagement here earns its new machinery by measuring it. This one
 * has to answer whether a protocol between the model and the tools bought
 * anything a NestJS module would not have. The plan's own view is that the
 * honest answer is likely to be "no, and we publish that" — which is why this
 * panel states the experiment rather than the hoped-for result.
 *
 * ── THE LAST CHECK IS THE ONE ALMOST NOBODY WRITES ─────────────────────────
 *
 * Prompt caching is a prefix match and `tools` renders first. An unstable
 * `tools/list` invalidates the whole cached prefix on every request: the bill
 * goes up, latency goes up, and every individual answer is still correct.
 * Nothing goes red. The check is `assert the serialized block is byte-identical
 * twenty times running`, and it takes a minute to write.
 */
import { HoodSection, HoodText } from './Hood';
import { Figure, Raw } from './kit';

export function CostHood() {
  return (
    <>
      <TheExperiment />
      <WhatToRecord />
      <TheSilentOne />
      <NotACheck />
    </>
  );
}

/**
 * The one conclusion on this page that no self-test can settle.
 *
 * IT IS HERE BECAUSE THE PAGE'S OWN RULE WOULD OTHERWISE FORBID IT. Four
 * finished steps produced four corrections, and the discriminator between the
 * conclusions that survived and the ones that did not is whether somebody wrote
 * a check against them. Taken literally that rule says: do not write a paragraph
 * you cannot check. Applied to this step it would forbid the finding the whole
 * engagement exists to produce.
 *
 * So the limit is stated where it bites rather than left for somebody to hit.
 */
function NotACheck() {
  return (
    <HoodSection title="and this one cannot be settled by a check">
      <HoodText>
        Everything else on this page was decided by running something. The
        protocol version, the error code, the three causes that collapse into one
        boolean, the catch that had to move — each is a check that goes red when
        the claim is false, which is why they survived and the unchecked
        conclusions beside them did not.
      </HoodText>
      <HoodText>
        <strong>“Was the boundary worth its cost” is not that kind of
        sentence.</strong> The five numbers above are measurements and they will
        be right. What they cannot do is decide the question: a latency figure
        and a token count do not say whether owning, deploying and securing the
        tool surface separately was worth paying them for. That is a judgment
        about what this customer values, and no self-test settles it.
      </HoodText>
      <Figure caption="so the rule has a limit, and it is stated rather than discovered">
        <Raw>
          {`write the check before the paragraph          — holds for everything above

BUT: a conclusion no check can reach must still be
     written. Otherwise "write the check first"
     quietly becomes "do not write the paragraph",
     and the most important finding is the one that
     never gets recorded.`}
        </Raw>
      </Figure>
      <HoodText>
        What it gets instead of a check is the next best thing:{' '}
        <strong>its reasoning in the open, and to be read as an argument rather
        than as a result.</strong> The numbers are evidence somebody else can
        re-run and disagree with; the conclusion drawn from them is not, and the
        page should not dress it as though it were. Naming that before the
        measurement exists is worth more than discovering it afterwards — which
        is itself a claim with no check behind it.
      </HoodText>
    </HoodSection>
  );
}

function TheExperiment() {
  return (
    <HoodSection title="the same twelve questions, twice">
      <Figure caption="the two arms">
        <Raw>
          {`arm A   seven tools in ToolRegistry, whose bodies make THE SAME HTTP
        calls to THE SAME Nest endpoints
arm B   the same seven, reached through the MCP client

only the transport to the model differs`}
        </Raw>
      </Figure>
      <HoodText>
        Arm A is not “the old in-process tool”. It is deliberately an in-process
        tool that already pays for the API hop, because otherwise the difference
        would be attributable to the network rather than to MCP — and the thing
        being measured is the protocol, not the extra service.
      </HoodText>
    </HoodSection>
  );
}

function WhatToRecord() {
  return (
    <HoodSection title="five numbers">
      <Figure caption="what comes out of the run">
        <Raw>
          {`tool latency                 p50 / p95
tokens in the tools block    it renders on every request
turns to a valid answer      does the boundary cost the model reasoning?
the failure histogram        step 6's five buckets
cache_read_input_tokens      see below`}
        </Raw>
      </Figure>
      <HoodText>
        If it comes out saying MCP cost latency and tokens and bought a boundary
        a module would also have bought, that is a real finding and it gets
        written down. Given that this engagement deliberately chose the
        separate-deployable form <em>in order to make the boundary visible</em>,
        it is also the likely one.
      </HoodText>
    </HoodSection>
  );
}

function TheSilentOne() {
  return (
    <HoodSection title="the one that catches a disaster nothing else sees">
      <HoodText>
        Prompt caching is a prefix match, and the <code>tools</code> block
        renders <strong>first</strong> — before the system prompt, before the
        messages. An MCP <code>tools/list</code> is assembled by a server,
        possibly out of a <code>Map</code>. If the order is not stable, or a
        description carries a build version, the entire cached prefix is
        invalidated on every request.
      </HoodText>
      <Figure caption="what that failure looks like from outside">
        <Raw>
          {`the bill              up
latency               up
every answer          still correct
anything red          no`}
        </Raw>
      </Figure>
      <HoodText>
        So the last check of the whole engagement is embarrassingly simple: call{' '}
        <code>tools/list</code> twenty times and assert the serialized block is
        byte-identical. It is the shortest check here and it guards the most
        expensive silent failure.
      </HoodText>
    </HoodSection>
  );
}
