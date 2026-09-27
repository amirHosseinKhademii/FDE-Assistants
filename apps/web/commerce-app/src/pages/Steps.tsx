/**
 * How it works — the build, one step at a time, for somebody new to all of it.
 *
 * ── WHO THIS PAGE IS FOR, SINCE THE REDESIGN OF 2026-09-27 ─────────────────
 *
 * The first version was written for the people building it: dense, precise,
 * and in the plan's own shorthand. The reader it has to serve is somebody who
 * arrived from a link about MCP, agents or forward-deployed engineering and has
 * read none of the plan. So, in order, the page:
 *
 *   1. says what is being built and how far along it is, in two sentences and
 *      one progress bar;
 *   2. explains the three ideas you need first — an agent, MCP, an FDE;
 *   3. draws the one picture that matters: who holds what, and where the line
 *      between our code and the customer's systems is;
 *   4. lists every step, so the shape is visible before any detail;
 *   5. then the steps themselves, each in the same five parts (see `kit.tsx`);
 *   6. and a glossary, which every step's "words to know" links into.
 *
 * ── WHAT DID NOT CHANGE: BUILT AND PLANNED STAY DIFFERENT ──────────────────
 *
 * Plain language has one failure mode on a half-built page: it drifts into the
 * present tense and describes steps nobody has run as if they exist. So every
 * figure still carries where it came from, a planned step is dashed and speaks
 * in the future tense, and every count reads `lib/progress.ts`.
 *
 * ── THE CODE ───────────────────────────────────────────────────────────────
 *
 * Real code is shown as real code, highlighted the way an editor would. The
 * excerpts here carry NO line numbers: `apps/mcp/commerce` is being edited by
 * another session as this is written, and a gutter is a promise that the file
 * says this at that line. The one place that makes that promise —
 * `HandshakeHood.tsx` — is covered by SURFACE.md §2's check.
 *
 * Sources: `docs/commerce/MCP-STEPS.md`, `docs/commerce/PLAN.md`, and
 * `docs/GUIDE.md` §1 and §4 for the primer.
 */
import { useCallback, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Aurora, Code } from '@veresk/surface';
import { Figure, Note, Raw, Step, Table, Wire, stateOf } from '../components/steps/kit';
import { PhaseHead, PhaseTabs } from '../components/steps/Tabs';
import type { PhaseTab } from '../components/steps/Tabs';
import { Hood } from '../components/steps/Hood';
import { HandshakeHood } from '../components/steps/HandshakeHood';
import { InspectorHood } from '../components/steps/InspectorHood';
import { FailuresHood } from '../components/steps/FailuresHood';
import { GuardHood } from '../components/steps/GuardHood';
import { CostHood } from '../components/steps/CostHood';
import { BigPicture } from '../components/BigPicture';
import { AURORA } from '../lib/aurora';
import { VERESK } from '../lib/links';
import { BUILDABLE, DONE, NEXT, doneIn, inWords, isDone } from '../lib/progress';
import { GLOSSARY, GLOSSARY_ORDER, termId } from '../lib/glossary';

/** Every step's name, used by the step list and by the step itself. */
const TITLES: Record<string, string> = {
  '0': 'The idea, in plain words',
  '1': 'A server that does one tiny thing',
  '2': 'Watch the messages with a debugger',
  '3': 'Test it without starting anything',
  '4a': 'The first real tool, against a stand-in',
  '4b': 'Point it at Thornbury’s real API',
  '5': 'Give every result a checked shape',
  '6': 'Break it on purpose',
  '7': 'Put it on the web',
  '8': 'Lock the door',
  '9': 'Search the policy documents',
  '10': 'Write the client',
  '11': 'Stop the AI from moving money',
  '12': 'Find out what it cost',
};

/** A phase's status in words. Step 0 is reading, so it never counts as "to build". */
function phase(holds: string[]) {
  const buildable = holds.filter((s) => s !== '0');
  const done = doneIn(buildable);
  const total = buildable.length;
  const status = done === total ? 'Complete' : done > 0 ? `${done} of ${total} done` : 'Not started';
  return { done, total, status, built: done > 0 };
}

const WIRE = ['0', '1', '2', '3'];
const BOUNDARY = ['4a', '4b', '5', '6'];
const SERVICE = ['7', '8'];
const RETRIEVAL = ['9'];
const CLIENT = ['10', '11'];
const COST = ['12'];

/**
 * THE SIX PHASES, IN DEPENDENCY ORDER. `holds` is the source of every count on
 * the tabs; adding a step means adding it here, to `TITLES`, and to
 * `lib/progress.ts`'s `ALL_STEPS`.
 */
const PHASES: PhaseTab[] = [
  { id: 'wire', label: 'The messages', holds: WIRE, ...phase(WIRE), content: <PhaseWire /> },
  { id: 'boundary', label: 'The first real tool', holds: BOUNDARY, ...phase(BOUNDARY), content: <PhaseBoundary /> },
  { id: 'service', label: 'A web service', holds: SERVICE, ...phase(SERVICE), content: <PhaseService /> },
  { id: 'retrieval', label: 'Policy search', holds: RETRIEVAL, ...phase(RETRIEVAL), content: <PhaseRetrieval /> },
  { id: 'client', label: 'Our side', holds: CLIENT, ...phase(CLIENT), content: <PhaseClient /> },
  { id: 'cost', label: 'The bill', holds: COST, ...phase(COST), content: <PhaseCost /> },
];

/** Which phase holds a given step, so a link to one can open the other. */
const PHASE_OF = new Map(PHASES.flatMap((p) => p.holds.map((step) => [step, p.id])));

export function Steps() {
  const [active, setActive] = useState(PHASES[0].id);
  const goToStep = useGoToStep(setActive);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} muted />
      <Nav />
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-6">
        <Hero onGo={goToStep} />
        <Primer />
        <section className="mt-20" aria-labelledby="picture-title">
          <h2 id="picture-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The big picture: who holds what
          </h2>
          <p className="mt-2 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            A request travels left to right. The important part is the dashed line in
            the middle — and what each box is <em>not</em> allowed to hold.
          </p>
          <BigPicture />
        </section>
        <Roadmap onGo={goToStep} />
        <section className="mt-20" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The steps
          </h2>
          <p className="mt-2 mb-6 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Grouped into six phases. Each step is laid out the same way: what it
            does in plain words, why it matters, the code, and what we learned
            doing it.
          </p>
          <PhaseTabs tabs={PHASES} active={active} onActivate={setActive} />
        </section>
        <Glossary />
        <NotYet />
      </main>
      <Footer />
    </div>
  );
}

/**
 * Open the phase a step lives in, then scroll to the step.
 *
 * WHY THE `requestAnimationFrame`. Only the active panel is rendered, so the
 * step being scrolled to DOES NOT EXIST at the moment the tab is switched.
 * Waiting a frame lets React commit the new panel first. Without it the scroll
 * silently does nothing.
 */
function useGoToStep(setActive: (id: string) => void) {
  return useCallback(
    (step: string) => {
      const p = PHASE_OF.get(step);
      if (!p) return;
      setActive(p);
      requestAnimationFrame(() => {
        document.getElementById(`step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [setActive],
  );
}

function Nav() {
  return (
    <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-thb-1/15 text-thb-1 ring-1 ring-thb-1/30" aria-hidden>
          <BoxGlyph />
        </span>
        Thornbury Goods
      </Link>
      <span
        aria-current="page"
        className="text-[0.9375rem] font-semibold text-ui-fg underline decoration-thb-1 decoration-2 underline-offset-[6px] sm:ml-auto"
      >
        How it works
      </span>
      {VERESK ? (
        <a href={VERESK} className="text-[0.9375rem] text-ui-dim transition-colors hover:text-ui-fg">
          Veresk
        </a>
      ) : (
        <span className="text-[0.9375rem] text-ui-faint">Veresk</span>
      )}
    </nav>
  );
}

function BoxGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}

/* ── THE TOP ────────────────────────────────────────────────────────────── */

function Hero({ onGo }: { onGo: (step: string) => void }) {
  const done = DONE.length;
  const total = BUILDABLE.length;
  const next = NEXT;
  return (
    <section className="pt-8 pb-4 md:pt-14">
      <h1 className="lift-in max-w-[22ch] text-[2.25rem] leading-[1.12] font-bold tracking-tight text-ui-fg sm:text-[3rem]">
        How we’re building Thornbury’s support assistant, step by step
      </h1>

      <div className="lift-in thb-prose mt-6 max-w-[66ch]" style={{ animationDelay: '80ms' }}>
        <p>
          Thornbury Goods is a fictional online shop. When a customer writes in
          — <em>“my lamp arrived smashed, I want my money back”</em> — a support
          specialist called Iris has to work out what they’re owed. We’re building
          an AI assistant that gathers the facts for her and drafts an answer she
          approves.
        </p>
        <p>
          The catch: <strong>the AI never gets direct access to Thornbury’s
          databases.</strong> This page walks through how that’s done, one step at
          a time, with the real code and what each step taught us.
        </p>
      </div>

      <div className="lift-in mt-8 max-w-xl" style={{ animationDelay: '140ms' }}>
        <p className="flex flex-wrap items-baseline justify-between gap-2 text-[0.9375rem]">
          <span className="font-semibold text-ui-fg">
            {done} of {total} building steps done
          </span>
          {next && (
            <button type="button" onClick={() => onGo(next)} className="thb-a text-[0.9375rem]">
              Up next: step {next}, {TITLES[next].toLowerCase()}
            </button>
          )}
        </p>
        <div className="thb-progress mt-2.5" role="img" aria-label={`${done} of ${total} steps done`}>
          {BUILDABLE.map((s) => (
            <span key={s} data-done={isDone(s)} title={`Step ${s}: ${TITLES[s]}`} />
          ))}
        </div>
        <p className="mt-2 text-[0.875rem] text-ui-faint">
          Plus step 0, which is background reading rather than something to build.
        </p>
      </div>
    </section>
  );
}

function Primer() {
  return (
    <section className="mt-16" aria-labelledby="primer-title">
      <h2 id="primer-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
        New to this? Three ideas first
      </h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="thb-card">
          <h3>An AI agent</h3>
          <p>
            A language model on its own can only write text. An agent can also
            <em> ask for things to be done</em>: “look up this order”. It doesn’t
            run anything itself — our code does, then hands back the result. That
            back-and-forth is called <strong>the loop</strong>. The model decides
            what it needs; our code decides what it gets.
          </p>
          {VERESK && (
            <p>
              <a className="thb-a" href={`${VERESK}/learn/loop`}>
                More on the loop
              </a>
            </p>
          )}
        </div>
        <div className="thb-card">
          <h3>MCP, the Model Context Protocol</h3>
          <p>
            An open standard for how an AI app talks to a <em>separate program</em>{' '}
            that owns the tools. The app asks “what tools do you have?”, then “run{' '}
            <code>get_order</code>”. The messages are small bits of JSON. Its value
            isn’t speed — it’s that the program holding the tools can be owned,
            deployed and locked down on its own.
          </p>
          <p>
            <a className="thb-a" href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
              The official MCP site
            </a>
          </p>
        </div>
        <div className="thb-card">
          <h3>A forward-deployed engineer</h3>
          <p>
            An engineer placed with one customer, handed their specific, messy
            problem, who has to build something the customer will trust — fast,
            and with proof that it works. This is one of those engagements: a
            fictional firm, Veresk, working with Thornbury Goods.
          </p>
          {VERESK && (
            <p>
              <a className="thb-a" href={VERESK}>
                The firm and its other projects
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Every step, grouped by phase. Buttons, not links: see `useGoToStep`. */
function Roadmap({ onGo }: { onGo: (step: string) => void }) {
  return (
    <section className="mt-20" aria-labelledby="road-title">
      <h2 id="road-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
        All {inWords(Object.keys(TITLES).length)} steps at a glance
      </h2>
      <p className="mt-2 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ui-dim">
        In the order they have to be built. A tick means done. Select any step
        to jump to it.
      </p>
      <div className="thb-road mt-8">
        {PHASES.map((p) => (
          <div key={p.id} className="thb-road-phase">
            <p className="thb-label" data-tone={p.built ? undefined : 'quiet'}>
              {p.label} <span className="font-normal text-ui-faint">· {p.status.toLowerCase()}</span>
            </p>
            {p.holds.map((s) => {
              const st = stateOf(s);
              return (
                <button key={s} type="button" className="thb-road-step" onClick={() => onGo(s)}>
                  <span className="thb-dot" data-state={st} aria-hidden>
                    {st === 'done' ? '✓' : s}
                  </span>
                  <span>
                    <span className="sr-only">
                      Step {s}, {st === 'done' ? 'done' : st === 'next' ? 'up next' : st === 'idea' ? 'background' : 'planned'}:{' '}
                    </span>
                    {TITLES[s]}
                    {st === 'next' && <span className="ml-2 text-[0.8125rem] font-semibold text-thb-2">up next</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── PHASE 1 · THE MESSAGES ─────────────────────────────────────────────── */

function PhaseWire() {
  return (
    <>
      <PhaseHead
        title="The messages"
        status={phase(WIRE).status}
        what={
          <p>
            Before anything touches Thornbury’s data, we build a server that does
            almost nothing and watch how it talks. No database, no API, no AI
            model. By the end, a server exists, a debugging tool we didn’t write
            can drive it, and the whole thing can be tested in milliseconds.
          </p>
        }
      />
      <div className="mt-10 grid gap-8">
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
      title={TITLES['0']}
      plain="The assistant needs facts — what was ordered, what the returns policy says. Those facts live in Thornbury’s systems, which Thornbury owns. MCP lets our AI app ask a separate program for them, using small JSON messages, instead of reaching into the databases itself."
      why={
        <>
          <p>
            Most real customers already have a backend with its own logins and
            rules. The job is to put an AI in front of it without creating a
            second copy of the data, a second set of permissions, or a second
            place passwords live.
          </p>
          <p>
            MCP isn’t faster than calling a function directly — it’s slower, and
            it costs tokens. What it buys is a <strong>boundary</strong>: the
            program with the tools can be owned, deployed and secured on its own.
            Step 12 measures whether that was worth it, and publishes the answer
            either way.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="The whole protocol, in four messages" from="cited" source="docs/commerce/MCP-STEPS.md, step 0">
            <Raw>
              {`our app  ── "what tools do you have?" ──────────────►  MCP server
         ◄── "three: get_order, get_delivery, search_policy"

our app  ── "run get_order" ──────────────────────────►
         ◄── "here is the order, as JSON"`}
            </Raw>
          </Figure>
          <Figure caption="Three words people mix up" from="cited" source="docs/commerce/MCP-STEPS.md, step 0">
            <Table
              head={['Word', 'What it is', 'In this build']}
              rows={[
                ['host', 'The application a person is using', 'The assistant’s loop, and later Iris’s desk'],
                ['client', 'One connection, inside the host, to one server', 'What step 10 writes'],
                ['server', 'The program that owns the tools', 'What steps 1–9 build'],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <p>
          Can you say the difference between a host and a client? One host can
          hold several clients, one per server — that’s the whole reason the
          protocol exists, and step 10 depends on it.
        </p>
      }
      terms={['agent', 'loop', 'mcp', 'host', 'client', 'server', 'jsonrpc']}
    />
  );
}

function Step1() {
  return (
    <Step
      n="1"
      title={TITLES['1']}
      done="2026-09-18"
      plain="A server with a single tool called ping, which answers pong. No database and no business logic. The tool isn’t the point — watching the first conversation between two programs is."
      why="Every later step builds on this conversation. When something goes wrong at step 10, you want to already know what a healthy exchange looks like."
      code={
        <>
          <Figure caption="Running the server on its own prints nothing" from="measured" source="pnpm commerce:mcp-serve">
            <Code path="terminal" lang="bash" lines={['$ pnpm commerce:mcp-serve', '', '# (nothing — it is waiting to be spoken to)']} />
            <Note>
              That’s correct, and it confuses everyone once. This server talks
              over <strong>stdio</strong>: it isn’t a website you visit, it’s a
              program another program starts and talks to. So step 1 also wrote a
              small script that starts it and prints both sides of the
              conversation.
            </Note>
          </Figure>
          <Figure caption="The first exchange" from="corrected" source="pnpm commerce:mcp-handshake · 18 Sep 2026">
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
        </>
      }
      learned={
        <p>
          We asked for protocol version <code>2026-07-28</code> and the server
          quietly answered <code>2025-11-25</code> — no error, no warning. That’s
          allowed: the two sides settle on a version both support. So anything
          that shows a protocol version must show the one that was{' '}
          <strong>agreed</strong>, never the one that was asked for.
        </p>
      }
      terms={['stdio', 'handshake', 'jsonrpc', 'server']}
      hood={
        <Hood
          blurb="The two files, the full captured conversation, and both surprises in detail"
          title="Inside step 1"
          sub="Two files, and one run that contradicted the plan twice"
        >
          <HandshakeHood />
        </Hood>
      }
    />
  );
}

function Step2() {
  return (
    <Step
      n="2"
      title={TITLES['2']}
      done="2026-09-18"
      plain="Point the official MCP Inspector at the server and click through it: the handshake, the list of tools, a tool call. You see every message with your own eyes before any of it is hidden inside the assistant."
      why="Step 6 sorts failures by whose fault they are. You can’t sort failures you’ve never watched happen. Twenty minutes here saves a day later."
      code={
        <Figure caption="One failure, described two different ways" from="corrected" source="MCP Inspector 2.7.0 vs. the raw messages">
          <Table
            head={['Seen through', 'Error code', 'Message']}
            rows={[
              ['Our own script (the raw messages)', <code key="c">-32602</code>, 'Tool no_such_tool not found'],
              ['The MCP Inspector', <code key="c">"tool_not_found"</code>, 'Tool ‘…’ not found on server.'],
            ]}
          />
        </Figure>
      }
      learned={
        <p>
          The same failure got a different code and a different message depending
          on which program was watching. So a failure’s name belongs to the
          protocol <strong>and to the client you use</strong>. Write the code that
          sorts failures against the client you actually ship, and test it there
          — not against a debugging tool’s display.
        </p>
      }
      terms={['inspector', 'client', 'jsonrpc']}
      hood={
        <Hood
          blurb="What the Inspector proved, why two clients disagree, and a measurement that was nearly wrong"
          title="Inside step 2"
          sub="A client we didn’t write, and a number read through a pipe"
        >
          <InspectorHood />
        </Hood>
      }
    />
  );
}

function Step3() {
  return (
    <Step
      n="3"
      title={TITLES['3']}
      done="2026-09-18"
      plain="Test the server with an ordinary automated test: a client and a server wired together inside one program, with no network and nothing to start. Each check runs in milliseconds."
      why="Everything we plant later — a tool that fails, a connection that dies mid-call — is tested this way. A protocol you can only test by starting a server is a protocol nobody tests."
      code={
        <>
          <Figure caption="The shape of the test" from="excerpt" source="apps/mcp/commerce/src/wire-selftest.ts">
            <Code
              path="apps/mcp/commerce/src/wire-selftest.ts (two excerpts)"
              lines={[
                '/** Connect a client to a server over a linked in-memory pair. No ports. */',
                'async function connected(server: McpServer): Promise<Client> {',
                '  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();',
                "  const client = new Client({ name: 'wire-selftest', version: '0.1.0' });",
                '  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);',
                '  return client;',
                '}',
                '',
                '  const client = await connected(createServer());',
                "  const result = await client.callTool({ name: 'ping', arguments: {} });",
              ]}
              mark={[2]}
            />
            <Note>
              <code>createLinkedPair()</code> gives a client and a server a pipe
              that never leaves the program — no port, no subprocess.
            </Note>
          </Figure>
          <Figure caption="Three different failures, one identical answer" from="corrected" source="pnpm commerce:mcp-check · 18 Sep 2026">
            <Table
              head={['What actually happened', 'What came back']}
              rows={[
                ['The tool decided “no” (not in scope for this case)', <><code key="a">isError: true</code> + some text</>],
                ['The tool crashed', <><code key="a">isError: true</code> + some text</>],
                ['The AI sent an argument of the wrong type', <><code key="a">isError: true</code> + “Input validation error: …”</>],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            We expected MCP to tell us <em>more</em> about failures than a normal
            function call. It tells us <strong>less</strong>. A tool refusing, a
            tool crashing and a bad argument all come back as the same true/false
            flag; only the bad argument can be recognised, and only by how its
            message starts.
          </p>
          <p>
            The general lesson: when data crosses a boundary between programs, it
            loses information your programming language was keeping for you — and
            nothing warns you. So every tool now reports its own outcome in a
            typed field.
          </p>
        </>
      }
      terms={['isError', 'structuredContent', 'schema']}
    />
  );
}

/* ── PHASE 2 · THE FIRST REAL TOOL ──────────────────────────────────────── */

function PhaseBoundary() {
  return (
    <>
      <PhaseHead
        title="The first real tool"
        status={phase(BOUNDARY).status}
        what={
          <p>
            The phase where the design becomes real: a tool that fetches an actual
            order from Thornbury, over the web, using a service token — with{' '}
            <strong>no database password anywhere in its program</strong>. It was
            built first against a stand-in for Thornbury’s API, then pointed at the
            real one, which is where the best lessons came from.
          </p>
        }
      />
      <div className="mt-10 grid gap-8">
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
      title={TITLES['4a']}
      done="2026-09-18"
      plain="get_order is the first tool that fetches real business data. At first it talks to a stub: a ten-line fake of Thornbury’s API that returns one hand-written order. The tool can’t tell the difference, which is the point."
      why="The tool calls Thornbury’s API with a service token and has no database connection at all — that’s the whole design. The stub let us build and test it before Thornbury’s API existed."
      code={
        <>
          <Figure caption="get_order, as the server defines it" from="excerpt" source="apps/mcp/commerce/src/tools/get-order.ts">
            <Code
              path="apps/mcp/commerce/src/tools/get-order.ts (shortened)"
              lines={[
                'export function buildGetOrder(cfg: ApiConfig, session: Session): Tool {',
                '  return {',
                "    name: 'get_order',",
                '    config: {',
                "      title: 'The order for this case',",
                '      description: DESCRIPTION,',
                '      inputSchema: z.object({}),',
                '    },',
                '    run: async () =>',
                '      getJson(cfg, session, `/orders/${encodeURIComponent(session.orderId)}`, OrderResponseSchema),',
                '  };',
                '}',
              ]}
              mark={[6, 9]}
            />
            <Note>
              The two highlighted lines are the design. <code>inputSchema</code>{' '}
              is empty: the tool takes <strong>no arguments</strong>. And the order
              it fetches comes from <code>session.orderId</code> — fixed by the
              support case before the AI ever runs.
            </Note>
          </Figure>
          <Figure caption="What the checks prove" from="measured" source="pnpm commerce:mcp-check">
            <Table
              head={['Check', 'Result']}
              rows={[
                ['get_order publishes no parameters at all', '✓ passes'],
                ['A case that doesn’t own this order gets “out of scope”, not the order', '✓ passes'],
                ['The refusal doesn’t reveal whether the order exists', '✓ passes'],
                ['With no service token set, the call is refused', '✓ passes'],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Why no arguments, not even an order number?</strong> If the AI
            could choose the order, anything that can influence the AI could reach
            any order — and that includes text a customer typed into the contact
            form.
          </p>
          <p>
            <strong>Why must a refusal be vague?</strong> If “no such order” and
            “not your order” read differently, the difference tells an attacker
            which order numbers are real, without ever showing them one.
          </p>
        </>
      }
      terms={['tool', 'stub', 'serviceToken', 'promptInjection']}
    />
  );
}

function Step4b() {
  return (
    <Step
      n="4b"
      title={TITLES['4b']}
      done="2026-09-18"
      plain="Swap the stub for Thornbury’s real API. The plan said this would be a one-line change of address. It wasn’t."
      why="A stand-in only helps if it behaves like the real thing. This step is where you find out whether it did."
      code={
        <>
          <Figure caption="What the first live call returned" from="corrected" source="18 Sep 2026">
            <Raw>
              {`OK — the order came back across the boundary
  Order undefined, placed undefined, status undefined.
  Total undefinedp across 2 line(s).
isError            false`}
            </Raw>
            <Note>
              No error, and every field is <code>undefined</code>.
            </Note>
          </Figure>
          <Figure caption="The fix: check the data, don’t just assume its shape" from="excerpt" source="apps/mcp/commerce/src/api/client.ts, before and after commit 1aebe39">
            <Code
              path="how get_order reads a response"
              lines={[
                '// Before: the code named a type, and nothing checked the data against it.',
                'getJson<Order>(cfg, session, `/orders/${id}`)',
                '',
                '// After: the code passes a schema, and every response is checked on arrival.',
                'getJson(cfg, session, `/orders/${id}`, OrderResponseSchema)',
              ]}
              mark={[4]}
            />
          </Figure>
          <Figure caption="What the MCP server is given, and what it isn’t" from="measured" source="apps/mcp/commerce/src/api/client.ts">
            <Table
              head={['Setting', 'What it is']}
              rows={[
                [<code key="u">COMMERCE_API_URL</code>, 'The address of Thornbury’s API'],
                [<code key="t">COMMERCE_SERVICE_TOKEN</code>, 'The service token that proves who is calling'],
                ['Any database password', 'Not there — on purpose'],
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            The first live call “succeeded” and every field was{' '}
            <code>undefined</code>. The stand-in had returned a flat object; the
            real API wraps the order and names things differently. Our code had{' '}
            <em>told</em> the compiler what the data would look like instead of{' '}
            <em>checking</em> it, so nothing complained.
          </p>
          <p>
            A silent wrong answer is the worst kind of failure: an error is loud,
            this isn’t. Now every response is checked against a schema, and a new
            check runs the same schema against both the stand-in and the real API.
            The habit worth keeping: look at the real response first — one{' '}
            <code>curl</code> command — before writing the code that reads it.
          </p>
        </>
      }
      terms={['schema', 'boundary', 'serviceToken']}
    />
  );
}

function Step5() {
  return (
    <Step
      n="5"
      title={TITLES['5']}
      done="2026-09-27"
      plain={
        <p>
          Each tool now states the exact shape of the answer it returns — its{' '}
          <code>outputSchema</code> — and every answer is checked against that
          shape before it leaves the server. A mismatch arrives labelled as our
          own mistake, with the reason attached.
        </p>
      }
      why={
        <p>
          Step 6 made every failure say who caused it. The first thing step 5
          found is that MCP’s own safety check would have undone that for one
          kind of failure — a bug in our own tool — by replacing the labelled
          answer with an unlabelled sentence.
        </p>
      }
      code={
        <>
          <Figure caption="What the SDK does when a result breaks its declared shape" from="measured" source="src/wire-selftest.ts · pnpm commerce:mcp-check · 27 Sep 2026">
            <Table
              head={['We tried', 'What arrived', 'What it means']}
              rows={[
                ['A wrong-shaped success, checked only by the SDK', <><code key="a">isError: true</code>, no label, “Output validation error: …”</>, 'The SDK’s check throws the cause away'],
                ['A failure result with the wrong shape', 'Passed through untouched', 'Neither side checks failures'],
                ['A server that lies, and a client that listed its tools first', <><code key="a">-32602</code> “does not match the tool’s output schema”</>, <><code key="a">-32602</code> now has two meanings</>],
                ['A server that lies, and a client that never listed', 'Accepted silently', 'No list, no check'],
              ]}
            />
          </Figure>
          <Figure caption="The fix: check first, and label the mismatch as ours" from="excerpt" source="apps/mcp/commerce/src/api/outcome.ts">
            <Code
              path="apps/mcp/commerce/src/api/outcome.ts"
              lines={[
                'export function conforming<T>(tool: string, outcome: Outcome<T>, schema: ZodType): Outcome<T> {',
                '  const parsed = schema.safeParse(outcome);',
                '  if (parsed.success) return outcome;',
                '  const issues = parsed.error.issues',
                '    .slice(0, 4)',
                "    .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)",
                "    .join('; ');",
                "  return fail('invalid_output', `${tool} returned a result that breaks its own declared output schema — ${issues}`);",
                '}',
              ]}
              mark={[7]}
            />
            <Note>
              Every result goes through this before the SDK sees it. A mismatch
              becomes <code>invalid_output</code> — an eighth label, and ours: the
              data already passed the check on the way in, so the fault is in what
              our tool did with it.
            </Note>
          </Figure>
          <Figure caption="What the labelled failure looks like" from="measured" source="pnpm commerce:mcp-check">
            <Code
              path="structuredContent"
              lang="json"
              lines={['{ "ok": false, "cause": "invalid_output", "detail": "bad_output returned a result that breaks its own declared output schema — data.n: Invalid input: expected number, received string" }']}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            The step’s own test — break a result, watch the server reject it —
            passed and <strong>wasn’t enough</strong>. The server did reject it, by
            replacing the whole answer with a sentence and dropping the label. So
            our code checks first, and the SDK’s check becomes a backstop our tools
            never reach.
          </p>
          <p>
            <strong>Declare both halves, success and failure.</strong> With a
            success-only schema, every legitimate refusal — “not your order” —
            broke the schema and was relabelled as our bug. Removing the failure
            half turned three checks red, including that one.
          </p>
          <p>
            And a lesson for step 10: once a tool declares an output shape, error{' '}
            <code>-32602</code> can mean “no such tool” <em>or</em> “a tool broke its
            promise”. A client has to list the tools before calling them, both to
            tell those apart and because its output check silently switches off
            without a list.
          </p>
        </>
      }
      terms={['outputSchema', 'structuredContent', 'schema']}
    />
  );
}

function Step6() {
  return (
    <Step
      n="6"
      title={TITLES['6']}
      done="2026-09-27"
      plain={
        <p>
          We broke the connection to Thornbury’s backend on purpose, eleven
          different ways, and checked that each failure was blamed on the right
          thing. <strong>Nine were not.</strong> A backend that was switched off
          read as a bug in our own code. A backend that went silent made us wait
          forever. A wrong service token read as “the network is down”. A missing
          token read like the AI’s mistake.
        </p>
      }
      why={
        <p>
          When something fails, the label decides where someone goes looking. A
          wrong label doesn’t make anything louder or quieter — it sends a person
          to the wrong place for an afternoon. Worse, it can blame the AI for a
          mistake in our own settings, and then the evaluation scores measure the
          wrong thing.
        </p>
      }
      code={
        <>
          <Figure caption="Breaking the backend: how each failure was labelled, before and after" from="measured" source="src/break-live.ts · pnpm commerce:mcp-break · 27 Sep 2026">
            <Table
              head={['We made this happen', 'Labelled as (before)', 'Now labelled', 'Whose problem']}
              rows={[
                ['A normal request for the case’s own order', 'ok', 'ok', '— the control'],
                ['A request for another case’s order', 'out_of_scope', 'out_of_scope', 'the business rules'],
                ['A case id that names no case', 'invalid_request', 'invalid_request', 'our wiring'],
                ['A wrong service token', 'upstream_unavailable ✗', 'unauthorized', 'our settings'],
                ['No service token set', 'invalid_request ✗', 'unauthorized', 'our settings'],
                ['The backend switched off', 'threw ✗', 'upstream_unavailable', 'infrastructure'],
                ['The backend accepts, then never answers', 'waited forever ✗', 'upstream_unavailable', 'infrastructure'],
                ['The answer is cut off halfway', 'threw ✗', 'upstream_unavailable', 'infrastructure'],
                ['A complete answer that isn’t JSON', 'threw ✗', 'malformed_response', 'the contract'],
                ['A “not found” page instead of the API’s format', 'upstream_unavailable ✗', 'malformed_response', 'the contract'],
                ['The API’s own “bad request”, naming the field', 'upstream_unavailable ✗', 'invalid_request, with the field', 'the contract'],
              ].map((r) => r.map((c, i) => (i === 1 || i === 2) && !c.startsWith('—') ? <code key={i}>{c}</code> : c))}
            />
            <Note>
              First run: <strong>9 of 14 checks failed</strong>. After the fixes:
              16 of 16 pass. (Killing the MCP server itself mid-call was already
              handled correctly.)
            </Note>
          </Figure>
          <Figure caption="The main fix: the whole network transfer is one step, with a time limit" from="excerpt" source="apps/mcp/commerce/src/api/client.ts">
            <Code
              path="apps/mcp/commerce/src/api/client.ts"
              lines={[
                'const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;',
                'let res: Response;',
                'let text: string;',
                'try {',
                '  res = await fetch(`${cfg.baseUrl}${path}`, {',
                '    headers: headers(cfg, session),',
                '    signal: AbortSignal.timeout(timeoutMs),',
                '  });',
                '  text = await res.text();',
                '} catch (e) {',
                "  return fail('upstream_unavailable', transferFailure(e, path, timeoutMs));",
                '}',
              ]}
              mark={[6, 8, 10]}
            />
            <Note>
              Before, a failed download <em>threw</em>, and anything that throws
              was filed as “our code crashed”. Now the request <em>and</em> reading
              the reply are caught together and labelled as the backend being
              unavailable. <code>fetch</code> has no time limit by default; this
              adds one.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            Every wrong label had the blame roughly right and the diagnosis wrong.{' '}
            <code>threw</code> means “our own code crashed” and sends you digging
            through our code, when the real problem was a backend that wasn’t
            running. The earlier tests used a stand-in that always behaved, so they
            could never see any of this.
          </p>
          <p>
            <strong>Why 15 seconds?</strong> Two measured limits. The MCP client
            gives up at 60 seconds, and if it gets there first the call dies with no
            label at all. And a cold first call to the API takes a couple of
            seconds — an early 1-second limit failed on the first run after the
            machine had been idle.
          </p>
          <p>
            Each fix was then removed in turn, to confirm that exactly its own
            check went red and nothing else.
          </p>
        </>
      }
      terms={['isError', 'structuredContent', 'serviceToken']}
      hood={
        <Hood
          blurb="The six ways a call can fail, the three that share one flag, and why labels drift silently"
          title="Inside step 6"
          sub="Whose fault is it — and how would you know?"
        >
          <FailuresHood />
        </Hood>
      }
    />
  );
}

/* ── PHASE 3 · A WEB SERVICE ────────────────────────────────────────────── */

function PhaseService() {
  return (
    <>
      <PhaseHead
        title="A web service"
        status={phase(SERVICE).status}
        what={
          <p>
            The server stops being a program something else has to start, and
            becomes a service on the network that refuses anyone without a valid
            token. Neither step needs Thornbury’s systems — they are about this
            server alone.
          </p>
        }
        waits={['Steps 4a–6, because moving a server with one real tool onto the web proves more than moving one that only says pong.']}
      />
      <div className="mt-10 grid gap-8">
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
      title={TITLES['7']}
      plain="Today the server only talks through stdio, so another program has to start it. This step will put it on the network at port 3620, using a standard web handler from the same SDK. The tools themselves won’t change."
      why="In a real deployment the MCP server runs as its own service that the assistant connects to. This is also where we’ll find out whether the newer protocol version we asked for in step 1 is actually available over HTTP."
      code={
        <Figure caption="Two settings to choose on purpose, not by accident" from="proposed">
          <Table
            head={['Setting', 'Choice', 'Why']}
            rows={[
              [<code key="l">legacy</code>, <code key="v">'reject'</code>, 'Refuse the older protocol version. We have no old clients, and supporting two means testing two.'],
              [<code key="r">responseMode</code>, <code key="v">'auto'</code>, 'Leave it. The other option, json, silently drops progress messages sent during a call.'],
            ]}
          />
        </Figure>
      }
      learned={<p>That the same tools work unchanged over HTTP, and which protocol version the web handler actually agrees to.</p>}
      terms={['stdio', 'handshake', 'server']}
    />
  );
}

function Step8() {
  return (
    <Step
      n="8"
      title={TITLES['8']}
      plain="The server will refuse anyone without a valid token — and, more importantly, refuse everyone if no token has been configured at all."
      why={
        <p>
          The obvious way to write a token check lets everybody in when the
          setting is missing: <code>{'if (expected && header !== expected) refuse()'}</code>{' '}
          skips the check entirely when <code>expected</code> is empty. A missing
          setting should reduce access, never grant it.
          {VERESK && (
            <>
              {' '}
              <a className="thb-a" href={`${VERESK}/learn/credentials`}>
                More on failing closed
              </a>
            </>
          )}
        </p>
      }
      code={
        <Figure caption="The two checks most guards forget" from="cited" source="MCP AuthInfo.resource · RFC 8707">
          <Table
            head={['Situation', 'Must happen']}
            rows={[
              ['No token configured on the server at all', 'Every request refused — not every request allowed'],
              ['A valid token, but issued for a different service', 'Refused: the token has to name this server'],
            ]}
          />
        </Figure>
      }
      learned={
        <p>
          Unset the token setting and confirm every request is refused. Then show
          a token made for another service and confirm it’s refused too —
          otherwise the MCP server, which has more access than whoever calls it,
          can be tricked into using that access for them.
        </p>
      }
      terms={['serviceToken', 'confusedDeputy']}
    />
  );
}

/* ── PHASE 4 · POLICY SEARCH ────────────────────────────────────────────── */

function PhaseRetrieval() {
  return (
    <>
      <PhaseHead
        title="Policy search"
        status={phase(RETRIEVAL).status}
        what={
          <p>
            One step, and it’s where this business gets interesting. Thornbury’s
            returns policy lives in two places that disagree on purpose. The
            assistant has to show both, with their sources, rather than quietly
            picking one.
          </p>
        }
        waits={[
          'The twelve policy documents are written; they still need loading into a search index.',
          'That index lives on our side of the line — it is ours and can be rebuilt any time — rather than behind Thornbury’s API.',
        ]}
      />
      <div className="mt-10 grid gap-8">
        <Step9 />
      </div>
    </>
  );
}

function Step9() {
  return (
    <Step
      n="9"
      title={TITLES['9']}
      plain="A second tool, search_policy, will search Thornbury’s twelve written policy documents and return the passages that best match the question, using the search code this repo already has."
      why="The published returns policy says 30 days for everything. A setting in the returns system says 14 days for electronics. Both are true statements about Thornbury, and neither is “the answer” — the answer is “these disagree, here is each with its source, a person decides”."
      code={
        <>
          <Figure caption="The disagreement this step makes visible" from="cited" source="docs/commerce/PLAN.md §2.3">
            <Table
              head={['Where', 'What it says']}
              rows={[
                ['A setting in the returns system', 'Electronics: 14 days, from 1 March 2025'],
                ['The published returns policy (still live)', '“You may return any item within 30 days of delivery”'],
              ]}
            />
          </Figure>
          <Figure caption="Two decisions that look like details" from="proposed">
            <Table
              head={['Decision', 'Why']}
              rows={[
                ['No relevance cut-off', 'Search always returns its best matches, even if they’re poor. Deciding “our policies don’t cover this” is the AI’s job, reading the passages. A threshold would turn “I don’t know” into silence.'],
                ['The index is ours', 'Thornbury’s databases are its records. The search index is ours and rebuildable, so it lives on our side of the line.'],
              ]}
            />
          </Figure>
        </>
      }
      learned={<p>How often the right passage appears in the top results, measured against questions whose answers we already know — before the twelve documents are allowed to grow.</p>}
      terms={['rag', 'embedding']}
    />
  );
}

/* ── PHASE 5 · OUR SIDE ─────────────────────────────────────────────────── */

function PhaseClient() {
  return (
    <>
      <PhaseHead
        title="Our side: the client and its guard"
        status={phase(CLIENT).status}
        what={
          <p>
            Where MCP stops being somebody else’s protocol and becomes our
            assistant’s job. Step 10 connects the assistant to the tools; step 11
            makes sure it can never move money on its own.
          </p>
        }
        waits={[
          'Everything above: a server with real tools, on the network, behind a token.',
          'A small adapter beside the two the assistant already has for other tool formats.',
        ]}
      />
      <div className="mt-10 grid gap-8">
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
      title={TITLES['10']}
      plain="The assistant’s loop will learn to use these tools: an MCP client, plus a small adapter that turns an MCP tool into the format the assistant’s tool list already understands."
      why="Until you’ve written a client, the list of features it declares looks like configuration. It’s actually a promise: a server may only use what the client said it supports. None of this repo’s three loop engines is an MCP client yet — so the approval step Iris needs is ours to build, not something MCP gives us for free."
      code={
        <Figure caption="Two things a server can ask of a client, if the client allows it" from="cited" source="ClientCapabilitiesSchema, in the MCP SDK">
          <Table
            head={['Feature', 'What it lets the server do']}
            rows={[
              [<code key="e">elicitation</code>, 'Ask a person a question, e.g. “confirm this £340 refund?”'],
              [<code key="s">sampling</code>, 'Ask the client’s AI model to write something'],
            ]}
          />
        </Figure>
      }
      learned={<p>That the assistant can find and call get_order through the client exactly as it calls its built-in tools.</p>}
      terms={['client', 'host', 'loop']}
    />
  );
}

function Step11() {
  return (
    <Step
      n="11"
      title={TITLES['11']}
      plain="The AI will be able to propose a resolution — a refund, a replacement — but never carry it out. A person approves. This step builds that gate, and the obvious way to build it is wrong."
      why="MCP lets a tool describe itself — for example “I only read, I never change anything”. The tempting client auto-approves anything that says so. But that description is written by the very server being guarded, and the MCP SDK’s own documentation says clients must never decide based on it. So the gate is a fixed list of tool names, kept on our side."
      code={
        <Figure caption="The trap, in the SDK’s own words" from="cited" source="ToolAnnotations · the MCP SDK’s doc comment">
          <Raw>
            {`A tool can describe itself:   annotations: { readOnlyHint: true }
The tempting client:          auto-approve anything marked read-only

The SDK:  "Clients should never make tool use decisions based on
           ToolAnnotations received from untrusted servers."`}
          </Raw>
        </Figure>
      }
      learned={
        <p>
          Three planted mistakes. A server that marks its refund tool “read-only”:
          still refused. A server that renames the refund tool after approval:
          still refused. And an <strong>empty</strong> list of allowed tools: it
          must refuse every write, not allow every write.
        </p>
      }
      terms={['allowlist', 'promptInjection', 'confusedDeputy']}
      hood={
        <Hood
          blurb="The three planted mistakes, and why an empty list is the one that matters"
          title="Inside step 11"
          sub="The write path, and the same trap one layer down"
        >
          <GuardHood />
        </Hood>
      }
    />
  );
}

/* ── PHASE 6 · THE BILL ─────────────────────────────────────────────────── */

function PhaseCost() {
  return (
    <>
      <PhaseHead
        title="The bill: was it worth it?"
        status={phase(COST).status}
        what={
          <p>
            The step the whole project exists for. The same questions, asked two
            ways, with only the route to the tools changed — so any difference is
            MCP’s.
          </p>
        }
        waits={['Everything above, and a set of test questions whose right answers are known.']}
      />
      <div className="mt-10 grid gap-8">
        <Step12 />
      </div>
    </>
  );
}

function Step12() {
  return (
    <Step
      n="12"
      title={TITLES['12']}
      plain="Ask the same twelve questions twice: once with the tools called directly inside the assistant, once through MCP. Both make the same calls to the same API, so the only difference is MCP."
      why="MCP costs time and tokens. If the result says it bought nothing a simpler design wouldn’t have, that’s a real finding, and it gets published."
      code={
        <Figure caption="What gets recorded" from="proposed">
          <Table
            head={['Measure', 'What it tells you']}
            rows={[
              ['Tool response time (typical and slowest)', 'What the extra hop costs per call'],
              ['Tokens spent listing the tools', 'Sent with every single request'],
              ['Rounds of the loop per answer', 'Whether MCP makes the AI work harder'],
              ['Failures, by step 6’s labels', 'Whose problem each failure was'],
              [<><code key="c">cache_read_input_tokens</code></>, 'The silent one — see below'],
            ]}
          />
        </Figure>
      }
      learned={
        <p>
          Whether the boundary was worth its cost. And one check almost nobody
          writes: ask the server for its tool list twenty times and confirm it’s
          identical every time. If the order shuffles, the AI provider’s cache
          misses on every request — the bill goes up, every answer is still
          right, and nothing turns red.
          {VERESK && (
            <>
              {' '}
              <a className="thb-a" href={`${VERESK}/learn/caching`}>
                More on caching
              </a>
            </>
          )}
        </p>
      }
      terms={['loop', 'tool']}
      hood={
        <Hood
          blurb="The experiment, the five numbers, and the one-line check almost nobody writes"
          title="Inside step 12"
          sub="The measurement that decides whether any of this was worth doing"
        >
          <CostHood />
        </Hood>
      }
    />
  );
}

/* ── THE FOOT ───────────────────────────────────────────────────────────── */

function Glossary() {
  return (
    <section className="mt-20" aria-labelledby="gloss-title">
      <h2 id="gloss-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
        Words used on this page
      </h2>
      <p className="mt-2 mb-6 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ui-dim">
        What each term means in general, and what it means in this build.
      </p>
      <dl className="thb-gloss">
        {GLOSSARY_ORDER.map((key) => {
          const t = GLOSSARY[key];
          return (
            <div key={key} id={termId(key)}>
              <dt>{t.word}</dt>
              <dd>{t.is}</dd>
              {'here' in t && t.here && <dd>Here: {t.here}</dd>}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function NotYet() {
  const planned = BUILDABLE.filter((s) => !isDone(s));
  return (
    <section className="mt-20 rounded-2xl border border-dashed border-ui-line-lit p-6 sm:p-8" aria-labelledby="notyet-title">
      <h2 id="notyet-title" className="text-[1.375rem] font-bold text-ui-fg">
        What isn’t built yet
      </h2>
      <div className="thb-prose mt-3">
        <p>
          There is no screen for Iris yet. The desk — where she would see what a
          customer is owed, under which policy, with which evidence, and where two
          sources disagree — is specified in <code>docs/commerce/PLAN.md</code> §8.
          It needs policy search (step 9) and the client and its guard (steps 10
          and 11) first, and none of those has run. In all, {inWords(planned.length)}{' '}
          steps are still ahead: {planned.join(', ')}.
        </p>
        <p className="mt-4">
          <Link to="/" className="thb-a">
            Back to the Thornbury overview
          </Link>
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mx-auto max-w-6xl border-t border-ui-line px-5 py-10 text-[0.9375rem] text-ui-faint sm:px-6">
      Thornbury Goods and Iris are fictional. The protocol, the SDK and every
      figure marked “Real output” are real — read off a server that ran.
    </footer>
  );
}
