// The Monday digest: the week ahead and who to follow up with, as plain text.

import { describeFollowUp, describeNextStep, niceDate } from "../formatting.js";
import { followUps, thisWeek } from "./schedule.js";

/** The digest's lines. The Follow up lines come after the next steps, and only if there are any. */
export function digestLines(apps, today) {
  const lines = [`JobTrail · week of ${niceDate(today)}`];
  const upcoming = thisWeek(apps, today);
  if (upcoming.length === 0) lines.push("Nothing scheduled this week.");
  for (const app of upcoming) lines.push(`- ${describeNextStep(app, today)}`);
  for (const f of followUps(apps, today)) lines.push(`- Follow up: ${describeFollowUp(f)}`);
  return lines;
}
