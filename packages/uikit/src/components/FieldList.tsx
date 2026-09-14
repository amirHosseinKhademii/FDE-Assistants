/**
 * A list of named values.
 *
 * A LIST, NOT A CLOUD OF CHIPS. Chips wrapped into a paragraph read as tags — a
 * set you scan looking for one you recognise. A list is a SHAPE: names aligned
 * down one edge, values down the other, and how many there are visible without
 * counting. When the question is "what is in this thing", the shape is most of
 * the answer.
 *
 * THE MARK IS A SHAPE, NOT A COLOUR. A consumer's palette is usually already
 * carrying meaning — which source a fact came from, how severe it is — and a
 * second colour scale for value types would collide with it. A square, a
 * circle, a diamond and a bar collide with nothing.
 */
export type FieldKind = 'text' | 'number' | 'date' | 'flag' | 'json' | 'other';

export interface FieldRow {
  name: string;
  /** Shown at the end of the row. Omit it and `fallback` is shown instead. */
  value?: string;
  kind: FieldKind;
}

export function FieldList({
  fields,
  fallback,
}: {
  fields: FieldRow[];
  /** What to show for a row with no value. Given the row's kind. */
  fallback?: (kind: FieldKind) => string;
}) {
  return (
    <ul className="ui-data">
      {fields.map((field) => (
        <li key={field.name} className={`ui-datum ui-datum--${field.kind}`}>
          <span className="ui-datum-name">{field.name}</span>
          <span className="ui-datum-value" title={field.value}>
            {field.value ?? <span className="ui-datum-fallback">{fallback?.(field.kind)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
