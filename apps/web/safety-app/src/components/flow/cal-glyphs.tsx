/**
 * Calder Safety's own drawings, for the nodes a cylinder and a stack cannot say.
 *
 * `@veresk/surface` owns the two every engagement needs — a database and a pile
 * of written material. Everything here is about THIS product: a question typed
 * in ordinary words, a model that can only produce text, and five particular
 * ways of asking.
 *
 * THE STROKE IS SHARED so a glyph drawn next to another never looks like it
 * came from a different set, and every one reads `--ui-tone` before falling
 * back, exactly as the shared two do.
 */
const stroke = {
  fill: 'none',
  stroke: 'var(--ui-tone, var(--node, currentColor))',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** A question, as somebody types it. Ordinary words, nothing structured. */
export function AskGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M4 7h22v14H12l-6 5v-5H4z" />
        <path d="M9.5 12.5h13M9.5 16h8" opacity="0.6" />
      </g>
    </svg>
  );
}

/**
 * The model. A ring that is not joined to anything below it — it can produce
 * text and nothing else, and the map's whole point is that no line runs from
 * here to the store.
 */
export function ModelGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <circle cx="15" cy="15" r="9" strokeDasharray="3 2.6" />
        <circle cx="15" cy="15" r="3.4" />
      </g>
    </svg>
  );
}

/** `get_recall` — a key, because the campaign number opens exactly one thing. */
export function KeyGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <circle cx="10" cy="15" r="5.5" />
        <path d="M15.5 15H26M22.5 15v4M19 15v3" />
      </g>
    </svg>
  );
}

/**
 * `find_recalls` — a sieve, and it is allowed to come up empty. The dotted
 * space beneath is the answer this tool exists to be able to give.
 */
export function SieveGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M5 9h20l-7 8v7l-6 3v-10z" />
        <path d="M11 27.5h8" opacity="0.45" strokeDasharray="2 2.4" />
      </g>
    </svg>
  );
}

/** `search_complaints` — a lens over prose, narrowed first. */
export function LensGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <circle cx="13" cy="13" r="8.5" />
        <path d="M19.2 19.2 26.5 26.5" strokeWidth={2} />
        <path d="M8.5 10.5h9M8.5 14h9M8.5 17.5h5.5" opacity="0.6" />
      </g>
    </svg>
  );
}

/** `count_complaints` — a tally. It returns a number and never a passage. */
export function TallyGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M7 8v14M12 8v14M17 8v14M22 8v14" />
        <path d="M5 19.5 24 10.5" strokeWidth={1.8} />
      </g>
    </svg>
  );
}

/**
 * `complaints_citing` — a link. Evidence by reference rather than by
 * similarity: somebody typed the campaign number themselves.
 */
export function LinkGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke}>
        <path d="M13 17a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5" />
        <path d="M17 13a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7L8.5 14.5" />
      </g>
    </svg>
  );
}

/** The loop, where there is no room for a card — a tangle of its own working. */
export function TangleGlyph() {
  return (
    <svg viewBox="0 0 30 30" className="ui-flow-glyph" aria-hidden>
      <g {...stroke} strokeWidth={1.2}>
        <path d="M5 15c4-8 16-8 20 0M5 15c4 8 16 8 20 0" opacity="0.7" />
        <circle cx="15" cy="15" r="2.6" />
        <path d="M15 5.5v4M15 20.4v4" opacity="0.5" />
      </g>
    </svg>
  );
}
