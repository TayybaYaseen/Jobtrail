// What's coming up: interviews, screens and offer deadlines.

import { daysUntil } from "../dates.js";
import { niceDate } from "../formatting.js";
import { NEXT_STEP_STAGES } from "../models.js";

export { daysUntil, NEXT_STEP_STAGES };

/** Next steps in the coming seven days, soonest first. */
export function thisWeek(apps, today) {
  const upcoming = [];
  for (const app of apps) {
    if (!NEXT_STEP_STAGES.includes(app.stage)) continue;
    if (!app.nextStepOn) continue; // no date yet, so it can't be this week
    const days = daysUntil(app.nextStepOn, today);
    if (days >= 0 && days <= 6) upcoming.push(app);
  }
  return upcoming.sort((a, b) => a.nextStepOn - b.nextStepOn);
}

export function label(app) {
  return `${app.company} · ${niceDate(app.nextStepOn)}`;
}
