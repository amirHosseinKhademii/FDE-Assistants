/**
 * Two agents arguing about one lot, while they argue.
 *
 * THE SEPARATION IS THE EVIDENCE. The two advocates open INDEPENDENTLY — they
 * are dispatched in parallel and neither sees the other — and only then answer
 * each other. That is the whole reason to watch it happen: a finished memo
 * cannot show you that the two positions were reached apart, and "apart" is the
 * only thing that makes the disagreement real rather than one model performing
 * both halves of a script. So the layout is two columns that fill at the same
 * time, not a transcript that alternates.
 *
 * THE ADJUDICATOR IS DRAWN BELOW, NOT BETWEEN, and never as a winner. It does
 * not decide — it cannot: the answer contract has no field that could carry a
 * recall and the coherence layer rejects the sentence in prose. What it writes
 * is the question, both cases at their strongest, what is already agreed, and
 * what would settle it. Drawing it as a verdict panel would contradict the one
 * thing this system is built never to do.
 *
 * `concedes` AND `what_would_change_my_mind` ARE SHOWN, NOT HIDDEN. They are
 * the fields that make an advocate honest rather than a cheerleader, and this
 * project has a recorded run where both sides quietly collapsed into agreement
 * inside `concedes` while their headline positions still looked opposed. A
 * reader who can see those fields can catch that; one shown only the headline
 * cannot.
 *
 * THE MOTION IS TIED TO STATE, NEVER TO A TIMER. A card scans while its agent
 * is working and stops the instant it answers; each round LANDS rather than
 * types out, because a per-character type-out would imply tokens are streaming
 * and they are not — every argument here passed its schema before it was sent,
 * so it genuinely arrives all at once. Animating it as if it trickled in would
 * be a small lie about the architecture on a page whose whole argument is that
 * nothing here is decorative.
 *
 * THE COLUMNS ARE A FIXED HEIGHT AND SCROLL THEMSELVES. An advocate writes
 * several hundred words, and two of those stacked turned the page into a
 * thousand-pixel wall where the two cases could no longer be compared — which
 * is the only reason they are side by side. Capping the height keeps both
 * arguments on one screen, keeps the round markers and the memo reachable, and
 * makes the comparison possible again.
 *
 * IT FOLLOWS THE NEW TEXT, AND STOPS FOLLOWING THE MOMENT YOU SCROLL. An agent
 * that is still writing should bring its newest paragraph into view by itself;
 * an agent that is writing while you are reading something further up must not
 * yank you away from it. So the auto-follow is armed only while the reader is
 * already at the bottom, which is the standard behaviour of every log tail and
 * the only one that is never annoying.
 *
 * THE TEXT AT THE EDGES OF THE BOX IS FADED OUT, so whatever you are reading
 * is the brightest thing in the column. It is done with a mask on the content
 * rather than a gradient painted over it — an overlay fades toward one fixed
 * background colour and smears the moment the panel behind it is tinted, which
 * both of these are.
 *
 * WHAT IS NOT CLAIMED: that either side is right, or that the debate settled
 * anything. It did not. It made the disagreement legible.
 */
import { useEffect, useRef, useState } from 'react';
import { Mono } from '@fde/uikit';
import { LiveDot } from './LiveDot';
import type { DebateState, DebateArgument } from '../../hooks/use-ask';

const SIDE_TONE: Record<string, { colour: string; call: string }> = {
  precaution: { colour: 'var(--color-exp-patient)', call: 'advocate.precaution' },
  proportion: { colour: 'var(--color-exp-ours)', call: 'advocate.proportion' },
};

export function Debate({ state }: { state: DebateState }) {
  const { lot, supplier, sides, opening, rebuttal, adjudication, waitingOn, contestedCount } = state;

  return (
    <section className="grid gap-4">
      <header
        className="agent-card agent-frame card-aura rounded-xl border border-flow-model/30 px-4 py-4 sm:px-5"
        style={{ ['--agent' as any]: 'var(--color-flow-model)' }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="agent-tag" style={{ ['--agent' as any]: 'var(--color-flow-model)' }}>
            debate
          </span>
          <Mono className="text-[0.9375rem] font-medium text-ui-fg">{lot.lotId}</Mono>
          <span className="text-sm text-ui-dim">{lot.productName}</span>
        </div>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ui-dim">
          {supplier.name} was disqualified{supplier.disqualifiedOn ? ` on ${supplier.disqualifiedOn}` : ''}.
          This lot left our control carrying {lot.findings.length} finding
          {lot.findings.length === 1 ? '' : 's'}, which is what makes it arguable —{' '}
          {contestedCount} of the affected lots are. Two agents are given the same evidence and
          opposite instructions about SEQUENCE: protect first and test after, or test first and act
          on the result. Neither can look anything up; the evidence is settled before they start.
        </p>
      </header>

      {/* THE ROUND MARKER SITS BETWEEN THE COLUMNS, so which phase the argument
          is in is readable without parsing either side. It is the one element
          that describes both agents at once, which is why it is not inside
          either card. */}
      <Rounds waitingOn={waitingOn} hasRebuttal={Boolean(rebuttal.precaution || rebuttal.proportion)} />

      <div className="grid gap-4 lg:grid-cols-2">
        {(['precaution', 'proportion'] as const).map((side) => (
          <Column
            key={side}
            side={side}
            label={sides[side]}
            opening={opening[side]}
            rebuttal={rebuttal[side]}
            waitingOn={waitingOn}
          />
        ))}
      </div>

      {adjudication ? (
        <Memo adjudication={adjudication} lot={lot} contestedCount={contestedCount} />
      ) : (
        waitingOn === 'adjudication' && (
          <Waiting call="adjudicator" says="reading both cases and writing the decision up" />
        )
      )}

      {state.errors.length > 0 && (
        <div className="rounded-xl border border-ui-warn/30 bg-ui-warn/5 px-5 py-4">
          <h4 className="font-medium text-ui-warn">Not every participant finished</h4>
          <ul className="mt-2 grid gap-1.5 text-sm text-ui-dim">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-2.5 text-sm text-ui-dim">
            A debate missing a side is not a debate, and it is shown as incomplete rather than
            presented as balanced.
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Where the argument has got to: opening → rebuttal → written up.
 *
 * Drawn as a rail with three stations rather than a progress bar, because these
 * are not three equal fractions of a job — they are three different things
 * happening, and the middle one may be skipped entirely when a debate runs
 * without a rebuttal round.
 */
function Rounds({
  waitingOn,
  hasRebuttal,
}: {
  waitingOn: DebateState['waitingOn'];
  hasRebuttal: boolean;
}) {
  const STEPS = [
    { id: 'opening', label: 'opening, in parallel' },
    { id: 'rebuttal', label: 'each answers the other' },
    { id: 'adjudication', label: 'written up' },
  ] as const;

  const reached = (id: string) => {
    const order = ['opening', 'rebuttal', 'adjudication'];
    if (waitingOn === null) return true;
    return order.indexOf(id) < order.indexOf(waitingOn);
  };

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
      {STEPS.map((step, i) => {
        const live = waitingOn === step.id;
        const done = reached(step.id) && !(step.id === 'rebuttal' && !hasRebuttal && waitingOn === null);
        return (
          <li key={step.id} className="flex items-center gap-2">
            {/* The connector is decoration and the first thing to go when the
                list wraps — a dash dangling at the start of a new line reads as
                a bullet nobody meant. */}
            {i > 0 && <span className="hidden h-px w-6 bg-ui-line sm:block" aria-hidden />}
            {live ? (
              <LiveDot size="0.375rem" />
            ) : (
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-flow-model' : 'bg-ui-line-lit'}`}
              />
            )}
            <span
              className={`font-mono text-[0.6875rem] ${
                live ? 'ui-live-text' : done ? 'text-ui-dim' : 'text-ui-faint'
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A box that follows what is being written into it, until you take over.
 *
 * `atBottom` is recomputed on every scroll, so picking up the follow again is
 * simply a matter of scrolling back down — no button, no mode to remember.
 */
function useFollow(deps: unknown[], live: boolean) {
  const box = useRef<HTMLDivElement | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [overflowing, setOverflowing] = useState(false);

  const [atTop, setAtTop] = useState(true);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    // 24px of slack: "close enough to the end" is what a reader means by it.
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
    setAtTop(el.scrollTop < 24);
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 4);
    // ONLY WHILE SOMETHING IS STILL BEING WRITTEN. A finished debate that
    // scrolls itself to the end on arrival hides the opening line of every
    // argument behind the top fade — the reader lands mid-sentence in a case
    // they have not read the start of. Following is for text that is still
    // coming; a completed one starts where it should be read from.
    if (!live) return;
    if (!atBottom) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const to = el.scrollHeight - el.clientHeight;
    if (reduced) {
      el.scrollTop = to;
      onScroll();
      return;
    }

    /**
     * HAND-ANIMATED, BECAUSE `behavior: 'smooth'` IS TOO FAST HERE.
     *
     * The browser picks its own duration and it is tuned for "jump to the
     * anchor", which over several hundred words of argument arrives as a snap.
     * This is meant to read like a page turning under you while you are still
     * reading the line above, so it is paced deliberately — about a second and
     * a half, eased out — and it scales with the distance so a short hop does
     * not take as long as a long one.
     */
    const from = el.scrollTop;
    const distance = to - from;
    if (Math.abs(distance) < 2) return;
    const ms = Math.min(2200, 700 + Math.abs(distance) * 1.6);
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      // easeOutCubic: quick to commit, slow to settle.
      el.scrollTop = from + distance * (1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
      else onScroll();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // `atBottom` is deliberately not a dependency: re-running on every scroll
    // would fight the reader instead of following the content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { box, onScroll, atBottom, atTop, overflowing };
}

function Column({
  side,
  label,
  opening,
  rebuttal,
  waitingOn,
}: {
  side: 'precaution' | 'proportion';
  label: string;
  opening?: DebateArgument | null;
  rebuttal?: DebateArgument | null;
  waitingOn: DebateState['waitingOn'];
}) {
  const t = SIDE_TONE[side];
  // Working means: this round is outstanding for THIS agent. The scan stops the
  // moment its argument lands, not when the whole debate ends.
  const working =
    (waitingOn === 'opening' && opening === undefined) ||
    (waitingOn === 'rebuttal' && rebuttal === undefined);
  const { box, onScroll, atBottom, atTop, overflowing } = useFollow(
    [opening, rebuttal, waitingOn],
    waitingOn !== null,
  );
  return (
    <div
      className={`agent-card agent-frame rounded-xl border px-4 py-4 sm:px-5 ${working ? 'agent-card--working' : ''}`}
      style={{ ['--agent' as any]: t.colour, borderColor: `color-mix(in oklab, ${t.colour} 30%, var(--color-ui-line))` }}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5">
        <span className="agent-tag" style={{ ['--agent' as any]: t.colour }}>
          {t.call}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: t.colour }}>
        {label}
      </p>

      {/* THE READER. Fixed height, scrolls itself, fades at the edges so a cut
          line reads as "there is more" rather than as a rendering fault. */}
      <div className="relative mt-3">
        <div
          ref={box}
          onScroll={onScroll}
          /* THE FADE RETRACTS AT THE ENDS. A fixed mask left the last lines of
             an argument permanently dimmed even when you had scrolled all the
             way to them — text you cannot read is worse than an edge that looks
             hard. So the stop at each end collapses to nothing once there is
             nothing more in that direction. */
          style={{
            ['--fade-top' as any]: atTop ? '0rem' : '3.5rem',
            ['--fade-bottom' as any]: atBottom ? '0rem' : '4.5rem',
          }}
          /* Shorter on a phone: two 24rem boxes stacked is most of a viewport
             spent on scroll containers, and neither argument is then readable
             against the other, which is the only reason they are side by side
             at all. */
          className="reader reader-focus h-[17rem] overflow-y-auto pr-2 sm:h-[24rem]"
          tabIndex={0}
          role="region"
          aria-label={`${t.call} argument`}
        >
          {opening === undefined && waitingOn === 'opening' && (
            <Waiting call="opening" says="forming its position, without seeing the other side" inline />
          )}
          {opening === null && <p className="text-sm text-ui-danger">produced nothing valid</p>}
          {opening && <Round title="Opening" arg={opening} colour={t.colour} first />}

          {rebuttal === undefined && waitingOn === 'rebuttal' && (
            <Waiting call="rebuttal" says="answering the other side" inline />
          )}
          {rebuttal === null && <p className="mt-3 text-sm text-ui-danger">no valid rebuttal</p>}
          {rebuttal && <Round title="After hearing the other side" arg={rebuttal} colour={t.colour} />}
        </div>

        {/* Said only when it is true, and it is how you get the follow back. */}
        {overflowing && !atBottom && (
          <button
            type="button"
            onClick={() => box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })}
            className="absolute right-3 bottom-2 rounded-full border border-ui-line bg-ui-bg/90 px-2.5 py-1 font-mono text-[0.625rem] text-ui-dim shadow-lg backdrop-blur transition-colors hover:text-ui-fg"
          >
            follow ↓
          </button>
        )}
      </div>
    </div>
  );
}

function Round({
  title,
  arg,
  colour,
  first,
}: {
  title: string;
  arg: DebateArgument;
  colour: string;
  first?: boolean;
}) {
  return (
    <div className={`agent-land ${first ? '' : 'mt-4 border-t border-ui-line pt-3.5'}`}>
      <p className="mb-2 font-mono text-[0.625rem] tracking-wider text-ui-faint uppercase">
        {title}
      </p>
      {/* The position takes the sweep: it is the one line that IS the agent's
          answer, and one animated element per arrival is the budget. */}
      <p className="text-sweep text-[0.9375rem] leading-relaxed font-medium text-ui-fg">
        {arg.position}
      </p>
      <p className="mt-2.5 text-sm leading-relaxed text-ui-dim">{arg.argument}</p>

      <dl className="mt-3.5 grid gap-2.5 border-t border-ui-line pt-3">
        <Field term="Strongest point" value={arg.strongest_point} colour={colour} />
        {/* SHOWN, NEVER FOLDED AWAY. See the header: this is the field where a
            collapse into agreement hides while the headlines still look opposed. */}
        <Field term="Concedes" value={arg.concedes} />
        <Field term="Would change its mind if" value={arg.what_would_change_my_mind} />
      </dl>

      {arg.evidence_refs?.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {arg.evidence_refs.map((r) => (
            <Mono key={r} className="text-[0.6875rem] text-ui-faint">
              {r}
            </Mono>
          ))}
        </p>
      )}
    </div>
  );
}

function Field({ term, value, colour }: { term: string; value: string; colour?: string }) {
  return (
    <div>
      <dt className="text-[0.6875rem] text-ui-faint">{term}</dt>
      <dd className="mt-0.5 text-sm leading-relaxed" style={colour ? { color: colour } : undefined}>
        <span className={colour ? '' : 'text-ui-fg/90'}>{value}</span>
      </dd>
    </div>
  );
}

/**
 * The adjudicator's memo — an escalation, never a verdict.
 *
 * `decision_for_human` leads, and it is a QUESTION. If it ever stops being one
 * the design has failed, and `RECALL_VERDICT` on the assembled dossier is the
 * backstop that catches it.
 */
/**
 * The same three-tile scoreboard the other two surfaces open with, so a
 * reviewer arriving at a memo reads it the same way they read a dossier.
 *
 * THE MIDDLE TILE IS THE ONE THAT MATTERS AND IT IS ALWAYS ZERO. Two agents
 * argued, a third wrote it up, and nothing was decided — which is not a
 * shortcoming to be buried in a footnote, it is the product's central claim
 * stated as a figure. `DESIGN.md`'s rule that a zero is never green applies
 * exactly: this zero is neutral, because "nothing was decided" is a fact about
 * scope, not an achievement.
 *
 * THE LEFT TILE IS SCALE, not severity: this is one of eleven arguments that
 * could be had about this supplier, and a reviewer reading one memo should know
 * that before they generalise from it.
 */
function MemoScore({ lot, contestedCount }: { lot: any; contestedCount: number }) {
  const TILE = {
    neutral: 'border-ui-line bg-ui-surface text-ui-fg',
    warn: 'border-ui-warn/35 bg-ui-warn/8 text-ui-warn',
    danger: 'border-ui-danger/35 bg-ui-danger/8 text-ui-danger',
  };
  const tiles = [
    { n: 1, label: 'decision for a person', tone: TILE.warn },
    { n: 0, label: 'decided here', tone: TILE.neutral },
    { n: contestedCount, label: 'lots could be argued like this', tone: TILE.neutral },
  ];
  return (
    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-2.5">
      {tiles.map((t) => (
        <div key={t.label} className={`rounded-xl border px-3.5 py-3 ${t.tone}`}>
          <p className="font-mono text-xl leading-none font-semibold sm:text-2xl">{t.n}</p>
          <p className="mt-1.5 text-[0.6875rem] leading-tight text-ui-dim">{t.label}</p>
        </div>
      ))}
    </div>
  );
}

function Memo({
  adjudication: a,
  lot,
  contestedCount,
}: {
  adjudication: any;
  lot: any;
  contestedCount: number;
}) {
  return (
    <div
      className="agent-land agent-frame overflow-hidden rounded-xl border border-ui-warn/40 bg-ui-warn/5"
      style={{ ['--agent' as any]: 'var(--color-ui-warn)' }}
    >
      <div className="flex flex-wrap items-center gap-2.5 border-b border-ui-warn/25 px-5 py-3">
        <span className="agent-tag" style={{ ['--agent' as any]: 'var(--color-ui-warn)' }}>
          adjudicator
        </span>
        <h3 className="font-medium text-ui-warn">Written up for a person to decide</h3>
      </div>
      <div className="grid gap-4 px-5 py-4">
        <MemoScore lot={lot} contestedCount={contestedCount} />

        <div>
          <p className="text-[0.6875rem] text-ui-faint">The decision</p>
          <p className="mt-1 text-lg leading-snug font-medium text-ui-fg">{a.decision_for_human}</p>
          <p className="mt-1.5 text-sm text-ui-dim">
            Goes to <span className="text-ui-fg">{a.suggested_owner}</span>. Stated as a question
            because answering it is not this system&rsquo;s to do.
          </p>
        </div>

        <div className="grid gap-4 border-t border-ui-warn/20 pt-3.5 sm:grid-cols-2 sm:gap-3">
          <Field term="The case for protecting first" value={a.case_for_precaution} colour="var(--color-exp-patient)" />
          <Field term="The case for testing first" value={a.case_for_proportion} colour="var(--color-exp-ours)" />
        </div>

        <div className="border-t border-ui-warn/20 pt-3.5">
          {/* OFTEN THE MOST USEFUL LINE: the part nobody has to re-litigate. */}
          <Field term="What both already accept" value={a.where_they_agree} />
          <div className="mt-3">
            <Field term="What would settle it" value={a.what_would_settle_it} />
          </div>
          <div className="mt-3">
            <Field term="Why this timescale" value={a.urgency_basis} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Waiting({ call, says, inline }: { call: string; says: string; inline?: boolean }) {
  return (
    <div
      className={
        inline
          ? 'mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-ui-line pt-3.5'
          : 'agent-card agent-card--working agent-frame flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-ui-warn/30 px-5 py-4'
      }
      style={inline ? undefined : { ['--agent' as any]: 'var(--color-ui-warn)' }}
    >
      <LiveDot />
      <Mono className="ui-live-text text-[0.8125rem]">{call}</Mono>
      <span className="text-sm text-ui-dim">{says}</span>
      {/* Three dots that are actually three elements, so nothing reflows as
          they cycle. */}
      <span className="agent-dots inline-flex gap-0.5 text-ui-accent" aria-hidden>
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </div>
  );
}
