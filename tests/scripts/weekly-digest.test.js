import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { moveStage } from "../../src/services/applications.js";
import { TEST_EMAIL, logIn, testUserId } from "../helpers.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Runs the digest exactly as it runs on Monday: a fresh `node` process.
function digest(...args) {
  return spawnSync(process.execPath, ["scripts/weekly-digest.js", ...args], {
    cwd: ROOT,
    env: process.env, // carries the test's database and date
    encoding: "utf8",
  });
}

test("ticket #102: the Monday digest runs", () => {
  const result = digest("--email", TEST_EMAIL);
  expect(result.status, `The digest crashed. Its error:\n\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain("Ravi Systems");
});

test("without an email, or for an unknown one, it says how to run it", () => {
  const none = digest();
  expect(none.status).toBe(1);
  expect(none.stderr).toContain("Usage: npm run digest -- --email you@example.com");
  const unknown = digest("--email", "nobody@example.com");
  expect(unknown.status).toBe(1);
  expect(unknown.stderr).toContain("No account for nobody@example.com.");
});

describe("F4 · 8. follow-ups in the digest", () => {
  test("come after the week's next steps, longest silence first", () => {
    const lines = digest("--email", TEST_EMAIL).stdout.trim().split(/\r?\n/);
    expect(lines).toEqual([
      "JobTrail · week of Mon 19 Oct",
      "- Tue 20 Oct · Ravi Systems · interview (tomorrow)",
      "- Thu 22 Oct · Kohsar Labs · interview (in 3 days)",
      "- Follow up: Margalla Tech · no reply for 35 days",
      "- Follow up: Sindh Softworks · no reply for 11 days",
      "- Follow up: Thar Digital · no reply for 10 days",
    ]);
  });

  test("tapping Followed up removes it from the digest too", async () => {
    await (await logIn()).post("/applications/2/followed-up");
    expect(digest("--email", TEST_EMAIL).stdout).not.toContain("Margalla Tech");
  });

  test("with no follow-ups, the section is left out", () => {
    for (const id of [2, 6, 8]) moveStage(testUserId(), id, "rejected");
    const out = digest("--email", TEST_EMAIL).stdout;
    expect(out).not.toContain("Follow up");
    expect(out).toContain("Ravi Systems");
  });
});
