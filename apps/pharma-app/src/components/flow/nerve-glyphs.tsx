/**
 * The figures on the nerve map.
 *
 * WHY THESE ARE DRAWINGS AND NOT BOXES. A map made of identical rectangles asks
 * the reader to do all the work from the labels: every node looks the same, so
 * nothing is recognisable until it has been read. A person at a desk, a robot
 * arm, a database cylinder and a magnifier are recognised before the eye gets
 * to the words, and the map becomes scannable rather than legible.
 *
 * THE TOOLS ARE HAND TOOLS, CHOSEN AFTER TWO ATTEMPTS AT SOMETHING CLEVERER.
 * The first drew them as one instrument whose prong count matched the number of
 * stores that tool reads — information, and unreadable: three near-identical
 * shapes that had to be counted before they said anything. The second drew each
 * by its JOB — a clipboard, a splitting funnel, a magnifier — which read
 * individually but never read as a SET, so the middle column stopped looking
 * like one kind of thing.
 *
 * A wrench, a gear-and-spanner and a screwdriver say "tool" before they say
 * anything else, and saying which KIND of thing this column holds is the more
 * useful of the two jobs an icon can do here — what each one does is already
 * written underneath it, in its name and its one-line summary. The shape
 * carries no information on purpose, and that is a deliberate trade rather than
 * an oversight.
 *
 * ONE STROKE WEIGHT, ONE GRID, NO FILLS EXCEPT THE CYLINDER'S. That is the
 * package's icon rule (`@fde/uikit/icons`), and these live in the app rather
 * than the package only because they are about THIS product — a QP's desk, a
 * system of record, a fan-out of sub-agents. A second customer has no use for
 * them.
 *
 * COLOUR: nothing here picks its own. A glyph draws in `currentColor` except
 * the six cylinders, which take `--node` — the hue of the system they are — for
 * the reason stated at the top of `NerveMap.tsx`. Colour on this map means
 * which system of record a fact came from and nothing else.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/**
 * A reviewer at their desk. The one human figure on the map, and the only node
 * that is not a machine — which is the point of drawing it differently.
 */
export function DeskGlyph() {
  return (
    <svg viewBox="0 0 40 34" className="nerve-glyph" aria-hidden>
      <g {...stroke}>
        {/* the person */}
        <circle cx="11.5" cy="9" r="3.6" />
        <path d="M5.5 24c0-5.2 2.7-8 6-8s6 2.8 6 8" />
        {/* reaching for the keyboard */}
        <path d="M15.5 19.5 20 22.5" />
        {/* the desk */}
        <path d="M2 24.5h36M7 24.5V30M33 24.5V30" />
        {/* the screen, which is where the question gets typed */}
        <rect x="23" y="9" width="13" height="10" rx="1.2" />
        <path d="M29.5 19v5.5" />
      </g>
      {/* The caret: the only part that moves, because the only thing this node
          contributes is a typed question. */}
      <rect className="nerve-caret" x="25.5" y="12" width="1.4" height="4.4" rx="0.7" fill="currentColor" />
    </svg>
  );
}

/**
 * One articulated arm, at a shoulder it can swing from.
 *
 * THE MOTION IS TIED TO THE FAN-OUT, not to a timer: the arms work at the
 * moment the map's cycle reaches the sub-agents and are still the rest of the
 * time. A machine that mimes work while nothing is happening is the kind of
 * decoration this product spends its whole design arguing against.
 */
function Arm({ delay }: { delay: string }) {
  return (
    <g {...stroke}>
      {/* the plinth */}
      <path d="M2 30h12M4 30v-2.5h8V30" />
      <g className="nerve-arm" style={{ animationDelay: delay }}>
        {/* shoulder → elbow → gripper */}
        <path d="M8 27.5 13 16" />
        <circle cx="13" cy="16" r="1.5" />
        <path d="M13 16 23 12" />
        <path d="M23 12l4-2.5M23 12l3 3.5" />
      </g>
    </g>
  );
}

/**
 * Three arms for twenty-three agents. Three, because the count is already in
 * the label and in the edge coming in — what a drawing adds is what they are
 * DOING, and a bench of twenty-three identical arms at this size is a texture
 * rather than a picture.
 */
export function ArmsGlyph() {
  return (
    <svg viewBox="0 0 96 32" className="nerve-glyph nerve-glyph--wide" aria-hidden>
      <Arm delay="0s" />
      <g transform="translate(32 0)">
        <Arm delay="0.18s" />
      </g>
      <g transform="translate(64 0)">
        <Arm delay="0.36s" />
      </g>
      {/* the bench they work over */}
      <path d="M0 31h96" {...stroke} opacity="0.45" />
    </svg>
  );
}

/**
 * One open-ended spanner, drawn once and reused at two sizes — the tool glyph
 * and the smaller one crossing the gear. Two hand-drawn spanners would drift
 * apart the first time either is touched.
 */
const SPANNER =
  'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z';

/** `assess_release` — the spanner. */
export function WrenchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="nerve-glyph" aria-hidden>
      <path d={SPANNER} {...stroke} />
    </svg>
  );
}

/**
 * `assess_supplier_impact` — a gear with a spanner on it. The heavier of the
 * three drawings for the heaviest of the three tools; it is the one that fans
 * out into twenty-three sub-agents directly below it.
 */
export function GearSpannerGlyph() {
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 30 30" className="nerve-glyph" aria-hidden>
      <g {...stroke}>
        <circle cx="11" cy="11" r="5.2" />
        <circle cx="11" cy="11" r="1.9" />
        {teeth.map((deg) => (
          <path key={deg} d="M11 5.2V2.8" transform={`rotate(${deg} 11 11)`} />
        ))}
      </g>
      {/* The spanner lies across the gear's lower right, at the scale that puts
          its jaw clear of the teeth. */}
      <g transform="translate(12.5 12.5) scale(0.68)">
        <path d={SPANNER} {...stroke} strokeWidth={2} />
      </g>
    </svg>
  );
}

/** `search_procedures` — the screwdriver. The lightest tool, and the only one
 * that goes to written procedures rather than to a system of record. */
export function ScrewdriverGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="nerve-glyph" aria-hidden>
      <g {...stroke}>
        <rect x="10.5" y="2.5" width="9" height="9.5" rx="2.6" />
        <path d="M12 12h6" />
        <path d="M15 12v10" />
        <path d="M12.9 22h4.2l-2.1 5.2z" />
      </g>
    </svg>
  );
}

/* THE CYLINDER AND THE PAGES LEFT THIS FILE. Both are in `@veresk/surface`:
   every customer has stores of records and piles of written material, so both
   estates draw them and neither owns them. What is left here is the part that
   is only true of Meridian Pharma's product — a reviewer at a desk, three robot
   arms, a spanner. */

/**
 * The loop, at bullet size.
 *
 * ONLY THE NARROW SURFACE USES IT. On the wide map the loop's figure is the web
 * itself, drawn at full size behind its label, and an icon on top of that would
 * be naming the same thing twice. In a single column there is no web to sit in,
 * and a row without a figure reads as a row missing something — so this is the
 * tangle, reduced to what survives at 28px.
 */
export function WebGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="nerve-glyph" aria-hidden>
      <g {...stroke} strokeWidth={1.1} opacity="0.9">
        <path d="M8 9.5 15 6l7 4.5-2 8-9 2.5-4.5-6z" />
        <path d="M15 6v8.5M8 9.5l7 5M22 10.5l-7 4M15 14.5l-4 6.5M15 14.5l5 4" />
      </g>
      <g fill="currentColor">
        <circle cx="15" cy="14.5" r="2.1" />
        <circle cx="15" cy="6" r="1.4" />
        <circle cx="8" cy="9.5" r="1.4" />
        <circle cx="22" cy="10.5" r="1.4" />
        <circle cx="20" cy="18.5" r="1.4" />
        <circle cx="11" cy="21" r="1.4" />
      </g>
    </svg>
  );
}
