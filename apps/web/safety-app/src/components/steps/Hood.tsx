/**
 * The press that opens the real code — "Under the hood".
 *
 * ── ONE BUTTON, FOURTEEN PANELS ────────────────────────────────────────────
 *
 * Each `*Modal.tsx` beside this file owns its own panel, and several of them pin
 * something of their own to the top of it (the parser's five-line skeleton, for
 * one), so the panels stay where they are. What they shared was fourteen
 * hand-rolled copies of the same trigger button, which is the part a reader
 * sees fourteen times — so that is the part that became one component. It is
 * drawn the way Thornbury's `Hood.tsx` draws it: an icon, "Under the hood",
 * and a line saying what is inside.
 *
 * ── THE BUTTON SAYS WHAT IS INSIDE ─────────────────────────────────────────
 *
 * "Under the hood →" alone makes every one of these identical, and a reader who
 * has opened three and found code they did not want will not open the fourth.
 * So the trigger carries a one-line description of its own contents, which is
 * also the only part of it worth reading twice.
 *
 * ── WHY A DIALOG AND NOT A DISCLOSURE ──────────────────────────────────────
 *
 * The page is a sequence and the code is an aside. An `OriginDialog` grows out
 * of the button that opened it and scales back into the same spot on the way
 * out, so the reader keeps their place.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import type { ReactNode } from 'react';

/** The trigger on its own, for a panel that owns its dialog. */
export function HoodButton({
  blurb,
  onClick,
}: {
  /** What is inside, in one line. */
  blurb: ReactNode;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-ui-line-lit bg-ui-raised px-4 py-3.5 text-left transition-colors hover:border-cal-sky/60"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cal-sky/12 text-cal-sky" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold text-ui-fg">Under the hood</span>
        <span className="block text-[0.9375rem] leading-snug text-ui-dim">{blurb}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-cal-sky transition-colors group-hover:text-ui-fg">
        Open
      </span>
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
  const open = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setFrom(originOf(e.currentTarget));
  }, []);

  return (
    <>
      <HoodButton blurb={blurb} onClick={open} />
      {from && (
        <OriginDialog
          from={from}
          label={title}
          tone="var(--color-cal-sky)"
          onClose={() => setFrom(null)}
          header={
            <>
              <p className="text-[1rem] font-semibold text-ui-fg">{title}</p>
              <p className="mt-0.5 text-[0.875rem] text-ui-faint">{sub}</p>
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
      <h4 className="text-[1.0625rem] font-bold text-ui-fg">{title}</h4>
      <div className="mt-3.5 grid gap-4">{children}</div>
    </section>
  );
}

/** A paragraph inside a panel, held to a readable measure. */
export function HoodText({ children }: { children: ReactNode }) {
  return <p className="cal-hood-text">{children}</p>;
}
