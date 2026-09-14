/**
 * The as-of day, and nothing else.
 *
 * WHY ITS OWN FILE. Four of the six silos ask a question of the form "what was
 * true on THIS day" — was the machine qualified, was the training current, which
 * SOP revision governed, was the authorisation valid. All four compare a
 * `YYYY-MM-DD` against a stored range, and all four get it wrong in the same way
 * if one of them formats the day differently. One function, imported by all.
 */

/** `YYYY-MM-DD` from a `Date` or an already-formatted string. */
export const asOfDay = (t: Date | string | null | undefined): string =>
  t ? String(t instanceof Date ? t.toISOString() : t).slice(0, 10) : '';

/** Was `expiresOn` already past on `asOf`? Day precision, never time-of-day. */
export const hadLapsedBy = (expiresOn: Date | string, asOf: Date | string): boolean =>
  asOfDay(expiresOn) < asOfDay(asOf);
