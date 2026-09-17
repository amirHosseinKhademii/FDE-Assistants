/**
 * Calder Safety's door.
 *
 * ── WHY THIS PAGE OPENS WITH EVIDENCE AND NOT WITH A CLAIM ─────────────────
 *
 * The other three landings open the way a product page does: a sentence about
 * what the thing is, then the estate, then how it works. That is right when the
 * corpus was written to demonstrate something — the reader has to be told what
 * they are about to see, because nothing about it is independently checkable.
 *
 * This corpus is real. Recall `20V437000` and complaint `ODI 11762525` are
 * public filings anybody can look up at nhtsa.gov, and the contradiction
 * between them was not planted by us. So the page leads with the two records
 * and lets them do the arguing: a reader who does not believe the premise can
 * verify it before reading another line, which is not true of any other page on
 * this site.
 *
 * ── AND IT IS THE PRODUCT, NOT AN ILLUSTRATION ─────────────────────────────
 *
 * What Calder sells is not "search the safety record" — that exists and is
 * free. It is holding two records side by side and saying THESE DISAGREE AND A
 * PERSON MUST DECIDE, without deciding. So the thing the hero shows is the
 * thing the assistant does.
 *
 * ── THE DESIGN IS THE SAME KIT, IN A DIFFERENT RHYTHM ──────────────────────
 *
 * Same `Aurora`, same `title-spectrum` headline, same `lift-in` entrance, same
 * `@fde/uikit` controls and the same type scale as the other three. What
 * differs is the order and the density: evidence first, the estate second, and
 * the refusal given a section of its own rather than a line in a caveat block.
 * A second visual language would have been easier and would have said the firm
 * has no house style.
 */
import { BoxIcon, Mono } from '@fde/uikit';
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { CalderEstate } from '../components/CalderEstate';
import { AURORA } from '../lib/aurora';
import { COMPLAINT_FACTS, DISTINCT, INFLUENCED_BY, UNITS } from '../lib/estate.generated';
import { VERESK } from '../lib/links';

/**
 * THE ONE-VEHICLE FIGURES, AND THEY STAY ONE VEHICLE ON PURPOSE.
 *
 * Measured against the live API on 2026-09-16/17 and recorded in
 * `docs/safety/PLAN.md` §3–§4. They are not the estate — the estate is
 * measured by `pnpm safety:estate` and read out of `estate.generated.ts`
 * everywhere else on this page. These describe the 2019 Honda Odyssey, because
 * that is the vehicle whose two records contradict each other, and a
 * contradiction is proved by naming the records rather than by a total.
 *
 * WHAT USED TO BE HERE AND IS NOT ANY MORE: `allCaps`, `components`, `withVin`
 * and the narrative length range. Those were one vehicle's numbers standing in
 * for the estate's while the slice was undecided. The slice is decided —
 * `docs/safety/CORPUS.md` §1 — so they come from the file now.
 */
const ODYSSEY = {
  vehicle: '2019 Honda Odyssey',
  complaints: 956,
  afterRemedy: 51,
  slidingDoor: 55,
} as const;

export function CalderLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <Hero />
        <Contradiction />
        <Documented />
        <CalderEstate />
        <Severity />
        <Refusal />
        <Onward />
      </main>

      <footer className="relative z-10 mx-auto max-w-5xl border-t border-ui-line px-5 py-10 text-sm text-ui-faint sm:px-6">
        Calder Safety is a fictional customer. The filings are not — every record
        quoted here is public and can be looked up at nhtsa.gov.
      </footer>
    </div>
  );
}

function Header() {
  return (
    <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
      <span className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cal-1/15 text-cal-1 ring-1 ring-cal-1/30">
          <BoxIcon />
        </span>
        <span className="font-medium tracking-tight">Calder Safety</span>
      </span>

      <Link
        to="/data-flow"
        className="text-sm text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto"
      >
        Where the data goes
      </Link>

      {/* A plain anchor: the firm's page is a different deployment on a
          different origin. `null` in a production build with nothing configured,
          and then it renders as text rather than as a link to nowhere. */}
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

function Hero() {
  return (
    <section className="pt-10 pb-12 md:pt-16">
      <p className="lift-in font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
        the public safety record, read for you
      </p>

      <h1 className="lift-in title-spectrum mt-4 max-w-4xl font-mono text-[1.75rem] leading-[1.08] font-semibold tracking-tighter break-words sm:text-[2.5rem] md:text-[3.25rem]">
        Is it a known defect with a remedy, and is the remedy holding?
      </h1>

      <p
        className="lift-in mt-5 max-w-[58ch] leading-relaxed text-ui-dim md:mt-6 md:text-lg"
        style={{ animationDelay: '90ms' }}
      >
        An analyst running four hundred vans reads hundreds of complaint
        narratives by hand to answer that. The filings are public and free; what
        is missing is somebody to hold two of them side by side and say what they
        do and do not settle.
      </p>
    </section>
  );
}

/**
 * The two records, as filed.
 *
 * NOTHING HERE IS PARAPHRASED. The dates, the identifiers and the remedy
 * wording are quoted from the public record because the reader's next move
 * should be able to be "look it up", and a paraphrase cannot survive that.
 */
function Contradiction() {
  return (
    <section
      className="lift-in border-t border-ui-line pt-10 pb-14"
      style={{ animationDelay: '140ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        Two records in the same public file, six years apart
      </h2>

      <div className="mt-7 grid gap-8 md:grid-cols-2">
        <div className="cal-record" style={{ ['--source' as string]: 'var(--color-cal-2)' }}>
          <p className="cal-record-id">recall 20V437000 · filed 2020-07-28</p>
          <p className="cal-record-body">
            <span className="text-ui-fg">The manufacturer's own statement.</span>{' '}
            Water may enter the outer door handle cables for the sliding doors.
            The remedy: dealers will replace the power sliding door outer handle
            cables, free of charge.
          </p>
        </div>

        <div className="cal-record" style={{ ['--source' as string]: 'var(--color-cal-1)' }}>
          <p className="cal-record-id">
            {ODYSSEY.afterRemedy} of {ODYSSEY.slidingDoor} complaints · filed after that date
          </p>
          <p className="cal-record-body">
            <span className="text-ui-fg">What people kept reporting.</span> The
            most recent arrived this month.
          </p>
          <p className="cal-verbatim">
            “The rear latch on the passenger sliding door has stopped latching.
            The part seems rusted out…”
            <span className="mt-1 block text-ui-faint">ODI 11762525 · 2026-09-07</span>
          </p>
        </div>
      </div>

      <p className="mt-8 max-w-[64ch] leading-relaxed text-ui-dim">
        That is <span className="text-ui-fg">not</span> proof the remedy failed.
        They may be unremedied vehicles, a different fault with the same symptom,
        or owners who never answered the notice. Which is exactly why it is the
        right problem: a question the documents cannot settle and a person has to
        judge.
      </p>
    </section>
  );
}

/**
 * The second disagreement, and this one is already written down.
 *
 * WHY IT EARNS A SECTION. `Contradiction` above is a disagreement we ASSEMBLED
 * — two records placed side by side, with a paragraph underneath saying what it
 * does not prove. This one needed no assembling and no judgement: NHTSA records
 * in `INFLUENCED_BY` whether the manufacturer volunteered the recall or was
 * pushed into it, and the field has three values. A labelled conflict in a
 * structured column is rarer than it sounds and it is the reason this corpus is
 * worth the trouble.
 *
 * COUNTED PER CAMPAIGN, WHICH IS NOT WHAT THE ROWS SAY. `docs/safety/CORPUS.md`
 * §4 reports 1,407 ODI-initiated recalls; that is rows, and one campaign covers
 * every make, model and year it applies to. 107 campaigns is the same fact
 * counted once each. The larger number is not wrong, it is just not campaigns —
 * and "1,407 recalls the manufacturer did not volunteer" is a sentence about
 * campaigns.
 */
function Documented() {
  const total = INFLUENCED_BY.MFR + INFLUENCED_BY.ODI + INFLUENCED_BY.OVSC;
  const pushed = INFLUENCED_BY.ODI + INFLUENCED_BY.OVSC;

  return (
    <section
      className="lift-in border-t border-ui-line pt-10 pb-14"
      style={{ animationDelay: '160ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        And one disagreement the regulator already wrote down
      </h2>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        Every recall record carries <Mono>INFLUENCED_BY</Mono>: who started it.
        Most say <Mono>MFR</Mono> — the manufacturer came forward. {pushed} of{' '}
        {total.toLocaleString('en-GB')} campaigns in this slice do not.
      </p>

      <ul className="mt-7 grid max-w-2xl gap-3">
        {[
          {
            code: 'MFR',
            n: INFLUENCED_BY.MFR,
            says: 'the manufacturer recalled voluntarily',
            tone: 'var(--color-cal-2)',
          },
          {
            code: 'ODI',
            n: INFLUENCED_BY.ODI,
            says: 'NHTSA’s Office of Defects Investigation pushed for it',
            tone: 'var(--color-cal-1)',
          },
          {
            code: 'OVSC',
            n: INFLUENCED_BY.OVSC,
            says: 'Vehicle Safety Compliance pushed for it',
            tone: 'var(--color-cal-1)',
          },
        ].map((row) => (
          <li key={row.code} className="flex items-baseline gap-4">
            <span
              className="w-14 shrink-0 font-mono text-[0.6875rem] tracking-[0.08em] uppercase"
              style={{ color: row.tone }}
            >
              {row.code}
            </span>
            {/* The bar is proportional and the numeral is exact. 107 against
                2,893 is a sliver, and a sliver is the honest drawing of it —
                a log scale would make the rare case look ordinary. */}
            <span aria-hidden className="hidden h-px flex-1 bg-ui-line sm:block">
              <span
                className="block h-px"
                style={{ background: row.tone, width: `${(row.n / total) * 100}%` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right font-mono text-sm text-ui-fg">
              {row.n.toLocaleString('en-GB')}
            </span>
            <span className="hidden text-[0.8125rem] text-ui-dim md:block md:w-[30ch]">
              {row.says}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-7 max-w-[64ch] leading-relaxed text-ui-dim">
        No inference, no model, no threshold — the agency labelled it. It is the
        cleanest example in the estate of the thing the product is for: a
        difference between two parties that a document states and nobody here has
        to decide.
      </p>
    </section>
  );
}

/**
 * What happened to the people in the file.
 *
 * WHY THIS IS A SECTION AND NOT A STATISTIC. Severity is usually something you
 * infer from prose and argue about. Here it is four columns — `CRASH`, `FIRE`,
 * `INJURED`, `DEATHS` — filled in on every filing. That makes an eval check
 * possible that none of the three existing engagements can ask: did the answer
 * surface the fatal ones? It also sets the register of the whole deployment.
 *
 * COUNTED PER COMPLAINT. The component fan-out means the row count reports the
 * same death up to five times; `pnpm safety:estate` counts each filing once.
 * The two fatality figures are different questions with different answers —
 * {deaths} filings mention a death and {fatalities} people died — and both are
 * printed, because rounding them into one number is how a page ends up quoting
 * whichever is larger.
 */
function Severity() {
  return (
    <section
      className="lift-in border-t border-ui-line pt-10 pb-14"
      style={{ animationDelay: '240ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        Severity is a field here, not a reading
      </h2>

      <dl className="mt-7 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: COMPLAINT_FACTS.crash, label: 'report a crash' },
          { n: COMPLAINT_FACTS.fire, label: 'report a fire' },
          { n: COMPLAINT_FACTS.injured, label: 'report an injury' },
          { n: COMPLAINT_FACTS.deaths, label: 'report a death' },
        ].map((f) => (
          <div key={f.label}>
            <dd className="font-mono text-2xl text-ui-fg">{f.n.toLocaleString('en-GB')}</dd>
            <dt className="mt-1 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
              {f.label}
            </dt>
          </div>
        ))}
      </dl>

      <p className="mt-8 max-w-[64ch] leading-relaxed text-ui-dim">
        Of {UNITS.complaints.toLocaleString('en-GB')} complaints, in four
        columns that are filled in rather than written about. The{' '}
        {COMPLAINT_FACTS.deaths} filings that report a death account for{' '}
        {COMPLAINT_FACTS.fatalities} people. Three of those columns are a{' '}
        <Mono>Y</Mono> or an <Mono>N</Mono> — which is the whole reason this
        corpus can be scored rather than admired.
      </p>

      <p className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">
        The rest of the file is the opposite.{' '}
        {Math.round((COMPLAINT_FACTS.allCaps / UNITS.complaints) * 100)}% of
        narratives are in capitals, {COMPLAINT_FACTS.short.toLocaleString('en-GB')}{' '}
        are under forty characters, and the component field takes{' '}
        {DISTINCT.components} distinct spellings across {DISTINCT.makes} makes.
        Both halves are in the same row.
      </p>
    </section>
  );
}

/**
 * The refusal, as a section rather than a caveat.
 *
 * On the other three deployments "what it will not answer" is a block at the
 * foot of a result. Here it is load-bearing enough to be structure: concluding
 * that a remedy failed is a regulatory judgement with legal weight, and a
 * product that let a model reach it would be wrong in a way no eval score would
 * show.
 */
function Refusal() {
  return (
    <section
      className="lift-in border-t border-ui-line pt-10 pb-14"
      style={{ animationDelay: '220ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        What it is not allowed to say
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <p className="max-w-[54ch] leading-relaxed text-ui-dim">
          It will not conclude that a remedy failed. That is a finding with legal
          weight, and it belongs to a regulator or to a named person at the
          customer — never to a model reading narratives.
        </p>
        <p className="max-w-[54ch] leading-relaxed text-ui-dim">
          What it will do is show both records, count what was filed on each side
          of the remedy date, cite every one by its public identifier, and say
          plainly that the two disagree and the decision is somebody's to make.
        </p>
      </div>
    </section>
  );
}

function Onward() {
  return (
    <section className="lift-in pt-10" style={{ animationDelay: '260ms' }}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          to="/data-flow"
          className="font-mono text-sm text-cal-1 transition-colors hover:text-ui-fg"
        >
          Where the data goes →
        </Link>
        <span className="font-mono text-sm text-ui-faint">
          The desk is not built yet — the answer contract is written after the
          answer key, not before it.
        </span>
      </div>
    </section>
  );
}
