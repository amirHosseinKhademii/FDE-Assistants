/**
 * The derived tables, explained to somebody who has not read any of this.
 *
 * WHY THIS IS SEPARATE FROM `estate-notes.ts`. That file is one sentence per
 * table for a bid engineer skimming a row of tiles — it assumes the reader
 * knows what a charge code is. This is the same tables explained from scratch:
 * what the thing is, where it came from, and what question it makes answerable.
 * They are two different pieces of writing for two different readers, and
 * trying to make one string do both produces a sentence that serves neither.
 *
 * THE COLUMN MEANINGS ARE THE PART THAT WAS MISSING. A dialog that listed
 * `charge_code_raw` and `charge_code_key` beside two identical-looking values
 * told a reader nothing at all — they are not the same thing, and which is
 * which is the entire point of there being two columns. A database name is for
 * the query; a sentence is for the person.
 *
 * WRITTEN BY HAND, AND IT HAS TO BE. The generator knows a column is called
 * `basis` and holds text. It cannot know that the value is how much anybody
 * should trust the number beside it.
 */

export interface PlainTable {
  /** One sentence. What this table IS. */
  is: string;
  /** Where the rows came from, in plain words. */
  from: string;
  /** What became answerable because it exists. */
  lets: string;
  /** Column name → what it means. */
  columns: Record<string, string>;
}

/** Every derived table has these two first, and they are the whole design. */
const PROVENANCE = {
  file_id: 'Which of the customer’s files this row was read out of.',
  line_no: 'Which line of that file. Together with the file, this is what lets anybody go and check the row against the original.',
};

export const PLAIN: Record<string, PlainTable> = {
  timesheet_lines: {
    is: 'Every line of every timesheet we were given, one row each — who worked, in which week, for how many hours, on what.',
    from: '25 quarterly exports from the time-booking system, covering eight years. Three quarters are missing because nobody ever exported them.',
    lets: 'Adding up what a piece of work actually took, instead of asking somebody who was there to remember.',
    columns: {
      ...PROVENANCE,
      line_id: 'Our own numbering, so a row can be referred to.',
      week_ending: 'The Tuesday the week was booked against.',
      employee_raw: 'The name exactly as the export spelled it. Twelve people appear two different ways and both spellings are kept — deciding they are the same person is somebody’s call to make, not ours to make silently.',
      charge_code_raw: 'The code as written in the file. The format changed twice in eight years.',
      charge_code_key: 'The same code in one consistent form, so the old and new formats can be lined up.',
      hours: 'Hours booked on that line.',
      activity: 'The kind of work — hardware, software, validation, and so on.',
      approved: 'Whether the line was signed off. Blank means nobody signed it, which is not the same as somebody refusing, and is stored as unknown rather than as a rejection.',
      note: 'Anything the file said in a comment beside the line, usually the reason it was booked late.',
    },
  },

  document_fields: {
    is: 'The labelled facts from the top of a written report — the reference, the date, who prepared it — pulled out of the prose and put in a table.',
    from: '220 project closure reports. Each one has a tidy block of labels at the top and free writing underneath; this is the tidy block.',
    lets: 'Finding the report for a given piece of work without opening 220 files, and connecting it to the hours booked against it.',
    columns: {
      ...PROVENANCE,
      field: 'What the label means, in one consistent word, so the same thing found in two documents lines up.',
      label_raw: 'The label exactly as that document wrote it. Kept beside the tidied version so a document that words it oddly is still checkable.',
      value: 'What was written after the label.',
    },
  },

  quote_line_items: {
    is: 'Every priced line of every quotation we sent a customer.',
    from: '52 quotations. Each is a written document with a table in the middle of it; the table parses exactly, the assumptions written underneath do not.',
    lets: 'Seeing what was actually charged for a change, and of what kind, the last time one like it came up.',
    columns: {
      ...PROVENANCE,
      quote_id: 'Which quotation this line belongs to.',
      seq: 'Where the line sat in that quotation.',
      description: 'What was being quoted for, in the quotation’s own words.',
      change_class: 'What sort of change it was — reuse, a modification, or something new. This is the classification the whole bid question turns on.',
      hours: 'Hours quoted for that line.',
    },
  },

  estimate_lines: {
    is: 'Bottom-up estimates: what somebody thought a piece of work would take, before it was done.',
    from: '34 estimate documents, written by named people on dated days.',
    lets: 'Comparing what was expected with what it took — and, more usefully, telling apart an estimate built on real evidence from one built on a guess.',
    columns: {
      ...PROVENANCE,
      program_ref: 'The vehicle programme being estimated for.',
      author: 'Who wrote the estimate.',
      estimated_on: 'When they wrote it.',
      work_package: 'The chunk of work being estimated.',
      discipline: 'Which team the hours were for.',
      hours: 'The estimate itself.',
      basis: 'How they arrived at it — a supplier’s quote, the last programme, engineering judgement, or an outright guess. Sixty-six of the 298 say guess. Nothing in the four databases records this at all, so it exists only because somebody wrote it down in a document.',
      confidence: 'How sure they said they were.',
    },
  },

  rate_card_lines: {
    is: 'What an hour of each kind of engineering costs, for a given year and region.',
    from: '24 rate cards. The rates are in the file; the year and the region are not — they are in a comment above the table, and in the filename.',
    lets: 'Turning hours into money, at the rate that actually applied at the time rather than today’s.',
    columns: {
      ...PROVENANCE,
      year: 'The year these rates applied to. Read from a comment line and from the filename, and the two are required to agree — a reader that took only the numbers would have 168 rates it could not tell apart, and would price eight years of work off whichever card it happened to open.',
      region: 'Where they applied. Same story as the year.',
      discipline: 'The kind of engineering.',
      rate_eur_per_hour: 'The cost of one hour, fully loaded. The cards say not to add a multiplier on top.',
    },
  },

  source_files: {
    is: 'One row per file we have read, so the reading itself can be audited.',
    from: 'Every file the parse has opened — 355 of the customer’s 1,069 so far.',
    lets: 'Answering “did you actually read that?”, and skipping files that have not changed the next time this runs.',
    columns: {
      file_id: 'The file, by path.',
      kind: 'What sort of document it is.',
      sha256: 'A fingerprint of the contents. If the file changes by one character this changes, which is how an unchanged file can be safely skipped and a changed one cannot slip through.',
      bytes: 'How big it is.',
      lines: 'How many lines it has.',
      ingested_at: 'When we last read it.',
    },
  },
};
