/**
 * England & Wales bank holidays, as a COMMITTED DATA FILE in this package.
 *
 * WHY THIS IS NOT A ROW IN `thb_policy`. `commerce:sla-check` has to be offline
 * and free, like `pnpm guard:check` and `pnpm schema:check` — a date-arithmetic
 * self-test that needs a live Postgres is a test that gets skipped on the day it
 * matters. The holiday list is also not the customer's data: it is the UK
 * government's, it changes once a year, and a copy in version control is
 * auditable in a way a row nobody has looked at since seeding is not.
 *
 * ENGLAND & WALES SPECIFICALLY. Scotland and Northern Ireland differ (2 January,
 * St Andrew's Day, 12 July), and Thornbury's carrier SLAs are written against
 * England & Wales. A list that silently meant "the UK" would be wrong for six
 * days a year and wrong quietly.
 *
 * SUBSTITUTE DAYS ARE ALREADY RESOLVED HERE. When Christmas falls at a weekend
 * the holiday moves to the next working day, and the moved date is what is
 * listed — so 2026 carries 28 December (Boxing Day fell on a Saturday) and not
 * 26 December. Computing substitution at runtime would be a second thing to get
 * wrong for no benefit.
 *
 * THE HORIZON IS REAL AND `assertCovers` ENFORCES IT. An SLA computed for a date
 * past the last listed year would silently treat every holiday as a working day
 * and report parcels as late that were not. Running off the end of this table
 * must be an error, not an answer.
 */

/** ISO `YYYY-MM-DD`, England & Wales, substitutes already applied. */
export const UK_BANK_HOLIDAYS: readonly string[] = [
  // 2024
  '2024-01-01', // New Year's Day
  '2024-03-29', // Good Friday
  '2024-04-01', // Easter Monday
  '2024-05-06', // Early May
  '2024-05-27', // Spring
  '2024-08-26', // Summer
  '2024-12-25', // Christmas Day
  '2024-12-26', // Boxing Day
  // 2025
  '2025-01-01',
  '2025-04-18', // Good Friday
  '2025-04-21', // Easter Monday
  '2025-05-05',
  '2025-05-26',
  '2025-08-25',
  '2025-12-25',
  '2025-12-26',
  // 2026
  '2026-01-01',
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-04',
  '2026-05-25',
  '2026-08-31',
  '2026-12-25',
  '2026-12-28', // substitute — Boxing Day fell on a Saturday
  // 2027
  '2027-01-01',
  '2027-03-26', // Good Friday
  '2027-03-29', // Easter Monday
  '2027-05-03',
  '2027-05-31',
  '2027-08-30',
  '2027-12-27', // substitute — Christmas Day fell on a Saturday
  '2027-12-28', // substitute — Boxing Day fell on a Sunday
];

/** First and last year the table can be trusted for. */
export const COVERED_YEARS = { first: 2024, last: 2027 } as const;
