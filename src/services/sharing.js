// F13 · A read-only link for a mentor or a parent.
//
// One link per user. The token is 32 random bytes. A token is found by its
// SHA-256, then compared with the stored one in constant time. The token itself
// is kept so the owner can copy the link again. Turned-off links are kept too,
// so opening one says it was turned off (410) instead of "doesn't exist".

import { randomBytes, timingSafeEqual } from "node:crypto";
import { toIso } from "../dates.js";
import { getDb, transaction } from "../db.js";
import { AppError } from "../errors.js";
import { today } from "../settings.js";
import { hashToken } from "./accounts.js";
import { listApplications, newestFirst } from "./applications.js";

export const NO_NAME = "A JobTrail user";
export const MAX_NAME_LENGTH = 60;
export const REQUESTS_PER_MINUTE = 30;
const MINUTE_MS = 60 * 1000;

/** The token of my link, or null when I have none turned on. */
export function currentToken(userId) {
  const row = getDb().prepare("SELECT token FROM share_links WHERE user_id = ? AND turned_off_on IS NULL").get(userId);
  return row?.token ?? null;
}

/** Makes a new link and returns its token. The old one (if any) stops working. */
export function createLink(userId) {
  const token = randomBytes(32).toString("base64url");
  transaction((db) => {
    turnOff(db, userId);
    db.prepare("INSERT INTO share_links (token_hash, token, user_id, created_on) VALUES (?, ?, ?, ?)")
      .run(hashToken(token), token, userId, toIso(today()));
  });
  return token;
}

export function turnOffLink(userId) {
  turnOff(getDb(), userId);
}

function turnOff(db, userId) {
  db.prepare("UPDATE share_links SET turned_off_on = ? WHERE user_id = ? AND turned_off_on IS NULL")
    .run(toIso(today()), userId);
}

/** Whose link a token is: { userId }, { turnedOff: true }, or null for a token that was never made. */
export function openLink(token) {
  if (typeof token !== "string" || !token) return null;
  const row = getDb()
    .prepare("SELECT token, user_id, turned_off_on FROM share_links WHERE token_hash = ?")
    .get(hashToken(token));
  const given = Buffer.from(token);
  const stored = Buffer.from(row?.token ?? "");
  if (!row || given.length !== stored.length || !timingSafeEqual(given, stored)) return null;
  return row.turned_off_on ? { turnedOff: true } : { userId: row.user_id };
}

/** The name on my link, as I typed it, or "" for none. */
export function displayName(userId) {
  return getDb().prepare("SELECT display_name FROM users WHERE id = ?").get(userId)?.display_name ?? "";
}

/** Saves the name on my link. Blank removes it, so the link shows "A JobTrail user". */
export function saveDisplayName(userId, name) {
  name = String(name ?? "").trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw new AppError("NAME_TOO_LONG", `Keep your name to ${MAX_NAME_LENGTH} characters.`);
  }
  getDb().prepare("UPDATE users SET display_name = ? WHERE id = ?").run(name || null, userId);
}

/**
 * What the shared page shows, and nothing more: a name, and for each application
 * only its company, role, stage, applied date and next-step date, newest first.
 */
export function sharedPage(userId) {
  const apps = newestFirst(listApplications(userId)).map(({ company, role, stage, appliedOn, nextStepOn }) => ({
    company,
    role,
    stage,
    appliedOn,
    nextStepOn,
  }));
  return { name: displayName(userId) || NO_NAME, apps };
}

/** Counts a request to a share link from this IP. False once it has made 30 in the last minute. */
export function allowShareRequest(ip) {
  const now = Date.now();
  return transaction((db) => {
    db.prepare("DELETE FROM share_hits WHERE at <= ?").run(now - MINUTE_MS);
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM share_hits WHERE ip = ?").get(ip);
    if (n >= REQUESTS_PER_MINUTE) return false;
    db.prepare("INSERT INTO share_hits (ip, at) VALUES (?, ?)").run(ip, now);
    return true;
  });
}
