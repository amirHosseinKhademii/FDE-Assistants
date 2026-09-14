import type { ReactNode } from 'react';

/**
 * A row of headline numbers, and where they came from.
 *
 * THE PROVENANCE LINE IS PART OF THE COMPONENT, not an afterthought beside it.
 * A figure a reader cannot reproduce is worth less than no figure, so the slot
 * for saying how it was obtained sits in the same row as the numbers and is
 * hard to leave out. It is optional because some numbers are definitions rather
 * than measurements — but it should be the unusual case.
 */
export function Figures({
  items,
  note,
}: {
  items: Array<{ value: ReactNode; label: string }>;
  /** How these were obtained — a date, a command, a source. */
  note?: ReactNode;
}) {
  return (
    <div className="ui-figures">
      {items.map((item) => (
        <span key={item.label} className="ui-figure">
          <span className="ui-figure-value">{item.value}</span>
          <span className="ui-figure-label">{item.label}</span>
        </span>
      ))}
      {note && <p className="ui-figure-note">{note}</p>}
    </div>
  );
}
