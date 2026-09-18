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
      <div role="tablist" aria-label="the phases of the build" className="thb-tabs">
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
            <span className="thb-tab-n" aria-hidden>
              {rangeOf(tab.holds)}
            </span>
            <span className="thb-tab-label">{tab.label}</span>
            <span className="thb-tab-status">{tab.status}</span>
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
  /** Two or three words: what exists. */
  status: string;
  what: ReactNode;
  /** What has to happen before this phase can start, in order. Omitted when nothing does. */
  waits?: string[];
}) {
  const done = waits === undefined;
  return (
    <section className="lift-in">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-mono text-lg leading-snug font-medium tracking-tight text-ui-fg md:text-xl">
          {title}
        </h2>
        <span
          className={
            done
              ? 'rounded-full border border-thb-1/40 px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-thb-1 uppercase'
              : 'rounded-full border border-dashed border-ui-line px-2.5 py-0.5 font-mono text-[0.625rem] tracking-[0.06em] text-ui-faint uppercase'
          }
        >
          {status}
        </span>
      </div>

      <div className="mt-4 max-w-[64ch] leading-relaxed text-ui-dim">{what}</div>

      {waits && waits.length > 0 && <Waits items={waits} />}
    </section>
  );
}

/** What has to happen first, numbered, because the order is the whole content. */
function Waits({ items }: { items: string[] }) {
  return (
    <>
      <h3 className="mt-8 font-mono text-[0.6875rem] tracking-[0.08em] text-thb-2 uppercase">
        what has to happen first
      </h3>
      <ol className="mt-4 grid gap-2.5">
        {items.map((item, i) => (
          <li key={item} className="flex items-baseline gap-4">
            <span className="w-4 shrink-0 text-right font-mono text-[0.75rem] text-ui-faint">
              {i + 1}
            </span>
            <span className="max-w-[58ch] text-[0.875rem] leading-relaxed text-ui-dim">{item}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
