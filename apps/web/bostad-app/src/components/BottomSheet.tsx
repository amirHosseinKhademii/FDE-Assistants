/**
 * The profile sheet on phones: a fixed box over the map, with three modes.
 *  - open (default): its top at 45 % of the screen, exactly at the map's bottom edge (no overlap, so the Google attribution stays visible).
 *  - card: the card covers the whole screen; the map is behind it, unchanged.
 *  - collapsed: the map is the whole screen; a "Show details" pill brings the card back.
 * The gesture area is the sheet's header strip (48 px, above the map in z-order, touch-action none):
 *  - a tap (under 10 px, under 300 ms) cycles open ↔ collapsed (card: back to open);
 *  - a swipe up (30 px or 0.3 px/ms) goes to card; a swipe down goes one mode down.
 * Pointer events, with touch events as a fallback for browsers that cancel the pointer
 * sequence. Each touch resolves once: the first end event wins. Nothing follows the finger.
 * Arrow keys mirror the swipes. The sheet stays mounted, so its content and scroll position are kept.
 */
import { useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from "react";
import { useLang } from "../lib/lang";

export type SheetMode = "open" | "card" | "collapsed";

const SWIPE_PX = 30;
const SWIPE_PX_PER_MS = 0.3;
const TAP_PX = 10;
const TAP_MS = 300;

/** Top edge of the sheet for each mode. */
export function sheetTop(mode: SheetMode): string {
  if (mode === "open") return "45dvh";
  // Below the top overlay row (wordmark, language, theme, search), so the handle stays reachable.
  if (mode === "card") return "calc(env(safe-area-inset-top) + 64px)";
  return "100dvh";
}

/** The mode one step down (towards collapsed). */
export function stepDown(mode: SheetMode): SheetMode {
  return mode === "card" ? "open" : "collapsed";
}

/** What a gesture from `startY` (at time `t0`) to `endY` (at `t1`) means. */
export function gestureOf(startY: number, t0: number, endY: number, t1: number): "up" | "down" | "tap" | null {
  const dy = endY - startY;
  const dt = Math.max(1, t1 - t0);
  const v = dy / dt;
  if (Math.abs(dy) < TAP_PX) return dt < TAP_MS ? "tap" : null;
  if (dy <= -SWIPE_PX || v < -SWIPE_PX_PER_MS) return "up";
  if (dy >= SWIPE_PX || v > SWIPE_PX_PER_MS) return "down";
  return null;
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
  const lastY = useRef(0);
  const swiped = useRef(false);
  const open = mode !== "collapsed";

  /** A gesture starts (pointer or touch). A second start for the same gesture changes nothing. */
  function begin(y: number) {
    lastY.current = y;
    if (!start.current) start.current = { y, t: performance.now() };
    swiped.current = false;
  }

  /** The gesture ends at `y`. Only the first end event for a gesture acts. */
  function finish(y: number) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const g = gestureOf(s.y, s.t, y, performance.now());
    if (g === "up") {
      swiped.current = true;
      if (mode !== "card") onMode("card");
    } else if (g === "down") {
      swiped.current = true;
      onMode(stepDown(mode));
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    begin(e.clientY);
    // Capture the pointer so its release reaches the strip even when the finger has left it.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers refuse capture for touch: the touch fallback still works */
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (start.current) lastY.current = e.clientY;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    finish(e.clientY);
  }

  function onPointerCancel() {
    // The browser took the touch (scroll, zoom): decide from where the finger last was.
    finish(lastY.current);
  }

  function onTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    begin(e.touches[0]?.clientY ?? lastY.current);
  }

  function onTouchMove(e: ReactTouchEvent<HTMLDivElement>) {
    if (start.current && e.touches[0]) lastY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    finish(e.changedTouches[0]?.clientY ?? lastY.current);
  }

  function onTouchCancel() {
    finish(lastY.current);
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
        <div
          className="sheet-bar"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          <button
            type="button"
            className="sheet-handle"
            aria-label={handleLabel}
            aria-expanded={mode !== "collapsed"}
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
