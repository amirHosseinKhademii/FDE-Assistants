/**
 * What each file in Calder Safety's estate holds, in a sentence.
 *
 * THREE FILES, NOT THREE DATABASES, and that is the first thing a reader
 * should take from this page. Meridian Pharma's estate is six systems a company
 * runs; Vantis Steering's is four plus an answer key we built. This is three
 * tab-delimited downloads from `static.nhtsa.gov` with no header row — closer
 * to Vantis' corpus of documents than to anybody's database. Nothing here is
 * queried, joined or written to; it is read off disk.
 *
 * HAND-WRITTEN, AND IT HAS TO BE. `estate.generated.ts` knows `CMPL_SLICE` has
 * 51 columns and 100,980 rows. It cannot know that 30,786 of those rows are the
 * same complaints said again — one row per component — or that the column
 * holding the whole engagement is `CDESCR`, which the page will not print.
 * Structure is measurable and meaning is not, so one is generated and the other
 * is written.
 *
 * THE TYPE IS THE CHECK. `Record<EstateTableKey, string>` is exhaustive over
 * the generated union, so a source added without a sentence fails `pnpm
 * typecheck`, and a sentence for a source that has gone fails too. The corpus
 * is being worked on in another session; this is what stops the page describing
 * an estate that has moved on.
 */
import type { EstateTableKey } from './estate.generated';

export const NOTES: Record<EstateTableKey, string> = {
  'complaints.CMPL_SLICE':
    'One row per complaint per component, which is why 100,980 rows are 70,194 filings. The narrative is `CDESCR` and it is the corpus; everything around it is loose — 23% shouted in capitals, 472 spellings of the component field, and half the columns empty in most rows.',

  'recalls.RCL_SLICE':
    'One row per campaign per make, model and year, so 44,791 rows are 3,026 campaigns. Three prose blocks carry the weight — what the defect is, what it could do, and what the dealer will fit — and `INFLUENCED_BY` records whether the manufacturer volunteered or was pushed.',

  'investigations.INV_SLICE':
    'The regulator writing down what it thought before a recall existed, and where one followed, the campaign number that links the two. 114 of them, surveyed and not ingested.',
};
