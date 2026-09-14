/**
 * Where the data goes — the page you hand an auditor.
 *
 * THE ONE SENTENCE THIS PAGE REFUSES TO WRITE is "your data never reaches the
 * model". It does. That is how the question gets answered, and a customer's
 * security reviewer will establish it in their first question — at which point
 * every other claim on the page is worthless. Trust is not won by the strongest
 * sentence; it is won by the most CHECKABLE one.
 *
 * So the spine of the page is a boundary, not a promise: exactly what crosses
 * to the model, exactly what does not, where it stops, and the command that
 * proves each half. Everything here is derived from the code or from a check
 * that can be run in front of the customer.
 *
 * EVERY CLAIM CARRIES ITS COMMAND. That is this repo's whole ethos applied to a
 * marketing surface, and it is the reason this page is worth having: a claim
 * with a command beside it is evidence, and a claim without one is a slide.
 *
 * THE PAGE LISTS ITS OWN GAPS, and that is not modesty. A "your data is safe"
 * page with no open items is a page nobody believes and, worse, a page that
 * stops being true the week after it is written. The three gaps here are the
 * real ones, straight out of `docs/pharma/NEXT.md`.
 *
 * COLOUR: TWO TONES, NOT THE SIX HUES. `DESIGN.md` §2 fixes hop-1..6 as the six
 * systems of record, in the order a lot travels them. Reusing them for a
 * pipeline would make one colour mean two things on sibling pages. Here accent
 * means "stays on your infrastructure" and info means "crosses to the model" —
 * the boundary is the whole subject, so the palette is the boundary.
 */
import { Link } from '@tanstack/react-router';
import { Mono, BoxIcon, BlockIcon, GapIcon, EyeIcon, StepsIcon } from '@fde/uikit';
import { Aurora, Journey, type Turn } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { useState } from 'react';
import { Lanes } from '../components/flow/Lanes';

import { RELEASE_TURNS } from './release-turns';
import { SUPPLIER_TURNS } from './supplier-turns';

/** What leaves this infrastructure on a single question, and nothing else. */
const CROSSES = [
  { what: 'The question', detail: 'As typed. It names a batch and a market.' },
  {
    what: 'Retrieved passages',
    detail: 'The clauses hybrid search returned from your procedure documents — typically five.',
  },
  {
    what: 'Tool results',
    detail:
      'The findings the assessment produced: test results, signatures, training dates, shipment conditions.',
  },
  { what: 'The answer', detail: 'Back over the same connection.' },
];

const STAYS = [
  {
    what: 'The six systems of record',
    detail:
      'ERP, MES, QMS, HCM, REG and TMS are queried in your own network. The model never receives a connection string, a schema or a table.',
  },
  {
    what: 'Every row not in a finding',
    detail:
      'An assessment runs tens of queries and sends only what it concluded. The release walk runs 29 and sends one finding with three references; the supplier walk reads 23 lots and sends the ranked list. Rows read and discarded never leave.',
  },
  {
    what: 'The document corpus',
    detail:
      'Procedures live in your database. Only the passages that matched a question are sent, never the library.',
  },
  {
    what: 'Credentials',
    detail: 'Database URLs and API keys are read server-side. Nothing reaches the browser or the model.',
  },
];

/** Each claim, and the command that proves it. No claim ships without one. */
/**
 * WHAT IS CLAIMED, AND HOW EACH ONE IS KNOWN.
 *
 * `strength` is the field that earns this list its place. A security reviewer's
 * real question is never "is it true?" — it is "how do you know?", and
 * *we captured the request and asserted on it* and *the vendor's documentation
 * says so* are different answers. A page that prints both in the same typeface
 * is inviting somebody to quote a contract term back to their auditor as though
 * an engineer had measured it.
 *
 * See `docs/steering/DATA-RESIDENCY.md`, which is written for exactly that
 * conversation on the other engagement and is where this column came from.
 */
const PROOFS = [
  {
    strength: 'verified here',
    claim: 'The provider is told not to retain anything',
    detail:
      'store: false on every request. Left unset, the provider default is to retain — so this is asserted on the captured wire request, not trusted from a comment.',
    cmd: 'pnpm pharma:compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'No conversation is held on their servers',
    detail:
      'No server-side conversation state. Each request carries its own context and nothing persists between them at the provider.',
    cmd: 'pnpm pharma:compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'Transcripts are not shipped to a third party',
    detail:
      "The Agents SDK's tracing exporter defaults ON and posts to api.openai.com. It is pinned off, and the check runs with a key present so it proves tracing stays off even when there is something to export with.",
    cmd: 'pnpm pharma:compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'Exactly one host is contacted',
    detail: 'One endpoint, in one region. Nothing else is reached during a request.',
    cmd: 'pnpm pharma:compliance-check',
  },
  {
    strength: 'verified here',
    claim: 'The same holds on the second engine',
    detail:
      'A property proved on one library says nothing about another: they build different requests. Both are checked.',
    cmd: 'pnpm pharma:compliance-mastra',
  },
  {
    strength: 'verified here',
    claim: 'Nothing on the answer path can write to your systems',
    detail:
      'Every SQL string reachable from the tools, the agent, the CLI and the evals is scanned and must be a read. The guarantee is source-level and says so in its own output: it proves no write is written, not that the database would refuse one.',
    cmd: 'pnpm pharma:sql-check',
  },
  {
    strength: 'verified here',
    claim: 'The model resource is in the EU',
    detail:
      'Read from Azure rather than from a diagram: the Foundry account reports swedencentral. The database is Frankfurt. The whole path stays in the EU, and this is the one claim on the list you can check without our code at all.',
    cmd: 'az cognitiveservices account list -o table',
  },
];

/**
 * THE THINGS THIS PAGE WILL NOT CLAIM.
 *
 * Two are vendor statements and one is a default that is not in our favour. All
 * three would be easy to leave off — nobody asks a brochure what it is hiding —
 * and all three are the first questions a real security review reaches. Saying
 * them before being asked is worth more than being caught.
 */
const LIMITS = [
  {
    kind: 'must be arranged' as const,
    title: 'Abuse-monitoring retention is ON by default',
    body: 'Azure OpenAI retains prompts and completions for up to 30 days for abuse monitoring, readable by authorised Microsoft reviewers on a flagged case. store: false does not turn it off — different mechanism. Modified Abuse Monitoring has not been applied for here. On a corpus that names unreleased batches that application belongs before the first real run, not after.',
  },
  {
    kind: 'must be arranged' as const,
    title: 'The endpoint is reachable from the internet',
    body: 'The resource has public network access enabled. An Entra token is required, so it is not open — but network isolation is a separate control, and a regulated customer usually wants it: Private Endpoint, public access off. That is a configuration change rather than a code change, and it has not been made here.',
  },
  {
    kind: 'vendor statement' as const,
    title: '“They do not train on your data” is a contract, not a measurement',
    body: 'We can show what our code sends — that is every other claim on this page. We cannot show what the provider then does with it. That one belongs to Microsoft’s terms and your agreement, and it should be quoted from a current source with a date on it, not repeated from memory by an engineer. Repeated from memory is how a review gets an answer that is right today and wrong at renewal.',
  },
];

export function DataFlow() {
  return (
    <div className="relative min-h-screen">
      <Aurora tones={AURORA} muted />

      <header className="sticky top-0 z-20 border-b border-ui-line bg-ui-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
          <Link
            to="/"
            aria-label="Back to the front page"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30 transition-all hover:scale-105"
          >
            <BoxIcon />
          </Link>
          <h1 className="text-[1.0625rem] font-semibold tracking-tight">Where your data goes</h1>
          <Link
            to="/desk"
            className="rounded-lg border border-ui-line bg-ui-raised/60 px-4 py-2 text-sm text-ui-dim transition-colors hover:border-ui-accent/50 hover:text-ui-fg sm:ml-auto"
          >
            Open the release desk
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-28 sm:px-6">
        <section className="lift-in pt-10 pb-10 md:pt-12">
          <h2 className="max-w-[22ch] font-mono text-[1.75rem] leading-[1.12] font-semibold tracking-tighter sm:text-5xl">
            One boundary, and what crosses it.
          </h2>
          <p className="mt-6 max-w-[62ch] leading-relaxed text-ui-dim">
            Answering a question means sending some of your data to a language model. This page says
            exactly which parts, exactly where they stop, and gives you the command that proves each
            claim — so you can check it rather than take it.
          </p>
          <p className="mt-4 max-w-[62ch] leading-relaxed text-ui-dim">
            What it will not tell you is that nothing reaches the model. That would not be true, and
            an unfalsifiable promise is worth less than a narrow one you can test.
          </p>
        </section>

        <section className="lift-in pb-12" style={{ animationDelay: '80ms' }}>
          <Lanes />
        </section>

        <Walkthrough />

        <ManyAgents />

        <Boundary />

        <Indexing />
        <Proofs />
        <Limits />
        <Retention />

        <footer className="border-t border-ui-line py-10 text-sm leading-relaxed text-ui-faint">
          Every claim here is asserted by a check in this repository, and every check plants a
          violation and proves it catches it — a test never seen to fail is one you cannot read a
          pass from.
        </footer>
      </main>
    </div>
  );
}

/**
 * Each question gets its own walk, and they live behind a tab.
 *
 * WHY A TAB AND NOT A SECOND PAGE. Everything around this section — the trust
 * boundary, the compliance checks, what is retained, the open items — is true
 * of the deployment rather than of any one question. Splitting by question
 * would have duplicated all of it, and duplicated pages drift: the second one
 * stops being updated and quietly starts lying. What actually differs per
 * question is the WALK, so that is the only thing that changes.
 *
 * BOTH TABS ARE BUILT NOW. The supplier one waited for a recorded model run to
 * take its payloads from, because the alternative — writing what the tools
 * probably return — would have made both walks guesses. `supplier-turns.ts`
 * records exactly which of its numbers came from the recorded runs, which came
 * from the deterministic tool, and the one thing neither kept, which is
 * therefore left blank rather than filled in plausibly.
 *
 * THE FAN-OUT AND THE DEBATE ARE BELOW THE WALK, NOT INSIDE IT, and that
 * placement is the honest one: the desk runs the single loop drawn above.
 * `ManyAgents` documents two other routes to the same answer that exist and are
 * measurable from the CLI, and says plainly that asking a question on the
 * supplier desk does not start twenty-three sub-agents.
 */
interface Walk {
  id: string;
  tab: string;
  lede: string;
  turns: Turn[];
}

const WALKS: Walk[] = [
  {
    id: 'release',
    // Named for the SURFACE, not for the question it answers. "Can this batch
    // ship?" described the walk accurately but matched nothing a reader had
    // already seen — the desk is the page they came from, and a tab that names
    // it tells them which part of the product they are reading about.
    tab: 'Release desk',
    lede:
      'A real run against LOT-IBU200-2609-B, in the order it happened, with what actually moved at each step. Tool and argument names are the ones in the source; the timings are from the recorded run.',
    turns: RELEASE_TURNS,
  },
  {
    id: 'supplier',
    tab: 'Supplier impact',
    lede:
      'The second question: one supplier, many lots, and how far each one travelled. A recorded run against Silverbrook (SUP-04) — 23 product lots and 3,768,955 units through 19 material deliveries, five of which reached a hospital or a pharmacy chain. The tool result is exact and reproducible offline; where the recording did not keep something, the hop says so rather than filling it in.',
    turns: SUPPLIER_TURNS,
  },
];

/**
 * Three ways to answer the same question, and what each does to the wire.
 *
 * WHY THIS IS ON A DATA-FLOW PAGE. "Multi-agent" normally appears in product
 * copy as a capability. Here it is a fact about the REQUESTS: splitting the work
 * changes how much of the customer's data sits in any single call to the model,
 * how many calls there are, and — the finding nobody expects — whether prompt
 * caching works at all. Those are this page's subject.
 *
 * EVERY NUMBER BELOW WAS MEASURED, and the measurements are written down in
 * `docs/pharma/NEXT.md` §N6 and `docs/PROGRESS.md` §17. The head-to-head ran
 * once, over all 23 lots of SUP-04. An earlier draft of this section said no
 * recorded run existed to quote from; that was simply wrong, and quoting the
 * real figures is strictly better than declining to.
 *
 * THE HONEST FRAMING, WHICH IS LOAD-BEARING. The desk runs the single loop
 * drawn above. `api.supplier.tsx` says so in its own header and gives the
 * reason. A page implying that a reviewer's click starts twenty-four model
 * calls would describe a system nobody is running.
 *
 * THE FAILURES ARE HERE TOO, and on this page they are the most useful part.
 * The sharpest is §17.2: a sub-agent asked to cite a source it cannot reach
 * INVENTED a regulatory deadline. That is a statement about what an agent is
 * handed, which is exactly what a data-flow page is for — and an invented
 * deadline is worse than an absent one, because it gets acted on.
 */
const HEAD_TO_HEAD: Array<{ row: string; one: string; fan: string; note?: string }> = [
  { row: 'Calls to the model', one: '3', fan: '24', note: '23 sub-agents and one assembler' },
  { row: 'Output tokens', one: '10,354', fan: '17,819', note: '72% more, for the same 23 rows' },
  { row: 'Time', one: '82s', fan: '50s', note: 'the fan-out is the faster one' },
  { row: 'Cost', one: '~$0.008', fan: '$0.0398', note: 'five times dearer' },
  { row: 'Input billed as cached', one: '87%', fan: '55%', note: 'see the caching note below' },
];

function ManyAgents() {
  return (
    <section className="lift-in border-t border-ui-line pt-12 pb-16" style={{ animationDelay: '200ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        The same question, split three ways.
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        A supplier work list can be produced by one agent reading all 23 lots, by 23 agents each
        reading one, or — for the lots where the procedure genuinely does not say — by two arguing
        and a third writing up the disagreement. All three are built. They answer the same question
        against the same contract, so they can be compared rather than asserted.
      </p>

      {/* SAID ONCE, PLAINLY, BEFORE ANY DETAIL. Nobody should leave thinking
          their question starts twenty-four model calls. */}
      <p className="mt-5 max-w-[64ch] rounded-xl border border-ui-accent/30 bg-ui-accent/5 px-5 py-4 leading-relaxed text-ui-dim">
        <span className="text-ui-fg">The desk runs the first one.</span> The walk above is what
        happens when somebody asks a question on this site. The other two run from the command line,
        against the same cases — a question typed into the supplier desk never starts twenty-four
        model calls.
      </p>

      <h3 className="mt-10 font-medium text-ui-fg">Measured once, over all 23 lots of SUP-04</h3>
      <div className="mt-4 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[38rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-ui-line">
              <th className="w-[13rem] py-3 pr-4 text-sm font-normal text-ui-faint">&nbsp;</th>
              <th className="py-3 pr-4 font-mono text-sm font-medium text-flow-internal">
                One loop
                <span className="ml-2 font-sans text-xs font-normal text-ui-faint">the desk</span>
              </th>
              <th className="py-3 pr-4 font-mono text-sm font-medium text-flow-model">
                Fan-out
                <span className="ml-2 font-sans text-xs font-normal text-ui-faint">CLI</span>
              </th>
              <th className="py-3 text-sm font-normal text-ui-faint">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {HEAD_TO_HEAD.map((r) => (
              <tr key={r.row} className="border-b border-ui-line/60 align-top">
                <th className="py-3 pr-4 text-sm font-normal text-ui-faint">{r.row}</th>
                <td className="py-3 pr-4 font-mono text-sm text-ui-fg">{r.one}</td>
                <td className="py-3 pr-4 font-mono text-sm text-ui-fg">{r.fan}</td>
                <td className="py-3 text-sm text-ui-dim">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
        <span className="text-ui-fg">Faster and five times dearer</span> — and the cost is not
        orchestration overhead, it is verbosity. Twenty-three agents each writing one row are each
        more thorough than one agent writing its twenty-third.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ui-line bg-ui-surface px-5 py-4">
          <h4 className="font-medium text-ui-fg">What splitting buys, on the wire</h4>
          <p className="mt-2 text-sm leading-relaxed text-ui-dim">
            A sub-agent is handed one lot&rsquo;s evidence and asked for one row. It has no tool
            that reaches another lot, so the most any single request can expose is a single lot —
            a narrower crossing than the single loop can offer. The rows come back markedly more
            worked: every one names its consignee, shipment id and unit count.
          </p>
        </div>
        <div className="rounded-xl border border-ui-warn/30 bg-ui-warn/5 px-5 py-4">
          <h4 className="font-medium text-ui-warn">And what it costs</h4>
          <p className="mt-2 text-sm leading-relaxed text-ui-dim">
            Isolation buys depth and costs coherence. Across the 23 rows,{' '}
            <span className="text-ui-fg">four different spellings of the same escalation owner</span>{' '}
            appeared, because no agent can see what the others wrote. Somebody has to reconcile
            that, and that somebody is the assembler.
          </p>
        </div>
      </div>

      {/* THE FINDING THAT ARGUES AGAINST THE TOPOLOGY. Reporting only the
          favourable half would make this a sales table. */}
      <div className="mt-4 rounded-xl border border-ui-danger/30 bg-ui-danger/5 px-5 py-4">
        <h4 className="font-medium text-ui-danger">The assembler got worse as the list got longer</h4>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
          At four lots it caught the cross-lot pattern that justifies having an assembler at all —
          multiple deliveries already going to Piedmont Regional Hospital. At twenty-three lots,
          four lots went to Piedmont and it did not consolidate them. The participant that exists
          to see across items sees less well when there is more to see, which is{' '}
          <span className="text-ui-fg">
            the same attention problem the fan-out was meant to solve, relocated rather than removed
          </span>
          .
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-ui-line bg-ui-surface px-5 py-4">
        <h4 className="font-medium text-ui-fg">Fanning out destroys prompt caching</h4>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
          The single loop runs at 87% of its input billed as cached. The first debate runs reported{' '}
          <Mono className="text-ui-fg">0 of 5,825 input tokens billed as cached</Mono>, because five
          calls with five different system prompts share no prefix. When the adjudicator gained a
          retrieval turn — two calls sharing one prefix — caching reappeared. So: fanning out{' '}
          <span className="text-ui-fg">across</span> different prompts destroys caching; extra turns{' '}
          <span className="text-ui-fg">within</span> one sub-agent restore it. A real economic
          property of the design, and only visible because per-request cost was already logged.
        </p>
      </div>

      <h3 className="mt-10 font-medium text-ui-fg">The debate, and what it is allowed to conclude</h3>
      <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
        Most of a work list is not arguable — whether a lot shipped to a hospital is on file, and
        two agents disputing it is theatre that costs money like the real thing. What is arguable is
        what SOP-SCM-004 §7.3 leaves open on purpose, and the argument is about sequence: protect
        then test, or test then act. For SUP-04 that is{' '}
        <span className="text-ui-fg">11 of the 23 lots</span>. Each contested lot costs 5 calls,
        about 30 seconds and ~$0.011 — roughly $0.12 for all eleven, about fifteen times the single
        loop for the same question. Not fatal; also not free.
      </p>
      <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
        The adjudicator cannot issue a verdict. The answer contract has no field that could carry
        one and the coherence layer rejects the sentence in prose. What it produces is an escalation
        carrying <em>both</em> cases to the person allowed to decide: the strongest version of each
        argument, what exactly has to be decided, and what would settle it. A single model asked
        &ldquo;recall or not?&rdquo; returns a confident-sounding middle. Two arguing makes the
        disagreement visible instead of dissolving it.
      </p>

      {/* THE MOST USEFUL THING ON THIS SECTION FOR A SECURITY REVIEWER. */}
      <div className="mt-6 rounded-xl border border-ui-danger/30 bg-ui-danger/5 px-5 py-4">
        <h4 className="font-medium text-ui-danger">
          An agent asked to cite a source it cannot reach will invent one
        </h4>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
          The first debate run produced &ldquo;an initial decision must be made{' '}
          <span className="text-ui-fg">within 72 hours</span> … per company Field Action SOP
          timeline&rdquo;. There is no Field Action SOP and no 72-hour rule; SOP-SCM-004 §7.4 says
          five working days. The prompt had asked the adjudicator to cite the clock and given it no
          tools and no procedure text, so it produced something plausible.{' '}
          <span className="text-ui-fg">That is a prompt bug, not a model failure</span> — and an
          invented regulatory deadline is worse than an absent one, because it gets acted on.
        </p>
        <p className="mt-2.5 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
          Fixed by giving the adjudicator <Mono className="text-ui-fg">search_procedures</Mono> and
          nothing else, and by changing the instruction from &ldquo;cite the rule&rdquo; to
          &ldquo;if you cannot find it, write that no timescale was found — do not supply a number
          from general knowledge&rdquo;. The next run quoted §7.4 verbatim. The advocates still get
          no tools: two advocates retrieving their own passages is a debate about two different
          documents.
        </p>
      </div>

      {/* STATED BECAUSE EVERY OTHER PILLAR HERE HAS A CHECK AND THESE DO NOT. */}
      <p className="mt-6 max-w-[70ch] rounded-xl border border-ui-warn/30 bg-ui-warn/5 px-5 py-4 text-sm leading-relaxed text-ui-dim">
        <span className="text-ui-warn">Not yet guarded.</span> No eval cases cover the fan-out or
        the debate. They are reachable only from their own commands, so a regression in either is
        silent — which is why the desk runs the single loop, the one route the eval suite does
        cover.
      </p>

      <p className="mt-5 font-mono text-xs leading-relaxed text-ui-faint">
        Run them yourself — <span className="text-ui-dim">pnpm pharma:fanout SUP-04</span> ·{' '}
        <span className="text-ui-dim">pnpm pharma:debate SUP-04</span> ·{' '}
        <span className="text-ui-dim">pnpm pharma:fanout-check</span> for the offline half. The
        first two spend real tokens. Figures above are from docs/pharma/NEXT.md §N6 and
        docs/PROGRESS.md §17.
      </p>
    </section>
  );
}

function Walkthrough() {
  const [active, setActive] = useState(WALKS[0].id);
  const walk = WALKS.find((w) => w.id === active) ?? WALKS[0];

  return (
    <section className="lift-in pb-16" style={{ animationDelay: '160ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        One question, every hop.
      </h2>

      <div role="tablist" aria-label="Which question" className="mt-6 flex flex-wrap gap-2">
        {WALKS.map((w) => {
          const on = w.id === walk.id;
          return (
            <button
              key={w.id}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => setActive(w.id)}
              className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                on
                  ? 'border-ui-accent/50 bg-ui-accent/10 text-ui-fg'
                  : 'border-ui-line bg-ui-raised/40 text-ui-dim hover:border-ui-line-lit hover:text-ui-fg'
              }`}
            >
              {w.tab}
            </button>
          );
        })}
      </div>

      <p className="mt-6 max-w-[64ch] leading-relaxed text-ui-dim">{walk.lede}</p>

      {/* COUNTED FROM THE DATA, not written into the prose. Both walks happen to
          be three turns today; a sentence that hard-coded it would go quietly
          wrong the first time one of them changed. */}
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        {walk.turns.length} turns means {walk.turns.length} requests to the model — countable, and
        checkable against the cost line the desk prints under every answer.
      </p>

      <div className="mt-10">
        <Journey turns={walk.turns} />
      </div>

    </section>
  );
}

/**
 * The spine of the page.
 *
 * Two columns and a rule between them. The structural device IS the argument:
 * there is one boundary, these things are on this side of it, those things are
 * on that side. Any treatment that made this look like a feature comparison
 * would be burying the only thing the reader came for.
 */
function Boundary() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '120ms' }}>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-ui-line bg-ui-line md:grid-cols-2">
        <Side
          tone="internal"
          icon={<BlockIcon />}
          title="Never leaves your infrastructure"
          items={STAYS}
        />
        <Side
          tone="model"
          icon={<StepsIcon />}
          title="Crosses to the model, and stops there"
          subtitle="Azure OpenAI · gpt-5-mini · swedencentral"
          items={CROSSES}
        />
      </div>
    </section>
  );
}

function Side({
  tone,
  icon,
  title,
  subtitle,
  items,
}: {
  tone: 'internal' | 'model';
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  items: Array<{ what: string; detail: string }>;
}) {
  const c =
    tone === 'internal'
      ? { text: 'text-flow-internal', wash: 'from-flow-internal/10', rail: 'border-flow-internal/30' }
      : { text: 'text-flow-model', wash: 'from-flow-model/10', rail: 'border-flow-model/30' };

  return (
    <div className={`bg-linear-to-b ${c.wash} to-transparent bg-ui-surface px-6 py-6`}>
      <h3 className={`flex items-center gap-2.5 font-medium ${c.text}`}>
        {icon}
        {title}
      </h3>
      {subtitle && <Mono className="mt-1.5 block text-xs text-ui-faint">{subtitle}</Mono>}

      <dl className={`mt-5 grid gap-4 border-l pl-4 ${c.rail}`}>
        {items.map((i) => (
          <div key={i.what}>
            <dt className="text-[0.9375rem] font-medium text-ui-fg">{i.what}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ui-dim">{i.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** One step of a flow, and which side of the boundary it happens on. */
interface Step {
  t: string;
  d: string;
  where: 'yours' | 'model';
}

/**
 * Indexing — the flow the walkthrough above does NOT cover.
 *
 * It used to sit beside an "answering" column that repeated, in four lines,
 * what the hop-by-hop section now says properly. Two accounts of the same
 * journey on one page is how they drift, and the shorter one is always the one
 * that goes stale.
 *
 * What survives is the half that genuinely is separate: this happens ONCE, when
 * documents change, not per question. Keeping that distinct is the whole reason
 * the section exists — drawn as one pipeline, a reader reasonably concludes the
 * corpus is sent every time somebody asks something.
 */
function Indexing() {
  const steps: Step[] = [
    {
      t: 'Documents load from your store',
      d: 'Procedures and specifications. 3 documents today.',
      where: 'yours',
    },
    {
      t: 'Split into passages',
      d: 'By heading, so a clause keeps its context. 50 passages, none orphaned.',
      where: 'yours',
    },
    {
      t: 'Each passage is embedded',
      d: 'text-embedding-3-small — 1536 numbers per passage. The passage text is sent; the numbers come back. This is the only time document text crosses, and it is not during a question.',
      where: 'model',
    },
    {
      t: 'Stored as an index you own',
      d: 'Vectors land in your own Postgres beside the text. Rebuildable from the documents at any time.',
      where: 'yours',
    },
  ];

  return (
    <section className="lift-in pb-16" style={{ animationDelay: '320ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        Indexing happens once, not per question.
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Everything above is one question. This is the separate flow that runs when your documents
        change — and the only place the embedding model is involved at all.
      </p>

      <div className="mt-9 max-w-2xl">
        <Flow title="Indexing" when="On change, not on question" steps={steps} />
      </div>
    </section>
  );
}

function Flow({
  title,
  when,
  steps,
}: {
  title: string;
  when: string;
  steps: Step[];
}) {
  return (
    <div>
      <div className="mb-5 flex items-baseline gap-3">
        <h3 className="font-mono text-lg font-medium tracking-tight">{title}</h3>
        <span className="text-sm text-ui-faint">{when}</span>
      </div>

      <ol className="gate-line grid gap-5">
        {steps.map((s, i) => {
          const crosses = s.where === 'model';
          return (
            <li key={i} className="relative flex gap-4">
              {/* The node states which side of the boundary the step is on.
                  A reader scanning only the dots still gets the answer. */}
              <span
                className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-ui-surface font-mono text-[0.6875rem] ${
                  crosses
                    ? 'border-ui-info/50 text-ui-info'
                    : 'border-ui-accent/50 text-ui-accent'
                }`}
                style={{ boxShadow: `0 0 14px -3px ${crosses ? 'var(--color-ui-info)' : 'var(--color-ui-accent)'}` }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2.5 text-[0.9375rem] font-medium text-ui-fg">
                  {s.t}
                  <span
                    className={`rounded-full border px-2 py-px font-mono text-[0.625rem] ${
                      crosses
                        ? 'border-ui-info/40 bg-ui-info/5 text-ui-info'
                        : 'border-ui-accent/40 bg-ui-accent/5 text-ui-accent'
                    }`}
                  >
                    {crosses ? 'crosses' : 'stays'}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ui-dim">{s.d}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The section that makes the rest of the page evidence rather than a slide. */
function Proofs() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '280ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        Run it yourself.
      </h2>
      <p className="mt-4 max-w-[62ch] leading-relaxed text-ui-dim">
        Each claim below is asserted by a check that captures the real outgoing request. Each check
        also plants a violation and proves it catches it — a test never seen to fail is a test you
        cannot read a pass from.
      </p>

      <ul className="mt-9 grid gap-3">
        {PROOFS.map((p) => (
          <li
            key={p.claim}
            className="rounded-xl border border-ui-line bg-ui-surface/70 px-5 py-4 transition-colors hover:border-ui-line-lit"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h3 className="text-[0.9375rem] font-medium text-ui-fg">{p.claim}</h3>
              <Mono className="text-xs text-ui-accent">{p.cmd}</Mono>
            </div>
            {/* NOT A BADGE AND NOT A COLOUR. Every row here says the same thing
                — "verified here" — so a green pill on each would be six pills
                saying nothing. It is one quiet line, and it earns its place by
                being different on the section below, where the answer is not
                "we checked". */}
            <p className="mt-1 font-mono text-[0.6875rem] tracking-wide text-ui-faint uppercase">
              {p.strength}
            </p>
            <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ui-dim">{p.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * What is NOT claimed, at the same size as what is.
 *
 * It sits directly under the list of verified claims on purpose. A reviewer who
 * has just read eight things we proved is exactly the reader who should meet
 * the three we cannot — anywhere else on the page it reads as a footnote, and a
 * footnote is what people mean when they say something was buried.
 */
function Limits() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '300ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        And what this page will not claim.
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Two of these are the provider's word rather than ours, and one is a default that does not
        favour us. All three are the first questions a real security review reaches, so they are
        here rather than in an appendix.
      </p>

      <ul className="mt-9 grid gap-3">
        {LIMITS.map((l) => (
          <li
            key={l.title}
            className={`rounded-xl border px-5 py-4 ${
              l.kind === 'must be arranged'
                ? 'border-ui-warn/35 bg-ui-warn/5'
                : 'border-ui-line bg-ui-surface/70'
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-[0.9375rem] font-medium text-ui-fg">{l.title}</h3>
              <span
                className={`font-mono text-[0.6875rem] tracking-wide uppercase ${
                  l.kind === 'must be arranged' ? 'text-ui-warn' : 'text-ui-faint'
                }`}
              >
                {l.kind}
              </span>
            </div>
            <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ui-dim">{l.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Retention, separated from the provider question because they are different
 * questions and conflating them is how a page ends up technically true and
 * practically misleading.
 */
function Retention() {
  return (
    <section className="lift-in pb-16" style={{ animationDelay: '340ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        What is kept, and by whom.
      </h2>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ui-accent/30 bg-linear-to-b from-ui-accent/8 to-transparent px-5 py-5">
          <h3 className="flex items-center gap-2.5 font-medium text-ui-accent">
            <EyeIcon />
            The model provider keeps nothing
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">
            <Mono className="text-ui-fg">store: false</Mono> on every request, no conversation held
            on their side, and no transcript exported anywhere. Asserted on the wire, not assumed.
          </p>
        </div>

        <div className="rounded-xl border border-ui-warn/30 bg-linear-to-b from-ui-warn/8 to-transparent px-5 py-5">
          <h3 className="flex items-center gap-2.5 font-medium text-ui-warn">
            <GapIcon />
            You keep two things, on purpose
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ui-dim">
            A per-request cost line, and the question-and-answer history a reviewer returns to. Both
            live in your own database, under your retention policy rather than ours.
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-[68ch] text-sm leading-relaxed text-ui-dim">
        Embeddings currently run on Azure alongside the language model. They do not have to: the
        same pipeline runs against a local embedding model with no network call at all, which is the
        route to take if passages may not leave your own hardware.{' '}
        <Mono className="text-ui-fg">EMBEDDINGS=local</Mono> — the index is rebuilt, and nothing
        else changes.
      </p>
    </section>
  );
}
