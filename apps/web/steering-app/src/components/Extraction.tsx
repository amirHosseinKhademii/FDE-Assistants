/**
 * How the facts got out of the files — the pipeline that runs BEFORE the walk.
 *
 * IT SITS ABOVE `Walk` BECAUSE IT COMES FIRST IN LIFE. The walk queries rows;
 * this is where the rows came from. A customer shown a price built out of a
 * database will ask where the database came from, and the honest answer is that
 * a model read English — which is exactly the part they will want to poke at.
 * Putting it after the price would be answering the question only once somebody
 * had already been asked to trust the number.
 *
 * THE CENTREPIECE IS ONE SENTENCE BECOMING ONE ROW. Everything else here is
 * argument; that is evidence. Three fields, none of which exists as a column
 * anywhere in the estate, taken out of a paragraph somebody wrote months late.
 *
 * THE SAFEGUARDS CARRY WHAT THEY CAUGHT, not what they intend. A safeguard
 * nobody has seen fire is a safeguard nobody can read a pass from — the same
 * rule the compliance checks on this page follow by planting a violation.
 *
 * AND THE LAST BLOCK IS THE BILL. Being honest cost one answer outright: a
 * €202,853 line became a refusal. Showing the two columns side by side is the
 * only way to make "we refused" read as a decision rather than as a shortfall.
 */
import { useCallback, useState } from 'react';
import { OriginDialog } from '@fde/uikit';
import { Mono, originOf, type Origin } from '@fde/uikit';
import {
  PARSE_EXAMPLES,
  PARSE_NOTES,
  SEARCH_EXAMPLE,
  SEARCH_FIGURES,
  SEARCH_NOTES,
  type Note,
} from '../lib/parsing';
import { DOC, EXTRACT_NOTES, RESULT, SORT_PHASES, SORT_STEPS, type SortStep } from '../lib/sorting';
import { STAGES, type Stage } from '../lib/pipeline';
import { StageDialog } from './Pipeline';

export function Extraction() {
  return (
    <section className="lift-in border-t border-ui-line pt-12 pb-16" style={{ animationDelay: '60ms' }}>
      <h2 className="font-mono text-2xl font-medium tracking-tight md:text-3xl">
        How the facts got out of the files.
      </h2>
      <p className="mt-4 max-w-[66ch] leading-relaxed text-ui-dim">
        A file can be read. It cannot be counted, filtered or compared — you cannot ask 9,931
        timesheet rows <span className="text-ui-fg">“how many hours went into gearbox changes”</span>{' '}
        by reading them, and nobody has time to try. So the job is to get the facts into a database{' '}
        <span className="text-ui-fg">without inventing anything that was not there</span>. That
        second half is the whole difficulty.
      </p>

      <Kinds />
      <Parsing />
      <Search />
      <Extract />
    </section>
  );
}

/**
 * Three kinds of file as ONE PIPELINE, not three cards.
 *
 * IT WAS THREE CARDS AND THAT WAS THE WRONG SHAPE. Side by side and equally
 * weighted, they read as a menu — three ways you could do this, pick one. They
 * are not. They are three different problems that happen to live in one folder,
 * each handing its output to the same database, and two of them exist partly to
 * give the third something to be checked against. A connector and a result
 * under each stage says that; three boxes said the opposite.
 *
 * EACH ONE OPENS. The face carries what a bid engineer needs while skimming —
 * what kind of file, how many, whether a model touches it. Behind it is the
 * same step written for somebody who has never done this, with a real
 * before-and-after where there is one. Those are two different pieces of
 * writing for two different readers, which is why one opens out of the other.
 *
 * THE PROSE IS NOT DUPLICATED. `StageDialog` and the `STAGES` data are the
 * landing page's; this page renders them differently and shares the words. A
 * second copy of three long plain-English explanations is exactly the thing
 * that drifts, and it is long enough that nobody would notice it had.
 */
function Kinds() {
  const [opened, setOpened] = useState<{ stage: Stage; from: Origin } | null>(null);
  const close = useCallback(() => setOpened(null), []);

  return (
    <>
      <ol className="x-flow mt-9">
        {STAGES.map((stage, i) => (
          <li key={stage.id} className="x-flow-item">
            <button
              type="button"
              onClick={(e) => setOpened({ stage, from: originOf(e.currentTarget) })}
              data-built={stage.built}
              data-model={stage.id === 'extract'}
              style={{ '--ui-tone': stage.tone } as React.CSSProperties}
              className="x-stage"
            >
              <span className="x-stage-head">
                <span className="x-n">{i + 1}</span>
                <span className="x-stage-name">{stage.name}</span>
              </span>

              <span className="x-stage-what">{stage.material}</span>
              <span className="x-stage-vol">{stage.volume}</span>

              <span className="x-tag">
                {stage.id === 'extract' ? 'a model reads this one' : 'no model involved'}
              </span>

              <span className="x-open">what it actually does →</span>
            </button>

            {/* WHAT CAME OUT, HUNG BELOW THE STAGE RATHER THAN INSIDE IT. The
                stage is the job; this is the row count it produced, and
                separating them is what makes the middle one's emptiness
                legible as a state rather than as a missing sentence. */}
            <span aria-hidden className="x-drop" />
            <span className={`x-result ${stage.built ? '' : 'x-result--none'}`}>
              {stage.built ? stage.result : 'nothing yet — not built'}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-5 max-w-[68ch] text-sm leading-relaxed text-ui-dim">
        They are not three steps of one process — they are three different problems that happen to
        live in the same folder. The order is the point: parsing is free and exact, so it goes first
        and becomes the harness everything riskier is checked against.
      </p>

      {opened && <StageDialog stage={opened.stage} from={opened.from} onClose={close} />}
    </>
  );
}

/**
 * The labelled blocks under a step: under the hood, what we do not do, what
 * guarantees it.
 *
 * THEY REPLACED A CLOSING SENTENCE PER CARD. Those said what the example had
 * just shown and stopped — and the question a customer actually asks next is
 * *how*, which is one answer per step rather than one per example.
 */
function Notes({ notes }: { notes: Note[] }) {
  return (
    <dl className="x-notes">
      {notes.map((n) => (
        <div key={n.label}>
          <dt className="x-cap">{n.label}</dt>
          <dd>{n.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The reading that needs no model. Before and after, on two real files.
 *
 * IT GOES FIRST BECAUSE IT IS MOST OF THE WORK. 12,978 of the 14,298 rows in
 * `vst_derived` came out of this, in four seconds, for nothing. Leading with the
 * model would leave a reader thinking the model did the heavy lifting; it did
 * 1,320 rows and needed six safeguards to be believed.
 */
function Parsing() {
  return (
    <div className="mt-12">
      {/* THE HEADING TAKES THE STAGE'S COLOUR. `Parse` is cyan on the flow at
          the top of the section, so it is cyan here — the two are the same
          thing at two levels of detail, and a reader scrolling from one to the
          other should not have to work that out. */}
      <div className="x-head" style={{ '--ui-tone': 'var(--color-src-1)' } as React.CSSProperties}>
        <span className="x-head-n">1</span>
        <h3 className="x-head-title">Parsing</h3>
      </div>
      {/* SHORT ON PURPOSE. The long version said the same thing four times and
          buried the only claim that matters: no model touches this. */}
      <p className="mt-3 max-w-[60ch] leading-relaxed text-ui-dim">
        Spreadsheets exported to text. Code reads them —{' '}
        <span className="text-ui-fg">no model, four seconds, free to run again</span>. Most of the
        work, and the part least able to go quietly wrong.
      </p>

      {/* ONE CARD FOR THE STEP, TWO EXAMPLES INSIDE IT, AND THE EXPLANATION AT
          THE BOTTOM OF THE SAME CARD. The notes used to sit outside, after the
          examples, which left a reader deciding whether they belonged to the
          second example or to both. Inside the border there is no question. */}
      <div className="x-ba mt-7" style={{ '--ui-tone': 'var(--color-src-1)' } as React.CSSProperties}>
        {PARSE_EXAMPLES.map((ex) => (
          <div key={ex.title} className="x-ba-ex">
            <p className="x-ba-title">{ex.title}</p>

            <div className="x-ba-grid">
              <figure className="x-ba-side">
                <figcaption className="x-cap">before</figcaption>
                <div className="x-file">
                  <p className="x-file-name">{ex.before.file}</p>
                  <pre className="x-ba-doc">{ex.before.text}</pre>
                </div>
                <p className="x-ba-notice">{ex.before.notice}</p>
              </figure>

              {/* THE CROSSING CARRIES A TRAVELLING PULSE. It is the one piece
                  of motion in the section and it marks the one thing happening:
                  a file on the left becoming rows on the right. Motion tied to
                  a state, not decoration — and it stops under reduced motion. */}
              <div aria-hidden className="x-ba-arrow">
                <span className="x-ba-arrow-line">
                  <span className="x-ba-pulse" />
                </span>
                <span className="x-ba-arrow-word">code reads it</span>
                <span className="x-ba-arrow-line">
                  <span className="x-ba-pulse" style={{ animationDelay: '-1.4s' }} />
                </span>
              </div>

              <div className="x-ba-side x-ba-side--after">
                <p className="x-cap">after · {ex.after.caption}</p>
                <dl className="x-ba-fields">
                  {ex.after.fields.map((f) => (
                    <div key={f.name}>
                      <dt>{f.name}</dt>
                      <dd>
                        <Mono className="text-ui-fg">{f.value}</Mono>
                        {f.note && <span className="x-ba-note">{f.note}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        ))}

        <Notes notes={PARSE_NOTES} />
      </div>
    </div>
  );
}

/**
 * The reading that does need a model, and everything built around it.
 *
 * IT FOLLOWS ONE REAL DOCUMENT ALL THE WAY THROUGH. The first version was six
 * abstract steps with a key/value table under each and it was unreadable to
 * anybody outside the team — which makes it worse than nothing on a page whose
 * entire purpose is to be checkable by an outsider.
 *
 * NO TERMS OF ART. Not "schema", not "enum", not "null". If a sentence here
 * needs a definition it is wrong and gets rewritten, rather than footnoted.
 * `docs/steering/WHAT-WE-ASK-THE-MODEL.md` is the version allowed to say those
 * words.
 */
function Extract() {
  const [opened, setOpened] = useState<{ step: SortStep; from: Origin } | null>(null);
  const close = useCallback(() => setOpened(null), []);

  return (
    <div className="mt-14">
      <div className="x-head" style={{ '--ui-tone': 'var(--color-src-6)' } as React.CSSProperties}>
        <span className="x-head-n">3</span>
        <h3 className="x-head-title">Extraction</h3>
        <span className="x-stamp x-stamp--model">a model reads</span>
      </div>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ui-dim">
        Written reports, not spreadsheets. The columns you need to compare two jobs are in nobody's
        document — so something has to read English and decide.{' '}
        <span className="text-ui-fg">The only part that can be quietly wrong</span>, which is why
        everything below exists to make it cheap to disbelieve.
      </p>
      <p className="mt-3 max-w-[68ch] text-sm text-ui-faint">
        Everything that follows is one real file: <Mono>{DOC}</Mono>
      </p>

      {/* A PIPELINE, NOT A LIST OF SEVEN. Three parts, each with the reason it
          exists, and the steps inside it linked by a visible run of track — the
          shape of the argument is that each step is answering the one before,
          and a flat list threw that away. The card itself is still a handle:
          a number, one short line, and the long version behind it. */}
      <div className="x-pipe mt-8" style={{ '--ui-tone': 'var(--color-src-6)' } as React.CSSProperties}>
        {SORT_PHASES.map((ph) => (
          <section key={ph.label} className="x-phase">
            <div className="x-phase-head">
              <span className="x-phase-range">
                {ph.steps.length > 1 ? `${ph.steps[0]}–${ph.steps[ph.steps.length - 1]}` : ph.steps[0]}
              </span>
              <h4 className="x-phase-label">{ph.label}</h4>
            </div>
            <p className="x-phase-why">{ph.why}</p>

            <ol className="x-cards">
              {ph.steps.map((n) => {
                const st = SORT_STEPS.find((s) => s.n === n);
                if (!st) return null;
                return (
                  <li key={st.n}>
                    <button
                      type="button"
                      onClick={(e) => setOpened({ step: st, from: originOf(e.currentTarget) })}
                      className="x-card"
                    >
                      <span className="x-card-n">{st.n}</span>
                      <span className="x-card-text">
                        <span className="x-card-title">{st.title}</span>
                        <span className="x-card-face">{st.face}</span>
                      </span>
                      <span aria-hidden className="x-card-go">→</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <Result />

      {opened && <StepDialog step={opened.step} from={opened.from} onClose={close} />}
    </div>
  );
}

/**
 * One step, opened.
 *
 * THE CARD IS A HANDLE AND THIS IS THE EXPLANATION. Plain English, and the one
 * piece of real evidence that step turns on — the paragraph it was given, the
 * answers it gave back, the passes the quote is searched through. Nothing here
 * is a summary of the card; it is the thing the card is a handle for.
 */
function StepDialog({
  step,
  from,
  onClose,
}: {
  step: SortStep;
  from: Origin;
  onClose: () => void;
}) {
  return (
    <OriginDialog
      from={from}
      tone="var(--color-src-6)"
      label={step.title}
      onClose={onClose}
      header={
        <>
          <span className="x-card-n x-card-n--lit">{step.n}</span>
          <div className="min-w-0">
            <p className="font-mono text-base font-medium text-ui-fg">{step.title}</p>
            <p className="text-sm text-ui-dim">{step.face}</p>
          </div>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="grid content-start gap-4">
          {step.body.map((para) => (
            <p key={para} className="max-w-[62ch] leading-relaxed text-ui-dim">
              {para}
            </p>
          ))}
        </div>

        {step.shows && (
          <figure className={`x-ev x-ev--${step.shows.kind} self-start`}>
            <figcaption className="x-cap">{step.shows.caption}</figcaption>
            {step.shows.pairs ? (
              <dl className="x-ev-pairs">
                {step.shows.pairs.map((pr) => (
                  <div key={pr.question}>
                    <dt>{pr.question}</dt>
                    <dd>
                      <Mono className="text-ui-fg">{pr.answer}</Mono>
                      <span className="x-ev-from">“{pr.from}”</span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <pre className="x-ev-text">{step.shows.text}</pre>
            )}
          </figure>
        )}
      </div>
    </OriginDialog>
  );
}

/** What came out, in the shape step 1 uses for its output. */
function Result() {
  return (
    <div className="x-ba mt-8" style={{ '--ui-tone': 'var(--color-src-6)' } as React.CSSProperties}>
      <p className="x-ba-title">What it produced</p>

      <div className="x-ba-grid">
        <figure className="x-ba-side">
          <figcaption className="x-cap">before</figcaption>
          <div className="x-file">
            <p className="x-file-name">{RESULT.before.file}</p>
            <pre className="x-ba-doc">{RESULT.before.text}</pre>
          </div>
          <p className="x-ba-notice">{RESULT.before.notice}</p>
        </figure>

        <div aria-hidden className="x-ba-arrow">
          <span className="x-ba-arrow-line">
            <span className="x-ba-pulse" />
          </span>
          <span className="x-ba-arrow-word">a model reads it</span>
          <span className="x-ba-arrow-line">
            <span className="x-ba-pulse" style={{ animationDelay: '-1.4s' }} />
          </span>
        </div>

        <div className="x-ba-side x-ba-side--after">
          <p className="x-cap">{RESULT.after.caption}</p>
          <dl className="x-ba-fields">
            {RESULT.after.fields.map((f) => (
              <div key={f.name}>
                <dt>{f.name}</dt>
                <dd>
                  <Mono className={f.value === 'does not say' ? 'text-ui-warn' : 'text-ui-fg'}>
                    {f.value}
                  </Mono>
                  {f.note && <span className="x-ba-note">{f.note}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <Notes notes={EXTRACT_NOTES} />
    </div>
  );
}

/**
 * The searching — built on 2026-09-13, and this panel changed with it.
 *
 * IT USED TO SAY "not built" AND BE ONE DIM PARAGRAPH. It now earns the same
 * shape as parsing: a real document in, real rows out, and the reason the cuts
 * fall where they do. That reason is the whole of it — anybody can split a file
 * every 500 characters, and doing that is what separates a number from the
 * heading that gives it meaning.
 */
function Search() {
  return (
    <div className="mt-14">
      <div className="x-head" style={{ '--ui-tone': 'var(--color-src-4)' } as React.CSSProperties}>
        <span className="x-head-n">2</span>
        <h3 className="x-head-title">Indexing</h3>
      </div>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ui-dim">
        Specifications, assessments, review notes — prose, not tables. You cannot query a
        paragraph, so each document is cut into passages small enough to find and specific enough
        to be worth finding. <span className="text-ui-fg">No model reads them</span>, and the index
        is built once.
      </p>

      <div className="x-ba mt-7" style={{ '--ui-tone': 'var(--color-src-4)' } as React.CSSProperties}>
        <p className="x-ba-title">{SEARCH_EXAMPLE.title}</p>

        <div className="x-ba-grid">
          <figure className="x-ba-side">
            <figcaption className="x-cap">before</figcaption>
            <div className="x-file">
              <p className="x-file-name">{SEARCH_EXAMPLE.before.file}</p>
              <pre className="x-ba-doc">{SEARCH_EXAMPLE.before.text}</pre>
            </div>
            <p className="x-ba-notice">{SEARCH_EXAMPLE.before.notice}</p>
          </figure>

          <div aria-hidden className="x-ba-arrow">
            <span className="x-ba-arrow-line">
              <span className="x-ba-pulse" />
            </span>
            <span className="x-ba-arrow-word">cut on headings</span>
            <span className="x-ba-arrow-line">
              <span className="x-ba-pulse" style={{ animationDelay: '-1.4s' }} />
            </span>
          </div>

          <div className="x-ba-side x-ba-side--after">
            <p className="x-cap">after · {SEARCH_EXAMPLE.after.caption}</p>
            <dl className="x-ba-fields">
              {SEARCH_EXAMPLE.after.fields.map((f) => (
                <div key={f.name}>
                  <dt>{f.name}</dt>
                  <dd>
                    <Mono className="text-ui-fg">{f.value}</Mono>
                    {f.note && <span className="x-ba-note">{f.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <Notes notes={SEARCH_NOTES} />
      </div>

      <div className="x-figs mt-6">
        {SEARCH_FIGURES.map((f) => (
          <div key={f.label}>
            <p className="x-fig">{f.figure}</p>
            <p className="x-fig-label">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
