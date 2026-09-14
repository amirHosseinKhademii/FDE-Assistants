/**
 * The insurance form identifier — the DOMAIN half of identifier matching.
 *
 * The discipline lives in `@fde/grounding` (`createIdentifierScheme`): forgive
 * how an id is spelled, never forgive which id it is, and compare exactly
 * rather than by prefix. Everything below is the part that is specific to this
 * customer: the shape, and how it is printed.
 *
 * THE SCHEME. `PP 00 01 06 24`:
 *
 *   PP     line prefix — personal auto
 *   00 01  form number, as two pairs
 *   06 24  edition, MM YY
 *
 * THE EDITION IS PART OF THE ID, and that is why exact matching matters here.
 * `PP 00 01 01 15`, `PP 00 01 09 18` and `PP 00 01 06 24` are the same form
 * three editions apart, paying $30, $35 and $40 a day. Matching on `PP 00 01`
 * merges all three.
 *
 * Guidance documents — bulletins, circulars, determinations — deliberately do
 * NOT match. They are not forms and have no form id; asking "which form is
 * this" of a bulletin has the answer "none", and that is different from "this
 * document does not exist". See `eval/checks.ts` for why those had to become
 * two questions.
 */
import { createIdentifierScheme } from '@fde/grounding';
import { DOMAIN } from './domain';

const FORM_ID = createIdentifierScheme({
  pattern: DOMAIN.documentIdPattern,
  /** "PP00010624" -> "PP 00 01 06 24". Null when it is not a form id at all. */
  canonical: (n) => {
    const m = /^PP(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(n);
    return m ? `PP ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : null;
  },
});

/** The form id in a heading, canonically spelled, or '' when it names none. */
export const formIdOf = (heading: string | undefined): string => FORM_ID.extract(heading);

/** Exact after normalisation. Never a prefix — see the header. */
export const matchesForm = (heading: string | undefined, wanted: string): boolean =>
  FORM_ID.matches(heading, wanted);

/** Spelling-insensitive key. Two different keys are two different forms. */
export const normalizeFormId = (id: string): string => FORM_ID.normalize(id);
