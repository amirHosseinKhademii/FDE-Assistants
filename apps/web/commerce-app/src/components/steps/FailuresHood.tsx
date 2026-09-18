/**
 * Inside step 6 — six ways to fail, three wire shapes, two words to record them.
 *
 * ── THE MOST VALUABLE STEP ON THE PAGE, AND IT NEEDS NOBODY ────────────────
 *
 * Nothing in step 6 touches a database, an API or a model. It is a handful of
 * deliberate failures and a table you write yourself. It is also the step that
 * decides whether every failure this engagement ever records points at the
 * right person — and the existing machinery gets it wrong by default, in a way
 * the compiler will not mention.
 *
 * ── AND STEP 3 REVERSED ITS PREMISE ───────────────────────────────────────
 *
 * This panel was written arguing MCP hands you five failure kinds where the
 * in-process loop had two. Step 3's wire self-test measured the opposite: three
 * of the five arrive as the same boolean with free text, and only one of those
 * is recognisable — by a message prefix. The buckets are still the right
 * buckets; what changed is that the tool has to carry its own outcome, because
 * the protocol will not.
 *
 * ── THE OTHER FINDING IS THE SILENT WIDENING ──────────────────────────────
 *
 * `cause` is a union of two strings today. Adding three more is not a breaking
 * change: the two places that read it both do `cause === 'threw'`, which keeps
 * compiling and keeps returning false for the new members. So the failure count
 * does not go red — it goes DOWN, quietly, and the run looks better than it is.
 * That is why this is a step rather than a refactor discovered mid-sprint.
 */
import { Code } from '@veresk/surface';
import { HoodSection, HoodText } from './Hood';
import { Figure, Raw } from './kit';

/**
 * The six, who each one belongs to, and what the wire actually says.
 *
 * WHOSE FAULT IS THE COLUMN THAT MATTERS, not what the error looked like. A
 * failure filed against the wrong owner sends every debugging hour to the wrong
 * place: a model that used a tool wrongly looks like a broken socket, and a
 * tool that correctly said no looks like an outage.
 */
const FAILURES = [
  {
    make: 'name a tool that does not exist',
    wire: '−32602',
    whose: 'the model',
    why: 'it invented a capability. The only one of the six that is a JSON-RPC error at all',
  },
  {
    make: 'a tool that ran and decided \u201cno\u201d',
    wire: 'isError: true',
    whose: 'the domain',
    why: 'a legitimate answer, not a fault \u2014 free text the tool author chose',
  },
  {
    make: 'a tool that throws',
    wire: 'isError: true',
    whose: 'infrastructure',
    why: 'a bad path, a dead socket, an expired credential \u2014 also free text',
  },
  {
    make: 'arguments the schema rejects',
    wire: 'isError: true',
    whose: 'the model',
    why: 'rejected before the handler runs. The only one of these three with a recognisable message prefix',
  },
  {
    make: 'an argument the schema never declared',
    wire: 'no error at all',
    whose: 'nobody \u2014 yet',
    why: 'silently accepted, and the handler runs. Zod objects are not strict by default and the SDK does not make them so',
  },
  {
    make: 'kill the server mid-call',
    wire: 'nothing comes back',
    whose: 'infrastructure',
    why: 'the transport died',
  },
] as const;

export function FailuresHood() {
  return (
    <>
      <FiveFailures />
      <TheCollapse />
      <TheFlattening />
      <TheSilentWidening />
      <TheRule />
    </>
  );
}

/**
 * Step 3 measured the opposite of what this step was drafted assuming.
 *
 * IT IS THE BIGGEST FINDING ON THE PAGE and it arrived after the rest of this
 * panel was written, which is why it sits between the collapse and the union
 * rather than at the end: the reader has just been told which distinction the
 * error code DOES carry, and the next thing they need is that three failures
 * with three different owners share one boolean.
 */
function TheFlattening() {
  return (
    <HoodSection title="and three more share a single boolean">
      <Figure
        caption="three different owners, one wire shape"
        from="corrected"
        source="pnpm commerce:mcp-check · 2026-09-18"
      >
        <Raw>
          {`DOMAIN refusal   isError=true  text="not in scope for this case"
THROWN           isError=true  text="socket is on fire"
BAD ARGS         isError=true  text="Input validation error: … received number"`}
        </Raw>
      </Figure>
      <HoodText>
        Only the last is identifiable, and only by a message <em>prefix</em>. The
        other two are free text whoever wrote the tool happened to pick. So six
        distinguishable events do not arrive as six things — they arrive as one
        error code, one boolean, one silence, and a dead connection.
      </HoodText>
      <HoodText>
        <strong>This is the reverse of what the plan assumed.</strong> It was
        drafted arguing that MCP gives you more failure resolution than an
        in-process function — five buckets where there were two. It gives{' '}
        <strong>less</strong>. The in-process registry tells a throw from a
        return <em>structurally</em>, by catching one of them; MCP flattens that
        to a boolean before it reaches us.
      </HoodText>
      <Figure caption="so the tool carries what the protocol will not" from="proposed">
        <Raw>
          {`every Thornbury tool, from step 5 onward, returns its own outcome:

  structuredContent: { ok: false, cause: 'out_of_scope' }

and the discriminator reads THAT, not the boolean.`}
        </Raw>
      </Figure>
      <HoodText>
        <strong>Except that a throw cannot label itself.</strong> If a handler
        raises, the SDK converts the exception and our code never runs — there is
        no moment at which anything of ours could set{' '}
        <code>structuredContent</code>. So “the tool carries its own cause” is
        only true of tools that never throw, which means every tool has to catch
        its own exceptions and return a structured outcome instead.
      </HoodText>
      <HoodText>
        That is a real cost and it is worth naming as one. In-process, the loop
        enforces this discipline <em>centrally</em> — one <code>try</code> in the
        registry covers every tool ever written. Over the boundary, the obvious
        shape moves it into each handler, where it can be forgotten one tool at a
        time and the symptom of forgetting is a plumbing failure wearing a domain
        answer's clothes.
      </HoodText>
      <HoodText>
        <strong>The server recovered the central version, and only on the second
        attempt.</strong> A <code>register()</code> helper was written to make
        the cause unforgettable, and it centralised the{' '}
        <code>structuredContent</code> write while leaving the <em>catch</em> in
        each tool — so it was true of the easy half and false of the half that
        matters. The catch now lives inside it, and a negative control registers
        a tool that throws and never guards itself to prove the cause still
        arrives. Step 1's panel quotes it.
      </HoodText>
      <HoodText>
        The general form, which outlives the MCP detail:{' '}
        <strong>centralising the part that is easy to centralise is not the same
        as centralising the part that matters.</strong> Forgetting to write the
        outcome is recoverable — you see <code>undefined</code> and go looking.
        Forgetting to catch is not.
      </HoodText>
      <HoodText>
        The general lesson is worth more than the MCP detail:{' '}
        <strong>a boundary that serialises does not preserve what your type
        system was preserving.</strong> Nothing announced the loss. Every call
        still worked, every test that existed still passed, and the only symptom
        would have been failures filed against the wrong owner for months.
      </HoodText>
      <HoodText>
        One more measurement from the same run, and it belongs to the same
        family: <strong>an argument the schema never declared is silently
        accepted</strong>, and the handler runs anyway. Zod objects are not
        strict by default and the SDK does not make them so. Nothing here
        currently branches on an undeclared field — but this is a tool input
        crossing a trust boundary, and the answer contract on the other side of
        this repo uses a strict object for exactly this reason. It is recorded as
        behaviour rather than endorsed.
      </HoodText>
    </HoodSection>
  );
}

function FiveFailures() {
  return (
    <HoodSection title="six failures, three owners — and three wire shapes between them">
      <HoodText>
        Read the middle column first, and read it as the <em>bad</em> news. Six
        distinct events, each with a different owner and a different fix, and the
        protocol has three shapes to describe them all in. The repeats are not a
        formatting economy; they are the finding, and the two sections below are
        what follows from each one.
      </HoodText>
      <div className="grid gap-px overflow-hidden rounded-lg border border-ui-line bg-ui-line">
        {FAILURES.map((f) => (
          <div
            key={f.make}
            className="grid gap-1 bg-ui-surface px-4 py-3 sm:grid-cols-[1.1fr_10rem_auto] sm:items-baseline sm:gap-4"
          >
            <span className="text-[0.875rem] text-ui-fg">{f.make}</span>
            <span className="font-mono text-[0.75rem] text-thb-2">{f.wire}</span>
            <span className="font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase sm:text-right">
              {f.whose}
            </span>
            <span className="text-[0.8125rem] text-ui-faint sm:col-span-3">{f.why}</span>
          </div>
        ))}
      </div>
      <HoodText>
        Three owners. The model invents or misuses; the domain legitimately says
        no; the infrastructure breaks. Filing one as another is not a cosmetic
        error — it sends every debugging hour to the wrong place, and it does it
        without ever going red.
      </HoodText>
    </HoodSection>
  );
}

function TheCollapse() {
  return (
    <HoodSection title="−32602 is cleaner than step 1 predicted">
      <HoodText>
        Step 1 called a tool that does not exist, got{' '}
        <code>−32602 INVALID_PARAMS</code> rather than the{' '}
        <code>−32601</code> the plan expected, and drew a consequence from
        it: that “the model invented a tool” and “the model called a real tool
        wrongly” would arrive under the same code, separable only by checking the
        name against the last <code>tools/list</code>.
      </HoodText>
      <HoodText>
        <strong>Step 3 measured that consequence, and it does not hold.</strong>{' '}
        Arguments the schema rejects do not produce a JSON-RPC error at all. They
        come back as <code>isError: true</code> with an{' '}
        <code>Input validation error:</code> prefix. So <code>−32602</code>{' '}
        means one thing and one thing only: a tool name nobody registered.
      </HoodText>
      <Figure
        caption="what was predicted, and what was measured"
        from="corrected"
        source="src/wire-selftest.ts · pnpm commerce:mcp-check"
      >
        <Raw>
          {`PREDICTED   unknown tool     -32602
            bad arguments    -32602          ← same code, indistinguishable

MEASURED    unknown tool     -32602
            bad arguments    isError: true, "Input validation error: …"`}
        </Raw>
      </Figure>
      <HoodText>
        That is better news than the prediction — an unknown tool is cleanly
        identifiable after all — and it is worth saying out loud, because the
        note in <code>MCP-STEPS.md</code> step 1 still carries the superseded
        version. A discriminator written from it would go looking for a
        distinction that is not where it was told to look.
      </HoodText>
      <HoodText>
        The collapse is real. It is one section down, it involves three failures
        rather than two, and it is worse.
      </HoodText>
    </HoodSection>
  );
}

function TheSilentWidening() {
  return (
    <HoodSection title="and the existing machinery has two of the five">
      <Figure caption="what a tool failure can currently be called" from="measured" source="quoted from the file">
        <Code
          path="packages/agent/src/core/tool.types.ts:72"
          startLine={72}
          lines={["  cause?: 'unknown_tool' | 'threw';"]}
        />
      </Figure>
      <HoodText>
        Its own doc comment already saw this coming: “If you write a tool that
        throws on a model-supplied argument, that line moves and this field has
        to move with it.” MCP moves that line. If bad arguments get filed as{' '}
        <code>threw</code>, every mistake the model makes is recorded as a
        plumbing failure, and every debugging hour points at the wrong thing.
      </HoodText>
      <Figure caption="why widening it will not fail loudly" from="measured" source="both readers, grepped">
        <Raw>
          {`apps/ai/insurance/src/eval/run.ts:126           tc.cause === 'threw'
apps/ai/pharma/src/eval/run.ts:114              tc.cause === 'threw'
apps/ai/pharma/src/eval/run-supplier-impact.ts  tc.cause === 'threw'
apps/ai/insurance/src/eval/scorecard-selftest.ts  threw.cause === 'threw'`}
        </Raw>
      </Figure>
      <HoodText>
        Every one is an equality test against a single member. Add three more to
        the union and all four keep compiling, keep running, and keep returning
        false for the new cases — so the tool-failure count goes <em>down</em>.
        Nothing turns red. A run with more failures in it looks like a run with
        fewer, which is the most expensive direction a metric can move in.
      </HoodText>
    </HoodSection>
  );
}

function TheRule() {
  return (
    <HoodSection title="the rule this step adopts">
      <HoodText>
        A tool that ran and concluded “no” returns <code>isError: true</code>{' '}
        with a readable explanation. <strong>It does not throw.</strong> Throwing
        turns a domain answer into a protocol failure and the distinction is gone
        for good — there is nothing downstream that can recover it.
      </HoodText>
      <HoodText>
        This repo already works that way in-process: <code>get_policyholder</code>{' '}
        answers an unknown id with a structured “not found” rather than raising.
        The rule is not new. What is new is that the boundary now has a place to
        put the answer, and a temptation to use the error channel instead.
      </HoodText>
    </HoodSection>
  );
}
