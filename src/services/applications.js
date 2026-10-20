import { toIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { AppError } from "../errors.js";
import { STAGES } from "../models.js";
import { toApplication } from "../store.js";

// Every function here works on one user's applications only. Someone else's
// application looks exactly like one that doesn't exist: 404.

const COLUMNS = "id, company, role, source, applied_on, applied_on_raw, stage, next_step_on, notes";

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

export function getApplication(userId, id) {
  if (!Number.isInteger(id)) throw notFound(id);
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM applications WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!row) throw notFound(id);
  return toApplication(row);
}

export function addApplication(userId, company, role, appliedOn) {
  company = company.trim();
  role = role.trim();
  if (!company || !role) throw new AppError("MISSING_FIELDS", "Company and role are both required");
  const { lastInsertRowid } = getDb()
    .prepare(INSERT)
    .run(userId, company, role, "manual", toIso(appliedOn), null, "applied", null, "");
  return getApplication(userId, Number(lastInsertRowid));
}

export function moveStage(userId, id, stage, nextStepOn = null) {
  if (!STAGES.includes(stage)) {
    throw new AppError("UNKNOWN_STAGE", `'${stage}' is not one of ${STAGES.join(", ")}`);
  }
  if (!Number.isInteger(id)) throw notFound(id);
  const { changes } = getDb()
    .prepare("UPDATE applications SET stage = ?, next_step_on = ? WHERE id = ? AND user_id = ?")
    .run(stage, nextStepOn ? toIso(nextStepOn) : null, id, userId);
  if (changes === 0) throw notFound(id);
  return getApplication(userId, id);
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
