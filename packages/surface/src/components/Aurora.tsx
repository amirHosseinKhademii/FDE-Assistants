/**
 * The colour behind every page.
 *
 * SHARED SO EACH ENGAGEMENT'S PAGES ARE ONE PRODUCT. A landing page and the
 * desk behind it are the same estate seen from two distances; if the front door
 * glowed and the working surface was flat near-black, crossing between them
 * would feel like leaving the site. Same fields, different intensity — `muted`
 * drops them back behind a desk, where content has to stay readable for minutes
 * at a time rather than seconds.
 *
 * IT IS DECORATION AND SAYS SO. Nothing here encodes a finding or a severity.
 * That distinction matters in this product more than most: `@fde/uikit` owns
 * colour that MEANS something, and a wrong hue there is a wrong claim about a
 * batch. These are free precisely because they mean nothing.
 *
 * WHY THE HUES ARE A PROP AND NOT A DEFAULT. Two reasons, and the second is the
 * one that would have bitten silently. First, the engagements do not share a
 * palette on purpose: pharma's six hop hues mean "which system of record", and
 * a steering page wearing them would teach a reader the colour means nothing.
 * Second, Tailwind generates a class only where it can SEE it. A default
 * `bg-hop-4/20` written inside this package would be generated for whichever
 * app happens to name the same class in its own source, and silently missing in
 * the other — a page that builds cleanly and renders grey. Naming the classes
 * at the call site puts them in scanned source in both apps.
 */
export interface AuroraTone {
  /** A Tailwind background class, written literally at the call site. */
  className: string;
  /** Its size, as Tailwind width and height classes. */
  size: string;
  /** Where it sits. Passed straight through as inline style. */
  at: { top?: string; left?: string; right?: string };
  /** Negative, so the three fields are out of phase rather than breathing together. */
  delay?: string;
}

export function Aurora({ tones, muted = false }: { tones: AuroraTone[]; muted?: boolean }) {
  const a = muted ? 'opacity-45' : 'opacity-100';
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${a}`}>
      {tones.map((tone, i) => (
        <span
          key={i}
          className={`aurora ${tone.size} ${tone.className}`}
          style={{ ...tone.at, animationDelay: tone.delay }}
        />
      ))}
    </div>
  );
}
