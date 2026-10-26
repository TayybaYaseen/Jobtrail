// JobTrail only cares about calendar days, so every date is midnight UTC.
// That way nobody's timezone can shift a date by a day.

export function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

/** "2026-10-19" -> Date */
export function parseIsoDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  return utcDate(year, month, day);
}

/** Date -> "2026-10-19" */
export function toIso(date) {
  return date.toISOString().slice(0, 10);
}

/** Date -> "20261019", the form calendars use for an all-day date */
export function toBasicDate(date) {
  return toIso(date).replaceAll("-", "");
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(day, today) {
  return Math.round((day.getTime() - today.getTime()) / MS_PER_DAY);
}

/** The date n days later (or earlier, for a negative n). 31 Dec + 1 is 1 Jan. */
export function addDays(date, n) {
  return new Date(date.getTime() + n * MS_PER_DAY);
}
