/**
 * The six systems of record, in the order a lot travels them — and the seventh
 * thing that is not one of them.
 *
 * ONE TABLE, TWO PICTURES. The nerve map draws these as cylinders in a column
 * and the estate section draws them as a rail you can open. Both need the same
 * order, the same hue and the same short name, and the two disagreeing would be
 * the page contradicting itself in the one language nobody reads carefully —
 * `mrd_qms` blue in one drawing and fourth in the other. So neither owns it.
 *
 * THE ORDER IS THE WALK, not the alphabet and not the order the seeder writes
 * them in (`config/connections.ts` orders those by dependency, which is a
 * different concern and correctly a different list). It is the order
 * `assessRelease()` visits them, which is why the numerals are load-bearing
 * rather than decorative.
 *
 * THE HUES ARE A ROUTE, NOT A RANKING — `DESIGN.md` §2. They run teal → amber
 * across the spectrum so the eye reads a journey. Nothing may be inferred from
 * a system having a warmer hue than another.
 */

export interface SystemFace {
  /** The database name, and the key into `ESTATE`. */
  db: string;
  /** Its place in the walk. The six have one; the knowledge base does not. */
  step?: number;
  /** What a reviewer calls it. */
  name: string;
  /** What it answers, in a handful of words. */
  asks: string;
  /** Only the six systems of record carry one. */
  hue?: string;
}

export const SYSTEM_FACES: SystemFace[] = [
  { db: 'mrd_erp', step: 1, name: 'Materials', asks: 'which supplier, which lot, how much', hue: 'var(--color-hop-1)' },
  { db: 'mrd_mes', step: 2, name: 'Manufacture', asks: 'which line, which equipment, qualified when', hue: 'var(--color-hop-2)' },
  { db: 'mrd_qms', step: 3, name: 'Quality', asks: 'which tests, which results, which retests', hue: 'var(--color-hop-3)' },
  { db: 'mrd_hcm', step: 4, name: 'People', asks: 'who signed, trained when, authorised when', hue: 'var(--color-hop-4)' },
  { db: 'mrd_reg', step: 5, name: 'Registration', asks: 'which market, which procedure was in force', hue: 'var(--color-hop-5)' },
  { db: 'mrd_tms', step: 6, name: 'Transport', asks: 'how cold, how long, where it went', hue: 'var(--color-hop-6)' },
];

/**
 * The knowledge base, kept OUT of the list above rather than appended to it.
 *
 * It is not the seventh system of record and the code should not have to
 * remember that: `SYSTEM_FACES.length` is six, a loop over it cannot
 * accidentally give `mrd_kb` a hue or a numeral, and anything that wants to
 * show it has to reach for it deliberately. `db:drop` iterating the six and
 * silently destroying what had been built inside one of them is the reason this
 * boundary is drawn in code rather than in a comment.
 */
export const KB_FACE: SystemFace = {
  db: 'mrd_kb',
  name: 'Procedures',
  asks: 'the written rules, searched by meaning',
};
