// Turning stored records into applications.
//
// A record is one application as stored: a database row, or an entry in an
// old JobTrail JSON file (data/jobtrail.json). Applications you add by hand
// store `applied_on` as YYYY-MM-DD. Imported ones keep the job site's own date
// text in `applied_on_raw`, parsed on load.
//
// JSON files are only ever read: by `npm run import-json`.

import fs from "node:fs";
import { parseIsoDate } from "./dates.js";
import { AppError } from "./errors.js";
import { parseLinkedinDate, parseRozeeDate } from "./importers.js";
import { makeApplication } from "./models.js";
import { dataPath } from "./settings.js";

export function readJsonRecords(file) {
  return JSON.parse(fs.readFileSync(file, "utf8")).applications;
}

export function loadRecords() {
  return readJsonRecords(dataPath());
}

function appliedOn(record) {
  if (record.applied_on) return parseIsoDate(record.applied_on);
  if (record.source === "linkedin") return parseLinkedinDate(record.applied_on_raw);
  if (record.source === "rozee") return parseRozeeDate(record.applied_on_raw);
  throw new AppError("UNKNOWN_SOURCE", `Can't read dates from '${record.source}'`, 500);
}

export function toApplication(record) {
  return makeApplication({
    id: record.id,
    company: record.company,
    role: record.role,
    source: record.source,
    appliedOn: appliedOn(record),
    stage: record.stage,
    nextStepOn: record.next_step_on ? parseIsoDate(record.next_step_on) : null,
    notes: record.notes ?? "",
    jobPost: record.job_post ?? null,
    cv: record.cv_id ? { id: record.cv_id, name: record.cv_name } : null,
    lastChangedOn: record.last_changed_on ? parseIsoDate(record.last_changed_on) : null,
    followedUpOn: record.followed_up_on ? parseIsoDate(record.followed_up_on) : null,
    salaryMin: record.salary_min ?? null,
    salaryMax: record.salary_max ?? null,
    salaryOffered: record.salary_offered ?? null,
  });
}

/** Applications from the JSON file. Used by the import tests. */
export function loadApplications() {
  return loadRecords().map(toApplication);
}
