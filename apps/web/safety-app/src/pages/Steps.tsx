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
        <Onward />
      </main>

      <footer className="relative z-10 mx-auto max-w-5xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
        Written before the code, from <Mono>docs/safety/INGESTION.md</Mono>. Nothing on this page has
        been built.
      </footer>
    </div>
  );
}

function Head() {
  return (
    <section className="pt-8 pb-12 md:pt-12">
      <p className="lift-in font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
        seven stages · none of them built
      </p>

      <h1 className="lift-in title-spectrum mt-4 max-w-3xl font-mono text-[1.6rem] leading-[1.1] font-semibold tracking-tighter sm:text-[2.25rem]">
        From a line in a file to an answer
      </h1>

      <p
        className="lift-in mt-5 max-w-[62ch] leading-relaxed text-ui-dim"
        style={{ animationDelay: '90ms' }}
      >
        One complaint — <Mono>ODI {SPINE}</Mono>, a 2020 Ford F-150 whose gear
        display disagreed with its gearbox — followed from a tab-separated line
        in a 1.5 GB file to the passage that answers a question about it. This is
        the plan, written down to be argued with before it is written in code.
      </p>
    </section>
  );
}

/**
 * The shape of the whole thing: four stages that happen once and three that
 * happen every time somebody asks. The split is the single most useful thing on
 * the page for anybody deciding what this costs to run.
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
    <section
      className="lift-in grid gap-8 border-t border-ui-line pt-10 md:grid-cols-2"
      style={{ animationDelay: '140ms' }}
    >
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
    { q: 'F-150 transmission will not go into park', v: 0.8035, near: true },
    { q: 'windscreen wiper motor failure', v: 0.557, near: false },
  ];

  return (
    <Stage
      n="3.3"
      verb="EMBED — words into numbers"
      when="once, offline"
      plain="A computer cannot compare meanings. An embedding model turns a piece of text into a list of numbers — 384 of them here — arranged so that texts meaning similar things get similar lists."
    >
      <Figure caption={`bge-small, run for complaint ${SPINE}`} source="384 dims · first 8 shown">
        <Raw>{`text    "2020 FORD F-150 | POWER TRAIN | filed 2020-09-08
         THE GEAR WILL NOT GO INTO PARK…"

vector  -0.0609  -0.0364   0.0624   0.0009
        -0.0165   0.0766  -0.0246   0.0202   … 376 more`}</Raw>
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
        meaning. Two things follow that matter more here than elsewhere. It runs{' '}
        <span className="text-ui-fg">on this machine</span>: a 130 MB model, no
        network, no key, which is the reason{' '}
        {UNITS.complaints.toLocaleString('en-GB')} people's narratives never
        leave the building. And it has to be batched — feeding all of them at
        once asks for a single 35 GB tensor and dies. That was already hit and
        fixed at 64 at a time.
      </Because>
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
    </Stage>
  );
}

function Retrieve() {
  const armA = ['11353867', '11412093', '11298441'];
  const armB = ['11298441', '11353867', '11501233'];

  return (
    <Stage
      n="3.5"
      verb="RETRIEVE — two arms, because one is not enough"
      when="every question"
      plain="Ask both, independently, at the same time. One arm matches meaning and the other matches words, and on this corpus neither is optional."
    >
      <Figure
        caption="question: “F-150 will not go into park after the recall”"
        from="worked"
        source="docs/safety/INGESTION.md §3.5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            { name: 'arm A — meaning', sub: 'vectors', list: armA, tone: 'var(--color-cal-1)' },
            { name: 'arm B — keywords', sub: 'full text', list: armB, tone: 'var(--color-cal-2)' },
          ].map((arm) => (
            <div key={arm.name} className="rounded-lg border border-ui-line bg-ui-surface p-4">
              <p className="font-mono text-[0.6875rem] tracking-[0.06em] uppercase" style={{ color: arm.tone }}>
                {arm.name}
              </p>
              <p className="mt-0.5 font-mono text-[0.625rem] text-ui-faint">{arm.sub}</p>
              <ol className="mt-3 grid gap-1.5">
                {arm.list.map((odi, i) => (
                  <li key={odi} className="flex items-baseline gap-3 font-mono text-[0.8125rem]">
                    <span className="text-ui-faint">{i + 1}.</span>
                    <span className={odi === SPINE ? 'text-ui-fg' : 'text-ui-dim'}>ODI {odi}</span>
                    {odi === SPINE && (
                      <span className="text-[0.625rem] text-ui-faint">← the one we are following</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Figure>

      <Because>
        Arm A is good at “gearbox shows the wrong gear” matching “display
        indicates I am in the wrong gear” with no shared words. Arm B is good at
        exactly what arm A is worst at — and this corpus is made of it:{' '}
        <Mono>20V197000</Mono>, <Mono>{SPINE}</Mono>, <Mono>P0219A</Mono>,{' '}
        <Mono>PRNDL</Mono>. Ask a vector index for a campaign number and it
        returns things that <em>look like</em> campaign numbers. The keyword arm
        returns that campaign.
      </Because>

      <Because>
        Which leaves two ranked lists that disagree about first place. That is
        not a failure of either arm; it is the normal case, and it is what the
        next stage is for.
      </Because>
    </Stage>
  );
}

/**
 * The hero figure.
 *
 * EVERY NUMBER IN IT IS COMPUTED BY `rrf()` FROM THE RANKS BESIDE IT. The whole
 * argument rests on a 0.8% margin, so a typed total that drifted from the
 * formula printed next to it would be the worst possible error on this page:
 * invisible, and in the one place a careful reader checks.
 */
function Fuse() {
  const rows = [
    { odi: SPINE, a: 1, b: 2 },
    { odi: '11298441', a: 3, b: 1 },
  ].map((r) => ({ ...r, total: rrf(r.a, r.b) }));
  const winner = rows.reduce((best, r) => (r.total > best.total ? r : best));

  return (
    <Stage
      n="3.6"
      verb="FUSE — two lists that do not share a scale"
      when="every question"
      plain="Arm A gives a similarity like 0.80. Arm B gives a keyword relevance like 0.41. They are different units, and adding them is like adding a temperature to a price. So the scores are thrown away and the positions are used instead."
    >
      <Figure caption={`reciprocal rank fusion · 1 / (${K} + rank), summed`} from="worked">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse font-mono text-[0.8125rem]">
            <thead>
              <tr className="text-[0.625rem] tracking-[0.08em] text-ui-faint uppercase">
                <th className="pb-2 text-left font-normal">passage</th>
                <th className="pb-2 text-right font-normal">arm A</th>
                <th className="pb-2 text-right font-normal">arm B</th>
                <th className="pb-2 text-right font-normal">total</th>
                <th className="pb-2 text-left font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const won = r.odi === winner.odi;
                return (
                  <tr key={r.odi} className="border-t border-ui-line">
                    <td className={`py-2.5 ${won ? 'text-ui-fg' : 'text-ui-dim'}`}>ODI {r.odi}</td>
                    <td className="py-2.5 text-right text-ui-dim">
                      rank {r.a} <span className="text-ui-faint">→ {(1 / (K + r.a)).toFixed(5)}</span>
                    </td>
                    <td className="py-2.5 text-right text-ui-dim">
                      rank {r.b} <span className="text-ui-faint">→ {(1 / (K + r.b)).toFixed(5)}</span>
                    </td>
                    <td
                      className="py-2.5 text-right"
                      style={{ color: won ? 'var(--color-cal-1)' : 'var(--color-ui-dim)' }}
                    >
                      {r.total.toFixed(5)}
                    </td>
                    <td className="py-2.5 pl-4 text-[0.6875rem] text-ui-faint">
                      {won ? 'wins' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Figure>

      <Because>
        <Mono>{SPINE}</Mono> never ranks first in the keyword arm and still wins,
        by {(rows[0].total - rows[1].total).toFixed(5)}. That is the right
        instinct made arithmetic:{' '}
        <span className="text-ui-fg">
          a passage both arms like beats one that either arm loves
        </span>
        . The {K} is a convention from the original paper, and its job is to stop
        the top slot dominating — without it the keyword arm's first place would
        simply win.
      </Because>
    </Stage>
  );
}

function Measure() {
  return (
    <Stage
      n="3.7"
      verb="MEASURE — did we find what we already knew?"
      when="every question"
      plain="The answers were written by hand first, before any of this existed. So the only question worth asking at this stage is whether the passage we already know is right comes back in the top six."
    >
      <Figure
        caption="recall@6"
        from="pending"
        source="docs/safety/WALKTHROUGH.md — the answer key"
      >
        <Raw>{`recall@6  =  how many known-right passages were in the top 6
             ─────────────────────────────────────────────────
             how many known-right passages there are

REC-001   "is the F-150 park problem fixed?"
          is ODI 11353867 in the top 6?`}</Raw>
      </Figure>

      <Figure caption="the bar to clear" from="target" source="Vantis Steering, docs/steering/evals/RETRIEVAL.md">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <span className="font-mono text-2xl text-ui-fg">0.813</span>
          <span className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ui-dim">
            measured on the sibling engagement, on a corpus somebody here wrote.
            It is <span className="text-ui-fg">not a Calder result</span> — there
            is no Calder result, because stage 3.1 has not run. It is the number
            this pipeline has to reach on data nobody wrote for us.
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
function NotYet() {
  const rows = [
    ['no model call', 'if search cannot find the passage, no model saves it'],
    ['no answer contract', 'stage 4 — it is written after the answer key, not before'],
    ['no tools, no agent', 'stage 5'],
    ['no reranker', 'measure the plain pipeline first, or you cannot say what the reranker bought'],
  ];

  return (
    <section className="lift-in mt-20 border-t border-ui-line pt-10">
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        What is deliberately not here yet
      </h2>
      <ul className="mt-6 grid gap-3">
        {rows.map(([what, why]) => (
          <li key={what} className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="w-44 shrink-0 font-mono text-sm text-ui-fg">{what}</span>
            <span className="max-w-[52ch] text-[0.8125rem] leading-relaxed text-ui-dim">{why}</span>
          </li>
        ))}
      </ul>
      <p className="mt-7 max-w-[64ch] leading-relaxed text-ui-dim">
        Stage 3.1 is next and it is only parsing: read one file, write one file,
        print three documents. Nothing below it gets built until somebody has
        looked at that output.
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
