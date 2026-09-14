/**
 * Meridian Pharma's front door — the first of Veresk's engagements.
 *
 * IT MOVED OFF `/` on 2026-09-13, when a second engagement made a single front
 * door dishonest: this page opens with "Can this batch ship?", which is not a
 * question the steering work has any opinion about. `/` now belongs to the
 * firm and says what an engagement IS; this page belongs to one customer and
 * says what theirs does.
 *
 * WHO ARRIVES HERE AND WHAT THEY NEED. A QA reviewer or a Qualified Person with
 * a batch waiting. They do not need to be sold anything — they need to know
 * what this will tell them, what it refuses to tell them, and where the desk is.
 * Three things, in that order.
 *
 * THE HERO IS THE SIX SYSTEMS, NOT A NUMBER. The most characteristic fact about
 * this product is not how fast it is: it is that the answer lives in six
 * databases which cannot be joined by any single query, so it has to be walked
 * one hop at a time. So the page draws the walk, and the dashes between the
 * systems carry the information. Close them and the page would be claiming a
 * join that does not exist.
 *
 * THAT DRAWING IS NOW `NerveMap`, AND IT TOOK OVER FROM A ROW OF SIX DOTS. The
 * row was right about the premise and silent about everything in front of it —
 * a reader saw six databases and no sign of the loop, the agents or the tools
 * that reach them, which is most of what there is to understand. The map shows
 * the whole path and every node opens to say what it holds. The argument the
 * dots were making is carried over verbatim, dashes included; see the
 * component's own header for why colour appears only on the return leg.
 *
 * THE DISPLAY FACE IS THE MONOSPACE, AND THAT IS A CHOICE. The obvious move on
 * a dark technical page is a large sans headline. But a GxP record IS a
 * monospaced printout — batch records, certificates of analysis, chromatogram
 * headers — so setting the headline in JetBrains Mono at display size puts the
 * page in its own industry's vernacular instead of a generic product voice.
 * Inter carries everything a person actually reads in sentences.
 *
 * TWO QUESTIONS NOW, AND THE PAGE HAD TO CHANGE SHAPE FOR IT. The hero still
 * asks one — "can this batch ship?" — because that is the question a reviewer
 * arrives with, and a front door that opens onto a menu has decided nothing.
 * But a second desk exists, and a page that mentioned it only in the nav would
 * be hiding half the product. So `TwoQuestions` states them side by side with
 * the figures each actually returns. The table is the honest form for it: the
 * two are genuinely comparable, row for row, and the rows are where they
 * differ — same estate, same refusal, different subject and a different shape
 * of answer.
 *
 * THE FIGURES IN IT ARE MEASURED, NOT ILLUSTRATIVE. Every number came from
 * `pnpm db:supplier-impact SUP-04` against the seeded estate, and the command
 * is printed under the table so a reader can reproduce it rather than trust it.
 * A front door quoting numbers nobody can check is the thing this product spends
 * its whole design arguing against.
 *
 * THE LAST SECTION IS A REFUSAL, WHICH IS UNUSUAL FOR A FRONT DOOR. It is the
 * single most important thing to say: this never issues a clearance. Burying
 * that below a feature list would be the design contradicting the product —
 * `release-schema.ts` has no field that could carry a verdict, and the page
 * should be as plain about it as the schema is.
 */
import { Link } from '@tanstack/react-router';
import { BoxIcon, BlockIcon, GavelIcon } from '@fde/uikit';
import { Aurora } from '@veresk/surface';
import { AURORA } from '../lib/aurora';
import { NerveMap } from '../components/flow/NerveMap';
import { PharmaEstate } from '../components/estate/PharmaEstate';

export function PharmaLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora tones={AURORA} />

      <nav className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-5 sm:px-6 sm:py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ui-accent/15 text-ui-accent ring-1 ring-ui-accent/30">
          <BoxIcon />
        </span>
        <span className="font-medium tracking-tight">Meridian Pharma</span>
        <Link
          to="/data-flow"
          className="text-sm text-ui-dim transition-colors hover:text-ui-fg sm:ml-auto"
        >
          Where your data goes
        </Link>
        <Link
          to="/supplier"
          className="text-sm text-ui-dim transition-colors hover:text-ui-fg"
        >
          Supplier impact
        </Link>
        <Link
          to="/desk"
          className="rounded-lg border border-ui-line bg-ui-raised/60 px-4 py-2 text-sm text-ui-dim transition-colors hover:border-ui-accent/50 hover:text-ui-fg"
        >
          Open the release desk
        </Link>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <section className="pt-10 pb-14 sm:pt-14 md:pt-20 md:pb-16">
          {/* THE DISPLAY SIZE CAME DOWN, AND IT IS THE SAME SIZE THE STEERING
              PAGE TOOK. Two engagement front doors at 72px and the size stops
              being emphasis and starts being the house font; the pair has to
              move together or the firm's two doors stop looking like one
              firm's.

              56px RATHER THAN 60 IS MEASURED, AND THE CONSTRAINT IS THE OTHER
              PAGE'S HEADLINE. JetBrains Mono advances about 0.6em, so at 60px
              inside `max-w-4xl` (896px) steering's "Four hundred requirements."
              is 936px and breaks after "Four hundred" — a three-line hero. At
              56px it is 874px and breaks at the full stop, which is where the
              sentence breaks anyway. This one reads "Can this batch ship?" and
              fits on one line either way; it takes the smaller size so that the
              two doors match rather than because it needs to. */}
          <h1
            className="lift-in title-spectrum max-w-4xl font-mono text-[1.75rem] leading-[1.08] font-semibold tracking-tighter break-words sm:text-[2.5rem] md:text-[3.5rem]"
            style={{ animationDelay: '60ms' }}
          >
            Can this batch ship?
          </h1>

          <p
            className="lift-in mt-5 max-w-[48ch] leading-relaxed text-ui-dim md:mt-6 md:text-lg"
            style={{ animationDelay: '200ms' }}
          >
            Six systems hold the answer and none can see the other five. Today a reviewer opens all
            six and joins them by hand. This walks them in about a minute and names what would stop
            the batch leaving.
          </p>

          <div
            className="lift-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"
            style={{ animationDelay: '340ms' }}
          >
            <Link
              to="/desk"
              // `active:` gives the press an immediate acknowledgement that
              // does not wait on the route: the first feedback a person gets
              // should never depend on how fast the next page loads.
              className="cta-glow rounded-xl bg-ui-accent px-7 py-3.5 font-medium text-ui-bg transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ui-accent/40 focus-visible:outline-none"
            >
              Open the release desk
            </Link>
            {/* SECONDARY, AND VISIBLY SO. The two questions are not equally
                likely to be why somebody opened this page — a batch waiting is
                urgent every day, a supplier disqualification is an event. The
                second desk is one click away and does not compete for the
                first. */}
            <Link
              to="/supplier"
              className="rounded-xl border border-ui-line px-5 py-3.5 text-ui-dim transition-colors hover:border-ui-accent/50 hover:text-ui-fg"
            >
              Or: a supplier was disqualified
            </Link>
            <p className="font-mono text-sm text-ui-faint">
              94 batches on file · 6 systems · 30 documents
            </p>
          </div>
        </section>

        <NerveMap />

        <PharmaEstate />

        <TwoQuestions />

        <Refusal />

        <section className="border-t border-ui-line py-10">
          <p className="max-w-[58ch] leading-relaxed text-ui-dim">
            Answering a question means sending part of your data to a language model. Which parts,
            where they stop, and the command that proves each claim —{' '}
            <Link to="/data-flow" className="text-ui-accent underline-offset-4 hover:underline">
              where your data goes
            </Link>
            .
          </p>
        </section>

        <footer className="border-t border-ui-line py-10 text-sm text-ui-faint">
          A practice engagement. The estate, the batches and the procedures are synthetic.
        </footer>
      </main>
    </div>
  );
}


/**
 * The two questions, row for row.
 *
 * A TABLE RATHER THAN TWO CARDS, because the two really are comparable on every
 * line and the comparison is the content. Cards side by side would invite the
 * eye to read down one and then the other, which is exactly the reading that
 * misses the point — that the estate, the refusal and the citations are shared,
 * and only the subject and the shape of the answer differ.
 *
 * THE LAST ROW IS THE REFUSAL, in both columns, deliberately. It is the one row
 * where the two say the same thing in different words, and putting it at the
 * foot of the comparison makes the shared limit the thing a reader leaves with.
 */
const COMPARISON: Array<{ row: string; release: string; supplier: string }> = [
  {
    row: 'You ask',
    release: 'Can this batch go to this market?',
    supplier: 'This supplier was disqualified — what did we make with their material?',
  },
  {
    row: 'The subject',
    release: 'One lot, one destination.',
    supplier: 'One supplier, and every lot their material reached.',
  },
  {
    row: 'What comes back',
    release: 'A dossier: what would block it, with the rule that makes it a blocker.',
    supplier: 'A work list, one row per affected lot, ranked by how far the material got.',
  },
  {
    row: 'Measured on the seeded estate',
    release: '29 queries across the six systems, about a minute.',
    supplier: '23 affected lots · 3,768,955 units · 19 deliveries traced.',
  },
  {
    row: 'The worst finding it will state',
    release: 'A blocker, with the clause behind it.',
    supplier: '5 lots reached a hospital or a pharmacy chain.',
  },
  {
    row: 'What it refuses to say',
    release: 'That the batch may ship. A QP decides.',
    supplier: 'That anything should be recalled. Quality and Regulatory decide.',
  },
];

function TwoQuestions() {
  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[30ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        Two questions, one estate.
      </h2>
      <p className="mt-4 max-w-[58ch] leading-relaxed text-ui-dim">
        Both walk the same six systems and cite the same records. They differ in what they are
        about, and in the shape of what comes back — which is why they are two desks and not one
        with a dropdown.
      </p>

      {/* Scrollable rather than stacked on a narrow screen: a comparison that
          reflows into two separate lists is no longer a comparison. */}
      <div className="mt-8 -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-ui-line">
              <th className="w-[14rem] py-3 pr-4 align-bottom text-sm font-normal text-ui-faint">
                &nbsp;
              </th>
              <th className="py-3 pr-4 align-bottom">
                <Link to="/desk" className="group inline-flex flex-col gap-1">
                  <span className="font-mono text-lg font-medium text-ui-fg group-hover:text-ui-accent">
                    Release desk
                  </span>
                  <span className="text-xs text-ui-faint group-hover:text-ui-dim">
                    Open it →
                  </span>
                </Link>
              </th>
              <th className="py-3 align-bottom">
                <Link to="/supplier" className="group inline-flex flex-col gap-1">
                  <span className="font-mono text-lg font-medium text-ui-fg group-hover:text-ui-accent">
                    Supplier impact
                  </span>
                  <span className="text-xs text-ui-faint group-hover:text-ui-dim">
                    Open it →
                  </span>
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((c, i) => {
              const last = i === COMPARISON.length - 1;
              return (
                <tr
                  key={c.row}
                  className={`border-b border-ui-line/60 align-top ${last ? 'text-ui-warn' : ''}`}
                >
                  <th className="py-4 pr-4 text-sm font-normal text-ui-faint">{c.row}</th>
                  <td className={`py-4 pr-4 text-sm leading-relaxed ${last ? '' : 'text-ui-dim'}`}>
                    {c.release}
                  </td>
                  <td className={`py-4 text-sm leading-relaxed ${last ? '' : 'text-ui-dim'}`}>
                    {c.supplier}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-5 font-mono text-xs text-ui-faint">
        Supplier figures from <span className="text-ui-dim">pnpm db:supplier-impact SUP-04</span>,
        which reads the estate and calls no model.
      </p>
    </section>
  );
}

/**
 * What it will not do, stated as plainly as the schema states it.
 *
 * Rendered as the actual strongest answer the system can return, because
 * describing a refusal in marketing prose invites the reader to assume there is
 * a "yes" behind it somewhere. There is not — the contract has no field that
 * could hold one.
 */
function Refusal() {
  return (
    <section className="py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <h2 className="max-w-[24ch] font-mono text-2xl leading-snug font-medium tracking-tight md:text-3xl">
            It never says yes.
          </h2>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            Under Annex 16 the signature is a person's. So the strongest thing this can return is
            that nothing was found to block the batch — which is a statement about the checks that
            ran, not a clearance. There is no field in the answer that could carry one, and no green
            tick anywhere in the product.
          </p>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-ui-dim">
            What it does instead is prepare the file: every finding with the rule that makes it one,
            every gap it could not close, and the name of whoever has to decide.
          </p>
        </div>

        <figure className="overflow-hidden rounded-2xl border border-ui-line bg-ui-surface/80 shadow-2xl shadow-black/40 backdrop-blur">
          <figcaption className="flex items-center gap-2.5 border-b border-ui-line px-5 py-3 text-sm text-ui-dim">
            <span className="text-ui-warn">
              <GavelIcon />
            </span>
            The strongest answer it gives
          </figcaption>

          <div className="px-5 py-6">
            <p className="font-mono text-xl leading-snug text-ui-fg">No blocker found</p>
            <p className="mt-1.5 font-mono text-xl leading-snug text-ui-warn">for QP review</p>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-ui-line bg-ui-raised/50 p-4 text-sm leading-relaxed text-ui-dim">
              <span className="mt-0.5 text-ui-danger">
                <BlockIcon />
              </span>
              <span>
                Absence of a finding is not a certification. A Qualified Person signs.
              </span>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
