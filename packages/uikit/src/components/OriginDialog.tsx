import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/** A point in viewport coordinates — usually the centre of whatever was pressed. */
export interface Origin {
  x: number;
  y: number;
}

/** The centre of an element, in the shape this component wants. */
export function originOf(element: HTMLElement): Origin {
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * A dialog that grows out of the thing that opened it.
 *
 * WHY THE ORIGIN MATTERS. In a row of near-identical tiles, a panel that fades
 * in at the centre of the screen leaves the reader with no signal about which
 * one they are now looking inside. Scaling up from the pressed tile answers
 * that before a word is read, and scaling back into it on the way out says
 * where the thing they just closed went.
 *
 * THE ORIGIN IS MEASURED, NOT GUESSED. Where the panel's own box lands depends
 * on the viewport and on how much is in it, so the press point is converted
 * into the panel's local coordinates after layout. A percentage would be right
 * only at one window size.
 *
 * THREE WAYS OUT, because each is the first thing a different person tries:
 * press outside, press Escape, press the close button. A panel that traps
 * somebody who guessed wrong is worse than no panel.
 *
 * THE EXIT IS ANIMATED, SO UNMOUNTING IS DELAYED. `closing` runs the entrance
 * in reverse and the caller is told `EXIT_MS` later. That duration lives in
 * both this file and the stylesheet, which is worth knowing rather than hiding:
 * shorten one and the panel either vanishes mid-flight or leaves a ghost.
 */
export const EXIT_MS = 200;

export function OriginDialog({
  from,
  label,
  tone,
  header,
  children,
  onClose,
}: {
  from: Origin;
  /** For assistive technology. The visible title is whatever `header` renders. */
  label: string;
  tone?: string;
  header?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    const r = element.getBoundingClientRect();
    element.style.transformOrigin = `${from.x - r.left}px ${from.y - r.top}px`;
    element.focus({ preventScroll: true });
  }, [from]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);

    /* THE PAGE BEHIND MUST NOT SCROLL AWAY UNDER THE DIALOG, AND LOCKING IT IS
       LESS TRIVIAL THAN IT LOOKS. Three things go wrong with the one-liner, and
       all three are the kind a reader blames on the page rather than reports:

       1. WHERE YOU WERE. `overflow: hidden` on the root element makes it a
          non-scrolling box. Chrome happens to remember the offset; Safari and
          Firefox have both been seen to drop it, and the reader is returned to
          the top of a long page having pressed nothing but "close". So the
          position is captured and put back by hand rather than trusted to the
          browser. Restoring the exact same number is a no-op where the browser
          got it right, which is why this is safe to do unconditionally.

       2. THE PAGE JUMPING SIDEWAYS. Hiding the overflow also removes the
          scrollbar, and on a desktop with classic scrollbars the whole layout
          widens by its thickness — every line of text shifts right as the
          dialog opens and back as it closes. The gutter is measured and handed
          back as padding.

       3. `scroll-behavior: smooth`. If a consumer sets it, the restore would
          ANIMATE back to where you were, which looks exactly like the bug this
          is fixing. `instant` is explicit for that reason.

       Captured rather than assumed, and restored however this unmounts. */
    const root = document.documentElement;
    const y = window.scrollY;
    const gutter = window.innerWidth - root.clientWidth;
    const previousOverflow = root.style.overflow;
    const previousPadding = root.style.paddingRight;

    root.style.overflow = 'hidden';
    if (gutter > 0) root.style.paddingRight = `${gutter}px`;

    return () => {
      window.removeEventListener('keydown', onKey);
      root.style.overflow = previousOverflow;
      root.style.paddingRight = previousPadding;
      window.scrollTo({ top: y, behavior: 'instant' });
    };
  }, [close]);

  /**
   * ── IT IS PORTALLED TO <body>, AND THAT IS A BUG FIX RATHER THAN A HABIT ──
   *
   * `position: fixed` is relative to the VIEWPORT only while no ancestor has a
   * transform, a filter or a perspective. Any of those makes that ancestor the
   * containing block instead, and a "fixed" overlay then centres itself inside
   * whatever that element happens to be.
   *
   * Which is exactly what happened. The consumer's sections carry a `lift-in`
   * entrance animation with `animation-fill-mode: both`, so after it finishes
   * the computed style is not `none` — it is `matrix(1, 0, 0, 1, 0, 0)` and
   * `blur(0px)`. Visually identical, and still a containing block. Measured: a
   * scrim that should have been 860px tall was 3,887px, and the dialog centred
   * itself 223px ABOVE the top of the screen.
   *
   * An identity transform is the worst version of this because nothing looks
   * wrong in the CSS. So the overlay leaves the tree entirely rather than
   * depending on what a consumer's section is animated with.
   */
  return createPortal(
    <div className="ui-scrim" data-closing={closing} onMouseDown={close}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="ui-dialog"
        data-closing={closing}
        style={tone ? ({ '--ui-tone': tone } as React.CSSProperties) : undefined}
        /* The scrim closes on press; the panel must not pass its own presses up
           to it, or selecting text inside would shut the dialog. */
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ui-dialog-head">
          {header}
          <button type="button" onClick={close} className="ui-dialog-close" aria-label="Close">
            <span aria-hidden />
          </button>
        </header>
        {/* `data-dialog-scroll` names the element that actually scrolls, so a
            consumer with a pinned header inside the panel can measure against
            it without knowing how the dialog is built. `scrollIntoView` is not
            enough there: it honours `scroll-margin`, which is a fixed guess,
            and a pinned block's height moves with the font and the panel
            width. */}
        <div className="ui-dialog-body" data-dialog-scroll>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}