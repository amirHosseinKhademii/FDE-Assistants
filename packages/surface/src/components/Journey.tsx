/**
 * One question, every hop, with what actually moved.
 *
 * THE SHELL IS HERE; THE CONTENT IS NOT. The turns are a prop, because the
 * release question is not the only question — supplier impact gets its own
 * walk, with its own tools and its own payloads, and it would be absurd for the
 * two to draw their sequences differently. What transfers is the LAYOUT and the
 * timing: a rail, numbered hops, a measured light. What does not transfer is
 * every word, so none of it lives here.
 *
 * THE TIMING IS MEASURED, NOT DERIVED. Hops are wildly different heights — one
 * carries a thirty-line payload, the next a single line — so an index-based
 * delay drifts further from the light the further down you read. Each marker
 * reports its real offset instead. See `useSyncedDelays`.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mono, WindowIcon, ServerIcon, CloudIcon } from '@fde/uikit';

export type Where = 'browser' | 'yours' | 'crosses' | 'back';

export interface Hop {
  where: Where;
  title: string;
  /** The literal thing that moved, as close to the wire as is readable. */
  payload?: string;
  /**
   * WHAT MOVES, WHERE IT GOES — one short plain sentence, no jargon.
   *
   * ADDED BECAUSE THE PAGE HAD TWO AUDIENCES AND SERVED ONE. The payload and
   * the detail are written for somebody who will grep them against the source.
   * A compliance reviewer reads the same steps needing a different thing:
   * which data, and to whom, at THIS step. That was living in a separate block
   * of six questions above the walk, which meant reading the answer in one
   * place and its evidence in another.
   *
   * Optional, so the engagement that has not written them renders exactly as
   * before rather than showing empty rows.
   */
  plain?: string;
  detail: string;
  ms?: string;
}

export interface Turn {
  label: string;
  note: string;
  /**
   * THE THREE THINGS A TURN OWES THE READER, and it owed none of them.
   *
   * A turn used to be a coloured heading and a paragraph. Every HOP beneath it
   * carried a number, a literal payload and a plain sentence — so the group
   * headings were the one place on the page a reader could not see which step
   * they were on, what moved, or what it meant. Scanning the page, the turns
   * read as decoration between the real content.
   *
   * All three are optional: the engagement that has not written them renders
   * exactly as before, with no empty number chip and no blank box.
   */
  /** Step number, shown as a chip. A string so "1" and "2–6" both work. */
  n?: string;
  /** What moves at this turn, in one short sentence, no jargon. */
  plain?: string;
  /** A literal example of the data at this turn. */
  example?: string;
  /** Does this block cross to the model at all? Drives the whole block's tone. */
  crosses: boolean;
  hops: Hop[];
}

/**
 * One pass of the light, top to bottom of the whole walkthrough. Published to
 * CSS as `--sweep` so the rail, the markers and the boxes cannot be given
 * different numbers by accident.
 */
const SWEEP_MS = 13000;

/**
 * WHEN EACH HOP LIGHTS, MEASURED RATHER THAN DERIVED.
 *
 * The obvious implementation gives hop `i` of `n` a delay of `(i / n) * sweep`,
 * and it is wrong here for a reason the page itself causes: hops are wildly
 * different heights. One carries a thirty-line JSON payload and the next
 * carries a single line, so their positions are nothing like evenly spaced and
 * the light drifts further from the numbers the further down you read.
 *
 * So this measures. Each marker reports its real centre, and the delay is that
 * centre's fraction of the rail's height times the sweep — which is exactly
 * where the light is at that moment, because the light travels linearly in
 * SPACE. Re-measured on resize, because a narrower window rewraps every
 * payload and moves every hop.
 */
function useSyncedDelays(count: number) {
  const rail = useRef<HTMLDivElement | null>(null);
  const marks = useRef<Array<HTMLElement | null>>([]);
  const [delays, setDelays] = useState<number[]>([]);

  const measure = useCallback(() => {
    const box = rail.current;
    if (!box) return;
    const top = box.getBoundingClientRect().top;
    const height = box.offsetHeight || 1;
    setDelays(
      marks.current.map((m) => {
        if (!m) return 0;
        const r = m.getBoundingClientRect();
        const centre = r.top - top + r.height / 2;
        return Math.max(0, Math.min(1, centre / height)) * SWEEP_MS;
      }),
    );
  }, []);

  useLayoutEffect(measure, [measure, count]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (rail.current) ro.observe(rail.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { rail, marks, delays };
}

/**
 * Each hop's kind, as a word AND a shape.
 *
 * THE ICON IS ON THE NUMBER because that is the one element a reader's eye
 * already tracks down the rail. Scanning the numerals alone should answer
 * "where does this happen" without reading a single label — a window for the
 * person's screen, a stack for your own machines, a cloud for the model. The
 * text chip stays for anyone who needs it spelled out, and for a screen reader,
 * which gets nothing from a shape.
 */
const WHERE: Record<
  Where,
  { label: string; tone: string; tint: string; dot: string; lit: string; icon: () => React.ReactElement }
> = {
  browser: {
    label: 'browser',
    tone: 'text-flow-person',
    tint: 'border-flow-person/30 bg-flow-person/[0.045]',
    dot: 'bg-flow-person',
    lit: 'var(--color-flow-person)',
    icon: () => <WindowIcon className="h-3 w-3" />,
  },
  yours: {
    label: 'your network',
    tone: 'text-flow-internal',
    tint: 'border-flow-internal/30 bg-flow-internal/[0.045]',
    dot: 'bg-flow-internal',
    lit: 'var(--color-flow-internal)',
    icon: () => <ServerIcon className="h-3 w-3" />,
  },
  crosses: {
    label: 'crosses to the model',
    tone: 'text-flow-model',
    tint: 'border-flow-model/30 bg-flow-model/[0.045]',
    dot: 'bg-flow-model',
    lit: 'var(--color-flow-model)',
    icon: () => <CloudIcon className="h-3 w-3" />,
  },
  back: {
    label: 'from the model',
    tone: 'text-flow-model',
    tint: 'border-flow-model/30 bg-flow-model/[0.045]',
    dot: 'bg-flow-model',
    lit: 'var(--color-flow-model)',
    icon: () => <CloudIcon className="h-3 w-3" />,
  },
};

export function Journey({ turns }: { turns: Turn[] }) {
  const total = turns.reduce((sum, t) => sum + t.hops.length, 0);
  const { rail, marks, delays } = useSyncedDelays(total);

  let n = -1;

  return (
    /* ONE RAIL FOR ALL FIVE TURNS. A request does not restart at a turn
       boundary — turn 2 continues turn 1 — so the line does not either. The
       left gutter is what reserves the rail's column, which is why the headings
       clear it instead of being struck through by it. */
    <div
      ref={rail}
      className="journey-rail grid gap-11 pl-14"
      style={{ ['--sweep' as any]: `${SWEEP_MS}ms` }}
    >
      {turns.map((turn) => {
        return (
          <section key={turn.label}>
            <h3
              className={`relative flex items-center font-mono text-lg font-medium tracking-tight ${
                turn.crosses ? 'text-flow-model' : 'text-flow-internal'
              }`}
            >
              {/* Sits ON the rail, so a turn reads as a station on the line
                  rather than a separate heading beside it. */}
              <span
                aria-hidden
                className={`absolute -left-14 h-2.5 w-2.5 translate-x-[1.1875rem] rounded-full bg-current ring-4 ring-ui-bg ${
                  turn.crosses ? 'turn-dot' : 'opacity-50'
                }`}
              />
              {turn.n && (
                <span
                  className={`mr-3 shrink-0 rounded-md border border-current px-2 py-0.5 font-mono text-[0.8125rem] ${
                    turn.crosses ? 'text-flow-model' : 'text-flow-internal'
                  }`}
                >
                  {turn.n}
                </span>
              )}
              {turn.label}
            </h3>

            {turn.plain && (
              <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ui-fg/90">
                {turn.plain}
              </p>
            )}

            {turn.example && (
              <pre
                className={`mt-2.5 overflow-x-auto rounded-lg border px-3.5 py-2.5 font-mono text-[0.75rem] leading-relaxed text-ui-fg/85 ${
                  turn.crosses
                    ? 'border-flow-model/30 bg-flow-model/[0.045]'
                    : 'border-flow-internal/30 bg-flow-internal/[0.045]'
                }`}
              >
                {turn.example}
              </pre>
            )}

            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ui-dim">{turn.note}</p>

            <ol className="mt-6 grid gap-6">
              {turn.hops.map((hop) => {
                const w = WHERE[hop.where];
                n += 1;
                const i = n;
                const delay = `${delays[i] ?? 0}ms`;
                // The glow matches THIS hop, not its turn — see `WHERE`.
                const lit = w.lit;
                return (
                  <li key={hop.title} className="relative">
                    <span
                      ref={(el) => {
                        marks.current[i] = el;
                      }}
                      /* A PILL, NOT A BADGED CIRCLE. The icon was first drawn
                         over the circle's corner and it sat on the numeral —
                         two marks fighting for the same twenty pixels, and the
                         numeral is the one carrying the order. Side by side in
                         one pill, each gets its own space and the pair still
                         reads as a single marker. The rail runs behind it, so a
                         hop looks like a station on the line. */
                      className={`hop-mark absolute -left-14 top-0 z-10 flex h-6 w-12 items-center justify-center gap-1.5 rounded-full border border-current bg-ui-surface font-mono text-[0.75rem] ${w.tone}`}
                      style={{ animationDelay: delay, ['--lit' as any]: lit }}
                    >
                      {i + 1}
                      <span aria-hidden className="opacity-90">
                        {w.icon()}
                      </span>
                    </span>

                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span
                          className="hop-title text-[0.9375rem] font-medium text-ui-fg"
                          style={{ animationDelay: delay }}
                        >
                          {hop.title}
                        </span>
                        <span
                          className={`rounded-full border border-current px-2 py-px font-mono text-[0.625rem] ${w.tone}`}
                        >
                          {w.label}
                        </span>
                        {hop.ms && <Mono className="text-[0.6875rem] text-ui-faint">{hop.ms}</Mono>}
                      </p>

                      {/* The plain answer sits ABOVE the payload, because the
                          reader who needs it is the one least likely to read
                          past a block of monospace. */}
                      {hop.plain && (
                        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ui-fg/90">
                          {hop.plain}
                        </p>
                      )}

                      {hop.payload && (
                        /* The literal payload, monospaced and boxed. This is the
                           part a reviewer grep-checks against the source, so it
                           is styled as evidence rather than as illustration. */
                        <pre
                          /* TINTED WITH ITS OWN STEP'S COLOUR. Every box used
                             to be the same grey except the crossing one, so
                             the palette said "this one is different" and
                             nothing about the rest. Now the box carries the
                             lane it belongs to, at 4.5% — enough to group by
                             eye, far too little to read as a highlight. */
                          className={`hop-lit mt-2.5 overflow-x-auto rounded-lg border px-3.5 py-2.5 font-mono text-[0.75rem] leading-relaxed text-ui-fg/85 ${w.tint} ${
                            hop.where === 'crosses' ? 'payload-crossing' : ''
                          }`}
                          style={{ animationDelay: delay, ['--lit' as any]: lit }}
                        >
                          {hop.payload}
                        </pre>
                      )}

                      <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ui-dim">
                        {hop.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
