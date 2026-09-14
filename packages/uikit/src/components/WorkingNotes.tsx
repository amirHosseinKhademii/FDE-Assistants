/**
 * What the assistant is doing, as it does it, in the margin.
 *
 * Thirty to ninety seconds of blank screen makes a working system look broken.
 * These are REAL EVENTS from the loop, not a progress animation — which is why
 * the component takes lines rather than a percentage. The one genuinely animated
 * thing is the live dot, and it means exactly one thing: a request is open right
 * now. It stops the moment the stream closes.
 *
 * THE LATEST STEP IS THE LIVE ONE, and it is the step that gets marked — not a
 * separate row underneath saying work continues. A boxed "still working" line
 * was a second thing to read that added no information the marked step did not
 * already carry, and it pushed the actual work down the column to make room for
 * an announcement about itself.
 *
 * A NOTE ON THE MARKER, because it cost an hour. `ring-4` compiles to a
 * box-shadow, so an inline `boxShadow` for the glow silently replaced the ring
 * rather than adding to it — and the ring is what lifts an 8px dot off the
 * hairline it sits on. Both effects now live in one shadow value. Anything that
 * needs a glow AND a ring has to say so in a single declaration.
 *
 * AND THE MARK IS THE DOT AND THE LINE'S OWN LABEL, nothing structural. Earlier versions lit a bar along the
 * rail and tinted the row behind the text. Both competed with the words: the
 * bar drew a second vertical line beside the one already there, and the tint
 * moved a block of prose in and out of contrast while somebody was reading it.
 * The markers are already the column's spine — one of them pulsing is legible
 * immediately and costs the text nothing.
 *
 * Marking the LAST line is honest whichever kind it is: a call with no result
 * yet is running, and a result with nothing after it is the frontier the model
 * is thinking from. Either way it is where the work is.
 *
 * All of it is bound to `busy`, which is a real open stream. Same rule as the
 * live dot and as the scan line on a consumer's header: motion reports work,
 * never a timer. A rail that keeps moving after the work stopped is a rail that
 * gets ignored.
 *
 * Domain-free by construction: a line is a kind, a name, a detail and a reason.
 * WHAT the tool was and WHY it ran are sentences the consumer writes.
 *
 * THE RAIL FADES DOWNWARD RATHER THAN RUNNING FLAT, and each marker sits in a
 * halo of its own severity. Both read only from `--ui-*`, so the light surface
 * next door inherits the same treatment without a single colour being restated
 * — which is the test of whether this package is a design system or one
 * product's stylesheet in a shared folder. The fade also does a job: it puts
 * the weight at the top, where the first step is, and lets the column trail off
 * rather than stop with a hard edge mid-air.
 */
import { useEffect, useState } from 'react';
import { ChevronIcon } from '../icons';
import { Mono } from './Mono';
import { TONES } from '../tokens/tone';

export interface TraceLine {
  kind: 'call' | 'result' | 'retry';
  name: string;
  detail: string;
  why: string;
  ok?: boolean;
}

const LABEL = { call: 'asks', result: 'gets', retry: 'retry' } as const;

export function WorkingNotes({
  lines,
  busy,
  title = 'Working notes',
}: {
  lines: TraceLine[];
  busy: boolean;
  title?: string;
}) {
  /**
   * IT FOLDS ITSELF AWAY WHEN THE WORK STOPS.
   *
   * While a question is running this is the most interesting thing on the page
   * — it is the only evidence that anything is happening. The moment the answer
   * lands it becomes the least: twenty steps of tool calls sitting above the
   * thing the reader actually came for, and on a phone that is most of a
   * screen of scrolling past their own answer.
   *
   * So it collapses on the transition from busy to not-busy, and the header
   * becomes a button carrying the step count. Nothing is thrown away and
   * nothing is hidden without saying so — reopening is one tap, and the page
   * still states how many steps there were.
   *
   * IT ONLY CLOSES ON THE TRANSITION, not whenever `busy` is false. A reader
   * who opens the notes on a finished answer must be able to keep them open
   * while they read; re-running the collapse on every render would slam it shut
   * under them.
   */
  /* THE INITIAL STATE IS `busy`, NOT `true`. An answer opened from history
     mounts with lines already in it and never makes the busy→idle transition,
     so a default of open left twenty-three steps of replayed tool calls sitting
     above an answer somebody had just clicked to re-read. Starting from `busy`
     says the same thing in both cases: notes are open while there is work, and
     folded away when there is not. */
  const [open, setOpen] = useState(busy);
  const [wasBusy, setWasBusy] = useState(busy);

  useEffect(() => {
    if (wasBusy && !busy) setOpen(false);
    if (busy && !wasBusy) setOpen(true);
    setWasBusy(busy);
  }, [busy, wasBusy]);

  if (!busy && lines.length === 0) return null;

  /** While a request is open, the newest step is where the work is. */
  const live = busy && lines.length > 0 ? lines.length - 1 : -1;

  return (
    <div className="ui-rise">
      {/* A HEADING WHILE IT RUNS, A CONTROL ONCE IT HAS. Pressing something that
          is still filling in would be a way to lose the live view; there is
          nothing to collapse away from until the work is done. */}
      {busy ? (
        <h2 className="mb-4 flex items-center gap-2 text-xs font-medium tracking-wide text-ui-dim uppercase">
          {title}
          <span className="relative flex h-1.5 w-1.5">
            <span className="ui-ping absolute inline-flex h-full w-full rounded-full bg-ui-accent" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ui-accent" />
          </span>
        </h2>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ui-notes-toggle mb-4 flex w-full items-center gap-2 text-xs font-medium tracking-wide text-ui-dim uppercase"
        >
          {title}
          <Mono className="text-ui-faint normal-case">{lines.length} steps</Mono>
          <span aria-hidden className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronIcon />
          </span>
        </button>
      )}


      <ol
        hidden={!open}
        className="relative grid gap-5 pl-5"
        style={{
          borderInlineStart: '1px solid transparent',
          borderImage:
            'linear-gradient(180deg, var(--color-ui-line-lit), var(--color-ui-line) 55%, transparent) 1',
        }}
      >

        {lines.map((line, i) => {
          const failed = line.kind === 'result' && line.ok === false;
          const tone = failed
            ? TONES.danger
            : line.kind === 'result'
              ? TONES.ok
              : line.kind === 'retry'
                ? TONES.warn
                : TONES.info;
          const running = i === live;
          return (
            <li key={i} className="ui-note-in relative grid gap-1">
              {/* The halo, only while this step is the live one. Separate
                  element so the dot beneath keeps its own solid colour. */}
              {running && (
                <span
                  className="ui-ping absolute -left-[1.5625rem] top-1 h-2.5 w-2.5 rounded-full bg-ui-accent"
                  aria-hidden
                />
              )}
              <span
                className={`absolute -left-[1.5625rem] top-1 h-2.5 w-2.5 rounded-full ${
                  running ? 'bg-ui-accent' : tone.dot
                }`}
                style={{
                  // ONE declaration: the ring and the glow are both box-shadows,
                  // so writing them separately means the second wins and the
                  // first vanishes. See the header.
                  boxShadow: running
                    ? '0 0 0 4px var(--color-ui-bg), 0 0 16px 2px var(--color-ui-accent)'
                    : '0 0 0 4px var(--color-ui-bg)',
                }}
                aria-hidden
              />
              <p className="flex items-baseline gap-2 text-[0.8125rem]">
                <span className={running ? 'ui-live-text font-medium' : tone.text}>
                  {failed ? 'failed' : running ? 'running' : LABEL[line.kind]}
                </span>
                <Mono className={running ? 'ui-live-text' : 'text-ui-fg'}>{line.name}</Mono>
              </p>
              <p className="text-[0.8125rem] leading-snug text-ui-fg/80">{line.detail}</p>
              <p className="border-l border-ui-line/70 pl-3 text-xs leading-relaxed text-ui-faint">
                {line.why}
              </p>
            </li>
          );
        })}

        {/* Only before the first step lands. Once there is a line to mark, the
            line carries it — an extra row would be announcing itself rather
            than reporting anything. Deliberately unboxed: it is a note, not a
            step, and drawing it as one would put a panel where a record of
            what happened should be. */}
        {busy && lines.length === 0 && (
          <li className="relative text-[0.8125rem]">
            <span
              className="ui-ping absolute -left-[1.5625rem] top-1.5 h-2 w-2 rounded-full bg-ui-accent"
              aria-hidden
            />
            <span
              className="absolute -left-[1.5625rem] top-1.5 h-2 w-2 rounded-full bg-ui-accent ring-4 ring-ui-bg"
              aria-hidden
            />
            <span role="status" className="ui-live-text font-medium">
              opening the walk
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}
