/**
 * A select plus the package's own chevron.
 *
 * The native arrow cannot be styled and sits at a different inset in every
 * engine, so `.ui-control` removes it (`appearance: none`) and this draws a
 * replacement at a known position. Without that, the one control in a row that
 * is a select is the one that looks wrong.
 */
import type { ReactNode } from 'react';
import { ChevronIcon } from '../icons';

export function Select({
  value,
  onChange,
  icon,
  disabled = false,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  icon?: ReactNode;
  /**
   * OPTIONAL AND DEFAULTING TO FALSE, so every existing caller is unchanged.
   *
   * Added for a list that is populated over the network: while it is loading,
   * and while the run it feeds is in flight, the choice must not move under the
   * person who made it. A control that accepts a change it will not honour is
   * worse than one that is visibly unavailable.
   */
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {icon && <span className="ui-icon left-3">{icon}</span>}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ui-control ${icon ? 'ui-control--icon' : ''}`}
      >
        {children}
      </select>
      <span className="ui-icon right-3">
        <ChevronIcon />
      </span>
    </>
  );
}
