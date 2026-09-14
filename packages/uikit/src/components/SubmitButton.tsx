/**
 * The submit button, as a grid item.
 *
 * The blank label keeps its top edge level with the labelled controls beside it,
 * which is why the button is not nudged into place with a margin — a margin is a
 * number that stops being right the moment a neighbour's label wraps.
 *
 * The sweep only runs while `busy`, and it is tied to a real open request rather
 * than a timer, so a moving button always means work is actually happening.
 */
import type { ReactNode } from 'react';

export function SubmitButton({
  busy,
  disabled,
  children,
  busyLabel,
}: {
  busy?: boolean;
  disabled?: boolean;
  children: ReactNode;
  busyLabel?: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs tracking-wide uppercase select-none" aria-hidden>
        &nbsp;
      </span>
      <button type="submit" disabled={disabled} className="ui-btn relative overflow-hidden">
        {busy && <span className="ui-sweep absolute inset-0" aria-hidden />}
        <span className="relative">{busy ? (busyLabel ?? children) : children}</span>
      </button>
    </div>
  );
}
