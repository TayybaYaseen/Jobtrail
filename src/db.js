// One SQLite database holds every account and every application.
//
// Each change is a single INSERT or UPDATE, so two tabs saving at the same
// time no longer overwrite each other the way the old JSON file did.

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
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

-- CV versions. The text is never updated: to change a CV, add a new version.
CREATE TABLE IF NOT EXISTS cvs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id),
  name     TEXT NOT NULL,
  text     TEXT NOT NULL,
  added_on TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cvs_user ON cvs(user_id);

-- The saved interview prep, one per application. Regenerate replaces it.
-- job_post_hash and cv_id say what it was made from, to spot later changes.
CREATE TABLE IF NOT EXISTS preps (
  application_id INTEGER PRIMARY KEY REFERENCES applications(id),
  user_id        INTEGER NOT NULL REFERENCES users(id),
  questions      TEXT NOT NULL,
  created_on     TEXT NOT NULL,
  job_post_hash  TEXT NOT NULL,
  cv_id          INTEGER NOT NULL
);

-- One row per prep made, for the daily limit. Failed preps don't get one.
CREATE TABLE IF NOT EXISTS prep_usage (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS prep_usage_user_day ON prep_usage(user_id, day);

-- F9: what I've learned about a company, one row per user and company.
-- company_key is the name trimmed and lowercased. Kept when no applications are left.
CREATE TABLE IF NOT EXISTS company_notes (
  user_id     INTEGER NOT NULL REFERENCES users(id),
  company_key TEXT NOT NULL,
  notes       TEXT NOT NULL,
  updated_on  TEXT NOT NULL,
  PRIMARY KEY (user_id, company_key)
);

-- F13: read-only links for a mentor. One link on at a time per user. Turned-off
-- links are kept, so opening one says it was turned off. A token is found by its SHA-256.
CREATE TABLE IF NOT EXISTS share_links (
  token_hash    TEXT PRIMARY KEY,
  token         TEXT NOT NULL,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  created_on    TEXT NOT NULL,
  turned_off_on TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS share_links_on ON share_links(user_id) WHERE turned_off_on IS NULL;

-- One row per request to a share link, for the rate limit. Rows older than a minute are deleted.
CREATE TABLE IF NOT EXISTS share_hits (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS share_hits_ip ON share_hits(ip, at);
`;

// Columns added after a table first shipped. Older databases get them when
// they're opened; their applications start with no job post and no CV.
const ADDED_COLUMNS = {
  users: {
    theme: "TEXT", // "light" or "dark"; null (or anything else) means Auto, which follows the device
    display_name: "TEXT", // F13: the name on my share link; null means "A JobTrail user"
  },
  applications: {
    job_post: "TEXT",
    cv_id: "INTEGER REFERENCES cvs(id)",
    last_changed_on: "TEXT", // set when it's added or its stage changes; null means use applied_on
    followed_up_on: "TEXT",
    // F7: monthly, in rupees, whole numbers. The offer is kept when the stage moves on, but only shown at Offer.
    salary_min: "INTEGER",
    salary_max: "INTEGER",
    salary_offered: "INTEGER",
    // F8: who referred me (one per application), and when I last thanked them.
    referrer_name: "TEXT",
    referrer_how: "TEXT",
    referrer_contact: "TEXT",
    referrer_thanked_on: "TEXT",
  },
};

function migrate(conn) {
  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const have = new Set(conn.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    for (const [name, type] of Object.entries(columns)) {
      if (!have.has(name)) conn.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  }
}

let db = null;
let openPath = null;

/** The open database. Opens it (and creates the tables) on first use. */
export function getDb() {
  const file = dbPath();
  if (db && openPath === file) return db;
  closeDb();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file, { timeout: 5000 }); // waits up to 5s if another process is writing
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
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
  return conn.transaction(() => fn(conn))();
}
