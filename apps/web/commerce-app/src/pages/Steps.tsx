/**
 * How it works — fourteen steps, a third of them run.
 *
 * ── THIS IS A PLAN, AND THE PAGE HAS TO KEEP SAYING SO ─────────────────────
 *
 * Calder's equivalent page opened as a proposal and is now a record. This one
 * opens where that one started, and it moves: it was written at two steps
 * finished and was at five within the day, because three other sessions are
 * building underneath it. Every figure therefore carries one of four badges and
 * the
 * default is `proposed — not run`. `kit.tsx` has the full argument; the short
 * version is that the difference between "we ran this and kept the output" and
 * "this is what we intend to write" is the only thing on a page like this that
 * a reader cannot recover for themselves.
 *
 * ── THE CORRECTIONS ARE THE BEST THING HERE, AND EVERY STEP HAS MADE ONE ──
 *
 * Not one finished step has merely passed. Each contradicted something this
 * repo had already written down: the protocol version came back lower than the
 * one requested with no warning; the error code for an unknown tool was not the
 * predicted one, and the consequence drawn from THAT was itself wrong; the
 * protocol turned out to carry LESS failure detail than the function call it
 * replaced, not more; and the step billed as a one-line base-URL change
 * returned a success with every field `undefined`. They carry their own badge
 * (`measured — corrects the plan`) so a reader skimming for what is real finds
 * them first.
 *
 * THE PATTERN UNDER ALL OF THEM is worth more than any one: the measurement was
 * right EVERY time, and the sentence written immediately after the measurement —
 * before anything tested that sentence — was wrong about HALF the time.
 *
 * AND THE DISCRIMINATOR IS WHICH ONES HAD A CHECK. The two conclusions that
 * survived are exactly the two somebody wrote a check against; the two that were
 * disproved had none. That is a rule a person can follow, where "be careful"
 * is not — it says which generalisations to distrust rather than asking for
 * uniform suspicion, and uniform suspicion is what nobody sustains.
 * `docs/commerce/PLAN.md` §6.1 carries the table.
 *
 * ITS LIMIT IS ON THE PAGE TOO, under step 12, because the rule eats itself
 * without one: a conclusion that no check can reach would otherwise become a
 * paragraph nobody is allowed to write. §10 — whether the boundary was worth its
 * cost — is exactly that shape.
 *
 * ── NO COUNT IS TYPED ──────────────────────────────────────────────────────
 *
 * `MCP-STEPS.md` used to say "thirteen" in its opening paragraph and "twelve" in
 * its closing table while having fourteen headed items — step 4 was split into
 * 4a and 4b, and one of the two numbers got edited. Both say fourteen as of
 * ad56fa6. The reason this page still derives every count from `PHASES` is that
 * the fix does not make the next literal safe: it is the same discipline
 * `TOTALS` enforces on the firm's own `/learn` pages, and for the same reason —
 * a typed count goes stale the day the thing it counts changes, and nothing
 * tells you. Three numbers here read off one array, so a fifteenth step is one
 * edit.
 *
 * Source: `docs/commerce/MCP-STEPS.md` and `docs/commerce/PLAN.md`, both
 * written 2026-09-18.
 */
import { useCallback, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { Because, Figure, Raw, Step, Wire } from '../components/steps/kit';
import { PhaseHead, PhaseTabs } from '../components/steps/Tabs';
import type { PhaseTab } from '../components/steps/Tabs';
import { Hood } from '../components/steps/Hood';
import { HandshakeHood } from '../components/steps/HandshakeHood';
import { InspectorHood } from '../components/steps/InspectorHood';
import { FailuresHood } from '../components/steps/FailuresHood';
import { GuardHood } from '../components/steps/GuardHood';
import { CostHood } from '../components/steps/CostHood';
import { AURORA } from '../lib/aurora';
import { VERESK } from '../lib/links';

/**
 * The steps that have actually run.
 *
 * A LIST AND NOT A NUMBER, because the number is the thing most likely to go
 * wrong: this page was written while another session was still building, and it
 * went from two entries to five in one afternoon. Every count of finished work
 * on the page reads this — the heading, two tab statuses, the paragraph under
 * the title — so there is one place to update and it is beside the thing it
 * counts.
 *
 * STEP 0 IS NOT IN IT. It is the idea in plain words, and `MCP-STEPS.md` puts
 * no ☑ against it — it has nothing to run. Counting it would inflate the only
 * number on this page anybody would quote.
 *
 * DECLARED BEFORE `PHASES` ON PURPOSE. `const` is hoisted and not initialised,
 * and `PHASES` is built at module load, so a phase reading this from above
 * would throw on import rather than render wrong.
 */
const DONE = ['1', '2', '3', '4a', '4b'];

/** The steps that need neither the databases nor the API. MCP-STEPS.md's own table. */
const FREE = ['0', '1', '2', '3', '4a', '5', '6', '7', '8'];

/** The first two phases' steps, named here so their statuses can count them. */
const WIRE = ['0', '1', '2', '3'];
const BOUNDARY = ['4a', '4b', '5', '6'];

/**
 * How many of a phase's steps are finished.
 *
 * `DONE` and `WIRE` held the same four strings when this was written, and
 * "4 of 4" off that coincidence would have gone wrong within the day — 4a and
 * 4b finished, so `DONE` now spans two phases and neither phase is complete.
 * This intersects them, so both numbers stayed true without being touched.
 */
const doneIn = (holds: string[]) => holds.filter((step) => DONE.includes(step)).length;

/**
 * THE SIX PHASES, IN DEPENDENCY ORDER, and the steps each one holds.
 *
 * `holds` is the list of step numbers, and it is the source of every count on
 * this page — the chip on the tab, the total in the heading, how many need
 * nobody, and which tab to open when a link points at a step. Adding a step
 * means adding it here and nowhere else.
 */
const PHASES: PhaseTab[] = [
  {
    id: 'wire',
    label: 'The wire',
    holds: WIRE,
    status: `${doneIn(WIRE)} of ${WIRE.length} run`,
    built: true,
    content: <PhaseWire />,
  },
  {
    id: 'boundary',
    label: 'The boundary',
    holds: BOUNDARY,
    status: `${doneIn(BOUNDARY)} of ${BOUNDARY.length} run`,
    built: true,
    content: <PhaseBoundary />,
  },
  {
    id: 'service',
    label: 'A service',
    holds: ['7', '8'],
    status: 'not written',
    built: false,
    content: <PhaseService />,
  },
  {
    id: 'retrieval',
    label: 'Retrieval',
    holds: ['9'],
    status: 'not written',
    built: false,
    content: <PhaseRetrieval />,
  },
  {
    id: 'client',
    label: 'The client',
    holds: ['10', '11'],
    status: 'not written',
    built: false,
    content: <PhaseClient />,
  },
  {
    id: 'cost',
    label: 'The bill',
    holds: ['12'],
    status: 'not written',
    built: false,
    content: <PhaseCost />,
  },
];

/** Every step on the page, in order. Derived from the phases, never typed. */
const STEPS = PHASES.flatMap((phase) => phase.holds);

/** Which phase holds a given step, so a link to one can open the other. */
const PHASE_OF = new Map(PHASES.flatMap((phase) => phase.holds.map((step) => [step, phase.id])));


export function Steps() {
  const [active, setActive] = useState(PHASES[0].id);
  const goToStep = useGoToStep(setActive);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} muted />
      <Nav />
      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <Head />
        <Shape onGo={goToStep} />
        <PhaseTabs tabs={PHASES} active={active} onActivate={setActive} />
        <Onward />
      </main>
      <Footer />
    </div>
  );
}

/**
 * Open the phase a step lives in, then scroll to the step.
 *
 * WHY THE `requestAnimationFrame`. Only the active panel is rendered — a hidden
 * one would re-run every entrance animation on each press, which reads as the
 * page reloading — so the element being scrolled to DOES NOT EXIST at the moment
 * the tab is switched. Waiting a frame lets React commit the new panel first.
 * Without it the scroll silently does nothing, which is exactly the broken-link
 * feeling this whole mechanism exists to remove.
 */
function useGoToStep(setActive: (id: string) => void) {
  return useCallback(
    (step: string) => {
      const phase = PHASE_OF.get(step);
      if (!phase) return;
      setActive(phase);
      requestAnimationFrame(() => {
        document.getElementById(`step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [setActive],
  );
}

function Nav() {
  return (
    <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <Link to="/" className="font-medium tracking-tight">
        Thornbury Goods
      </Link>
      <span className="text-sm text-ui-faint sm:ml-auto">How it works</span>
      {VERESK ? (
        <a href={VERESK} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Veresk
        </a>
      ) : (
        <span className="text-sm text-ui-faint">Veresk</span>
      )}
    </nav>
  );
}

function Head() {
  return (
    <section className="pt-8 pb-12 md:pt-12">
      <p className="lift-in font-mono text-[0.6875rem] tracking-[0.08em] text-thb-1 uppercase">
        {STEPS.length} steps · {PHASES.length} phases · {DONE.length} of them run
      </p>

      <h1 className="lift-in title-spectrum mt-4 max-w-3xl font-mono text-[1.6rem] leading-[1.1] font-semibold tracking-tighter sm:text-[2.25rem]">
        Putting a protocol where a function call used to be
      </h1>

      <p className="lift-in mt-5 max-w-[64ch] leading-relaxed text-ui-dim" style={{ animationDelay: '90ms' }}>
        The other four engagements on this site call a TypeScript function that
        opens a database connection in the same process. That is a good shape and
        it is not the shape most customers have — most have a backend already,
        and the interesting work is putting an agent in front of it without
        becoming a second source of truth, a second authorization system, or a
        second place credentials live. So this one changes exactly one thing and
        holds the rest constant: <strong>the tool surface stops being a function
        call and becomes a protocol.</strong>
      </p>

      <p className="lift-in mt-4 max-w-[64ch] leading-relaxed text-ui-dim" style={{ animationDelay: '150ms' }}>
        Below is the whole build, one step at a time, each with what it is for,
        what it needs before it can start, and the code — real where the file
        exists, and marked as unwritten where it does not.{' '}
        <strong>{DONE.length} steps have run and all {DONE.length} of them
        corrected something this plan had already written down</strong> — the
        protocol version, the error code, and then the assumption the whole
        failure taxonomy was built on. None would have been found by reading the
        SDK more carefully. That is the argument for building it in steps rather
        than designing it in one.
      </p>
    </section>
  );
}

/**
 * The shape of the whole thing, before any of it.
 *
 * TWO COLUMNS, AND THE SPLIT IS THE USEFUL FACT: nine of the fourteen steps
 * depend on nobody. That is what let this strand start while two other sessions
 * were still building the databases and the API, and it is the single most
 * reusable thing on the page — the same instinct as putting a seam where the
 * thing under test stops rather than where the system does.
 */
function Shape({ onGo }: { onGo: (step: string) => void }) {
  return (
    <section className="lift-in mb-10 grid gap-8 md:grid-cols-2">
      <ShapeColumn
        title="needs nobody"
        tone="var(--color-thb-1)"
        rows={FREE}
        onGo={onGo}
        note={`${FREE.length} of the ${STEPS.length}. A ten-line stub stands in for the customer's backend, and everything the boundary teaches — no database credential, a service token in a header, scope taken from the session — is fully learnable against it. (MCP-STEPS.md's own headline says seven, counting 7 and 8 as inheriting 4b's dependency; its table lists them as "nothing new". Moving the transport onto HTTP and putting a token in front of it needs no database and no API, so they are counted free here. The difference is two steps and it is noted rather than resolved.)`}
      />
      <ShapeColumn
        title="waits for somebody"
        tone="var(--color-ui-faint)"
        rows={STEPS.filter((s) => !FREE.includes(s))}
        onGo={onGo}
        note="The NestJS API on :3610, the seeded estate behind it, and the corpus. Three other sessions are building those right now, which is why the order above is not the order anyone would choose."
      />
    </section>
  );
}

function ShapeColumn({
  title,
  tone,
  rows,
  note,
  onGo,
}: {
  title: string;
  tone: string;
  rows: string[];
  note: string;
  onGo: (step: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase" style={{ color: tone }}>
        {title}
      </p>
      {/* BUTTONS, NOT ANCHORS, and that is the bug this replaced. An `href` to a
          step in a closed tab scrolls nowhere, because only the open panel is
          rendered — a link that silently does nothing is worse than no link. */}
      <p className="mt-3 font-mono text-sm text-ui-dim">
        {rows.map((r, i) => (
          <span key={r}>
            {i > 0 && <span className="text-ui-faint"> · </span>}
            <button
              type="button"
              onClick={() => onGo(r)}
              className="transition-colors hover:text-ui-fg hover:underline"
            >
              {r}
            </button>
          </span>
        ))}
      </p>
      <p className="mt-4 max-w-[48ch] text-[0.8125rem] leading-relaxed text-ui-faint">{note}</p>
    </div>
  );
}

/* ── PHASE 1 · THE WIRE ─────────────────────────────────────────────────── */

function PhaseWire() {
  return (
    <>
      <PhaseHead
        title="The wire — a protocol with no business in it"
        status={`${DONE.length} steps run`}
        what={
          <>
            Four steps that touch no database, no API and no model. At the end of
            them a server exists, a client we did not write can use it, and the
            whole thing can be tested in milliseconds with no subprocess and no
            socket. It is also where both of this engagement's corrections came
            from, which is the argument for doing the useless version first.
          </>
        }
      />
      <div className="mt-14 grid gap-16">
        <Step0 />
        <Step1 />
        <Step2 />
        <Step3 />
      </div>
    </>
  );
}

function Step0() {
  return (
    <Step
      n="0"
      title="The idea, in plain words"
      needs="nobody"
      plain="A language model needs facts. The facts live in a backend somebody else owns. MCP replaces the function call that fetches them with a conversation between two programs — JSON-RPC over a pipe or over HTTP, and nothing clever."
    >
      <Figure caption="the whole protocol, in four lines" from="cited" source="docs/commerce/MCP-STEPS.md §0">
        <Raw>
          {`your app  ──"what tools do you have?"──►  a server
          ◄──"three: get_order, get_delivery, search_policy"──

your app  ──"run get_order with {id:'THB-1049'}"──►
          ◄──"here is the order, as JSON"──`}
        </Raw>
      </Figure>

      <Figure caption="three words, and the one people mix up">
        <Raw>
          {`host     the application a human is using      the loop, and the desk
client   one connection object inside the host,   what step 10 writes
         one per server
server   the program that owns the tools          what steps 1–9 build`}
        </Raw>
      </Figure>

      <Because>
        A host and a client are not the same thing. One host can hold five
        clients to five servers, and that is the entire reason the protocol
        exists. Everything in step 10 depends on the distinction.
      </Because>

      <Because>
        <strong>The honest sentence about why any of this is happening:</strong>{' '}
        MCP is not a faster function call. It is a boundary with a schema on it.
        You pay latency and tokens for it, and what you are buying is that the
        thing on the other side can be owned, deployed and secured separately.
        Step 12 measures what that cost. If the answer comes out badly, that is a
        real result and it gets published.
      </Because>
    </Step>
  );
}

function Step1() {
  return (
    <Step
      n="1"
      title="A server that does one useless thing"
      needs="nobody"
      done="2026-09-18"
      plain="A server that starts, and a tool called ping that returns pong. Nothing touches a database. The point is not the tool — it is watching the handshake happen."
    >
      <Figure caption="what running it looks like" from="measured" source="pnpm commerce:mcp-serve">
        <Raw>
          {`$ pnpm commerce:mcp-serve

(nothing)`}
        </Raw>
      </Figure>

      <Because>
        That is correct, and it confuses everyone once. A stdio server reads its
        own stdin and writes its own stdout — it is not a service you visit, it
        is a program something else spawns. Which is why step 1 ships a second
        file whose whole job is to spawn it and print both sides of the
        conversation.
      </Because>

      <Figure
        caption="the exchange that corrected the plan"
        from="corrected"
        source="pnpm commerce:mcp-handshake · 2026-09-18"
      >
        <Wire
          lines={[
            {
              dir: 'out',
              body: '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2026-07-28", ...}}',
              mark: '"protocolVersion":"2026-07-28"',
            },
            {
              dir: 'in',
              body: '{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-11-25", ...}}',
              mark: '"protocolVersion":"2025-11-25"',
            },
          ]}
        />
      </Figure>

      <Because>
        We asked for one protocol version and were given another, with no error
        and no warning. Version negotiation means the answer is allowed to be
        lower than the question — so anything that displays a protocol version
        must show what was <em>agreed</em>, never what was requested.
      </Because>

      <Hood
        blurb="The two files that exist, the full captured trace, and both corrections in detail"
        title="Inside step 1"
        sub="two files · one run that contradicted the plan twice"
      >
        <HandshakeHood />
      </Hood>
    </Step>
  );
}

function Step2() {
  return (
    <Step
      n="2"
      title="Look at the wire"
      needs="nobody"
      done="2026-09-18"
      plain="Point the official MCP debugger at the server and watch initialize, tools/list and tools/call happen with your own eyes, before any of it is hidden behind a loop."
    >
      <Figure caption="one failure, two vocabularies" from="corrected" source="inspector 2.7.0 vs. the raw wire">
        <Raw>
          {`raw wire (our CLI)  { "code": -32602,           "message": "Tool no_such_tool not found" }
the inspector       { "code": "tool_not_found", "message": "Tool '...' not found on server." }`}
        </Raw>
      </Figure>

      <Because>
        A string code where the protocol has a number, a different message, on
        stderr rather than stdout, signalled by exit code 5. So a failure's name
        is a property of the protocol <strong>and of the client you use</strong>.
        Write the discriminator against the client you actually ship, and verify
        it there — not against the wire, and not against whatever a debugging
        tool prints.
      </Because>

      <Because>
        This step reads like a chore and is not optional. Step 6 asks you to
        classify failures, and you cannot classify what you have never watched
        happen. Twenty minutes here saves a day later.
      </Because>

      <Hood
        blurb="What the inspector proved, why two clients disagree, and a measurement that was nearly wrong"
        title="Inside step 2"
        sub="a client we did not write · and a number read through a pipe"
      >
        <InspectorHood />
      </Hood>
    </Step>
  );
}

function Step3() {
  return (
    <Step
      n="3"
      title="A test that needs no ports"
      needs="nobody"
      done="2026-09-18"
      plain="Prove a tool's behaviour in an ordinary test, with no subprocess and no socket — a linked client and server pair living in one process. Ten checks, and one of them reversed an assumption this plan was built on."
    >
      <Figure caption="the shape of it" from="measured" source="InMemoryTransport, from the same package">
        <Raw>
          {`const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await server.connect(serverSide);
await client.connect(clientSide);

expect(await client.callTool({ name: 'ping' })).toEqual({ ... });   milliseconds`}
        </Raw>
      </Figure>

      <Because>
        This matters more than it sounds. Everything planted later — a server
        that lies about its annotations, a tool that returns{' '}
        <code>isError</code>, a connection that dies mid-call — gets planted over
        this transport. A protocol you can only test by starting a server is a
        protocol nobody tests, and <code>createServer()</code> was written
        without choosing a transport precisely so that this step is possible.
      </Because>

      <Figure
        caption="ten checks, and the three lines in the middle are the finding"
        from="corrected"
        source="pnpm commerce:mcp-check · 2026-09-18"
      >
        <Raw>
          {`DOMAIN refusal   isError=true  text="not in scope for this case"
THROWN           isError=true  text="socket is on fire"
BAD ARGS         isError=true  text="Input validation error: … received number"`}
        </Raw>
      </Figure>

      <Because>
        <strong>This is the reverse of what the plan assumed.</strong> Step 6 was
        drafted arguing that MCP gives you <em>more</em> failure resolution than
        an in-process function — five buckets where there were two. It gives{' '}
        <strong>less</strong>. A tool refusing, a tool throwing and a schema
        violation all arrive as the same boolean, and only the last is
        identifiable — by a message <em>prefix</em>. The other two are free text
        whoever wrote the tool happened to pick.
      </Because>

      <Because>
        The general lesson is worth more than the MCP detail:{' '}
        <strong>a boundary that serialises does not preserve what your type
        system was preserving.</strong> In-process, the loop tells a throw from a
        return structurally, by catching one of them. MCP flattens that to a
        boolean before it reaches us. Nothing announced the loss; every call
        still worked.
      </Because>
    </Step>
  );
}

/* ── PHASE 2 · THE BOUNDARY ─────────────────────────────────────────────── */

function PhaseBoundary() {
  return (
    <>
      <PhaseHead
        title="The boundary — the first tool that crosses it"
        status={`${doneIn(BOUNDARY)} of ${BOUNDARY.length} run`}
        what={
          <>
            The phase where the architecture becomes real: a tool that reaches
            the customer's backend over HTTP with a service token and{' '}
            <strong>no database credential anywhere in its process</strong>. Its
            first three steps needed nobody, because a stub stood in for the
            backend — waiting for another session to finish before writing the
            tool that proves the boundary would have had it backwards.
            <br />
            <br />
            The stub was also the phase's best lesson, and not in the way it was
            meant to be. Step 4a wrote it to say “if swapping this for the real
            backend changes the tool, the stub was lying, and it is better to
            find that out here.” Step 4b swapped it and the stub{' '}
            <em>had</em> been lying — and the way that surfaced was a call that
            reported success with every field <code>undefined</code>.
          </>
        }
      />
      <div className="mt-14 grid gap-16">
        <Step4a />
        <Step4b />
        <Step5 />
        <Step6 />
      </div>
    </>
  );
}

function Step4a() {
  return (
    <Step
      n="4a"
      title="The first real tool — against a stub"
      needs="nobody"
      done="2026-09-18"
      plain="get_order behaves exactly as it finally will, but the thing it calls is a stub returning one hand-written order. Seven checks, and the most important one is about what the tool does NOT publish."
    >
      <Figure caption="the entire client for the customer's backend" from="measured">
        <Raw>
          {`fetch(\`\${COMMERCE_API_URL}/orders/\${id}\`, {
  headers: { authorization: \`Bearer \${COMMERCE_API_TOKEN}\` },
})

no pg. no connection string. no ORM.`}
        </Raw>
      </Figure>

      <Because>
        Point <code>COMMERCE_API_URL</code> at a stub and the tool does not know
        the difference — which is the point. The seam goes where the thing under
        test stops, not where the system does.
      </Because>

      <Figure caption="get_order takes no arguments at all" from="measured" source="pnpm commerce:mcp-check">
        <Raw>
          {`ok  get_order publishes NO parameters at all
ok  a case that does not own this order gets out_of_scope, not the order
ok  and the refusal says nothing about whether the record exists
ok  an unset service token refuses the call`}
        </Raw>
      </Figure>

      <Because>
        Not a validated <code>orderId</code>, not an optional one — none. The
        order is fixed by the session before the model runs, because a tool with
        an <code>orderId</code> parameter lets anything that can influence the
        model reach any order the service token can reach — and what can
        influence the model includes text a customer typed into a contact form.
        The check asserts the published <code>inputSchema</code> has zero
        properties, so the property is visible in <code>tools/list</code> rather
        than asserted in a comment.
      </Because>

      <Because>
        <strong>And the third row is the one people leave out.</strong> A refusal
        must say nothing about whether the record exists. If “no such order” and
        “not your order” read differently, the pair of answers tells an attacker
        which order ids are real without ever returning a row. The helpfulness
        is the leak.
      </Because>

      <Because>
        <strong>One of its own controls went red, and the obvious fix was the
        wrong one.</strong> A check asserting <code>tools.length === 1</code>
        failed the moment <code>get_order</code> was registered. It was right to
        fail — but it could only say <em>the number changed</em>, so the tempting
        repair was to type a new number. A check whose only repair is to update
        its expectation teaches you to silence it. It now asserts the{' '}
        <em>set</em> of tool names, which is also what the write-path allowlist
        in step 11 gates on.
      </Because>
    </Step>
  );
}

function Step4b() {
  return (
    <Step
      n="4b"
      title="Point it at the real backend"
      needs="the API"
      done="2026-09-18"
      plain="The step's own claim was that going from stub to live is a base URL and nothing else. It was not, and the way it failed is the lesson."
    >
      <Figure caption="what the first live call returned" from="corrected" source="2026-09-18">
        <Raw>
          {`OK — the order came back across the boundary
  Order undefined, placed undefined, status undefined.
  Total undefinedp across 2 line(s).
isError            false
structuredContent  ok:true`}
        </Raw>
      </Figure>

      <Because>
        <code>ok: true</code>. <code>isError: false</code>. Every scalar{' '}
        <code>undefined</code>. <strong>Nothing failed.</strong> The real payload
        nests under <code>order</code> and names things differently; the stub was
        flat and had been lying, and step 4a's green checks were green about a
        fiction.
      </Because>

      <Because>
        <strong>A silently wrong success is the worst available failure.</strong>{' '}
        A 500 is loud. A refusal is labelled. This is neither, and it is what an
        unvalidated boundary produces by default — because the fetch helper was a{' '}
        <strong>cast</strong>, and a cast tells the compiler what to believe
        rather than checking anything.
      </Because>

      <Figure caption="three changes came out of it" from="measured">
        <Raw>
          {`1  the boundary PARSES     getJson takes a Zod schema, not a type parameter,
                           so there is no overload that skips the check

2  a sixth cause          malformed_response — ours, not the API's vocabulary.
                           A contract violation is neither the API refusing nor
                           the plumbing failing

3  commerce:mcp-round-trip  the same schema must parse the stub AND the live
                           API. It caught a drift on its first run`}
        </Raw>
      </Figure>

      <Because>
        Two field names were guessed twice and both were wrong —{' '}
        <code>customer.id</code>, then <code>customer.userId</code>. The compiler
        was content both times, because a cast cannot disagree and a schema can.
        The habit this replaces: read the shape off the wire with{' '}
        <code>curl</code> before writing the interface. It takes one command, and
        it is the difference between a contract and a wish.
      </Because>

      <Figure caption="and what the MCP server's environment now contains" from="measured">
        <Raw>
          {`COMMERCE_API_URL      http://localhost:3610
COMMERCE_API_TOKEN    the service token

and what it does NOT contain:  any database credential`}
        </Raw>
      </Figure>

      <Because>
        That absence is not a style preference, it is the deliverable. If this
        process is compromised, the damage is bounded by what that token can
        reach — and <em>that</em> is a sentence about the backend's
        authorization, which is a thing with tests. Had the MCP server been a
        module inside the API, the same sentence would be unverifiable, because
        the process it lived in holds five database pools.
      </Because>
    </Step>
  );
}

function Step5() {
  return (
    <Step
      n="5"
      title="Make the result typed"
      needs="nobody"
      plain="Declare an outputSchema, and return structuredContent alongside content. One is for the model to read; the other is a typed object."
    >
      <Figure caption="what declaring it buys" from="proposed">
        <Raw>
          {`content            the human/model-readable part
structuredContent  the typed object

outputSchema declared  →  THE SERVER validates its own output`}
        </Raw>
      </Figure>

      <Because>
        A handler that drifts from its contract then fails at the server, rather
        than confusing the model three turns later. Break the handler's return
        shape on purpose and watch the server reject it — that is the whole
        check.
      </Because>

      <Because>
        <strong>And a precondition that only became visible after step 3:</strong>{' '}
        the catch has to be central, and getting that wrong is cheap to do. Step
        3 measured that a refusal, a throw and a schema violation all arrive as
        the same boolean, so each tool must carry its own cause in{' '}
        <code>structuredContent</code> — and a tool that <em>throws</em> never
        gets to, because the SDK converts the exception and our code never runs.
      </Because>

      <Because>
        The first attempt at a shared <code>register()</code> centralised the{' '}
        <code>structuredContent</code> write and left the catch in each tool. It
        therefore did not do the thing claimed for it: the write is the half you
        can recover from — you see <code>undefined</code> and go looking — and
        the catch is the half you cannot. Both are inside it now, and a negative
        control registers a deliberately unguarded tool that throws to prove the
        cause still arrives. Step 1's panel quotes the function.
      </Because>
    </Step>
  );
}

function Step6() {
  return (
    <Step
      n="6"
      title="Break it on purpose"
      needs="nobody"
      plain="Produce each failure deliberately and write down which bucket it lands in. Six failures, three owners — the model, the domain, the infrastructure — and the protocol has three shapes to describe them all in."
    >
      <Figure
        caption="what the wire actually says, and whose fault each one is"
        from="measured"
        source="src/wire-selftest.ts · pnpm commerce:mcp-check"
      >
        <Raw>
          {`name a tool that does not exist       -32602              the MODEL
a tool that ran and decided "no"      isError: true       the DOMAIN
a tool that throws                    isError: true       INFRASTRUCTURE
arguments the schema rejects          isError: true       the MODEL
an argument never declared            no error at all     nobody — yet
kill the server mid-call              nothing comes back  INFRASTRUCTURE`}
        </Raw>
      </Figure>

      <Because>
        The existing harness knows two of these —{' '}
        <code>cause?: 'unknown_tool' | 'threw'</code> — and its own comment
        warned that the line moves if a tool starts rejecting model-supplied
        arguments. MCP moves that line. If bad arguments get filed as{' '}
        <code>threw</code>, every mistake the model makes is recorded as a
        plumbing failure, and every debugging hour points at the wrong thing.
      </Because>

      <Because>
        <strong>And step 3 reversed the premise this step was drafted on.</strong>{' '}
        The three middle rows do not arrive distinguishable. They are all{' '}
        <code>isError: true</code> with free text, and only the schema violation
        can be recognised — by a message prefix. So the protocol does not carry
        the taxonomy; every Thornbury tool has to carry its own outcome in{' '}
        <code>structuredContent</code> — <code>&#123; ok: false, cause:
        'out_of_scope' &#125;</code> — and the discriminator reads that. It is
        left on the page as five buckets because five is still what has to be
        recorded; what changed is who does the recording.
      </Because>

      <Hood
        blurb="The six, the three failures that share one boolean, and why widening the union will not fail loudly"
        title="Inside step 6"
        sub="the most valuable step here · and it needs nobody"
      >
        <FailuresHood />
      </Hood>
    </Step>
  );
}

/* ── PHASE 3 · A SERVICE ────────────────────────────────────────────────── */

function PhaseService() {
  return (
    <>
      <PhaseHead
        title="A service — a port, and a door with a lock on it"
        status="not written"
        what={
          <>
            The server stops being a subprocess and becomes something on{' '}
            <code>:3620</code> that refuses anyone without a valid token. Both
            steps need nobody — they are about this server and nothing else — and
            they are where the two options that look like configuration turn out
            to be decisions.
          </>
        }
        waits={['Steps 4a–6, because moving a transport under a server with one useless tool proves less than moving it under a server with a real one.']}
      />
      <div className="mt-14 grid gap-16">
        <Step7 />
        <Step8 />
      </div>
    </>
  );
}

function Step7() {
  return (
    <Step
      n="7"
      title="Move it onto HTTP"
      needs="nobody"
      plain="A web-standard handler from the same package, so it drops into any HTTP layer. The tool definitions do not change — which is the property the whole first phase was setting up."
    >
      <Figure caption="two options to set on purpose, not by accident" from="proposed">
        <Raw>
          {`legacy: 'reject'    refuse the older protocol era outright. We have no old
                    clients, and serving two eras means testing two behaviours.

responseMode        leave it 'auto'. 'json' SILENTLY DROPS every mid-call
                    notification — so if progress updates ever vanish, this is
                    the first thing to look at.`}
        </Raw>
      </Figure>

      <Because>
        This is also where step 1's first correction gets settled. The{' '}
        <code>2026-07-28</code> era is real, and it is reached through the HTTP
        handler rather than through <code>initialize</code> — so the version we
        asked for and did not get is a thing this step can actually deliver.
      </Because>
    </Step>
  );
}

function Step8() {
  return (
    <Step
      n="8"
      title="Lock the door"
      needs="nobody"
      plain="The server refuses anyone without a valid token — and, more importantly, refuses everyone when no token is configured at all."
    >
      <Figure caption="the field that matters" from="cited" source="AuthInfo.resource · RFC 8707">
        <Raw>
          {`AuthInfo.resource   "MUST match the MCP server's resource identifier"

without that check, a token minted for another service is accepted here —
and an MCP server is BY DESIGN more privileged than its caller.

that combination has a name: the CONFUSED DEPUTY.`}
        </Raw>
      </Figure>

      <Because>
        And the check that actually catches bugs is the other one: unset the
        token variable entirely and confirm everything is <em>refused</em>, not
        allowed. The obvious implementation of a guard fails open —{' '}
        <code>if (process.env.API_KEY &amp;&amp; header !== …)</code> allows
        everything when the variable is unset — and this repo has a whole package
        named after that bug.
      </Because>
    </Step>
  );
}

/* ── PHASE 4 · RETRIEVAL ────────────────────────────────────────────────── */

function PhaseRetrieval() {
  return (
    <>
      <PhaseHead
        title="Retrieval — the half of the policy that is prose"
        status="not written"
        what={
          <>
            One step, and it is where this domain gets interesting. Thornbury's
            policy lives in two places that disagree on purpose: a published
            document that says thirty days, and a configuration row that says
            fourteen. Two tools read them, and there are two rather than one
            because a single “policy” tool would have to pick a side — and
            picking is the failure.
          </>
        }
        waits={[
          'The corpus written — roughly forty documents under docs/commerce/corpus/ — and ingested.',
          'A vector index, which lives on this side of the boundary rather than behind the customer’s API.',
        ]}
      />
      <div className="mt-14 grid gap-16">
        <Step9 />
      </div>
    </>
  );
}

function Step9() {
  return (
    <Step
      n="9"
      title="The RAG tool"
      needs="the corpus"
      plain="Hybrid search over the prose policy corpus — dense and full-text, fused — using the grounding package this repo already has."
    >
      <Figure caption="the disagreement this step makes visible" from="cited" source="docs/commerce/PLAN.md §2.3">
        <Raw>
          {`thb_policy.return_windows                  the returns policy document
─────────────────────────                  ──────────────────────────
category = 'electronics'                   "You may return any item
window_days = 14                            within 30 days of delivery"
effective_from = 2025-03-01                 rev 2024-11, still published`}
        </Raw>
      </Figure>

      <Because>
        Both are true statements about Thornbury. One is configuration that
        actually governs the returns tool; the other is what the customer was
        shown and can hold the company to. <strong>Neither is the answer.</strong>{' '}
        The answer is “these disagree, here is each with its source, a human
        decides”.
      </Because>

      <Figure caption="two design points that are decisions, not details" from="proposed">
        <Raw>
          {`NO SCORE CUTOFF        search returns its best matches even when all of them
                       are junk. Deciding "this isn't in our policies" is
                       reading comprehension and belongs to the model. A
                       threshold turns "I don't know" into silence.

THE INDEX IS OURS      the five databases are the customer's systems of record.
                       The chunk index is ours, rebuildable any time. Putting it
                       behind the Nest API would mean adding a retrieval
                       endpoint to the customer's backend for our convenience.`}
        </Raw>
      </Figure>
    </Step>
  );
}

/* ── PHASE 5 · THE CLIENT ───────────────────────────────────────────────── */

function PhaseClient() {
  return (
    <>
      <PhaseHead
        title="The client — and the trap in guarding it"
        status="not written"
        what={
          <>
            The two steps where this stops being somebody else's protocol and
            becomes our loop's problem. Step 10 is the one everybody skips and
            the one that teaches the most; step 11 is where a tool's own
            description of itself turns out to be worthless as a guard.
          </>
        }
        waits={[
          'Everything above: a server with real tools, on HTTP, behind a token.',
          'A small adapter in packages/agent/src/mcp/, beside the two that already convert a foreign tool representation into ours — not a new package, because this repo extracts one after a second consumer exists and there is one.',
        ]}
      />
      <div className="mt-14 grid gap-16">
        <Step10 />
        <Step11 />
      </div>
    </>
  );
}

function Step10() {
  return (
    <Step
      n="10"
      title="Write the client"
      needs="everything above"
      plain="Our loop can call these tools. A client, plus a small adapter that turns an MCP tool into the shape the tool registry already understands."
    >
      <Because>
        Until you have written a client, “capability” reads like configuration.
        After, it reads like a contract you are on the hook for — because the
        server can only do what your client said it could.
      </Because>

      <Figure caption="the concrete consequence" from="cited" source="ClientCapabilitiesSchema">
        <Raw>
          {`elicitation.create    the server asking a human "confirm this £340 refund"
sampling.createMessage the server asking the CLIENT's model for a completion

a server may only use what the client DECLARED.
none of this repo's three loop engines is an MCP client at all.`}
        </Raw>
      </Figure>

      <Because>
        So the approval in step 11 is ours to build rather than the protocol's to
        provide. That is written down here rather than discovered later, so that
        nobody reads the guard and assumes MCP is doing it.
      </Because>
    </Step>
  );
}

function Step11() {
  return (
    <Step
      n="11"
      title="The guard — and the trap in it"
      needs="everything above"
      plain="The model can propose a resolution. It can never move money. The obvious way to build that gate is the wrong one, and the SDK's own comment says so."
    >
      <Figure caption="the trap" from="cited" source="ToolAnnotations · the SDK's own doc comment">
        <Raw>
          {`MCP lets a tool describe itself:  annotations: { readOnlyHint: true, ... }
the obvious client:               auto-approve anything marked read-only

"Clients should never make tool use decisions based on ToolAnnotations
 received from untrusted servers."`}
        </Raw>
      </Figure>

      <Because>
        An annotation is a claim made by the thing being guarded. A guard that
        believes it fails open. So the gate is a client-side allowlist of tool
        names, living next to the prompt, and annotations are published as
        documentation and treated as nothing else.
      </Because>

      <Hood
        blurb="The three plants, and why the third — an empty allowlist — is the only one that matters"
        title="Inside step 11"
        sub="the write path · and the confused deputy one layer down"
      >
        <GuardHood />
      </Hood>
    </Step>
  );
}

/* ── PHASE 6 · THE BILL ─────────────────────────────────────────────────── */

function PhaseCost() {
  return (
    <>
      <PhaseHead
        title="The bill — what did the protocol actually cost?"
        status="not written"
        what={
          <>
            The step the whole engagement is for. The same twelve questions,
            twice: once through in-process tools that make the same HTTP calls to
            the same endpoints, once through the MCP client. Only the transport
            to the model differs, which is the only way the difference is
            attributable to MCP rather than to the extra service.
          </>
        }
        waits={['Everything above, and a set of eval cases to ask twelve questions from.']}
      />
      <div className="mt-14 grid gap-16">
        <Step12 />
      </div>
    </>
  );
}

function Step12() {
  return (
    <Step
      n="12"
      title="Find out what it cost"
      needs="everything above"
      plain="Five numbers, and one of them catches a disaster that leaves every answer correct and nothing red."
    >
      <Figure caption="what gets recorded" from="proposed">
        <Raw>
          {`tool latency                 p50 / p95
tokens in the tools block    it renders on every request
turns to a valid answer
the failure histogram        step 6's five buckets
cache_read_input_tokens      ← the silent one`}
        </Raw>
      </Figure>

      <Because>
        If it says MCP cost us latency and tokens and bought a boundary a NestJS
        module would also have bought, <strong>that is a real finding and it gets
        written down.</strong> Given that this engagement deliberately chose the
        separate-deployable form in order to make the boundary visible, it is
        also the likely one.
      </Because>

      <Hood
        blurb="The experiment, the five numbers, and the one-line check almost nobody writes"
        title="Inside step 12"
        sub="the measurement that decides whether any of this was worth doing"
      >
        <CostHood />
      </Hood>
    </Step>
  );
}

/* ── FOOT ───────────────────────────────────────────────────────────────── */

function Onward() {
  return (
    <section className="lift-in mt-16 border-t border-ui-line pt-10">
      <h2 className="font-mono text-[0.6875rem] tracking-[0.08em] text-thb-1 uppercase">
        what this page is not
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        There is no desk here yet, and no answer to look at. The determination
        Iris is owed — what the customer is entitled to, under which policy, with
        which evidence, and where two sources disagree — is specified in{' '}
        <code>docs/commerce/PLAN.md</code> §8 and built once there is something
        behind it to answer from. The four steps that would produce it are in the
        last two phases above, and all four are marked{' '}
        <em>proposed — not run</em>, which is the same thing this sentence says
        with fewer words.
      </p>
      <p className="mt-4">
        <Link to="/" className="font-mono text-sm text-thb-2 transition-colors hover:text-ui-fg">
          ← back to the front
        </Link>
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mx-auto max-w-5xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
      Thornbury Goods is a fictional customer. The protocol is not — every code
      sample marked <em>measured</em> was read off this machine, and every trace
      was captured from a server that ran.
    </footer>
  );
}
