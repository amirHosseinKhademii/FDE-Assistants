/**
 * Meridian Pharma's estate, handed to the shared explorer.
 *
 * EVERYTHING HERE IS A STATEMENT ABOUT THIS CUSTOMER: which seven databases,
 * which of them is ours rather than theirs, which one may not publish its rows,
 * and how to say all that in a sentence. The tiles, the dialog, the cards and
 * the field lists are `EstateExplorer`'s in `@veresk/surface`, shared with the
 * steering deployment; the controls, the dialog mechanics and the field rows
 * under that are `@fde/uikit`'s.
 */
import { ESTATE, MEASURED_AT, MEASURED_BY, TOTAL_ROWS } from '../../lib/estate.generated';
import { NOTES } from '../../lib/estate-notes';
import { KB_FACE, SYSTEM_FACES } from '../../lib/systems';
import { CylinderGlyph, EstateExplorer, PagesGlyph } from '@veresk/surface';
import type { EstateFace } from '@veresk/surface';

/**
 * A cylinder for a system of record, pages for the library. `mrd_kb` is the one
 * without a hue, and drawing it as a seventh cylinder would put it in a set it
 * does not belong to.
 */
const figure = (face: EstateFace) => (face.hue ? <CylinderGlyph /> : <PagesGlyph />);

export function PharmaEstate() {
  return (
    <EstateExplorer
      estate={ESTATE}
      measuredAt={MEASURED_AT}
      measuredBy={MEASURED_BY}
      totalRows={TOTAL_ROWS}
      faces={SYSTEM_FACES}
      aside={KB_FACE}
      notes={NOTES}
      figure={figure}
      /* `ask_history` holds questions real people typed into this site, and
         `documents` holds procedure text. Row counts are a fact about the shape
         of the estate; the contents are not ours to put on a front page. */
      showSamples={(face) => face.db !== KB_FACE.db}
      heading="And this is what is in them."
      intro="Seven databases on four different vendors' systems, in the shape a mid-size manufacturer actually has them. Open one to see its tables, what each holds, and every field with a real value from it."
      asideNote={
        <>
          The six on the left are the customer's systems of record — read, never written, and no
          query joins one to the next. <span className="font-mono text-ui-dim">mrd_kb</span> on the
          right is ours: the written procedures, indexed so they can be searched by meaning.
        </>
      }
    />
  );
}
