/**
 * How the files become rows — the section that answers "so what do you actually
 * DO with 1,069 documents?"
 *
 * IT IS THREE STAGES BECAUSE THE CORPUS IS THREE DIFFERENT PROBLEMS, not
 * because three is a nice number for a diagram. A timesheet has columns and a
 * design rationale does not; code has functions and a quotation has a table
 * with a prose appendix underneath it. One mechanism over all of that is either
 * a model reading a CSV — expensive, slower and able to be wrong about
 * arithmetic — or a regex reading English.
 *
 * THE ORDER IS THE ARGUMENT AND THE NUMERALS ARE EARNED. Numbered markers are
 * avoided across this site because most lists are not sequences. This one is:
 * parsing is free, exact and cannot invent, so it goes first and becomes the
 * harness the two fallible stages get checked against. Build the model stage
 * first and there is nothing for it to be wrong against.
 *
 * WHAT IS BUILT IS MARKED, AND NOT IN GREEN. The standing rule across this
 * portfolio is that nothing reassuring gets the colour nobody audits — and
 * "built" is a long way from "works". A finished stage is brighter and carries
 * what it produced; an unbuilt one is dim and says nothing it cannot back.
 *
 * EACH STAGE OPENS, AND CARRIES ITS OWN COLOUR. The card is what a bid
 * engineer reads while skimming; behind it is the same thing written for
 * whoever they forward the link to — no "chunk", no "embed", the idea before
 * the mechanism, and a real before-and-after where there is one. Those are two
 * different pieces of writing for two different readers, which is why one opens
 * out of the other rather than being crammed onto the card.
 *
 * THE HUE IS NOT DECORATION EITHER. It is what makes the card under the cursor
 * and the panel that grows out of it recognisably the same object, on a row of
 * three cards that are otherwise laid out identically.
 *
 * THE CEILING IS ON THE PAGE AT THE SAME SIZE AS THE RESULT. An engagement
 * reporting only what it managed to read is selling the good half of its own
 * answer. The three figures at the bottom are what the documents cannot tell
 * anyone, and they are the part a customer could not have got from a brochure.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf, type Origin } from '@fde/uikit';
import { CEILINGS, MEASURED_BY, STAGES, TRAPS, type Stage } from '../lib/pipeline';

export function Pipeline() {
  const [opened, setOpened] = useState<{ stage: Stage; from: Origin } | null>(null);
  const close = useCallback(() => setOpened(null), []);

  return (
    <section className="border-t border-ui-line py-16">
      <h2 className="max-w-[34ch] font-mono text-2xl leading-snug font-medium tracking-tight text-ui-fg md:text-3xl">
        From 1,069 files to rows we can stand behind.
      </h2>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-ui-dim">
        The documents are what the customer has. Rows are what a question can be answered from.
        Everything between the two is this, and it is deliberately three separate jobs, in an order 
        that lets each one check the next.
      </p>

      <ol className="mt-10 grid gap-4 lg:grid-cols-3">
        {STAGES.map((stage, i) => (
          <li key={stage.name} className="grid">
            <button
              type="button"
              data-built={stage.built}
              onClick={(e) => setOpened({ stage, from: originOf(e.currentTarget) })}
              style={{ '--ui-tone': stage.tone } as React.CSSProperties}
              className="stage-card group relative rounded-2xl border border-ui-line bg-ui-surface/60 p-5 text-left"
            >
            <div className="flex items-baseline gap-3">
              <span className="stage-n">{i + 1}</span>
              <h3 className="font-mono text-base font-medium text-ui-fg">{stage.name}</h3>
              <span className="ml-auto font-mono text-[0.6875rem] text-ui-faint">
                {stage.built ? 'built' : 'not built'}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-ui-dim">{stage.material}</p>

            <dl className="mt-4 grid gap-2 text-xs leading-relaxed">
              <Row term="on" value={stage.volume} />
              <Row term="how" value={stage.mechanism} />
              <Row term="can it be wrong" value={stage.wrong} />
            </dl>

            {stage.result && (
              <p className="mt-4 border-t border-ui-line pt-3 text-xs leading-relaxed text-ui-dim">
                {stage.result}
              </p>
            )}

            <p className="stage-open mt-4">what this actually does →</p>
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-4 font-mono text-[0.6875rem] text-ui-faint">
        counted by {MEASURED_BY.parse} · {MEASURED_BY.corpus}
      </p>

      <Traps />
      <Ceiling />

      {opened && <StageDialog stage={opened.stage} from={opened.from} onClose={close} />}
    </section>
  );
}

/**
 * One stage, explained from scratch.
 *
 * EXPORTED, because two pages open it. The landing shows the three stages as a
 * summary of the work; `/data-flow` shows them as a connected pipeline for a
 * customer asking where the rows came from. Same stages, same prose, two
 * presentations — a second copy of this explanation is the thing that would
 * drift, and it is long enough that the drift would not be noticed.
 *
 * NO JARGON, AND THE IDEA BEFORE THE MECHANISM. "Chunk" and "embed" are on the
 * card because they are the right words for somebody who already knows them.
 * In here the same step is "cut each document at its natural seams and store
 * the pieces so they can be found by meaning" — longer, and the only version
 * that works on a reader who has not done this before.
 */
export function StageDialog({
  stage,
  from,
  onClose,
}: {
  stage: Stage;
  from: Origin;
  onClose: () => void;
}) {
  return (
    <OriginDialog
      from={from}
      tone={stage.tone}
      label={`${stage.name}, explained`}
      onClose={onClose}
      header={
        <>
          <span className="stage-n stage-n--lit">{STAGES.indexOf(stage) + 1}</span>
          <div className="min-w-0">
            <p className="font-mono text-base font-medium text-ui-fg">{stage.name}</p>
            <p className="text-sm text-ui-dim">{stage.material}</p>
          </div>
          <p className="ui-dialog-figs">
            <span className="font-mono">{stage.built ? 'built' : 'not built'}</span>
          </p>
        </>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <div className="grid content-start gap-5">
          <p className="ba-plain-head">what this actually does</p>
          {stage.plainly.does.map((para) => (
            <p key={para} className="max-w-[64ch] leading-relaxed text-ui-dim">
              {para}
            </p>
          ))}

          {stage.plainly.example && (
            <figure className="stage-example">
              <figcaption className="ba-plain-head">{stage.plainly.example.caption}</figcaption>
              <p className="stage-example-row mt-3">{stage.plainly.example.before}</p>
              <p className="stage-example-arrow">becomes</p>
              <p className="stage-example-row stage-example-row--after">
                {stage.plainly.example.after}
              </p>
            </figure>
          )}
        </div>

        <div className="grid content-start gap-6">
          <div className="ba-plain" style={{ '--ui-tone': stage.tone } as React.CSSProperties}>
            <p className="ba-plain-head">why it goes here in the order</p>
            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ui-dim">
              {stage.plainly.why}
            </p>
          </div>

          <div className="ba-plain" style={{ '--ui-tone': stage.tone } as React.CSSProperties}>
            <p className="ba-plain-head">the part that is harder than it sounds</p>
            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ui-dim">
              {stage.plainly.catch_}
            </p>
          </div>

          <dl className="grid gap-2 border-t border-ui-line pt-4 text-xs leading-relaxed">
            <Row term="on" value={stage.volume} />
            <Row term="how" value={stage.mechanism} />
            {stage.result && <Row term="produced" value={stage.result} />}
          </dl>
        </div>
      </div>
    </OriginDialog>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3">
      <dt className="font-mono text-ui-faint">{term}</dt>
      <dd className="text-ui-dim">{value}</dd>
    </div>
  );
}

/**
 * The mess, named. Every one of these is in the corpus on purpose — a generator
 * that produced tidy documents would prove nothing, because the entire question
 * is whether the reading survives what real exports look like.
 */
function Traps() {
  return (
    <div className="mt-14">
      <h3 className="max-w-[40ch] font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg">
        What the files do to make that hard.
      </h3>
      <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-ui-dim">
        All of it is planted, and all of it is the kind of thing a real export does. A parser that 
        tidied any of it away would report a cleaner run and a worse answer.
      </p>

      <ul className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-ui-line bg-ui-line">
        {TRAPS.map((trap) => (
          <li key={trap.what} className="grid gap-2 bg-ui-bg p-5 lg:grid-cols-[22rem_1fr] lg:gap-8">
            <div>
              <p className="text-sm font-medium text-ui-fg">{trap.what}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ui-faint">{trap.detail}</p>
            </div>
            <p className="max-w-[62ch] text-sm leading-relaxed text-ui-dim">{trap.outcome}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the documents cannot say, at the same size as what they can. */
function Ceiling() {
  return (
    <div className="mt-14">
      <h3 className="max-w-[44ch] font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg">
        And what no amount of reading will produce.
      </h3>
      <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ui-dim">
        These are findings, not delays. Each one is the kind of thing a customer would otherwise 
        discover in front of their own management, and naming it in week one is most of what this 
        part of the work is for.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {CEILINGS.map((c) => (
          <div key={c.figure} className="rounded-2xl border border-ui-line p-5">
            <p className="font-mono text-2xl font-medium tracking-tight text-ui-fg">{c.figure}</p>
            <p className="mt-1 font-mono text-[0.6875rem] text-ui-faint">{c.of}</p>
            <p className="mt-4 text-sm leading-relaxed text-ui-dim">{c.says}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
