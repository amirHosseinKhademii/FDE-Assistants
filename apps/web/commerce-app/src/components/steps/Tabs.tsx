/**
 * The six phases of the build, as tabs.
 *
 * ── WHY PHASES AND NOT FOURTEEN SECTIONS ───────────────────────────────────
 *
 * `docs/commerce/MCP-STEPS.md` is fourteen headed steps, and every one of them
 * is on this page — that is the whole brief. But fourteen top-level sections in
 * one column is a wall: a reader arriving at step 9 has no way to tell whether
 * it is near the start or near the end, and no way to skip the four steps that
 * are about HTTP if what they came for is the guard.
 *
 * So the fourteen are grouped into six phases, each of which is a thing you
 * could stop after and still have something worth having. The grouping is the
 * document's own shape, not an invention: steps 0–3 are the protocol with no
 * business in it, 4a–6 are the boundary, 7–8 are turning it into a service,
 * 9 is retrieval, 10–11 are the client and its guard, and 12 is the bill.
 *
 * ── WHY A TAB BAR AND NOT A PAGE EACH ──────────────────────────────────────
 *
 * Six routes would give five of them a URL that serves an apology. Only the
 * first phase is finished. A tab bar puts the whole shape in front of the
 * reader at once and lets them see which sixth is real, which is more useful
 * than a page pretending the rest do not exist until they do.
 *
 * ── AN EMPTY TAB IS NOT DISABLED, AND THAT IS DELIBERATE ───────────────────
 *
 * The obvious treatment greys the unbuilt ones out and refuses the press. It is
 * wrong here: what each one WILL hold, and what has to happen before it can, is
 * the most interesting thing this page knows — the difference between a plan and
 * a wish. So every tab opens.
 *
 * ── THE ORDER IS THE DEPENDENCY ORDER ──────────────────────────────────────
 *
 * Not the order somebody would like to build them in. You cannot lock a door
 * onto a server that has no HTTP, or measure what a protocol cost before a
 * client calls it. Reading left to right is reading the sequence.
 */
import { useCallback, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export interface PhaseTab {
  id: string;
  /** What it is called. */
  label: string;
  /**
   * The step numbers this phase holds, in order.
   *
   * A LIST RATHER THAN THE STRING `'0–3'`, because three other things are
   * derived from it: the chip on the card, the total on the heading, and which
   * tab to open when somebody follows a link to a step. A typed range would be
   * a fourth place to forget.
   */
  holds: string[];
  /** How much of it exists, in two or three words. */
  status: string;
  /** False for a phase with nothing finished behind it. */
  built: boolean;
  /** How many of `holds` have run, and how many can — step 0 is reading, not building. */
  done: number;
  total: number;
  content: ReactNode;
}

/** `0–3`, or just `9` where a phase holds one step. */
export function rangeOf(holds: string[]): string {
  return holds.length > 1 ? `${holds[0]}\u2013${holds[holds.length - 1]}` : (holds[0] ?? '');
}

/**
 * CONTROLLED, AND IT DID NOT START THAT WAY.
 *
 * The state lived in here, which is the right default — nothing outside cared
 * which tab was open. Then the page grew a list of every step number as links,
 * and each one 404s in place: only the active panel is rendered, so an anchor to
 * a step in a closed tab scrolls nowhere and looks like a broken page. Following
 * a link has to be able to OPEN the tab, so the owner of that decision moved up
 * to the page.
 */
export function PhaseTabs({
  tabs,
  active,
  onActivate,
}: {
  tabs: PhaseTab[];
  active: string;
  onActivate: (id: string) => void;
}) {
  const setActive = onActivate;
  const base = useId();
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = useArrowKeys(tabs, setActive, buttons);

  return (
    <section className="lift-in" style={{ animationDelay: '140ms' }}>
      <div role="tablist" aria-label="Phases of the build" className="thb-tabs">
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
            className="thb-tab"
          >
            <span className="thb-tab-n">
              {tab.holds.length > 1 ? 'Steps' : 'Step'} {rangeOf(tab.holds)}
            </span>
            <span className="thb-tab-label">{tab.label}</span>
            <span className="thb-tab-status">
              <span>{tab.status}</span>
              <span className="thb-meter" aria-hidden>
                <span style={{ width: `${(tab.done / tab.total) * 100}%` }} />
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
          /* `hidden` rather than unmounting: a panel that rebuilds on every press
             loses the reader's scroll position and re-runs every entrance
             animation, which reads as the page reloading. */
          className="thb-tabpanel"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </section>
  );
}

/**
 * Arrow keys move between tabs, which is what a tab bar owes anybody not using
 * a mouse — and it is the part most hand-rolled ones leave out. Home and End go
 * to the ends, and focus follows selection because every panel is already
 * rendered.
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
 * What a phase says about itself before its steps begin.
 *
 * NOT A SUMMARY OF THE STEPS BELOW. It is the thing the steps do not say: what
 * you would have at the end of this phase that you did not have at the start,
 * and — for the five that are not written — what is stopping it. A reader who
 * presses a tab and finds four unbuilt steps deserves that in the first
 * paragraph rather than after the fourth.
 */
export function PhaseHead({
  title,
  status,
  what,
  waits,
}: {
  title: string;
  status: string;
  what: ReactNode;
  waits?: string[];
}) {
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-[1.5rem] leading-tight font-bold tracking-tight text-ui-fg md:text-[1.75rem]">
          {title}
        </h2>
        <span className="thb-pill" data-tone={waits === undefined ? 'done' : 'planned'}>
          {status}
        </span>
      </div>

      <div className="thb-prose mt-4">{what}</div>

      {waits && waits.length > 0 && <Waits items={waits} />}
    </section>
  );
}

function Waits({ items }: { items: string[] }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-ui-line-lit px-4 py-3.5">
      <h3 className="thb-label" data-tone="quiet">
        Before this phase can start
      </h3>
      <ul className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[1rem] leading-relaxed text-ui-dim">
            <span aria-hidden className="text-ui-faint">
              •
            </span>
            <span className="max-w-[64ch]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
