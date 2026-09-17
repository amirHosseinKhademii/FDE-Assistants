/**
 * Veresk — the firm's front door.
 *
 * WHO ARRIVES HERE. Somebody deciding whether this kind of work is worth
 * buying, or whether the person who did it is worth hiring. Not a user of any
 * one product: every page below this one belongs to a customer, and this one
 * belongs to the practice.
 *
 * THE HERO IS THE REUSE GRAPH, AND IT IS DRAWN FROM `package.json`. The claim
 * a forward-deployed engineer makes is that most of what a customer needs was
 * built before they arrived, and the part that was not is the part worth
 * paying for. That claim is checkable here: three engagement packages, eight
 * shared ones, and an edge wherever one really depends on the other. The
 * command that prints the same list is under the drawing.
 *
 * THE GRAPH IS HONEST ABOUT THE THIRD ENGAGEMENT, which is the reason it earns
 * its place. Vantis Steering reaches exactly ONE shared package today, because
 * it is at step one — an estate and nothing above it. A drawing that showed
 * three engagements evenly plugged into everything would be a brochure. This
 * one shows the newest customer barely connected, which is what being six days
 * into an engagement looks like.
 *
 * COLOUR MEANS NOTHING ON THIS PAGE, DELIBERATELY. Both engagement pages below
 * spend their palettes on something specific — which system of record a fact
 * came from — and three of the six hues they use are the same hex as a severity
 * token. A firm-level page inventing a fourth scale would put a colour next to
 * an engagement's name that means something else one click away. So the only
 * colour here is `--ui-accent`, which `DESIGN.md` reserves for action and live
 * machinery, used on exactly the things you can press.
 *
 * THE NUMBERS ARE LINES OF SOURCE, WHICH IS A WEAK MEASURE AND IS LABELLED AS
 * ONE. This repo comments heavily — the reasoning is the artefact — so a line
 * count is nearer to "how much was written down" than to "how much was built".
 * It is shown because it is reproducible and the alternative was an adjective.
 */
import { Link } from '@tanstack/react-router';
import { FlowMap } from '@fde/uikit';
import type { FlowEdge, FlowNode, FlowStage } from '@fde/uikit';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { PHARMA, SAFETY, STEERING } from '../lib/links';
import { BoxIcon } from '@fde/uikit';
import { CaseGlyph, PackageGlyph } from '../components/flow/veresk-glyphs';
import { hueOf, lessonsIn, MAP, TOTALS, TRACKS } from '../lib/learn/lessons';

/* ── The graph, as data ────────────────────────────────────────────────────
   Every edge below is a real dependency. Regenerate the list with:

     for p in insurance pharma steering; do node -e "…package.json…"; done

   printed under the drawing so a reader can run it rather than trust it.
   ────────────────────────────────────────────────────────────────────────── */

/** Lines of `.ts`/`.tsx` under each package's `src/`, counted 2026-09-13. */
const LINES = {
  core: 10270,
  insurance: 2944,
  pharma: 16534,
  steering: 5510,
};

const ENGAGEMENTS = [
  {
    id: 'insurance',
    name: 'Meridian Mutual',
    sub: 'insurance claims',
    y: 120,
    uses: ['grounding', 'agent', 'evals', 'schema', 'telemetry', 'guard', 'foundry'],
  },
  {
    id: 'pharma',
    name: 'Meridian Pharma',
    sub: 'batch release',
    y: 287,
    uses: ['grounding', 'agent', 'evals', 'schema', 'telemetry', 'foundry'],
  },
  {
    id: 'steering',
    name: 'Vantis Steering',
    sub: 'bid response',
    y: 453,
    uses: ['grounding'],
  },
  /* THE FOURTH REACHES ONE PACKAGE, AND THAT IS THE HONEST DRAWING. It parses
     and surveys a public corpus; the retrieval, the loop and the evals are
     ahead of it, not behind. An edge drawn to a package it does not import yet
     would make the map a plan rather than a dependency graph — which is the one
     thing this drawing is for. */
  {
    id: 'safety',
    name: 'Calder Safety',
    sub: 'vehicle recalls',
    y: 620,
    uses: ['grounding'],
  },
];

const PACKAGES = [
  { id: 'grounding', does: 'load, chunk, embed, search', y: 60 },
  { id: 'agent', does: 'the tool-calling loop, three engines', y: 140 },
  { id: 'evals', does: 'repeat runs, severities, baselines', y: 220 },
  { id: 'schema', does: 'shape, then coherence', y: 300 },
  { id: 'telemetry', does: 'what a question cost', y: 380 },
  { id: 'guard', does: 'what it must never do', y: 460 },
  { id: 'foundry', does: 'the model endpoint, no static keys', y: 540 },
  { id: 'uikit', does: 'the surface every page is built from', y: 620 },
];

const NODES: FlowNode[] = [
  ...ENGAGEMENTS.map((e) => ({
    id: e.id,
    kind: 'engagement',
    name: e.name,
    sub: e.sub,
    back: `Reaches ${e.uses.length} of the eight shared packages. Everything else about it had to be written.`,
    x: 150,
    y: e.y,
    r: 116,
  })),
  ...PACKAGES.map((p) => ({
    id: p.id,
    kind: 'package',
    name: `@fde/${p.id}`,
    sub: p.does,
    back: `Written once, for whoever needs it next. Nothing in it knows what a claim, a batch or a steering rack is.`,
    x: 800,
    y: p.y,
    r: 104,
  })),
];

/**
 * One edge per real dependency, and the stagger is by ENGAGEMENT rather than by
 * package — the pulse should read as one customer lighting up what they use,
 * three times over, not as eight packages blinking at once.
 */
const EDGES: FlowEdge[] = ENGAGEMENTS.flatMap((e, i) =>
  e.uses.map((pkg, j) => ({ from: e.id, to: pkg, at: i * 2.4 + j * 0.12 })),
);

const STAGES: FlowStage[] = [
  { title: 'Four customers', ids: ENGAGEMENTS.map((e) => e.id) },
  { title: 'One set of parts', ids: PACKAGES.map((p) => p.id) },
];

function figureFor(node: FlowNode) {
  return node.kind === 'engagement' ? <CaseGlyph /> : <PackageGlyph />;
}

export function VereskLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
          <BoxIcon />
        </span>
        <span className="font-medium tracking-tight">Veresk</span>
        {/* A TYPED LINK, and the only one in this nav. `/learn` is served by
            this application; the two engagements are separate deployments on
            separate origins and have to be plain anchors. The difference is
            invisible until one of them is deployed — see `lib/links.ts`. */}
        <Link to="/learn" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Learn
        </Link>
        {PHARMA && (
          <a href={PHARMA} className="text-sm text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto">
            Meridian Pharma
          </a>
        )}
        {/* Absent rather than dead when there is nowhere to send anybody. */}
        {SAFETY && (
          <a href={SAFETY} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Calder Safety
          </a>
        )}
        {STEERING && (
          <a href={STEERING} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Vantis Steering
          </a>
        )}
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <section className="pt-10 pb-12 sm:pt-16 md:pt-24">
          <h1
            className="lift-in title-spectrum max-w-4xl font-mono text-[1.75rem] leading-[1.1] font-semibold tracking-tighter break-words sm:text-5xl md:text-7xl"
            style={{ animationDelay: '60ms' }}
          >
            Someone else's problem, running by Friday.
          </h1>

          <p
            className="lift-in mt-6 max-w-[52ch] leading-relaxed text-ui-dim sm:text-lg md:mt-8 md:text-xl"
            style={{ animationDelay: '200ms' }}
          >
            Veresk builds the thing a customer actually needs, inside their tenant, on their data,
            in six to twelve weeks — and leaves behind a number that proves it works and a suite
            they can re-run without us.
          </p>

          <p
            className="lift-in mt-6 max-w-[58ch] leading-relaxed text-ui-faint"
            style={{ animationDelay: '320ms' }}
          >
            Three engagements so far. Each one needed a different question answered, and each one
            found most of its machinery already written.
          </p>
        </section>

        <ReuseGraph />

        <Engagements />

        <Method />

        <Learn />

        <footer className="border-t border-ui-line py-10 text-sm text-ui-faint">
          Veresk — a practice portfolio. Every customer, estate and document behind these pages is
          synthetic; the engineering is not.
        </footer>
      </main>
    </div>
  );
}

/** The hero object: who reuses what, drawn from the dependency graph. */
function ReuseGraph() {
  return (
    <section className="py-10">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        Most of it was built before you arrived.
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
        Eight packages carry the parts every engagement needs — retrieval, the agent loop, evals,
        the answer contract, cost, guards, the model endpoint, the interface. What is left is the
        judgement, and the judgement is the job.
      </p>

      <div className="mt-10">
        <FlowMap
          nodes={NODES}
          edges={EDGES}
          stages={STAGES}
          width={1000}
          height={680}
          cycle={8}
          figure={figureFor}
          stackNote="Two of the four reach one shared package each. Vantis Steering has an estate and nothing above it; Calder Safety has parsed a public corpus and nothing above that. Neither is finished, and the drawing says so by having nothing to draw."
        />
      </div>

      <p className="mt-8 max-w-[62ch] text-sm leading-relaxed text-ui-faint">
        Every line in that drawing is a real dependency. Print the same list with{' '}
        <span className="font-mono text-ui-dim">
          node -e "console.log(Object.keys(require('./packages/pharma/package.json').dependencies))"
        </span>
        .
      </p>
    </section>
  );
}

/**
 * The three, and where each one lives.
 *
 * NOT ONE OF THEM IS SERVED BY THIS APP. Since the pharma surface moved out on
 * 2026-09-13 this deployment is one page — the door — and all three engagements
 * are other origins. So every card is an anchor or nothing; a typed
 * `<Link to="/pharma">` would compile, look identical, and 404.
 *
 * A CARD IS A LINK ONLY WHERE THERE IS SOMEWHERE TO GO, checked at build time
 * rather than assumed. Insurance has never had a URL — it is the first
 * engagement, run locally on port 3000 and never deployed. The other two have
 * theirs baked in by the pipeline, which resolves each from Azure AFTER
 * deploying it.
 *
 * THE ALTERNATIVE SHIPPED AND WAS WORSE. This page spent a day linking to
 * `http://localhost:3400` from the deployed site, because the dev fallback was
 * inlined into the production bundle at build time. A card styled like a link
 * and doing nothing useful when pressed is the page telling a small lie to look
 * fuller — and sending somebody to a port on their own machine is a louder lie
 * than doing nothing at all.
 */
const CASES = [
  {
    href: PHARMA,
    customer: 'Meridian Pharma',
    persona: 'a Qualified Person with a batch waiting',
    asks: 'Can this batch ship to this market?',
    state: 'Two questions answered end to end, on a seven-database estate, with an eval suite behind them.',
    elsewhere: 'Runs as its own application — pnpm pharma:dev, port 3301',
  },
  {
    href: STEERING,
    customer: 'Vantis Steering',
    persona: 'a systems engineer with an RFQ on the desk',
    asks: 'What of this do we already have, and what will the rest cost?',
    state: 'Six days in. The estate is built and seeded; nothing is answered yet.',
    elsewhere: 'Runs as its own application — pnpm steering:dev, port 3400',
  },
  {
    href: SAFETY,
    customer: 'Calder Safety',
    persona: 'an analyst running four hundred vans',
    asks: 'Is this a known defect with a remedy, and is the remedy holding?',
    /* THE ONLY ONE OF THE FOUR WHOSE CORPUS WE DID NOT WRITE, which is the
       whole reason it exists and so it is what the card says. The others'
       documents were written to contain the traps we wanted to teach; these are
       73,334 public filings that nobody made tractable for us. */
    state: 'The first corpus here nobody wrote for us — 73,334 public NHTSA filings. Parsed and surveyed; the desk is not built.',
    elsewhere: 'Runs as its own application — pnpm safety:dev, port 3500',
  },
];

function Engagements() {
  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[30ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        Four customers, four questions.
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
        Every engagement starts the same way: one person, one question they answer badly today, and
        a number that says whether it got better.
      </p>

      {/* TWO BY TWO, NOT THREE AND A ONE. Three columns was right for three
          engagements and a fourth card left a row of one next to two columns of
          nothing, which reads as a card that failed to load rather than as the
          fourth customer. Four items want an even grid. */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {CASES.map((c) => {
          const inside = (
            <>
              <p className="font-mono text-sm text-ui-faint">{c.persona}</p>
              <p className="mt-3 font-mono text-lg font-medium text-ui-fg">{c.customer}</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ui-dim">“{c.asks}”</p>
              <p className="mt-4 text-xs leading-relaxed text-ui-faint">{c.state}</p>
              <p className="mt-5 text-sm text-ui-accent">Open the engagement →</p>
            </>
          );
          if (c.href) {
            return (
              <a key={c.customer} href={c.href} className="case-card group">
                {inside}
              </a>
            );
          }
          /* Built, and not reachable from here. Dashed and inert, saying where
             it runs — the same treatment as Meridian Mutual below, for the same
             reason: there is no URL to send anybody to. */
          return (
            <div key={c.customer} className="case-card case-card--elsewhere">
              <p className="font-mono text-sm text-ui-faint">{c.persona}</p>
              <p className="mt-3 font-mono text-lg font-medium text-ui-dim">{c.customer}</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ui-faint">“{c.asks}”</p>
              <p className="mt-4 text-xs leading-relaxed text-ui-faint">{c.state}</p>
              <p className="mt-5 font-mono text-xs text-ui-faint">{c.elsewhere}</p>
            </div>
          );
        })}

        {/* Not a link, and visibly so — see the note above. */}
        <div className="case-card case-card--elsewhere">
          <p className="font-mono text-sm text-ui-faint">a claims adjuster, 40 claims a day</p>
          <p className="mt-3 font-mono text-lg font-medium text-ui-dim">Meridian Mutual</p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ui-faint">
            “Does this policy cover it, and where does it say so?”
          </p>
          <p className="mt-4 text-xs leading-relaxed text-ui-faint">
            The first engagement, and the one that paid for the shared packages. 30 of 35 eval runs
            green.
          </p>
          <p className="mt-5 font-mono text-xs text-ui-faint">
            Runs as its own application — pnpm dev, port 3000
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * What is actually being sold, said in the order it happens rather than as a
 * list of capabilities. The numbers are measured; the last line is the one that
 * matters and is deliberately the least impressive-sounding.
 */
const METHOD = [
  {
    beat: 'Narrow it',
    body: 'An ambition — "we want AI on our claims process" — becomes one question with one number attached, in the first meeting. Everything else is the second project.',
  },
  {
    beat: 'Build it where it has to live',
    body: 'Their cloud, their identity, their network. No static keys, no public egress, and the deployment story written down before the demo, not after.',
  },
  {
    beat: 'Measure it',
    body: 'A labelled set, repeat runs, severity buckets, and a baseline on disk that the next change is diffed against. A red check is a hypothesis, not a verdict.',
  },
  {
    beat: 'Say what it cannot do',
    body: 'Every one of these refuses. It escalates rather than guessing, and the known failures are handed over in writing — which is the part that makes the rest believable.',
  },
];

function Method() {
  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[30ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        How the work goes.
      </h2>

      <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {METHOD.map((m, i) => (
          <li key={m.beat} className="method-step">
            {/* The numeral is load-bearing: these genuinely happen in this
                order, and doing the fourth first is the common failure. */}
            <span className="method-step-n">{i + 1}</span>
            <h3 className="font-mono text-base font-medium text-ui-fg">{m.beat}</h3>
            <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-ui-dim">{m.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-ui-line pt-8">
        <Figure n={LINES.core.toLocaleString('en-GB')} label="lines written once" />
        <Figure n="8" label="shared packages" />
        <Figure n="3" label="customers using them" />
        <p className="max-w-[40ch] font-mono text-xs leading-relaxed text-ui-faint">
          lines of .ts and .tsx under each package's src/, counted 2026-09-13. A weak measure — this
          repo writes its reasoning down, so much of that is prose.
        </p>
      </div>
    </section>
  );
}

function Figure({ n, label }: { n: string; label: string }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-mono text-2xl font-medium tracking-tight text-ui-fg">{n}</span>
      <span className="text-sm text-ui-dim">{label}</span>
    </span>
  );
}

/**
 * The way into the lessons.
 *
 * WHY IT IS ON THE FIRM'S PAGE AND NOT INSIDE AN ENGAGEMENT. Everything under
 * `/learn` is true of all three customers — what an embedding is, how two
 * search arms are fused, what a suite measures. Putting it inside Meridian
 * Pharma's surface would make one customer's page carry the other two's
 * teaching; putting it here says the correct thing, which is that this is how
 * the practice works rather than how one product does.
 *
 * IT IS LAST ON THE PAGE ON PURPOSE. Somebody deciding whether to buy this work
 * should meet the engagements and the method before the explainer; a reader who
 * wants the explainer first has the nav. The order is an argument, the same way
 * it is on every other page on this site.
 */
function Learn() {
  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[32ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        And here is how the machine actually works.
      </h2>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-ui-dim">
        {TOTALS.lessons} lessons in {TOTALS.tracks} tracks, plus a map of the repo itself. They run from the
        machinery every engagement above is built from, through what you build once it works and the
        retrieval patterns around it, into a real customer's files where most of the answers turned out not
        to be there. Every figure is a number this repo measured, printed with the command that reprints it
        — and any figure that is a drawing, a proposal, or somebody else's benchmark says so on its face.
      </p>

      {/* DERIVED, NOT WRITTEN OUT. The sentence above used to enumerate the
          tracks — "five … five … seven" — and a fourth track of five landed
          while it went on saying so. That is the same defect `TOTALS` was
          introduced to kill, one level up: a count in prose is still a count.
          Nothing here can disagree with `TRACKS`. */}
      <p className="mt-3 max-w-[60ch] font-mono text-[0.8125rem] leading-relaxed text-ui-faint">
        {TRACKS.map((t, i) => (
          <span key={t.id}>
            {i > 0 && <span className="text-ui-line"> · </span>}
            {t.title} ({lessonsIn(t.id).length})
          </span>
        ))}
      </p>

      {/* GROUPED, BECAUSE THE TRACKS ARE NOT ONE NUMBERED RUN. See
          `lib/learn/lessons.ts`: two of them open with a lesson that assumes
          nothing at all, and one flat strip would claim a dependency chain that
          does not exist. */}
      <div className="mt-8 space-y-5">
        {TRACKS.map((track) => (
          <div key={track.id}>
            <p className="font-mono text-[0.625rem] tracking-[0.1em] text-ui-faint uppercase">{track.title}</p>
            <ol className="mt-2 flex flex-wrap gap-2">
              {lessonsIn(track.id).map((l) => (
                <li key={l.slug}>
                  <Link
                    to={`/learn/${l.slug}`}
                    className="flex items-baseline gap-2 rounded-lg border border-ui-line bg-ui-surface px-3 py-2 transition-colors hover:border-ui-line-lit"
                  >
                    <span className="font-mono text-[0.6875rem]" style={{ color: hueOf(l) }}>
                      {l.n}
                    </span>
                    <span className="text-sm text-ui-dim">{l.short}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* THE MAP GETS ITS OWN ROW ON THE FIRM'S PAGE, above the two ways in.
          It belongs to no track, and it is the thing somebody arriving cold
          most often wants first: not how a retriever works, but where any of
          this lives. It also shipped reachable only by typing the URL — see
          `lib/learn/lessons.ts`. */}
      <div className="mt-5">
        <p className="font-mono text-[0.625rem] tracking-[0.1em] text-ui-faint uppercase">
          and the repo itself
        </p>
        <Link
          to={`/learn/${MAP.slug}`}
          className="mt-2 inline-flex items-baseline gap-2 rounded-lg border border-ui-line bg-ui-surface px-3 py-2 transition-colors hover:border-ui-line-lit"
        >
          <span className="font-mono text-[0.6875rem] text-ui-accent" aria-hidden>
            ▣
          </span>
          <span className="text-sm text-ui-dim">{MAP.short}</span>
        </Link>
      </div>

      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/learn" className="text-sm text-ui-accent transition-opacity hover:opacity-80">
          Start at lesson one &rarr;
        </Link>
        <Link to={`/learn/${MAP.slug}`} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Or see where it all lives &rarr;
        </Link>
      </p>
    </section>
  );
}
