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

// Seven days without news means it's time to follow up. The same for everyone in v1.
export const FOLLOW_UP_AFTER_DAYS = 7;

/**
 * How many days an application has gone without news: since it was last
 * changed (or applied for, if it never was), or since I last followed up.
 */
export function daysSilent(app, today) {
  const since = [app.lastChangedOn ?? app.appliedOn, app.followedUpOn].filter(Boolean);
  return daysUntil(today, new Date(Math.max(...since)));
}

/**
 * Applications to follow up on, longest silence first, as { app, daysSilent }.
 * Only Applied: any other stage means the company has replied.
 */
export function followUps(apps, today) {
  return apps
    .filter((app) => app.stage === "applied" && app.appliedOn <= today)
    .map((app) => ({ app, daysSilent: daysSilent(app, today) }))
    .filter((f) => f.daysSilent >= FOLLOW_UP_AFTER_DAYS)
    .sort((a, b) => b.daysSilent - a.daysSilent);
}

export function label(app) {
  return `${app.company} · ${niceDate(app.nextStepOn)}`;
}
