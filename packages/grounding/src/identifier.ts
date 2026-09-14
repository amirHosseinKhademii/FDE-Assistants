/**
 * IDENTIFIER MATCHING — forgive the spelling, never the identity.
 *
 * Every corpus worth grounding on has identifiers with structure: ISO form
 * numbers, ICD codes, part numbers, standards references, case citations. Two
 * things are true of all of them, and getting either wrong is expensive.
 *
 * 1. THEY ARE WRITTEN INCONSISTENTLY. The same form appears in the wild as
 *    `PP 00 01 09 18`, `PP13 68 01 20` (missing space, in a regulator's own
 *    order), `pp-00-01-09-18` and `PP0001 0694`. A model citing one will
 *    punctuate it however it likes. Rejecting a real document because of a
 *    separator is a formatting test wearing a correctness test's clothes.
 *
 * 2. THEY ARE COMPARED EXACTLY, NEVER BY PREFIX. This is the one that costs
 *    money. In the corpus this package was written against, `PP 00 01 01 15`,
 *    `PP 00 01 09 18` and `PP 00 01 06 24` are the same form three editions
 *    apart, paying $30, $35 and $40 a day. A prefix match on `PP 00 01` merges
 *    all three and returns the wrong number WITH A CITATION ATTACHED. An
 *    earlier version of this logic matched with `startsWith` and silently
 *    merged five state variants with five different liability limits; nothing
 *    in the output looked broken.
 *
 * So: **leniency about spelling, strictness about identity.** They are
 *    different axes and conflating them is the bug.
 *
 * WHERE EACH RULE LIVES. This function is the discipline; the pattern and the
 * canonical spelling are the domain's. Do not be tempted to widen the pattern
 * to accept more — widen the NORMALISER instead. A looser pattern is a looser
 * filter, and the filter is the thing that must stay exact.
 */

export interface IdentifierScheme {
  /**
   * The identifier in a piece of text, canonically spelled, or '' when the text
   * names none. Returns the canonical form regardless of how it was written, so
   * everything downstream sees one spelling.
   */
  extract(text: string | undefined): string;

  /**
   * Does this text name the identifier the caller asked for?
   * EXACT after normalisation. Never a prefix.
   */
  matches(text: string | undefined, wanted: string): boolean;

  /** Spelling-insensitive comparison key. Two different keys are two different things. */
  normalize(id: string): string;
}

export interface IdentifierSchemeOptions {
  /**
   * Finds the identifier in free text. Capture group 1 is the id; if there is
   * no capture group, the whole match is used.
   *
   * Tolerate separators here (`[\s-]*`) rather than requiring one spelling —
   * that is spelling leniency, which is safe. Do NOT make the SHAPE looser.
   */
  pattern: RegExp;

  /**
   * Re-format a normalised identifier into its printed form, or null when it
   * does not fit the scheme. e.g. "PP00010624" -> "PP 00 01 06 24".
   *
   * Optional: when absent, the normalised form is canonical.
   */
  canonical?: (normalized: string) => string | null;

  /**
   * Characters that carry no identity, stripped before comparison.
   * Defaults to whitespace, hyphens and underscores.
   */
  insignificant?: RegExp;
}

export function createIdentifierScheme(opts: IdentifierSchemeOptions): IdentifierScheme {
  const insignificant = opts.insignificant ?? /[\s\-_]+/g;

  const normalize = (id: string): string =>
    id.replace(insignificant, '').toUpperCase();

  const extract = (text: string | undefined): string => {
    const m = opts.pattern.exec(text ?? '');
    if (!m) return '';
    const raw = m[1] ?? m[0];
    return opts.canonical?.(normalize(raw)) ?? raw.trim();
  };

  return {
    extract,
    normalize,
    matches(text, wanted) {
      const found = extract(text);
      // An empty extraction never matches. Returning true for "" would make a
      // document with no identifier match every filter.
      if (!found) return false;
      return normalize(found) === normalize(wanted);
    },
  };
}
