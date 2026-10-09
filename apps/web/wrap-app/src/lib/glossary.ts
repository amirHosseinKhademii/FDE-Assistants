/**
 * The words `/steps` uses, in plain English.
 *
 * ── THE RULE FOR AN ENTRY ──────────────────────────────────────────────────
 *
 * Say what it IS first, in one sentence with no other jargon in it, then what
 * it is HERE, in this build, if that differs. A definition that only works if
 * you already know two other terms is not a definition.
 *
 * Only two placeholder entries exist. The content job adds the rest, and every
 * step's `terms` list in lib/steps.ts must name a key that is defined here.
 */

export interface Term {
  /** The word as it appears on the page. */
  word: string;
  /** What it is, in general. */
  is: string;
  /** What it is in this build. Optional. */
  here?: string;
}

export const GLOSSARY = {
  corpus: {
    word: 'corpus',
    is: 'The full set of documents a system is meant to search or learn from.',
    here: 'The Vantis steering corpus: 1111 messy files.',
  },
  chunk: {
    word: 'chunk',
    is: 'A piece of a document, small enough to be searched on its own and handed to a model.',
  },
} satisfies Record<string, Term>;

export type TermKey = keyof typeof GLOSSARY;

/** The order the glossary is printed in. */
export const GLOSSARY_ORDER: TermKey[] = ['corpus', 'chunk'];

export const termId = (key: TermKey) => `term-${key}`;
