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
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {icon && <span className="ui-icon left-3">{icon}</span>}
      <select
        value={value}
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
