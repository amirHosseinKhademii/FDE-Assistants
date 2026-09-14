/**
 * The two figures on the firm's page.
 *
 * A CASE AND A PART, and the difference between them is the whole argument of
 * the drawing they sit in: one is a piece of work done for somebody, the other
 * is a component that was there before they asked. So one is a folder with a
 * question in it and the other is a box on a shelf, and they should not be
 * mistaken for each other at any size.
 *
 * Same stroke weight and grid as the engagement pages' own figures, so a reader
 * moving between them does not feel the drawing style change underneath.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** An engagement: a file with a question still open in it. */
export function CaseGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M3 8.5a2 2 0 0 1 2-2h6l2.5 3H25a2 2 0 0 1 2 2V23a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M15 13.5a2.2 2.2 0 1 1 2.2 2.2v1.6" />
        <path d="M17.2 20.4v.2" strokeWidth="2" />
      </g>
    </svg>
  );
}

/** A shared package: a part, already made, waiting on a shelf. */
export function PackageGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M15 3.5 26 9v12l-11 5.5L4 21V9z" />
        <path d="M4 9l11 5.5L26 9" />
        <path d="M15 14.5v12" />
      </g>
    </svg>
  );
}
