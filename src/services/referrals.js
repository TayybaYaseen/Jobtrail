// F8 · Referrals: who referred me for an application, and thanking them.
//
// One referrer per application, stored on the application itself.

import { toIso } from "../dates.js";
import { getDb } from "../db.js";
import { AppError } from "../errors.js";
import { today } from "../settings.js";
import { getApplication } from "./applications.js";

export const MAX_NAME_LENGTH = 100;

// Stages worth telling the referrer about.
export const NEWS_STAGES = ["interview", "offer", "rejected"];

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * The referrer typed on the application page, or null when all three fields
 * are blank (no referrer). Throws before anything is saved.
 */
export function parseReferrer(name, how, contact) {
  const referrer = { name: clean(name), how: clean(how), contact: clean(contact) };
  if (!referrer.name && !referrer.how && !referrer.contact) return null;
  if (!referrer.name) throw new AppError("REFERRER_NAME_MISSING", "Add the person's name.");
  if (referrer.name.length > MAX_NAME_LENGTH) {
    throw new AppError("REFERRER_NAME_TOO_LONG", "Keep the name under 100 characters.");
  }
  return { name: referrer.name, how: referrer.how || null, contact: referrer.contact || null };
}

/**
 * Saves the referrer, or removes it when it's null. The thank-you date is kept
 * only while it's the same person.
 */
export function saveReferrer(userId, id, referrer) {
  const app = getApplication(userId, id); // 404 if it isn't theirs
  const sameName = referrer !== null && app.referrer?.name === referrer.name;
  getDb()
    .prepare(
      `UPDATE applications
       SET referrer_name = ?, referrer_how = ?, referrer_contact = ?, referrer_thanked_on = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      referrer?.name ?? null,
      referrer?.how ?? null,
      referrer?.contact ?? null,
      sameName ? toIso(app.referrer.thankedOn) : null,
      id,
      userId,
    );
  return getApplication(userId, id);
}

/** Saves today as the day I thanked the referrer. Tapping again moves the date to the latest. */
export function markThanked(userId, id) {
  const app = getApplication(userId, id); // 404 if it isn't theirs, or is gone
  if (!app.referrer) throw new AppError("NOT_FOUND", `No referral on application ${id}`, 404);
  getDb()
    .prepare("UPDATE applications SET referrer_thanked_on = ? WHERE id = ? AND user_id = ?")
    .run(toIso(today()), id, userId);
}

/**
 * Every referred application, one row each (the same person can refer me twice).
 * Not yet thanked first, by name; then thanked, most recently thanked first.
 */
export function referrals(apps) {
  const referred = apps.filter((app) => app.referrer);
  const byName = (a, b) =>
    a.referrer.name.localeCompare(b.referrer.name) || a.company.localeCompare(b.company);
  const notThanked = referred.filter((app) => !app.referrer.thankedOn).sort(byName);
  const thanked = referred
    .filter((app) => app.referrer.thankedOn)
    .sort((a, b) => b.referrer.thankedOn - a.referrer.thankedOn || byName(a, b));
  return [...notThanked, ...thanked];
}

/**
 * Referred applications that reached Interview, Offer or Rejected and whose
 * referrer I haven't thanked since that stage began.
 */
export function thankYous(apps) {
  return referrals(apps).filter((app) => {
    if (!NEWS_STAGES.includes(app.stage)) return false;
    const stageSince = app.lastChangedOn ?? app.appliedOn;
    return !app.referrer.thankedOn || app.referrer.thankedOn < stageSince;
  });
}
