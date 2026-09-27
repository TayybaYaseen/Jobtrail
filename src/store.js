// JobTrail keeps everything in one JSON file (data/jobtrail.json).
//
// Applications you add by hand store `applied_on` as YYYY-MM-DD. Imported ones
// keep the job site's own date text in `applied_on_raw`, parsed on load.

import fs from "node:fs";
import { parseIsoDate } from "./dates.js";
import { AppError } from "./errors.js";
import { parseLinkedinDate } from "./importers.js";
import { makeApplication } from "./models.js";
import { dataPath } from "./settings.js";

export function loadRecords() {
  return JSON.parse(fs.readFileSync(dataPath(), "utf8")).applications;
}

export function saveRecords(records) {
  fs.writeFileSync(dataPath(), JSON.stringify({ applications: records }, null, 2) + "\n");
}

function appliedOn(record) {
  if (record.applied_on) return parseIsoDate(record.applied_on);
  if (record.source === "linkedin") return parseLinkedinDate(record.applied_on_raw);
  throw new AppError("UNKNOWN_SOURCE", `Can't read dates from '${record.source}'`, 500);
}

function toApplication(record) {
  return makeApplication({
    id: record.id,
    company: record.company,
    role: record.role,
    source: record.source,
    appliedOn: appliedOn(record),
    stage: record.stage,
    nextStepOn: record.next_step_on ? parseIsoDate(record.next_step_on) : null,
    notes: record.notes ?? "",
  });
}

export function loadApplications() {
  return loadRecords().map(toApplication);
}
