import type { ReactNode } from 'react';

/**
 * A pressable card in a row of them.
 *
 * WHAT IT IS FOR: a set of peers, side by side, one of which the reader will
 * open. It reports the element it was pressed on so the caller can grow
 * something out of it — see `OriginDialog`.
 *
 * IT OWNS NO CONTENT DECISIONS. What the figure is, what the title says, how
 * many lines of detail there are: all the caller's. The package owns the box,
 * the lift on hover, the focus ring and where the tone lands.
 *
 * THE TONE IS AN ACCENT, NEVER A WASH, and that is a decision worth stating
 * because the first version of this did the opposite. On a dark surface a tint
 * across a whole card does not read as identity — it reads as a muddy panel,
 * and six of them read as six muddy panels. So the tone lands on a hairline
 * along the top edge, the glow under a raised card, and the border under the
 * cursor. Same information, a tenth of the ink.
 */
export function Tile({
  tone,
  className,
  style,
  figure,
  title,
  subtitle,
  detail,
  meta,
  onOpen,
}: {
  /** A CSS colour. Omit it for an item that is not one of the set. */
  tone?: string;
  figure?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  /** Handed the element pressed, so the caller can open from where it sits. */
  onOpen: (element: HTMLElement) => void;
  /**
   * One extra class, for a state the package cannot know about.
   *
   * ADDED FOR A REAL SECOND CALLER, NOT SPECULATIVELY. Two pages now draw a
   * tile that is in the row but not in the set — a pile of files nothing has
   * read yet, a code base with nothing tabular behind it. Both were hand-rolling
   * `<div className="ui-tile …">` to get there, which meant a copy of the markup
   * that would not follow this component when it changed. What the state MEANS
   * is the consumer's; that there is a hook for it is ours.
   */
  className?: string;
  /** For a per-tile animation delay, so a row can land in reading order. */
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      className={className ? `ui-tile ${className}` : 'ui-tile'}
      style={tone ? ({ ...style, '--ui-tone': tone } as React.CSSProperties) : style}
    >
      {figure}
      <span className="ui-tile-title">{title}</span>
      {subtitle && <span className="ui-tile-subtitle">{subtitle}</span>}
      {detail && <span className="ui-tile-detail">{detail}</span>}
      {meta && <span className="ui-tile-meta">{meta}</span>}
    </button>
  );
}
