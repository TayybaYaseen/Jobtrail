// Dates from job-site exports.
//
// When you import applications from a job site, JobTrail keeps the date text
// exactly as the site exported it, and parses it here when loading.

import { utcDate } from "./dates.js";

export function parseLinkedinDate(text) {
  // LinkedIn's export writes US-style dates: month/day/year.
  const [month, day, year] = text.split("/").map(Number);
  return utcDate(year, month, day);
}

export function parseRozeeDate(text) {
  // Same format as LinkedIn.
  const [month, day, year] = text.split("/").map(Number);
  return utcDate(year, month, day);
}
