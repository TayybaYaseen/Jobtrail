import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach } from "vitest";
import "../src/app.js"; // load the app first, the same way the server does

const SAMPLE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "sample.json");
let dir;

// Every test gets a fresh copy of tests/fixtures/sample.json. Your real data is never used.
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "jobtrail-"));
  const copy = path.join(dir, "jobtrail.json");
  fs.copyFileSync(SAMPLE, copy);
  process.env.JOBTRAIL_DATA = copy;
  process.env.JOBTRAIL_TODAY = "2026-10-19";
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});
