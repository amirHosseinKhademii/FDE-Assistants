import type { ReactNode } from 'react';

/**
 * One thing, described.
 *
 * A title, a figure that belongs to it, a sentence about it, and whatever
 * detail the caller puts underneath — usually a `FieldList`. It is the shape
 * that answers "what is this and what is in it", which is a question worth
 * having one answer to across a product rather than four.
 *
 * THE TONE LANDS ON THE TITLE, and that is the whole of the colour here. In a
 * grid of a dozen of these the title is the one word that identifies the thing;
 * colouring it says which set this card belongs to without tinting a surface.
 *
 * THE FIGURE IS A STRING, NOT A NUMBER. Formatting — thousands separators,
 * units, a count mid-animation — is the caller's, because how a quantity should
 * read is a property of what is being counted.
 */
export function DetailCard({
  title,
  figure,
  unit,
  description,
  children,
  style,
  className,
}: {
  title: ReactNode;
  figure?: ReactNode;
  unit?: string;
  description?: ReactNode;
  children?: ReactNode;
  /** For a per-item animation delay, which only the caller knows the order of. */
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <li className={className ? `ui-detail ${className}` : 'ui-detail'} style={style}>
      <div className="ui-detail-head">
        <p className="ui-detail-title">{title}</p>
        {figure !== undefined && (
          <p className="ui-detail-figure">
            {figure}
            {unit && <span className="ui-detail-unit">{unit}</span>}
          </p>
        )}
      </div>
      {description && <p className="ui-detail-note">{description}</p>}
      {children}
    </li>
  );
}
