/**
 * The profile sheet on phones, over a full-screen map that never moves. Two
 * states, no dragging:
 *  - open (default): the sheet starts at 55 % of the screen, as before.
 *  - collapsed: the sheet slides fully out of view and the map fills the
 *    screen; a floating "Show details" pill at the bottom brings it back.
 * Only the transform changes (200 ms, instant under reduced motion). The sheet
 * stays mounted, so its content and scroll position are kept.
 */
import type { ReactNode } from "react";
import { useLang } from "../lib/lang";

/** Top edge of the open sheet, px from the viewport top. */
export function openTop(vh: number): number {
  return Math.round(vh * 0.55);
}

export function BottomSheet({
  open,
  vh,
  searchBottom,
  onToggle,
  children,
}: {
  open: boolean;
  vh: number;
  /** Bottom edge of the search bar: the sheet's own top is 0, so this offsets it. */
  searchBottom: number;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useLang();
  const transform = open ? `translate3d(0, ${openTop(vh) - searchBottom}px, 0)` : "translate3d(0, 100%, 0)";

  return (
    <>
      <section
        className={`profile-sheet${open ? "" : " is-collapsed"}`}
        style={{ transform }}
        aria-label={t("sheet.label")}
        aria-hidden={open ? undefined : true}
        inert={!open}
      >
        <div className="sheet-bar">
          {/* The handle bar is the control. Its button has an invisible 44 px hit area around the bar. */}
          <button type="button" className="sheet-handle" aria-label={t("sheet.showMap")} aria-expanded={true} onClick={() => onToggle(false)}>
            <span className="sheet-grip" aria-hidden="true" />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </section>
      {!open && (
        <button type="button" className="sheet-pill" aria-label={t("sheet.show")} aria-expanded={false} onClick={() => onToggle(true)}>
          <span>{t("sheet.show")}</span>
          <span className="sheet-grip sheet-grip--pill" aria-hidden="true" />
        </button>
      )}
    </>
  );
}
