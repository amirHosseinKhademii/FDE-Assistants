/**
 * The form identifiers, and the map from the retired PoC ids.
 *
 * WHY THE SCHEME CHANGED. The old ids — `PA-2023-01`, `PA-2023-01-TX` — were
 * PoC shorthand and wrong in a way that mattered: they encoded the STATE in the
 * identifier. Real form numbers do not. ISO's personal auto amendatories are
 * `PP 01 99` (Virginia), `PP 01 50` (Texas), `PP 01 75` (Maine) — the state is
 * nowhere in the digits, and a reader gets it from the title or the metadata.
 * Any code that parsed jurisdiction out of an id would be correct on our old
 * corpus and wrong on every real one.
 *
 * THE SCHEME. `PP 00 01 06 24`:
 *
 *   PP     line prefix — personal auto
 *   00 01  form number, as two pairs
 *   06 24  edition, MM YY
 *
 * Spaces are the printed convention and are kept. Real corpora also contain
 * `PP13 68 01 20` (missing space), `pp-00-01-09-18` and `PP0001 0694`, so any
 * matcher built on this has variants to tolerate — that is a property of the
 * domain, not an accident of ours.
 *
 * NOTE the edition is part of the id. `PP 00 01 09 18` and `PP 00 01 06 24` are
 * the same form, six years apart, and a determination construing one is not
 * automatically authority for the other. That is what makes the stale-
 * determination trap work.
 */

/** Filename for a form id: "PP 00 01 06 24" -> "pp-00-01-06-24.md". */
export const formFile = (id) => `${id.toLowerCase().replace(/\s+/g, '-')}.md`;

export const FORMS = {
  BASE_2015: 'PP 00 01 01 15',
  BASE_2018: 'PP 00 01 09 18',
  BASE: 'PP 00 01 06 24',
  PREFERRED: 'PP 00 02 06 24',
  ESSENTIAL: 'PP 00 03 06 24',
  TX: 'PP 01 50 06 24',
  CA: 'PP 01 06 06 24',
  NY: 'PP 01 79 06 24',
  FL: 'PP 01 20 06 24',
  RENTAL_END: 'PP 03 24 06 24',
  GLASS_END: 'PP 13 68 01 20',
  EXCLUSIONS: 'PP 04 91 06 24',
};

/**
 * Retired id -> current id.
 *
 * Applied mechanically across the 67 guidance documents and the 18 records, so
 * the repoint is a substitution that can be audited rather than 85 hand edits.
 * Ordered longest-first: replacing "PA-2023-01" before "PA-2023-01-TX" would
 * leave a dangling "-TX". Same prefix-matching hazard `form-id.ts` documents.
 */
export const RETIRED = [
  ['PA-2023-01-TX', FORMS.TX],
  ['PA-2023-01-CA', FORMS.CA],
  ['PA-2023-01-NY', FORMS.NY],
  ['PA-2023-01-FL', FORMS.FL],
  ['PA-END-2024-03', FORMS.RENTAL_END],
  ['PA-END-2023-11', FORMS.GLASS_END],
  ['PA-2023-01', FORMS.BASE],
  ['PA-2022-04', FORMS.BASE_2018],
  ['PA-2021-07', FORMS.BASE_2015],
  ['PP-2023-01', FORMS.PREFERRED],
  ['PE-2023-01', FORMS.ESSENTIAL],
];

/** Rewrite every retired id in a string. Longest-first; see RETIRED. */
export function repoint(text) {
  let out = text;
  for (const [from, to] of RETIRED) out = out.split(from).join(to);
  return out;
}

/** Every form a guidance document can bear on, in the current edition. */
export const ALL_CURRENT_FORMS = [
  FORMS.BASE, FORMS.TX, FORMS.CA, FORMS.NY, FORMS.FL,
];
