// Accounts, passwords and login sessions.
//
// Passwords are stored only as a salted scrypt hash. Session tokens live in
// the browser's cookie; the database keeps only their SHA-256, so a copy of
// the database can't be used to log in as anyone.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "../db.js";
import { AppError } from "../errors.js";

export const MIN_PASSWORD_LENGTH = 8;
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

const KEY_LENGTH = 64;
// Checked against when the email is unknown, so both cases take the same time.
const DUMMY_HASH = hashPassword("not a real password");

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function passwordMatches(password, stored) {
  const [, saltHex, hashHex] = stored.split("$");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function findUserByEmail(email) {
  return getDb().prepare("SELECT id, email FROM users WHERE email = ?").get(normalizeEmail(email)) ?? null;
}

/** Creates an account and returns its user id. */
export function signUp(email, password) {
  email = normalizeEmail(email);
  password = String(password ?? "");
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new AppError("BAD_EMAIL", "Enter a valid email address.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("PASSWORD_TOO_SHORT", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (findUserByEmail(email)) throw new AppError("EMAIL_TAKEN", "That email already has an account.", 409);
  const { lastInsertRowid } = getDb()
    .prepare("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)")
    .run(email, hashPassword(password), new Date().toISOString());
  return Number(lastInsertRowid);
}

/** Checks an email and password and returns the user id. */
export function logIn(email, password) {
  email = normalizeEmail(email);
  const db = getDb();
  const now = Date.now();
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM login_failures WHERE email = ? AND at > ?")
    .get(email, now - FAILURE_WINDOW_MS);
  if (n >= MAX_FAILURES) throw new AppError("TOO_MANY_TRIES", "Too many tries. Wait 15 minutes.", 429);

  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email);
  const ok = passwordMatches(String(password ?? ""), user?.password_hash ?? DUMMY_HASH) && Boolean(user);
  if (!ok) {
    db.prepare("INSERT INTO login_failures (email, at) VALUES (?, ?)").run(email, now);
    throw new AppError("WRONG_LOGIN", "Email or password is wrong.", 401);
  }
  db.prepare("DELETE FROM login_failures WHERE email = ?").run(email);
  return user.id;
}

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

/** Starts a session and returns the token for the cookie. */
export function startSession(userId) {
  const token = randomBytes(32).toString("base64url");
  getDb()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), userId, Date.now() + SESSION_MAX_AGE_MS);
  return token;
}

/** The logged-in user for a session token, or null if it's missing, unknown or expired. */
export function userForSession(token) {
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(hashToken(token), Date.now());
  return row ? { id: row.id, email: row.email } : null;
}

export function endSession(token) {
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
