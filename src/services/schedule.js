// What's coming up: interviews, screens and offer deadlines.

import { niceDate } from "../formatting.js";

// Stages where there's a next step with a date.
export const NEXT_STEP_STAGES = ["screening", "interview", "offer"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(day, today) {
  return Math.round((day.getTime() - today.getTime()) / MS_PER_DAY);
}

/** Next steps in the coming seven days, soonest first. */
export function thisWeek(apps, today) {
  const upcoming = [];
  for (const app of apps) {
    if (!NEXT_STEP_STAGES.includes(app.stage)) continue;
    const days = daysUntil(app.nextStepOn, today);
    if (days >= 0 && days <= 6) upcoming.push(app);
  }
  return upcoming.sort((a, b) => a.nextStepOn - b.nextStepOn);
}

export function label(app) {
  return `${app.company} · ${niceDate(app.nextStepOn)}`;
}
