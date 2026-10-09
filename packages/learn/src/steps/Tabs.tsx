/**
 * The stages of a build, as tabs.
 *
 * WHY A TAB BAR AND NOT ONE LONG PAGE. Twenty-nine steps in one column is a
 * wall: a reader arriving mid-way has no way to tell whether they are near the
 * start or the end, and no way to skip what they did not come for. A stage is a
 * thing you could stop after and still have something worth having.
 *
 * THE ORDER IS THE DEPENDENCY ORDER, which is the host's to choose. Reading left
 * to right should be reading the sequence.
 *
 * CONTROLLED, BECAUSE A LINK HAS TO BE ABLE TO OPEN A TAB. Only the active panel
 * is rendered, so an anchor to a step in a closed tab scrolls nowhere and looks
 * like a broken page. The page owns "which tab is open".
 */
import { useCallback, useId, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * TWO SHAPES, ONE COMPONENT. A stage numbered by the documents (`stage`) gets
 * the pip row. A host whose tabs are counted in steps rather than stages gives
 * `status` instead, and the card shows a meter of `done` over `total`, and says
 * whether the stage `built`. The safety app uses the first; commerce the second.
 */
export interface PhaseTab {
  id: string;
  /** The stage number, as the documents write it. */
  stage?: string;
  /** What it is called. */
  label: string;
  /** The steps it holds — the pips on the card are counted from this. */
  holds: string[];
  content: ReactNode;
  /** The meter variant: how much of the stage exists, in two or three words. */
  status?: string;
  /** Whether anything in the stage has been built. Drawn dashed when false. */
  built?: boolean;
  /** How many of `holds` count as built, and how many can. */
  done?: number;
  total?: number;
}

/** `0–3`, or just `9` where a stage holds one step. */
export function rangeOf(holds: string[]): string {
  return holds.length > 1 ? `${holds[0]}\u2013${holds[holds.length - 1]}` : (holds[0] ?? '');
}

export function PhaseTabs({
  tabs,
  active,
  onActivate,
  label = 'Stages of the build',
}: {
  tabs: PhaseTab[];
  active: string;
  onActivate: (id: string) => void;
  /** Read out by a screen reader as the name of the tab list. */
  label?: string;
}) {
  const base = useId();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = useArrowKeys(tabs, onActivate, buttons);

  return (
    <section className="lift-in" style={{ animationDelay: '140ms' }}>
      <div role="tablist" aria-label={label} className="cal-phases">
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
            data-built={tab.built === undefined ? undefined : tab.built}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => onActivate(tab.id)}
            onKeyDown={(e) => onKey(e, i)}
            className="cal-phase"
          >
            {tab.status === undefined ? (
              <span className="cal-phase-n">Stage {tab.stage}</span>
            ) : (
              <span className="cal-phase-n">
                {tab.holds.length > 1 ? 'Steps' : 'Step'} {rangeOf(tab.holds)}
              </span>
            )}
            <span className="cal-phase-label">{tab.label}</span>
            {tab.status === undefined ? (
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
            ) : (
              <span className="cal-phase-status">
                <span>{tab.status}</span>
                <span className="cal-meter" aria-hidden>
                  <span style={{ width: `${((tab.done ?? 0) / Math.max(tab.total ?? 1, 1)) * 100}%` }} />
                </span>
              </span>
            )}
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
 *
 * TWO SHAPES, AS ON THE TABS. `stage` + `result` is the numbered build; `status`
 * + `waits` is a phase that may not have started, where `waits` lists what has
 * to happen first and the pill says how far it has got.
 */
export type PhaseHeadProps = {
  title: string;
  what: ReactNode;
} & (
  | { stage: string; result?: ReactNode; status?: undefined; waits?: undefined }
  | { status: string; waits?: string[]; stage?: undefined; result?: undefined }
);

export function PhaseHead(props: PhaseHeadProps) {
  const { title, what } = props;
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="cal-phase-title">{title}</h2>
        {props.status === undefined ? (
          <span className="cal-pill" data-tone="done">
            Stage {props.stage} · Built
          </span>
        ) : (
          <span className="cal-pill" data-tone={props.waits === undefined ? 'done' : 'planned'}>
            {props.status}
          </span>
        )}
      </div>

      <div className="cal-prose mt-4">{what}</div>

      {props.status === undefined && props.result && (
        <div className="cal-phase-result">
          <h3 className="cal-label" data-tone="quiet">
            Where this stage ended
          </h3>
          <div className="cal-prose mt-1.5">{props.result}</div>
        </div>
      )}

      {props.waits && props.waits.length > 0 && <Waits items={props.waits} />}
    </section>
  );
}

function Waits({ items }: { items: string[] }) {
  return (
    <div className="cal-waits">
      <h3 className="cal-label" data-tone="quiet">
        Before this stage can start
      </h3>
      <ul className="cal-waits-list">
        {items.map((item) => (
          <li key={item}>
            <span aria-hidden>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
