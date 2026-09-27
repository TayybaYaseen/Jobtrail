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
