/**
 * The BRF figures contract, in Zod.
 *
 * Every figure is a {value, page, quote} triple. A value with no page or no
 * quote is not a figure, and a quote that is not on its page is not evidence.
 * Those two checks are in coherenceErrors(), because Zod cannot read the PDF.
 *
 * THE DESCRIPTIONS BELOW ARE PROMPT GUIDANCE, NOT DOCUMENTATION.
 */
import { z } from 'zod';

const Figure = z.strictObject({
  value: z
    .string()
    .nullable()
    .describe(
      'The figure as written in the report, with its unit, e.g. "1 250 kr/m²" or "3,4 %". ' +
        'Copy digits and separators exactly. Null when the report does not state it.',
    ),
  page: z
    .number()
    .int()
    .nullable()
    .describe(
      'The page number, from the "=== page N ===" marker, where the value is stated. ' +
        'Null when value is null.',
    ),
  quote: z
    .string()
    .nullable()
    .describe(
      'The exact words from that page that state the value, copied verbatim, one line or ' +
        'less. Must appear on the given page. Null when value is null.',
    ),
});

export const BrfFiguresSchema = z.strictObject({
  org_nr: z
    .string()
    .nullable()
    .describe('The organisation number of the BRF, format NNNNNN-NNNN, as the report states it. Null if not stated.'),
  year: z
    .number()
    .int()
    .nullable()
    .describe('The financial year the report covers, e.g. 2023. Null if not stated.'),
  debt_per_sqm: Figure.describe(
    'Debt per square metre, Swedish "belåning per kvm" (total debt divided by area), in kr/m². ' +
      'Take the figure the report states for the year. Do not compute it yourself.',
  ),
  annual_fee_per_sqm: Figure.describe(
    'Annual fee per square metre, Swedish "årsavgift per kvm", in kr/m² per year. ' +
      'Take the figure the report states. Do not compute it yourself.',
  ),
  interest_cost: Figure.describe(
    'Interest costs for the year, Swedish "räntekostnader", in kr. The income-statement line, ' +
      'not a rate in percent.',
  ),
  planned_maintenance: Figure.describe(
    'The maintenance PLAN: "underhållsplan" or "planerat underhåll", meaning the planned future works, ' +
      'the years they are planned for, and the planned amount. Not the cost line for the year ' +
      '("underhållskostnader" in the income statement or a maintenance expense note), which is a different figure. ' +
      'Text or an amount in kr, as the plan states it. Null if the report has no maintenance plan.',
  ),
  auditor_remarks: Figure.describe(
    'The auditor report ("revisionsberättelse"). If it contains any "anmärkning" or a modified opinion ' +
      '(e.g. "med anmärkning", "jag anmärker", "ingen anmärkning" is NOT a remark), give that remark as stated. ' +
      'If the auditor report gives a clean opinion with no remark, value is exactly "no remarks", and page and ' +
      'quote are the sentence of the clean opinion (e.g. "Revisionen har utförts enligt god revisionssed..." or ' +
      '"Vi tillstyrker..."). Null only when the report has no auditor report text at all.',
  ),
});

export type BrfFigures = z.infer<typeof BrfFiguresSchema>;
export type BrfFigure = z.infer<typeof Figure>;
export const FIGURE_KEYS = [
  'debt_per_sqm',
  'annual_fee_per_sqm',
  'interest_cost',
  'planned_maintenance',
  'auditor_remarks',
] as const;

/** Whitespace collapsed, case folded. Used for the quote check only. */
export function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Digits only: spaces, no-break spaces, dots and signs removed. "-1 220 176 kr" becomes "1220176". */
export function digitsOf(text: string): string {
  return text.replace(/[\s\u00a0.\-\u2212+]/g, '').replace(/[^0-9]/g, '');
}

/** Numeric figures are checked by their digits; text figures need a quote long enough to be evidence. */
const NUMERIC_KEYS: ReadonlySet<keyof BrfFigures> = new Set(['debt_per_sqm', 'annual_fee_per_sqm', 'interest_cost']);
export const MIN_TEXT_QUOTE_CHARS = 20;

/**
 * Rules Zod cannot express. Messages are written for the model, since they are
 * handed back on retry, and for the person reading the output.
 *
 * Three checks per stated figure: the quote is on the given page; the value's
 * digits (if it has any) are in the quote; a text figure's quote is at least
 * MIN_TEXT_QUOTE_CHARS long, so a bare label cannot pass as evidence.
 */
export function coherenceErrors(fig: BrfFigures, pages: string[]): string[] {
  const errs: string[] = [];
  for (const key of FIGURE_KEYS) {
    const f = fig[key];
    if (f.value === null) continue;
    if (f.page === null) {
      errs.push(`${key}: value "${f.value}" has no page.`);
      continue;
    }
    if (f.quote === null) {
      errs.push(`${key}: value "${f.value}" on page ${f.page} has no quote.`);
      continue;
    }
    const text = pages[f.page - 1];
    if (text === undefined) {
      errs.push(`${key}: page ${f.page} is outside the report (${pages.length} pages).`);
      continue;
    }
    if (!normalise(text).includes(normalise(f.quote))) {
      errs.push(`${key}: quote "${f.quote}" is not on page ${f.page}.`);
      continue;
    }
    const valueDigits = digitsOf(f.value);
    if (NUMERIC_KEYS.has(key) && valueDigits.length === 0) {
      errs.push(`${key}: value "${f.value}" has no digits.`);
      continue;
    }
    if (valueDigits.length > 0 && !digitsOf(f.quote).includes(valueDigits)) {
      errs.push(`${key}: value "${f.value}" is not in quote "${f.quote}" on page ${f.page}.`);
      continue;
    }
    if (!NUMERIC_KEYS.has(key) && f.quote.trim().length < MIN_TEXT_QUOTE_CHARS) {
      errs.push(`${key}: quote "${f.quote}" is too short to be evidence (under ${MIN_TEXT_QUOTE_CHARS} characters).`);
    }
  }
  return errs;
}
