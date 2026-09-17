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
import { BoxIcon } from '@fde/uikit';
import { Link } from '@tanstack/react-router';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { VERESK } from '../lib/links';

/**
 * Every figure on this page, in one place, with what produced it.
 *
 * MEASURED AGAINST THE LIVE API on 2026-09-16/17 and recorded in
 * `docs/recalls/PLAN.md` §3. They describe ONE vehicle — the 2019 Honda
 * Odyssey — because the corpus slice is still an open decision (§9.1), and a
 * page that quoted an estate total before one existed would be inventing the
 * number it is most likely to be quoted on.
 */
const MEASURED = {
  vehicle: '2019 Honda Odyssey',
  complaints: 956,
  allCaps: 131,
  allCapsPct: 13,
  shortest: 7,
  longest: 2076,
  components: 143,
  withVin: 939,
  namingFamily: 39,
} as const;

export function CalderLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-5 pb-24 sm:px-6">
        <Hero />
        <Contradiction />
        <Estate />
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
          <p className="cal-record-id">51 of 55 complaints · filed after that date</p>
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

function Estate() {
  const sources = [
    {
      token: 'var(--color-cal-1)',
      name: 'complaints',
      shape: 'free text, loose fields',
      body: `${MEASURED.complaints.toLocaleString('en-GB')} on the ${MEASURED.vehicle} alone. ${MEASURED.allCaps} of them (${MEASURED.allCapsPct}%) are in capitals, they run from ${MEASURED.shortest} to ${MEASURED.longest.toLocaleString('en-GB')} characters, and the component field takes ${MEASURED.components} distinct spellings.`,
      inScope: true,
    },
    {
      token: 'var(--color-cal-2)',
      name: 'recalls',
      shape: 'structured records, prose blocks',
      body: 'The manufacturer’s filed statement of defect, consequence and remedy. Structured enough to look tidy, which is its own trap: the prose blocks carry the part that matters.',
      inScope: true,
    },
    {
      token: 'var(--color-cal-3)',
      name: 'investigations',
      shape: 'documents',
      body: 'The regulator’s own enquiries, which may precede a recall. The richest material for “NHTSA disagreed with the manufacturer”, and out of scope for the first version — named rather than quietly omitted.',
      inScope: false,
    },
  ];

  return (
    <section
      className="lift-in border-t border-ui-line pt-10 pb-14"
      style={{ animationDelay: '180ms' }}
    >
      <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
        Three sources, and their shapes differ on purpose
      </h2>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ui-dim">
        Nobody wrote this corpus for us. It is misspelt, inconsistently
        formatted between one endpoint and the next, and full of things nobody
        thought to categorise — which is the whole reason it is here.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {sources.map((s) => (
          <div
            key={s.name}
            className={`rounded-xl border border-ui-line bg-ui-surface p-5 ${s.inScope ? '' : 'opacity-60'}`}
          >
            <span
              aria-hidden
              className="block h-[2px] w-10 rounded-full"
              style={{ background: s.token }}
            />
            <p className="mt-4 font-mono text-sm text-ui-fg">{s.name}</p>
            <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
              {s.shape}
            </p>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ui-dim">{s.body}</p>
            {!s.inScope && (
              <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.06em] text-ui-faint uppercase">
                not ingested
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 max-w-[64ch] text-[0.8125rem] leading-relaxed text-ui-faint">
        Counts are from one vehicle, measured against the live API on 2026-09-17.
        The estate total is deliberately absent: which models and which years are
        still being decided, and a number quoted before it exists is the one you
        get held to.
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
