/**
 * The seven stages, before any of them is built.
 *
 * ── THIS PAGE IS A PROPOSAL, NOT A RECORD ──────────────────────────────────
 *
 * The other three engagements' explanatory pages describe pipelines that run.
 * Nothing here runs. Stage 3.1 has not been written, nothing has been parsed,
 * embedded or stored, and the database is empty — so the page's whole job is to
 * be the thing somebody reads BEFORE agreeing to it, which means every number
 * on it has to say where it came from. Three provenances, and the kit badges
 * each one: `measured` (out of the NHTSA files, or produced by running the
 * thing described), `worked` (carried through by hand in the source document),
 * `target` (somebody else's measurement, quoted as the bar).
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
import { NotBuilt, StepTabs } from '../components/steps/Tabs';
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
        Written before the code, from <Mono>docs/safety/INGESTION.md</Mono>. One
        of the four parts exists; the other three are a plan being argued with.
      </footer>
    </div>
  );
}

/**
 * THE FOUR PARTS, IN DEPENDENCY ORDER, and only the first has anything in it.
 *
 * The order is not a preference. The answer contract is written after the
 * answer key exists; the loop is written after the contract; the evals need
 * something to score. So reading the bar left to right is reading the sequence
 * — and three quarters of it being empty is the honest state of a build that is
 * one stage into four.
 *
 * WHAT EACH EMPTY TAB SAYS came from the list this page used to carry as "what
 * is deliberately not here yet". That list was right and was in the wrong
 * place: each row is a whole part of the build rather than a footnote to the
 * part that exists.
 */
const TABS: StepTab[] = [
  {
    id: 'grounding',
    label: 'Grounding',
    stage: 'stage 3',
    status: 'seven stages',
    built: true,
    content: <Grounding />,
  },
  {
    id: 'contract',
    label: 'The answer contract',
    stage: 'stage 4',
    status: 'not written',
    built: false,
    content: (
      <NotBuilt
        title="What an answer is allowed to be"
        waits={[
          'The answer key has to exist first — written by hand from the raw files, so the shape of a right answer is known before anything is built that could grade itself.',
          'Retrieval has to be measured. A contract written against search that cannot find the passage would be a schema for a wrong answer.',
          'The refusal has to be decided: concluding that a remedy failed is a regulatory judgement, and the field that carries “these two records disagree” is what stops a model reaching it.',
        ]}
        what={
          <>
            <p>
              A schema every answer must satisfy — the finding, the ODI numbers
              and campaign numbers it rests on, the claims it could not support,
              the records that contradict each other, and who has to decide.
              Shape is checked first, then coherence: an answer naming a conflict
              and escalating to nobody is structurally valid and still wrong.
            </p>
            <p className="mt-3.5">
              On the three engagements before this one it is the field
              descriptions that do most of the work — they are prompt
              engineering, not documentation, which is why their own check fails
              if a field loses one.
            </p>
          </>
        }
        already={
          <>
            <Mono>@fde/schema</Mono> — parse, shape-check, then coherence rules —
            unchanged, as it was for the other three. What has to be written here
            is the judgement: which fields this domain needs, and which
            combinations of them are incoherent for a corpus of public filings.
          </>
        }
      />
    ),
  },
  {
    id: 'loop',
    label: 'The loop',
    stage: 'stage 5',
    status: 'not written',
    built: false,
    content: (
      <NotBuilt
        title="The model, and the two things it may ask for"
        waits={[
          'The contract has to exist, because the loop\'s job is to keep asking until it can fill one in.',
          'The tools have to be decided — search over the passages, and an exact lookup keyed on a campaign number, which is a lookup rather than a search because it has one right answer.',
          'Where the passages are sent has to be settled. This is the step where a member of the public’s account of their own crash leaves the machine, and it is the decision the data-flow page exists to have in the open before it is written.',
        ]}
        what={
          <>
            <p>
              A model, a loop, and the tools it is allowed to call. It searches,
              reads what comes back, decides whether that answers the question,
              and searches again if it does not — which is the difference between
              retrieval and an assistant.
            </p>
            <p className="mt-3.5">
              It is also the first stage that costs money and the first that can
              be wrong in a way no check catches, which is why it is last rather
              than first.
            </p>
          </>
        }
        already={
          <>
            <Mono>@fde/agent</Mono> — the tool-calling loop with three
            interchangeable engines behind <Mono>LOOP=</Mono>, and the compliance
            tests that assert the outgoing request carries no server-side
            conversation state. None of that is written again here.
          </>
        }
      />
    ),
  },
  {
    id: 'evals',
    label: 'Evals',
    stage: 'stage 6',
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
        Four parts, in the order they have to be built. The first is here in
        full — one complaint, <Mono>ODI {SPINE}</Mono>, a 2020 Ford F-150 whose
        gear display disagreed with its gearbox, followed from a tab-separated
        line in a 1.5 GB file to the passage that answers a question about it.
        The other three are written down and argued with, and not written.
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
        <Mono>docs/RETRIEVAL.md</Mono> calls the chunker “the highest-leverage
        file in the path”, and on a corpus of long documents it is — where you
        cut decides what can be found. Here it touches{' '}
        {UNITS.investigations} documents out of {inTotal.toLocaleString('en-GB')}.
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
        And nothing new was written to get here.{' '}
        <Mono>chunkDocument</Mono> is <Mono>@fde/grounding</Mono>'s, used by two
        other engagements unchanged — which is the claim{' '}
        <Mono>docs/TEMPLATE.md</Mono> makes, tested for the first time against a
        corpus nobody wrote for us, passing quietly.
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
        <Mono>RQ24011#0</Mono> and <Mono>RQ24011#1</Mono>. Hits are deduplicated
        by document before anything is counted, or the same finding scores twice
        and the measurement rewards the chunker for splitting.
      </Because>

      <Figure caption="a number from elsewhere" from="target" source="Vantis Steering, docs/steering/evals/RETRIEVAL.md">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <span className="font-mono text-2xl text-ui-dim">0.813</span>
          <span className="max-w-[48ch] text-[0.8125rem] leading-relaxed text-ui-dim">
            measured on the sibling engagement, on a corpus somebody here wrote,
            counted over its own units.{' '}
            <span className="text-ui-fg">
              It will not be printed beside Calder's number
            </span>{' '}
            when there is one — a different corpus with a different denominator,
            set next to ours, would measure the counting rule rather than the
            retrieval. It is here as context for what this kind of number looks
            like, and for nothing else.
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
 * What grounding itself is still missing.
 *
 * THIS LIST USED TO BE THE WHOLE BUILD'S and it was in the wrong place. Three
 * of its four rows — the contract, the loop, the evals — are entire parts of
 * the build and are tabs of their own now. What is left is the one that belongs
 * to grounding: the reranker, which is a stage 3 decision and not a later part.
 */
function NotYet() {
  return (
    <section className="lift-in mt-20 border-t border-ui-line pt-10">
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        One thing grounding is still missing, on purpose
      </h2>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="w-44 shrink-0 font-mono text-sm text-ui-fg">no reranker</span>
        <span className="max-w-[54ch] text-[0.8125rem] leading-relaxed text-ui-dim">
          3.6b, and it stays out until 3.7 has a number. Measure the plain
          pipeline first or you cannot say what the reranker bought — and on the
          sibling engagement it bought 0.813 → 0.938, which is exactly the size
          of gain that is worth knowing rather than assuming.
        </span>
      </div>
      <p className="mt-7 max-w-[64ch] leading-relaxed text-ui-dim">
        The other three things this page used to list here — the answer
        contract, the loop and the evals — are not missing from grounding. They
        are the rest of the build, and they have tabs of their own above.
      </p>
    </section>
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
      status: 'shape built',
      here: `Now measurable. With ${UNITS.complaints.toLocaleString('en-GB')} noisy narratives the top six are often all junk — rare at insurance's 555 chunks.`,
      live: true,
    },
    {
      name: 'agentic',
      status: 'built, measured',
      here: 'Stage 5 — the model choosing to search again.',
      live: false,
    },
    {
      name: 'graph',
      status: 'not built · 42 edges found',
      here: 'The one claim on this table that stopped being an opinion. Investigations carry a CAMPNO field — “the recall campaign initiated as a result of the investigation” — and 42 of the 114 fill it in. DP22005 → 22V063000 is an edge already in the file, with nothing to infer.',
      live: true,
    },
    {
      name: 'multimodal',
      status: 'not built',
      here: 'Recall documents are PDFs. Later, if ever.',
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
        data is which of them stop being an argument — and one of them stopped
        while this page was being written.
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
