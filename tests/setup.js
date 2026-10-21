import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";
import "../src/app.js"; // load the app first, the same way the server does
import { closeDb } from "../src/db.js";
import { signUp } from "../src/services/accounts.js";
import { importRecords } from "../src/services/applications.js";
import { loadRecords } from "../src/store.js";
import { SAMPLE, TEST_EMAIL, TEST_PASSWORD } from "./helpers.js";

let dir;

// Every test gets a fresh temporary database with one test user, who owns a
// copy of tests/fixtures/sample.json. Your real data is never used.
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "jobtrail-"));
  const copy = path.join(dir, "jobtrail.json");
  fs.copyFileSync(SAMPLE, copy);
  process.env.JOBTRAIL_DATA = copy; // npm run import-json reads a JSON file
  process.env.JOBTRAIL_DB = path.join(dir, "jobtrail.db");
  process.env.JOBTRAIL_TODAY = "2026-10-19";
  importRecords(signUp(TEST_EMAIL, TEST_PASSWORD), loadRecords());
});

afterEach(() => {
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});
