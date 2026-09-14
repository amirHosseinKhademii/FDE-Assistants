/**
 * A labelled control, and the reason every control on a page lines up.
 *
 * `Field` draws the label, the optional leading icon and the frame; whatever
 * goes inside is always `.ui-control` — one height, one padding scale, one focus
 * ring. Setting those per element is what makes a control row stair-step, and a
 * row that does not line up reads as unfinished no matter how good the rest is.
 *
 * Icons are centred with `top: 50%; translate: 0 -50%` against the control's own
 * box rather than nudged with padding, so they stay put when a label wraps.
 */
import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  icon,
  labelIcon,
  children,
  className = '',
}: {
  label: string;
  hint?: ReactNode;
  /** Leading icon INSIDE the control. Single-line controls only — see `labelIcon`. */
  icon?: ReactNode;
  /**
   * Icon beside the LABEL instead of inside the control.
   *
   * This is what a textarea gets, and the reason is not taste. A leading icon is
   * centred on its control's box; a textarea's text starts at the TOP of a box
   * two or more lines tall, so the icon drifts further from the first line with
   * every added row and the text reads as vertically misaligned. Rather than
   * hand-tuning an offset that breaks the moment the row count or the font size
   * changes, multi-line fields put the icon in the label, where it is aligned by
   * the same flexbox as the text beside it.
   */
  labelIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`ui-field grid gap-1.5 ${className}`}>
      <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-ui-dim uppercase">
        {labelIcon && <span className="text-ui-faint">{labelIcon}</span>}
        {label}
        {hint && (
          <span className="text-[0.6875rem] normal-case tracking-normal text-ui-faint">{hint}</span>
        )}
      </span>
      <span className="relative block">
        {icon && <span className="ui-icon left-3">{icon}</span>}
        {children}
      </span>
    </label>
  );
}
