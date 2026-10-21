// Monday digest for one account: the week ahead and who to follow up with, in plain text.
//
//   npm run digest -- --email hira@example.com
//
// It reads the same database as the app, so it matches This Week exactly:
// once you tap "Followed up", the reminder leaves the digest too.

import { parseArgs } from "node:util";
import { findUserByEmail, normalizeEmail } from "../src/services/accounts.js";
import { listApplications } from "../src/services/applications.js";
import { digestLines } from "../src/services/digest.js";
import { today } from "../src/settings.js";

const { values } = parseArgs({ options: { email: { type: "string" } } });

if (!values.email) {
  console.error("Usage: npm run digest -- --email you@example.com");
  process.exit(1);
}

const user = findUserByEmail(values.email);
if (!user) {
  console.error(`No account for ${normalizeEmail(values.email)}.`);
  process.exit(1);
}

console.log(digestLines(listApplications(user.id), today()).join("\n"));
