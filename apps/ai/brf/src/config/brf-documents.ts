/**
 * What a BRF document is, and how its sections are numbered.
 *
 * The corpus is Swedish cooperative governance: bylaws (stadgar), house rules
 * (ordningsregler), board and annual meeting minutes (protokoll), a maintenance
 * plan (underhållsplan) and an annual report summary (årsredovisning). Each
 * section that matters starts with a heading of the form
 * "## § 9 Föreningens underhållsansvar". The citation a board member needs is
 * the file plus that number, for example "stadgar.md § 9".
 */
import type { DocumentDomain, DocumentFields } from '@fde/grounding';

/** The number at the start of a § heading: "9" from "§ 9 Föreningens underhållsansvar", "10a" from "§ 10a". */
const SECTION_LABEL = /^§\s*(\d+[a-z]?)(?=\s|$)/;

/**
 * The section number of a heading trail, or null when no § heading is in it.
 *
 * The trail is the chunk's `section` metadata, headings joined with " > ". The
 * DEEPEST § heading is the one that applies, because a passage under "## § 9"
 * can sit beneath a chapter heading above it.
 */
export function sectionNumberOf(trail: string): string | null {
  const parts = trail
    .split(' > ')
    .map((p) => p.trim())
    .reverse();
  for (const part of parts) {
    const m = SECTION_LABEL.exec(part);
    if (m) return m[1];
  }
  return null;
}

/** Every § number that heads a section in one document's text. Used to check citations. */
export function sectionNumbersIn(text: string): Set<string> {
  const found = new Set<string>();
  for (const line of text.split('\n')) {
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (!m) continue;
    const n = sectionNumberOf(m[1]);
    if (n) found.add(n);
  }
  return found;
}

/** The kind of document, from its file name. Unrecognised files are kept, under "dokument". */
const KINDS: Array<[RegExp, string]> = [
  [/^stadgar/i, 'stadgar'],
  [/^ordningsregler/i, 'ordningsregler'],
  [/^protokoll/i, 'protokoll'],
  [/^underhallsplan/i, 'underhallsplan'],
  [/^arsredovisning/i, 'arsredovisning'],
];

export const BRF_DOCUMENTS: DocumentDomain = {
  name: 'brf-housing-cooperative',

  // No document in this corpus carries a declared identifier. The file name is the identity.
  idFields: [],

  classify(id: string): string {
    for (const [re, kind] of KINDS) if (re.test(id)) return kind;
    return 'dokument';
  },

  // The corpus carries no status banner, so every document reads as "unknown".
  // The status is kept for the day a retired document arrives.
  retiredStatuses: ['superseded', 'withdrawn', 'rescinded'],

  relationFields: {},

  facets(_fields: DocumentFields): Record<string, unknown> {
    return {};
  },
};
