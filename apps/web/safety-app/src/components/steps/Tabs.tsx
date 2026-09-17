/**
 * The four parts of the build, as tabs — of which one exists.
 *
 * ── WHY A TAB BAR AND NOT FOUR PAGES ───────────────────────────────────────
 *
 * The seven stages under "grounding" are one of four things this engagement
 * will be made of, and the other three are written down, argued about and not
 * built. Four routes would give three of them a URL that serves an apology.
 * A tab bar puts the whole shape in front of the reader at once and lets them
 * see which quarter of it is real — which is more useful than the page
 * pretending the other three do not exist until they do.
 *
 * ── AN EMPTY TAB IS NOT DISABLED, AND THAT IS DELIBERATE ───────────────────
 *
 * The obvious treatment is to grey the unbuilt tabs out and refuse the press.
 * It is wrong here: what each one WILL hold, and what has to happen before it
 * can, is the most interesting thing this page knows — it is the difference
 * between a plan and a wish. So every tab opens, and the ones with no stages
 * behind them say what they are waiting for.
 *
 * ── THE ORDER IS THE DEPENDENCY ORDER ──────────────────────────────────────
 *
 * Not the order somebody would like to build them in. The answer contract is
 * written after the answer key; the loop is written after the contract; the
 * evals need something to score. Reading left to right is reading the sequence,
 * and the bar says so under the labels rather than leaving it to be inferred.
 */
import { useCallback, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface StepTab {
  id: string;
  /** What it is called. */
  label: string;
  /** Which stage of the plan, shown small under the label. */
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
      {/* THE BAR SCROLLS SIDEWAYS ON A PHONE rather than wrapping. Four tabs
          wrapped to two rows stop reading as one sequence, and the sequence is
          half of what the bar is saying. */}
      <div
        role="tablist"
        aria-label="the four parts of the build"
        className="-mx-5 flex gap-1 overflow-x-auto border-b border-ui-line px-5 sm:mx-0 sm:px-0"
      >
        {tabs.map((tab, i) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttons.current[tab.id] = el;
              }}
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-controls={`${base}-panel-${tab.id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="group relative shrink-0 px-4 pt-2 pb-3 text-left transition-colors"
            >
              <span
                className={`block font-mono text-[0.9375rem] transition-colors ${
                  on ? 'text-ui-fg' : tab.built ? 'text-ui-dim' : 'text-ui-faint'
                } group-hover:text-ui-fg`}
              >
                {tab.label}
              </span>
              <span className="mt-0.5 flex items-baseline gap-2 font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                <span className="text-ui-faint">{tab.stage}</span>
                <span
                  style={{
                    color: on
                      ? 'var(--color-cal-1)'
                      : tab.built
                        ? 'var(--color-cal-2)'
                        : undefined,
                  }}
                  className={tab.built ? undefined : 'text-ui-faint'}
                >
                  {tab.status}
                </span>
              </span>

              {/* The underline grows from the middle when the tab is chosen. A
                  bar that slides between tabs was tried and needs measurement
                  that re-runs on every resize and font load; this reads the
                  same and cannot be wrong about where it is. The unbuilt tabs
                  get a dashed one, so the bar says which quarter is real
                  without anybody having to read the labels. */}
              <span
                aria-hidden
                className="absolute inset-x-2 bottom-[-1px] h-[2px] origin-center transition-transform duration-300"
                style={{
                  transform: `scaleX(${on ? 1 : 0})`,
                  background: tab.built
                    ? 'var(--color-cal-1)'
                    : 'repeating-linear-gradient(90deg, var(--color-ui-faint) 0 4px, transparent 4px 8px)',
                }}
              />
            </button>
          );
        })}
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
          className="pt-10"
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
