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

/** e.g. "19 Oct" */
export function dayMonth(date) {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
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

// F7 · Salary. "120,000": commas every three digits, as job posts write it.
const grouped = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const rupees = (n) => `Rs ${grouped(n)}`;

/** "Rs 80,000 – 120,000", "From Rs 80,000", "Up to Rs 120,000", or null with no salary. */
export function salaryRange({ salaryMin: min, salaryMax: max }) {
  if (min !== null && max !== null) return `${rupees(min)} – ${grouped(max)}`;
  if (min !== null) return `From ${rupees(min)}`;
  if (max !== null) return `Up to ${rupees(max)}`;
  return null;
}

/** The offer, only while the stage is Offer. null when it's hidden or there's none. */
export function shownOffer(app) {
  return app.stage === "offer" ? app.salaryOffered : null;
}

/** e.g. "Rs 110,000 (within range)", or just "Rs 110,000" with no range. null with no offer shown. */
export function describeOffer(app) {
  const offer = shownOffer(app);
  if (offer === null) return null;
  const { salaryMin: min, salaryMax: max } = app;
  if (min === null && max === null) return rupees(offer);
  if (min !== null && offer < min) return `${rupees(offer)} (below range)`;
  if (max !== null && offer > max) return `${rupees(offer)} (above range)`;
  return `${rupees(offer)} (within range)`;
}

// F8 · What to tell the referrer, by stage.
const NEWS = { interview: "you reached Interview.", offer: "you reached Offer.", rejected: "the answer was no." };

/** e.g. "Tell Ahmed Khan about Ravi Systems: you reached Interview." */
export function describeThankYou(app) {
  return `Tell ${app.referrer.name} about ${app.company}: ${NEWS[app.stage]}`;
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
