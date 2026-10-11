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
    'Planned maintenance, Swedish "underhållsplan" or "planerat underhåll". Text or an amount in kr, ' +
      'as the report states it. Null if the report has no such statement.',
  ),
  auditor_remarks: Figure.describe(
    'Remarks in the auditor report, Swedish "revisionsberättelse" or "anmärkning". Text as stated. ' +
      'Use the statement of whether the auditor made remarks, if that is all the report says. Null if the ' +
      'report has no auditor report text.',
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

/**
 * Rules Zod cannot express. Messages are written for the model, since they are
 * handed back on retry, and for the person reading the output.
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
    }
  }
  return errs;
}
