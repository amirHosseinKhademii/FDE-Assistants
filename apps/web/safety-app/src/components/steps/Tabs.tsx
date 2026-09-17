/**
 * The parts of the build, as tabs.
 *
 * ── WHY A TAB BAR AND NOT A PAGE EACH ──────────────────────────────────────
 *
 * The seven stages under "grounding" are one of six things this engagement is
 * made of, and half of them are written down, argued about and not built. Six
 * routes would give three of them a URL that serves an apology. A tab bar puts
 * the whole shape in front of the reader at once and lets them see which half
 * is real, which is more useful than the page pretending the rest do not exist
 * until they do.
 *
 * ── EACH TAB IS A NUMBERED CARD, AND THE NUMERAL DOES THE WORK ─────────────
 *
 * The first version was a strip of text with an underline and it read as a
 * menu: six labels of different lengths, nothing to say they were peers, and
 * the only signal of state a two-pixel line most of the way down. The stage
 * number is what makes them distinct at a glance — 1 through 6, in order — and
 * the card gives the state somewhere to live. `app.css` carries the rest of
 * that argument, including why the active card has no bottom border.
 *
 * ── AN EMPTY TAB IS NOT DISABLED, AND THAT IS DELIBERATE ───────────────────
 *
 * The obvious treatment is to grey the unbuilt ones out and refuse the press.
 * It is wrong here: what each one WILL hold, and what has to happen before it
 * can, is the most interesting thing this page knows — it is the difference
 * between a plan and a wish. So every tab opens, and the ones with no stages
 * behind them say what they are waiting for.
 *
 * ── THE ORDER IS THE DEPENDENCY ORDER ──────────────────────────────────────
 *
 * Not the order somebody would like to build them in. You cannot write an
 * answer key for a corpus you have not surveyed, or a contract before the key,
 * or evals before there is something to score. Reading left to right is reading
 * the sequence.
 */
import { useCallback, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface StepTab {
  id: string;
  /** What it is called. */
  label: string;
  /** The stage number, shown as the chip that makes the tabs distinct. */
  stage: string;
  /** How much of it exists, in two or three words. */
  status: string;
  /** False for a tab with no stages behind it yet. */
  built: boolean;
  content: ReactNode;
}

export function StepTabs({ tabs }: { tabs: StepTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  const base = useId();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  /**
   * ARROW KEYS MOVE BETWEEN TABS, which is what a tab bar owes anybody not
   * using a mouse — and it is the part most hand-rolled ones leave out. Home
   * and End go to the ends, and focus follows selection because every panel is
   * already rendered.
   */
  const onKey = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const last = tabs.length - 1;
      const to =
        event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
        : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0
        : event.key === 'End' ? last
        : null;
      if (to === null) return;
      event.preventDefault();
      const next = tabs[to];
      setActive(next.id);
      buttons.current[next.id]?.focus();
    },
    [tabs],
  );

  return (
    <section className="lift-in" style={{ animationDelay: '140ms' }}>
      <div role="tablist" aria-label="the parts of the build" className="cal-tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              buttons.current[tab.id] = el;
            }}
            role="tab"
            id={`${base}-tab-${tab.id}`}
            aria-controls={`${base}-panel-${tab.id}`}
            aria-selected={tab.id === active}
            data-built={tab.built}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(e) => onKey(e, i)}
            className="cal-tab"
          >
            <span className="cal-tab-n" aria-hidden>
              {tab.stage}
            </span>
            <span className="cal-tab-label">{tab.label}</span>
            <span className="cal-tab-status">{tab.status}</span>
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          /* `hidden` rather than unmounting: a panel that rebuilds on every
             press loses the reader's scroll position and re-runs every
             entrance animation, which reads as the page reloading. */
          className="cal-tabpanel"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </section>
  );
}

/**
 * What a tab holds before it holds anything.
 *
 * NOT AN APOLOGY AND NOT A PLACEHOLDER. It says what the part is for, what has
 * to be true before it can be written, and what already exists that it will be
 * built out of — which is the whole difference between a plan and a wish, and
 * the reason these tabs are pressable rather than greyed out.
 */
export function NotBuilt({
  title,
  what,
  waits,
  already,
}: {
  title: string;
  what: ReactNode;
  /** What has to happen first, in order. */
  waits: string[];
  /** What exists today that this will be built from. */
  already?: ReactNode;
}) {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          {title}
        </h2>
        <span className="rounded-full border border-dashed border-ui-line px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase">
          not written
        </span>
      </div>

      <div className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">{what}</div>

      <h3 className="mt-9 font-mono text-[0.6875rem] tracking-[0.08em] text-cal-2 uppercase">
        what has to happen first
      </h3>
      <ol className="mt-4 grid gap-2.5">
        {waits.map((w, i) => (
          <li key={w} className="flex items-baseline gap-4">
            <span className="w-4 shrink-0 text-right font-mono text-[0.75rem] text-ui-faint">
              {i + 1}
            </span>
            <span className="max-w-[58ch] text-[0.875rem] leading-relaxed text-ui-dim">{w}</span>
          </li>
        ))}
      </ol>

      {already && (
        <>
          <h3 className="mt-9 font-mono text-[0.6875rem] tracking-[0.08em] text-cal-1 uppercase">
            what it will be built out of
          </h3>
          <div className="mt-4 max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-dim">
            {already}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * A part that exists, said plainly.
 *
 * SHORTER THAN `NotBuilt` ON PURPOSE. A stage that has run can be summarised in
 * a paragraph and a few figures; what it cost to get there belongs in
 * `docs/safety/`. The point of these panels is that a reader arriving at tab 1
 * can follow the sequence without being handed the whole of stage 3.
 */
export function Done({
  title,
  status,
  what,
  facts,
  note,
}: {
  title: string;
  /** Two or three words: what was produced. */
  status: string;
  what: ReactNode;
  /** The handful of numbers that say what came out of it. */
  facts?: { value: string; label: string }[];
  note?: ReactNode;
}) {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          {title}
        </h2>
        <span className="rounded-full border border-cal-1/40 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-cal-1 uppercase">
          {status}
        </span>
      </div>

      <div className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">{what}</div>

      {facts && (
        <dl className="mt-8 grid gap-6 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label}>
              <dd className="font-mono text-2xl text-ui-fg">{f.value}</dd>
              <dt className="mt-1 font-mono text-[0.6875rem] tracking-[0.08em] text-ui-faint uppercase">
                {f.label}
              </dt>
            </div>
          ))}
        </dl>
      )}

      {note && (
        <p className="mt-8 max-w-[64ch] border-l-2 border-cal-2/50 py-1 pl-4 text-[0.9375rem] leading-relaxed text-ui-dim">
          {note}
        </p>
      )}
    </section>
  );
}
