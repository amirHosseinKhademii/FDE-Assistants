/**
 * The seven stages — five of them built, two of them still a proposal.
 *
 * ── THE PAGE IS HALF RECORD AND HALF PROPOSAL, AND SAYS WHICH ──────────────
 *
 * Stages 1 through 5 run. Stage 6 is planned and not built, stage 7 is not
 * written at all, and the tab bar encodes the difference rather than leaving it
 * to prose. So every number still has to say where it came from. Three provenances, and the
 * kit badges each one: `measured` (out of the NHTSA files, or produced by
 * running the thing described), `worked` (carried through by hand in the source
 * document), `target` (somebody else's measurement, quoted as the bar).
 *
 * THE ONE THAT WOULD BE A LIE WITHOUT ITS BADGE is recall@6 0.813 in stage 3.7.
 * That is Vantis Steering's measurement on a corpus somebody here wrote. On a
 * page about Calder it would read as Calder's, and it is not — it is the number
 * this pipeline has to clear.
 *
 * ── ONE COMPLAINT, ALL SEVEN STAGES ────────────────────────────────────────
 *
 * ODI `11353867` — a 2020 Ford F-150 whose gear display disagreed with its
 * gearbox — is a tab-separated line in stage 3.1 and the passage that wins the
 * fusion in stage 3.6. Seven abstractions are hard to hold; one thing happening
 * seven times is not, so it is named in every stage rather than only the first.
 *
 * ── THE ARITHMETIC IN 3.6 IS COMPUTED, NOT TYPED ───────────────────────────
 *
 * It is the page's hero figure and the margin is 0.8%. `rrf()` runs the formula
 * the paragraph beside it describes, so the two cannot drift apart and a reader
 * who checks the sum finds it right.
 *
 * Source: `docs/safety/INGESTION.md`, written 2026-09-17.
 */
import { Mono } from '@fde/uikit';
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { Code, Data } from '@veresk/surface';
import { BeforeAfter, Because, Figure, Raw, Stage } from '../components/steps/kit';
import { ChunkerModal } from '../components/steps/ChunkerModal';
import { EmbedModal } from '../components/steps/EmbedModal';
import { IndexModal } from '../components/steps/IndexModal';
import { FuseModal, SearchModal } from '../components/steps/SearchModal';
import { MeasureModal } from '../components/steps/MeasureModal';
import { RerankModal } from '../components/steps/RerankModal';
import { Stage4 } from '../components/steps/Stage4';
import { Stage5 } from '../components/steps/Stage5';
import { Stage6 } from '../components/steps/Stage6';
import { Done, NotBuilt, StepTabs } from '../components/steps/Tabs';
import type { StepTab } from '../components/steps/Tabs';
import { ParserModal } from '../components/steps/ParserModal';
import { AURORA } from '../lib/aurora';
import { ROWS, UNITS } from '../lib/estate.generated';
import { VERESK } from '../lib/links';

/** The complaint this page follows, start to finish. */
const SPINE = '11353867';

/**
 * Reciprocal Rank Fusion, as the page describes it.
 *
 * `k = 60` is the convention from the original paper; its job is to stop the
 * top slot dominating, which is the whole reason the loser here is the passage
 * that ranked first on keywords.
 */
/** Every document in the estate, so a share of it can be stated rather than felt. */
const TOTAL_DOCS = UNITS.complaints + UNITS.recalls + UNITS.investigations;

const K = 60;
const rrf = (...ranks: number[]) => ranks.reduce((sum, r) => sum + 1 / (K + r), 0);

export function Steps() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} muted />

      <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <Link to="/" className="font-medium tracking-tight">
          Calder Safety
        </Link>
        <span className="text-sm text-ui-faint sm:ml-auto">How it would work</span>
        <Link to="/data-flow" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Where the data goes
        </Link>
        {VERESK ? (
          <a href={VERESK} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Veresk
          </a>
        ) : (
          <span className="text-sm text-ui-faint">Veresk</span>
        )}
      </nav>

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <Head />
        <StepTabs tabs={TABS} />
        <Onward />
      </main>

      <footer className="relative z-10 mx-auto max-w-5xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
        Written before the code, and kept up with it since. Five of the seven
        parts are built and checked; the rest are a plan being argued with.
      </footer>
    </div>
  );
}

/**
 * THE SIX PARTS, IN DEPENDENCY ORDER, of which three exist.
 *
 * The order is not a preference and not a plan somebody could rearrange. You
 * cannot write an answer key for a corpus you have not surveyed, or a contract
 * before the key, or evals before there is something to score. Reading the bar
 * left to right is reading the sequence.
 *
 * ONE AND TWO ARE SHORT ON PURPOSE. They are done, they took days rather than
 * weeks, and a reader arriving at the first tab should be able to follow the
 * sequence without being handed the whole of stage 3. What each one cost to get
 * through is in `docs/safety/` and not here.
 *
 * WHAT EACH EMPTY TAB SAYS came from the list this page used to carry as "what
 * is deliberately not here yet". That list was right and was in the wrong
 * place: each row is a whole part of the build rather than a footnote to the
 * part that exists.
 */
const TABS: StepTab[] = [
  {
    id: 'corpus',
    label: 'The corpus',
    stage: '1',
    status: 'surveyed',
    built: true,
    content: (
      <Done
        title="Find out what the data actually is"
        status="done"
        what={
          <>
            <p>
              Before anything is built, get the files onto disk and describe
              them — how many records, what shape, what is missing, and what is
              in them that nobody expected. Nothing is parsed, embedded or
              stored at this stage. It exists so the next one is taken with open
              eyes.
            </p>
            <p className="mt-3.5">
              Model years 2019 and 2020, every make and model, nationwide. Three
              tab-delimited downloads from a US government server: what people
              filed, what manufacturers admitted, and what the regulator went on
              to ask.
            </p>
          </>
        }
        facts={[
          { value: UNITS.complaints.toLocaleString('en-GB'), label: 'complaints' },
          { value: UNITS.recalls.toLocaleString('en-GB'), label: 'recall campaigns' },
          { value: String(UNITS.investigations), label: 'investigations' },
        ]}
        note={
          <>
            The most useful thing it turned up is that the counts are not the
            row counts. NHTSA writes one row per component, so{' '}
            {ROWS.complaints.toLocaleString('en-GB')} rows are{' '}
            {UNITS.complaints.toLocaleString('en-GB')} filings — and every figure
            quoted from the rows would be 44% too high. That is the first
            modelling decision, and it was made by counting rather than by
            assuming.
          </>
        }
      />
    ),
  },
  {
    id: 'key',
    label: 'The answer key',
    stage: '2',
    status: 'written by hand',
    built: true,
    content: (
      <Done
        title="Write the answers down before anything can grade itself"
        status="done"
        what={
          <>
            <p>
              Pick a handful of real questions, go and find the answers by hand
              in the raw files, and write them down — which filings answer it,
              and what a correct reply would say. No code is involved and none
              of it is generated.
            </p>
            <p className="mt-3.5">
              It comes second for a reason.{' '}
              <span className="text-ui-fg">
                A system that produces its own answer key scores itself
              </span>
              , and everything after this point is measured against what is
              written here.
            </p>
          </>
        }
        note={
          <>
            It is also what makes stage 3.7 possible at all. “Did search find the
            right thing?” is not a question anybody can answer without having
            already decided what the right thing is — and deciding that{' '}
            <em>after</em> seeing the results is how a pipeline comes to score
            well on a test it wrote for itself.
          </>
        }
      />
    ),
  },
  {
    id: 'grounding',
    label: 'Grounding',
    stage: '3',
    status: 'built · measured',
    built: true,
    content: <Grounding />,
  },
  {
    id: 'tools',
    label: 'The tools',
    stage: '4',
    status: 'built · measured',
    built: true,
    content: <Stage4 />,
  },
  {
    id: 'contract',
    label: 'The contract',
    stage: '5',
    status: 'built · wired in',
    built: true,
    content: <Stage5 />,
  },
  {
    id: 'loop',
    label: 'The loop',
    stage: '6',
    status: 'planned',
    built: false,
    content: <Stage6 />,
  },
  {
    id: 'evals',
    label: 'Evals',
    stage: '7',
    status: 'not written',
    built: false,
    content: (
      <NotBuilt
        title="How we would know it got better"
        waits={[
          'There has to be something to score. Retrieval can be measured now — stage 3.7 — but an answer cannot be graded before there are answers.',
          'A baseline has to be recorded, or a later run has nothing to be compared against and every change is an opinion.',
          'The severity rules have to be written: on this corpus a missed filing that reports a death is not the same failure as a missed one that reports a rattle, and a scorecard that counts them the same is measuring the wrong thing.',
        ]}
        what={
          <>
            <p>
              Repeat runs against a fixed set of questions whose answers were
              written by hand, bucketed by how badly each failure matters, with
              a baseline on disk that the next change is diffed against.
            </p>
            <p className="mt-3.5">
              The point is not the number. It is being able to change the parser
              and say whether it helped — which is the whole argument stage 3.7
              makes one part of.
            </p>
          </>
        }
        already={
          <>
            <Mono>@fde/evals</Mono> — repeat counts, severity buckets, committed
            baselines and the diff that refuses to compare two runs made with a
            different model or repeat count, because comparing those measures the
            setup change rather than the code change.
          </>
        }
      />
    ),
  },
];

/** Everything under the first tab: the shape, the seven stages, the patterns. */
function Grounding() {
  return (
    <>
      <Shape />
      <div className="mt-16 grid gap-16">
        <Parse />
        <Chunk />
        <Embed />
        <Index />
        <Retrieve />
        <Fuse />
        <Rerank />
        <Measure />
      </div>
      <NotYet />
      <Patterns />
    </>
  );
}

function Head() {
  return (
    <section className="pt-8 pb-12 md:pt-12">
      {/* COUNTED FROM `TABS`, not typed. "seven stages · none of them built"
          was true for about a day and then was not, twice over: the stages have
          run, and there are four parts of the build rather than one. */}
      <p className="lift-in font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
        {TABS.length} parts · {TABS.filter((t) => t.built).length} of them built
      </p>

      <h1 className="lift-in title-spectrum mt-4 max-w-3xl font-mono text-[1.6rem] leading-[1.1] font-semibold tracking-tighter sm:text-[2.25rem]">
        From a line in a file to an answer
      </h1>

      <p
        className="lift-in mt-5 max-w-[62ch] leading-relaxed text-ui-dim"
        style={{ animationDelay: '90ms' }}
      >
        Seven parts, in the order they have to be built. The third is here in
        full — one complaint, <Mono>ODI {SPINE}</Mono>, a 2020 Ford F-150 whose
        gear display disagreed with its gearbox, followed from a tab-separated
        line in a 1.5 GB file to the passage that answers a question about it.
        The fourth is built and measured: five tools, and the documents the
        search could not reach are now reachable. The fifth is the shape an
        answer has to arrive in, and it is checked. The last two are written
        down and argued with.
      </p>
    </section>
  );
}

/**
 * The shape of the whole thing: four stages that happen once and three that
 * happen every time somebody asks. The split is the single most useful thing on
 * the page for anybody deciding what this costs to run.
 */
/*
 * NO TOP BORDER ON THIS SECTION. The tab bar above already ends in a rule, and
 * two a few pixels apart read as a mistake rather than as a division.
 */
function Shape() {
  const once = [
    ['3.1', 'parse', 'lines → documents'],
    ['3.2', 'chunk', 'documents → passages'],
    ['3.3', 'embed', 'passages → 384 numbers'],
    ['3.4', 'index', 'into one Postgres table'],
  ];
  const each = [
    ['3.5', 'retrieve', 'two arms, in parallel'],
    ['3.6', 'fuse', 'one ranked list'],
    ['3.6b', 'rerank', 'read the top 50 properly'],
    ['3.7', 'measure', 'did we find the right one?'],
  ];

  return (
    <section className="lift-in grid gap-8 md:grid-cols-2">
      {[
        { title: 'once, offline', rows: once, tone: 'var(--color-cal-1)', note: 'Runs on a laptop, costs nothing, and nobody is waiting for it.' },
        { title: 'every question', rows: each, tone: 'var(--color-cal-2)', note: 'Runs while somebody watches, so this is where latency and money live.' },
      ].map((group) => (
        <div key={group.title}>
          <p
            className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
            style={{ color: group.tone }}
          >
            {group.title}
          </p>
          <ol className="mt-4 grid gap-2.5">
            {group.rows.map(([n, verb, does]) => (
              <li key={n} className="flex items-baseline gap-3">
                <a
                  href={`#stage-${n}`}
                  className="font-mono text-[0.75rem] text-ui-faint transition-colors hover:text-ui-fg"
                >
                  {n}
                </a>
                <span className="w-20 shrink-0 font-mono text-sm text-ui-fg">{verb}</span>
                <span className="text-[0.8125rem] text-ui-dim">{does}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-faint">
            {group.note}
          </p>
        </div>
      ))}
    </section>
  );
}

function Parse() {
  return (
    <Stage
      n="3.1"
      verb="PARSE — lines into documents"
      when="once, offline"
      plain="The file has no header row, so a column means something only because of its position. Parsing is deciding what a document is, and which fields are text and which are labels."
    >
      <BeforeAfter
        before={
          <Figure caption="one raw line, tabs shown as ⇥">
            <Data
              path="CMPL_SLICE.tsv — ODI 11353867"
              lines={[
                '1690864⇥11353867⇥Ford Motor Company⇥FORD⇥F-150⇥2020⇥N⇥',
                '20200906⇥N⇥0⇥0⇥POWER TRAIN⇥SPRING⇥TX⇥1FTEW1E43LF⇥',
                '20200908⇥20200908⇥2800⇥1⇥THE GEAR WILL NOT GO INTO PARK',
                'AND ALLOW ME TO START. ALSO, THE DISPLAY INDICATES I AM',
                'IN THE WRONG GEAR DISPLAY SHOWS NEUTRAL BUT TRUCK IS IN',
                'DRIVE, DISPLAY SHOWS REVERSE BUT THE...',
              ]}
            />
          </Figure>
        }
        after={
          <Figure caption="one document" from="worked">
            <Data
              path="documents.json — the shape it will take"
              lang="json"
              note="docs/safety/INGESTION.md §3.1"
              mark={[2]}
              lines={[
                '{',
                '  "id": "11353867",',
                '  "text": "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08\\nTHE GEAR WILL NOT GO INTO PARK…",',
                '  "meta": {',
                '    "odino": "11353867",  "make": "FORD",  "model": "F-150",',
                '    "year": 2020,         "filed": "2020-09-08",',
                '    "components": ["POWER TRAIN"],',
                '    "crash": false, "fire": false, "deaths": 0,',
                '    "miles": 2800, "state": "TX", "vin11": "1FTEW1E43LF"',
                '  }',
                '}',
              ]}
            />
          </Figure>
        }
      />

      <Figure
        caption="one person, written five times"
        source={`ODI 11341276 · ${ROWS.complaints.toLocaleString('en-GB')} rows are ${UNITS.complaints.toLocaleString('en-GB')} complaints`}
      >
        <Raw>{`11341276  STRUCTURE:BODY                                    ┐
11341276  ELECTRICAL SYSTEM                                 │  ONE complaint
11341276  POWER TRAIN                                       │  written FIVE times
11341276  ENGINE                                            │
11341276  FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY  ┘`}</Raw>
      </Figure>

      <Because>
        NHTSA writes one row per component. Without collapsing them, that one
        person's story takes <span className="text-ui-fg">five of the six</span>{' '}
        result slots and crowds out four other people — and every count quoted
        anywhere is 44% too high.
      </Because>

      <Because>
        The header line{' '}
        <Mono>2020 FORD F-150 | POWER TRAIN | filed 2020-09-08</Mono> is added on
        purpose. The narrative never says “F-150”, so a question about a 2020
        F-150 transmission would match nothing without it.{' '}
        <span className="text-ui-fg">What you put in the text is what can be found.</span>{' '}
        Metadata is the opposite: <Mono>deaths: 0</Mono> is filtered on, never
        searched, because “deaths 0” in the text would make every complaint match
        a question about fatalities.
      </Because>

      <ParserModal />
    </Stage>
  );
}

function Chunk() {
  const untouched = UNITS.complaints + UNITS.recalls;
  const inTotal = untouched + UNITS.investigations;

  return (
    <Stage
      n="3.2"
      verb="CHUNK — the stage that mostly declines to run"
      when="once, offline"
      plain="Search returns pieces, not whole files, so a long document has to be cut up. The chunker's job is to decide where — and its real job on this corpus is to decide where not to."
    >
      <Figure caption="what went in, and what came out" source="@fde/grounding, over the real stage 3.1 output">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[0.8125rem]">
            <thead>
              <tr className="font-mono text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
                <th className="pb-2 text-left font-normal">source</th>
                <th className="pb-2 text-right font-normal">in</th>
                <th className="pb-2 text-right font-normal">out</th>
                <th className="pb-2 pl-6 text-left font-normal">what happened</th>
              </tr>
            </thead>
            <tbody>
              {[
                { source: 'complaints', n: UNITS.complaints, out: UNITS.complaints, cut: false },
                { source: 'recalls', n: UNITS.recalls, out: UNITS.recalls, cut: false },
                { source: 'investigations', n: UNITS.investigations, out: 222, cut: true },
              ].map((r) => (
                <tr key={r.source} className="border-t border-ui-line">
                  <td className="py-2.5 font-mono text-ui-fg">{r.source}</td>
                  <td className="py-2.5 text-right font-mono text-ui-dim">
                    {r.n.toLocaleString('en-GB')}
                  </td>
                  <td
                    className="py-2.5 text-right font-mono"
                    style={{ color: r.cut ? 'var(--color-cal-2)' : 'var(--color-ui-dim)' }}
                  >
                    {r.out.toLocaleString('en-GB')}
                  </td>
                  <td
                    className="py-2.5 pl-6 font-mono"
                    style={{ color: r.cut ? 'var(--color-cal-2)' : 'var(--color-ui-faint)' }}
                  >
                    {r.cut ? 'cut' : 'untouched'}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-ui-line">
                <td className="py-2.5 font-mono text-ui-faint">total</td>
                <td className="py-2.5 text-right font-mono text-ui-fg">
                  {inTotal.toLocaleString('en-GB')}
                </td>
                <td className="py-2.5 text-right font-mono text-ui-fg">
                  {(untouched + 222).toLocaleString('en-GB')}
                </td>
                <td className="py-2.5 pl-6 font-mono text-ui-faint">
                  +{222 - UNITS.investigations} passages, from {UNITS.investigations} documents
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Figure>

      <Because>
        <span className="text-ui-fg">
          {((untouched / inTotal) * 100).toFixed(2)}% of the corpus passes through
          untouched.
        </span>{' '}
        That is the stage, and the reason is not that complaints are short — one
        in nine runs past the 1,200-character default and is left alone anyway. A
        complaint is one person's account of one incident, and cutting it splits
        the symptom from the circumstance: the second piece of{' '}
        <Mono>{SPINE}</Mono> loses the word PARK, and “piece 2 of complaint{' '}
        {SPINE}” is not a thing anybody can look up. An ODI number is.
      </Because>

      <Because>
        <span className="text-ui-fg">Which demotes this stage, and that is the part worth taking away.</span>{' '}
        Where you cut normally decides what can be found, which is why chunking
        is usually the highest-leverage step in the whole pipeline. Here it
        touches {UNITS.investigations} documents out of{' '}
        {inTotal.toLocaleString('en-GB')}.
      </Because>

      <Because>
        So the leverage moves <em>upstream</em>, to stage 3.1. The line that
        decides whether a question about a 2020 F-150 finds this complaint is the
        header the parser prepends, not a cut the chunker makes — the narrative
        itself never says “F-150”. On this corpus{' '}
        <span className="text-ui-fg">the parser is the highest-leverage file</span>
        , and a pipeline tuned by fiddling with chunk sizes would be tuning the
        one stage that has almost nothing to do.
      </Because>

      <Because>
        And nothing new was written to get here. The chunker is the shared one,
        used by two other engagements unchanged — the claim that shared code
        transfers, tested for the first time against a corpus nobody wrote for
        us, passing quietly.
      </Because>

      <ChunkerModal />
    </Stage>
  );
}

function Embed() {
  const sims = [
    { q: 'F-150 will not go into park, transmission shift', v: 0.8504, near: true },
    { q: 'windscreen wiper motor failure', v: 0.5703, near: false },
  ];

  return (
    <Stage
      n="3.3"
      verb="EMBED — words into numbers"
      when="once, offline"
      plain="A computer cannot compare meanings. An embedding model turns a piece of text into a list of numbers — 384 of them here — arranged so that texts meaning similar things get similar lists."
    >
      <Figure caption={`bge-small, run for complaint ${SPINE}`} source="384 dims · first 6 shown">
        <Data
          path="615 characters in, 384 numbers out"
          mark={[3]}
          lines={[
            '2020 FORD F-150 | POWER TRAIN | filed 2020-09-08',
            'THE GEAR WILL NOT GO INTO PARK AND ALLOW ME TO START…',
            '',
            '-0.0357, -0.0272, 0.0568, 0.0164, -0.0230, 0.0981   … 378 more',
          ]}
        />
      </Figure>

      <Figure caption="two questions, against that one vector" source="cosine similarity, −1 to 1">
        <ul className="grid gap-4">
          {sims.map((s) => (
            <li key={s.q}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-mono text-[0.8125rem] text-ui-dim">“{s.q}”</span>
                <span
                  className="font-mono text-sm"
                  style={{ color: s.near ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}
                >
                  {s.v.toFixed(4)}
                </span>
              </div>
              {/* THE BAR RUNS THE FULL −1…1 RANGE, with a tick at zero, because
                  cosine similarity does not start at nothing. Drawn as a
                  fraction of its own maximum, 0.5570 would look like "about
                  two thirds as good"; against the real axis it is plainly
                  above the middle, which is what it is. */}
              <div className="relative mt-1.5 h-[3px] w-full rounded-full bg-ui-line">
                <div
                  className="h-[3px] rounded-full"
                  style={{
                    width: `${((s.v + 1) / 2) * 100}%`,
                    background: s.near ? 'var(--color-cal-1)' : 'var(--color-cal-3)',
                  }}
                />
                <span
                  aria-hidden
                  className="absolute top-[-3px] left-1/2 h-[9px] w-px bg-ui-faint/60"
                />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[0.5625rem] text-ui-faint">
                <span>−1</span>
                <span>0</span>
                <span>1</span>
              </div>
            </li>
          ))}
        </ul>
      </Figure>

      <Because>
        The model was never told these are about cars — the numbers carry the
        meaning. It runs <span className="text-ui-fg">on this machine</span>: a
        130 MB model, no network, no key, which is why{' '}
        {UNITS.complaints.toLocaleString('en-GB')} people's accounts of crashes,
        fires and 53 deaths never leave the building. Measured on the sibling
        corpus, local scored recall@k 0.813 against the paid model's 0.813 — so
        this is a decision about the data that costs no accuracy to make.
      </Because>

      <Because>
        <span className="text-ui-fg">
          And this is the stage where the corpus taught the machinery something.
        </span>{' '}
        The model pads every text in a batch to the longest one in that batch, so
        sorting the passages by length before batching is{' '}
        <span className="text-ui-fg">58% faster for identical vectors</span> —
        and the real run came in at 36.6 minutes, 22% under the projection,
        because sorting all 73,442 makes every batch more uniform than sorting a
        sample does. That belongs in{' '}
        <Mono>@fde/grounding</Mono> rather than here, because it is not
        safety-specific — and it is invisible at 555 chunks, which is why three
        engagements went past it. The first corpus nobody wrote for us is the
        first one big enough to find it.
      </Because>

      <Because>
        The vectors are written as NDJSON — one record a line, flushed every
        4,000 and resumable from whatever is on disk. 641 MB on disk against 108
        MB in memory, because a float serialises as{' '}
        <Mono>0.019854292273521423</Mono>: twenty characters of double precision
        out of a model that computed a float32.
      </Because>

      <EmbedModal />
    </Stage>
  );
}

function Index() {
  return (
    <Stage
      n="3.4"
      verb="INDEX — where the passages live"
      when="once, offline"
      plain="One Postgres table. Each row is one passage and carries two searchable forms of the same text — which is the entire hybrid idea, sitting in a schema."
    >
      <Figure
        caption="the whole store"
        from="pending"
        source="Neon eu-central-1 · empty, and `vector` not installed yet"
      >
        <Code
          path="the whole store — one table"
          lang="sql"
          note="not created yet"
          mark={[3, 4]}
          lines={[
            'CREATE TABLE complaint_chunks (',
            '  id         uuid PRIMARY KEY,',
            '  content    text,        -- the passage, for reading and quoting',
            '  vector     vector(384), -- for MEANING   (3.5, arm A)',
            '  content_ts tsvector,    -- for KEYWORDS  (3.5, arm B)',
            '  metadata   jsonb        -- for FILTERING (make, year, deaths…)',
            ');',
          ]}
        />
      </Figure>

      <Because>
        <Mono>vector</Mono> and <Mono>content_ts</Mono> are two different indexes
        over <span className="text-ui-fg">the same words</span>, and they are
        both there because they fail at different things. Everything stage 3.5
        does is asking them both and stage 3.6 is deciding who was right.
      </Because>

      <Because>
        <span className="text-ui-fg">
          This is the first stage that leaves this machine
        </span>
        , which makes it the first that can fail for reasons unrelated to our
        code. And the whole stage turns on one method call:{' '}
        <Mono>addVectors</Mono> inserts what stage 3.3 made, while{' '}
        <Mono>addDocuments</Mono> would recompute all of it — 36.6 minutes, with
        no error, nothing that looks wrong, and the same row count either way.
      </Because>

      <Because>
        It ran in 1.1 minutes, and{' '}
        <span className="text-ui-fg">
          the storage came in at more than twice what was predicted
        </span>{' '}
        — 295 MB rather than 140, which is 58% of the free tier rather than 27%.
        The estimate extrapolated 2,002 bytes a row from the sibling engagement,
        and that measurement predates the full-text column.{' '}
        <Mono>content_ts</Mono> and its index are 69 MB, a quarter of the table.
      </Because>

      <Because>
        Which corrects something this page has implied twice.{' '}
        <Mono>vector</Mono> and <Mono>content_ts</Mono> being two indexes over
        the same words is true, and it left the impression that the second is
        free.{' '}
        <span className="text-ui-fg">The keyword arm has a price</span>, and this
        is the first corpus here big enough to show it.
      </Because>

      <IndexModal />
    </Stage>
  );
}

function Retrieve() {
  const armA = ['11416775', '19V620000', '20V425000'];
  const armB = ['11592935', '20V197000', '11624180'];

  return (
    <Stage
      n="3.5"
      verb="RETRIEVE — two arms, because one is not enough"
      when="every question"
      plain="Ask both, independently, at the same time. One arm matches meaning and the other matches words, and on this corpus neither is optional."
    >
      <Figure caption="the two arms, as they are built" source="apps/ai/safety/src/grounding/search.ts">
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              name: 'arm A — meaning',
              sub: 'pgvector cosine over vector(384), bge-small',
              tone: 'var(--color-cal-1)',
              good: 'Matches “gearbox shows the wrong gear” to “display indicates I am in the wrong gear”, with no shared words.',
            },
            {
              name: 'arm B — keywords',
              sub: 'ts_rank over content_ts + its GIN index',
              tone: 'var(--color-cal-2)',
              good: 'Matches what arm A is worst at — a campaign number, a fault code, an ODI reference.',
            },
          ].map((arm) => (
            <div key={arm.name} className="rounded-lg border border-ui-line bg-ui-surface p-4">
              <p
                className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                style={{ color: arm.tone }}
              >
                {arm.name}
              </p>
              <p className="mt-0.5 font-mono text-[0.625rem] text-ui-faint">{arm.sub}</p>
              <p className="mt-3 text-[0.8125rem] leading-relaxed text-ui-dim">{arm.good}</p>
            </div>
          ))}
        </div>
      </Figure>

      <Because>
        Each arm is asked for <Mono>k × 4</Mono>, so a six-result question
        fetches 24 from each and fuses 48. A passage ranked 20th on meaning and
        2nd on keywords{' '}
        <span className="text-ui-fg">has to be in the lists before fusion</span>{' '}
        — fetching six from each would throw it away before the step that would
        have promoted it.
      </Because>

      <Because>
        This corpus is made of what arm A is worst at: <Mono>20V197000</Mono>,{' '}
        <Mono>{SPINE}</Mono>, <Mono>P0219A</Mono>, <Mono>PRNDL</Mono>. Ask a
        vector index for a campaign number and it returns things that{' '}
        <em>look like</em> campaign numbers. The keyword arm returns that
        campaign.
      </Because>

      <Figure
        caption="two ranked lists, for “recall 20V197000”"
        source="6 results in 1,474 ms"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            { name: 'arm A — meaning', list: armA, tone: 'var(--color-cal-1)' },
            { name: 'arm B — keywords', list: armB, tone: 'var(--color-cal-2)' },
          ].map((arm) => (
            <div key={arm.name} className="rounded-lg border border-ui-line bg-ui-surface p-4">
              <p
                className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                style={{ color: arm.tone }}
              >
                {arm.name}
              </p>
              <ol className="mt-3 grid gap-1.5">
                {arm.list.map((id, i) => (
                  <li key={id} className="flex items-baseline gap-3 font-mono text-[0.8125rem]">
                    <span className="text-ui-faint">{i + 1}.</span>
                    <span className={id === '20V197000' ? 'text-ui-fg' : 'text-ui-dim'}>{id}</span>
                    {id === '20V197000' && (
                      <span className="text-[0.625rem] text-ui-faint">← the campaign asked for</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Figure>

      <Because>
        Two lists that share no entries at all — which is what the next stage
        exists to resolve.
      </Because>

      <SearchModal />
    </Stage>
  );
}

/**
 * The hero figure.
 *
 * EVERY NUMBER IN IT IS COMPUTED BY `rrf()` FROM THE RANKS BESIDE IT, so the
 * table cannot drift from the formula printed above it and a reader who checks
 * the arithmetic finds it right.
 *
 * THE RESULTS ARE THE REAL ONES. `search.ts` was run against the loaded index
 * for "recall 20V197000"; these six are what came back, with their arms and
 * their ranks. The scores below are normalised to the top hit, which is how the
 * tool prints them — the raw sums are `1/(60+rank)` per arm, added.
 */
function Fuse() {
  const rows = [
    { id: '11416775', a: 1, b: null, what: '2020 Lincoln Corsair' },
    { id: '11592935', a: null, b: 1, what: '2020 Ford Ranger' },
    { id: '19V620000', a: 2, b: null, what: 'a campaign' },
    { id: '20V197000', a: null, b: 2, what: 'the campaign asked for' },
    { id: '20V425000', a: 3, b: null, what: 'a campaign' },
    { id: '11624180', a: null, b: 3, what: 'a complaint' },
  ].map((r) => ({
    ...r,
    total: rrf(...([r.a, r.b].filter((n): n is number => n !== null))),
  }));
  const top = Math.max(...rows.map((r) => r.total));

  return (
    <Stage
      n="3.6"
      verb="FUSE — two lists that do not share a scale"
      when="every question"
      plain="Arm A gives a similarity like 0.80. Arm B gives a keyword relevance like 0.41. They are different units, and adding them is like adding a temperature to a price. So the scores are thrown away and the positions are used instead."
    >
      <Figure caption={`reciprocal rank fusion · 1 / (${K} + rank), summed across the arms`}>
        <Raw>{`score = 1/(${K} + rank in arm A) + 1/(${K} + rank in arm B)`}</Raw>
      </Figure>

      <Because>
        The {K} is a convention from the original paper and its job is to stop
        the top slot dominating.{' '}
        <span className="text-ui-fg">
          A passage both arms like beats one that either arm loves
        </span>{' '}
        — which is the right instinct, made arithmetic.
      </Because>

      <Figure
        caption="what came back for “recall 20V197000”"
        source="pnpm safety:search · 6 of 48 fused"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse font-mono text-[0.8125rem]">
            <thead>
              <tr className="text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
                <th className="pb-2 text-left font-normal">passage</th>
                <th className="pb-2 text-right font-normal">meaning</th>
                <th className="pb-2 text-right font-normal">keywords</th>
                <th className="pb-2 text-right font-normal">score</th>
                <th className="pb-2 pl-5 text-left font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const asked = r.id === '20V197000';
                return (
                  <tr key={r.id} className="border-t border-ui-line">
                    <td className={`py-2.5 ${asked ? 'text-ui-fg' : 'text-ui-dim'}`}>{r.id}</td>
                    <td className="py-2.5 text-right text-ui-dim">
                      {r.a === null ? <span className="text-ui-faint">·</span> : r.a}
                    </td>
                    <td className="py-2.5 text-right text-ui-dim">
                      {r.b === null ? <span className="text-ui-faint">·</span> : r.b}
                    </td>
                    <td
                      className="py-2.5 text-right"
                      style={{ color: asked ? 'var(--color-cal-2)' : 'var(--color-ui-dim)' }}
                    >
                      {(r.total / top).toFixed(4)}
                    </td>
                    <td className="py-2.5 pl-5 text-[0.6875rem] text-ui-faint">{r.what}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Figure>

      <Because>
        <span className="text-ui-fg">
          Every one of the six was found by one arm only.
        </span>{' '}
        The dots are not missing data — they are an arm that did not return that
        passage at all. So the scores pair off exactly, and fusion, whose whole
        mechanism is rewarding agreement, has nothing to agree about: it
        interleaves the two lists rather than reordering them.
      </Because>

      <Because>
        And <Mono>20V197000</Mono>, the literal campaign number in the question,
        comes back fourth of six. It is not first in its own arm either — keyword
        rank 1 went to a complaint reading{' '}
        <Mono>“ford is recalling certain 2020 ranger and f-15…”</Mono>, because{' '}
        <Mono>to_tsquery('english')</Mono> matches the common word{' '}
        <em>recall</em> across thousands of documents.
      </Because>

      <Because>
        On the queries run so far, that is the pattern — and if it holds across
        the eval set, fusion cannot promote what neither arm ranked highly. One
        query is a smoke test and not a scorecard, so stage 3.7 is what settles
        it.{' '}
        <span className="text-ui-fg">
          The same fuser fails the opposite way on the sibling engagement
        </span>
        : there the arms mostly agree, so a single-arm hit gets buried by
        corroborated ones — two of its eight cases. Same code, two corpora,
        opposite failure modes, and the argument for a reranker in both.
      </Because>

      <FuseModal />
    </Stage>
  );
}

function Measure() {
  return (
    <Stage
      n="3.7"
      verb="MEASURE — did we find what we already knew?"
      when="every question"
      plain="The answers were written by hand first, before any of this existed. So the only question worth asking at this stage is whether the document we already know is right comes back in the top six."
    >
      <Figure
        caption="recall@6"
        from="pending"
        source="docs/safety/WALKTHROUGH.md — the answer key"
      >
        <Raw>{`recall@6  =  how many known-right DOCUMENTS were in the top 6
             ─────────────────────────────────────────────────
             how many known-right documents there are

REC-001   "is the F-150 park problem fixed?"
          is ODI 11353867 in the top 6?`}</Raw>
      </Figure>

      <Because>
        <span className="text-ui-fg">Documents, not passages</span>, and the
        distinction decides the number. The answer key names things a person can
        look up — <Mono>ODI {SPINE}</Mono>, campaign <Mono>20V197000</Mono> —
        while the index holds passages, and one investigation can be{' '}
        <Mono>RQ24011#0</Mono> and <Mono>RQ24011#1</Mono>. Left alone, one
        document could occupy two of the six slots and identical retrieval would
        score differently depending on how the chunker happened to cut. So hits
        are deduplicated by document before anything is counted.
      </Because>

      <Figure caption="two numbers, one variable" source="apps/ai/safety/src/cli/measure.ts">
        <Raw>{`pnpm safety:measure                 3.7a  hybrid alone      the baseline
RERANK=local pnpm safety:measure    3.7b  the same, reranked`}</Raw>
      </Figure>

      <Because>
        Same questions, same corpus,{' '}
        <span className="text-ui-fg">same code path</span> — search reads{' '}
        <Mono>RERANK</Mono> from the environment rather than taking a flag,
        precisely so the harness cannot call something different and report it as
        a different pipeline. Turn the reranker on from the start and you learn
        one number, which cannot answer whether it helped or whether the chunking
        was simply fine.
      </Because>

      <Figure caption="three cases, and each is a different shape of question" from="worked" source="docs/safety/WALKTHROUGH.md · n=3">
        <div className="grid gap-4">
          {[
            {
              id: 'REC-001',
              q: 'We run 2020 F-150s. Is the transmission park problem a known defect, and is the fix holding?',
              needs: 'campaign 20V197000 and ODI 11353867, both in the top 6 · scored out of 2',
              why: 'Either alone gives a wrong answer. The campaign alone says “fixed”; the complaint alone says “unknown defect”.',
            },
            {
              id: 'REC-004',
              q: 'Are there any complaints involving a death on the 2019–2020 Tesla Model 3?',
              needs: 'as many of the 5 death complaints as 6 slots allow · scored out of 5',
              why: 'A plain recall question with a known set of right answers, and more of them than there are slots.',
            },
            {
              id: 'REC-005',
              q: 'Is there a recall for the forward-collision braking on the 2019–2020 Honda Odyssey?',
              needs: 'at least one Odyssey forward-collision complaint, and no recall mis-cited',
              why: 'THE NEGATIVE CASE. No campaign covers it — verified, zero. So there is no document to find, and scoring it 0 would punish retrieval for being right while scoring it 1 would reward it for nothing.',
              negative: true,
            },
          ].map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-ui-line bg-ui-surface p-4"
              style={c.negative ? { borderColor: 'color-mix(in oklab, var(--color-cal-2) 40%, var(--color-ui-line))' } : undefined}
            >
              <p
                className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
                style={{ color: c.negative ? 'var(--color-cal-2)' : 'var(--color-cal-1)' }}
              >
                {c.id}
              </p>
              <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-ui-fg/90">
                “{c.q}”
              </p>
              <p className="mt-2.5 font-mono text-[0.6875rem] text-ui-faint">{c.needs}</p>
              <p className="mt-2.5 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ui-dim">
                {c.why}
              </p>
            </div>
          ))}
        </div>
      </Figure>

      <Because>
        What retrieval owes the model on the negative case is{' '}
        <span className="text-ui-fg">the evidence for the absence</span> — the
        400 complaints showing owners reporting the problem with no campaign
        behind it. That is what lets an answer say “no recall covers this, and
        here is why it is still worth your time”. The run also reports any recall
        document that came back, because citing a loosely-related campaign is
        exactly how this question gets answered wrongly.
      </Because>

      <Because>
        <span className="text-ui-fg">n = 3.</span> Three cases, each worth a
        third — enough to tell “works” from “does not”, and nowhere near enough
        to rank two chunking strategies against each other. It is said here
        because a number printed without its denominator gets quoted without it.
      </Because>

      <Figure caption="what came back" source="pnpm safety:measure · n=3 · docs/safety/evals/">
        <div className="flex flex-wrap items-baseline gap-x-12 gap-y-4">
          {[
            { k: '3.7a', v: '0.40', how: 'hybrid alone' },
            { k: '3.7b', v: '0.40', how: 'the same run, reranked' },
          ].map((n) => (
            <div key={n.k}>
              <p className="font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
                {n.k} · {n.how}
              </p>
              <p className="mt-1 font-mono text-3xl text-ui-fg">{n.v}</p>
            </div>
          ))}
        </div>
      </Figure>

      <Because>
        <span className="text-ui-fg">
          The same number twice, and that is the result rather than a
          disappointment.
        </span>{' '}
        The reranker did work — it moved one hit from 36th to 1st and another
        from 3rd to 1st. The score did not budge, because the documents the
        answer key names were sitting at ranks 93, 121, 1,169, 1,239, 2,271 and
        3,026. The reranker was handed the top 50. Not one of them was in it.
      </Because>

      <Because>
        So it reordered a pile that did not contain the answer, perfectly.{' '}
        <span className="text-ui-fg">A reranker reorders; it cannot fetch.</span>{' '}
        The diagnosis is not “found it, ranked it badly” — it is “never found
        it”, and no reranker fixes that, nor would a better one.
      </Because>

      <Because>
        The reason is in the questions.{' '}
        <Mono>2020 F-150</Mono>, <Mono>Tesla Model 3</Mono>,{' '}
        <Mono>involving a death</Mono> are structured fields already sitting in
        the database — make, model, year, death count — and search is treating
        them as words.{' '}
        <span className="text-ui-fg">
          These are filters wearing the clothes of questions.
        </span>{' '}
        The F-150 one matches 54,541 documents on ordinary vocabulary alone, and
        the right answer drowns. Filter first and the same corpus returns exactly
        the five Tesla complaints, and moves {SPINE} from rank 3,026 to rank 8.
      </Because>

      <Because>
        Which says what to build next, and it is not a better model. The machine
        needs to read “2020 F-150” as a{' '}
        <span className="text-ui-fg">filter rather than a phrase</span> — a tool
        it can call with structured arguments. That is the lesson the insurance
        engagement already carries in <Mono>get_policyholder</Mono>, reached
        again here on a completely different corpus:{' '}
        <span className="text-ui-fg">
          a question with one exact answer is a lookup, not a search.
        </span>
      </Because>

      <Because>
        And <span className="text-ui-fg">0.40 is flattered.</span> REC-005 scored
        1.00 against a bar of “return any one of 400 documents”, which is nearly
        impossible to fail; the two hard cases scored 0.00 and 0.20. With n=3
        that is enough to say retrieval alone tops out here, and not enough for
        anything finer.
      </Because>

      <MeasureModal />

      <Figure caption="a number from elsewhere" from="target" source="Vantis Steering, docs/steering/evals/RETRIEVAL.md">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <span className="font-mono text-2xl text-ui-dim">0.813</span>
          <span className="max-w-[48ch] text-[0.8125rem] leading-relaxed text-ui-dim">
            measured on the sibling engagement, on a corpus somebody here wrote,
            counted over its own units.{' '}
            <span className="text-ui-fg">
              It is deliberately not set beside the 0.40 above.
            </span>{' '}
            A different corpus with an unconfirmed denominator, placed next to
            ours, would measure the counting rule rather than the retrieval — and
            the comparison a reader would draw from the two numbers side by side
            is one neither of them supports.
          </span>
        </div>
      </Figure>

      <Because>
        Before: we believe search works, because the results look plausible.
        After: a number, and we know which passages it misses{' '}
        <span className="text-ui-fg">by name</span>. That is the whole point of
        measuring before improving — change the chunker and you can say whether
        it helped, instead of admiring the output.
      </Because>
    </Stage>
  );
}

/**
 * What is deliberately not being built. It is a section rather than a caveat
 * for the same reason the landing gives the refusal one: the order is the
 * argument, and a reader who skips it will assume the missing pieces were
 * forgotten rather than sequenced.
 */
/**
 * Why the reranker is a second number rather than a default.
 *
 * THIS SECTION USED TO SAY IT WAS MISSING and it is built now — but built and
 * ON are different things, and the difference is the whole argument. It is
 * optional, off unless `RERANK=local` is set, and stage 3.7 reports the
 * pipeline with and without it. A reranker turned on from the start gives you
 * one number, which cannot answer whether it helped.
 */
function NotYet() {
  return (
    <section className="lift-in mt-20 border-t border-ui-line pt-10">
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        The reranker is built and off
      </h2>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        <Mono>RERANK=local</Mono> is the only thing that changes between the two
        numbers stage 3.7 reports. Measure the plain pipeline first or you
        cannot say what the reranker bought — and on the sibling engagement it
        bought 0.813 → 0.938, which is exactly the size of gain worth knowing
        rather than assuming.
      </p>
      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        The other three things this page used to list here — the answer
        contract, the loop and the evals — are not missing from grounding. They
        are the rest of the build, and they have tabs of their own above.
      </p>
    </section>
  );
}

/**
 * 3.6b — the optional second pass.
 *
 * IT SITS BETWEEN FUSE AND MEASURE because that is where it runs, and because
 * the thing it is for only makes sense after a reader has seen two lists being
 * interleaved: a reordering step is worth having when the order is the problem,
 * and worth nothing when it is not.
 */
function Rerank() {
  return (
    <Stage
      n="3.6b"
      verb="RERANK — reading, instead of remembering"
      when="every question"
      plain="Everything so far compares two summaries made separately: the passage was turned into numbers long before the question existed. A reranker reads the question and one passage together and says how well one answers the other — much better judgement, far too slow to run on everything."
    >
      <Figure caption="so it runs on 50, not on 73,442" source="off unless RERANK=local">
        <Raw>{`cheap search finds 50 candidates     fast, indexed, a bit blunt
the reranker reads all 50 properly   slow, no index, sharp
keep the best 6                      what the model sees`}</Raw>
      </Figure>

      <Because>
        50 and not 6, deliberately. The whole value is promoting something the
        first pass ranked <span className="text-ui-fg">below the cut</span> —
        rerank only what you would have shown anyway and you have measured
        nothing.
      </Because>

      <Because>
        <span className="text-ui-fg">
          And a reranker cannot find anything. It can only reorder what it was
          handed.
        </span>{' '}
        If the right passage is not among those 50, no amount of re-reading puts
        it in the top 6 — which makes it a diagnostic as much as a fix. If it
        helps, the problem was “found it, ranked it badly”. If it does not, the
        problem was “never found it”, and the answer is better chunking or a
        wider pool rather than a smarter scorer.
      </Because>

      <Because>
        <span className="text-ui-fg">
          Which is what happened when it was measured.
        </span>{' '}
        It promoted a hit from 36th to 1st and another from 3rd to 1st — working
        exactly as intended — and stage 3.7's number did not move, because the
        documents that mattered were never in the fifty. That is the ceiling
        above, arriving as a measurement rather than as an argument.
      </Because>

      <RerankModal />
    </Stage>
  );
}

/**
 * The five ways to retrieve, and which of them this corpus actually exercises.
 *
 * IT IS ON THIS PAGE RATHER THAN IN `/learn` because the interesting column is
 * the last one — what each pattern is worth HERE — and that is a statement
 * about this corpus, not about the pattern. `/learn` already teaches the five;
 * this says which two stopped being theoretical when the data got real.
 */
function Patterns() {
  const rows = [
    {
      name: 'hybrid',
      status: 'built, measured',
      here: 'The core. Campaign numbers and fault codes are exactly what dense search misses.',
      live: true,
    },
    {
      name: 'corrective',
      status: 'narrower here',
      here: 'Worth building and small, and its meaning here is not the textbook one. The generic version — grade the results, re-retrieve if poor — would have judged REC-001’s results junk and fetched the same junk again, because the query was never the problem. Here every correction is a FILTER correction: an empty recall list means widen the component before concluding none exists; a count of zero means the filter is wrong, not the corpus.',
      live: true,
    },
    {
      name: 'agentic',
      status: 'stages 4 and 5',
      here: 'Not an extra to schedule for later. A model choosing between five tools and calling one after another IS agentic retrieval — so it is not a pattern this engagement might adopt, it is what stages 4 and 5 are.',
      live: true,
    },
    {
      name: 'graph',
      status: 'measured · one hop',
      here: 'Real, and shallower than the documented version. The investigation → recall link resolves 14 times. The edge that works is owners typing a campaign number into their own complaint: 5,361 complaints name one, 563 resolve to a recall we hold. One hop is a lookup — no graph store, no node embeddings, one more tool.',
      live: true,
    },
    {
      name: 'multimodal',
      status: 'not applicable',
      here: 'There are no images in this slice. The earlier note here said recall documents are PDFs; the corpus is flat files, so it was wrong and is gone.',
      live: false,
    },
  ];

  return (
    <section className="lift-in mt-16 border-t border-ui-line pt-10">
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        Five ways to retrieve, and which two this corpus makes real
      </h2>
      <p className="mt-3 max-w-[64ch] leading-relaxed text-ui-dim">
        The patterns are the same five the firm teaches. What changes on real
        data is which of them stop being an argument — and after stage 3.7,
        three of the five have measured answers rather than opinions.
      </p>

      <ul className="mt-7 grid gap-4">
        {rows.map((r) => (
          <li
            key={r.name}
            className="grid gap-x-5 gap-y-1 border-t border-ui-line pt-3 md:grid-cols-[8rem_9rem_1fr]"
          >
            <span
              className="font-mono text-sm"
              style={{ color: r.live ? 'var(--color-cal-1)' : 'var(--color-ui-dim)' }}
            >
              {r.name}
            </span>
            <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
              {r.status}
            </span>
            <span className="max-w-[56ch] text-[0.8125rem] leading-relaxed text-ui-dim">
              {r.here}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Onward() {
  return (
    <section className="lift-in mt-14">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          to="/data-flow"
          className="font-mono text-sm text-cal-1 transition-colors hover:text-ui-fg"
        >
          Where the data goes →
        </Link>
        <Link to="/" className="font-mono text-sm text-ui-dim transition-colors hover:text-ui-fg">
          ← back to the question
        </Link>
      </div>
    </section>
  );
}
