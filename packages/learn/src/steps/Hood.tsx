/**
 * "Under the hood": the press that opens the real code.
 *
 * ONE BUTTON, MANY PANELS. Each panel owns its own content; what they share is
 * the trigger, so that part is one component. The trigger carries a one-line
 * description of what is inside, because a reader who has opened three panels
 * and found code they did not want will not open a fourth without knowing.
 *
 * A DIALOG, NOT A DISCLOSURE. The page is a sequence and the code is an aside.
 * `OriginDialog` grows out of the button that opened it and scales back into the
 * same spot on the way out, so the reader keeps their place.
 *
 * COLOURS come from `styles.css` (`--steps-accent`), not from a Tailwind theme.
 */
import { useCallback, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';

/** The trigger on its own, for a panel that owns its dialog. */
export function HoodButton({
  blurb,
  onClick,
}: {
  /** What is inside, in one line. */
  blurb: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" onClick={onClick} className="cal-hood-trigger">
      <span className="cal-hood-icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      </span>
      <span className="cal-hood-body">
        <span className="cal-hood-title">Under the hood</span>
        <span className="cal-hood-blurb">{blurb}</span>
      </span>
      <span className="cal-hood-open">Open</span>
    </button>
  );
}

/** The trigger and a plain dialog shell, for a panel that is only content. */
export function Hood({
  blurb,
  title,
  sub,
  children,
}: {
  blurb: ReactNode;
  title: string;
  /** The step, and what the panel is worth, under the title. */
  sub: ReactNode;
  children: ReactNode;
}) {
  const [from, setFrom] = useState<Origin | null>(null);
  const open = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

  return (
    <>
      <HoodButton blurb={blurb} onClick={open} />
      {from && (
        <OriginDialog
          from={from}
          label={title}
          tone="var(--steps-accent, #7dd3fc)"
          onClose={() => setFrom(null)}
          header={
            <>
              <p className="cal-hood-head-title">{title}</p>
              <p className="cal-hood-head-sub">{sub}</p>
            </>
          }
        >
          {children}
        </OriginDialog>
      )}
    </>
  );
}

/** A heading inside a panel. Panels are long; a reader needs somewhere to land. */
export function HoodSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9 first:mt-0">
      <h4 className="cal-hood-section-title">{title}</h4>
      <div className="mt-3.5 grid gap-4">{children}</div>
    </section>
  );
}

/** A paragraph inside a panel, held to a readable measure. */
export function HoodText({ children }: { children: ReactNode }) {
  return <p className="cal-hood-text">{children}</p>;
}
