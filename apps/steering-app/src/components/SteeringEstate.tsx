/**
 * Vantis Steering's estate, handed to the same explorer as Meridian Pharma's.
 *
 * THE SECOND CALLER, AND THAT IS THE POINT. `EstateExplorer` was written for
 * one customer, and this is the second one. What the generalisation actually
 * cost is worth stating precisely rather than flatteringly, because it is the
 * only measurement of whether the split was drawn in the right place: the
 * component gained NINE PROPS AND ONE STRUCTURAL TYPE — `faces`, `notes`,
 * `figure`, `heading`, `intro`, `aside`, `asideNote`, `asideCard`,
 * `showSamples`, and `EstateLike` so that either generator's output satisfies
 * it. What was reused untouched is everything below that line: the tiles, the
 * dialog and its origin animation, the cascade, the field lists and the
 * count-up ramp.
 *
 * It then moved again, into `@veresk/surface`, when this page became its own
 * deployment — the same component, now imported by two apps instead of two
 * routes.
 *
 * THE FIFTH THING IS NOT A DATABASE AND GETS A CARD RATHER THAN A TILE. 1,069
 * files sit under `docs/steering/corpus/` — specifications, trace matrices,
 * timesheets, closure reports, and eight source repositories. Drawing it as a
 * fifth openable database would be the most misleading kind of tidiness: the
 * fact that a component ships at a given safety level is a sentence in the
 * third paragraph of an assessment, not a column, and finding it is reading
 * comprehension rather than a query. So it appears, behind the rule, and it
 * does not open — because there is nothing tabular behind it to open.
 *
 * WHAT THE FOUR TILES MEAN CHANGED ON 2026-09-13, AND THE COPY HAD TO FOLLOW.
 * `docs/steering/PLAN.md` retracted its own central claim: the databases were
 * never produced from the corpus, they were generated ALONGSIDE it from the
 * same constants in the same run. Nothing has ever read a file and written a
 * row. So they are not "the estate the product queries" — they are the ANSWER
 * KEY, the known-correct set that our own sorting will be graded against, and
 * `docs/steering/SORTING.md` is the plan for closing that gap.
 *
 * The tiles stay openable and every table and sample value stays on show,
 * because all of it is still true. Only what it is EVIDENCE OF changed, and a
 * page that left the old sentence up while the plan above it said otherwise
 * would be the exact thing this portfolio argues against.
 *
 * `vst_derived` IS DRAWN NOW, AND WAS NOT A FEW HOURS AGO. It was left off while it
 * was a constant in `connections.ts` with no DDL, no scripts and no tables: the
 * generator can only measure databases that exist, and a tile reading
 * "declared, not built" on a page whose whole argument is measured figures is
 * the one decoration it cannot afford. `derived:create`, `derived:migrate` and
 * `derived:parse` have since run, so it is a real database with 12,978 real rows and
 * it appears on the same terms as everything else here — counted, not asserted.
 *
 * It sits behind the rule rather than in the row of four, because the rule
 * separates what the customer runs from what this engagement produced.
 */
import { CylinderGlyph, EstateExplorer } from '@veresk/surface';
import { ESTATE, MEASURED_AT, MEASURED_BY } from '../lib/estate.generated';
import { NOTES } from '../lib/estate-notes';
import { STEERING_FACES } from '../lib/systems';

/** All four are systems of record, so all four are cylinders. */
const figure = () => <CylinderGlyph />;

/**
 * THE FOUR, AND THE FIGURES COUNT ONLY THE FOUR.
 *
 * `ESTATE` holds five databases, because the generator measures `vst_derived` too —
 * and it should, that file is the estate as it actually is. What this SECTION
 * is about is the customer's four, so it filters, and the row count is derived
 * from the same filtered list rather than taken from `TOTAL_ROWS`.
 *
 * That was wrong for exactly one render, and it is the classic shape of the
 * mistake: four tiles drawn under a heading that said "5 databases", because
 * the figures came from one source and the tiles from another. Anything a
 * reader can count on the screen has to be computed from the thing they are
 * counting.
 */
const FOUR = ESTATE.filter((s) => s.isSystemOfRecord);
const FOUR_ROWS = FOUR.reduce((n, s) => n + s.tables.reduce((m, t) => m + t.rows, 0), 0);

export function SteeringEstate() {
  return (
    <EstateExplorer
      estate={FOUR}
      measuredAt={MEASURED_AT}
      measuredBy={MEASURED_BY}
      totalRows={FOUR_ROWS}
      faces={STEERING_FACES}
      notes={NOTES}
      figure={figure}
      heading="And the answer key we mark ourselves against."
      intro="This is not what the product reads. These four are what a bid answer eventually has to arrive in — requirements in one tool, hardware in another, customers in a third, and what past changes cost in a fourth, with nothing joining them — filled in by hand from the same documents. Holding the right answer is what lets us score our own reading instead of admiring it. Open one to see the shape the reading is aiming at."
      asideNote={
        <>
          They stand for the customer's systems of record — read, never written, and no query joins
          one to the next. They were generated alongside the documents rather than derived from
          them, which is why they cannot also be the product's source: one command,{' '}
          <span className="font-mono text-ui-dim">derived:grade</span>, opens them and nothing else does.
          No real customer has this, so any check that needs it is a check that cannot ship — which
          is why the four that come first are the ones needing no answer key at all.
        </>
      }
    />
  );
}
