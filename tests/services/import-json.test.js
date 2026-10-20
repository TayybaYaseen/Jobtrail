// F1 criterion 11: `npm run import-json` copies an old JSON file into an account.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { getDb } from "../../src/db.js";
import { signUp } from "../../src/services/accounts.js";
import { listApplications } from "../../src/services/applications.js";
import { importJsonFile } from "../../src/services/import-json.js";
import { loadApplications } from "../../src/store.js";
import { SAMPLE } from "../helpers.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ZARA = "zara@example.com";

const byCompany = (apps) => [...apps].sort((a, b) => a.company.localeCompare(b.company));
const withoutId = ({ id: _id, ...rest }) => rest;

/** A JSON file in the test's temp folder. */
function jsonFile(applications) {
  const file = path.join(path.dirname(process.env.JOBTRAIL_DB), "export.json");
  fs.writeFileSync(file, JSON.stringify({ applications }));
  return file;
}

describe("11. import a JSON file", () => {
  test("copies every application with the same dates, stages and notes", () => {
    const zara = signUp(ZARA, "zara-password");
    const file = process.env.JOBTRAIL_DATA; // a copy of sample.json
    const bytesBefore = fs.readFileSync(file);

    expect(importJsonFile(ZARA, file)).toBe(8);

    const imported = byCompany(listApplications(zara)).map(withoutId);
    const original = byCompany(loadApplications()).map(withoutId);
    expect(imported).toEqual(original);
    expect(fs.readFileSync(file)).toEqual(bytesBefore); // the file is not modified
  });

  test("LinkedIn dates are month first and Rozee.pk dates day first", () => {
    const zara = signUp(ZARA, "zara-password");
    importJsonFile(ZARA, SAMPLE);
    const apps = listApplications(zara);
    const appliedOn = (company) => apps.find((a) => a.company === company).appliedOn;
    expect(appliedOn("Ravi Systems")).toEqual(new Date(Date.UTC(2026, 8, 21))); // LinkedIn 09/21/2026
    expect(appliedOn("Kohsar Labs")).toEqual(new Date(Date.UTC(2026, 9, 2))); // Rozee.pk 02/10/2026
    const row = getDb().prepare("SELECT applied_on_raw FROM applications WHERE user_id = ? AND company = ?").get(zara, "Kohsar Labs");
    expect(row.applied_on_raw).toBe("02/10/2026"); // kept as the site wrote it
  });

  test("an unknown source stops the import before anything is written", () => {
    const zara = signUp(ZARA, "zara-password");
    const records = JSON.parse(fs.readFileSync(SAMPLE, "utf8")).applications;
    records[6] = { ...records[6], source: "indeed" };
    expect(() => importJsonFile(ZARA, jsonFile(records))).toThrow("Record 7: can't read dates from 'indeed'");
    expect(listApplications(zara)).toEqual([]);
  });

  test("running it twice is refused", () => {
    signUp(ZARA, "zara-password");
    importJsonFile(ZARA, SAMPLE);
    expect(() => importJsonFile(ZARA, SAMPLE)).toThrow("That account already has applications.");
  });

  test("the account must exist", () => {
    expect(() => importJsonFile("ghost@example.com", SAMPLE)).toThrow("No account for ghost@example.com. Sign up first.");
  });

  test("the npm script runs from the command line", () => {
    signUp(ZARA, "zara-password");
    const result = spawnSync(
      process.execPath,
      ["scripts/import-json.js", "--email", "Zara@Example.com", "--file", process.env.JOBTRAIL_DATA],
      { cwd: ROOT, env: process.env, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Imported 8 applications into zara@example.com.");

    const again = spawnSync(
      process.execPath,
      ["scripts/import-json.js", "--email", ZARA, "--file", process.env.JOBTRAIL_DATA],
      { cwd: ROOT, env: process.env, encoding: "utf8" },
    );
    expect(again.status).toBe(1);
    expect(again.stderr).toContain("That account already has applications.");
  });
});
