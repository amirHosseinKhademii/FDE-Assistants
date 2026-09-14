/**
 * The figures on the assessment map.
 *
 * WHY DRAWINGS AND NOT BOXES. A map made of identical rectangles asks the
 * reader to do all the work from the labels: nothing is recognisable until it
 * has been read. A sheet with one line marked, a queue with a marker part way
 * down it, a funnel, a caliper and a database cylinder are recognised before
 * the eye reaches the words, and the map becomes scannable rather than legible.
 *
 * THE TWO TOOLS ARE INSTRUMENTS, AND THAT IS A DELIBERATE TRADE. Meridian
 * Pharma's map learned this the expensive way and its `nerve-glyphs.tsx` header
 * is the record: drawing each tool by its JOB reads individually and stops the
 * middle column reading as a SET, so the reader no longer knows at a glance
 * what kind of thing that column holds. A magnifier and a vernier caliper are
 * both bench instruments before they are anything else. What each one does is
 * already written underneath it, twice.
 *
 * THE QUEUE IS THE ONE DRAWING THAT CARRIES INFORMATION, and it is the one
 * place this map must NOT copy pharma's. Pharma draws its fan-out as three
 * robot arms working at once, because that fan-out genuinely is concurrent.
 * `steering:assess-all` is serial and resumable — one requirement, then the
 * next — so the marker steps down a single column instead. Three arms here
 * would be a picture of a program nobody has written.
 *
 * ONE STROKE WEIGHT, ONE GRID, NO FILLS EXCEPT THE CYLINDER'S — the rule
 * `@fde/uikit/icons` sets. These live in the app rather than in a package
 * because they are about THIS product: a bid engineer's requirement, a work
 * list of twenty-four, two tools nobody else has. A second customer has no use
 * for them, which is exactly the line `@veresk/surface` draws — the cylinder
 * and the pages are imported from there because every estate has both.
 *
 * COLOUR: nothing here picks its own. Everything draws in `currentColor`; the
 * cylinders take `--ui-tone`, which on this map means which of the three
 * readings produced the rows. See `AssessMap.tsx` for why that is the only
 * thing colour is allowed to mean here.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * The question, which on this product is a document rather than a sentence.
 *
 * A customer requirement is one numbered line inside an OEM's specification,
 * and the whole difficulty of the job is that it arrives as part of four
 * hundred others. So the drawing is the sheet with one line picked out, not a
 * person at a keyboard — pharma's reviewer is at a desk because a batch
 * decision is a person's; this is a line item.
 */
export function RequirementGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M7 3.5h11l5 5v18a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 6 26.5v-21A1.5 1.5 0 0 1 7.5 4z" />
        <path d="M18 3.5v5h5" />
        <path d="M9.5 13.5h11M9.5 21.5h7" />
      </g>
      {/* THE ONE LINE THAT IS BEING ASKED ABOUT. Solid rather than stroked, so
          it separates from the two lines above and below it at 34px — at that
          size a difference in weight survives and a difference in length does
          not. */}
      <rect className="x-glyph-line" x="9.5" y="16.8" width="11" height="1.6" rx="0.8" fill="currentColor" />
    </svg>
  );
}

/**
 * The loop, at bullet size.
 *
 * ONLY THE NARROW SURFACE USES IT. On the wide map the loop's figure is the
 * tangle drawn at full size behind its label, and an icon on top of that would
 * name the same thing twice. In a single column there is no tangle to sit in,
 * and a row with no figure reads as a row missing something.
 *
 * IT IS NOT SHARED WITH PHARMA'S `WebGlyph`, and that is a decision rather than
 * an oversight. `@veresk/surface` holds the drawings EVERY engagement has — a
 * cylinder, a stack of pages. A tangle standing for one product's orchestrator
 * is not that, and moving it there to save twelve lines would put a product's
 * own figure in the shared package and invite the next one in behind it.
 */
export function TangleGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke} strokeWidth={1.1} opacity="0.9">
        <path d="M6 12 15 5l9 7-3 10-6 3-6-3z" />
        <path d="M15 5v10M6 12l9 3M24 12l-9 3M15 15l-3 10M15 15l6 7" />
      </g>
      <g fill="currentColor">
        <circle cx="15" cy="15" r="2.1" />
        <circle cx="15" cy="5" r="1.3" />
        <circle cx="6" cy="12" r="1.3" />
        <circle cx="24" cy="12" r="1.3" />
        <circle cx="21" cy="22" r="1.3" />
        <circle cx="12" cy="25" r="1.3" />
      </g>
    </svg>
  );
}

/**
 * The work list: twenty-four rows, worked from the top, one at a time.
 *
 * FIVE BARS FOR TWENTY-FOUR REQUIREMENTS. The count is already in the label
 * and on the edge coming in; what a drawing adds is what is happening to them,
 * and twenty-four bars at this size is a texture rather than a picture.
 *
 * THE FILLED BARS ARE BEHIND THE MARKER AND THE HOLLOW ONES IN FRONT OF IT.
 * That is the resumable shape drawn: finished work stays finished, the list is
 * recomputed from it, and there is never more than one row in flight.
 */
export function QueueGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M10 4.5h16M10 10.5h16M10 16.5h16M10 22.5h16M10 27.5h12" opacity="0.5" />
      </g>
      {/* done — two rows behind the marker */}
      <g fill="currentColor">
        <rect x="10" y="3.7" width="16" height="1.6" rx="0.8" />
        <rect x="10" y="9.7" width="16" height="1.6" rx="0.8" />
      </g>
      {/* THE MARKER, AND IT MOVES DOWN ONE ROW AT A TIME. `steps()` rather than
          a smooth translate: the work list advances by whole requirements, and
          an easing curve would draw it gliding between two of them. */}
      <g className="x-glyph-marker">
        <path d="M2 13.2 6.4 16.5 2 19.8z" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * The summariser: many finished dossiers in, a short page out.
 *
 * THE COMPRESSION IS THE POINT AND THE ONLY THING WORTH DRAWING. This agent
 * has no tools, no retrieval and no database of its own — everything it is
 * allowed to know arrives in its prompt, and everything countable was counted
 * in code before it was called. A funnel says that in one shape.
 */
export function FunnelGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M4 5.5h22L17.5 16v9.5l-5 2.5V16z" />
      </g>
      {/* What goes in: many short lines. What comes out is the stem. */}
      <g fill="currentColor" opacity="0.75">
        <rect x="6.5" y="1.2" width="5" height="1.4" rx="0.7" />
        <rect x="12.5" y="1.2" width="9" height="1.4" rx="0.7" />
        <rect x="22.5" y="1.2" width="3" height="1.4" rx="0.7" />
      </g>
    </svg>
  );
}

/** `search_documents` — the magnifier. Passages found by meaning. */
export function MagnifierGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <circle cx="13" cy="13" r="8.5" />
        <path d="M19.2 19.2 26.5 26.5" strokeWidth={2} />
        {/* Lines of prose inside the lens, because what it finds is writing. */}
        <path d="M8.5 10.5h9M8.5 14h9M8.5 17.5h5.5" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * `find_comparable_work` — a vernier caliper.
 *
 * The one instrument on an engineer's bench whose whole purpose is comparing a
 * thing against a known size, which is exactly what this tool does to a
 * requirement: measure it against jobs already finished and paid for.
 */
export function CaliperGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      {/* THE JAWS DO THE WORK AT 34px AND THE SCALE DOES NOT. A first version
          drew the beam with graduation marks on it, which is what a caliper
          looks like in the hand and what a small bracket looks like on a
          screen: the ticks read as thickness and the jaws vanished. So the
          jaws are long, the gap between them is wide, and the beam is one
          line. */}
      <g {...stroke}>
        {/* the beam, and the frame the slider rides in */}
        <path d="M2 10h26" />
        <path d="M13.5 7h7.5v6h-7.5z" />
        {/* the fixed jaw, and the sliding one — the gap between them is the
            measurement, so it is the widest space in the drawing */}
        <path d="M5 10v15" />
        <path d="M17.5 13v12" />
        {/* the thumbwheel, which is the part that says somebody is holding it */}
        <path d="M23.5 10v4.5" />
      </g>
      {/* What is being measured, marked between the jaws. */}
      <g fill="currentColor" opacity="0.55">
        <rect x="6.5" y="21.2" width="9.5" height="1.4" rx="0.7" />
      </g>
    </svg>
  );
}

/**
 * The four we do not read, drawn as several cylinders rather than one.
 *
 * `@veresk/surface`'s `CylinderGlyph` is one database and is right for every
 * node on this map that IS one. This node stands for four, and drawing it with
 * the same single cylinder would quietly say the customer has one more system
 * than they do. Three offset outlines read as "several" at 34px; four would
 * read as hatching.
 *
 * NO `--ui-tone`, and it is the only store here that refuses one — see
 * `AssessMap.tsx`. Colour on this map means which reading produced the rows,
 * and these produced none.
 */
export function StackGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.55">
        <ellipse cx="11" cy="7" rx="7" ry="2.7" />
        <path d="M4 7v11c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7V7" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" opacity="0.35">
        <ellipse cx="18" cy="11.5" rx="7" ry="2.7" />
        <path d="M11 11.5v11c0 1.5 3.1 2.7 7 2.7s7-1.2 7-2.7v-11" />
      </g>
    </svg>
  );
}
