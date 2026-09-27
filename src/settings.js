import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseIsoDate } from "./dates.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where your applications live. JOBTRAIL_DATA points it somewhere else. */
export function dataPath() {
  return process.env.JOBTRAIL_DATA ?? path.join(ROOT, "data", "jobtrail.json");
}

/** Today's date. JOBTRAIL_TODAY=2026-10-19 pins it, for demos and tests. */
export function today() {
  const pinned = process.env.JOBTRAIL_TODAY;
  if (pinned) return parseIsoDate(pinned);
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
