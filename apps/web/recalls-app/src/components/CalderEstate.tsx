/**
 * Calder Safety's estate, opened.
 *
 * ── THE THIRD CALLER, AND THE FIRST THAT IS NOT DATABASES ──────────────────
 *
 * `EstateExplorer` was written for Meridian Pharma's six systems and taken by
 * Vantis Steering's four without a fork. This is three tab-delimited files, so
 * it takes two props neither of the others needed — `figures`, because "3
 * databases · 3 tables" says three twice, and `samplesNote`, because this is
 * the first estate that publishes most of its columns and suppresses a named
 * few. Both are optional and both default to what pharma and Vantis already
 * get: nothing about their pages changed.
 *
 * ── THE NUMBER IN THE MIDDLE IS THE ONE THAT MATTERS ───────────────────────
 *
 * NHTSA writes ONE ROW PER COMPONENT, so one complaint about a door, a latch
 * and a handle is three rows and one filing; and one recall campaign fans out
 * across every make, model and year it covers. 147,402 rows are 73,334
 * records. An estate page that printed the row count would overstate this
 * estate by 44% — and it would do it in the largest numeral on the page.
 *
 * So the figures print both, records first. The gap is not a footnote about
 * data hygiene: which of the two a count means is the first modelling decision
 * this engagement has to take, and it is still open (`docs/recalls/CORPUS.md`
 * §7, question 2).
 *
 * ── INVESTIGATIONS SITS BEHIND THE RULE ────────────────────────────────────
 *
 * It is in the estate — surveyed, counted, its columns listed — and it is not
 * in the product. Drawing it beside the other two would claim a source we have
 * not read; leaving it out would hide one we chose not to. The rule is the
 * component's existing way of saying "in the estate, not in the thing", and it
 * is the honest place for it.
 */
import { Mono } from '@fde/uikit';
import { EstateExplorer, PagesGlyph } from '@veresk/surface';
import type { EstateFace } from '@veresk/surface';
import { ESTATE, MEASURED_AT, MEASURED_BY, TOTAL_ROWS, TOTAL_UNITS } from '../lib/estate.generated';
import { NOTES } from '../lib/estate-notes';

/** Files, not databases — so pages, not cylinders. */
const figure = () => <PagesGlyph />;

/**
 * THE TWO THAT ARE READ. Their `asks` is what the source is FOR, in the words
 * of whoever wrote the record: a person describing what happened to them, and
 * a manufacturer stating what it found and what it will fit.
 */
const FACES: EstateFace[] = [
  {
    db: 'complaints',
    name: 'complaints',
    asks: 'what did a person say happened to their car?',
    hue: 'var(--color-cal-1)',
  },
  {
    db: 'recalls',
    name: 'recalls',
    asks: 'what did the manufacturer admit, and what will they fit?',
    hue: 'var(--color-cal-2)',
  },
];

/** Surveyed, not ingested. No hue, because it is not one of the two we read. */
const ASIDE: EstateFace = {
  db: 'investigations',
  name: 'investigations',
  asks: 'what did the regulator go and ask about?',
};

const IN_SCOPE = ESTATE.filter((s) => s.db !== 'investigations');
const IN_SCOPE_ROWS = IN_SCOPE.reduce((n, s) => n + s.tables.reduce((m, t) => m + t.rows, 0), 0);

export function CalderEstate() {
  return (
    <EstateExplorer
      estate={ESTATE}
      measuredAt={MEASURED_AT}
      measuredBy={MEASURED_BY}
      totalRows={IN_SCOPE_ROWS}
      figures={[
        { value: 3, label: 'files' },
        { value: TOTAL_UNITS.toLocaleString('en-GB'), label: 'records' },
        { value: TOTAL_ROWS.toLocaleString('en-GB'), label: 'rows' },
      ]}
      faces={FACES}
      aside={ASIDE}
      notes={NOTES}
      figure={figure}
      samplesNote="One table per file · every column the dictionary names, with a real value — except where the value is a person's own words, locates them, or names a dealer"
      heading="Nobody wrote this corpus for us."
      intro={
        <>
          Model years 2019 and 2020, every make and model, nationwide — chosen
          because those vehicles have had six years for recalls to be issued{' '}
          <em>and for the remedies to be tested</em>, which is the question
          Calder is asking. The records are not rows:{' '}
          <Mono>147,402</Mono> rows are <Mono>73,334</Mono> records, because
          NHTSA files one row per component and one recall covers many models.
          Open one to see the shape of what has to be read.
        </>
      }
      asideNote={
        <>
          Investigations are surveyed and <span className="text-ui-dim">not ingested</span>. They
          are the richest material in the estate for “the regulator disagreed with the
          manufacturer”, and they are out of scope for the first version — named here rather than
          quietly omitted, because an estate page that showed only what we read would be describing
          our progress and calling it the data.
        </>
      }
    />
  );
}
