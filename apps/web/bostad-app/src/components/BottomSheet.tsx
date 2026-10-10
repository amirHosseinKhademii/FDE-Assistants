/**
 * The profile sheet on phones: a fixed box over the map, with three modes.
 *  - open (default): its top at 45 % of the screen, 24 px over the map.
 *  - card: the card covers the whole screen; the map is behind it, unchanged.
 *  - collapsed: the map is the whole screen; a "Show details" pill brings the card back.
 * The handle bar is the only control. A tap cycles open ↔ collapsed (card: back to
 * open). A swipe up goes to card; a swipe down goes one mode down. A swipe is only
 * detected on pointer up: nothing follows the finger. Arrow keys mirror the swipes.
 * The sheet stays mounted, so its content and scroll position are kept.
 */
import { useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useLang } from "../lib/lang";

export type SheetMode = "open" | "card" | "collapsed";

const SWIPE_PX = 40;
const SWIPE_PX_PER_MS = 0.3;

/** Top edge of the sheet for each mode. */
export function sheetTop(mode: SheetMode): string {
  if (mode === "open") return "calc(45dvh - 24px)";
  // Below the top overlay row (wordmark, language, theme, search), so the handle stays reachable.
  if (mode === "card") return "calc(env(safe-area-inset-top) + 64px)";
  return "100dvh";
}

/** The mode one step down (towards collapsed). */
export function stepDown(mode: SheetMode): SheetMode {
  return mode === "card" ? "open" : "collapsed";
}

export function BottomSheet({
  mode,
  onMode,
  children,
}: {
  mode: SheetMode;
  onMode: (mode: SheetMode) => void;
  children: ReactNode;
}) {
  const { t } = useLang();
  const start = useRef<{ y: number; t: number } | null>(null);
  const swiped = useRef(false);
  const open = mode !== "collapsed";

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    start.current = { y: e.clientY, t: performance.now() };
    swiped.current = false;
    // Capture the pointer so the release is reported to the handle even when the finger has left it.
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dy = e.clientY - s.y;
    const v = dy / Math.max(1, performance.now() - s.t);
    if (dy <= -SWIPE_PX || v < -SWIPE_PX_PER_MS) {
      swiped.current = true;
      if (mode !== "card") onMode("card");
    } else if (dy >= SWIPE_PX || v > SWIPE_PX_PER_MS) {
      swiped.current = true;
      onMode(stepDown(mode));
    }
  }

  function onTap() {
    // A swipe already acted; its click (if any) must not also act.
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onMode(mode === "open" ? "collapsed" : "open");
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMode("card");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onMode(stepDown(mode));
    }
  }

  const handleLabel = mode === "card" ? t("sheet.showMapDetails") : t("sheet.showMap");

  return (
    <>
      <section
        className={`profile-sheet is-${mode}`}
        style={{ top: sheetTop(mode) }}
        aria-label={t("sheet.label")}
        aria-hidden={open ? undefined : true}
        inert={!open}
      >
        <div className="sheet-bar">
          <button
            type="button"
            className="sheet-handle"
            aria-label={handleLabel}
            aria-expanded={mode !== "collapsed"}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (start.current = null)}
            onClick={onTap}
            onKeyDown={onKeyDown}
          >
            <span className="sheet-grip" aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </section>
      {mode === "collapsed" && (
        <button type="button" className="sheet-pill" aria-label={t("sheet.show")} aria-expanded={false} onClick={() => onMode("open")}>
          <span>{t("sheet.show")}</span>
          <span className="sheet-grip sheet-grip--pill" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
