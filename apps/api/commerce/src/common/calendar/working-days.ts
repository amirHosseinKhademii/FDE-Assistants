/**
 * Working-day arithmetic. This is planted flaw T6 and the whole of it.
 *
 * THE TRAP, RESTATED. Carrier SLAs are written in WORKING DAYS excluding
 * England & Wales bank holidays. `thb_shop.orders` stores TIMESTAMPS. Subtracting
 * one from the other in calendar days and calling the difference "3 days late"
 * invents a penalty over any bank-holiday weekend — and it invents it in the
 * company's favour about as often as against, so nobody notices from the totals.
 *
 * THE SECOND TRAP, WHICH IS EASIER TO MISS. A timestamp is an INSTANT; a working
 * day is a CIVIL DATE in a place. A parcel dispatched at 2026-05-03T23:30:00Z is
 * already 4 May in London — British Summer Time — which in 2026 is the early May
 * bank holiday. Doing this arithmetic on UTC calendar dates gets the answer wrong
 * for every shipment dispatched in the last hour of a UTC day for half the year.
 * So every instant is converted to a Europe/London civil date FIRST, exactly
 * once, at the boundary, by `londonCivilDate`.
 *
 * No dependency: `Intl.DateTimeFormat` with `timeZone: 'Europe/London'` already
 * knows when the clocks change, and it is in Node.
 */
import { UK_BANK_HOLIDAYS, COVERED_YEARS } from './uk-bank-holidays';

/** An ISO `YYYY-MM-DD` civil date. Not an instant. */
export type CivilDate = string;

export class CalendarRangeError extends Error {}

const HOLIDAYS = new Set(UK_BANK_HOLIDAYS);
const MS_PER_DAY = 86_400_000;

const LONDON = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});


/**
 * The civil date in London that an instant falls on.
 *
 * `en-CA` is chosen because it formats as `YYYY-MM-DD` natively, which sorts and
 * compares as a string. Building the string by hand from `getUTCFullYear()` is
 * the version of this function that has the bug in the docstring above.
 */
export function londonCivilDate(instant: Date): CivilDate {
  return LONDON.format(instant);
}

/**
 * The civil date of a postgres `date` column.
 *
 * NOT `londonCivilDate`, AND THE DIFFERENCE IS A REAL BUG IF YOU GET IT WRONG.
 * A `date` column has no time and no zone; Prisma hands it back as a `Date` at
 * UTC midnight. Running that through a Europe/London formatter is correct for
 * half the year and shifts it to the PREVIOUS DAY for the other half, because
 * UTC midnight in July is 01:00 BST — so `promised_by = 2026-07-03` would read
 * back as 2 July and every SLA computed from it would be a day out.
 *
 * So: instants go through `londonCivilDate`, date columns go through this.
 * Two functions rather than one with a flag, because the choice is not a mode,
 * it is a fact about the column.
 */
export function civilDate(dateColumn: Date): CivilDate {
  return dateColumn.toISOString().slice(0, 10);
}

/*
 * THERE IS NO `londonDayRange` HERE, AND ITS ABSENCE IS DELIBERATE.
 *
 * One existed. It converted a route date into the instant range covering that
 * London civil day, and it was written to fix a theoretical hour lost at the
 * UTC boundary. Applied to `driver_reports` it dropped every report filed after
 * midnight for the round that had just ended — five of sixty-six in the seeded
 * estate, and precisely the ones a tired driver writes at the depot after a long
 * round.
 *
 * It is deleted rather than left unused because an available helper that looks
 * exactly right is how the bug comes back. The lesson lives in
 * `FleetService.findDriverReportsForRoute`: the foreign key was always the key,
 * and a redundant date window on top of it can only destroy evidence.
 */

/** Days since the epoch for a civil date, so date arithmetic is integer arithmetic. */
function dayNumber(date: CivilDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromDayNumber(n: number): CivilDate {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Refuse to answer past the holiday table's horizon.
 *
 * Silently treating 2028 as holiday-free would not throw, would not log, and
 * would report parcels as late that were not. An SLA answer nobody can trust is
 * worse than an error somebody has to fix.
 */
export function isCovered(date: CivilDate): boolean {
  const year = Number(date.slice(0, 4));
  return year >= COVERED_YEARS.first && year <= COVERED_YEARS.last;
}

/**
 * The throwing form, for internal arithmetic. A CALLER-SUPPLIED date should be
 * tested with `isCovered` and answered with a structured failure instead — see
 * PolicyService.getSla. Reaching this throw from an HTTP handler means a bad
 * query parameter became a 500, which tells the far side "infrastructure" about
 * something that was entirely the caller's doing.
 */
export function assertCovered(date: CivilDate): void {
  if (!isCovered(date)) {
    throw new CalendarRangeError(
      `${date} is outside the bank-holiday table (${COVERED_YEARS.first}-` +
        `${COVERED_YEARS.last}). Extend src/common/calendar/uk-bank-holidays.ts ` +
        `rather than letting the arithmetic assume a year with no holidays in it.`,
    );
  }
}

/** Monday–Friday and not a bank holiday. */
export function isWorkingDay(date: CivilDate, holidays: Set<string> = HOLIDAYS): boolean {
  assertCovered(date);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !holidays.has(date);
}

/**
 * `n` working days after `from`, not counting `from` itself.
 *
 * "Delivery within 3 working days of dispatch" means the third working day
 * AFTER the dispatch day. Counting the dispatch day as day one is the
 * off-by-one that makes an on-time parcel late.
 */
export function addWorkingDays(
  from: CivilDate,
  n: number,
  holidays: Set<string> = HOLIDAYS,
): CivilDate {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`working days must be a non-negative integer, got ${n}`);
  }
  let cursor = dayNumber(from);
  let remaining = n;
  while (remaining > 0) {
    cursor += 1;
    const candidate = fromDayNumber(cursor);
    if (isWorkingDay(candidate, holidays)) remaining -= 1;
  }
  return fromDayNumber(cursor);
}

/**
 * Working days strictly between two civil dates — `from` exclusive, `to`
 * inclusive. Negative when `to` precedes `from`, so "early" is expressible.
 */
export function workingDaysBetween(
  from: CivilDate,
  to: CivilDate,
  holidays: Set<string> = HOLIDAYS,
): number {
  const a = dayNumber(from);
  const b = dayNumber(to);
  const step = b >= a ? 1 : -1;
  let count = 0;
  for (let cursor = a; cursor !== b; cursor += step) {
    const candidate = fromDayNumber(cursor + step);
    if (isWorkingDay(candidate, holidays)) count += step;
  }
  return count;
}

/** What the SLA promises, given when it actually went out. */
export function slaDueDate(
  dispatchedAt: Date,
  workingDays: number,
  holidays: Set<string> = HOLIDAYS,
): CivilDate {
  return addWorkingDays(londonCivilDate(dispatchedAt), workingDays, holidays);
}

/**
 * How late a delivery was, in working days. Zero or negative means on time.
 *
 * RETURNS A NUMBER AND DECIDES NOTHING. Whether lateness is a penalty is a
 * policy question answered by `carrier_sla.penalty_rate` and a human — this
 * function's only job is to stop the number itself being fiction.
 */
export function workingDaysLate(
  dispatchedAt: Date,
  workingDays: number,
  deliveredAt: Date,
  holidays: Set<string> = HOLIDAYS,
): number {
  const due = slaDueDate(dispatchedAt, workingDays, holidays);
  const delivered = londonCivilDate(deliveredAt);
  const late = workingDaysBetween(due, delivered, holidays);
  return late > 0 ? late : 0;
}
