/**
 * WORKING DAYS, WHICH ARE NOT CALENDAR DAYS. Trap T6 in one file.
 *
 * A carrier SLA promises delivery in N WORKING days. `thb_shop.orders.promised_by`
 * is a plain calendar date. Subtract two timestamps and you get neither. Over
 * the weekend of Sat 29 – Mon 31 August 2026 the difference is three days, which
 * is the whole of a standard SLA — so an assistant that counts calendar days
 * reports a delivery as three days late, computes a penalty against
 * `carrier_sla.penalty_rate`, and invents money the carrier does not owe.
 *
 * THE JURISDICTION COLUMN IS NOT PADDING. Scotland's August bank holiday is the
 * FIRST Monday (2026-08-03) and England & Wales's is the LAST (2026-08-31).
 * "The August bank holiday" therefore names two different dates, and Thornbury's
 * own fleet runs six metros that do not all sit in one jurisdiction. A date
 * check that does not say which jurisdiction it meant is wrong in one of them.
 *
 * ENGLAND & WALES IS THE DEFAULT because every depot in the seed is in England.
 * Scotland's dates are seeded anyway: a holiday table that only ever holds the
 * answer is a lookup that cannot be got wrong, and the point is that it can.
 *
 * DATES ARE LITERALS, NOT COMPUTED. "Last Monday in August" is a rule with
 * exceptions — a substitute day when Christmas falls at a weekend, a one-off
 * for a coronation — so real calendars are published tables, not formulas.
 * Computing them would encode a rule that reality does not follow.
 */

export interface BankHoliday {
  date: string;
  jurisdiction: 'england-and-wales' | 'scotland';
  name: string;
}

/**
 * 2025 and 2026. The seeded orders only reach back to May 2026, but an SLA
 * asked about a year-old order should not fall off the end of the table — and
 * a table that stops just behind the data is a bug that waits for the data to
 * move.
 */
export const BANK_HOLIDAYS: readonly BankHoliday[] = [
  { date: '2025-01-01', jurisdiction: 'england-and-wales', name: "New Year's Day" },
  { date: '2025-04-18', jurisdiction: 'england-and-wales', name: 'Good Friday' },
  { date: '2025-04-21', jurisdiction: 'england-and-wales', name: 'Easter Monday' },
  { date: '2025-05-05', jurisdiction: 'england-and-wales', name: 'Early May bank holiday' },
  { date: '2025-05-26', jurisdiction: 'england-and-wales', name: 'Spring bank holiday' },
  { date: '2025-08-25', jurisdiction: 'england-and-wales', name: 'Summer bank holiday' },
  { date: '2025-12-25', jurisdiction: 'england-and-wales', name: 'Christmas Day' },
  { date: '2025-12-26', jurisdiction: 'england-and-wales', name: 'Boxing Day' },

  { date: '2026-01-01', jurisdiction: 'england-and-wales', name: "New Year's Day" },
  { date: '2026-04-03', jurisdiction: 'england-and-wales', name: 'Good Friday' },
  { date: '2026-04-06', jurisdiction: 'england-and-wales', name: 'Easter Monday' },
  { date: '2026-05-04', jurisdiction: 'england-and-wales', name: 'Early May bank holiday' },
  { date: '2026-05-25', jurisdiction: 'england-and-wales', name: 'Spring bank holiday' },
  // THE ONE T6 TURNS ON. A Monday, so the non-working run is Sat 29 → Mon 31.
  { date: '2026-08-31', jurisdiction: 'england-and-wales', name: 'Summer bank holiday' },
  { date: '2026-12-25', jurisdiction: 'england-and-wales', name: 'Christmas Day' },
  // Boxing Day 2026 is a SATURDAY, so the holiday is the following Monday. This
  // is the exception that makes the "last Monday in August" style of formula
  // wrong, kept in the table as the standing argument against computing these.
  { date: '2026-12-28', jurisdiction: 'england-and-wales', name: 'Boxing Day (substitute day)' },

  { date: '2026-01-01', jurisdiction: 'scotland', name: "New Year's Day" },
  { date: '2026-01-02', jurisdiction: 'scotland', name: '2 January' },
  { date: '2026-04-03', jurisdiction: 'scotland', name: 'Good Friday' },
  { date: '2026-05-04', jurisdiction: 'scotland', name: 'Early May bank holiday' },
  { date: '2026-05-25', jurisdiction: 'scotland', name: 'Spring bank holiday' },
  // FIRST Monday, not the last. See the header.
  { date: '2026-08-03', jurisdiction: 'scotland', name: 'Summer bank holiday' },
  { date: '2026-11-30', jurisdiction: "scotland", name: "St Andrew's Day" },
  { date: '2026-12-25', jurisdiction: 'scotland', name: 'Christmas Day' },
  { date: '2026-12-28', jurisdiction: 'scotland', name: 'Boxing Day (substitute day)' },
];

/** The set a working-day count actually consults. */
export function holidaySet(jurisdiction = 'england-and-wales'): Set<string> {
  return new Set(BANK_HOLIDAYS.filter((h) => h.jurisdiction === jurisdiction).map((h) => h.date));
}

const isoOf = (d: Date): string => d.toISOString().slice(0, 10);

/** Saturday or Sunday, or in the holiday set. */
export function isWorkingDay(d: Date, holidays: Set<string>): boolean {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !holidays.has(isoOf(d));
}

/**
 * `n` working days AFTER `from`, not counting `from` itself.
 *
 * COUNTING FROM THE DAY AFTER is the convention a carrier contract uses —
 * "delivered within 3 working days of despatch" means despatch day is day zero.
 * Off by one here and every SLA in the estate is off by one, silently, in the
 * direction that makes the carrier look better.
 */
export function addWorkingDays(from: Date, n: number, holidays: Set<string>): Date {
  let d = new Date(from.getTime());
  let left = n;
  while (left > 0) {
    d = new Date(d.getTime() + 86_400_000);
    if (isWorkingDay(d, holidays)) left--;
  }
  return d;
}

/** Working days strictly between two dates, exclusive of `from`, inclusive of `to`. */
export function workingDaysBetween(from: Date, to: Date, holidays: Set<string>): number {
  if (to <= from) return 0;
  let n = 0;
  let d = new Date(from.getTime());
  while (d < to) {
    d = new Date(d.getTime() + 86_400_000);
    if (isWorkingDay(d, holidays)) n++;
  }
  return n;
}

/** Plain calendar days — what a careless answer uses. Here to be compared against. */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
