import { toIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { AppError } from "../errors.js";
import { STAGES } from "../models.js";
import { today } from "../settings.js";
import { toApplication } from "../store.js";
import { getCv, MAX_TEXT_LENGTH } from "./cvs.js";
import { followUps } from "./schedule.js";

// Every function here works on one user's applications only. Someone else's
// application looks exactly like one that doesn't exist: 404.

const COLUMNS =
  "id, company, role, source, applied_on, applied_on_raw, stage, next_step_on, notes, last_changed_on, followed_up_on";

const INSERT = `INSERT INTO applications
  (user_id, company, role, source, applied_on, applied_on_raw, stage, next_step_on, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

function notFound(id) {
  return new AppError("NOT_FOUND", `No application with id ${id}`, 404);
}

export function newestFirst(apps) {
  return [...apps].sort((a, b) => b.appliedOn - a.appliedOn);
}

export function listApplications(userId) {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM applications WHERE user_id = ?`)
    .all(userId)
    .map(toApplication);
}

/** One application, with its job post and the CV sent ({ id, name }). */
export function getApplication(userId, id) {
  if (!Number.isInteger(id)) throw notFound(id);
  const row = getDb()
    .prepare(
      `SELECT applications.*, cvs.name AS cv_name
       FROM applications LEFT JOIN cvs ON cvs.id = applications.cv_id
       WHERE applications.id = ? AND applications.user_id = ?`,
    )
    .get(id, userId);
  if (!row) throw notFound(id);
  return toApplication(row);
}

/** cvId (optional) is the CV sent with it; it must be one of this user's CVs. */
export function addApplication(userId, company, role, appliedOn, cvId = null) {
  company = company.trim();
  role = role.trim();
  if (!company || !role) throw new AppError("MISSING_FIELDS", "Company and role are both required");
  if (cvId !== null) getCv(userId, cvId); // 404 if it isn't theirs
  const id = transaction((db) => {
    const { lastInsertRowid } = db
      .prepare(INSERT)
      .run(userId, company, role, "manual", toIso(appliedOn), null, "applied", null, "");
    db.prepare("UPDATE applications SET cv_id = ?, last_changed_on = ? WHERE id = ?")
      .run(cvId, toIso(today()), lastInsertRowid);
    return Number(lastInsertRowid);
  });
  return getApplication(userId, id);
}

/**
 * Saves the job post and the CV sent. A blank job post is saved as null, and
 * so is "No CV chosen". Checks everything before writing, so an error saves nothing.
 */
export function saveJobPostAndCv(userId, id, jobPost, cvId) {
  jobPost = typeof jobPost === "string" && jobPost.trim() ? jobPost : null;
  if (jobPost && jobPost.length > MAX_TEXT_LENGTH) {
    throw new AppError("JOB_POST_TOO_LONG", "That job post is too long (20,000 characters max).");
  }
  getApplication(userId, id); // 404 if it isn't theirs
  if (cvId !== null) getCv(userId, cvId); // 404 if it isn't theirs
  getDb()
    .prepare("UPDATE applications SET job_post = ?, cv_id = ? WHERE id = ? AND user_id = ?")
    .run(jobPost, cvId, id, userId);
  return getApplication(userId, id);
}

export function moveStage(userId, id, stage, nextStepOn = null) {
  if (!STAGES.includes(stage)) {
    throw new AppError("UNKNOWN_STAGE", `'${stage}' is not one of ${STAGES.join(", ")}`);
  }
  if (!Number.isInteger(id)) throw notFound(id);
  // A new stage means news from the company, so it restarts the follow-up clock.
  // Saving the same stage (say, only a new next-step date) doesn't. The CASE
  // sees the stage from before this UPDATE.
  const { changes } = getDb()
    .prepare(
      `UPDATE applications
       SET last_changed_on = CASE WHEN stage = @stage THEN last_changed_on ELSE @today END,
           stage = @stage, next_step_on = @nextStepOn
       WHERE id = @id AND user_id = @userId`,
    )
    .run({ stage, today: toIso(today()), nextStepOn: nextStepOn ? toIso(nextStepOn) : null, id, userId });
  if (changes === 0) throw notFound(id);
  return getApplication(userId, id);
}

/**
 * Records today as the day I followed up. Only when it's due: a second tap,
 * or a tap from an old page, changes nothing. Returns whether it saved.
 */
export function markFollowedUp(userId, id) {
  const app = getApplication(userId, id); // 404 if it isn't theirs, or is gone
  const now = today();
  if (followUps([app], now).length === 0) return false;
  getDb().prepare("UPDATE applications SET followed_up_on = ? WHERE id = ? AND user_id = ?").run(toIso(now), id, userId);
  return true;
}

/**
 * Copies records from an old JobTrail JSON file into an empty account. Checks
 * every record first, so a bad one stops the import before anything is written.
 */
export function importRecords(userId, records) {
  records.forEach((record, i) => {
    const which = `Record ${i + 1}`;
    let app;
    try {
      app = toApplication(record);
    } catch (err) {
      if (err.code === "UNKNOWN_SOURCE") throw new AppError("BAD_RECORD", `${which}: can't read dates from '${record.source}'`);
      throw new AppError("BAD_RECORD", `${which}: ${err.message}`);
    }
    if (Number.isNaN(app.appliedOn.getTime())) {
      throw new AppError("BAD_RECORD", `${which}: can't read the date '${record.applied_on ?? record.applied_on_raw}'`);
    }
  });

  return transaction((db) => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM applications WHERE user_id = ?").get(userId);
    if (n > 0) throw new AppError("ALREADY_IMPORTED", "That account already has applications.", 409);
    const insert = db.prepare(INSERT);
    for (const r of records) {
      insert.run(
        userId,
        r.company,
        r.role,
        r.source,
        r.applied_on ?? null,
        r.applied_on_raw ?? null,
        r.stage,
        r.next_step_on ?? null,
        r.notes ?? "",
      );
    }
    return records.length;
  });
}
