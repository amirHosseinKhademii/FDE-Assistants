/**
 * The press that opens the real code.
 *
 * ── ONE COMPONENT, WHERE CALDER HAS FOURTEEN COPIES ────────────────────────
 *
 * `apps/web/safety-app/src/components/steps/*Modal.tsx` is fourteen files that
 * each re-implement the same trigger button and the same dialog shell around
 * different contents. That was the right call there — several of them pin a
 * different thing to the top of the panel, and the shells had genuinely
 * diverged. Here they have not, so the shell is one component and each panel is
 * only its content. If a panel ever needs a pinned header of its own, this is
 * the file to grow a prop rather than the file to copy.
 *
 * ── WHY A DIALOG AND NOT A DISCLOSURE ──────────────────────────────────────
 *
 * The page is a sequence and the code is an aside. Fourteen expanding blocks
 * inline would triple the page's length and destroy the one thing the sequence
 * has going for it — that you can read it top to bottom in ten minutes. An
 * `OriginDialog` grows out of the button that opened it, so the reader keeps
 * their place: it scales back into the same spot on the way out.
 *
 * ── THE BUTTON SAYS WHAT IS INSIDE ─────────────────────────────────────────
 *
 * "Under the hood →" alone makes every one of these identical, and a reader who
 * has opened three and found two of them to be code they did not want will not
 * open the fourth. So the trigger carries a one-line description of its own
 * contents, which is also the only part of it worth reading twice.
 */
import { useCallback, useState } from 'react';
import { OriginDialog, originOf } from '@fde/uikit';
import type { Origin } from '@fde/uikit';
import type { ReactNode } from 'react';

export function Hood({
  blurb,
  title,
  sub,
  children,
}: {
  /** What is inside, in one line, on the button itself. */
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
      <button
        type="button"
        onClick={open}
        className="group flex w-full items-center gap-4 rounded-lg border border-ui-line bg-ui-surface px-4 py-3.5 text-left transition-colors hover:border-thb-2/50"
      >
        <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.08em] text-thb-2 uppercase">
          under the hood
        </span>
        <span className="min-w-0 flex-1 text-[0.875rem] text-ui-dim">{blurb}</span>
        <span className="shrink-0 font-mono text-sm text-ui-faint transition-colors group-hover:text-ui-fg">
          open →
        </span>
      </button>

      {from && (
        <OriginDialog
          from={from}
          label={title}
          tone="var(--color-thb-2)"
          onClose={() => setFrom(null)}
          header={
            <>
              <p className="font-mono text-sm text-ui-fg">{title}</p>
              <p className="mt-0.5 text-[0.75rem] text-ui-faint">{sub}</p>
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
      <h4 className="font-mono text-[0.6875rem] tracking-[0.08em] text-thb-1 uppercase">{title}</h4>
      <div className="mt-3.5 grid gap-4">{children}</div>
    </section>
  );
}

/** A paragraph inside a panel, held to a readable measure. */
export function HoodText({ children }: { children: ReactNode }) {
  return <p className="max-w-[64ch] text-[0.875rem] leading-relaxed text-ui-dim">{children}</p>;
}
