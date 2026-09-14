/**
 * Pipeline 3 — the comparables key, read out of English.
 *
 * ── WHY THIS STEP EXISTS AT ALL ───────────────────────────────────────────
 *
 * `walk-cost` prices a new requirement by finding comparable past work.
 * "Comparable" means seven things: change class, element kind, ASIL, reuse
 * class, interfaces touched, safety-case impact, tooling. NOT ONE OF THEM IS A
 * FIELD IN ANY DOCUMENT. They exist as a paragraph:
 *
 *     The existing hardware was modified. The work was on the gearbox. The
 *     existing safety case remained valid and was not reopened.
 *
 * Everything before this step was deterministic and could only fail loudly.
 * This step can be wrong quietly, which is why it is last, why every value
 * carries the sentence it came from, and why the sentence is verified.
 *
 * ── THE INSTRUCTION THAT MATTERS MORE THAN THE SCHEMA ─────────────────────
 *
 * Refuse rather than infer. Silence is not evidence.
 *
 * That sounds like boilerplate until you look at what these documents actually
 * contain. `reuse_class` is stated in NONE of the 220 closure reports. `asil`
 * appears in about 20. `tooling_required` is written down when it is true and
 * omitted when it is false — so a model that reads the absence as `false` will
 * score well here and be wrong in principle, and would be wrong in fact at any
 * customer whose writers were less consistent.
 *
 * So `null` is a first-class answer and the prompt says so three times. The
 * measurement that matters is not accuracy; it is whether the refusals land on
 * the fields the documents genuinely do not carry.
 */

/**
 * ── `reuse_class` WAS HERE AND WAS REMOVED ON 2026-09-13 ──────────────────
 *
 * Six fields, not seven. Across 220 documents the seventh was answered 83
 * times at 36% accuracy — three possible values, so chance is 33% — because it
 * is stated in NONE of the 220 closure reports. It was not being read; it was
 * being inferred from `change_class` and dressed in that field's sentence.
 *
 * The prompt already forbade exactly this, by name, and it made no difference:
 * given identical instructions and documents of the same shape, it refused 137
 * times and guessed 83. Rewording is money spent to move a number that is
 * already at chance.
 *
 * SO THE FIELD IS NOT OFFERED. A pipeline that asks for something the documents
 * do not contain will get an answer, and that answer is noise with a citation
 * attached — the most expensive kind of wrong, because it looks like the others.
 *
 * Nothing is lost downstream: no walk filters on it. What it cost to learn this
 * is one extraction run, and what it buys is the sentence a customer can act
 * on — "your closure reports do not record reuse, so nobody can tell you what
 * carryover work costs" — which is worth more than a column of guesses.
 *
 * `REUSE_CLASS` below is kept deliberately, unused, as the record of what was
 * asked for and withdrawn.
 */
export const FIELDS = [
  'change_class', 'element_kind', 'asil',
  'interfaces_touched', 'safety_case_impact', 'tooling_required',
] as const;
export type Field = (typeof FIELDS)[number];

const CHANGE_CLASS = ['reuse_as_is', 'recalibrate', 'validation_only', 'integration_only',
  'modify_function', 'safety_case_only', 'modify_hardware', 'new_function', 'new_hardware'];
const ELEMENT_KIND = ['sensor', 'ecu', 'motor', 'gearbox', 'mechanical', 'software_domain'];
const ASIL = ['QM', 'A', 'B', 'C', 'D'];
/** No longer requested — see the note on FIELDS. Kept as the record of the attempt. */
const REUSE_CLASS = ['carryover', 'modified', 'new'];
void REUSE_CLASS;

/** `value` + the sentence it came from, for one field. Both nullable, together. */
function pair(description: string, values?: string[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['value', 'evidence'],
    properties: {
      value: values
        ? { type: ['string', 'null'], enum: [...values, null], description }
        : { type: ['string', 'null'], description },
      evidence: {
        type: ['string', 'null'],
        description:
          'The exact sentence from the document that states this, copied character for character. ' +
          'Null if and only if value is null. Do not paraphrase, do not join two sentences, ' +
          'do not add or remove punctuation — this string is searched for in the file and the ' +
          'answer is discarded if it is not found.',
      },
    },
  };
}

/**
 * ── A HAND-WRITTEN JSON SCHEMA, WHERE EVERYTHING ELSE HERE USES ZOD ──────
 *
 * Both agent tools declare their parameters in Zod, and the answer contract in
 * `schema/assessment-schema.ts` uses Zod plus `@fde/schema`'s coherence rules.
 * This is the one place that hand-writes the JSON, and the divergence is
 * recorded rather than left to be found.
 *
 * WHY IT IS DIFFERENT: this is not an answer contract. It is field extraction
 * called straight through `chat.completions.create` with
 * `response_format: json_schema`, and it has NO coherence rules — there is no
 * "structurally valid and still wrong" state for six independent fields. Zod
 * here would add a conversion step and buy nothing.
 *
 * WHEN THAT STOPS BEING TRUE: the moment one extracted field has to agree with
 * another — a refusal that must carry no value, an ASIL that must match a
 * decomposition — this becomes an answer contract wearing a schema's clothes,
 * and it should move to Zod with the rest. It is one field away from that
 * today, which is close enough to say so.
 */
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [...FIELDS],
  properties: {
    change_class: pair('What kind of work this was.', CHANGE_CLASS),
    element_kind: pair('What part of the system the work was on.', ELEMENT_KIND),
    asil: pair('The ASIL the report names for this work. Usually not stated.', ASIL),
    interfaces_touched: pair('How many interfaces were affected, as a number written as a string.'),
    safety_case_impact: pair('Whether the safety argument had to be reworked. "true" or "false".',
      ['true', 'false']),
    tooling_required: pair('Whether tooling was modified or re-qualified. "true" or "false".',
      ['true', 'false']),
  },
} as const;

export const SYSTEM_PROMPT = `You read project closure reports from a steering-system supplier and
extract the classification fields listed in the schema. You do not summarise and
you do not advise.

THE RULE THAT OVERRIDES EVERYTHING ELSE: if the document does not state a field,
return null for it. Not a guess, not the most likely value, not a value inferred
from the rest of the report. Null.

Three specific traps, because they are the ones that get this wrong:

1. SILENCE IS NOT "FALSE". If the report never mentions tooling, tooling_required
   is null — NOT false. The same for interfaces_touched: no mention means null,
   not zero. A report that says nothing has told you nothing.

2. DO NOT INFER ONE FIELD FROM ANOTHER. "A new component was designed" tells you
   the change class. It tells you nothing about the safety level, the number of
   interfaces, or anything else, however obvious the connection seems. Each
   field is answered from a sentence about THAT field or it is answered null.

3. THE EVIDENCE MUST BE REAL. Copy the sentence exactly as it appears, including
   its wording and punctuation. It is searched for in the source file. A value
   whose evidence is not found in the file is thrown away, and a paraphrase will
   not be found.

Refusing correctly is the result we want. A null with no evidence is a good
answer. A confident value with a sentence that was not in the document is the
worst outcome available to you.`;

export function userPrompt(text: string): string {
  return `Extract the fields from the closure report below.\n\n---\n${text}\n---`;
}

/**
 * Is the quoted sentence actually in the file?
 *
 * ── WHAT IS NORMALISED, AND THE ONE THAT WAS LEARNED THE HARD WAY ─────────
 *
 * WHITESPACE. The documents are hard-wrapped at 68 columns, so a sentence the
 * model read as one line is three lines in the file with newlines and
 * indentation inside it. Comparing raw would reject every true quote, and the
 * check would look like a hallucination detector while actually measuring line
 * width.
 *
 * PUNCTUATION AND CONTROL CHARACTERS, added after the first real run. The model
 * quoted `modify function \x14 Ulric.` where the file says `modify function —
 * Ulric.` — it replaced an em dash with a device-control byte. Another answer in
 * the same run arrived carrying a NUL. The transport mangles non-ASCII
 * punctuation, and that is not the thing this check exists to catch.
 *
 * THE DISTINCTION MATTERS MORE THAN THE FIX. A fabricated sentence and a
 * mangled em dash are both "not found", and treating them the same would have
 * had us reading a character-encoding bug as evidence that the model invents
 * quotations. So near-matches are ACCEPTED AND FLAGGED — `exact: false` — and
 * counted separately, rather than being quietly folded into either bucket.
 *
 * Case is still NOT normalised. Getting a word's case wrong means it was
 * retyped rather than copied, and retyped is the beginning of invented.
 */
export interface EvidenceHit { line: number; exact: boolean }

const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Dashes, quotes and stray control bytes to one ASCII form each. */
const canon = (s: string): string =>
  flat(s)
    .replace(/[\u2010-\u2015\u2212]/g, '-')      // hyphens, en/em dashes, minus
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u0000-\u001F\u007F]/g, '-')      // control bytes the transport left behind
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Letters only. THE LAST RESORT, and the narrowest claim of the three.
 *
 * Ten rejections in 1,540 fields were all the same sentence — the title line,
 * `new function — Solen.` — with the em dash arriving as a run of control
 * bytes, sometimes with digits mixed in: `new function \u000212 Kite.`,
 * `safety case only \t6 Kestra.`. Punctuation normalisation cannot repair that,
 * because what came back is not punctuation any more.
 *
 * WHAT THIS STILL CATCHES, WHICH IS THE ONLY QUESTION THAT MATTERS: every word.
 * A fabricated sentence differs in its words, and words are exactly what
 * survives here. What it gives up is the ability to notice a changed NUMBER
 * inside a quotation — acceptable because the number a fact asserts is carried
 * in `value`, which is checked against nothing and always was.
 *
 * Matches at this tier are `exact: false` and counted, so the corruption stays
 * visible rather than being absorbed. A matcher tuned until nothing ever fails
 * is a matcher that detects nothing; this one is tuned until the only failures
 * left would be real.
 */
const letters = (s: string): string =>
  flat(s).replace(/[^\p{L}\s]+/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

export function findEvidence(fileText: string, evidence: string): EvidenceHit | null {
  if (!flat(evidence)) return null;
  const lines = fileText.split('\n');

  // Three passes, strictest first, so a sentence that matches exactly is never
  // reported as a near-match just because a looser comparison would also pass.
  for (const [tier, norm] of [[0, flat], [1, canon], [2, letters]] as const) {
    const needle = norm(evidence);
    if (!needle) continue;

    // ── THE WINDOW MUST FIT THE QUOTE, NOT THE OTHER WAY ROUND ────────────
    //
    // It was a fixed six lines, and an eval run failed on a citation that was
    // perfectly correct: the model quoted a six-row markdown table from
    // `architecture-PRG-KST-K2.md`, cited line 9, and line 9 is exactly where
    // that table starts. Six data lines plus the heading trail the chunker
    // prefixes does not fit in a six-line window, so the search reported
    // **"quote not in the file"** about text that is in the file.
    //
    // The severity classifier then filed it as `false_answer` — the bucket
    // reserved for a model fabricating evidence. A check that ACCUSES is the
    // one place a false negative is least affordable, and this is the fifth
    // time in this repo that a red light has been the checker rather than the
    // thing checked.
    //
    // A table is also a legitimate thing to quote whole: a single row without
    // its header row is exactly what the chunker works to prevent, so "quote
    // less" would be the wrong instruction.
    //
    // So the window is sized from the quote — as many lines as it has, plus two
    // for the wrapping this corpus does at 68 columns — with six as a floor for
    // a one-line quote that spans a wrap.
    const needleLines = evidence.split('\n').length;
    const maxWindow = Math.max(6, needleLines + 2);

    // ── WINDOW SIZE OUTSIDE, START POSITION INSIDE ─────────────────────────
    //
    // The loops used to nest the other way: every window size at line 1, then
    // every size at line 2. A one-line sentence on line 9 was therefore first
    // matched by the SIX-LINE window beginning at line 4, and reported as being
    // on line 4.
    //
    // Nothing failed. The file was right, the sentence was right, and the line
    // number was quietly up to five out — in the one column whose entire job is
    // to let somebody open the document and see the sentence for themselves.
    // Provenance that is approximately right is the kind of wrong that survives
    // review, because it looks exactly like provenance that is right.
    //
    // Smallest window first, then earliest start, so the answer is the tightest
    // span of lines that actually contains the quote.
    for (let n = 1; n <= maxWindow; n++) {
      for (let i = 0; i + n <= lines.length; i++) {
        if (norm(lines.slice(i, i + n).join(' ')).includes(needle)) {
          return { line: i + 1, exact: tier === 0 };
        }
      }
    }
  }
  return null;
}
