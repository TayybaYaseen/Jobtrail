// Monday digest: the week ahead, in plain text.
//
// Everyone's copy of JobTrail runs this every Monday at 8am and emails the
// output to them. Run it yourself with:  npm run digest

import { thisWeek } from "../src/services/schedule.js";
import { describeNextStep, niceDate } from "../src/formatting.js";
import { today } from "../src/settings.js";
import { loadApplications } from "../src/store.js";

const now = today();
console.log(`JobTrail · week of ${niceDate(now)}`);
const upcoming = thisWeek(loadApplications(), now);
if (upcoming.length === 0) console.log("Nothing scheduled this week.");
for (const app of upcoming) console.log(`- ${describeNextStep(app, now)}`);
