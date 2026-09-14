/**
 * Vantis Steering Systems — the third engagement, six days old.
 *
 * WHO ARRIVES HERE. A systems engineer on a bid team with an OEM's requirement
 * specification on the desk and two weeks to answer four questions about it.
 * Not a buyer: the page assumes the reader knows what an RFQ is and does not
 * explain the industry to them.
 *
 * IT OPENS ON WHAT IS NOT BUILT, WHICH IS UNUSUAL AND DELIBERATE. The pharma
 * page opens on a question it can answer. This one cannot answer anything yet,
 * and a page that implied otherwise would be the exact brochure this portfolio
 * is arguing against. So the state is the second thing a reader sees, before
 * the estate they might otherwise assume is wired to something.
 *
 * THE STATE PANEL IS THE PART THAT MOVES, and it moved twice on 2026-09-13.
 * `docs/steering/PLAN.md` corrected itself first: the four databases were
 * generated alongside the corpus from the same constants, not derived from it,
 * so they are an answer key rather than an output — and until that day nothing
 * had ever read a document and written a row. Then `pnpm derived:parse` ran, and the
 * first 12,978 rows became real. Both halves are on the page, in that order,
 * because a page that only showed the second one would be claiming the problem
 * had never existed.
 *
 * AND THE PAGE NOW DRAWS THE PRODUCT, NOT ONLY THE READING. The whole page
 * below the hero was about turning 1,069 files into rows; nothing said what
 * then happens to a question, which is the thing the hero has just promised.
 * So `AssessMap` sits directly under the hero and answers it. Meridian Pharma's
 * front door had the same hole and closed it the same way — this borrows the
 * component and none of the content. See `components/flow/AssessMap.tsx` for
 * why the two drawings make opposite arguments, and why the four databases the
 * estate section further down shows are deliberately absent from the request
 * path.
 *
 * THE NUMBERS ARE MEASURED, AND BY TWO DIFFERENT COMMANDS. 13,705 rows and the
 * per-database counts come from `pnpm steering:estate`, which counts the live
 * databases. 1,069 files and 1.9 MB come from `pnpm steering:corpus-check`,
 * which walks the directory. The 180-hour figure is the industry number for a
 * full RFQ response quoted in the plan, and is labelled as somebody else's
 * number rather than ours.
 */
import { BoxIcon } from '@fde/uikit';
import { Aurora, type AuroraTone } from '@veresk/surface';
import { AssessMap } from '../components/flow/AssessMap';
import { BeforeAfter } from '../components/BeforeAfter';
import { Pipeline } from '../components/Pipeline';
import { SteeringEstate } from '../components/SteeringEstate';
import { PHARMA, VERESK } from '../lib/links';

/**
 * The wash behind the hero, in this customer's colours.
 *
 * THE CLASSES ARE WRITTEN HERE RATHER THAN DEFAULTED IN THE PACKAGE for a
 * reason that would otherwise fail silently: Tailwind generates a class only
 * where it can see it, and it does not read `node_modules`. A `bg-vst-2/18`
 * living inside `@veresk/surface` would produce a colourless page from a
 * successful build.
 */
const AURORA: AuroraTone[] = [
  { className: 'bg-vst-1/18', size: 'h-[38rem] w-[38rem]', at: { top: '-14rem', left: '-10rem' } },
  {
    className: 'bg-vst-3/16',
    size: 'h-[34rem] w-[34rem]',
    at: { top: '-6rem', right: '-12rem' },
    delay: '-8s',
  },
  {
    className: 'bg-vst-2/10',
    size: 'h-[30rem] w-[30rem]',
    at: { top: '46rem', left: '30%' },
    delay: '-15s',
  },
];

/**
 * What Dario has to answer, in his words rather than the process model's.
 * ASPICE calls these SYS.1 through SYS.3; nobody on a bid team says that out
 * loud, and the page is for them.
 */
const QUESTIONS = [
  { q: 'Which of this do we already ship?', a: 'Reuse. Cheap, fast, and the answer somebody will argue with.' },
  { q: 'Which do we ship after a change?', a: 'A delta — and how big, in engineering hours.' },
  { q: 'Which does not exist yet?', a: 'New development, and the risk that comes with it.' },
  { q: 'What does all of that cost?', a: 'A range, from what changes like it actually took.' },
];

export function SteeringLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        {/* THE FIRM'S NAME IS A LINK ONLY WHERE THERE IS SOMEWHERE TO GO.
            `VERESK` is null in a production build with nothing configured, and a
            brand mark that navigates nowhere is worse than one that is simply a
            brand mark. See `lib/links.ts` for the build-time trap behind it. */}
        {VERESK ? (
          <a href={VERESK} className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
            <BoxIcon />
          </span>
          <span className="font-medium tracking-tight">Veresk</span>
          </a>
        ) : (
          <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
            <BoxIcon />
          </span>
          <span className="font-medium tracking-tight">Veresk</span>
          </span>
        )}
        <span className="text-sm text-ui-faint">/ Vantis Steering</span>
        <a
          href="/desk"
          className="text-sm text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto"
        >
          Assess a requirement
        </a>
        <a href="/data-flow" className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
          Where your data goes
        </a>
        {PHARMA && (
          <a href={PHARMA} className="text-sm text-ui-dim transition-colors hover:text-ui-fg">
            Meridian Pharma
          </a>
        )}
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <section className="pt-10 pb-12 sm:pt-16 md:pt-24">
          <h1
            className="lift-in title-spectrum max-w-4xl font-mono text-[1.75rem] leading-[1.1] font-semibold tracking-tighter break-words sm:text-5xl md:text-7xl"
            style={{ animationDelay: '60ms' }}
          >
            What of this do we already have?
          </h1>

          <p
            className="lift-in mt-6 max-w-[50ch] leading-relaxed text-ui-dim sm:text-lg md:mt-8 md:text-xl"
            style={{ animationDelay: '200ms' }}
          >
            An OEM sends four hundred requirements and wants a price in two weeks. The answer lives
            in four systems and in six colleagues' memories, and the same question asked twice gets
            two different answers.
          </p>

          <p
            className="lift-in mt-6 max-w-[56ch] leading-relaxed text-ui-faint"
            style={{ animationDelay: '320ms' }}
          >
            The industry number for a full RFQ response is up to 180 labour hours. That is their
            figure, not ours — we have not measured anything here yet.
          </p>
        </section>

        {/* FIRST, DIRECTLY UNDER THE HERO, AND IT WAS BRIEFLY FOURTH. Under
            `Pipeline` it had the tidier dependency — the map's outer ring is
            the rows those three stages produce, so a reader met `vst_derived`
            only after something had said where it came from. It was the wrong
            trade. The hero says the answer lives in four systems and six
            colleagues' memories, and then three sections of reading go by
            before anything shows what the product DOES with a question. The
            map is the answer to the hero, so it goes where the answer to the
            hero goes.

            WHAT THAT COSTS, AND HOW IT IS PAID: the ring names five tables
            nothing has introduced yet. So the map's own intro points forward
            to the reading instead of back at it, and the three tones it
            borrows are explained where they are defined, one section down. */}
        <AssessMap />

        <Questions />

        <BeforeAfter />

        <Pipeline />

        {/* LAST, AND IT USED TO BE FIRST. In the lead position this read as
            "here is the estate" — the exact framing `docs/steering/PLAN.md`
            retracted, because these four were generated alongside the documents
            rather than derived from them. A reader met the cheat before they
            met the files. Moved below the reading it is measured against, it
            says the true thing instead: this is the yardstick, and here is what
            a finished answer has to look like. */}
        <SteeringEstate />

        <State />

        <footer className="border-t border-ui-line py-10 text-sm text-ui-faint">
          A practice engagement. Vantis Steering Systems is fictional; the estate, the requirements
          and the code base behind it are generated.
        </footer>
      </main>
    </div>
  );
}

function Questions() {
  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        Four answers, two weeks, one bid.
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
        The commercial team needs the same four things every time. Each one is a reachability
        question over a graph nobody can see all of.
      </p>

      <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {QUESTIONS.map((item, i) => (
          <li key={item.q} className="method-step">
            <span className="method-step-n">{i + 1}</span>
            <h3 className="font-mono text-base font-medium text-ui-fg">{item.q}</h3>
            <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-ui-dim">{item.a}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Where it actually is. The honest version, in the position a feature list
 * would normally occupy.
 */
function State() {
  return (
    <section className="border-t border-ui-line py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <h2 className="max-w-[24ch] font-mono text-2xl leading-snug font-medium tracking-tight md:text-3xl">
            It answers one question now.
          </h2>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            This engagement is six days old. What exists is 1,069 of the customer's documents and
            four databases holding the answer somebody read out of them — thirty years of
            programmes, requirements, architecture and what past changes actually cost.
          </p>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            Those four were generated alongside the files, from the same constants, in the same run
            — so they are{' '}
            <span className="text-ui-fg">a key to mark against, not an output</span>. Until this
            week nothing had ever read one of those documents and written a row.
          </p>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            Now the reading is done and the first answer stands on it.{' '}
            <span className="font-mono text-ui-fg">vst_derived</span> holds 19,141 rows — parsed out
            of the spreadsheets, cut out of the prose, and read out of the closure reports by a
            model that had to quote the sentence it read each fact from. Every row carries its file
            and its line.
          </p>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            On top of that there is{' '}
            <a href="/desk" className="text-ui-fg underline underline-offset-4 hover:text-ui-accent">
              a desk that assesses one customer requirement
            </a>{' '}
            — what we already have, what has to change, what does not exist, and what past jobs of
            the same kind cost. It is allowed to refuse, and below three comparable jobs it does.
          </p>
          {/* THE HONEST REMAINDER, AND IT MOVES RATHER THAN DISAPPEARS. The
              previous version of this section said "no tool, no prompt, no
              answer contract and no evals" and was true when it was written.
              Leaving it would have been the page understating itself; deleting
              the paragraph entirely would have been the page losing the habit. */}
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            What is still missing: it assesses one requirement at a time and a bid is twenty-four,
            the search does not yet confine itself to the programme being asked about, and the eval
            suite has cases but no baseline on disk. Saying all of this here is cheaper than being
            caught.
          </p>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-ui-line bg-ui-surface/80 shadow-2xl shadow-black/40 backdrop-blur">
          <figcaption className="border-b border-ui-line px-5 py-3 text-sm text-ui-dim">
            What is built
          </figcaption>
          <ul className="divide-y divide-ui-line">
            {[
              ['Four databases, seeded and checked — the answer key', true],
              ['1,069 documents, with their contradictions planted on purpose', true],
              ['The trace graph — requirement to element to part', true],
              ['vst_derived — ours, 12,978 rows parsed out of the files', true],
              ['A parser that reads a document and writes a row', true],
              ['Reconciliation against the answer key, to the expected delta', true],
              ['Chunking and embedding the prose and the code', true],
              ['Facts extracted from sentences, each quoting its own evidence', true],
              ['Two tools the model can call', true],
              ['An answer contract, and the rules that keep it', true],
              ['A desk that assesses a requirement and shows its working', true],
              ['Eval cases, anchored to the planted traps', true],
              ['A baseline on disk to compare a change against', false],
              ['The search confined to the programme being asked about', false],
              ['All twenty-four requirements of a bid, not one', false],
            ].map(([label, done]) => (
              <li key={label as string} className="flex items-center gap-3 px-5 py-3 text-sm">
                {/* A done mark is not green. The standing rule across this
                    portfolio is that nothing reassuring gets the colour nobody
                    audits — and "built" is not "works". */}
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 flex-none rounded-full ${done ? 'bg-ui-dim' : 'bg-transparent ring-1 ring-ui-line-lit'}`}
                />
                <span className={done ? 'text-ui-dim' : 'text-ui-faint'}>{label as string}</span>
              </li>
            ))}
          </ul>
        </figure>
      </div>
    </section>
  );
}
