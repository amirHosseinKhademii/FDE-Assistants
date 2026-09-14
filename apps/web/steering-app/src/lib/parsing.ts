/**
 * The reading that needs no model — what went in, what came out.
 *
 * IT IS THE BORING ONE AND IT IS MOST OF THE WORK. 355 of the customer's files
 * are spreadsheets exported to text, and plain code turns them into 12,978
 * rows in four seconds for nothing. A page that spent all its space on the
 * model would give a reader the impression that the model did most of it. The
 * model did 1,320 rows out of 12,978.
 *
 * BOTH EXAMPLES ARE REAL FILES, and both are here because of what they catch:
 * a timesheet whose approval column is blank in a way that means something, and
 * a rate card whose most important two facts are not in the data at all.
 */

export interface Before {
  file: string;
  caption: string;
  text: string;
  /** What a reader should notice before they see the output. */
  notice: string;
}

export interface After {
  caption: string;
  fields: Array<{ name: string; value: string; note?: string }>;
}

/** A labelled block under a before/after card. */
export interface Note {
  label: string;
  text: string;
}

export const PARSE_EXAMPLES: Array<{ title: string; before: Before; after: After }> = [
  {
    title: 'A timesheet',
    before: {
      file: 'pmo/timesheets/2019-Q4.csv',
      caption: 'what arrives',
      text: `# Vantis Steering Systems — timesheet export
# period: 2019 Q4   exported: 2019-12-05
# charge code format changed in 2022 and again in 2024.
# an empty 'approved' column means the line was never
# signed off, not that it was rejected.
week_ending,employee,charge_code,hours,activity,approved
2019-10-01,P. Strand,1158,15.0,hardware,Y
2019-10-15,"Lindqvist, Maja",1158,7.0,hardware,`,
      notice:
        'Four lines of comment before the header, a name with a comma inside it, and a last column that is empty rather than “N”.',
    },
    after: {
      caption: 'what is stored, one row per line',
      fields: [
        { name: 'week ending', value: '2019-10-01' },
        { name: 'who', value: 'P. Strand', note: 'exactly as written — not tidied' },
        { name: 'charge code', value: '1158' },
        { name: 'hours', value: '15.0' },
        { name: 'activity', value: 'hardware' },
        { name: 'signed off', value: 'yes' },
        { name: 'read from', value: '2019-Q4.csv line 7' },
      ],
    },
  },
  {
    title: 'A rate card',
    before: {
      file: 'pmo/rate-cards/2019-CN.csv',
      caption: 'what arrives',
      text: `# Vantis Steering Systems — approved engineering rates
# year: 2019   region: CN
# approved by: E. Palmer (finance)   date: 2018-11-04
# rates are fully loaded and include overhead.
discipline,rate_eur_per_hour
systems,59.52
hardware,57.80`,
      notice:
        'The two facts that decide whether a rate can be used at all — which year, which region — are not in the table. They are in a comment above it, and in the filename.',
    },
    after: {
      caption: 'what is stored',
      fields: [
        { name: 'year', value: '2019', note: 'from the comment AND the filename — both are read and must agree' },
        { name: 'region', value: 'CN', note: 'same' },
        { name: 'discipline', value: 'systems' },
        { name: 'rate', value: '59.52 EUR/h' },
        { name: 'read from', value: '2019-CN.csv line 6' },
      ],
    },
  },
];

/**
 * HOW THE PARSING IS ACTUALLY DONE — `docs/steering/UI-COPY.md`, panel 1.
 *
 * THIS REPLACED A CLOSING SENTENCE PER CARD. Those said what the example showed
 * and stopped; a customer's next question is always *how*, and answering it
 * under the two examples is better than answering it twice inside them.
 */
export const PARSE_NOTES: Note[] = [
  {
    label: 'how',
    text: 'A reader written by hand, not an off-the-shelf one — these files have comments above the header, names with commas in them, and three charge-code formats.',
  },
  {
    label: 'what we never do',
    text: 'Tidy. Two spellings of a name stay two spellings; deciding they are one person is your call, not a file reader’s.',
  },
  {
    label: 'why you can trust it',
    text: 'A failure is an error, never a silent gap. Every row carries its file and line, and the totals are checked against your own records.',
  },
];

/* `PARSE_RESULT` LIVED HERE and went with the figure row it fed — "12,978 rows"
   is already on the stage card above the section. */

/**
 * The searching, now that it is built — `docs/steering/UI-COPY.md`, SEARCH.
 *
 * IT WAS THE ONE MARKED "not built" UNTIL 2026-09-13. 702 documents became
 * 2,827 passages in under a minute for pennies, and the interesting part is
 * where the cuts are made rather than that they were made at all.
 */
export const SEARCH_EXAMPLE = {
  title: 'A quotation',
  before: {
    file: 'pmo/quotes/QUO-0004.md',
    caption: 'what arrives',
    text: `## Post-award assumptions

Rates held to 2026-07-18. Tooling excluded unless
listed. Any change to the rack-force target after
award is re-quoted.`,
    notice:
      'A heading, then a paragraph that only means anything underneath it. Cut on length instead of structure and “re-quoted” arrives with nothing saying what.',
  },
  after: {
    caption: 'what is stored, one row per passage',
    fields: [
      { name: 'passage', value: 'Quotation QUO-0004 > Post-award assumptions', note: 'the heading trail is kept with the text' },
      { name: 'found by', value: 'meaning and exact words', note: 'a part number has to match literally' },
      { name: 'read from', value: 'QUO-0004.md, with its position' },
    ],
  },
};

export const SEARCH_NOTES: Note[] = [
  {
    label: 'how',
    text: 'Cut on headings, never on a fixed length. A fixed window splits a sentence in half and separates a number from the heading that explains it.',
  },
  {
    label: 'what each piece keeps',
    text: 'Its heading trail, so a fragment is still citable — and a table is never split from its header row.',
  },
  {
    label: 'how a question finds it',
    text: 'By meaning and by exact words at once. A part number has to match literally.',
  },
];

export const SEARCH_FIGURES = [
  { figure: '702', label: 'documents' },
  { figure: '2,827', label: 'passages' },
  { figure: 'under a minute', label: 'to build the whole index' },
  { figure: 'pennies', label: 'one-off' },
];
