/**
 * How it works — the build, one step at a time, for somebody new to all of it.
 *
 * ── THE REDESIGN OF 2026-09-27, AND WHO IT IS FOR ──────────────────────────
 *
 * This page used to be written for the people building it: monospace headings,
 * 11px uppercase labels, and the plan's own shorthand ("3.6 · FUSE"). It was
 * accurate and it was hard going for the reader it now has to serve — somebody
 * who arrived from a link about search, agents or evals and has read none of
 * `docs/safety/`. It now follows the design of Thornbury Goods' `/steps`
 * (`apps/web/commerce-app/src/pages/Steps.tsx`), ported rather than imported —
 * each deployment keeps its own parts. In order, the page:
 *
 *   1. says what was built and for whom, in two paragraphs;
 *   2. explains the three ideas you need first — search-then-answer, a model
 *      that asks for tools, and an answer key written before any code;
 *   3. draws the one picture that matters: who holds what, and where the
 *      complaints leave our machines;
 *   4. lists every step, so the shape is visible before any detail;
 *   5. then the steps themselves, each in the same five parts (see `kit.tsx`);
 *   6. and a glossary, which every step's "words to know" links into.
 *
 * ── WHAT DID NOT CHANGE: EVERY NUMBER SAYS WHERE IT CAME FROM ──────────────
 *
 * Plain language has one failure mode on a page like this: it drops the caveat
 * to make the sentence shorter. So every figure still carries its provenance
 * badge, and the numbers that are only honest with their caveat attached keep
 * it in the same sentence — 0.40 with n = 3, 1.00 with "hand-routed", 0.17–0.50
 * as a range, 28 of 28 beside 0 of 3. The one that would be a lie without its
 * badge is recall@6 0.813 in step 3.7: Vantis Steering's measurement on a
 * corpus somebody here wrote, quoted as the bar, never as Calder's.
 *
 * ── ONE COMPLAINT, ALL THE WAY THROUGH ─────────────────────────────────────
 *
 * ODI `11353867` — a 2020 Ford F-150 whose gear display disagreed with its
 * gearbox — is a tab-separated line in step 3.1 and a passage fighting for a
 * slot in 3.7. Twenty-nine abstractions are hard to hold; one thing happening
 * twenty-nine times is not.
 *
 * ── THE ARITHMETIC IN 3.6 IS COMPUTED, NOT TYPED ───────────────────────────
 *
 * `rrf()` runs the formula the paragraph beside it describes, so the table and
 * the formula cannot drift apart.
 *
 * Where each stage lives: stages 1–3 are in this file; 4–7 are
 * `components/steps/Stage4.tsx`–`Stage7.tsx`. Step names and counts come from
 * `lib/steps.ts`, and the words from `lib/glossary.ts`.
 */
import { useCallback, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Aurora, Code, Data } from '@veresk/surface';
import { BeforeAfter, Figure, GlossaryProvider, Note, Numbers, Raw, Step, Table } from '@veresk/learn/steps';
import { PhaseHead, PhaseTabs } from '@veresk/learn/steps';
import type { PhaseTab } from '@veresk/learn/steps';
import { SafetyBigPicture } from '../components/steps/SafetyBigPicture';
import { ParserModal } from '../components/steps/ParserModal';
import { ChunkerModal } from '../components/steps/ChunkerModal';
import { EmbedModal } from '../components/steps/EmbedModal';
import { IndexModal } from '../components/steps/IndexModal';
import { FuseModal, SearchModal } from '../components/steps/SearchModal';
import { RerankModal } from '../components/steps/RerankModal';
import { MeasureModal } from '../components/steps/MeasureModal';
import { Stage4 } from '../components/steps/Stage4';
import { Stage5 } from '../components/steps/Stage5';
import { Stage6 } from '../components/steps/Stage6';
import { Stage7 } from '../components/steps/Stage7';
import { AURORA } from '../lib/aurora';
import { ROWS, UNITS } from '../lib/estate.generated';
import { VERESK } from '../lib/links';
import { GLOSSARY, GLOSSARY_ORDER, termId } from '../lib/glossary';
import type { TermKey } from '../lib/glossary';
import { ALL_STEPS, STAGES, STAGE_OF, TITLES, WHEN, inWords } from '../lib/steps';

/** The complaint this page follows, start to finish. */
const SPINE = '11353867';

/** Investigations are the only documents the chunker cuts: 114 in, 222 out. */
const INVESTIGATION_PASSAGES = 222;

/** Every passage in the index — complaints and recalls whole, investigations cut. */
const PASSAGES = UNITS.complaints + UNITS.recalls + INVESTIGATION_PASSAGES;

/** Every document in the corpus, before chunking. */
const DOCUMENTS = UNITS.complaints + UNITS.recalls + UNITS.investigations;

/**
 * Reciprocal Rank Fusion, as step 3.6 describes it. `k = 60` is the convention
 * from the original paper; its job is to stop the top slot dominating.
 */
const K = 60;
const rrf = (...ranks: number[]) => ranks.reduce((sum, r) => sum + 1 / (K + r), 0);

const n = (x: number) => x.toLocaleString('en-GB');

/** Counted from `STAGES`, not typed: "seven stages, none built" was once true too. */
const ALL_STAGES_LABEL = `${ALL_STEPS.length} steps in ${inWords(STAGES.length)} stages, all built`;

/**
 * THE SEVEN STAGES, IN DEPENDENCY ORDER. `STAGES` (lib/steps.ts) holds the ids,
 * names and step lists; this adds only what each tab renders.
 */
const CONTENT: Record<string, React.ReactNode> = {
  corpus: <PhaseData />,
  key: <PhaseKey />,
  grounding: <PhaseSearch />,
  tools: <Stage4 />,
  contract: <Stage5 />,
  loop: <Stage6 />,
  evals: <Stage7 />,
};

const PHASES: PhaseTab[] = STAGES.map((s) => ({ ...s, content: CONTENT[s.id] }));

/** The page's glossary, handed to the kit: a step's "words to know" link here. */
const GLOSSARY_VALUE = {
  entries: GLOSSARY,
  idOf: (key: string) => termId(key as TermKey),
};

export function Steps() {
  const [active, setActive] = useState(PHASES[0].id);
  const goToStep = useGoToStep(setActive);

  return (
    <div className="cal-howto relative min-h-screen overflow-hidden">
      <GlossaryProvider value={GLOSSARY_VALUE}>
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
            The data travels left to right. The important part is the dashed line
            near the end — the one place where what the public wrote leaves
            machines we control.
          </p>
          <SafetyBigPicture passages={PASSAGES} />
        </section>
        <Roadmap onGo={goToStep} />
        <section className="mt-20" aria-labelledby="steps-title">
          <h2 id="steps-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
            The steps
          </h2>
          <p className="mt-2 mb-6 max-w-[64ch] text-[1.0625rem] leading-relaxed text-ui-dim">
            Grouped into {inWords(STAGES.length)} stages. Each step is laid out the
            same way: what it does in plain words, why it matters, the code and
            what it printed, and what we learned doing it.
          </p>
          <PhaseTabs tabs={PHASES} active={active} onActivate={setActive} />
        </section>
        <Glossary />
        <Limits />
      </main>
      <Footer />
      </GlossaryProvider>
    </div>
  );
}

/**
 * Open the stage a step lives in, then scroll to the step.
 *
 * WHY THE `requestAnimationFrame`. Only the active panel is rendered, so the
 * step being scrolled to DOES NOT EXIST at the moment the tab is switched.
 * Waiting a frame lets React commit the new panel first; without it the scroll
 * silently does nothing.
 */
function useGoToStep(setActive: (id: string) => void) {
  return useCallback(
    (step: string) => {
      const stage = STAGE_OF.get(step);
      if (!stage) return;
      setActive(stage);
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
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cal-1/15 text-cal-1 ring-1 ring-cal-1/30" aria-hidden>
          <ShieldGlyph />
        </span>
        Calder Safety
      </Link>
      <Link to="/desk" className="text-[0.9375rem] text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto">
        Ask it
      </Link>
      <span
        aria-current="page"
        className="text-[0.9375rem] font-semibold text-ui-fg underline decoration-cal-1 decoration-2 underline-offset-[6px]"
      >
        How it works
      </span>
      <Link to="/data-flow" className="text-[0.9375rem] text-ui-dim transition-colors hover:text-ui-fg">
        Where the data goes
      </Link>
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

function ShieldGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* ── THE TOP ────────────────────────────────────────────────────────────── */

function Hero({ onGo }: { onGo: (step: string) => void }) {
  return (
    <section className="pt-8 pb-4 md:pt-14">
      <h1 className="lift-in max-w-[24ch] text-[2.25rem] leading-[1.12] font-bold tracking-tight text-ui-fg sm:text-[3rem]">
        How we built Calder’s recall assistant, step by step
      </h1>

      <div className="lift-in cal-prose mt-6 max-w-[66ch]" style={{ animationDelay: '80ms' }}>
        <p>
          Calder Safety is a fictional firm whose analysts look after vehicle
          fleets. The question they keep asking is{' '}
          <em>“is this a known defect with a fix, and is the fix holding?”</em> —
          and answering it means reading hundreds of complaints that members of
          the public have filed with the US government, by hand.
        </p>
        <p>
          We built an assistant that reads that public record for them: it finds
          the recall, finds the complaints, counts them properly and says what the
          two do and don’t settle. <strong>Unlike our other projects, nobody here
          wrote this data</strong> — it is {n(ROWS.complaints + ROWS.recalls + ROWS.investigations)}{' '}
          real rows, typos and all. This page walks through how it was built, with
          the real code and what each step taught us.
        </p>
      </div>

      <div className="lift-in mt-8 max-w-xl" style={{ animationDelay: '140ms' }}>
        <p className="flex flex-wrap items-baseline justify-between gap-2 text-[0.9375rem]">
          <span className="font-semibold text-ui-fg">{ALL_STAGES_LABEL}</span>
          <button type="button" onClick={() => onGo(ALL_STEPS[0])} className="cal-a text-[0.9375rem]">
            Start at step 1
          </button>
        </p>
        {/* ONE PIP PER STEP, grouped by stage. Every one is lit because every
            one has run; what the bar shows is SHAPE — one step against eight —
            which is the thing the stage names alone do not say. */}
        <div className="mt-2.5 flex gap-2" role="img" aria-label={ALL_STAGES_LABEL}>
          {STAGES.map((s) => (
            <div key={s.id} className="flex flex-1 gap-[3px]" style={{ flexGrow: s.holds.length }}>
              {s.holds.map((step) => (
                <span key={step} title={`Step ${step}: ${TITLES[step]}`} className="h-2 flex-1 rounded-[3px] bg-cal-1" />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[0.875rem] text-ui-faint">
          One bar per step, grouped by stage. Select a step below to jump to it.
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
        <div className="cal-card">
          <h3>Search first, then answer</h3>
          <p>
            A language model hasn’t read NHTSA’s files, and if you ask it anyway it
            will answer from memory — confidently. So we search the files first and
            hand it the few passages that matter, and it answers from those, citing
            each one. That pattern is called <strong>RAG</strong>, and stage 3 is
            the search half of it.
          </p>
          {VERESK && (
            <p>
              <a className="cal-a" href={`${VERESK}/learn/retrieval`}>
                More on retrieval
              </a>
            </p>
          )}
        </div>
        <div className="cal-card">
          <h3>A model that asks for tools</h3>
          <p>
            The model can’t open the database. What it can do is <em>ask</em>:
            “count the complaints for a 2020 F-150”. Our code runs that, hands back
            the result, and the model asks again or answers. That back-and-forth is{' '}
            <strong>the loop</strong>. The model decides what it needs; our code
            decides what it gets.
          </p>
          {VERESK && (
            <p>
              <a className="cal-a" href={`${VERESK}/learn/loop`}>
                More on the loop
              </a>
            </p>
          )}
        </div>
        <div className="cal-card">
          <h3>An answer key, written first</h3>
          <p>
            Before any code, a person answered eight real questions by reading the
            raw files. Every number on this page is measured against those
            answers. A system that writes its own answer key grades itself — so
            this one came second in the build, straight after looking at the data.
          </p>
          {VERESK && (
            <p>
              <a className="cal-a" href={`${VERESK}/learn/answer-key`}>
                More on answer keys
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Every step, grouped by stage. Buttons, not links: see `useGoToStep`. */
function Roadmap({ onGo }: { onGo: (step: string) => void }) {
  return (
    <section className="mt-20" aria-labelledby="road-title">
      <h2 id="road-title" className="text-[1.75rem] leading-tight font-bold tracking-tight text-ui-fg">
        All {ALL_STEPS.length} steps at a glance
      </h2>
      <p className="mt-2 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ui-dim">
        In the order they had to be built — each one needed the one before it to
        be checkable first. Select any step to jump to it.
      </p>
      <div className="cal-road mt-8">
        {STAGES.map((s) => (
          <div key={s.id} className="cal-road-phase">
            <p className="cal-label">
              Stage {s.stage} · {s.label}
            </p>
            {s.holds.map((step) => (
              <button key={step} type="button" className="cal-road-step" onClick={() => onGo(step)}>
                <span className="cal-dot" aria-hidden>
                  {step}
                </span>
                <span>
                  <span className="sr-only">Step {step}: </span>
                  {TITLES[step]}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── STAGE 1 · THE DATA ─────────────────────────────────────────────────── */

function PhaseData() {
  return (
    <>
      <PhaseHead
        stage="1"
        title="The data: find out what it actually is"
        what={
          <p>
            Before anything is built, get the files onto disk and describe them.
            Model years 2019 and 2020, every make and model, nationwide: three
            downloads from a US government server — what people filed, what
            manufacturers admitted, and what the regulator went on to ask. Nothing
            is parsed, embedded or stored in this stage. It exists so the next ones
            are taken with open eyes.
          </p>
        }
        result={
          <p>
            {n(UNITS.complaints)} complaints, {n(UNITS.recalls)} recall campaigns
            and {UNITS.investigations} investigations — counted per filing, not per
            row, because the rows overstate it by 44%.
          </p>
        }
      />
      <div className="mt-10 grid gap-8">
        <Step
          n="1"
          title={TITLES['1']}
          plain="Download NHTSA’s three files and describe them before touching them: how many records there are, what one line looks like, what is missing, and what is in there that nobody expected. No code that changes anything — only counting."
          why="Every later number on this page is a count of something. If you don’t know what one line of the file is, every count you quote is wrong by however far lines and records differ — and nothing will warn you."
          codeLabel="What we counted"
          code={
            <>
              <Figure caption="The three files: lines against records" source="pnpm safety:estate · lib/estate.generated.ts">
                <Table
                  head={['Source', 'Lines in the file', 'Actual records', 'One record is']}
                  numeric={[1, 2]}
                  rows={[
                    ['Complaints', n(ROWS.complaints), n(UNITS.complaints), 'one person’s filing about one vehicle'],
                    ['Recalls', n(ROWS.recalls), n(UNITS.recalls), 'one campaign by a manufacturer'],
                    ['Investigations', n(ROWS.investigations), n(UNITS.investigations), 'one case the regulator opened'],
                  ]}
                />
                <Note>
                  NHTSA writes one line per <strong>component</strong> a complaint
                  names, so a complaint that mentions the engine, the electrics and
                  the brakes is three lines.
                </Note>
              </Figure>
              <Figure caption="Checked without a parser" source="docs/safety/CORPUS.md §3">
                <Code
                  path="terminal — straight from the file, no parser involved"
                  lang="bash"
                  lines={[
                    "awk -F'\\t' '{c[NF]++} END {for (n in c) print n, c[n]}' CMPL_SLICE.tsv",
                    '  51 fields: 100980 lines          # every line, no exceptions',
                  ]}
                />
              </Figure>
            </>
          }
          learned={
            <>
              <p>
                <strong>The counts are not the line counts.</strong>{' '}
                {n(ROWS.complaints)} lines are {n(UNITS.complaints)} filings, so every
                figure quoted from lines would be 44% too high. That was the first
                modelling decision, and it was made by counting rather than by
                assuming.
              </p>
              <p>
                <strong>And the obvious way to read the file is wrong.</strong> 708
                lines contain an odd number of double quotes, because people type
                things like <code>THE "SERVICE ENGINE" LIGHT CAME ON</code>. A
                standard CSV reader treats a quote as the start of a quoted field and
                keeps reading — across line breaks — until it finds another, merging
                records together. So the files are split on tabs with quoting
                switched off, and every count has a no-parser check beside it.
              </p>
            </>
          }
          terms={['nhtsa', 'corpus', 'odi', 'campaign']}
        />
      </div>
    </>
  );
}

/* ── STAGE 2 · THE ANSWER KEY ───────────────────────────────────────────── */

function PhaseKey() {
  return (
    <>
      <PhaseHead
        stage="2"
        title="The answer key: write the answers down first"
        what={
          <p>
            Eight questions a fleet analyst would actually ask, answered by a person
            reading the raw files — before any search, model or code existed.
            Everything from stage 3 onwards is measured against what is written
            here.
          </p>
        }
        result={
          <p>
            Eight hand-worked answers in <code>docs/safety/WALKTHROUGH.md</code>,
            including two that exist to catch a system that plays safe.
          </p>
        }
      />
      <div className="mt-10 grid gap-8">
        <Step
          n="2"
          title={TITLES['2']}
          plain="Pick eight real questions, find each answer by hand in the raw files, and write it down: which filings answer it, and what a correct reply must and must not say. No code is involved and none of it is generated."
          why={
            <p>
              A system that produces its own answer key scores itself. “Did search
              find the right thing?” can’t be answered by anyone who hasn’t already
              decided what the right thing is — and deciding that <em>after</em>{' '}
              seeing the results is how a system comes to score well on a test it
              wrote for itself.
            </p>
          }
          codeLabel="What the key holds"
          code={
            <>
              <Figure caption="The flagship question, worked by hand" from="worked" source="docs/safety/WALKTHROUGH.md · REC-001">
                <p className="mb-3 max-w-[66ch] text-[1rem] leading-relaxed text-ui-fg">
                  “We run 2020 F-150s. Is the transmission park problem a known
                  defect, and is the fix holding?”
                </p>
                <Table
                  head={['What the files say', 'Count']}
                  numeric={[1]}
                  lit={[1]}
                  rows={[
                    ['F-150 power-train complaints filed after the recall (27 Apr 2020)', '1,057'],
                    ['…describing the recalled symptom — park, roll-away, gear display', '103 · unverified'],
                    ['…describing a different power-train problem', '957 · unverified'],
                  ]}
                />
                <Note>
                  The right answer is <strong>103, and 1,057 is the trap</strong>: a
                  system that reports it has matched on the <em>component</em> and
                  called it the <em>defect</em>. The key itself marks 103 and 957 as
                  unverified — they were counted before a correction and haven’t been
                  re-derived from a stated rule, and the key says so rather than
                  inventing a replacement.
                </Note>
              </Figure>
              <Figure caption="Eight questions, eight different shapes" from="cited" source="docs/safety/WALKTHROUGH.md">
                <Table
                  head={['Case', 'What it tests']}
                  rows={[
                    ['REC-001', 'A known defect — and whether the fix is holding. Punishes the obvious answer.'],
                    ['REC-002', 'A pure lookup by recall number. Must not search.'],
                    ['REC-003', 'A disagreement between records that is already a field in the data.'],
                    ['REC-004', 'Deaths: must be surfaced, and must not be editorialised.'],
                    ['REC-005', 'Absence: no recall covers it, and “no” is the right answer.'],
                    ['REC-006', 'The control: a clean fact that must NOT be escalated to a person.'],
                    ['REC-007', 'The same component is not the same defect.'],
                    ['REC-008', 'A date question, with three date formats in play.'],
                  ]}
                />
              </Figure>
            </>
          }
          learned={
            <>
              <p>
                <strong>Working it by hand found a mistake before any code ran.</strong>{' '}
                Three numbers in the first draft were line counts, not complaint
                counts — Tesla Model 3 complaints involving a death went from 12 to
                5. Each corrected figure was then confirmed twice, by a shell
                command over the raw file and by a query over the loaded index.
              </p>
              <p>
                <strong>Two questions are there to catch a system that plays safe.</strong>{' '}
                REC-005’s right answer is “no recall covers this”, and REC-006 must
                answer a clean fact without escalating. A test made only of hard
                questions is passed by a system that escalates everything.
              </p>
            </>
          }
          terms={['answerKey', 'control', 'campaign']}
        />
      </div>
    </>
  );
}

/* ── STAGE 3 · SEARCH ───────────────────────────────────────────────────── */

function PhaseSearch() {
  return (
    <>
      <PhaseHead
        stage="3"
        title="Search: from a line in a file to the passage that answers"
        what={
          <p>
            Eight steps that turn 1.5 GB of tab-separated text into something a
            question can search. Four happen once, offline; three happen every time
            somebody asks; the last measures whether any of it worked. One
            complaint — <code>ODI {SPINE}</code>, a 2020 Ford F-150 whose gear
            display disagreed with its gearbox — is followed through all of them.
          </p>
        }
        result={
          <p>
            recall@6 of <strong>0.40</strong>, over three hand-answered cases — and
            the reason it is that low is the most useful finding of the whole
            engagement: the questions were filters, not searches.
          </p>
        }
      />

      <SearchShape />

      <div className="mt-10 grid gap-8">
        <Step31 />
        <Step32 />
        <Step33 />
        <Step34 />
        <Step35 />
        <Step36 />
        <Step36b />
        <Step37 />
      </div>

      <Patterns />
    </>
  );
}

/**
 * Four steps that happen once and three that happen every time somebody asks.
 * The split is the single most useful thing in this stage for anybody deciding
 * what it costs to run.
 */
function SearchShape() {
  const groups = [
    {
      title: 'Once, offline',
      note: 'Runs on a laptop, costs nothing, and nobody is waiting for it.',
      steps: ['3.1', '3.2', '3.3', '3.4'],
    },
    {
      title: 'Every question',
      note: 'Runs while somebody waits, so this is where time and money go.',
      steps: ['3.5', '3.6', '3.6b'],
    },
    {
      title: 'On demand',
      note: 'Grades the search against the answer key.',
      steps: ['3.7'],
    },
  ];
  return (
    <section className="lift-in mt-8 grid gap-4 md:grid-cols-3">
      {groups.map((g) => (
        <div key={g.title} className="cal-card">
          <h3>{g.title}</h3>
          <ol className="mt-3 grid gap-1.5">
            {g.steps.map((s) => (
              <li key={s} className="flex items-baseline gap-3 text-[0.9375rem]">
                <a href={`#step-${s}`} className="cal-a shrink-0 font-mono text-[0.875rem]">
                  {s}
                </a>
                <span className="text-ui-dim">{TITLES[s]}</span>
              </li>
            ))}
          </ol>
          <p>{g.note}</p>
        </div>
      ))}
    </section>
  );
}

function Step31() {
  return (
    <Step
      n="3.1"
      title={TITLES['3.1']}
      when={WHEN['3.1']}
      plain="The complaint file is one long list of lines, with fields separated by tabs and no header row — a column means something only because of its position. Parsing turns each line into a document: the words the person wrote, plus labels like make, model and year kept to one side."
      why="What you put in the text is what search can find; what you keep as a label is what you can filter on. Get that split wrong and either a question about a 2020 F-150 finds nothing, or every complaint matches a question about deaths."
      code={
        <>
          <BeforeAfter
            before={
              <Figure caption="one raw line, tabs shown as ⇥">
                <Data
                  path={`CMPL_SLICE.tsv — ODI ${SPINE}`}
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
              <Figure caption="the document it becomes" from="worked" source="INGESTION.md §3.1">
                <Data
                  path="documents.json — one document"
                  lang="json"
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
          <Figure caption="One person, written five times" source={`ODI 11341276 · ${n(ROWS.complaints)} lines are ${n(UNITS.complaints)} complaints`}>
            <Raw>{`11341276  STRUCTURE:BODY                                    ┐
11341276  ELECTRICAL SYSTEM                                 │  ONE complaint
11341276  POWER TRAIN                                       │  written FIVE times
11341276  ENGINE                                            │
11341276  FORWARD COLLISION AVOIDANCE: AUTOMATIC EMERGENCY  ┘`}</Raw>
            <Note>
              So lines are grouped by their complaint number into one document, and
              the five components become a list inside it.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Without the grouping, one person would take five of the six
            result slots</strong> and crowd out four other people — and every count
            quoted anywhere would be 44% too high.
          </p>
          <p>
            <strong>The first line of the text is added on purpose.</strong>{' '}
            <code>2020 FORD F-150 | POWER TRAIN | filed 2020-09-08</code> isn’t in
            the file’s narrative — the person never wrote “F-150” — so without it a
            question about a 2020 F-150 would match nothing. Labels work the other
            way round: <code>deaths: 0</code> is filtered on and never searched,
            because “deaths 0” in the text would make every complaint match a
            question about fatalities.
          </p>
        </>
      }
      terms={['parse', 'odi', 'filter']}
      hood={<ParserModal />}
    />
  );
}

function Step32() {
  const untouched = UNITS.complaints + UNITS.recalls;
  return (
    <Step
      n="3.2"
      title={TITLES['3.2']}
      when={WHEN['3.2']}
      plain="Search returns pieces, not whole files, so long documents normally get cut into passages. On this data the chunker’s real job is deciding where not to cut."
      why={
        <p>
          A complaint is one person’s account of one incident. Cut it, and the
          second piece of <code>{SPINE}</code> loses the word PARK — and “piece 2
          of complaint {SPINE}” isn’t something anybody can look up. An ODI number
          is.
        </p>
      }
      code={
        <Figure caption="What went in, and what came out" source="@fde/grounding, over the real output of step 3.1">
          <Table
            head={['Source', 'Documents in', 'Passages out', 'What happened']}
            numeric={[1, 2]}
            lit={[2]}
            rows={[
              ['Complaints', n(UNITS.complaints), n(UNITS.complaints), 'left whole'],
              ['Recalls', n(UNITS.recalls), n(UNITS.recalls), 'left whole'],
              ['Investigations', n(UNITS.investigations), n(INVESTIGATION_PASSAGES), 'cut'],
              ['Total', n(DOCUMENTS), n(PASSAGES), `+${INVESTIGATION_PASSAGES - UNITS.investigations} passages, all from investigations`],
            ]}
          />
          <Note>
            <strong>{((untouched / DOCUMENTS) * 100).toFixed(2)}% of the corpus passes
            through untouched</strong> — and not because complaints are short: one
            in nine runs past the 1,200-character default and is left whole anyway.
          </Note>
        </Figure>
      }
      learned={
        <>
          <p>
            <strong>That demotes this step, and that is the lesson.</strong> Where
            you cut normally decides what can be found, which is why chunking is
            usually the highest-leverage step in the whole pipeline. Here it touches{' '}
            {UNITS.investigations} documents out of {n(DOCUMENTS)}.
          </p>
          <p>
            So the leverage moves upstream, to step 3.1: whether a question about a
            2020 F-150 finds this complaint is decided by the line the parser adds,
            not by a cut. Tuning chunk sizes here would be tuning the one step with
            almost nothing to do.
          </p>
          <p>
            And nothing new was written. The chunker is the shared one, used by two
            other projects unchanged — the claim that shared code transfers, tested
            for the first time on data nobody wrote for us, passing quietly.
          </p>
        </>
      }
      terms={['chunk', 'corpus']}
      hood={<ChunkerModal />}
    />
  );
}

function Step33() {
  const sims = [
    { q: 'F-150 will not go into park, transmission shift', v: 0.8504, near: true },
    { q: 'windscreen wiper motor failure', v: 0.5703, near: false },
  ];
  return (
    <Step
      n="3.3"
      title={TITLES['3.3']}
      when={WHEN['3.3']}
      plain="A computer can’t compare meanings. An embedding model turns a piece of text into a list of numbers — 384 of them here — arranged so that texts meaning similar things get similar lists. Then “similar” is just arithmetic."
      why="It’s what lets “gearbox shows the wrong gear” find “display indicates I am in the wrong gear” with no words in common. And where the model runs is a decision about people’s data: this step touches every complaint, so a hosted embedder would mean sending all of them to somebody else to read."
      code={
        <>
          <Figure caption={`bge-small, run on complaint ${SPINE}`} source="384 numbers · first 6 shown">
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
          <Figure caption="Two questions, compared against that one list" source="cosine similarity, from −1 to 1">
            <ul className="grid gap-5">
              {sims.map((s) => (
                <li key={s.q}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-[0.9375rem] text-ui-dim">“{s.q}”</span>
                    <span className="font-mono text-[0.9375rem]" style={{ color: s.near ? 'var(--color-cal-1)' : 'var(--color-ui-faint)' }}>
                      {s.v.toFixed(4)}
                    </span>
                  </div>
                  {/* THE BAR RUNS THE FULL −1…1 RANGE, with a tick at zero,
                      because cosine similarity does not start at nothing. Drawn
                      as a fraction of its own maximum, 0.57 would look like
                      "about two thirds as good". */}
                  <div className="relative mt-2 h-1.5 w-full rounded-full bg-ui-line">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${((s.v + 1) / 2) * 100}%`, background: s.near ? 'var(--color-cal-1)' : 'var(--color-ui-line-lit)' }}
                    />
                    <span aria-hidden className="absolute -top-1 left-1/2 h-3.5 w-px bg-ui-faint" />
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[0.8125rem] text-ui-faint">
                    <span>−1</span>
                    <span>0</span>
                    <span>1</span>
                  </div>
                </li>
              ))}
            </ul>
            <Note>
              The model was never told these are about cars. The numbers carry the
              meaning.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>It runs on this machine</strong>: a 130 MB model, no network,
            no key — so {n(UNITS.complaints)} people’s accounts of crashes, fires and
            53 deaths are never sent anywhere to be embedded. It costs no accuracy
            that we know of: on a sibling project (Vantis Steering’s corpus, not
            this one) the local model scored the same as the paid one.
          </p>
          <p>
            <strong>And this data taught the shared code something.</strong> The
            model pads every text in a batch to the longest one in it, so sorting
            passages by length before batching is <strong>58% faster for identical
            numbers</strong>. The real run took 36.6 minutes, 22% under the
            projection. It was invisible at the 555 passages of earlier projects —
            this is the first corpus big enough to show it.
          </p>
        </>
      }
      terms={['embedding', 'cosine']}
      hood={<EmbedModal />}
    />
  );
}

function Step34() {
  return (
    <Step
      n="3.4"
      title={TITLES['3.4']}
      when={WHEN['3.4']}
      plain="Every passage goes into one Postgres table. Each row holds the passage in two searchable forms — its 384 numbers, for meaning, and its indexed words, for keywords — plus its labels, for filtering. That one table is the whole “hybrid” idea, sitting in a database."
      why="The two searchable forms fail at different things, which is why both are there. And this is the first step that leaves the laptop — the table lives on a hosted database — so it’s the first that can fail for reasons that have nothing to do with our code."
      code={
        <>
          <Figure caption="The whole store — one table" from="excerpt" source="packages/grounding/src/store.ts + hybrid.ts">
            <Code
              path="document_chunks — its columns"
              lang="sql"
              mark={[3, 5]}
              lines={[
                '-- one row per passage',
                'id         uuid',
                'content    text        -- the words, for reading and quoting',
                'vector     vector      -- 384 numbers, for MEANING (step 3.5, first arm)',
                'metadata   jsonb       -- for FILTERING (make, year, deaths…)',
                "content_ts tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED",
                '                       -- for KEYWORDS  (step 3.5, second arm)',
              ]}
            />
          </Figure>
          <Figure caption="The load" source="docs/safety/INDEX.md">
            <Numbers
              items={[
                { value: n(PASSAGES), label: 'rows written' },
                { value: '1.1 min', label: 'the first load, using the numbers step 3.3 already made (a later reload took 1.2)' },
                { value: '287 MB', label: 'the table and its indexes — predicted ~140' },
                { value: '318 MB', label: 'what the host bills, of a 512 MB free tier' },
              ]}
            />
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Storage came in at twice the prediction.</strong> The estimate
            extrapolated bytes per row from a sibling project, and that measurement
            predated the keyword column: <code>content_ts</code> and its index are
            about a quarter of the table. The keyword arm has a price, and this is
            the first corpus here big enough to show it.
          </p>
          <p>
            <strong>The whole step turns on one method call.</strong>{' '}
            <code>addVectors</code> inserts the numbers step 3.3 already made;{' '}
            <code>addDocuments</code> would quietly recompute all of them — 36.6
            minutes, no error, and the same row count either way.
          </p>
          <p>
            And there are three different answers to “how big is it”: Postgres
            says 295 MB for the database, but the host bills 318 MB, and the quota
            is read from the billed one.
          </p>
        </>
      }
      terms={['pgvector', 'keyword', 'hybrid']}
      hood={<IndexModal />}
    />
  );
}

function Step35() {
  const armA = ['11416775', '19V620000', '20V425000'];
  const armB = ['11592935', '20V197000', '11624180'];
  return (
    <Step
      n="3.5"
      title={TITLES['3.5']}
      when={WHEN['3.5']}
      plain="Every question is asked two ways at once. One arm matches meaning, using the numbers from step 3.3; the other matches the actual words, using the keyword index. Each returns its own ranked list."
      why={
        <p>
          This corpus is full of what meaning-search is worst at:{' '}
          <code>20V197000</code>, <code>{SPINE}</code>, <code>P0219A</code>,{' '}
          <code>PRNDL</code>. Ask a meaning index for a recall number and it
          returns things that <em>look like</em> recall numbers. The keyword arm
          returns that recall.
        </p>
      }
      code={
        <>
          <Figure caption="The two arms, as built" from="cited" source="apps/ai/safety/src/grounding/search.ts">
            <Table
              head={['Arm', 'How it searches', 'What it is good at']}
              rows={[
                ['Meaning', 'Nearest numbers, over the vector column', 'Matching “gearbox shows the wrong gear” to “display indicates I am in the wrong gear”, with no shared words'],
                ['Keywords', 'Postgres full-text rank, over content_ts', 'A recall number, a fault code, an ODI reference'],
              ]}
            />
          </Figure>
          <Figure caption="Two ranked lists, for “recall 20V197000”" source="6 results in 1,474 ms">
            <Table
              head={['Rank', 'Meaning arm', 'Keyword arm']}
              lit={[1]}
              rows={armA.map((a, i) => [
                String(i + 1),
                <code key="a">{a}</code>,
                <span key="b">
                  <code>{armB[i]}</code>
                  {armB[i] === '20V197000' && <span className="ml-2 text-ui-faint">← the recall asked for</span>}
                </span>,
              ])}
            />
            <Note>
              Two lists that share <strong>no entries at all</strong> — which is
              what the next step exists to resolve.
            </Note>
          </Figure>
        </>
      }
      learned={
        <p>
          <strong>Each arm is asked for four times as many as the question
          needs</strong> — 24 each for a six-result question. A passage ranked 20th
          on meaning and 2nd on keywords has to be in the lists <em>before</em>{' '}
          they’re merged; fetching six from each would throw it away before the
          step that would have promoted it.
        </p>
      }
      terms={['hybrid', 'keyword', 'embedding']}
      hood={<SearchModal />}
    />
  );
}

/**
 * EVERY SCORE IN THE TABLE IS COMPUTED BY `rrf()` from the ranks beside it,
 * normalised to the top hit the way the tool prints them. The results are the
 * real ones `search.ts` returned for "recall 20V197000".
 */
function Step36() {
  const rows = [
    { id: '11416775', a: 1, b: null, what: '2020 Lincoln Corsair complaint' },
    { id: '11592935', a: null, b: 1, what: '2020 Ford Ranger complaint' },
    { id: '19V620000', a: 2, b: null, what: 'a different recall' },
    { id: '20V197000', a: null, b: 2, what: 'the recall asked for' },
    { id: '20V425000', a: 3, b: null, what: 'a different recall' },
    { id: '11624180', a: null, b: 3, what: 'a complaint' },
  ].map((r) => ({ ...r, total: rrf(...[r.a, r.b].filter((x): x is number => x !== null)) }));
  const top = Math.max(...rows.map((r) => r.total));

  return (
    <Step
      n="3.6"
      title={TITLES['3.6']}
      when={WHEN['3.6']}
      plain="The meaning arm scores in similarity, like 0.80; the keyword arm in relevance, like 0.41. They’re different units — adding them is like adding a temperature to a price. So the scores are thrown away and positions are used instead: each passage gets 1 ÷ (60 + its rank) from each list, added up."
      why={`A passage both arms like beats one that either arm loves — the right instinct, made arithmetic. The ${K} is a convention from the original paper, and its job is to stop the top slot dominating.`}
      code={
        <>
          <Figure caption="Reciprocal rank fusion" from="cited" source="Cormack et al., 2009 · @fde/grounding">
            <Raw>{`score = 1/(${K} + rank in the meaning arm) + 1/(${K} + rank in the keyword arm)`}</Raw>
          </Figure>
          <Figure caption="What came back for “recall 20V197000”" source="pnpm safety:search · 6 of 48 merged">
            <Table
              head={['Passage', 'Meaning rank', 'Keyword rank', 'Score', 'What it is']}
              numeric={[1, 2, 3]}
              lit={[3]}
              rows={rows.map((r) => [
                <code key="id">{r.id}</code>,
                r.a === null ? '·' : String(r.a),
                r.b === null ? '·' : String(r.b),
                (r.total / top).toFixed(4),
                r.what,
              ])}
            />
            <Note>
              A dot means that arm didn’t return the passage at all. Scores are
              shown relative to the top hit, the way the tool prints them.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>Every one of the six was found by one arm only</strong>, so the
            scores pair off exactly and fusion — whose whole mechanism is rewarding
            agreement — had nothing to agree about. It interleaved the two lists
            rather than reordering them.
          </p>
          <p>
            And <code>20V197000</code>, the literal recall number asked for, came
            back fourth. It isn’t first in its own arm either: keyword rank 1 went
            to a complaint reading <em>“ford is recalling certain 2020 ranger and
            f-15…”</em>, because keyword search matches the common word{' '}
            <em>recall</em> across thousands of documents.
          </p>
          <p>
            The same code fails the opposite way on a sibling project, where the
            arms mostly agree and a single-arm hit gets buried under corroborated
            ones. Same code, two corpora, opposite failures — and in both, the
            argument for a reranker. One query is a smoke test, not a score; step
            3.7 is what settles it.
          </p>
        </>
      }
      terms={['rrf', 'hybrid']}
      hood={<FuseModal />}
    />
  );
}

function Step36b() {
  return (
    <Step
      n="3.6b"
      title={TITLES['3.6b']}
      when={WHEN['3.6b']}
      plain="Everything so far compares two summaries made separately — each passage was turned into numbers long before the question existed. A reranker reads the question and one passage together and judges how well one answers the other. Much better judgement, far too slow to run on everything, so it runs on the top fifty."
      why="Fifty, not six, because the whole value is promoting something the first pass ranked below the cut. It is also a diagnostic: if it helps, the problem was “found it, ranked it badly”; if it doesn’t, the problem was “never found it”, and no amount of re-reading fixes that."
      code={
        <Figure caption="Where it sits" from="cited" source="off unless RERANK=local">
          <Raw>{`cheap search finds 50 candidates     fast, indexed, a bit blunt
the reranker reads all 50 properly   slow, no index, sharp
keep the best 6                      what the model sees`}</Raw>
        </Figure>
      }
      learned={
        <>
          <p>
            <strong>It worked exactly as intended, and the score didn’t move.</strong>{' '}
            It promoted one hit from 36th to 1st and another from 3rd to 1st — and
            step 3.7’s number stayed where it was, because the documents that
            mattered were never among the fifty it was handed.{' '}
            <strong>A reranker reorders; it cannot fetch.</strong>
          </p>
          <p>
            So it is built and switched off. <code>RERANK=local</code> is the only
            thing that changes between the two numbers step 3.7 reports — measure
            the plain pipeline first, or you can’t say what the reranker bought.
          </p>
        </>
      }
      terms={['reranker']}
      hood={<RerankModal />}
    />
  );
}

function Step37() {
  return (
    <Step
      n="3.7"
      title={TITLES['3.7']}
      when={WHEN['3.7']}
      plain="The answers were written by hand in stage 2, before any of this existed. So the only question worth asking here is: does the document we already know is right come back in the top six?"
      why={
        <>
          <p>
            Before: we believe search works, because the results look plausible.
            After: a number, and we know which documents it misses by name. Measure
            before improving, or you can’t say whether a change helped.
          </p>
          <p>
            <strong>It counts documents, not passages</strong>, because the answer
            key names things a person can look up — <code>ODI {SPINE}</code>,
            recall <code>20V197000</code> — and one investigation can be two
            passages. Left alone, one document could take two of the six slots, and
            the same search would score differently depending on where the chunker
            happened to cut.
          </p>
        </>
      }
      code={
        <>
          <Figure caption="The measure" from="cited" source="docs/safety/INGESTION.md">
            <Raw>{`recall@6  =  how many known-right DOCUMENTS were in the top 6
             ─────────────────────────────────────────────────
             how many known-right documents there are`}</Raw>
          </Figure>
          <Figure caption="Three cases, each a different shape of question" from="worked" source="docs/safety/WALKTHROUGH.md · n = 3">
            <Table
              head={['Case', 'The question', 'What must come back']}
              rows={[
                ['REC-001', 'Is the 2020 F-150 park problem a known defect, and is the fix holding?', `Recall 20V197000 and ODI ${SPINE} — either alone gives a wrong answer. Out of 2.`],
                ['REC-004', 'Any complaints involving a death on the 2019–2020 Tesla Model 3?', 'As many of the 5 death complaints as six slots allow. Out of 5.'],
                ['REC-005', 'Is there a recall for forward-collision braking on the 2019–2020 Honda Odyssey?', 'None exists — verified. So: any one of the 400 Odyssey complaints as evidence of the absence, and no recall cited by mistake.'],
              ]}
            />
          </Figure>
          <Figure caption="What came back" source="pnpm safety:measure · n = 3 · docs/safety/evals/">
            <Numbers
              items={[
                { value: '0.40', label: 'search alone' },
                { value: '0.40', label: 'the same run, reranked (RERANK=local)' },
              ]}
            />
          </Figure>
          <Figure caption="A number from somewhere else" from="target" source="Vantis Steering · docs/steering/evals/RETRIEVAL.md">
            <Numbers items={[{ value: '0.813', label: 'recall@6 on a sibling project’s corpus, which somebody here wrote' }]} />
            <Note>
              <strong>Deliberately not set beside the 0.40 above.</strong> A
              different corpus, counted by its own rule, placed next to ours would
              measure the counting rule rather than the search — and the comparison
              a reader would draw is one neither number supports.
            </Note>
          </Figure>
        </>
      }
      learned={
        <>
          <p>
            <strong>The same number twice, and that is the result.</strong> The
            documents the key names were sitting at ranks 93, 121, 1,169, 1,239,
            2,271 and 3,026. The reranker was handed the top 50. Not one of them was
            in it.
          </p>
          <p>
            <strong>The reason is in the questions.</strong> “2020 F-150”, “Tesla
            Model 3” and “involving a death” are fields already in the database —
            make, model, year, deaths — and search was treating them as words. These
            are <strong>filters wearing the clothes of questions</strong>. Filter
            first and the same corpus returns exactly the five Tesla complaints, and
            moves <code>{SPINE}</code> from rank 3,026 to rank 8.
          </p>
          <p>
            Which says what to build next, and it isn’t a better model: tools the
            model can call with structured arguments. A question with one exact
            answer is a lookup, not a search — stage 4.
          </p>
          <p>
            <strong>And 0.40 is flattered.</strong> REC-005 scored 1.00 against a
            bar that is nearly impossible to fail; the two hard cases scored 0.00
            and 0.20. With n = 3 that is enough to say search alone tops out here,
            and not enough for anything finer.
          </p>
        </>
      }
      terms={['recallAtK', 'filter', 'answerKey']}
      hood={<MeasureModal />}
    />
  );
}

/**
 * The five ways to retrieve, and which of them this corpus actually exercises.
 * It is here rather than in `/learn` because the interesting column is what
 * each pattern is worth ON THIS DATA.
 */
function Patterns() {
  return (
    <section className="lift-in mt-14" aria-labelledby="patterns-title">
      <h3 id="patterns-title" className="text-[1.3125rem] font-bold text-ui-fg">
        Five ways to search, and which ones this data made real
      </h3>
      <p className="mt-2 mb-5 max-w-[66ch] text-[1rem] leading-relaxed text-ui-dim">
        The same five patterns the firm teaches. What changes on real data is
        which of them stop being an argument.
      </p>
      <Figure caption="The five patterns, here" from="cited" source="docs/safety/INGESTION.md · docs/rag/">
        <Table
          head={['Pattern', 'Status here', 'What it means on this corpus']}
          rows={[
            ['Hybrid', 'Built, measured', 'The core. Recall numbers and fault codes are exactly what meaning-search misses.'],
            ['Corrective', 'Narrower here', 'Not the textbook “grade the results, search again”: that would have re-fetched the same junk for REC-001, because the query was never the problem. Here every correction is a filter correction — an empty recall list means widen the component before concluding none exists.'],
            ['Agentic', 'Stages 4 and 6', 'A model choosing between five tools and calling one after another IS agentic search. It isn’t an extra to schedule; it is what the next stages are.'],
            ['Graph', 'Measured · one hop', 'Real and shallower than the textbook. Owners type recall numbers into their own complaints: 5,361 complaints name one, 563 resolve to a recall we hold. One hop is a lookup — one more tool, no graph database.'],
            ['Multimodal', 'Not applicable', 'There are no images in these files. An earlier note said recall documents are PDFs; they are flat text, so it was wrong and is gone.'],
          ]}
        />
      </Figure>
    </section>
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
        What each term means in general, and what it means on this data.
      </p>
      <dl className="cal-gloss">
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

/**
 * What it still cannot do. Every stage is built, so this is not a list of
 * unbuilt steps — it is the three limits the build measured, each of which a
 * reader could otherwise assume had been solved.
 */
function Limits() {
  return (
    <section className="mt-20 rounded-2xl border border-dashed border-ui-line-lit p-6 sm:p-8" aria-labelledby="limits-title">
      <h2 id="limits-title" className="text-[1.375rem] font-bold text-ui-fg">
        What it still can’t do
      </h2>
      <ul className="cal-prose mt-3 grid gap-3">
        <li>
          <p>
            <strong>Say whether a fix was carried out on your vehicle.</strong> NHTSA
            publishes recalls and complaints, not repair records per vehicle. The
            answer key’s control question (REC-006) exists to check the assistant
            says so instead of guessing.
          </p>
        </li>
        <li>
          <p>
            <strong>Reliably explain itself.</strong> Every mechanical check passes;
            the checks that need a person-like reading of the answer do not (stage
            7). What a tool result says, the system does. What a prompt asks for in
            general, it does when it happens to.
          </p>
        </li>
        <li>
          <p>
            <strong>Route as well as a person.</strong> With the tools chosen by hand
            the right documents are all reachable; with the model choosing, fewer
            come back, and the number moves from run to run (stage 6).
          </p>
        </li>
      </ul>
      <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/desk" className="cal-a">
          Ask it a question
        </Link>
        <Link to="/data-flow" className="cal-a">
          Where the data goes
        </Link>
        <Link to="/" className="cal-a">
          Back to the Calder overview
        </Link>
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 mx-auto max-w-6xl border-t border-ui-line px-5 py-10 text-[0.9375rem] text-ui-faint sm:px-6">
      Calder Safety and its analysts are fictional. The NHTSA data is real and
      public, and every figure marked “Real output” was produced by running the
      code on it.
    </footer>
  );
}
