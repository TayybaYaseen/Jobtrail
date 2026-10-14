import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Runs the digest exactly as everyone's copy does: a fresh `node` process.
test("ticket #102: the Monday digest runs", () => {
  const result = spawnSync(process.execPath, ["scripts/weekly-digest.js"], {
    cwd: ROOT,
    env: process.env, // carries the test's sample data and date
    encoding: "utf8",
  });
  expect(result.status, `The digest crashed. Its error:\n\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain("Ravi Systems");
});
