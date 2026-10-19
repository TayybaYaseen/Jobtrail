// One SQLite database holds every account and every application.
//
// Each change is a single INSERT or UPDATE, so two tabs saving at the same
// time no longer overwrite each other the way the old JSON file did.

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dbPath } from "./settings.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_failures (
  email TEXT NOT NULL,
  at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_failures_email ON login_failures(email, at);

CREATE TABLE IF NOT EXISTS applications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  company        TEXT NOT NULL,
  role           TEXT NOT NULL,
  source         TEXT NOT NULL,
  applied_on     TEXT,
  applied_on_raw TEXT,
  stage          TEXT NOT NULL,
  next_step_on   TEXT,
  notes          TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS applications_user ON applications(user_id);
`;

let db = null;
let openPath = null;

/** The open database. Opens it (and creates the tables) on first use. */
export function getDb() {
  const file = dbPath();
  if (db && openPath === file) return db;
  closeDb();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  openPath = file;
  return db;
}

export function closeDb() {
  db?.close();
  db = null;
  openPath = null;
}

/** Runs fn inside a transaction: everything is written, or nothing is. */
export function transaction(fn) {
  const conn = getDb();
  conn.exec("BEGIN");
  try {
    const result = fn(conn);
    conn.exec("COMMIT");
    return result;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}
