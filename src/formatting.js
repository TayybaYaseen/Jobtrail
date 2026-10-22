// How dates and stages look on the page.

import { daysUntil } from "./dates.js";
import { NEXT_STEP_STAGES } from "./models.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** e.g. "Tue 20 Oct". Blank when there's no date. */
export function niceDate(date) {
  if (!date) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${DAYS[date.getUTCDay()]} ${day} ${MONTHS[date.getUTCMonth()]}`;
}

/** e.g. "19 Oct 2026" */
export function longDate(date) {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function stageLabel(stage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

// Stages that get a "next step" line on the page and in the digest.
const WITH_NEXT_STEP = new Set(NEXT_STEP_STAGES);

export function hasNextStep(app) {
  return WITH_NEXT_STEP.has(app.stage);
}

/** e.g. "Margalla Tech · no reply for 35 days" */
export function describeFollowUp({ app, daysSilent }) {
  return `${app.company} · no reply for ${daysSilent} days`;
}

/** e.g. "Tue 20 Oct · Ravi Systems · interview (tomorrow)" */
export function describeNextStep(app, today) {
  const n = daysUntil(app.nextStepOn, today);
  const when = n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
  return `${niceDate(app.nextStepOn)} · ${app.company} · ${app.stage} (${when})`;
}
