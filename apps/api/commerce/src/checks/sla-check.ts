/**
 * `pnpm commerce:sla-check` — working-day arithmetic across a bank holiday. T6.
 *
 * THE NEGATIVE CONTROL THE BRIEF ASKS FOR is "drop the holiday table and it must
 * fail", and the calendar was written to make that expressible: every function
 * takes the holiday set as its last parameter, defaulting to the real one. So
 * "dropping the table" here is passing `new Set()`, and the assertion is that
 * the answers MOVE. If they did not, the holiday table was never being consulted
 * and every green run of this check so far meant nothing.
 *
 * Offline, instant, no database — which is the point of keeping the holiday list
 * as a committed data file rather than a `thb_policy` row.
 */
import {
  addWorkingDays,
  isWorkingDay,
  isCovered,
  londonCivilDate,
  slaDueDate,
  workingDaysBetween,
  workingDaysLate,
  CalendarRangeError,
} from '../common/calendar/working-days';
import { UK_BANK_HOLIDAYS } from '../common/calendar/uk-bank-holidays';
import { Checks } from './harness';

const checks = new Checks('commerce:sla-check — working days, not calendar days');

/** "Drop the holiday table." */
const NO_HOLIDAYS = new Set<string>();

// Easter 2026: Good Friday is 3 April and Easter Monday is 6 April, so a parcel
// dispatched on Thursday 2 April meets four consecutive non-working days.
const DISPATCHED = new Date('2026-04-02T10:00:00Z');
const SLA_WORKING_DAYS = 3;

checks.section('THE WEEK THAT MATTERS — Easter 2026');
checks.assert(
  '2 April 2026 is a working day',
  isWorkingDay('2026-04-02'),
  'the Thursday the parcel went out; if this were false the rest would be nonsense',
);
checks.assert(
  'Good Friday (3 April 2026) is not',
  !isWorkingDay('2026-04-03'),
  'the first of four consecutive non-working days',
);
checks.assert(
  'Easter Monday (6 April 2026) is not',
  !isWorkingDay('2026-04-06'),
  'the one a weekend-only implementation gets wrong',
);
checks.assert(
  'Tuesday 7 April 2026 is',
  isWorkingDay('2026-04-07'),
  'the holiday must not swallow the days after it',
);

checks.section('THE ARITHMETIC');
const due = slaDueDate(DISPATCHED, SLA_WORKING_DAYS);
checks.assert(
  `3 working days from 2 April 2026 is 9 April, not 5 April (got ${due})`,
  due === '2026-04-09',
  'Fri 3rd (Good Friday), Sat, Sun and Mon 6th (Easter Monday) are all skipped',
);
checks.assert(
  'delivery on 9 April is ON TIME',
  workingDaysLate(DISPATCHED, SLA_WORKING_DAYS, new Date('2026-04-09T15:00:00Z')) === 0,
  'the due date itself is not late',
);
checks.assert(
  'delivery on 10 April is ONE working day late',
  workingDaysLate(DISPATCHED, SLA_WORKING_DAYS, new Date('2026-04-10T15:00:00Z')) === 1,
  'one working day past due, and it is a Friday, so the count is unambiguous',
);
checks.assert(
  'delivery on 13 April is TWO working days late, not five calendar days',
  workingDaysLate(DISPATCHED, SLA_WORKING_DAYS, new Date('2026-04-13T15:00:00Z')) === 2,
  'THE TRAP T6 DESCRIBES: the weekend between is three calendar days and zero working ones',
);
checks.assert(
  'an early delivery is zero late, never negative',
  workingDaysLate(DISPATCHED, SLA_WORKING_DAYS, new Date('2026-04-07T09:00:00Z')) === 0,
  'a negative lateness would be a credit, and somebody would eventually pay it out',
);

checks.section('TIMESTAMPS ARE INSTANTS; WORKING DAYS ARE CIVIL DATES IN LONDON');
checks.assert(
  '2026-05-03T23:30Z is 4 May in London (BST), which is a bank holiday',
  londonCivilDate(new Date('2026-05-03T23:30:00Z')) === '2026-05-04' &&
    !isWorkingDay('2026-05-04'),
  'THE SECOND TRAP: UTC-date arithmetic is wrong for every shipment dispatched ' +
    'in the last hour of a UTC day for half the year',
);
checks.assert(
  '2026-01-15T23:30Z is still 15 January in London (GMT)',
  londonCivilDate(new Date('2026-01-15T23:30:00Z')) === '2026-01-15',
  'and it must not "fix" the winter case by shifting it the other way',
);

checks.section('COUNTING BETWEEN TWO DATES');
checks.assert(
  '2 → 9 April 2026 is 3 working days',
  workingDaysBetween('2026-04-02', '2026-04-09') === 3,
  'the inverse of addWorkingDays, and it must agree with it',
);
checks.assert(
  'the two functions agree in both directions',
  workingDaysBetween('2026-04-02', addWorkingDays('2026-04-02', 7)) === 7,
  'a round trip catches an off-by-one that a single direction hides',
);

checks.section('THE HORIZON');
let refusedPastHorizon = false;
try {
  isWorkingDay('2028-06-01');
} catch (error) {
  refusedPastHorizon = error instanceof CalendarRangeError;
}
checks.assert(
  'isCovered reports the horizon without throwing',
  isCovered('2026-04-02') && !isCovered('2028-06-01') && !isCovered('2023-01-01'),
  'caller-supplied dates are range-CHECKED with this and answered with a structured ' +
    'failure; only internal arithmetic is allowed to throw. A 5xx from this API ' +
    'must always mean plumbing, because the MCP layer reads it as infrastructure',
);
checks.assert(
  'a date past the holiday table REFUSES rather than assuming no holidays',
  refusedPastHorizon,
  'silently treating 2028 as holiday-free would report parcels late that were not, ' +
    'and would never log anything',
);

checks.section('NEGATIVE CONTROL — drop the holiday table');
const dueWithoutHolidays = slaDueDate(DISPATCHED, SLA_WORKING_DAYS, NO_HOLIDAYS);
checks.control(
  'the answer MOVES when the holidays are removed',
  dueWithoutHolidays === '2026-04-07' && dueWithoutHolidays !== due,
  `with no holiday table the due date is ${dueWithoutHolidays} instead of ${due}. ` +
    'If these two agreed, the table was never consulted and every assertion above ' +
    'was passing for the wrong reason',
);
checks.control(
  'Good Friday reads as a working day once the table is gone',
  isWorkingDay('2026-04-03', NO_HOLIDAYS) && !isWorkingDay('2026-04-03'),
  'the plant and the real thing must disagree about the same date',
);
checks.control(
  'lateness is under-counted without the table',
  workingDaysLate(DISPATCHED, SLA_WORKING_DAYS, new Date('2026-04-13T15:00:00Z'), NO_HOLIDAYS) !==
    workingDaysLate(DISPATCHED, SLA_WORKING_DAYS, new Date('2026-04-13T15:00:00Z')),
  'this is the number that becomes a carrier penalty, so it is the one worth planting on',
);

checks.section('THE TABLE ITSELF');
checks.assert(
  'every entry is a well-formed ISO date',
  UK_BANK_HOLIDAYS.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
  'a typo here is a silent wrong answer, not a parse error',
);
checks.assert(
  'the table is sorted and has no duplicates',
  UK_BANK_HOLIDAYS.every((d, i) => i === 0 || d > UK_BANK_HOLIDAYS[i - 1]),
  'a duplicate would be harmless and a sign nobody checked; an unsorted entry ' +
    'usually means a year was pasted into the wrong place',
);
checks.assert(
  'no bank holiday falls at a weekend',
  UK_BANK_HOLIDAYS.every((d) => {
    const day = new Date(`${d}T00:00:00Z`).getUTCDay();
    return day !== 0 && day !== 6;
  }),
  'England & Wales substitutes to the next working day, so a Saturday entry ' +
    'means a substitute was transcribed instead of resolved — 26 December 2026 ' +
    'is the one this catches',
);

checks.done();
