// CV versions. A CV's text is never changed after it's saved, so the CV
// attached to an application is exactly what the employer read. To change a
// CV, add a new version.
//
// Like applications, someone else's CV looks exactly like one that doesn't
// exist: 404.

import { parseIsoDate, toIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { AppError } from "../errors.js";
import { today } from "../settings.js";

export const MAX_TEXT_LENGTH = 20000;

const COLUMNS = "id, name, text, added_on";

export function cvNotFound(id) {
  return new AppError("NOT_FOUND", `No CV with id ${id}`, 404);
}

function toCv(row) {
  return { id: row.id, name: row.name, text: row.text, addedOn: parseIsoDate(row.added_on) };
}

/** Saves a new CV version and returns it. The text is kept exactly as pasted. */
export function addCv(userId, name, text) {
  name = String(name ?? "").trim();
  text = String(text ?? "");
  if (!name) throw new AppError("MISSING_NAME", "Give this CV a name.");
  if (!text.trim()) throw new AppError("MISSING_TEXT", "Paste the CV text.");
  if (text.length > MAX_TEXT_LENGTH) throw new AppError("CV_TOO_LONG", "That CV is too long (20,000 characters max).");
  const { lastInsertRowid } = getDb()
    .prepare("INSERT INTO cvs (user_id, name, text, added_on) VALUES (?, ?, ?, ?)")
    .run(userId, name, text, toIso(today()));
  return getCv(userId, Number(lastInsertRowid));
}

/** Newest first. Two CVs added the same day keep the order they were added in. */
export function listCvs(userId) {
  return getDb()
    .prepare(`SELECT ${COLUMNS} FROM cvs WHERE user_id = ? ORDER BY added_on DESC, id DESC`)
    .all(userId)
    .map(toCv);
}

export function getCv(userId, id) {
  if (!Number.isInteger(id)) throw cvNotFound(id);
  const row = getDb().prepare(`SELECT ${COLUMNS} FROM cvs WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!row) throw cvNotFound(id);
  return toCv(row);
}

/** Deletes a CV, unless it was sent with an application. */
export function deleteCv(userId, id) {
  if (!Number.isInteger(id)) throw cvNotFound(id);
  transaction((db) => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM applications WHERE cv_id = ? AND user_id = ?").get(id, userId);
    if (n > 0) {
      const apps = n === 1 ? "1 application" : `${n} applications`;
      throw new AppError("CV_IN_USE", `This CV was sent with ${apps}. It can't be deleted.`, 409);
    }
    const { changes } = db.prepare("DELETE FROM cvs WHERE id = ? AND user_id = ?").run(id, userId);
    if (changes === 0) throw cvNotFound(id);
  });
}
