/**
 * How 1,069 files become rows, and what the files do to make that hard.
 *
 * EVERY NUMBER HERE IS PRINTED BY A COMMAND, AND THE COMMAND IS ON THE PAGE.
 * Two of them, in fact, because the two halves are measured by different
 * things and pretending one source covers both would be the first small lie:
 *
 *   pnpm steering:corpus-check     walks docs/steering/corpus/ and asserts the
 *                                  traps are still in the FILES
 *   pnpm steering:derived-reconcile     reads what the parse produced and compares
 *                                  it against the answer key
 *
 * NOTHING IS TYPED IN FROM MEMORY. The last time a figure on this page was, it
 * said the corpus held 54 files when it held 1,069 — a number written when the
 * corpus was a sketch and never revisited. Hard-coding a measurement is fine;
 * hard-coding it without naming the command that reproduces it is not.
 *
 * WHY THE STAGES ARE NUMBERED, when numbered markers are avoided everywhere
 * else on this site: this genuinely is a sequence, and the order is the whole
 * argument. Parsing is free and exact, so it goes first and becomes the harness
 * the two fallible stages are checked against. Doing it in any other order
 * means the first thing you build has nothing to be wrong against.
 */

export interface Stage {
  id: string;
  /** Its own colour, so a stage and the dialog it opens are the same object. */
  tone: string;
  name: string;
  /** What kind of material this stage is for. */
  material: string;
  volume: string;
  mechanism: string;
  /** The honest answer to "can this be wrong?" — the reason for the order. */
  wrong: string;
  built: boolean;
  /** What it produced, where it is built. */
  result?: string;

  /**
   * THE SAME THING SAID TO SOMEBODY WHO HAS NOT READ ANY OF THIS.
   *
   * The card above is written for a bid engineer skimming. This is written for
   * whoever they forward the link to — no "chunk", no "embed", no "structured
   * output", and the idea before the mechanism every time. It is not a summary
   * of the card; it is the card's content explained, which is a different and
   * longer piece of writing, and it is why this opens rather than expands in
   * place.
   */
  plainly: {
    /** What this step actually does, in kitchen English. */
    does: string[];
    /** Why it sits where it does in the order. */
    why: string;
    /** One real example, before and after. */
    example?: { before: string; after: string; caption: string };
    /** The thing about it that is harder than it sounds. */
    catch_: string;
  };
}

export const STAGES: Stage[] = [
  {
    id: 'parse',
    tone: 'var(--color-src-1)',
    name: 'Parse',
    material: 'things that already have columns',
    volume: '355 files — timesheets, rate cards, estimates, quotations, closure reports',
    mechanism: 'deterministic code, no model, four seconds, no cost',
    wrong: 'No. A failure here is a bug we fix, which is why it goes first.',
    built: true,
    result: '12,978 rows in vst_derived, every one carrying its file and line number',
    plainly: {
      does: [
        'A timesheet is a spreadsheet. Every line on it already has a date, a person, a number of hours and what they were working on. Nothing has to be interpreted — the information is sitting in columns where somebody put it.',
        'So this step is not clever and is not supposed to be. It opens all 355 files of that kind, copes with the fact that eight years of exports are not written the same way, and puts every line into a table. No model is involved at any point. It runs in about four seconds and costs nothing to run again.',
        'What comes out is 12,978 rows, and every single one remembers which file and which line number it came from.',
      ],
      why: 'Because it cannot be wrong. If a number comes out different from the file, that is a bug in our code and we fix it — there is no judgement involved to disagree with. That makes it the yardstick: the two steps after this one produce things that CAN be wrong, and they are checked against numbers we already know are right.',
      example: {
        before: '2019-10-01,P. Strand,1158,15.0,hardware,Y',
        after: 'week_ending 2019-10-01 · P. Strand · charge code 1158 · 15.0 h · hardware · approved · from pmo/timesheets/2019-Q4.csv line 6',
        caption: 'One line of one spreadsheet, and the row it becomes.',
      },
      catch_:
        'The tedious part is the part that matters. An empty approval column means nobody signed it off, not that somebody refused — store it as "rejected" and you have invented a decision. One person is "P. Strand" in one file and "Strand, Petra" in the next; deciding those are the same human being is a judgement, so this step deliberately does not make it and leaves both spellings standing where somebody can see them.',
    },
  },
  {
    id: 'index',
    tone: 'var(--color-src-4)',
    name: 'Chunk and index',
    material: 'things that are prose',
    volume: '621 markdown documents and 220 C headers and sources',
    mechanism: 'split by section, and by function for code, then embed',
    /* BUILT ON 2026-09-13, AND IT WAS THE LAST OF THE THREE — not because it
       was hardest but because parse and extract between them answered what the
       bid team actually asked. Search is what a question the columns cannot be
       filtered into needs, and that question came second. */
    wrong: 'Only in what it fails to FIND — a wrong answer is not available to it.',
    built: true,
    result: '2,827 passages, each keeping the heading trail it sat under',
    plainly: {
      does: [
        'Most of what this customer has is writing, not tables. A note explaining why a part was designed the way it was. A review comment. A paragraph in a safety assessment. None of that fits in a column, and forcing it into one would throw away the reason it was written.',
        'So instead of columns, this step cuts each document into pieces at its natural seams — a section of prose, one function of code — and stores every piece in a way that lets it be found by what it MEANS rather than by the exact words in it. Somebody asks how the steering feel is tuned and gets the paragraph that discusses it, even if that paragraph never uses the word "tuned".',
        'Nothing is rewritten and nothing is summarised. The pieces are the customer\u2019s own sentences, kept whole, with a pointer back to the file.',
      ],
      why: 'It goes second because of how it can fail. It either finds the right passage or it does not — it is not able to hand back a passage that says something the document never said. A gap is much easier to notice than a confident wrong answer, and by this point the parsing above has already produced known-good numbers to sanity-check any of it against.',
      catch_:
        'Where you cut matters more than it sounds. Cut code into fixed-size blocks and a function ends up split down the middle, so the half that gets found has no signature on it and means nothing. Worse, one file in this corpus documents its settings in a comment block ABOVE the function they belong to — cut cleanly on the function boundary and those settings are orphaned from the only thing that gives them context, and they are exactly what anybody would be searching for.',
    },
  },
  {
    id: 'extract',
    tone: 'var(--color-src-6)',
    name: 'Extract',
    material: 'facts sitting inside sentences',
    volume: '220 closure reports — the prose under the head block the parser already took',
    mechanism: 'a model reads one document per request, and must quote the sentence it read',
    wrong: 'Yes. The only stage that can invent, and the only one whose every row is checked back against the file — which is why it is last.',
    built: true,
    result: '1,320 answers, and not one of them quoting a sentence that was not in the file',
    plainly: {
      does: [
        'Some things in these documents are genuinely facts — they are just wearing a sentence. "The damping module is developed to ASIL B" names a component and a safety level as plainly as any spreadsheet would; it simply happens to be written in English, in the third paragraph of an assessment nobody has read since 2021.',
        'This step reads those sentences and writes down the fact inside them as a row: what it is about, what it says, how sure it was, and the exact sentence it came from. That last part is not a nicety — it is what lets somebody disagree with it.',
        'This is the only step where a model decides anything.',
      ],
      why: 'It goes last precisely because it is the only one that can be confidently wrong. A parser that misreads a number produces a number that does not match the file. A model that misreads a sentence produces a fact that looks exactly like a correct one. So it is built after everything else, on top of material that is already known-good, and every row it writes carries its own confidence and its own quotation so a person can check it.',
      example: {
        before: 'The damping module is developed to ASIL B and has been assessed against the 2019 concept.',
        after: 'component: damping module · safety level: ASIL B · confidence: 0.9 · said in safety-assessment.md, section 3',
        caption: 'A fact wearing a sentence, and the row it becomes.',
      },
      catch_:
        'This estate says the same thing in three places and disagrees with itself: the safety assessment says ASIL B in prose, the header says B in a comment, and the build configuration compiles at D. There is exactly one paragraph in 1,069 files that explains why, and it is a deviation note nobody would think to look for. A step that quietly picked one of the three and reported no conflict would be worse than useless — so disagreement is a thing it has to be able to REPORT, not resolve.',
    },
  },
];

/**
 * WHAT THE FILES DO TO MAKE THIS HARD, and all of it is in the corpus on
 * purpose. A generator that produced clean documents would prove nothing: the
 * whole question is whether the reading survives the mess, and a haystack with
 * no needles in it is a demo.
 */
export interface Trap {
  what: string;
  detail: string;
  /** What the parse actually did about it, measured. */
  outcome: string;
}

export const TRAPS: Trap[] = [
  {
    what: 'Three quarters were never exported',
    detail: '2020-Q4, 2021-Q2 and 2026-Q1. Work happened; no file was ever produced.',
    outcome: 'Asserted as gaps, not filled in. A parser that assumed continuous coverage would undercount and report a clean run.',
  },
  {
    what: 'Twelve people are spelled two ways',
    detail: 'P. Strand in one export, Strand, Petra in the next.',
    outcome: 'Both spellings survive the parse. Deciding they are one person is a judgement somebody should be able to see and disagree with.',
  },
  {
    what: 'A rate card does not say which year it is for',
    detail: 'Seven rows of discipline and rate. The year and the region are in a # comment above the header, and in the filename.',
    outcome: 'Both sources are read and required to agree. Reading only the CSV body gives 168 numbers that cannot be told apart, and prices eight years of work off one card.',
  },
  {
    what: '742 lines were never signed off',
    detail: 'An empty approval column, which means nobody signed — not that somebody refused.',
    outcome: 'Stored as unknown. 0 are stored as rejected, because 0 were rejected.',
  },
  {
    what: 'Thirty lines sit on closed charge codes',
    detail: '253.7 hours, journalled late, flagged the way finance flags them — in a comment.',
    outcome: 'Kept, flagged and set aside. Dropping them loses real hours; counting them silently double-books.',
  },
  {
    what: 'The safety level is stated in three places that disagree',
    detail: 'The safety assessment says ASIL B in prose, damping.h says B in a comment, and cfg/build.json compiles at D.',
    outcome: 'Not yet read — this one is prose, so it belongs to the stage that is not built. MISRA deviation D-07 is the only place in 1,069 files that explains why.',
  },
];

/**
 * THE CEILING, WHICH IS THE PART WORTH PAYING FOR.
 *
 * An engagement that only reports what it managed to read is selling the good
 * half of its own result. These three are what the documents CANNOT answer,
 * each one measured rather than suspected, and each one is a thing the customer
 * would otherwise discover in front of their own management.
 */
export const CEILINGS = [
  {
    figure: '293,019 h',
    of: 'of 461,722 booked',
    says: 'belong to work no document names. 220 of 640 efforts have a closure report, so two thirds of the cost history cannot be classified from the files alone. This is the customer’s actual position, not a parser limitation.',
  },
  {
    figure: '0 of 293',
    of: 'quoted lines',
    says: 'can be traced to the requirement they priced — not in the documents and not in the databases. “What did we last charge for a requirement like this one?” has no answer in this estate. It is missing, not lost in extraction.',
  },
  {
    figure: '1 of 1,069',
    of: 'files',
    says: 'names a part number. The hardware estate is simply not in the documents we were given, so no amount of parsing produces it. That needs a part-master export, not a better pipeline.',
  },
];

/** Printed under the figures, so a reader can re-derive rather than trust. */
export const MEASURED_BY = {
  corpus: 'pnpm steering:corpus-check',
  parse: 'pnpm steering:derived-reconcile',
};
