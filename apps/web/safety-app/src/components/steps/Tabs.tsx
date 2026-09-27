/**
 * The seven stages of the build, as tabs.
 *
 * ── WHY A TAB BAR AND NOT ONE LONG PAGE ────────────────────────────────────
 *
 * Twenty-nine steps in one column is a wall: a reader arriving at step 5.2 has
 * no way to tell whether it is near the start or the end, and no way to skip
 * the eight steps about search if what they came for is the evals. The seven
 * stages are the documents' own grouping (`docs/safety/`), and each is a thing
 * you could stop after and still have something worth having.
 *
 * ── THE ORDER IS THE DEPENDENCY ORDER ──────────────────────────────────────
 *
 * Not the order somebody would like to build them in. You cannot write an
 * answer key for a corpus you have not surveyed, or a contract before the key,
 * or evals before there is something to score. Reading left to right is reading
 * the sequence.
 *
 * ── CONTROLLED, BECAUSE A LINK HAS TO BE ABLE TO OPEN A TAB ────────────────
 *
 * Only the active panel is rendered, so an anchor to a step in a closed tab
 * scrolls nowhere and looks like a broken page. The roadmap's buttons open the
 * stage first, so the owner of "which tab is open" is the page, not this file.
 * (The same move, for the same reason, as Thornbury's `Tabs.tsx`.)
 */
import { useCallback, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export interface PhaseTab {
  id: string;
  /** The stage number, as the documents write it. */
  stage: string;
  /** What it is called. */
  label: string;
  /** The steps it holds — the pips on the card are counted from this. */
  holds: string[];
  content: ReactNode;
}

export function PhaseTabs({
  tabs,
  active,
  onActivate,
}: {
  tabs: PhaseTab[];
  active: string;
  onActivate: (id: string) => void;
}) {
  const base = useId();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = useArrowKeys(tabs, onActivate, buttons);

  return (
    <section className="lift-in" style={{ animationDelay: '140ms' }}>
      <div role="tablist" aria-label="Stages of the build" className="cal-phases">
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
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => onActivate(tab.id)}
            onKeyDown={(e) => onKey(e, i)}
            className="cal-phase"
          >
            <span className="cal-phase-n">Stage {tab.stage}</span>
            <span className="cal-phase-label">{tab.label}</span>
            <span className="cal-phase-status">
              <span>
                {tab.holds.length} {tab.holds.length === 1 ? 'step' : 'steps'}, built
              </span>
              <span className="cal-pips" aria-hidden>
                {tab.holds.map((s) => (
                  <span key={s} />
                ))}
              </span>
            </span>
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
          className="cal-phasepanel"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </section>
  );
}

/**
 * Arrow keys move between tabs, which is what a tab bar owes anybody not using
 * a mouse. Home and End go to the ends.
 */
function useArrowKeys(
  tabs: PhaseTab[],
  setActive: (id: string) => void,
  buttons: React.RefObject<Record<string, HTMLButtonElement | null>>,
) {
  return useCallback(
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
    [tabs, setActive, buttons],
  );
}

/**
 * What a stage says about itself before its steps begin.
 *
 * NOT A SUMMARY OF THE STEPS BELOW. It is the thing the steps do not say: what
 * you have at the end of this stage that you did not have at the start. A
 * reader who presses a tab deserves that in the first paragraph rather than
 * after the sixth step. `result` is the stage's headline number, if it has one —
 * always with its caveat in the same sentence.
 */
export function PhaseHead({
  stage,
  title,
  what,
  result,
}: {
  stage: string;
  title: string;
  what: ReactNode;
  result?: ReactNode;
}) {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-[1.5rem] leading-tight font-bold tracking-tight text-ui-fg md:text-[1.75rem]">
          {title}
        </h2>
        <span className="cal-pill" data-tone="done">
          Stage {stage} · Built
        </span>
      </div>

      <div className="cal-prose mt-4">{what}</div>

      {result && (
        <div className="mt-6 rounded-xl border border-ui-line-lit bg-ui-surface px-4 py-3.5">
          <h3 className="cal-label" data-tone="quiet">
            Where this stage ended
          </h3>
          <div className="cal-prose mt-1.5">{result}</div>
        </div>
      )}
    </section>
  );
}
