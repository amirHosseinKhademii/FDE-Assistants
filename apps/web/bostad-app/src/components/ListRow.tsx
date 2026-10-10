import type { ReactNode } from "react";

/**
 * One row of a transport or nearby-places list, shared by both so they look and
 * wrap the same: the icon in its own column (the column is as wide as the icon),
 * then the title (at most two lines), one meta line, and any extra lines below.
 * With `onPick` the whole row is a button (for places: pan the map and open the card).
 */
export function ListRow({
  icon,
  title,
  meta,
  children,
  onPick,
  pressed = false,
}: {
  icon: ReactNode;
  title: string;
  meta?: string;
  children?: ReactNode;
  onPick?: () => void;
  pressed?: boolean;
}) {
  const body = (
    <>
      <span className="list-row-icon">{icon}</span>
      <span className="list-row-text">
        <span className="list-row-title">{title}</span>
        {meta && <span className="list-row-meta">{meta}</span>}
        {children}
      </span>
    </>
  );
  return (
    <li className="list-row">
      {onPick ? (
        <button type="button" className="list-row-button" aria-pressed={pressed} onClick={onPick}>
          {body}
        </button>
      ) : (
        <div className="list-row-body">{body}</div>
      )}
    </li>
  );
}
